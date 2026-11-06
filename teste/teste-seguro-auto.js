/* teste/teste-seguro-auto.js — 3.34: o seguro do carro é uma categoria só ("Seguro Auto").
   Lançamentos/compromissos antigos "Seguro Auto Neco"/"Seguro Auto Beta" aparecem como "Seguro Auto" (nada é apagado).
   Uso (na pasta raiz): node teste/teste-seguro-auto.js */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, posicoes: [], config: {},
  gastos: [{ id: 'g1', data: '2026-03-10', valor: 2559.4, grupo: 'VEICULO', sub: 'Seguro Auto Neco', desc: 'Porto' }, { id: 'g2', data: '2025-03-10', valor: 2100, grupo: 'VEICULO', sub: 'Seguro Auto Beta', desc: 'Porto' }, { id: 'g3', data: '2026-01-10', valor: 900, grupo: 'VEICULO', sub: 'IPVA' }],
  recorrentes: [{ id: 'r1', nome: 'Seguro do carro', valor: 2559.4, grupo: 'VEICULO', sub: 'Seguro Auto Neco', regra: 'anual', dia: 10, mes: 3 }],
  categorias: { VEICULO: ['Seguro Auto Beta', 'IPVA'] } };
(async () => {
  const srv = http.createServer((q, s) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'application/octet-stream' }); fs.createReadStream(p).pipe(s); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch();
  try {
    for (const vp of [{ width: 390, height: 800 }, { width: 1366, height: 768 }]) {
      console.log('tela ' + vp.width + 'x' + vp.height);
      const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
      const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && Store.estado.gastos.length === 3);
      const e = await p.evaluate(() => ({ g: Store.estado.gastos.map((x) => [x.sub, x.subAntes || '']), r: Store.estado.recorrentes.map((x) => [x.sub, x.subAntes || '']), c: Store.estado.categorias.VEICULO, v: MUDANCAS[0].v }));
      ok(e.g[0][0] === 'Seguro Auto' && e.g[0][1] === 'Seguro Auto Neco' && e.g[1][0] === 'Seguro Auto' && e.g[1][1] === 'Seguro Auto Beta', 'lançamentos antigos "Seguro Auto Neco/Beta" aparecem como "Seguro Auto" (o nome antigo fica guardado)');
      ok(e.g[2][0] === 'IPVA' && !e.g[2][1], 'outras categorias de Veículo não mudam');
      ok(e.r[0][0] === 'Seguro Auto', 'o compromisso antigo também vira "Seguro Auto"');
      ok(e.c.indexOf('Seguro Auto') >= 0 && !e.c.some((x) => /Alex|Beta/.test(x)) && e.c.indexOf('IPVA') >= 0, 'lista de categorias de Veículo: "Seguro Auto" no lugar das antigas, o resto igual');
      ok(parseFloat(e.v) >= 3.34, 'versão 3.34 ou mais nova (' + e.v + ')');
      const cat = await p.evaluate(() => document.documentElement.innerHTML.indexOf("sub:'Seguro Auto Neco'") < 0);
      ok(cat, 'o catálogo de sugestões não tem mais "Seguro Auto Neco"');
      await p.evaluate(() => { abrirApp('budget'); irPara('b-lanc'); }); await p.waitForTimeout(500);
      ok(erros.length === 0, 'nenhum erro de página (' + erros.length + ')' + (erros[0] ? ': ' + erros[0] : ''));
      await ctx.close();
    }
  } catch (e) { falhas++; console.error('ERRO NO TESTE:', e); }
  finally { await b.close(); srv.close(); }
  console.log('\n' + (falhas ? '✗ ' + falhas + ' falha(s), ' : '✓ ') + oks + ' verificações ok.');
  process.exit(falhas ? 1 : 0);
})();
