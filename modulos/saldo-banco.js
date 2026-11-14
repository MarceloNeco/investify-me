/* =====================================================================
   modulos/saldo-banco.js — conferência com o banco (3.64; refeita na 3.65)        2.1.2 · 14/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     O robô manda, na mesma caixa (money_entrada), itens que NUNCA viram lançamento (nuvem.js desvia para cá):
       {tipo:'saldo', id, banco, conta, conta_id, categoria_conta: 'conta'|'poupanca'|'cartao', final_conta, dono, saldo, data,
        moeda; no cartão: fatura_aberta, vence, fecha, limite, disponivel, bandeira}
       {tipo:'investimento', id, banco, conta (o nome do papel), conta_id, classe, subtipo, saldo, data, dono, moeda, vencimento,
        taxa, indexador}
     A tela (no Painel) tem TRÊS seções, cada uma com título e total, em ordem de banco (A–Z) e depois conta:
       · Conta corrente e poupança: "Itaú · Conta corrente ···1234"; saldo no banco × saldo pelo app (o primeiro saldo é o
         ajuste de abertura + entradas − saídas daquela conta); diferença acima de R$ 1: "diferença de R$ X desde dd/mm",
         com o link para os lançamentos. A diferença nunca é escondida. Nome e final iguais = um item só.
       · Cartões de crédito: pílula "Cartão de crédito"; a FATURA ABERTA, positiva; vence/fecha dd/mm; limite disponível.
         Sem vencimento: "vence: cadastre o dia no cartão" (abre o cadastro do cartão da mesma conta).
       · Investimentos: por banco, com total e "Ver no InvestifyONE"; a conta-investimento (ex.: saldo 0) vem para cá. Banco
         com conta e sem investimentos: "o <banco> não compartilhou investimentos pelo Open Finance: verifique a autorização
         no Meu Pluggy".
     Contas zeradas e sem movimento há 90 dias ficam recolhidas em "mostrar contas zeradas".
     (Cruzar os investimentos com a carteira do InvestifyONE: PENDENCIAS.)
   API (window.SaldoBanco)
     receber(item) · receberInvest(item) · contas() · secoes() · conferir(reg)
   DADOS
     Store.estado.saldos_banco = [{id, tipo: 'conta'|'poupanca'|'cartao'|'investimento', banco, conta, contaId, final, dono, moeda, saldo,
       data, atualizadoEm (2.1.2), abertura, hist, cartao: {fatura, vence, fecha, limite, disponivel, bandeira}, inv: {classe, subtipo, vencimento, taxa, indexador}}]
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'saldos_banco';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function menos(iso, dias) { return new Date(Date.parse(iso + 'T12:00:00Z') - dias * 86400000).toISOString().slice(0, 10); }
  function dm(iso) { return /^\d{4}-\d{2}-\d{2}/.test(String(iso || '')) ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : ''; }
  function num(v) { var n = Number(v); return isFinite(n) ? n : null; }
  function safe(t) { return String(t || '').replace(/[^A-Za-z0-9_.:@-]/g, '_').slice(0, 60); }
  function tipoDe(it) {
    var c = String(it.categoria_conta || '').toLowerCase();
    if (c === 'cartao' || c === 'poupanca' || c === 'conta') return c;
    if (String(it.tipo_conta || '').toLowerCase() === 'cartao' || /cart[aã]o|credit|card/i.test(String(it.conta || ''))) return 'cartao';
    if (/poupan/i.test(String(it.conta || ''))) return 'poupanca';
    return 'conta';
  }
  function hist(r, data, saldo) {
    var h = r.hist.find(function (x) { return x.data === data; });
    if (h) h.saldo = saldo; else r.hist.push({ data: data, saldo: saldo });
    r.hist.sort(function (a, b) { return a.data < b.data ? -1 : 1; });
    var ult = r.hist[r.hist.length - 1];
    r.hist = r.hist.filter(function (x) { return x.data >= menos(ult.data, 90); });
    r.saldo = ult.saldo; r.data = ult.data;
    if (data < r.abertura.data) r.abertura = { data: data, saldo: saldo };
  }

  var API = {
    receber: function (it) {
      if (!it || typeof it !== 'object') return false;
      var saldo = num(it.saldo), data = String(it.data || '');
      if (saldo === null || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
      var contaId = it.conta_id ? String(it.conta_id).slice(0, 80) : '';
      var chave = contaId || String(it.id || '').replace(/^saldo-/, '').replace(/-\d{4}-\d{2}-\d{2}$/, '') || N(it.banco + ' ' + it.conta);
      var id = 'sb_' + safe(chave), banco = String(it.banco || '').trim().slice(0, 60);
      /* 3.65: chegou com conta_id → os registros antigos desse banco (sem conta_id) saem; eram o "Itaú duplicado" */
      if (contaId) ST[COL] = lista().filter(function (x) { return x.contaId || N(x.banco) !== N(banco) || x.tipo === 'investimento'; });
      var r = lista().find(function (x) { return x.id === id; });
      if (!r) { r = { id: id, abertura: { data: data, saldo: saldo }, hist: [] }; lista().push(r); }
      r.tipo = tipoDe(it); r.banco = banco; r.conta = String(it.conta || '').trim().slice(0, 80);
      if (contaId) r.contaId = contaId;
      r.final = String(it.final_conta || '').replace(/\D/g, '').slice(-4) || r.final || '';
      r.dono = String(it.dono || '').trim().slice(0, 60); r.moeda = String(it.moeda || 'BRL').slice(0, 3);
      /* 2.1.2 (3.86): quando chegaram estes dados (o horário do robô, se ele mandar; senão, o da chegada no app) */
      var em = [it.atualizado_em, it.coletado_em, it.criado_em].filter(function (x) { return x && !isNaN(Date.parse(x)); })[0];
      r.atualizadoEm = em ? new Date(Date.parse(em)).toISOString() : new Date().toISOString();
      r.cartao = r.tipo === 'cartao' ? { fatura: Math.abs(num(it.fatura_aberta) !== null ? num(it.fatura_aberta) : saldo), vence: it.vence || '', fecha: it.fecha || '',
        limite: num(it.limite), disponivel: num(it.disponivel), bandeira: String(it.bandeira || '').slice(0, 30) } : false;
      hist(r, data, saldo);
      return true;
    },
    receberInvest: function (it) {
      if (!it || typeof it !== 'object') return false;
      var saldo = num(it.saldo), data = String(it.data || '');
      if (saldo === null || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
      var id = 'iv_' + safe(it.conta_id || it.id || N(it.banco + ' ' + it.conta)), r = lista().find(function (x) { return x.id === id; });
      if (!r) { r = { id: id, abertura: { data: data, saldo: saldo }, hist: [] }; lista().push(r); }
      r.tipo = 'investimento'; r.banco = String(it.banco || '').trim().slice(0, 60); r.conta = String(it.conta || '').trim().slice(0, 80);
      r.contaId = it.conta_id ? String(it.conta_id).slice(0, 80) : ''; r.dono = String(it.dono || '').trim().slice(0, 60); r.moeda = String(it.moeda || 'BRL').slice(0, 3);
      r.inv = { classe: String(it.classe || '').slice(0, 40), subtipo: String(it.subtipo || '').slice(0, 40), vencimento: it.vencimento || '', taxa: num(it.taxa), indexador: String(it.indexador || '').slice(0, 20) };
      hist(r, data, saldo);
      return true;
    },
    contas: lista,
    rotulo: function (r) {
      var nome = r.tipo === 'poupanca' ? tr('Poupança', 'Savings') : r.tipo === 'conta' ? (/invest/i.test(r.conta) ? r.conta : tr('Conta corrente', 'Checking account')) : r.conta;
      if (r.tipo === 'conta' && r.conta && !/^(conta|conta corrente|corrente|checking|itau|itaú)$/i.test(r.conta) && N(r.conta) !== N(r.banco)) nome = r.conta;
      return [r.banco, nome].filter(Boolean).join(' · ') + (r.final ? ' ···' + r.final : '');
    },
    zerada: function (r) { return Math.abs(r.saldo || 0) < 0.005 && r.hist.every(function (h) { return Math.abs(h.saldo) < 0.005; }) && !API.lancamentos(r).some(function (g) { return g.data >= menos(r.data, 90); }); },
    /* as três seções; nome e final iguais = um item só (o mais novo) */
    /* 3.65.2 (2.1.0): o que o robô diz que há hoje: caixa = saldos das contas e poupanças; investido = os investimentos */
    patrimonio: function () {
      var r = { caixa: 0, invest: 0, data: '', contas: 0, invests: 0 };
      lista().forEach(function (x) {
        var s = Number(x.saldo) || 0;
        if (x.tipo === 'conta' || x.tipo === 'poupanca') { r.caixa += s; r.contas++; }
        else if (x.tipo === 'investimento') { r.invest += s; r.invests++; }
        else return;
        if ((x.data || '') > r.data) r.data = x.data || '';
      });
      return r.contas || r.invests ? r : null;
    },
    secoes: function () {
      var vistos = {}, contas = [], cartoes = [], invs = [];
      lista().slice().sort(function (a, b) { return (b.data || '').localeCompare(a.data || ''); }).forEach(function (r) {
        var k = r.tipo + '|' + N(r.banco) + '|' + N(API.rotulo(r));
        if (vistos[k]) return; vistos[k] = 1;
        if (r.tipo === 'cartao') cartoes.push(r);
        else if (r.tipo === 'investimento' || (r.tipo === 'conta' && /invest/i.test(r.conta))) invs.push(r);
        else contas.push(r);
      });
      var ordem = function (a, b) { return N(a.banco).localeCompare(N(b.banco)) || API.rotulo(a).localeCompare(API.rotulo(b)); };
      contas.sort(ordem); cartoes.sort(ordem); invs.sort(ordem);
      var bancosComInv = {}; invs.forEach(function (r) { if (r.tipo === 'investimento') bancosComInv[N(r.banco)] = 1; });
      var semInv = []; contas.forEach(function (r) { if (!bancosComInv[N(r.banco)] && semInv.indexOf(r.banco) < 0) semInv.push(r.banco); });
      return { contas: contas, cartoes: cartoes, invs: invs, semInv: semInv };
    },
    lancamentos: function (r) {
      var b = N(r.banco), contasDoBanco = lista().filter(function (x) { return N(x.banco) === b && (x.tipo === 'conta' || x.tipo === 'poupanca'); }).length;
      return Gasto.todos().filter(function (g) {
        if (N(g.conta) !== b || g.cartaoId || g.cartaoNome || g.finalCartao) return false;
        if (g.contaRobo) return N(g.contaRobo) === N(r.conta) || (r.contaId && g.contaRobo === r.contaId);
        return contasDoBanco <= 1 || r.tipo === 'conta';
      });
    },
    saldoApp: function (r, ate, ls) {
      var s = Number(r.abertura.saldo) || 0;
      (ls || API.lancamentos(r)).forEach(function (g) {
        if (!g.data || g.data <= r.abertura.data || g.data > ate) return;
        s += g.fluxo === 'entrada' ? Math.abs(Number(g.valor) || 0) : -(Number(g.valor) || 0);
      });
      return Math.round(s * 100) / 100;
    },
    conferir: function (r) {
      if (r.tipo === 'cartao') return { banco: r.cartao ? r.cartao.fatura : Math.abs(r.saldo), app: null, dif: 0, cartao: true };
      if (r.tipo !== 'conta') return { banco: r.saldo, app: null, dif: 0 };
      var ls = API.lancamentos(r), app = API.saldoApp(r, r.data, ls), dif = Math.round((r.saldo - app) * 100) / 100, desde = '';
      if (Math.abs(dif) > 1) { desde = r.abertura.data; r.hist.forEach(function (h) { if (Math.abs(h.saldo - API.saldoApp(r, h.data, ls)) <= 1) desde = h.data; }); }
      return { banco: r.saldo, app: app, dif: dif, desde: desde, cartao: false, n: ls.length };
    }
  };

  function linhaConta(r) {
    var c = API.conferir(r), h = '<tr><td><span class="t-main">' + esc(API.rotulo(r)) + '</span><div class="t-sub">' + esc((r.dono ? r.dono + ' · ' : '') + tr('lido em ', 'read on ') + fmtData(r.data)) + '</div>';
    if (c.app !== null) {
      if (Math.abs(c.dif) > 1) h += '<div class="t-sub sb-dif down">⚠ ' + esc(tr('diferença de ', 'difference of ') + fmt(c.dif) + tr(' desde ', ' since ') + dm(c.desde)) +
        ' · <button class="linkinho" data-acao="sb-ver" data-id="' + esc(r.id) + '" data-de="' + esc(c.desde) + '" data-ate="' + esc(r.data) + '">' + esc(tr('ver os lançamentos', 'see the entries')) + '</button></div>';
      else h += '<div class="t-sub up">✓ ' + esc(tr('bate com o app', 'matches the app')) + ' (' + esc(tr('pelo app ', 'app ') + fmt(c.app)) + ')</div>';
    }
    return h + '</td><td class="num"><b>' + fmt(r.saldo) + '</b></td></tr>';
  }
  function linhaCartao(r) {
    var k = r.cartao || {}, cad = window.Cartoes && r.contaId ? Cartoes.daConta(r.contaId) : null;
    var vence = k.vence || (cad && cad.vence ? 'cad' : ''), pedaco = [];
    if (k.vence) pedaco.push(tr('vence ', 'due ') + dm(k.vence));
    else if (cad && cad.vence) pedaco.push(tr('vence dia ', 'due on day ') + cad.vence);
    if (k.fecha) pedaco.push(tr('fecha ', 'closes ') + dm(k.fecha));
    if (k.disponivel !== null && k.disponivel !== undefined) pedaco.push(tr('limite disponível ', 'available limit ') + fmt(k.disponivel));
    /* 2.1.1 (3.80): o que está pendente ou em caução no cartão já usa o limite */
    var pa = window.PreAut && cad ? PreAut.doCartao(cad.id) : 0;
    if (pa > 0) pedaco.push(tr('limite usado por pendentes/cauções ', 'limit used by pending/holds ') + fmt(pa));
    return '<tr><td><span class="t-main">' + esc(API.rotulo(r)) + '</span> <span class="sb-pill">' + esc(tr('Cartão de crédito', 'Credit card')) + '</span>' +
      '<div class="t-sub">' + esc(tr('Fatura aberta ', 'Open bill ') + fmt(k.fatura || 0)) + (pedaco.length ? ' · ' + esc(pedaco.join(' · ')) : '') + '</div>' +
      (!vence ? '<div class="t-sub">' + esc(tr('vence: ', 'due: ')) + '<button class="linkinho" data-acao="sb-cartao" data-id="' + esc(r.id) + '">' + esc(tr('cadastre o dia no cartão', 'add the day to the card')) + '</button></div>' : '') +
      '</td><td class="num"><b>' + fmt(k.fatura || 0) + '</b></td></tr>';
  }
  function secao(tit, total, linhas, extra) {
    return '<h4 class="sb-sec"><span>' + esc(tit) + '</span><b>' + fmt(total) + '</b></h4>' +
      (linhas ? '<table class="tbl sb-tbl"><tbody>' + linhas + '</tbody></table>' : '') + (extra || '');
  }
  function cartao() {
    if (!lista().length) return '';
    var s = API.secoes(), h = '<div class="card sb-card"><div class="card-head"><h3>🏦 ' + esc(tr('Conferência com o banco', 'Check against the bank')) + '</h3></div>';
    var vivas = s.contas.filter(function (r) { return !API.zerada(r); }), zeradas = s.contas.filter(API.zerada);
    h += secao(tr('Conta corrente e poupança', 'Checking and savings'), vivas.reduce(function (t, r) { return t + (r.saldo || 0); }, 0), vivas.map(linhaConta).join(''),
      zeradas.length ? '<details class="sb-zeradas"><summary class="small">' + esc(tr('mostrar contas zeradas', 'show zero-balance accounts')) + ' (' + zeradas.length + ')</summary><table class="tbl sb-tbl"><tbody>' + zeradas.map(linhaConta).join('') + '</tbody></table></details>' : '');
    if (s.cartoes.length) h += secao(tr('Cartões de crédito', 'Credit cards'), s.cartoes.reduce(function (t, r) { return t + ((r.cartao || {}).fatura || 0); }, 0), s.cartoes.map(linhaCartao).join(''));
    var porBanco = {}; s.invs.forEach(function (r) { (porBanco[r.banco] = porBanco[r.banco] || []).push(r); });
    var linhasInv = Object.keys(porBanco).sort(function (a, b) { return N(a).localeCompare(N(b)); }).map(function (b) {
      var l = porBanco[b], tot = l.reduce(function (t, r) { return t + (r.saldo || 0); }, 0);
      return '<tr><td><span class="t-main">' + esc(b) + '</span><div class="t-sub">' + esc(l.map(function (r) { return r.conta + (r.inv && r.inv.vencimento ? ' (' + tr('vence ', 'matures ') + dm(r.inv.vencimento) + ')' : '') + ' ' + fmt(r.saldo); }).join(' · ')) + '</div></td><td class="num"><b>' + fmt(tot) + '</b></td></tr>';
    }).join('');
    h += secao(tr('Investimentos', 'Investments'), s.invs.reduce(function (t, r) { return t + (r.saldo || 0); }, 0), linhasInv,
      (s.invs.length ? '<p class="small" style="margin:6px 0 0"><button class="linkinho" data-acao="sb-investify">' + esc(tr('Ver no InvestifyONE ›', 'See in InvestifyONE ›')) + '</button></p>' : '') +
      s.semInv.map(function (b) { return '<p class="tiny muted" style="margin:4px 0 0">' + esc(tr('o ' + b + ' não compartilhou investimentos pelo Open Finance: verifique a autorização no Meu Pluggy', b + ' did not share investments via Open Finance: check the authorisation in Meu Pluggy')) + '</p>'; }).join(''));
    return h + '<p class="tiny muted" style="margin:10px 0 0">' + esc(tr('O primeiro saldo que chegou de cada conta é o ponto de partida (ajuste de abertura).', 'The first balance received for each account is the starting point (opening adjustment).')) + '</p></div>';
  }

  MoneyModulos.registrar({
    id: 'saldo-banco',
    versao: '2.1.1',
    colecoes: [COL],
    pontos: { 'budget.painel': cartao },
    acoes: {
      'sb-ver': function (el) {
        var r = lista().find(function (x) { return x.id === el.dataset.id; }); if (!r) return;
        bFiltro = Object.assign({}, bFiltro, { busca: r.banco, de: el.dataset.de, ate: el.dataset.ate, periodo: '' });
        irPara('b-lanc');
      },
      'sb-cartao': function (el) {
        var r = lista().find(function (x) { return x.id === el.dataset.id; }); if (!r || typeof abrirCartao !== 'function') return;
        var c = window.Cartoes && r.contaId ? Cartoes.daConta(r.contaId) : null;
        if (c) return abrirCartao(c.id);
        var enc = window.Cartoes ? Cartoes.encontrados().find(function (x) { return x.contaId === r.contaId; }) : null;
        abrirCartao(null, enc ? Cartoes.semente(enc.chave) : { apelido: r.conta, fim: r.final, contaId: r.contaId, contaNome: r.conta, finais: r.final ? [{ fim: r.final, tipo: 'naosei' }] : [] });
      },
      'sb-investify': function () { abrirApp('investify'); irPara('carteira'); }
    }
  });
  window.SaldoBanco = API;
})();
