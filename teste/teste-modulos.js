/* =====================================================================
   teste/teste-modulos.js — a base dos módulos (3.41) (Node + Chromium headless, Playwright)
   1) Coerência (sem navegador): todo <script src="…?v=…"> do index.html está no ARQUIVOS do sw.js com o
      MESMO ?v=; a versão do ?v= aparece no cabeçalho do próprio arquivo; todo modulos/*.js (menos _*.js)
      está ligado no index.html.
   2) No navegador (modo "só neste aparelho"): registrar, pontos, ações (data-acao), telas, eventos,
      erro dentro de módulo não derruba o app, id e coleção repetidos são recusados, e a coleção de um
      módulo entra na nuvem (mapear/reconstruir) como as outras.
   Uso (na pasta raiz): node teste/teste-modulos.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };

console.log('1) coerência index.html × sw.js × arquivos');
const idx = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
const arquivos = (sw.match(/var ARQUIVOS = \[([\s\S]*?)\];/) || [])[1] || '';
const scripts = [...idx.matchAll(/<script src="([^"]+)"/g), ...idx.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]).filter((s) => !/^recursos\.js/.test(s));   /* 3.48: o estilo.css também */
ok(scripts.length >= 2, 'index.html carrega ' + scripts.length + ' arquivos com versão');
scripts.forEach((s) => {
  const [arq, q] = s.split('?v=');
  ok(!!q, s + ': tem ?v=');
  ok(arquivos.includes("'./" + s + "'"), s + ': está no sw.js com o mesmo ?v=');
  const cab = fs.readFileSync(path.join(RAIZ, arq), 'utf8').split('\n').slice(0, 6).join('\n');
  ok(cab.includes(q), arq + ': o cabeçalho do arquivo diz a versão ' + q);
});
fs.readdirSync(path.join(RAIZ, 'modulos')).filter((f) => f.endsWith('.js') && !f.startsWith('_')).forEach((f) => {
  ok(scripts.some((s) => s.startsWith('modulos/' + f + '?')), 'modulos/' + f + ' está ligado no index.html');
});
fs.readdirSync(path.join(RAIZ, 'modulos')).filter((f) => f.endsWith('.js') && !f.startsWith('_')).forEach((f) => {
  const src = fs.readFileSync(path.join(RAIZ, 'modulos', f), 'utf8');
  [...src.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)].forEach((m) => {
    const choca = new RegExp('^(?:const|let|var|function|class)\\s+' + m[1] + '\\b', 'm').test(idx);
    ok(!choca, 'modulos/' + f + ': o nome window.' + m[1] + ' não existe no index.html (senão o do app esconde o do módulo)');
  });
});
const pos = (s) => idx.indexOf('<script src="' + s);
ok(idx.indexOf('<style') < 0 && /^const FRASES_EN = \{/m.test(fs.readFileSync(path.join(RAIZ, 'textos/frases-en.js'), 'utf8')) && /^const MUDANCAS = \[/m.test(fs.readFileSync(path.join(RAIZ, 'textos/mudancas.js'), 'utf8')) && !/^const (?:FRASES_EN|MUDANCAS)\b/m.test(idx), '3.48: CSS, FRASES_EN e MUDANCAS moram fora do index.html');
ok(!/^const (?:GLOSSARIO|COACH)\b/m.test(idx) && /^const GLOSSARIO = \[/m.test(fs.readFileSync(path.join(RAIZ, 'textos/glossario.js'), 'utf8')) && /^const COACH = \[/m.test(fs.readFileSync(path.join(RAIZ, 'textos/coach.js'), 'utf8')) && pos('textos/glossario.js') < idx.indexOf('const GLOS_MAP') && pos('textos/coach.js') < idx.indexOf('const COACH_MAP'), '3.51: GLOSSARIO e COACH moram em textos/ e carregam antes de quem usa');
ok(pos('textos/frases-en.js') > 0 && pos('textos/frases-en.js') < idx.indexOf('const Verter') && pos('textos/mudancas.js') > 0 && pos('textos/mudancas.js') < idx.indexOf('const VERSAO = MUDANCAS[0].v'), 'ordem: frases-en antes do Verter; mudancas antes da VERSAO');
ok(pos('modulos/base.js') > 0 && pos('modulos/base.js') < pos('nuvem.js') && scripts.filter((s) => s.startsWith('modulos/') && !s.startsWith('modulos/base.js')).every((s) => pos(s) > pos('modulos/base.js') && pos(s) < pos('nuvem.js')), 'ordem: base, módulos, nuvem');

(async () => {
  const srv = http.createServer((q, s) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'application/octet-stream' }); fs.createReadStream(p).pipe(s); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch();
  try {
    console.log('2) no navegador');
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript(() => { localStorage.setItem('moneytrio.soNesteAparelho', '1'); });
    const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.MoneyModulos);
    const r = await p.evaluate(() => {
      const ev = [];
      MoneyModulos.registrar({ id: 'teste-mod', versao: '9.9.9', colecoes: ['teste_itens'],
        pontos: { 'x.ponto': (c) => '<b id="tm">' + c.n + '</b>', 'x.quebra': () => { throw new Error('de propósito'); } },
        acoes: { 'tm-fazer': (el, d) => { (window.__tmEv = window.__tmEv || []).push('acao:' + d.extra); } },
        telas: { 'x-teste': { app: 'budget', render: () => '<h1 id="tmTela">tela do módulo</h1>' } },
        ouvir: { 'algo': (d) => ev.push('ouviu:' + d) } });
      let dupId = false, dupCol = false;
      try { MoneyModulos.registrar({ id: 'teste-mod' }); } catch (e) { dupId = true; }
      try { MoneyModulos.registrar({ id: 'outro-mod', colecoes: ['teste_itens'] }); } catch (e) { dupCol = true; }
      MoneyModulos.emitir('algo', 'oi');
      return { html: MoneyModulos.html('x.ponto', { n: 7 }), quebra: MoneyModulos.html('x.quebra'), vazio: MoneyModulos.html('nao.existe'),
               dupId, dupCol, ev, cols: MoneyModulos.colecoes(), lista: MoneyModulos.lista().map((m) => m.id) };
    });
    ok(r.html === '<b id="tm">7</b>' && r.vazio === '', 'ponto de encaixe devolve o html do módulo ("" quando ninguém usa)');
    ok(r.quebra === '', 'erro dentro do módulo não derruba o app (vira aviso no console)');
    ok(r.dupId && r.dupCol, 'id repetido e coleção de outro módulo são recusados');
    ok(r.ev.includes('ouviu:oi'), 'eventos chegam a quem ouve');
    ok(r.cols.includes('teste_itens') && r.lista.includes('teste-mod'), 'coleções e lista dos módulos');
    /* ação pelo clique (data-acao), pelo switch do app */
    await p.evaluate(() => { const b2 = document.createElement('button'); b2.id = 'tmBt'; b2.dataset.acao = 'tm-fazer'; b2.dataset.extra = 'x1'; document.body.appendChild(b2); });
    await p.click('#tmBt');
    ok(await p.evaluate(() => (window.__tmEv || []).join()) === 'acao:x1', 'clique em data-acao do módulo chega à ação dele (com os data-*)');
    /* tela do módulo */
    await p.evaluate(() => { abrirApp('budget'); irPara('x-teste'); });
    await p.waitForSelector('#view-x-teste #tmTela');
    ok(await p.isVisible('#tmTela'), 'tela do módulo abre pelo irPara, sem mexer no index.html');
    /* nuvem: a coleção do módulo vira um registro por item, e volta */
    const nv = await p.evaluate(() => {
      const est = Object.assign({}, Store.estado, { teste_itens: [{ id: 'a1', v: 1 }, { id: 'a2', v: 2 }] });
      const m = MoneyNuvem._teste.mapear(est);
      const regs = []; m.forEach((v, k) => { const [col, id] = k.split('|'); regs.push([col, id, JSON.parse(v)]); });
      const volta = MoneyNuvem._teste.reconstruir(regs);
      return { k: Array.from(m.keys()).filter((k) => k.startsWith('teste_itens|')), volta: (volta.teste_itens || []).map((x) => x.id), naConfig: m.has('config|teste_itens') };
    });
    ok(nv.k.length === 2 && !nv.naConfig, 'na nuvem, a coleção do módulo vira um registro por item (não vai para config)');
    ok(nv.volta.join() === 'a1,a2', 'e volta inteira ao abrir');
    ok(erros.length === 0, 'sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
    await ctx.close();
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
