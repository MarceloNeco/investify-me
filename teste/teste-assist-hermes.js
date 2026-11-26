/* =====================================================================
   teste/teste-assist-hermes.js — 3.107: "Perguntar ao assistente" no AssistONE (modulos/assist-hermes.js 1.0.1)
   ---------------------------------------------------------------------
   Confere, com a nuvem simulada (nenhuma chamada de verdade ao Supabase): sem login ou desligado, o item não aparece;
   ligado, aparece logo depois de "Ajuda desta tela", a pergunta vai com o nome da tela e o idioma, a resposta volta;
   limite e erro de rede viram mensagem clara; EN; nenhum erro de JavaScript. Dados fictícios.
   Uso: node teste/teste-assist-hermes.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos: [], recorrentes: [], cartoes: [{ id: 'c1', apelido: 'Cartao Ficticio', bandeira: 'master', fim: '1234', vence: 10, fecha: 3 }] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
    await p.clock.setFixedTime(new Date('2026-11-24T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.AssistIndice && window.AssistHermes);
    console.log('0) 3.109: na 1ª abertura do balão, com a conferência ainda a caminho, o item aparece sozinho');
    const primeira = await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial();
      MoneyNuvem.assist = { logado: () => true, disponivel: () => new Promise((r) => setTimeout(() => r(true), 400)) };
      ST.config.assistOne = true; AssistOne.aplicar(); AssistOne.abrir('tela');
      return [...document.querySelectorAll('#assistBalao [data-aov]')].map((b) => b.dataset.aov); });
    await p.waitForTimeout(900);
    const depois = await p.evaluate(() => ({ aberto: AssistOne.aberto, ops: [...document.querySelectorAll('#assistBalao [data-aov]')].map((b) => b.dataset.aov) }));
    ok(!primeira.includes('perguntar') && depois.aberto && depois.ops.includes('perguntar'), 'sem tocar em nada, "Perguntar ao assistente" entra no menu aberto quando a conferência chega');
    await p.evaluate(() => AssistOne.fechar());
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-painel'); render(); });
    const abrirMenu = () => p.evaluate(() => { ST.config.assistOne = true; AssistOne.aplicar(); AssistOne.abrir('tela');
      return [...document.querySelectorAll('#assistBalao [data-aov]')].map((b) => b.dataset.aov); });

    console.log('1) sem conta logada, o item não aparece');
    await p.evaluate(() => { MoneyNuvem.assist = { logado: () => false, disponivel: async () => true }; return AssistHermes.conferir(); });
    ok(!(await abrirMenu()).includes('perguntar'), 'sem login: o menu NÃO tem "Perguntar ao assistente"');
    ok((await abrirMenu()).includes('ajuda_tela'), 'o resto do menu continua igual (Ajuda desta tela)');

    console.log('2) com conta, mas desligado no assist_config, o item não aparece');
    await p.evaluate(() => { MoneyNuvem.assist = { logado: () => true, disponivel: async () => false }; return AssistHermes.conferir(); });
    ok(!(await abrirMenu()).includes('perguntar'), 'desligado: o menu NÃO tem o item');

    console.log('3) com conta e ligado: o item aparece, a pergunta vai e a resposta volta');
    await p.evaluate(() => { window.__enviado = null; let n = 0;
      MoneyNuvem.assist = { logado: () => true, disponivel: async () => true,
        perguntar: async (tela, txt, idioma) => { window.__enviado = { tela, txt, idioma }; return { ok: true, id: 5 }; },
        resposta: async () => (++n < 2 ? { estado: 'processando' } : { estado: 'respondida', resposta: 'Abra Configurações ⚙️ e toque em Conta.\nDepois em "Usar a digital".' }) };
      return AssistHermes.conferir(); });
    const menu = await abrirMenu();
    ok(menu.join(',') === 'perguntar,comecar,tour,procurar,ajuda_tela', '3.110: "Perguntar ao assistente" vem em primeiro, na ordem do desenho aprovado');
    await p.click('#assistBalao [data-aov="perguntar"]');
    await p.waitForSelector('#ahPergunta', { state: 'visible', timeout: 5000 }).catch(() => {});
    ok(await p.isVisible('#ahPergunta'), 'a caixinha da pergunta abre dentro do painel');
    ok(await p.evaluate(() => document.querySelector('.aov-tit').textContent === 'Perguntar ao assistente' && !document.querySelector('.aov-voltar').hidden && !document.getElementById('ahVoltar')), '3.110: título e "Voltar ao menu" no cabeçalho do painel (sem botões repetidos embaixo)');
    ok(/Não escreva valores, contas, senhas nem dados pessoais/.test(await p.textContent('#assistBalao')), 'o aviso de dados pessoais aparece');
    await p.fill('#ahPergunta', 'Como entro com a digital?');
    await p.click('#ahEnviar');
    await p.waitForFunction(() => /Usar a digital/.test((document.querySelector('#ahResposta') || {}).textContent || ''), null, { timeout: 15000 });
    const env = await p.evaluate(() => window.__enviado);
    ok(env && env.txt === 'Como entro com a digital?' && env.idioma === 'pt' && env.tela === 'Painel do BudgetONE', 'foi a pergunta, o idioma e o nome da tela (' + (env && env.tela) + ')');
    ok(/<br>/.test(await p.innerHTML('#ahResposta')), 'a resposta aparece com as quebras de linha');
    await p.click('.aov-voltar'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => AssistOne.aberto), 'depois de "Voltar ao menu" o painel continua aberto');
    ok((await p.evaluate(() => [...document.querySelectorAll('#assistBalao [data-aov]')].map((b) => b.dataset.aov))).includes('perguntar'), '"Voltar" leva ao menu do AssistONE');

    console.log('4) limite do dia e erro de rede viram mensagem clara');
    await p.evaluate(() => { MoneyNuvem.assist.perguntar = async () => ({ ok: false, motivo: 'limite', limite: 20 }); });
    await p.click('#assistBalao [data-aov="perguntar"]'); await p.waitForSelector('#ahPergunta', { state: 'visible' }); await p.fill('#ahPergunta', 'oi de novo'); await p.click('#ahEnviar');
    await p.waitForFunction(() => /limite de 20 perguntas/.test((document.querySelector('#ahResposta') || {}).textContent || ''));
    ok(true, 'limite: "Você chegou ao limite de 20 perguntas de hoje"');
    await p.evaluate(() => { MoneyNuvem.assist.perguntar = async () => { throw new Error('rede'); }; });
    await p.click('#ahEnviar');
    await p.waitForFunction(() => /Confira a internet/.test((document.querySelector('#ahResposta') || {}).textContent || ''));
    ok(true, 'sem internet: "Confira a internet e tente de novo"');

    console.log('5) inglês');
    await p.evaluate(() => { I18n.atual = 'en'; AssistOne.fechar(); });
    ok((await p.evaluate(() => { AssistOne.abrir('tela'); return document.querySelector('#assistBalao [data-aov="perguntar"]').textContent; })).includes('Ask the assistant'), 'EN: "Ask the assistant"');

    ok(!erros.length, 'nenhum erro de JavaScript na página' + (erros.length ? ': ' + erros.join(' | ') : ''));
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
