/* =====================================================================
   teste/teste-3144-inbox.js — 3.144: 📥 cheio mais leve. Dados FICTÍCIOS (lojas e valores inventados).
   Confere:
   - um grupo com 130 itens mostra 50 e "Mostrar mais 50 (faltam 80)"; cada toque traz mais 50; no fim, o botão some;
   - o número do topo continua o total (99+), e o título do grupo diz 130;
   - abrir de novo pelo 📥 volta a 50;
   - um item com lista dentro (<li> dentro de <li>) não é cortado ao meio;
   - Pagamento.achar com índice: acha o marcado, some ao desmarcar, o primeiro de um par repetido vale, e acha o que entra depois;
   - nenhum erro na página.
   Uso: node teste/teste-3144-inbox.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const gastos = [];
const A = ['ALFA', 'BETA', 'GAMA', 'DELTA', 'EPSILON', 'ZETA', 'TETA', 'IOTA', 'KAPA', 'LAMBDA', 'OMEGA'], B = ['NORTE', 'SUL', 'LESTE', 'OESTE', 'CENTRO', 'ALTO', 'BAIXO', 'NOVO', 'VELHO', 'GRANDE', 'PEQUENO', 'MEIO'];
for (let i = 0; i < 130; i++) { const nome = 'LOJA ' + A[i % 11] + ' ' + B[Math.floor(i / 11)];
  gastos.push({ id: 'g' + i, data: '2026-11-' + String(1 + (i % 20)).padStart(2, '0'), valor: 10 + i, grupo: 'CASA', sub: 'Mercado', desc: nome, descRobo: nome, fluxo: 'saida', origem: 'robo', confianca: 'palpite' }); }
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos, recorrentes: [{ id: 'r1', nome: 'Conta Exemplo', valor: 100, grupo: 'CASA', sub: 'Luz', fluxo: 'saida', regra: 'mensal', dia: 10, desde: '2026-01-01' }] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.clock.setFixedTime(new Date('2026-11-28T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Origem !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-lanc'); render(); });
    const estado = () => p.evaluate(() => { const d = document.querySelector('details[data-inbgrupo="confirmar"]'); if (!d) return null;
      const bt = d.querySelector('[data-inbmais]'); return { itens: d.querySelectorAll(':scope > ul > li.inb-item').length, n: d.querySelector('.inb-n').textContent, bt: bt ? bt.textContent : '' }; });

    console.log('1) 130 itens: 50 de cada vez');
    await p.click('#btnInbox');
    let e = await estado();
    ok(e && e.itens === 50 && e.n === '130' && /Mostrar mais 50 \(faltam 80\)/.test(e.bt), 'abre com 50 e "Mostrar mais 50 (faltam 80)"; o grupo diz 130: ' + JSON.stringify(e));
    ok(await p.evaluate(() => document.getElementById('inboxN').textContent === '99+'), 'o número do topo continua 99+');
    await p.click('[data-inbmais="confirmar"]'); e = await estado();
    ok(e.itens === 100 && /Mostrar mais 30 \(faltam 30\)/.test(e.bt), 'um toque: 100 e "Mostrar mais 30 (faltam 30)": ' + JSON.stringify(e));
    await p.click('[data-inbmais="confirmar"]'); e = await estado();
    ok(e.itens === 130 && !e.bt, 'outro toque: os 130, sem botão');
    const nomes = await p.evaluate(() => [...document.querySelectorAll('details[data-inbgrupo="confirmar"] > ul > li.inb-item b')].map((x) => x.textContent));
    ok(new Set(nomes).size === 130, 'nenhum item repetido nem perdido (' + new Set(nomes).size + ' diferentes)');
    await p.evaluate(() => { document.querySelectorAll('.modal-wrap:not(.hidden)').forEach((m) => fechar(m.id)); });
    await p.click('#btnInbox'); e = await estado();
    ok(e.itens === 50, 'abrir de novo pelo 📥 volta a 50');

    console.log('2) item com lista dentro não é cortado');
    const pr = await p.evaluate(() => inboxPartes('<li class="a">um<ul><li>x</li><li>y</li></ul></li><li class="b">dois</li><li class="c">tres<ul><li>z</li></ul></li>'));
    ok(pr.length === 3 && pr[0] === '<li class="a">um<ul><li>x</li><li>y</li></ul></li>' && pr[2] === '<li class="c">tres<ul><li>z</li></ul></li>', '3 itens de fora, cada um com a sua lista: ' + JSON.stringify(pr));

    console.log('3) Pagamento.achar com índice');
    const pg = await p.evaluate(() => {
      const r = {};
      Pagamento.marcar('r1', '2026-11-10', 'pago'); r.marcado = (Pagamento.achar('r1', '2026-11-10') || {}).estado;
      Pagamento.desmarcar ? Pagamento.desmarcar('r1', '2026-11-10') : (ST.pagamentos = ST.pagamentos.filter((x) => !(x.rid === 'r1' && x.data === '2026-11-10')));
      r.depois = Pagamento.achar('r1', '2026-11-10');
      ST.pagamentos.push({ rid: 'r1', data: '2026-10-10', estado: 'pago' }, { rid: 'r1', data: '2026-10-10', estado: 'naoPago' });
      r.primeiro = Pagamento.achar('r1', '2026-10-10').estado;
      ST.pagamentos = ST.pagamentos.concat([{ rid: 'r1', data: '2026-09-10', estado: 'pago' }]);
      r.novaLista = (Pagamento.achar('r1', '2026-09-10') || {}).estado;
      return r; });
    ok(pg.marcado === 'pago' && pg.depois === null && pg.primeiro === 'pago' && pg.novaLista === 'pago', 'acha o marcado; some ao desmarcar; o primeiro de um par vale; acha numa lista nova: ' + JSON.stringify(pg));
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ FALHOU (exceção): ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
