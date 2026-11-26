/* =====================================================================
   teste/teste-tour.js — 3.65: o passeio com spotlight (modulos/tour.js) · 3.108: um passeio por tela
   ---------------------------------------------------------------------
   No computador (1366) e no celular (390): cada passo recorta o alvo de verdade, o balão fica na tela e não cobre o alvo,
   se move de um alvo para o outro, a seta aponta; teclado (→ ← Esc), foco preso no balão; peça que some no meio do
   passeio → balão no meio só naquele passo; o fim marca o tutorial como visto.
   3.108: na tela Início o passeio é o do Início (os três cartões, ir e voltar, conta, AssistONE), sem falar de menu,
   Painel ou Lançamentos, e TODO passo escurece o fundo e recorta a peça; passo sem peça à vista é pulado; dentro do
   InvestifyONE não aparecem os passos do BudgetONE.
   Fotos de cada passo em /tmp/tour-<largura>-<passo>.png. Dados de mentira. Uso: node teste/teste-tour.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: {}, posicoes: [], gastos: Array.from({ length: 30 }, (x, i) => ({ id: 'g' + i, data: '2026-10-' + String(1 + (i % 28)).padStart(2, '0'), valor: 50 + i, grupo: 'HABITACAO', sub: 'Mercado', desc: 'MERCADO ' + i, fluxo: 'saida' })), recorrentes: [] };
const dentro = (a, b) => a.left <= b.left + 1 && a.top <= b.top + 1 && a.right >= b.right - 1 && a.bottom >= b.bottom - 1;
const cruza = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch();
  for (const vp of [{ width: 1366, height: 800 }, { width: 390, height: 800 }]) {
    console.log('passeio em ' + vp.width);
    const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.removeItem('moneytrio.tutorial.v1'); }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.Tour);
    await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); irPara('b-painel'); try { if (typeof AssistOne !== 'undefined' && AssistOne.fechar) AssistOne.fechar(); } catch (e) {} fechar('assistModal'); });
    await p.waitForTimeout(500);
    await p.evaluate(() => Assist.abrir('tutorial'));
    const posicoes = [];
    const nB = await p.evaluate(() => Tour.atual().passos.length);
    ok(nB === 7 && await p.evaluate(() => Tour.atual().qual) === 'app', vp.width + ': no BudgetONE o passeio é o do módulo, com 7 passos (veio ' + nB + ')');
    for (let i = 0; i < nB; i++) {   /* 3.108: menu, trocar de módulo, Painel, Lançamentos, Contas fixas, conta, AssistONE */
      await p.waitForTimeout(500);
      const m = await p.evaluate(() => {
        const R = (e) => { const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height }; };
        const furo = document.querySelector('.tour-furo'), bal = document.querySelector('.tour-balao');
        const sels = Tour.atual().passos[Number(document.querySelector('.tour-n').textContent.split('/')[0]) - 1].alvo;
        let alvo = null; for (const sel of sels) { alvo = [...document.querySelectorAll(sel)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.right > 0 && r.left < innerWidth && !e.closest('.hidden,[hidden]'); }); if (alvo) break; }
        return { furo: R(furo), bal: R(bal), alvo: alvo ? R(alvo) : null, alvoId: alvo ? (alvo.id || alvo.dataset.view || alvo.className) : '', W: innerWidth, H: innerHeight,
          foco: !!document.activeElement.closest('.tour-balao'), tit: document.getElementById('tourTit').textContent, n: document.querySelector('.tour-n').textContent, seta: document.querySelector('.tour-seta').className,
          role: document.querySelector('.tour').getAttribute('role'), sy: scrollY, trans: getComputedStyle(bal).transitionProperty };
      });
      posicoes.push(m.bal);
      await p.screenshot({ path: '/tmp/tour-' + vp.width + '-' + (i + 1) + '.png' });
      ok(m.alvo && dentro(m.furo, m.alvo), vp.width + ' passo ' + m.n + ' "' + m.tit + '": recorta o alvo de verdade (' + m.alvoId + ')');
      ok(m.alvo && !cruza(m.bal, m.alvo) && m.bal.left >= 0 && m.bal.right <= m.W && m.bal.top >= 0 && m.bal.bottom <= m.H, vp.width + ' passo ' + m.n + ': o balão fica na tela e não cobre o alvo (seta: ' + m.seta.replace('tour-seta ', '') + ')');
      ok(m.foco && m.role === 'dialog', vp.width + ' passo ' + m.n + ': o foco está no balão (role=dialog)');
      if (i === 0) ok(/left/.test(m.trans) && /top/.test(m.trans), vp.width + ': o balão se move com animação (transition em left/top)');
      if (i === 0) ok(vp.width > 760 ? m.alvoId === 'navLista' : m.alvoId === 'btnMenu', vp.width + ': o 1º passo aponta para o menu certo (' + (vp.width > 760 ? 'lateral' : '☰') + ')');
      if (i < nB - 1) await p.keyboard.press('ArrowRight');
    }
    ok(new Set(posicoes.map((x) => Math.round(x.left) + ',' + Math.round(x.top))).size >= 3, vp.width + ': o balão foi para lugares diferentes (um por alvo)');
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('.tour-n').textContent) === (nB - 1) + ' / ' + nB, vp.width + ': ← volta um passo');
    /* foco preso: Tab várias vezes continua dentro do balão */
    for (let k = 0; k < 6; k++) await p.keyboard.press('Tab');
    ok(await p.evaluate(() => !!document.activeElement.closest('.tour-balao')), vp.width + ': Tab não sai do balão');
    /* peça que some no meio do passeio: balão no meio, só naquele passo */
    await p.evaluate(() => { document.getElementById('assistOne').classList.add('hidden'); Tour.ir(Tour.atual().passos.length - 1); });   /* o AssistONE é o último passo */
    await p.waitForTimeout(500);
    await p.screenshot({ path: '/tmp/tour-' + vp.width + '-sem-alvo.png' });
    const ok1 = await p.evaluate(() => { const r = document.querySelector('.tour-balao').getBoundingClientRect(); const c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      return document.querySelector('.tour').classList.contains('sem-alvo') && Math.abs(c.x - innerWidth / 2) < 3 && Math.abs(c.y - innerHeight / 2) < 3; });
    const ok2 = await p.evaluate(() => { document.getElementById('assistOne').classList.remove('hidden'); Tour.ir(3); return !document.querySelector('.tour').classList.contains('sem-alvo'); });
    const semAlvo = ok1 && ok2;
    ok(semAlvo, vp.width + ': alvo que não existe → balão no meio só naquele passo');
    const trava = await p.evaluate(() => getComputedStyle(document.documentElement).overflow);
    ok(trava === 'hidden', vp.width + ': com o passeio aberto, a tela de trás não rola');
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => !document.querySelector('.tour') && !!localStorage.getItem('moneytrio.tutorial.v1') && getComputedStyle(document.documentElement).overflow !== 'hidden'), vp.width + ': Esc pula, fecha e marca o tutorial como visto');

    /* 3.108: no InvestifyONE, nada dos passos do BudgetONE */
    await p.evaluate(() => { abrirApp('investify'); Assist.abrir('tutorial'); });
    await p.waitForTimeout(400);
    const inv = await p.evaluate(() => Tour.atual().passos.map((x) => x.pt.t));
    ok(inv.length >= 3 && !inv.some((t) => /Painel|Lançamentos|Contas fixas/.test(t)) && inv[inv.length - 1] === 'O AssistONE', vp.width + ': no InvestifyONE o passeio não fala do BudgetONE (' + inv.join(' · ') + ')');
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);

    /* 3.108: o passeio da tela Início */
    await p.evaluate(() => { mostrarHub(); });
    await p.waitForTimeout(400);
    await p.evaluate(() => Assist.abrir('tutorial'));
    await p.waitForTimeout(400);
    const hub = await p.evaluate(() => ({ qual: Tour.atual().qual, tits: Tour.atual().passos.map((x) => x.pt.t), txt: JSON.stringify(Tour.atual().passos) }));
    ok(hub.qual === 'inicio', vp.width + ': no Início o passeio é o do Início');
    ok(hub.tits.join('|') === 'BudgetONE|InvestifyONE|FiscalONE|Ir e voltar|Sua conta|O AssistONE', vp.width + ': passos do Início: ' + hub.tits.join(' · '));
    ok(!/Painel|Lançamentos|O menu/.test(hub.txt), vp.width + ': o passeio do Início não fala de menu, Painel nem Lançamentos');
    for (let i = 0; i < hub.tits.length; i++) {
      await p.waitForTimeout(450);
      const m = await p.evaluate(() => {
        const R = (e) => { const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; };
        const n = Number(document.querySelector('.tour-n').textContent.split('/')[0]);
        const sels = Tour.atual().passos[n - 1].alvo;
        let alvo = null; for (const sel of sels) { alvo = [...document.querySelectorAll(sel)].find((e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && !e.closest('.hidden,[hidden]'); }); if (alvo) break; }
        return { n: document.querySelector('.tour-n').textContent, tit: document.getElementById('tourTit').textContent, semAlvo: document.querySelector('.tour').classList.contains('sem-alvo'),
          furo: R(document.querySelector('.tour-furo')), opac: getComputedStyle(document.querySelector('.tour-furo')).opacity, bal: R(document.querySelector('.tour-balao')), alvo: alvo ? R(alvo) : null, W: innerWidth, H: innerHeight };
      });
      await p.screenshot({ path: '/tmp/tour-inicio-' + vp.width + '-' + (i + 1) + '.png' });
      ok(!m.semAlvo && m.opac === '1' && m.alvo && dentro(m.furo, m.alvo), vp.width + ' Início ' + m.n + ' "' + m.tit + '": escurece o fundo e recorta a peça');
      ok(m.alvo && !cruza(m.bal, m.alvo) && m.bal.left >= 0 && m.bal.right <= m.W && m.bal.top >= 0 && m.bal.bottom <= m.H, vp.width + ' Início ' + m.n + ': o balão fica na tela e não cobre a peça');
      if (i < hub.tits.length - 1) await p.keyboard.press('ArrowRight');
    }
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    /* passo sem peça à vista é pulado ao começar (aqui: o AssistONE escondido) */
    await p.evaluate(() => { document.getElementById('assistOne').classList.add('hidden'); Assist.abrir('tutorial'); });
    await p.waitForTimeout(300);
    const pulou = await p.evaluate(() => ({ tits: Tour.atual().passos.map((x) => x.pt.t), n: document.querySelector('.tour-n').textContent, sem: document.querySelector('.tour').classList.contains('sem-alvo') }));
    ok(pulou.tits.indexOf('O AssistONE') < 0 && /\/ 5$/.test(pulou.n) && !pulou.sem, vp.width + ': passo sem a peça à vista é pulado (' + pulou.n + ')');
    await p.keyboard.press('Escape');
    await p.evaluate(() => document.getElementById('assistOne').classList.remove('hidden'));

    ok(erros.length === 0, vp.width + ': sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
    await ctx.close();
  }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
