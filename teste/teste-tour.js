/* =====================================================================
   teste/teste-tour.js — 3.65: o passeio com spotlight (modulos/tour.js)
   ---------------------------------------------------------------------
   No computador (1366) e no celular (390): cada passo recorta o alvo de verdade (menu, Painel, Lançamentos, perfil,
   AssistONE), o balão fica na tela e não cobre o alvo, se move de um alvo para o outro, a seta aponta; teclado (→ ← Esc),
   foco preso no balão; alvo que não existe → balão no meio só naquele passo; o fim marca o tutorial como visto.
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
    for (let i = 0; i < 5; i++) {
      await p.waitForTimeout(500);
      const m = await p.evaluate(() => {
        const R = (e) => { const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height }; };
        const furo = document.querySelector('.tour-furo'), bal = document.querySelector('.tour-balao');
        const sels = Tour.PASSOS[Number(document.querySelector('.tour-n').textContent.split('/')[0]) - 1].alvo;
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
      if (i < 4) await p.keyboard.press('ArrowRight');
    }
    ok(new Set(posicoes.map((x) => Math.round(x.left) + ',' + Math.round(x.top))).size >= 3, vp.width + ': o balão foi para lugares diferentes (um por alvo)');
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('.tour-n').textContent) === '4 / 5', vp.width + ': ← volta um passo');
    /* foco preso: Tab várias vezes continua dentro do balão */
    for (let k = 0; k < 6; k++) await p.keyboard.press('Tab');
    ok(await p.evaluate(() => !!document.activeElement.closest('.tour-balao')), vp.width + ': Tab não sai do balão');
    /* alvo que não existe: balão no meio, só naquele passo */
    await p.evaluate(() => { document.getElementById('assistOne').classList.add('hidden'); Tour.ir(4); });
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
    ok(erros.length === 0, vp.width + ': sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
    await ctx.close();
  }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
