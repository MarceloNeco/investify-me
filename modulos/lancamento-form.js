/* =====================================================================
   modulos/lancamento-form.js — o formulário do lançamento mais claro (3.65.2)        1.0.0 · 11/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedidos do dono, 11/Nov/2026, no lançamento "A confirmar" do condomínio)
     · Categoria: ao tocar no campo, abre a LISTA INTEIRA do grupo escolhido (com a atual marcada ✓), não só a que já
       está escrita (o <datalist> do navegador filtrava pelo texto). Digitar filtra; texto livre continua valendo;
       ↑ ↓ Enter Esc no teclado.
     · "A confirmar" dentro da edição: no topo, o selo e "✓ Confirmar como está". Salvar com mudanças também confirma.
       Com o lançamento pendente, a bandeira "Marcar para conferir depois" sai (é a mesma coisa).
     · O que falta preencher: os campos que o robô não soube (categoria "A identificar", sem grupo, banco ou cartão
       vazio) ficam destacados, com "Falta: categoria, banco" no topo. Some conforme a pessoa preenche.
   PONTOS QUE USA / OFERECE
     lancamento.topo (index.html abrirLancamento) · LancForm.ligar(g) depois de abrir · ação lf-confirmar
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
  function $(id) { return document.getElementById(id); }
  var SEM_CAT = /^(sem categoria|a identificar|outros|\?|)$/i;

  /* ---------- a lista de categorias (combobox simples, acessível) ---------- */
  function combo(inp, opcoes) {
    if (!inp || inp.dataset.combo) return;
    inp.dataset.combo = '1'; inp.removeAttribute('list'); inp.setAttribute('autocomplete', 'off');
    inp.setAttribute('role', 'combobox'); inp.setAttribute('aria-autocomplete', 'list'); inp.setAttribute('aria-expanded', 'false');
    var box = document.createElement('ul'); box.className = 'lf-lista'; box.id = inp.id + 'Lista'; box.setAttribute('role', 'listbox'); box.hidden = true;
    inp.setAttribute('aria-controls', box.id);
    inp.parentNode.style.position = 'relative'; inp.parentNode.appendChild(box);
    var filtro = null, ativo = -1;
    function itens() {
      var atual = N(inp.value), f = filtro === null ? '' : N(filtro);
      return opcoes().filter(function (o) { return !f || N(o).indexOf(f) >= 0; }).map(function (o) { return { o: o, atual: N(o) === atual }; });
    }
    function desenhar() {
      var l = itens();
      box.innerHTML = l.map(function (x, i) {
        return '<li role="option" id="' + box.id + i + '" data-v="' + esc(x.o) + '" class="' + (x.atual ? 'atual' : '') + (i === ativo ? ' ativo' : '') + '" aria-selected="' + (x.atual ? 'true' : 'false') + '">' +
          (x.atual ? '✓ ' : '') + esc(x.o) + '</li>';
      }).join('') || '<li class="vazio" aria-disabled="true">' + esc(tr('Nova categoria: "' + inp.value + '"', 'New category: "' + inp.value + '"')) + '</li>';
      if (ativo >= 0) inp.setAttribute('aria-activedescendant', box.id + ativo); else inp.removeAttribute('aria-activedescendant');
      var at = box.querySelector('.atual'); if (at && filtro === null) at.scrollIntoView({ block: 'nearest' });
    }
    function abrir() { filtro = null; ativo = -1; box.hidden = false; inp.setAttribute('aria-expanded', 'true'); desenhar(); }
    function fechar() { box.hidden = true; inp.setAttribute('aria-expanded', 'false'); ativo = -1; }
    function escolher(v) { inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); fechar(); }
    inp.addEventListener('focus', abrir);
    inp.addEventListener('click', function () { if (box.hidden) abrir(); });
    inp.addEventListener('input', function (e) { if (!e.isTrusted) return; filtro = inp.value; ativo = -1; box.hidden = false; inp.setAttribute('aria-expanded', 'true'); desenhar(); });
    inp.addEventListener('keydown', function (e) {
      var n = box.querySelectorAll('li[data-v]').length;
      if (e.key === 'ArrowDown') { e.preventDefault(); if (box.hidden) abrir(); ativo = Math.min(n - 1, ativo + 1); desenhar(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); ativo = Math.max(0, ativo - 1); desenhar(); }
      else if (e.key === 'Enter' && !box.hidden && ativo >= 0) { e.preventDefault(); var li = box.querySelectorAll('li[data-v]')[ativo]; if (li) escolher(li.dataset.v); }
      else if (e.key === 'Escape' && !box.hidden) { e.preventDefault(); e.stopPropagation(); fechar(); }
    });
    inp.addEventListener('blur', function () { setTimeout(fechar, 150); });
    box.addEventListener('mousedown', function (e) { var li = e.target.closest('li[data-v]'); if (li) { e.preventDefault(); escolher(li.dataset.v); } });
  }

  /* ---------- o que falta ---------- */
  function faltas() {
    var f = [], grupo = ($('glGrupo') || {}).value, sub = ($('glSub') || {}).value || '';
    if (!grupo || grupo === 'OUTROS') f.push(['glGrupo', tr('grupo', 'group')]);
    if (SEM_CAT.test(sub.trim())) f.push(['glSub', tr('categoria', 'category')]);
    var forma = ($('glForma') || {}).value;
    if (!forma) f.push(['glForma', tr('como pagou', 'how it was paid')]);
    if ($('glBanco') && !$('glBanco').value) f.push(['glBanco', tr('banco', 'bank')]);
    if ($('glCartao') && !$('glCartao').value) f.push(['glCartao', tr('cartão', 'card')]);
    return f;
  }
  function marcarFaltas() {
    var el = $('lfFalta'); if (!el) return;
    document.querySelectorAll('#assetModalBody .lf-falta').forEach(function (x) { x.classList.remove('lf-falta'); });
    var f = faltas();
    f.forEach(function (x) { var c = $(x[0]); if (c) c.classList.add('lf-falta'); });
    el.hidden = !f.length;
    el.textContent = f.length ? tr('Falta: ', 'Missing: ') + f.map(function (x) { return x[1]; }).join(', ') : '';
  }

  var API = {
    /* o topo da edição: selo + confirmar, e o que falta (só para o que veio do robô ou está pendente) */
    topo: function (g) {
      var s = g && window.Origem ? Origem.status(g) : '';
      var h = '';
      if (s === 'confirmar') {
        h += '<div class="lf-topo or-form"><span class="or-selo or-amarelo">' + esc(tr('A confirmar', 'To confirm')) + '</span>' +
          '<span class="small">' + esc(tr('O robô sugeriu ', 'The robot suggested ') + ((GRUPOS[g.grupo] || {}).nome || g.grupo) + ' › ' + (g.sub || '—') + '.') + '</span>' +
          '<button type="button" class="btn sm primary" data-acao="lf-confirmar" data-id="' + esc(g.id) + '">✓ ' + esc(tr('Confirmar como está', 'Confirm as is')) + '</button>' +
          '<span class="tiny muted">' + esc(tr('Ou mude o que precisar e salve: salvar também confirma.', 'Or change what you need and save: saving also confirms.')) + '</span></div>';
      } else if (s === 'identificar') {
        h += '<div class="lf-topo or-form"><span class="or-selo or-vermelho">' + esc(tr('A identificar', 'To identify')) + '</span>' +
          '<span class="small">' + esc(tr('O robô não soube o que é. Escolha a categoria e salve.', 'The robot did not know what this is. Pick the category and save.')) + '</span></div>';
      }
      if (g && (g.origem === 'robo' || s)) h += '<p class="lf-falta-txt small" id="lfFalta" role="status" hidden></p>';
      return h;
    },
    /* depois de abrir o formulário */
    ligar: function (g) {
      var inp = $('glSub');
      combo(inp, function () { var arv = Gasto.arvore(), gr = ($('glGrupo') || {}).value; return (arv[gr] || []).slice().sort(function (a, b) { return a.localeCompare(b, 'pt', { sensitivity: 'base' }); }); });
      var pend = g && window.Origem && Origem.pendente(g);
      if (pend) { var r = $('glRev'); if (r) { r.checked = false; var lb = r.closest('label'); if (lb) lb.hidden = true; } }
      if ($('lfFalta')) {
        marcarFaltas();
        var corpo = $('assetModalBody');
        if (corpo && !corpo.dataset.lfOuve) { corpo.dataset.lfOuve = '1'; corpo.addEventListener('input', function () { setTimeout(marcarFaltas, 0); }); corpo.addEventListener('change', function () { setTimeout(marcarFaltas, 0); }); }
      }
    },
    faltas: faltas
  };

  MoneyModulos.registrar({
    id: 'lancamento-form',
    versao: '1.0.0',
    pontos: { 'lancamento.topo': function (ctx) { return API.topo(ctx.g); } },
    acoes: {
      'lf-confirmar': function (el) {
        var id = el.dataset.id, antes = Gasto.todos().find(function (x) { return x.id === id; }); antes = antes && Object.assign({}, antes);
        var g = null;
        if (window.Espelho && Espelho.confirmar) g = Espelho.confirmar(id);
        else { Gasto.atualizar(id, { confianca: undefined, revisar: false, confirmadoEm: new Date().toISOString() }); g = Gasto.todos().find(function (x) { return x.id === id; }); if (g) delete g.confianca; }
        if (!g) return;
        if (window.Origem) Origem.depoisDe(g, antes);
        Store.salvar(); if (typeof fechar === 'function') fechar('assetModal'); render();
        toast(tr('Confirmado: ', 'Confirmed: ') + ((GRUPOS[g.grupo] || {}).nome || g.grupo) + ' › ' + g.sub);
      }
    }
  });
  window.LancForm = API;
})();
