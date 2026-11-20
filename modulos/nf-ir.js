/* =====================================================================
   modulos/nf-ir.js — nota fiscal pendente e pasta do IR (N40)       1.1.0 · 20/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     · Todo gasto marcado "Entra no imposto de renda" (saúde, educação…) do ano aberto nasce com
       "NF: aguardando". Um toque em "Recebi a NF" dá baixa; "Não precisa" tira da lista.
     · "NFs que faltam" (tela b-nfs): a lista para cobrar cada profissional.
     · Subir PDFs: o app lê o texto do PDF (sem IA: valores, datas e palavras), propõe o gasto de cada
       arquivo (valor igual, data perto, nome parecido), a pessoa confere e guarda. O arquivo vai para a
       "Pasta do IR" do ano com o nome "AAAA-MM-DD descrição.pdf" (ex.: "2026-11-05 Dentista Bia.pdf"),
       fechado como o resto (modulos/arquivos.js, window.ArquivosFamilia).
     · "Pasta do IR" (tela t-pasta-ir): os arquivos do ano (NFs, informes de rendimentos, outros
       papéis), para baixar ou acrescentar.
     · 1.1.0 (3.91): DESPESA MÉDICA. Todo gasto de Saúde (menos farmácia e remédio), com ou sem "entra no IR", ganha o
       andamento comprovante → nota pedida → nota recebida → guardada no IR (ou "a nota foi para outra pessoa", ou "não vai ter
       nota (só recibo)"), com quem foi atendido, o profissional (nome e CPF/CNPJ) e o tipo (consulta, terapia, exame). 📥
       ("docs"): "Terapia ocupacional da X, 17/11, R$ 370 (Pix): falta a nota fiscal", com Anexar, Pedi a nota (lembra de novo
       em 7 dias), Foi para outra pessoa e Só recibo. Nome no padrão do dono, copiável: "AAAA-MM-DD Pessoa - terapia
       ocupacional - sessão.pdf". "📊 Relatório do IR": as despesas médicas do ano por pessoa, com nota × falta × só recibo.
   API (window.NfIr)
     anoAberto(hoje?)         → [anos] cuja NF ainda se cobra (o ano corrente; até 31/maio, também o anterior)
     estado(g)                → 'aguardando' | 'recebida' | 'dispensada' | '' (não se aplica)
     faltam(hoje?)            → [gasto] com NF aguardando
     marcar(gid, estado, arquivoId?)
     nomeArquivo(g)           → 'AAAA-MM-DD Categoria Pessoa.pdf'
     lerPdf(texto)            → {valores:[n], datas:['AAAA-MM-DD'], palavras:[w]}
     propor(pdf, nomeArquivo, candidatos) → [{g, pontos}] do mais provável para o menos
   DADOS
     Store.estado.nf_status = [{id: <id do gasto>, estado: 'recebida'|'dispensada'|'pedida'|'com'|'aguardando', arquivo, em,
       pessoa, pessoaId, prof, doc, tipo, pedidaEm, com}]   (1.1.0: os dados da consulta)
     (sem registro = aguardando); os arquivos ficam em Store.estado.arquivos (tipo 'nf' ou 'informe'/'outro')
   PONTOS QUE USA
     lancamento.linha · lancamento.form · lancamentos.topo · tax.deducoes.topo · fita.tax
     telas b-nfs e t-pasta-ir · ações nf-* e ir-*
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'nf_status';
  function pt() { return I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function hoje() { return API._hoje || hojeISO(); }
  /* 1.1.0 (3.91): despesa médica = todo gasto de Saúde (menos farmácia e remédio, que não têm nota de serviço) */
  function medica(g) { return g && g.grupo === 'SAUDE' && g.fluxo !== 'entrada' && !/farm[aá]cia|drogaria|rem[eé]dio|medicamento/i.test([g.sub, g.desc].join(' ')); }
  function dias(a, b) { return Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000); }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function norm(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  var PARADAS = { 'de': 1, 'da': 1, 'do': 1, 'dos': 1, 'das': 1, 'e': 1, 'em': 1, 'para': 1, 'com': 1, 'pix': 1, 'ted': 1, 'pagamento': 1, 'compra': 1, 'debito': 1, 'credito': 1, 'cartao': 1, 'ltda': 1, 'me': 1, 'sa': 1, 'nota': 1, 'fiscal': 1, 'servico': 1, 'servicos': 1, 'valor': 1, 'total': 1 };
  function palavras(t) { return norm(t).split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 3 && !PARADAS[w] && !/^\d+$/.test(w); }); }

  var API = {
    _hoje: null,
    anoAberto: function (hoje) {
      hoje = String(hoje || hojeISO()); var a = Number(hoje.slice(0, 4));
      return hoje.slice(5) <= '05-31' ? [a - 1, a] : [a];
    },
    aplica: function (g, hoje) {
      return !!(g && (g.irpf || medica(g)) && g.data && g.fluxo !== 'entrada' && API.anoAberto(hoje).indexOf(Number(g.data.slice(0, 4))) >= 0);
    },
    reg: function (gid) { return lista().find(function (x) { return x.id === gid; }) || null; },
    estado: function (g, hoje) {
      var r = g ? API.reg(g.id) : null;
      if (r) return r.estado;
      return API.aplica(g, hoje) ? 'aguardando' : '';
    },
    faltam: function (hoje) {
      return Gasto.todos().filter(function (g) { var e = API.estado(g, hoje); return e === 'aguardando' || e === 'pedida' || e === 'com'; })
        .sort(function (a, b) { return (b.data || '').localeCompare(a.data || ''); });
    },
    marcar: function (gid, estado, arquivoId) {
      var r = API.reg(gid);
      if (estado === 'aguardando') {
        /* 1.1.0: guarda os dados da consulta (pessoa, profissional, tipo) quando volta para aguardando */
        if (r && (r.pessoa != null || r.prof || r.tipo)) { r.estado = 'aguardando'; delete r.pedidaEm; delete r.com; return r; }
        ST[COL] = lista().filter(function (x) { return x.id !== gid; }); return null;
      }
      if (!r) { r = { id: gid }; lista().push(r); }
      r.estado = estado; r.em = new Date().toISOString();
      if (arquivoId) r.arquivo = arquivoId;
      return r;
    },
    /* 1.1.0 (3.91): o andamento da despesa médica: comprovante → nota pedida → nota recebida → guardada no IR (ou "a nota
       está com <pessoa>", ou "não vai ter nota (só recibo)") */
    ETAPAS: ['aguardando', 'pedida', 'com', 'recebida', 'ir', 'dispensada'],
    etapa: function (g) { var e = API.estado(g), r = API.reg(g.id); return e === 'recebida' && r && r.arquivo ? 'ir' : e; },
    rotuloEtapa: function (e) {
      return ({ aguardando: tr('só o comprovante', 'receipt only', 'solo el comprobante'), pedida: tr('nota pedida', 'invoice requested', 'factura pedida'), com: tr('a nota está com outra pessoa', 'someone else has the invoice', 'la factura la tiene otra persona'),
        recebida: tr('nota recebida', 'invoice received', 'factura recibida'), ir: tr('guardada no IR', 'kept for taxes', 'guardada para la renta'), dispensada: tr('não vai ter nota (só recibo)', 'no invoice (receipt only)', 'no habrá factura (solo recibo)') })[e] || e;
    },
    /* os dados da consulta: a pessoa atendida, o profissional (nome e CPF/CNPJ) e o tipo */
    dados: function (g) { var r = API.reg(g.id) || {}; return { pessoa: r.pessoa != null ? r.pessoa : (g.paraQuem || g.quem || ''), prof: r.prof || '', doc: r.doc || '', tipo: r.tipo || '', com: r.com || '', pedidaEm: r.pedidaEm || '' }; },
    guardarDados: function (gid, d) { var r = API.reg(gid); if (!r) { r = { id: gid, estado: 'aguardando' }; lista().push(r); } Object.assign(r, d); return r; },
    medica: medica,
    /* "Terapia ocupacional da <pessoa>, 17/11, R$ 370 (Pix): falta a nota fiscal" */
    frase: function (g) {
      var d = API.dados(g), o = (g.sub && !/^sem categoria$/i.test(g.sub) ? g.sub : (g.desc || '')), quem = d.pessoa ? quemVer(d.pessoa) : '';
      var forma = /pix/i.test([g.forma, g.desc].join(' ')) ? 'Pix' : (g.cartaoId ? tr('cartão', 'card', 'tarjeta') : (g.forma || ''));
      return o + (quem ? (/a$/i.test(quem.split(' ')[0]) ? tr(' da ', ' for ', ' de ') : tr(' do ', ' for ', ' de ')) + quem : '') + ', ' + I18n.data(g.data, { semAno: true }) + ', ' + fmt(g.valor) + (forma ? ' (' + forma + ')' : '');
    },
    /* o nome no padrão do dono: "AAAA-MM-DD Pessoa - tipo - sessão.pdf" */
    nomeSugerido: function (g) {
      var d = API.dados(g), oq = String((g.sub && !/^sem categoria$/i.test(g.sub)) ? g.sub : (d.tipo || g.desc || 'consulta')).toLowerCase();
      /* o tipo marcado ou, sem ele, deduzido da categoria (terapia → sessão; dentista, médico → consulta; exame) */
      var tp = d.tipo || (/terapia|psic|fono|fisio/i.test(oq) ? 'terapia' : /exame|laborat|imagem/i.test(oq) ? 'exame' : /consulta|m[eé]dic|dentist|odont|pediatr/i.test(oq) ? 'consulta' : '');
      var fim = { terapia: tr('sessão', 'session', 'sesión'), consulta: tr('consulta', 'visit', 'consulta'), exame: tr('exame', 'test', 'prueba') }[tp] || '';
      return ArquivosFamilia.nomeLimpo((g.data || hojeISO()) + ' ' + [quemVer(d.pessoa) || '', oq, fim].filter(Boolean).join(' - ')) + '.pdf';
    },
    /* o relatório do IR: as despesas médicas do ano, por pessoa, com o que tem nota e o que falta */
    relatorio: function (ano) {
      var por = {};
      Gasto.todos().filter(function (g) { return (g.irpf || medica(g)) && g.fluxo !== 'entrada' && String(g.data).slice(0, 4) === String(ano) && API.estado(g, ano + '-06-01') !== ''; }).forEach(function (g) {
        var p = quemVer(API.dados(g).pessoa) || tr('(sem pessoa)', '(no person)', '(sin persona)'), x = por[p] || (por[p] = { pessoa: p, total: 0, comNota: 0, falta: 0, recibo: 0, itens: [] });
        var e = API.etapa(g); x.total += g.valor; x.itens.push({ g: g, etapa: e });
        if (e === 'recebida' || e === 'ir') x.comNota += g.valor; else if (e === 'dispensada') x.recibo += g.valor; else x.falta += g.valor;
      });
      return Object.keys(por).sort().map(function (k) { var x = por[k]; ['total', 'comNota', 'falta', 'recibo'].forEach(function (c) { x[c] = Math.round(x[c] * 100) / 100; }); return x; });
    },
    nomeArquivo: function (g) {
      if (medica(g)) return API.nomeSugerido(g);   /* 1.1.0 (3.91) */
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
      '<div class="head-acoes"><button class="btn sm" data-acao="nf2-relatorio">📊 ' + esc(tr('Relatório do IR', 'Tax report', 'Informe para la renta')) + '</button> <button class="btn primary sm" data-acao="nf-subir">📎 ' + (pt() ? 'Subir NFs (PDF)' : 'Upload invoices (PDF)') + '</button></div></div>' +
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

  /* ---------- 1.1.0 (3.91): a despesa médica ---------- */
  var TIPOS_M = [['consulta', 'Consulta', 'Visit', 'Consulta'], ['terapia', 'Terapia', 'Therapy', 'Terapia'], ['exame', 'Exame', 'Test', 'Prueba'], ['outro', 'Outro', 'Other', 'Otro']];
  function blocoMedico(g) {
    var d = API.dados(g), e = API.etapa(g), r = API.reg(g.id) || {};
    var passos = ['aguardando', 'pedida', 'recebida', 'ir'].map(function (k) { var feito = API.ETAPAS.indexOf(e) >= API.ETAPAS.indexOf(k) && e !== 'dispensada' && e !== 'com' || k === e; return '<span class="nf-passo' + (feito ? ' on' : '') + '">' + esc(API.rotuloEtapa(k)) + '</span>'; }).join(' → ');
    return '<div class="bloco-regra nf-form nf-med" data-nfgid="' + esc(g.id) + '"><span class="bf-tit">🩺 ' + esc(tr('Despesa médica: ', 'Medical expense: ', 'Gasto médico: ') + API.rotuloEtapa(e)) + '</span>' +
      '<p class="tiny" style="margin:2px 0 6px">' + passos + '</p>' +
      (typeof recOpcoesPessoa === 'function' ? recOpcoesPessoa('nf2Pess') : '') +
      '<div class="grid g2"><label class="field"><span>' + esc(tr('Quem foi atendido', 'Who was seen', 'Quién fue atendido')) + '</span><input data-nf2="pessoa" list="nf2Pess" value="' + esc(quemVer(d.pessoa)) + '"></label>' +
      '<label class="field"><span>' + esc(tr('Tipo', 'Type', 'Tipo')) + '</span><select data-nf2="tipo"><option value="">—</option>' + TIPOS_M.map(function (x) { return '<option value="' + x[0] + '"' + (d.tipo === x[0] ? ' selected' : '') + '>' + esc(tr(x[1], x[2], x[3])) + '</option>'; }).join('') + '</select></label>' +
      '<label class="field"><span>' + esc(tr('Profissional', 'Provider', 'Profesional')) + '</span><input data-nf2="prof" maxlength="80" value="' + esc(d.prof) + '"></label>' +
      '<label class="field"><span>' + esc(tr('CPF ou CNPJ (se tiver)', 'CPF or CNPJ (if any)', 'CPF o CNPJ (si hay)')) + '</span><input data-nf2="doc" maxlength="18" inputmode="numeric" value="' + esc(d.doc) + '"></label></div>' +
      '<p class="tiny muted" style="margin:4px 0">' + esc(tr('Nome para a pasta do IR: ', 'Name for the tax folder: ', 'Nombre para la carpeta de la renta: ')) + '<code class="nf2-nome">' + esc(API.nomeSugerido(g)) + '</code> <button type="button" class="linkinho" data-acao="nf2-copiar" data-id="' + esc(g.id) + '">' + esc(tr('copiar', 'copy', 'copiar')) + '</button></p>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap">' + botoesMed(g, e, r) + '</div></div>';
  }
  function botoesMed(g, e, r) {
    var b = function (acao, txt, extra) { return '<button type="button" class="btn sm" data-acao="' + acao + '" data-id="' + esc(g.id) + '"' + (extra || '') + '>' + esc(txt) + '</button>'; };
    return b('nf-anexar', '📎 ' + tr('Anexar', 'Attach', 'Adjuntar')) +
      (e !== 'pedida' && e !== 'recebida' && e !== 'ir' ? b('nf2-pedi', tr('Pedi a nota', 'I asked for the invoice', 'Pedí la factura')) : '') +
      (e !== 'recebida' && e !== 'ir' ? b('nf-recebi', tr('Recebi a nota', 'Got the invoice', 'Recibí la factura')) : '') +
      (e !== 'com' ? b('nf2-com', tr('A nota foi para outra pessoa', 'The invoice went to someone else', 'La factura fue a otra persona')) : '') +
      (e !== 'dispensada' ? b('nf-dispensar', tr('Não vai ter nota (só recibo)', 'No invoice (receipt only)', 'No habrá factura (solo recibo)')) : '') +
      (r && r.arquivo ? '<button type="button" class="btn sm" data-acao="ir-baixar" data-id="' + esc(r.arquivo) + '">📄 ' + esc(tr('Ver', 'See', 'Ver')) + '</button>' : '') +
      (e !== 'aguardando' ? b('nf-voltar', tr('Voltar para o começo', 'Back to the start', 'Volver al inicio')) : '');
  }
  /* o que falta, para o 📥 (a nota pedida volta a lembrar 7 dias depois) */
  function pendentesMed() {
    var h = hoje();
    return API.faltam(h).filter(function (g) {
      if (!medica(g)) return false;
      var e = API.estado(g, h), r = API.reg(g.id) || {};
      if (e === 'com') return false;
      if (e === 'pedida') return r.pedidaEm && dias(h, r.pedidaEm) >= 7;
      return true;
    });
  }
  function abrirRelatorio(ano) {
    ano = ano || anoTax();
    var l = API.relatorio(ano);
    $('#genTitle').textContent = tr('Despesas médicas de ', 'Medical expenses ', 'Gastos médicos de ') + ano + tr(' (para o IR)', ' (for taxes)', ' (para la renta)');
    $('#genBody').innerHTML = Verter.html((l.length ? l.map(function (x) {
      return '<div class="card sem-pad" style="margin-bottom:10px"><div class="card-head" style="padding:10px 14px 0"><h3>' + esc(x.pessoa) + '</h3><span class="small">' + fmt(x.total) + '</span></div>' +
        '<p class="small" style="margin:4px 14px">' + esc(tr('com nota ', 'with invoice ', 'con factura ') + fmt(x.comNota) + ' · ' + tr('falta ', 'missing ', 'falta ') + fmt(x.falta) + (x.recibo ? ' · ' + tr('só recibo ', 'receipt only ', 'solo recibo ') + fmt(x.recibo) : '')) + '</p>' +
        '<table class="tbl"><tbody>' + x.itens.sort(function (a, b) { return a.g.data < b.g.data ? -1 : 1; }).map(function (i) {
          return '<tr><td class="nowrap">' + esc(I18n.data(i.g.data)) + '</td><td>' + esc(i.g.sub || i.g.desc || '') + '</td><td class="num">' + fmt(i.g.valor) + '</td><td>' + esc(API.rotuloEtapa(i.etapa)) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }).join('') : '<p class="small muted">' + esc(tr('Nenhuma despesa médica neste ano.', 'No medical expenses this year.', 'Ningún gasto médico este año.')) + '</p>') +
      '<div class="f-actions"><button class="btn primary" data-close="genModal">' + esc(tr('Fechar', 'Close', 'Cerrar')) + '</button></div>');
    delete $('#genBody').dataset.inbox;
    abrir('genModal');
  }
  /* os campos da consulta gravam ao mudar */
  document.addEventListener('change', function (ev) {
    var el = ev.target, box = el && el.closest && el.closest('[data-nfgid]'); if (!box || !el.dataset.nf2) return;
    var d = {}; d[el.dataset.nf2] = String(el.value || '').trim();
    if (el.dataset.nf2 === 'pessoa' && window.Pessoas) { var o = { pessoa: d.pessoa }; Pessoas.ligar(o, 'pessoa', 'pessoaId'); d.pessoa = o.pessoa; if (o.pessoaId) d.pessoaId = o.pessoaId; }
    API.guardarDados(box.dataset.nfgid, d); Store.salvar();
    var g = Gasto.todos().find(function (x) { return x.id === box.dataset.nfgid; }), n = box.querySelector('.nf2-nome'); if (g && n) n.textContent = API.nomeSugerido(g);
  });

  function botaoLinha(g) {
    var e = API.estado(g);
    if (e === 'aguardando') return '<button class="nf-tag nf-falta" data-acao="nf-recebi" data-id="' + esc(g.id) + '" title="' + esc(pt() ? 'toque quando receber a nota fiscal' : 'tap when you get the invoice') + '">🧾 ' + (pt() ? 'NF aguardando' : 'invoice pending') + '</button>';
    if (e === 'recebida') { var r = API.reg(g.id); return '<button class="nf-tag nf-ok"' + (r && r.arquivo ? ' data-acao="ir-baixar" data-id="' + esc(r.arquivo) + '"' : '') + '>🧾 ' + (pt() ? 'NF ✓' : 'invoice ✓') + '</button>'; }
    return '';
  }

  MoneyModulos.registrar({
    id: 'nf-ir',
    versao: '1.1.0',
    colecoes: [COL],
    pontos: {
      'lancamento.linha': function (ctx) { var b = ctx.g ? botaoLinha(ctx.g) : ''; return b ? '<div class="t-sub">' + b + '</div>' : ''; },
      'lancamento.form': function (ctx) {
        var g = ctx.g; if (!g || !API.estado(g)) return '';
        if (medica(g)) return blocoMedico(g);   /* 1.1.0 (3.91) */
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
      'inbox.grupos': function () {
        var l = pendentesMed(); if (!l.length) return [];
        return [{ id: 'docs', n: l.length, html: l.map(function (g) {
          var e = API.estado(g);
          return '<li class="inb-item"><div><b>🩺 ' + esc(API.frase(g) + tr(': falta a nota fiscal', ': the invoice is missing', ': falta la factura')) + '</b>' +
            '<span class="t-sub">' + esc(e === 'pedida' ? tr('pedida em ', 'asked on ', 'pedida el ') + I18n.data((API.reg(g.id) || {}).pedidaEm) + tr(' — ainda não chegou', ' — not here yet', ' — aún no ha llegado') : API.nomeSugerido(g)) + '</span></div><span class="inb-acoes">' +
            '<button class="btn sm primary" data-acao="nf-anexar" data-id="' + esc(g.id) + '">📎 ' + esc(tr('Anexar', 'Attach', 'Adjuntar')) + '</button>' +
            '<button class="btn sm" data-acao="nf2-pedi" data-id="' + esc(g.id) + '">' + esc(e === 'pedida' ? tr('Pedi de novo', 'Asked again', 'La pedí otra vez') : tr('Pedi a nota', 'I asked for it', 'La pedí')) + '</button>' +
            '<button class="btn sm" data-acao="nf2-com" data-id="' + esc(g.id) + '">' + esc(tr('Foi para outra pessoa', 'Went to someone else', 'Fue a otra persona')) + '</button>' +
            '<button class="btn sm" data-acao="nf-dispensar" data-id="' + esc(g.id) + '">' + esc(tr('Só recibo', 'Receipt only', 'Solo recibo')) + '</button></span></li>';
        }).join('') + '<li class="inb-item"><div><span class="t-sub">' + esc(tr('As despesas médicas do ano, por pessoa:', 'The year\'s medical expenses, per person:', 'Los gastos médicos del año, por persona:')) + '</span></div><span class="inb-acoes"><button class="btn sm" data-acao="nf2-relatorio">📊 ' + esc(tr('Relatório do IR', 'Tax report', 'Informe para la renta')) + '</button></span></li>' }];
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
      'nf2-pedi': function (el) { var r = API.marcar(el.dataset.id, 'pedida'); r.pedidaEm = hoje(); Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN(); toast(tr('Anotado: o app lembra de novo em 7 dias.', 'Noted: the app reminds you again in 7 days.', 'Anotado: la app te lo recuerda en 7 días.')); },
      'nf2-com': function (el) {
        var quem = window.prompt ? prompt(tr('Com quem está a nota?', 'Who has the invoice?', '¿Quién tiene la factura?'), '') : '';
        var r = API.marcar(el.dataset.id, 'com'); r.com = String(quem || '').trim(); Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN();
      },
      'nf2-copiar': function (el) {
        var g = Gasto.todos().find(function (x) { return x.id === el.dataset.id; }); if (!g) return;
        var n = API.nomeSugerido(g); try { navigator.clipboard.writeText(n); } catch (e) { /* sem área de transferência */ }
        toast(tr('Nome copiado: ', 'Name copied: ', 'Nombre copiado: ') + n);
      },
      'nf2-relatorio': function () { abrirRelatorio(); },
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
