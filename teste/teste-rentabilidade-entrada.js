/* =====================================================================
   teste/teste-rentabilidade-entrada.js — 3.139: "Rentabilidade de verdade" sem número absurdo e o preço médio a informar.
   Dados FICTÍCIOS. Confere: posição que entrou SEM compra (banco, extrato, importação) ganha saldo inicial na data em que entrou, com o
   valor daquele dia, e não vira lucro · menos de 1 ano não anualiza ("em N dias") · retorno acima de +50% em menos de 60 dias =
   "conferindo os dados", sem o número · o ⓘ do Capital aportado e do Lucro lista os saldos iniciais · posição do extrato com
   "preço médio a informar" (lucro zero, nunca o preço do dia) · importação com preço médio preenche o dessas.
   Uso: node teste/teste-rentabilidade-entrada.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
/* A: comprada (com movimento); B: veio do banco (sem movimento); C: veio do extrato (sem preço médio); D: importada sem data */
const BASE_ST = (extra) => Object.assign({ v: 1, config: { semeouMov: true, fitaLigada: false }, gastos: [], moedaBase: 'BRL',
  movimentos: [{ id: 'm1', data: '2026-11-11', tipo: 'compra', ativoId: 'a', ticker: 'EXAA3', qtd: 100, preco: 100, valor: 10000, moeda: 'BRL', origem: 'manual', criadoEm: '2026-11-11T12:00:00Z' }],
  posicoes: [{ id: 'a', ticker: 'EXAA3', nome: 'Exemplo A', tipo: 'acao-br', inst: 'Corretora Exemplo', qtd: 100, pm: 100, moeda: 'BRL', data: '2026-11-11' },
    { id: 'bk_b', ticker: 'CDB EXEMPLO', nome: 'CDB Exemplo', tipo: 'renda-fixa', inst: 'Banco Exemplo', qtd: 1, pm: 400000, moeda: 'BRL', data: '2026-11-20', doBanco: { chave: 'b', data: '2026-11-26', banco: 'Banco Exemplo' }, valorManual: 400000, valorManualData: '2026-11-26T12:00:00', historicoManual: [['2026-11-20', 400000], ['2026-11-26', 400000]] },
    { id: 'bk_c', ticker: 'EXCC', nome: 'EXCC Exemplo', tipo: 'acao-us', inst: 'Avenue', qtd: 10, pm: 0, pmAInformar: true, moeda: 'USD', data: '2026-11-25', doExtrato: { data: '2026-11-25', banco: 'Avenue' }, valorEntrada: { data: '2026-11-25', valor: 1000, moeda: 'USD' } },
    { id: 'pzzzzzzzz1', ticker: 'EXDD3', nome: 'Exemplo D', tipo: 'acao-br', inst: 'Corretora Exemplo', qtd: 50, pm: 20, moeda: 'BRL', atualizadoEm: '2026-11-26' }] }, extra || {});

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  const abrirCom = async (st) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(st));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.clock.setFixedTime(new Date('2026-11-27T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Rent !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); Mercado.cambio = Object.assign({}, Mercado.cambio, { USD: { p: 5, var: 0 } }); abrirApp('investify'); irPara('painel'); render(); });
    return { ctx, p };
  };
  try {
    console.log('1) posição sem compra vira saldo inicial (não lucro)');
    let { ctx, p } = await abrirCom(BASE_ST());
    const mv = await p.evaluate(() => Mov.todos().filter((m) => m.origem === 'saldo-inicial').map((m) => m.ticker + '|' + m.data + '|' + Math.round(m.valor) + '|' + m.moeda + '|' + !!m.semCompra).sort());
    ok(mv.includes('CDB EXEMPLO|2026-11-20|400000|BRL|true'), 'veio do banco: saldo inicial em 20/11 com R$ 400.000 (o valor daquele dia)');
    ok(mv.includes('EXCC|2026-11-25|1000|USD|true'), 'veio do extrato: saldo inicial em 25/11 com US$ 1.000');
    ok(mv.includes('EXDD3|2026-11-26|1000|BRL|true'), 'importada sem data: saldo inicial no dia em que entrou (26/11), com o valor do dia (R$ 1.000)');
    const r = await p.evaluate(() => { const r = Rent.resumo(); return { lucro: Math.round(r.lucro), liq: Math.round(r.liquido) }; });
    ok(Math.abs(r.lucro) < 5 && r.liq > 400000, 'o lucro fica perto de zero (antes: R$ 400 mil de "lucro"); capital aportado inclui os saldos iniciais (' + JSON.stringify(r) + ')');
    const k = await p.evaluate(() => [...document.querySelectorAll('.kpi')].map((x) => x.textContent.replace(/\s+/g, ' ')).join(' || '));
    ok(/Retorno do seu bolso[^|]*em 16 dias/.test(k) && !/Retorno do seu bolso[^|]*a\.a\./.test(k) && /sem anualizar/.test(k), 'menos de 1 ano: "… em 16 dias", sem "a.a." (' + (k.match(/Retorno do seu bolso[^|]*/) || [''])[0] + ')');
    await p.evaluate(() => abrirInfo('aporte'));
    const inf = await p.evaluate(() => document.getElementById('infoBody').textContent.replace(/\s+/g, ' '));
    ok(/O que entrou como saldo inicial \(3\)/.test(inf) && /CDB EXEMPLO · 20\/Nov\/2026/.test(inf) && /EXCC · 25\/Nov\/2026/.test(inf) && /entrou sem compra/.test(inf), 'ⓘ do Capital aportado: "O que entrou como saldo inicial (3)", com o papel, a data e "entrou sem compra"');
    await p.evaluate(() => { fechar('infoModal'); abrirInfo('lucro-prejuizo'); });
    ok(/O que entrou como saldo inicial/.test(await p.evaluate(() => document.getElementById('infoBody').textContent)), 'ⓘ do Lucro: a mesma lista');
    ok(await p.evaluate(() => { const n = Mov.todos().length; Mov.garantirSaldosIniciais(totais()); return Mov.todos().length === n; }), 'não duplica: rodar de novo não cria outro saldo inicial');

    console.log('2) o preço médio a informar');
    const c = await p.evaluate(() => { const x = calc(ST.posicoes.find((q) => q.id === 'bk_c')); return { pl: x.pl, v: x.valorBase, pm: x.pmAInformar }; });
    ok(c.pm && c.pl === 0 && c.v === 5000, 'EXCC sem cotação nem preço médio: vale o do extrato (US$ 1.000 = R$ 5.000) e o lucro dela é zero, nunca inventado');
    const cel = await p.evaluate(() => { irPara('carteira'); render(); return [...document.querySelectorAll('[data-acoes-ativo]')].filter((e) => /EXCC/.test(e.textContent)).map((e) => e.textContent.replace(/\s+/g, ' ')).join(' '); });
    ok(/a informar/.test(cel), 'na Carteira, o preço médio do EXCC aparece "a informar"');
    const imp = await p.evaluate(() => { const o = ImportarPosicoes.preparar({ tipo: 'moneytrio-posicoes', versao: 1, itens: [{ ticker: 'EXCC', tipo: 'acao-us', inst: 'Avenue', qtd: 10, pm: 80, moeda: 'USD', data: '2025-03-10' }] });
      const r0 = o.lista[0], n = ImportarPosicoes.importar(o.lista), q = ST.posicoes.filter((x) => x.ticker === 'EXCC');
      return { marcado: r0.marcado, pre: !!r0.preenchePm, n: q.length, pm: q[0].pm, inf: !!q[0].pmAInformar, data: q[0].data, pre2: n.preenchidos }; });
    ok(imp.marcado && imp.pre && imp.n === 1 && imp.pm === 80 && !imp.inf && imp.pre2 === 1, 'importar um arquivo com o preço médio: vem marcado ("preenche o preço médio"), preenche o EXCC (US$ 80) sem duplicar ' + JSON.stringify(imp));
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
    await ctx.close();

    console.log('3) a trava: +50% em menos de 60 dias = "conferindo os dados"');
    ({ ctx, p } = await abrirCom(BASE_ST({ posicoes: [{ id: 'a', ticker: 'EXAA3', nome: 'Exemplo A', tipo: 'acao-br', inst: 'Corretora Exemplo', qtd: 100, pm: 400, moeda: 'BRL', data: '2026-11-11' }] })));
    const k2 = await p.evaluate(() => [...document.querySelectorAll('.kpi')].map((x) => x.textContent.replace(/\s+/g, ' ')).join(' || '));
    const box = await p.evaluate(() => { const b = document.querySelector('.rent-conferindo'); return b ? b.textContent.replace(/\s+/g, ' ') : ''; });
    ok(/Retorno do seu bolso\s*[iⓘ]?\s*conferindo os dados/.test(k2) && /Lucro financeiro\s*[iⓘ]?\s*conferindo os dados/.test(k2) && !/Retorno do seu bolso[^|]*%/.test(k2), 'R$ 10.000 que viram R$ 40.000 em 16 dias: "conferindo os dados" no lugar do número');
    ok(/Conferindo os dados/.test(box) && /quase sempre é dado faltando/.test(box), 'e o porquê: "… quase sempre é dado faltando, não ganho de verdade"');
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
    await ctx.close();
  } finally { await b.close(); srv.close(); }
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
