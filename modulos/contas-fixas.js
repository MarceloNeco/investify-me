/* =====================================================================
   modulos/contas-fixas.js — o cartão "Contas fixas do mês" no Painel do BudgetONE (3.74)        1.0.0 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 13/Nov/2026: "não acho as contas fixas")
     · A tela "Custos" passa a se chamar "Contas fixas" (e gastos recorrentes) no menu, na barra e na ajuda; o id da
       tela continua 'b-custos' (atalhos e links antigos seguem valendo).
     · No Painel: quantas contas fixas, o total por mês, as próximas 3 a vencer (nome, dia, valor, pago / a pagar) e o
       botão "Ver todas". Visão da casa: só os compromissos que ela já vê (os do Recorrente dela).
   API (window.ContasFixas)
     resumo() → {n, mensal, proximas: [{nome, data, valor, pago}]}
   PONTOS QUE USA
     budget.painel
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function hoje() { return API._hoje || hojeISO(); }
  function mais(iso, d) { var x = new Date(iso + 'T12:00:00'); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); }
  function saida(r) { return (GRUPOS[r.grupo] || {}).fluxo !== 'entrada'; }
  /* quanto a conta pesa por mês (a mesma conta do porMes, mas pela categoria, não por r.fluxo que pode faltar) */
  function mensalDe(r, base) {
    var vez = r.regra === 'semanal' ? 52 : r.regra === 'anual' ? 1 : 12 / (r.cada || 1);
    var v = (typeof Recorrente.valorEm === 'function' ? Recorrente.valorEm(r, base) : Number(r.valor) || 0) * vez / 12;
    if (r.regra !== 'anual' && (r.fora || []).length) v = v * (12 - r.fora.length) / 12;
    return v;
  }

  var API = {
    _hoje: null,
    resumo: function () {
      if (typeof Recorrente === 'undefined') return { n: 0, mensal: 0, proximas: [] };
      var h = hoje(), ativos = Recorrente.ativos().filter(saida);
      var mensal = ativos.reduce(function (s, r) { return s + mensalDe(r, h); }, 0);
      var prox = Recorrente.ocorrencias(h, mais(h, 62)).filter(function (o) { return saida(o.r) && o.estado !== 'cancelado' && o.data >= h; }).slice(0, 3)
        .map(function (o) { return { nome: o.r.nome, data: o.data, valor: Number(o.valor) || 0, pago: !!(ESTADOS_PG[o.estado] && !ESTADOS_PG[o.estado].conta) }; });
      return { n: ativos.length, mensal: Math.round(mensal * 100) / 100, proximas: prox };
    }
  };

  MoneyModulos.registrar({
    id: 'contas-fixas', versao: '1.0.0',
    pontos: {
      'budget.painel': function () {
        var r = API.resumo(); if (!r.n) return '';
        return '<div class="card cf-card"><div class="card-head"><h3>📌 ' + esc(tr('Contas fixas do mês', 'Fixed bills this month')) + '</h3>' +
          '<button class="btn sm" data-irpara="b-custos">' + esc(tr('Ver todas', 'See all')) + '</button></div>' +
          '<p class="cf-frase"><b>' + esc(r.n + (r.n === 1 ? tr(' conta fixa', ' fixed bill') : tr(' contas fixas', ' fixed bills')) + ' · ' + fmt(r.mensal) + tr(' por mês', ' a month')) + '</b></p>' +
          (r.proximas.length ? '<table class="tbl cf-prox"><tbody>' + r.proximas.map(function (o) {
            return '<tr><td><span class="t-main">' + esc(o.nome) + '</span><div class="t-sub">' + esc(tr('dia ', 'day ') + Number(o.data.slice(8, 10)) + ' · ' + I18n.data(o.data)) + '</div></td>' +
              '<td class="num">' + fmt(o.valor) + '<div class="t-sub ' + (o.pago ? 'up' : '') + '">' + esc(o.pago ? tr('pago', 'paid') : tr('a pagar', 'to pay')) + '</div></td></tr>';
          }).join('') + '</tbody></table>' : '<p class="small muted">' + esc(tr('Nada a vencer nos próximos dois meses.', 'Nothing due in the next two months.')) + '</p>') + '</div>';
      }
    }
  });
  window.ContasFixas = API;
})();
