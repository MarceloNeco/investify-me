/* =====================================================================
   teste/teste-renda.js — 3.39 (N24a): regras de renda (Chromium headless, Playwright, modo "só neste aparelho")
   Confere: Renda · Rescisão e Renda · FGTS (separado), inclusive no que vem do robô; transferência do robô
   ligada à renda (conta de passagem: o salário cai no BTG e vai para o Itaú) e ida e volta PJ ↔ PF juntada,
   em cinza, sem mudar total nenhum; correção de transferência; 390 e 1366 sem erro de página.
   Uso (na pasta raiz): node teste/teste-renda.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, posicoes: [], config: {}, recorrentes: [], gastos: [
  { id: 'sal1', data: '2026-10-05', valor: 9000, grupo: 'RENDA', sub: 'Salário', desc: 'Salário outubro', conta: 'BTG', fluxo: 'entrada', origem: 'robo' },
  { id: 'm1', data: '2026-10-07', valor: 300, grupo: 'PESSOAL', sub: 'Mercado', desc: 'mercado', fluxo: 'saida' } ] };
(async () => {
  const srv = http.createServer((q, s) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); fs.createReadStream(p).pipe(s); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch();
  try {
    for (const vp of [{ width: 390, height: 800 }, { width: 1366, height: 768 }]) {
      console.log('tela ' + vp.width + 'x' + vp.height);
      const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('semeado')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); sessionStorage.setItem('semeado', '1'); } }, JSON.stringify(LOCAL));
      const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.gastos || []).length === 2);
      await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); });
      /* Rescisão e FGTS */
      const cv = await p.evaluate(() => { const C = MoneyNuvem._teste.Caixa;
        const base = { data: '2026-10-20', tipo: 'receita', grupo: 'RENDA', categoria: 'Outros', quem: '', forma: 'Pix', banco: 'BTG', ir: false, freq: 'Pontual', origem: 'pluggy' };
        return [C.converter(Object.assign({ id: 'r1', valor: 15000, descricao: 'RESCISAO CONTRATO TRABALHO' }, base)).sub,
                C.converter(Object.assign({ id: 'r2', valor: 22000, descricao: 'SAQUE FGTS' }, base)).sub,
                C.converter(Object.assign({ id: 'r3', valor: 500, descricao: 'PIX recebido' }, base)).sub]; });
      ok(cv[0] === 'Rescisão' && cv[1] === 'FGTS' && cv[2] === 'Outros', 'do robô: rescisão vira Renda · Rescisão e o FGTS fica separado (Renda · FGTS)');
      ok(await p.evaluate(() => { const a = Gasto.arvore().RENDA || []; return a.includes('Rescisão') && a.includes('FGTS'); }), 'Rescisão e FGTS aparecem na lista de categorias da Renda');
      /* conta de passagem */
      const tot0 = await p.evaluate(() => { const l = Gasto.filtrar({ de: '2026-10-01', ate: '2026-10-31' }); return [l.filter((g) => g.fluxo === 'entrada').reduce((s, g) => s + g.valor, 0), l.length]; });
      const r = await p.evaluate(() => {
        const t = (id, data, valor, banco, desc) => Transferencia.receber({ id, data, valor, banco, descricao: desc, tipo: 'transferencia', forma: 'Pix' });
        return [t('t1', '2026-10-06', 9000, 'BTG', 'TED para Itaú'), t('t2', '2026-10-06', 9000, 'Itaú', 'TED recebida BTG'),
                t('p1', '2026-10-10', 5000, 'PJ Inter', 'Pix para PF'), t('p2', '2026-10-10', 5000, 'Itaú', 'Pix recebido PJ'),
                t('p3', '2026-10-12', 5000, 'Itaú', 'Pix para PJ'), t('p4', '2026-10-12', 5000, 'PJ Inter', 'Pix recebido PF'),
                t('t1', '2026-10-06', 9000, 'BTG', 'TED para Itaú')];
      });
      ok(r.slice(0, 6).every((x) => x === 'nova') && r[6] === '', 'transferências guardadas; a mesma de novo não duplica');
      const tot1 = await p.evaluate(() => { const l = Gasto.filtrar({ de: '2026-10-01', ate: '2026-10-31' }); return [l.filter((g) => g.fluxo === 'entrada').reduce((s, g) => s + g.valor, 0), l.length]; });
      ok(tot1[0] === tot0[0] && tot1[1] === tot0[1], 'nenhum total muda: renda continua R$ 9.000 e nenhum lançamento novo');
      const grs = await p.evaluate(() => Transferencia.grupos('2026-10-01', '2026-10-31').map((g) => ({ v: g.valor, n: g.itens.length, renda: g.renda, tipo: Transferencia.texto(g).tipo })));
      const pass = grs.find((g) => g.v === 9000), iv = grs.find((g) => g.v === 5000);
      ok(pass && pass.n === 2 && pass.renda === 'sal1' && /conta de passagem/.test(pass.tipo), 'conta de passagem: os dois lados (BTG → Itaú) juntos e ligados ao salário');
      ok(iv && iv.n === 4 && !iv.renda && /ida e volta/.test(iv.tipo), 'ida e volta PJ ↔ PF: os 4 movimentos numa linha só');
      ok(await p.evaluate(() => Transferencia.receber({ id: 'p3', data: '2026-10-12', valor: 5000, banco: 'Itaú', descricao: 'Pix para PJ (corrigido)', tipo: 'transferencia' })) === 'corrigida', 'correção de uma transferência atualiza');
      await p.evaluate(() => { Store.salvar(); irPara('b-lanc'); bFiltro.periodo = 'tudo'; bFiltro.de = ''; bFiltro.ate = ''; render(); });
      const txt = await p.textContent('#view-b-lanc');
      ok(/passou para outra conta em 06\/Out\/2026 \(BTG\)/.test(txt), 'em Lançamentos, o salário mostra "↪ passou para outra conta em 06/Out/2026 (BTG)"');
      ok(/Transferências entre contas/.test(txt) && /não contam como renda nem como gasto/.test(txt) && /conta de passagem/.test(txt) && /ida e volta entre contas/.test(txt), 'seção cinza "Transferências entre contas" com as duas linhas');
      await p.reload(); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.transferencias || []).length === 6);
      ok(true, 'depois de recarregar as transferências continuam (6)');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem para o lado');
      ok(erros.length === 0, 'sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
