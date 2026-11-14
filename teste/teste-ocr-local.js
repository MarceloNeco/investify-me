/* =====================================================================
   teste/teste-ocr-local.js — 3.88 (N70): o Ocr.texto (foto de cupom, apólice, documento do banco) lê com o motor de
   leitor/tesseract/ SEM internet: o trabalhador, o núcleo e o português vêm do aparelho, nos dois caminhos (o simples e
   o com psm/lote). A imagem é desenhada aqui (texto fictício). Toda requisição para fora é bloqueada e contada.
   Uso: node teste/teste-ocr-local.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch(), fora = [];
  try {
    const ctx = await b.newContext({ serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => { const u = r.request().url(); if (u.startsWith(BASE)) return r.continue(); fora.push(u); return r.abort(); });
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Ocr !== 'undefined');
    const r = await p.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 1100; c.height = 220; const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#000'; x.font = '40px Arial';
      x.fillText('MERCADO FICTICIO', 30, 80); x.fillText('VALOR TOTAL R$ 236,00', 30, 160);
      const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
      const out = {};
      try { out.simples = await Ocr.texto(blob, () => {}); } catch (e) { out.simples = 'ERRO ' + (e && e.message || e); }
      try { out.psm = await Ocr.texto(blob, () => {}, { psm: '6', lote: true }); await Ocr.fecharLote(); } catch (e) { out.psm = 'ERRO ' + (e && e.message || e); }
      out.origem = Ocr.origem; out.idioma = Ocr.idioma();
      return out;
    });
    ok(r.origem === 'local' && r.idioma === 'por', 'o motor veio de leitor/tesseract/ e lê em português (o que está no aparelho)');
    ok(/236,00/.test(r.simples) && /MERCADO/.test(r.simples), 'o caminho simples (foto de cupom, apólice) lê sem internet: ' + JSON.stringify(r.simples.trim()));
    ok(/236,00/.test(r.psm), 'o caminho com psm/lote (documento do banco) também: ' + JSON.stringify(r.psm.trim()));
    ok(!fora.some((u) => /tesseract|jsdelivr|cdnjs|unpkg/.test(u)), 'nenhuma busca do trabalhador, do núcleo ou do idioma na CDN' + (fora.length ? ': ' + fora.filter((u) => /tesseract|jsdelivr|cdnjs/.test(u)).join(' ') : ''));
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
