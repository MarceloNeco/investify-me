/* =====================================================================
   modulos/pj.js — FiscalONE: a PJ, por empresa (3.81)        1.2.0 · 14/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 13/Nov/2026)
     · A base é o Cofre da empresa (modulos/cofre-empresa.js, ST.empresas). Sugestão, sem IA: a fonte pagadora PJ da
       declaração importada cujo nome contém o nome do titular → "Cadastrar esta empresa? <razão social> · <CNPJ>" (📥);
       o lançamento que traz o CNPJ de uma empresa cadastrada pergunta de qual empresa é a conta dele.
     · Cada conta do robô (o "banco" do lançamento: 'BS2 PJ', 'BS2 Internacional', 'BS2 PJ antiga'…) pertence a uma empresa:
       a pessoa escolhe (empresa.contasRobo). O lançamento da PJ = o que o robô marca com ir 'PJ' (g.irTexto) ou o de uma conta
       ligada a uma empresa.
     · Painel da PJ (tela t-pj, uma aba por empresa), no mês escolhido: faturamento (as entradas da conta em US$, convertidas;
       e a "Conversão US$ → R$ (chegada na PJ)"), impostos (DAS, DARF), contador, TFE, tarifas, o que foi para a PF
       (pró-labore, distribuição de lucros), o saldo de cada conta da PJ e o Fator R dos 12 meses (folha ÷ faturamento;
       folha = pró-labore líquido + DARF do pró-labore; abaixo de 28%: Anexo V; a partir de 28%: Anexo III).
     · Calendário fiscal como contas fixas da PJ (escopo reservado, r.empresaId): DAS dia 20 e DARF do pró-labore dia 20
       (Simples), contador dia 10, TFE em julho; MEI: DAS-MEI dia 20. DEFIS (março) e DASN-SIMEI (maio) são avisos no 📥.
       No saldo previsto, cada uma sai UM DIA ANTES, como "Transferir para a PJ"; no 📥, 5 dias antes: "Transfira R$ X para a
       PJ até DD/MM".
     · Visão da casa: nada (empresas, contas e lançamentos da PJ são reservados).
     · 1.1.0 (3.82): as empresas na ordem da situação (a ativa primeiro) e o ponto pj.empresa (modulos/pj-gestao.js).
     · 1.2.0 (3.86): previsão CONDICIONAL do DAS (r.condicional 'receita': só no mês seguinte a um mês com receita ou nota a
       receber; o valor = receita do mês anterior × alíquota efetiva dos últimos meses), o DAS no próximo dia útil
       (r.diaUtilSeguinte), o DARF do pró-labore no dia útil ANTERIOR (r.diaUtilAnterior), a empresa "a encerrar" com data para de prever depois dela (pontos recorrente.pula e
       recorrente.previsto), e "o contador mudou: usar o último valor" no 📥.
   API (window.PJ)
     sugestoes() → [{nome, cnpj, de}] · contasSemEmpresa() → [conta] · empresaDe(g) · lancamentos(e, de, ate) · categoria(g)
     resumo(e, mes) → {faturamento, conversao, impostos, das, darf, contador, tfe, tarifas, prolabore, lucros, n}
     fatorR(e, mes) → {folha, faturamento, fator, anexo} · calendario(e) → [dados de compromisso] · criarCalendario(e)
     transferir(hoje?) → [{r, data, ate, valor}]
   DADOS
     ST.empresas[i].contasRobo = ['BS2 PJ', …] · ST.config.pjRecusadas = {cnpj: 1}
   PONTOS QUE USA
     tela t-pj (FiscalONE) · inbox.grupos ('pj') · ações pj-*
   ===================================================================== */
(function () {
  'use strict';
  /* os rótulos e os textos que o robô usa (resumo das regras do robô, 13/Nov/2026), na ordem */
  var CATS = [
    ['conversaoSaida', /convers[aã]o us\$ → r\$ \(sa[ií]da/i], ['conversao', /convers[aã]o us\$ → r\$|recebim da conta-intern/i],
    ['das', /das simples nacional|das-simples|\bdas-mei\b/i], ['darf', /darf \(pj\)|receita fed-darf/i],
    ['tfe', /tfe prefeitura|pref mun sao paulo/i], ['contador', /contador \(pj\)/i],
    ['prolabore', /pr[oó]-?labore pj/i], ['lucros', /distribui[cç][aã]o de lucros|pj → pf em us\$/i], ['pfpj', /pf → pj/i],
    ['faturamento', /^faturamento pj/i]
  ];
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function hoje() { return API._hoje || hojeISO(); }
  function cfg() { ST.config = ST.config || {}; return ST.config; }
  function dig(t) { return String(t || '').replace(/\D/g, ''); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9$ ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function empresas() { return Array.isArray(ST.empresas) ? ST.empresas : []; }
  function mais(iso, d) { var x = new Date(iso + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); }
  function somaMes(mes, k) { var a = +mes.slice(0, 4), m = +mes.slice(5, 7) - 1 + k; a += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return a + '-' + ('0' + (m + 1)).slice(-2); }
  function fmtCnpj(c) { c = dig(c); return c.length === 14 ? c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : c; }
  function ehPJ(g) { return /^pj\b/i.test(String(g.irTexto || '')) || !!API.empresaDe(g); }
  function entra(g) { return g.fluxo === 'entrada' || g.grupo === 'RENDA'; }

  var API = {
    _hoje: null, CATS: CATS,
    /* os rótulos do robô ('BS2 PJ', 'BS2 Internacional'…) de cada empresa: os escolhidos no 📥 e os das contas do Cofre */
    rotulos: function (e) { return (e.contasRobo || []).concat((e.contas || []).map(function (c) { return c.rotuloRobo; })).filter(Boolean); },
    /* g = lançamento (conta = o rótulo do robô) ou transferência (banco = o rótulo) */
    empresaDe: function (g) {
      var c = N(String(g.id || '').indexOf('tf_') === 0 ? g.banco : g.conta); if (!c) return null;
      return empresas().find(function (e) { return API.rotulos(e).some(function (x) { return N(x) === c; }); }) || null;
    },
    /* a categoria da PJ pelo rótulo/categoria e pelo texto do extrato (as regras do robô) */
    categoria: function (g) {
      var t = [g.sub, g.rotulo, g.desc, g.descRobo].filter(Boolean).join(' · '), e = API.empresaDe(g);
      for (var i = 0; i < CATS.length; i++) if (CATS[i][1].test(t)) return CATS[i][0];
      var ct = e && e.contador; if (ct && ((ct.cnpj && dig(t).indexOf(dig(ct.cnpj)) >= 0) || (ct.nome && N(t).indexOf(N(ct.nome)) >= 0))) return 'contador';
      if (g.grupo === 'BANCARIOS' || /tarifa|anuidade|\biof\b|ted|doc/i.test(t)) return 'tarifas';
      if (entra(g) && /internacional|us\$|usd/i.test((g.conta || '') + ' ' + (g.moeda || ''))) return 'faturamento';
      return entra(g) ? 'entrada' : 'outra';
    },
    sugestoes: function () {
      if (casa()) return [];
      var tem = {}, rec = cfg().pjRecusadas || {}, out = [];
      empresas().forEach(function (e) { if (e.cnpj) tem[dig(e.cnpj)] = 1; });
      var decs = (typeof Tax !== 'undefined' && Tax.estado) ? (Tax.estado().declaracoes || []) : [];
      decs.forEach(function (d) {
        var tit = N(d.titular); if (!tit) return;
        (d.fontes || []).forEach(function (f) {
          var c = dig(f.cnpj); if (c.length !== 14 || tem[c] || rec[c] || !N(f.nome).split(' ').some(function (w) { return w === tit; })) return;
          tem[c] = 1; out.push({ nome: String(f.nome || '').trim(), cnpj: c, de: tr('declaração ', 'tax return ') + (d.exercicio || d.ano || '') });
        });
      });
      return out;
    },
    /* contas do robô com lançamento da PJ e sem empresa; e o lançamento com o CNPJ de uma empresa cadastrada */
    contasSemEmpresa: function () {
      if (casa() || !empresas().length) return [];
      var cn = {}, vistas = {}, out = [];
      empresas().forEach(function (e) { if (e.cnpj) cn[dig(e.cnpj)] = e; });
      (typeof Gasto !== 'undefined' ? Gasto.todos() : []).concat(typeof Transferencia !== 'undefined' ? Transferencia.todas() : []).forEach(function (g) {
        var c = String((String(g.id || '').indexOf('tf_') === 0 ? g.banco : g.conta) || '').trim(); if (!c || vistas[N(c)] || API.empresaDe(g)) return;
        var pj = /^pj\b/i.test(String(g.irTexto || '')), doCnpj = g.contraparte && cn[dig(g.contraparte.cnpj)];
        if (!pj && !doCnpj) return;
        vistas[N(c)] = 1; out.push({ conta: c, palpite: doCnpj ? doCnpj.id : '' });
      });
      return out;
    },
    lancamentos: function (e, de, ate) {
      var tfs = typeof Transferencia !== 'undefined' ? Transferencia.todas() : [];
      return (typeof Gasto !== 'undefined' ? Gasto.todos() : []).concat(tfs).filter(function (g) { var x = API.empresaDe(g); return x && x.id === e.id && (!de || g.data >= de) && (!ate || g.data <= ate); });
    },
    resumo: function (e, mes) {
      var r = { faturamento: 0, conversao: 0, impostos: 0, das: 0, darf: 0, contador: 0, tfe: 0, tarifas: 0, prolabore: 0, lucros: 0, n: 0 };
      API.lancamentos(e, mes + '-01', mes + '-31').forEach(function (g) {
        var k = API.categoria(g), v = Math.abs(Number(g.valor) || 0); r.n++;
        if (r[k] != null) r[k] += v;
      });
      r.impostos = r.das + r.darf;
      Object.keys(r).forEach(function (k) { if (k !== 'n') r[k] = n2(r[k]); });
      return r;
    },
    fatorR: function (e, mes) {
      var fol = 0, fat = 0;
      for (var k = 0; k < 12; k++) { var x = API.resumo(e, somaMes(mes, -k)); fol += x.prolabore + x.darf; fat += x.faturamento; }
      var f = fat > 0 ? fol / fat : null;
      return { folha: n2(fol), faturamento: n2(fat), fator: f == null ? null : Math.round(f * 1000) / 10, anexo: f == null ? '' : f >= 0.28 ? 'III' : 'V' };
    },
    /* a média das 3 últimas do mesmo tipo (para o valor previsto) */
    media: function (e, k) {
      var l = API.lancamentos(e).filter(function (g) { return API.categoria(g) === k; }).sort(function (a, b) { return a.data < b.data ? 1 : -1; }).slice(0, 3);
      return l.length ? n2(l.reduce(function (s, g) { return s + Math.abs(g.valor); }, 0) / l.length) : 0;
    },
    calendario: function (e) {
      var nome = e.razao || fmtCnpj(e.cnpj), base = { grupo: 'OUTROS', regra: 'dia', escopo: 'reservado', empresaId: e.id, estadoPadrao: 'pendente', fluxo: 'saida', varia: true, pagador: tr('PJ ', 'Company ') + nome };
      var l = [];
      /* 1.2.0 (3.86): DAS e DARF vencem dia 20. O DAS PRORROGA para o próximo dia útil (e o do Simples só entra depois de um mês com
         receita); o DARF do pró-labore (IRRF: Lei 11.196/2005, art. 70, I, d; INSS: Lei 8.212/91, art. 30, I, b) ANTECIPA para o dia útil anterior */
      if (e.regime === 'mei') l.push({ k: 'das', nome: 'DAS-MEI · ' + nome, sub: 'DAS Simples Nacional (PJ)', dia: 20, util: true });
      else if (e.regime === 'simples' || e.regime === 'fator-r' || !e.regime) {
        l.push({ k: 'das', nome: 'DAS Simples · ' + nome, sub: 'DAS Simples Nacional (PJ)', dia: 20, util: true, condicional: 'receita' });
        l.push({ k: 'darf', nome: tr('DARF do pró-labore · ', 'Pro-labore DARF · ') + nome, sub: 'DARF (PJ)', dia: 20, antecipa: true });
      }
      if (e.contador && e.contador.nome || API.media(e, 'contador')) l.push({ k: 'contador', nome: tr('Contador · ', 'Accountant · ') + nome, sub: 'Contador (PJ)', dia: 10, forma: 'Boleto' });
      l.push({ k: 'tfe', nome: 'TFE · ' + nome, sub: 'TFE Prefeitura SP (PJ)', dia: 10, regra: 'anual', mes: 7 });
      return l.map(function (x) { var d = Object.assign({}, base, { nome: x.nome, sub: x.sub, dia: x.dia, regra: x.regra || 'dia', mes: x.mes || 0, forma: x.forma || '', valor: API.media(e, x.k) || 1, pjTipo: x.k });
        if (x.util) d.diaUtilSeguinte = true; if (x.antecipa) d.diaUtilAnterior = true; if (x.condicional) d.condicional = x.condicional; return d; });
    },
    criarCalendario: function (e) {
      var ja = (typeof Recorrente !== 'undefined' ? Recorrente.todos() : []).filter(function (r) { return r.empresaId === e.id; }), n = 0;
      API.calendario(e).forEach(function (d) { if (ja.some(function (r) { return r.pjTipo === d.pjTipo; })) return; Recorrente.add(d); n++; });
      return n;
    },
    /* as contas da PJ dos próximos dias: o dono transfere da PF um dia antes */
    /* 1.2.0 (3.86): transferir até o dia útil ANTERIOR ao vencimento (o DAS de 23/11, depois do feriado e do fim de semana → 19/11) */
    ateTransferir: function (iso) { var d = mais(iso, -1), k = 0; while (k++ < 7 && typeof Feriados !== 'undefined' && Feriados.ehNaoUtil(d)) d = mais(d, -1); return d; },
    transferir: function (h, dias) {
      h = h || hoje(); var fim = mais(h, dias || 5);
      if (casa() || typeof Recorrente === 'undefined') return [];
      return Recorrente.ocorrencias(mais(h, 1), mais(fim, 8)).filter(function (o) { return o.r.empresaId && (ESTADOS_PG[o.estado] || {}).conta; })
        .map(function (o) { return { r: o.r, data: o.data, ate: API.ateTransferir(o.data), valor: n2(o.valor) }; }).filter(function (x) { return x.ate >= h && x.ate <= fim; });
    },
    avisosAnuais: function (h) {
      h = h || hoje(); var m = +h.slice(5, 7), out = [];
      empresas().forEach(function (e) {
        var nome = e.razao || fmtCnpj(e.cnpj);
        if ((e.regime === 'simples' || e.regime === 'fator-r') && m === 3) out.push({ k: 'defis|' + e.id + '|' + h.slice(0, 4), txt: tr('DEFIS de ', 'DEFIS for ') + nome + tr(': entregar até 31/03 (fale com o contador).', ': file by 31 March (ask your accountant).') });
        if (e.regime === 'mei' && m === 5) out.push({ k: 'dasn|' + e.id + '|' + h.slice(0, 4), txt: tr('DASN-SIMEI de ', 'DASN-SIMEI for ') + nome + tr(': entregar até 31/05.', ': file by 31 May.') });
      });
      return out;
    },
    /* ---------- 1.2.0 (3.86): a receita do mês, a alíquota efetiva e a previsão condicional ---------- */
    receitaMes: function (e, mes) {
      var v = 0;
      API.lancamentos(e, mes + '-01', mes + '-31').forEach(function (g) { var c = API.categoria(g); if ((c === 'faturamento' || c === 'entrada') && String(g.id || '').indexOf('tf_') !== 0) v += Math.abs(Number(g.valor) || 0); });
      return n2(v);
    },
    /* as notas a receber do mês (modulos/pj-gestao.js), para "nota emitida" contar como receita prevista */
    notasMes: function (e, mes) {
      return n2((Array.isArray(ST.pj_contas) ? ST.pj_contas : []).filter(function (x) { return x.empresaId === e.id && x.tipo === 'receber' && String(x.data).slice(0, 7) === mes; })
        .reduce(function (s, x) { return s + (window.PJGestao ? PJGestao.emReais(x).v : (x.moeda && x.moeda !== 'BRL' ? 0 : Number(x.valor) || 0)); }, 0));
    },
    /* DAS pago no mês seguinte ÷ receita do mês, nos últimos 6 meses com receita */
    aliquota: function (e, ateMes) {
      var rec = 0, das = 0;
      for (var k = 1; k <= 7; k++) {
        var m = somaMes(ateMes, -k), r = API.receitaMes(e, m); if (!(r > 0)) continue;
        var d = API.lancamentos(e, somaMes(m, 1) + '-01', somaMes(m, 1) + '-31').filter(function (g) { return API.categoria(g) === 'das'; }).reduce(function (s, g) { return s + Math.abs(Number(g.valor) || 0); }, 0);
        if (d > 0) { rec += r; das += d; }
      }
      return rec > 0 ? das / rec : null;
    },
    /* a ocorrência não entra: empresa encerrada depois da data; condicional sem receita (nem nota) no mês anterior */
    pula: function (r, iso) {
      if (!r || !r.empresaId) return false;
      var e = empresas().find(function (x) { return x.id === r.empresaId; }); if (!e) return false;
      if (e.situacao === 'a-encerrar' && e.situacaoData && iso > e.situacaoData) return true;
      if (r.condicional === 'receita') { var ant = somaMes(iso.slice(0, 7), -1); return !(API.receitaMes(e, ant) > 0 || API.notasMes(e, ant) > 0); }
      return false;
    },
    previsto: function (r, iso) {
      if (!r || !r.empresaId || r.condicional !== 'receita') return null;
      var e = empresas().find(function (x) { return x.id === r.empresaId; }); if (!e) return null;
      var ant = somaMes(iso.slice(0, 7), -1), base = API.receitaMes(e, ant) || API.notasMes(e, ant), a = API.aliquota(e, ant);
      return base > 0 && a ? { valor: n2(base * a), fonte: 'receita', aliquota: a, base: base } : null;
    },
    ehContaPJ: function (r) { return empresas().some(function (e) { return API.saldos(e).indexOf(r) >= 0; }); },
    saldos: function (e) {
      var nomes = (e.contasRobo || []).map(N);
      return (ST.saldos_banco || []).filter(function (r) { return nomes.indexOf(N(r.conta)) >= 0 || nomes.indexOf(N(r.banco)) >= 0 || nomes.indexOf(N(r.banco + ' ' + r.conta)) >= 0; });
    }
  };

  /* ---------- a tela ---------- */
  var atual = '', mesTela = '';
  function linha(rot, v, cls) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + esc(rot) + '</td><td class="num">' + fmt(v) + '</td></tr>'; }
  function tela() {
    var h = '<div class="card-head"><h1>🏢 ' + esc(tr('PJ', 'Company')) + '</h1></div>';
    if (casa()) return h + '<div class="card"><p class="small">' + esc(tr('Só o responsável vê a PJ.', 'Only the account holder sees the company.')) + '</p></div>';
    var es = window.CofreEmpresa && CofreEmpresa.ordenadas ? CofreEmpresa.ordenadas() : empresas();   /* 1.1.0 (3.82): a ativa primeiro */
    if (!es.length) return h + '<div class="card"><p class="small">' + esc(tr('Cadastre a empresa no Cofre da empresa (ou aceite a sugestão no 📥) para ver o painel da PJ.', 'Add the company in the Company vault (or accept the suggestion in 📥) to see the company panel.')) + '</p><button class="btn primary" data-irpara="t-empresa">' + esc(tr('Abrir o Cofre da empresa', 'Open the Company vault')) + '</button></div>';
    var e = es.find(function (x) { return x.id === atual; }) || es[0]; atual = e.id;
    var mes = mesTela || hoje().slice(0, 7);
    h += '<div class="pj-abas">' + es.map(function (x) { return '<button class="cfg-aba' + (x.id === e.id ? ' on' : '') + '" data-acao="pj-aba" data-id="' + esc(x.id) + '"><b>' + esc(x.razao || fmtCnpj(x.cnpj)) + '</b><span>' + esc(fmtCnpj(x.cnpj) + (x.situacao && x.situacao !== 'ativa' ? ' · ' + (x.situacao === 'a-encerrar' ? tr('a encerrar', 'to close') : tr('a reativar', 'to reactivate')) : '')) + '</span></button>'; }).join('') + '</div>';
    /* contas desta empresa */
    var sem = API.contasSemEmpresa();
    h += '<div class="card"><div class="card-head"><h3>' + esc(tr('Contas desta empresa', 'Accounts of this company')) + '</h3></div>' +
      ((e.contasRobo || []).length ? '<ul class="em-ul">' + e.contasRobo.map(function (c) { return '<li>' + esc(c) + ' <button class="linkinho muted" data-acao="pj-tirar-conta" data-id="' + esc(e.id) + '" data-conta="' + esc(c) + '">✕</button></li>'; }).join('') + '</ul>' : '<p class="small muted">' + esc(tr('Nenhuma ainda.', 'None yet.')) + '</p>') +
      (sem.length ? '<p class="small">' + esc(tr('Contas com lançamento da PJ sem empresa:', 'Accounts with company entries and no company:')) + '</p><ul class="em-ul">' + sem.map(function (s) { return '<li>' + esc(s.conta) + ' <button class="btn sm" data-acao="pj-conta" data-id="' + esc(e.id) + '" data-conta="' + esc(s.conta) + '">' + esc(tr('É desta empresa', 'Belongs to this company')) + '</button></li>'; }).join('') + '</ul>' : '') + '</div>';
    var r = API.resumo(e, mes), fr = API.fatorR(e, mes);
    h += '<div class="card"><div class="card-head"><h3>' + esc(tr('O mês', 'The month')) + '</h3>' + Cal.campo('pjMes', mes + '-01', {}) + '</div>' +
      '<div class="tbl-wrap"><table class="tbl pj-tbl"><tbody>' +
      linha(tr('Faturamento (entradas da conta em US$, convertidas)', 'Revenue (US$ account credits, converted)'), r.faturamento, 'pj-fat') +
      linha(tr('Conversão US$ → R$ (chegada na PJ)', 'US$ → R$ conversion (arrived in the company)'), r.conversao) +
      linha(tr('DAS Simples Nacional', 'DAS (Simples Nacional)'), r.das) + linha(tr('DARF (IRRF/INSS do pró-labore)', 'DARF (pro-labore withholding)'), r.darf) +
      linha(tr('Contador', 'Accountant'), r.contador) + linha(tr('TFE (Prefeitura)', 'TFE (city fee)'), r.tfe) + linha(tr('Tarifas', 'Bank fees'), r.tarifas) +
      linha(tr('Pró-labore líquido → PF', 'Net pro-labore → personal'), r.prolabore) + linha(tr('Distribuição de lucros (isenta) → PF', 'Profit distribution (tax-free) → personal'), r.lucros) +
      '</tbody></table></div></div>';
    var sb = API.saldos(e);
    h += '<div class="card"><div class="card-head"><h3>' + esc(tr('Saldo das contas da PJ', 'Company account balances')) + '</h3></div>' +
      (sb.length ? '<table class="tbl"><tbody>' + sb.map(function (x) { return linha((x.banco || '') + ' · ' + (x.conta || '') + (x.data ? ' (' + I18n.data(x.data) + ')' : ''), x.saldo); }).join('') + '</tbody></table>' : '<p class="small muted">' + esc(tr('O robô ainda não mandou o saldo destas contas.', 'The robot has not sent these balances yet.')) + '</p>') + '</div>';
    h += '<div class="card pj-fator"><div class="card-head"><h3>' + esc(tr('Fator R (12 meses)', 'Fator R (12 months)')) + '</h3></div>' +
      (fr.fator == null ? '<p class="small muted">' + esc(tr('Sem faturamento nos 12 meses.', 'No revenue in the last 12 months.')) + '</p>' :
        '<p><b class="pj-fr">' + String(fr.fator).replace('.', ',') + '%</b> · ' + esc(tr('folha ', 'payroll ') + fmt(fr.folha) + tr(' ÷ faturamento ', ' ÷ revenue ') + fmt(fr.faturamento)) + '</p>' +
        '<p class="small ' + (fr.anexo === 'V' ? 'down' : 'up') + '">' + esc(fr.anexo === 'V' ? tr('Abaixo de 28%: Anexo V (alíquota maior). Fale com o contador sobre o pró-labore.', 'Below 28%: Annex V (higher rate). Talk to your accountant about pro-labore.') : tr('A partir de 28%: Anexo III.', '28% or more: Annex III.')) + '</p>' +
        '<p class="tiny muted">' + esc(tr('Folha = pró-labore líquido + DARF do pró-labore. Estimativa: confira com o contador.', 'Payroll = net pro-labore + pro-labore DARF. Estimate: check with your accountant.')) + '</p>') + '</div>';
    var cal = (typeof Recorrente !== 'undefined' ? Recorrente.todos() : []).filter(function (x) { return x.empresaId === e.id; });
    h += '<div class="card"><div class="card-head"><h3>' + esc(tr('Calendário fiscal', 'Tax calendar')) + '</h3>' +
      '<button class="btn sm" data-acao="pj-calendario" data-id="' + esc(e.id) + '">' + esc(cal.length ? tr('Completar', 'Complete') : tr('Criar como contas fixas da PJ', 'Create as company bills')) + '</button></div>' +
      (cal.length ? '<ul class="em-ul">' + cal.map(function (x) { return '<li>' + esc(x.nome + ' · ' + (x.regra === 'anual' ? tr('anual, dia ', 'yearly, day ') + x.dia + '/' + ('0' + x.mes).slice(-2) : tr('dia ', 'day ') + x.dia) + ' · ~' + fmt(x.valor)) + '</li>'; }).join('') + '</ul>' : '<p class="small muted">' + esc(tr('DAS e DARF dia 20, contador dia 10, TFE em julho. No saldo previsto, cada uma aparece um dia antes, como "Transferir para a PJ".', 'DAS and DARF on day 20, accountant on day 10, TFE in July. In the forecast balance each shows one day earlier, as "Transfer to the company".')) + '</p>') + '</div>';
    h += (window.MoneyModulos ? MoneyModulos.html('pj.empresa', { e: e, mes: mes }) : '');   /* 1.1.0 (3.82): gráficos, contas a pagar e receber, fluxo de caixa (modulos/pj-gestao.js) */
    h += '<p class="small"><button class="btn sm" data-acao="bs2-importar">⬆️ ' + esc(tr('Importar extrato do BS2 (CSV ou OFX)', 'Import a BS2 statement (CSV or OFX)')) + '</button></p>';
    return h;
  }

  MoneyModulos.registrar({
    id: 'pj', versao: '1.2.0',
    pontos: {
      'recorrente.pula': function (c) { return [API.pula(c.r, c.iso)]; },   /* 1.2.0 (3.86) */
      'recorrente.previsto': function (c) { var p = API.previsto(c.r, c.iso); return p ? [p] : []; },
      'inbox.grupos': function () {
        if (casa()) return [];
        var html = '', n = 0, vistos = cfg().inboxVistos || {};
        API.sugestoes().forEach(function (s) { n++; html += '<li class="inb-item"><div><b>🏢 ' + esc(tr('Cadastrar esta empresa? ', 'Add this company? ') + s.nome + ' · ' + fmtCnpj(s.cnpj)) + '</b><span class="t-sub">' + esc(tr('veio da ', 'from the ') + s.de) + '</span></div><span class="inb-acoes">' +
          '<button class="btn sm primary" data-acao="pj-cadastrar" data-cnpj="' + esc(s.cnpj) + '" data-nome="' + esc(s.nome) + '">✓ ' + esc(tr('Cadastrar', 'Add')) + '</button><button class="btn sm" data-acao="pj-recusar" data-cnpj="' + esc(s.cnpj) + '">' + esc(tr('Não', 'No')) + '</button></span></li>'; });
        API.contasSemEmpresa().forEach(function (s) {
          n++; html += '<li class="inb-item"><div><b>🏢 ' + esc(tr('De qual empresa é a conta "', 'Which company owns the account "') + s.conta + '"?') + '</b></div><span class="inb-acoes">' +
            empresas().map(function (e) { return '<button class="btn sm' + (s.palpite === e.id ? ' primary' : '') + '" data-acao="pj-conta" data-id="' + esc(e.id) + '" data-conta="' + esc(s.conta) + '">' + esc(e.razao || fmtCnpj(e.cnpj)) + '</button>'; }).join('') + '</span></li>';
        });
        API.transferir().forEach(function (x) { var k = 'pjt|' + x.r.id + '|' + x.data; if (vistos[k]) return; n++; html += '<li class="inb-item"><div><b>↗ ' + esc(tr('Transfira ', 'Transfer ') + fmt(x.valor) + tr(' para a PJ até ', ' to the company by ') + I18n.data(x.ate)) + '</b><span class="t-sub">' + esc(x.r.nome + tr(' vence ', ' due ') + I18n.data(x.data)) + '</span></div><span class="inb-acoes"><button class="btn sm" data-acao="inb-visto" data-k="' + esc(k) + '">' + esc(tr('ok, entendi', 'ok, got it')) + '</button></span></li>'; });
        /* 1.2.0 (3.86): o contador mudou de valor → "usar o último valor" */
        (typeof Recorrente !== 'undefined' ? Recorrente.ativos() : []).filter(function (r) { return r.empresaId && r.pjTipo === 'contador'; }).forEach(function (r) {
          var e = empresas().find(function (x) { return x.id === r.empresaId; }); if (!e) return;
          var u = API.lancamentos(e).filter(function (g) { return API.categoria(g) === 'contador'; }).sort(function (a, b) { return a.data < b.data ? 1 : -1; })[0];
          var prev = Recorrente.valorEm ? Recorrente.valorEm(r, hoje()) : r.valor, k = 'pjc|' + r.id + '|' + (u && u.id);
          if (!u || vistos[k] || Math.abs(u.valor - prev) <= prev * 0.15) return;
          n++; html += '<li class="inb-item"><div><b>🧾 ' + esc(tr('O contador mudou: último ', 'The accountant changed: last ') + fmt(u.valor) + tr(' (previsto ', ' (expected ') + fmt(prev) + ').') + '</b><span class="t-sub">' + esc(r.nome) + '</span></div><span class="inb-acoes">' +
            '<button class="btn sm primary" data-acao="pj-ultimo" data-id="' + esc(r.id) + '" data-v="' + u.valor + '">' + esc(tr('Usar o último valor', 'Use the last amount')) + '</button><button class="btn sm" data-acao="inb-visto" data-k="' + esc(k) + '">' + esc(tr('Manter', 'Keep')) + '</button></span></li>';
        });
        API.avisosAnuais().forEach(function (a) { if (vistos[a.k]) return; n++; html += '<li class="inb-item"><div><b>📅 ' + esc(a.txt) + '</b></div><span class="inb-acoes"><button class="btn sm" data-acao="inb-visto" data-k="' + esc(a.k) + '">' + esc(tr('ok, entendi', 'ok, got it')) + '</button></span></li>'; });
        return n ? [{ id: 'pj', n: n, html: html }] : [];
      }
    },
    telas: {
      't-pj': { app: 'tax', render: tela,
        ajuda: { pt: { t: 'PJ', o: 'Por empresa: faturamento, impostos, o que foi para a PF, saldos, Fator R e o calendário fiscal.', f: ['Escolha de qual empresa é cada conta do robô.', 'Fator R abaixo de 28%: Anexo V.'] },
                 en: { t: 'Company', o: 'Per company: revenue, taxes, what went to you, balances, Fator R and the tax calendar.', f: ['Choose which company owns each robot account.', 'Fator R below 28%: Annex V.'] } } }
    },
    acoes: {
      'pj-ultimo': function (el) { var r = Recorrente.achar(el.dataset.id), v = Number(el.dataset.v); if (!r || !(v > 0)) return; Recorrente.reajustar(r.id, v, hoje()); Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN(); toast(tr('Previsão do contador: ', 'Accountant forecast: ') + fmt(v)); },
      'pj-aba': function (el) { atual = el.dataset.id; render(); },
      'pj-cadastrar': function (el) {
        ST.empresas = empresas(); ST.empresas.push({ id: 'em' + Date.now().toString(36), cnpj: dig(el.dataset.cnpj), razao: el.dataset.nome, regime: '', contador: { nome: '', contato: '' }, contas: [], pix: [], docs: [], contasRobo: [], criadoEm: hoje() });
        Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN(); toast(tr('Empresa cadastrada no Cofre da empresa. Complete o regime lá.', 'Company added to the Company vault. Fill in the regime there.'));
      },
      'pj-recusar': function (el) { (cfg().pjRecusadas = cfg().pjRecusadas || {})[dig(el.dataset.cnpj)] = 1; Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN(); },
      'pj-conta': function (el) {
        var e = empresas().find(function (x) { return x.id === el.dataset.id; }); if (!e) return;
        empresas().forEach(function (x) { x.contasRobo = (x.contasRobo || []).filter(function (c) { return N(c) !== N(el.dataset.conta); }); });
        e.contasRobo = (e.contasRobo || []).concat([el.dataset.conta]); Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN();
      },
      'pj-tirar-conta': function (el) { var e = empresas().find(function (x) { return x.id === el.dataset.id; }); if (!e) return; e.contasRobo = (e.contasRobo || []).filter(function (c) { return c !== el.dataset.conta; }); Store.salvar(); render(); },
      'pj-calendario': function (el) { var e = empresas().find(function (x) { return x.id === el.dataset.id; }); if (!e) return; var n = API.criarCalendario(e); Store.salvar(); render(); toast(n ? tr(n + ' conta(s) fixa(s) da PJ criada(s).', n + ' company bill(s) created.') : tr('O calendário já está completo.', 'The calendar is already complete.')); }
    }
  });
  document.addEventListener('change', function (ev) { if (ev.target && ev.target.id === 'pjMes' && /^\d{4}-\d{2}/.test(ev.target.value)) { mesTela = ev.target.value.slice(0, 7); render(); } });
  window.PJ = API;
})();
