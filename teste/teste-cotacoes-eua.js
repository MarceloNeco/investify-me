/* =====================================================================
   teste/teste-cotacoes-eua.js — 3.140: cotações dos EUA pelo servidor (modulos/cotacoes-eua.js, nuvem.js 1.18.0). Dados FICTÍCIOS;
   o servidor é simulado (nenhuma chamada de verdade). Confere: só os tickers saem do app (sem quantidade, preço médio, corretora;
   bond não vai); com o login (Bearer) e a chave pública; preço, fonte, data/hora e tipo na tela; "pendente" pergunta antes de trocar
   (confirmar); "sem cotação" sem valor inventado; "Atualizar agora" (forcar, restam N; 429 = limite do dia); 403 "sem-acesso" some
   sem alarde; sem login não chama nada; quantidade, preço médio e corretora nunca mudam.
   Uso: node teste/teste-cotacoes-eua.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const P = (id, t, tipo, qtd, pm) => ({ id, ticker: t, nome: t + ' Exemplo', tipo, inst: 'Corretora Exemplo', qtd, pm, moeda: 'USD' });
const LOCAL = { v: 1, config: { fitaLigada: false, fitaMercado: false }, gastos: [], posicoes: [P('a', 'EXAA', 'acao-us', 10, 50), P('b', 'EXBB', 'etf-us', 4, 100), P('c', 'EXCC', 'acao-us', 2, 10), P('d', 'EXDD', 'acao-us', 1, 20),
  { id: 'bd', ticker: '5EXMP12', nome: 'EXBZ 6.75 28/01/28', tipo: 'bond-us', inst: 'Corretora Exemplo', qtd: 1, pm: 1000, valorManual: 1000, moeda: 'USD' }] };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const JWT = b64({ alg: 'none' }) + '.' + b64({ sub: 'u-exemplo', email: 'pessoa@exemplo.com', exp: 4102444800 }) + '.x';
const RESP = (forcar) => ({ cotacoes: [
  { ticker: 'EXAA', preco: 55.5, fonte: 'Fonte Exemplo', preco_em: '2026-11-26T21:00:00Z', tipo: 'fechamento', status: 'ok', divergente: false },
  { ticker: 'EXBB', preco: 100, fonte: 'Fonte Exemplo', preco_em: '2026-11-26T21:00:00Z', tipo: 'fechamento', status: 'pendente', candidato: { preco: 145, variacao: 45 } },
  { ticker: 'EXCC', status: 'sem-cotacao' },
  { ticker: 'EXDD', status: 'falhou', erro: 'tempo esgotado' }], resumo: { ok: 1, pendente: 1, manual_restam: forcar ? 2 : 3 } });

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  const pedidos = []; let modo = 'ok';
  const abrirCom = async (sessao) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.route('**/*', async (r) => {
      const u = r.request().url();
      if (u.startsWith(BASE)) return r.continue();
      if (/\/functions\/v1\/cotacoes$/.test(u)) {
        const corpo = JSON.parse(r.request().postData() || '{}'), h = r.request().headers(); pedidos.push({ corpo, auth: h.authorization, apikey: !!h.apikey });
        if (modo === '403') return r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ erro: 'sem-acesso' }) });
        if (modo === '429' && corpo.forcar) return r.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ erro: 'limite-manual' }) });
        if (corpo.acao === 'confirmar') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
        return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(RESP(corpo.forcar)) });
      }
      return r.abort();
    });
    await ctx.addInitScript(([t, s]) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); if (s) localStorage.setItem('solverone.sessao.v1', s); sessionStorage.setItem('s', '1'); } },
      [JSON.stringify(LOCAL), sessao ? JSON.stringify({ access_token: JWT, refresh_token: 'r-exemplo', expira: Date.now() + 3600000, em: Date.now(), email: 'pessoa@exemplo.com' }) : '']);
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.CotacoesEua && window.MoneyNuvem);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('investify'); irPara('carteira'); });
    return { ctx, p };
  };
  try {
    console.log('1) sem login: nada sai do app');
    let { ctx, p } = await abrirCom(false);
    await p.evaluate(async () => { await Mercado.atualizar(ST.posicoes, ST.config, true); render(); });
    ok(!pedidos.length && await p.evaluate(() => !CotacoesEua.ativo() && !document.querySelector('.ce-card')), 'sem login: nenhuma chamada e nenhum cartão');
    await ctx.close();

    console.log('2) com login: a busca');
    ({ ctx, p } = await abrirCom(true));
    await p.waitForFunction(() => !Mercado.carregando);
    pedidos.length = 0;
    await p.evaluate(async () => { Object.keys(Mercado.precos).filter((k) => k.startsWith('us:')).forEach((k) => delete Mercado.precos[k]); CotacoesEua.estado.porTicker = {}; await Mercado.atualizar(ST.posicoes, ST.config, false); render(); });
    const avisos = await p.evaluate(() => [...document.querySelectorAll('.toast, #toast, [role="status"], [role="alert"]')].map((x) => x.textContent).join(' '));
    const pb = pedidos.find((x) => x.corpo.acao === 'buscar');
    ok(pb && JSON.stringify(pb.corpo) === JSON.stringify({ acao: 'buscar', tickers: ['EXAA', 'EXBB', 'EXCC', 'EXDD'], forcar: false }), 'só os tickers saem do app (sem quantidade, preço médio nem corretora; o bond não vai): ' + JSON.stringify(pb && pb.corpo));
    ok(pb && pb.auth === 'Bearer ' + JWT && pb.apikey, 'com o login (Authorization: Bearer) e a chave pública (apikey)');
    const c = await p.evaluate(() => ({ a: calc(ST.posicoes.find((x) => x.ticker === 'EXAA')), cc: Mercado.precos['us:EXCC'] || null, b: (Mercado.precos['us:EXBB'] || {}).p }));
    ok(c.a.precoAtual === 55.5 && c.a.valorAtivo === 555 && c.a.fonte === 'Fonte Exemplo', 'EXAA: US$ 55,50 do servidor, 10 × 55,50 = US$ 555');
    ok(c.cc === null && c.b == null && !/EXCC/.test(avisos), '"sem cotação" (EXCC) fica sem valor, e o pendente (EXBB) não troca sozinho');
    const card = await p.evaluate(() => (document.querySelector('.ce-card') || {}).textContent || '');
    ok(/Cotações dos EUA/.test(card) && /EXAA\s*US\$\s?55,50\s*Fonte Exemplo · 26\/Nov\/2026 \d\d:\d\d · fechamento/.test(card.replace(/\s+/g, ' ')), 'na Carteira: preço, fonte, data/hora e tipo ("fechamento")');
    ok(/sem cotação \(o valor não é inventado\)/.test(card) && /Mudou \+45% para US\$\s?145,00: trocar\?/.test(card) && /restam 3 hoje/.test(card) && /Bonds ficam com o valor informado/.test(card), '"sem cotação", "Mudou +45% para US$ 145,00: trocar?", "restam 3 hoje" e os bonds manuais');

    console.log('3) pendente: trocar');
    pedidos.length = 0;
    await p.click('.ce-card [data-acao="ce-trocar"][data-t="EXBB"]'); await p.waitForTimeout(200);
    const pc = pedidos.find((x) => x.corpo.acao === 'confirmar');
    ok(pc && JSON.stringify(pc.corpo) === JSON.stringify({ acao: 'confirmar', ticker: 'EXBB', aceitar: true }) && await p.evaluate(() => Mercado.precos['us:EXBB'].p === 145), '"Trocar": confirma no servidor e passa a valer US$ 145');

    console.log('4) Atualizar agora e o limite');
    pedidos.length = 0;
    await p.click('.ce-card [data-acao="ce-atualizar"]'); await p.waitForTimeout(250);
    ok(pedidos.some((x) => x.corpo.acao === 'buscar' && x.corpo.forcar === true) && /restam 2 hoje/.test(await p.textContent('.ce-card')), '"Atualizar agora" busca na hora (forcar) e mostra "restam 2 hoje"');
    modo = '429'; await p.click('.ce-card [data-acao="ce-atualizar"]'); await p.waitForTimeout(250);
    ok(/Já foram as 3 atualizações de hoje/.test(await p.evaluate(() => [...document.querySelectorAll('.toast, #toast, [role="status"], [role="alert"]')].map((x) => x.textContent).join(' '))), '429: "Já foram as 3 atualizações de hoje. Amanhã tem de novo."');
    const pos = await p.evaluate(() => ST.posicoes.map((x) => [x.ticker, x.qtd, x.pm, x.inst].join('|')).join(','));
    ok(pos === 'EXAA|10|50|Corretora Exemplo,EXBB|4|100|Corretora Exemplo,EXCC|2|10|Corretora Exemplo,EXDD|1|20|Corretora Exemplo,5EXMP12|1|1000|Corretora Exemplo', 'quantidade, preço médio e corretora nunca mudam');

    console.log('5) sem acesso: some sem alarde');
    modo = '403';
    await p.evaluate(async () => { await CotacoesEua.buscar(['EXAA']); render(); });
    ok(await p.evaluate(() => !CotacoesEua.ativo() && !document.querySelector('.ce-card') && localStorage.getItem('moneytrio.cotEua.semAcesso') === '1'), '403 "sem-acesso": o cartão some e não chama mais');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= 391), 'celular (390): nada rola para o lado');
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
    await ctx.close();
  } finally { await b.close(); srv.close(); }
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
