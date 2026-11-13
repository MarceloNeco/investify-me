/* =====================================================================
   teste/teste-projecao.js — 3.76: a tela "Projeção" (antes Futuro): IPCA automático e a tabela única.
   O Banco Central é SIMULADO (rota interceptada); dados FICTÍCIOS.
   Confere: IPCA guardado há mais de 7 dias → projeta na hora com o guardado e busca sozinho em segundo plano (sem
   botão), depois projeta com o novo; sem internet → usa o guardado e diz "IPCA de <mês/ano>"; as colunas (hoje, ano
   corrente parcial, ano+1 … ano+N) batem com o IPCA do grupo; por mês × por ano; abre e fecha as categorias; o total;
   acima de 6 anos, 1–5 + o último e "ver todos os anos"; no celular a 1ª coluna fixa e "mais colunas".
   Uso: node teste/teste-projecao.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const hoje = new Date(), ANO = hoje.getFullYear(), z = (n) => String(n).padStart(2, '0');
const mes = (k) => { const d = new Date(ANO, hoje.getMonth() + k, 5); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-05'; };
const gastos = [];
for (let k = -11; k <= 0; k++) {
  gastos.push({ id: 'cd' + k, data: mes(k), valor: 700, grupo: 'HABITACAO', sub: 'Condomínio', desc: 'CONDOMINIO EXEMPLO', fluxo: 'saida' });
  gastos.push({ id: 'lz' + k, data: mes(k), valor: 300, grupo: 'HABITACAO', sub: 'Luz', desc: 'LUZ EXEMPLO', fluxo: 'saida' });
  gastos.push({ id: 'es' + k, data: mes(k), valor: 2000, grupo: 'DEPENDENTES', sub: 'Escola', desc: 'ESCOLA EXEMPLO', fluxo: 'saida' });
}
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos, recorrentes: [] };
const velho = Date.now() - 10 * 86400000;
const serie = (cod, ano) => ({ codigo: cod, nome: 'série ' + cod, ano, meses: [], ultimo: '01/09/' + ANO, em: velho });
const IPCA = JSON.stringify({ s433: serie(433, 4), s1636: serie(1636, 4), s1643: serie(1643, 6) });
/* o Banco Central simulado: 0,5% ao mês em tudo (6,17% no ano), com o último ponto em outubro */
const bcb = () => JSON.stringify(Array.from({ length: 13 }, (_, i) => ({ data: '01/' + z(i % 12 + 1) + '/' + ANO, valor: '0,50' })).map((x, i, a) => i === a.length - 1 ? { data: '01/10/' + ANO, valor: '0,50' } : x));

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  const abrir = async (vp, semNet) => {
    const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
    let pedidos = 0;
    await ctx.route('**/*', (r) => { const u = r.request().url(); if (u.startsWith(BASE)) return r.continue(); if (/api\.bcb\.gov\.br/.test(u)) { if (/bcdata\.sgs\.(433|16\d\d)\//.test(u)) pedidos++; return r.fulfill({ status: 200, contentType: 'application/json', body: bcb() }); } return r.abort(); });
    await ctx.addInitScript(([t, ip]) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('investifyme.ipca.v1', ip); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, [JSON.stringify(LOCAL), IPCA]);
    if (semNet) await ctx.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'onLine', { get: () => false }); });
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.goto(BASE + '/').catch(() => {});
    return { ctx, p, pedidos: () => pedidos };
  };
  const tabela = (p) => p.evaluate(() => { const t = document.querySelector('#view-b-futuro .proj-tbl'); if (!t) return null;
    return { cab: [...t.querySelectorAll('thead th')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()), linhas: [...t.querySelectorAll('tbody tr, tfoot tr')].map((r) => [...r.children].map((c) => c.textContent.replace(/\s+/g, ' ').trim())),
      sub: (document.querySelector('#view-b-futuro .proj-card .card-head .small') || {}).textContent || '' }; });
  try {
    console.log('1) IPCA velho → busca sozinho, sem botão');
    const A = await abrir({ width: 1366, height: 900 });
    const p = A.p;
    await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Orcamento !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; ST.config.assistOne = false; AssistOne.aplicar(); Orcamento._tentou = false; abrirApp('budget'); irPara('b-futuro'); render(); });
    const t0 = await tabela(p);
    ok(t0 && !(await p.$('#view-b-futuro [data-acao="b-projetar"]')), 'projeta na hora com o guardado, sem o botão "Buscar o IPCA e projetar"');
    await p.waitForFunction(() => !Orcamento._buscando && Orcamento._tentou, null, { timeout: 15000 });
    await p.waitForTimeout(300);
    const t1 = await tabela(p);
    ok(A.pedidos() >= 3 && /IPCA de 10\/\d{4}/.test(t1.sub), 'buscou sozinho no Banco Central (' + A.pedidos() + ' séries) e projetou de novo: "' + t1.sub + '"');
    const ano = new Date().getFullYear();
    ok(t1.cab.join('|') === ['Grupo', 'IPCA 12m', 'Hoje', ano + 'parcial', ano + 1, ano + 2, ano + 3, ano + 4, ano + 5].join('|'), 'colunas: Grupo · IPCA 12m · Hoje · ' + ano + ' parcial · ' + (ano + 1) + ' … ' + (ano + 5) + ': ' + t1.cab.join(' | '));
    const hab = t1.linhas.find((l) => /Habitação/.test(l[0]));
    ok(hab && hab[1] === '6,17%' && hab[2] === 'R$ 1.000,00' && hab[4] === 'R$ 1.061,68' && hab[8] === 'R$ 1.348,85', 'Habitação: IPCA 6,17%, hoje 1.000/mês, ' + (ano + 1) + ' 1.061,68, ' + (ano + 5) + ' 1.348,85 (1.000 × 1,0617^k): ' + JSON.stringify(hab));
    const tot = t1.linhas[t1.linhas.length - 1];
    const v = (s) => Number(String(s).replace(/[^\d,-]/g, '').replace(',', '.'));
    ok(/Total/.test(tot[0]) && tot[2] === 'R$ 3.000,00' && Math.abs(v(tot[4]) - 3000 * 1.0617) < 0.5, 'linha de total: hoje 3.000, ano+1 ≈ 3.185 (a soma dos grupos) ' + JSON.stringify(tot));
    const kp = await p.evaluate(() => [...document.querySelectorAll('#view-b-futuro .kpi .lbl')].map((x) => x.textContent.trim()).join('|'));
    ok(/Custa hoje\|Em 12 meses\|Em 5 anos/.test(kp), 'os quadros do topo: Custa hoje · Em 12 meses · Em 5 anos');
    console.log('2) por ano, categorias, muitos anos');
    await p.click('#view-b-futuro [data-acao="proj-modo"][data-v="ano"]'); await p.waitForTimeout(150);
    const ta = await tabela(p); const habA = ta.linhas.find((l) => /Habitação/.test(l[0]));
    ok(habA[2] === 'R$ 12.000,00' && Math.abs(v(habA[4]) - 12740.16) < 0.05, 'por ano: Habitação 12.000 hoje e ~12.740 no ano que vem ' + habA[4]);
    await p.click('#view-b-futuro [data-acao="proj-grupo"][data-g="HABITACAO"]'); await p.waitForTimeout(150);
    const tc = await tabela(p); const cats = tc.linhas.filter((l) => /Condomínio|Luz/.test(l[0]));
    ok(cats.length === 2 && cats.find((l) => /Condomínio/.test(l[0]))[2] === 'R$ 8.400,00' && cats.find((l) => /Condomínio/.test(l[0]))[1] === '6,17%', 'tocar em Habitação abre as categorias (Condomínio 8.400/ano, com o IPCA do grupo)');
    await p.click('#view-b-futuro [data-acao="proj-grupo"][data-g="HABITACAO"]'); await p.waitForTimeout(150);
    ok(!(await tabela(p)).linhas.some((l) => /Condomínio/.test(l[0])), 'e fecha');
    await p.click('#view-b-futuro [data-banos="20"]'); await p.waitForTimeout(150);
    const t20 = await tabela(p);
    ok(t20.cab.slice(4).join('|') === [1, 2, 3, 4, 5, 20].map((k) => ano + k).join('|') && await p.isVisible('#view-b-futuro [data-acao="proj-todos"]'), '20 anos: os anos 1 a 5 e o último, com "ver todos os anos"');
    await p.click('#view-b-futuro [data-acao="proj-todos"]'); await p.waitForTimeout(150);
    ok((await tabela(p)).cab.length === 4 + 20, '"ver todos os anos" mostra os 20');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
    await A.ctx.close();

    console.log('3) sem internet: o guardado, com a data');
    const B = await abrir({ width: 1366, height: 900 }, true);
    await B.p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Orcamento !== 'undefined');
    await B.p.waitForTimeout(4500);   /* passa a hora da busca de quando o app abre */
    const antes = B.pedidos();
    await B.p.evaluate(() => { I18n.atual = 'pt'; Orcamento._tentou = false; bProj = null; abrirApp('budget'); irPara('b-futuro'); render(); });
    await B.p.waitForTimeout(500);
    const tb = await tabela(B.p);
    ok(antes === 0 && B.pedidos() === 0 && await B.p.evaluate(() => !Orcamento._buscando) && tb && /IPCA de 09\/\d{4}/.test(tb.sub) && tb.linhas.find((l) => /Habitação/.test(l[0]))[1] === '4,00%', 'sem internet não busca; projeta com o guardado e diz "IPCA de 09/' + ano + '"');
    await B.ctx.close();

    console.log('4) celular');
    const C = await abrir({ width: 390, height: 800 });
    await C.p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Orcamento !== 'undefined');
    await C.p.evaluate(() => { I18n.atual = 'pt'; ST.config.assistOne = false; AssistOne.aplicar(); Orcamento._tentou = true; abrirApp('budget'); irPara('b-futuro'); render(); });
    const tm = await tabela(C.p);
    const fixa = await C.p.evaluate(() => getComputedStyle(document.querySelector('#view-b-futuro .proj-tbl th.proj-col1')).position);
    ok(tm.cab.join('|') === ['Grupo', 'Hoje', ano + 1, ano + 5].join('|') && fixa === 'sticky', 'no celular: Grupo (fixa) · Hoje · ' + (ano + 1) + ' · ' + (ano + 5) + ' por padrão: ' + tm.cab.join(' | '));
    await C.p.click('#view-b-futuro [data-acao="proj-mais"]'); await C.p.waitForTimeout(150);
    ok((await tabela(C.p)).cab.length === 9 && await C.p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '"mais colunas" mostra o resto, rolando dentro da tabela (a página não rola para o lado)');
    await C.ctx.close();
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
