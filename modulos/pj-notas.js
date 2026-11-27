/* =====================================================================
   modulos/pj-notas.js — FiscalONE › PJ: as notas emitidas e o DAS do mês (item M, 3.130)        1.0.0 · 26/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (proposta aprovada pelo dono, pelo chat principal, 26/Nov/2026 — tudo INFORMATIVO, "confirme com o contador")
     · Notas da PJ: a NFS-e que o robô traz (comprovantes, subtipo nota_fiscal) cujo CNPJ é o da empresa. Liga ao crédito da
       conta da PJ: pela moeda e o valor na moeda (g.valorMoeda do BS2) ou, sem eles, ao crédito mais perto depois da nota
       (até 45 dias, valor até 5 % diferente). A receita em reais é o valor do crédito (o câmbio do dia); sem crédito, o da
       nota em R$ (nota em moeda estrangeira sem crédito: "aguardando o crédito").
     · Exportação (tomador no exterior ou moeda estrangeira): "sem PIS/COFINS; ISS: confirme com o contador".
     · IBS/CBS: uma linha por nota (2026: ano de teste; o Simples não recolhe).
     · DAS do mês: a base pela COMPETÊNCIA (as notas do mês; padrão) ou pelo CAIXA (o que entrou), escolha em Configurações
       da PJ (Cofre da empresa, "Base do DAS": e.baseDas); vence no dia 20 do mês seguinte (o pj.js 1.3.0 usa a mesma base
       na previsão do DAS e no "Transfira para a PJ" do 📥); quando o DAS chega do banco, mostra "pago".
     · Lembrete de 2027 no 📥 (a partir de 01/12/2026): decidir com o contador o IBS/CBS por fora do DAS e a pergunta aberta
       "o DAS passa a ser calculado com base em um período diferente: qual?".
     · Campos que o robô ainda não manda (tomador_exterior, moeda, valor_moeda, competencia, codigo_servico, iss_retido):
       tudo opcional; sem eles a nota aparece com o que tiver.
   API (window.PJNotas)
     daEmpresa(x) → a nota é de uma empresa cadastrada · notas(e) → [{x, numero, data, competencia, moeda, valorMoeda, valor, exterior, servico, codigo, issRetido, credito, reais}]
     totalMes(e, mes) → receita em reais das notas daquela competência · das(e, mes) → {base, fonte, aliquota, valor, vence, pago}
   PONTOS QUE USA
     pj.empresa (cartão "Notas e DAS do mês") · inbox.grupos ('pj': o lembrete de 2027) · ações pjn-*
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function dig(t) { return String(t || '').replace(/\D/g, ''); }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function hoje() { return API._hoje || hojeISO(); }
  function cfg() { ST.config = ST.config || {}; return ST.config; }
  function dataOk(d) { return /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) ? d : ''; }
  function dias(a, b) { return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000); }
  function somaMes(mes, k) { var a = +mes.slice(0, 4), m = +mes.slice(5, 7) - 1 + k; a += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return a + '-' + ('0' + (m + 1)).slice(-2); }
  function dm(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : ''; }
  function mesTxt(mes) { return mes.slice(5, 7) + '/' + mes.slice(0, 4); }
  function e$(t) { return typeof esc === 'function' ? esc(t) : String(t == null ? '' : t); }
  function comps() { return window.Comprovantes && Comprovantes.lista ? Comprovantes.lista() : (ST.comprovantes || []); }

  /* o crédito da conta da PJ que pagou a nota */
  function credito(e, n, usados) {
    if (!window.PJ || !n.data) return null;
    var l = PJ.lancamentos(e, n.data, somaMes(n.data.slice(0, 7), 2) + '-31').filter(function (g) {
      var c = PJ.categoria(g); return (c === 'faturamento' || c === 'entrada') && !usados[g.id] && String(g.id || '').indexOf('tf_') !== 0;
    });
    if (n.valorMoeda > 0 && n.moeda && n.moeda !== 'BRL') {
      var m = l.filter(function (g) { return g.moeda === n.moeda && Math.abs(Number(g.valorMoeda) - n.valorMoeda) < 0.01; });
      if (m.length) return m.sort(function (a, b) { return a.data < b.data ? -1 : 1; })[0];
    }
    var ref = n.valor > 0 ? n.valor : 0; if (!ref) return null;
    return l.filter(function (g) { return dias(n.data, g.data) <= 45 && Math.abs(Math.abs(Number(g.valor)) - ref) <= ref * 0.05; })
      .sort(function (a, b) { return a.data < b.data ? -1 : 1; })[0] || null;
  }

  var API = {
    /* a nota emitida por uma empresa cadastrada (o CNPJ da nota é o da empresa): o 📥 de comprovantes não pede nada dela */
    daEmpresa: function (x) { var c = dig(x && x.cnpj); return !!c && (Array.isArray(ST.empresas) ? ST.empresas : []).some(function (e) { return dig(e.cnpj) === c; }); },
    notas: function (e) {
      if (!e || !dig(e.cnpj)) return [];
      var usados = {}, out = comps().filter(function (x) { return x.subtipo === 'nota_fiscal' && x.estado !== 'dispensado' && dig(x.cnpj) === dig(e.cnpj); })
        .map(function (x) {
          var f = x.ficha || {}, moeda = String(f.moeda || x.moeda || 'BRL').toUpperCase().slice(0, 3);
          var comp = /^\d{4}-\d{2}/.test(String(f.competencia || '')) ? String(f.competencia).slice(0, 7) : String(x.data || '').slice(0, 7);
          return { x: x, numero: String(x.numero || f.numero || '').slice(0, 30), data: dataOk(x.data), competencia: comp, moeda: moeda,
            valorMoeda: Number(f.valor_moeda) > 0 ? n2(f.valor_moeda) : (moeda !== 'BRL' && x.valor > 0 ? n2(x.valor) : 0),
            valor: moeda === 'BRL' && x.valor > 0 ? n2(x.valor) : 0, exterior: !!(f.tomador_exterior || moeda !== 'BRL'),
            pais: typeof f.tomador_exterior === 'string' ? f.tomador_exterior.slice(0, 40) : '', servico: String(f.servico || x.descricao || '').slice(0, 120),
            codigo: String(f.codigo_servico || '').slice(0, 20), issRetido: f.iss_retido === true || Number(f.iss_retido) > 0 };
        }).sort(function (a, b) { return a.data < b.data ? -1 : 1; });
      out.forEach(function (n) { var g = credito(e, n, usados); if (g) { usados[g.id] = 1; n.credito = g; } n.reais = g ? n2(Math.abs(Number(g.valor))) : (n.valor || null); });
      return out;
    },
    totalMes: function (e, mes) { return n2(API.notas(e).filter(function (n) { return n.competencia === mes && n.reais > 0; }).reduce(function (s, n) { return s + n.reais; }, 0)); },
    das: function (e, mes) {
      var b = window.PJ && PJ.baseDas ? PJ.baseDas(e, mes) : { v: 0, fonte: 'competencia' }, a = window.PJ ? PJ.aliquota(e, mes) : null;
      var venc = somaMes(mes, 1) + '-20', pago = window.PJ ? PJ.lancamentos(e, somaMes(mes, 1) + '-01', somaMes(mes, 1) + '-31').filter(function (g) { return PJ.categoria(g) === 'das'; })
        .reduce(function (s, g) { return s + Math.abs(Number(g.valor) || 0); }, 0) : 0;
      return { base: b.v, fonte: b.fonte, aliquota: a, valor: b.v > 0 && a ? n2(b.v * a) : null, vence: venc, pago: n2(pago) };
    },
    ibsCbs: function (n) {
      var ano = +(n.competencia || hoje()).slice(0, 4);
      if (ano <= 2026) return tr('IBS/CBS: 2026 é ano de teste (CBS 0,9% + IBS 0,1%, compensáveis); o Simples não recolhe.', 'IBS/CBS: 2026 is a test year (CBS 0.9% + IBS 0.1%, offsettable); Simples companies do not pay.', 'IBS/CBS: 2026 es año de prueba (CBS 0,9 % + IBS 0,1 %, compensables); el Simples no recauda.');
      return tr('IBS/CBS a partir de 2027: veja com o contador se a empresa recolhe por fora do DAS.', 'IBS/CBS from 2027: check with your accountant whether the company pays outside the DAS.', 'IBS/CBS desde 2027: consulta con el contador si la empresa paga fuera del DAS.');
    },
    bloco: function (ctx) {
      if (casa() || !ctx || !ctx.e) return '';
      var e = ctx.e, mes = ctx.mes || hoje().slice(0, 7), todas = API.notas(e), ns = todas.filter(function (n) { return n.competencia === mes; }), d = API.das(e, mes);
      var simples = !e.regime || e.regime === 'simples' || e.regime === 'fator-r';
      var h = '<div class="card pjn"><div class="card-head"><h3>🧾 ' + e$(tr('Notas e DAS do mês', 'Invoices and DAS for the month', 'Facturas y DAS del mes')) + '</h3></div>';
      if (!ns.length) h += '<p class="small muted">' + e$(tr('Nenhuma nota emitida com competência ' + mesTxt(mes) + ' chegou pelo robô.', 'No invoice issued for ' + mesTxt(mes) + ' came from the robot.', 'Ninguna factura emitida con competencia ' + mesTxt(mes) + ' llegó por el robot.')) + '</p>';
      ns.forEach(function (n) {
        var v = n.valorMoeda && n.moeda !== 'BRL' ? n.moeda + ' ' + n.valorMoeda.toFixed(2).replace('.', ',') : '';
        h += '<div class="pjn-nota"><div class="row" style="justify-content:space-between;gap:8px"><span><b>' + e$(tr('Nota ', 'Invoice ', 'Factura ') + (n.numero || '—')) + '</b> · ' + e$(I18n.data(n.data)) +
          (n.exterior ? ' · 🌎 ' + e$(n.pais || tr('tomador no exterior', 'client abroad', 'cliente en el exterior')) : '') + '</span><b class="mono">' +
          (n.reais > 0 ? e$(fmt(n.reais)) : e$(v)) + '</b></div><div class="tiny muted">' +
          [n.servico, n.codigo ? tr('código ', 'code ', 'código ') + n.codigo : '', v && n.reais > 0 ? v : '',
           n.credito ? tr('crédito de ', 'credit on ', 'crédito del ') + dm(n.credito.data) + tr(' (o câmbio do dia)', ' (that day\'s rate)', ' (el cambio del día)') : (n.moeda !== 'BRL' ? tr('aguardando o crédito para saber o valor em reais', 'waiting for the credit to know the amount in reais', 'esperando el crédito para saber el importe en reales') : ''),
           n.issRetido ? tr('ISS retido', 'ISS withheld', 'ISS retenido') : ''].filter(Boolean).map(e$).join(' · ') + '</div>' +
          (n.exterior ? '<div class="tiny">' + e$(tr('Exportação: sem PIS/COFINS; ISS: confirme com o contador.', 'Export: no PIS/COFINS; ISS: confirm with your accountant.', 'Exportación: sin PIS/COFINS; ISS: confírmalo con el contador.')) + '</div>' : '') +
          '<div class="tiny muted">' + e$(API.ibsCbs(n)) + '</div></div>';
      });
      if (simples) {
        h += '<div class="pjn-das"><p><b>' + e$(tr('DAS da competência ', 'DAS for ', 'DAS de la competencia ') + mesTxt(mes)) + '</b>: ' +
          (d.valor != null ? '≈ ' + e$(fmt(d.valor)) : e$(tr('sem estimativa (falta o histórico do DAS pago)', 'no estimate (no DAS paid history yet)', 'sin estimación (falta el historial del DAS pagado)'))) +
          e$(tr(' · vence ', ' · due ', ' · vence ') + dm(d.vence) + '/' + d.vence.slice(0, 4)) + (d.pago > 0 ? ' · ✅ ' + e$(tr('pago ', 'paid ', 'pagado ') + fmt(d.pago)) : '') + '</p>' +
          '<p class="tiny muted">' + e$(tr('Base: ', 'Base: ', 'Base: ') + (d.base > 0 ? fmt(d.base) : '—') + ' · ' +
            (d.fonte === 'caixa' ? tr('pelo caixa (o que entrou no mês)', 'cash basis (what came in during the month)', 'por caja (lo que entró en el mes)') : tr('pela competência (as notas do mês)', 'accrual basis (the month\'s invoices)', 'por competencia (las facturas del mes)')) +
            (d.aliquota ? tr(' × alíquota efetiva ', ' × effective rate ', ' × tipo efectivo ') + (d.aliquota * 100).toFixed(2).replace('.', ',') + '%' : '') +
            tr('. Muda em Configurações da PJ (Cofre da empresa). Estimativa: confirme com o contador.', '. Change it in the company settings (company vault). Estimate: confirm with your accountant.', '. Se cambia en la configuración de la empresa (cofre de la empresa). Estimación: confírmalo con el contador.')) + '</p></div>';
      }
      return h + '</div>';
    }
  };

  /* o lembrete de 2027 (a partir de 01/12/2026), por empresa do Simples, até a pessoa marcar "Anotei" */
  function lembrete2027() {
    if (casa() || hoje() < '2026-12-01' || hoje() > '2027-12-31') return null;
    var es = (Array.isArray(ST.empresas) ? ST.empresas : []).filter(function (e) { return e.situacao !== 'encerrada' && (!e.regime || e.regime === 'simples' || e.regime === 'fator-r') && !(cfg().pj2027 || {})[e.id]; });
    if (!es.length) return null;
    var html = es.map(function (e) {
      return '<li class="inb-item pjn-2027"><div><b>📅 ' + e$(tr('2027 na PJ ', '2027 at ', '2027 en la empresa ') + (e.razao || '')) + '</b>' +
        '<p class="small">' + e$(tr('Para decidir com o contador:', 'To decide with your accountant:', 'Para decidir con el contador:')) + '</p><ul class="small">' +
        '<li>' + e$(tr('Recolher o IBS/CBS por fora do DAS em 2027?', 'Pay IBS/CBS outside the DAS in 2027?', '¿Pagar el IBS/CBS fuera del DAS en 2027?')) + '</li>' +
        '<li>' + e$(tr('Pergunta aberta: a Contabilizei avisou que, em 2027, "o DAS passa a ser calculado com base em um período diferente". Qual período, e o que muda no DAS do mês?', 'Open question: the accounting firm said that in 2027 "the DAS will be calculated over a different period". Which period, and what changes in the monthly DAS?', 'Pregunta abierta: la gestoría avisó que en 2027 "el DAS pasa a calcularse sobre un periodo diferente". ¿Qué periodo, y qué cambia en el DAS del mes?')) + '</li></ul>' +
        '</div><span class="inb-acoes"><button class="btn sm" data-acao="pjn-anotei" data-id="' + e$(e.id) + '">' + e$(tr('Anotei', 'Noted', 'Anotado')) + '</button></span></li>';
    }).join('');
    return { id: 'pj', n: es.length, html: html };
  }

  MoneyModulos.registrar({
    id: 'pj-notas',
    versao: '1.0.0',
    colecoes: [],
    pontos: {
      'pj.empresa': function (ctx) { return API.bloco(ctx); },
      'inbox.grupos': function () { var g = lembrete2027(); return g ? [g] : []; }
    },
    acoes: {
      'pjn-anotei': function (el) { (cfg().pj2027 = cfg().pj2027 || {})[el.dataset.id] = hoje(); Store.salvar(); if (typeof render === 'function') render(); if (typeof renderInboxN === 'function') renderInboxN(); }
    }
  });
  window.PJNotas = API;
})();
