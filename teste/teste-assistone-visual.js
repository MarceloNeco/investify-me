/* =====================================================================
   teste/teste-assistone-visual.js — 3.110: o AssistONE de visual novo no MoneyTRIO
   ---------------------------------------------------------------------
   O personagem e o menu vêm do master (assistone/, cópia de MarceloNeco/assist-one balao/visual/; o teste do master
   confere o resto: 44 px, Esc, reduzir movimento, aba escondida…). Aqui: o encaixe no app. Celular e computador; menu na
   ordem aprovada com "Você está em" e o nome da tela; "Ajuda desta tela" dentro do painel com os atalhos; Começar,
   Tour rápido e Procurar algo abrem o que já existia; "Ajuda e tutorial" do menu da conta abre o mesmo menu e religa o
   AssistONE; "Desligar"; o tema claro do app vira Pérola; o personagem não fica por cima da folha nem do painel.
   Dados fictícios. Uso: node teste/teste-assistone-visual.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos: [], recorrentes: [] };
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  const aberto = (p) => p.evaluate(() => document.querySelector('#assistOne .ao-btn').getAttribute('aria-pressed') === 'true');
  try {
    for (const [nome, vp] of [['celular', { width: 390, height: 844 }], ['computador', { width: 1366, height: 900 }]]) {
      console.log(nome);
      const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
      const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && AssistOne.vis);
      await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = true; AssistOne.aplicar(); abrirApp('budget'); irPara('b-painel'); render(); });
      ok(await p.isVisible('#assistOne .ao-btn'), 'o personagem novo está no canto (no lugar do "?" antigo)');
      ok(!(await p.$('#assistFab')), 'o botão antigo saiu');
      await p.click('#assistOne .ao-btn'); await p.waitForTimeout(500);
      ok(await aberto(p), 'tocar no personagem abre o menu');
      const ops = await p.$$eval('#assistBalao [data-aov]', (l) => l.map((e) => e.dataset.aov));
      ok(ops.join(',') === 'comecar,tour,procurar,ajuda_tela', 'menu na ordem aprovada (sem login, sem o Perguntar): ' + ops.join(', '));
      ok(await p.evaluate(() => /Você está em\s*Painel do BudgetONE/.test(document.querySelector('.aov-ctx').textContent)), '"Você está em" com o nome da tela (Painel do BudgetONE)');
      const sobre = await p.evaluate(() => { const c = document.querySelector('#assistOne .ao-cw').getBoundingClientRect(), pa = document.querySelector('.aov-painel');
        const topo = innerHeight - pa.offsetHeight, esq = innerWidth - pa.offsetWidth;
        return innerWidth >= 900 ? c.right <= esq + 1 : c.bottom <= topo + 1; });
      await p.waitForTimeout(500);
      ok(sobre || await p.evaluate(() => { const c = document.querySelector('#assistOne .ao-cw').getBoundingClientRect(), pa = document.querySelector('.aov-painel');
        return innerWidth >= 900 ? c.right <= innerWidth - pa.offsetWidth + 1 : c.bottom <= innerHeight - pa.offsetHeight + 1; }), 'o personagem não fica por cima do menu');
      if (nome === 'celular') ok(await p.evaluate(() => { const c = document.querySelector('.aov-corpo'); return c.scrollHeight <= c.clientHeight + 1; }), 'folha do celular: tudo cabe, sem rolar');

      await p.click('[data-aov="ajuda_tela"]'); await p.waitForTimeout(150);
      ok(await aberto(p) && await p.textContent('.aov-tit') === 'Ajuda desta tela' && await p.textContent('.aov-sub') === 'Painel do BudgetONE', '"Ajuda desta tela" abre dentro do painel, com o nome da tela');
      const atalhos = await p.$$eval('.aov-atalhos [data-acao]', (l) => l.map((e) => e.dataset.acao));
      ok(atalhos.length > 0, 'os atalhos da tela aparecem (' + atalhos.join(', ') + ')');
      await p.click('.aov-voltar'); await p.waitForTimeout(100);
      ok((await p.$$eval('#assistBalao [data-aov]', (l) => l.length)) === 4, '"Voltar ao menu" volta ao menu');

      await p.click('[data-aov="comecar"]'); await p.waitForTimeout(300);
      ok(!(await aberto(p)) && await p.evaluate(() => !$('#assistModal').classList.contains('hidden') && assistAba === 'comecar'), '"Começar" fecha o menu e abre o Começar de sempre');
      await p.evaluate(() => Assist.fechar()); await p.waitForTimeout(200);
      await p.click('#assistOne .ao-btn'); await p.waitForTimeout(400);
      await p.click('[data-aov="tour"]'); await p.waitForTimeout(300);
      ok(!(await aberto(p)) && await p.evaluate(() => Tour.aberto()), '"Tour rápido" fecha o menu e começa o passeio da tela');
      await p.evaluate(() => Tour.fechar(false)); await p.waitForTimeout(200);
      await p.click('#assistOne .ao-btn'); await p.waitForTimeout(400);
      await p.click('[data-aov="procurar"]'); await p.waitForTimeout(300);
      ok(await p.evaluate(() => !$('#assistModal').classList.contains('hidden') && assistAba === 'buscar'), '"Procurar algo" abre a busca do AssistONE');
      await p.evaluate(() => Assist.fechar()); await p.waitForTimeout(200);

      await p.click('#assistOne .ao-btn'); await p.waitForTimeout(400);
      await p.click('.aov-ft [data-aov="desligar"]'); await p.waitForTimeout(200);
      ok(await p.evaluate(() => ST.config.assistOne === false && $('#assistOne').classList.contains('desligado')), '"Desligar o AssistONE" esconde o personagem');
      await p.evaluate(() => { const b = document.getElementById('btnPerfil') || document.querySelector('[aria-controls="perfilMenu"]'); b.click(); });
      await p.waitForTimeout(150);
      await p.click('#perfilMenu [data-pm="ajuda"], #perfilMenu button:has-text("Ajuda e tutorial")'); await p.waitForTimeout(500);
      ok(await p.evaluate(() => ST.config.assistOne === true) && await aberto(p), '"Ajuda e tutorial" do menu da conta religa e abre o mesmo menu (sem fechar no mesmo toque)');

      await p.evaluate(() => { ST.tema = 'light'; document.documentElement.setAttribute('data-theme', 'light'); });
      ok(await p.$eval('.aov-painel', (e) => getComputedStyle(e).backgroundColor) === 'rgb(247, 240, 224)', 'tema claro do app: o menu fica Pérola, com ele aberto');
      await p.keyboard.press('Escape'); await p.waitForTimeout(150);
      ok(!(await aberto(p)), 'Esc fecha');
      ok(!erros.length, 'nenhum erro de JavaScript' + (erros.length ? ': ' + erros.join(' | ') : ''));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
