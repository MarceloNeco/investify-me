/* =====================================================================
   teste/teste-consorcio.js — 3.121: o "mergulho" no consórcio (modulos/consorcio.js), com a ficha.consorcio que o robô manda.
   Dados FICTÍCIOS (grupos, cotas, valores e datas inventados). Confere: o extrato do consórcio não pede nada no 📥; o lançamento da
   parcela mostra a cota (grupo, cota, N de M parcelas, %, pago, falta, crédito, barra); a conta fixa ganha o atalho; "Todos os
   consórcios" com o filtro auto/imóvel/ambos (guardado) e o total; as parcelas da cota.
   Uso: node teste/teste-consorcio.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const parc = (ini, n, v, mes0) => Array.from({ length: n }, (_, i) => ({ parcela: ini + i, data_pagamento: '2026-' + ('0' + (mes0 + i)).slice(-2) + '-15', valor: v }));
const CI = { grupo: '9001', cota: '123', bem: 'apartamento', tipo: 'imovel', valor_credito: 300000, prazo_meses: 200, parcelas_pagas: 45, parcelas_a_pagar: 155, parcela_atual: 1800,
  total_pago: 81000, total_a_pagar: 279000, percentual_pago: 22.5, parcelas: parc(41, 5, 1800, 7) };
const CA = { grupo: '7002', cota: '45', bem: 'carro', tipo: 'auto', valor_credito: 90000, prazo_meses: 80, parcelas_pagas: 20, parcelas_a_pagar: 60, parcela_atual: 1300,
  total_pago: 26000, total_a_pagar: 78000, percentual_pago: 25, parcelas: parc(16, 5, 1300, 7) };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [],
  gastos: [{ id: 'rb_ci', data: '2026-11-15', valor: 1800, desc: 'CONSORCIO FICTICIO PARC', fluxo: 'saida', grupo: 'HABITACAO', sub: 'Amortização Apartamento', origem: 'robo' },
    { id: 'rb_ca', data: '2026-11-16', valor: 1300, desc: 'PAG CONSORCIO AUTO FICT', fluxo: 'saida', grupo: 'VEICULO', sub: 'Prestação Auto', origem: 'robo' },
    { id: 'rb_x', data: '2026-11-15', valor: 1800, desc: 'ALUGUEL FICTICIO', fluxo: 'saida', grupo: 'HABITACAO', sub: 'Aluguel', origem: 'robo' }],
  recorrentes: [{ id: 'r-ca', nome: 'Consórcio do carro', valor: 1300, dia: 16, regra: 'dia', desde: '2026-01-16', grupo: 'VEICULO', sub: 'Prestação Auto', fluxo: 'saida', estadoPadrao: 'automatico', criadoEm: '2026-01-01' }] };

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
    await p.clock.setFixedTime(new Date('2026-11-25T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.Consorcio && window.Comprovantes);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-lanc'); render(); });
    await p.evaluate(([ci, ca]) => { Comprovantes.receber({ id: 'consorcio-9001-123', subtipo: 'outro', loja: 'Consórcio Ficticio', data: '2026-11-20', ficha: { consorcio: ci } });
      Comprovantes.receber({ id: 'consorcio-7002-45', subtipo: 'outro', loja: 'Consórcio Ficticio', data: '2026-11-20', ficha: { consorcio: ca } }); }, [CI, CA]);

    console.log('1) o extrato é informação');
    ok(await p.evaluate(() => Comprovantes.lista().every((x) => x.estado === 'ok') && !Comprovantes.pendencias().length), 'os 2 extratos de consórcio não pedem nada no 📥');

    console.log('2) tocar no custo: a cota');
    const d = await p.evaluate(() => { const h = (id) => { const d0 = document.createElement('div'); d0.innerHTML = MoneyModulos.html('lancamento.form', { g: Gasto.todos().find((g) => g.id === id) }); const b0 = d0.querySelector('.cs-bloco-cota'); return b0 ? b0.textContent.replace(/\s+/g, ' ') : ''; }; return { ci: h('rb_ci'), ca: h('rb_ca'), x: h('rb_x') }; });
    ok(/🏠 Consórcio imóvel \(apartamento\) · grupo 9001 · cota 123/.test(d.ci) && /45 de 200 parcelas \(22,5%\) · pago R\$\s?81\.000,00 · falta R\$\s?279\.000,00 · crédito R\$\s?300\.000,00/.test(d.ci), 'a parcela do imóvel (o valor e a data batem com a do extrato): ' + d.ci.slice(0, 160));
    ok(/🚗 Consórcio auto \(carro\) · grupo 7002 · cota 45/.test(d.ca) && /20 de 80 parcelas \(25%\)/.test(d.ca), 'a parcela do carro: ' + d.ca.slice(0, 90));
    ok(await p.evaluate(() => Consorcio.cotas().every((c) => c.parcelas.length === 5)), 'as parcelas do extrato chegam inteiras (5 em cada cota)');
    ok(d.x === '', 'o aluguel do mesmo valor e do mesmo dia NÃO vira consórcio (não tem cara de consórcio)');

    console.log('3) a conta fixa ganha o atalho');
    await p.evaluate(() => { irPara('b-custos'); render(); }); await p.waitForTimeout(150);
    const at = await p.evaluate(() => { const b0 = document.querySelector('.cs-atalho'); return b0 ? b0.textContent : ''; });
    ok(/🚗 20\/80 \(25%\)/.test(at), 'Contas fixas: "Consórcio do carro" com "🚗 20/80 (25%)": ' + at);

    console.log('4) todos os consórcios, com o filtro');
    await p.evaluate(() => { localStorage.removeItem('moneytrio.consorcio.filtro'); document.querySelector('.cs-atalho').click(); }); await p.waitForTimeout(150);
    const pc = await p.evaluate(() => ({ t: document.getElementById('genTitle').textContent, linhas: document.querySelectorAll('#genBody .cs-parc tbody tr').length, prim: (document.querySelector('#genBody .cs-parc tbody tr') || {}).textContent || '' }));
    ok(/Consórcio auto/.test(pc.t) && pc.linhas === 5 && /20.*R\$\s?1\.300,00/.test(pc.prim), 'o atalho abre as parcelas da cota (a mais nova primeiro): ' + pc.prim);
    await p.click('#genBody [data-acao="cs-todos"]'); await p.waitForTimeout(150);
    const am = await p.evaluate(() => ({ n: document.querySelectorAll('#genBody .cs-item').length, tot: (document.querySelector('#genBody .cs-total') || {}).textContent || '' }));
    ok(am.n === 2 && /2 cota\(s\) · pago R\$\s?107\.000,00 · falta R\$\s?357\.000,00 · crédito R\$\s?390\.000,00/.test(am.tot), '"Ambos": as 2 cotas e o total: ' + am.tot);
    await p.click('#genBody [data-acao="cs-filtro"][data-v="auto"]'); await p.waitForTimeout(150);
    const au = await p.evaluate(() => ({ n: document.querySelectorAll('#genBody .cs-item').length, txt: document.querySelector('#genBody .cs-item').textContent, salvo: localStorage.getItem('moneytrio.consorcio.filtro') }));
    ok(au.n === 1 && /🚗/.test(au.txt) && au.salvo === 'auto', '"🚗 Auto": só o do carro, e a escolha fica guardada');
    await p.click('#genBody [data-acao="cs-filtro"][data-v="imovel"]'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => document.querySelectorAll('#genBody .cs-item').length === 1 && /🏠/.test(document.querySelector('#genBody .cs-item').textContent)), '"🏠 Imóvel": só o do apartamento');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
