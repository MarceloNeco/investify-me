/* =====================================================================
   modulos/base.js — o registro de módulos do MoneyTRIO            1.0.0 · 06/Nov/2026
   ---------------------------------------------------------------------
   POR QUE EXISTE
   O index.html passou de 2 MB. Daqui para frente, cada função nova mora num arquivo próprio em
   modulos/ e conversa com o app só por esta API pequena. O index.html ganha apenas a ligação:
   carregar o arquivo, chamar um ponto de encaixe, abrir uma tela. Guia completo: ARQUITETURA.md,
   seção "Guia de módulos".

   API (window.MoneyModulos)
     registrar(def)            → registra um módulo. def = {
                                   id: 'agendamentos'            (único; letras minúsculas, números e -)
                                   versao: '1.0.0'               (a mesma do ?v= no index.html e no sw.js)
                                   colecoes: ['agendamentos']    (listas do Store.estado que o módulo é dono;
                                                                  a nuvem guarda cada item fechado no money_docs)
                                   pontos: {'custos.topo': fn(ctx) → html}   (pedaços de tela)
                                   acoes: {'agend-renovar': fn(el, dados)}   (data-acao="…" nos botões)
                                   telas: {'b-nfs': {app:'budget', render: fn() → html}}
                                   ouvir: {'gasto.salvo': fn(dados)}         (eventos do app)
                                   iniciar: fn()                 (uma vez, depois que o app abriu)
                                 }
     colecoes()                → todas as coleções dos módulos (a nuvem soma às dela)
     html(ponto, ctx)          → junta o html que os módulos põem naquele ponto ('' se nenhum)
     acao(nome, el, dados)     → roda a ação de um módulo; devolve true se algum tratou
     tela(id)                  → a função que desenha a tela de um módulo (ou null)
     emitir(evento, dados)     → avisa os módulos que ouvem aquele evento
     iniciarTodos()            → chamado pelo app uma vez, depois de abrir
     lista()                   → [{id, versao}] (para Configurações e testes)

   REGRAS
   - Um módulo NUNCA derruba o app: erro dentro dele vira console.warn e o resto segue.
   - Um módulo lê e grava os próprios dados em Store.estado[colecao] e chama Store.salvar();
     nada de localStorage próprio para finanças (com a nuvem, o Store já cifra e sobe).
   - Pode usar as funções globais do app (ST, Store, render, toast, fmt, esc, I18n, $), mas não
     reescreve funções do index.html.
   ===================================================================== */
(function () {
  'use strict';
  var mods = [], porId = {}, iniciados = false;
  var RX_ID = /^[a-z][a-z0-9-]{1,39}$/, RX_COL = /^[a-z][a-z0-9_]{1,39}$/;

  function seguro(id, fn, args) {
    try { return fn.apply(null, args || []); }
    catch (e) { try { console.warn('módulo ' + id + ':', e); } catch (e2) {} return undefined; }
  }

  var M = {
    VERSAO: '1.0.0',
    registrar: function (def) {
      if (!def || !RX_ID.test(String(def.id || ''))) throw new Error('módulo sem id válido');
      if (porId[def.id]) throw new Error('módulo repetido: ' + def.id);
      (def.colecoes || []).forEach(function (c) {
        if (!RX_COL.test(c)) throw new Error('coleção inválida: ' + c);
        mods.forEach(function (o) { if ((o.colecoes || []).indexOf(c) >= 0) throw new Error('coleção já é do módulo ' + o.id + ': ' + c); });
      });
      var m = { id: def.id, versao: String(def.versao || '0.0.0'), colecoes: (def.colecoes || []).slice(),
                pontos: def.pontos || {}, acoes: def.acoes || {}, telas: def.telas || {}, ouvir: def.ouvir || {},
                iniciar: def.iniciar || null };
      mods.push(m); porId[m.id] = m;
      if (iniciados && m.iniciar) seguro(m.id, m.iniciar);
      return m;
    },
    colecoes: function () {
      var out = []; mods.forEach(function (m) { m.colecoes.forEach(function (c) { if (out.indexOf(c) < 0) out.push(c); }); });
      return out;
    },
    html: function (ponto, ctx) {
      var h = '';
      mods.forEach(function (m) { var f = m.pontos[ponto]; if (typeof f === 'function') { var r = seguro(m.id, f, [ctx || {}]); if (typeof r === 'string') h += r; } });
      return h;
    },
    acao: function (nome, el, dados) {
      for (var i = 0; i < mods.length; i++) {
        var f = mods[i].acoes[nome];
        if (typeof f === 'function') { seguro(mods[i].id, f, [el, dados || {}]); return true; }
      }
      return false;
    },
    tela: function (id) {
      for (var i = 0; i < mods.length; i++) {
        var t = mods[i].telas[id];
        if (t && typeof t.render === 'function') { var mid = mods[i].id; return function () { var r = seguro(mid, t.render); return typeof r === 'string' ? r : ''; }; }
      }
      return null;
    },
    infoTela: function (id) {
      for (var i = 0; i < mods.length; i++) if (mods[i].telas[id]) return mods[i].telas[id];
      return null;
    },
    emitir: function (evento, dados) {
      mods.forEach(function (m) { var f = m.ouvir[evento]; if (typeof f === 'function') seguro(m.id, f, [dados]); });
    },
    iniciarTodos: function () {
      if (iniciados) return; iniciados = true;
      mods.forEach(function (m) { if (m.iniciar) seguro(m.id, m.iniciar); });
    },
    lista: function () { return mods.map(function (m) { return { id: m.id, versao: m.versao, colecoes: m.colecoes.slice() }; }); }
  };
  window.MoneyModulos = M;
})();
