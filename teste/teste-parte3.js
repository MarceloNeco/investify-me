/* =====================================================================
   teste/teste-parte3.js — 3.38 (Chromium headless, Playwright)
   N28 valor que varia (média, faixa, previsto × realizado); N31 abatimento (o que conta é o que saiu,
   asterisco, guarda depois de recarregar, não passa do preço); N33 feriados de SP (25/01 e 09/07) no
   serviço por visita + "não veio" com um toque + Configurações; N25 aviso do IR pela data do pagamento;
   N35 tela larga e cabeçalho fixo no computador. 390x800 e 1366x768 sem erro de página.
   Uso (na pasta raiz): node teste/teste-parte3.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const hoje = new Date(), ANO = hoje.getFullYear();
const dt = (k, d) => { const x = new Date(ANO, hoje.getMonth() - k, d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const cond = [2396.88, 2829.76, 2500, 2610.5, 2450, 2700];
const gastos = cond.map((v, i) => ({ id: 'c' + i, data: dt(i + 1, 10), valor: v, grupo: 'HABITACAO', sub: 'Condomínio', desc: 'Condomínio', fluxo: 'saida', per: 'Mensal' }));
for (let i = 0; i < 30; i++) gastos.push({ id: 'x' + i, data: dt(i % 6, 2 + (i % 20)), valor: 10 + i, grupo: 'PESSOAL', sub: 'Mercado', desc: 'mercado ' + i, fluxo: 'saida' });
const LOCAL = { v: 1, posicoes: [], gastos, config: {}, recorrentes: [
  { id: 'r-cond', nome: 'Condomínio Jardim', valor: 2600, grupo: 'HABITACAO', sub: 'Condomínio', regra: 'dia', dia: 10, varia: true },
  { id: 'r-dia', nome: 'Diarista Rita', valor: 250, grupo: 'HABITACAO', sub: 'Diarista', regra: 'dia', dia: 31, porVisita: true, visita: { regra: 'semanal', diaSemana: 1, soDiaUtil: true } } ] };
(async () => {
  const srv = http.createServer((q, s) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'application/octet-stream' }); fs.createReadStream(p).pipe(s); });
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
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.recorrentes || []).length === 2);
      await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); });

      /* N33 */
      const F = await p.evaluate(() => ({ a: Feriados.qual('2027-01-25'), b: Feriados.qual('2027-07-09'), c: Feriados.qual('2027-09-07') }));
      ok(F.a === 'Aniversário de São Paulo' && /Constitucionalista/.test(F.b) && F.c === 'Independência', 'padrão SP/São Paulo: 25/01 e 09/07 são feriado (e os nacionais continuam)');
      const vis = await p.evaluate(() => Recorrente.visitasNoMes(Recorrente.achar('r-dia'), 2027, 1).map((v) => v.data + ':' + v.vale + ':' + v.motivo));
      ok(vis.includes('2027-01-25:false:feriado') && vis.includes('2027-01-18:true:normal'), 'diarista: segunda 25/01/2027 não conta (feriado da cidade)');
      await p.evaluate(() => { irPara('config'); cfgSecao = 'budget'; render(); });
      await p.waitForSelector('#cFerUF', { state: 'attached' });
      ok(await p.inputValue('#cFerUF') === 'SP' && await p.inputValue('#cFerCidade') === 'São Paulo', 'Configurações → Feriados: SP / São Paulo');
      await p.evaluate(() => { const e = document.getElementById('cFerUF'); e.value = ''; e.dispatchEvent(new Event('change')); });
      ok(await p.evaluate(() => Feriados.qual('2027-01-25') === null && Store.estado.config.regiao.uf === ''), '"Só os nacionais" tira o 25/01');
      await p.evaluate(() => { const e = document.getElementById('cFerUF'); e.value = 'SP'; e.dispatchEvent(new Event('change')); });
      await p.evaluate(() => { document.getElementById('cFerData').value = '2027-06-13'; document.getElementById('cFerNome').value = 'Santo Antônio'; });
      await p.evaluate(() => document.querySelector('[data-acao="fer-add"]').click());
      ok(await p.evaluate(() => Feriados.qual('2027-06-13') === 'Santo Antônio'), 'feriado acrescentado à mão');
      /* não veio com um toque */
      await p.evaluate(() => { servRid = 'r-dia'; servMes = '2027-01'; renderVisitas(); abrir('genModal'); });
      await p.click('[data-servfalta="2027-01-18"]');
      ok(await p.evaluate(() => Recorrente.visitasNoMes(Recorrente.achar('r-dia'), 2027, 1).find((v) => v.data === '2027-01-18').motivo === 'faltou'), '"✕ não veio" com um toque');
      await p.click('[data-servfalta="2027-01-18"]');
      ok(await p.evaluate(() => Recorrente.visitasNoMes(Recorrente.achar('r-dia'), 2027, 1).find((v) => v.data === '2027-01-18').motivo === 'normal'), 'tocar de novo volta para "veio"');
      await p.evaluate(() => fechar('genModal'));

      /* N25 */
      await p.evaluate(() => { abrirApp('tax'); irPara('t-deducoes'); });
      await p.waitForSelector('.aviso-ir-data');
      ok(/data do PAGAMENTO/.test(await p.textContent('.aviso-ir-data')) && new RegExp('matrícula da escola de ' + (ANO + 1) + ' paga em 30/10/' + ANO + ' entra na declaração de ' + (ANO + 1)).test(await p.textContent('.aviso-ir-data')), 'FiscalONE avisa: conta a data do pagamento (matrícula de ' + (ANO + 1) + ' paga em 30/10/' + ANO + ')');

      /* N31 */
      await p.evaluate(() => { abrirApp('budget'); irPara('b-lanc'); abrirLancamento(null); });
      await p.waitForSelector('#glValor');
      await p.fill('#glValor', '2559.40');
      await p.evaluate(() => { document.getElementById('glGrupo').value = 'VEICULO'; document.getElementById('glGrupo').dispatchEvent(new Event('change', {bubbles: true})); });
      await p.fill('#glSub', 'Seguro Auto');
      await p.click('details.abat > summary');
      await p.fill('#glAb0Prog', 'Porto'); await p.fill('#glAb0Pts', '17000'); await p.fill('#glAb0Val', '300');
      await p.fill('#glAb1Prog', 'Itaú'); await p.fill('#glAb1Pts', '104000'); await p.fill('#glAb1Val', '1875');
      await p.click('#assetModal [data-acao="gl-salvar"]');
      let g = await p.evaluate(() => Store.estado.gastos.find((x) => x.sub === 'Seguro Auto'));
      ok(g && Math.abs(g.valor - 384.40) < 0.001 && Math.abs(g.cheio - 2559.40) < 0.001 && g.abat.length === 2, 'conta o que saiu: R$ 384,40 (preço cheio R$ 2.559,40, 2 abatimentos)');
      await p.evaluate(() => { bFiltro.periodo = 'tudo'; bFiltro.de = ''; bFiltro.ate = ''; render(); });
      const ast = await p.$('#view-b-lanc .abat-ast');
      ok(!!ast, 'na lista o valor aparece com asterisco');
      if (ast) { await ast.evaluate((e) => e.click()); await p.waitForTimeout(150); ok(/preço cheio R\$\s?2\.559,40; R\$\s?300,00 pagos com 17\.000 pontos Porto/.test(await p.textContent('#toasts')), 'tocar no * explica: preço cheio; R$ 300 com 17.000 pontos Porto'); }
      await p.reload(); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.gastos || []).length > 30);
      g = await p.evaluate(() => Store.estado.gastos.find((x) => x.sub === 'Seguro Auto'));
      ok(g && g.abat && g.abat.length === 2 && Math.abs(g.cheio - 2559.40) < 0.001 && g.abat[1].pontos === 104000, 'depois de recarregar, o abatimento continua (guardado no aparelho)');
      await p.evaluate((id) => { I18n.atual = 'pt'; abrirApp('budget'); abrirLancamento(id); }, g.id);
      ok(await p.inputValue('#glValor') === '2559.4', 'editar mostra o preço cheio em Valor');
      await p.fill('#glAb0Val', '3000'); await p.click('#assetModal [data-acao="gl-salvar"]');
      ok(/passou do preço cheio/.test(await p.textContent('#toasts')) && await p.isVisible('#glValor'), 'abatimento maior que o preço é recusado');
      await p.evaluate(() => fechar('assetModal'));
      await p.evaluate(() => { irPara('b-custos'); });
      ok(/economizou/.test(await p.textContent('#view-b-custos')) || !/^\d{4}/.test(g.data) || g.data.slice(0, 4) !== String(ANO), 'Custos mostra quanto economizou com pontos no ano');

      /* N28 */
      await p.evaluate(() => { custosAba = 'recorrentes'; render(); abrirRecorrente('r-cond'); });
      await p.waitForSelector('#rcVariaInfo .rc-var');
      const vi = await p.textContent('#rcVariaInfo');
      ok(/média/.test(vi) && /2\.396,88/.test(vi) && /2\.829,76/.test(vi), 'valor que varia: média dos 6 meses e a faixa (R$ 2.396,88 – R$ 2.829,76)');
      await p.click('[data-acao="rec-var-media"]');
      const media = Math.round(cond.reduce((a, b2) => a + b2, 0) / 6 * 100) / 100;
      ok(Math.abs(Number(await p.inputValue('#rcValor')) - media) < 0.01, '"Usar a média" põe o previsto em Valor: ' + media);
      await p.evaluate(() => fechar('assetModal'));
      const oc = await p.evaluate((d) => { Pagamento.marcar('r-cond', d, 'confirmado', {valor: 2750}); const o = Recorrente.ocorrencia(Recorrente.achar('r-cond'), d); return {v: o.valor, prev: o.previsto, real: o.realizado, html: linhaOcorrencia(o)}; }, dt(0, 10));
      ok(oc.v === 2750 && oc.prev === 2600 && oc.real && /realizado · previsto R\$\s?2\.600,00 · \+R\$\s?150,00/.test(oc.html), 'previsto × realizado: o pagamento real substitui o previsto e mostra +R$ 150');

      /* N35 */
      await p.evaluate(() => { irPara('b-lanc'); });
      await p.waitForTimeout(100);
      const lar = await p.evaluate(() => { const c = document.querySelector('.content'), cs = getComputedStyle(c); return { w: document.getElementById('view-b-lanc').getBoundingClientRect().width, livre: c.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), topo: document.querySelectorAll('table.tbl-topo').length, cap: getComputedStyle(document.getElementById('view-b-lanc')).maxWidth }; });
      if (vp.width >= 1366) ok(lar.w >= lar.livre - 1 && lar.cap !== '1120px' && lar.topo > 0, 'no computador: Lançamentos usa a largura toda (' + Math.round(lar.w) + ' px, até 1560) e cabeçalho fixo ligado (' + lar.topo + ' tabela[s])');
      else ok(lar.topo === 0, 'no celular: nada muda (sem cabeçalho fixo)');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem para o lado');
      ok(erros.length === 0, 'sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
