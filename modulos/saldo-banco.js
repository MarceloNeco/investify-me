/* =====================================================================
   modulos/saldo-banco.js — conferência com o saldo do banco (3.64)        1.0.0 · 11/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     O robô manda, na mesma caixa (money_entrada), itens {"tipo":"saldo"}: o saldo que o banco mostra, por conta.
     Isso NUNCA vira lançamento (nuvem.js 1.11.0 desvia para cá). Por conta: "Saldo no banco" × "Saldo pelo app"
     (o primeiro saldo que chegou é o ajuste de abertura + as entradas − as saídas daquela conta depois dele).
     Diferença acima de R$ 1: "diferença de R$ X desde dd/mm", com o link para os lançamentos da conta no período.
     A diferença nunca é escondida. Cartão (saldo negativo = fatura em aberto): mostra a fatura; o app não confere
     cartão, porque o pagamento da fatura não vira lançamento.
   ITEM DO ROBÔ
     {tipo:'saldo', id:'saldo-<id da conta>-<aaaa-mm-dd>', banco, conta, dono, saldo, data, moeda, tipo_conta?}
   API (window.SaldoBanco)
     receber(item)        → true se guardou (o último por conta + histórico de 90 dias)
     contas()             → [registro]
     conferir(reg)        → {banco, app, dif, desde, cartao, n}
   DADOS
     Store.estado.saldos_banco = [{id:'sb_<conta>', banco, conta, dono, moeda, saldo, data, cartao, abertura:{data, saldo}, hist:[{data, saldo}]}]
   PONTOS QUE USA
     budget.painel (cartão "Conferência com o banco") · ação sb-ver
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'saldos_banco';
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function menos(iso, dias) { return new Date(Date.parse(iso + 'T12:00:00Z') - dias * 86400000).toISOString().slice(0, 10); }
  function ehCartao(it) { return String(it.tipo_conta || '').toLowerCase() === 'cartao' || /cart[aã]o|credit|card/i.test(String(it.conta || '')); }

  var API = {
    receber: function (it) {
      if (!it || typeof it !== 'object') return false;
      var saldo = Number(it.saldo), data = String(it.data || '');
      if (!isFinite(saldo) || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
      var chave = String(it.id || '').replace(/^saldo-/, '').replace(/-\d{4}-\d{2}-\d{2}$/, '') || N(it.banco + ' ' + it.conta);
      var id = 'sb_' + chave.replace(/[^A-Za-z0-9_.:@-]/g, '_').slice(0, 60);
      var r = lista().find(function (x) { return x.id === id; });
      if (!r) { r = { id: id, abertura: { data: data, saldo: saldo }, hist: [] }; lista().push(r); }
      r.banco = String(it.banco || '').trim().slice(0, 60); r.conta = String(it.conta || '').trim().slice(0, 80);
      r.dono = String(it.dono || '').trim().slice(0, 60); r.moeda = String(it.moeda || 'BRL').slice(0, 3); r.cartao = ehCartao(it);
      var h = r.hist.find(function (x) { return x.data === data; });
      if (h) h.saldo = saldo; else r.hist.push({ data: data, saldo: saldo });
      r.hist.sort(function (a, b) { return a.data < b.data ? -1 : 1; });
      var ult = r.hist[r.hist.length - 1];
      r.hist = r.hist.filter(function (x) { return x.data >= menos(ult.data, 90); });
      r.saldo = ult.saldo; r.data = ult.data;
      if (data < r.abertura.data) r.abertura = { data: data, saldo: saldo };
      return true;
    },
    contas: lista,
    /* os lançamentos daquela conta: o banco bate; a conta do robô bate (ou o banco tem uma conta só); cartão fica fora */
    lancamentos: function (r) {
      var b = N(r.banco), contasDoBanco = lista().filter(function (x) { return N(x.banco) === b && !x.cartao; }).length;
      return Gasto.todos().filter(function (g) {
        if (N(g.conta) !== b || g.cartaoId || g.cartaoNome) return false;
        return g.contaRobo ? N(g.contaRobo) === N(r.conta) : contasDoBanco <= 1;
      });
    },
    saldoApp: function (r, ate, ls) {
      var s = Number(r.abertura.saldo) || 0;
      (ls || API.lancamentos(r)).forEach(function (g) {
        if (!g.data || g.data <= r.abertura.data || g.data > ate) return;
        s += g.fluxo === 'entrada' ? Math.abs(Number(g.valor) || 0) : -(Number(g.valor) || 0);   /* estorno (negativo) devolve */
      });
      return Math.round(s * 100) / 100;
    },
    conferir: function (r) {
      if (r.cartao) return { banco: r.saldo, app: null, dif: 0, cartao: true };
      var ls = API.lancamentos(r), app = API.saldoApp(r, r.data, ls), dif = Math.round((r.saldo - app) * 100) / 100, desde = '';
      if (Math.abs(dif) > 1) {
        desde = r.abertura.data;
        r.hist.forEach(function (h) { if (Math.abs(h.saldo - API.saldoApp(r, h.data, ls)) <= 1) desde = h.data; });
      }
      return { banco: r.saldo, app: app, dif: dif, desde: desde, cartao: false, n: ls.length };
    }
  };

  function cartao() {
    var l = lista(); if (!l.length) return '';
    var h = '<div class="card sb-card"><div class="card-head"><h3>🏦 ' + esc(tr('Conferência com o banco', 'Check against the bank')) + '</h3></div>' +
      '<table class="tbl"><thead><tr><th>' + esc(tr('Conta', 'Account')) + '</th><th class="num">' + esc(tr('Saldo no banco', 'Bank balance')) + '</th><th class="num">' +
      esc(tr('Saldo pelo app', 'Balance in the app')) + '</th></tr></thead><tbody>';
    l.slice().sort(function (a, b) { return (a.banco + a.conta).localeCompare(b.banco + b.conta); }).forEach(function (r) {
      var c = API.conferir(r);
      h += '<tr><td><span class="t-main">' + esc([r.banco, r.conta].filter(Boolean).join(' · ')) + '</span><div class="t-sub">' +
        esc((r.dono ? r.dono + ' · ' : '') + tr('lido em ', 'read on ') + fmtData(r.data)) + '</div>';
      if (c.cartao) h += '<div class="t-sub muted">' + esc(tr('cartão: a fatura em aberto (o app não confere cartão)', 'card: open bill (the app does not check cards)')) + '</div>';
      else if (Math.abs(c.dif) > 1) h += '<div class="t-sub sb-dif down">⚠ ' + esc(tr('diferença de ', 'difference of ') + fmt(c.dif) + tr(' desde ', ' since ') + c.desde.slice(8, 10) + '/' + c.desde.slice(5, 7)) +
        ' · <button class="linkinho" data-acao="sb-ver" data-id="' + esc(r.id) + '" data-de="' + esc(c.desde) + '" data-ate="' + esc(r.data) + '">' + esc(tr('ver os lançamentos', 'see the entries')) + '</button></div>';
      else h += '<div class="t-sub up">✓ ' + esc(tr('bate com o banco', 'matches the bank')) + '</div>';
      h += '</td><td class="num">' + fmt(c.banco) + '</td><td class="num">' + (c.cartao ? '—' : fmt(c.app)) + '</td></tr>';
    });
    return h + '</tbody></table><p class="tiny muted" style="margin:8px 0 0">' + esc(tr('O primeiro saldo que chegou de cada conta é o ponto de partida (ajuste de abertura).',
      'The first balance received for each account is the starting point (opening adjustment).')) + '</p></div>';
  }

  MoneyModulos.registrar({
    id: 'saldo-banco',
    versao: '1.0.0',
    colecoes: [COL],
    pontos: { 'budget.painel': cartao },
    acoes: {
      'sb-ver': function (el) {
        var r = lista().find(function (x) { return x.id === el.dataset.id; }); if (!r) return;
        bFiltro = Object.assign({}, bFiltro, { busca: r.banco, de: el.dataset.de, ate: el.dataset.ate, periodo: '' });
        irPara('b-lanc');
      }
    }
  });
  window.SaldoBanco = API;
})();
