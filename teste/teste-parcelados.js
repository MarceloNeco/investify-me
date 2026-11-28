/* =====================================================================
   teste/teste-parcelados.js — 3.74: as compras parceladas no cartão (Gasto.parcela k/N, modulos/parcelados.js,
   modulos/previsao.js 1.1.0). Dados FICTÍCIOS.
   Confere: "LOJA X 03/10" gera 7 meses a vir no vencimento da fatura; a parcela que chega não duplica; data dd/mm não
   vira parcela; k/N com " · nota" e grudado; fora do cartão não; o previsto soma como conta certa e tira da média;
   o cartão no Painel e no Futuro; a visão da casa só vê o que é dela.
   Uso: node teste/teste-parcelados.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const C = { cartaoId: 'ct1', forma: 'Cartão de crédito', formaId: 'credito', fluxo: 'saida' };
const gastos = [
  Object.assign({ id: 'l3', data: '2026-11-02', valor: 100, grupo: 'HABITACAO', sub: 'Utilidades', desc: 'LOJA X 03/10' }, C),
  Object.assign({ id: 'pad', data: '2026-11-03', valor: 30, grupo: 'ALIMENTACAO', sub: 'Padaria', desc: 'PADARIA EXEMPLO 28/10' }, C),
  Object.assign({ id: 'nat', data: '2026-11-04', valor: 250, grupo: 'DEPENDENTES', sub: 'Esporte', desc: 'EXITOS ACADE-CT   08/12 · natação' }, C),
  Object.assign({ id: 'cur', data: '2026-11-05', valor: 90, grupo: 'PESSOAL', sub: 'Cursos', desc: 'HTM    *CursoExemplo01/12 · curso' }, C),
  { id: 'pix', data: '2026-11-06', valor: 80, grupo: 'OUTROS', sub: 'Outros', desc: 'PIX EXEMPLO 03/10', fluxo: 'saida', forma: 'Pix' }
];
for (let m = 5; m <= 10; m++) gastos.push({ id: 'u' + m, data: '2026-' + String(m).padStart(2, '0') + '-15', valor: 50, grupo: 'HABITACAO', sub: 'Utilidades', desc: 'MERCADO EXEMPLO', fluxo: 'saida' });
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos, recorrentes: [], cartoes: [{ id: 'ct1', apelido: 'Cartão Exemplo', bandeira: 'visa', fim: '1234', fecha: 25, vence: 5 }] };

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
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Parcelados !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); Parcelados._hoje = '2026-11-15'; Previsao._hoje = '2026-11-15'; });

    console.log('1) o k/N no fim da descrição do cartão');
    const pr = await p.evaluate(() => Gasto.todos().map((g) => [g.id, Gasto.parcela(g.desc, g)]).filter((x) => /^(l3|pad|nat|cur|pix)$/.test(x[0])));
    ok(JSON.stringify(pr) === JSON.stringify([['l3', '3/10'], ['pad', ''], ['nat', '8/12'], ['cur', '1/12'], ['pix', '']]),
      '"LOJA X 03/10" 3/10; "28/10" não (data); "08/12 · natação" 8/12; "*CursoExemplo01/12" 1/12; fora do cartão não: ' + JSON.stringify(pr));
    ok(await p.evaluate(() => Gasto.parcela('COMPRA PARC 03/10') === '3/10' && Gasto.parcela('LOJA 03/10') === '' && Gasto.parcela('LOJA (2/5)', { cartaoId: 'x' }) === '2/5' && Gasto.parcela('LOJA 03/30', { cartaoId: 'x' }) === ''), 'o "PARC 03/10" de antes continua; sem o lançamento não olha o fim; "(2/5)" do robô; N > 24 não');

    console.log('2) o que falta vir');
    const c2 = await p.evaluate(() => Parcelados.compras().find((c) => c.desc === 'LOJA X'));
    ok(c2 && c2.faltam === 7 && c2.futuras.length === 7 && c2.cobranca === '2026-12-05' && c2.futuras[0].data === '2027-01-05' && c2.futuras[6].data === '2027-07-05' && c2.futuras[0].k === 4,
      'LOJA X 03/10 (fatura de 05/12): 7 parcelas a vir, de 05/01/2027 a 05/07/2027 ' + JSON.stringify(c2 && [c2.cobranca, c2.futuras[0], c2.futuras[6]]));
    const r2 = await p.evaluate(() => Parcelados.resumo());
    ok(r2.total === 700 + 4 * 250 + 11 * 90 && r2.meses === 11, 'resumo: 700 + 1.000 + 990 = 2.690 em 11 meses: ' + JSON.stringify([r2.total, r2.meses]));
    const pv = await p.evaluate(() => ({ jan: Previsao.previstoMes('HABITACAO', 'Utilidades', '2027-01'), nov: Previsao.previstoMes('HABITACAO', 'Utilidades', '2026-12') }));
    ok(pv.jan.fixo === 100 && pv.jan.base === 33.33 && pv.jan.comprometidoAVir.some((x) => /LOJA X 4\/10/.test(x.nome)), 'previsto de jan/2027: a parcela 4/10 é conta certa (100) e a média dos variáveis fica sem ela (jul–dez: 4 × 50 / 6 = 33,33; com ela seria 50)');
    ok(pv.nov.fixo === 100 && pv.nov.comprometidoAVir.length === 0, 'dez/2026 (a fatura da 3/10): a parcela que chegou entra pelo valor real, sem nada a vir');

    console.log('3) a parcela que chega não duplica');
    await p.evaluate(() => { Gasto.add(Object.assign({ id: 'l4', data: '2026-12-02', valor: 100, grupo: 'HABITACAO', sub: 'Utilidades', desc: 'LOJA X 04/10' }, { cartaoId: 'ct1', forma: 'Cartão de crédito', formaId: 'credito', fluxo: 'saida' })); });
    const c3 = await p.evaluate(() => ({ c: Parcelados.compras().filter((c) => c.desc === 'LOJA X'), jan: Parcelados.doMes('2027-01').filter((x) => /LOJA X/.test(x.nome)), r: Parcelados.resumo().total }));
    ok(c3.c.length === 1 && c3.c[0].k === 4 && c3.c[0].faltam === 6 && c3.jan.length === 1 && c3.jan[0].real === 100 && c3.r === 2590, 'chegou a 4/10: uma compra só, faltam 6; janeiro tem só a real (100), sem a prevista; total 2.590');

    console.log('4) Painel e Futuro');
    await p.evaluate(() => { abrirApp('budget'); irPara('b-painel'); render(); });
    const t4 = await p.evaluate(() => (document.querySelector('#view-b-painel .pc-card') || {}).textContent || '');
    ok(/Faltam R\$ 2\.590,00 em 11 meses/.test(t4) && /LOJA X/.test(t4) && /4\/10 · última em 07\/2027/.test(t4) && /Quanto cai em cada mês/.test(t4), 'Painel: "Parcelados no cartão: faltam R$ 2.590,00 em 11 meses", a lista e o total por mês');
    await p.evaluate(() => { irPara('b-custos'); custosSecao = 'planejados'; planejadosParte = 'parcelados'; render(); });   /* 3.76: saiu do Futuro */
    ok(await p.evaluate(() => !!document.querySelector('#view-b-custos .pc-card')), 'o mesmo cartão em Contas fixas → Gastos planejados → Parcelados');

    console.log('5) visão da casa');
    const vc = await p.evaluate(() => { const o = Gasto.todos; Gasto.todos = () => o.call(Gasto).filter((g) => g.id !== 'nat' && g.id !== 'cur'); const r = Parcelados.resumo().total; Gasto.todos = o; return r; });
    ok(vc === 600, 'com só os lançamentos que ela vê, só os parcelados dela (600)');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
