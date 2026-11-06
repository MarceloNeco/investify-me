/* =====================================================================
   teste/teste-data.js — 3.37 (N22): campo de data esperto em todo o app (Chromium headless, Playwright)
   Confere: DataEsperta.ler aceita 30/12/2027, 30/12/27, 3012, 30122027, "hoje"; recusa 31/02;
   formato por idioma; todo input date do app vira campo de digitar + 📅; digitar grava AAAA-MM-DD
   no input de verdade e dispara change; tocar no título pula mês/ano; atalhos; 390 e 1366 sem erro.
   Uso (na pasta raiz): node teste/teste-data.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
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
      await ctx.addInitScript(() => { localStorage.setItem('moneytrio.soNesteAparelho', '1'); });
      const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado);
      const L = await p.evaluate(() => { const H = '2026-11-03', r = (t, l) => DataEsperta.ler(t, l || 'pt', H);
        return { a: r('30/12/2027'), b: r('30/12/27'), c: r('3012'), d: r('30122027'), e: r('hoje'), f: r('31/02/2027'), g: r(''), h: r('xyz'), i: r('12/30/27', 'en'), j: r('5'), k: r('301227') }; });
      ok(L.a === '2027-12-30' && L.b === '2027-12-30' && L.d === '2027-12-30' && L.k === '2027-12-30', 'aceita 30/12/2027, 30/12/27, 30122027 e 301227');
      ok(L.c === '2026-12-30', '3012 = 30/12 deste ano');
      ok(L.e === '2026-11-03' && L.j === '2026-11-05', '"hoje" e só o dia (5 = dia 5 deste mês)');
      ok(L.f === null && L.h === null && L.g === '', '31/02 e texto sem data são recusados; vazio = sem data');
      ok(L.i === '2027-12-30', 'em inglês lê mm/dd (12/30/27)');
      await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); abrirRecorrente(null, {}, {abrirMais: true}); });
      await p.waitForSelector('#rcDesdeTxt');
      ok(await p.getAttribute('#rcDesdeTxt', 'placeholder') === 'sempre · dd/mm/aaaa', 'vazio mostra "sempre · dd/mm/aaaa"');
      ok(await p.getAttribute('#rcAteTxt', 'placeholder') === 'sem fim · dd/mm/aaaa', 'vazio mostra "sem fim · dd/mm/aaaa"');
      await p.fill('#rcAteTxt', '30/12/27'); await p.press('#rcAteTxt', 'Enter');
      ok(await p.inputValue('#rcAte') === '2027-12-30' && await p.inputValue('#rcAteTxt') === '30/12/2027', 'digitar 30/12/27 grava 2027-12-30 e mostra 30/12/2027');
      await p.fill('#rcDesdeTxt', '31/02'); await p.press('#rcDesdeTxt', 'Enter');
      ok(await p.evaluate(() => document.getElementById('rcDesdeTxt').classList.contains('cdt-erro')) && await p.inputValue('#rcDesde') === '', 'data impossível fica vermelha e não grava');
      await p.fill('#rcDesdeTxt', '');  await p.press('#rcDesdeTxt', 'Enter');
      /* calendário: pular mês e ano */
      await p.click('[data-cdtabre="rcDesde"]');
      await p.click('#rcDesdePop [data-calpular="1"]');
      ok(await p.isVisible('#rcDesdePop .cal-meses'), 'tocar no título mostra os 12 meses');
      await p.click('#rcDesdePop [data-calanoir="1"]'); await p.click('#rcDesdePop [data-calanoir="1"]');
      const anoAlvo = (await p.evaluate(() => Number(hojeISO().slice(0, 4)))) + 2;
      await p.click('#rcDesdePop [data-calmesir="' + anoAlvo + '-07"]');
      await p.click('#rcDesdePop [data-caldia="' + anoAlvo + '-07-15"]');
      ok(await p.inputValue('#rcDesde') === anoAlvo + '-07-15', 'pulou 2 anos e julho sem apertar › 20 vezes: ' + anoAlvo + '-07-15');
      /* atalhos */
      await p.click('[data-cdtabre="rcDesde"]'); await p.click('#rcDesdePop [data-cdtatalho="anoquevem"]');
      const y = anoAlvo - 1;
      ok(await p.inputValue('#rcDesde') === y + '-01-01' && await p.inputValue('#rcAte') === y + '-12-31', '"Ano que vem inteiro" preenche 01/01 e 31/12');
      await p.click('[data-cdtabre="rcAte"]'); await p.click('#rcAtePop [data-cdtatalho="limpar"]');
      ok(await p.inputValue('#rcAte') === '' && await p.inputValue('#rcAteTxt') === '', '"sem fim" limpa');
      await p.click('[data-cdtabre="rcAte"]'); await p.click('#rcAtePop [data-cdtatalho="hoje"]');
      ok(await p.inputValue('#rcAte') === await p.evaluate(() => hojeISO()), '"Hoje"');
      /* outras telas: o lançamento (input date comum) também vira esperto */
      await p.evaluate(() => { fechar('assetModal'); abrirApp('budget'); irPara('b-lanc'); });
      await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = '<input type="date" id="tstX" value="2026-01-02">'; document.body.appendChild(d); });
      await p.waitForSelector('#tstXTxt');
      ok(await p.inputValue('#tstXTxt') === '02/01/2026', 'qualquer input date que aparece vira esperto (mostra 02/01/2026)');
      await p.evaluate(() => { document.getElementById('tstX').value = '2027-05-06'; });
      ok(await p.inputValue('#tstXTxt') === '06/05/2027', 'o código mudar o valor atualiza o que aparece');
      await p.evaluate(() => { I18n.atual = 'en'; const d = document.createElement('div'); d.innerHTML = '<input type="date" id="tstY" value="2026-01-02">'; document.body.appendChild(d); });
      await p.waitForSelector('#tstYTxt');
      ok(await p.inputValue('#tstYTxt') === '01/02/2026' && /mm\/dd\/yyyy/.test(await p.getAttribute('#tstYTxt', 'placeholder')), 'em inglês: 01/02/2026 e mm/dd/yyyy');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem para o lado');
      ok(erros.length === 0, 'sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
