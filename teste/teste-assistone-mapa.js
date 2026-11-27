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
        const out = [], m0 = [...document.querySelectorAll('.modal-wrap:not(.hidden)')].length;
        for (const g of AssistOne.mapa) {
          if (window.mostrarHub) mostrarHub();   /* cada lugar parte do Início */
          await AssistOne.irLugar(g);
          const els = [...document.querySelectorAll('[data-ajuda="' + (g.alvo || g.id) + '"]')];
          const vis = els.filter((e) => { const b = e.getBoundingClientRect(), cs = getComputedStyle(e); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('.hidden'); });
          const modal = [...document.querySelectorAll('.modal-wrap:not(.hidden)')].length - m0;
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

    console.log('3) ponta a ponta: "como eu lanço um gasto?" → "Me mostra onde fica" (celular)');
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(CHEIO));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    let dialogo = 'dismiss', dialogos = 0; p.on('dialog', (d) => { dialogos++; d[dialogo](); });
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof AssistOne !== 'undefined' && AssistOne.vis);
    await p.waitForFunction(() => AssistOne.mapa && AssistOne.mapa.length > 0, null, { timeout: 10000, polling: 200 });
    await p.evaluate(() => {
      I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = true; AssistOne.aplicar(); mostrarHub();
      if (window.AssistHermes) AssistHermes.disponivel = () => true;   /* o "Perguntar" aparece (a IA liberada) */
      window.__cliques = 0; document.addEventListener('click', (ev) => { if (ev.target.closest('[data-ajuda="lanc-novo"]')) window.__cliques++; }, true);
      AssistOne.abrir();
    });
    const menu = await p.evaluate(() => [...document.querySelectorAll('.aov-lista [data-aov]')].map((e) => e.dataset.aov));
    ok(menu.length === 5 && menu[0] === 'perguntar' && !/Me mostra/.test(await p.textContent('.aov-lista')), 'o menu do AssistONE continua com os mesmos 5 itens: ' + menu.join(', '));
    const aberta = async () => p.evaluate(() => AssistOne.vis.aberto() && AssistOne.vis.vista() === 'conversa' && /como eu lanço um gasto\?/.test(document.querySelector('.aov-msgs').textContent));
    await p.evaluate(() => AssistOne.vis.conversa({ titulo: 'Perguntar ao assistente', enviar: () => Promise.resolve({ id: 1, resposta: 'Use o botão de novo lançamento.' }) }));
    await p.fill('.aov-ta', 'como eu lanço um gasto?'); await p.press('.aov-ta', 'Enter');
    await p.waitForSelector('.aov-mostra[data-lugar="lanc-novo"]', { timeout: 5000 });
    ok(await p.evaluate(() => !!document.querySelector('.aov-msgs .aov-mostra')), '"Me mostra onde fica" é um link DENTRO da conversa, depois da resposta');
    const m0 = await p.evaluate(() => document.querySelectorAll('.modal-wrap:not(.hidden)').length);
    const mostrar = async () => { await p.click('.aov-mostra[data-lugar="lanc-novo"]'); await p.waitForSelector('.aov-destaque.aov-dest-on .aov-furo', { timeout: 6000 }); await p.waitForTimeout(400); };
    await mostrar();
    const d = await p.evaluate(() => { const f = document.querySelector('.aov-furo').getBoundingClientRect(), e = [...document.querySelectorAll('[data-ajuda="lanc-novo"]')].find((x) => x.getBoundingClientRect().width > 0).getBoundingClientRect();
      return { volta: f.left <= e.left && f.top <= e.top && f.right >= e.right && f.bottom >= e.bottom, painel: AssistOne.vis.aberto(), tela: Assist.telaAtual(), modais: document.querySelectorAll('.modal-wrap:not(.hidden)').length, cliques: window.__cliques }; });
    ok(d.volta && !d.painel && d.tela === 'b-lanc', 'leva até Lançamentos e o furo (.aov-furo) fica em volta do [data-ajuda="lanc-novo"]; o painel fecha (' + JSON.stringify(d) + ')');
    ok(d.modais === m0 && d.cliques === 0, 'nada foi clicado sozinho (nenhuma janela abriu)');
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => !document.querySelector('.aov-destaque')) && await aberta() && await p.evaluate(() => window.__cliques === 0), 'Esc: o escuro sai e a conversa reabre com a pergunta');
    await mostrar();
    const canto = await p.evaluate(() => { const f = document.querySelector('.aov-furo').getBoundingClientRect(), b = document.querySelector('.aov-dbalao').getBoundingClientRect();
      for (const [x, y] of [[6, 6], [6, 838], [384, 838], [384, 6]]) { const fora = (r) => x < r.left || x > r.right || y < r.top || y > r.bottom; if (fora(f) && fora(b)) return [x, y]; } return null; });
    await p.mouse.click(canto[0], canto[1]); await p.waitForTimeout(300);
    ok(await p.evaluate(() => !document.querySelector('.aov-destaque')) && await aberta() && await p.evaluate(() => window.__cliques === 0 && document.querySelectorAll('.modal-wrap:not(.hidden)').length === 0), 'tocar no escuro: o destaque some e a conversa reabre com a pergunta, sem clicar em nada');

    console.log('4) algo não salvo');
    await p.evaluate(() => { AssistOne.fechar(); mostrarHub(); $('#genTitle').textContent = 'Teste'; $('#genBody').innerHTML = '<input id="zzCampo" value="">'; abrir('genModal'); });
    await p.fill('#zzCampo', 'texto não salvo');
    const antes = await p.evaluate(() => Assist.telaAtual());
    dialogo = 'dismiss'; dialogos = 0;
    const r1 = await p.evaluate(async () => { const g = AssistOne.mapa.find((x) => x.id === 'lanc-novo'); return { r: await AssistOne.irLugar(g), mostrou: await AssistOne.vis.mostrarLugar(g) }; });
    const depois = await p.evaluate(() => ({ tela: Assist.telaAtual(), modal: !$('#genModal').classList.contains('hidden'), campo: $('#zzCampo') && $('#zzCampo').value, destaque: !!document.querySelector('.aov-destaque') }));
    ok(r1.r === false && r1.mostrou === 'ficou' && dialogos === 2, 'com algo não salvo, a pessoa escolhe ficar: irLugar devolve false (e o visual, "ficou")');
    ok(depois.tela === antes && depois.modal && depois.campo === 'texto não salvo' && !depois.destaque, 'a tela não muda, a janela e o texto continuam, e não há destaque');
    dialogo = 'accept';
    const r2 = await p.evaluate(async () => AssistOne.irLugar(AssistOne.mapa.find((x) => x.id === 'lanc-novo')));
    ok(r2 === true && await p.evaluate(() => $('#genModal').classList.contains('hidden') && Assist.telaAtual() === 'b-lanc'), 'escolhendo sair: a janela fecha e vai até o lugar (true)');
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
    await ctx.close();
  } finally { await b.close(); srv.close(); }
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
