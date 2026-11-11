/* =====================================================================
   modulos/visao-casa.js — "dois cofres": o que é da casa e o que é reservado (3.66)        1.0.0 · 12/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 11/Nov/2026; desenho em DESENHO-visao-da-casa.md)
     Um membro da família com a visão "Só a casa" vê a parte da casa; o resto fica RESERVADO e nem chega ao aparelho dele
     (outra chave e outra regra no banco). Este módulo diz, no aparelho de quem vê tudo, o escopo de cada registro.
     A nuvem (nuvem.js 1.14.0) usa a resposta: o reservado sobe com o id "r.<id>" e a chave reservada.
   A REGRA (na dúvida: reservado)
     · Lançamentos (gastos): da casa quando são de uma pessoa da visão casa (quem ou para quem), do cartão que ela usa,
       ou pagam um compromisso da casa. PJ (contador, DAS, TFE, Contabilizei, pró-labore…) é sempre reservado.
     · Compromissos (recorrentes): da casa, menos os PJ e os marcados "Só eu vejo". Os pagamentos seguem o compromisso.
     · Cartões: os que ela usa e os que pagam compromissos da casa. Bancos (só o nome), pessoas, profissionais, saúde,
       agendamentos, assinaturas (menos PJ) e preços: da casa.
     · Todo o resto (investimentos, renda dele, extratos, IR, saldos, patrimônio, robô, espelho, ponte…): reservado.
     · O chefe muda um item na mão: campo `escopo` ('casa' | 'reservado') no lançamento ou no compromisso.
   TOTAIS DA FAMÍLIA
     Coleção `resumo` (da casa), um por mês ('AAAA-MM'): {grupos: {GRUPO: valor}, total, n, atualizadoEm} de TODOS os
     gastos da família (sem renda, investimento nem transferência). Quem calcula é o aparelho de quem vê tudo, logo antes
     de subir (Escopo.antesDeSubir).
   API (window.Escopo)
     de(colecao, item) → 'casa' | 'reservado'      deConfig(chave) → 'casa' | 'reservado'
     preparar(estado)  · ehPJ(item)  · pessoasDela()  · antesDeSubir(estado)
   DADOS
     Store.estado.visaoCasa = {pessoas: [ids das pessoas com a visão casa]}   (da casa: o app dela sabe quem ela é)
     Store.estado.resumo = [{id: 'AAAA-MM', grupos, total, n, atualizadoEm}]
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'resumo';
  /* PJ: siglas em maiúsculas (DAS e TFE também são palavras comuns), o resto sem diferença de caixa */
  var PJ_SIGLA = /\b(PJ|DAS|TFE|CNPJ|ISS|DARF PJ)\b/;
  var PJ_TEXTO = /\b(contador(a)?|contabilidade|cont[aá]bil|contabilizei|simples nacional|pr[oó][ -]?labore|alvar[aá]|junta comercial|certificado digital)\b/i;
  var CASA_COLS = { pessoas: 1, profissionais: 1, saude_planos: 1, agendamentos: 1, precos: 1, bancos: 1, resumo: 1 };
  var CASA_CONFIG = { visaoCasa: 1, categorias: 1, moedaBase: 1 };

  var C = { dela: {}, cartoes: {}, rec: {} };
  function tem(o, k) { return !!(k && o[k]); }
  function ehPJ(x) {
    if (!x || typeof x !== 'object') return false;
    if (x.pj === true) return true;
    var t = [x.sub, x.desc, x.nome, x.categoria, x.grupoPluggy, x.catPluggy].filter(Boolean).join(' · ');
    return PJ_SIGLA.test(t) || PJ_TEXTO.test(t);
  }
  function manual(x) { return x && (x.escopo === 'casa' || x.escopo === 'reservado') ? x.escopo : ''; }
  function recCasa(r) { if (manual(r)) return manual(r) === 'casa'; return !ehPJ(r); }

  var API = {
    ehPJ: ehPJ,
    pessoasDela: function () { return Object.keys(C.dela); },
    /* as listas que a regra consulta (pessoas da visão casa, cartões dela, compromissos da casa) */
    preparar: function (est) {
      var dela = {}, cartoes = {}, rec = {};
      ((est.visaoCasa && est.visaoCasa.pessoas) || []).forEach(function (id) { dela[id] = 1; });
      (est.cartoes || []).forEach(function (c) {
        var quem = c.usaId || c.titularId;
        if (manual(c) === 'casa' || (quem && dela[quem]) || (c.finais || []).some(function (f) { return f.titularId && dela[f.titularId]; })) cartoes[c.id] = 1;
      });
      (est.recorrentes || []).forEach(function (r) { if (recCasa(r)) { rec[r.id] = 1; if (r.cartaoId) cartoes[r.cartaoId] = 1; } });
      C = { dela: dela, cartoes: cartoes, rec: rec };
    },
    de: function (col, x) {
      if (CASA_COLS[col]) return 'casa';
      if (!x || typeof x !== 'object') return 'reservado';
      switch (col) {
        case 'gastos':
          if (manual(x)) return manual(x);
          if (ehPJ(x)) return 'reservado';
          if (tem(C.dela, x.quemId) || tem(C.dela, x.paraQuemId) || tem(C.cartoes, x.cartaoId) || tem(C.rec, x.recorrenteId)) return 'casa';
          return 'reservado';
        case 'recorrentes': return C.rec[x.id] ? 'casa' : 'reservado';
        case 'pagamentos': return tem(C.rec, x.rid) ? 'casa' : 'reservado';
        case 'cartoes': return C.cartoes[x.id] ? 'casa' : 'reservado';
        case 'assinaturas': return manual(x) || (ehPJ(x) ? 'reservado' : 'casa');
        default: return 'reservado';
      }
    },
    deConfig: function (k) { return CASA_CONFIG[k] ? 'casa' : 'reservado'; },
    /* os totais da família por mês; só muda o atualizadoEm do mês que mudou */
    antesDeSubir: function (est) {
      var meses = {};
      (est.gastos || []).forEach(function (g) {
        if (!g || !g.data || !g.grupo || g.grupo === 'RENDA' || g.grupo === 'INVESTIMENTO') return;
        if (g.fluxo && g.fluxo !== 'saida') return;
        var m = String(g.data).slice(0, 7), v = Number(g.valor) || 0; if (!/^\d{4}-\d{2}$/.test(m)) return;
        var o = meses[m] || (meses[m] = { grupos: {}, total: 0, n: 0 });
        o.grupos[g.grupo] = Math.round(((o.grupos[g.grupo] || 0) + v) * 100) / 100;
        o.total = Math.round((o.total + v) * 100) / 100; o.n++;
      });
      var antes = {}; (est[COL] || []).forEach(function (r) { antes[r.id] = r; });
      var agora = new Date().toISOString(), out = [];
      Object.keys(meses).sort().forEach(function (m) {
        var o = meses[m], a = antes[m];
        var igual = a && a.total === o.total && a.n === o.n && JSON.stringify(a.grupos) === JSON.stringify(o.grupos);
        out.push(igual ? a : { id: m, grupos: o.grupos, total: o.total, n: o.n, atualizadoEm: agora });
      });
      est[COL] = out;
    }
  };

  MoneyModulos.registrar({ id: 'visao-casa', versao: '1.0.0', colecoes: [COL] });
  window.Escopo = API;
})();
