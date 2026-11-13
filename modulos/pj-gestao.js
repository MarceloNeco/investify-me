/* =====================================================================
   modulos/pj-gestao.js — FiscalONE, gestão da PJ: gráficos, contas a pagar e receber, fluxo de caixa e os custos do
   negócio pagos no CPF (3.82)        1.0.1 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedidos do dono, 13/Nov/2026; dentro da tela PJ, por empresa, pelo ponto pj.empresa do modulos/pj.js)
     · Gráficos (12 meses e o ano): receita mês a mês em R$ (e a moeda de origem, quando há), custos por tipo (impostos,
       contador, taxas, tarifas, câmbio), margem (receita − custos) e o que foi para a PF (pró-labore, lucros). Mesmo desenho
       do BudgetONE (colunas para cima e para baixo, a linha do zero, a linha da margem).
     · Contas a receber e a pagar da PJ: a nota emitida e o recebimento previsto (cliente, moeda, data), os pagamentos à mão,
       e os impostos e o contador do calendário fiscal (compromissos com empresaId). Status: recebido/pago, atrasado, a vencer.
       O recebimento casa sozinho com a entrada na conta da empresa (valor ±2% — em moeda estrangeira, pelo valor na moeda —
       e data ±10 dias). Fluxo de caixa da PJ: o realizado (3 meses) e os próximos 90 dias, com o saldo das contas da PJ, sem
       a casa e sem as conversões entre as contas da própria empresa.
     · Custos do negócio pagos no CPF: nos lançamentos da PF, as assinaturas e contas com cara de negócio (regras por nome:
       Anthropic/Claude, OpenAI, GitHub, Google Workspace/Cloud, AWS, Cloudflare, Supabase, domínios, internet). A pessoa marca
       "do negócio", "da casa" ou "dividido %"; o app soma por mês o que é do negócio e saiu do CPF, sugere cadastrar o cartão e o
       e-mail da empresa no fornecedor e avisa, nos serviços do exterior, que pagar pela PJ pode ter IOF e tributos de
       importação de serviço (converse com o contador antes). Sem promessa de economia: só a conta.
     · Visão da casa: nada (a tela PJ já não abre; as coleções são reservadas).
   API (window.PJGestao)
     serie(e, mesFim) → [{t, receita, moedas, impostos, contador, taxas, tarifas, cambio, custos, margem, prolabore, lucros, pf}]
     contas(e) · statusConta(x, hoje?) · aPagar(e, dias) · fluxo(e, hoje?) → {saldo, realizado: [{t, entrou, saiu}], proximos: [...], fim}
     candidatosCpf() → [{k, nome, n, media, ext, marca}] · cpfDoMes(mes) → {negocio, itens} · REGRAS_CPF
   DADOS
     ST.pj_contas = [{id, empresaId, tipo: 'receber'|'pagar', desc, quem, nota, valor, moeda, data, feitoEm, gid}]
     ST.pj_cpf = [{id: <origem>, nome, tipo: 'negocio'|'casa'|'dividido', pct}]
   PONTOS QUE USA
     pj.empresa · ações pjg-*
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'pj_contas', CPF = 'pj_cpf';
  /* [chave, regex no texto do lançamento, nome, do exterior?] — revisável aqui */
  var REGRAS_CPF = [
    ['anthropic', /anthropic|claude\.ai|\bclaude\b/i, 'Anthropic / Claude', true], ['openai', /openai|chatgpt/i, 'OpenAI / ChatGPT', true],
    ['github', /github/i, 'GitHub', true], ['google', /google\s*(workspace|cloud|gsuite)|gsuite|google \*?(cloud|workspace)/i, 'Google Workspace / Cloud', true],
    ['aws', /\baws\b|amazon web services/i, 'AWS', true], ['cloudflare', /cloudflare/i, 'Cloudflare', true], ['supabase', /supabase/i, 'Supabase', true],
    ['dominio', /registro\.br|godaddy|namecheap|hostinger|dominio|domínio/i, tr0('Domínio', 'Domain'), false],
    ['internet', /internet|fibra|banda larga|vivo fibra|claro net|\bnet virtua\b/i, tr0('Internet', 'Internet'), false]
  ];
  function tr0(a) { return a; }
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function hoje() { return API._hoje || hojeISO(); }
  function mais(iso, d) { var x = new Date(iso + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); }
  function somaMes(mes, k) { var a = +mes.slice(0, 4), m = +mes.slice(5, 7) - 1 + k; a += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return a + '-' + ('0' + (m + 1)).slice(-2); }
  function lista(c) { return (ST[c] = Array.isArray(ST[c]) ? ST[c] : []); }
  function mesCurto(t) { var m = (pt() ? ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])[+t.slice(5, 7) - 1]; return m + '/' + t.slice(2, 4); }
  function ehCambio(g) { return /^rb_cambio-|^cambio-/.test(String(g.id || '')) || /iof \/ ted \/ doc/i.test(g.sub || ''); }
  function ehTransf(g) { return String(g.id || '').indexOf('tf_') === 0; }

  var API = {
    _hoje: null, REGRAS_CPF: REGRAS_CPF,
    /* ---------- 1) a série de 12 meses ---------- */
    serie: function (e, mesFim) {
      mesFim = mesFim || hoje().slice(0, 7); var out = [];
      for (var k = 11; k >= 0; k--) {
        var t = somaMes(mesFim, -k), r = { t: t, receita: 0, moedas: {}, impostos: 0, contador: 0, taxas: 0, tarifas: 0, cambio: 0, prolabore: 0, lucros: 0 };
        PJ.lancamentos(e, t + '-01', t + '-31').forEach(function (g) {
          var c = PJ.categoria(g), v = Math.abs(Number(g.valor) || 0);
          if (c === 'faturamento' || c === 'entrada' && !ehTransf(g)) { r.receita += v; if (g.moeda && g.valorMoeda) r.moedas[g.moeda] = n2((r.moedas[g.moeda] || 0) + Number(g.valorMoeda)); }
          else if (c === 'das' || c === 'darf') r.impostos += v;
          else if (c === 'contador') r.contador += v;
          else if (c === 'tfe') r.taxas += v;
          else if (c === 'tarifas') { if (ehCambio(g)) r.cambio += v; else r.tarifas += v; }
          else if (c === 'prolabore') r.prolabore += v;
          else if (c === 'lucros') r.lucros += v;
        });
        ['receita', 'impostos', 'contador', 'taxas', 'tarifas', 'cambio', 'prolabore', 'lucros'].forEach(function (x) { r[x] = n2(r[x]); });
        r.custos = n2(r.impostos + r.contador + r.taxas + r.tarifas + r.cambio); r.margem = n2(r.receita - r.custos); r.pf = n2(r.prolabore + r.lucros);
        out.push(r);
      }
      return out;
    },
    /* ---------- 7) contas a pagar e a receber ---------- */
    contas: function (e) { return lista(COL).filter(function (x) { return x.empresaId === e.id; }); },
    statusConta: function (x, h) { h = h || hoje(); return x.feitoEm ? 'feito' : x.data < h ? 'atrasado' : 'avencer'; },
    /* o recebimento que já caiu na conta da empresa */
    casar: function (e) {
      var usados = {}, mudou = false; lista(COL).forEach(function (x) { if (x.gid) usados[x.gid] = 1; });
      API.contas(e).filter(function (x) { return x.tipo === 'receber' && !x.feitoEm; }).forEach(function (x) {
        var g = PJ.lancamentos(e, mais(x.data, -10), mais(x.data, 10)).find(function (g) {
          if (usados[g.id] || ehTransf(g)) return false; var c = PJ.categoria(g); if (c !== 'faturamento' && c !== 'entrada') return false;
          var alvo = x.moeda && x.moeda !== 'BRL' ? Number(g.valorMoeda) : Number(g.valor);
          return alvo > 0 && Math.abs(alvo - x.valor) <= x.valor * 0.02 + 0.01;
        });
        if (g) { x.feitoEm = g.data; x.gid = g.id; usados[g.id] = 1; mudou = true; }
      });
      return mudou;
    },
    ultimaPtax: function () { var g = (typeof Gasto !== 'undefined' ? Gasto.todos() : []).filter(function (x) { return x.ptax; }).sort(function (a, b) { return a.data < b.data ? 1 : -1; })[0]; return g ? Number(g.ptax) : null; },
    emReais: function (x) { if (!x.moeda || x.moeda === 'BRL') return { v: n2(x.valor), aprox: false }; var p = API.ultimaPtax(); return { v: p ? n2(x.valor * p) : 0, aprox: true }; },
    /* o que a empresa paga: os compromissos do calendário (empresaId) e as contas a pagar à mão */
    aPagar: function (e, dias, h) {
      h = h || hoje(); var fim = mais(h, dias || 90), out = [];
      if (typeof Recorrente !== 'undefined') Recorrente.ocorrencias(mais(h, -60), fim).forEach(function (o) {
        if (o.r.empresaId !== e.id) return; var pago = !(ESTADOS_PG[o.estado] || {}).conta;
        if (o.data < h && pago) return;
        out.push({ desc: o.r.nome, data: o.data, valor: n2(o.valor), status: pago ? 'feito' : o.data < h ? 'atrasado' : 'avencer', cal: true });
      });
      API.contas(e).filter(function (x) { return x.tipo === 'pagar' && x.data <= fim && (!x.feitoEm || x.data >= h); }).forEach(function (x) { out.push({ id: x.id, desc: x.desc, data: x.data, valor: API.emReais(x).v, status: API.statusConta(x, h) }); });
      return out.sort(function (a, b) { return a.data < b.data ? -1 : 1; });
    },
    fluxo: function (e, h) {
      h = h || hoje();
      var saldo = n2((PJ.saldos(e) || []).reduce(function (s, r) { return s + (Number(r.saldo) || 0); }, 0)), real = [];
      for (var k = 2; k >= 0; k--) {
        var t = somaMes(h.slice(0, 7), -k), en = 0, sa = 0;
        PJ.lancamentos(e, t + '-01', t + '-31').forEach(function (g) {
          var c = PJ.categoria(g); if (c === 'conversao' || c === 'conversaoSaida') return;   /* entre as contas da própria empresa */
          var v = Math.abs(Number(g.valor) || 0);
          if (c === 'faturamento' || c === 'entrada' || c === 'pfpj') en += v; else sa += v;
        });
        real.push({ t: t, entrou: n2(en), saiu: n2(sa) });
      }
      var prox = [];
      API.contas(e).filter(function (x) { return x.tipo === 'receber' && !x.feitoEm && x.data <= mais(h, 90); }).forEach(function (x) { var r = API.emReais(x); prox.push({ data: x.data < h ? h : x.data, desc: (x.quem || x.desc) + (x.nota ? ' · NF ' + x.nota : ''), valor: r.v, aprox: r.aprox, entra: true }); });
      API.aPagar(e, 90, h).filter(function (x) { return x.status !== 'feito'; }).forEach(function (x) { prox.push({ data: x.data < h ? h : x.data, desc: x.desc, valor: -x.valor, entra: false }); });
      prox.sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : b.valor - a.valor; });
      var run = saldo; prox.forEach(function (p) { run = n2(run + p.valor); p.saldo = run; });
      return { saldo: saldo, realizado: real, proximos: prox, fim: run };
    },
    /* ---------- 9) custos do negócio pagos no CPF ---------- */
    regraDe: function (g) { var t = [g.desc, g.descRobo, g.sub, g.contraparte && g.contraparte.nome].filter(Boolean).join(' '); return REGRAS_CPF.find(function (r) { return r[1].test(t); }) || null; },
    chaveCpf: function (g) { return (window.Origem && Origem.origemDe(g)) || ('r:' + ((API.regraDe(g) || [''])[0])); },
    marca: function (k) { return lista(CPF).find(function (x) { return x.id === k; }) || null; },
    doCpf: function () {
      return (typeof Gasto !== 'undefined' ? Gasto.todos() : []).filter(function (g) {
        if (g.fluxo === 'entrada' || g.grupo === 'RENDA' || g.estorno || /^pj\b/i.test(String(g.irTexto || '')) || (window.PJ && PJ.empresaDe(g))) return false;
        return !!API.regraDe(g);
      });
    },
    candidatosCpf: function () {
      if (casa()) return [];
      var por = {}, h = hoje(), de = somaMes(h.slice(0, 7), -11) + '-01';
      API.doCpf().forEach(function (g) {
        if (g.data < de) return; var k = API.chaveCpf(g), r = API.regraDe(g);
        var x = por[k] || (por[k] = { k: k, nome: r[2], texto: String(g.desc || '').slice(0, 50), n: 0, total: 0, ext: r[3], meses: {} });
        x.n++; x.total += Number(g.valor) || 0; x.meses[String(g.data).slice(0, 7)] = 1;
      });
      return Object.keys(por).map(function (k) { var x = por[k]; x.media = n2(x.total / Math.max(1, Object.keys(x.meses).length)); x.marca = API.marca(k); return x; })
        .sort(function (a, b) { return b.total - a.total; });
    },
    cpfDoMes: function (mes) {
      var out = { negocio: 0, itens: [] };
      API.doCpf().forEach(function (g) {
        if (String(g.data).slice(0, 7) !== mes) return; var m = API.marca(API.chaveCpf(g)); if (!m || m.tipo === 'casa') return;
        var v = n2((Number(g.valor) || 0) * (m.tipo === 'dividido' ? (Number(m.pct) || 0) / 100 : 1));
        out.negocio = n2(out.negocio + v); out.itens.push({ g: g, v: v, nome: m.nome });
      });
      return out;
    }
  };

  /* ---------- o gráfico ---------- */
  function grafico(ms) {
    return Viz.auto(function (W, H) {
      var mL = W < 520 ? 54 : 66, mR = 12, mT = 12, mB = 26, vals = [0];
      ms.forEach(function (m) { vals.push(m.receita, -m.custos, m.margem); });
      var mk = vizMarcas(Math.min.apply(null, vals), Math.max.apply(null, vals), 4), lo = mk[0], hi = mk[mk.length - 1];
      var y = function (v) { return mT + (hi - v) * (H - mT - mB) / ((hi - lo) || 1); }, z = y(0);
      var passo = (W - mL - mR) / ms.length, x = function (i) { return mL + passo * (i + 0.5); }, lg = Math.max(3, Math.min(16, passo * 0.32));
      var h = '<svg class="viz-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(tr('Receita, custos e margem da PJ, 12 meses', 'Company revenue, costs and margin, 12 months')) + '">';
      mk.forEach(function (v) { h += '<line class="ax-l" x1="' + mL + '" x2="' + (W - mR) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '"></line><text class="ax" x="' + (mL - 6) + '" y="' + (y(v) + 4).toFixed(1) + '" text-anchor="end">' + esc(fmtCurto(v)) + '</text>'; });
      ms.forEach(function (m, i) {
        var tt = mesCurto(m.t) + ' · ' + tr('receita ', 'revenue ') + fmt(m.receita) + Object.keys(m.moedas).map(function (k) { return ' (' + k + ' ' + m.moedas[k].toLocaleString('en-US', { minimumFractionDigits: 2 }) + ')'; }).join('') + ' · ' + tr('custos ', 'costs ') + fmt(m.custos) + ' · ' + tr('margem ', 'margin ') + fmt(m.margem);
        if (m.receita > 0) h += '<rect class="col-e" x="' + (x(i) - lg - 1).toFixed(1) + '" y="' + y(m.receita).toFixed(1) + '" width="' + lg.toFixed(1) + '" height="' + Math.max(1.5, z - y(m.receita)).toFixed(1) + '" rx="2"><title>' + esc(tt) + '</title></rect>';
        if (m.custos > 0) h += '<rect class="col-s" x="' + (x(i) + 1).toFixed(1) + '" y="' + z.toFixed(1) + '" width="' + lg.toFixed(1) + '" height="' + Math.max(1.5, y(-m.custos) - z).toFixed(1) + '" rx="2"><title>' + esc(tt) + '</title></rect>';
        if (i % (passo < 34 ? 2 : 1) === 0) h += '<text class="ax" x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(mesCurto(m.t)) + '</text>';
      });
      h += '<line class="viz-zero" x1="' + mL + '" y1="' + z.toFixed(1) + '" x2="' + (W - mR) + '" y2="' + z.toFixed(1) + '"></line>';
      h += '<path class="viz-saldo" d="' + ms.map(function (m, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(m.margem).toFixed(1); }).join(' ') + '"></path>';
      ms.forEach(function (m, i) { h += '<circle class="viz-saldo-p" cx="' + x(i).toFixed(1) + '" cy="' + y(m.margem).toFixed(1) + '" r="3"><title>' + esc(tr('margem ', 'margin ') + fmt(m.margem)) + '</title></circle>'; });
      return h + '</svg>';
    }, { frac: 0.36, min: 220, max: 380 });
  }
  function fmtCurto(v) { var a = Math.abs(v); return (v < 0 ? '−' : '') + (a >= 1e6 ? (a / 1e6).toFixed(1).replace('.', ',') + 'M' : a >= 1e3 ? Math.round(a / 1e3) + 'k' : String(Math.round(a))); }
  function tabela(ms, ano) {
    var cols = [['receita', tr('Receita', 'Revenue')], ['impostos', tr('Impostos', 'Taxes')], ['contador', tr('Contador', 'Accountant')], ['taxas', tr('Taxas', 'Fees')], ['tarifas', tr('Tarifas', 'Bank fees')], ['cambio', tr('Câmbio', 'FX')], ['margem', tr('Margem', 'Margin')], ['pf', tr('Para a PF', 'To you')]];
    var soma = function (l, k) { return n2(l.reduce(function (s, m) { return s + m[k]; }, 0)); }, doAno = ms.filter(function (m) { return m.t.slice(0, 4) === ano; });
    return '<div class="tbl-wrap"><table class="tbl pjg-tbl"><thead><tr><th></th>' + cols.map(function (c) { return '<th class="num">' + esc(c[1]) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      ms.map(function (m) { return '<tr><td>' + esc(mesCurto(m.t)) + '</td>' + cols.map(function (c) { return '<td class="num' + (c[0] === 'margem' && m.margem < 0 ? ' down' : '') + '">' + fmt(m[c[0]]) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody><tfoot><tr><th>' + esc(tr('12 meses', '12 months')) + '</th>' + cols.map(function (c) { return '<td class="num">' + fmt(soma(ms, c[0])) + '</td>'; }).join('') + '</tr>' +
      '<tr class="pjg-ano"><th>' + esc(tr('Ano ', 'Year ') + ano) + '</th>' + cols.map(function (c) { return '<td class="num">' + fmt(soma(doAno, c[0])) + '</td>'; }).join('') + '</tr></tfoot></table></div>';
  }
  var ROT_ST = { feito: ['✓', 'pago/recebido', 'paid/received'], atrasado: ['⚠', 'atrasado', 'overdue'], avencer: ['○', 'a vencer', 'due'] };
  function rotSt(s) { var x = ROT_ST[s]; return x[0] + ' ' + tr(x[1], x[2]); }
  function blocoContas(e) {
    if (API.casar(e)) Store.salvar();
    var rec = API.contas(e).filter(function (x) { return x.tipo === 'receber'; }).sort(function (a, b) { return a.data < b.data ? 1 : -1; }).slice(0, 12), pag = API.aPagar(e, 90);
    return '<div class="card pjg-contas"><div class="card-head"><h3>' + esc(tr('Contas a receber e a pagar', 'Receivables and payables')) + '</h3><span><button class="btn sm" data-acao="pjg-nova" data-tipo="receber" data-id="' + esc(e.id) + '">+ ' + esc(tr('A receber (nota emitida)', 'Receivable (invoice issued)')) + '</button> <button class="btn sm" data-acao="pjg-nova" data-tipo="pagar" data-id="' + esc(e.id) + '">+ ' + esc(tr('A pagar', 'Payable')) + '</button></span></div>' +
      '<h4 class="bl-sub">' + esc(tr('A receber', 'To receive')) + '</h4>' + (rec.length ? '<ul class="pa-lista">' + rec.map(function (x) {
        var st = API.statusConta(x), r = API.emReais(x);
        return '<li class="pjg-' + st + '"><b>' + esc((x.quem || x.desc) + (x.nota ? ' · NF ' + x.nota : '')) + '</b> · ' + (x.moeda && x.moeda !== 'BRL' ? esc(x.moeda + ' ' + Number(x.valor).toLocaleString('en-US', { minimumFractionDigits: 2 })) + (r.v ? ' (≈ ' + fmt(r.v) + ')' : '') : fmt(x.valor)) +
          ' <span class="t-sub">' + esc(I18n.data(x.data) + ' · ' + rotSt(st) + (x.feitoEm ? ' ' + I18n.data(x.feitoEm) : '')) + '</span>' + (st !== 'feito' ? ' <button class="linkinho" data-acao="pjg-feito" data-cid="' + esc(x.id) + '">' + esc(tr('recebi', 'received')) + '</button>' : '') + '</li>';
      }).join('') + '</ul>' : '<p class="small muted">' + esc(tr('Nenhuma nota a receber cadastrada.', 'No receivable yet.')) + '</p>') +
      '<h4 class="bl-sub">' + esc(tr('A pagar (90 dias)', 'To pay (90 days)')) + '</h4>' + (pag.length ? '<ul class="pa-lista">' + pag.map(function (x) {
        return '<li class="pjg-' + x.status + '"><b>' + esc(x.desc) + '</b> · ' + fmt(x.valor) + ' <span class="t-sub">' + esc(I18n.data(x.data) + ' · ' + rotSt(x.status)) + '</span>' + (x.id && x.status !== 'feito' ? ' <button class="linkinho" data-acao="pjg-feito" data-cid="' + esc(x.id) + '">' + esc(tr('paguei', 'paid')) + '</button>' : '') + '</li>';
      }).join('') + '</ul>' : '<p class="small muted">' + esc(tr('Nada nos próximos 90 dias. Crie o calendário fiscal abaixo.', 'Nothing in the next 90 days. Create the tax calendar below.')) + '</p>') + '</div>';
  }
  function blocoFluxo(e) {
    var f = API.fluxo(e);
    return '<div class="card pjg-fluxo"><div class="card-head"><h3>' + esc(tr('Fluxo de caixa da PJ', 'Company cash flow')) + '</h3><span class="small muted">' + esc(tr('separado da casa', 'kept apart from the household')) + '</span></div>' +
      '<table class="tbl"><thead><tr><th>' + esc(tr('Realizado', 'Actual')) + '</th><th class="num">' + esc(tr('Entrou', 'In')) + '</th><th class="num">' + esc(tr('Saiu', 'Out')) + '</th></tr></thead><tbody>' +
      f.realizado.map(function (r) { return '<tr><td>' + esc(mesCurto(r.t)) + '</td><td class="num up">' + fmt(r.entrou) + '</td><td class="num down">' + fmt(r.saiu) + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<p class="small" style="margin:10px 0 4px"><b>' + esc(tr('Próximos 90 dias', 'Next 90 days')) + '</b> · ' + esc(tr('saldo de hoje nas contas da PJ ', 'today\'s balance in the company accounts ') + fmt(f.saldo)) + '</p>' +
      (f.proximos.length ? '<div class="tbl-wrap"><table class="tbl pjg-prox"><thead><tr><th>' + esc(tr('Data', 'Date')) + '</th><th>' + esc(tr('O quê', 'What')) + '</th><th class="num">' + esc(tr('Valor', 'Amount')) + '</th><th class="num">' + esc(tr('Saldo', 'Balance')) + '</th></tr></thead><tbody>' + f.proximos.map(function (p) { return '<tr><td>' + esc(I18n.data(p.data)) + '</td><td>' + esc(p.desc) + '</td><td class="num ' + (p.entra ? 'up' : 'down') + '">' + (p.aprox ? '≈ ' : '') + fmt(p.valor) + '</td><td class="num' + (p.saldo < 0 ? ' down' : '') + '">' + fmt(p.saldo) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="small muted">' + esc(tr('Nada previsto.', 'Nothing expected.')) + '</p>') +
      '<p class="small">' + esc(tr('Saldo previsto em 90 dias: ', 'Forecast balance in 90 days: ')) + '<b class="pjg-fim' + (f.fim < 0 ? ' down' : '') + '">' + fmt(f.fim) + '</b></p></div>';
  }
  function blocoCpf() {
    var c = API.candidatosCpf(); if (!c.length) return '';
    var mes = hoje().slice(0, 7), m = API.cpfDoMes(mes), ant = API.cpfDoMes(somaMes(mes, -1)), ext = c.some(function (x) { return x.ext && x.marca && x.marca.tipo !== 'casa'; });
    return '<div class="card pjg-cpf"><div class="card-head"><h3>' + esc(tr('Custos do negócio pagos no CPF', 'Business costs paid personally')) + '</h3></div>' +
      '<p class="small">' + esc(tr('Neste mês saíram do CPF ', 'This month ')) + '<b class="pjg-cpf-mes">' + fmt(m.negocio) + '</b>' + esc(tr(' de custos do negócio (mês passado: ', ' of business costs left your personal account (last month: ') + fmt(ant.negocio) + ').') + '</p>' +
      '<ul class="pa-lista">' + c.map(function (x) {
        var mk = x.marca, st = mk ? (mk.tipo === 'negocio' ? tr('do negócio', 'business') : mk.tipo === 'casa' ? tr('da casa', 'household') : tr('dividido ', 'split ') + mk.pct + '%') : '';
        return '<li><b>' + esc(x.nome) + '</b> · ' + esc(tr('~', '~') + fmt(x.media) + tr('/mês', '/month')) + ' <span class="t-sub">' + esc(x.texto + (st ? ' · ' + st : '')) + '</span><span class="inb-acoes">' +
          '<button class="btn sm' + (mk && mk.tipo === 'negocio' ? ' primary' : '') + '" data-acao="pjg-cpf" data-k="' + esc(x.k) + '" data-nome="' + esc(x.nome) + '" data-tipo="negocio">' + esc(tr('Do negócio', 'Business')) + '</button>' +
          '<button class="btn sm' + (mk && mk.tipo === 'casa' ? ' primary' : '') + '" data-acao="pjg-cpf" data-k="' + esc(x.k) + '" data-nome="' + esc(x.nome) + '" data-tipo="casa">' + esc(tr('Da casa', 'Household')) + '</button>' +
          '<button class="btn sm' + (mk && mk.tipo === 'dividido' ? ' primary' : '') + '" data-acao="pjg-cpf" data-k="' + esc(x.k) + '" data-nome="' + esc(x.nome) + '" data-tipo="dividido">' + esc(tr('Dividido %', 'Split %')) + '</button></span></li>';
      }).join('') + '</ul>' +
      '<p class="small">' + esc(tr('Sugestão: cadastre o cartão da PJ e o e-mail/conta da empresa nesses fornecedores, para o custo do negócio sair da conta da empresa.', 'Tip: register the company card and the company e-mail/account with these suppliers, so business costs come out of the company account.')) + '</p>' +
      (ext ? '<p class="small aviso-box pjg-ext">' + esc(tr('Serviços do exterior: pagar pela PJ pode ter IOF e tributos de importação de serviço (por exemplo PIS/COFINS-importação, ISS e IRRF/CIDE, conforme o caso). Converse com o contador antes de mudar.', 'Services from abroad: paying through the company may add IOF and service-import taxes (e.g. PIS/COFINS on imports, ISS and withholding/CIDE, depending on the case). Talk to your accountant before switching.')) + '</p>' : '') +
      '<p class="tiny muted">' + esc(tr('O app só soma e mostra a conta; não promete economia.', 'The app only adds up and shows the numbers; it promises no savings.')) + '</p></div>';
  }
  function bloco(ctx) {
    if (casa() || !ctx || !ctx.e) return '';
    var ms = API.serie(ctx.e, ctx.mes), ano = (ctx.mes || hoje()).slice(0, 4);
    return '<div class="card pjg-graf"><div class="card-head"><h3>' + esc(tr('Receita, custos e margem (12 meses)', 'Revenue, costs and margin (12 months)')) + '</h3></div><div class="viz-duplo">' + grafico(ms) + '</div>' +
      '<p class="tiny muted">' + esc(tr('Verde: receita · vermelho: custos da PJ (impostos, contador, taxas, tarifas, câmbio) · linha: margem. Passe o dedo ou o mouse na coluna para ver a moeda de origem.', 'Green: revenue · red: company costs (taxes, accountant, fees, bank fees, FX) · line: margin. Hover a column to see the original currency.')) + '</p>' + tabela(ms, ano) + '</div>' +
      blocoContas(ctx.e) + blocoFluxo(ctx.e) + blocoCpf();
  }

  function abrirNova(e, tipo) {
    $('#genTitle').textContent = tipo === 'receber' ? tr('A receber (nota emitida)', 'Receivable (invoice issued)') : tr('Conta a pagar da PJ', 'Company payable');
    $('#genBody').innerHTML = Verter.html('<div class="grid g2">' +
      campo(tipo === 'receber' ? tr('Cliente', 'Client') : tr('Fornecedor', 'Supplier'), '<input id="pjgQuem" maxlength="80">') +
      campo(tr('Descrição', 'Description'), '<input id="pjgDesc" maxlength="120">') +
      (tipo === 'receber' ? campo(tr('Número da nota', 'Invoice number'), '<input id="pjgNota" maxlength="30">') : '') +
      campo(tr('Valor', 'Amount'), '<input id="pjgValor" type="number" step="0.01" min="0">') +
      campo(tr('Moeda', 'Currency'), '<select id="pjgMoeda"><option>BRL</option><option>USD</option><option>EUR</option></select>') +
      campo(tipo === 'receber' ? tr('Recebimento previsto', 'Expected on') : tr('Vencimento', 'Due on'), Cal.campo('pjgData', mais(hoje(), 30), {})) + '</div>' +
      '<div class="f-actions"><button class="btn" data-close="genModal">' + esc(t('ac.cancelar')) + '</button><button class="btn primary" data-acao="pjg-salvar" data-id="' + esc(e.id) + '" data-tipo="' + tipo + '">' + esc(t('ac.salvar')) + '</button></div>');
    abrir('genModal');
  }
  function val(id) { var x = document.getElementById(id); return x ? String(x.value || '').trim() : ''; }

  MoneyModulos.registrar({
    id: 'pj-gestao', versao: '1.0.1', colecoes: [COL, CPF],
    pontos: { 'pj.empresa': bloco },
    acoes: {
      'pjg-nova': function (el) { var e = (ST.empresas || []).find(function (x) { return x.id === el.dataset.id; }); if (e) abrirNova(e, el.dataset.tipo); },
      'pjg-salvar': function (el) {
        var v = Number(val('pjgValor')) || 0, d = val('pjgData');
        if (!(v > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return toast(tr('Diga o valor e a data.', 'Enter the amount and the date.'), 'warn');
        lista(COL).push({ id: 'pc' + Date.now().toString(36), empresaId: el.dataset.id, tipo: el.dataset.tipo, quem: val('pjgQuem'), desc: val('pjgDesc'), nota: val('pjgNota'), valor: n2(v), moeda: val('pjgMoeda') || 'BRL', data: d });
        Store.salvar(); fechar('genModal'); render();
      },
      'pjg-feito': function (el) { var x = lista(COL).find(function (y) { return y.id === el.dataset.cid; }); if (!x) return; x.feitoEm = hoje(); Store.salvar(); render(); },
      'pjg-cpf': function (el) {
        var tipo = el.dataset.tipo, pct = 100;
        if (tipo === 'dividido') { pct = Number(String(prompt(tr('Quantos % são do negócio?', 'What % is business?'), '50') || '').replace(',', '.').replace('%', '')); if (!(pct > 0 && pct < 100)) return; }
        var l = lista(CPF), m = l.find(function (x) { return x.id === el.dataset.k; });
        if (!m) { m = { id: el.dataset.k }; l.push(m); }
        m.nome = el.dataset.nome; m.tipo = tipo; m.pct = tipo === 'dividido' ? pct : (tipo === 'negocio' ? 100 : 0);
        Store.salvar(); render();
      }
    }
  });
  window.PJGestao = API;
})();
