/* =====================================================================
   modulos/parcelados.js — as compras parceladas no cartão: o que ainda vem (3.74)        1.0.1 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 13/Nov/2026)
     · O lançamento de cartão traz a parcela no fim da descrição ("LOJA X 05/06", "CURSO (8/12) · nota"; o robô põe
       " (k/N)" quando o banco não escreve). Gasto.parcela(desc, g) entende isso (index.html, 3.74).
     · Para cada compra parcelada vale a ÚLTIMA parcela vista (mesma descrição sem o k/N, mesmo valor, mesmo cartão,
       mesmo N). As N−k que faltam são "comprometido a vir": o mesmo valor, nos meses seguintes, no dia de vencimento
       da fatura daquele cartão (ou no dia da compra, sem cartão cadastrado), na categoria da compra.
     · O previsto (modulos/previsao.js) soma isso como CONTA CERTA da categoria; a parcela que já chegou no mês entra
       pelo valor real e a que chega some da lista a vir (nunca conta duas vezes). As parcelas ficam fora da média dos
       variáveis.
     · Painel e Futuro: "Parcelados no cartão: faltam R$ X em N meses", a lista (compra, k/N, valor, último mês) e o
       total de cada mês.
     · Visão da casa: só os parcelados que ela já vê (os lançamentos dela).
   API (window.Parcelados)
     compras() → [{chave, desc, k, n, valor, grupo, sub, cartaoId, ultimo, faltam, futuras: [{data, k, valor}], fim}]
     doMes('AAAA-MM') → [{grupo, sub, nome, data, valor, real}]   (as parcelas do mês: as que chegaram e as a vir)
     resumo() → {total, meses, porMes: [{mes, valor}]}
   PONTOS QUE USA
     budget.painel · planejados.parcelados (1.0.1, 3.76: saiu do Futuro para Contas fixas → Gastos planejados)
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function hoje() { return API._hoje || hojeISO(); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function mesMais(iso, n) {
    var a = +iso.slice(0, 4), m = +iso.slice(5, 7) - 1 + n; a += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    var ult = new Date(a, m + 1, 0).getDate(), d = Math.min(+iso.slice(8, 10) || 1, ult);
    return a + '-' + ('0' + (m + 1)).slice(-2) + '-' + ('0' + d).slice(-2);
  }
  /* a descrição sem o k/N (e sem a nota depois de " · ") */
  function base(desc) {
    var d = String(desc || '').split(' · ')[0];
    return N(d.replace(/parc\w*\.?\s*\d{1,2}\s*(?:\/|de)\s*\d{1,2}\b/i, ' ').replace(/\(?\d{1,2}\/\d{1,2}\)?\s*$/, ' '));
  }
  function nomeBonito(desc) {
    return String(desc || '').split(' · ')[0].replace(/\s*\(?\d{1,2}\/\d{1,2}\)?\s*$/, '').replace(/\s+/g, ' ').trim();
  }
  function quando(g) {
    var c = typeof Gasto !== 'undefined' && Gasto.cobranca ? Gasto.cobranca(g) : null;
    if (!c && g.cartaoId && typeof Banco !== 'undefined') { var f = Banco.faturaDe(g.cartaoId, g.data); if (f) c = f.vencimento; }
    return c || g.data;
  }

  var API = {
    _hoje: null,
    compras: function () {
      var grupos = {};
      Gasto.todos().forEach(function (g) {
        if (g.fluxo !== 'saida' || !g.data) return;
        var p = Gasto.parcela(g.desc, g); if (!p) return;
        var k = +p.split('/')[0], n = +p.split('/')[1];
        var chave = base(g.desc) + '|' + n2(g.valor).toFixed(2) + '|' + (g.cartaoId || '') + '|' + n;
        var x = grupos[chave];
        if (!x || k > x.k || (k === x.k && g.data > x.ultimo.data)) grupos[chave] = { chave: chave, k: k, n: n, ultimo: g };
      });
      return Object.keys(grupos).map(function (c) {
        var x = grupos[c], g = x.ultimo, q = quando(g), fut = [];
        for (var j = 1; j <= x.n - x.k; j++) fut.push({ data: mesMais(q, j), k: x.k + j, valor: n2(g.valor) });
        return { chave: c, desc: nomeBonito(g.desc), k: x.k, n: x.n, valor: n2(g.valor), grupo: g.grupo, sub: g.sub, cartaoId: g.cartaoId || '',
          ultimo: g, cobranca: q, faltam: x.n - x.k, futuras: fut, fim: fut.length ? fut[fut.length - 1].data.slice(0, 7) : q.slice(0, 7) };
      }).sort(function (a, b) { return b.faltam * b.valor - a.faltam * a.valor; });
    },
    /* o que cai no mês: as que chegaram (pelo mês da fatura) e as que ainda vêm */
    doMes: function (mes) {
      var out = [];
      API.compras().forEach(function (c) {
        c.futuras.forEach(function (f) { if (f.data.slice(0, 7) === mes) out.push({ grupo: c.grupo, sub: c.sub, nome: c.desc + ' ' + f.k + '/' + c.n, data: f.data, valor: f.valor, real: null }); });
      });
      Gasto.todos().forEach(function (g) {
        if (g.fluxo !== 'saida' || !g.data || !Gasto.parcela(g.desc, g)) return;
        var q = quando(g); if (q.slice(0, 7) !== mes) return;
        out.push({ grupo: g.grupo, sub: g.sub, nome: g.desc, data: q, valor: n2(g.valor), real: n2(g.valor) });
      });
      return out;
    },
    resumo: function () {
      var por = {}, total = 0, h = hoje().slice(0, 7);
      API.compras().forEach(function (c) { c.futuras.forEach(function (f) { var m = f.data.slice(0, 7); if (m < h) return; por[m] = (por[m] || 0) + f.valor; total += f.valor; }); });
      var meses = Object.keys(por).sort();
      return { total: n2(total), meses: meses.length, porMes: meses.map(function (m) { return { mes: m, valor: n2(por[m]) }; }) };
    }
  };

  function mmaaaa(m) { return m.slice(5, 7) + '/' + m.slice(0, 4); }
  function cartao() {
    var r = API.resumo(); if (!r.total) return '';
    var cs = API.compras().filter(function (c) { return c.faltam > 0; });
    return '<div class="card pc-card"><div class="card-head"><h3>💳 ' + esc(tr('Parcelados no cartão', 'Card instalments')) + '</h3></div>' +
      '<p class="pc-frase"><b>' + esc(tr('Faltam ', 'Still to come: ') + fmt(r.total) + tr(' em ', ' over ') + r.meses + (r.meses === 1 ? tr(' mês', ' month') : tr(' meses', ' months'))) + '</b></p>' +
      '<table class="tbl pc-lista"><tbody>' + cs.map(function (c) {
        return '<tr><td><span class="t-main">' + esc(c.desc) + '</span><div class="t-sub">' + esc(c.k + '/' + c.n + ' · ' + tr('última em ', 'last in ') + mmaaaa(c.fim)) + '</div></td>' +
          '<td class="num">' + fmt(c.valor) + '<div class="t-sub">' + esc(tr('faltam ', 'left ') + c.faltam) + '</div></td></tr>';
      }).join('') + '</tbody></table>' +
      '<details class="pc-meses"><summary class="small">' + esc(tr('Quanto cai em cada mês', 'How much falls each month')) + '</summary><table class="tbl"><tbody>' +
      r.porMes.map(function (x) { return '<tr><td>' + esc(mmaaaa(x.mes)) + '</td><td class="num">' + fmt(x.valor) + '</td></tr>'; }).join('') + '</tbody></table></details></div>';
  }

  MoneyModulos.registrar({
    id: 'parcelados', versao: '1.0.1',
    pontos: { 'budget.painel': cartao, 'planejados.parcelados': cartao }   /* 1.0.1 (3.76): saiu do Futuro (agora Projeção) para Gastos planejados */
  });
  window.Parcelados = API;
})();
