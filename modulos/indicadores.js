/* =====================================================================
   modulos/indicadores.js — indicadores do Painel do BudgetONE (3.64)        1.0.0 · 11/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (contas em código, sem IA; estudo próprio)
     O mês atual × o mês anterior, com seta e variação, e uma frase curta de leitura gerada por regra:
     · Taxa de poupança = (renda − gasto) ÷ renda.
     · Peso de dívidas e parcelas na renda = prestações, consórcio, financiamento, parcelas, juros e tarifas ÷ renda.
       Faixas de leitura como REFERÊNCIA (não regra): até 30% saudável, 30–40% atenção, mais de 40% alto.
     · Meses de reserva = o dinheiro de liquidez imediata (saldo das contas no banco + investimentos em conta e de
       resgate diário; sem FGTS nem previdência) ÷ a média do gasto mensal dos últimos 6 meses.
     O peso de cada grupo na renda entra no "Para onde foi" (pesoGrupos).
   API (window.Indicadores)
     doMes(aaaa-mm)        → {renda, gasto, dividas}
     calcular(hoje)        → {mes, ant, poup:{a, b}, div:{a, b}, reserva:{liquido, media, meses}}
     frase(tipo, a, b)     → texto de leitura · faixaDividas(pct) → 'ok' | 'atencao' | 'alto'
     pesoGrupos(lista)     → [{grupo, pct}] do que saiu ÷ o que entrou
   PONTOS QUE USA
     budget.painel
   ===================================================================== */
(function () {
  'use strict';
  var DIVIDA = /presta[cç]|cons[oó]rcio|financiament|parcel|juros|tarifa|empr[eé]stimo|iof|anuidade|m[uú]tuo/i;
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function mesAnt(m) { var a = Number(m.slice(0, 4)), n = Number(m.slice(5, 7)) - 1; if (!n) { a--; n = 12; } return a + '-' + String(n).padStart(2, '0'); }
  function pct(x) { return x == null || !isFinite(x) ? '—' : Math.round(x * 100) + '%'; }
  function ehDivida(g) { return g.fluxo === 'saida' && (DIVIDA.test(String(g.sub || '') + ' ' + String(g.desc || '')) || !!g.parcelas || /^\d+\s*\/\s*\d+$/.test(String(g.parcela || ''))); }

  var API = {
    ehDivida: ehDivida,
    doMes: function (m) {
      var r = { renda: 0, gasto: 0, dividas: 0 };
      Gasto.todos().forEach(function (g) {
        if (String(g.data || '').slice(0, 7) !== m) return;
        var v = Number(g.valor) || 0;
        if (g.fluxo === 'entrada') r.renda += Math.abs(v);
        else { r.gasto += v; if (ehDivida(g)) r.dividas += v; }
      });
      return r;
    },
    faixaDividas: function (p) { return p == null ? '' : p <= 0.30 ? 'ok' : p <= 0.40 ? 'atencao' : 'alto'; },
    liquido: function () {
      var s = 0;
      ((window.SaldoBanco && SaldoBanco.contas()) || []).forEach(function (r) { if (!r.cartao && (r.moeda || 'BRL') === 'BRL') s += Number(r.saldo) || 0; });
      (ST.posicoes || []).forEach(function (p) {
        if (p.tipo === 'previdencia' || /fgts|previd/i.test(p.nome + ' ' + p.ticker)) return;
        var diaria = p.tipo === 'caixa' || /^d\s*\+\s*[01]$/i.test(String(p.liquidez || '')) || /selic|liquidez di[aá]ria|\bdi\b|poupan/i.test(String(p.nome || '') + ' ' + String(p.ticker || ''));
        if (!diaria || (p.tipo !== 'caixa' && p.tipo !== 'renda-fixa' && p.tipo !== 'fundo')) return;
        try { s += typeof calc === 'function' ? calc(p).valorBase : 0; } catch (e) {}
      });
      return s;
    },
    calcular: function (hoje) {
      var mes = String(hoje || hojeISO()).slice(0, 7), ant = mesAnt(mes);
      var A = API.doMes(mes), B = API.doMes(ant);
      var poup = function (x) { return x.renda ? (x.renda - x.gasto) / x.renda : null; };
      var div = function (x) { return x.renda ? x.dividas / x.renda : null; };
      /* média do gasto dos 6 meses fechados antes deste */
      var ms = [], m = ant; for (var i = 0; i < 6; i++) { ms.push(m); m = mesAnt(m); }
      var comGasto = ms.map(API.doMes).filter(function (x) { return x.gasto > 0; });
      var media = comGasto.length ? comGasto.reduce(function (s, x) { return s + x.gasto; }, 0) / comGasto.length : 0;
      var liq = API.liquido();
      return { mes: mes, ant: ant, A: A, B: B, poup: { a: poup(A), b: poup(B) }, div: { a: div(A), b: div(B) },
        reserva: { liquido: liq, media: media, meses: media > 0 ? liq / media : null } };
    },
    frase: function (tipo, a, b) {
      var mp = b == null ? '' : tr(' (mês passado: ', ' (last month: ') + pct(b) + ')';
      if (a == null) return tr('Sem renda lançada neste mês ainda.', 'No income recorded this month yet.');
      if (tipo === 'poup') return (a >= 0 ? tr('Sobrou ', 'You kept ') + pct(a) + tr(' da renda', ' of income') : tr('Faltou ', 'You overspent by ') + pct(-a) + tr(' da renda', ' of income')) + mp + '.';
      if (tipo === 'div') {
        var f = API.faixaDividas(a);
        return tr('Dívidas e parcelas levam ', 'Debts and instalments take ') + pct(a) + tr(' da renda', ' of income') + mp + ' — ' +
          (f === 'ok' ? tr('faixa saudável (até 30%)', 'healthy range (up to 30%)') : f === 'atencao' ? tr('faixa de atenção (30–40%)', 'watch range (30–40%)') : tr('faixa alta (mais de 40%)', 'high range (over 40%)')) + '.';
      }
      return '';
    },
    fraseReserva: function (r) {
      if (r.meses == null) return tr('Sem gasto nos últimos 6 meses para comparar.', 'No spending in the last 6 months to compare.');
      var m = Math.round(r.meses * 10) / 10;
      return tr('O dinheiro de resgate imediato cobre ', 'Money you can withdraw now covers ') + String(m).replace('.', pt() ? ',' : '.') + tr(' mês(es) do seu gasto médio.', ' month(s) of your average spending.');
    },
    pesoGrupos: function (ls) {
      var ent = 0, por = {};
      (ls || []).forEach(function (g) { var v = Number(g.valor) || 0; if (g.fluxo === 'entrada') ent += Math.abs(v); else por[g.grupo] = (por[g.grupo] || 0) + v; });
      if (!ent) return [];
      return Object.keys(por).map(function (k) { return { grupo: k, pct: por[k] / ent }; }).filter(function (x) { return x.pct > 0.005; })
        .sort(function (a, b) { return b.pct - a.pct; });
    }
  };

  function seta(a, b, menorMelhor) {
    if (a == null || b == null) return '';
    var d = a - b; if (Math.abs(d) < 0.005) return '<span class="ind-seta">→</span>';
    var bom = menorMelhor ? d < 0 : d > 0;
    return '<span class="ind-seta ' + (bom ? 'up' : 'down') + '">' + (d > 0 ? '↑' : '↓') + ' ' + Math.round(Math.abs(d) * 100) + ' p.p.</span>';
  }
  function bloco(tit, valor, setaHtml, frase, extra) {
    return '<div class="ind"><div class="ind-t">' + esc(tit) + '</div><div class="ind-v">' + valor + ' ' + setaHtml + '</div><div class="ind-f small muted">' + esc(frase) + '</div>' + (extra || '') + '</div>';
  }
  function cartao() {
    if (!Gasto.todos().length) return '';
    var c = API.calcular();
    var f = API.faixaDividas(c.div.a);
    return '<div class="card ind-card"><div class="card-head"><h3>📐 ' + esc(tr('Indicadores do mês', 'This month\'s indicators')) + '</h3>' +
      '<span class="small muted">' + esc(I18n.mesCurto ? I18n.mesCurto(Number(c.mes.slice(5, 7))) + ' × ' + I18n.mesCurto(Number(c.ant.slice(5, 7))) : c.mes + ' × ' + c.ant) + '</span></div>' +
      '<div class="ind-grade">' +
        bloco(tr('Taxa de poupança', 'Savings rate'), pct(c.poup.a), seta(c.poup.a, c.poup.b, false), API.frase('poup', c.poup.a, c.poup.b)) +
        bloco(tr('Dívidas e parcelas na renda', 'Debts and instalments vs income'), '<span class="ind-faixa ' + f + '">' + pct(c.div.a) + '</span>', seta(c.div.a, c.div.b, true), API.frase('div', c.div.a, c.div.b),
          '<div class="tiny muted">' + esc(tr('Referência, não regra: até 30% saudável · 30–40% atenção · mais de 40% alto.', 'A reference, not a rule: up to 30% healthy · 30–40% watch · over 40% high.')) + '</div>') +
        bloco(tr('Meses de reserva', 'Months of reserve'), c.reserva.meses == null ? '—' : String(Math.round(c.reserva.meses * 10) / 10).replace('.', pt() ? ',' : '.'), '', API.fraseReserva(c.reserva),
          '<div class="tiny muted">' + esc(fmt(c.reserva.liquido) + tr(' de liquidez imediata (sem FGTS nem previdência) ÷ ', ' readily available (no FGTS or pension) ÷ ') + fmt(c.reserva.media) + tr(' de gasto médio (6 meses)', ' average spending (6 months)')) + '</div>') +
      '</div></div>';
  }

  MoneyModulos.registrar({
    id: 'indicadores',
    versao: '1.0.0',
    pontos: { 'budget.painel': cartao }
  });
  window.Indicadores = API;
})();
