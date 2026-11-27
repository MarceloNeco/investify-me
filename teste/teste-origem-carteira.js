/* =====================================================================
   teste/teste-origem-carteira.js — 3.139: de onde veio cada número da Carteira e o título do bond. Dados FICTÍCIOS.
   Confere: o selo por origem (Open Finance só para o que o banco manda; o extrato por e-mail não aparece como Open Finance); o bloco
   "Veio do banco" sai do topo e vira "De onde veio cada número", no fim e recolhido, com Open Finance · extrato por e-mail · arquivo
   ou foto · digitado; o total da corretora em dólar sai em US$ (antes saía "R$"); o bond aparece pelo nome, com o código pequeno.
   Uso: node teste/teste-origem-carteira.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, gastos: [], posicoes: [
  { id: 'd1', ticker: 'EXMP3', nome: 'Exemplo Digitado', tipo: 'acao-br', inst: 'Corretora Exemplo', qtd: 10, pm: 10, moeda: 'BRL' },
  /* o formato antigo do robô: a corretora de fora entrou como "do banco", em dólar */
  { id: 'bk_av', ticker: 'CONTA AVENUE', nome: 'Conta Avenue', tipo: 'outro', inst: 'Avenue', qtd: 1, pm: 12345.67, moeda: 'USD', data: '2026-10-31', doBanco: { chave: 'av', data: '2026-10-31', banco: 'Avenue' }, valorManual: 12345.67, valorManualData: '2026-10-31T12:00:00', historicoManual: [['2026-10-31', 12345.67]] },
  { id: 'bd1', ticker: '5ABCD12', nome: 'EXBZ 6.75 28/01/28', tipo: 'bond-us', inst: 'Avenue', qtd: 1, pm: 3043.5, moeda: 'USD', valorManual: 3043.5, doExtrato: { data: '2026-10-31', banco: 'Avenue' } }] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    for (const vw of [1366, 390]) {
      console.log('— ' + vw);
      const ctx = await b.newContext({ viewport: { width: vw, height: 900 }, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
      const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.InvestBanco && window.SaldoBanco);
      await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); Mercado.cambio = Object.assign({}, Mercado.cambio, { USD: { p: 5, var: 0 } });
        SaldoBanco.receberInvest({ tipo: 'investimento', id: 'inv-cdb1-2026-11-25', conta_id: 'cdb1', banco: 'Banco Exemplo', conta: 'CDB Exemplo', classe: 'renda fixa', subtipo: 'CDB', saldo: 1000, data: '2026-11-25', moeda: 'BRL' });
        InvestBanco.sincronizar();
        ImportarPosicoes.importar(ImportarPosicoes.preparar({ tipo: 'moneytrio-posicoes', versao: 1, itens: [{ ticker: 'EXIM3', tipo: 'acao-br', inst: 'Corretora Exemplo', qtd: 5, pm: 20, moeda: 'BRL' }] }).lista);
        abrirApp('investify'); irPara('carteira'); render(); });
      const o = await p.evaluate(() => Object.fromEntries(ST.posicoes.map((x) => [x.ticker, InvestBanco.origemDe(x)])));
      ok(o['CDB EXEMPLO'] === 'openfinance' && o['CONTA AVENUE'] === 'extrato' && o['5ABCD12'] === 'extrato' && o.EXIM3 === 'arquivo' && o.EXMP3 === 'digitado', 'a origem de cada um: Open Finance, extrato por e-mail (a Avenue também, em dólar), arquivo e digitado ' + JSON.stringify(o));
      const sel = await p.evaluate(() => [...document.querySelectorAll('[data-acoes-ativo]')].map((e) => { const s = e.querySelector('.badge.banco'); return (e.textContent.match(/CDB EXEMPLO|CONTA AVENUE/) || [''])[0] + ':' + (s ? s.textContent.trim() + '|' + s.title : ''); }).filter((x) => /^(CDB|CONTA)/.test(x)));
      ok(sel.some((x) => /^CDB EXEMPLO:🏦 Open Finance\|Saldo mandado pelo banco \(Open Finance\)/.test(x)) && sel.some((x) => /^CONTA AVENUE:📄 extrato por e-mail\|Veio do extrato que chega por e-mail/.test(x)) && !sel.some((x) => /^CONTA AVENUE:.*Open Finance/.test(x)), 'o selo: "🏦 Open Finance" só no CDB; a Avenue com "📄 extrato por e-mail" (com a dica certa) ' + JSON.stringify(sel));
      const q = await p.evaluate(() => { const q = document.querySelector('.ib-origens'), v = document.getElementById('view-carteira'); const r = v.getBoundingClientRect(), rq = q ? q.getBoundingClientRect() : null;
        return { t: q ? q.textContent.replace(/\s+/g, ' ') : '', aberto: q ? q.open : null, perto: rq ? (r.bottom - rq.bottom) < 200 : null, velho: /Veio do banco/.test(v.textContent) }; });
      ok(q.t && q.aberto === false && q.perto && !q.velho, '"De onde veio cada número" no fim da Carteira, recolhido; o bloco "Veio do banco" do topo saiu');
      ok(/🏦 Open Finance \(1\)/.test(q.t) && /📄 extrato por e-mail \(2\)/.test(q.t) && /📎 arquivo ou foto \(1\)/.test(q.t) && /✍️ digitado \(1\)/.test(q.t), 'os quatro grupos: Open Finance (1), extrato por e-mail (2), arquivo ou foto (1), digitado (1)');
      ok(/US\$\s?12\.345,67/.test(q.t) && !/R\$\s?12\.345,67/.test(q.t), 'o total da Avenue em dólar sai "US$ 12.345,67" (antes "R$ 12.345,67")');
      const bd = await p.evaluate(() => { const e = [...document.querySelectorAll('[data-acoes-ativo="bd1"]')].find((x) => x.offsetParent); return e ? { tit: (e.querySelector('.t-main, .ac-tk') || {}).textContent, sub: (e.querySelector('.t-sub') || {}).textContent } : null; });
      ok(bd && bd.tit.trim() === 'EXBZ 6.75 28/01/28' && /^5ABCD12/.test(bd.sub.trim()), 'o bond: o nome "EXBZ 6.75 28/01/28" como título e o código 5ABCD12 pequeno, embaixo ' + JSON.stringify(bd));
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'nada rola para o lado');
      ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
