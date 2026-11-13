/* =====================================================================
   teste/teste-topo-ia.js — 3.69: o ✨ da IA na barra de cima, ao lado da 🔍 (pedido do dono). A faixa do topo só
   aparece com anúncio ou com a tarja do modo de teste; sem nada disso, a linha some e o conteúdo sobe.
   Fotos em /tmp/topo-ia-*.png (1366 e 390, dois temas). Uso: node teste/teste-topo-ia.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos: [{ id: 'g1', data: new Date().toISOString().slice(0, 10), valor: 50, grupo: 'LAZER', sub: 'Cinema', desc: 'CINEMA TESTE', fluxo: 'saida' }], recorrentes: [] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    for (const [w, h] of [[1366, 768], [390, 844], [320, 640]]) for (const tema of ['dark', 'light']) {
      if (w === 320 && tema === 'light') continue;
      const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); }, JSON.stringify(LOCAL));
      const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Anuncio !== 'undefined');
      const nome = w + ' ' + tema;
      const r = await p.evaluate((t) => { I18n.atual = 'pt'; ST.tema = t; aplicarTema(); Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); Acesso.modo = 'admin'; abrirApp('budget'); render(); Anuncio.render(); medirTopo();
        const ia = document.getElementById('btnIA'), bu = document.getElementById('btnBusca'), tb = document.querySelector('.topbar').getBoundingClientRect(), ri = ia.getBoundingClientRect(), rb = bu.getBoundingClientRect();
        return { faixa: !!document.querySelector('#anuncioCaixa .faixa'), velho: !!document.querySelector('.faixa .ia-bt'), lado: ri.right <= rb.left + 1 && Math.abs(ri.top - rb.top) < 2, mesmo: Math.abs(ri.width - rb.width) < 2 && Math.abs(ri.height - rb.height) < 2,
          dentro: ri.left >= 0 && ri.right <= innerWidth, linha: tb.height, rolar: document.documentElement.scrollWidth <= innerWidth + 1, title: ia.title, acao: ia.dataset.acao, rec: ia.dataset.recurso, caixaH: document.getElementById('anuncioCaixa').getBoundingClientRect().height }; }, tema);
      ok(!r.faixa && !r.velho && r.caixaH === 0, nome + ': sem anúncio e sem modo de teste, a faixa some (0 px)');
      if (w < 360) {
        const m = await p.evaluate(() => { const ia = document.getElementById('btnIA'); alternarPerfilMenu(); const t = document.getElementById('perfilMenu').textContent; fecharPerfilMenu(); return { esc: getComputedStyle(ia).display === 'none', menu: /Perguntar à IA/.test(t) }; });
        ok(m.esc && m.menu && r.rolar && r.linha < 100, nome + ': tela estreita: o ✨ sai da barra e fica no menu 👤 ("✨ Perguntar à IA"); o topo continua numa linha (' + Math.round(r.linha) + ' px)');
      } else ok(r.lado && r.mesmo && r.dentro && r.rolar && r.linha < 100, nome + ': o ✨ fica na barra de cima, colado à esquerda da 🔍, do mesmo tamanho, dentro da tela; o topo numa linha só (' + Math.round(r.linha) + ' px)');
      /* com uma janela aberta, a página reserva o lugar da barra de rolagem: o topo não pode quebrar de linha (o fundo pularia) */
      const jan = await p.evaluate(() => { const h0 = document.querySelector('.topbar').getBoundingClientRect().height; abrirInfo((GLOSSARIO[0] || {}).k); const h1 = document.querySelector('.topbar').getBoundingClientRect().height; fechar('infoModal'); return [h0, h1]; });
      ok(Math.abs(jan[0] - jan[1]) < 1, nome + ': abrir uma janela não muda a altura do topo (' + jan.join(' → ') + ')');
      ok(r.title === 'Perguntar à IA sobre o que está na tela' && r.acao === 'ia-abrir' && r.rec === 'ia', nome + ': title, data-acao="ia-abrir" e data-recurso="ia" mantidos');
      if (w !== 320) await p.screenshot({ path: '/tmp/topo-ia-' + w + '-' + tema + '.png', clip: { x: 0, y: 0, width: w, height: 140 } });
      if (w === 1366 && tema === 'dark') {
        await p.click('#btnIA'); await p.waitForTimeout(150);
        ok(await p.evaluate(() => !document.getElementById('genModal').classList.contains('hidden') && /IA/.test(document.getElementById('genTitle').textContent)), 'tocar no ✨ abre a IA');
        await p.evaluate(() => fechar('genModal'));
        const off = await p.evaluate(() => { const o = Acesso.pode; Acesso.pode = () => false; Anuncio.render(); const r = document.getElementById('btnIA').classList.contains('ia-off'); Acesso.pode = o; Anuncio.render(); return r && !document.getElementById('btnIA').classList.contains('ia-off'); });
        ok(off, 'sem IA liberada para a conta, o ✨ fica no estado ia-off (e volta quando libera)');
        const vc = await p.evaluate(() => { Acesso.verComo = 'premium'; Anuncio.render(); const f = document.querySelector('#anuncioCaixa .faixa'); const r = { f: !!f, t: f ? f.textContent : '' }; Acesso.verComo = null; Anuncio.render(); return r; });
        ok(vc.f && /modo de teste/.test(vc.t), 'com o modo de teste, a faixa volta com a tarja (' + vc.t.trim() + ')');
        const an = await p.evaluate(() => { Acesso.verComo = 'visitante'; Anuncio.fechadoNaSessao = false; Anuncio.render(); const f = document.querySelector('#anuncioCaixa .faixa'); const r = !!(f && f.querySelector('.anuncio')); Acesso.verComo = null; Anuncio.render(); return r; });
        ok(an, 'com anúncio (conta que vê anúncio), a faixa aparece com o anúncio');
      }
      ok(erros.length === 0, nome + ': sem erro de página' + (erros.length ? ': ' + erros[0] : ''));
      await ctx.close();
    }
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
