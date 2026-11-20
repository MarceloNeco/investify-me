/* =====================================================================
   modulos/salto-preco.js — ALERTA DE SALTO DE PREÇO (3.91)        1.0.0 · 20/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 18/Nov/2026; sem IA)
     · Para cada conta fixa (os lançamentos ligados a ela) e cada gasto recorrente (a mesma ORIGEM — CNPJ → pessoa →
       descrição — uma vez por mês, em 4 meses ou mais; vale o lançamento à mão também), compara o valor novo com a média
       dos 3 anteriores. Passou de X% (15% por padrão; geral em Configurações e um por conta) → 📥 "NET: R$ 150,00, 38%
       acima da média (R$ 108,40)", com "Esperado (novo valor)", "Contestar/ver" e "Ignorar desta vez".
     · "Esperado" vira a nova base (e reajusta a previsão da conta fixa). "É o reajuste anual" marca o mês: nesse mês o
       app não assusta (plano de saúde em maio, escola em janeiro…).
     · Visão da casa: só o que ela vê (os lançamentos que estão no aparelho dela).
   API (window.SaltoPreco)
     alertas() → [{k, nome, g, valor, ref, pct, chave, r?}] · limite(chave, r?) · grupos()
   DADOS
     ST.config.saltoPct (geral) · ST.config.saltoPctDe {chave: %} · ST.config.saltoBase {chave: {valor, gid}}
     ST.config.saltoReajuste {chave: mês 1–12} · ST.config.inboxVistos ("Ignorar desta vez")
   PONTOS QUE USA
     inbox.grupos ('avisos') · config.todos · compromisso.form + evento compromisso.salvo (o % e o mês do reajuste da conta) · ações sp2-*
   ===================================================================== */
(function () {
  'use strict';
  var PADRAO = 15;
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function cfg() { return (ST.config = ST.config || {}); }
  function hoje() { return API._hoje || hojeISO(); }
  function mapa(k) { var c = cfg(); return (c[k] = c[k] || {}); }

  /* os grupos: cada conta fixa e cada origem que se repete uma vez por mês */
  function grupos() {
    var out = [], lim = new Date(Date.parse(hoje() + 'T12:00:00Z') - 400 * 86400000).toISOString().slice(0, 10);
    var gs = Gasto.todos().filter(function (g) { return g.fluxo === 'saida' && g.data && g.data >= lim && Number(g.valor) > 0 && !g.divisao; });
    (typeof Recorrente !== 'undefined' ? Recorrente.ativos() : []).forEach(function (r) {
      var l = gs.filter(function (g) { return g.recorrenteId === r.id; }).sort(function (a, b) { return a.data < b.data ? -1 : 1; });
      if (l.length >= 4) out.push({ chave: 'r:' + r.id, nome: r.nome, itens: l, r: r });
    });
    if (window.Origem) {
      var por = {};
      gs.forEach(function (g) { if (g.recorrenteId) return; var k = Origem.origemDe(g); if (!k || k.indexOf('u:') === 0) return; (por[k] = por[k] || []).push(g); });
      Object.keys(por).forEach(function (k) {
        var meses = {}; por[k].forEach(function (g) { var m = g.data.slice(0, 7); (meses[m] = meses[m] || []).push(g); });
        var ms = Object.keys(meses).sort(); if (ms.length < 4) return;
        /* uma vez por mês (o mercado, que vem várias vezes, não entra) */
        if (ms.slice(-4).some(function (m) { return meses[m].length > 1; })) return;
        var l = ms.map(function (m) { return meses[m][0]; });
        out.push({ chave: k, nome: window.Apelido ? Apelido.texto(l[l.length - 1]) : (l[l.length - 1].desc || ''), itens: l });
      });
    }
    return out;
  }

  var API = {
    _hoje: null, grupos: grupos,
    limite: function (chave, r) { var p = r && r.saltoPct != null ? r.saltoPct : mapa('saltoPctDe')[chave]; return Number(p != null && p !== '' ? p : (cfg().saltoPct != null ? cfg().saltoPct : PADRAO)) || PADRAO; },
    alertas: function () {
      var vistos = cfg().inboxVistos || {}, out = [];
      grupos().forEach(function (x) {
        var l = x.itens, g = l[l.length - 1], prev = l.slice(-4, -1);
        if (dias(hoje(), g.data) > 45) return;   /* só o valor novo (do último mês e meio) */
        var base = mapa('saltoBase')[x.chave], ref = base && base.gid !== g.id ? base.valor : n2(prev.reduce(function (s, y) { return s + Number(y.valor); }, 0) / prev.length);
        if (base && base.gid === g.id) return;   /* já é a base */
        var pct = ref > 0 ? Math.round((Number(g.valor) - ref) / ref * 100) : 0;
        if (pct <= API.limite(x.chave, x.r)) return;
        var mesR = x.r && x.r.reajusteMes ? x.r.reajusteMes : mapa('saltoReajuste')[x.chave];
        if (mesR && Number(mesR) === +g.data.slice(5, 7)) return;   /* o reajuste anual conhecido: não assusta */
        var k = 'salto|' + x.chave + '|' + g.id; if (vistos[k]) return;
        out.push({ k: k, chave: x.chave, nome: x.nome, g: g, valor: n2(g.valor), ref: ref, pct: pct, r: x.r });
      });
      return out;
    }
  };
  function dias(a, b) { return Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000); }
  function achar(k) { return API.alertas().find(function (x) { return x.k === k; }); }
  function depois() { Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN(); }

  MoneyModulos.registrar({
    id: 'salto-preco', versao: '1.0.0',
    pontos: {
      'inbox.grupos': function () {
        var l = API.alertas(); if (!l.length) return [];
        return [{ id: 'avisos', n: l.length, html: l.map(function (x) {
          return '<li class="inb-item"><div><b>📈 ' + esc(x.nome + ': ' + fmt(x.valor) + ', ' + x.pct + tr('% acima da média (', '% above the average (', '% por encima de la media (') + fmt(x.ref) + ')') + '</b>' +
            '<span class="t-sub">' + esc(I18n.data(x.g.data) + tr(' · avisa acima de ', ' · warns above ', ' · avisa por encima del ') + API.limite(x.chave, x.r) + '%') + '</span></div><span class="inb-acoes">' +
            '<button class="btn sm primary" data-acao="sp2-esperado" data-k="' + esc(x.k) + '">' + esc(tr('Esperado (novo valor)', 'Expected (new amount)', 'Esperado (nuevo importe)')) + '</button>' +
            '<button class="btn sm" data-acao="sp2-ver" data-id="' + esc(x.g.id) + '">' + esc(tr('Contestar/ver', 'Dispute/see', 'Reclamar/ver')) + '</button>' +
            '<button class="btn sm" data-acao="sp2-anual" data-k="' + esc(x.k) + '">' + esc(tr('É o reajuste anual', 'It is the yearly increase', 'Es la subida anual')) + '</button>' +
            '<button class="btn sm" data-acao="inb-visto" data-k="' + esc(x.k) + '">' + esc(tr('Ignorar desta vez', 'Ignore this time', 'Ignorar esta vez')) + '</button></span></li>';
        }).join('') }];
      },
      /* um por conta: o % e o mês do reajuste anual, no cadastro da conta fixa */
      'compromisso.form': function (ctx) {
        var r = (ctx && ctx.r) || {};
        return '<div class="grid g2 sp2-form" style="margin-top:8px"><label class="field"><span>' + esc(tr('Avisar se subir mais de (%)', 'Warn if it goes up more than (%)', 'Avisar si sube más de (%)')) + '</span><input id="sp2RPct" type="number" min="1" max="500" inputmode="numeric" placeholder="' + (cfg().saltoPct != null ? cfg().saltoPct : PADRAO) + '" value="' + (r.saltoPct != null ? r.saltoPct : '') + '"></label>' +
          '<label class="field"><span>' + esc(tr('Reajuste anual em', 'Yearly increase in', 'Subida anual en')) + '</span><select id="sp2RMes"><option value="">—</option>' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (m) { return '<option value="' + m + '"' + (Number(r.reajusteMes) === m ? ' selected' : '') + '>' + esc(I18n.mesLongo(m)) + '</option>'; }).join('') + '</select></label></div>';
      },
      'config.todos': function () {
        return '<div class="card cfg-sec" data-sec="todos"><div class="card-head"><h3>📈 ' + esc(tr('Alerta de salto de preço', 'Price jump alert', 'Aviso de subida de precio')) + '</h3></div>' +
          '<p class="small muted" style="margin:0 0 8px">' + esc(tr('Conta fixa ou gasto que se repete todo mês: o 📥 avisa quando o valor novo passa da média dos 3 anteriores.', 'Fixed bills and monthly expenses: the 📥 warns when the new amount goes above the average of the previous 3.', 'Facturas fijas y gastos mensuales: el 📥 avisa cuando el nuevo importe supera la media de los 3 anteriores.')) + '</p>' +
          '<label class="field" style="max-width:16em"><span>' + esc(tr('Avisar acima de (%)', 'Warn above (%)', 'Avisar por encima de (%)')) + '</span><input id="sp2Pct" type="number" min="1" max="500" inputmode="numeric" value="' + (cfg().saltoPct != null ? cfg().saltoPct : PADRAO) + '" data-acao-change="sp2-pct"></label></div>';
      }
    },
    ouvir: {
      'compromisso.salvo': function (d) {
        var p = document.getElementById('sp2RPct'), m = document.getElementById('sp2RMes'); if (!d || !d.id || !p) return;
        var r = Recorrente.achar(d.id); if (!r) return;
        if (p.value !== '' && Number(p.value) > 0) r.saltoPct = Number(p.value); else delete r.saltoPct;
        if (m && m.value) r.reajusteMes = Number(m.value); else delete r.reajusteMes;
      }
    },
    acoes: {
      'sp2-esperado': function (el) {
        var x = achar(el.dataset.k); if (!x) return;
        mapa('saltoBase')[x.chave] = { valor: x.valor, gid: x.g.id };
        if (x.r && typeof Recorrente !== 'undefined' && Recorrente.reajustar) Recorrente.reajustar(x.r.id, x.valor, x.g.data);
        depois(); toast(tr('Novo valor esperado: ', 'New expected amount: ', 'Nuevo importe esperado: ') + fmt(x.valor) + '.');
      },
      'sp2-anual': function (el) {
        var x = achar(el.dataset.k); if (!x) return;
        var m = +x.g.data.slice(5, 7);
        if (x.r) { var r = Recorrente.achar(x.r.id); if (r) r.reajusteMes = m; } else mapa('saltoReajuste')[x.chave] = m;
        mapa('saltoBase')[x.chave] = { valor: x.valor, gid: x.g.id };
        if (x.r && Recorrente.reajustar) Recorrente.reajustar(x.r.id, x.valor, x.g.data);
        depois(); toast(tr('Reajuste anual em ', 'Yearly increase in ', 'Subida anual en ') + I18n.mesLongo(m) + tr(': nesse mês o app não avisa.', ': the app will not warn in that month.', ': ese mes la app no avisará.'));
      },
      'sp2-ver': function (el) { fechar('genModal'); if (typeof abrirLancamento === 'function') abrirLancamento(el.dataset.id); }
    }
  });
  /* o % geral, ao mudar o campo em Configurações */
  document.addEventListener('change', function (ev) {
    if (!ev.target || ev.target.id !== 'sp2Pct') return;
    var v = Number(ev.target.value); if (!(v > 0)) return;
    cfg().saltoPct = v; Store.salvar(); if (typeof renderInboxN === 'function') renderInboxN();
  });
  window.SaltoPreco = API;
})();
