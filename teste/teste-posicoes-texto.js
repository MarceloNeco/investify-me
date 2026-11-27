/* =====================================================================
   teste/teste-posicoes-texto.js — 3.134: "Importar posições" sem arquivo (modulos/posicoes-texto.js). Dados FICTÍCIOS.
   Confere: a tabela com | (US$ pela Avenue: ação e ETF dos EUA), a tabela com tab e números brasileiros (ação e FII), o bond (valor
   aplicado e valor atual), a previdência no padrão da tela (pm = valorAtual = saldo bruto, o resto na observação), o texto lixo (nada
   e o aviso com o texto lido); a instituição perguntada uma vez com o palpite; a MESMA prévia do JSON (o que já existe vem
   desmarcado, nada duplica); a foto/print pelo OCR do aparelho (simulado) caindo no mesmo leitor.
   Uso: node teste/teste-posicoes-texto.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const TAB_US = 'Minha carteira na Avenue (US$)\nTicker | Nome | Qtd | Preço médio | Preço atual | Valor atual\n|---|---|---|---|---|---|\nABCD | Empresa Exemplo | 10 | 50.00 | 55.00 | 550.00\nVOO | ETF Exemplo | 2 | 400.00 | 410.00 | 820.00\n912828AB1 | Treasury Note Exemplo 2030 | 2 | 980.00 | 1000.00 | 2000.00';
const TAB_BR = 'Ativo\tQuantidade\tPM\tValor atual\nEXMP3\t1.000\t12,50\t13.000,00\nFUND11\t50\t98,40\t5.100,00';
const PREV = 'BTG Pactual\nPlano 1234\nSaldo bruto R$ 12.345,67\nSaldo líquido estimado R$ 11.000,00\nModalidade PGBL\nRegime tributário Regressivo\n\nPlano 5678\nSaldo bruto R$ 2.000,00\nModalidade VGBL\nRegime tributário Progressivo';
const LIXO = 'Olá! Segue o resumo da semana. Nenhum número útil aqui, só texto qualquer.';
const LOCAL = { v: 1, config: { fitaLigada: false }, gastos: [], posicoes: [{ id: 'j1', ticker: 'ABCD', nome: 'Empresa Exemplo', tipo: 'acao-us', inst: 'Avenue', qtd: 5, pm: 40, moeda: 'USD' }] };

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
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.PosicoesTexto && window.ImportarPosicoes);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('investify'); irPara('carteira'); render(); });

    console.log('1) o leitor');
    ok(await p.evaluate(() => [PosicoesTexto.num('1.234,56'), PosicoesTexto.num('1234.56'), PosicoesTexto.num('1,234.56'), PosicoesTexto.num('R$ 13.000,00'), PosicoesTexto.num('50.00')].join('|')) === '1234.56|1234.56|1234.56|13000|50', 'números: 1.234,56 · 1234.56 · 1,234.56 · R$ 13.000,00 · 50.00');
    const us = await p.evaluate((t) => PosicoesTexto.ler(t), TAB_US);
    const a = us.itens.find((x) => x.ticker === 'ABCD'), v = us.itens.find((x) => x.ticker === 'VOO'), bd = us.itens.find((x) => /^912828/.test(x.ticker));
    ok(us.inst === 'Avenue' && a && a.tipo === 'acao-us' && a.moeda === 'USD' && a.qtd === 10 && a.pm === 50, 'tabela com | (Avenue → US$): ABCD ação dos EUA, 10 × US$ 50 (a linha |---| do markdown é ignorada)');
    ok(v && v.tipo === 'etf-us' && v.qtd === 2 && v.pm === 400, 'VOO vira ETF dos EUA');
    ok(bd && bd.tipo === 'bond-us' && bd.pm === 1960 && bd.valorAtual === 2000, 'o bond: valor aplicado US$ 1.960 (2 × 980) e valor atual US$ 2.000');
    const br = await p.evaluate((t) => PosicoesTexto.ler(t), TAB_BR);
    const e3 = br.itens.find((x) => x.ticker === 'EXMP3'), f11 = br.itens.find((x) => x.ticker === 'FUND11');
    ok(e3 && e3.tipo === 'acao-br' && e3.moeda === 'BRL' && e3.qtd === 1000 && e3.pm === 12.5 && f11 && f11.tipo === 'fii' && f11.pm === 98.4, 'tabela com tab e números brasileiros: EXMP3 ação (1.000 × R$ 12,50) e FUND11 FII (R$ 98,40)');
    const pv = await p.evaluate((t) => PosicoesTexto.ler(t), PREV);
    const p1 = pv.itens.find((x) => x.ticker === 'PLANO 1234'), p2 = pv.itens.find((x) => x.ticker === 'PLANO 5678');
    ok(pv.inst === 'BTG Pactual' && p1 && p1.tipo === 'previdencia' && p1.pm === 12345.67 && p1.valorAtual === 12345.67 && /Saldo líquido estimado R\$ 11\.000,00 · PGBL · regime regressivo/.test(p1.notas), 'previdência: pm = valor atual = saldo bruto R$ 12.345,67; líquido, PGBL e regime na observação');
    ok(p2 && p2.pm === 2000 && /VGBL · regime progressivo/.test(p2.notas), 'o segundo plano (VGBL, progressivo, sem líquido)');
    ok((await p.evaluate((t) => PosicoesTexto.ler(t).itens.length, LIXO)) === 0, 'texto lixo: nada reconhecido');

    console.log('2) Colar texto → a instituição → a mesma prévia → importar');
    const bts = await p.evaluate(() => [...document.querySelectorAll('.il-acoes button')].map((x) => x.textContent.trim()));
    ok(bts.some((x) => /Colar texto/.test(x)) && bts.some((x) => /Foto ou print/.test(x)) && bts.some((x) => /Importar posições \(JSON\)/.test(x)), 'no topo da Carteira: "📋 Colar texto", "📷 Foto ou print" e o "Importar posições (JSON)" de antes');
    await p.evaluate(() => document.querySelector('[data-acao="pt-colar"]').click());
    await p.fill('#ptTexto', TAB_US);
    await p.click('[data-acao="pt-ler"]'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => document.getElementById('ptInst').value === 'Avenue' && /Achei 3 posição/.test(document.getElementById('genBody').textContent)), 'pergunta a corretora uma vez, já com o palpite "Avenue"');
    await p.click('[data-acao="pt-previa"]'); await p.waitForTimeout(150);
    const pr = await p.evaluate(() => [...document.querySelectorAll('#genBody .pi-tbl tbody tr')].map((tr) => ({ t: tr.textContent, ck: tr.querySelector('.pi-ck').checked })));
    ok(pr.length === 3 && pr.find((x) => /ABCD/.test(x.t)).ck === false && /já existe/.test(pr.find((x) => /ABCD/.test(x.t)).t) && pr.filter((x) => x.ck).length === 2, 'a MESMA prévia do JSON: ABCD já existe e vem desmarcado; os outros 2 marcados');
    const n0 = await p.evaluate(() => ST.posicoes.length);
    await p.click('[data-acao="posimp-ok"]'); await p.waitForTimeout(200);
    ok(await p.evaluate((n) => ST.posicoes.length === n + 2 && ST.posicoes.filter((x) => x.ticker === 'ABCD').length === 1 && ST.posicoes.find((x) => x.ticker === 'VOO').inst === 'Avenue', n0), 'importou 2, sem duplicar o ABCD; a instituição foi junto');

    console.log('3) texto lixo e a foto');
    await p.evaluate(() => document.querySelector('[data-acao="pt-colar"]').click());
    await p.fill('#ptTexto', LIXO); await p.click('[data-acao="pt-ler"]'); await p.waitForTimeout(150);
    const lx = await p.evaluate(() => document.getElementById('genBody').textContent);
    ok(/Não reconheci este formato; cole o texto ou mande a tela por e-mail\./.test(lx) && /Nenhum número útil/.test(lx), 'lixo: "Não reconheci este formato; cole o texto ou mande a tela por e-mail", com o texto lido');
    await p.evaluate(() => fechar('genModal'));
    await p.evaluate((t) => { PrintColar._ocr = async () => t; return PosicoesTexto.daImagens([new File([new Uint8Array([137, 80, 78, 71])], 'tela.png', { type: 'image/png' })]); }, PREV);
    await p.waitForTimeout(200);
    ok(await p.evaluate(() => document.getElementById('ptInst').value === 'BTG Pactual' && /Achei 2 posição/.test(document.getElementById('genBody').textContent)), 'foto ou print: o texto do OCR (simulado) passa pelo mesmo leitor e pergunta a corretora (BTG Pactual)');
    await p.click('[data-acao="pt-previa"]'); await p.waitForTimeout(150);
    await p.click('[data-acao="posimp-ok"]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => { const x = ST.posicoes.find((q) => q.ticker === 'PLANO 1234'); return !!x && x.tipo === 'previdencia' && x.valorManual === 12345.67 && x.inst === 'BTG Pactual'; }), 'a previdência entra na Carteira com o valor atual = saldo bruto');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= 391), 'celular (390): nada rola para o lado');
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
    await ctx.close();
  } finally { await b.close(); srv.close(); }
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
