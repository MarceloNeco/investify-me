/* =====================================================================
   teste/teste-fiscalone.js — 3.78: o TaxONE passou a se chamar FiscalONE. Dados FICTÍCIOS.
   Confere: nenhum texto visível fala "TaxONE" (fora das Novidades antigas e do apelido da busca), nem no código das
   telas, da ajuda, do glossário e do passeio; o id interno 'tax' continua (dados antigos com o app 'tax' abrem no
   FiscalONE); cor e ícone iguais; a busca acha por "TaxONE" e por "FiscalONE".
   Uso: node teste/teste-fiscalone.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, appAtual: 'tax', config: { fitaLigada: false }, posicoes: [], recorrentes: [],
  gastos: [{ id: 'g1', data: '2026-10-05', valor: 50, grupo: 'ALIMENTACAO', sub: 'Padaria', desc: 'PADARIA EXEMPLO', fluxo: 'saida' }] };

(async () => {
  console.log('1) o código');
  const fontes = ['index.html'].concat(fs.readdirSync(path.join(RAIZ, 'modulos')).filter((f) => /\.js$/.test(f)).map((f) => 'modulos/' + f), ['textos/glossario.js']);
  const sobra = [];
  fontes.forEach((f) => fs.readFileSync(path.join(RAIZ, f), 'utf8').split('\n').forEach((l, i) => { if (/TaxONE/.test(l) && !/semAcento\(q\)\.replace\(\/taxone\//.test(l)) sobra.push(f + ':' + (i + 1)); }));
  ok(sobra.length === 0, 'nenhum "TaxONE" no app, nos módulos e no glossário (só o apelido da busca): ' + sobra.join(', '));
  const mud = fs.readFileSync(path.join(RAIZ, 'textos/mudancas.js'), 'utf8');
  ok(/3\.73[\s\S]*TaxONE/.test(mud) || /TaxONE/.test(mud), 'as Novidades antigas continuam como eram (com "TaxONE")');

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
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof APPS !== 'undefined');

    console.log('2) o que aparece na tela');
    const sem = [];
    for (const lg of ['pt', 'en']) {
      const r = await p.evaluate((lg) => {
        I18n.atual = lg; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar();
        const vistos = [];
        const olha = (onde) => { const t = document.body.innerText; if (/TaxONE/.test(t)) vistos.push(onde); };
        mostrarHub(); olha('início');
        abrirApp('tax');
        ABAS.tax.forEach((a) => { irPara(a.v); render(); olha(a.v); });
        abrirApp('budget'); irPara('config'); render(); olha('config');
        const txt = JSON.stringify([APPS, AJUDA_TELAS, GLOSSARIO.map((g) => [g.c, g.ce, g.t, g.te, g.pt, g.en]), TUTORIAL, window.Tour ? Tour.PASSOS : null]);
        return { vistos, dados: /TaxONE/.test(txt), nome: APPS.tax.nome, ico: APPS.tax.ico, cor: APPS.tax.cor };
      }, lg);
      if (r.vistos.length || r.dados) sem.push(lg + ': ' + r.vistos.join(',') + (r.dados ? ' +dados' : ''));
      if (lg === 'pt') ok(r.nome === 'FiscalONE' && r.ico === '🧾' && r.cor === '--c-tax', 'nome FiscalONE; ícone 🧾 e cor --c-tax iguais');
    }
    ok(sem.length === 0, 'nenhuma tela do FiscalONE, configuração, ajuda, glossário ou passeio mostra "TaxONE" (pt e en): ' + sem.join(' | '));
    await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('tax'); irPara('t-painel'); render(); });
    ok(await p.evaluate(() => /FiscalONE/.test(document.querySelector('.view:not(.hidden)').innerText)), 'o Painel do FiscalONE tem o nome novo no título');

    console.log('3) retrocompatível');
    ok(await p.evaluate(() => ST.appAtual === 'tax' && appDaView('t-painel') === 'tax' && appsVisiveis().indexOf('tax') >= 0), 'o id interno continua "tax": os dados antigos (app "tax") abrem no FiscalONE');

    console.log('4) a busca aceita os dois nomes');
    const bq = await p.evaluate(() => { const a = buscarConteudo('TaxONE'), c = buscarConteudo('FiscalONE'); return { a: a.glossario.length + a.coach.length, c: c.glossario.length + c.coach.length }; });
    ok(bq.c > 0 && bq.a === bq.c, '"TaxONE" acha o mesmo que "FiscalONE": ' + JSON.stringify(bq));

    ok(p.erros.length === 0, 'sem erros na página: ' + p.erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)'); process.exit(falhas ? 1 : 0);
})();
