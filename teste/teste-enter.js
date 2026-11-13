/* =====================================================================
   teste/teste-enter.js — 3.68.1: o Enter numa janela sempre aperta o botão do rodapé (Salvar), nunca um botão
   primário no alto do formulário (ex.: "✓ Confirmar como está" de um palpite do robô). Dados fictícios.
   Uso: node teste/teste-enter.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const d = new Date().toISOString().slice(0, 8);
const cp = { cnpj: '00000000000191', nome: 'PANIFICADORA EXEMPLO LTDA' };
const gastos = [
  { id: 'p1', data: d + '02', valor: 12, grupo: 'OUTROS', sub: 'Outros', desc: 'PANIFICADORA EXEMPLO LTDA', fluxo: 'saida', origem: 'robo', confianca: 'palpite', contraparte: cp },
  { id: 'p2', data: d + '05', valor: 15, grupo: 'OUTROS', sub: 'Outros', desc: 'PANIFICADORA EXEMPLO LTDA', fluxo: 'saida', origem: 'robo', confianca: 'palpite', contraparte: cp },
  { id: 'p3', data: d + '06', valor: 18, grupo: 'OUTROS', sub: 'Outros', desc: 'MERCADINHO MODELO', fluxo: 'saida', origem: 'robo', confianca: 'palpite' },
  { id: 'n1', data: d + '07', valor: 40, grupo: 'LAZER', sub: 'Cinema', desc: 'CINEMA TESTE', fluxo: 'saida' }];
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
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Apelido !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-lanc'); render(); });
    const g = (id) => p.evaluate((i) => { const x = Gasto.todos().find((y) => y.id === i); return { grupo: x.grupo, sub: x.sub, confianca: x.confianca || '', conf: !!x.confirmadoEm, ed: !!x.editadoPessoa }; }, id);

    console.log('1) palpite do robô + Enter no Apelido');
    await p.evaluate(() => abrirLancamento('p1')); await p.waitForTimeout(150);
    ok(await p.evaluate(() => !!document.querySelector('#assetModal [data-acao="lf-confirmar"]')), 'a janela tem o "✓ Confirmar como está" no alto');
    await p.fill('#glApelido', 'Padaria Exemplo'); await p.press('#glApelido', 'Enter'); await p.waitForTimeout(200);
    const a1 = await p.evaluate(() => ({ ap: Apelido.de(Gasto.todos().find((x) => x.id === 'p1')), aberta: !document.getElementById('assetModal').classList.contains('hidden') }));
    ok(a1.ap === 'Padaria Exemplo' && !a1.aberta, 'o Enter salvou o apelido ("' + a1.ap + '") e fechou a janela');
    const p1 = await g('p1');
    ok(p1.ed, 'foi o Salvar (a edição da pessoa vale: editadoPessoa), não o "Confirmar como está"');

    console.log('2) palpite do robô + categoria editada + Enter');
    await p.evaluate(() => abrirLancamento('p3')); await p.waitForTimeout(150);
    await p.selectOption('#glGrupo', 'HABITACAO'); await p.fill('#glSub', 'Mercado'); await p.press('#glDesc', 'Enter'); await p.waitForTimeout(200);
    const p3 = await g('p3');
    ok(p3.grupo === 'HABITACAO' && p3.sub === 'Mercado' && p3.ed, 'a categoria editada foi salva (Habitação › Mercado), não o palpite como estava');

    console.log('3) lançamento comum + Enter');
    await p.evaluate(() => abrirLancamento('n1')); await p.waitForTimeout(150);
    await p.fill('#glDesc', 'CINEMA TESTE 2'); await p.press('#glDesc', 'Enter'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => Gasto.todos().find((x) => x.id === 'n1').desc === 'CINEMA TESTE 2'), 'continua salvando como sempre');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
