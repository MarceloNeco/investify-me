/* =====================================================================
   teste/teste-contas-fixas.js — 3.74: a tela "Contas fixas" (antes "Custos") e o cartão do Painel
   (modulos/contas-fixas.js). Dados FICTÍCIOS.
   Confere: o menu mostra "Contas fixas" com o subtítulo "e gastos recorrentes" e a tela abre no id b-custos;
   o cartão "Contas fixas do mês" (quantas, total, 3 próximas, "Ver todas" leva a b-custos); a visão da casa só
   conta os compromissos dela.
   Uso: node teste/teste-contas-fixas.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const hoje = new Date(), ano = hoje.getFullYear(), m = hoje.getMonth() + 1;
const mm = (k) => { let y = ano, x = m + k; while (x > 12) { x -= 12; y++; } return y + '-' + String(x).padStart(2, '0'); };
const recorrentes = [
  { id: 'r1', nome: 'Aluguel', grupo: 'HABITACAO', sub: 'Aluguel', valor: 2500, dia: 10, regra: 'dia', criadoEm: '2026-01-01' },
  { id: 'r2', nome: 'Escola', grupo: 'DEPENDENTES', sub: 'Escola', valor: 1500, dia: 5, regra: 'dia', criadoEm: '2026-01-01' },
  { id: 'r3', nome: 'Internet', grupo: 'HABITACAO', sub: 'Internet', valor: 120, dia: 20, regra: 'dia', criadoEm: '2026-01-01' },
  { id: 'r4', nome: 'Salário', grupo: 'RENDA', sub: 'Salário', valor: 9000, dia: 5, regra: 'dia', criadoEm: '2026-01-01' }
];
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos: [{ id: 'g1', data: mm(0) + '-03', valor: 80, grupo: 'ALIMENTACAO', sub: 'Mercado', desc: 'MERCADO EXEMPLO', fluxo: 'saida' }], recorrentes };

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
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof ContasFixas !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); render(); });

    console.log('1) o nome no menu');
    const nav = await p.evaluate(() => { const b = [...document.querySelectorAll('#navLista .nav-item')].find((x) => x.dataset.view === 'b-custos'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : ''; });
    ok(/Contas fixas/.test(nav) && /e gastos recorrentes/.test(nav), 'o menu diz "Contas fixas" com "e gastos recorrentes" (' + nav + ')');
    await p.evaluate(() => { irPara('b-custos'); render(); });
    ok(await p.evaluate(() => !document.getElementById('view-b-custos').classList.contains('hidden') && /Contas fixas/.test(document.querySelector('#view-b-custos h1').textContent)), 'a tela (id b-custos) abre com o título "Contas fixas"');

    console.log('2) o cartão do Painel');
    await p.evaluate(() => { irPara('b-painel'); render(); });
    const c = await p.evaluate(() => { const el = document.querySelector('#view-b-painel .cf-card'); return el ? { txt: el.textContent.replace(/\s+/g, ' '), n: el.querySelectorAll('.cf-prox tr').length, ver: !!el.querySelector('[data-irpara="b-custos"]') } : null; });
    ok(c && /3 contas fixas · R\$ 4\.120,00 por mês/.test(c.txt), 'o cartão: "3 contas fixas · R$ 4.120,00 por mês" (só as de saída; o salário não)');
    ok(c && c.n === 3 && /Escola/.test(c.txt) && /a pagar/.test(c.txt) && c.ver, 'as 3 próximas a vencer (nome, dia, valor, a pagar) e o botão "Ver todas" para b-custos');
    await p.click('#view-b-painel .cf-card [data-irpara="b-custos"]'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => !document.getElementById('view-b-custos').classList.contains('hidden')), '"Ver todas" leva à tela das contas fixas');

    console.log('3) visão da casa');
    const vc = await p.evaluate(() => { const o = Recorrente.ativos; Recorrente.ativos = () => o.call(Recorrente).filter((r) => r.id === 'r1'); const r = ContasFixas.resumo(); Recorrente.ativos = o; return r; });
    ok(vc.n === 1, 'com só o que ela vê, conta 1 (os compromissos da casa)');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
