/* =====================================================================
   teste/teste-rolagem-filtros.js — 3.139: tocar num filtro (ou qualquer coisa que redesenha a MESMA tela) não pula para o topo.
   Dados FICTÍCIOS. Confere, num celular emulado (toque): os filtros da Carteira (instituição e tipo) mantêm a rolagem; ao redesenhar a
   mesma tela, ela não se esconde nem por um instante (a página não encolhe); o mesmo vale para Lançamentos e Configurações; trocar de
   tela continua começando do topo.
   Uso: node teste/teste-rolagem-filtros.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium, devices } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const pos = [], gastos = [];
for (let i = 0; i < 30; i++) pos.push({ id: 'p' + i, ticker: 'EX' + i, nome: 'Exemplo ' + i, tipo: i % 2 ? 'acao-us' : 'acao-br', inst: i % 3 ? 'Corretora A' : 'Corretora B', qtd: 10, pm: 10, moeda: i % 2 ? 'USD' : 'BRL' });
for (let i = 0; i < 60; i++) gastos.push({ id: 'g' + i, data: '2026-11-' + String(1 + (i % 26)).padStart(2, '0'), valor: 10 + i, desc: 'LOJA EXEMPLO ' + i, fluxo: 'saida', grupo: 'HABITACAO', sub: 'Mercado' });

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext(Object.assign({}, devices['Pixel 7'], { serviceWorkers: 'block' }));
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify({ v: 1, config: {}, gastos, posicoes: pos }));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('investify'); irPara('carteira'); render();
      /* vigia: a tela atual não pode ganhar "hidden" num redesenho dela mesma */
      window.__escondeu = 0; new MutationObserver((ms) => ms.forEach((m) => { if (m.target.id === 'view-' + viewAtual && m.target.classList.contains('hidden')) window.__escondeu++; })).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] }); });
    await p.waitForTimeout(400);

    console.log('1) os filtros da Carteira, com o dedo');
    for (const sel of ['[data-filtro-inst="Corretora B"]', '[data-filtro-tipo="acao-us"]', '[data-filtro-inst="todas"]', '[data-filtro-tipo="todos"]']) {
      const y0 = await p.evaluate((s) => { const e = document.querySelector(s), d = document.scrollingElement; d.scrollTop = Math.max(0, e.getBoundingClientRect().top + d.scrollTop - 250); return d.scrollTop; }, sel);
      await p.waitForTimeout(100);
      const box = await p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, sel);
      await p.touchscreen.tap(box[0], box[1]); await p.waitForTimeout(300);
      const y1 = await p.evaluate(() => document.scrollingElement.scrollTop);
      ok(y0 > 0 && Math.abs(y1 - y0) <= 2, 'tocar em ' + sel + ': a rolagem fica (' + y0 + ' → ' + y1 + ')');
    }
    ok(await p.evaluate(() => window.__escondeu === 0), 'a Carteira nunca se escondeu ao ser redesenhada (a página não encolhe)');

    console.log('2) o mesmo em outras telas');
    for (const [app, v] of [['budget', 'b-lanc'], ['budget', 'config']]) {
      const r = await p.evaluate(([a, v]) => { abrirApp(a); irPara(v); render(); const d = document.scrollingElement; d.scrollTop = 600; const y0 = d.scrollTop; window.__escondeu = 0; render(); return { y0, y1: d.scrollTop, esc: window.__escondeu }; }, [app, v]);
      ok(r.y0 > 0 && r.y1 === r.y0 && r.esc === 0, v + ': redesenhar mantém a rolagem e não esconde a tela ' + JSON.stringify(r));
    }
    const t = await p.evaluate(() => { document.scrollingElement.scrollTop = 600; irPara('b-painel'); return new Promise((ok) => setTimeout(() => ok(document.scrollingElement.scrollTop), 600)); });
    ok(t === 0, 'trocar de tela continua começando do topo');
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
    await ctx.close();
  } finally { await b.close(); srv.close(); }
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
