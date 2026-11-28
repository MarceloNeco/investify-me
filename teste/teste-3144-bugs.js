/* =====================================================================
   teste/teste-3144-bugs.js — 3.144: dois defeitos. Dados FICTÍCIOS.
   (a) faixa do topo: categoria com o mês passado perto de zero não mostra % absurda ("bem acima do mês passado (R$ X)");
       a % normal continua.
   (b) "PAGAMENTO DEBITO AUTOMATICO" sozinho é a fatura do cartão paga no débito: não entra nos custos que se repetem nem
       no "A confirmar" agrupado por origem; "DEBITO AUTOMATICO <empresa>" continua sendo conta.
   Uso: node teste/teste-3144-bugs.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const G = (id, data, valor, grupo, sub, desc, extra) => Object.assign({ id, data, valor, grupo, sub, desc, descRobo: desc, fluxo: 'saida', origem: 'robo' }, extra || {});
const gastos = [
  /* (a) Lazer › Passeios: R$ 4,00 em outubro, R$ 900,00 em novembro; Casa › Mercado: 400 → 600 (+50 %) */
  G('a1', '2026-10-10', 4, 'LAZER', 'Passeios', 'PASSEIO EXEMPLO'), G('a2', '2026-11-10', 900, 'LAZER', 'Passeios', 'PASSEIO EXEMPLO'),
  G('m1', '2026-10-12', 400, 'CASA', 'Mercado', 'MERCADO EXEMPLO'), G('m2', '2026-11-12', 600, 'CASA', 'Mercado', 'MERCADO EXEMPLO')
];
/* (b) 4 meses de pagamento da fatura no débito e de uma conta de verdade no débito */
['2026-08-05', '2026-09-05', '2026-10-05', '2026-11-05'].forEach((d, i) => {
  gastos.push(G('pd' + i, d, 1000 + i * 37, 'OUTROS', 'Sem categoria', 'PAGAMENTO DEBITO AUTOMATICO', { confianca: 'palpite' }));
  gastos.push(G('da' + i, d, 150, 'CASA', 'Seguro residencial', 'DEBITO AUTOMATICO SEGURADORA EXEMPLO'));
});
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos, recorrentes: [] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.clock.setFixedTime(new Date('2026-11-20T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof FitaBudget !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); });

    console.log('(a) faixa do topo sem % absurda');
    const fa = await p.evaluate(() => FitaBudget.itens().map((x) => x.texto || '').filter((t) => /Passeios|Mercado/.test(t)));
    const pas = fa.find((t) => /Passeios/.test(t)) || '', mer = fa.find((t) => /Mercado/.test(t)) || '';
    ok(/Passeios: R\$\s?900,00 este mês, bem acima do mês passado \(R\$\s?4,00\)/.test(pas) && !/%/.test(pas), 'mês passado R$ 4,00: "bem acima do mês passado (R$ 4,00)", sem %: ' + JSON.stringify(pas));
    ok(/Mercado: R\$\s?600,00 este mês, 50% acima do mês passado/.test(mer), 'a % normal continua (+50 %): ' + JSON.stringify(mer));
    const fen = await p.evaluate(() => { I18n.atual = 'en'; const t = FitaBudget.itens().map((x) => x.texto || '').find((x) => /Passeios/.test(x)); I18n.atual = 'pt'; return t || ''; });
    ok(/well above last month/.test(fen), 'EN: "well above last month"');

    console.log('(b) PAGAMENTO DEBITO AUTOMATICO fora das listas');
    const det = await p.evaluate(() => Recorrente.detectar('2026-11-20').map((x) => x.r.sub + '|' + x.r.grupo + '|' + x.r.nome));
    ok(det.some((s) => /Seguro residencial/.test(s)), 'a conta no débito (seguro) entra nos custos que se repetem: ' + JSON.stringify(det));
    ok(!det.some((s) => /Sem categoria|OUTROS/.test(s)), 'o pagamento da fatura no débito não entra');
    const gr = await p.evaluate(() => Origem.grupos().map((x) => x.rotulo + '|' + x.itens.length));
    ok(!gr.some((s) => /PAGAMENTO DEBITO/i.test(s)), '"A confirmar" agrupado por origem: sem o pagamento da fatura: ' + JSON.stringify(gr));
    ok(await p.evaluate(() => ehPagtoFatura('PAGAMENTO DEBITO AUTOMATICO') && ehPagtoFatura('PAGTO DEB AUTOMATICO 4321') && !ehPagtoFatura('DEBITO AUTOMATICO SEGURADORA EXEMPLO') && !ehPagtoFatura('PAGAMENTO DEBITO AUTOMATICO SEGURADORA EXEMPLO')),
      'reconhece "PAGAMENTO DEBITO AUTOMATICO" (e com o final do cartão), mas não quando vem o nome de quem cobra');
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ FALHOU (exceção): ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
