/* =====================================================================
   modulos/patrimonio-mes.js — o patrimônio de verdade, mês a mês, para o Fluxo (3.69)        1.0.0 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 13/Nov/2026)
     · Uma foto por mês do patrimônio de hoje (a mesma conta do patrimonioHoje(): saldos das contas + carteira do
       InvestifyONE, sem contar duas vezes). Atualiza no máximo uma vez por dia; vale a última do mês. É o que faz a
       história real crescer daqui em diante.
     · O valor real no fim de cada mês: a foto do mês; senão, o que dá para remontar das fontes que já existem — a foto
       da carteira (ST.fotos, uma por dia) daquele mês e o saldo de cada conta naquele mês (saldos_banco.hist, que o
       robô guarda só dos últimos 90 dias). Só vale se TODAS as fontes que o patrimônio de hoje usa têm valor no mês
       (metade da conta seria um número errado). O mês de hoje é o patrimônio de hoje.
     · Meses sem valor real: estimativa de trás para frente a partir do ponto real seguinte,
       P(m−1) = P(m) − (entrou(m) − gastou(m)); depois do último real, para a frente: P(m) = P(m−1) + sobra(m).
       Aplicar em investimento não muda o patrimônio; rendimento não entra (por isso "estimado, sem rendimentos").
       Sem nenhum ponto real: só a estimativa, a partir de zero, e o aviso de que falta a carteira ou os saldos.
     · Visão da casa: nada disso (ela não vê patrimônio nem investimento); a foto nem é tirada no aparelho dela.
   API (window.PatrimonioMes)
     registrar() → foto do mês (ou null) · realDe(mes) → {valor, caixa, invest, fonte} | null
     serie(meses) → [{t, valor, real: bool, invest|null}] · temCarteira() · temReal(serie)
   DADOS
     Store.estado.patrimonio_mes = [{id: 'AAAA-MM', mes, valor, caixa, invest, em: 'AAAA-MM-DD'}]   (a nuvem guarda cada
     um no money_docs; do cofre reservado: Escopo.de devolve 'reservado' para coleção que não é da casa)
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'patrimonio_mes';
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function hoje() { return API._hoje || hojeISO(); }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function n0(v) { return Math.round(Number(v) || 0); }
  function noMes(d, mes) { return String(d || '').slice(0, 7) === mes; }
  function ultimoNoMes(l, mes, data, val) {
    var x = null; l.forEach(function (h) { if (noMes(data(h), mes) && (!x || data(h) >= data(x))) x = h; });
    return x ? val(x) : null;
  }

  var API = {
    _hoje: null,
    temCarteira: function () { return (ST.posicoes || []).length > 0 && (ST.fotos || []).length > 0; },
    registrar: function () {
      if (casa() || typeof patrimonioHoje !== 'function') return null;
      var p = patrimonioHoje(); if (!p || !p.valor) return null;
      var h = hoje(), mes = h.slice(0, 7), l = lista(), x = l.filter(function (o) { return o.id === mes; })[0];
      if (x && x.em === h) return x;   /* no máximo uma vez por dia */
      if (!x) { x = { id: mes, mes: mes }; l.push(x); }
      x.valor = n0(p.valor); x.caixa = n0(p.caixa); x.invest = n0(p.invest); x.em = h;
      return x;
    },
    realDe: function (mes) {
      if (casa()) return null;
      if (mes === hoje().slice(0, 7) && typeof patrimonioHoje === 'function') {
        var p = patrimonioHoje(); if (p && p.valor) return { valor: n0(p.valor), caixa: n0(p.caixa), invest: n0(p.invest), fonte: 'hoje' };
      }
      var f = lista().filter(function (o) { return o.mes === mes; })[0];
      if (f) return { valor: f.valor, caixa: f.caixa, invest: f.invest, fonte: 'foto' };
      /* remontar das fontes que existem hoje: todas têm de ter valor no mês */
      var sb = window.SaldoBanco && SaldoBanco.patrimonio ? SaldoBanco.patrimonio() : null;
      var cart = (ST.posicoes || []).length > 0, contas = (ST.saldos_banco || []);
      if (!sb && !cart) return null;
      var caixa = 0, invest = 0, falta = false;
      if (sb && sb.contas) contas.forEach(function (r) {
        if (r.tipo !== 'conta' && r.tipo !== 'poupanca') return;
        var v = ultimoNoMes(r.hist || [], mes, function (h) { return h.data; }, function (h) { return Number(h.saldo) || 0; });
        if (v == null) falta = true; else caixa += v;
      });
      if (cart) {
        var c = ultimoNoMes(ST.fotos || [], mes, function (h) { return h[0]; }, function (h) { return Number(h[1]) || 0; });
        if (c == null) falta = true; else invest = c;
      } else if (sb && sb.invests) contas.forEach(function (r) {
        if (r.tipo !== 'investimento') return;
        var v = ultimoNoMes(r.hist || [], mes, function (h) { return h.data; }, function (h) { return Number(h.saldo) || 0; });
        if (v == null) falta = true; else invest += v;
      });
      if (falta) return null;
      return { valor: n0(caixa + invest), caixa: n0(caixa), invest: n0(invest), fonte: 'fontes' };
    },
    /* meses: a série do Gasto.serieMensal ({t, entrada, saida}); devolve o patrimônio de cada mês, real ou estimado */
    serie: function (meses) {
      var ms = meses || [], out = ms.map(function (m) { var r = API.realDe(m.t); return { t: m.t, valor: r ? r.valor : null, real: !!r, invest: r ? r.invest : null }; });
      var sobra = function (i) { return (Number(ms[i].entrada) || 0) - (Number(ms[i].saida) || 0); };
      var algum = out.some(function (x) { return x.real; });
      if (!algum) { var acc = 0; out.forEach(function (x, i) { acc += sobra(i); x.valor = Math.round(acc); }); return out; }
      for (var i = out.length - 2; i >= 0; i--) if (!out[i].real && out[i + 1].valor != null) out[i].valor = Math.round(out[i + 1].valor - sobra(i + 1));
      for (var j = 1; j < out.length; j++) if (out[j].valor == null) out[j].valor = Math.round(out[j - 1].valor + sobra(j));
      return out;
    },
    temReal: function (s) { return (s || []).some(function (x) { return x.real; }); }
  };

  MoneyModulos.registrar({ id: 'patrimonio-mes', versao: '1.0.0', colecoes: [COL] });
  window.PatrimonioMes = API;
})();
