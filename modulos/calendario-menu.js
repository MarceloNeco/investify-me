/* =====================================================================
   modulos/calendario-menu.js — recolher e abrir o calendário do menu   1.2.0 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     O calendário pequeno no pé do menu (BudgetONE; barra lateral no computador, menu ☰ no celular) ganha um
     botão discreto no cabeçalho (seta; ver 1.2.0) que o recolhe numa etiqueta "📅 Novembro de 2026 ⌄".
     Tocar na etiqueta abre de novo. O padrão é aberto; a escolha fica lembrada neste aparelho.
     Acessível: botões de verdade, aria-expanded, aria-controls, foco visível; depois de trocar, o foco vai para
     o botão que aparece no lugar (quem usa teclado não se perde).
     1.1.0 (3.65): abre e fecha com animação de altura (~220 ms, ease) e o chevron gira junto (a seta mostra a ação:
     aberto = para cima, recolher; recolhido = para baixo, abrir). Com "reduzir movimento", troca sem animar. A barra
     lateral recalcula a altura no FIM da animação.
     1.2.0 (3.69): a seta foi invertida, a pedido do dono: o calendário mora no PÉ do menu, então recolher faz o
     cabeçalho descer e abrir faz subir. Aberto: seta para BAIXO ("Recolher o calendário"); recolhido: seta para CIMA
     ("Abrir o calendário").
   API (window.CalendarioMenu)
     recolhido() → true/false · alternar(valor?) · aplicar(elemento #navCal)   (chamado por renderCalendarioMenu)
   DADOS
     Sem coleção: só a preferência da tela, em localStorage 'moneytrio.calMenu.recolhido' = '1' (com try/catch).
   PONTOS QUE USA
     renderCalendarioMenu (index.html) · ResizeObserver da barra lateral (observa o #navCal)
   ===================================================================== */
(function () {
  'use strict';
  var CHAVE = 'moneytrio.calMenu.recolhido';
  function pt() { return I18n.atual !== 'en'; }
  function ler() { try { return localStorage.getItem(CHAVE) === '1'; } catch (e) { return false; } }
  function gravar(v) { try { if (v) localStorage.setItem(CHAVE, '1'); else localStorage.removeItem(CHAVE); } catch (e) {} }
  var SETA_CIMA = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SETA_BAIXO = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICONE = '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false"><rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M2 6.5h12M5.5 1.8v2.4M10.5 1.8v2.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  function rotuloMes() {
    var p = Cal.mesAtual().split('-'), ano = p[0], nome = String(I18n.mesLongo(Number(p[1])));
    nome = nome.charAt(0).toUpperCase() + nome.slice(1);
    return pt() ? nome + ' de ' + ano : nome + ' ' + ano;
  }
  var API = {
    recolhido: ler,
    aplicar: function (alvo) {
      if (!alvo || !alvo.firstChild) return;
      if (ler()) {
        alvo.innerHTML = '<button type="button" class="calm-etq" data-calmenu="abrir" aria-expanded="false" aria-controls="navCal" title="' +
          (pt() ? 'Abrir o calendário' : 'Open the calendar') + '" aria-label="' + (pt() ? 'Abrir o calendário' : 'Open the calendar') + ' — ' + esc(rotuloMes()) + '">' + ICONE + '<span class="calm-mes">' + esc(rotuloMes()) + '</span>' + SETA_CIMA + '</button>';
        return;
      }
      var topo = alvo.querySelector('.cal-topo'); if (!topo) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'calm-rec'; b.setAttribute('data-calmenu', 'recolher');
      b.setAttribute('aria-expanded', 'true'); b.setAttribute('aria-controls', 'navCal');
      b.setAttribute('aria-label', pt() ? 'Recolher o calendário' : 'Collapse the calendar');
      b.title = b.getAttribute('aria-label'); b.innerHTML = SETA_BAIXO;
      topo.appendChild(b);
    },
    alternar: function (v) {
      var cal = document.getElementById('navCal'), antes = cal ? cal.getBoundingClientRect().height : 0;
      var fecha = v === undefined ? !ler() : !!v;
      gravar(fecha);
      if (typeof renderCalendarioMenu === 'function') renderCalendarioMenu();
      var fim = function () { if (typeof pedirLateral === 'function') pedirLateral(); };
      var calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!cal || calmo || !cal.animate || !antes) return fim();
      var depois = cal.getBoundingClientRect().height;
      var seta = cal.querySelector('[data-calmenu] svg');
      if (seta && seta.animate) seta.animate([{ transform: 'rotate(180deg)' }, { transform: 'rotate(0deg)' }], { duration: 220, easing: 'ease' });
      var a = cal.animate([{ height: antes + 'px', overflow: 'hidden' }, { height: depois + 'px', overflow: 'hidden' }], { duration: 220, easing: 'ease' });
      a.onfinish = fim; a.oncancel = fim;
    }
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-calmenu]'); if (!b) return;
    API.alternar(b.getAttribute('data-calmenu') === 'recolher');
    var novo = document.querySelector('#navCal [data-calmenu]');
    if (novo) novo.focus({ preventScroll: true });   /* o botão foi redesenhado: o foco vai para o que ficou no lugar, sem pular a página */
  });

  MoneyModulos.registrar({ id: 'calendario-menu', versao: '1.2.0' });
  window.CalendarioMenu = API;
})();
