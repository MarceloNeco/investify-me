/* =====================================================================
   teste/teste-rachai.js — 3.93: RachAI, rachar a conta da mesa (sem internet, sem IA). Dados FICTÍCIOS.
   Confere: dividir entre todos, quem não bebe fora das bebidas, consumo por pessoa com + e −, serviço proporcional,
   couvert por pessoa presente, gorjeta proporcional, o menor número de Pix, a conferência da conta do bar com diferença,
   o cardápio por foto, a mensagem, o lançamento da parte da família no BudgetONE (com a divisão, sem duplicar), a tela com
   toques, o cartão no Painel e o item no menu, e a visão da casa.
   Uso: node teste/teste-rachai.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [],
  pessoas: [{ id: 'p1', tipo: 'casa', papel: 'responsavel', nome: 'Fulano', apelido: 'Fulano' }, { id: 'p3', tipo: 'casa', papel: 'dependente', nome: 'Bia', apelido: 'Bia' }],
  gastos: [{ id: 'g0', data: '2026-10-05', valor: 50, grupo: 'PESSOAL', sub: 'Outros', desc: 'LOJA FICTICIA', fluxo: 'saida' }] };
const MESA = { id: 'm1', nome: 'Aniversário fictício', local: 'Bar Inventado', data: '2026-11-19', servicoPct: 10, couvert: 5, gorjeta: 0,
  pessoas: [{ id: 'a', nome: 'Fulano', pessoaId: 'p1' }, { id: 'b', nome: 'Bia', pessoaId: 'p3' }, { id: 'c', nome: 'Amigo X' }, { id: 'd', nome: 'Amiga Y', semBebida: true }],
  itens: [{ id: 'i1', nome: 'Picanha', preco: 120, divide: ['a', 'b', 'c', 'd'] }, { id: 'i2', nome: 'Cerveja', preco: 12, bebida: true, por: { a: 2, c: 3 } },
    { id: 'i3', nome: 'Chopp', preco: 30, bebida: true, divide: ['a', 'b', 'c', 'd'] }, { id: 'i4', nome: 'Suco', preco: 8, bebida: true, por: { d: 1 } }],
  pagamentos: { a: 150, c: 109.8 } };

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
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept('Amigo X'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof RachAI !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-painel'); render(); });

    console.log('1) a conta de cada um');
    await p.evaluate((m) => { ST.rachai_mesas = [m]; }, MESA);
    const c = await p.evaluate(() => RachAI.calcMesa(ST.rachai_mesas[0]));
    const t = (k) => c.pessoas[k];
    ok(t('a').consumo === 64 && t('b').consumo === 40 && t('c').consumo === 76 && t('d').consumo === 38, 'consumo: a picanha dividida entre os 4 (30), o chopp entre os 3 que bebem (10; a Amiga Y não bebe), as cervejas de cada um: 64 · 40 · 76 · 38');
    ok(t('a').servico === 6.4 && t('c').servico === 7.6 && t('d').servico === 3.8 && t('a').couvert === 5 && t('d').couvert === 5, 'serviço de 10% proporcional ao consumo (6,40 · 7,60 · 3,80) e couvert de R$ 5 por pessoa presente');
    ok(c.subtotal === 218 && c.total === 259.8 && t('a').total === 75.4 && t('b').total === 49 && t('c').total === 88.6 && t('d').total === 46.8, 'total da mesa 259,80: 75,40 · 49,00 · 88,60 · 46,80');
    const px = await p.evaluate(() => { const c = RachAI.calcMesa(ST.rachai_mesas[0]); return RachAI.pix(Object.keys(c.pessoas).reduce((o, k) => { o[k] = c.pessoas[k].saldo; return o; }, {})); });
    ok(px.length === 3 && px.map((x) => x.de + '>' + x.para + '=' + x.valor).join() === 'b>a=49,d>a=25.6,d>c=21.2', 'quem pagou (Fulano 150, Amigo X 109,80) e o menor número de Pix (3, para 4 pessoas): ' + JSON.stringify(px));
    const g = await p.evaluate(() => { const m = ST.rachai_mesas[0]; m.gorjeta = 21.8; const c = RachAI.calcMesa(m); m.gorjeta = 0; return [c.pessoas.a.gorjeta, c.pessoas.c.gorjeta, c.total]; });
    ok(g[0] === 6.4 && g[1] === 7.6 && g[2] === 281.6, 'gorjeta opcional (21,80) também proporcional ao consumo');
    const pres = await p.evaluate(() => { const m = JSON.parse(JSON.stringify(ST.rachai_mesas[0])); m.pessoas[3].presente = false; return RachAI.calcMesa(m).pessoas.d.couvert; });
    ok(pres === 0, 'quem não estava presente não paga couvert');

    console.log('2) cardápio por foto e conferência da conta do bar');
    const card = await p.evaluate(() => RachAI.lerCardapio('CARDÁPIO\nPICANHA NA CHAPA ........ 89,90\nCAIPIRINHA 22,00\nAGUA SEM GAS R$ 6,50\nBem-vindo!'));
    ok(card.length === 3 && card[0].nome === 'PICANHA NA CHAPA' && card[0].preco === 89.9 && !card[0].bebida && card[1].bebida && card[2].bebida && card[2].preco === 6.5, 'cada linha "nome ... preço" vira item editável (as bebidas já marcadas): ' + JSON.stringify(card));
    const conf = await p.evaluate(() => RachAI.conferir(ST.rachai_mesas[0], RachAI.lerConta('BAR INVENTADO\n5 CERVEJA LATA 60,00\nPICANHA 120,00\nCHOPP 30,00\nSUCO 8,00\nAGUA 6,00\nSUBTOTAL 224,00\nSERVICO 10% 21,80\nCOUVERT 20,00\nTOTAL 265,80')));
    ok(conf.totalConta === 265.8 && conf.esperado === 259.8 && conf.difTotal === 6 && conf.difs.length === 1 && conf.difs[0].nome === 'AGUA' && conf.difs[0].dif === 6, 'a conta do bar veio R$ 6,00 a mais: a ÁGUA que ninguém marcou: ' + JSON.stringify(conf));

    console.log('3) a mensagem e o lançamento da família');
    const msg = await p.evaluate(() => RachAI.mensagem(ST.rachai_mesas[0]));
    ok(/Aniversário fictício · Bar Inventado/.test(msg) && /Fulano: R\$ 75,40/.test(msg) && /Bia → Fulano: R\$ 49,00/.test(msg), 'a mensagem pronta: a mesa, quanto cada um deve e os Pix');
    const l = await p.evaluate(() => { const g = RachAI.lancarFamilia(ST.rachai_mesas[0]); const de = ST.gastos.filter((x) => x.id === g.id || (x.divisao && x.divisao.id === g.id)); return { partes: de.map((x) => x.valor + '|' + x.paraQuem + '|' + x.grupo + '|' + x.sub).sort(), de2: RachAI.lancarFamilia(ST.rachai_mesas[0]) }; });
    ok(l.partes.join() === '49|Bia|LAZER|Restaurantes,75.4|Fulano|LAZER|Restaurantes' && l.de2 === null, 'a parte da família (124,40) vira lançamento em Lazer › Restaurantes, dividido por pessoa; não lança duas vezes');

    console.log('4) a tela com toques');
    ok(await p.evaluate(() => !!document.querySelector('#view-b-painel .ra-destaque') && ABAS.budget.some((a) => a.v === 'b-rachai')), 'o cartão de destaque no Painel e o item "RachAI" no menu do BudgetONE');
    await p.click('#view-b-painel .ra-destaque'); await p.waitForTimeout(150);
    await p.click('#view-b-rachai [data-acao="ra-nova"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => ST.rachai_mesas.length === 2 && ST.rachai_mesas[1].pessoas.length === 1 && ST.rachai_mesas[1].pessoas[0].pessoaId === 'p1'), 'nova mesa já com a primeira pessoa da família');
    await p.fill('#raNovaP', 'Amigo X'); await p.click('#view-b-rachai [data-acao="ra-addp"]'); await p.waitForTimeout(80);
    await p.fill('#raItemNome', 'Porção de batata'); await p.fill('#raItemPreco', '40,00'); await p.click('#view-b-rachai [data-acao="ra-additem"]'); await p.waitForTimeout(80);
    await p.click('#view-b-rachai [data-acao="ra-dividir"]'); await p.waitForTimeout(80);
    await p.click('#view-b-rachai [data-acao="ra-todos"]'); await p.waitForTimeout(80);
    await p.fill('#raItemNome', 'Refrigerante'); await p.fill('#raItemPreco', '7,00'); await p.click('#view-b-rachai [data-acao="ra-additem"]'); await p.waitForTimeout(80);
    await p.locator('#view-b-rachai .ra-item').nth(1).locator('[data-acao="ra-mais"]').nth(1).click(); await p.waitForTimeout(60);
    await p.locator('#view-b-rachai .ra-item').nth(1).locator('[data-acao="ra-mais"]').nth(1).click(); await p.waitForTimeout(60);
    await p.click('#view-b-rachai [data-acao="ra-pagoutudo"]'); await p.waitForTimeout(100);
    const tela = await p.evaluate(() => ({ m: RachAI.calcMesa(ST.rachai_mesas[1]), txt: document.querySelector('#view-b-rachai .ra-fecha').textContent }));
    ok(tela.m.total === 59.4 && /Quem paga para quem \(1 Pix\)/.test(tela.txt) && /Fulano → Amigo X: R\$ 22,00/.test(tela.txt), 'com toques: a porção dividida entre todos e 2 refrigerantes para o Amigo X; ele pagou tudo → 1 Pix de R$ 22,00: ' + tela.m.total);

    console.log('5) visão da casa');
    ok(await p.evaluate(() => Escopo.de('rachai_mesas', ST.rachai_mesas[0]) === 'reservado' && Escopo.de('rachai_mesas', Object.assign({}, ST.rachai_mesas[0], { escopo: 'casa' })) === 'casa'), 'a mesa é de quem criou (reservada), a não ser que marque "da casa"');
    await p.evaluate(() => { const ck = document.querySelector('#view-b-rachai [data-ra="casa"]'); ck.checked = true; ck.dispatchEvent(new Event('change', { bubbles: true })); });
    ok(await p.evaluate(() => ST.rachai_mesas[1].escopo === 'casa'), 'o "Da casa" grava na mesa');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
