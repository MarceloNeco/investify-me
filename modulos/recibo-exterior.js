/* =====================================================================
   modulos/recibo-exterior.js — RECIBO DE SERVIÇO DO EXTERIOR × CARTÃO (3.91)        1.0.1 · 24/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 18/Nov/2026; sem IA)
     · "📋 Colar print" e "Escolher arquivo" (modulos/print-colar.js) também leem o recibo de um serviço do exterior (imagem
       ou PDF de texto): o serviço, o valor na moeda, a data e o número do recibo.
     · Casa com o lançamento do cartão (o mesmo serviço, data ±5 dias) e o IOF do mesmo cartão perto dele, e mostra a
       diferença: "Recibo US$ 700,00 (≈ R$ 3.850,00) × cartão R$ 4.066,01 + IOF R$ 142,31" (o ≈ é a PTAX de compra do dia,
       do Banco Central, quando dá para buscar; sem internet, sai sem ele).
     · Marca do negócio ou da casa: vale para a ORIGEM do lançamento em "Custos do negócio pagos no CPF" (ST.pj_cpf, 3.82).
     · Recibo sem o lançamento do cartão fica no 📥 até o cartão mostrar.
     · Visão da casa: nada (é do chefe; a coleção é reservada).
     · 1.0.1 (3.104): recibo em REAIS (moeda 'BRL': desde out/2026 a Anthropic cobra o Claude Pro em R$): casa direto pelo valor em reais
       (o mesmo valor, ±1 centavo, ±5 dias; o nome do serviço desempata), sem câmbio nem IOF: "Recibo R$ 110,00 = cartão R$ 110,00".
       Com USD (ou outra moeda), como antes.
   API (window.ReciboExterior)
     ehRecibo(texto) · ler(texto) → {servico, moeda, valorMoeda, data, numero} | null · receber(recibos, abrir?)
     casar(rec) → {g, iof} | null · lista()
   DADOS
     ST.recibos_ext = [{id, servico, moeda, valorMoeda, data, numero, gastoId, iofId, cambio, marca: 'negocio'|'casa'|''}]
   PONTOS QUE USA
     inbox.grupos ('docs') · ações re-*
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'recibos_ext', JANELA = 5;
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  /* 3.143 (desempenho): a data vira número uma vez só (antes era lida de novo a cada comparação: milhões de vezes com muitos lançamentos) */
  var _dn = {}; function dn(s) { var v = _dn[s]; if (v === undefined) { v = Date.parse(s + 'T12:00:00Z') / 86400000; _dn[s] = v; } return v; }
  function dias(a, b) { return Math.round(dn(a) - dn(b)); }
  var MESES = { jan: 1, feb: 2, fev: 2, mar: 3, apr: 4, abr: 4, may: 5, mai: 5, jun: 6, jul: 7, aug: 8, ago: 8, sep: 9, set: 9, oct: 10, out: 10, nov: 11, dec: 12, dez: 12 };
  var SIMB = { '$': 'USD', 'US$': 'USD', 'USD': 'USD', '€': 'EUR', 'EUR': 'EUR', '£': 'GBP', 'GBP': 'GBP' };
  function dataDe(t) {
    var m = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i);
    if (m) return m[3] + '-' + ('0' + MESES[m[1].toLowerCase().slice(0, 3)]).slice(-2) + '-' + ('0' + m[2]).slice(-2);
    m = t.match(/\b(\d{1,2})\s+(jan|fev|feb|mar|abr|apr|mai|may|jun|jul|ago|aug|set|sep|out|oct|nov|dez|dec)[a-z]*\.?\s+(\d{4})/i);
    if (m) return m[3] + '-' + ('0' + MESES[m[2].toLowerCase().slice(0, 3)]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
    m = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/); if (m) return m[0];
    m = t.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/); if (m) return m[3] + '-' + m[2] + '-' + m[1];
    return '';
  }
  function num(v) { v = String(v); return /,\d{2}$/.test(v) ? Number(v.replace(/\./g, '').replace(',', '.')) : Number(v.replace(/,/g, '')); }

  var API = {
    ehRecibo: function (t) {
      t = String(t || '');
      return /\b(receipt|invoice|recibo|fatura)\b/i.test(t) && /(US\$|USD|EUR|GBP|€|£|\$)\s?\d/.test(t) && !/compra aprovada/i.test(t);
    },
    ler: function (texto) {
      var t = String(texto || '').replace(/\r/g, ''), linhas = t.split('\n').map(function (l) { return l.trim(); }).filter(Boolean), j = linhas.join(' ');
      var re = /(amount paid|total paid|valor pago|total|amount due|amount)\s*:?\s*(US\$|USD|EUR|GBP|€|£|\$)\s?([\d.,]+\d)/i, m = j.match(re);
      if (!m) { m = j.match(/(US\$|USD|EUR|GBP|€|£|\$)\s?([\d.,]+\d)/); if (m) m = [m[0], '', m[1], m[2]]; }
      if (!m) return null;
      var moeda = SIMB[m[2].toUpperCase()] || SIMB[m[2]] || 'USD', valor = n2(num(m[3]));
      var nr = j.match(/(?:receipt|invoice|recibo|fatura)\s*(?:number|no\.?|n[ºo°]\.?|#)\s*:?\s*([A-Z0-9][A-Z0-9-]{3,})/i);
      var ls = linhas.map(function (l) { return l.match(/^(?:receipt|invoice|recibo|fatura)\s+(?:from|de)\s+(.{2,50})$/i) || l.match(/^(?:payment to|pagamento a|pago a)\s+(.{2,50})$/i); }).filter(Boolean)[0];
      var sv = ls || j.match(/(?:payment to|pagamento a|pago a)\s+([^\n,.]{2,40})/i);
      var servico = sv ? sv[1] : (linhas.find(function (l) { return l.length <= 40 && /[A-Za-z]{3,}/.test(l) && !/receipt|invoice|recibo|fatura|paid|total|date|data/i.test(l); }) || '');
      return { servico: servico.replace(/[,.]+$/, '').trim(), moeda: moeda, valorMoeda: valor, data: dataDe(j), numero: nr ? nr[1] : '' };
    },
    /* o lançamento do cartão (o mesmo serviço, ±5 dias) e o IOF do mesmo cartão perto dele */
    casar: function (rec) {
      var usados = {}; lista().forEach(function (x) { if (x.gastoId) usados[x.gastoId] = 1; });
      var parece = function (g) {
        var b = N([g.descRobo, g.desc, g.contraparte && g.contraparte.nome].join(' ')).replace(/ /g, '');
        /* uma palavra forte do serviço ("Anthropic, PBC" → "anthropic") dentro do texto do cartão ("ANTHROPIC*CLAUDE") */
        var ws = N(rec.servico).split(' ').filter(function (w) { return w.length >= 4 && !/^(inc|ltd|llc|pbc|corp|ltda|gmbh|company)$/.test(w); });
        return ws.some(function (w) { return b.indexOf(w) >= 0; }) || !!(window.PrintColar && PrintColar.lojaParecida(rec.servico, g.descRobo || g.desc));
      };
      var brl = rec.moeda === 'BRL';
      var cs = Gasto.todos().filter(function (g) { return g.fluxo === 'saida' && g.cartaoId && !usados[g.id] && !/\biof\b/i.test(g.desc || '') && rec.data && Math.abs(dias(g.data, rec.data)) <= JANELA && (brl ? Math.abs(Number(g.valor) - rec.valorMoeda) <= 0.011 : parece(g)); })
        .sort(function (a, b) { return (brl ? (parece(b) ? 1 : 0) - (parece(a) ? 1 : 0) : 0) || Math.abs(dias(a.data, rec.data)) - Math.abs(dias(b.data, rec.data)); });
      if (!cs.length) return null;
      /* em reais: o mesmo valor basta quando é um só; com mais de um, só o que tem o nome do serviço */
      if (brl) { var cn = cs.filter(parece); if (cs.length > 1 && cn.length !== 1) return null; return { g: cn[0] || cs[0], iof: null }; }
      var g = cs[0], iof = Gasto.todos().filter(function (x) { return x.cartaoId === g.cartaoId && /\biof\b/i.test([x.desc, x.descRobo, x.sub].join(' ')) && !usados[x.id] && Math.abs(dias(x.data, g.data)) <= JANELA && Number(x.valor) < g.valor * 0.1; })
        .sort(function (a, b) { return Math.abs(dias(a.data, g.data)) - Math.abs(dias(b.data, g.data)); })[0] || null;
      return { g: g, iof: iof };
    },
    receber: async function (recibos, abrirJanela) {
      if (casa()) return;
      var novos = [];
      recibos.forEach(function (r) {
        var ja = lista().find(function (x) { return (r.numero && x.numero === r.numero) || (x.servico === r.servico && x.valorMoeda === r.valorMoeda && x.data === r.data); });
        if (ja) { novos.push(ja); return; }
        var x = Object.assign({ id: 're' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), marca: '' }, r); lista().push(x); novos.push(x);
      });
      novos.forEach(ligar);
      /* o ≈ R$: a PTAX de compra do dia (sem internet, fica sem ele) */
      try {
        var usd = novos.filter(function (x) { return x.moeda === 'USD' && x.data && !x.cambio; });
        if (usd.length && window.BS2Extrato && BS2Extrato.ptax) { var px = await (API._ptax || BS2Extrato.ptax)(usd.map(function (x) { return x.data; })); usd.forEach(function (x) { if (px[x.data]) x.cambio = px[x.data]; }); }
      } catch (e) { /* sem cotação */ }
      Store.salvar();
      if (abrirJanela !== false) abrirRecibos(novos);
      if (typeof renderInboxN === 'function') renderInboxN();
    },
    lista: lista
  };
  var chaveLigar = '', listaLigar = null;
  function ligar(x) { if (x.gastoId || x.semCasar) return; var c = API.casar(x); if (c) { x.gastoId = c.g.id; x.iofId = c.iof ? c.iof.id : ''; } }
  function gasto(id) { return id ? Gasto.todos().find(function (g) { return g.id === id; }) : null; }
  function frase(x) {
    var g = gasto(x.gastoId), iof = gasto(x.iofId), ms = x.moeda === 'USD' ? 'US$ ' : x.moeda === 'EUR' ? '€ ' : x.moeda === 'BRL' ? 'R$ ' : x.moeda + ' ';
    var s = tr('Recibo ', 'Receipt ', 'Recibo ') + ms + I18n.num(x.valorMoeda, 2) + (x.cambio ? ' (≈ ' + fmt(n2(x.valorMoeda * x.cambio)) + ')' : '');
    if (!g) return s + tr(' · o cartão ainda não mostrou', ' · not on the card yet', ' · aún no aparece en la tarjeta');
    if (x.moeda === 'BRL') return s + ' = ' + tr('cartão ', 'card ', 'tarjeta ') + fmt(g.valor) + tr(' (em reais: sem câmbio nem IOF)', ' (in reais: no exchange rate or IOF)', ' (en reales: sin cambio ni IOF)');
    return s + ' × ' + tr('cartão ', 'card ', 'tarjeta ') + fmt(g.valor) + (iof ? ' + IOF ' + fmt(iof.valor) : '');
  }
  function marcar(x, tipo) {
    x.marca = tipo;
    var g = gasto(x.gastoId); if (!g || !window.Origem) return;
    var k = Origem.origemDe(g); if (!k) return;
    ST.pj_cpf = Array.isArray(ST.pj_cpf) ? ST.pj_cpf : [];
    var e = ST.pj_cpf.find(function (y) { return y.id === k; });
    if (e) e.tipo = tipo; else ST.pj_cpf.push({ id: k, nome: x.servico || g.desc || '', tipo: tipo });
  }
  function linha(x) {
    return '<div class="re-item" style="padding:8px 0;border-top:1px solid var(--line)"><b>🧾 ' + esc((x.servico || tr('Serviço do exterior', 'Foreign service', 'Servicio del exterior')) + ' · ' + I18n.data(x.data) + (x.numero ? ' · nº ' + x.numero : '')) + '</b>' +
      '<p class="small" style="margin:4px 0">' + esc(frase(x)) + '</p><div class="row" style="gap:6px;flex-wrap:wrap">' +
      '<button class="btn sm' + (x.marca === 'negocio' ? ' primary' : '') + '" data-acao="re-marca" data-id="' + esc(x.id) + '" data-v="negocio">💼 ' + esc(tr('Do negócio', 'Business', 'Del negocio')) + '</button>' +
      '<button class="btn sm' + (x.marca === 'casa' ? ' primary' : '') + '" data-acao="re-marca" data-id="' + esc(x.id) + '" data-v="casa">🏠 ' + esc(tr('Da casa', 'Household', 'De casa')) + '</button>' +
      (x.gastoId ? '<button class="btn sm" data-acao="re-naoe" data-id="' + esc(x.id) + '">' + esc(tr('Não é este lançamento', 'Not this entry', 'No es este movimiento')) + '</button>' : '<button class="btn sm" data-acao="re-procurar" data-id="' + esc(x.id) + '">' + esc(tr('Procurar de novo', 'Look again', 'Buscar de nuevo')) + '</button>') +
      '<button class="btn sm" data-acao="re-tirar" data-id="' + esc(x.id) + '">' + esc(tr('Tirar', 'Remove', 'Quitar')) + '</button></div></div>';
  }
  function abrirRecibos(l) {
    $('#genTitle').textContent = tr('Recibo × cartão', 'Receipt × card', 'Recibo × tarjeta');
    $('#genBody').innerHTML = Verter.html('<div id="reLista">' + l.map(linha).join('') + '</div>' +
      '<p class="tiny muted">' + esc(tr('A diferença entre o recibo e o cartão é o câmbio do banco; o IOF vem à parte. Do negócio: entra em "Custos do negócio pagos no CPF".', 'The gap between the receipt and the card is the bank\'s exchange rate; IOF comes separately. Business: goes to "Business costs paid personally".', 'La diferencia entre el recibo y la tarjeta es el cambio del banco; el IOF va aparte. Del negocio: entra en "Costes del negocio pagados como persona física".')) + '</p>' +
      '<div class="f-actions"><button class="btn primary" data-close="genModal">' + esc(tr('Pronto', 'Done', 'Listo')) + '</button></div>');
    delete $('#genBody').dataset.inbox;
    abrir('genModal');
  }
  function depois() { Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN(); }

  MoneyModulos.registrar({
    id: 'recibo-exterior', versao: '1.0.2', colecoes: [COL],
    pontos: {
      'inbox.grupos': function () {
        if (casa()) return [];
        /* 3.143 (desempenho): só procura de novo o lançamento do cartão quando os dados mudaram (antes, a cada desenho do 📥) */
        var k = [Gasto.todos().length, Store.salvos || 0, lista().length].join('|');
        if (k !== chaveLigar || lista() !== listaLigar) { lista().forEach(ligar); chaveLigar = k; listaLigar = lista(); }
        var l = lista().filter(function (x) { return !x.gastoId || !x.marca; }); if (!l.length) return [];
        return [{ id: 'docs', n: l.length, html: l.map(function (x) {
          return '<li class="inb-item"><div><b>🧾 ' + esc((x.servico || '') + ' · ' + I18n.data(x.data)) + '</b><span class="t-sub">' + esc(frase(x) + (x.gastoId ? tr(' · do negócio ou da casa?', ' · business or household?', ' · ¿del negocio o de casa?') : '')) + '</span></div><span class="inb-acoes">' +
            (x.gastoId ? '<button class="btn sm" data-acao="re-marca" data-id="' + esc(x.id) + '" data-v="negocio">💼 ' + esc(tr('Negócio', 'Business', 'Negocio')) + '</button><button class="btn sm" data-acao="re-marca" data-id="' + esc(x.id) + '" data-v="casa">🏠 ' + esc(tr('Casa', 'Household', 'Casa')) + '</button>' : '') +
            '<button class="btn sm" data-acao="re-tirar" data-id="' + esc(x.id) + '">' + esc(tr('Tirar', 'Remove', 'Quitar')) + '</button></span></li>';
        }).join('') }];
      }
    },
    acoes: {
      're-marca': function (el) { var x = lista().find(function (y) { return y.id === el.dataset.id; }); if (!x) return; marcar(x, el.dataset.v); depois(); var b = document.getElementById('reLista'); if (b) b.innerHTML = Verter.html(lista().filter(function (y) { return y.id === x.id; }).map(linha).join('')); },
      're-naoe': function (el) { var x = lista().find(function (y) { return y.id === el.dataset.id; }); if (!x) return; x.gastoId = ''; x.iofId = ''; x.semCasar = true; depois(); fechar('genModal'); },
      're-procurar': function (el) { var x = lista().find(function (y) { return y.id === el.dataset.id; }); if (!x) return; delete x.semCasar; ligar(x); depois(); if (!x.gastoId) toast(tr('O cartão ainda não mostrou.', 'Not on the card yet.', 'Aún no aparece en la tarjeta.')); },
      're-tirar': function (el) { ST[COL] = lista().filter(function (y) { return y.id !== el.dataset.id; }); depois(); }
    }
  });
  window.ReciboExterior = API;
})();
