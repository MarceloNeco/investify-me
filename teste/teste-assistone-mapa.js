/* =====================================================================
   teste/teste-assistone-mapa.js — 3.138: "Me mostra onde fica" do AssistONE: o mapa dos lugares (assistone-mapa.json), o
   data-ajuda de cada lugar e o AssistOne.irLugar. Dados FICTÍCIOS.
   Confere: o JSON (ids únicos em minúsculas e hífen, nome e dica em pt/en/es, palavras sem acento e com 2+ palavras); para CADA
   lugar, depois de AssistOne.irLugar(lugar), existe UM elemento visível com data-ajuda = id (ou alvo) — com o app vazio e com
   dados, no celular (390) e no computador (1366); o irLugar não clica em nada (nenhum modal abre); o sw.js guarda o mapa.
   Uso: node teste/teste-assistone-mapa.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const VAZIO = { v: 1, config: {}, gastos: [], posicoes: [], recorrentes: [] };
const CHEIO = { v: 1, config: {}, posicoes: [{ id: 'p1', ticker: 'EXMP3', nome: 'Exemplo', tipo: 'acao-br', inst: 'Corretora Exemplo', qtd: 10, pm: 10, moeda: 'BRL' }],
  gastos: [{ id: 'g1', data: '2026-11-10', valor: 50, desc: 'PADARIA EXEMPLO', fluxo: 'saida', grupo: 'HABITACAO', sub: 'Mercado' }, { id: 'g2', data: '2026-11-05', valor: 3000, desc: 'SALARIO EXEMPLO', fluxo: 'entrada', grupo: 'RENDA', sub: 'Salário' }],
  recorrentes: [{ id: 'r1', nome: 'Aluguel Exemplo', valor: 1000, fluxo: 'saida', grupo: 'HABITACAO', sub: 'Aluguel', regra: 'dia', dia: 10, ativo: true }] };

(async () => {
  console.log('1) o arquivo');
  const M = JSON.parse(fs.readFileSync(path.join(RAIZ, 'assistone-mapa.json'), 'utf8'));
  const L = M.lugares || [];
  ok(M.app === 'moneytrio' && M.versao === 1 && L.length >= 15, 'JSON válido, app moneytrio, versão 1, ' + L.length + ' lugares');
  const ids = L.map((g) => g.id);
  ok(new Set(ids).size === ids.length && ids.every((i) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(i)), 'ids únicos, em minúsculas e hífen');
  ok(L.every((g) => ['budget', 'investify', 'tax', 'hub', null].includes(g.modulo) && (g.tela === null || typeof g.tela === 'string')), 'modulo budget|investify|tax|hub|null; tela = id da view ou null');
  ok(L.every((g) => ['pt', 'en', 'es'].every((k) => g.nome[k] && g.dica[k])), 'nome e dica em pt, en e es');
  const ruins = []; L.forEach((g) => ['pt', 'en', 'es'].forEach((k) => (g.palavras[k] || []).forEach((f) => { if (f.trim().split(/\s+/).length < 2 || /[^\x20-\x7e]/.test(f) || f !== f.toLowerCase()) ruins.push(g.id + ':' + f); })));
  ok(L.every((g) => g.palavras.pt && g.palavras.pt.length) && !ruins.length, 'palavras: frases de 2+ palavras, minúsculas, sem acento' + (ruins.length ? ' — ' + ruins.join(', ') : ''));
  ok(!/@|cpf|\b\d{3}\.\d{3}\.\d{3}/i.test(JSON.stringify(M)), 'nenhum dado de pessoa no mapa');
  ok(/'\.\/assistone-mapa\.json'/.test(fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8')), 'o sw.js guarda o mapa (funciona sem internet)');

  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    for (const [rot, dados, vw] of [['vazio, celular', VAZIO, 390], ['com dados, celular', CHEIO, 390], ['com dados, computador', CHEIO, 1366]]) {
      console.log('2) cada lugar — ' + rot);
      const ctx = await b.newContext({ viewport: { width: vw, height: 844 }, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(dados));
      const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof AssistOne !== 'undefined');
      await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); });
      await p.waitForFunction(() => AssistOne.mapa && AssistOne.mapa.length > 0, null, { timeout: 10000, polling: 200 });
      const r = await p.evaluate(async () => {
        const out = [], m0 = [...document.querySelectorAll('.modal:not(.hidden)')].length;
        for (const g of AssistOne.mapa) {
          if (window.mostrarHub) mostrarHub();   /* cada lugar parte do Início */
          await AssistOne.irLugar(g);
          const els = [...document.querySelectorAll('[data-ajuda="' + (g.alvo || g.id) + '"]')];
          const vis = els.filter((e) => { const b = e.getBoundingClientRect(), cs = getComputedStyle(e); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('.hidden'); });
          const modal = [...document.querySelectorAll('.modal:not(.hidden)')].length - m0;
          out.push({ id: g.id, n: els.length, vis: vis.length, modal });
        }
        return out;
      });
      const ruim = r.filter((x) => x.vis !== 1 || x.n !== 1);
      ok(!ruim.length, 'os ' + r.length + ' lugares: depois do irLugar, um único elemento visível com o data-ajuda' + (ruim.length ? ' — falharam: ' + JSON.stringify(ruim) : ''));
      ok(r.every((x) => x.modal === 0), 'o irLugar só leva até a tela: nenhuma janela abriu (nada foi clicado)');
      ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
