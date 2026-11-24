/* =====================================================================
   teste/teste-toast.js — 3.106 (item n): os avisos rápidos (toast) saem da frente (modulos/toast-fechavel.js 1.0.0)
   ---------------------------------------------------------------------
   Tocar, arrastar para o lado (≥ 60 px) e o ✕ de 44 px fecham; no celular o toast fica no topo, abaixo da barra (não tampa o meio nem
   a barra de baixo); "N ativos da B3 precisam do token gratuito" sai no máximo 1 vez por dia por aparelho e fica no 📥 com "Resolver";
   aria-live mantido. Dados fictícios. Uso: node teste/teste-toast.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos: [], recorrentes: [] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.Toque);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-painel'); render(); });
    /* só os avisos deste teste (sem internet, o app avisa por conta própria) */
    const n = () => p.evaluate(() => [...document.querySelectorAll('#toasts .toast')].filter((e) => /Aviso de|ativos da B3/.test(e.textContent)).length);
    const um = async (txt) => { await p.evaluate((t) => { document.getElementById('toasts').innerHTML = ''; toast(t); }, txt); return p.locator('#toasts .toast').first(); };

    console.log('1) tocar, arrastar e ✕ fecham');
    let t = await um('Aviso de teste um');
    ok(await p.evaluate(() => document.getElementById('toasts').getAttribute('aria-live') === 'polite'), 'aria-live mantido');
    const x = await p.evaluate(() => { const r = document.querySelector('#toasts .toast-x').getBoundingClientRect(); return { w: r.width, h: r.height }; });
    ok(x.w >= 44 && x.h >= 44, 'o ✕ tem ' + x.w + '×' + x.h + ' px (mínimo 44)');
    await t.click({ position: { x: 20, y: 10 } }); await p.waitForTimeout(400);
    ok((await n()) === 0, 'tocar no toast fecha');
    t = await um('Aviso de teste dois');
    const bb = await t.boundingBox();
    await p.mouse.move(bb.x + 30, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.move(bb.x + 70, bb.y + bb.height / 2, { steps: 4 }); await p.mouse.move(bb.x + 130, bb.y + bb.height / 2, { steps: 4 }); await p.mouse.up();
    await p.waitForTimeout(400);
    ok((await n()) === 0, 'arrastar para o lado (100 px) fecha, com animação');
    t = await um('Aviso de teste três');
    const bb3 = await t.boundingBox();
    await p.mouse.move(bb3.x + 30, bb3.y + bb3.height / 2); await p.mouse.down(); await p.mouse.move(bb3.x + 50, bb3.y + bb3.height / 2, { steps: 3 }); await p.mouse.up();
    await p.waitForTimeout(300);
    ok((await n()) === 1, 'arrastar pouco (20 px) não fecha: o toast volta ao lugar');
    await p.click('#toasts .toast-x'); await p.waitForTimeout(400);
    ok((await n()) === 0, 'o ✕ fecha');

    console.log('2) no celular, no topo, abaixo da barra');
    t = await um('Aviso de posição');
    const pos = await p.evaluate(() => { const r = document.querySelector('#toasts .toast').getBoundingClientRect(), tb = document.querySelector('.topbar'); return { top: r.top, bottom: r.bottom, barra: tb ? tb.getBoundingClientRect().bottom : 0, h: innerHeight }; });
    ok(pos.top >= pos.barra - 2 && pos.bottom < pos.h / 3, 'o toast fica no topo, logo abaixo da barra (' + Math.round(pos.top) + 'px; barra até ' + Math.round(pos.barra) + 'px)');

    console.log('3) o aviso da B3 não insiste');
    const msg = '4 ativos da B3 precisam do token gratuito. Veja em Configurações.';
    await p.evaluate((m) => { document.getElementById('toasts').innerHTML = ''; localStorage.removeItem('dgo:moneytrio:aviso:b3-token:dia'); toast(m); }, msg);
    ok((await n()) === 1, 'na primeira vez do dia, aparece');
    await p.evaluate((m) => { document.getElementById('toasts').innerHTML = ''; toast(m); }, msg);
    ok((await n()) === 0, 'de novo no mesmo dia: não aparece');
    await p.reload(); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.Toque);
    await p.evaluate((m) => { toast(m); }, msg);
    ok((await n()) === 0, 'reabrindo o app no mesmo dia: não aparece');
    const inb = await p.evaluate(() => (inboxGrupos().find((g) => g.id === 'avisos') || {}).html || '');
    ok(/4 ativos da B3 precisam do token gratuito/.test(inb) && /data-acao="as-chaves"[^>]*>Resolver/.test(inb), 'fica no 📥 (Avisos) com "Resolver" (vai para Configurações → Chaves)');
    await p.evaluate(() => localStorage.setItem('dgo:moneytrio:aviso:b3-token:dia', '2000-01-01'));
    await p.evaluate((m) => { toast(m); }, msg);
    ok((await n()) === 1, 'no outro dia, aparece uma vez de novo');
    ok(!erros.length, 'sem erro na página ' + erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
