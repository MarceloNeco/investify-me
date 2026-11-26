/* =====================================================================
   teste/teste-conta-fixa-sugestao.js — 3.124: "Parece conta fixa: cadastrar?" também quando já existe uma conta fixa parecida de
   OUTRO período (caso do dono: a escola de 2027 cadastrada, a de 2026 não). Dados FICTÍCIOS.
   Uso: node teste/teste-conta-fixa-sugestao.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const G = [];
['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'].forEach((m, i) => {
  G.push({ id: 'esc' + i, data: m + '-05', valor: 1900, desc: 'ESCOLA FICTICIA MENS', fluxo: 'saida', grupo: 'DEPENDENTES', sub: 'Escola/Faculdade', origem: 'robo' });
  G.push({ id: 'aca' + i, data: m + '-12', valor: 120, desc: 'ACADEMIA FICTICIA', fluxo: 'saida', grupo: 'PESSOAL', sub: 'Academia', origem: 'robo' });
});
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos: G,
  recorrentes: [{ id: 'r-esc27', nome: 'Escola Ficticia 2027', valor: 1950, dia: 5, regra: 'dia', desde: '2027-01-05', ate: '2027-12-05', grupo: 'DEPENDENTES', sub: 'Escola/Faculdade', fluxo: 'saida', estadoPadrao: 'pendente', criadoEm: '2026-10-01' },
    { id: 'r-aca', nome: 'Academia Ficticia', valor: 120, dia: 12, regra: 'dia', desde: '2026-01-12', grupo: 'PESSOAL', sub: 'Academia', fluxo: 'saida', estadoPadrao: 'pendente', criadoEm: '2026-01-01' }] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.clock.setFixedTime(new Date('2026-11-20T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.ContasMes);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-painel'); render(); });
    const s = await p.evaluate(() => ContasMes.sugestoes().map((x) => ({ nome: x.nome, outro: x.outro && x.outro.nome })));
    ok(s.some((x) => /ESCOLA/i.test(x.nome) && x.outro === 'Escola Ficticia 2027'), 'a escola paga todo mês em 2026 aparece como "Parece conta fixa", mesmo com a de 2027 cadastrada: ' + JSON.stringify(s));
    ok(!s.some((x) => /ACADEMIA/i.test(x.nome)), 'a academia, que já tem conta fixa valendo, não aparece');
    const h = await p.evaluate(() => { const g = inboxGrupos().find((x) => x.id === 'contafixa'); const d = document.createElement('div'); d.innerHTML = (g && g.html) || ''; return d.textContent.replace(/\s+/g, ' '); });
    ok(/Já existe a conta fixa "Escola Ficticia 2027" \(de 01\/2027 até 12\/2027\), mas ela não cobre estes pagamentos\. Cadastrar esta também\?/.test(h), 'no 📥, a sugestão explica: ' + (h.match(/⚠️[^.]*\.[^?]*\?/) || [''])[0]);
    ok(/6 pagamentos · R\$\s?11\.400,00 · de 05\/06 a 05\/11 · último R\$\s?1\.900,00/.test(h), 'com o valor e o período (3.116)');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
