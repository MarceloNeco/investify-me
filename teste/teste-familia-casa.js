/* =====================================================================
   teste/teste-familia-casa.js — 3.75: os ajustes da visão da família (modulos/visao-casa.js 1.1.0, pessoas.js 1.3.0).
   Nuvem SIMULADA (sem rede); dados FICTÍCIOS.
   Confere: o aviso do 📥 diz o que se pede e por quê e abre as Configurações sem trocar de app ("Avisos" também);
   "Qual destas fichas é você?" uma vez só (sem adivinhar pelo nome), o chefe fora de "Quem é da casa"; a sugestão de juntar a ficha da conta (sem perder lançamentos); o nome com o
   apelido entre parênteses; quem é de fora separado; "Preparar" travado sem PIN da conta, com o botão de criar.
   Uso: node teste/teste-familia-casa.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const pessoas = [
  { id: 'p3', tipo: 'casa', papel: 'responsavel', nome: 'Beatriz', meio: '', sobrenome: 'Exemplo', apelido: 'Bia', banco: [] },
  { id: 'p1', tipo: 'casa', papel: 'responsavel', nome: 'Fulaninho', meio: '', sobrenome: '', apelido: '', banco: [] },
  { id: 'p2', tipo: 'casa', papel: 'responsavel', nome: 'Fulano', meio: 'de', sobrenome: 'Tal', apelido: '', banco: [], uid: 'u1' },
  { id: 'p4', tipo: 'outra', papel: '', nome: 'Inquilino Exemplo', meio: '', sobrenome: '', apelido: 'Inquilino', banco: [] },
  { id: 'p5', tipo: 'casa', papel: 'dependente', nome: 'Dora', meio: '', sobrenome: 'Exemplo', apelido: '', banco: [] }
];
const gastos = [{ id: 'g1', data: '2026-11-03', valor: 80, grupo: 'ALIMENTACAO', sub: 'Mercado', desc: 'MERCADO EXEMPLO', fluxo: 'saida', quem: 'Fulano de Tal', quemId: 'p2' },
  { id: 'g2', data: '2026-11-04', valor: 90, grupo: 'ALIMENTACAO', sub: 'Mercado', desc: 'PADARIA EXEMPLO', fluxo: 'saida', quem: 'Fulaninho', quemId: 'p1' }];
const LOCAL = { v: 1, config: { fitaLigada: false, pessoasV: 2 }, posicoes: [], gastos, recorrentes: [], pessoas };

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
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Escopo !== 'undefined' && typeof Pessoas !== 'undefined');
    /* a nuvem simulada: o chefe (u1), sem a visão preparada, sem PIN da conta */
    await p.evaluate(() => {
      I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar();
      const real = window.MoneyNuvem || {};
      window.MoneyNuvem = Object.assign(Object.create(real), { iniciado: true, local: true, nomePessoa: () => 'Fulano de Tal',
        escopos: { estado: () => ({ mk: true, tudo: true, feito: false, pin: true }), eu: () => 'u1', visoes: () => Promise.resolve([]),
          pinConta: () => Promise.resolve(false), criarPinConta: () => { window.__pinAberto = 1; } } });
      abrirApp('budget'); irPara('b-painel'); render();
    });

    console.log('1) o aviso no 📥 e o "Avisos" sem trocar de app');
    await p.evaluate(() => { irPara('config'); cfgSecao = 'todos'; render(); });
    await p.waitForTimeout(300);
    await p.evaluate(() => { irPara('b-painel'); render(); abrirInbox(); });
    const ib = await p.evaluate(() => { const i = inboxItens().find((x) => x.ico === '👪'); return { sub: i && i.sub, btn: !!document.querySelector('#genBody [data-rolar="vcFamilia"]') }; });
    ok(ib.sub === 'Prepare a parte da casa para Beatriz poder ver só ela. Antes, crie o PIN da sua conta.' && ib.btn, 'o 📥 diz numa linha o que se pede e por quê, com o botão "👪 Visão da família": ' + ib.sub);
    await p.click('#genBody [data-rolar="vcFamilia"]'); await p.waitForTimeout(400);
    const a1 = await p.evaluate(() => ({ app: ST.appAtual, v: viewAtual, sec: cfgSecao, card: !!document.getElementById('vcFamilia') }));
    ok(a1.app === 'budget' && a1.v === 'config' && a1.sec === 'todos' && a1.card, 'abre Configurações → Compartilhadas no BudgetONE (não troca para o InvestifyONE) e mostra o cartão da família ' + JSON.stringify(a1));
    await p.evaluate(() => { irPara('b-painel'); render(); abrirInbox(); });
    await p.click('#genBody [data-irpara="config"]:not([data-rolar])'); await p.waitForTimeout(250);
    ok(await p.evaluate(() => ST.appAtual === 'budget' && viewAtual === 'config'), '"🔔 Avisos" também abre no app em que você está');

    console.log('2) "Quem é da casa"');
    await p.evaluate(() => { irPara('config'); cfgSecao = 'todos'; render(); });
    await p.waitForTimeout(300);
    const lista = () => p.evaluate(() => { const c = document.getElementById('vcFamilia'); return { nomes: [...c.querySelectorAll('.vc-pessoas label')].map((x) => x.textContent.trim()), fora: (c.querySelector('.vc-fora') || {}).textContent || '', juntar: (c.querySelector('.vc-juntar') || {}).textContent || '', pergunta: (c.querySelector('.vc-quem-sou') || {}).textContent || '' }; });
    const l0 = await lista();
    /* 3.125 (dono: acabar com "Qual destas fichas é você?"): o app liga sozinho a ficha com o uid da conta; nada de pergunta */
    ok(!l0.pergunta && await p.evaluate(() => ST.config.vcEu && ST.config.vcEu.uid === 'u1' && ST.config.vcEu.pessoa === 'p2'), 'sem perguntar: a ficha com o uid da conta (Fulano de Tal) fica ligada à conta sozinha');
    ok(l0.nomes.indexOf('Fulano de Tal') < 0, 'a ficha da conta fica fora da lista');
    ok(/Pessoas próximas \(não moram com você, não entram\): Inquilino/.test(l0.fora), 'o inquilino separado em "Pessoas próximas (não moram com você, não entram)" (3.144)');
    ok(await p.evaluate(() => !!document.querySelector('#vcFamilia [data-acao="ps-lista"]')), 'o atalho "Abrir Pessoas da família"');
    /* a ficha que a pessoa fez para si ("Fulaninho") com o e-mail da conta: o app oferece juntar (a dela fica; a criada para a conta sai) */
    await p.evaluate(() => { MoneyNuvem.email = () => 'fulano@exemplo.invalid'; Pessoas.porId('p1').email = 'fulano@exemplo.invalid'; render(); }); await p.waitForTimeout(200);
    const l = await lista();
    ok(/Fulaninho e Fulano são a mesma pessoa \(você\)\? Juntar/.test(l.juntar), 'com o e-mail da conta na ficha "Fulaninho": "Fulaninho e Fulano são a mesma pessoa (você)? Juntar" (3.144: o Nome)');
    await p.click('#vcFamilia [data-acao="vc-juntar"]'); await p.waitForTimeout(200);
    const j = await p.evaluate(() => ({ n: ST.pessoas.length, g1: Gasto.todos().find((g) => g.id === 'g1'), p1: Pessoas.porId('p1'), caixa: !!document.querySelector('#vcFamilia .vc-juntar'), eu: ST.config.vcEu.pessoa }));
    ok(j.n === 4 && j.g1.quemId === 'p1' && j.p1.uid === 'u1' && j.p1.aliases.indexOf('Fulano de Tal') >= 0 && !j.caixa && j.eu === 'p1', 'juntado: a ficha criada para a conta sai, o lançamento dela passa para "Fulaninho", o vínculo vai junto e a sugestão some');
    /* 3.142 (dono): o chefe aparece SEMPRE no topo, marcado e travado ("você · chefe"); antes ficava escondido */
    const l3 = await lista();
    ok(/\(você · chefe\)$/.test(l3.nomes[0]) && l3.nomes.slice(1).join('|') === 'Beatriz|Dora' && !l3.pergunta, 'na lista: o chefe no topo ("' + l3.nomes[0] + '"), depois Beatriz e Dora (3.144: o Nome), sem perguntar nada');
    await p.evaluate(() => { MoneyNuvem.email = () => ''; });

    console.log('3) sem PIN da conta, "Preparar" travado');
    /* 3.144: toda a Família já conta (as caixas ficam travadas); não há o que marcar */
    const pin = await p.evaluate(() => ({ dis: document.querySelector('#vcFamilia [data-acao="vc-preparar"]').disabled, txt: (document.querySelector('#vcFamilia .vc-sem-pin') || {}).textContent || '' }));
    ok(pin.dis && /Crie o PIN da conta primeiro/.test(pin.txt), 'com a Família na casa mas sem PIN da conta: "Preparar" desabilitado e "Crie o PIN da conta primeiro"');
    await p.click('#vcFamilia [data-acao="vc-criar-pin"]');
    ok(await p.evaluate(() => window.__pinAberto === 1), 'o botão abre a criação do PIN da conta');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
