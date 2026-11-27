/* =====================================================================
   teste/teste-extrato-corretora.js — 3.137: o extrato mensal da corretora (Avenue) na Carteira (modulos/invest-banco.js 1.1.0,
   saldo-banco 2.5.0, comprovantes 1.6.0). Dados FICTÍCIOS.
   Confere: extrato mais velho que a última importação não ressuscita papel vendido nem mexe em nada (fica no comprovante, "extrato
   de 31/10/2026" com o total) · extrato novo atualiza a quantidade sem mexer no preço médio · papel novo entra com "veio do extrato"
   · bond e caixa ("Dinheiro em USD") · papel sumido pergunta "vendeu?" [Sim, tirar] [Manter] e nunca apaga sozinho · posição editada
   depois do extrato não é tocada · a primeira vez desta versão conta a Carteira existente como atualizada hoje.
   Uso: node teste/teste-extrato-corretora.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const P = (id, ticker, qtd, pm) => ({ id, ticker, nome: ticker + ' Exemplo', tipo: 'acao-us', inst: 'Avenue', qtd, pm, moeda: 'USD' });
/* a Carteira importada à mão (antes desta versão: sem data de atualização) */
const LOCAL = { v: 1, config: { fitaLigada: false }, gastos: [], posicoes: [P('a1', 'ABCD', 10, 50), P('a2', 'WXYZ', 5, 20), P('a3', 'QRST', 7, 30), { id: 'b1', ticker: 'EXMP3', nome: 'Outra corretora', tipo: 'acao-br', inst: 'Corretora Exemplo', qtd: 100, pm: 10, moeda: 'BRL' }] };
const IT = (t, data, classe, qtd, preco, valor) => ({ tipo: 'investimento', id: 'inv-avenue-' + t + '-' + data, banco: 'Avenue', conta: t === 'caixa' ? 'Caixa' : t + ' Exemplo', classe, moeda: 'USD',
  conta_id: 'avenue-' + (t === 'caixa' ? 'caixa' : t), ticker: t === 'caixa' ? undefined : t, quantidade: qtd, preco, saldo: valor, data });

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
    await p.clock.setFixedTime(new Date('2026-11-27T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.InvestBanco && window.SaldoBanco);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); });
    const pos = (t) => p.evaluate((x) => ST.posicoes.find((q) => q.ticker === x && /avenue/i.test(q.inst)) || null, t);
    const receber = (l) => p.evaluate((its) => { its.forEach((i) => SaldoBanco.receberInvest(i)); return InvestBanco.sincronizar(); }, l);
    ok(await p.evaluate(() => ST.config.invUltima && ST.config.invUltima.avenue === '2026-11-27' && ST.config.invUltima.corretora === '2026-11-27'), 'primeira vez desta versão: a Carteira que já existe conta como atualizada hoje (27/11), por instituição');

    console.log('1) o extrato de 31/10 chega depois (a carteira é de 27/11; OLDX foi vendido em novembro)');
    const n1 = await receber([IT('ABCD', '2026-10-31', 'acao', 8, 48, 384), IT('OLDX', '2026-10-31', 'acao', 3, 10, 30), IT('caixa', '2026-10-31', 'caixa', null, null, 100)]);
    ok(n1 === 0 && !(await pos('OLDX')) && (await pos('ABCD')).qtd === 10 && !(await p.evaluate(() => ST.posicoes.some((q) => q.tipo === 'caixa'))), 'extrato mais velho: não ressuscita o OLDX vendido, não mexe no ABCD (10) e não cria o caixa');
    await p.evaluate(() => Comprovantes.receber({ id: 'avenue-extrato-2026-10', tipo: 'comprovante', subtipo: 'extrato_investimentos', loja: 'Avenue', moeda: 'USD', data: '2026-10-31', valor: null, total_carteira: 514, caixa: 100, posicoes: [{ ticker: 'ABCD' }, { ticker: 'OLDX' }] }));
    const cx = await p.evaluate(() => { const x = Comprovantes.lista().find((y) => y.id === 'avenue-extrato-2026-10'); return { e: x.estado, s: Comprovantes.situacao(x), pend: Comprovantes.pendencias().some((y) => y.id === x.id) }; });
    ok(cx.e === 'ok' && !cx.pend && /extrato de 31\/10\/2026 · total US\$\s?514,00/.test(cx.s), 'fica só no comprovante: "' + cx.s + '" (sem pendência)');
    ok(await p.evaluate(() => InvestBanco.sumidos().length === 0), 'e não pergunta "vendeu?" por causa de extrato velho');

    console.log('2) o extrato de 30/11 (mais novo)');
    await p.evaluate(() => { InvestBanco._hoje = '2026-12-03'; });
    await receber([IT('ABCD', '2026-11-30', 'acao', 12, 60, 720), IT('NEWB', '2026-11-30', 'etf', 4, 100, 400), IT('BOND1', '2026-11-30', 'bond', 2, 1000, 2000), IT('QRST', '2026-11-30', 'acao', 7, 31, 217), IT('caixa', '2026-11-30', 'caixa', null, null, 150)]);
    const a = await pos('ABCD');
    ok(a.qtd === 12 && a.pm === 50 && a.doExtrato && a.doExtrato.data === '2026-11-30', 'ABCD (importado à mão) casa pelo ticker: a quantidade vai a 12 e o preço médio da pessoa (50) não muda');
    const nb = await pos('NEWB'), bd = await pos('BOND1'), din = await p.evaluate(() => ST.posicoes.find((q) => q.tipo === 'caixa' && /avenue/i.test(q.inst)));
    ok(nb && nb.tipo === 'etf-us' && nb.qtd === 4 && nb.pm === 0 && nb.pmAInformar === true && nb.doExtrato && nb.valorEntrada && nb.valorEntrada.valor === 400 && nb.valorEntrada.data === '2026-11-30', 'papel novo (NEWB) entra como ETF dos EUA, com "veio do extrato", preço médio a informar (3.139) e o valor do dia em que entrou (US$ 400 em 30/11)');
    ok(bd && bd.tipo === 'bond-us' && bd.valorManual === 2000, 'o bond entra com o valor atual (US$ 2.000)');
    ok(din && din.nome === 'Dinheiro em USD' && din.ticker === 'USD' && din.qtd === 150, 'o caixa vira "Dinheiro em USD" da Avenue (150)');
    ok(!(await pos('OLDX')), 'o OLDX vendido continua fora (não está no extrato novo)');
    ok(await p.evaluate(() => ST.posicoes.find((q) => q.id === 'b1').qtd === 100), 'a posição de outra corretora não é tocada');

    console.log('3) papel sumido: "vendeu?" (nunca apaga sozinho)');
    const t = await p.evaluate(() => { abrirInbox(); return document.getElementById('genModal').textContent.replace(/\s+/g, ' '); });
    ok(/WXYZ \(Avenue\): não está no extrato de 30\/11: vendeu\?/.test(t) && /Sim, tirar/.test(t) && /Manter/.test(t) && !/QRST \(Avenue\): não está/.test(t), '📥: "WXYZ (Avenue): não está no extrato de 30/11: vendeu?" [Sim, tirar] [Manter]');
    ok(!!(await pos('WXYZ')), 'enquanto ninguém responde, o WXYZ continua na Carteira');
    await p.click('#genModal .ib-sumido [data-acao="ib-manter"]'); await p.waitForTimeout(100);
    ok(!!(await pos('WXYZ')) && await p.evaluate(() => InvestBanco.sumidos().length === 0), '"Manter": continua e não pergunta de novo para este extrato');
    await p.evaluate(() => { ['GONE', 'GONF'].forEach((t, i) => ST.posicoes.push({ id: 'a4' + i, ticker: t, nome: t + ' Exemplo', tipo: 'acao-us', inst: 'Avenue', qtd: 1, pm: 5, moeda: 'USD', atualizadoEm: '2026-11-20' })); abrirInbox(); });
    ok(await p.evaluate(() => document.querySelectorAll('#genModal .ib-sumido').length === 2), 'dois papéis sumidos: duas perguntas');
    await p.click('#genModal .ib-sumido [data-acao="ib-tirar"][data-id="a40"]'); await p.waitForTimeout(100);
    ok(!(await pos('GONE')) && !!(await pos('GONF')) && await p.evaluate(() => InvestBanco.sumidos().length === 1 && InvestBanco.sumidos()[0].p.ticker === 'GONF'), '"Sim, tirar": o GONE sai da Carteira e a pergunta do GONF continua');

    console.log('4) editado depois do extrato; o selo na Carteira');
    await p.evaluate(() => { const q = ST.posicoes.find((x) => x.ticker === 'QRST'); q.qtd = 9; q.atualizadoEm = '2026-12-02'; });
    await receber([IT('QRST', '2026-11-30', 'acao', 7, 31, 217)]);
    ok((await pos('QRST')).qtd === 9, 'a posição editada à mão depois do extrato (02/12) não volta para o número do extrato de 30/11');
    const selo = await p.evaluate(() => { abrirApp('investify'); irPara('carteira'); render(); return [...document.querySelectorAll('[data-acoes-ativo]')].filter((el) => /NEWB/.test(el.textContent)).map((el) => el.textContent).join(' '); });
    ok(/veio do extrato/.test(selo), 'na Carteira, o NEWB mostra "📄 veio do extrato"');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= 391), 'celular (390): nada rola para o lado');
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
    await ctx.close();
  } finally { await b.close(); srv.close(); }
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
