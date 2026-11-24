/* =====================================================================
   teste/teste-abrir-chrome.js — 3.106 (item g): "Abrir no Chrome" e "Instalar na tela inicial" no Android (abrir-no-chrome.js 1.0.0)
   ---------------------------------------------------------------------
   Com userAgents simulados: dentro do WhatsApp/Gmail (Custom Tab, "; wv)"), no navegador da Samsung, no Firefox, no Chrome do Android,
   no iPhone e no computador. A tela de entrada mostra "Abrir no Chrome" (intent://… package=com.android.chrome) só onde se aplica; na
   dúvida, nada. Depois de entrar, no Chrome do Android, "Instalar na tela inicial" chama o beforeinstallprompt guardado; sem ele, a
   instrução curta com a figura. Dados fictícios. Uso: node teste/teste-abrir-chrome.js
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

    console.log('3) depois de entrar: Instalar na tela inicial');
    const p = await abrir(UA.chromeAndroid, true);
    const r1 = await p.evaluate(() => { let chamou = 0; PWA.prompt = { prompt: () => { chamou++; }, userChoice: Promise.resolve({ outcome: 'accepted' }) }; const ofereceu = AbrirChrome.oferecerInstalar(); document.querySelector('#acInstalarSim').click(); return { ofereceu, chamou }; });
    ok(r1.ofereceu && r1.chamou === 1, 'com o beforeinstallprompt guardado: "Instalar na tela inicial" chama a instalação no toque');
    const r2 = await p.evaluate(() => { PWA.prompt = null; const o = AbrirChrome.oferecerInstalar(); const e = document.getElementById('acInstalar'); const r = { o, txt: e && e.textContent, fig: !!(e && e.querySelector('svg')) }; document.querySelector('#acInstalarNao').click(); return r; });
    ok(r2.o && /Instalar app/.test(r2.txt) && r2.fig, 'sem o prompt: a instrução curta com a figura do menu do Chrome');
    ok(!(await p.evaluate(() => AbrirChrome.oferecerInstalar())) && (await p.evaluate(() => JSON.parse(localStorage.getItem('dgo:moneytrio:aviso:instalar:depois')) > Date.now() + 29 * 86400000)), '"Agora não" esconde por 30 dias');
    ok(!p.erros.length, 'sem erro na página ' + p.erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
