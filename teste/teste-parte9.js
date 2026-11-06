/* =====================================================================
   teste/teste-parte9.js — 3.45: patrimônio sem liquidez + "Importar posições (JSON)" (Chromium headless, Playwright)
   Confere: importar com prévia (sem liquidez, posição líquida, "já existe" e linha com problema desmarcados);
   o Painel soma o sem liquidez ao "Patrimônio total" mas mostra separado do líquido; etiqueta "não dá para
   sacar"; alocação/totais da carteira não mudam; cadastrar, editar e excluir à mão; arquivo errado avisa.
   Uso (na pasta raiz): node teste/teste-parte9.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, gastos: [], recorrentes: [], config: {}, posicoes: [{ id: 'p1', ticker: 'CDB BANCO X', nome: 'CDB', tipo: 'fundo', inst: 'Banco X', qtd: 1, pm: 10000, valorManual: 10500, moeda: 'BRL' }] };
const ARQ = { tipo: 'moneytrio-posicoes', versao: 1, itens: [
  { semLiquidez: true, nome: 'FGTS Empresa A', tipo: 'fgts', inst: 'Empresa A', valor: 120000.5, data: '2026-11-01' },
  { semLiquidez: true, nome: 'FGTS Empresa B', tipo: 'fgts', inst: 'Empresa B', valor: 30000.25, data: '2026-11-01' },
  { ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'acao-br', inst: 'XP', qtd: 100, pm: 30.5 },
  { ticker: 'CDB BANCO X', tipo: 'fundo', inst: 'Banco X', pm: 10000 },
  { ticker: 'XYZ', tipo: 'nao-existe', qtd: 1, pm: 1 } ] };
(async () => {
  const srv = http.createServer((q, s) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'application/octet-stream' }); fs.createReadStream(p).pipe(s); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-'));
  const arq = path.join(tmp, 'posicoes.json'); fs.writeFileSync(arq, JSON.stringify(ARQ));
  const outro = path.join(tmp, 'outro.json'); fs.writeFileSync(outro, JSON.stringify({ tipo: 'moneytrio-compromissos', itens: [] }));
  const b = await chromium.launch();
  try {
    for (const vp of [{ width: 390, height: 800 }, { width: 1366, height: 768 }]) {
      console.log('tela ' + vp.width + 'x' + vp.height);
      const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('semeado')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('semeado', '1'); } }, JSON.stringify(LOCAL));
      const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
      const semToasts = () => p.evaluate(() => document.querySelectorAll('#toasts .toast').forEach((e) => e.parentNode.removeChild(e)));
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.posicoes || []).length === 1 && window.ImportarPosicoes);
      await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('investify'); irPara('carteira'); });
      await p.waitForFunction(() => window.scrollY === 0);
      const valor0 = await p.evaluate(() => totais().valor);
      ok(await p.isVisible('[data-acao="posimp-escolher"]') && await p.isVisible('[data-acao="iliq-novo"]'), 'Carteira: "Importar posições (JSON)" e "Patrimônio sem liquidez"');
      const abrirArq = async (a) => { await semToasts(); const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-acao="posimp-escolher"]')]); await fc.setFiles(a); await p.waitForSelector('#genModal:not(.hidden)'); };
      await abrirArq(outro);
      ok(/não é uma lista de posições/.test(await p.textContent('#genBody')), 'arquivo de outro tipo: avisa e não importa');
      await p.click('#genBody [data-close="genModal"]');
      await abrirArq(arq); await p.waitForSelector('.pi-tbl');
      const ls = await p.$$eval('.pi-tbl tbody tr', (trs) => trs.map((tr) => ({ ck: tr.querySelector('.pi-ck').checked, dis: tr.querySelector('.pi-ck').disabled, t: tr.textContent })));
      ok(ls.length === 5 && ls[0].ck && ls[1].ck && ls[2].ck, 'prévia: os 2 FGTS e a PETR4 vêm marcados');
      ok(/🔒 FGTS/.test(ls[0].t) && /120\.000,50/.test(ls[0].t), 'FGTS aparece com 🔒 e o valor');
      ok(!ls[3].ck && /já existe: CDB BANCO X/.test(ls[3].t), 'o que já existe vem desmarcado');
      ok(!ls[4].ck && ls[4].dis && /tipo desconhecido/.test(ls[4].t), 'linha com problema vem desmarcada e travada');
      ok(/Importar 3 marcadas/.test(await p.textContent('#piOk')), 'botão "Importar 3 marcadas"');
      await p.click('#piOk');
      const st = await p.evaluate(() => ({ pos: Store.estado.posicoes.map((x) => x.ticker), il: Store.estado.patrimonio_iliquido.map((x) => x.nome + '=' + x.valor) }));
      ok(st.pos.join() === 'CDB BANCO X,PETR4' && st.il.join() === 'FGTS Empresa A=120000.5,FGTS Empresa B=30000.25', 'importou 1 posição e 2 sem liquidez; nada foi trocado');
      ok(/não dá para sacar/.test(await p.textContent('#view-carteira .il-card')), 'Carteira mostra o bloco "🔒 sem liquidez — não dá para sacar"');
      const valor1 = await p.evaluate(() => totais().valor);
      ok(Math.abs(valor1 - valor0 - 100 * 30.5) < 0.01, 'os totais da carteira (alocação, rentabilidade) não incluem o FGTS');
      await p.evaluate(() => irPara('painel'));
      const kp = await p.textContent('#view-painel');
      ok(/Patrimônio total/.test(kp) && /🔒 sem liquidez: R\$\s?150\.000,75/.test(kp) && /Líquido: R\$/.test(kp), 'Painel: total com o sem liquidez, mostrado separado do líquido');
      ok(await p.evaluate(() => { const v = PatrimonioIliquido.total(); return v === 150000.75; }), 'total sem liquidez R$ 150.000,75');
      /* à mão: cadastrar, editar, excluir */
      await p.evaluate(() => irPara('carteira')); await p.waitForFunction(() => window.scrollY === 0);
      await semToasts(); await p.click('#view-carteira .il-card [data-acao="iliq-novo"]'); await p.waitForSelector('#ilForm');
      await p.fill('#ilNome', 'Previdência da empresa'); await p.selectOption('#ilTipo', 'previdencia'); await p.fill('#ilValor', '1000');
      await semToasts(); await p.click('[data-acao="iliq-salvar"]');
      ok(await p.evaluate(() => PatrimonioIliquido.total()) === 151000.75, 'cadastrar à mão soma ao total');
      await semToasts(); await p.click('#view-carteira tr[data-acao="iliq-editar"]:has-text("Previdência da empresa")'); await p.waitForSelector('#ilForm');
      await semToasts(); await p.click('[data-acao="iliq-excluir"]');
      ok(await p.evaluate(() => Store.estado.patrimonio_iliquido.length) === 2, 'excluir tira o item');
      await p.reload(); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.patrimonio_iliquido || []).length === 2);
      ok(true, 'depois de recarregar, continua');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem para o lado');
      ok(erros.length === 0, 'sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
