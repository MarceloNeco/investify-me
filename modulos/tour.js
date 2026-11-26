/* =====================================================================
   modulos/tour.js — o passeio de verdade, com spotlight (3.65)        1.1.0 · 26/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     O tutorial deixou de ser uma janela no meio da tela. Cada passo leva o balão até o elemento de verdade:
     escurece o resto, recorta o alvo e põe uma seta apontando para ele. O balão se MOVE de um alvo para o outro
     com animação; alvo fora da tela → rola até ele; no celular, o balão fica acima ou abaixo do alvo, sem cobrir.
     Teclado: → próximo, ← anterior, Esc pula; o foco fica preso no balão. Botões Pular, Anterior e Próximo.
     Passo sem a peça à vista é pulado ao começar (1.1.0); se a peça sumir no meio do passeio, o balão fica no meio só
     naquele passo. "Reduzir movimento": sem animação. Enquanto o passeio está aberto, a tela de trás não rola (html:has(.tour), estilo.css).
   PASSEIOS (1.1.0: um por tela; passo sem a peça à vista é pulado ao começar)
     Início: BudgetONE · InvestifyONE · FiscalONE · ir e voltar · conta · AssistONE
     Módulo: menu · trocar de módulo · (só no BudgetONE: Painel · Lançamentos · Contas fixas) · conta · AssistONE
   API (window.Tour)
     iniciar(passo?) · ir(i) · proximo() · anterior() · fechar(fim) · aberto() · atual() · TOURS · PASSOS (todos os textos)
   PONTOS QUE USA
     Assist.abrir('tutorial') (index.html) chama Tour.iniciar(); Assist.marcarTutorial() no fim ou ao pular
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function visivel(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return r.width > 4 && r.height > 4 && r.right > 0 && r.left < innerWidth && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('.hidden,[hidden]');
  }
  /* alvo: lista de seletores em ordem de preferência (ex.: no computador o menu lateral; no celular o ☰) */
  function primeiro(sels) {
    sels = Array.isArray(sels) ? sels : [sels];
    for (var k = 0; k < sels.length; k++) { var l = document.querySelectorAll(sels[k]); for (var i = 0; i < l.length; i++) if (visivel(l[i])) return l[i]; }
    return null;
  }
  function calmo() { return (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.classList.contains('sem-animacao'); }

  /* 1.1.0 (3.108, pedido do dono, 26/Nov/2026): UM PASSEIO POR TELA. Antes era a mesma lista de 6 passos em todo lugar,
     e na tela Início (onde não existem menu, Painel nem Lançamentos) o balão ficava solto no meio, sem escurecer nada.
     Agora: Início → os três cartões, como ir e voltar entre eles, a conta e o AssistONE; dentro de um módulo → o menu,
     a troca de módulo pelo nome no topo e os passos daquele módulo (app: 'budget' = só no BudgetONE). Passo cuja peça
     não está na tela é PULADO ao começar (nunca mais balão solto falando do que não existe). */
  var TOURS = {
    inicio: [
      { alvo: ['.hub-card[data-app="budget"]'], ico: '🧮',
        pt: { t: 'BudgetONE', x: 'O orçamento da casa: o que entra, o que sai e as contas que vêm pela frente. Toque no cartão para entrar.' },
        en: { t: 'BudgetONE', x: 'The household budget: what comes in, what goes out and the bills ahead. Tap the card to open it.' } },
      { alvo: ['.hub-card[data-app="investify"]'], ico: '📈',
        pt: { t: 'InvestifyONE', x: 'Os investimentos, no Brasil e no exterior: quanto rendeu de verdade e para onde vai o próximo aporte.' },
        en: { t: 'InvestifyONE', x: 'Your investments, in Brazil and abroad: what they really returned and where the next contribution goes.' } },
      { alvo: ['.hub-card[data-app="tax"]'], ico: '🧾',
        pt: { t: 'FiscalONE', x: 'O imposto de renda e a PJ, aproveitando o que o BudgetONE e o InvestifyONE já registraram.' },
        en: { t: 'FiscalONE', x: 'Income tax and your company, using what BudgetONE and InvestifyONE already recorded.' } },
      { alvo: ['.hub-topo'], ico: '🔁',
        pt: { t: 'Ir e voltar', x: 'É o mesmo dinheiro visto de três jeitos. Lá dentro, toque no nome do app no topo (com ▾) para voltar a este Início ou trocar de módulo. Nada se perde na troca.' },
        en: { t: 'Going back and forth', x: 'It is the same money seen three ways. Inside, tap the app name at the top (with ▾) to come back to this Home or switch modules. Nothing is lost when you switch.' } },
      { alvo: ['#nvSelo'], ico: '👤',
        pt: { t: 'Sua conta', x: 'Toque aqui para ver a sua conta e onde os seus dados estão guardados.' },
        en: { t: 'Your account', x: 'Tap here to see your account and where your data is kept.' } },
      { alvo: ['#assistOne'], ico: '💡',
        pt: { t: 'O AssistONE', x: 'Na dúvida, toque no AssistONE: ele explica a tela em que você está e refaz este passeio quando você quiser.' },
        en: { t: 'AssistONE', x: 'When in doubt, tap AssistONE: it explains the screen you are on and runs this tour again whenever you like.' } }
    ],
    app: [
      { alvo: ['#sidenav #navLista', '#btnMenu'], ico: '☰',
        pt: { t: 'O menu', x: 'Pelo menu você chega a todas as telas deste módulo; no celular, ele abre no ☰.' },
        en: { t: 'The menu', x: 'The menu takes you to every screen in this module; on a phone it opens from ☰.' } },
      { alvo: ['#btnMarca'], ico: '🔁',
        pt: { t: 'Trocar de módulo', x: 'Toque no nome do app para voltar ao Início ou ir direto para BudgetONE, InvestifyONE ou FiscalONE.' },
        en: { t: 'Switch modules', x: 'Tap the app name to go back to Home or jump straight to BudgetONE, InvestifyONE or FiscalONE.' } },
      { app: 'budget', alvo: ['#sidenav .nav-item[data-view="b-painel"]', '.tabbar .tab[data-view="b-painel"]', '.kpis'], ico: '📊',
        pt: { t: 'O Painel', x: 'O resumo: o que entrou, o que saiu, quanto sobrou e os indicadores do mês. Todo número com ⓘ tem explicação, no nível que você escolher.' },
        en: { t: 'The Dashboard', x: 'The summary: what came in, what went out, what was left and this month\'s indicators. Every number with an ⓘ has an explanation, at the level you choose.' } },
      { app: 'budget', alvo: ['#sidenav .nav-item[data-view="b-lanc"]', '.tabbar .tab[data-view="b-lanc"]', '#sidenav .nav-item[data-view="movimentos"]', '.tabbar .tab[data-view="movimentos"]'], ico: '🧾',
        pt: { t: 'Lançamentos', x: 'Cada gasto e cada entrada. Importe o extrato, escaneie a nota ou lance à mão; o robô do banco também lança aqui.' },
        en: { t: 'Entries', x: 'Every expense and every income. Import the statement, scan the receipt or type it in; the bank robot adds entries here too.' } },
      { app: 'budget', alvo: ['#sidenav .nav-item[data-view="b-custos"]', '.tabbar .tab[data-view="b-custos"]', '#sidenav #navLista', '#btnMenu'], ico: '📌',   /* 3.74 */
        pt: { t: 'Contas fixas', x: 'As contas fixas e os gastos que se repetem (aluguel, escola, assinaturas), com o dia de cada uma e o aviso antes de vencer. Fica no menu como "Contas fixas".' },
        en: { t: 'Fixed bills', x: 'Fixed bills and recurring expenses (rent, school, subscriptions), with each one\'s day and a reminder before it is due. It is in the menu as "Fixed bills".' } },
      { alvo: ['#btnPerfil', '#nvSelo'], ico: '👤',
        pt: { t: 'Sua conta', x: 'Aqui ficam a sua conta e as Configurações.' },
        en: { t: 'Your account', x: 'Your account and Settings live here.' } },
      { alvo: ['#assistOne'], ico: '💡',
        pt: { t: 'O AssistONE', x: 'Na dúvida, toque no AssistONE: ele explica a tela em que você está e refaz este passeio quando você quiser.' },
        en: { t: 'AssistONE', x: 'When in doubt, tap AssistONE: it explains the screen you are on and runs this tour again whenever you like.' } }
    ]
  };
  /* todos os textos juntos (os testes de nomes e de tradução leem Tour.PASSOS) */
  var TODOS = TOURS.inicio.concat(TOURS.app);
  /* qual passeio vale agora: o do Início quando ele está aberto; senão, o do módulo */
  function qualTour() {
    var hub = document.getElementById('hubTela');
    return hub && !hub.classList.contains('hidden') ? 'inicio' : 'app';
  }
  function appAtual() { try { return (typeof ST !== 'undefined' && ST.appAtual) || 'budget'; } catch (e) { return 'budget'; } }
  /* os passos desta tela que têm a peça à vista (os outros são pulados); se nenhum tiver, fica o último, no meio */
  function montarLista() {
    var tour = TOURS[qualTour()], app = appAtual();
    var l = tour.filter(function (p) { return (!p.app || p.app === app) && !!primeiro(p.alvo); });
    return l.length ? l : [tour[tour.length - 1]];
  }
  var PASSOS = [];

  var raiz = null, furo = null, balao = null, seta = null, passo = 0, alvoAtual = null, quadro = 0, antesFoco = null;

  function montar() {
    raiz = document.createElement('div');
    raiz.className = 'tour'; raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-labelledby', 'tourTit');
    raiz.innerHTML = '<div class="tour-furo"></div><div class="tour-balao" tabindex="-1"><span class="tour-seta" aria-hidden="true"></span><div class="tour-corpo"></div></div>';
    document.body.appendChild(raiz);
    furo = raiz.querySelector('.tour-furo'); balao = raiz.querySelector('.tour-balao'); seta = raiz.querySelector('.tour-seta');
    if (calmo()) raiz.classList.add('calmo');
    raiz.addEventListener('click', function (e) {
      var b = e.target.closest('[data-tour]'); if (!b) return;
      var a = b.getAttribute('data-tour');
      if (a === 'prox') API.proximo(); else if (a === 'ant') API.anterior(); else if (a === 'pular') API.fechar(false); else if (a === 'fim') API.fechar(true);
    });
    document.addEventListener('keydown', teclas, true);
    window.addEventListener('resize', pedir); window.addEventListener('scroll', pedir, true);
  }
  function teclas(e) {
    if (!raiz) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); API.fechar(false); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); API.proximo(); return; }
    if (e.key === 'ArrowLeft') { e.preventDefault(); API.anterior(); return; }
    if (e.key === 'Tab') {   /* o foco fica preso no balão */
      var f = balao.querySelectorAll('button'); if (!f.length) return;
      var i = Array.prototype.indexOf.call(f, document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  }
  function pedir() { if (!quadro) quadro = requestAnimationFrame(function () { quadro = 0; posicionar(); }); }

  function desenhar() {
    var p = PASSOS[passo], L = pt() ? 'pt' : 'en', x = p[L], ultimo = passo === PASSOS.length - 1;
    var de = function (a, b) { return pt() ? a : b; };
    balao.querySelector('.tour-corpo').innerHTML =
      '<div class="tour-cab"><span class="tour-ico" aria-hidden="true">' + p.ico + '</span><h3 id="tourTit">' + esc(x.t) + '</h3>' +
      '<span class="tour-n">' + (passo + 1) + ' / ' + PASSOS.length + '</span></div><p>' + esc(x.x) + '</p>' +
      '<div class="tour-acoes"><button type="button" class="btn sm" data-tour="pular">' + de('Pular', 'Skip') + '</button><span class="row" style="gap:6px">' +
      (passo > 0 ? '<button type="button" class="btn sm" data-tour="ant">' + de('Anterior', 'Previous') + '</button>' : '') +
      '<button type="button" class="btn sm primary" data-tour="' + (ultimo ? 'fim' : 'prox') + '">' + (ultimo ? de('Começar a usar', 'Start using') : de('Próximo', 'Next')) + '</button></span></div>';
    alvoAtual = primeiro(p.alvo);
    raiz.classList.toggle('sem-alvo', !alvoAtual);
    if (alvoAtual) {
      var r = alvoAtual.getBoundingClientRect();
      if (r.top < 70 || r.bottom > innerHeight - 20) alvoAtual.scrollIntoView({ block: 'center', behavior: calmo() ? 'auto' : 'smooth' });
    }
    posicionar();
    var bt = balao.querySelector('[data-tour="prox"],[data-tour="fim"]'); if (bt) bt.focus({ preventScroll: true });
  }

  function posicionar() {
    if (!raiz) return;
    var W = innerWidth, H = innerHeight, M = 16, folga = 8;
    if (!alvoAtual || !visivel(alvoAtual)) {
      furo.style.cssText = 'opacity:0;left:' + (W / 2) + 'px;top:' + (H / 2) + 'px;width:0;height:0';
      var bw = Math.min(420, W - 2 * M);
      balao.style.width = bw + 'px';
      balao.style.left = Math.round((W - bw) / 2) + 'px'; balao.style.top = Math.round((H - balao.offsetHeight) / 2) + 'px';
      seta.style.display = 'none';
      return;
    }
    var r = alvoAtual.getBoundingClientRect();
    furo.style.cssText = 'opacity:1;left:' + Math.round(r.left - folga) + 'px;top:' + Math.round(r.top - folga) + 'px;width:' + Math.round(r.width + 2 * folga) + 'px;height:' + Math.round(r.height + 2 * folga) + 'px';
    var w = Math.min(380, W - 2 * M); balao.style.width = w + 'px';
    var bh = balao.offsetHeight, gap = 18;
    var abaixo = H - r.bottom - folga, acima = r.top - folga, lado = W - r.right - folga;
    var top, left, dir;
    /* no computador, alvo estreito na esquerda (menu): o balão vai ao lado; senão, acima ou abaixo (o lado com mais espaço) */
    if (W > 760 && lado >= w + gap + M && r.width < W * 0.4) {
      dir = 'esq'; left = r.right + folga + gap; top = Math.min(Math.max(M, r.top + r.height / 2 - bh / 2), H - bh - M);
    } else if (abaixo >= bh + gap + M || abaixo >= acima) {
      dir = 'cima'; top = Math.min(r.bottom + folga + gap, H - bh - M); left = Math.min(Math.max(M, r.left + r.width / 2 - w / 2), W - w - M);
    } else {
      dir = 'baixo'; top = Math.max(M, r.top - folga - gap - bh); left = Math.min(Math.max(M, r.left + r.width / 2 - w / 2), W - w - M);
    }
    balao.style.left = Math.round(left) + 'px'; balao.style.top = Math.round(top) + 'px';
    seta.style.display = ''; seta.className = 'tour-seta ' + dir;
    if (dir === 'esq') { seta.style.left = '-7px'; seta.style.top = Math.round(Math.min(Math.max(14, r.top + r.height / 2 - top - 7), bh - 28)) + 'px'; }
    else { seta.style.top = dir === 'cima' ? '-7px' : (bh - 7) + 'px'; seta.style.left = Math.round(Math.min(Math.max(14, r.left + r.width / 2 - left - 7), w - 28)) + 'px'; }
  }

  var qual = '';
  var API = {
    PASSOS: TODOS,
    TOURS: TOURS,
    /* o passeio aberto agora: qual ('inicio' ou 'app') e os passos que entraram */
    atual: function () { return { qual: qual, passos: PASSOS.slice() }; },
    aberto: function () { return !!raiz; },
    iniciar: function (i) {
      if (raiz) API.fechar(null);
      antesFoco = document.activeElement;
      if (typeof fecharPerfilMenu === 'function') fecharPerfilMenu();
      try { if (typeof AssistOne !== 'undefined' && AssistOne.fechar) AssistOne.fechar(); } catch (e) {}   /* o balão de "Olá" não fica atrás do passeio */
      PASSOS = montarLista(); qual = qualTour();
      montar(); passo = Math.max(0, Math.min(PASSOS.length - 1, i || 0)); desenhar();
    },
    ir: function (i) { if (!raiz) return; passo = Math.max(0, Math.min(PASSOS.length - 1, i)); desenhar(); },
    proximo: function () { if (passo < PASSOS.length - 1) API.ir(passo + 1); else API.fechar(true); },
    anterior: function () { if (passo > 0) API.ir(passo - 1); },
    /* fim = true: terminou; false: pulou; null: só fecha (vai abrir de novo) */
    fechar: function (fim) {
      if (!raiz) return;
      document.removeEventListener('keydown', teclas, true);
      window.removeEventListener('resize', pedir); window.removeEventListener('scroll', pedir, true);
      raiz.parentNode.removeChild(raiz); raiz = furo = balao = seta = alvoAtual = null;
      if (fim === null) return;
      if (typeof Assist !== 'undefined' && Assist.marcarTutorial) Assist.marcarTutorial();
      if (fim && typeof toast === 'function') toast(pt() ? 'Quando precisar, o AssistONE no canto da tela abre a ajuda de novo.' : 'Whenever you need it, AssistONE in the corner opens help again.');
      if (antesFoco && antesFoco.focus && document.contains(antesFoco)) antesFoco.focus({ preventScroll: true });
    }
  };

  MoneyModulos.registrar({ id: 'tour', versao: '1.1.0' });
  window.Tour = API;
})();
