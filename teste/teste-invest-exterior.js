/* teste/teste-invest-exterior.js — 3.125: o aviso de investimento no exterior (ficha.investimento_exterior) vira evento sem valor na
   Carteira, sem pedir nada no 📥 e sem mexer nos movimentos. Dados FICTÍCIOS (corretora, ativo e CUSIP inventados). */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify({ v: 1, config: { fitaLigada: false }, posicoes: [], gastos: [], recorrentes: [], movimentos: [] }));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.InvestExterior && window.Comprovantes);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); });
    const r = await p.evaluate(() => { Comprovantes.receber({ id: 'av-1', subtipo: 'outro', loja: 'Corretora Ficticia', data: '2026-11-18', ficha: { investimento_exterior: { corretora: 'Corretora Ficticia', ativo: 'FICT ETF', cusip: '000000000', data_pregao: '2026-11-17', conta_final: '9999' } } });
      abrirApp('investify'); irPara('carteira'); render(); const c = document.querySelector('.ie-card');
      return { txt: c ? c.textContent.replace(/\s+/g, ' ') : '', pend: Comprovantes.pendencias().length, mov: (ST.movimentos || []).length }; });
    ok(/🌎 Eventos no exterior \(do e-mail\)/.test(r.txt) && /17\/Nov\/2026 · FICT ETF \(CUSIP 000000000\) · Corretora Ficticia · conta ···9999/.test(r.txt) && /Sem valor/.test(r.txt), 'a Carteira mostra o evento, sem valor: ' + r.txt.slice(0, 160));
    ok(r.pend === 0 && r.mov === 0, 'não pede nada no 📥 e não cria movimento');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
