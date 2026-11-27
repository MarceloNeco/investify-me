/* =====================================================================
   teste/teste-tag-pedagio.js — 3.141: a categoria do Veículo "Sem Parar / Pedagio" virou "Tag e pedágio" (modulos/categorias.js 1.1.0).
   Dados FICTÍCIOS. Confere: ao abrir, o que já existe muda sem perder histórico (lançamentos com data, valor e id iguais; compromisso;
   limite do orçamento com o id novo; regras aprendidas da loja e do item; totais do resumo da casa); o nome antigo continua valendo
   como apelido — lançamento digitado, linha do robô (nuvem.js) e backup antigo caem em "Tag e pedágio"; a lista de categorias do
   Veículo; EN e ES.
   Uso: node teste/teste-tag-pedagio.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const VELHO = 'Sem Parar / Pedagio', NOVO = 'Tag e pedágio';
const LOCAL = { v: 1, config: { fitaLigada: false, cat365: 1, lojaRegras: { 'cnpj:00000000000100': { grupo: 'VEICULO', sub: VELHO, paraQuem: '' } }, itemRegras: { 'tag mensal': { grupo: 'VEICULO', sub: VELHO } } },
  posicoes: [], cartoes: [],
  gastos: [
    { id: 'g1', data: '2026-09-10', valor: 50, desc: 'TAG EXEMPLO MENSALIDADE', fluxo: 'saida', grupo: 'VEICULO', sub: VELHO, origem: 'robo' },
    { id: 'g2', data: '2026-10-10', valor: 62.4, desc: 'TAG EXEMPLO PASSAGENS', fluxo: 'saida', grupo: 'VEICULO', sub: VELHO, origem: 'manual' },
    { id: 'g3', data: '2026-10-12', valor: 30, desc: 'POSTO EXEMPLO', fluxo: 'saida', grupo: 'VEICULO', sub: 'Combustível', origem: 'manual' }],
  recorrentes: [{ id: 'r1', nome: 'Tag do carro', grupo: 'VEICULO', sub: VELHO, valor: 50, dia: 10, regra: 'dia', fluxo: 'saida' }],
  orcamentos: [{ id: 'VEICULO|' + VELHO, grupo: 'VEICULO', sub: VELHO, limite: 100 }],
  resumo: [{ id: '2026-10', grupos: { VEICULO: 92.4 }, total: 92.4, n: 2, atualizadoEm: '2026-10-31T00:00:00Z', orc: { ['VEICULO|' + VELHO]: 62.4 } }] };

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
    await p.clock.setFixedTime(new Date('2026-11-24T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Categorias !== 'undefined' && ST.config && ST.config.cat3141 === 1);

    console.log('1) ao abrir: o que já existe muda, sem perder histórico');
    const e = await p.evaluate(() => JSON.parse(JSON.stringify({ g: ST.gastos.map((x) => [x.id, x.data, x.valor, x.grupo, x.sub].join('|')), r: Recorrente.todos().find((x) => x.id === 'r1'), o: ST.orcamentos, lr: ST.config.lojaRegras, ir: ST.config.itemRegras, rs: ST.resumo[0], alias: ST.config.subAlias })));
    ok(e.g.join(' ; ') === 'g1|2026-09-10|50|VEICULO|Tag e pedágio ; g2|2026-10-10|62.4|VEICULO|Tag e pedágio ; g3|2026-10-12|30|VEICULO|Combustível', 'lançamentos: o nome muda; id, data e valor ficam (o histórico continua junto) ' + e.g.join(' ; '));
    ok(e.r && e.r.sub === NOVO && e.r.valor === 50, 'o compromisso "Tag do carro" passa para "Tag e pedágio"');
    ok(e.o.length === 1 && e.o[0].id === 'VEICULO|' + NOVO && e.o[0].sub === NOVO && e.o[0].limite === 100, 'o limite do orçamento (100) segue, com o id novo "VEICULO|Tag e pedágio"');
    ok(e.lr['cnpj:00000000000100'].sub === NOVO && e.ir['tag mensal'].sub === NOVO, 'as regras aprendidas (da loja e do item) passam para "Tag e pedágio"');
    ok(e.rs.orc['VEICULO|' + NOVO] === 62.4 && !('VEICULO|' + VELHO in e.rs.orc) && e.rs.total === 92.4, 'os totais do resumo da casa: 62,40 em "Tag e pedágio", nada perdido');
    ok(e.alias['VEICULO|' + VELHO] === NOVO, 'o nome antigo fica guardado como apelido');
    ok(await p.evaluate(() => (Gasto.arvore().VEICULO || []).includes('Tag e pedágio') && !(Gasto.arvore().VEICULO || []).includes('Sem Parar / Pedagio')), 'a lista do Veículo tem "Tag e pedágio" e não tem mais "Sem Parar / Pedagio"');
    ok(await p.evaluate(() => Gasto.filtrar({ grupos: ['VEICULO'], subs: ['Tag e pedágio'], de: '2026-01-01', ate: '2026-12-31' }).length) === 2, 'o filtro por "Tag e pedágio" acha os 2 lançamentos de antes');

    console.log('2) o nome antigo continua valendo (robô, digitado, backup antigo)');
    const dig = await p.evaluate(() => { const g = Gasto.add({ data: '2026-11-20', valor: 45, desc: 'TAG EXEMPLO', grupo: 'VEICULO', sub: 'Sem Parar / Pedagio', fluxo: 'saida' }); return g.sub; });
    ok(dig === NOVO, 'lançamento com o nome antigo cai em "Tag e pedágio"');
    const rb = await p.evaluate(() => { const g = MoneyNuvem.converterRobo({ id: 'tag-exemplo-1', tipo: 'despesa', data: '2026-11-21', valor: -33.3, grupo: 'VEICULO', categoria: 'Sem Parar / Pedagio', descricao: 'TAG EXEMPLO PASSAGEM' }); return g && g.sub; });
    ok(rb === NOVO, 'a linha do robô com "Sem Parar / Pedagio" (nuvem.js) chega como "Tag e pedágio"');
    const rec = await p.evaluate(() => Recorrente.add({ nome: 'Tag outro carro', grupo: 'VEICULO', sub: 'Sem Parar / Pedagio', valor: 20, dia: 5, regra: 'dia', fluxo: 'saida' }).sub);
    ok(rec === NOVO, 'compromisso novo com o nome antigo também');
    const semMapa = await p.evaluate(() => { const a = ST.config.subAlias; ST.config.subAlias = {}; const o = Categorias.alias({ grupo: 'VEICULO', sub: 'Sem Parar / Pedagio' }); ST.config.subAlias = a; return o.sub; });
    ok(semMapa === NOVO, 'o apelido é fixo: vale mesmo sem o mapa de apelidos (aparelho que ainda não migrou)');
    const bk = await p.evaluate(() => { const velho = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos: [{ id: 'b1', data: '2026-08-05', valor: 40, desc: 'TAG EXEMPLO', fluxo: 'saida', grupo: 'VEICULO', sub: 'Sem Parar / Pedagio', origem: 'manual' }], orcamentos: [{ id: 'VEICULO|Sem Parar / Pedagio', grupo: 'VEICULO', sub: 'Sem Parar / Pedagio', limite: 80 }] };
      Store.importarTexto(JSON.stringify(velho), 'substituir'); ST = Store.estado; return { g: ST.gastos[0].sub, v: ST.gastos[0].valor, o: ST.orcamentos[0].id, c: ST.config.cat3141 }; });
    ok(bk.g === NOVO && bk.v === 40 && bk.o === 'VEICULO|' + NOVO && bk.c === 1, 'backup antigo restaurado: o lançamento e o limite viram "Tag e pedágio" na hora');

    console.log('3) idiomas');
    const tx = await p.evaluate(() => [FRASES_EN['Tag e pedágio'], FRASES_ES['Tag e pedágio']]);
    ok(tx[0] === 'Toll tag and tolls' && tx[1] === 'Telepeaje y peajes', 'EN "Toll tag and tolls" e ES "Telepeaje y peajes" ' + tx.join(' / '));
    await p.evaluate(() => { I18n.atual = 'pt'; });
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
  } catch (e) { falhas++; console.log('  ✗ FALHOU: ' + (e && e.stack || e)); }
  finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
