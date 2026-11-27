/* =====================================================================
   teste/teste-3132.js — 3.132: Pessoas da família sem pular de lugar (rolagem mantida, "Desfazer", editar na própria ficha), a tela
   refeita (família primeiro, empresas fora de "A identificar", "Juntar", um só "Confirme os papéis", CPF escondido), o "editar" em
   Família no MoneyTRIO, a busca, e os cartões agrupados sozinhos (banco + bandeira, sem uso recolhido, quem usa). Dados FICTÍCIOS.
   Uso: node teste/teste-3132.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const hoje = new Date().toISOString().slice(0, 10);
const dia = (k) => { const x = new Date(hoje + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + k); return x.toISOString().slice(0, 10); };
let gid = 0;
const G = (data, fim, band, cc, extra) => Object.assign({ id: 'g' + (++gid), data, valor: 40, grupo: 'PESSOAL', sub: 'Outros', desc: 'LOJA EXEMPLO', fluxo: 'saida', origem: 'robo', finalCartao: fim, conta: 'Banco Alfa', cartaoNome: band }, cc ? { contaCartao: cc } : {}, extra || {});
const MC = { id: 'cc-mc', nome: 'MULT BLACK EXEMPLO' }, VI = { id: 'cc-vi', nome: 'VISA EXEMPLO INFINITE' }, VP = { id: 'cc-vp', nome: 'VISA PARADO EXEMPLO' };
const gastos = [];
/* Mastercard: o físico 1101 (10 compras) + 6 virtuais (2 com a conta, 4 sem: vão pela regra banco + bandeira) */
for (let i = 0; i < 10; i++) gastos.push(G(dia(-3 - i), '1101', 'Mastercard Black', MC));
gastos.push(G(dia(-5), '2201', 'Mastercard', MC), G(dia(-6), '2202', 'Mastercard', MC), G(dia(-60), '2203', 'Mastercard'), G(dia(-4), '2204', 'Mastercard'),
  G(dia(-8), '2205', 'Mastercard'), G(dia(-9), '2206', 'Mastercard'), G(dia(-10), '2206', 'Mastercard'), G(dia(-11), '2206', 'Mastercard'));
/* Visa em uso: o físico 3301 (6 compras) + 3 virtuais; e um Visa do mesmo banco SEM uso (última compra há 200 dias) */
for (let i = 0; i < 6; i++) gastos.push(G(dia(-2 - i), '3301', 'Visa Infinite', VI));
gastos.push(G(dia(-7), '3302', 'Visa', VI), G(dia(-12), '3303', 'Visa'), G(dia(-13), '3304', 'Visa'));
gastos.push(G(dia(-200), '4401', 'Visa', VP), G(dia(-210), '4401', 'Visa', VP));
/* nomes soltos: gente, empresas e um com cara de CPF */
const solto = (q, n) => { for (let i = 0; i < n; i++) gastos.push({ id: 's' + (++gid), data: dia(-1), valor: 10, grupo: 'PESSOAL', sub: 'Outros', desc: 'PIX', fluxo: 'saida', quem: q }); };
solto('JOAQUIM PEREIRA', 2); solto('MERCADO EXEMPLO LTDA', 3); solto('BANCO EXEMPLO S/A', 2); solto('INSTITUICAO DE PAGAMENTO EXEMPLO', 2); solto('itau', 1); solto('BELTRANO EXEMPLO 12345678901', 1);
const pessoas = [{ id: 'p-eu', tipo: 'casa', papel: 'responsavel', nome: 'Fulano', sobrenome: 'De Tal', uid: 'u1', banco: [] }, { id: 'p-apelido', tipo: 'casa', papel: '', nome: 'Apelido Exemplo', banco: [] },
  { id: 'p-b', tipo: 'casa', papel: '', nome: 'Pessoa B', banco: [] }, { id: 'p-inq', tipo: 'outra', papel: '', nome: 'Inquilino Exemplo', banco: [] }];
for (let i = 0; i < 18; i++) pessoas.push({ id: 'px' + i, tipo: 'outra', papel: '', nome: 'Vizinho Exemplo ' + String.fromCharCode(65 + i), banco: [] });
const LOCAL = { v: 1, config: { fitaLigada: false, pessoasV: 2, pessoasRevisar: true }, posicoes: [], recorrentes: [], gastos, pessoas };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => { p.dialogo = true; x.accept(); });
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.Pessoas && window.Cartoes && window.AssistIndice);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar();
      const real = window.MoneyNuvem || {};
      window.MoneyNuvem = Object.assign(Object.create(real), { iniciado: true, local: true, nomePessoa: () => 'Fulano de Tal',
        escopos: { estado: () => ({ mk: true, tudo: true, feito: false, pin: true }), eu: () => 'u1', visoes: () => Promise.resolve([]), pinConta: () => Promise.resolve(false), criarPinConta: () => {} } });
      ST.saldos_banco = [{ id: 'k1', tipo: 'cartao', banco: 'Banco Alfa', conta: 'MULT BLACK EXEMPLO', contaId: 'cc-mc', dono: 'Apelido Exemplo', saldo: -10, data: hojeISO(), hist: [] },
        { id: 'k2', tipo: 'cartao', banco: 'Banco Alfa', conta: 'VISA EXEMPLO INFINITE', contaId: 'cc-vi', dono: 'Pessoa B', saldo: -10, data: hojeISO(), hist: [] },
        { id: 'k3', tipo: 'conta', banco: 'Banco Alfa', conta: 'Conta corrente', contaId: 'ca1', dono: 'Apelido Exemplo', saldo: 100, data: hojeISO(), hist: [] }];
      Store.salvar(); abrirApp('budget'); irPara('cfg-pessoas'); render(); });
    await p.waitForTimeout(200);
    await p.screenshot({ path: '/tmp/teste-3132-pessoas.png' });
    const Y = () => p.evaluate(() => Math.round((document.scrollingElement || document.documentElement).scrollTop));

    console.log('1) Pessoas da família: a ordem, as empresas fora, o CPF escondido, o Juntar e um só "Confirme"');
    const ordem = await p.evaluate(() => { const v = document.getElementById('view-cfg-pessoas'); const els = [...v.querySelectorAll('.ps-juntar, .ps-grupo, .ps-soltos')];
      return els.map((e) => e.classList.contains('ps-juntar') ? 'juntar' : e.classList.contains('ps-soltos') ? 'soltos' : e.dataset.grupo); });
    ok(ordem[0] === 'juntar' && ordem[1] === 'casa' && ordem[2] === 'outra' && ordem[ordem.length - 1] === 'soltos', 'a ordem: "a mesma pessoa?" no topo, a família, as outras pessoas, e os nomes soltos no fim: ' + ordem.join(' › '));
    const sol = await p.evaluate(() => { const d = document.querySelector('.ps-soltos'); return { aberto: d.open, txt: d.textContent.replace(/\s+/g, ' '), sum: d.querySelector('summary').textContent }; });
    ok(!sol.aberto && /^2 nomes soltos nos lançamentos · ver$/.test(sol.sum.trim()), 'os nomes soltos recolhidos numa linha: "' + sol.sum.trim() + '"');
    ok(/JOAQUIM PEREIRA/.test(sol.txt) && !/MERCADO EXEMPLO LTDA|BANCO EXEMPLO S\/A|INSTITUICAO DE PAGAMENTO|“itau”/.test(sol.txt), 'empresa, banco e instituição não entram em "A identificar"; o nome de gente entra');
    ok(/BELTRANO EXEMPLO ···901/.test(sol.txt) && !/12345678901/.test(sol.txt), 'a sequência de 11 dígitos aparece só com o final: "BELTRANO EXEMPLO ···901"');
    await p.evaluate(() => { document.querySelector('.ps-soltos').open = true; [...document.querySelectorAll('.ps-soltos [data-acao="ps-cadastrar-texto"]')].find((x) => /BELTRANO/.test(x.dataset.texto)).click(); });
    await p.waitForTimeout(150);
    ok(await p.evaluate(() => { const x = ST.pessoas.find((q) => /Beltrano/i.test(q.nome)); return !!x && !/\d{5}/.test(JSON.stringify(x)); }), 'cadastrar o nome solto não guarda o número na ficha');
    await p.evaluate(() => { const b = document.querySelector('[data-acao="ps-cancelar"]'); if (b) b.click(); });
    const jt = await p.evaluate(() => (document.querySelector('.ps-juntar') || {}).textContent || '');
    ok(/Apelido.* e Fulano.* são a mesma pessoa\?/.test(jt), 'no topo: "Apelido e Fulano… são a mesma pessoa?" (o dono que o banco manda nos itens da conta): ' + jt.slice(0, 90));
    const conf = await p.evaluate(() => ({ n: document.querySelectorAll('.ps-revise').length, sels: document.querySelectorAll('[data-grupo="casa"] .ps-papel-sel').length, revisar: document.querySelectorAll('.ps-novo').length, adef: /papel a definir/.test(document.getElementById('view-cfg-pessoas').textContent) }));
    ok(conf.n === 1 && conf.sels >= 3 && conf.revisar === 0 && !conf.adef, 'um só "Confirme: quem é responsável e quem é dependente", com um seletor por linha; sem o "revisar" e o "papel a definir" em cada nome');
    await p.selectOption('[data-grupo="casa"] .ps-papel-sel[data-id="p-b"]', 'dependente'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => ST.pessoas.find((x) => x.id === 'p-b').papel === 'dependente'), 'o seletor da linha grava o papel (Pessoa B: dependente)');
    await p.click('.ps-juntar [data-acao="ps-juntar"]'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => !ST.pessoas.some((x) => x.id === 'p-apelido') && (ST.pessoas.find((x) => x.id === 'p-eu').aliases || []).indexOf('Apelido Exemplo') >= 0 && !document.querySelector('.ps-juntar')), '"Juntar": fica uma ficha só, e o apelido vai para "Também chamado"');

    console.log('2) a rolagem não pula, "Desfazer" e o editar na própria ficha');
    await p.evaluate(() => { const r = document.querySelector('[data-ps="px15"]'); r.scrollIntoView({ block: 'center' }); });
    const y0 = await Y();
    await p.evaluate(() => document.querySelector('[data-ps="px15"] [data-acao="ps-apagar"]').click()); await p.waitForTimeout(200);
    const y1 = await Y();
    ok(y0 > 300 && Math.abs(y1 - y0) < 60, 'apagar: a tela fica onde estava (' + y0 + ' → ' + y1 + '), não volta ao topo');
    ok(!p.dialogo && await p.evaluate(() => !ST.pessoas.some((x) => x.id === 'px15')), 'apaga sem o confirm() do navegador');
    const t1 = await p.evaluate(() => { const t = [...document.querySelectorAll('#toasts .toast')].find((x) => /Apagado: Vizinho/.test(x.textContent)); return t ? !!t.querySelector('.toast-acao') : null; });
    ok(t1 === true, 'aviso "Apagado: Vizinho" com o botão "Desfazer"');
    await p.evaluate(() => [...document.querySelectorAll('#toasts .toast')].find((x) => /Apagado/.test(x.textContent)).querySelector('.toast-acao').click()); await p.waitForTimeout(200);
    ok(await p.evaluate(() => !!ST.pessoas.find((x) => x.id === 'px15' && x.nome === 'Vizinho Exemplo P') && !!document.querySelector('[data-ps="px15"]')), '"Desfazer" traz a ficha de volta, igual');
    await p.evaluate(() => { document.querySelector('[data-ps="px12"]').scrollIntoView({ block: 'center' }); });
    const y2 = await Y();
    await p.evaluate(() => document.querySelector('[data-ps="px12"] [data-acao="ps-editar"]').click()); await p.waitForTimeout(250);
    const ed = await p.evaluate(() => { const f = document.querySelector('.ps-form'), tr = f && f.closest('tr'), ant = tr && tr.previousElementSibling, r = f && f.getBoundingClientRect();
      return { lugar: ant && ant.dataset.ps, visivel: !!r && r.top < innerHeight && r.bottom > 0, topo: !!document.querySelector('.card-head + .aba-explica + .ps-form') }; });
    const y3 = await Y();
    ok(ed.lugar === 'px12' && ed.visivel && !ed.topo && Math.abs(y3 - y2) < 500, '"editar" abre o formulário logo abaixo da própria ficha, visível (rolagem ' + y2 + ' → ' + y3 + ')');
    await p.evaluate(() => document.querySelector('[data-acao="ps-cancelar"]').click()); await p.waitForTimeout(250);
    const y4 = await Y(), vis = await p.evaluate(() => { const r = document.querySelector('[data-ps="px12"]').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
    ok(vis && y4 > 300, '"Cancelar" volta para a ficha, não para o topo (' + y4 + ')');
    await p.evaluate(() => document.querySelector('[data-ps="px12"] [data-acao="ps-editar"]').click()); await p.waitForTimeout(200);
    await p.fill('#psApelido', 'Vizinho Novo'); await p.evaluate(() => document.querySelector('[data-acao="ps-salvar"]').click()); await p.waitForTimeout(250);
    const y5 = await Y(), vis2 = await p.evaluate(() => { const r = document.querySelector('[data-ps="px12"]'); if (!r) return false; const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight && /Vizinho Novo/.test(r.textContent); });
    ok(vis2 && y5 > 300, '"Salvar" volta para a ficha salva, não para o topo (' + y5 + ')');
    await p.evaluate(() => { document.querySelector('[data-ps="px10"]').scrollIntoView({ block: 'center' }); });
    const y6 = await Y(); await p.evaluate(() => document.querySelector('[data-ps="px10"] [data-acao="ps-apagar"]').click()); await p.waitForTimeout(150);
    ok(Math.abs((await Y()) - y6) < 60, 'apagar de novo: a rolagem continua no lugar');

    console.log('3) Família no MoneyTRIO: "editar" ao lado do nome e o botão de Pessoas; a busca');
    await p.evaluate(() => { irPara('config'); cfgSecao = 'todos'; render(); }); await p.waitForTimeout(300);
    const fam = await p.evaluate(() => { const v = document.querySelector('.vc-pessoas'); return v ? { ed: v.querySelectorAll('[data-acao="ps-abrir"]').length, bt: [...document.querySelectorAll('[data-acao="ps-lista"]')].some((x) => /Pessoas da família \(renomear, e-mail, incluir alguém\)/.test(x.textContent)) } : null; });
    ok(fam && fam.ed >= 1 && fam.bt, 'em "Quem é da casa", cada nome tem "editar", e o botão "👥 Pessoas da família (renomear, e-mail, incluir alguém)"');
    await p.evaluate(() => document.querySelector('.vc-pessoas').scrollIntoView({ block: 'center' })); await p.screenshot({ path: '/tmp/teste-3132-familia.png' });
    await p.evaluate(() => document.querySelector('.vc-pessoas [data-acao="ps-abrir"][data-id="p-b"]').click()); await p.waitForTimeout(300);
    ok(await p.evaluate(() => viewAtual === 'cfg-pessoas' && !!document.querySelector('.ps-form') && document.querySelector('.ps-form').closest('tr').previousElementSibling.dataset.ps === 'p-b'), '"editar" abre a ficha da pessoa em Pessoas da família');
    const busca = await p.evaluate(() => ['renomear pessoa', 'mudar nome', 'e-mail da pessoa'].map((q) => (AssistIndice.buscar(q)[0] || {}).t || ''));
    ok(busca.every((t) => /Pessoas da família/.test(t)), 'a busca acha "renomear pessoa", "mudar nome" e "e-mail da pessoa" → Pessoas da família');

    console.log('4) cartões: agrupados sozinhos, sem uso recolhido, quem usa');
    await p.evaluate(() => { irPara('config'); cfgSecao = 'budget'; render(); }); await p.waitForTimeout(200);
    const enc = await p.evaluate(() => Cartoes.encontrados().map((x) => x.chave + ':' + x.finais.length + (x.semUso ? ':semuso' : '')).sort());
    ok(enc.join(' ') === 'c:cc-mc:7 c:cc-vi:4 c:cc-vp:1:semuso', 'Mastercard: o físico + 6 virtuais (os sem conta vão pelo banco + bandeira); Visa: o físico + 3; o Visa parado fica à parte: ' + enc.join(' '));
    const tela = await p.evaluate(() => { const c = document.querySelector('.ct-encontrados'); return c ? { tit: c.querySelector('b').textContent, cards: c.querySelectorAll(':scope > .ct-enc').length, sem: (c.querySelector('.ct-sem-uso summary') || {}).textContent || '', semAberto: (c.querySelector('.ct-sem-uso') || {}).open, chips: [...c.querySelectorAll('.ct-enc[data-chave="c:cc-mc"] .ct-chip')].map((x) => x.textContent), nome: c.querySelector('.ct-enc[data-chave="c:cc-mc"] .ct-enc-nome').value, usa: c.querySelector('.ct-enc[data-chave="c:cc-vi"] .ct-enc-usa').value, dar: /Dar nome/.test(c.textContent) } : null; });
    await p.evaluate(() => { const s = document.querySelector('.ct-encontrados').closest('.cfg-sec'); if (s) s.classList.add('aberta'); document.querySelector('.ct-encontrados').scrollIntoView({ block: 'start' }); }); await p.screenshot({ path: '/tmp/teste-3132-cartoes-antes.png' });
    ok(tela && /Encontrei 2 cartões nas suas compras/.test(tela.tit) && tela.cards === 2 && /^1 sem uso/.test(tela.sem) && !tela.semAberto, '"Encontrei 2 cartões" e 1 recolhido como "sem uso": ' + (tela && tela.tit + ' · ' + tela.sem));
    ok(tela && tela.chips[0] === '••1101 · físico' && tela.chips.some((x) => x === '••2203 · virtual de uso único') && tela.chips.some((x) => x === '••2206 · virtual'), 'cada final marcado: físico, virtual, virtual de uso único: ' + (tela && tela.chips.join(' | ')));
    ok(tela && tela.nome === 'Mult Black Exemplo Banco' && !tela.dar && /^Pessoa/.test(tela.usa), 'o nome sugerido ("Mult Black Exemplo Banco"), sem "Dar nome"; "quem usa" sugerido pelo dono que o banco manda (Pessoa B)');
    await p.evaluate(() => { const c = document.querySelector('.ct-enc[data-chave="c:cc-mc"]'); c.querySelector('.ct-enc-nome').value = 'Black Exemplo'; c.querySelector('[data-acao="ct-cadastrar-enc"]').click(); });
    await p.waitForTimeout(200);
    const cad = await p.evaluate(() => { const c = (ST.cartoes || []).find((x) => x.apelido === 'Black Exemplo'); return c ? { n: c.finais.length, conta: c.contaId, f: c.finais.find((f) => f.fim === '1101').tipo, ligados: ST.gastos.filter((g) => g.cartaoId === c.id).length } : null; });
    ok(cad && cad.n === 7 && cad.conta === 'cc-mc' && cad.f === 'fisico' && cad.ligados === 18, 'um toque em "Cadastrar este cartão": a conta com os 7 finais (o 1101 físico) e as 18 compras ligadas: ' + JSON.stringify(cad));
    ok(await p.evaluate(() => /Encontrei 1 cartão nas suas compras/.test(document.querySelector('.ct-encontrados b').textContent)), 'depois de cadastrar, sobra "Encontrei 1 cartão"');
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
    await p.evaluate(() => document.querySelector('.ct-encontrados').scrollIntoView({ block: 'start' })); await p.screenshot({ path: '/tmp/teste-3132-cartoes.png' });
    await ctx.close();
  } finally { await b.close(); srv.close(); }
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
