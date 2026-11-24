/* =====================================================================
   teste/teste-versao-hub.js — 3.106.1: a versão na tela inicial (a dos três cartões BudgetONE/InvestifyONE/FiscalONE)
   ---------------------------------------------------------------------
   Embaixo da linha dos dados, uma linha mais apagada e alinhada à direita: "MoneyTRIO <versão> · <data>" (VERSAO e VERSAO_DATA,
   que saem do topo de textos/mudancas.js; a data no formato da plataforma). Tocar abre as Novidades. PT/EN/ES.
   Dados fictícios. Uso: node teste/teste-versao-hub.js
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
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof viewHub === 'function');
    const ver = await p.evaluate(() => ({ v: VERSAO, d: VERSAO_DATA, topo: MUDANCAS[0].v }));
    ok(ver.v === '3.106.1' && ver.d === '2026-11-24' && ver.topo === ver.v, 'a versão vem do topo das Novidades: ' + ver.v + ' · ' + ver.d);
    const linha = async (l) => p.evaluate((x) => { I18n.atual = x; const d = document.createElement('div'); d.id = 'tHub'; d.innerHTML = viewHub(); document.body.appendChild(d);
      const pe = d.querySelector('.hub-pe'), v = d.querySelector('.hub-versao'); const r = { txt: v && v.textContent, depois: !!(pe && pe.nextElementSibling === v), alinha: v && getComputedStyle(v).textAlign, op: v && +getComputedStyle(v).opacity, acao: v && v.querySelector('[data-acao="ver-mudancas"]') ? 1 : 0 };
      d.remove(); return r; }, l);
    const pt = await linha('pt');
    ok(pt.txt === 'MoneyTRIO 3.106.1 · 24/Nov/2026', 'PT: "' + pt.txt + '"');
    ok(pt.depois && pt.alinha === 'right' && pt.op < 1, 'logo embaixo da linha dos dados, alinhada à direita e mais apagada');
    ok((await linha('en')).txt === 'MoneyTRIO 3.106.1 · Nov/24/2026', 'EN: a data no formato da plataforma (Nov/24/2026)');
    ok(/^MoneyTRIO 3\.106\.1 · 24\/nov\/2026$/i.test((await linha('es')).txt), 'ES: "' + (await linha('es')).txt + '"');
    await p.evaluate(() => { I18n.atual = 'pt'; });
    ok(pt.acao === 1, 'é um botão de "ver as novidades"');
    await p.evaluate(() => { const d = document.createElement('div'); d.id = 'tHub2'; d.innerHTML = viewHub(); document.body.appendChild(d); d.querySelector('.hub-versao button').click(); });
    await p.waitForTimeout(300);
    ok(await p.evaluate(() => !document.getElementById('genModal').classList.contains('hidden') && /3\.106\.1/.test(document.getElementById('genModal').textContent)), 'tocar abre as Novidades, com a 3.106.1');
    ok(!erros.length, 'sem erro na página ' + erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
