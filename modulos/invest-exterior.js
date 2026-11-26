/* =====================================================================
   modulos/invest-exterior.js — os avisos de investimento no exterior (Avenue) que o robô lê do e-mail (3.126)        1.0.0 · 26/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 26/Nov/2026; sem integração nova)
     O robô manda um comprovante com ficha.investimento_exterior = {corretora, ativo, cusip, data_pregao, conta_final}. É um EVENTO, sem
     valor: não vira movimento nem mexe na carteira (o valor vem do extrato da corretora). Não pede nada no 📥.
     · No topo da Carteira (InvestifyONE): "🌎 Eventos no exterior (do e-mail)": data do pregão · ativo (CUSIP) · corretora · conta ···final,
       com "sem valor: a posição vem do extrato da corretora". Os 10 mais novos.
   API (window.InvestExterior)  eventos() → [{id, corretora, ativo, cusip, data, conta}]
   PONTOS QUE USA  investify.carteira.topo
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function iso(d) { var s = String(d || ''), m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s); return m ? m[3] + '-' + m[2] + '-' + m[1] : s.slice(0, 10); }
  var API = {
    eventos: function () {
      return (window.Comprovantes ? Comprovantes.lista() : []).filter(function (x) { return x.ficha && x.ficha.investimento_exterior && x.estado !== 'dispensado'; }).map(function (x) {
        var f = x.ficha.investimento_exterior;
        return { id: x.id, corretora: String(f.corretora || ''), ativo: String(f.ativo || ''), cusip: String(f.cusip || ''), data: iso(f.data_pregao || x.data), conta: String(f.conta_final || '').replace(/\D/g, '').slice(-4) };
      }).sort(function (a, b) { return a.data < b.data ? 1 : -1; });
    }
  };
  MoneyModulos.registrar({
    id: 'invest-exterior', versao: '1.0.0', colecoes: [], telas: {}, ouvir: {}, acoes: {},
    pontos: {
      'investify.carteira.topo': function () {
        var l = API.eventos(); if (!l.length) return '';
        return '<div class="card ie-card"><div class="card-head"><h3>🌎 ' + esc(tr('Eventos no exterior (do e-mail)', 'Events abroad (from e-mail)', 'Eventos en el exterior (del correo)')) + '</h3></div><ul class="small" style="margin:0;padding-left:18px">' +
          l.slice(0, 10).map(function (e) { return '<li>' + esc([e.data ? I18n.data(e.data) : '', e.ativo + (e.cusip ? ' (CUSIP ' + e.cusip + ')' : ''), e.corretora, e.conta ? tr('conta ···', 'account ···', 'cuenta ···') + e.conta : ''].filter(Boolean).join(' · ')) + '</li>'; }).join('') +
          '</ul><p class="tiny muted" style="margin:6px 0 0">' + esc(tr('Sem valor: a posição vem do extrato da corretora.', 'No amount: the position comes from the broker statement.', 'Sin importe: la posición viene del extracto del bróker.')) + '</p></div>';
      }
    }
  });
  window.InvestExterior = API;
})();
