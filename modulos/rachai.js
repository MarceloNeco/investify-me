/* =====================================================================
   modulos/rachai.js — RachAI (nome provisório): RACHAR A CONTA da mesa, dentro do BudgetONE (3.93)        1.0.0 · 20/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 18–20/Nov/2026; protótipo SEM INTERNET e SEM IA; nada de convite nem servidor)
     · Tela "RachAI" (b-rachai), com cartão de destaque no Painel e item no menu do BudgetONE.
     · A mesa: nome, local, data e as pessoas (quem é da família vem das Pessoas do app).
     · Cardápio: por foto (o leitor de texto que já está no app, Ocr; cada linha "nome ... preço" vira item editável), por
       link (só guarda o link) ou à mão. Item de bebida marcado (🍺) para quem não bebe ficar fora.
     · Consumo com toques: + / − por pessoa em cada item, ou "dividir entre…" (escolher as pessoas, ou todos).
     · Taxa de serviço (10%, editável) proporcional ao consumo de cada um; couvert por pessoa presente; gorjeta opcional
       (proporcional ao consumo).
     · Conferir a conta do bar: foto da conta → o app lê as linhas e o total e mostra o que veio a mais ou a menos.
     · Fechamento: quanto cada um deve, quem pagou, e "quem paga para quem" com o menor número de Pix; a mensagem pronta para
       compartilhar (texto e imagem); a parte da família vira um lançamento no BudgetONE (Lazer › Restaurantes, com a divisão
       por pessoa, modulos/dividir.js).
     · Visão da casa: a mesa é de quem criou (reservada), a não ser que marque "da casa".
   API (window.RachAI)
     calcMesa(mesa) → {pessoas: {pid: {consumo, servico, couvert, gorjeta, total, pago, saldo}}, subtotal, total}
     pix(saldos {pid: valor}) → [{de, para, valor}] · lerCardapio(texto) · lerConta(texto) · conferir(mesa, conta)
     mensagem(mesa) · lancarFamilia(mesa) · mesas()
   DADOS
     ST.rachai_mesas = [{id, nome, local, data, link, escopo?, servicoPct, couvert, gorjeta, pessoas: [{id, nome, pessoaId?,
       semBebida?, presente}], itens: [{id, nome, preco, bebida, por: {pid: qtd}, divide: [pid] | null, qtd}],
       pagamentos: {pid: valor}, conta?: {total, linhas}, lancadoId?}]
   PONTOS QUE USA
     budget.painel · tela b-rachai · ações ra-*
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'rachai_mesas';
  var BEBIDA = /cerveja|chop+e?|refri|refrigerante|suco|[aá]gua|vinho|drink|caipi|coca|guaran|dose|whisk|gin\b|vodka|caf[eé]|ch[aá]\b|long ?neck|soda|t[oô]nica|beer|wine|juice|water|cerveza|vino|zumo|refresco/i;
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function cent(v) { return Math.round((Number(v) || 0) * 100); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function num(t) { var s = String(t == null ? '' : t).trim(); if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); return Number(s) || 0; }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function novoId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }

  /* reparte um valor em centavos por pesos, sem perder centavo (o resto vai aos primeiros) */
  function repartir(totalC, pesos) {
    var ks = Object.keys(pesos).filter(function (k) { return pesos[k] > 0; }), soma = ks.reduce(function (s, k) { return s + pesos[k]; }, 0), out = {}, usado = 0;
    if (!ks.length || !(soma > 0)) return out;
    ks.forEach(function (k) { out[k] = Math.floor(totalC * pesos[k] / soma); usado += out[k]; });
    for (var i = 0; usado < totalC; i = (i + 1) % ks.length) { out[ks[i]]++; usado++; }
    return out;
  }
  function presentes(m) { return m.pessoas.filter(function (p) { return p.presente !== false; }); }

  var API = {
    mesas: lista,
    /* a conta de cada um */
    calcMesa: function (m) {
      var por = {}; m.pessoas.forEach(function (p) { por[p.id] = { consumo: 0, servico: 0, couvert: 0, gorjeta: 0, total: 0, pago: 0, saldo: 0 }; });
      var cons = {}; m.pessoas.forEach(function (p) { cons[p.id] = 0; });
      (m.itens || []).forEach(function (it) {
        var preco = cent(it.preco);
        if (it.divide && it.divide.length) {
          var grupo = it.divide.filter(function (pid) { var p = m.pessoas.find(function (x) { return x.id === pid; }); return p && !(it.bebida && p.semBebida); });
          var pesos = {}; grupo.forEach(function (pid) { pesos[pid] = 1; });
          var r = repartir(preco * (Number(it.qtd) || 1), pesos); Object.keys(r).forEach(function (pid) { cons[pid] += r[pid]; });
        } else Object.keys(it.por || {}).forEach(function (pid) { if (cons[pid] != null) cons[pid] += preco * (Number(it.por[pid]) || 0); });
      });
      var sub = 0; Object.keys(cons).forEach(function (pid) { sub += cons[pid]; });
      var serv = {}; Object.keys(cons).forEach(function (pid) { serv[pid] = Math.round(cons[pid] * (Number(m.servicoPct) || 0) / 100); });
      var gorj = repartir(cent(m.gorjeta), cons), couv = cent(m.couvert);
      var pag = m.pagamentos || {}, total = 0;
      m.pessoas.forEach(function (p) {
        var x = por[p.id];
        x.consumo = cons[p.id]; x.servico = serv[p.id]; x.couvert = p.presente === false ? 0 : couv; x.gorjeta = gorj[p.id] || 0;
        x.total = x.consumo + x.servico + x.couvert + x.gorjeta; total += x.total;
        x.pago = cent(pag[p.id]); x.saldo = x.pago - x.total;
      });
      Object.keys(por).forEach(function (k) { ['consumo', 'servico', 'couvert', 'gorjeta', 'total', 'pago', 'saldo'].forEach(function (c) { por[k][c] = por[k][c] / 100; }); });
      return { pessoas: por, subtotal: sub / 100, total: total / 100 };
    },
    /* quem paga para quem, com o menor número de Pix (o maior que deve paga ao maior que tem a receber) */
    pix: function (saldos) {
      var dev = [], cre = [];
      Object.keys(saldos).forEach(function (k) { var c = cent(saldos[k]); if (c < 0) dev.push({ k: k, v: -c }); else if (c > 0) cre.push({ k: k, v: c }); });
      var out = [];
      while (dev.length && cre.length) {
        dev.sort(function (a, b) { return b.v - a.v; }); cre.sort(function (a, b) { return b.v - a.v; });
        var d = dev[0], c = cre[0], v = Math.min(d.v, c.v);
        out.push({ de: d.k, para: c.k, valor: v / 100 });
        d.v -= v; c.v -= v; if (!d.v) dev.shift(); if (!c.v) cre.shift();
      }
      return out;
    },
    /* o cardápio por foto: cada linha "nome ... preço" vira item */
    lerCardapio: function (texto) {
      return String(texto || '').split(/\r?\n/).map(function (l) { return l.trim(); }).map(function (l) {
        var m = l.match(/^(.*?[A-Za-zÀ-ÿ].*?)[\s.:·…_-]+(?:R\$\s*)?(\d{1,4}(?:[.,]\d{3})*[.,]\d{2})\s*$/);
        if (!m) return null;
        var nome = m[1].replace(/[.·…_-]+$/, '').trim(); if (nome.length < 2) return null;
        return { nome: nome, preco: n2(num(m[2].replace(/\.(\d{2})$/, ',$1'))), bebida: BEBIDA.test(nome) };
      }).filter(Boolean);
    },
    /* a conta do bar: as linhas (quantidade, nome, valor) e o total */
    lerConta: function (texto) {
      var linhas = [], total = null;
      String(texto || '').split(/\r?\n/).forEach(function (l) {
        l = l.trim(); var m = l.match(/^(?:(\d{1,2})\s*[xX]?\s+)?(.*?[A-Za-zÀ-ÿ].*?)[\s.:·…_-]+(?:R\$\s*)?(\d{1,5}(?:\.\d{3})*,\d{2})\s*$/); if (!m) return;
        var v = n2(num(m[3]));
        if (/total|a pagar|valor da conta/i.test(m[2]) && !/sub ?total/i.test(m[2])) { total = v; return; }
        if (/servi[cç]o|taxa|couvert|gorjeta|sub ?total|10\s*%/i.test(m[2])) return;
        linhas.push({ qtd: Number(m[1]) || 1, nome: m[2].trim(), valor: v });
      });
      return { linhas: linhas, total: total };
    },
    /* o que veio a mais ou a menos na conta do bar */
    conferir: function (m, conta) {
      var marcado = function (it) { if (it.divide && it.divide.length) return n2(it.preco * (Number(it.qtd) || 1)); return n2(it.preco * Object.keys(it.por || {}).reduce(function (s, k) { return s + (Number(it.por[k]) || 0); }, 0)); };
      var usadas = {}, difs = [];
      (m.itens || []).forEach(function (it) {
        var ws = N(it.nome).split(' ').filter(function (w) { return w.length >= 3; });
        var i = conta.linhas.findIndex(function (l, k) { return !usadas[k] && ws.some(function (w) { return N(l.nome).indexOf(w) >= 0; }); });
        var mv = marcado(it);
        if (i < 0) { if (mv > 0) difs.push({ nome: it.nome, marcado: mv, conta: 0, dif: -mv }); return; }
        usadas[i] = 1; var cv = conta.linhas[i].valor;
        if (Math.abs(cv - mv) > 0.005) difs.push({ nome: it.nome, marcado: mv, conta: cv, dif: n2(cv - mv) });
      });
      conta.linhas.forEach(function (l, k) { if (!usadas[k]) difs.push({ nome: l.nome, marcado: 0, conta: l.valor, dif: l.valor }); });
      var c = API.calcMesa(m), esperado = n2(c.total - (Number(m.gorjeta) || 0));
      return { difs: difs, totalConta: conta.total, esperado: esperado, difTotal: conta.total != null ? n2(conta.total - esperado) : null };
    },
    mensagem: function (m) {
      var c = API.calcMesa(m), nome = function (pid) { var p = m.pessoas.find(function (x) { return x.id === pid; }); return p ? p.nome : '?'; };
      var s = '🍽️ ' + m.nome + (m.local ? ' · ' + m.local : '') + ' · ' + I18n.data(m.data) + '\n' + tr('Total: ', 'Total: ', 'Total: ') + fmt(c.total) + '\n\n';
      m.pessoas.forEach(function (p) { s += p.nome + ': ' + fmt(c.pessoas[p.id].total) + '\n'; });
      var px = API.pix(Object.keys(c.pessoas).reduce(function (o, k) { o[k] = c.pessoas[k].saldo; return o; }, {}));
      if (px.length) s += '\n' + tr('Pix:', 'Pix:', 'Pix:') + '\n' + px.map(function (x) { return nome(x.de) + ' → ' + nome(x.para) + ': ' + fmt(x.valor); }).join('\n') + '\n';
      return s + '\n' + tr('Feito no RachAI (MoneyTRIO)', 'Made with RachAI (MoneyTRIO)', 'Hecho con RachAI (MoneyTRIO)');
    },
    /* a parte da família vira um lançamento (Lazer › Restaurantes), com a divisão por pessoa */
    lancarFamilia: function (m) {
      if (m.lancadoId && Gasto.todos().some(function (g) { return g.id === m.lancadoId || (g.divisao && g.divisao.id === m.lancadoId); })) return null;
      var c = API.calcMesa(m), fam = m.pessoas.filter(function (p) { return p.pessoaId; });
      var tot = n2(fam.reduce(function (s, p) { return s + c.pessoas[p.id].total; }, 0)); if (!(tot > 0)) return null;
      var g = Gasto.add({ data: m.data, valor: tot, desc: 'RachAI: ' + m.nome + (m.local ? ' (' + m.local + ')' : ''), grupo: 'LAZER', sub: tr('Restaurantes', 'Restaurants', 'Restaurantes'), fluxo: 'saida',
        paraQuem: fam.length === 1 ? fam[0].nome : '', origem: 'rachai', forma: 'RachAI', editadoPessoa: true });
      var partes = fam.filter(function (p) { return c.pessoas[p.id].total > 0; }).map(function (p) { return { valor: c.pessoas[p.id].total, paraQuem: p.nome, grupo: 'LAZER', sub: g.sub, nota: m.nome }; });
      if (partes.length >= 2 && window.Divisao) Divisao.aplicar(g.id, partes);
      m.lancadoId = g.id;
      return g;
    }
  };

  /* ---------- a tela ---------- */
  var aberta = null;   /* id da mesa aberta */
  function mesa() { return lista().find(function (m) { return m.id === aberta; }) || null; }
  function pessoasDaCasa() { return window.Pessoas ? Pessoas.ativas().filter(function (p) { return p.tipo === 'casa'; }) : []; }
  function bt(acao, txt, extra, cls) { return '<button type="button" class="btn ' + (cls || 'sm') + '" data-acao="' + acao + '"' + (extra || '') + '>' + txt + '</button>'; }
  function telaLista() {
    var l = lista().slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; });
    return '<div class="card-head"><h1>🍽️ RachAI</h1></div><p class="small muted aba-explica">' + esc(tr('Rachar a conta da mesa, sem internet: marque o que cada um consumiu com toques e o app diz quanto cada um paga e quem faz Pix para quem.', 'Split the table bill, offline: tap what each person had and the app tells how much each pays and who sends Pix to whom.', 'Dividir la cuenta de la mesa, sin internet: marca con toques lo que tomó cada uno y la app dice cuánto paga cada uno y quién hace Pix a quién.')) + '</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin:0 0 12px">' + bt('ra-nova', '➕ ' + esc(tr('Nova mesa', 'New table', 'Nueva mesa')), '', 'primary') + '</div>' +
      (l.length ? l.map(function (m) { var c = API.calcMesa(m); return '<button class="card card-link" data-acao="ra-abrir" data-id="' + esc(m.id) + '" style="width:100%;text-align:left"><span><b>' + esc(m.nome) + '</b><span class="t-sub">' + esc([m.local, I18n.data(m.data), m.pessoas.length + tr(' pessoas', ' people', ' personas')].filter(Boolean).join(' · ')) + '</span></span><span>' + fmt(c.total) + '</span></button>'; }).join('')
        : '<div class="card"><p class="small muted" style="margin:0">' + esc(tr('Nenhuma mesa ainda.', 'No tables yet.', 'Todavía no hay mesas.')) + '</p></div>');
  }
  function telaMesa(m) {
    var c = API.calcMesa(m), nomeP = function (pid) { var p = m.pessoas.find(function (x) { return x.id === pid; }); return p ? p.nome : '?'; };
    var px = API.pix(Object.keys(c.pessoas).reduce(function (o, k) { o[k] = c.pessoas[k].saldo; return o; }, {}));
    var h = '<div class="ra-mesa" style="font-size:1.05em"><div class="card-head"><h1>🍽️ ' + esc(m.nome) + '</h1>' + bt('ra-voltar', '← ' + esc(tr('Mesas', 'Tables', 'Mesas'))) + '</div>';
    /* a mesa */
    h += '<div class="card"><div class="grid g2"><label class="field"><span>' + esc(tr('Nome', 'Name', 'Nombre')) + '</span><input data-ra="nome" value="' + esc(m.nome) + '"></label>' +
      '<label class="field"><span>' + esc(tr('Local', 'Place', 'Lugar')) + '</span><input data-ra="local" value="' + esc(m.local || '') + '"></label>' +
      '<label class="field"><span>' + esc(tr('Data', 'Date', 'Fecha')) + '</span><input data-ra="data" type="date" value="' + esc(m.data) + '"></label>' +
      '<label class="field"><span>' + esc(tr('Link do cardápio', 'Menu link', 'Enlace de la carta')) + '</span><input data-ra="link" value="' + esc(m.link || '') + '" placeholder="https://"></label></div>' +
      '<label class="linha-check"><input type="checkbox" data-ra="casa"' + (m.escopo === 'casa' ? ' checked' : '') + '> ' + esc(tr('Da casa (a família vê)', 'Household (the family sees it)', 'De casa (la familia la ve)')) + '</label></div>';
    /* as pessoas */
    h += '<div class="card"><h3>👥 ' + esc(tr('Pessoas', 'People', 'Personas')) + '</h3><div class="row" style="gap:6px;flex-wrap:wrap">' +
      m.pessoas.map(function (p) {
        return '<span class="chip" style="padding:6px 10px">' + esc(p.nome) + (p.pessoaId ? ' 🏠' : '') + ' ' +
          '<button type="button" class="linkinho" data-acao="ra-sembebida" data-p="' + esc(p.id) + '" title="' + esc(tr('não bebe', 'does not drink', 'no bebe')) + '">' + (p.semBebida ? '🚫🍺' : '🍺') + '</button> ' +
          '<button type="button" class="linkinho" data-acao="ra-tirap" data-p="' + esc(p.id) + '" aria-label="' + esc(tr('Tirar', 'Remove', 'Quitar')) + '">✕</button></span>';
      }).join('') + '</div><div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px"><input id="raNovaP" placeholder="' + esc(tr('nome', 'name', 'nombre')) + '" style="max-width:12em">' + bt('ra-addp', '+ ' + esc(tr('Pessoa', 'Person', 'Persona'))) +
      pessoasDaCasa().filter(function (p) { return !m.pessoas.some(function (x) { return x.pessoaId === p.id; }); }).map(function (p) { return bt('ra-addcasa', '🏠 ' + esc(Pessoas.rotulo(p)), ' data-id="' + esc(p.id) + '"'); }).join('') + '</div></div>';
    /* o cardápio e o consumo */
    h += '<div class="card"><h3>🧾 ' + esc(tr('O que foi pedido', 'What was ordered', 'Lo que se pidió')) + '</h3><div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px">' +
      bt('ra-foto', '📷 ' + esc(tr('Cardápio por foto', 'Menu by photo', 'Carta por foto'))) + '</div>' +
      (m.itens || []).map(function (it) {
        var dividido = it.divide && it.divide.length;
        return '<div class="ra-item" style="border-top:1px solid var(--line);padding:8px 0"><div class="row" style="justify-content:space-between;gap:6px"><span><b>' + esc(it.nome) + '</b> ' + (it.bebida ? '🍺' : '') + ' · ' + fmt(it.preco) +
          (dividido ? ' · ' + esc(tr('dividido entre ', 'split among ', 'dividido entre ') + it.divide.length) : '') + '</span><span>' +
          bt('ra-bebida', it.bebida ? '🍺✓' : '🍺?', ' data-i="' + esc(it.id) + '"') + bt('ra-tirai', '✕', ' data-i="' + esc(it.id) + '"') + '</span></div>' +
          '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">' + (dividido ? '' : m.pessoas.map(function (p) {
            var q = (it.por || {})[p.id] || 0;
            return '<span class="chip" style="padding:4px 6px">' + esc(p.nome.split(' ')[0]) + ' ' + bt('ra-menos', '−', ' data-i="' + esc(it.id) + '" data-p="' + esc(p.id) + '"') + ' <b>' + q + '</b> ' + bt('ra-mais', '+', ' data-i="' + esc(it.id) + '" data-p="' + esc(p.id) + '"') + '</span>';
          }).join('')) +
          bt('ra-dividir', '÷ ' + esc(dividido ? tr('mudar a divisão', 'change the split', 'cambiar el reparto') : tr('dividir entre…', 'split among…', 'dividir entre…')), ' data-i="' + esc(it.id) + '"') + '</div>' +
          (dividido || it._escolher ? '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">' + bt('ra-todos', esc(tr('Todos', 'Everyone', 'Todos')), ' data-i="' + esc(it.id) + '"') +
            m.pessoas.map(function (p) { var on = (it.divide || []).indexOf(p.id) >= 0; return bt('ra-entre', (on ? '✓ ' : '') + esc(p.nome.split(' ')[0]), ' data-i="' + esc(it.id) + '" data-p="' + esc(p.id) + '"', on ? 'sm primary' : 'sm'); }).join('') +
            '<label class="field" style="max-width:6em;margin:0"><span>' + esc(tr('Qtd.', 'Qty', 'Cant.')) + '</span><input data-ra-qtd="' + esc(it.id) + '" type="number" min="1" value="' + (it.qtd || 1) + '"></label></div>' : '') + '</div>';
      }).join('') +
      '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px"><input id="raItemNome" placeholder="' + esc(tr('item', 'item', 'artículo')) + '" style="max-width:12em"><input id="raItemPreco" inputmode="decimal" placeholder="R$" style="max-width:6em">' + bt('ra-additem', '+ ' + esc(tr('Item', 'Item', 'Artículo'))) + '</div></div>';
    /* taxas e quem pagou */
    h += '<div class="card"><div class="grid g2"><label class="field"><span>' + esc(tr('Serviço (%)', 'Service (%)', 'Servicio (%)')) + '</span><input data-ra="servicoPct" type="number" min="0" max="30" value="' + m.servicoPct + '"></label>' +
      '<label class="field"><span>' + esc(tr('Couvert por pessoa (R$)', 'Cover per person (R$)', 'Cubierto por persona (R$)')) + '</span><input data-ra="couvert" inputmode="decimal" value="' + (m.couvert || '') + '"></label>' +
      '<label class="field"><span>' + esc(tr('Gorjeta (R$, opcional)', 'Tip (R$, optional)', 'Propina (R$, opcional)')) + '</span><input data-ra="gorjeta" inputmode="decimal" value="' + (m.gorjeta || '') + '"></label></div>' +
      '<h3 style="margin-top:8px">💳 ' + esc(tr('Quem pagou', 'Who paid', 'Quién pagó')) + '</h3><div class="grid g2">' + m.pessoas.map(function (p) {
        return '<label class="field"><span>' + esc(p.nome) + '</span><input data-ra-pago="' + esc(p.id) + '" inputmode="decimal" value="' + ((m.pagamentos || {})[p.id] || '') + '"></label>';
      }).join('') + '</div>' + bt('ra-pagoutudo', esc(tr('Um pagou tudo…', 'One person paid it all…', 'Una persona pagó todo…'))) + '</div>';
    /* o fechamento */
    h += '<div class="card ra-fecha"><h3>✅ ' + esc(tr('Fechamento', 'Settle up', 'Cierre')) + ' · ' + fmt(c.total) + '</h3><table class="tbl"><tbody>' + m.pessoas.map(function (p) {
      var x = c.pessoas[p.id];
      return '<tr><td>' + esc(p.nome) + '</td><td class="num">' + fmt(x.total) + '<div class="t-sub">' + esc(fmt(x.consumo) + ' + ' + tr('serviço ', 'service ', 'servicio ') + fmt(x.servico) + (x.couvert ? ' + couvert ' + fmt(x.couvert) : '') + (x.gorjeta ? ' + ' + tr('gorjeta ', 'tip ', 'propina ') + fmt(x.gorjeta) : '')) + '</div></td></tr>';
    }).join('') + '</tbody></table>' +
      (px.length ? '<h4>💸 ' + esc(tr('Quem paga para quem', 'Who pays whom', 'Quién paga a quién')) + ' (' + px.length + ' Pix)</h4><ul class="ra-pix">' + px.map(function (x) { return '<li>' + esc(nomeP(x.de) + ' → ' + nomeP(x.para) + ': ') + '<b>' + fmt(x.valor) + '</b></li>'; }).join('') + '</ul>' : '') +
      '<div class="row" style="gap:8px;flex-wrap:wrap">' + bt('ra-conferir', '📷 ' + esc(tr('Conferir a conta do bar', 'Check the bar bill', 'Revisar la cuenta del bar'))) + bt('ra-compartilhar', '📤 ' + esc(tr('Compartilhar', 'Share', 'Compartir'))) +
      bt('ra-lancar', '🏠 ' + esc(m.lancadoId ? tr('Parte da família já lançada', 'Family share already added', 'Parte de la familia ya registrada') : tr('Lançar a parte da família', 'Add the family share', 'Registrar la parte de la familia')), m.lancadoId ? ' disabled' : '', 'sm primary') + '</div>' +
      (m.conferido ? conferidoHtml(m) : '') + '</div></div>';
    return h;
  }
  function conferidoHtml(m) {
    var r = API.conferir(m, m.conferido);
    return '<div class="aviso-box ra-conf" style="margin-top:8px"><b>' + esc(r.difTotal == null ? tr('Não achei o total na foto da conta.', 'Could not find the total on the bill photo.', 'No encontré el total en la foto de la cuenta.')
      : Math.abs(r.difTotal) < 0.005 ? tr('A conta do bar bate com o marcado: ', 'The bar bill matches what was marked: ', 'La cuenta del bar coincide con lo marcado: ') + fmt(r.totalConta)
      : (r.difTotal > 0 ? tr('A conta veio ', 'The bill came ', 'La cuenta vino ') + fmt(r.difTotal) + tr(' a mais', ' higher', ' de más') : tr('A conta veio ', 'The bill came ', 'La cuenta vino ') + fmt(-r.difTotal) + tr(' a menos', ' lower', ' de menos')) + ' (' + fmt(r.totalConta) + tr(' × marcado ', ' × marked ', ' × marcado ') + fmt(r.esperado) + ')') + '</b>' +
      (r.difs.length ? '<ul style="margin:6px 0 0">' + r.difs.map(function (d) { return '<li>' + esc(d.nome + ': ' + tr('na conta ', 'on the bill ', 'en la cuenta ') + fmt(d.conta) + tr(' · marcado ', ' · marked ', ' · marcado ') + fmt(d.marcado) + ' (' + (d.dif > 0 ? '+' : '') + fmt(d.dif) + ')') + '</li>'; }).join('') + '</ul>' : '') + '</div>';
  }
  function tela() { var m = mesa(); return m ? telaMesa(m) : telaLista(); }
  function salvar() { Store.salvar(); render(); }
  function item(m, id) { return (m.itens || []).find(function (x) { return x.id === id; }); }

  /* fotos: o mesmo leitor de texto do app (Ocr), no Fundo */
  function foto(depois) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.hidden = true; document.body.appendChild(inp);
    inp.addEventListener('change', async function () {
      var f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
      var id = 'rachai-ler', temFundo = typeof Fundo !== 'undefined';
      if (temFundo) Fundo.comecar({ id: id, titulo: tr('Lendo a foto…', 'Reading the photo…', 'Leyendo la foto…') });
      try { var t = await (API._ocr || Ocr.texto.bind(Ocr))(f, function (msg) { if (temFundo) Fundo.passo(id, msg); }); if (temFundo) { Fundo.terminar(id, tr('Foto lida', 'Photo read', 'Foto leída')); Fundo.limpar(id); } depois(t); }
      catch (e) { if (temFundo) Fundo.limpar(id); toast(tr('Não deu para ler a foto.', 'Could not read the photo.', 'No se pudo leer la foto.'), 'warn'); }
    });
    inp.click();
  }
  API.fotoCardapio = function (texto) { var m = mesa(); if (!m) return 0; var l = API.lerCardapio(texto); l.forEach(function (x) { m.itens.push({ id: novoId('i'), nome: x.nome, preco: x.preco, bebida: x.bebida, por: {}, divide: null }); }); salvar(); return l.length; };
  API.fotoConta = function (texto) { var m = mesa(); if (!m) return null; m.conferido = API.lerConta(texto); salvar(); return API.conferir(m, m.conferido); };
  API.abrir = function (id) { aberta = id; render(); };

  /* os campos da mesa gravam ao mudar */
  document.addEventListener('change', function (ev) {
    var el = ev.target, m = mesa(); if (!m || !el || !el.closest || !el.closest('.ra-mesa')) return;
    if (el.dataset.ra) {
      var k = el.dataset.ra;
      if (k === 'casa') { if (el.checked) m.escopo = 'casa'; else delete m.escopo; }
      else if (k === 'servicoPct') m.servicoPct = Number(el.value) || 0;
      else if (k === 'couvert' || k === 'gorjeta') m[k] = n2(num(el.value));
      else m[k] = String(el.value || '').trim();
    } else if (el.dataset.raPago) { (m.pagamentos = m.pagamentos || {})[el.dataset.raPago] = n2(num(el.value)); }
    else if (el.dataset.raQtd) { var it = item(m, el.dataset.raQtd); if (it) it.qtd = Math.max(1, Number(el.value) || 1); }
    else return;
    salvar();
  });

  MoneyModulos.registrar({
    id: 'rachai', versao: '1.0.0', colecoes: [COL],
    pontos: {
      'budget.painel': function () {
        return '<button class="card card-link ra-destaque" data-irpara="b-rachai" style="width:100%;text-align:left;font-size:1.05em"><span>🍽️ <b>RachAI</b> · ' + esc(tr('rachar a conta da mesa, sem internet', 'split the table bill, offline', 'dividir la cuenta de la mesa, sin internet')) + '</span><span class="small muted">›</span></button>';
      }
    },
    telas: { 'b-rachai': { app: 'budget', render: tela,
      ajuda: { pt: { t: 'RachAI', o: 'Rachar a conta da mesa, sem internet.', f: ['Crie a mesa e as pessoas.', 'Marque o que cada um consumiu com + e −, ou divida um item entre algumas pessoas.', 'O fechamento mostra quanto cada um paga e quem faz Pix para quem.'] },
               en: { t: 'RachAI', o: 'Split the table bill, offline.', f: ['Create the table and the people.', 'Tap + and − for what each person had, or split an item among some people.', 'The settle-up shows how much each pays and who sends Pix to whom.'] } } } },
    acoes: {
      'ra-nova': function () {
        var m = { id: novoId('m'), nome: tr('Mesa ', 'Table ', 'Mesa ') + I18n.data(hojeISO(), { semAno: true }), local: '', data: hojeISO(), servicoPct: 10, couvert: 0, gorjeta: 0, pessoas: [], itens: [], pagamentos: {} };
        var eu = pessoasDaCasa()[0]; if (eu) m.pessoas.push({ id: novoId('p'), nome: Pessoas.rotulo(eu), pessoaId: eu.id });
        lista().push(m); aberta = m.id; salvar();
      },
      'ra-abrir': function (el) { aberta = el.dataset.id; render(); },
      'ra-voltar': function () { aberta = null; render(); },
      'ra-addp': function () { var m = mesa(), i = document.getElementById('raNovaP'), n = i && i.value.trim(); if (!m || !n) return; m.pessoas.push({ id: novoId('p'), nome: n }); salvar(); },
      'ra-addcasa': function (el) { var m = mesa(), p = window.Pessoas && Pessoas.porId(el.dataset.id); if (!m || !p) return; m.pessoas.push({ id: novoId('p'), nome: Pessoas.rotulo(p), pessoaId: p.id }); salvar(); },
      'ra-tirap': function (el) { var m = mesa(); if (!m) return; m.pessoas = m.pessoas.filter(function (p) { return p.id !== el.dataset.p; }); m.itens.forEach(function (it) { if (it.por) delete it.por[el.dataset.p]; if (it.divide) it.divide = it.divide.filter(function (x) { return x !== el.dataset.p; }); }); salvar(); },
      'ra-sembebida': function (el) { var m = mesa(), p = m && m.pessoas.find(function (x) { return x.id === el.dataset.p; }); if (p) { p.semBebida = !p.semBebida; salvar(); } },
      'ra-additem': function () {
        var m = mesa(), n = (document.getElementById('raItemNome') || {}).value, v = n2(num((document.getElementById('raItemPreco') || {}).value));
        if (!m || !n || !(v > 0)) return toast(tr('Diga o item e o preço.', 'Enter the item and the price.', 'Indica el artículo y el precio.'), 'warn');
        m.itens.push({ id: novoId('i'), nome: n.trim(), preco: v, bebida: BEBIDA.test(n), por: {}, divide: null }); salvar();
      },
      'ra-tirai': function (el) { var m = mesa(); if (!m) return; m.itens = m.itens.filter(function (x) { return x.id !== el.dataset.i; }); salvar(); },
      'ra-bebida': function (el) { var it = item(mesa(), el.dataset.i); if (it) { it.bebida = !it.bebida; salvar(); } },
      'ra-mais': function (el) { var it = item(mesa(), el.dataset.i); if (!it) return; it.por = it.por || {}; it.por[el.dataset.p] = (it.por[el.dataset.p] || 0) + 1; salvar(); },
      'ra-menos': function (el) { var it = item(mesa(), el.dataset.i); if (!it || !it.por) return; it.por[el.dataset.p] = Math.max(0, (it.por[el.dataset.p] || 0) - 1); if (!it.por[el.dataset.p]) delete it.por[el.dataset.p]; salvar(); },
      'ra-dividir': function (el) { var it = item(mesa(), el.dataset.i); if (!it) return; it._escolher = !it._escolher; if (!it._escolher && it.divide && !it.divide.length) it.divide = null; render(); },
      'ra-todos': function (el) { var m = mesa(), it = item(m, el.dataset.i); if (!it) return; it.divide = m.pessoas.map(function (p) { return p.id; }); it.por = {}; salvar(); },
      'ra-entre': function (el) {
        var it = item(mesa(), el.dataset.i); if (!it) return; var d = it.divide || [], i = d.indexOf(el.dataset.p);
        if (i >= 0) d.splice(i, 1); else d.push(el.dataset.p); it.divide = d.length ? d : null; it._escolher = true; it.por = {}; salvar();
      },
      'ra-pagoutudo': function () {
        var m = mesa(); if (!m) return; var c = API.calcMesa(m);
        var nome = window.prompt ? prompt(tr('Quem pagou a conta toda? (nome)', 'Who paid the whole bill? (name)', '¿Quién pagó toda la cuenta? (nombre)'), (m.pessoas[0] || {}).nome || '') : '';
        var p = m.pessoas.find(function (x) { return N(x.nome) === N(nome); }); if (!p) return;
        m.pagamentos = {}; m.pagamentos[p.id] = c.total; salvar();
      },
      'ra-foto': function () { foto(function (t) { var n = API.fotoCardapio(t); toast(n + tr(' item(ns) do cardápio. Confira os preços.', ' menu item(s). Check the prices.', ' artículo(s) de la carta. Revisa los precios.')); }); },
      'ra-conferir': function () { foto(function (t) { API.fotoConta(t); }); },
      'ra-compartilhar': async function () {
        var m = mesa(); if (!m) return; var txt = API.mensagem(m), arq = null;
        try {
          var c = document.createElement('canvas'), linhas = txt.split('\n'); c.width = 720; c.height = 60 + linhas.length * 34; var x = c.getContext('2d');
          x.fillStyle = '#0d1117'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#e6edf3'; x.font = '24px sans-serif'; linhas.forEach(function (l, i) { x.fillText(l, 24, 44 + i * 34); });
          var blob = await new Promise(function (ok) { c.toBlob(ok, 'image/png'); }); if (blob) arq = new File([blob], 'rachai.png', { type: 'image/png' });
        } catch (e) { /* sem imagem */ }
        try {
          if (navigator.share) { await navigator.share(arq && navigator.canShare && navigator.canShare({ files: [arq] }) ? { text: txt, files: [arq] } : { text: txt }); return; }
        } catch (e) { /* cancelou */ }
        try { await navigator.clipboard.writeText(txt); toast(tr('Mensagem copiada.', 'Message copied.', 'Mensaje copiado.')); } catch (e) { toast(txt); }
      },
      'ra-lancar': function () {
        var m = mesa(); if (!m) return; var g = API.lancarFamilia(m);
        if (!g) return toast(tr('Nenhuma pessoa da família nesta mesa (ou já lançado).', 'No family member at this table (or already added).', 'Ninguna persona de la familia en esta mesa (o ya registrado).'), 'warn');
        salvar(); toast(tr('Lançado no BudgetONE: ', 'Added to BudgetONE: ', 'Registrado en BudgetONE: ') + fmt(n2(m.pessoas.filter(function (p) { return p.pessoaId; }).reduce(function (s, p) { return s + API.calcMesa(m).pessoas[p.id].total; }, 0))));
      }
    }
  });
  window.RachAI = API;
})();
