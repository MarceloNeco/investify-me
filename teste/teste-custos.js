/* =====================================================================
   teste/teste-custos.js — 3.36: tela Custos (N27 a–f) (Chromium headless, Playwright)
   Confere: aba "Todos"; uma linha explicando cada aba; "Encontrei N que se repetem" com caixinhas
   (histórico + freq do robô, renda separada de custo, o que parou fica de fora, "já existe");
   "Cadastrar os marcados" cadastra só os marcados; "Sai todo mês" só conta o que vale no mês;
   "Quando cai" com o período em 2 linhas; 390x800 e 1366x768 sem erro de página.
   Uso (na pasta raiz): node teste/teste-custos.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };

/* datas relativas a hoje: mês -k, dia d */
const hoje = new Date();
const dt = (k, d) => { const x = new Date(hoje.getFullYear(), hoje.getMonth() - k, d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const anoQueVem = hoje.getFullYear() + 1;
const gastos = []; let n = 0;
const g = (o) => gastos.push(Object.assign({ id: 'g' + (n++), per: 'Pontual', quem: '', desc: '', fluxo: o.grupo === 'RENDA' ? 'entrada' : 'saida' }, o));
for (let k = 0; k <= 6; k++) g({ data: dt(k, 5), valor: 3200, grupo: 'HABITACAO', sub: 'Aluguel' });                      /* regular, sem freq */
for (let k = 0; k <= 1; k++) g({ data: dt(k, 2), valor: 55.9, grupo: 'LAZER', sub: 'Streaming', per: 'Mensal', origem: 'robo' }); /* robô: Mensal, só 2 meses */
for (let k = 3; k <= 10; k++) g({ data: dt(k, 20), valor: 18000, grupo: 'RENDA', sub: 'Faturamento PJ ClienteX' });     /* parou há 3 meses */
for (let k = 0; k <= 5; k++) g({ data: dt(k, 1), valor: 9000, grupo: 'RENDA', sub: 'Salário' });                         /* renda */
for (let k = 0; k <= 6; k++) g({ data: dt(k, 10), valor: 2700, grupo: 'HABITACAO', sub: 'Condomínio' });                 /* já existe */
for (let k = 0; k <= 6; k++) g({ data: dt(k, 3 + k), valor: 300 + 400 * (k % 3), grupo: 'PESSOAL', sub: 'Mercado' });   /* variável: não é conta fixa */
const LOCAL = { v: 1, posicoes: [], gastos, config: {}, recorrentes: [
  { id: 'r-cond', nome: 'Condomínio Jardim', valor: 2700, grupo: 'HABITACAO', sub: 'Condomínio', regra: 'dia', dia: 10 },
  { id: 'r-esc', nome: 'Escola Bia ' + anoQueVem, valor: 3100, grupo: 'DEPENDENTES', sub: 'Escola', regra: 'dia', dia: 5, desde: anoQueVem + '-01-01', ate: anoQueVem + '-12-31' },
  { id: 'r-des', nome: 'Curso', valor: 100, grupo: 'DEPENDENTES', sub: 'Curso', regra: 'dia', dia: 8, desde: anoQueVem + '-03-01' },
  { id: 'r-ate', nome: 'Seguro', valor: 100, grupo: 'VEICULO', sub: 'Seguro Auto', regra: 'dia', dia: 8, ate: anoQueVem + '-12-31' },
  { id: 'r-2a', nome: 'Plano', valor: 100, grupo: 'SAUDE', sub: 'Plano', regra: 'dia', dia: 8, desde: '2026-01-30', ate: anoQueVem + '-08-14' } ] };

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
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.recorrentes || []).length === 5);
      await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); irPara('b-custos'); });
      await p.waitForSelector('#view-b-custos [data-custaba="recorrentes"]');
      ok(!(await p.$('#view-b-custos [data-custaba="todos"]')) && !(await p.$('#view-b-custos [data-custaba="revisar"]')), '3.76: Contas fixas sem as abas "Todos" e "Revisar" (o que era Revisar vai para o 📥)');

      /* (d) só o que vale neste mês */
      const sai = await p.evaluate(() => Recorrente.porMes().sai);
      ok(Math.abs(sai - 2700 - 100 - 100) < 0.01, '"Sai todo mês" conta só o que vale neste mês (Escola do ano que vem e Curso fora): ' + sai);
      const saiAno = await p.evaluate((a) => Recorrente.porMes(a + '-06-15').sai, anoQueVem);
      ok(Math.abs(saiAno - (2700 + 3100 + 100 + 100 + 100)) < 0.01, 'em junho do ano que vem a Escola e o Curso já contam: ' + saiAno);

      /* (e) linha explicando a aba */
      await p.click('#view-b-custos [data-custaba="pontuais"]');
      ok(/uma vez e acabaram/.test(await p.textContent('#view-b-custos .aba-explica')), 'Pontuais tem a linha explicando');

      /* (f) período curto */
      await p.click('#view-b-custos [data-custaba="recorrentes"]');
      await p.waitForSelector('#view-b-custos .rec-periodo');
      const per = await p.$$eval('#view-b-custos .rec-periodo', (els) => els.map((e) => e.textContent));
      ok(per.includes('01/Jan a 31/Dez/' + anoQueVem), 'mesmo ano: "01/Jan a 31/Dez/' + anoQueVem + '" (ano uma vez só)');
      ok(per.includes('desde 01/Mar/' + anoQueVem), 'só início: "desde 01/Mar/' + anoQueVem + '"');
      ok(per.includes('até 31/Dez/' + anoQueVem), 'só fim: "até 31/Dez/' + anoQueVem + '"');
      ok(per.includes('30/Jan/2026 a 14/Ago/' + anoQueVem), 'anos diferentes: "30/Jan/2026 a 14/Ago/' + anoQueVem + '"');
      ok(per.length === 4, 'sem período, sem 2ª linha (4 de 5)');

      /* (b)(c) a lista com caixinhas */
      const det = await p.$$eval('#recDetectados .rdet', (ls) => ls.map((l) => ({ txt: l.textContent, ck: l.querySelector('input').checked, dis: l.querySelector('input').disabled })));
      const acha = (re) => det.find((d) => re.test(d.txt));
      ok(/Encontrei 4 que se repetem/.test(await p.textContent('#recDetectados h3')), 'título "Encontrei 4 que se repetem"');
      ok(acha(/Aluguel/) && acha(/Aluguel/).ck, 'Aluguel (regular no histórico) vem marcado');
      ok(acha(/Streaming/) && acha(/Streaming/).ck, 'Streaming (robô diz Mensal, só 2 meses) entra');
      ok(!acha(/ClienteX/), 'Faturamento PJ ClienteX (parou há 3 meses) não aparece');
      ok(!acha(/Mercado/), 'Mercado (valor muda muito) não aparece');
      ok(acha(/Condomínio/) && acha(/Condomínio/).dis && /já existe: Condomínio Jardim/.test(acha(/Condomínio/).txt), 'Condomínio: "já existe" e sem caixinha');
      const secs = await p.$$eval('#recDetectados .rdet-sec', (e) => e.map((x) => x.textContent));
      ok(secs.join('|') === 'Custos (saem)|Renda (entra)', 'renda separada de custo');
      const ordem = await p.$$eval('#recDetectados .rdet-sec, #recDetectados .rdet', (e) => e.map((x) => x.textContent));
      ok(ordem.findIndex((x) => /Salário/.test(x)) > ordem.indexOf('Renda (entra)'), 'Salário fica em Renda');
      ok(/\(3\)/.test(await p.textContent('#recDetOk')), 'botão "Cadastrar os marcados (3)"');
      await p.click('#recDetectados .rdet:has-text("Streaming") input');
      ok(/\(2\)/.test(await p.textContent('#recDetOk')), 'desmarcar atualiza o botão para (2)');
      await p.click('#recDetOk');
      const recs = await p.evaluate(() => Store.estado.recorrentes.map((r) => ({ nome: r.nome, desde: r.desde, dia: r.dia, valor: r.valor })));
      ok(recs.length === 7, 'cadastrou só os 2 marcados (7 no total)');
      const al = recs.find((r) => r.nome === 'Aluguel');
      ok(al && al.dia === 5 && al.valor === 3200 && al.desde === (await p.evaluate(() => hojeISO())), 'Aluguel: dia 5, R$ 3.200, começa a valer hoje');
      ok(!recs.find((r) => r.nome === 'Streaming'), 'o desmarcado não entrou');
      const det2 = await p.$$eval('#recDetectados .rdet', (ls) => ls.map((l) => l.textContent));
      ok(det2.filter((t) => /já existe/.test(t)).length === 3, 'depois de cadastrar, os dois passam a "já existe"');
      ok(await p.evaluate(() => Recorrente.atrasados().filter((o) => o.r.nome === 'Aluguel').length === 0), 'o passado do novo não vira "atrasado"');
      /* Revisar não sugere o que parou */
      await p.evaluate(() => abrirInbox());
      ok(!/ClienteX/.test(await p.textContent('#genBody')), 'o 📥 também não sugere o que parou');
      await p.evaluate(() => fechar('genModal'));
      /* EN */
      await p.evaluate(() => { I18n.atual = 'en'; custosAba = 'recorrentes'; render(); });
      ok(/Found \d+ that repeat/.test(await p.textContent('#recDetectados h3')), 'em inglês: "Found N that repeat"');
      await p.evaluate(() => { I18n.atual = 'pt'; render(); });
      const larg = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
      ok(larg, 'sem rolagem para o lado');
      ok(erros.length === 0, 'sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
