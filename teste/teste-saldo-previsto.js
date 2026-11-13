/* =====================================================================
   teste/teste-saldo-previsto.js — 3.77: o saldo previsto da conta, dia a dia, e a sugestão de resgate
   (modulos/saldo-previsto.js). Dados FICTÍCIOS.
   Confere: saldo 1.000 e boleto 2.320 amanhã → negativo e resgate de R$ 1.400; uma renda no meio refaz a linha;
   o que é pago no cartão não sai da conta; a fatura do cartão sai no vencimento; de onde resgatar (D+0 primeiro,
   D+1 pede um dia antes); "já resgatei" refaz a linha; gráfico no Painel e em Contas fixas; atenção e 📥;
   visão da casa não vê.
   Uso: node teste/teste-saldo-previsto.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos: [{ id: 'g1', data: '2026-10-05', valor: 50, grupo: 'ALIMENTACAO', sub: 'Padaria', desc: 'PADARIA EXEMPLO', fluxo: 'saida' }], recorrentes: [] };

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
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof SaldoPrevisto !== 'undefined');
    /* tudo relativo a hoje: amanhã, daqui a 5 dias… */
    await p.evaluate(() => {
      I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar();
      const h = hojeISO(), d = (k) => { const x = new Date(h + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + k); return x.toISOString().slice(0, 10); };
      window.D = d;
      const um = (id, nome, valor, data, extra) => Object.assign({ id, nome, valor, dia: Number(data.slice(8)), regra: 'dia', desde: data, ate: data, grupo: 'HABITACAO', sub: 'Outros', fluxo: 'saida', estadoPadrao: 'pendente', criadoEm: h }, extra || {});
      window.UM = um;
      ST.saldos_banco = [{ id: 'sb1', tipo: 'conta', banco: 'Banco Exemplo', conta: 'Conta corrente', final: '0001', saldo: 1000, data: h, hist: [] }];
      ST.recorrentes = [um('bol', 'Boleto Exemplo', 2320, d(1))];
      ST.posicoes = [];
      SaldoPrevisto._hoje = h;
    });

    console.log('1) saldo 1.000, boleto 2.320 amanhã');
    const a1 = await p.evaluate(() => { const c = SaldoPrevisto.contas()[0]; return { l: SaldoPrevisto.linha(c), a: SaldoPrevisto.alerta(c) }; });
    ok(a1.l.length === 46 && a1.l[0].saldo === 1000 && a1.l[1].saldo === -1320, 'linha de 46 pontos (hoje + 45 dias): 1.000 hoje, −1.320 amanhã');
    ok(a1.a && a1.a.resgate === 1400 && a1.a.dia === a1.l[1].data && a1.a.ate === a1.l[0].data, 'negativo amanhã; resgate 1.320 + 5% = 1.386 → R$ 1.400, até hoje: ' + JSON.stringify(a1.a));
    ok(await p.evaluate(() => SaldoPrevisto.resgate(-100) === 200 && SaldoPrevisto.resgate(-95) === 100 && SaldoPrevisto.resgate(-1000) === 1100), 'resgate: buraco + 5%, para cima em R$ 100 (100→200, 95→100, 1.000→1.100)');

    console.log('2) uma renda no meio refaz a linha');
    const a2 = await p.evaluate(() => {
      ST.saldos_banco[0].saldo = 3000;
      ST.recorrentes = [UM('b1', 'Boleto Exemplo', 2000, D(3)), UM('sal', 'Salário Exemplo', 5000, D(5), { fluxo: 'entrada', grupo: 'RENDA', sub: 'Salário' }), UM('b2', 'Boleto Grande', 7000, D(8))];
      const c = SaldoPrevisto.contas()[0], l = SaldoPrevisto.linha(c); return { s3: l[3].saldo, s5: l[5].saldo, s8: l[8].saldo, a: SaldoPrevisto.alerta(c) };
    });
    ok(a2.s3 === 1000 && a2.s5 === 6000 && a2.s8 === -1000 && a2.a && a2.a.resgate === 1100, '3.000 − 2.000 = 1.000; + salário 5.000 = 6.000; − 7.000 = −1.000 no dia 8; resgate R$ 1.100: ' + JSON.stringify(a2));
    const a2b = await p.evaluate(() => { ST.recorrentes[2].valor = 5000; return SaldoPrevisto.alerta(SaldoPrevisto.contas()[0]); });
    ok(a2b === null, 'com a renda no meio o boleto de 5.000 cabe: sem alerta');

    console.log('3) cartão: a compra no cartão não sai da conta; a fatura sai no vencimento');
    const a3 = await p.evaluate(() => {
      ST.saldos_banco[0].saldo = 1000;
      const dv = Number(D(10).slice(8));
      ST.recorrentes = [UM('ass', 'Assinatura no cartão', 900, D(2), { forma: 'Cartão de crédito', cartao: 'Cartão Exemplo' })];
      ST.saldos_banco.push({ id: 'sb2', tipo: 'cartao', banco: 'Banco Exemplo', conta: 'Cartão Exemplo', saldo: null, data: hojeISO(), cartao: { fatura: 1500, vence: dv } });
      const c = SaldoPrevisto.contas()[0]; return { ev: SaldoPrevisto.eventos(c), l: SaldoPrevisto.linha(c), d10: D(10), n: SaldoPrevisto.contas().length };
    });
    ok(a3.n === 1 && a3.ev.length === 1 && a3.ev[0].valor === -1500 && a3.ev[0].data === a3.d10 && a3.l[2].saldo === 1000 && a3.l[10].saldo === -500,
      'só a conta corrente entra; a assinatura no cartão não sai da conta; a fatura 1.500 sai no vencimento: ' + JSON.stringify(a3.ev));

    console.log('4) de onde resgatar');
    const a4 = await p.evaluate(() => {
      const r = [];
      ST.posicoes = [{ id: 'p1', ticker: 'TESOURO SELIC 2029', nome: 'Tesouro Selic', tipo: 'renda-fixa', qtd: 1, pm: 10000, valorManual: 10000, moeda: 'BRL' },
        { id: 'p2', ticker: 'ACAO1', nome: 'Ação Exemplo', tipo: 'acao', qtd: 100, pm: 100, valorManual: 10000, moeda: 'BRL' }];
      const c = SaldoPrevisto.contas()[0]; r.push(SaldoPrevisto.alerta(c));
      ST.posicoes.push({ id: 'p3', ticker: 'CDB LIQUIDEZ DIARIA', nome: 'CDB Exemplo liquidez diária', tipo: 'renda-fixa', qtd: 1, pm: 3000, valorManual: 3000, moeda: 'BRL' });
      r.push(SaldoPrevisto.alerta(c)); r.push(D(9), D(8)); return r;
    });
    ok(a4[0].de && a4[0].de.nome === 'Tesouro Selic' && a4[0].de.dias === 1 && a4[0].ate === a4[2] && a4[0].pedirAte === a4[3], 'só Tesouro Selic (D+1): resgate até a véspera, peça um dia antes: ' + JSON.stringify(a4[0]));
    ok(a4[1].de && a4[1].de.dias === 0 && /CDB/.test(a4[1].de.nome) && a4[1].pedirAte === a4[2], 'com um CDB de liquidez diária (D+0): ele primeiro, cai no mesmo dia');
    ok(await p.evaluate(() => SaldoPrevisto.liquidez({ tipo: 'acao', nome: 'X' }) === null && SaldoPrevisto.liquidez({ tipo: 'caixa', nome: 'Dinheiro' }) === 0 && SaldoPrevisto.liquidez({ tipo: 'fundo', nome: 'Fundo DI Exemplo' }) === 1 && SaldoPrevisto.liquidez({ tipo: 'acao', liquidez: 'D+2' }) === 2),
      'liquidez: ação não; caixa D+0; fundo DI D+1; o campo liquidez da posição manda');

    console.log('5) telas: Painel, Contas fixas, atenção e 📥');
    await p.evaluate(() => { abrirApp('budget'); irPara('b-painel'); render(); });
    const t5 = await p.evaluate(() => { const c = document.querySelector('.sp-card'); return c && { svg: !!c.querySelector('svg.sp-graf .sp-zero'), neg: !!c.querySelector('.sp-neg'), txt: c.innerText, at: (document.querySelector('.sp-atencao') || {}).innerText || '' }; });
    ok(t5 && t5.svg && t5.neg && /fica negativa em/.test(t5.txt) && /Resgate R\$\s?600/.test(t5.txt), 'Painel: cartão com gráfico (linha do zero, parte negativa) e a frase de resgate (−500 → R$ 600)');
    ok(t5 && /Precisa da sua atenção/.test(t5.at) && /Banco Exemplo/.test(t5.at), '"Precisa da sua atenção" com a conta');
    const t5b = await p.evaluate(() => { const g = inboxGrupos().find((x) => x.id === 'saldo'); return g && { n: g.n, t: g.titulo, html: g.html }; });
    ok(t5b && t5b.n === 1 && /negativa/.test(t5b.html), '📥: grupo "Conta vai ficar negativa" com o aviso');
    await p.evaluate(() => { irPara('b-custos'); render(); });
    ok(await p.evaluate(() => !!document.querySelector('#view-b-custos .sp-card svg')), 'Contas fixas: o mesmo gráfico');

    console.log('6) "já resgatei / já agendei" refaz a linha');
    await p.evaluate(() => { irPara('b-painel'); render(); });
    await p.click('#view-b-painel .sp-card [data-acao="sp-ajustar"]');
    await p.fill('#view-b-painel .sp-valor', '600');
    await p.evaluate(() => { const i = document.querySelector('#view-b-painel [id^="spData"]'); i.value = D(5); });
    await p.click('#view-b-painel .sp-card [data-acao="sp-salvar"]');
    const a6 = await p.evaluate(() => ({ aj: ST.saldo_ajustes, a: SaldoPrevisto.alerta(SaldoPrevisto.contas()[0]), card: (document.querySelector('#view-b-painel .sp-card') || {}).innerText || '' }));
    ok(a6.aj.length === 1 && a6.aj[0].valor === 600 && a6.a === null && !/fica negativa/.test(a6.card), 'guardou 600 no dia 5: a linha fica positiva e o alerta some');

    console.log('7) visão da casa não vê');
    const a7 = await p.evaluate(() => { const o = Escopo.soCasa; Escopo.soCasa = () => true; const n = SaldoPrevisto.contas().length; const h = MoneyModulos.html('budget.painel', {}); Escopo.soCasa = o; return { n, tem: /sp-card/.test(h) }; });
    ok(a7.n === 0 && !a7.tem, 'na visão da casa não há contas nem cartão');

    ok(p.erros.length === 0, 'sem erros na página: ' + p.erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)'); process.exit(falhas ? 1 : 0);
})();
