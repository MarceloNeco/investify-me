/* =====================================================================
   teste/teste-3143.js — 3.143: desempenho com muitos lançamentos. Dados FICTÍCIOS (lojas e valores inventados).
   Confere:
   - trocar de tela não remonta a lista inteira do 📥 só para contar: com os dados iguais, o número do topo vem guardado;
   - o número muda na hora quando os dados mudam (lançamento novo + salvar) e quando muda o idioma;
   - abrir o 📥 sempre monta a lista na hora, e o número do topo bate com ela;
   - um lote do robô (60 lançamentos de uma vez) cruza os comprovantes UMA vez, no fim do lote, e a compra liga ao lançamento certo;
   - sem nada novo, cruzar de novo não refaz o trabalho (e ligarTudo(true) refaz);
   - o recibo do exterior continua ligando ao lançamento do cartão;
   - as contas de dias (dias entre datas) dão o mesmo resultado de antes;
   - nenhum erro na página.
   Uso: node teste/teste-3143.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const R = (id, data, valor, desc, extra) => Object.assign({ id: 'rb_' + id, idRobo: id, data, valor, desc, descRobo: desc, fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1' }, extra || {});
/* 400 lançamentos inventados, de outubro e novembro */
const gastos = [];
for (let i = 0; i < 400; i++) gastos.push(R('h' + i, '2026-' + (i % 2 ? '10' : '11') + '-' + String(1 + (i % 27)).padStart(2, '0'), 10 + (i % 90) + (i % 7) / 10, 'LOJA EXEMPLO ' + (i % 40)));
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [], cartoes: [{ id: 'c1', nome: 'Cartão Exemplo', final: '1234' }], gastos };
const C = (id, subtipo, extra) => Object.assign({ id: 'evid-' + id, tipo: 'comprovante', subtipo, remetente: 'nao-responda@exemplo.com', assunto: 'Assunto de exemplo' }, extra || {});

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.clock.setFixedTime(new Date('2026-11-28T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Comprovantes !== 'undefined' && typeof ReciboExterior !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-lanc');
      Comprovantes._hoje = '2026-11-28'; ReciboExterior._ptax = async () => ({ '2026-11-14': 5.5 });
      /* conta quantas vezes a lista do 📥 é montada e quantas vezes os comprovantes são cruzados */
      window.__n = { grupos: 0, ligar: 0 };
      const g0 = window.inboxGrupos; window.inboxGrupos = function () { window.__n.grupos++; return g0.apply(this, arguments); };
      const l0 = Comprovantes.ligarTudo; Comprovantes.ligarTudo = function () { window.__n.ligar++; return l0.apply(this, arguments); }; });
    const n = () => p.evaluate(() => Object.assign({}, window.__n));
    const zera = () => p.evaluate(() => { window.__n.grupos = 0; window.__n.ligar = 0; });
    const badge = () => p.evaluate(() => { const e = document.getElementById('inboxN'); return e.classList.contains('hidden') ? 0 : Number(e.textContent.replace('+', '')); });

    console.log('1) trocar de tela com os dados iguais: o número do 📥 vem guardado');
    await p.evaluate(() => { irPara('b-custos'); });   /* a primeira conta (depois da carga) */
    await zera();
    await p.evaluate(() => { irPara('b-lanc'); irPara('b-painel'); irPara('b-custos'); irPara('b-lanc'); });
    ok((await n()).grupos === 0, '4 trocas de tela sem mudar nada: a lista do 📥 não foi montada nenhuma vez (antes: 4 vezes)');

    console.log('2) o número muda quando os dados mudam');
    await p.evaluate(() => { Comprovantes.receber({ id: 'evid-av1', tipo: 'comprovante', subtipo: 'compra', data: '2026-11-20', valor: 777.77, loja: 'Loja Inventada', produto: 'Produto de exemplo', final: '1234', remetente: 'nao-responda@exemplo.com', assunto: 'Assunto de exemplo' }); });
    await zera();
    const q0 = await badge();
    await p.evaluate(() => { Gasto.add({ id: 'rb_novo1', idRobo: 'novo1', data: '2026-11-27', valor: 33.3, desc: 'LOJA NOVA EXEMPLO', descRobo: 'LOJA NOVA EXEMPLO', fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1' }); Store.salvar(); irPara('b-painel'); });
    const r2 = await p.evaluate(() => ({ topo: Number((document.getElementById('inboxN').textContent || '0').replace('+', '')) || 0, lista: inboxContagem() }));
    ok((await n()).grupos >= 1 && r2.topo === Math.min(r2.lista, 99), 'lançamento novo + salvar: o número do topo é recontado (' + q0 + ' → ' + r2.topo + ') e bate com a lista (' + r2.lista + ')');
    await zera();
    await p.evaluate(() => { I18n.atual = 'en'; irPara('b-lanc'); I18n.atual = 'pt'; irPara('b-lanc'); });
    ok((await n()).grupos >= 2, 'trocar o idioma reconta (o texto do 📥 muda de língua)');

    console.log('3) abrir o 📥 monta a lista na hora');
    await zera();
    await p.evaluate(() => { abrirInbox(); });
    const r3 = await p.evaluate(() => ({ itens: [...document.querySelectorAll('#genBody .inb-grupo .inb-n')].reduce((s, x) => s + Number(x.textContent), 0) }));
    const b3 = await badge();
    ok((await n()).grupos >= 1 && (r3.itens === b3 || (r3.itens > 99 && b3 === 99)), 'abrir o 📥: a lista é montada agora e o número do topo bate com ela (' + r3.itens + ')');
    await p.evaluate(() => { const m = document.querySelector('.modal-wrap:not(.hidden)'); if (m && typeof fechar === 'function') fechar(m.id); });

    console.log('4) um lote do robô cruza os comprovantes uma vez só');
    await p.evaluate(() => { Comprovantes.receber({ id: 'evid-lote', tipo: 'comprovante', subtipo: 'compra', data: '2026-11-26', valor: 123.45, loja: 'Loja Do Lote', produto: 'Produto de exemplo', descritor_fatura: 'LOJA DO LOTE*EXEMPLO', final: '1234', remetente: 'nao-responda@exemplo.com', assunto: 'Assunto de exemplo' }); });
    await zera();
    await p.evaluate(async () => {
      for (let i = 0; i < 60; i++) Gasto.add({ id: 'rb_lote' + i, idRobo: 'lote' + i, data: '2026-11-' + String(1 + (i % 27)).padStart(2, '0'), valor: 20 + i, desc: 'LOJA DO LOTE ' + i, descRobo: 'LOJA DO LOTE ' + i, fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1' });
      Gasto.add({ id: 'rb_lotecerto', idRobo: 'lotecerto', data: '2026-11-26', valor: 123.45, desc: 'LOJA DO LOTE*EXEMPLO', descRobo: 'LOJA DO LOTE*EXEMPLO', fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1' });
      await new Promise((r) => setTimeout(r, 50)); });
    const r4 = await p.evaluate(() => ({ n: window.__n.ligar, liga: (Comprovantes.lista().find((x) => x.id === 'evid-lote') || {}).gastoId }));
    ok(r4.n === 1, '61 lançamentos de uma vez: os comprovantes são cruzados 1 vez, no fim do lote (antes: 61 vezes; vezes agora: ' + r4.n + ')');
    ok(r4.liga === 'rb_lotecerto', 'e a compra do comprovante liga ao lançamento certo do lote');

    console.log('5) sem nada novo, cruzar de novo não refaz o trabalho; ligarTudo(true) refaz');
    const r5 = await p.evaluate(() => { const x = Comprovantes.lista().find((y) => y.id === 'evid-lote'); const antes = x.gastoId; delete x.gastoId;
      Comprovantes.ligarTudo(); const semNada = x.gastoId || ''; Comprovantes.ligarTudo(true); const forcado = x.gastoId || ''; if (!x.gastoId) x.gastoId = antes; return { semNada, forcado }; });
    ok(r5.semNada === '' && r5.forcado === 'rb_lotecerto', 'dados iguais: o cruzamento não roda de novo; forçado, roda e liga');

    console.log('6) o recibo do exterior continua ligando');
    await p.evaluate(() => { Gasto.add({ id: 'rb_ext1', idRobo: 'ext1', data: '2026-11-14', valor: 110, desc: 'SERVICO INVENTADO*ONLINE', descRobo: 'SERVICO INVENTADO*ONLINE', fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1' }); Store.salvar(); });
    const r6 = await p.evaluate(() => { const x = { id: 'rx-1', servico: 'Servico Inventado', moeda: 'USD', valorMoeda: 20, data: '2026-11-14' }; const c = ReciboExterior.casar(x); return c && c.g ? c.g.id : ''; });
    ok(r6 === 'rb_ext1', 'recibo de US$ 20 do "Servico Inventado" casa com o lançamento do cartão do mesmo serviço');

    console.log('7) contas de dias iguais às de antes');
    const r7 = await p.evaluate(() => { const ant = (a, b) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000);
      const ds = ['2026-01-01', '2026-02-28', '2026-03-01', '2026-10-25', '2026-11-01', '2026-12-31', '2027-01-01', '2024-02-29'];
      let iguais = 0, total = 0; ds.forEach((a) => ds.forEach((b) => { total++; if (Comprovantes._dias(a, b) === ant(a, b)) iguais++; })); return [iguais, total]; });
    ok(r7[0] === r7[1], 'dias entre datas (horário de verão, ano bissexto, virada do ano): ' + r7[0] + ' de ' + r7[1] + ' iguais');

    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + e.message); }
  await b.close(); srv.close();
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
