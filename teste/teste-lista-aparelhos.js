/* =====================================================================
   teste/teste-lista-aparelhos.js — 3.106.1: a lista "Seus aparelhos" que o dono achou confusa (nuvem.js 1.15.8)
   ---------------------------------------------------------------------
   Com aparelhos FICTÍCIOS parecidos com o caso real (3 linhas "Seu celular (Chrome) · MoneyTRIO" e 1 "navegador da Samsung ·
   OmniLifeONE"): a lista se divide em "No MoneyTRIO" e "Em outros apps SolverONE" (com "a mesma conta e o mesmo PIN valem nos dois");
   o aprovado que nunca terminou de entrar (visto = criado, há mais de 1 h) diz isso e tem "Tirar da lista"; o mesmo celular mais de
   uma vez ganha a dica; aberto dentro de outro app, o nome do aparelho é "Android · dentro de outro app" e a tela de entrada explica.
   Uso: node teste/teste-lista-aparelhos.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos: [], recorrentes: [] };
const H = (h) => new Date(Date.now() - h * 3600000).toISOString();
const LISTA = [
  { id: 'ap-pc', nome: 'Windows · Chrome', app: 'moneytrio', criado_em: H(400), visto_em: H(0.01) },
  { id: 'ap-cel1', nome: 'Android · Chrome', app: 'moneytrio', criado_em: H(300), visto_em: H(2) },
  { id: 'ap-cel2', nome: 'Android · Chrome', app: 'moneytrio', criado_em: H(4), visto_em: H(4) },     /* aprovado, nunca terminou */
  { id: 'ap-cel3', nome: 'Android · Chrome', app: 'moneytrio', criado_em: H(320), visto_em: H(310) }, /* antigo, sem a chave */
  { id: 'ap-sam', nome: 'Android · Samsung', app: 'omnilife', criado_em: H(500), visto_em: H(3) }
];

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
    p.on('dialog', (d) => { p.ultimoDialogo = d.message(); d.accept(); });
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && window.MoneyNuvem && MoneyNuvem._teste);
    const desenhar = () => p.evaluate((l) => { const T = MoneyNuvem._teste; window.__tirados = [];
      T.Aparelhos.lista = async () => l.filter((a) => window.__tirados.indexOf(a.id) < 0); T.Aparelhos.rpc = async (f, a) => { if (f === 'sol_aparelho_tirar') window.__tirados.push(a.p_id); return true; };
      let el = document.getElementById('tPainel'); if (!el) { el = document.createElement('div'); el.id = 'tPainel'; el.innerHTML = '<div id="nvAps"></div>'; document.body.appendChild(el); }
      return T.Painel.aparelhos(el, { ap: 'ap-pc' }); }, LISTA);
    await p.evaluate(() => { I18n.atual = 'pt'; }); await desenhar();
    const r = await p.evaluate(() => { const c = document.querySelector('#tPainel #nvAps'), hs = [...c.querySelectorAll('h3')].map((h) => h.textContent);
      const sec = (id) => { const out = []; let n = c.querySelector(id); while ((n = n && n.nextElementSibling) && n.tagName !== 'H3') if (n.classList.contains('nv-ap')) out.push(n.textContent); return out; };
      return { hs, mt: sec('#nvApsMt'), outros: sec('#nvApsOutros'), txt: c.textContent }; });
    ok(r.hs.join('|') === 'No MoneyTRIO|Em outros apps SolverONE', 'a lista se divide em "No MoneyTRIO" e "Em outros apps SolverONE"');
    ok(r.mt.length === 4 && r.outros.length === 1 && /Seu celular \(navegador da Samsung\) · OmniLifeONE/.test(r.outros[0]), 'os 4 do MoneyTRIO de um lado; o do navegador da Samsung no OmniLifeONE do outro');
    ok(/A mesma conta e o mesmo PIN valem nos dois\./.test(r.txt), '"A mesma conta e o mesmo PIN valem nos dois."');
    ok(/Seu celular \(Chrome\) aparece mais de uma vez: cada navegador \(ou o app aberto dentro de outro app\) conta como um aparelho\. Fique com o que você usa \(o mais recente\) e tire os outros\./.test(r.txt), 'a dica do mesmo celular mais de uma vez');
    const nunca = await p.evaluate(() => [...document.querySelectorAll('#tPainel .nv-ap.nunca')].map((e) => ({ id: e.getAttribute('data-ap'), t: e.textContent })));
    ok(nunca.length === 1 && nunca[0].id === 'ap-cel2' && /aprovado em .*, mas nunca terminou de entrar/.test(nunca[0].t) && /Tirar da lista/.test(nunca[0].t), 'só o aprovado há 4 h e nunca visto depois: "aprovado em …, mas nunca terminou de entrar" + "Tirar da lista"');
    ok(await p.evaluate(() => !document.querySelector('#tPainel [data-ap="ap-cel3"]').classList.contains('nunca') && /não aparece desde/.test(document.querySelector('#tPainel [data-ap="ap-cel3"]').textContent)), 'o antigo (visto depois de criado) continua "não aparece desde"');
    await p.click('#tPainel .nv-ap.nunca [data-tirar]'); await p.waitForTimeout(300);
    ok(/Ele nunca chegou a entrar/.test(p.ultimoDialogo || '') && await p.evaluate(() => window.__tirados.join() === 'ap-cel2' && !document.querySelector('#tPainel [data-ap="ap-cel2"]')), '"Tirar da lista" (confirmação simples) tira só ele');
    for (const [l, rx] of [['en', /In MoneyTRIO.*In other SolverONE apps/], ['es', /En MoneyTRIO.*En otras apps SolverONE/]]) {
      await p.evaluate((x) => { I18n.atual = x; }, l); await desenhar();
      ok(rx.test(await p.textContent('#tPainel #nvAps')), l.toUpperCase() + ': as duas partes traduzidas');
    }
    await p.evaluate(() => { I18n.atual = 'pt'; });
    await ctx.close();

    console.log('dentro de outro app');
    const c2 = await b.newContext({ viewport: { width: 400, height: 860 }, serviceWorkers: 'block', userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X000; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Mobile Safari/537.36' });
    await c2.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    const q = await c2.newPage(); await q.goto(BASE + '/'); await q.waitForFunction(() => window.AbrirChrome && window.MoneyNuvem);
    await q.waitForSelector('#acChrome', { timeout: 20000 }).catch(() => {});
    ok(/Aqui dentro o app não fica guardado igual ao Chrome\. Abra no Chrome e instale na tela inicial/.test(await q.textContent('#acChrome').catch(() => '')), 'a tela de entrada: "Aqui dentro o app não fica guardado igual ao Chrome. Abra no Chrome e instale na tela inicial"');
    const nome = await q.evaluate(() => { const T = MoneyNuvem._teste; return T.nomeAparelho ? T.nomeAparelho() : null; });
    ok(nome === 'Android · dentro de outro app', 'o nome deste aparelho na lista: "' + nome + '"');
    ok(!erros.length, 'sem erro na página ' + erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
