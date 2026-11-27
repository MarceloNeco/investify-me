/* =====================================================================
   teste/teste-compra-itens.js — 3.135: compra com itens de categorias diferentes vira lançamento DIVIDIDO (modulos/compra-itens.js).
   Dados FICTÍCIOS. Confere: a compra mista (2 categorias + frete rateado) → "dividir assim?" no 📥 → Dividir (o lançamento vira 2,
   soma igual ao total) e a regra POR ITEM (nunca por loja); a compra de uma categoria só (sem divisão, o "É isso?" de sempre); o item
   sem palpite (seletor na linha; o Dividir só depois de escolher); o aviso de envio (não concilia, não pede nada); "ver itens" na ficha.
   Uso: node teste/teste-compra-itens.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const G = (id, data, valor) => ({ id: 'rb_' + id, idRobo: id, data, valor, desc: 'LOJA ONLINE EXEMPLO', descRobo: 'LOJA ONLINE EXEMPLO', fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1', finalCartao: '1234' });
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [], cartoes: [{ id: 'c1', apelido: 'Cartão Ficticio', bandeira: 'visa', fim: '1234', vence: 10, fecha: 3 }],
  gastos: [G('m1', '2026-11-14', 200.5), G('u1', '2026-11-12', 75.3), G('s1', '2026-11-10', 120)] };
const CS = (g, c) => ({ grupo: g, categoria: c, confianca: 'palpite', motivo: 'pelo item' });

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
    await p.clock.setFixedTime(new Date('2026-11-16T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.Comprovantes && window.CompraItens && window.Divisao);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-painel'); render(); });
    const li = (id) => p.evaluate((i) => { abrirInbox(); const l = document.querySelector('#genModal [data-cp="' + i + '"]'); return l ? l.textContent.replace(/\s+/g, ' ') : ''; }, id);

    console.log('1) compra mista: 2 categorias + frete');
    await p.evaluate((cs) => Comprovantes.receber({ id: 'amazon-111', subtipo: 'compra', loja: 'Loja Online Exemplo', pedido: '111-0000001', valor: 200.5, data: '2026-11-14', final: '1234', confianca: 'alta', dividir_por_categoria: true,
      itens: [{ produto: 'Livro de Exercícios Exemplo', quantidade: 1, valor: 160, categoria_sugerida: cs[0] }, { produto: 'Papel Higiênico Folha Dupla 12 rolos', quantidade: 1, valor: 30, categoria_sugerida: cs[1] }] }),
      [CS('DEPENDENTES', 'Material Escolar'), CS('HABITACAO', 'Mercado')]);
    const t1 = await li('amazon-111');
    ok(/Compra Loja Online Exemplo R\$\s?200,50 \(pedido 111-0000001\) — dividir assim\?/.test(t1), 'o 📥: "Compra … R$ 200,50 (pedido …) — dividir assim?"');
    ok(/Material Escolar R\$\s?168,84 \(1 item: Livro de Exercícios Exemplo\)/.test(t1) && /Mercado R\$\s?31,66 \(1 item: Papel Higiênico/.test(t1), 'as partes com o frete rateado na proporção (160 + 30 = 190; o total 200,50): ' + (t1.match(/dividir assim\?.{0,170}/) || [''])[0]);
    ok(/frete\/desconto rateado: R\$\s?10,50/.test(t1) && /Tudo numa categoria/.test(t1) && /Ajustar/.test(t1), '"frete/desconto rateado: R$ 10,50" e os botões Dividir, Tudo numa categoria, Ajustar');
    await p.click('#genModal [data-cp="amazon-111"] [data-acao="ci-dividir"]'); await p.waitForTimeout(200);
    const dv = await p.evaluate(() => { const gs = Gasto.todos().filter((g) => g.id === 'rb_m1' || g.id.indexOf('rb_m1~') === 0); return { n: gs.length, soma: Math.round(gs.reduce((s, g) => s + g.valor, 0) * 100) / 100, cats: gs.map((g) => g.grupo + '|' + g.sub).sort().join(','), regras: ST.config.itemRegras || {} }; });
    ok(dv.n === 2 && dv.soma === 200.5 && dv.cats === 'DEPENDENTES|Material Escolar,HABITACAO|Mercado', '"Dividir": o lançamento vira 2 partes (Material Escolar e Mercado) e a soma continua R$ 200,50');
    ok(dv.regras['livro exercicios exemplo'] && dv.regras['livro exercicios exemplo'].sub === 'Material Escolar' && dv.regras['papel higienico folha'].sub === 'Mercado' && !Object.keys(dv.regras).some((k) => /loja|online/.test(k)), 'a resposta vira regra POR ITEM (o produto), nunca pela loja');
    ok(await p.evaluate(() => Comprovantes.lista().find((x) => x.id === 'amazon-111').estado === 'ok'), 'o comprovante sai do 📥');
    const fic = await p.evaluate(() => { abrirLancamento('rb_m1'); const d = document.querySelector('.ci-itens'); return d ? d.textContent.replace(/\s+/g, ' ') : ''; });
    ok(/ver itens \(2\)/.test(fic) && /Papel Higiênico Folha Dupla 12 rolos/.test(fic), 'na ficha do lançamento: "ver itens (2)" com o produto e o valor');
    await p.evaluate(() => { document.querySelectorAll('.modal:not(.hidden)').forEach((m) => m.classList.add('hidden')); });

    console.log('2) compra de uma categoria só: sem divisão');
    await p.evaluate((cs) => Comprovantes.receber({ id: 'amazon-222', subtipo: 'compra', loja: 'Loja Online Exemplo', pedido: '222', valor: 120, data: '2026-11-10', final: '1234', confianca: 'alta',
      itens: [{ produto: 'Caderno Exemplo 10 matérias', quantidade: 2, valor: 80, categoria_sugerida: cs[0] }, { produto: 'Estojo Exemplo', quantidade: 1, valor: 40, categoria_sugerida: cs[0] }] }), [CS('DEPENDENTES', 'Material Escolar')]);
    const t2 = await li('amazon-222');
    ok(!/dividir assim/.test(t2) && /É isso\? Dependentes › Material Escolar/.test(t2), 'itens da mesma categoria: sem divisão, o "É isso? Dependentes › Material Escolar" de sempre');

    console.log('3) item sem palpite: o seletor na linha');
    await p.evaluate((cs) => Comprovantes.receber({ id: 'amazon-333', subtipo: 'compra', loja: 'Loja Online Exemplo', pedido: '333', valor: 75.3, data: '2026-11-12', final: '1234', confianca: 'alta', dividir_por_categoria: true,
      itens: [{ produto: 'Ração Exemplo para Gato', quantidade: 1, valor: 50, categoria_sugerida: cs[0] }, { produto: 'Cabo USB Exemplo', quantidade: 1, valor: 25.3 }] }), [CS('HABITACAO', 'Mercado')]);
    const t3 = await li('amazon-333');
    ok(/Qual a categoria de: Cabo USB Exemplo\?/.test(t3) && !(await p.evaluate(() => !!document.querySelector('#genModal [data-cp="amazon-333"] [data-acao="ci-dividir"]'))), '"Qual a categoria de: Cabo USB Exemplo?", e o Dividir só depois de escolher');
    await p.evaluate(() => { const s = document.querySelector('#genModal [data-cp="amazon-333"] .ci-sel'); const op = [...s.options].find((o) => /\|/.test(o.value) && !/^HABITACAO\|Mercado$/.test(o.value)); s.value = op.value; s.dispatchEvent(new Event('change', { bubbles: true })); window.__esc = op.value; });
    await p.waitForTimeout(150);
    const t3b = await li('amazon-333');
    ok(/dividir assim\?/.test(t3b) && await p.evaluate(() => !!document.querySelector('#genModal [data-cp="amazon-333"] [data-acao="ci-dividir"]')), 'escolhida a categoria do cabo, aparece o Dividir com as 2 partes');

    console.log('4) o aviso de envio');
    await p.evaluate(() => Comprovantes.receber({ id: 'amazon-111-envio', subtipo: 'outro', aviso_envio: true, valor: null, loja: 'Loja Online Exemplo', pedido: '111-0000001', data: '2026-11-15', itens: [{ produto: 'Livro de Exercícios Exemplo', quantidade: 1, valor: 160 }] }));
    ok(await p.evaluate(() => { const x = Comprovantes.lista().find((y) => y.id === 'amazon-111-envio'); return x.estado === 'ok' && !x.gastoId && !Comprovantes.abertos().some((y) => y.id === 'amazon-111-envio' && y.estado !== 'ok'); }) && !/amazon-111-envio/.test(await p.evaluate(() => { abrirInbox(); return document.getElementById('genModal').innerHTML; })), '"Enviado/Entregue": não concilia e não pede nada');
    ok(await p.evaluate(() => { abrirInbox(); const m = document.querySelector('#genModal .modal-box, #genModal > div') || document.getElementById('genModal'); return document.documentElement.scrollWidth <= 391 && m.scrollWidth <= m.clientWidth + 1; }), 'celular (390): o 📥 com o bloco "dividir assim?" não rola para o lado');
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
    await ctx.close();
  } finally { await b.close(); srv.close(); }
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
