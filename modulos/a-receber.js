/* =====================================================================
   modulos/a-receber.js — VALORES A RECEBER: estornos, reembolsos, contestações (3.79)        1.0.0 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 13/Nov/2026)
     · Cadastro "A receber": de quem (nome/CNPJ), o quê (estorno, reembolso do plano de saúde, contestação no cartão,
       restituição do IR, devolução, outro), valor total à vista ou em N parcelas, onde deve cair (cartão ou conta), a data
       do pedido, a data prometida (opcional) e o protocolo/observação. Atalho no lançamento: "↩ Pedi estorno disto" já
       preenche de quem, o valor, o cartão e o parcelado (compra em N×: total = parcela × N; o estorno pode vir de uma vez
       ou parcela a parcela).
     · Vigilância, sem IA: procura CRÉDITO (estorno no cartão = lançamento negativo; ou entrada na conta) do mesmo
       recebedor (CNPJ → o estorno que o robô já ligou à compra → a mesma origem → nome parecido), a partir da data do
       pedido, de valor até o que falta. Achou: "recebido" ou "recebido em parte: X de Y" e o aviso "Caiu o estorno de
       <quem>: R$ X" (📥, até "ok, entendi"). Passou a data prometida (ou 30 dias do pedido, sem data) sem crédito:
       "Precisa da sua atenção" e 📥: "<quem> ainda não estornou R$ X (pedido em DD/MM). Cobrar de novo?" com
       "Já recebi", "Cobrei de novo (+30 dias)" e "Desisti" — volta todo mês até resolver.
     · O que caiu SEM cadastro: um crédito de quem antes cobrou um gasto vira "Parece um estorno de <quem>. Marcar?".
     · Tela "A receber" (BudgetONE; pelo "+ Adicionar" e pelo cartão no topo de Contas fixas): total pendente, por
       pessoa/empresa e data; e, junto, a restituição do IR prevista (o compromisso que DeclEscolhas cria) e o reembolso de
       saúde estimado do ano (Saude.doAno), quando existem.
     · Visão da casa: cada item segue o lançamento de origem (Escopo.de('a_receber') no visao-casa); sem lançamento, o que
       a pessoa marcar; na dúvida, reservado.
   API (window.AReceber)
     lista() · abertos() · restante(x) · vigiar() → [novos recebimentos] · atrasados() · sugestoes() · deGasto(g) → dados
   DADOS
     ST.a_receber = [{id, quem, cnpj, origem, tipo, total, parcelas, valorParcela, ondeCartaoId, ondeBancoId, pedidoEm,
                      prometido, protocolo, gastoId, estado: 'aguardando'|'parcial'|'recebido'|'desistiu',
                      recebidos: [{gid, valor, data, manual?}], adiadoAte, escopo?, criadoEm}]
     ST.config.arRecusados = {gid: 1}   (sugestões recusadas)
   PONTOS QUE USA
     lancamento.form · custos.topo · custos.adicionar · budget.atencao · inbox.grupos ('receber') · tela b-receber ·
     evento gasto.novo · ações ar-*
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'a_receber', DIAS = 30;
  var TIPOS = [['estorno', 'Estorno', 'Refund'], ['reembolso-saude', 'Reembolso do plano de saúde', 'Health plan reimbursement'], ['contestacao', 'Contestação no cartão', 'Card dispute'],
    ['restituicao-ir', 'Restituição do IR', 'Tax refund'], ['devolucao', 'Devolução', 'Return'], ['outro', 'Outro', 'Other']];
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function hoje() { return API._hoje || hojeISO(); }
  function mais(iso, d) { var x = new Date(iso + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); }
  function dig(t) { return String(t || '').replace(/\D/g, ''); }
  function rotTipo(id) { var x = TIPOS.find(function (t) { return t[0] === id; }) || TIPOS[0]; return pt() ? x[1] : x[2]; }
  function cfg() { ST.config = ST.config || {}; return ST.config; }
  function semParcela(t) { return String(t || '').replace(/^↩\s*/, '').replace(/\s*\(?\b\d{1,2}\s*\/\s*\d{1,2}\b\)?\s*$/, '').replace(/\s*·.*$/, '').trim(); }
  function nomeDe(g) { return (g.contraparte && g.contraparte.nome) || semParcela(g.descRobo || g.desc) || g.sub || ''; }
  function norm(t) { return window.Profissionais ? Profissionais.norm(t) : String(t || '').toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 2; }); }
  function credito(g) { return !!g && (g.estorno || Number(g.valor) < 0 || g.fluxo === 'entrada') && Math.abs(Number(g.valor) || 0) > 0; }
  function usados() { var u = {}; lista().forEach(function (x) { (x.recebidos || []).forEach(function (r) { if (r.gid) u[r.gid] = x.id; }); }); return u; }

  function mesmoRecebedor(x, g) {
    var cg = dig(g.contraparte && g.contraparte.cnpj);
    if (x.cnpj && cg) return dig(x.cnpj) === cg;
    if (x.gastoId && g.estornoDe === x.gastoId) return true;
    if (x.origem && window.Origem && Origem.origemDe(g) === x.origem) return true;
    var a = norm(x.quem), b = norm(nomeDe(g)); if (!a.length || !b.length) return false;
    if (window.Profissionais && Profissionais.parecido(a, b) >= 0.8) return true;
    return a.every(function (w) { return b.indexOf(w) >= 0; });
  }

  var API = {
    _hoje: null, TIPOS: TIPOS, lista: lista,
    achar: function (id) { return lista().find(function (x) { return x.id === id; }) || null; },
    recebido: function (x) { return n2((x.recebidos || []).reduce(function (s, r) { return s + (Number(r.valor) || 0); }, 0)); },
    restante: function (x) { return Math.max(0, n2((Number(x.total) || 0) - API.recebido(x))); },
    abertos: function () { return lista().filter(function (x) { return x.estado === 'aguardando' || x.estado === 'parcial'; }); },
    prazo: function (x) { return x.adiadoAte || x.prometido || mais(x.pedidoEm || hoje(), DIAS); },
    /* liga os créditos novos aos pedidos em aberto (sem IA); devolve o que caiu agora */
    vigiar: function () {
      var u = usados(), novos = [], gs = (typeof Gasto !== 'undefined' ? Gasto.todos() : []).filter(credito)
        .sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; });
      API.abertos().forEach(function (x) {
        gs.forEach(function (g) {
          if (u[g.id] || x.estado === 'recebido') return;
          if (x.pedidoEm && g.data && g.data < x.pedidoEm) return;
          var v = Math.abs(Number(g.valor) || 0), falta = API.restante(x);
          if (v > falta * 1.02 + 0.01 || !mesmoRecebedor(x, g)) return;
          x.recebidos = x.recebidos || []; x.recebidos.push({ gid: g.id, valor: n2(Math.min(v, falta)), data: g.data || hoje() }); u[g.id] = x.id;
          x.estado = API.restante(x) <= 0.01 ? 'recebido' : 'parcial';
          novos.push({ x: x, g: g, valor: n2(v) });
        });
      });
      if (novos.length && typeof Store !== 'undefined') Store.salvar();
      return novos;
    },
    atrasados: function () { var h = hoje(); return API.abertos().filter(function (x) { return API.prazo(x) < h; }); },
    /* crédito sem cadastro de quem antes cobrou um gasto */
    sugestoes: function () {
      var u = usados(), rec = cfg().arRecusados || {}, de = mais(hoje(), -60), todos = typeof Gasto !== 'undefined' ? Gasto.todos() : [];
      return todos.filter(function (g) { return credito(g) && !u[g.id] && !rec[g.id] && g.data >= de && g.grupo !== 'RENDA' && g.grupo !== 'INVESTIMENTO'; }).map(function (g) {
        var o = g.estornoDe ? todos.find(function (s) { return s.id === g.estornoDe; }) : null;
        if (!o && window.Origem) { var k = Origem.origemDe(g); o = k && todos.find(function (s) { return s.id !== g.id && !credito(s) && s.data <= g.data && Origem.origemDe(s) === k; }); }
        return o ? { g: g, o: o, quem: nomeDe(o), valor: n2(Math.abs(g.valor)) } : null;
      }).filter(Boolean);
    },
    deGasto: function (g) {
      var p = (typeof Gasto !== 'undefined' && Gasto.parcela) ? Gasto.parcela(g.desc, g) : '', n = p ? Number(p.split('/')[1]) || 1 : 1, v = n2(Math.abs(g.valor));
      return { quem: nomeDe(g), cnpj: dig(g.contraparte && g.contraparte.cnpj), origem: window.Origem ? Origem.origemDe(g) : '', tipo: g.cartaoId ? 'estorno' : 'devolucao',
        total: n2(v * n), parcelas: n, valorParcela: v, ondeCartaoId: g.cartaoId || '', ondeBancoId: g.cartaoId ? '' : (g.bancoId || ''), pedidoEm: hoje(), gastoId: g.id };
    },
    salvar: function (d, id) {
      var x = id ? API.achar(id) : null;
      if (x) Object.assign(x, d); else { x = Object.assign({ id: 'ar' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), estado: 'aguardando', recebidos: [], criadoEm: hoje() }, d); lista().push(x); }
      if (!(x.parcelas > 1)) { x.parcelas = 1; x.valorParcela = x.total; }
      if (x.estado !== 'desistiu') x.estado = API.restante(x) <= 0.01 && API.recebido(x) > 0 ? 'recebido' : API.recebido(x) > 0 ? 'parcial' : 'aguardando';
      return x;
    }
  };

  /* ---------- textos ---------- */
  function onde(x) {
    if (x.ondeCartaoId && typeof Banco !== 'undefined') return Banco.rotuloCartao(x.ondeCartaoId);
    var b = x.ondeBancoId && typeof Banco !== 'undefined' && Banco.achar(x.ondeBancoId); return b ? (b.apelido || b.nome) : '';
  }
  function situacao(x) {
    if (x.estado === 'recebido') return '✓ ' + tr('recebido', 'received');
    if (x.estado === 'desistiu') return tr('desistiu', 'gave up');
    if (x.estado === 'parcial') return tr('recebido em parte: ', 'partly received: ') + fmt(API.recebido(x)) + tr(' de ', ' of ') + fmt(x.total);
    return (API.prazo(x) < hoje() ? '⚠ ' : '') + tr('aguardando até ', 'waiting until ') + I18n.data(API.prazo(x));
  }
  function fraseCobrar(x) {
    return x.quem + tr(' ainda não estornou ', ' has not refunded ') + fmt(API.restante(x)) + tr(' (pedido em ', ' (asked on ') + I18n.data(x.pedidoEm) + '). ' + tr('Cobrar de novo?', 'Chase it again?');
  }
  function fraseCaiu(n) { return tr('Caiu o estorno de ', 'Refund from ') + n.x.quem + tr(': ', ' arrived: ') + fmt(n.valor); }
  function botoesCobrar(x) {
    return '<button class="btn sm primary" data-acao="ar-recebi" data-id="' + esc(x.id) + '">✓ ' + esc(tr('Já recebi', 'Received')) + '</button>' +
      '<button class="btn sm" data-acao="ar-cobrei" data-id="' + esc(x.id) + '">' + esc(tr('Cobrei de novo (+30 dias)', 'Chased again (+30 days)')) + '</button>' +
      '<button class="btn sm" data-acao="ar-desisti" data-id="' + esc(x.id) + '">' + esc(tr('Desisti', 'Gave up')) + '</button>';
  }
  /* os avisos "caiu": guardados até "ok, entendi" */
  function caidos() {
    var vistos = cfg().inboxVistos || {}, out = [];
    lista().forEach(function (x) { (x.recebidos || []).forEach(function (r) { if (r.gid && !r.manual) { var k = 'ar|' + x.id + '|' + r.gid; if (!vistos[k]) out.push({ x: x, valor: r.valor, k: k }); } }); });
    return out;
  }

  /* ---------- a tela ---------- */
  function linhaItem(x) {
    return '<li class="ar-item' + (API.prazo(x) < hoje() && (x.estado === 'aguardando' || x.estado === 'parcial') ? ' ar-atraso' : '') + '"><div><b>' + esc(x.quem) + '</b> · ' + esc(rotTipo(x.tipo)) +
      ' · <b>' + fmt(x.total) + '</b>' + (x.parcelas > 1 ? ' (' + x.parcelas + '× ' + fmt(x.valorParcela) + ')' : '') +
      '<span class="t-sub">' + esc([tr('pedido em ', 'asked on ') + I18n.data(x.pedidoEm), onde(x) && tr('cai em ', 'lands in ') + onde(x), x.protocolo && tr('protocolo ', 'ref. ') + x.protocolo].filter(Boolean).join(' · ')) + '</span>' +
      '<span class="t-sub ar-sit">' + esc(situacao(x)) + '</span></div><span class="inb-acoes">' +
      (x.estado === 'aguardando' || x.estado === 'parcial' ? botoesCobrar(x) : '') +
      '<button class="btn sm" data-acao="ar-editar" data-id="' + esc(x.id) + '">' + esc(tr('Editar', 'Edit')) + '</button></span></li>';
  }
  function extras() {
    var h = '', a = Number(hoje().slice(0, 4));
    try {
      (typeof Recorrente !== 'undefined' ? Recorrente.ocorrencias(hoje(), mais(hoje(), 400)) : []).filter(function (o) { return /restitui/i.test(o.r.sub + ' ' + o.r.nome) && o.r.fluxo === 'entrada'; })
        .forEach(function (o) { h += '<li>🧾 ' + esc(o.r.nome) + ' · ' + fmt(o.valor) + ' · ' + esc(I18n.data(o.data)) + '</li>'; });
    } catch (e) {}
    try { var s = window.Saude && Saude.doAno(a); if (s && s.volta > 0) h += '<li>🩺 ' + esc(tr('Reembolso de saúde estimado em ', 'Estimated health reimbursement in ') + a) + ' · ' + fmt(s.volta) + ' <button class="linkinho" data-irpara="b-saude">›</button></li>'; } catch (e) {}
    return h ? '<div class="card"><div class="card-head"><h3>' + esc(tr('Também a receber', 'Also to receive')) + '</h3></div><ul class="ar-extra">' + h + '</ul></div>' : '';
  }
  function tela() {
    API.vigiar();
    var ab = API.abertos(), tot = n2(ab.reduce(function (s, x) { return s + API.restante(x); }, 0));
    var h = '<div class="card-head"><h1>💸 ' + esc(tr('A receber', 'To receive')) + '</h1><button class="btn primary sm" data-acao="ar-novo">+ ' + esc(tr('Novo', 'New')) + '</button></div>' +
      '<p class="small muted">' + esc(tr('Estornos, reembolsos e contestações. O app vigia o extrato e o cartão e avisa quando cai — ou quando passa do prazo.', 'Refunds, reimbursements and disputes. The app watches statements and cards and tells you when it lands — or when it is late.')) + '</p>' +
      '<div class="kpis kpis-2"><div class="kpi"><div class="lbl">' + esc(tr('Pendente', 'Pending')) + '</div><div class="val ar-total">' + fmt(tot) + '</div><div class="sub">' + ab.length + tr(' pedido(s)', ' request(s)') + '</div></div></div>';
    var sg = API.sugestoes();
    if (sg.length) h += '<div class="card"><div class="card-head"><h3>' + esc(tr('Parece estorno', 'Looks like a refund')) + '</h3></div><ul class="inb-lista">' + sg.map(itemSugestao).join('') + '</ul></div>';
    /* por pessoa/empresa, cada uma por data */
    var por = {}; ab.forEach(function (x) { (por[x.quem] = por[x.quem] || []).push(x); });
    var nomes = Object.keys(por).sort(function (a, b) { return por[a][0].pedidoEm < por[b][0].pedidoEm ? -1 : 1; });
    h += nomes.length ? nomes.map(function (n) {
      var l = por[n].sort(function (a, b) { return a.pedidoEm < b.pedidoEm ? -1 : 1; });
      return '<div class="card ar-quem"><div class="card-head"><h3>' + esc(n) + '</h3><span class="small">' + fmt(l.reduce(function (s, x) { return s + API.restante(x); }, 0)) + '</span></div><ul class="inb-lista">' + l.map(linhaItem).join('') + '</ul></div>';
    }).join('') : '<div class="card"><p class="small muted">' + esc(tr('Nada pendente. Pediu um estorno? Toque em "+ Novo" ou, no lançamento, em "↩ Pedi estorno disto".', 'Nothing pending. Asked for a refund? Tap "+ New" or, on the entry, "↩ I asked for a refund".')) + '</p></div>';
    var fe = lista().filter(function (x) { return x.estado === 'recebido' || x.estado === 'desistiu'; });
    if (fe.length) h += '<details class="card"><summary>' + esc(tr('Resolvidos', 'Resolved')) + ' (' + fe.length + ')</summary><ul class="inb-lista">' + fe.map(linhaItem).join('') + '</ul></details>';
    return h + extras();
  }
  function itemSugestao(s) {
    return '<li class="inb-item"><div><b>' + esc(tr('Parece um estorno de ', 'Looks like a refund from ') + s.quem + '. ' + tr('Marcar?', 'Mark it?')) + '</b><span class="t-sub">' +
      esc(fmt(s.valor) + ' · ' + I18n.data(s.g.data) + tr(' · a compra foi em ', ' · the purchase was on ') + I18n.data(s.o.data)) + '</span></div><span class="inb-acoes">' +
      '<button class="btn sm primary" data-acao="ar-marcar" data-gid="' + esc(s.g.id) + '" data-oid="' + esc(s.o.id) + '">✓ ' + esc(tr('Marcar', 'Mark')) + '</button>' +
      '<button class="btn sm" data-acao="ar-nao" data-gid="' + esc(s.g.id) + '">' + esc(tr('Não é', 'It is not')) + '</button></span></li>';
  }

  /* ---------- o formulário ---------- */
  function abrirForm(x) {
    x = x || {};
    var cs = typeof Banco !== 'undefined' ? Banco.cartoes() : [], bs = typeof Banco !== 'undefined' ? Banco.todos() : [];
    var opOnde = '<option value="">—</option>' + cs.map(function (c) { return '<option value="c:' + esc(c.id) + '"' + (x.ondeCartaoId === c.id ? ' selected' : '') + '>💳 ' + esc(Banco.rotuloCartao(c.id)) + '</option>'; }).join('') +
      bs.map(function (b) { return '<option value="b:' + esc(b.id) + '"' + (x.ondeBancoId === b.id ? ' selected' : '') + '>🏦 ' + esc(b.apelido || b.nome) + '</option>'; }).join('');
    $('#genTitle').textContent = x.id ? tr('Editar o que tenho a receber', 'Edit what I am owed') : tr('Valor a receber', 'Amount to receive');
    $('#genBody').innerHTML = Verter.html('<div class="grid g2">' +
      campo(tr('De quem (pessoa ou empresa)', 'From whom (person or company)'), '<input id="arQuem" maxlength="80" value="' + esc(x.quem || '') + '">') +
      campo(tr('CNPJ (se souber)', 'CNPJ (if known)'), '<input id="arCnpj" inputmode="numeric" maxlength="18" value="' + esc(x.cnpj || '') + '">') +
      campo(tr('O quê', 'What'), '<select id="arTipo">' + TIPOS.map(function (t) { return '<option value="' + t[0] + '"' + (x.tipo === t[0] ? ' selected' : '') + '>' + esc(pt() ? t[1] : t[2]) + '</option>'; }).join('') + '</select>') +
      campo(tr('Valor total (R$)', 'Total amount (R$)'), '<input id="arTotal" type="number" min="0" step="0.01" inputmode="decimal" value="' + (x.total || '') + '">') +
      campo(tr('Em quantas vezes (1 = de uma vez)', 'In how many parts (1 = all at once)'), '<input id="arParc" type="number" min="1" max="48" value="' + (x.parcelas || 1) + '">') +
      campo(tr('Onde deve cair', 'Where it should land'), '<select id="arOnde">' + opOnde + '</select>') +
      campo(tr('Pedi em', 'Asked on'), Cal.campo('arPedido', x.pedidoEm || hoje(), {})) +
      campo(tr('Prometeram para (opcional)', 'Promised by (optional)'), Cal.campo('arProm', x.prometido || '', {})) + '</div>' +
      campo(tr('Protocolo ou observação', 'Reference or note'), '<input id="arProt" maxlength="120" value="' + esc(x.protocolo || '') + '">') +
      '<p class="tiny muted">' + esc(tr('Sem data prometida, o app cobra você em 30 dias se nada cair.', 'With no promised date, the app reminds you in 30 days if nothing lands.')) + '</p>' +
      '<div class="f-actions">' + (x.id ? '<button class="btn" data-acao="ar-apagar" data-id="' + esc(x.id) + '">' + esc(tr('Apagar', 'Delete')) + '</button>' : '') +
      '<button class="btn" data-close="genModal">' + esc(t('ac.cancelar')) + '</button><button class="btn primary" data-acao="ar-salvar" data-id="' + esc(x.id || '') + '"' +
      (x.gastoId ? ' data-gasto="' + esc(x.gastoId) + '" data-origem="' + esc(x.origem || '') + '"' : '') + '>' + esc(t('ac.salvar')) + '</button></div>');
    abrir('genModal');
  }
  function val(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }

  function aviso(novos) { if (novos.length && typeof toast === 'function') toast(novos.map(fraseCaiu).join(' · ')); }

  MoneyModulos.registrar({
    id: 'a-receber', versao: '1.0.0', colecoes: [COL],
    pontos: {
      'lancamento.form': function (ctx) {
        var g = ctx.g; if (!g || !g.id || credito(g)) return '';
        var ja = lista().find(function (x) { return x.gastoId === g.id; });
        return '<div class="row" style="margin:4px 0 10px"><button type="button" class="btn sm" data-acao="ar-pedir" data-id="' + esc(g.id) + '">↩ ' +
          esc(ja ? tr('Estorno pedido: ', 'Refund asked: ') + situacao(ja) : tr('Pedi estorno disto', 'I asked for a refund of this')) + '</button></div>';
      },
      'custos.topo': function () {
        var ab = API.abertos(); if (!ab.length) return '';
        var tot = n2(ab.reduce(function (s, x) { return s + API.restante(x); }, 0)), at = API.atrasados().length;
        return '<button class="card card-link ar-topo" data-irpara="b-receber"><span>💸 ' + esc(tr('A receber: ', 'To receive: ') + fmt(tot) + ' · ' + ab.length + tr(' pedido(s)', ' request(s)') + (at ? tr(' · ' + at + ' passou do prazo', ' · ' + at + ' overdue') : '')) + '</span><span class="small muted">›</span></button>';
      },
      'custos.adicionar': function () {
        return [{ ico: '💸', pt: 'Valor a receber (estorno, reembolso)', en: 'Amount to receive (refund, reimbursement)', dpt: 'Estorno, reembolso do plano, contestação, restituição: o app vigia e avisa quando cai.', den: 'Refund, plan reimbursement, dispute, tax refund: the app watches and tells you when it lands.', acao: 'ar-novo' }];
      },
      'budget.atencao': function () {
        var l = API.atrasados(); if (!l.length) return '';
        return '<div class="card ar-atencao"><div class="card-head"><h3>' + esc(tr('Precisa da sua atenção', 'Needs your attention')) + '</h3></div>' +
          l.map(function (x) { return '<div class="ar-cobrar"><p class="small" style="margin:0 0 4px">💸 ' + esc(fraseCobrar(x)) + '</p><div class="inb-acoes">' + botoesCobrar(x) + '</div></div>'; }).join('') + '</div>';
      },
      'inbox.grupos': function () {
        aviso(API.vigiar());
        var html = '', n = 0;
        API.atrasados().forEach(function (x) { n++; html += '<li class="inb-item"><div><b>💸 ' + esc(fraseCobrar(x)) + '</b></div><span class="inb-acoes">' + botoesCobrar(x) + '</span></li>'; });
        caidos().forEach(function (c) { n++; html += '<li class="inb-item"><div><b>✓ ' + esc(fraseCaiu(c)) + '</b><span class="t-sub">' + esc(situacao(c.x)) + '</span></div><span class="inb-acoes"><button class="btn sm" data-acao="inb-visto" data-k="' + esc(c.k) + '">' + esc(tr('ok, entendi', 'ok, got it')) + '</button></span></li>'; });
        API.sugestoes().forEach(function (s) { n++; html += itemSugestao(s); });
        return n ? [{ id: 'receber', n: n, html: html }] : [];
      }
    },
    telas: {
      'b-receber': { app: 'budget', render: tela,
        ajuda: { pt: { t: 'A receber', o: 'Estornos, reembolsos e contestações que você pediu: o app vigia e avisa quando cai ou quando atrasa.', f: ['"↩ Pedi estorno disto" no lançamento já preenche.', 'Atrasou: "Cobrei de novo" dá mais 30 dias.'] },
                 en: { t: 'To receive', o: 'Refunds, reimbursements and disputes you asked for: the app watches and tells you when it lands or is late.', f: ['"↩ I asked for a refund" on the entry fills it in.', 'Late: "Chased again" gives 30 more days.'] } } }
    },
    ouvir: { 'gasto.novo': function (g) { if (credito(g)) setTimeout(function () { aviso(API.vigiar()); }, 0); } },
    acoes: {
      'ar-novo': function () { abrirForm(null); },
      'ar-editar': function (el) { abrirForm(API.achar(el.dataset.id)); },
      'ar-pedir': function (el) {
        var g = Gasto.todos().find(function (x) { return x.id === el.dataset.id; }); if (!g) return;
        var ja = lista().find(function (x) { return x.gastoId === g.id; });
        if (typeof fechar === 'function') fechar('assetModal');
        abrirForm(ja || API.deGasto(g));
      },
      'ar-salvar': function (el) {
        var quem = val('arQuem'), total = Number(val('arTotal')) || 0, n = Math.max(1, Math.round(Number(val('arParc')) || 1)), on = val('arOnde');
        if (!quem || !(total > 0)) return toast(tr('Diga de quem e o valor.', 'Enter from whom and the amount.'), 'warn');
        var d = { quem: quem, cnpj: dig(val('arCnpj')), tipo: val('arTipo') || 'estorno', total: n2(total), parcelas: n, valorParcela: n2(total / n),
          ondeCartaoId: on.indexOf('c:') === 0 ? on.slice(2) : '', ondeBancoId: on.indexOf('b:') === 0 ? on.slice(2) : '',
          pedidoEm: /^\d{4}-\d{2}-\d{2}$/.test(val('arPedido')) ? val('arPedido') : hoje(), prometido: /^\d{4}-\d{2}-\d{2}$/.test(val('arProm')) ? val('arProm') : '', protocolo: val('arProt') };
        if (el.dataset.gasto) { d.gastoId = el.dataset.gasto; d.origem = el.dataset.origem || ''; }
        API.salvar(d, el.dataset.id || null);
        var novos = API.vigiar(); Store.salvar(); fechar('genModal'); render();
        toast(novos.length ? fraseCaiu(novos[0]) : tr('Guardado. O app avisa quando cair.', 'Saved. The app tells you when it lands.'));
      },
      'ar-apagar': function (el) { if (!confirm(tr('Apagar este pedido?', 'Delete this request?'))) return; ST[COL] = lista().filter(function (x) { return x.id !== el.dataset.id; }); Store.salvar(); fechar('genModal'); render(); },
      'ar-recebi': function (el) {
        var x = API.achar(el.dataset.id); if (!x) return;
        x.recebidos = x.recebidos || []; x.recebidos.push({ gid: '', valor: API.restante(x), data: hoje(), manual: true }); x.estado = 'recebido';
        Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN();
      },
      'ar-cobrei': function (el) { var x = API.achar(el.dataset.id); if (!x) return; x.adiadoAte = mais(hoje(), DIAS); Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN(); toast(tr('Ok: o app pergunta de novo em 30 dias.', 'Ok: the app asks again in 30 days.')); },
      'ar-desisti': function (el) { var x = API.achar(el.dataset.id); if (!x) return; x.estado = 'desistiu'; Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN(); },
      'ar-marcar': function (el) {
        var g = Gasto.todos().find(function (x) { return x.id === el.dataset.gid; }), o = Gasto.todos().find(function (x) { return x.id === el.dataset.oid; }); if (!g || !o) return;
        var d = API.deGasto(o), v = n2(Math.abs(g.valor)); d.total = v; d.parcelas = 1; d.valorParcela = v; d.pedidoEm = g.data;
        var x = API.salvar(d); x.recebidos = [{ gid: g.id, valor: v, data: g.data }]; x.estado = 'recebido';
        (cfg().inboxVistos = cfg().inboxVistos || {})['ar|' + x.id + '|' + g.id] = 1;
        Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN();
      },
      'ar-nao': function (el) { (cfg().arRecusados = cfg().arRecusados || {})[el.dataset.gid] = 1; Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN(); }
    }
  });
  window.AReceber = API;
})();
