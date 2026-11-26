/* =====================================================================
   modulos/material-escolar.js — 📚 MATERIAL ESCOLAR (campanha por ano letivo) (3.102)        1.0.2 · 26/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 24/Nov/2026; sem IA, sem integração; no modelo da ✈️ Viagem, modulos/viagem.js)
     · Uma "campanha" por ano letivo ("Material escolar 2027"), com a janela de datas (padrão: 1º/nov até o fim de fevereiro) e os
       filhos (dependentes da casa). Tudo o que for confirmado cai numa linha só: Dependentes › Material escolar, com o filho certo
       (paraQuem), e a etiqueta g.material = id da campanha. A categoria "Material escolar" é a que já existir (qualquer
       maiúscula) ou nasce com este nome.
     · Sugere, nunca sozinho (dentro da janela, lançamentos do banco e pendentes do cartão):
         - a loja é papelaria, livraria, Kalunga e parecidas;
         - a loja é marketplace (Amazon, Mercado Livre, Shopee, Magalu…);
         - o comprovante ou o e-mail do pedido ligado ao lançamento (modulos/comprovantes.js: g.ficha, ST.comprovantes) traz
           palavras de material escolar (caderno, lápis, estojo, mochila, apostila, livro didático, uniforme…).
       Ficam fora: entradas, contas fixas, PJ, faturas, boletos e transferências, o que já é de outra campanha e o que a pessoa
       disse "não é".
     · "Compras do material: confirme": ✅ É (de qual filho) / ❌ Não é / ✂️ Parte (modulos/dividir.js: a parte vai para o
       material, o resto fica como estava). Pendente confirmada: a etiqueta vai para o definitivo quando ele chegar.
     · Resumo: total; por filho; por loja; a lista com o documento (📎 quando há comprovante ou arquivo); o ano anterior (a
       campanha de antes ou os lançamentos de Material escolar na mesma janela do ano anterior), quando houver.
     · Ao criar a campanha: um compromisso anual "Material escolar" (novembro, dia 15) para lembrar no ano que vem, se ainda não
       houver um; o valor dele acompanha o total confirmado.
   1.0.1 (3.104): a caixa "✂️ Parte" aberta, o valor digitado e o filho escolhido sobrevivem quando a tela se redesenha sozinha (a conciliação automática,
     as cotações): antes ela fechava no meio da digitação (e o teste quebrava 1 vez em 3).
   API (window.MaterialEscolar)
     lista() · salvar(d, id?) · padrao(hoje?) → {ano, de, ate} · sugestoes(c) → [{g, motivo, pend}] · confirmar(c, id, sim, pid?)
     parte(c, id, valor, pid?) · itens(c) · resumo(c) · sub() · filhos()
   DADOS
     ST.materiais = [{id, nome, ano, de, ate, filhos: [pid], decisoes: {id: 'sim'|'nao'}, quem: {id: pid}, recId, escopo, criadoEm}]
     lançamento: g.material = id da campanha (+ grupo DEPENDENTES, sub, paraQuem/paraQuemId)
   PONTOS QUE USA
     tela b-material · inbox.grupos ('confirmar') · lancamento.form · ações me-*
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'materiais';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function hoje() { return API._hoje || hojeISO(); }
  function lista() { if (!ST) return []; return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function visivel(c) { return !casa() || Escopo.de(COL, c) === 'casa'; }
  function txt(g) { return [g.descRobo, g.desc, g.contraparte && g.contraparte.nome].filter(Boolean).join(' '); }
  function pend() { return window.PreAut ? PreAut.lista() : []; }
  function gasto(id) { return Gasto.todos().find(function (g) { return g.id === id; }) || null; }
  function credito(g) { return !!g && (g.estorno || Number(g.valor) < 0 || g.fluxo === 'entrada'); }
  function ehPJ(g) { return !!(g.empresaId || g.pj || (window.Escopo && Escopo.ehPJ && Escopo.ehPJ(g))); }
  function ultimoDia(a, m) { return new Date(Date.UTC(a, m, 0)).getUTCDate(); }

  var RX_PAPEL = /papelar|livrar|kalunga|saraiva|livraria cultura|leitura\b|staples|armarinho|material escolar|escolar\b/i;
  var RX_MKT = /amazon|amzn|mercado ?livre|mercadolivre|\bmeli\b|\bml\b|shopee|magalu|magazine ?luiza|americanas|submarino|aliexpress|shein/i;
  var RX_ITEM = /caderno|l[aá]pis|caneta|borracha|estojo|mochila|apostila|livro did[aá]tico|livros? escolar|uniforme|tesoura|r[eé]gua|fich[aá]rio|agenda escolar|giz de cera|massinha|guache|marca[- ]texto|papel sulfite|lancheira|material escolar|cola (bast|branca|escolar)/i;
  var RX_FORA = /pagamento (de )?fatura|pgto fatura|pag(amento|to)? boleto|\bboleto\b|\bted\b|\btef\b|transfer|aplica[cç][aã]o|resgate|invest/i;

  /* a categoria que já existe (qualquer maiúscula) ou "Material escolar" */
  function sub() {
    var achou = '';
    Gasto.todos().concat(typeof Recorrente !== 'undefined' ? Recorrente.todos() : []).some(function (x) { if (x.grupo === 'DEPENDENTES' && /^material escolar$/i.test(String(x.sub || '').trim())) { achou = x.sub; return true; } return false; });
    return achou || 'Material escolar';
  }
  function filhos() { return window.Pessoas ? Pessoas.ativas().filter(function (p) { return p.tipo === 'casa' && p.papel === 'dependente'; }) : []; }
  function nomeP(id) { var p = window.Pessoas && Pessoas.porId(id); return p ? Pessoas.rotulo(p) : ''; }

  /* o ano letivo de agora: a partir de julho, o do ano que vem; janela 1º/nov do ano anterior até o fim de fevereiro */
  function padrao(h) {
    h = h || hoje(); var a = Number(h.slice(0, 4)), m = Number(h.slice(5, 7)), ano = m >= 7 ? a + 1 : a;
    return { ano: ano, de: (ano - 1) + '-11-01', ate: ano + '-02-' + ultimoDia(ano, 2) };
  }
  function salvar(d, id) {
    var c = id ? lista().find(function (x) { return x.id === id; }) : null, p = padrao();
    var ano = Number(d.ano) || (c && c.ano) || p.ano;
    var de = /^\d{4}-\d{2}-\d{2}$/.test(d.de || '') ? d.de : (c && c.de) || (ano - 1) + '-11-01';
    var ate = /^\d{4}-\d{2}-\d{2}$/.test(d.ate || '') ? d.ate : (c && c.ate) || ano + '-02-' + ultimoDia(ano, 2);
    if (ate < de) return null;
    var dados = { nome: String(d.nome || '').trim().slice(0, 80) || tr('Material escolar ', 'School supplies ', 'Material escolar ') + ano, ano: ano, de: de, ate: ate,
      filhos: Array.isArray(d.filhos) ? d.filhos : (c && c.filhos) || filhos().map(function (x) { return x.id; }) };
    if (c) { Object.assign(c, dados); return c; }
    c = Object.assign({ id: 'me' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), decisoes: {}, quem: {}, criadoEm: hoje() }, dados);
    if (d.escopo) c.escopo = d.escopo;
    lista().push(c);
    lembrete(c);
    return c;
  }
  /* o compromisso anual (novembro) para lembrar no ano que vem, se ainda não houver um */
  function lembrete(c) {
    if (typeof Recorrente === 'undefined') return;
    var r = Recorrente.todos().find(function (x) { return x.grupo === 'DEPENDENTES' && /material escolar/i.test(x.sub || '') && x.ativo !== false; });
    if (!r) r = Recorrente.add({ nome: tr('Material escolar', 'School supplies', 'Material escolar'), grupo: 'DEPENDENTES', sub: sub(), regra: 'anual', mes: 11, dia: 15, valor: anterior(c).total || 0,
      obs: tr('Lembrete do material escolar (novembro a fevereiro).', 'School supplies reminder (November to February).', 'Recordatorio del material escolar (noviembre a febrero).') });
    c.recId = r.id;
  }
  function decisao(c, id) { return (c.decisoes || {})[id] || ''; }
  function outra(c, g) { return g.material && g.material !== c.id; }
  /* o texto do pedido: a ficha do comprovante no lançamento e os comprovantes ligados a ele */
  function textoPedido(g) {
    var t = g.ficha ? [g.ficha.produto, g.ficha.pedido].join(' ') : '';
    (ST.comprovantes || []).forEach(function (x) { if (x.gastoId === g.id || (x.pendId && x.pendId === g.id)) t += ' ' + [x.produto, x.descricao, x.assunto].filter(Boolean).join(' '); });
    return t;
  }
  function motivo(g) {
    if (RX_ITEM.test(textoPedido(g))) return tr('o pedido tem material escolar', 'the order has school supplies', 'el pedido tiene material escolar');
    if (RX_PAPEL.test(txt(g))) return tr('papelaria ou livraria', 'stationery or bookstore', 'papelería o librería');
    if (RX_MKT.test(txt(g))) return tr('loja on-line na época do material', 'online store in school-supply season', 'tienda en línea en época de material');
    return '';
  }
  function sugestoes(c) {
    var out = [], ver = function (g, ehPend) {
      if (!g || !g.data || g.data < c.de || g.data > c.ate || g.material === c.id || outra(c, g) || decisao(c, g.id)) return;
      if (credito(g) || ehPJ(g) || g.recorrenteId || RX_FORA.test(txt(g)) || /boleto/i.test(g.forma || '') || g.grupo === 'INVESTIMENTO' || !(Number(g.valor) > 0)) return;
      var m = motivo(g); if (m) out.push({ g: g, motivo: m, pend: ehPend });
    };
    Gasto.todos().forEach(function (g) { ver(g, false); });
    pend().filter(function (p) { return p.estado === 'pendente'; }).forEach(function (p) { ver(p, true); });
    return out.sort(function (a, b) { return a.g.data < b.g.data ? -1 : a.g.data > b.g.data ? 1 : 0; });
  }
  function etiquetar(c, id, pid) {
    var g = gasto(id); if (!g) return false;
    var d = { material: c.id, grupo: 'DEPENDENTES', sub: sub(), editadoPessoa: true, revisar: false };
    if (pid) { d.paraQuemId = pid; d.paraQuem = nomeP(pid); }
    Gasto.atualizar(id, d); return true;
  }
  function confirmar(c, id, sim, pid) {
    var g = gasto(id) || pend().find(function (p) { return p.id === id; }); if (!g) return false;
    c.decisoes = c.decisoes || {}; c.quem = c.quem || {};
    pid = pid || ((c.filhos || []).length === 1 ? c.filhos[0] : '');
    c.decisoes[id] = sim ? 'sim' : 'nao'; if (sim && pid) c.quem[id] = pid;
    if (sim) etiquetar(c, id, pid);
    else if (gasto(id) && gasto(id).material === c.id) Gasto.atualizar(id, { material: undefined });
    atualizarLembrete(c);
    return true;
  }
  /* a pendente confirmada virou definitivo: a etiqueta vai para ele */
  function levarPendentes(c) {
    Object.keys(c.decisoes || {}).forEach(function (id) {
      if (c.decisoes[id] !== 'sim' || gasto(id)) return;
      var p = pend().find(function (x) { return x.id === id; });
      if (p && p.estado === 'cobrado' && p.gastoId && gasto(p.gastoId) && !gasto(p.gastoId).material) { c.decisoes[p.gastoId] = 'sim'; if (c.quem[id]) c.quem[p.gastoId] = c.quem[id]; etiquetar(c, p.gastoId, (c.quem || {})[id]); atualizarLembrete(c); }
    });
  }
  function itens(c) { return Gasto.todos().filter(function (g) { return g.material === c.id; }); }
  function loja(g) { return (g.contraparte && g.contraparte.nome) || String(g.descRobo || g.desc || '').split(' · ')[0].replace(/\s*\d{1,2}\/\d{1,2}\s*$/, '').trim() || tr('outros', 'other', 'otros'); }
  function temDoc(g) { return !!(g.docId || g.ficha || (ST.comprovantes || []).some(function (x) { return x.gastoId === g.id; })); }
  /* o ano anterior: a campanha de antes ou os lançamentos de Material escolar na mesma janela, um ano antes */
  function anterior(c) {
    var a = lista().find(function (x) { return x.id !== c.id && Number(x.ano) === Number(c.ano) - 1; });
    if (a) return { total: resumoBase(a).total, nome: a.nome };
    var de = (Number(c.de.slice(0, 4)) - 1) + c.de.slice(4), ate = (Number(c.ate.slice(0, 4)) - 1) + c.ate.slice(4, 8) + Math.min(Number(c.ate.slice(8)), ultimoDia(Number(c.ate.slice(0, 4)) - 1, Number(c.ate.slice(5, 7))));
    var t = n2(Gasto.todos().filter(function (g) { return g.grupo === 'DEPENDENTES' && /material escolar/i.test(g.sub || '') && g.data >= de && g.data <= ate && !credito(g); })
      .reduce(function (s, g) { return s + (Number(g.valor) || 0); }, 0));
    return { total: t, nome: t ? tr('Material escolar ', 'School supplies ', 'Material escolar ') + (Number(c.ano) - 1) : '' };
  }
  function resumoBase(c) {
    var l = itens(c), r = { total: 0, porFilho: {}, porLoja: {}, n: l.length, lista: l.slice().sort(function (a, b) { return a.data < b.data ? -1 : 1; }) };
    l.forEach(function (g) {
      var v = Number(g.valor) || 0, f = nomeP(g.paraQuemId) || g.paraQuem || tr('sem filho definido', 'no child set', 'sin hijo definido');
      r.total = n2(r.total + v); r.porFilho[f] = n2((r.porFilho[f] || 0) + v); r.porLoja[loja(g)] = n2((r.porLoja[loja(g)] || 0) + v);
    });
    return r;
  }
  function resumo(c) { var r = resumoBase(c), a = anterior(c); r.anterior = a.total ? a : null; return r; }
  function atualizarLembrete(c) {
    var r = c.recId && typeof Recorrente !== 'undefined' ? Recorrente.todos().find(function (x) { return x.id === c.recId; }) : null, t = resumoBase(c).total;
    if (r && t > 0) Recorrente.atualizar(r.id, { valor: t });
  }

  var API = {
    _hoje: null, lista: lista, salvar: salvar, padrao: padrao, sugestoes: sugestoes, itens: itens, resumo: resumo, sub: sub, filhos: filhos,
    confirmar: function (c, id, sim, pid) { var r = confirmar(c, id, sim, pid); levarPendentes(c); return r; },
    parte: function (c, id, valor, pid) {
      var g = gasto(id), val = n2(valor); if (!g || !window.Divisao || !(val > 0) || val >= Math.abs(Number(g.valor))) return false;
      pid = pid || ((c.filhos || []).length === 1 ? c.filhos[0] : '');
      var tot = n2(Math.abs(Number(g.valor)));
      if (!Divisao.aplicar(id, [{ valor: val, grupo: 'DEPENDENTES', sub: sub(), paraQuem: nomeP(pid), nota: tr('material escolar', 'school supplies', 'material escolar') }, { valor: n2(tot - val), grupo: g.grupo, sub: g.sub, paraQuem: g.paraQuem || '' }])) return false;
      c.decisoes = c.decisoes || {}; c.quem = c.quem || {}; c.decisoes[id] = 'sim'; if (pid) c.quem[id] = pid; etiquetar(c, id, pid);
      Gasto.todos().forEach(function (x) { if (x.id.indexOf(id + '~') === 0) c.decisoes[x.id] = 'nao'; });
      atualizarLembrete(c);
      return true;
    },
    ligarTudo: function () { lista().forEach(levarPendentes); },
    abrir: function (id) { aberta = id; if (typeof irPara === 'function') irPara('b-material'); }
  };

  /* ---------- telas ---------- */
  var aberta = null, partes = {}, filhoDe = {};   /* filhoDe: {gid: pid} o filho escolhido na linha, entre um desenho e outro */   /* {gid: valor digitado}: a caixa da parte aberta, entre um desenho e outro */
  function lerC(id) { return lista().find(function (x) { return x.id === id; }) || null; }
  function botao(acao, rot, extra, cls) { return '<button type="button" class="btn sm' + (cls ? ' ' + cls : '') + '" data-acao="' + acao + '"' + (extra || '') + '>' + esc(rot) + '</button>'; }
  function selFilho(c, id) {
    var fs = (c.filhos || []).map(function (pid) { return { id: pid, n: nomeP(pid) }; }).filter(function (x) { return x.n; });
    if (fs.length < 2) return '';
    return '<select class="me-filho" data-g="' + esc(id) + '">' + fs.map(function (x) { return '<option value="' + esc(x.id) + '"' + (filhoDe[id] === x.id ? ' selected' : '') + '>' + esc(x.n) + '</option>'; }).join('') + '</select> ';
  }
  function linhaSug(c, s) {
    var g = s.g, d = ' data-c="' + esc(c.id) + '" data-id="' + esc(g.id) + '"';
    return '<li class="inb-item me-sug" data-g="' + esc(g.id) + '"><div><b>' + (s.pend ? '⏳ ' : '') + esc((g.descRobo || g.desc || '') + ' · ' + fmt(Number(g.valor) || 0)) + '</b>' +
      '<span class="t-sub">' + esc(I18n.data(g.data) + ' · ' + s.motivo + (s.pend ? ' · ' + tr('pendente no banco: entra quando virar definitiva', 'pending at the bank: counts when final', 'pendiente en el banco: cuenta cuando sea definitiva') : '')) + '</span></div>' +
      '<span class="inb-acoes" style="flex-wrap:wrap;gap:4px">' + selFilho(c, g.id) + botao('me-sim', '✅ ' + tr('É material', 'School supplies', 'Es material'), d) + botao('me-nao', '❌ ' + tr('Não é', 'Not it', 'No es'), d) +
      (!s.pend ? botao('me-parte', '✂️ ' + tr('Parte', 'Part', 'Parte'), d) : '') + '</span>' +
      '<div class="me-parte-box" data-g="' + esc(g.id) + '"' + (partes[g.id] != null ? '' : ' hidden') + '><input type="text" inputmode="decimal" class="me-parte-v" data-g="' + esc(g.id) + '" value="' + esc(partes[g.id] || '') + '" placeholder="' + esc(tr('quanto foi do material', 'how much was school supplies', 'cuánto fue del material')) + '" style="width:10em"> ' + botao('me-parte-ok', tr('Dividir', 'Split', 'Dividir'), d) + '</div></li>';
  }
  function bloco(tit, obj) {
    var ks = Object.keys(obj).sort(function (a, b) { return obj[b] - obj[a]; }); if (!ks.length) return '';
    return '<div class="me-bloco"><h4 style="margin:10px 0 4px">' + esc(tit) + '</h4>' + ks.map(function (k) { return '<div class="small row" style="justify-content:space-between"><span>' + esc(k) + '</span><b>' + esc(fmt(obj[k])) + '</b></div>'; }).join('') + '</div>';
  }
  function telaCampanha(c) {
    levarPendentes(c);
    var sg = sugestoes(c), r = resumo(c);
    var h = '<div class="card-head"><h1>📚 ' + esc(c.nome) + '</h1></div>' +
      '<p class="small muted">' + esc(I18n.data(c.de) + ' – ' + I18n.data(c.ate) + ' · ' + ((c.filhos || []).map(nomeP).filter(Boolean).join(', ') || tr('sem filhos marcados', 'no children ticked', 'sin hijos marcados')) + ' · ' + tr('Dependentes › ', 'Dependants › ', 'Dependientes › ') + sub()) + '</p>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap;margin:0 0 8px">' + botao('me-voltar', '← ' + tr('Material escolar', 'School supplies', 'Material escolar')) + botao('me-editar', '✏️ ' + tr('Editar', 'Edit', 'Editar'), ' data-c="' + esc(c.id) + '"') + '</div>';
    h += '<div class="card me-confirma"><div class="card-head"><h3>' + esc(tr('Compras do material: confirme', 'School-supply purchases: confirm', 'Compras del material: confirma')) + ' (' + sg.length + ')</h3></div>' +
      (sg.length ? '<p class="small muted" style="margin:0 0 6px">' + esc(tr('Papelarias, livrarias e lojas on-line no período, e pedidos com caderno, lápis, mochila… Só entra o que você confirmar.', 'Stationery shops, bookstores and online stores in the period, and orders with notebooks, pencils, backpacks… Only what you confirm counts.', 'Papelerías, librerías y tiendas en línea en el período, y pedidos con cuadernos, lápices, mochilas… Solo cuenta lo que confirmes.')) + '</p>' +
        '<ul class="inb-lista">' + sg.map(function (s) { return linhaSug(c, s); }).join('') + '</ul>'
        : '<p class="small muted">' + esc(tr('Nada para confirmar agora.', 'Nothing to confirm now.', 'Nada que confirmar ahora.')) + '</p>') + '</div>';
    h += '<div class="card me-resumo"><div class="card-head"><h3>' + esc(tr('Resumo', 'Summary', 'Resumen')) + '</h3></div>' +
      '<p class="me-total"><b style="font-size:1.4em">' + esc(fmt(r.total)) + '</b> · ' + esc(r.n + tr(' compras', ' purchases', ' compras')) + '</p>' +
      (r.anterior ? '<p class="small me-ant">' + esc(r.anterior.nome + ': ' + fmt(r.anterior.total) + ' · ' + (r.total >= r.anterior.total ? tr('este ano, ', 'this year, ', 'este año, ') + fmt(n2(r.total - r.anterior.total)) + tr(' a mais', ' more', ' más') : tr('este ano, ', 'this year, ', 'este año, ') + fmt(n2(r.anterior.total - r.total)) + tr(' a menos', ' less', ' menos'))) + '</p>' : '') +
      bloco(tr('Por filho', 'By child', 'Por hijo'), r.porFilho) + bloco(tr('Por loja', 'By store', 'Por tienda'), r.porLoja) +
      (r.lista.length ? '<h4 style="margin:10px 0 4px">' + esc(tr('As compras', 'The purchases', 'Las compras')) + '</h4><ul class="me-lista" style="margin:0;padding-left:16px">' + r.lista.map(function (g) {
        return '<li class="small">' + esc(I18n.data(g.data) + ' · ' + loja(g) + ' · ' + fmt(Number(g.valor) || 0) + ' · ' + (nomeP(g.paraQuemId) || g.paraQuem || '—')) + (temDoc(g) ? ' 📎' : '') + ' ' +
          botao('me-nao', tr('tirar', 'remove', 'quitar'), ' data-c="' + esc(c.id) + '" data-id="' + esc(g.id) + '"') + '</li>';
      }).join('') + '</ul>' : '') + '</div>';
    return h;
  }
  function telaLista() {
    var l = lista().filter(visivel).slice().sort(function (a, b) { return b.ano - a.ano; });
    return '<div class="card-head"><h1>📚 ' + esc(tr('Material escolar', 'School supplies', 'Material escolar')) + '</h1></div>' +
      '<p class="small muted">' + esc(tr('As compras do material escolar de cada ano letivo numa linha só, com o filho certo. Você confirma o que o app sugere.', 'Each school year’s supplies in one line, with the right child. You confirm what the app suggests.', 'Las compras del material escolar de cada año lectivo en una sola línea, con el hijo correcto. Tú confirmas lo que sugiere la app.')) + '</p>' +
      '<p>' + botao('me-nova', '+ ' + tr('Material escolar ', 'School supplies ', 'Material escolar ') + padrao().ano, '', 'primary') + '</p>' +
      l.map(function (c) {
        var r = resumoBase(c), n = sugestoes(c).length;
        return '<button class="card card-link me-item" data-acao="me-abrir" data-c="' + esc(c.id) + '" style="width:100%;text-align:left"><span><b>📚 ' + esc(c.nome) + '</b><span class="t-sub">' +
          esc(fmt(r.total) + (n ? ' · ' + n + tr(' para confirmar', ' to confirm', ' por confirmar') : '')) + '</span></span></button>';
      }).join('');
  }
  function tela() { var c = aberta && lerC(aberta); return c && visivel(c) ? telaCampanha(c) : telaLista(); }
  function form(c) {
    var p = padrao(), fs = filhos(), sel = c ? c.filhos || [] : fs.map(function (x) { return x.id; });
    var f = function (rot, campo) { return '<label class="field"><span>' + esc(rot) + '</span>' + campo + '</label>'; };
    $('#genTitle').textContent = '📚 ' + (c ? tr('Editar', 'Edit', 'Editar') : tr('Material escolar', 'School supplies', 'Material escolar'));
    $('#genBody').innerHTML = Verter.html('<div class="me-form" data-c="' + esc(c ? c.id : '') + '"><div class="grid g2">' +
      f(tr('Ano letivo', 'School year', 'Año lectivo'), '<input id="meAno" type="number" min="2000" max="2100" value="' + (c ? c.ano : p.ano) + '">') +
      f(tr('Nome', 'Name', 'Nombre'), '<input id="meNome" maxlength="80" value="' + esc(c ? c.nome : '') + '" placeholder="' + esc(tr('Material escolar ', 'School supplies ', 'Material escolar ') + p.ano) + '">') +
      f(tr('De', 'From', 'Desde'), '<input id="meDe" type="date" value="' + esc(c ? c.de : p.de) + '">') + f(tr('Até', 'To', 'Hasta'), '<input id="meAte" type="date" value="' + esc(c ? c.ate : p.ate) + '">') + '</div>' +
      (fs.length ? '<p class="small" style="margin:8px 0 2px"><b>' + esc(tr('De quem', 'For whom', 'De quién')) + '</b></p><div id="meFilhos">' + fs.map(function (x) {
        return '<label class="chk" style="display:inline-flex;gap:4px;margin:2px 8px 2px 0"><input type="checkbox" value="' + esc(x.id) + '"' + (sel.indexOf(x.id) >= 0 ? ' checked' : '') + '> ' + esc(Pessoas.rotulo(x)) + '</label>';
      }).join('') + '</div>' : '<p class="small muted">' + esc(tr('Cadastre os filhos em Pessoas (dependentes da casa) para separar por filho.', 'Add the children in People (household dependants) to split by child.', 'Registra a los hijos en Personas (dependientes de la casa) para separar por hijo.')) + '</p>') +
      '<div class="f-actions">' + botao('me-salvar', tr('Salvar', 'Save', 'Guardar'), '', 'primary') + '</div></div>');
    abrir('genModal');
  }
  function val(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }
  function num(t) { var s = String(t || '').trim(); if (/,/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); return Number(s) || 0; }
  function filhoEscolhido(id) { var e = document.querySelector('.me-filho[data-g="' + id + '"]'); return e ? e.value : ''; }
  function depois() { Store.salvar(); if (typeof render === 'function') render(); if (typeof renderInboxN === 'function') renderInboxN(); }

  function dmy(iso) { return String(iso || '').slice(8, 10) + '/' + String(iso || '').slice(5, 7); }
  MoneyModulos.registrar({
    id: 'material-escolar', versao: '1.0.2', colecoes: [COL],
    pontos: {
      'inbox.grupos': function () {
        if (casa()) return [];
        API.ligarTudo();
        var h = '', n = 0;
        lista().filter(visivel).forEach(function (c) {
          var sg = sugestoes(c), k = sg.length; if (!k) return; n++;
          /* 3.116: o total e o período das compras (não só a janela da campanha) */
          var ds = sg.map(function (s) { return s.g.data; }).filter(Boolean).sort(), tot = sg.reduce(function (a, s) { return a + Math.abs(Number(s.g.valor) || 0); }, 0);
          h += '<li class="inb-item me-inb"><div><b>📚 ' + esc(c.nome + ': ' + k + tr(' compras para confirmar', ' purchases to confirm', ' compras por confirmar')) + '</b><span class="t-sub">' + esc(fmt(tot) + (ds.length ? tr(' · de ', ' · from ', ' · del ') + dmy(ds[0]) + tr(' a ', ' to ', ' al ') + dmy(ds[ds.length - 1]) : '')) + '</span></div><span class="inb-acoes">' +
            botao('me-abrir', tr('Confirmar', 'Confirm', 'Confirmar'), ' data-c="' + esc(c.id) + '" data-close="genModal"', 'primary') + '</span></li>';
        });
        return n ? [{ id: 'confirmar', n: n, html: h }] : [];
      },
      'lancamento.form': function (ctx) {
        var g = ctx && ctx.g, c = g && g.material && lerC(g.material); if (!c) return '';
        return '<div class="bloco-regra me-etq"><span class="bf-tit">📚 ' + esc(c.nome) + '</span>' +
          '<button type="button" class="btn sm" data-acao="me-nao" data-c="' + esc(c.id) + '" data-id="' + esc(g.id) + '">' + esc(tr('Não é material escolar', 'Not school supplies', 'No es material escolar')) + '</button></div>';
      }
    },
    telas: { 'b-material': { app: 'budget', render: tela,
      ajuda: { pt: { t: 'Material escolar', o: 'O material escolar de cada ano numa linha só, por filho.', f: ['Crie o ano letivo (o período já vem de novembro a fevereiro).', 'Confirme o que o app sugere e diga de qual filho é.', 'O resumo mostra o total, por filho, por loja e o ano anterior.'] },
               en: { t: 'School supplies', o: 'Each year’s school supplies in one line, per child.', f: ['Create the school year (the period comes as November to February).', 'Confirm what the app suggests and say which child it is for.', 'The summary shows the total, per child, per store and last year.'] } } } },
    acoes: {
      'me-nova': function () { form(null); },
      'me-editar': function (el) { form(lerC(el.dataset.c)); },
      'me-salvar': function () {
        var box = document.querySelector('.me-form'), id = box && box.dataset.c;
        var fs = [].slice.call(document.querySelectorAll('#meFilhos input:checked')).map(function (x) { return x.value; });
        var c = salvar({ ano: val('meAno'), nome: val('meNome'), de: val('meDe'), ate: val('meAte'), filhos: document.getElementById('meFilhos') ? fs : undefined }, id || null);
        if (!c) return toast(tr('O fim tem de ser depois do início.', 'The end must be after the start.', 'El final debe ser después del inicio.'), 'warn');
        fechar('genModal'); aberta = c.id; if (typeof irPara === 'function') irPara('b-material'); depois();
      },
      'me-abrir': function (el) { aberta = el.dataset.c; if (typeof irPara === 'function') irPara('b-material'); if (typeof render === 'function') render(); },
      'me-voltar': function () { aberta = null; if (typeof render === 'function') render(); },
      'me-sim': function (el) { var c = lerC(el.dataset.c); if (c && API.confirmar(c, el.dataset.id, true, filhoEscolhido(el.dataset.id))) depois(); },
      'me-nao': function (el) { var c = lerC(el.dataset.c); if (c && API.confirmar(c, el.dataset.id, false)) depois(); },
      'me-parte': function (el) { var b = document.querySelector('.me-parte-box[data-g="' + el.dataset.id + '"]'); if (!b) return; b.hidden = !b.hidden; if (b.hidden) delete partes[el.dataset.id]; else if (partes[el.dataset.id] == null) partes[el.dataset.id] = ''; },
      'me-parte-ok': function (el) {
        var c = lerC(el.dataset.c), b = document.querySelector('.me-parte-box[data-g="' + el.dataset.id + '"] .me-parte-v');
        if (!c || !b) return;
        if (!API.parte(c, el.dataset.id, num(b.value), filhoEscolhido(el.dataset.id))) return toast(tr('Diga um valor menor que o total.', 'Enter an amount below the total.', 'Indica un importe menor que el total.'), 'warn');
        delete partes[el.dataset.id]; depois();
      }
    },
    ouvir: { 'gasto.novo': function () { if (lista().length) API.ligarTudo(); } }
  });
  document.addEventListener('input', function (ev) { var t = ev.target; if (t && t.classList && t.classList.contains('me-parte-v') && t.dataset.g) partes[t.dataset.g] = t.value; });
  document.addEventListener('change', function (ev) { var t = ev.target; if (t && t.classList && t.classList.contains('me-filho') && t.dataset.g) filhoDe[t.dataset.g] = t.value; });
  window.MaterialEscolar = API;
})();
