/* =====================================================================
   teste/teste-abrir-chrome.js — 3.106 (item g): "Abrir no Chrome" e "Instalar na tela inicial" no Android (abrir-no-chrome.js 1.0.0)
   ---------------------------------------------------------------------
   Com userAgents simulados: dentro do WhatsApp/Gmail (Custom Tab, "; wv)"), no navegador da Samsung, no Firefox, no Chrome do Android,
   no iPhone e no computador. A tela de entrada mostra "Abrir no Chrome" (intent://… package=com.android.chrome) só onde se aplica; na
   dúvida, nada. Depois de entrar, no Chrome do Android, "Instalar na tela inicial" chama o beforeinstallprompt guardado; sem ele, a
   instrução curta com a figura. Dados fictícios. Uso: node teste/teste-abrir-chrome.js
   3.106.1 (abrir-no-chrome 1.1.0): a janela sólida (fundo escurecido, Esc e Voltar fecham), "Instalar" de verdade com o prompt, os passos
   com o nome exato do menu em cada contexto (Custom Tab, Chrome, Samsung, iPhone, computador), a figura apagada com legenda, o
   convite 1 vez, o botão fixo no ☰ e em Configurações que some quando o app está instalado.
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const UA = {
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  webview: 'Mozilla/5.0 (Linux; Android 14; SM-S911B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  firefox: 'Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  pc: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
};

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  const abrir = async (ua, local) => {
    const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, userAgent: ua, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    if (local) await ctx.addInitScript(() => { if (!sessionStorage.getItem('s')) { localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } });
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => window.AbrirChrome && typeof Store !== 'undefined');
    return p;
  };
  try {
    console.log('1) a detecção (pura)');
    const p0 = await abrir(UA.pc, true);
    const d = await p0.evaluate((U) => { const r = {}; Object.keys(U).forEach((k) => { r[k] = AbrirChrome.detectar(U[k], '', false); }); r.gmail = AbrirChrome.detectar(U.chromeAndroid, 'android-app://com.google.android.gm/', false); r.instalado = AbrirChrome.detectar(U.samsung, '', true); return r; }, UA);
    ok(d.webview.mostrar && d.webview.dentroDeApp, 'dentro do WhatsApp/Gmail ("; wv)"): mostra');
    ok(d.gmail.mostrar && d.gmail.dentroDeApp, 'aberto pelo Gmail (referrer android-app://): mostra');
    ok(d.samsung.mostrar && d.samsung.samsung, 'navegador da Samsung: mostra');
    ok(d.firefox.mostrar, 'Firefox no Android: mostra');
    ok(!d.chromeAndroid.mostrar && d.chromeAndroid.chrome, 'Chrome do Android: não mostra');
    ok(!d.iphone.mostrar && !d.pc.mostrar && !d.instalado.mostrar, 'iPhone, computador e app já instalado: não mostra');
    const lk = await p0.evaluate(() => AbrirChrome.link('https://moneytrio.solverone.com.br/?x=1#tela'));
    ok(lk === 'intent://moneytrio.solverone.com.br/?x=1#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent('https://moneytrio.solverone.com.br/?x=1') + ';end', 'o link: ' + lk);
    await p0.context().close();

    console.log('2) a tela de entrada');
    for (const [k, quer] of [['webview', /Aqui dentro o app não fica guardado igual ao Chrome/], ['samsung', /App de risco bloqueado/], ['chromeAndroid', null]]) {
      const p = await abrir(UA[k], false);
      await p.waitForSelector('#nvEm', { timeout: 20000 }).catch(() => {});
      const box = await p.evaluate(() => { const e = document.getElementById('acChrome'); return e ? { t: e.textContent, href: e.querySelector('#acChromeBtn').getAttribute('href') } : null; });
      if (quer) ok(box && quer.test(box.t) && /^intent:\/\/127\.0\.0\.1:\d+\/#Intent;scheme=https;package=com\.android\.chrome;/.test(box.href), k + ': "🌐 Abrir no Chrome" na tela de entrada');
      else ok(!box, k + ': nada (já está no Chrome)');
      await p.context().close();
    }

    console.log('3) a janela de instalar (o convite e o botão fixo)');
    const p = await abrir(UA.chromeAndroid, true);
    const r1 = await p.evaluate(() => { let chamou = 0; PWA.prompt = { prompt: () => { chamou++; }, userChoice: Promise.resolve({ outcome: 'accepted' }) };
      const ofereceu = AbrirChrome.oferecerInstalar(); const j = document.querySelector('#acInstalar .ac-janela'), cs = getComputedStyle(j), fundo = getComputedStyle(document.getElementById('acInstalar'));
      const r = { ofereceu, tit: document.getElementById('acTit').textContent, bg: cs.backgroundColor, op: cs.opacity, escuro: fundo.backgroundColor, modal: j.getAttribute('aria-modal'), passos: !!document.getElementById('acPassos') };
      document.querySelector('#acInstalarSim').click(); r.chamou = chamou; r.fechou = !document.getElementById('acInstalar'); return r; });
    ok(r1.ofereceu && /Instalar o MoneyTRIO no celular/.test(r1.tit) && !r1.passos, 'com o beforeinstallprompt: "📲 Instalar o MoneyTRIO no celular", uma frase e um botão "Instalar" de verdade (sem passos)');
    ok(/^rgb\(/.test(r1.bg) && r1.op === '1' && /rgba\(0, 0, 0, 0\.6/.test(r1.escuro) && r1.modal === 'true', 'a janela é sólida (' + r1.bg + ', opacidade 1), com o fundo escurecido e aria-modal');
    ok(r1.chamou === 1 && r1.fechou, '"Instalar" chama a instalação do navegador (prompt) e fecha');
    ok(!(await p.evaluate(() => AbrirChrome.oferecerInstalar())), 'o convite automático aparece uma vez só por aparelho');
    const r2 = await p.evaluate(() => { PWA.prompt = null; AbrirChrome.abrir(); const e = document.getElementById('acInstalar'); return { passos: [...e.querySelectorAll('#acPassos li')].map((l) => l.textContent), fig: e.querySelector('.ac-fig') && getComputedStyle(e.querySelector('.ac-fig')).opacity, leg: (e.querySelector('.ac-fig figcaption') || {}).textContent, clic: e.querySelector('.ac-fig') && getComputedStyle(e.querySelector('.ac-fig')).pointerEvents }; });
    ok(r2.passos.length === 1 && /No Chrome, toque em ⋮ \(no canto de cima\) e em "Instalar app" \(nas versões antigas, "Adicionar à tela inicial"\)/.test(r2.passos[0]), 'Chrome do Android, sem o prompt: o passo com o nome exato ("Instalar app"; antigo: "Adicionar à tela inicial")');
    ok(r2.fig === '0.7' && r2.clic === 'none' && /É assim que aparece no seu Chrome/.test(r2.leg), 'a figura do menu: apagada, não clicável, com a legenda "É assim que aparece no seu Chrome (é só uma figura)"');
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    ok(!(await p.$('#acInstalar')), 'Esc fecha');
    await p.evaluate(() => AbrirChrome.abrir()); await p.goBack().catch(() => {}); await p.waitForTimeout(300);
    ok(!(await p.$('#acInstalar')) && /127\.0\.0\.1/.test(p.url()), 'o Voltar do celular fecha a janela (e não sai do app)');
    await p.evaluate(() => { localStorage.removeItem('dgo:moneytrio:aviso:instalar:visto'); });
    const semP = await p.evaluate(() => AbrirChrome.contexto(navigator.userAgent, '', true));
    ok(semP === 'android-incerto', 'no Android, 3 s sem o prompt: não assume o Chrome ("' + semP + '")');
    const inc = await p.evaluate(() => AbrirChrome.passos('android-incerto').map((x) => x.html));
    ok(/Abrir no Chrome/.test(inc[0]) && /Instalar app/.test(inc[1]), 'aí o 1º passo é "Abrir no Chrome" e o 2º "⋮ → Instalar app"');

    console.log('4) os passos por contexto');
    const ctxs = await p.evaluate((U) => ({ ct: AbrirChrome.contexto(U.webview, ''), sam: AbrirChrome.contexto(U.samsung, ''), ios: AbrirChrome.contexto(U.iphone, ''), pc: AbrirChrome.contexto(U.pc, ''), ff: AbrirChrome.contexto(U.firefox, ''),
      P: { ct: AbrirChrome.passos('customtab').map((x) => x.html.replace(/<[^>]+>/g, '')), sam: AbrirChrome.passos('samsung').map((x) => x.html.replace(/<[^>]+>/g, '')), ios: AbrirChrome.passos('ios').map((x) => x.html.replace(/<[^>]+>/g, '')), pc: AbrirChrome.passos('computador').map((x) => x.html.replace(/<[^>]+>/g, '')) } }), UA);
    ok(ctxs.ct === 'customtab' && /^Abra no Chrome: .*Abrir no Chrome.*"Abrir no navegador Chrome"/.test(ctxs.P.ct[0]) && /Instalar app/.test(ctxs.P.ct[1]), 'Custom Tab: 1. Abrir no Chrome (ou ⋮ → "Abrir no navegador Chrome"), 2. ⋮ → "Instalar app"');
    ok(ctxs.sam === 'samsung' && /Abrir no Chrome/.test(ctxs.P.sam[0]) && /"Adicionar página a" → "Tela inicial"/.test(ctxs.P.sam[0]) && /App de risco bloqueado/.test(ctxs.P.sam[0]), 'navegador da Samsung: pelo Chrome (a diretriz), explicando o "Adicionar página a → Tela inicial" e o alerta do Play Protect');
    ok(ctxs.ios === 'ios' && /Compartilhar/.test(ctxs.P.ios[0]) && /"Adicionar à Tela de Início"/.test(ctxs.P.ios[1]), 'iPhone: Compartilhar → "Adicionar à Tela de Início"');
    ok(ctxs.pc === 'computador' && /ícone de instalar na barra de endereço/.test(ctxs.P.pc[0]) && /"Transmitir, salvar e compartilhar" → "Instalar página como app"/.test(ctxs.P.pc[1]), 'computador: o ícone na barra de endereço, ou ⋮ → "Transmitir, salvar e compartilhar" → "Instalar página como app"');
    ok(ctxs.ff === 'android-outro', 'Firefox no Android: pelo Chrome');

    console.log('5) o botão fixo "📲 Instalar o app" (☰ e Configurações)');
    await p.evaluate(() => { abrirApp('budget'); montarNav(); });
    ok(!!(await p.$('#navLista [data-acao="ac-instalar"]')), 'no menu ☰ enquanto não está instalado');
    await p.evaluate(() => { irPara('config'); cfgSecao = 'todos'; render(); });
    ok(!!(await p.$('#cfgInstalar [data-acao="ac-instalar"]')), 'em Configurações também');
    await p.evaluate(() => document.querySelector('#cfgInstalar [data-acao="ac-instalar"]').click()); await p.waitForSelector('#acInstalar');
    ok(true, 'o botão abre a janela de instalar'); await p.keyboard.press('Escape');
    ok(!p.erros.length, 'sem erro na página ' + p.erros.join(' | '));
    await p.context().close();
    const pi = await (async () => { const ctx = await b.newContext({ viewport: { width: 400, height: 860 }, userAgent: UA.chromeAndroid, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript(() => { const mm = window.matchMedia.bind(window); window.matchMedia = (q) => /display-mode: standalone/.test(q) ? { matches: true, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} } : mm(q);
        if (!sessionStorage.getItem('s')) { localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } });
      const q = await ctx.newPage(); await q.goto(BASE + '/'); await q.waitForFunction(() => window.AbrirChrome && typeof montarNav === 'function');
      await q.evaluate(() => { abrirApp('budget'); montarNav(); irPara('config'); cfgSecao = 'todos'; render(); });
      const r = { menu: !!(await q.$('#navLista [data-acao="ac-instalar"]')), cfg: !!(await q.$('#cfgInstalar')), conv: await q.evaluate(() => AbrirChrome.oferecerInstalar()) }; await ctx.close(); return r; })();
    ok(!pi.menu && !pi.cfg && !pi.conv, 'instalado (display-mode standalone): o botão some do ☰ e de Configurações, e o convite não aparece');
  } finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
