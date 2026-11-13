/* =====================================================================
   teste/teste-quem-nome.js — 3.68: o "quem" aparece pelo nome do cadastro de Pessoas (Pessoas.nomeVer). Dados fictícios.
   O código gravado (o apelido da casa, que o robô usa) NÃO muda: editar e salvar devolve o código.
   Confere: lista, filtro, edição, Custos; busca aceita o código e o nome; PT e EN iguais.
   Uso: node teste/teste-quem-nome.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const d = new Date().toISOString().slice(0, 8);
const pessoas = [
  { id: 'pA', tipo: 'casa', papel: 'responsavel', nome: 'Fulano', sobrenome: 'Exemplo', apelido: 'Fufu', criadoEm: '2026-01-01' },
  { id: 'pB', tipo: 'casa', papel: 'responsavel', nome: 'Ciclana', sobrenome: 'Exemplo', apelido: 'Cica', criadoEm: '2026-01-01' }];
const gastos = [
  { id: 'g1', data: d + '02', valor: 50, grupo: 'LAZER', sub: 'Cinema', desc: 'CINEMA TESTE', fluxo: 'saida', quem: 'Fufu', quemId: 'pA' },
  { id: 'g2', data: d + '03', valor: 80, grupo: 'SAUDE', sub: 'Farmácia', desc: 'FARMACIA TESTE', fluxo: 'saida', quem: 'Fufu', quemId: 'pA', paraQuem: 'Cica', paraQuemId: 'pB' },
  { id: 'g3', data: d + '04', valor: 30, grupo: 'LAZER', sub: 'Restaurantes', desc: 'LANCHE TESTE', fluxo: 'saida', quem: 'Cica', quemId: 'pB' },
  { id: 'g4', data: d + '05', valor: 20, grupo: 'LAZER', sub: 'Restaurantes', desc: 'LANCHE VIZINHO', fluxo: 'saida', quem: 'Vizinho' }];
const recorrentes = [{ id: 'r1', nome: 'Academia', grupo: 'SAUDE', sub: 'Academia', valor: 100, dia: 10, regra: 'dia', quem: 'Cica', quemId: 'pB', desde: '2026-01-01' }];
const LOCAL = { v: 1, config: { fitaLigada: false, pessoasV: 1 }, posicoes: [], gastos, recorrentes, pessoas };

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
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Pessoas !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-lanc'); render(); });
    const sub = (id) => p.evaluate((i) => [...document.querySelectorAll('tr[data-bid="' + i + '"] .desc-cel .t-sub')].map((x) => x.textContent).join(' | '), id);

    console.log('1) lista e filtro');
    ok(/Fulano/.test(await sub('g1')) && !/Fufu/.test(await sub('g1')), 'a lista mostra "Fulano", não o código "Fufu" (' + await sub('g1') + ')');
    ok(/Fulano → Ciclana/.test(await sub('g2')), 'quem pagou → para quem: "Fulano → Ciclana"');
    ok(/Vizinho/.test(await sub('g4')), 'texto livre sem cadastro fica como está ("Vizinho")');
    await p.evaluate(() => { bFiltroAberto = true; render(); }).catch(() => {});
    const chips = await p.evaluate(() => [...document.querySelectorAll('[data-bquem]')].map((c) => c.dataset.bquem + '=' + c.textContent));
    ok(!chips.length || (chips.indexOf('Fufu=Fulano') >= 0 && chips.indexOf('Cica=Ciclana') >= 0), 'filtro "Quem pagou/recebeu": o chip mostra o nome e filtra pelo código (' + chips.join(', ') + ')');

    console.log('2) busca pelo código e pelo nome');
    const bus = await p.evaluate(() => ['fufu', 'fulano', 'ciclana'].map((t) => Gasto.filtrar({ busca: t }).map((g) => g.id).join('+')));
    ok(bus[0] === 'g1+g2' || bus[0] === 'g2+g1', 'buscar "fufu" (o código) acha os 2 de Fulano (' + bus[0] + ')');
    ok(bus[1].split('+').sort().join('+') === 'g1+g2', 'buscar "fulano" (o nome) acha os mesmos');
    ok(bus[2].split('+').sort().join('+') === 'g2+g3', 'buscar "ciclana" acha quem pagou e para quem é');

    console.log('3) editar mostra o nome e grava o código');
    await p.evaluate(() => abrirLancamento('g2')); await p.waitForTimeout(150);
    const f = await p.evaluate(() => ({ q: document.querySelector('#glQuem').value, pq: document.querySelector('#glParaQuem').value }));
    ok(f.q === 'Fulano' && f.pq === 'Ciclana', 'a edição mostra "Fulano" e "Ciclana"');
    await p.click('[data-acao="gl-salvar"]'); await p.waitForTimeout(150);
    const g2 = await p.evaluate(() => { const g = Gasto.todos().find((x) => x.id === 'g2'); return { quem: g.quem, quemId: g.quemId, paraQuem: g.paraQuem }; });
    ok(g2.quem === 'Fufu' && g2.quemId === 'pA' && g2.paraQuem === 'Cica', 'salvar sem mexer grava o código de sempre ("Fufu", "Cica"): o robô não muda');

    console.log('4) Custos e inglês');
    await p.evaluate(() => { irPara('b-custos'); render(); });
    const custos = await p.evaluate(() => document.getElementById('view-b-custos').textContent);
    ok(/Ciclana/.test(custos) && !/\bCica\b/.test(custos), 'Custos mostra "Ciclana" na conta da academia');
    const en = await p.evaluate(() => { I18n.atual = 'en'; const r = quemVer('Fufu'); I18n.atual = 'pt'; return r; });
    ok(en === 'Fulano', 'em inglês o nome é o mesmo');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
