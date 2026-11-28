/* =====================================================================
   modulos/folha-editar.js — FOLHA DE EDIÇÃO: todo "editar" em tela própria (3.144)        1.0.1 · 28/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (dono, 28/Nov/2026, pelo celular: "o editar abre no meio da lista e eu me perco na tela")
     · Abre o formulário numa folha por cima de tudo: no celular ocupa a tela inteira; no tablet e no computador é um painel no meio.
       Uma faixa colorida no topo diz "Editando" (fundo e cor diferentes da lista), e a lista atrás fica bloqueada (sem rolar nem tocar).
     · [Cancelar] e [Salvar] ficam fixos embaixo. Os dois fecham a folha e a lista volta exatamente para o ponto onde estava.
     · O Voltar do celular (e o Esc) = Cancelar. Se algo foi mudado e não salvo, pergunta antes ("Sair sem salvar?").
     · Foco dentro da folha (Tab não sai dela); ao fechar, o foco volta ao botão que abriu.
     · É o padrão para todo "editar" do app. Na 3.144 entra em Pessoas (modulos/pessoas.js); os outros (contas, cartões, contas fixas…)
       ficam listados no PENDENCIAS.md para as próximas versões.
     · 1.0.1 (3.144): a folha fica acima do selo "Entrar na nuvem" (9990) e abaixo do passeio (9995).
   API (window.Folha)
     abrir({titulo, html, salvar(), cancelar?(), depois?()}) → abre; salvar() devolve false (ou lança erro) para continuar aberta
     fechar() · aberta() → true | false · mudou() → true se algum campo foi mudado desde que abriu
   ===================================================================== */
(function () {
  'use strict';
  function tr(pt, en, es) { return typeof I18n !== 'undefined' && I18n.tr ? I18n.tr(pt, en, es) : pt; }
  function css() {
    if (document.getElementById('folhaCss')) return;
    var s = document.createElement('style'); s.id = 'folhaCss';
    s.textContent =
      'body.folha-travada{overflow:hidden}' +
      '.folha-fundo{position:fixed;inset:0;z-index:9992;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center}' +
      '.folha{display:flex;flex-direction:column;background:var(--bg2,var(--card,#1b2330));color:inherit;width:min(680px,94vw);max-height:90vh;' +
        'border-radius:16px;border:2px solid var(--accent,#3fb68b);box-shadow:0 18px 50px rgba(0,0,0,.45);overflow:hidden}' +
      '.folha-topo{display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--accent,#3fb68b);color:#06140e}' +
      '.folha-topo .folha-selo{font-size:12px;font-weight:700;text-transform:none;background:rgba(255,255,255,.35);border-radius:999px;padding:2px 10px}' +
      '.folha-topo h2{font-size:17px;margin:0;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.folha-corpo{flex:1;overflow:auto;padding:16px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}' +
      '.folha-corpo .card{background:transparent;border:0;box-shadow:none;padding:0;margin:0}' +
      '.folha-pe{display:flex;gap:10px;justify-content:flex-end;padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid rgba(127,127,127,.25);background:inherit}' +
      '.folha-pe .btn{min-height:44px;min-width:120px}' +
      '@media (max-width:700px){.folha-fundo{align-items:stretch}.folha{width:100vw;max-height:none;height:100%;border-radius:0;border-width:0 0 0 0;border-top:4px solid var(--accent,#3fb68b)}' +
        '.folha-pe .btn{flex:1;min-width:0}}';
    document.head.appendChild(s);
  }
  var atual = null;
  function valores(el) {
    return [].slice.call(el.querySelectorAll('input, select, textarea')).map(function (c) { return c.id + '=' + (c.type === 'checkbox' || c.type === 'radio' ? c.checked : c.value); }).join('\n');
  }
  function fechar(op) {
    var a = atual; if (!a) return;
    atual = null;
    document.removeEventListener('keydown', a.tecla, true); window.removeEventListener('popstate', a.voltar);
    a.el.remove(); document.body.classList.remove('folha-travada');
    if (a.empurrou && !(op && op.doVoltar) && history.state && history.state.folha) { a.saindo = true; try { history.back(); } catch (e) { /* sem histórico */ } }
    window.scrollTo(0, a.rolagem);   /* a lista volta ao mesmo ponto; o "depois" pode ainda ir até o que foi salvo */
    if (a.depois) try { a.depois(); } catch (e) { console.warn('folha: depois', e); }
    if (a.antes && a.antes.isConnected && a.antes.focus) try { a.antes.focus({ preventScroll: true }); } catch (e) { /* sem foco */ }
  }
  function cancelar(op) {
    var a = atual; if (!a) return;
    if (API.mudou() && !confirm(tr('Sair sem salvar? O que você mudou se perde.', 'Leave without saving? Your changes will be lost.', '¿Salir sin guardar? Lo que cambiaste se pierde.'))) {
      if (op && op.doVoltar) { try { history.pushState({ folha: 1 }, ''); a.empurrou = true; } catch (e) { /* sem histórico */ } }
      return;
    }
    if (a.cancelar) try { a.cancelar(); } catch (e) { console.warn('folha: cancelar', e); }
    fechar(op);
  }
  function salvar() {
    var a = atual; if (!a) return;
    var r; try { r = a.salvar(); } catch (e) { if (typeof toast === 'function') toast(e.message, 'warn'); return; }
    if (r === false) return;
    fechar();
  }
  var API = {
    aberta: function () { return !!atual; },
    mudou: function () { return !!atual && valores(atual.el) !== atual.inicio; },
    fechar: function () { fechar(); },
    abrir: function (o) {
      if (atual) fechar();
      css();
      var el = document.createElement('div'); el.className = 'folha-fundo'; el.id = 'folhaEditar';
      el.innerHTML = '<div class="folha" role="dialog" aria-modal="true" aria-labelledby="folhaTit">' +
        '<div class="folha-topo"><span class="folha-selo">✏️ ' + esc(tr('Editando', 'Editing', 'Editando')) + '</span><h2 id="folhaTit">' + esc(o.titulo || '') + '</h2></div>' +
        '<div class="folha-corpo">' + (typeof Verter !== 'undefined' && Verter.html ? Verter.html(o.html || '') : (o.html || '')) + '</div>' +
        '<div class="folha-pe"><button type="button" class="btn" id="folhaCancelar">' + esc(tr('Cancelar', 'Cancel', 'Cancelar')) + '</button>' +
        '<button type="button" class="btn primary" id="folhaSalvar">' + esc(tr('Salvar', 'Save', 'Guardar')) + '</button></div></div>';
      var a = atual = { el: el, salvar: o.salvar, cancelar: o.cancelar, depois: o.depois, rolagem: window.scrollY || 0, antes: document.activeElement };
      document.body.appendChild(el); document.body.classList.add('folha-travada');
      a.inicio = valores(el);
      el.querySelector('#folhaCancelar').onclick = function () { cancelar(); };
      el.querySelector('#folhaSalvar').onclick = salvar;
      el.addEventListener('click', function (e) { if (e.target === el) cancelar(); });
      a.tecla = function (e) {
        if (e.key === 'Escape') { e.preventDefault(); return cancelar(); }
        if (e.key !== 'Tab') return;
        var f = [].slice.call(el.querySelectorAll('button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea, a[href], summary')).filter(function (x) { return x.offsetParent !== null; });
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      };
      document.addEventListener('keydown', a.tecla, true);
      /* o Voltar do celular = Cancelar (e não sai da tela) */
      try { history.pushState({ folha: 1 }, ''); a.empurrou = true; } catch (e) { /* sem histórico */ }
      a.voltar = function () { if (a.saindo || atual !== a) return; a.empurrou = false; cancelar({ doVoltar: true }); };
      window.addEventListener('popstate', a.voltar);
      setTimeout(function () { var p = el.querySelector(o.foco || '.folha-corpo input:not([disabled]), .folha-corpo select:not([disabled])'); if (p && p.focus) p.focus({ preventScroll: true }); }, 30);
      return el;
    }
  };
  window.Folha = API;
})();
