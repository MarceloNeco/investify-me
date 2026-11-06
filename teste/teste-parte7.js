/* =====================================================================
   teste/teste-parte7.js — 3.43: N39 profissionais conhecidos (Chromium headless, Playwright, "só neste aparelho")
   Confere: normalizar nome do extrato (sem IA); 1 letra trocada ainda é o mesmo; uma pergunta por nome em
   Custos → Revisar; confirmar classifica os antigos e os novos sozinho (nunca mais pergunta); "não é
   profissional" para de perguntar; parecido-mas-diferente pergunta com sugestão; tela de conhecidos.
   Uso (na pasta raiz): node teste/teste-parte7.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const hoje = new Date();
const dt = (n) => { const d = new Date(hoje); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const G = (id, n, desc, valor, grupo, sub) => ({ id, data: dt(n), valor, grupo: grupo || 'OUTROS', sub: sub || 'Sem categoria', desc, fluxo: 'saida', origem: 'robo' });
const LOCAL = { v: 1, posicoes: [], config: {}, recorrentes: [], gastos: [
  G('m1', 40, 'PIX DRA MARIANA SOUZA', 450), G('m2', 20, 'PIX ENVIADO MARIANA SOUZA', 450), G('m3', 5, 'TED DRA. MARIANA SOUZA ME', 450),
  G('c1', 12, 'PIX CLINICA ODONTO SORRISO LTDA', 300, 'SAUDE', 'Dentista'),
  G('x1', 3, 'MERCADO BOM PRECO', 120, 'PESSOAL', 'Mercado') ] };
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
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('semeado')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('semeado', '1'); } }, JSON.stringify(LOCAL));
      const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
      const semToasts = () => p.evaluate(() => document.querySelectorAll('#toasts .toast').forEach((e) => e.parentNode.removeChild(e)));
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.gastos || []).length === 5 && window.Profissionais);
      await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); });
      const u = await p.evaluate(() => ({ n: Profissionais.norm('PIX ENVIADO DRA. FULANA DE TAL LTDA 12345').join(' '), a: Profissionais.parecido('CLINICA ODONTO SORRISO', 'CLINICA ODONTO SORRISSO'),
        b: Profissionais.parecido('MARIANA SOUZA', 'MARIANA COSTA'), c: Profissionais.parecido('Mariana Souza', 'PIX DRA MARIANA SOUZA') }));
      ok(u.n === 'fulana tal', 'normaliza: tira PIX, ENVIADO, DRA., DE, LTDA e números → "fulana tal"');
      ok(u.a === 1 && u.c === 1, '1 letra trocada (SORRISSO) e PIX/DRA a mais ainda são o mesmo nome');
      ok(u.b === 0.5, 'MARIANA COSTA × MARIANA SOUZA: meio parecido (0,5)');
      await p.evaluate(() => { irPara('b-custos'); custosAba = 'revisar'; render(); });
      await p.waitForSelector('.prof-card');
      let qs = await p.$$eval('.prof-q .t-main', (e) => e.map((x) => x.textContent));
      ok(qs.length === 2 && qs.some((t) => /MARIANA SOUZA/.test(t)) && qs.some((t) => /SORRISO/.test(t)) && !qs.some((t) => /MERCADO/.test(t)), 'Revisar pergunta 2 nomes (Mariana: os 3 lançamentos juntos; Clínica), e não o mercado');
      ok(/3 lançamento/.test(await p.textContent('.prof-q:has-text("MARIANA")')), 'Mariana: uma pergunta para os 3 lançamentos');
      /* confirmar Mariana: pediatra da Bia, IR */
      await semToasts();
      await p.fill('.prof-q:has-text("MARIANA") .prof-nome', 'Dra. Mariana Souza');
      await p.fill('.prof-q:has-text("MARIANA") .prof-sub', 'Pediatra');
      await p.fill('.prof-q:has-text("MARIANA") .prof-quem', 'Bia');
      await p.check('.prof-q:has-text("MARIANA") .prof-ir');
      await p.click('.prof-q:has-text("MARIANA") [data-acao="prof-confirmar"]');
      const ms = await p.evaluate(() => Store.estado.gastos.filter((g) => /MARIANA/.test(g.desc)).map((g) => [g.grupo, g.sub, g.quem, g.irpf].join('|')));
      ok(ms.length === 3 && ms.every((x) => x === 'SAUDE|Pediatra|Bia|true'), 'confirmar classifica os 3 lançamentos antigos (Saúde · Pediatra · Bia · IR)');
      /* um novo, com 1 letra diferente, chega do "robô" */
      const novo = await p.evaluate(() => { const g = Gasto.add({ data: hojeISO(), valor: 450, grupo: 'OUTROS', sub: 'Sem categoria', desc: 'PIX DRA MARIANA SOUSA', origem: 'robo' }); return [g.grupo, g.sub, g.quem, g.irpf, !!g.profissional].join('|'); });
      ok(novo === 'SAUDE|Pediatra|Bia|true|true', 'lançamento novo "MARIANA SOUSA" já entra classificado, sem perguntar');
      await p.evaluate(() => render());
      qs = await p.$$eval('.prof-q .t-main', (e) => e.map((x) => x.textContent));
      ok(!qs.some((t) => /MARIANA/.test(t)), 'e a Mariana não volta para as perguntas');
      /* não é profissional */
      await semToasts();
      await p.click('.prof-q:has-text("SORRISO") [data-acao="prof-ignorar"]');
      ok(!(await p.$('.prof-q')), '"Não é profissional": a clínica não é mais perguntada');
      ok(await p.evaluate(() => Profissionais.classificar(Gasto.add({ data: hojeISO(), valor: 300, grupo: 'SAUDE', sub: 'Dentista', desc: 'PIX CLINICA ODONTO SORRISO LTDA', origem: 'robo' }))) === '', 'nem quando chega outro lançamento dela');
      /* parecido mas diferente: pergunta com sugestão */
      await p.evaluate(() => { Gasto.add({ data: hojeISO(), valor: 200, grupo: 'OUTROS', sub: 'Sem categoria', desc: 'PIX MARIANA COSTA', origem: 'robo' }); render(); });
      ok(/parece Dra\. Mariana Souza/.test(await p.textContent('.prof-q:has-text("MARIANA COSTA")')), 'nome meio parecido (MARIANA COSTA): pergunta, sugerindo a Dra. Mariana Souza');
      ok(await p.evaluate(() => Gasto.todos().find((g) => g.desc === 'PIX MARIANA COSTA').grupo) === 'OUTROS', 'e não classifica sozinho enquanto não confirmar');
      /* lançamento que a pessoa editou não é mexido */
      ok(await p.evaluate(() => { const g = Gasto.add({ data: hojeISO(), valor: 450, grupo: 'LAZER', sub: 'Outro', desc: 'PIX DRA MARIANA SOUZA', origem: 'robo', editadoPessoa: true }); return g.grupo; }) === 'LAZER', 'lançamento editado pela pessoa não é reclassificado');
      await p.evaluate(() => irPara('b-profissionais'));
      await p.waitForSelector('#view-b-profissionais');
      ok(/Dra\. Mariana Souza/.test(await p.textContent('#view-b-profissionais')) && /Pediatra · Bia · IR/.test(await p.textContent('#view-b-profissionais')), 'tela "Profissionais conhecidos"');
      await p.reload(); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.profissionais || []).length === 2);
      ok(true, 'depois de recarregar, os conhecidos continuam');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem para o lado');
      ok(erros.length === 0, 'sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
