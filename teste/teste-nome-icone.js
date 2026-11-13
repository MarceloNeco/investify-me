/* =====================================================================
   teste/teste-nome-icone.js — 3.66.1: o nome "MoneyTRIO" na aba e no app instalado, e o ícone novo
   Confere: <title> e og:title = "MoneyTRIO" (em PT e em EN); o manifest (name, short_name, ícones 192, 512 e maskable);
   os arquivos dos ícones existem, são PNG do tamanho certo e o sw.js guarda todos para o modo sem internet.
   Uso: node teste/teste-nome-icone.js
   ===================================================================== */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const R = path.join(__dirname, '..');
let oks = 0, falhas = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const png = (f) => { const b = fs.readFileSync(path.join(R, f)); return b.slice(1, 4).toString() === 'PNG' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null; };
(async () => {
  const html = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
  ok(/<title>MoneyTRIO<\/title>/.test(html) && /property="og:title" content="MoneyTRIO"/.test(html), '<title> e og:title: "MoneyTRIO", sem frase');
  ok(/rel="icon" href="icone\.svg"/.test(html) && /rel="icon" href="icone-32\.png"/.test(html), 'favicon: icone.svg, com o icone-32.png de reserva');
  const m = JSON.parse(fs.readFileSync(path.join(R, 'manifest.json'), 'utf8'));
  ok(m.name === 'MoneyTRIO' && m.short_name === 'MoneyTRIO', 'manifest: name e short_name "MoneyTRIO"');
  const ic = {}; m.icons.forEach((i) => { ic[i.purpose + ':' + i.sizes] = i.src; });
  ok(ic['any:192x192'] === 'icone-192.png' && ic['any:512x512'] === 'icone-512.png' && ic['maskable:512x512'] === 'icone-512-maskable.png', 'manifest: 192, 512 e maskable separado');
  const tam = { 'icone-32.png': 32, 'icone-192.png': 192, 'icone-512.png': 512, 'icone-512-maskable.png': 512 };
  ok(Object.keys(tam).every((f) => { const d = png(f); return d && d[0] === tam[f] && d[1] === tam[f]; }), 'os PNG existem e têm o tamanho certo (32, 192, 512, 512)');
  const sw = fs.readFileSync(path.join(R, 'sw.js'), 'utf8');
  ok(['icone.svg', 'icone-32.png', 'icone-192.png', 'icone-512.png', 'icone-512-maskable.png'].every((f) => sw.indexOf("'./" + f + "'") >= 0), 'o sw.js guarda os ícones para o modo sem internet');
  /* no navegador, nos dois idiomas, o título continua "MoneyTRIO" e o favicon carrega */
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.join(R, 'index.html')); await p.waitForTimeout(800);
  const t1 = await p.title();
  await p.evaluate(() => { if (window.I18n && I18n.trocar) I18n.trocar('en'); else if (window.I18n) { I18n.atual = 'en'; if (typeof render === 'function') render(); } }); await p.waitForTimeout(300);
  const t2 = await p.title();
  const fav = await p.evaluate(() => new Promise((r) => { const i = new Image(); i.onload = () => r(i.naturalWidth > 0); i.onerror = () => r(false); i.src = 'icone.svg'; }));
  ok(t1 === 'MoneyTRIO' && t2 === 'MoneyTRIO' && fav, 'no navegador: título "MoneyTRIO" em PT e em EN; o favicon SVG carrega');
  await b.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
