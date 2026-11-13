/* =====================================================================
   teste/teste-portao-fundo.js — 3.72: as telas do portão (nuvem: entrar, PIN, bloqueado…; e a tela de senha antiga)
   mostram a MESMA imagem de fundo do app, com o mesmo escurecimento e o tema claro igual; respeitam html.sem-fundo;
   a imagem não é duplicada no estilo.css. Fotos em /tmp/portao-fundo-*.png. Uso: node teste/teste-portao-fundo.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };

(async () => {
  const css = fs.readFileSync(path.join(RAIZ, 'estilo.css'), 'utf8');
  ok((css.match(/data:image\/webp;base64/g) || []).length === 1, 'a imagem de fundo aparece uma vez só no estilo.css (--fundo-app)');
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    for (const tema of ['dark', 'light']) for (const [w, h] of [[1366, 800], [390, 844]]) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript(() => { localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); });
      const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.MoneyNuvem && MoneyNuvem._teste);
      const nome = tema + ' ' + w;
      const r = await p.evaluate((t) => {
        ST.tema = t; aplicarTema();
        MoneyNuvem._teste.Portao.mensagem('MoneyTRIO bloqueado', 'Você continua conectado. Só falta desbloquear.', [['OK', function () {}]]);
        const el = document.getElementById('nvPortao'), b4 = getComputedStyle(el, '::before'), af = getComputedStyle(el, '::after'), card = el.querySelector('.nv-card');
        const cb = getComputedStyle(card).backgroundColor, cor = getComputedStyle(card).color, body = getComputedStyle(document.body, '::before');
        return { img: b4.backgroundImage.slice(0, 40), mesma: b4.backgroundImage === body.backgroundImage, disp: b4.display, op: b4.opacity, bodyOp: body.opacity, grad: af.backgroundImage.slice(0, 30), cb, cor };
      }, tema);
      ok(/^url\("data:image\/webp/.test(r.img) && r.mesma && r.disp !== 'none' && r.op === r.bodyOp, nome + ': a tela do portão mostra a mesma imagem do fundo do app (opacidade ' + r.op + ', igual à do app)');
      ok(/linear-gradient/.test(r.grad), nome + ': com o mesmo escurecimento por cima');
      const alfa = Number((/rgba?\([^)]*,\s*([\d.]+)\)$/.exec(r.cb) || [0, 1])[1]);
      ok(alfa >= 0.85, nome + ': o cartão continua quase opaco (' + r.cb + '), o texto legível (' + r.cor + ')');
      await p.screenshot({ path: '/tmp/portao-fundo-' + w + '-' + tema + '.png' });
      const lw = await p.evaluate(() => { const d = document.createElement('div'); d.className = 'lock-wrap'; d.innerHTML = '<div class="lock-box">x</div>'; document.body.appendChild(d);
        const s = getComputedStyle(d, '::before').backgroundImage; d.remove(); return s.slice(0, 30); });
      ok(/^url\("data:image\/webp/.test(lw), nome + ': a tela de senha antiga (.lock-wrap) também');
      const sf = await p.evaluate(() => { document.documentElement.classList.add('sem-fundo'); const el = document.getElementById('nvPortao'); const r = getComputedStyle(el, '::before').display + '/' + getComputedStyle(el, '::after').display; document.documentElement.classList.remove('sem-fundo'); return r; });
      ok(sf === 'none/none', nome + ': com "sem fundo" ligado, a tela do portão também fica sem imagem');
      ok(erros.length === 0, nome + ': sem erro de página' + (erros.length ? ': ' + erros[0] : ''));
      await ctx.close();
    }
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
