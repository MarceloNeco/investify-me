/* =====================================================================
   modulos/abrir-no-chrome.js — "Abrir no Chrome" e "Instalar o app"   1.2.0 · 27/Nov/2026 (3.115; 3.137: o Compartilhar)
   ---------------------------------------------------------------------
   O QUE FAZ (dono, 24/Nov/2026: "mandar tocar nos ⋮ é amador"; o convite translúcido e a figura que parecia botão)
     · Tela de entrada, só no Android: quando o app abriu DENTRO de outro app (a aba do WhatsApp/Gmail, a Custom Tab com o X no topo:
       "; wv)" no userAgent, ou document.referrer "android-app://…") ou num navegador que não é o Chrome (o da Samsung, Firefox…),
       mostra o botão "Abrir no Chrome" (intent://<endereço>#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=…;end)
       e explica que lá dentro o app não fica guardado igual ao Chrome. No navegador da Samsung vale a regra da diretriz ("instalar pelo
       Chrome": o alerta do Play Protect). Detecção por melhor esforço: NA DÚVIDA, NÃO MOSTRA NADA.
     · 1.1.0 — BOTÃO FIXO "📲 Instalar o app" no menu ☰ e em Configurações (celular, tablet e computador), enquanto o app não estiver
       instalado (display-mode standalone ou window-controls-overlay = instalado → some; o appinstalled também esconde).
     · 1.1.0 — o botão e o convite abrem uma JANELA sólida (fundo escurecido, foco preso, Esc e Voltar fecham): "Instalar o MoneyTRIO
       no celular" + uma frase; com o beforeinstallprompt guardado pelo PWA (index.html), um botão "Instalar" de verdade; sem ele, os
       PASSOS NUMERADOS com o nome exato do menu de cada contexto (contexto()), e a figura do menu do Chrome pequena, sem cara de botão,
       com a legenda "é assim que aparece no seu Chrome".
     · 1.1.0 — no Android, sem beforeinstallprompt depois de ~3 s e em display-mode browser, NÃO assume o Chrome (pode ser a Custom Tab):
       primeiro "1. Abrir no Chrome", depois "2. ⋮ → Instalar app" (a Custom Tab também tem "Instalar e criar atalho", mas lá o app pode
       ficar com o armazenamento separado).
     · O convite automático (depois de entrar) é secundário: aparece UMA vez por aparelho (dgo:moneytrio:aviso:instalar:visto).
   API (window.AbrirChrome)
     detectar(ua, referrer, instalado) → {android, dentroDeApp, samsung, chrome, mostrar}   (pura, para o teste)
     contexto(ua, referrer, semPrompt) → 'customtab' | 'android-chrome' | 'android-incerto' | 'samsung' | 'android-outro' | 'ios' | 'computador'
     passos(ctx) → [{html}]  (os passos numerados, com o nome exato do menu)
     link(url) · htmlEntrada() · instalado() · abrir() (a janela) · oferecerInstalar() (o convite, 1 vez) · htmlBotao(onde)
   ===================================================================== */
(function () {
  'use strict';
  var K_VISTO = 'dgo:moneytrio:aviso:instalar:visto', inicio = Date.now();
  function tr(pt, en, es) { return I18n.tr(pt, en, es); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function instalado() { try { return window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: window-controls-overlay)').matches || window.navigator.standalone === true; } catch (e) { return false; } }
  function temPrompt() { return typeof PWA !== 'undefined' && !!PWA.prompt; }

  function detectar(ua, ref, inst) {
    ua = String(ua || ''); ref = String(ref || '');
    var android = /Android/i.test(ua), samsung = /SamsungBrowser/i.test(ua);
    var dentroDeApp = android && (/; wv\)/.test(ua) || /^android-app:\/\//.test(ref) || /FBAN|FBAV|Instagram|Line\/|GSA\//.test(ua));
    var chrome = android && /Chrome\/\d/.test(ua) && !samsung && !dentroDeApp && !/EdgA|OPR\/|Firefox|YaBrowser|UCBrowser|MiuiBrowser|HuaweiBrowser/i.test(ua);
    var outro = android && (samsung || /Firefox|EdgA|OPR\/|UCBrowser|MiuiBrowser|HuaweiBrowser|YaBrowser/i.test(ua));
    return { android: android, dentroDeApp: dentroDeApp, samsung: samsung, chrome: chrome, mostrar: android && !inst && (dentroDeApp || outro) };
  }
  /* semPrompt: no Android, já se passaram ~3 s sem o beforeinstallprompt (o Chrome de verdade costuma mandar) */
  function contexto(ua, ref, semPrompt) {
    ua = String(ua || '');
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    var d = detectar(ua, ref, false);
    if (!d.android) return 'computador';
    if (d.dentroDeApp) return 'customtab';
    if (d.samsung) return 'samsung';
    if (!d.chrome) return 'android-outro';
    return semPrompt ? 'android-incerto' : 'android-chrome';
  }
  function link(url) {
    var u = String(url || location.href).split('#')[0], semEsquema = u.replace(/^https?:\/\//, '');
    return 'intent://' + semEsquema + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(u) + ';end';
  }
  function agora() { return detectar(navigator.userAgent, document.referrer, instalado()); }
  function ctxAgora() { return contexto(navigator.userAgent, document.referrer, !temPrompt() && Date.now() - inicio > 3000); }

  function btnChrome() { return '<a class="btn primary sm ac-chrome" href="' + esc(link(location.href)) + '">🌐 ' + esc(tr('Abrir no Chrome', 'Open in Chrome', 'Abrir en Chrome')) + '</a>'; }
  var menuChrome = function () { return tr('toque em <b>⋮</b> (no canto de cima) e em <b>"Instalar app"</b> (nas versões antigas, <b>"Adicionar à tela inicial"</b>).', 'tap <b>⋮</b> (top corner) and <b>"Install app"</b> (in older versions, <b>"Add to Home screen"</b>).', 'toca <b>⋮</b> (esquina de arriba) e <b>"Instalar aplicación"</b> (en versiones antiguas, <b>"Añadir a pantalla de inicio"</b>).'); };
  /* os passos com o nome exato do menu de cada contexto (conferidos em 24/Nov/2026; na dúvida, "Instalar" e a figura) */
  function passos(ctx) {
    var P = function (h) { return { html: h }; };
    if (ctx === 'customtab' || ctx === 'android-incerto' || ctx === 'android-outro' || ctx === 'samsung') return [
      P(tr('Abra no Chrome: ', 'Open it in Chrome: ', 'Ábrelo en Chrome: ') + btnChrome() +
        (ctx === 'customtab' ? '<br><span class="small muted">' + tr('(ou, no menu <b>⋮</b> daqui, <b>"Abrir no navegador Chrome"</b>)', '(or, in this <b>⋮</b> menu, <b>"Open in Chrome browser"</b>)', '(o, en el menú <b>⋮</b> de aquí, <b>"Abrir en el navegador Chrome"</b>)') + '</span>' : '') +
        (ctx === 'samsung' ? '<br><span class="small muted">' + tr('Pelo navegador da Samsung ("Adicionar página a" → "Tela inicial") o Google Play Protect pode mostrar "App de risco bloqueado": o app não tem risco, o alerta vem do pacote desse navegador. Pelo Chrome não aparece.', 'From the Samsung browser ("Add page to" → "Home screen") Google Play Protect may show "Risky app blocked": the app is safe, the alert comes from that browser\'s package. From Chrome it does not show.', 'Desde el navegador de Samsung ("Añadir página a" → "Pantalla de inicio") Google Play Protect puede mostrar "App de riesgo bloqueada": la app no tiene riesgo, la alerta viene del paquete de ese navegador. Desde Chrome no aparece.') + '</span>' : '')),
      P(tr('No Chrome, ', 'In Chrome, ', 'En Chrome, ') + menuChrome())];
    if (ctx === 'android-chrome') return [P(tr('No Chrome, ', 'In Chrome, ', 'En Chrome, ') + menuChrome())];
    if (ctx === 'ios') return [P(tr('No Safari, toque em <b>Compartilhar</b> (o quadrado com a seta para cima).', 'In Safari, tap <b>Share</b> (the square with the up arrow).', 'En Safari, toca <b>Compartir</b> (el cuadrado con la flecha hacia arriba).')),
      P(tr('Toque em <b>"Adicionar à Tela de Início"</b> e em <b>Adicionar</b>.', 'Tap <b>"Add to Home Screen"</b> and <b>Add</b>.', 'Toca <b>"Añadir a pantalla de inicio"</b> y <b>Añadir</b>.'))];
    return [P(tr('No Chrome ou no Edge do computador: toque no ícone de <b>instalar</b> na barra de endereço (à direita).', 'In Chrome or Edge on the computer: click the <b>install</b> icon in the address bar (on the right).', 'En Chrome o Edge del ordenador: haz clic en el icono de <b>instalar</b> en la barra de direcciones (a la derecha).')),
      P(tr('Ou: <b>⋮</b> → <b>"Transmitir, salvar e compartilhar"</b> → <b>"Instalar página como app"</b>.', 'Or: <b>⋮</b> → <b>"Cast, save, and share"</b> → <b>"Install page as app"</b>.', 'O: <b>⋮</b> → <b>"Enviar, guardar y compartir"</b> → <b>"Instalar página como aplicación"</b>.'))];
  }

  function htmlEntrada() {
    var d = agora(); if (!d.mostrar) return '';
    var soAqui = false; try { soAqui = !!localStorage.getItem('investifyme.dados.v1'); } catch (e) {}
    return '<div class="nv-nota atencao" id="acChrome">' +
      (d.dentroDeApp ? tr('Aqui dentro o app não fica guardado igual ao Chrome. Abra no Chrome e instale na tela inicial:', 'In here the app is not kept the same way as in Chrome. Open it in Chrome and install it on your home screen:', 'Aquí dentro la app no se guarda igual que en Chrome. Ábrela en Chrome e instálala en la pantalla de inicio:')
        : d.samsung ? tr('No navegador da Samsung, instalar o app dispara o alerta "App de risco bloqueado" do Google Play Protect (o app não tem risco: o alerta vem do pacote que esse navegador monta). Use o Chrome:', 'In the Samsung browser, installing the app triggers Google Play Protect\'s "Risky app blocked" alert (the app is safe: the alert comes from the package that browser builds). Use Chrome:', 'En el navegador de Samsung, instalar la app activa la alerta "App de riesgo bloqueada" de Google Play Protect (la app no tiene riesgo: la alerta viene del paquete que arma ese navegador). Usa Chrome:')
        : tr('Para entrar e instalar o app, use o Chrome:', 'To sign in and install the app, use Chrome:', 'Para entrar e instalar la app, usa Chrome:')) +
      ' <a class="nv-btn pri" id="acChromeBtn" href="' + esc(link(location.href)) + '" style="display:inline-block;width:auto;margin:6px 0 0;text-decoration:none">🌐 ' + tr('Abrir no Chrome', 'Open in Chrome', 'Abrir en Chrome') + '</a>' +
      (d.samsung && soAqui ? '<br><span class="nv-tiny">' + tr('Tem dados guardados só neste navegador? Antes, faça a cópia (backup) em Configurações: os dados do navegador da Samsung não passam sozinhos para o Chrome.', 'Have data kept only in this browser? First make a backup in Settings: the Samsung browser\'s data does not move to Chrome by itself.', '¿Tienes datos guardados solo en este navegador? Antes, haz la copia (backup) en Ajustes: los datos del navegador de Samsung no pasan solos a Chrome.') + '</span>' : '') +
      '</div>';
  }

  /* a figura do menu do Chrome (⋮ → Instalar app): pequena, sem borda de botão e apagada — é só uma figura */
  var FIGURA = '<figure class="ac-fig" aria-hidden="true"><svg width="170" height="74" viewBox="0 0 220 96" role="img">' +
    '<rect x="1" y="1" width="218" height="94" rx="10" fill="#1b2430"/><rect x="10" y="10" width="160" height="20" rx="10" fill="#2e3c4f"/>' +
    '<text x="20" y="24" font-size="10" fill="#c9d4e2">moneytrio.solverone.com.br</text><circle cx="200" cy="15" r="2.2" fill="#fff"/><circle cx="200" cy="21" r="2.2" fill="#fff"/><circle cx="200" cy="27" r="2.2" fill="#fff"/>' +
    '<circle cx="200" cy="21" r="10" fill="none" stroke="#ffb84d" stroke-width="2"/><rect x="96" y="40" width="118" height="46" rx="6" fill="#0b0f14"/>' +
    '<text x="106" y="54" font-size="10" fill="#8a96a8">Nova guia</text><text x="106" y="76" font-size="11" fill="#fff">📲 Instalar app</text></svg>' +
    '<figcaption class="small muted"></figcaption></figure>';
  function figura() { return FIGURA.replace('<figcaption class="small muted"></figcaption>', '<figcaption class="small muted">' + esc(tr('É assim que aparece no seu Chrome (é só uma figura).', 'This is how it looks in your Chrome (just a picture).', 'Así aparece en tu Chrome (es solo una imagen).')) + '</figcaption>'); }

  function css() {
    if (document.getElementById('acCss')) return;
    var s = document.createElement('style'); s.id = 'acCss';
    s.textContent = '.ac-fundo{position:fixed;inset:0;z-index:99985;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:16px}' +
      '.ac-janela{background:#151c26;background:var(--bg2,#121821);color:var(--txt,#e7edf5);border:1px solid var(--line2,#2e3c4f);border-radius:16px;max-width:440px;width:100%;max-height:90vh;overflow:auto;padding:18px 18px 14px;box-shadow:0 12px 40px rgba(0,0,0,.5);opacity:1}' +
      '.ac-janela h2{margin:0 0 6px;font-size:1.2rem}.ac-passos{margin:10px 0;padding-left:22px}.ac-passos li{margin:8px 0}' +
      '.ac-fig{margin:6px 0 0;opacity:.7;pointer-events:none}.ac-fig figcaption{margin-top:2px}.ac-acoes{display:flex;gap:8px;justify-content:flex-end;margin-top:10px;flex-wrap:wrap}' +
      '.ac-instalar-menu{display:block;width:100%;text-align:left}';
    document.head.appendChild(s);
  }

  var aberta = null;
  function fechar() { if (!aberta) return; var a = aberta; aberta = null; a.el.remove(); document.removeEventListener('keydown', a.tecla, true); window.removeEventListener('popstate', a.voltar);
    if (a.empurrou && history.state && history.state.acInstalar) { a.saindo = true; history.back(); }
    if (a.antes && a.antes.focus) try { a.antes.focus(); } catch (e) { /* sem foco */ } }
  function abrir() {
    if (aberta) return true;
    css();
    var ctx = ctxAgora(), cel = ctx !== 'computador', prompt = temPrompt();
    var el = document.createElement('div'); el.className = 'ac-fundo'; el.id = 'acInstalar';
    el.innerHTML = '<div class="ac-janela" role="dialog" aria-modal="true" aria-labelledby="acTit">' +
      '<h2 id="acTit">📲 ' + esc(cel ? tr('Instalar o MoneyTRIO no celular', 'Install MoneyTRIO on your phone', 'Instalar MoneyTRIO en el móvil') : tr('Instalar o MoneyTRIO no computador', 'Install MoneyTRIO on your computer', 'Instalar MoneyTRIO en el ordenador')) + '</h2>' +
      '<p class="small">' + esc(tr('Fica com um ícone como um app: abre mais rápido e funciona até sem internet.', 'It gets an icon like an app: opens faster and works even offline.', 'Queda con un icono como una app: abre más rápido y funciona incluso sin internet.')) + '</p>' +
      (prompt ? '' : '<ol class="ac-passos" id="acPassos">' + passos(ctx).map(function (p) { return '<li>' + p.html + '</li>'; }).join('') + '</ol>' +
        (/^android|^customtab|^samsung/.test(ctx) ? figura() : '')) +
      (cel ? '<p class="tiny muted ac-partilha">' + esc(tr('No Android, o MoneyTRIO aparece no "Compartilhar" (fotos, PDF, extrato, nota) só quando instalado pelo Chrome. Se ele já estava instalado antes da versão 3.137 e não aparece para PDF, desinstale e instale de novo.', 'On Android, MoneyTRIO shows up in "Share" (photos, PDF, statement, invoice) only when installed from Chrome. If it was installed before version 3.137 and does not show up for PDFs, uninstall and install it again.', 'En Android, MoneyTRIO aparece en "Compartir" (fotos, PDF, extracto, factura) solo si se instaló desde Chrome. Si ya estaba instalada antes de la versión 3.137 y no aparece para PDF, desinstálala e instálala de nuevo.')) + '</p>' : '') +   /* 1.2.0 (3.137) */
      '<div class="ac-acoes">' + (prompt ? '<button type="button" class="btn primary" id="acInstalarSim">' + esc(tr('Instalar', 'Install', 'Instalar')) + '</button>' : '') +
        '<button type="button" class="btn" id="acInstalarNao">' + esc(prompt ? tr('Agora não', 'Not now', 'Ahora no') : tr('Fechar', 'Close', 'Cerrar')) + '</button></div></div>';
    document.body.appendChild(el);
    var a = aberta = { el: el, antes: document.activeElement };
    el.addEventListener('click', function (e) { if (e.target === el) fechar(); });
    el.querySelector('#acInstalarNao').onclick = fechar;
    if (prompt) el.querySelector('#acInstalarSim').onclick = function () { fechar(); PWA.instalar().then(function (ok) { if (ok) atualizar(); }).catch(function (e) { if (typeof toast === 'function') toast(e.message, 'warn'); }); };
    /* foco preso; Esc fecha */
    a.tecla = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); return fechar(); }
      if (e.key !== 'Tab') return;
      var f = [].slice.call(el.querySelectorAll('button, a[href]')); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    };
    document.addEventListener('keydown', a.tecla, true);
    /* o Voltar do celular fecha a janela (e não sai do app) */
    try { history.pushState({ acInstalar: 1 }, ''); a.empurrou = true; } catch (e) { /* sem histórico */ }
    a.voltar = function () { if (a.saindo) return; a.empurrou = false; fechar(); };
    window.addEventListener('popstate', a.voltar);
    var primeiro = el.querySelector('#acInstalarSim') || el.querySelector('.ac-chrome') || el.querySelector('#acInstalarNao'); if (primeiro) primeiro.focus();
    return true;
  }
  /* o convite automático (depois de entrar): secundário, 1 vez por aparelho */
  function oferecerInstalar() {
    if (instalado() || aberta) return false;
    try { if (localStorage.getItem(K_VISTO)) return false; localStorage.setItem(K_VISTO, new Date().toISOString()); } catch (e) { return false; }
    return abrir();
  }
  /* o botão fixo (menu ☰ e Configurações): some quando instalado */
  function htmlBotao(onde) {
    if (instalado()) return '';
    return onde === 'menu' ? '<button class="nav-item ac-instalar-menu" data-acao="ac-instalar"><span>📲</span> ' + esc(tr('Instalar o app', 'Install the app', 'Instalar la app')) + '</button>'
      : '<div class="card cfg-sec" data-sec="todos" id="cfgInstalar"><div class="card-head"><h3>📲 ' + esc(tr('Instalar o app', 'Install the app', 'Instalar la app')) + '</h3></div>' +
        '<p class="small muted">' + esc(tr('Um ícone na tela do celular ou do computador, como um app: abre mais rápido e funciona até sem internet.', 'An icon on your phone or computer screen, like an app: opens faster and works even offline.', 'Un icono en la pantalla del móvil o del ordenador, como una app: abre más rápido y funciona incluso sin internet.')) + '</p>' +
        '<button type="button" class="btn primary sm" data-acao="ac-instalar">📲 ' + esc(tr('Instalar o app', 'Install the app', 'Instalar la app')) + '</button></div>';
  }
  function atualizar() { try { if (typeof montarNav === 'function') montarNav(); if (typeof render === 'function' && typeof viewAtual !== 'undefined' && viewAtual === 'config') render(); } catch (e) { /* nada */ } }

  MoneyModulos.registrar({
    id: 'abrir-no-chrome', versao: '1.2.0', colecoes: [], telas: {}, ouvir: {},
    pontos: { 'config.todos': function () { return htmlBotao('config'); } },
    acoes: { 'ac-instalar': function () { if (typeof fecharGaveta === 'function') try { fecharGaveta(); } catch (e) { /* sem gaveta */ } abrir(); } },
    /* depois de entrar: o convite aparece uns segundos depois (dá tempo do beforeinstallprompt chegar) */
    iniciar: function () {
      var tentar = function () { var dentro = (window.MoneyNuvem && MoneyNuvem.iniciado) || (function () { try { return !!localStorage.getItem('moneytrio.soNesteAparelho'); } catch (e) { return false; } })(); if (dentro && agora().android) oferecerInstalar(); };
      setTimeout(tentar, 8000);
      document.addEventListener('mt:instalavel', function () { atualizar(); setTimeout(tentar, 1500); });
      window.addEventListener('appinstalled', function () { fechar(); setTimeout(atualizar, 300); });
    }
  });
  window.AbrirChrome = { detectar: detectar, contexto: contexto, passos: passos, link: link, htmlEntrada: htmlEntrada, instalado: instalado, abrir: abrir, fechar: fechar, oferecerInstalar: oferecerInstalar, htmlBotao: htmlBotao, FIGURA: FIGURA };
})();
