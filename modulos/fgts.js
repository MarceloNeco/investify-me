/* =====================================================================
   modulos/fgts.js — extrato do FGTS: leitura do PDF e saldo estimado entre um extrato e outro   1.0.0 · 06/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     · "📄 Ler extrato do FGTS (PDF)" no cartão 🔒 Sem liquidez: lê, SEM IA e por modelo, o PDF que o app
       oficial do FGTS gera ("Gerar extrato PDF", um por conta): empregador, admissão, afastamento, saldo,
       data da atualização e os lançamentos (115-DEPOSITO, CREDITO DE JAM, AC CRED DIST RESULTADO,
       SAQUE…, DEP MULTA RESCISORIA…). Vários PDFs de uma vez. Prévia: "atualizar FGTS — <empregador>"
       (o que já existe) ou "novo"; só grava depois da confirmação.
     · Entre uma leitura e outra, o saldo é ESTIMADO: JAM mensal (3% a.a. + TR, creditado por volta do dia 21)
       pela taxa do último CREDITO DE JAM do extrato (sem ele, 3% a.a. sem TR). A linha mostra
       "estimado desde dd/mm/aaaa". A distribuição de resultado anual (julho/agosto) fica "a confirmar":
       não entra na estimativa.
     · Em agosto: "atualize o FGTS" (sai a distribuição do ano), enquanto houver conta lida antes de 1º/ago.
     · Conta zerada (sacada) fica guardada e escondida (patrimonio-iliquido 1.1.0).
   API (window.Fgts)
     lerExtrato(texto)        → null | {empregador, cnpj, admissao, afastamento, saldo, data, lancs:[{d, t, v, total}], taxaJam}
     taxaPadrao               → 0.0024663 (3% a.a. ao mês, sem TR)
     estimar(item, hoje?)     → {valor, desde, meses, taxa} | null (null = nada a estimar)
     acharConta(empregador)   → item de patrimonio_iliquido (tipo fgts) do mesmo empregador | null
     precisaAtualizar(hoje?)  → true em agosto, se alguma conta com saldo foi lida antes de 1º/ago do ano
   DADOS
     Não tem coleção própria: usa a de patrimonio-iliquido. Cada conta é um item {tipo:'fgts', nome:'FGTS — <empregador>',
     inst, valor (saldo do extrato), data (data do extrato), fgts:{empregador, admissao, afastamento, taxaJam, lancs (últimos 60)}}.
   PONTOS QUE USA
     iliquido.valor (o valor estimado) · iliquido.topo (botão e aviso de agosto) · ações fgts-* · genModal · Fundo
   ===================================================================== */
(function () {
  'use strict';
  var TAXA_3AA = Math.round((Math.pow(1.03, 1 / 12) - 1) * 1e7) / 1e7;   /* 0.0024663 */
  var DIA_JAM = 21;
  var PARADAS = ['ltda', 'sa', 's', 'a', 'brasil', 'do', 'da', 'de', 'dos', 'das', 'e', 'servicos', 'servico', 'informacao', 'informacoes',
    'tecnologia', 'comercio', 'industria', 'consultoria', 'participacoes', 'me', 'epp', 'eireli', 'grupo', 'cia', 'companhia', 'fgts'];
  function pt() { return I18n.atual === 'pt'; }
  function sa(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function num(t) { var n = String(t || '').replace(/\s/g, ''); var neg = /^-|-$/.test(n); n = Number(n.replace(/-/g, '').replace(/\./g, '').replace(',', '.')) || 0; return neg ? -n : n; }
  function br2iso(t) { var m = String(t || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function titulo(t) { return String(t || '').toLowerCase().replace(/(^|\s)\S/g, function (m) { return m.toUpperCase(); }).replace(/\s+/g, ' ').trim(); }
  function chaves(t) { return sa(t).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(function (w) { return w.length > 1 && PARADAS.indexOf(w) < 0; }); }
  function contas() { return window.PatrimonioIliquido ? PatrimonioIliquido.lista().filter(function (x) { return x.tipo === 'fgts'; }) : []; }
  var DIN = '(-?\\s?\\d{1,3}(?:\\.\\d{3})*,\\d{2}-?)';
  var RX_LANC = new RegExp('^(\\d{2}\\/\\d{2}\\/\\d{4})\\s+(.+?)\\s+(?:r\\$\\s*)?' + DIN + '(?:\\s+(?:r\\$\\s*)?' + DIN + ')?\\s*$', 'i');

  var API = {
    taxaPadrao: TAXA_3AA,
    lerExtrato: function (texto) {
      var t = String(texto || ''), s = sa(t), m;
      if (!/fgts|fundo de garantia/.test(s) || !/empregador/.test(s)) return null;
      var o = { empregador: '', cnpj: '', admissao: '', afastamento: '', saldo: 0, data: '', lancs: [], taxaJam: 0 };
      if ((m = t.match(/empregador\s*:?[ \t]*([^\n]+)/i))) {
        var e = m[1].replace(/\b(?:cnpj|cei|cpf|inscri[cç][aã]o)\b.*$/i, '').replace(/[\d.\/-]{8,}.*$/, '').replace(/[|:]+$/, '').trim();
        o.empregador = titulo(e);
      }
      if ((m = t.match(/(?:cnpj|cei)\s*(?:\/\s*cei)?\s*:?\s*([\d.\/-]{11,20})/i))) o.cnpj = m[1];
      if ((m = s.match(/admiss[a]o\s*:?\s*(\d{2}\/\d{2}\/\d{4})/))) o.admissao = br2iso(m[1]);
      if ((m = s.match(/afastamento[^\d\n]{0,40}(\d{2}\/\d{2}\/\d{4})/))) o.afastamento = br2iso(m[1]);
      String(t).split(/\r?\n/).forEach(function (l) {
        var x = l.replace(/[ \t]+/g, ' ').trim().match(RX_LANC); if (!x) return;
        var desc = x[2].replace(/\s*r\$\s*$/i, '').trim(), v = num(x[3]), tot = x[4] != null ? num(x[4]) : null;
        if (/saque|debito|estorno/i.test(sa(desc)) && v > 0) v = -v;
        o.lancs.push({ d: br2iso(x[1]), t: desc, v: n2(v), total: tot == null ? null : n2(tot) });
      });
      var rxSaldo = [/saldo dispon[i]vel(?: para saque)?\s*:?\s*(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/, /saldo (?:atual|total)\s*:?\s*(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/,
        /valor para fins rescis[o]rios\s*:?\s*(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/, /saldo\s*:?\s*(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/];
      for (var k = 0; k < rxSaldo.length && !o.saldo; k++) { var all = s.match(new RegExp(rxSaldo[k].source, 'g')); if (all) o.saldo = num(all[all.length - 1].match(/(\d{1,3}(?:\.\d{3})*,\d{2})/)[1]); }
      var ult = o.lancs[o.lancs.length - 1];
      var temSaldo = /saldo/.test(s.replace(/saldo anterior/g, ''));
      if (!o.saldo && ult && ult.total != null) o.saldo = ult.total;
      if (!o.saldo && !temSaldo && !o.lancs.length) return null;
      o.saldo = n2(Math.max(0, o.saldo));
      if ((m = s.match(/(?:atualizad[oa]|posicao|saldo)\s*(?:em|ate)\s*:?\s*(\d{2}\/\d{2}\/\d{4})/)) || (m = s.match(/(?:data d[ao] (?:extrato|emissao|atualizacao))\s*:?\s*(\d{2}\/\d{2}\/\d{4})/))) o.data = br2iso(m[1]);
      if (!o.data && ult) o.data = ult.d;
      if (!o.data) o.data = hojeISO();
      /* taxa do último JAM: crédito ÷ saldo antes dele (a coluna total do extrato) */
      for (var j = o.lancs.length - 1; j >= 0; j--) {
        var L = o.lancs[j];
        if (/jam/i.test(L.t) && L.v > 0 && L.total != null && L.total - L.v > 0) { var tx = L.v / (L.total - L.v); if (tx > 0.0015 && tx < 0.01) { o.taxaJam = Math.round(tx * 1e7) / 1e7; } break; }
      }
      return o;
    },
    estimar: function (item, hoje) {
      if (!item || item.tipo !== 'fgts' || !(Number(item.valor) > 0) || !item.data) return null;
      hoje = String(hoje || hojeISO()).slice(0, 10);
      var taxa = (item.fgts && item.fgts.taxaJam) || TAXA_3AA, a = Number(item.data.slice(0, 4)), mm = Number(item.data.slice(5, 7)), n = 0;
      for (var k = 0; k < 600; k++) {
        var d = a + '-' + ('0' + mm).slice(-2) + '-' + DIA_JAM;
        if (d > hoje) break;
        if (d > item.data) n++;
        mm++; if (mm > 12) { mm = 1; a++; }
      }
      if (!n) return null;
      return { valor: n2(item.valor * Math.pow(1 + taxa, n)), desde: item.data, meses: n, taxa: taxa };
    },
    acharConta: function (empregador) {
      var ch = chaves(empregador); if (!ch.length) return null;
      return contas().find(function (x) { var c2 = chaves([x.inst, x.nome].join(' ')); return c2.indexOf(ch[0]) >= 0 || (c2.length && ch.indexOf(c2[0]) >= 0); }) || null;
    },
    precisaAtualizar: function (hoje) {
      hoje = String(hoje || hojeISO()).slice(0, 10);
      if (hoje.slice(5, 7) !== '08') return false;
      var corte = hoje.slice(0, 4) + '-08-01';
      return contas().some(function (x) { return Number(x.valor) > 0 && String(x.data || '') < corte; });
    }
  };

  /* ---------- ler e conferir ---------- */
  var fila = [];
  function curto(nome) { var c = chaves(nome); return c.length ? titulo(c.slice(0, 2).join(' ')) : titulo(nome); }
  function mostrarFila() {
    if (!fila.length) return;
    var h = '<p class="small muted">' + esc(pt() ? 'Lido sem IA, pelo modelo do extrato do app do FGTS. Confira antes de gravar: o saldo do extrato substitui o que estava; conta zerada fica guardada e escondida.'
      : 'Read by template (FGTS app statement), no AI. Check before saving.') + '</p>';
    fila.forEach(function (f, i) {
      var e = f.ext;
      h += '<div class="card fg-item"><label class="linha-check"><input type="checkbox" class="fg-ok" data-i="' + i + '"' + (e ? ' checked' : ' disabled') + '> <b>📄 ' + esc(f.arquivo) + '</b></label>';
      if (!e) { h += '<div class="small">' + esc(pt() ? 'Não parece um extrato do FGTS (ou o PDF é imagem).' : 'Does not look like an FGTS statement.') + '</div></div>'; return; }
      var alvo = f.alvo ? PatrimonioIliquido.lista().find(function (x) { return x.id === f.alvo; }) : null;
      h += '<div class="small">' + esc((alvo ? (pt() ? 'Atualizar ' : 'Update ') + alvo.nome + ': ' + fmt(alvo.valor) + ' → ' : (pt() ? 'Nova conta: FGTS — ' : 'New account: FGTS — ') + curto(e.empregador) + ': ') + fmt(e.saldo) +
          (pt() ? ' em ' : ' on ') + I18n.data(e.data)) + '</div>' +
        '<div class="tiny muted">' + esc([e.empregador, e.admissao ? (pt() ? 'admissão ' : 'hired ') + I18n.data(e.admissao) : '', e.afastamento ? (pt() ? 'afastamento ' : 'left ') + I18n.data(e.afastamento) : '',
          e.lancs.length + (pt() ? ' lançamentos' : ' entries'), e.taxaJam ? 'JAM ' + (e.taxaJam * 100).toFixed(4).replace('.', ',') + '%' + (pt() ? '/mês' : '/mo') : ''].filter(Boolean).join(' · ')) + '</div>' +
        (e.saldo ? '' : '<div class="tiny muted">' + esc(pt() ? 'Saldo zero: a conta fica guardada e escondida.' : 'Zero balance: kept and hidden.') + '</div>') + '</div>';
    });
    h += '<div class="f-actions"><button class="btn" data-close="genModal">' + esc(t('ac.cancelar')) + '</button><button class="btn primary" data-acao="fgts-gravar">' + (pt() ? 'Gravar' : 'Save') + '</button></div>';
    $('#genTitle').textContent = pt() ? 'Conferir o extrato do FGTS' : 'Check the FGTS statement';
    $('#genBody').innerHTML = Verter.html(h);
    abrir('genModal');
  }
  async function lerArquivos(arqs) {
    var tarefa = 'fgts-ler-' + Date.now(), temFundo = typeof Fundo !== 'undefined';
    fila = [];
    if (temFundo) Fundo.comecar({ id: tarefa, titulo: pt() ? 'Lendo o extrato do FGTS…' : 'Reading the FGTS statement…', aoAbrir: mostrarFila });
    for (var k = 0; k < arqs.length; k++) {
      var a = arqs[k]; if (temFundo) Fundo.passo(tarefa, (pt() ? 'Lendo ' : 'Reading ') + a.name, k / arqs.length);
      var txt = ''; try { txt = await PdfTexto.extrair(a, { linhas: true, aceitaVazio: true }); } catch (e) { txt = ''; }
      var ext = API.lerExtrato(txt), alvo = ext ? API.acharConta(ext.empregador) : null;
      fila.push({ arquivo: a.name, ext: ext, alvo: alvo ? alvo.id : '', bytes: new Uint8Array(await a.arrayBuffer()) });
    }
    if (temFundo) Fundo.terminar(tarefa, (pt() ? 'Extratos lidos: ' : 'Statements read: ') + arqs.length);
    mostrarFila();
  }
  async function gravarFila() {
    var marc = Array.from(document.querySelectorAll('#genBody .fg-ok:checked')).map(function (c) { return fila[Number(c.dataset.i)]; }).filter(function (f) { return f && f.ext; });
    var n = 0;
    for (var k = 0; k < marc.length; k++) {
      var f = marc[k], e = f.ext, x = f.alvo ? PatrimonioIliquido.lista().find(function (y) { return y.id === f.alvo; }) : null;
      var dados = { nome: x ? x.nome : 'FGTS — ' + curto(e.empregador), tipo: 'fgts', inst: x ? (x.inst || e.empregador) : e.empregador, valor: e.saldo, data: e.data, obs: x ? x.obs : '' };
      if (x) Object.assign(x, PatrimonioIliquido.arruma(dados)); else x = PatrimonioIliquido.adicionar(dados);
      x.fgts = { empregador: e.empregador, admissao: e.admissao, afastamento: e.afastamento, taxaJam: e.taxaJam, lancs: e.lancs.slice(-60) };
      try { if (window.ArquivosFamilia) await ArquivosFamilia.guardar({ nome: e.data + ' Extrato FGTS ' + curto(e.empregador) + '.pdf', tipo: 'fgts', ano: Number(e.data.slice(0, 4)), ligado: x.id }, f.bytes); } catch (er) {}
      n++;
    }
    fila = []; Store.salvar(); fechar('genModal'); render();
    toast(n + (pt() ? (n === 1 ? ' conta do FGTS atualizada.' : ' contas do FGTS atualizadas.') : ' FGTS account(s) updated.'));
  }

  MoneyModulos.registrar({
    id: 'fgts',
    versao: '1.0.0',
    pontos: {
      'iliquido.valor': function (ctx) {
        var e = API.estimar(ctx.item); if (!e) return [];
        return [{ valor: e.valor, nota: (pt() ? 'estimado desde ' : 'estimated since ') + I18n.data(e.desde) + (pt() ? ' (JAM; distribuição de resultado a confirmar)' : ' (JAM; yearly profit share to confirm)') }];
      },
      'iliquido.topo': function () {
        return (API.precisaAtualizar() ? '<div class="aviso-box fg-aviso small">📅 ' + esc(pt() ? 'Agosto: atualize o FGTS. Gere o extrato de cada conta no app do FGTS ("Gerar extrato PDF") e leia aqui — sai a distribuição de resultado do ano.'
            : 'August: update your FGTS. Export each account statement in the FGTS app and read it here.') + '</div>' : '') +
          '<button class="btn sm" data-acao="fgts-ler">📄 ' + (pt() ? 'Ler extrato do FGTS (PDF)' : 'Read FGTS statement (PDF)') + '</button>';
      }
    },
    acoes: {
      'fgts-ler': function () {
        var i = document.createElement('input'); i.type = 'file'; i.accept = 'application/pdf,.pdf'; i.multiple = true; i.style.display = 'none';
        i.addEventListener('change', function () { var l = Array.from(i.files || []); if (i.parentNode) i.parentNode.removeChild(i); if (l.length) lerArquivos(l).catch(function (e) { toast(e.message, 'err'); }); });
        document.body.appendChild(i); i.click();
      },
      'fgts-gravar': function () { gravarFila().catch(function (e) { toast(e.message, 'err'); }); }
    }
  });
  window.Fgts = API;
})();
