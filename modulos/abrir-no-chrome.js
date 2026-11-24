/* =====================================================================
   modulos/abrir-no-chrome.js — "Abrir no Chrome" e "Instalar na tela inicial" no Android   1.0.1 · 24/Nov/2026 (3.106.1: o aviso de dentro de outro app explica que lá o app não fica guardado)
   ---------------------------------------------------------------------
   O QUE FAZ (dono, 24/Nov/2026: "mandar tocar nos ⋮ é amador")
     · Tela de entrada, só no Android: quando o app abriu DENTRO de outro app (a aba do WhatsApp/Gmail, a Custom Tab com o X no topo:
       "; wv)" no userAgent, ou document.referrer "android-app://…") ou num navegador que não é o Chrome (o da Samsung, Firefox…),
       mostra o botão "Abrir no Chrome" (intent://<endereço>#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=…;end).
       No navegador da Samsung vale a regra da diretriz ("instalar pelo Chrome"): diz por quê (o alerta do Play Protect) e, para quem
       guarda dados só no aparelho, lembra da cópia antes. Detecção por melhor esforço: NA DÚVIDA, NÃO MOSTRA NADA.
     · Depois de entrar (nuvem aberta ou "só neste aparelho"), no Android, com o app ainda não instalado: "📲 Instalar na tela inicial"
       chama o beforeinstallprompt guardado pelo PWA (index.html) no toque; sem ele, uma instrução curta com a figura do menu do
       Chrome. "Agora não" esconde por 30 dias neste aparelho.
   API (window.AbrirChrome)
     detectar(ua, referrer, instalado) → {android, dentroDeApp, samsung, chrome, mostrar}   (pura, para o teste)
     link(url)                          → o intent:// do Chrome para o endereço
     htmlEntrada()                      → o bloco da tela de entrada ('' quando não se aplica)
     oferecerInstalar()                 → mostra a oferta de instalar (no topo), se couber
   ===================================================================== */
(function () {
  'use strict';
  var K_DEPOIS = 'dgo:moneytrio:aviso:instalar:depois';
  function tr(pt, en, es) { return I18n.tr(pt, en, es); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function instaladoAgora() { try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) { return false; } }

  function detectar(ua, ref, instalado) {
    ua = String(ua || ''); ref = String(ref || '');
    var android = /Android/i.test(ua), samsung = /SamsungBrowser/i.test(ua);
    var dentroDeApp = android && (/; wv\)/.test(ua) || /^android-app:\/\//.test(ref) || /FBAN|FBAV|Instagram|Line\/|GSA\//.test(ua));
    var chrome = android && /Chrome\/\d/.test(ua) && !samsung && !dentroDeApp && !/EdgA|OPR\/|Firefox|YaBrowser|UCBrowser|MiuiBrowser|HuaweiBrowser/i.test(ua);
    var outro = android && (samsung || /Firefox|EdgA|OPR\/|UCBrowser|MiuiBrowser|HuaweiBrowser|YaBrowser/i.test(ua));
    return { android: android, dentroDeApp: dentroDeApp, samsung: samsung, chrome: chrome, mostrar: android && !instalado && (dentroDeApp || outro) };
  }
  function link(url) {
    var u = String(url || location.href).split('#')[0], semEsquema = u.replace(/^https?:\/\//, '');
    return 'intent://' + semEsquema + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(u) + ';end';
  }
  function agora() { return detectar(navigator.userAgent, document.referrer, instaladoAgora()); }

  function htmlEntrada() {
    var d = agora(); if (!d.mostrar) return '';
    var soAqui = false; try { soAqui = !!localStorage.getItem('investifyme.dados.v1'); } catch (e) {}
    return '<div class="nv-nota atencao" id="acChrome">' +
      (d.dentroDeApp ? tt3('Aqui dentro o app não fica guardado igual ao Chrome. Abra no Chrome e instale na tela inicial:', 'In here the app is not kept the same way as in Chrome. Open it in Chrome and install it on your home screen:', 'Aquí dentro la app no se guarda igual que en Chrome. Ábrela en Chrome e instálala en la pantalla de inicio:')
        : d.samsung ? tt3('No navegador da Samsung, instalar o app dispara o alerta "App de risco bloqueado" do Google Play Protect (o app não tem risco: o alerta vem do pacote que esse navegador monta). Use o Chrome:', 'In the Samsung browser, installing the app triggers Google Play Protect\'s "Risky app blocked" alert (the app is safe: the alert comes from the package that browser builds). Use Chrome:', 'En el navegador de Samsung, instalar la app activa la alerta "App de riesgo bloqueada" de Google Play Protect (la app no tiene riesgo: la alerta viene del paquete que arma ese navegador). Usa Chrome:')
        : tt3('Para entrar e instalar o app, use o Chrome:', 'To sign in and install the app, use Chrome:', 'Para entrar e instalar la app, usa Chrome:')) +
      ' <a class="nv-btn pri" id="acChromeBtn" href="' + esc(link(location.href)) + '" style="display:inline-block;width:auto;margin:6px 0 0;text-decoration:none">🌐 ' + tt3('Abrir no Chrome', 'Open in Chrome', 'Abrir en Chrome') + '</a>' +
      (d.samsung && soAqui ? '<br><span class="nv-tiny">' + tt3('Tem dados guardados só neste navegador? Antes, faça a cópia (backup) em Configurações: os dados do navegador da Samsung não passam sozinhos para o Chrome.', 'Have data kept only in this browser? First make a backup in Settings: the Samsung browser\'s data does not move to Chrome by itself.', '¿Tienes datos guardados solo en este navegador? Antes, haz la copia (backup) en Ajustes: los datos del navegador de Samsung no pasan solos a Chrome.') + '</span>' : '') +
      '</div>';
  }
  function tt3(a, b, c) { return tr(a, b, c); }

  /* a figura do menu do Chrome (⋮ → Instalar app), desenhada aqui: sem imagem baixada */
  var FIGURA = '<svg width="220" height="96" viewBox="0 0 220 96" role="img" aria-label="Chrome: ⋮ → Instalar app" style="display:block;margin:8px 0">' +
    '<rect x="1" y="1" width="218" height="94" rx="10" fill="#1b2430" stroke="#2e3c4f"/><rect x="10" y="10" width="160" height="20" rx="10" fill="#2e3c4f"/>' +
    '<text x="20" y="24" font-size="10" fill="#c9d4e2">moneytrio.solverone.com.br</text><circle cx="200" cy="15" r="2.2" fill="#fff"/><circle cx="200" cy="21" r="2.2" fill="#fff"/><circle cx="200" cy="27" r="2.2" fill="#fff"/>' +
    '<circle cx="200" cy="21" r="10" fill="none" stroke="#ffb84d" stroke-width="2"/><rect x="96" y="40" width="118" height="46" rx="6" fill="#0b0f14" stroke="#2e3c4f"/>' +
    '<rect x="100" y="60" width="110" height="20" rx="4" fill="#2bb3ff33" stroke="#2bb3ff"/><text x="106" y="54" font-size="10" fill="#8a96a8">Nova guia</text><text x="106" y="74" font-size="11" fill="#fff">📲 Instalar app</text></svg>';

  function oferecerInstalar() {
    var d = agora(); if (!d.android || instaladoAgora() || document.getElementById('acInstalar')) return false;
    if (Date.now() < (+JSON.parse(localStorage.getItem(K_DEPOIS) || '0') || 0)) return false;
    if (d.dentroDeApp || d.samsung) return false;   /* nesses, a tela de entrada já levou ao Chrome */
    var temPrompt = typeof PWA !== 'undefined' && !!PWA.prompt;
    if (!temPrompt && !d.chrome) return false;      /* outro navegador: na dúvida, nada */
    var el = document.createElement('div'); el.id = 'acInstalar'; el.className = 'nv-pedido'; el.setAttribute('role', 'status');
    if (!document.getElementById('nvCss')) el.style.cssText = 'position:fixed;left:8px;right:8px;top:12px;z-index:99980;padding:10px 12px;border-radius:12px;background:#151c26;border:1px solid #ffb84d;color:#e7edf5;font:14px system-ui,sans-serif';   /* sem a nuvem, o CSS dela não carregou */
    el.innerHTML = '<span>📲 ' + esc(tr('Ter o MoneyTRIO na tela inicial, como um app (abre mais rápido e até sem internet)?', 'Have MoneyTRIO on your home screen, like an app (opens faster, even offline)?', '¿Tener MoneyTRIO en la pantalla de inicio, como una app (abre más rápido e incluso sin internet)?')) +
      (temPrompt ? '' : '<span class="nv-tiny" id="acComo" style="display:block">' + esc(tr('No Chrome: toque nos ⋮ (canto de cima) e em "Instalar app".', 'In Chrome: tap ⋮ (top corner) and "Install app".', 'En Chrome: toca ⋮ (esquina de arriba) e "Instalar app".')) + FIGURA + '</span>') + '</span>' +
      (temPrompt ? '<button class="nv-btn pri" id="acInstalarSim">' + esc(tr('Instalar na tela inicial', 'Install on home screen', 'Instalar en la pantalla de inicio')) + '</button>' : '') +
      '<button class="nv-lnk" id="acInstalarNao">' + esc(tr('Agora não', 'Not now', 'Ahora no')) + '</button>';
    document.body.appendChild(el);
    el.querySelector('#acInstalarNao').onclick = function () { try { localStorage.setItem(K_DEPOIS, JSON.stringify(Date.now() + 30 * 86400000)); } catch (e) {} el.remove(); };
    if (temPrompt) el.querySelector('#acInstalarSim').onclick = function () { el.remove(); PWA.instalar().catch(function (e) { if (typeof toast === 'function') toast(e.message, 'warn'); }); };
    return true;
  }

  MoneyModulos.registrar({
    id: 'abrir-no-chrome', versao: '1.0.1', colecoes: [], pontos: {}, acoes: {}, telas: {}, ouvir: {},
    /* depois de entrar: a oferta aparece uns segundos depois (dá tempo do beforeinstallprompt chegar) */
    iniciar: function () {
      var tentar = function () { var dentro = (window.MoneyNuvem && MoneyNuvem.iniciado) || (function () { try { return !!localStorage.getItem('moneytrio.soNesteAparelho'); } catch (e) { return false; } })(); if (dentro) oferecerInstalar(); };
      setTimeout(tentar, 8000);
      document.addEventListener('mt:instalavel', function () { setTimeout(tentar, 1500); });
    }
  });
  window.AbrirChrome = { detectar: detectar, link: link, htmlEntrada: htmlEntrada, oferecerInstalar: oferecerInstalar, FIGURA: FIGURA };
})();
