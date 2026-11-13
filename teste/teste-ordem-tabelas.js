/* =====================================================================
   teste/teste-ordem-tabelas.js — 3.84: N10 (a ordem das listas depois de abrir da nuvem) e N35 (cabeçalho fixo nas
   tabelas novas da PJ). Dados FICTÍCIOS.
   Confere: cartões, metas, bancos e empresas voltam da nuvem em ordem alfabética, iguais em qualquer aparelho (e as
   coleções com ordem própria, como os lançamentos, não mudam); no computador, "próximos 90 dias" da PJ tem cabeçalho fixo
   ao rolar a página e a prévia do extrato BS2 tem cabeçalho preso dentro da janela.
   Uso: node teste/teste-ordem-tabelas.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [], transferencias: [],
  gastos: [{ id: 'g1', data: '2026-11-05', valor: 20000, grupo: 'RENDA', sub: 'Faturamento PJ (Cliente Exemplo)', desc: 'WIRE', fluxo: 'entrada', conta: 'BS2 Internacional', irTexto: 'PJ', moeda: 'USD', valorMoeda: 4000, ptax: 5 }],
  empresas: [{ id: 'emA', cnpj: '11222333000181', razao: 'EMPRESA EXEMPLO LTDA', regime: 'fator-r', contasRobo: ['BS2 PJ', 'BS2 Internacional'], docs: [], pix: [], contas: [] }],
  pj_contas: Array.from({ length: 14 }, (_, i) => ({ id: 'pc' + i, empresaId: 'emA', tipo: 'receber', quem: 'Cliente ' + i, nota: String(100 + i), valor: 1000 + i, moeda: 'BRL', data: '2026-12-' + String(1 + i).padStart(2, '0') })),
  saldos_banco: [{ id: 'sbpj', tipo: 'conta', banco: 'BS2', conta: 'BS2 PJ', saldo: 7000, data: '2026-11-13', hist: [] }] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.MoneyNuvem && MoneyNuvem._teste && typeof PJGestao !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); PJ._hoje = PJGestao._hoje = '2026-11-13'; });

    console.log('1) N10: a ordem depois de abrir da nuvem');
    const o1 = await p.evaluate(() => {
      const regs = [['cartoes', 'c3', { id: 'c3', apelido: 'Visa Zeta' }], ['cartoes', 'c1', { id: 'c1', apelido: 'Amex Alfa' }], ['cartoes', 'c2', { id: 'c2', apelido: 'Master Beta' }],
        ['metas', 'm2', { id: 'm2', nome: 'Viagem' }], ['metas', 'm1', { id: 'm1', nome: 'Casa' }],
        ['bancos', 'b2', { id: 'b2', nome: 'Banco Zeta' }], ['bancos', 'b1', { id: 'b1', nome: 'Banco Alfa' }],
        ['gastos', 'g2', { id: 'g2', data: '2026-11-02', valor: 1, grupo: 'OUTROS', sub: 'X', desc: 'B' }], ['gastos', 'g1', { id: 'g1', data: '2026-11-01', valor: 1, grupo: 'OUTROS', sub: 'X', desc: 'A' }]];
      const e1 = MoneyNuvem._teste.reconstruir(regs), e2 = MoneyNuvem._teste.reconstruir(regs.slice().reverse());
      const n = (l, k) => (l || []).map((x) => x[k]).join(',');
      return { c1: n(e1.cartoes, 'apelido'), c2: n(e2.cartoes, 'apelido'), m: n(e1.metas, 'nome'), b: n(e1.bancos, 'nome'), g: n(e1.gastos, 'id') };
    });
    ok(o1.c1 === 'Amex Alfa,Master Beta,Visa Zeta' && o1.c1 === o1.c2, 'cartões em ordem alfabética, a mesma qualquer que seja a ordem da nuvem');
    ok(o1.m === 'Casa,Viagem' && o1.b === 'Banco Alfa,Banco Zeta', 'metas e bancos também');
    ok(o1.g === 'g2,g1', 'lançamentos (que têm data) não são reordenados aqui');

    console.log('2) N35: cabeçalho fixo nas tabelas novas da PJ');
    await p.evaluate(() => { abrirApp('tax'); irPara('t-pj'); render(); });
    await p.waitForFunction(() => document.querySelector('.pjg-prox') && document.querySelector('.pjg-prox').classList.contains('tbl-topo'), null, { timeout: 4000 }).catch(() => {});
    const t2 = await p.evaluate(() => { const tb = document.querySelector('.pjg-prox'); return { thead: !!(tb && tb.tHead), topo: !!(tb && tb.classList.contains('tbl-topo')), pos: tb && tb.tHead ? getComputedStyle(tb.tHead.rows[0].cells[0]).position : '' }; });
    ok(t2.thead && t2.topo && t2.pos === 'sticky', '"Próximos 90 dias": cabeçalho (Data, O quê, Valor, Saldo) preso ao rolar a página');
    await p.evaluate(() => { BS2Extrato._previa({ novos: Array.from({ length: 30 }, (_, i) => ({ id: 'rb_x' + i, data: '2026-11-01', desc: 'LINHA ' + i, conta: 'BS2 PJ', sub: 'A identificar', valor: 10 + i })), ja: [], ignorados: [] }); });
    const t3 = await p.evaluate(() => { const tb = document.querySelector('#genBody .bs2-previa'), cx = tb.parentElement; return { thead: !!tb.tHead, fixa: cx.classList.contains('tbl-fixa'), pos: getComputedStyle(tb.tHead.rows[0].cells[0]).position, rola: cx.scrollHeight > cx.clientHeight }; });
    ok(t3.thead && t3.fixa && t3.pos === 'sticky' && t3.rola, 'prévia do BS2: a lista rola dentro da janela com o cabeçalho preso');

    ok(p.erros.length === 0, 'sem erros na página: ' + p.erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)'); process.exit(falhas ? 1 : 0);
})();
