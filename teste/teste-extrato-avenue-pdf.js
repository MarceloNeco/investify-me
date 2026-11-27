/* =====================================================================
   teste/teste-extrato-avenue-pdf.js — 3.137: o leitor do texto do extrato mensal da Avenue (modulos/posicoes-texto.js 1.1.0), no
   formato em que o texto sai do PDF (com as colunas espaçadas e com os espaços juntados). Modelo FICTÍCIO (papéis "Exemplo").
   Confere: ETF, ação, nome que continua na linha de baixo ("ADR"), bond com o título (emissor, cupom, vencimento), o caixa ("Dinheiro
   em USD"), os totais ignorados, a data do fim do período, números americanos, nenhum preço médio inventado sem aviso; e o caminho do
   Compartilhar (PDF → "O que é isto?" → posições → a mesma prévia, com "Extrato de 31/10/2026").
   Uso: node teste/teste-extrato-avenue-pdf.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const EXTRATO = [
  'AVENUE ACCOUNT NUMBER: 00000000',
  'October 01, 2026 - October 31, 2026',
  "                                                 SYMBOL/    ACCOUNT                                MARKET        LAST PERIOD'S                  ANNUAL      % OF TOTAL",
  'DESCRIPTION                                      CUSIP      TYPE          QUANTITY      PRICE        VALUE      MARKET VALUE      % CHANGE      INCOME      PORTFOLIO',
  'EQUITIES / OPTIONS',
  'Exemplo ETF Fund                                 EXEF            C         106.0001     50.71   $ 5,375.27          $ 5,371.03        0.08%    $ 199       10.874%',
  'Exemplo Corp. - Class A                          EXCO            C                13     4.01         52.13              69.42        -24.91           1        0.105%',
  'Exemplo Semicondutores -                         EXSE            C                 5  406.13      2,030.65            2,100.00        -3.30                    4.100%',
  'ADR',
  'Total Equities                                                                                    $ 7,458.05                                                82.206%',
  'FIXED INCOME',
  'Exemplo Bond SA                                  5ABCD12           C                 5    608.70     $ 3,043.50        $ 4,008.50     -24.07%                  6.157%',
  'EXBZ 6.75 28/01/28',
  'Total Fixed Income                                                                                  $ 3,043.50                                               16.726%',
  'Total Cash (Net Portfolio Balance)                                                                    $ 528.21                                                1.069%',
  'TOTAL PRICED PORTFOLIO                                                                            $ 11,029.76'
].join('\n');
const JUNTO = EXTRATO.replace(/[ \t]+/g, ' ');   /* como o leitor de PDF do app devolve: os espaços juntados */

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript(() => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', JSON.stringify({ v: 1, config: { fitaLigada: false }, gastos: [], posicoes: [{ id: 'x1', ticker: 'EXCO', nome: 'Exemplo Corp', tipo: 'acao-us', inst: 'Avenue', qtd: 13, pm: 3, moeda: 'USD' }] })); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } });
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.PosicoesTexto && window.Partilha);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); });

    for (const [rot, txt] of [['colunas espaçadas', EXTRATO], ['espaços juntados', JUNTO]]) {
      console.log('— ' + rot);
      const r = await p.evaluate((t) => PosicoesTexto.ler(t), txt);
      const by = (t) => r.itens.find((x) => x.ticker === t) || {};
      ok(r.inst === 'Avenue' && r.data === '2026-10-31' && r.itens.length === 5, 'Avenue, data 31/10/2026 (fim do período), 5 itens: 3 papéis, 1 bond e o caixa (' + r.itens.map((x) => x.ticker).join(',') + ')');
      ok(by('EXEF').tipo === 'etf-us' && by('EXEF').qtd === 106.0001 && by('EXEF').pm === 50.71 && by('EXEF').nome === 'Exemplo ETF Fund', 'EXEF: ETF, 106.0001 cotas a US$ 50,71 (números americanos)');
      ok(by('EXCO').tipo === 'acao-us' && by('EXCO').qtd === 13 && by('EXCO').nome === 'Exemplo Corp. - Class A', 'EXCO: ação, 13, "Exemplo Corp. - Class A"');
      ok(by('EXSE').qtd === 5 && by('EXSE').pm === 406.13 && by('EXSE').nome === 'Exemplo Semicondutores ADR', 'o "ADR" da linha de baixo continua o nome: "' + by('EXSE').nome + '"');
      const bd = by('5ABCD12');
      ok(bd.tipo === 'bond-us' && bd.valorAtual === 3043.5 && bd.pm === 3043.5 && bd.vencimento === '2028-01-28' && /^EXBZ 6\.75 28\/01\/28/.test(bd.nome), 'o bond (CUSIP 5ABCD12): valor de mercado US$ 3.043,50, título "EXBZ 6.75 28/01/28", vencimento 28/01/2028');
      ok(by('USD').tipo === 'caixa' && by('USD').qtd === 528.21 && by('USD').nome === 'Dinheiro em USD', 'o caixa: "Dinheiro em USD" US$ 528,21');
      ok(r.itens.filter((x) => x.tipo !== 'caixa').every((x) => /Preço médio não veio no extrato/.test(x.notas)), 'sem preço médio no extrato: cada papel leva o aviso na observação');
    }

    console.log('— pelo Compartilhar (o PDF, com o texto que o leitor de PDF devolve)');
    await p.evaluate(async (t) => { PdfTexto.extrair = async () => t; await Partilha.perguntar([new File(['%PDF-1.4'], 'Stmt_20261031.pdf', { type: 'application/pdf' })]); }, JUNTO);
    await p.click('#genBody [data-acao="pa-dest"][data-v="posicoes"]');
    await p.waitForFunction(() => document.getElementById('ptInst'), null, { timeout: 15000, polling: 250 });
    ok(await p.evaluate(() => document.getElementById('ptInst').value === 'Avenue' && /Achei 5 posição/.test(document.getElementById('genBody').textContent) && /Extrato de 31\/10\/2026: se você vendeu algum papel depois, desmarque\./.test(document.getElementById('genBody').textContent)), '"Achei 5 posições", Avenue, e "Extrato de 31/10/2026: se você vendeu algum papel depois, desmarque."');
    await p.click('[data-acao="pt-previa"]'); await p.waitForTimeout(150);
    const pr = await p.evaluate(() => [...document.querySelectorAll('#genBody .pi-tbl tbody tr')].map((tr) => ({ t: tr.textContent, ck: tr.querySelector('.pi-ck') && tr.querySelector('.pi-ck').checked })));
    ok(pr.length === 5 && pr.find((x) => /EXCO/.test(x.t)).ck === false && pr.filter((x) => x.ck).length === 4, 'a mesma prévia: o EXCO que já existe vem desmarcado; os outros 4 marcados');
    await p.click('[data-acao="posimp-ok"]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => ST.posicoes.find((x) => x.ticker === 'EXCO').pm === 3 && ST.posicoes.some((x) => x.ticker === 'EXEF' && x.inst === 'Avenue') && ST.posicoes.some((x) => x.tipo === 'caixa' && x.qtd === 528.21)), 'importados; o preço médio do EXCO da pessoa (3) não mudou');
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
    await ctx.close();
  } finally { await b.close(); srv.close(); }
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
