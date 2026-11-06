/* =====================================================================
   modulos/nf-ir.js — nota fiscal pendente e pasta do IR (N40)       1.0.0 · 06/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     · Todo gasto marcado "Entra no imposto de renda" (saúde, educação…) do ano aberto nasce com
       "NF: aguardando". Um toque em "Recebi a NF" dá baixa; "Não precisa" tira da lista.
     · "NFs que faltam" (tela b-nfs): a lista para cobrar cada profissional.
     · Subir PDFs: o app lê o texto do PDF (sem IA: valores, datas e palavras), propõe o gasto de cada
       arquivo (valor igual, data perto, nome parecido), a pessoa confere e guarda. O arquivo vai para a
       "Pasta do IR" do ano com o nome "AAAA-MM-DD descrição.pdf" (ex.: "2026-11-05 Dentista Ana.pdf"),
       fechado como o resto (modulos/arquivos.js, window.ArquivosFamilia).
     · "Pasta do IR" (tela t-pasta-ir): os arquivos do ano (NFs, informes de rendimentos, outros
       papéis), para baixar ou acrescentar.
   API (window.NfIr)
     anoAberto(hoje?)         → [anos] cuja NF ainda se cobra (o ano corrente; até 31/maio, também o anterior)
     estado(g)                → 'aguardando' | 'recebida' | 'dispensada' | '' (não se aplica)
     faltam(hoje?)            → [gasto] com NF aguardando
     marcar(gid, estado, arquivoId?)
     nomeArquivo(g)           → 'AAAA-MM-DD Categoria Pessoa.pdf'
     lerPdf(texto)            → {valores:[n], datas:['AAAA-MM-DD'], palavras:[w]}
     propor(pdf, nomeArquivo, candidatos) → [{g, pontos}] do mais provável para o menos
   DADOS
     Store.estado.nf_status = [{id: <id do gasto>, estado: 'recebida'|'dispensada', arquivo, em}]
     (sem registro = aguardando); os arquivos ficam em Store.estado.arquivos (tipo 'nf' ou 'informe'/'outro')
   PONTOS QUE USA
     lancamento.linha · lancamento.form · lancamentos.topo · tax.deducoes.topo · fita.tax
     telas b-nfs e t-pasta-ir · ações nf-* e ir-*
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'nf_status';
  function pt() { return I18n.atual === 'pt'; }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function norm(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  var PARADAS = { 'de': 1, 'da': 1, 'do': 1, 'dos': 1, 'das': 1, 'e': 1, 'em': 1, 'para': 1, 'com': 1, 'pix': 1, 'ted': 1, 'pagamento': 1, 'compra': 1, 'debito': 1, 'credito': 1, 'cartao': 1, 'ltda': 1, 'me': 1, 'sa': 1, 'nota': 1, 'fiscal': 1, 'servico': 1, 'servicos': 1, 'valor': 1, 'total': 1 };
  function palavras(t) { return norm(t).split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 3 && !PARADAS[w] && !/^\d+$/.test(w); }); }

  var API = {
    anoAberto: function (hoje) {
      hoje = String(hoje || hojeISO()); var a = Number(hoje.slice(0, 4));
      return hoje.slice(5) <= '05-31' ? [a - 1, a] : [a];
    },
    aplica: function (g, hoje) {
      return !!(g && g.irpf && g.data && g.fluxo !== 'entrada' && API.anoAberto(hoje).indexOf(Number(g.data.slice(0, 4))) >= 0);
    },
    reg: function (gid) { return lista().find(function (x) { return x.id === gid; }) || null; },
    estado: function (g, hoje) {
      var r = g ? API.reg(g.id) : null;
      if (r) return r.estado;
      return API.aplica(g, hoje) ? 'aguardando' : '';
    },
    faltam: function (hoje) {
      return Gasto.todos().filter(function (g) { return API.estado(g, hoje) === 'aguardando'; })
        .sort(function (a, b) { return (b.data || '').localeCompare(a.data || ''); });
    },
    marcar: function (gid, estado, arquivoId) {
      var r = API.reg(gid);
      if (estado === 'aguardando') { ST[COL] = lista().filter(function (x) { return x.id !== gid; }); return null; }
      if (!r) { r = { id: gid }; lista().push(r); }
      r.estado = estado; r.em = new Date().toISOString();
      if (arquivoId) r.arquivo = arquivoId;
      return r;
    },
    nomeArquivo: function (g) {
      var desc = [g.sub, g.quem].filter(Boolean).join(' ');
      if (!desc || /^sem categoria$/i.test(g.sub)) desc = (g.desc || 'Nota fiscal');
      return ArquivosFamilia.nomeLimpo((g.data || hojeISO()) + ' ' + desc) + '.pdf';
    },
    /* o que dá para tirar de um PDF sem IA */
    lerPdf: function (texto) {
      var t = String(texto || ''), valores = [], datas = [];
      (t.match(/\d{1,3}(?:\.\d{3})*,\d{2}\b/g) || []).forEach(function (v) { var n = Number(v.replace(/\./g, '').replace(',', '.')); if (n > 0 && valores.indexOf(n) < 0) valores.push(n); });
      (t.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/g) || []).forEach(function (d) { var p = d.split('/'); var iso = p[2] + '-' + p[1] + '-' + p[0]; if (datas.indexOf(iso) < 0) datas.push(iso); });
      (t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/g) || []).forEach(function (iso) { if (datas.indexOf(iso) < 0) datas.push(iso); });
      return { valores: valores, datas: datas, palavras: palavras(t) };
    },
    /* nota de cada candidato: valor igual vale 5; data perto (até 45 dias) 2; cada palavra em comum 1 (até 3) */
    propor: function (pdf, nomeArq, candidatos) {
      var ws = pdf.palavras.concat(palavras(nomeArq));
      return candidatos.map(function (g) {
        var p = 0;
        if (pdf.valores.some(function (v) { return Math.abs(v - g.valor) < 0.005; })) p += 5;
        if (g.data && pdf.datas.some(function (d) { return Math.abs((new Date(d + 'T12:00:00') - new Date(g.data + 'T12:00:00')) / 86400000) <= 45; })) p += 2;
        var comuns = palavras([g.sub, g.desc, g.quem].join(' ')).filter(function (w, i, a) { return a.indexOf(w) === i && ws.indexOf(w) >= 0; }).length;
        p += Math.min(3, comuns);
        return { g: g, pontos: p };
      }).filter(function (x) { return x.pontos > 0; }).sort(function (a, b) { return b.pontos - a.pontos; });
    }
  };

  /* ---------- subir PDFs: ler, propor, conferir, guardar ---------- */
  var fila = [];        /* [{arquivo, bytes, proposta: [{g, pontos}], escolhido: gid|''}] */
  function escolherArquivos(multi, aceita, depois) {
    var i = document.getElementById('nfArqEntrada');
    if (i) i.parentNode.removeChild(i);
    i = document.createElement('input'); i.type = 'file'; i.id = 'nfArqEntrada'; i.accept = aceita || 'application/pdf,.pdf'; i.multiple = !!multi; i.style.display = 'none';
    i.addEventListener('change', function () { var l = Array.from(i.files || []); if (l.length) depois(l); });
    document.body.appendChild(i); i.click();
  }
  async function lerTexto(arquivo) {
    try { if (typeof PdfTexto !== 'undefined') return await PdfTexto.extrair(arquivo, { linhas: true, aceitaVazio: true }); } catch (e) {}
    return '';
  }
  async function prepararNfs(arquivos, gidFixo) {
    var tarefa = 'nf-subir-' + Date.now();
    var temFundo = typeof Fundo !== 'undefined';
    if (temFundo) Fundo.comecar({ id: tarefa, titulo: pt() ? 'Lendo as notas fiscais…' : 'Reading the invoices…', aoAbrir: mostrarConferencia });
    fila = [];
    var cands = API.faltam();
    for (var k = 0; k < arquivos.length; k++) {
      var a = arquivos[k];
      if (temFundo) Fundo.passo(tarefa, (pt() ? 'Lendo ' : 'Reading ') + a.name, k / arquivos.length);
      var bytes = new Uint8Array(await a.arrayBuffer());
      var prop = gidFixo ? [] : API.propor(API.lerPdf(await lerTexto(a)), a.name, cands);
      var esc1 = gidFixo || (prop.length && prop[0].pontos >= 5 && (!prop[1] || prop[1].pontos < prop[0].pontos) ? prop[0].g.id : '');
      fila.push({ nome: a.name, bytes: bytes, mime: a.type || 'application/pdf', proposta: prop, escolhido: esc1 });
    }
    if (temFundo) Fundo.terminar(tarefa, (pt() ? 'Notas lidas: ' : 'Invoices read: ') + arquivos.length);
    mostrarConferencia();
  }
  function mostrarConferencia() {
    if (!fila.length) return;
    var faltam = API.faltam();
    var opc = function (sel) {
      return '<option value="">' + (pt() ? '— não é de nenhum (guardar só na pasta) —' : '— none (just keep in the folder) —') + '</option>' +
        faltam.concat(Gasto.todos().filter(function (g) { return g.id === sel && faltam.indexOf(g) < 0; })).map(function (g) {
          return '<option value="' + esc(g.id) + '"' + (g.id === sel ? ' selected' : '') + '>' + esc(I18n.data(g.data) + ' · ' + [g.sub, g.quem].filter(Boolean).join(' ') + ' · ' + fmt(g.valor)) + '</option>';
        }).join('');
    };
    $('#genTitle').textContent = pt() ? 'Conferir as notas fiscais' : 'Check the invoices';
    $('#genBody').innerHTML = Verter.html('<p class="small muted">' + (pt()
        ? 'Para cada arquivo, o app sugere o gasto pelo valor, pela data e pelo nome. Confira e guarde: a nota sai da lista do que falta e vai para a Pasta do IR com o nome certo.'
        : 'For each file the app suggests the expense by amount, date and name. Check and save.') + '</p>' +
      fila.map(function (f, i) {
        return '<div class="nf-conf"><div class="t-main">📄 ' + esc(f.nome) + '</div>' +
          '<select class="nf-sel" data-i="' + i + '">' + opc(f.escolhido) + '</select>' +
          (f.proposta.length && !f.escolhido ? '<div class="tiny muted">' + (pt() ? 'Não deu para ter certeza: escolha o gasto.' : 'Not sure: pick the expense.') + '</div>' : '') + '</div>';
      }).join('') +
      '<div class="f-actions"><button class="btn" data-close="genModal">' + esc(t('ac.cancelar')) + '</button>' +
      '<button class="btn primary" data-acao="nf-guardar">' + (pt() ? 'Guardar' : 'Save') + '</button></div>');
    abrir('genModal');
  }
  async function guardarFila() {
    var sels = document.querySelectorAll('#genBody .nf-sel');
    sels.forEach(function (s) { var f = fila[Number(s.dataset.i)]; if (f) f.escolhido = s.value; });
    var n = 0;
    try {
      for (var i = 0; i < fila.length; i++) {
        var f = fila[i], g = f.escolhido ? Gasto.todos().find(function (x) { return x.id === f.escolhido; }) : null;
        var ano = g ? Number(g.data.slice(0, 4)) : anoTax();
        var nome = g ? API.nomeArquivo(g) : ArquivosFamilia.nomeLimpo(hojeISO() + ' ' + f.nome.replace(/\.pdf$/i, '')) + '.pdf';
        var m = await ArquivosFamilia.guardar({ nome: nome, tipo: 'nf', ano: ano, ligado: g ? g.id : '', mime: f.mime }, f.bytes);
        if (g) API.marcar(g.id, 'recebida', m.id);
        n++;
      }
    } catch (e) { toast(e.message, 'err'); }
    fila = []; Store.salvar(); fechar('genModal'); render(); if (typeof renderFita === 'function') renderFita();
    toast(n + (pt() ? (n === 1 ? ' arquivo guardado na Pasta do IR.' : ' arquivos guardados na Pasta do IR.') : ' file(s) saved to the tax folder.'));
  }

  /* ---------- telas ---------- */
  function telaNfs() {
    var l = API.faltam(), por = {};
    l.forEach(function (g) { var k = [g.sub, g.quem].filter(Boolean).join(' · ') || g.desc || '—'; (por[k] = por[k] || []).push(g); });
    var h = '<div class="card-head"><h1>🧾 ' + (pt() ? 'NFs que faltam' : 'Missing invoices') + '</h1>' +
      '<div class="head-acoes"><button class="btn primary sm" data-acao="nf-subir">📎 ' + (pt() ? 'Subir NFs (PDF)' : 'Upload invoices (PDF)') + '</button></div></div>' +
      '<p class="small muted aba-explica">' + (pt()
        ? 'Gastos marcados "Entra no imposto de renda" de ' + API.anoAberto().join(' e ') + ' que ainda não têm nota fiscal. Use a lista para cobrar cada profissional.'
        : 'Tax-deductible expenses from ' + API.anoAberto().join(' and ') + ' still without an invoice.') + '</p>';
    if (!l.length) return h + '<div class="card"><div class="vazio"><div class="vazio-ico">✅</div><h3>' + (pt() ? 'Nenhuma NF faltando' : 'No missing invoices') + '</h3></div></div>';
    Object.keys(por).sort().forEach(function (k) {
      var gs = por[k], tot = gs.reduce(function (s, g) { return s + g.valor; }, 0);
      h += '<div class="card sem-pad"><div class="card-head" style="padding:12px 16px 0"><h3>' + esc(k) + '</h3><span class="small muted">' + gs.length + ' · ' + fmt(tot) + '</span></div>' +
        '<table class="tbl"><tbody>' + gs.map(function (g) {
          return '<tr><td class="nowrap">' + esc(I18n.data(g.data)) + '</td><td class="desc-cel">' + esc((g.desc || '').slice(0, 60)) + '</td><td class="num">' + fmt(g.valor) + '</td>' +
            '<td class="num nowrap"><button class="btn sm" data-acao="nf-recebi" data-id="' + esc(g.id) + '">' + (pt() ? 'Recebi' : 'Got it') + '</button> ' +
            '<button class="btn sm" data-acao="nf-anexar" data-id="' + esc(g.id) + '" title="' + esc(pt() ? 'anexar o PDF' : 'attach the PDF') + '">📎</button> ' +
            '<button class="btn sm" data-acao="nf-dispensar" data-id="' + esc(g.id) + '" title="' + esc(pt() ? 'não precisa de NF' : 'no invoice needed') + '">✕</button></td></tr>';
        }).join('') + '</tbody></table></div>';
    });
    return h;
  }
  function telaPasta() {
    var A = anoTax(), arqs = ArquivosFamilia.lista({ ano: A });
    var TIPOS = { nf: pt() ? 'Notas fiscais' : 'Invoices', informe: pt() ? 'Informes de rendimentos' : 'Income statements', outro: pt() ? 'Outros papéis' : 'Other papers' };
    var h = '<div class="card-head"><h1>📁 ' + (pt() ? 'Pasta do IR ' : 'Tax folder ') + A + '</h1>' + (typeof seletorAno === 'function' ? seletorAno() : '') + '</div>' +
      '<p class="small muted aba-explica">' + (pt()
        ? 'Os papéis do imposto de ' + A + ' (ano em que foi pago), guardados fechados. Toque num arquivo para baixar com o nome certo.'
        : 'The ' + A + ' tax papers (year paid), stored encrypted. Tap a file to download it.') + '</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:12px">' +
        '<button class="btn sm primary" data-acao="nf-subir">📎 ' + (pt() ? 'Subir NFs' : 'Upload invoices') + '</button>' +
        '<button class="btn sm" data-acao="ir-subir" data-tipo="informe">+ ' + (pt() ? 'Informe de rendimentos' : 'Income statement') + '</button>' +
        '<button class="btn sm" data-acao="ir-subir" data-tipo="outro">+ ' + (pt() ? 'Outro papel' : 'Other paper') + '</button></div>';
    var falta = API.faltam().filter(function (g) { return Number(g.data.slice(0, 4)) === A; }).length;
    if (falta) h += '<button class="card card-link" data-irpara="b-nfs"><span>🧾 ' + falta + (pt() ? ' NF(s) ainda faltando' : ' invoice(s) still missing') + '</span><span class="small muted">›</span></button>';
    Object.keys(TIPOS).forEach(function (tp) {
      var l = arqs.filter(function (m) { return (m.tipo || 'outro') === tp; });
      if (!l.length) return;
      h += '<div class="card sem-pad"><div class="card-head" style="padding:12px 16px 0"><h3>' + esc(TIPOS[tp]) + '</h3><span class="small muted">' + l.length + '</span></div>' +
        '<table class="tbl"><tbody>' + l.map(function (m) {
          return '<tr class="linha-click" data-acao="ir-baixar" data-id="' + esc(m.id) + '"><td>📄 <span class="t-main">' + esc(m.nome) + '</span>' +
            '<div class="t-sub">' + Math.max(1, Math.round(m.tamanho / 1024)) + ' KB · ' + (m.nuvem ? (pt() ? 'na nuvem' : 'in the cloud') : (pt() ? 'neste aparelho' : 'on this device')) + '</div></td></tr>';
        }).join('') + '</tbody></table></div>';
    });
    if (!arqs.length) h += '<div class="card"><p class="muted small" style="margin:0">' + (pt() ? 'Nada guardado ainda para ' + A + '.' : 'Nothing saved for ' + A + ' yet.') + '</p></div>';
    return h;
  }

  function botaoLinha(g) {
    var e = API.estado(g);
    if (e === 'aguardando') return '<button class="nf-tag nf-falta" data-acao="nf-recebi" data-id="' + esc(g.id) + '" title="' + esc(pt() ? 'toque quando receber a nota fiscal' : 'tap when you get the invoice') + '">🧾 ' + (pt() ? 'NF aguardando' : 'invoice pending') + '</button>';
    if (e === 'recebida') { var r = API.reg(g.id); return '<button class="nf-tag nf-ok"' + (r && r.arquivo ? ' data-acao="ir-baixar" data-id="' + esc(r.arquivo) + '"' : '') + '>🧾 ' + (pt() ? 'NF ✓' : 'invoice ✓') + '</button>'; }
    return '';
  }

  MoneyModulos.registrar({
    id: 'nf-ir',
    versao: '1.0.0',
    colecoes: [COL],
    pontos: {
      'lancamento.linha': function (ctx) { var b = ctx.g ? botaoLinha(ctx.g) : ''; return b ? '<div class="t-sub">' + b + '</div>' : ''; },
      'lancamento.form': function (ctx) {
        var g = ctx.g; if (!g || !API.estado(g)) return '';
        var e = API.estado(g), r = API.reg(g.id);
        var txt = { aguardando: pt() ? 'aguardando' : 'pending', recebida: pt() ? 'recebida' : 'received', dispensada: pt() ? 'não precisa' : 'not needed' }[e];
        return '<div class="bloco-regra nf-form"><span class="bf-tit">🧾 ' + (pt() ? 'Nota fiscal: ' : 'Invoice: ') + esc(txt) + '</span><div class="row" style="gap:6px;flex-wrap:wrap">' +
          (e !== 'recebida' ? '<button type="button" class="btn sm" data-acao="nf-recebi" data-id="' + esc(g.id) + '">' + (pt() ? 'Recebi a NF' : 'Got the invoice') + '</button>' : '') +
          '<button type="button" class="btn sm" data-acao="nf-anexar" data-id="' + esc(g.id) + '">📎 ' + (pt() ? 'Anexar PDF' : 'Attach PDF') + '</button>' +
          (r && r.arquivo ? '<button type="button" class="btn sm" data-acao="ir-baixar" data-id="' + esc(r.arquivo) + '">📄 ' + (pt() ? 'Ver o PDF' : 'See the PDF') + '</button>' : '') +
          (e === 'aguardando' ? '<button type="button" class="btn sm" data-acao="nf-dispensar" data-id="' + esc(g.id) + '">' + (pt() ? 'Não precisa' : 'Not needed') + '</button>' : '') +
          (e !== 'aguardando' ? '<button type="button" class="btn sm" data-acao="nf-voltar" data-id="' + esc(g.id) + '">' + (pt() ? 'Voltar para aguardando' : 'Back to pending') + '</button>' : '') +
          '</div></div>';
      },
      'lancamentos.topo': function () {
        var n = API.faltam().length; if (!n) return '';
        return '<button class="card card-link nf-topo" data-irpara="b-nfs"><span>🧾 ' + n + (pt() ? (n === 1 ? ' nota fiscal faltando' : ' notas fiscais faltando') : ' missing invoice(s)') + '</span><span class="small muted">' + (pt() ? 'ver a lista ›' : 'see the list ›') + '</span></button>';
      },
      'tax.deducoes.topo': function () {
        var A = anoTax(), n = ArquivosFamilia.lista({ ano: A }).length, f = API.faltam().filter(function (g) { return Number(g.data.slice(0, 4)) === A; }).length;
        return '<button class="card card-link" data-irpara="t-pasta-ir"><span>📁 ' + (pt() ? 'Pasta do IR ' : 'Tax folder ') + A + ': ' + n + (pt() ? ' arquivo(s)' : ' file(s)') +
          (f ? ' · ' + f + (pt() ? ' NF(s) faltando' : ' invoice(s) missing') : '') + '</span><span class="small muted">›</span></button>';
      },
      'fita.tax': function () {
        var n = API.faltam().length;
        return n ? [{ ico: '🧾', texto: n + (pt() ? ' nota(s) fiscal(is) de dedução faltando' : ' deductible invoice(s) missing'), tom: 'warn' }] : [];
      }
    },
    telas: {
      'b-nfs': { app: 'budget', render: telaNfs,
        ajuda: { pt: { t: 'NFs que faltam', o: 'Gastos que entram no imposto de renda e ainda não têm nota fiscal.', f: ['Recebi: dá baixa com um toque.', '📎: anexa o PDF da nota.', 'Subir NFs: o app lê os PDFs e liga cada um ao gasto.'] },
                 en: { t: 'Missing invoices', o: 'Tax-deductible expenses still without an invoice.', f: ['Got it: one tap.', '📎: attach the PDF.', 'Upload: the app reads the PDFs and links each to its expense.'] } } },
      't-pasta-ir': { app: 'tax', render: telaPasta,
        ajuda: { pt: { t: 'Pasta do IR', o: 'Os papéis do imposto do ano, guardados fechados.', f: ['Notas fiscais, informes de rendimentos e outros papéis.', 'Toque num arquivo para baixar com o nome certo.'] },
                 en: { t: 'Tax folder', o: 'The year\'s tax papers, stored encrypted.', f: ['Invoices, income statements and other papers.', 'Tap a file to download it.'] } } }
    },
    acoes: {
      'nf-recebi': function (el) { API.marcar(el.dataset.id, 'recebida'); Store.salvar(); render(); renderFita(); toast(pt() ? 'NF marcada como recebida.' : 'Invoice marked as received.'); },
      'nf-dispensar': function (el) { API.marcar(el.dataset.id, 'dispensada'); Store.salvar(); render(); renderFita(); },
      'nf-voltar': function (el) { API.marcar(el.dataset.id, 'aguardando'); Store.salvar(); fechar('assetModal'); render(); renderFita(); },
      'nf-anexar': function (el) { var gid = el.dataset.id; escolherArquivos(false, null, function (l) { fechar('assetModal'); prepararNfs(l, gid); }); },
      'nf-subir': function () { escolherArquivos(true, null, function (l) { prepararNfs(l); }); },
      'nf-guardar': function () { guardarFila(); },
      'ir-subir': function (el) {
        var tipo = el.dataset.tipo || 'outro';
        escolherArquivos(true, 'application/pdf,.pdf,image/*', async function (l) {
          var n = 0;
          for (var i = 0; i < l.length; i++) {
            try {
              var base = l[i].name.replace(/\.[a-z0-9]{2,4}$/i, ''), ext = (l[i].name.match(/\.[a-z0-9]{2,4}$/i) || ['.pdf'])[0];
              var nome = ArquivosFamilia.nomeLimpo(hojeISO() + ' ' + (tipo === 'informe' ? (pt() ? 'Informe ' : 'Statement ') : '') + base) + ext;
              await ArquivosFamilia.guardar({ nome: nome, tipo: tipo, ano: anoTax(), mime: l[i].type || 'application/pdf' }, new Uint8Array(await l[i].arrayBuffer()));
              n++;
            } catch (e) { toast(e.message, 'err'); }
          }
          render(); if (n) toast(n + (pt() ? ' arquivo(s) guardado(s) na Pasta do IR.' : ' file(s) saved.'));
        });
      },
      'ir-baixar': function (el) { ArquivosFamilia.baixar(el.dataset.id); }
    }
  });
  window.NfIr = API;
})();
