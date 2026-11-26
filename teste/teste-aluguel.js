/* teste/teste-aluguel.js — 3.126: o aluguel recebido pela imobiliária (ficha do demonstrativo): liga ao crédito, mostra a conta e vira
   renda prevista no dia 12; o demonstrativo novo atualiza o valor; apagada pela pessoa, não volta. Dados FICTÍCIOS. */
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
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } },
      JSON.stringify({ v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [], gastos: [{ id: 'rb_alg', data: '2026-11-12', valor: 2700, desc: 'TED GRPQA FICTICIO', fluxo: 'entrada', grupo: 'RENDA', sub: 'Outros', origem: 'robo' }] }));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.Aluguel && window.Comprovantes);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); });
    const FICHA = { aluguel: 3000, iptu: 150, taxa_administracao: 450, valor: 2700, competencia: '2026-10', previsto_ate: '2027-09-30', imovel: 'Apto Ficticio 12' };
    const r = await p.evaluate((f) => { Comprovantes.receber({ id: 'qa-2026-10', subtipo: 'outro', loja: 'Imobiliaria Ficticia', data: '2026-11-05', ficha: f });
      const g = Gasto.todos().find((x) => x.id === 'rb_alg'), d = document.createElement('div'); d.innerHTML = MoneyModulos.html('lancamento.form', { g });
      const rc = Recorrente.achar('alug-apto-ficticio-12');
      return { det: (d.querySelector('.al-bloco') || {}).textContent || '', rc: rc && [rc.fluxo, rc.grupo, rc.sub, rc.valor, rc.dia, rc.desde, rc.ate].join('|'), pend: Comprovantes.pendencias().length }; }, FICHA);
    ok(/Aluguel R\$\s?3\.000,00 · IPTU R\$\s?150,00 · taxa de administração −R\$\s?450,00 = líquido R\$\s?2\.700,00 · competência 10\/2026 · Apto Ficticio 12/.test(r.det), 'o crédito do banco mostra a conta do aluguel: ' + r.det);
    ok(r.rc === 'entrada|RENDA|Aluguel|2700|12|2026-11-12|2027-09-30', 'vira renda prevista recorrente no dia 12, até o fim previsto: ' + r.rc);
    ok(r.pend === 0, 'não pede nada no 📥');
    const r2 = await p.evaluate((f) => { Comprovantes.receber({ id: 'qa-2026-11', subtipo: 'outro', loja: 'Imobiliaria Ficticia', data: '2026-12-05', ficha: Object.assign({}, f, { valor: 2750, aluguel: 3050, competencia: '2026-11' }) });
      return { n: ST.recorrentes.filter((x) => x.origem === 'aluguel').length, v: Recorrente.achar('alug-apto-ficticio-12').valor }; }, FICHA);
    ok(r2.n === 1 && r2.v === 2750, 'o demonstrativo novo atualiza o valor (sem criar outra): ' + JSON.stringify(r2));
    const r3 = await p.evaluate(() => { Recorrente.excluir('alug-apto-ficticio-12'); Aluguel.garantirRenda(); return !!Recorrente.achar('alug-apto-ficticio-12'); });
    ok(r3 === false, 'apagada pela pessoa, a renda prevista não volta sozinha');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
