/* =====================================================================
   assistone-visual.js — o visual novo do AssistONE (personagem + painel)       1.1.2 · 26/Nov/2026
   MASTER no repositório privado MarceloNeco/assist-one (balao/visual/). Nos apps, a pasta
   assistone/ é uma CÓPIA IDÊNTICA: nunca editar a cópia; mudar aqui, testar e copiar.
   Desenho aprovado pelo dono (Claude Design, 26/Nov/2026, decisões D-A15 e de 26/11):
   docs/desenho-pacote/ESPECIFICACAO.md. JS puro, sem biblioteca, sem rede (funciona sem internet).
   Precisa de assistone-visual.css (mesma pasta, com img/ e fontes/).
   Partes: 1) o personagem (assistone-personagem.js do pacote, com 2 ajustes marcados "AssistONE 1.0.0");
           2) o painel com o menu (AssistOneVisual) e, desde a 1.1.0, a conversa (v.conversa: escrevendo, três pontinhos,
              resposta com "Isso responde?" Sim/Não).
   Quem liga e desliga continua sendo o RootifyONE (data-recurso="assistone" e os interruptores do app).
   ===================================================================== */

/* ---------------------------------------------------------------------
   1) O PERSONAGEM (AssistOneCharacter)
   --------------------------------------------------------------------- */
/* AssistONE - controle do personagem (JS puro, sem biblioteca).
   Uso:  const ao = AssistOneCharacter.mount(document.getElementById('ao'), { label: 'AssistONE', onToggle(open){...} });
   - clique/toque no personagem: cresce (1,4x) e vira de frente;  clique de novo, clique fora ou Esc: encolhe e volta a olhar de lado.
   - computador (mouse): passar o mouse inclina e acende o brilho. Celular: nao existe.
   - "menos movimento" e aba escondida sao tratados aqui e no CSS. */
(function (global) {
  'use strict';
  var mqReduce = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var mqMouse = global.matchMedia ? global.matchMedia('(hover: hover) and (pointer: fine)') : null;
  function reduced() { return !!(mqReduce && mqReduce.matches) || document.documentElement.classList.contains('sem-animacao'); }  // AssistONE 1.0.0: + a opção "menos movimento" do próprio app

  // pausa as animacoes quando a aba esta escondida (o CSS le data-hidden="1")
  var visBound = false;
  function bindVisibility() {
    if (visBound) return; visBound = true;
    var set = function () { document.documentElement.setAttribute('data-hidden', document.hidden ? '1' : '0'); };
    document.addEventListener('visibilitychange', set); set();
  }

  function markup(label) {
    var lay = ''; for (var k = 0; k < 8; k++) lay += '<div class="ao-lay ao-l' + k + '"></div>';
    return '' +
      '<button class="ao-btn" type="button" aria-pressed="false" aria-label="' + label + '">' +
        '<div class="ao-bob"><div class="ao-grow"><div style="perspective:700px"><div class="ao-tilt">' +
          '<div class="ao-cw"><div class="ao-dsk ao-ring"></div>' +
            '<div class="ao-fg ao-idle">' + lay + '<div class="ao-flip"></div>' +
              '<div class="ao-fib" aria-hidden="true"><div class="ao-sp ao-s0"></div><div class="ao-sp ao-s1"></div><div class="ao-sp ao-s2"></div>' +
              '<div class="ao-sp ao-s1 ao-lf"></div><div class="ao-sp ao-s2 ao-lf"></div></div>' +
            '</div></div>' +
        '</div></div></div></div>' +
        '<div class="ao-shadow"></div>' +
      '</button>';
  }

  function mount(root, opts) {
    opts = opts || {};
    bindVisibility();
    root.classList.add('ao-root');
    root.innerHTML = markup(opts.label || 'AssistONE');
    var btn = root.querySelector('.ao-btn');
    var fg = root.querySelector('.ao-fg');
    var tilt = root.querySelector('.ao-tilt');
    var big = false;
    // AssistONE 1.0.0: o app pode abrir o personagem DENTRO de um clique (um item de menu do app, por exemplo); esse mesmo
    // clique chega depois ao "clique fora" e fecharia na hora. Guardamos o evento que abriu para não fechar com ele.
    var abriuNo = null;

    function setDir(cls) { fg.className = 'ao-fg ' + cls; }
    function open() {
      if (big) return; big = true;
      abriuNo = global.event || null;
      root.classList.add('ao-big'); btn.setAttribute('aria-pressed', 'true');
      setDir(reduced() ? 'ao-fwr' : 'ao-fw');
      if (opts.onToggle) opts.onToggle(true);
      root.dispatchEvent(new CustomEvent('assistone:toggle', { detail: { open: true }, bubbles: true }));
    }
    function close() {
      if (!big) return; big = false;
      root.classList.remove('ao-big'); btn.setAttribute('aria-pressed', 'false');
      setDir(reduced() ? 'ao-idle' : 'ao-bw');
      if (opts.onToggle) opts.onToggle(false);
      root.dispatchEvent(new CustomEvent('assistone:toggle', { detail: { open: false }, bubbles: true }));
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); big ? close() : open(); });
    // clique fora e Esc encolhem
    // AssistONE 1.0.0: confere o CAMINHO do clique (composedPath), porque o painel troca de conteúdo no clique e o alvo
    // já saiu da página quando o clique chega aqui (sem isso, todo clique que troca a tela do painel fecharia o painel)
    function dentroDoQueFica(e) {
      if (!opts.keepOpenSelector) return false;
      var cam = e.composedPath ? e.composedPath() : [e.target];
      for (var i = 0; i < cam.length; i++) if (cam[i] && cam[i].matches && cam[i].matches(opts.keepOpenSelector)) return true;
      return false;
    }
    function onDocClick(e) { if (big && e !== abriuNo && !root.contains(e.target) && !dentroDoQueFica(e)) close(); }
    function onKey(e) { if (big && (e.key === 'Escape' || e.key === 'Esc')) { close(); btn.focus(); } }
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);

    // inclinar com o mouse (so computador, so sem "menos movimento")
    function onMove(e) {
      if (reduced() || !(mqMouse && mqMouse.matches)) return;
      var r = btn.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = 'perspective(700px) rotateX(' + (Math.round(-py * 300) / 10) + 'deg) rotateY(' + (Math.round(px * 300) / 10) + 'deg)';
      root.classList.add('ao-hover');
    }
    function onLeave() { tilt.style.transform = ''; root.classList.remove('ao-hover'); }
    btn.addEventListener('mousemove', onMove);
    btn.addEventListener('mouseleave', onLeave);

    // se a pessoa ligar/desligar "menos movimento" com ele aberto, acerta o estado
    function onReduceChange() { if (big) setDir(reduced() ? 'ao-fwr' : 'ao-fw'); }
    if (mqReduce && mqReduce.addEventListener) mqReduce.addEventListener('change', onReduceChange);

    return {
      open: open, close: close, isOpen: function () { return big; },
      destroy: function () {
        document.removeEventListener('click', onDocClick); document.removeEventListener('keydown', onKey);
        if (mqReduce && mqReduce.removeEventListener) mqReduce.removeEventListener('change', onReduceChange);
        root.innerHTML = ''; root.classList.remove('ao-root', 'ao-big', 'ao-hover');
      }
    };
  }
  global.AssistOneCharacter = { mount: mount };
})(window);

/* ---------------------------------------------------------------------
   2) O PAINEL (menu aprovado, ESPECIFICACAO.md seção 6) — AssistOneVisual
   ---------------------------------------------------------------------
   Uso (o app decide o que cada item faz; o visual só desenha e avisa):
     var v = AssistOneVisual.montar(document.getElementById('assistOne'), {
       idioma: function () { return 'pt' },                 // 'pt' | 'en' | 'es'
       corpoId: 'assistBalao',                              // id do miolo do painel (o app escreve nele, se quiser)
       tela:   function () { return { titulo: 'Início', frase: 'O mesmo dinheiro visto de três jeitos.' } },
       itens:  function () { return { perguntar: true } },  // o "Perguntar ao assistente" só aparece com a IA liberada
       acao:   function (id) { … },                          // perguntar | comecar | tour | procurar | ajuda_tela | agora_nao | desligar
       aoAbrir: function () {}, aoFechar: function () {}
     });
     v.abrir({ aviso: '<b>Olá!</b> …', leve: true })   // abre no menu (aviso opcional, texto do app, acima do "Você está em";
                                                    // leve = sem película que segura o toque, para aberturas que a pessoa não pediu)
     v.conteudo({ titulo, sub, html | no })  // troca o miolo por outra vista, com "Voltar ao menu"; devolve o miolo
     v.menu() · v.fechar() · v.aberto() · v.atualizar() · v.textos() · v.destruir()
   Ordem fixa do menu: Perguntar ao assistente (selo IA) · Começar · Tour rápido · Procurar algo · Ajuda desta tela;
   no rodapé, discretos: Agora não · Desligar o AssistONE. Nada de "Abrir um chamado" nem "Dar opinião" (seção 3).
   --------------------------------------------------------------------- */
(function (global) {
  'use strict';
  var d = document;

  /* textos aprovados (i18n/*.json do pacote). "voce_esta_em" vem dos quadros do desenho ("Você está em");
     EN/ES dele e do menu são proposta, sem revisão nativa (seção 14). */
  var TX = {
    pt: { menu: { tag_ia: 'IA', perguntar: 'Perguntar ao assistente', comecar: 'Começar', tour: 'Tour rápido', procurar: 'Procurar algo',
                  ajuda_tela: 'Ajuda desta tela', agora_nao: 'Agora não', desligar: 'Desligar o AssistONE', voce_esta_em: 'Você está em' },
          conversa: { titulo: 'AssistONE', hoje: 'Hoje', ultimos7: 'Últimos 7 dias', respondendo: 'AssistONE está respondendo…', respondendo_curto: 'respondendo…', aguarde: 'Aguarde a resposta…',
                      outra: 'Escreva outra pergunta', nota: 'Não escreva senha, PIN nem dados de cartão.', isso_responde: 'Isso responde?', sim: 'Sim', nao: 'Não' },
          aria: { fechar: 'Fechar', enviar: 'Enviar pergunta', enviar_aguarde: 'Enviar pergunta (aguarde)', voltar_menu: 'Voltar ao menu', abrir_personagem: 'AssistONE' },
          historico: { title: 'Conversas', showing: 'Mostrando os últimos 7 dias.', delall: 'Apagar tudo', delone: 'Apagar esta conversa', only: 'Só você vê estas conversas.',
                       q1: 'Apagar esta conversa?', qall: 'Apagar todas as conversas?', p1: 'Ela some da sua lista dos últimos 7 dias. Isso não dá para desfazer.',
                       pall: 'Todas as conversas dos últimos 7 dias somem da sua lista. Isso não dá para desfazer.', del: 'Apagar', cancel: 'Cancelar',
                       empty_h: 'Nenhuma conversa nos últimos 7 dias', empty_p: 'Quando você perguntar algo ao AssistONE, a conversa aparece aqui.',
                       ask: 'Perguntar ao assistente', grupo_hoje: 'Hoje', grupo_ontem: 'Ontem' } },
    en: { menu: { tag_ia: 'AI', perguntar: 'Ask the assistant', comecar: 'Get started', tour: 'Quick tour', procurar: 'Find something',
                  ajuda_tela: 'Help with this screen', agora_nao: 'Not now', desligar: 'Turn off AssistONE', voce_esta_em: 'You are on' },
          conversa: { titulo: 'AssistONE', hoje: 'Today', ultimos7: 'Last 7 days', respondendo: 'AssistONE is answering…', respondendo_curto: 'answering…', aguarde: 'Wait for the answer…',
                      outra: 'Write another question', nota: 'Do not type a password, PIN or card details.', isso_responde: 'Does this answer it?', sim: 'Yes', nao: 'No' },
          aria: { fechar: 'Close', enviar: 'Send question', enviar_aguarde: 'Send question (wait)', voltar_menu: 'Back to the menu', abrir_personagem: 'AssistONE' },
          historico: { title: 'Conversations', showing: 'Showing the last 7 days.', delall: 'Delete all', delone: 'Delete this conversation', only: 'Only you can see these conversations.',
                       q1: 'Delete this conversation?', qall: 'Delete all conversations?', p1: 'It disappears from your last 7 days list. This cannot be undone.',
                       pall: 'All conversations from the last 7 days disappear from your list. This cannot be undone.', del: 'Delete', cancel: 'Cancel',
                       empty_h: 'No conversations in the last 7 days', empty_p: 'When you ask AssistONE something, the conversation shows up here.',
                       ask: 'Ask the assistant', grupo_hoje: 'Today', grupo_ontem: 'Yesterday' } },
    es: { menu: { tag_ia: 'IA', perguntar: 'Preguntar al asistente', comecar: 'Empezar', tour: 'Recorrido rápido', procurar: 'Buscar algo',
                  ajuda_tela: 'Ayuda de esta pantalla', agora_nao: 'Ahora no', desligar: 'Apagar AssistONE', voce_esta_em: 'Estás en' },
          conversa: { titulo: 'AssistONE', hoje: 'Hoy', ultimos7: 'Últimos 7 días', respondendo: 'AssistONE está respondiendo…', respondendo_curto: 'respondiendo…', aguarde: 'Espera la respuesta…',
                      outra: 'Escribe otra pregunta', nota: 'No escribas contraseña, PIN ni datos de tarjeta.', isso_responde: '¿Esto responde tu pregunta?', sim: 'Sí', nao: 'No' },
          aria: { fechar: 'Cerrar', enviar: 'Enviar pregunta', enviar_aguarde: 'Enviar pregunta (espera)', voltar_menu: 'Volver al menú', abrir_personagem: 'AssistONE' },
          historico: { title: 'Conversaciones', showing: 'Mostrando los últimos 7 días.', delall: 'Borrar todo', delone: 'Borrar esta conversación', only: 'Solo tú ves estas conversaciones.',
                       q1: '¿Borrar esta conversación?', qall: '¿Borrar todas las conversaciones?', p1: 'Desaparece de tu lista de los últimos 7 días. No se puede deshacer.',
                       pall: 'Todas las conversaciones de los últimos 7 días desaparecen de tu lista. No se puede deshacer.', del: 'Borrar', cancel: 'Cancelar',
                       empty_h: 'Ninguna conversación en los últimos 7 días', empty_p: 'Cuando le preguntes algo a AssistONE, la conversación aparece aquí.',
                       ask: 'Preguntar al asistente', grupo_hoje: 'Hoy', grupo_ontem: 'Ayer' } }
  };

  /* ícones do pacote (icons/*.svg: 24 px, traço 1,5, cor da fonte) */
  var ICO = {
    sparkle: '<path d="M11 3.2c.6 4.3 2.9 6.6 7.2 7.2-4.3.6-6.6 2.9-7.2 7.2-.6-4.3-2.9-6.6-7.2-7.2 4.3-.6 6.6-2.9 7.2-7.2z"></path><path d="M18.5 15.6c.25 1.65.95 2.25 2.6 2.5-1.65.25-2.35.95-2.6 2.6-.25-1.65-.95-2.35-2.6-2.6 1.65-.25 2.35-.85 2.6-2.5z"></path>',
    route: '<path d="M8 18h6.5a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7H16"></path><circle cx="18" cy="4" r="2"></circle><circle cx="6" cy="18" r="2"></circle>',
    compass: '<circle cx="12" cy="12" r="9"></circle><path d="M15.8 8.2l-2.1 5.5-5.5 2.1 2.1-5.5z"></path>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.4 15.4l5.1 5.1"></path>',
    'help-screen': '<rect x="3" y="4.5" width="18" height="12.5" rx="2.5"></rect><path d="M12 17v3.5M8.5 20.5h7"></path><path d="M10.2 9.2a1.9 1.9 0 1 1 2.6 1.75c-.55.26-.8.62-.8 1.25"></path><path d="M12 14.2h.01"></path>',
    power: '<path d="M12 3.5v8M7.2 6.6a7.5 7.5 0 1 0 9.6 0"></path>',
    close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"></path>',
    'arrow-left': '<path d="M14.5 5.5L8 12l6.5 6.5M8.5 12H19"></path>',
    pin: '<path d="M12 21s-6.5-5.5-6.5-10.8a6.5 6.5 0 0 1 13 0C18.5 15.5 12 21 12 21z"></path><circle cx="12" cy="10.2" r="2.3"></circle>',
    lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.2"></rect><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"></path>',
    send: '<path d="M12 19V5.5M6.5 11l5.5-5.5 5.5 5.5"></path>',
    clock: '<circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.5V12l3 2"></path>',
    trash: '<path d="M5 7h14M9.5 7V5h5v2M7 7l.8 11a1.6 1.6 0 0 0 1.6 1.5h5.2a1.6 1.6 0 0 0 1.6-1.5L17 7M10.2 11v5M13.8 11v5"></path>',
    check: '<path d="M5.5 12.5l4.3 4.3L18.5 8"></path>',
    chevron: '<path d="M9.5 6.5l5.5 5.5-5.5 5.5"></path>',
    doc: '<path d="M7 3.5h6.5L18 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1zM13.5 3.5V8H18M9 12.5h6M9 16h4"></path>'
  };
  function icone(nome, px) {
    px = px || 22;
    return '<svg width="' + px + '" height="' + px + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICO[nome] || '') + '</svg>';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function computador() { return !!(global.matchMedia && global.matchMedia('(min-width:900px)').matches); }
  function calmo() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) || d.documentElement.classList.contains('sem-animacao');
  }

  var ITENS = [
    { id: 'comecar', ico: 'route' },
    { id: 'tour', ico: 'compass' },
    { id: 'procurar', ico: 'search' },
    { id: 'ajuda_tela', ico: 'help-screen' }
  ];

  function montar(casa, op) {
    op = op || {};
    function lingua() { var l = (op.idioma && op.idioma()) || 'pt'; l = String(l).slice(0, 2).toLowerCase(); return TX[l] ? l : 'pt'; }
    function t() { return TX[lingua()]; }

    casa.classList.add('aov-casa');
    casa.innerHTML = '';
    var scrim = d.createElement('div'); scrim.className = 'aov-scrim'; scrim.setAttribute('aria-hidden', 'true');
    var painel = d.createElement('div'); painel.className = 'aov-painel'; painel.setAttribute('role', 'dialog');
    painel.id = (op.corpoId || 'aov') + '-painel';
    painel.setAttribute('aria-labelledby', painel.id + '-tit');
    painel.innerHTML =
      '<div class="aov-grab" aria-hidden="true"></div>' +
      '<div class="aov-hd"><button type="button" class="aov-ib aov-voltar" hidden></button><span class="aov-mini" aria-hidden="true"></span>' +
        '<div class="aov-hd-t"><h2 class="aov-tit" id="' + painel.id + '-tit">AssistONE</h2><div class="aov-sub"></div></div>' +
        '<button type="button" class="aov-ib aov-fechar"></button></div>' +
      '<div class="aov-corpo"' + (op.corpoId ? ' id="' + esc(op.corpoId) + '"' : '') + '></div>' +
      '<div class="aov-ft"><button type="button" data-aov="agora_nao"></button><button type="button" data-aov="desligar"></button></div>';
    var raizAo = d.createElement('div'); raizAo.className = 'aov-ao';
    casa.appendChild(scrim); casa.appendChild(painel); casa.appendChild(raizAo);

    var corpo = painel.querySelector('.aov-corpo'), hd = painel.querySelector('.aov-hd');
    var btVoltar = painel.querySelector('.aov-voltar'), btFechar = painel.querySelector('.aov-fechar');
    var mini = painel.querySelector('.aov-mini');
    var vista = 'menu', avisoAtual = null, antesFoco = null;

    var ch = global.AssistOneCharacter.mount(raizAo, {
      label: t().aria.abrir_personagem,
      keepOpenSelector: '.aov-painel',
      onToggle: function (aberto) { aberto ? mostrar() : esconder(); }
    });
    var btAo = raizAo.querySelector('.ao-btn');
    btAo.setAttribute('aria-haspopup', 'dialog');
    btAo.setAttribute('aria-controls', painel.id);

    function rotulos() {
      var x = t();
      btFechar.setAttribute('aria-label', x.aria.fechar); btFechar.innerHTML = icone('close');
      btVoltar.setAttribute('aria-label', x.aria.voltar_menu); btVoltar.innerHTML = icone('arrow-left');
      var ft = painel.querySelectorAll('.aov-ft button');
      ft[0].textContent = x.menu.agora_nao;
      ft[1].innerHTML = icone('power', 18) + esc(x.menu.desligar);
      btAo.setAttribute('aria-label', x.aria.abrir_personagem);
    }

    function htmlMenu() {
      var x = t(), tela = (op.tela && op.tela()) || {}, itens = (op.itens && op.itens()) || {};
      var h = '';
      if (avisoAtual) h += '<div class="aov-aviso">' + avisoAtual + '</div>';
      h += '<div class="aov-ctx">' + icone('pin') + '<div><div class="aov-mu">' + esc(x.menu.voce_esta_em) + '</div>' +
        '<div class="aov-disp">' + esc(tela.titulo || '') + '</div>' +
        (tela.frase ? '<div class="aov-frase">' + esc(tela.frase) + '</div>' : '') + '</div></div>';
      h += '<div class="aov-lista">';
      if (itens.perguntar) h += '<button type="button" class="aov-ask" data-aov="perguntar">' + icone('sparkle') +
        '<span>' + esc(x.menu.perguntar) + '</span><span class="aov-tag">' + esc(x.menu.tag_ia) + '</span></button>';
      ITENS.forEach(function (it) {
        if (itens[it.id] === false) return;   // o app (ou o RootifyONE) pode tirar um item; a ordem nunca muda
        h += '<button type="button" class="aov-row" data-aov="' + it.id + '">' + icone(it.ico) + '<span>' + esc(x.menu[it.id]) + '</span></button>';
      });
      return h + '</div>';
    }

    function cabecalho(titulo, sub, voltar) {
      painel.querySelector('.aov-tit').textContent = titulo || t().conversa.titulo;
      painel.querySelector('.aov-sub').textContent = sub || '';
      btVoltar.hidden = !voltar; mini.hidden = !!voltar;
      hd.classList.toggle('aov-com-voltar', !!voltar);
    }

    function menu() {
      vista = 'menu';
      painel.classList.remove('aov-vista-conteudo', 'aov-vista-conversa');
      cabecalho('', '', false);
      corpo.innerHTML = htmlMenu();
      corpo.scrollTop = 0;
      posicionar();
      return corpo;
    }

    function conteudo(c) {
      c = c || {};
      vista = 'conteudo';
      painel.classList.add('aov-vista-conteudo');
      painel.classList.remove('aov-vista-conversa');
      cabecalho(c.titulo, c.sub, c.voltar !== false);
      if (c.no) { corpo.innerHTML = ''; corpo.appendChild(c.no); } else corpo.innerHTML = c.html || '';
      corpo.scrollTop = 0;
      posicionar();
      return corpo;
    }

    /* ---- CONVERSA (quadro E-Conversa, ESPECIFICACAO.md seção 7) ----------------------------------------------------
       v.conversa({ titulo, sub, exemplo,
                    enviar:   function (texto) → Promise<{ id, resposta } | { erro: 'texto para a pessoa' }>,
                    avaliar:  function (id, util) → Promise (opcional; "Isso responde?" Sim = true, Não = false),
                    carregar: function () → Promise<[{ id, pergunta, resposta, util, criado_em }]> (opcional: as dos últimos 7 dias) })
       Fases: escrevendo → enviou (três pontinhos, "AssistONE está respondendo…" para o leitor de tela, a caixa fica cinza,
       o brilho do personagem acende) → respondeu ("Isso responde?" Sim e Não, só isso). O aviso do cadeado fica fixo.
       A conversa desta visita fica guardada aqui (fio) enquanto a página estiver aberta. */
    var fio = [], antigas = [], conv = null;
    function dia(q) { var x = new Date(q); return isNaN(x) ? null : new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); }
    function rotuloDia(ms) {
      var x = t(), h = dia(Date.now());
      if (ms === h) return x.conversa.hoje;
      if (ms === h - 864e5) return x.historico.grupo_ontem;
      var dt = new Date(ms); return ('0' + dt.getDate()).slice(-2) + '/' + ('0' + (dt.getMonth() + 1)).slice(-2);
    }
    function textoEmLinhas(s) { return esc(s).replace(/\n/g, '<br>'); }
    function esperando() { return fio.some(function (i) { return i.estado === 'esperando'; }); }

    function desenharConversa() {
      if (!conv || vista !== 'conversa') return;
      var x = t(), msgs = conv.no.querySelector('.aov-msgs');
      var ids = {}; fio.forEach(function (i) { if (i.id != null) ids[i.id] = 1; });
      var lista = antigas.filter(function (i) { return !ids[i.id]; }).slice().reverse().concat(fio);
      var h = '', ultimoDia = null, ultimaRespondida = null;
      /* "Isso responde?" só logo depois de uma resposta desta visita (a última da conversa) */
      var ult = lista[lista.length - 1];
      if (ult && fio.indexOf(ult) >= 0 && ult.estado === 'respondida' && !ult.erro && ult.id != null) ultimaRespondida = ult;
      lista.forEach(function (i) {
        var dd = dia(i.quando);
        if (dd !== ultimoDia) { h += '<div class="aov-dia">' + esc(rotuloDia(dd)) + '</div>'; ultimoDia = dd; }
        h += '<div class="aov-eu">' + textoEmLinhas(i.pergunta) + '</div>';
        if (i.estado === 'esperando') {
          h += '<div class="aov-espera"><div class="aov-bot" role="status" aria-live="polite"><span class="ao-sr">' + esc(x.conversa.respondendo) + '</span>' +
               '<span class="aov-dots" aria-hidden="true"><i></i><i></i><i></i></span></div><div class="aov-lblt" aria-hidden="true">' + esc(x.conversa.respondendo) + '</div></div>';
        } else if (i.erro) {
          h += '<div class="aov-bot aov-bot-erro" role="status">' + textoEmLinhas(i.erro) + '</div>';
        } else {
          h += '<div class="aov-bot">' + textoEmLinhas(i.resposta || '') + '</div>';
          if (i === ultimaRespondida && conv.op.avaliar) {
            h += '<div class="aov-lblt" id="' + painel.id + '-ir">' + esc(x.conversa.isso_responde) + '</div><div class="aov-q2" role="group" aria-labelledby="' + painel.id + '-ir">' +
              '<button type="button" class="aov-chip2" data-util="1" aria-pressed="' + (i.util === true) + '">' + esc(x.conversa.sim) + '</button>' +
              '<button type="button" class="aov-chip2" data-util="0" aria-pressed="' + (i.util === false) + '">' + esc(x.conversa.nao) + '</button></div>';
          }
        }
      });
      msgs.innerHTML = h;
      msgs.scrollTop = msgs.scrollHeight;
      var espera = esperando(), ta = conv.no.querySelector('.aov-ta'), bt = conv.no.querySelector('.aov-send');
      ta.disabled = espera; bt.disabled = espera;
      ta.placeholder = espera ? x.conversa.aguarde : (fio.length || antigas.length ? x.conversa.outra : (conv.op.exemplo || x.conversa.outra));
      bt.setAttribute('aria-label', espera ? x.aria.enviar_aguarde : x.aria.enviar);
      painel.querySelector('.aov-sub').textContent = espera ? x.conversa.respondendo_curto : (conv.op.sub || '');
      casa.classList.toggle('aov-pensando', espera);
    }

    function enviarPergunta() {
      if (!conv || esperando()) return;
      var ta = conv.no.querySelector('.aov-ta'), txt = (ta.value || '').trim();
      if (txt.length < 2) { try { ta.focus(); } catch (e) {} return; }
      var item = { pergunta: txt, quando: new Date().toISOString(), estado: 'esperando' }, op2 = conv.op;
      fio.push(item); ta.value = ''; ajustarAltura(ta);
      desenharConversa();
      var fim = function () {
        item.estado = 'respondida';
        if (!global.document.contains(painel)) return;
        casa.classList.toggle('aov-pensando', esperando());
        desenharConversa();
        var t2 = conv && conv.no.querySelector('.aov-ta'); if (t2 && vista === 'conversa') try { t2.focus({ preventScroll: true }); } catch (e) {}
      };
      Promise.resolve().then(function () { return op2.enviar(txt); }).then(function (r) {
        r = r || {};
        if (r.erro) item.erro = String(r.erro); else { item.id = r.id; item.resposta = r.resposta; }
      }, function (e) { item.erro = (op2.erroPadrao && op2.erroPadrao(e)) || (e && e.message) || '…'; }).then(fim);
    }
    function ajustarAltura(ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 132) + 'px'; }

    function conversa(c) {
      c = c || {};
      var x = t();
      var no = d.createElement('div'); no.className = 'aov-conv';
      no.innerHTML = '<div class="aov-msgs"></div>' +
        '<div class="aov-comp"><div class="aov-comp-l"><textarea class="aov-ta" rows="1" maxlength="2000" aria-label="' + esc(c.titulo || x.menu.perguntar) + '"></textarea>' +
        '<button type="button" class="aov-send">' + icone('send') + '</button></div>' +
        '<div class="aov-nota">' + icone('lock', 18) + '<span>' + esc(x.conversa.nota) + '</span></div></div>';
      conteudo({ titulo: c.titulo || x.menu.perguntar, sub: c.sub, no: no });
      vista = 'conversa';
      painel.classList.add('aov-vista-conversa');
      conv = { op: c, no: no };
      posicionar();
      var ta = no.querySelector('.aov-ta');
      ta.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); enviarPergunta(); } });
      ta.addEventListener('input', function () { ajustarAltura(ta); });
      no.querySelector('.aov-send').addEventListener('click', enviarPergunta);
      no.addEventListener('click', function (ev) {
        var b = ev.target.closest('.aov-chip2'); if (!b) return;
        var ult = fio[fio.length - 1], alvo = ult && ult.estado === 'respondida' && !ult.erro && ult.id != null ? ult : null;
        if (!alvo) return;
        alvo.util = b.getAttribute('data-util') === '1';
        desenharConversa();
        if (c.avaliar) Promise.resolve().then(function () { return c.avaliar(alvo.id, alvo.util); }).catch(function () {});
        var f = no.querySelector('.aov-chip2[aria-pressed="true"]'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {}
      });
      desenharConversa();
      if (c.carregar) Promise.resolve().then(c.carregar).then(function (l) {
        antigas = (l || []).filter(function (i) { return i && i.pergunta; }).map(function (i) {
          return { id: i.id, pergunta: i.pergunta, resposta: i.resposta, util: i.util === true ? true : i.util === false ? false : null,
                   quando: i.criado_em || i.quando, estado: i.estado === 'respondida' ? 'respondida' : 'antiga',
                   erro: i.estado === 'respondida' ? null : (i.resposta || null) };
        }).filter(function (i) { return i.estado === 'respondida'; });
        desenharConversa();
      }, function () {});
      setTimeout(function () { try { ta.focus({ preventScroll: true }); } catch (e) {} }, 40);
      return no;
    }

    /* o personagem sai da frente do painel: sobe junto da folha (celular) ou vai para a esquerda do painel (computador) */
    function posicionar() {
      if (!ch.isOpen()) { raizAo.style.transform = ''; raizAo.classList.remove('aov-sem-lugar'); return; }
      /* mede a CASA (não se mexe) e o tamanho do painel (não o retângulo: no começo ele ainda está deslizando para entrar) */
      var r = casa.getBoundingClientRect(), W = global.innerWidth, H = global.innerHeight, nx = 0, ny = 0;
      if (computador()) { var esq = W - painel.offsetWidth; if (r.right > esq - 42) nx = -(r.right - (esq - 42)); }   // 42 = folga de 16 + o quanto ele cresce (1,4×)
      else {
        var topo = H - painel.offsetHeight; if (r.bottom > topo - 4) ny = -(r.bottom - (topo - 4));
        if (r.right > W - 26) nx = -(r.right - (W - 26));   // 1.1.1: no canto (fechado) ele fica colado; aberto, precisa de 26 px para crescer 1,4×
      }
      /* 1.1.2: em cima da folha, ele cresce até onde couber (inteiro, com o 1,4× e o balanço: ≈ 192 px de altura); faltando
         espaço (menu com o "Perguntar", celular baixo), ele DIMINUI para caber, em vez de sumir. Só a folha alta da conversa,
         onde nem a metade cabe, tira o grande de cena (fica o pequeno, no cabeçalho). */
      var esc = 1;
      if (!computador()) { var cabe = (r.bottom + ny) - 8; esc = Math.min(1, cabe / 192); }
      var semLugar = esc < 0.45;
      raizAo.classList.toggle('aov-sem-lugar', semLugar);
      if (semLugar) { ny = 0; esc = 1; }
      raizAo.style.transform = (nx || ny || esc < 1) ? 'translate(' + Math.round(nx) + 'px, ' + Math.round(ny) + 'px)' + (esc < 1 ? ' scale(' + esc.toFixed(3) + ')' : '') : '';
    }

    function mostrar() {
      antesFoco = d.activeElement;
      casa.classList.add('aov-aberto');
      rotulos();
      if (vista === 'menu' || !corpo.firstChild) menu(); else posicionar();
      if (op.aoAbrir) try { op.aoAbrir(); } catch (e) {}
      setTimeout(function () {
        posicionar();
        var f = corpo.querySelector('button, [href], input, textarea, select');
        if (f) try { f.focus({ preventScroll: true }); } catch (e) {}
      }, 30);
    }
    function esconder() {
      casa.classList.remove('aov-aberto', 'aov-leve');
      raizAo.style.transform = ''; raizAo.classList.remove('aov-sem-lugar');
      avisoAtual = null; vista = 'menu';
      if (op.aoFechar) try { op.aoFechar(); } catch (e) {}
      if (painel.contains(d.activeElement)) try { btAo.focus({ preventScroll: true }); } catch (e) {}
    }

    painel.addEventListener('click', function (ev) {
      if (ev.target.closest('.aov-fechar')) { ch.close(); try { btAo.focus({ preventScroll: true }); } catch (e) {} return; }
      if (ev.target.closest('.aov-voltar')) { menu(); var f = corpo.querySelector('button'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} return; }
      var b = ev.target.closest('[data-aov]');
      if (!b) return;
      var id = b.getAttribute('data-aov');
      if (id === 'agora_nao') ch.close();
      if (op.acao) op.acao(id);
    });
    scrim.addEventListener('click', function () { ch.close(); });
    global.addEventListener('resize', function () { if (ch.isOpen()) posicionar(); });

    /* trocar o tema ou o idioma com ele aberto não quebra nada: os tokens são CSS; os textos se refazem aqui */
    function atualizar() { rotulos(); if (ch.isOpen() && vista === 'menu') menu(); else { if (vista === 'conversa') desenharConversa(); posicionar(); } }

    rotulos();
    return {
      abrir: function (o) {
        o = o || {};
        avisoAtual = o.aviso || null;
        /* leve: abertura que a pessoa não pediu (ex.: o "Olá" da primeira visita): sem película que segura o toque; um toque
           fora fecha o menu E vale para o que foi tocado */
        casa.classList.toggle('aov-leve', !!o.leve);
        if (ch.isOpen()) { menu(); return; }
        vista = 'menu'; ch.open();
      },
      fechar: function () { if (ch.isOpen()) ch.close(); },
      aberto: function () { return ch.isOpen(); },
      menu: menu,
      conteudo: conteudo,
      conversa: conversa,
      atualizar: atualizar,
      corpo: corpo,
      painel: painel,
      personagem: btAo,
      textos: function () { return t(); },
      icone: icone,
      vista: function () { return vista; },
      calmo: calmo,
      destruir: function () { ch.destroy(); casa.innerHTML = ''; casa.classList.remove('aov-casa', 'aov-aberto'); }
    };
  }

  global.AssistOneVisual = { VERSAO: '1.1.2', montar: montar, TEXTOS: TX, icone: icone };
})(window);
