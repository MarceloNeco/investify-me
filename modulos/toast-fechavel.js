/* =====================================================================
   modulos/toast-fechavel.js — os avisos rápidos (toast) que dá para tirar da frente   1.0.0 · 24/Nov/2026 (3.106)
   ---------------------------------------------------------------------
   O QUE FAZ (dono, pelo celular: "os toasts tampam a tela por alguns segundos e não dá para tirar")
     · fechavel(el, fechar): tocar fecha; arrastar para o lado fecha (pointer events, ~60 px, com animação de saída); um ✕ visível de
       44 px. Usado pelo toast() do index.html e pelo aviso() do nuvem.js. No celular os toasts ficam no topo, abaixo da barra (estilo.css).
     · pular(msg): o toast que se repete a cada abertura não insiste. "N ativos da B3 precisam do token gratuito" sai no máximo 1 vez por
       dia por aparelho (dgo:moneytrio:toast:b3-token:dia) e fica como item no 📥 (Avisos) com "Resolver" (Configurações → Chaves).
     · Diretriz "Avisos passageiros": toast(texto, {tipo, id, acao, diario}) no index.html (troca fácil pelo DGO.toast do master, #155);
       "reduzir movimento" = sem animação de arraste; role "alert" só no urgente; o toast com id tem tópico no AssistONE (topico/topicos).
   API (window.Toque)
     fechavel(el, fechar) · pular(msg, op) → true quando o toast não deve aparecer agora · topico(id, {t, x, acao}) · topicos()
   ===================================================================== */
(function () {
  'use strict';
  var b3 = 0, topicos = {};
  function chaveDia(id) { return 'dgo:moneytrio:toast:' + id + ':dia'; }   /* diretriz "Avisos passageiros" */
  function calmo() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
  function tr(pt, en, es) { return typeof I18n !== 'undefined' ? I18n.tr(pt, en, es) : pt; }
  function hoje() { return typeof hojeISO === 'function' ? hojeISO() : new Date().toISOString().slice(0, 10); }

  /* o mesmo elemento pode ser reaproveitado (o aviso do nuvem.js): o ✕ volta a cada texto novo; os gestos entram uma vez só */
  function fechavel(el, fechar) {
    if (!el) return;
    el._fecharFn = fechar;
    var sair = function (dx) {
      if (calmo()) { if (el._fecharFn) el._fecharFn(); return; }   /* "reduzir movimento": fecha sem animação */
      el.style.transition = 'transform .2s ease, opacity .2s ease'; el.style.transform = 'translateX(' + (dx < 0 ? -120 : 120) + '%)'; el.style.opacity = '0';
      setTimeout(function () { el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; if (el._fecharFn) el._fecharFn(); }, 200);
    };
    if (!el.querySelector(':scope > .toast-x')) {
      var x = document.createElement('button');
      x.type = 'button'; x.className = 'toast-x'; x.textContent = '✕'; x.setAttribute('aria-label', tr('Fechar o aviso', 'Close the notice', 'Cerrar el aviso'));
      x.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      x.addEventListener('click', function (e) { e.stopPropagation(); sair(1); });
      el.appendChild(x);
    }
    if (el._gestos) return; el._gestos = true;
    var ini = null, movido = false;
    el.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('button, a, input, select, textarea')) { ini = null; return; }   /* botão dentro do aviso (↩ Desfazer) continua botão */
      ini = e.clientX; movido = false; try { el.setPointerCapture(e.pointerId); } catch (er) { /* sem captura */ }
    });
    el.addEventListener('pointermove', function (e) { if (ini == null) return; var dx = e.clientX - ini; if (Math.abs(dx) > 4) movido = true; if (calmo()) return; el.style.transform = 'translateX(' + dx + 'px)'; el.style.opacity = String(Math.max(0.2, 1 - Math.abs(dx) / 200)); });
    el.addEventListener('pointerup', function (e) {
      if (ini == null) return; var dx = e.clientX - ini; ini = null;
      if (Math.abs(dx) >= 60) return sair(dx);
      el.style.transform = ''; el.style.opacity = '';
      if (!movido) sair(1);   /* toque simples fecha */
    });
    el.addEventListener('pointercancel', function () { ini = null; el.style.transform = ''; el.style.opacity = ''; });
  }

  /* o toast com id ganha um tópico no AssistONE; com diario, sai no máximo 1 vez por dia neste aparelho */
  function topico(id, t) { if (id && t) topicos[id] = t; }
  function pular(msg, op) {
    op = op || {};
    var m = /(\d+) ativos da B3 precisam do token gratuito/.exec(String(msg || ''));
    if (m) {
      op = { id: 'b3-token', diario: true };
      var mudou = b3 !== +m[1]; b3 = +m[1];
      if (mudou && typeof renderInboxN === 'function') try { renderInboxN(); } catch (e) { /* sem 📥 ainda */ }
    }
    if (op.id && !topicos[op.id]) topico(op.id, { t: String(msg).slice(0, 90), x: '' });
    if (!op.id || !op.diario) return false;
    var ja = ''; try { ja = localStorage.getItem(chaveDia(op.id)) || ''; } catch (e) { /* sem armazenamento */ }
    if (ja === hoje()) return true;
    try { localStorage.setItem(chaveDia(op.id), hoje()); } catch (e) { /* sem armazenamento */ }
    return false;
  }
  topico('b3-token', { t: tr('Token gratuito da B3 (cotações das ações brasileiras)', 'Free B3 token (Brazilian stock quotes)', 'Token gratuito de la B3 (cotizaciones de acciones brasileñas)'),
    x: tr('Sem ele, a cotação dos ativos da B3 não atualiza. Configurações → Chaves: é de graça e leva 2 minutos.', 'Without it, B3 asset quotes do not update. Settings → Keys: free, takes 2 minutes.', 'Sin él, la cotización de los activos de la B3 no se actualiza. Ajustes → Claves: es gratis y lleva 2 minutos.'), acao: 'as-chaves' });

  MoneyModulos.registrar({
    id: 'toast-fechavel', versao: '1.0.0', colecoes: [], telas: {}, ouvir: {}, acoes: {},
    pontos: {
      'inbox.grupos': function () {
        if (!b3) return [];
        return [{ id: 'avisos', n: 1, html: '<li class="inb-item" id="inbB3"><div><b>🔑 ' + tr(b3 + ' ativos da B3 precisam do token gratuito', b3 + ' B3 assets need the free token', b3 + ' activos de la B3 necesitan el token gratuito') + '</b>' +
          '<span class="t-sub">' + tr('Sem ele, a cotação desses ativos não atualiza. É de graça e leva 2 minutos.', 'Without it, these assets\' quotes do not update. It is free and takes 2 minutes.', 'Sin él, la cotización de esos activos no se actualiza. Es gratis y lleva 2 minutos.') + '</span></div>' +
          '<span class="inb-acoes"><button class="btn sm primary" data-acao="as-chaves">' + tr('Resolver', 'Fix it', 'Resolver') + '</button></span></li>' }];
      }
    }
  });
  window.Toque = { fechavel: fechavel, pular: pular, topico: topico, topicos: function () { return topicos; }, _b3: function () { return b3; } };
})();
