/* =====================================================================
   teste/teste-3142.js — 3.142: Configurações › "👪 Família no MoneyTRIO" › "Quem é da casa" (modulos/visao-casa.js 1.5.0) e Pessoas da
   família (modulos/pessoas.js 1.8.0). Dados FICTÍCIOS (Paulo Exemplo = o chefe; Inquilino; Ana Exemplo).
   Confere: o chefe SEMPRE no topo ("(você · chefe)", caixa marcada e travada, "editar"); renomear o chefe pelo "editar" muda o nome em
   todo o app; o Inquilino (que parece de fora) NÃO vem marcado mesmo que estivesse na lista e não conta na parte da casa até marcar;
   "Não, é de fora" → Outras pessoas, com "Desfazer"; a frase curta, sem "ler mais"; o aviso numa linha própria embaixo do nome, dentro
   do cartão, sem sobrepor e com o botão inteiro — com FOTO em 360, 390, 768, 1366, 1920 e 2560 px, em PT, EN e ES; em Pessoas da
   família: o chefe primeiro ("você · chefe", Responsável travado, no formulário Tipo e Papel travados); o seletor de papel com 3 opções
   (Responsável · Dependente · Não é da família) e quem parece de fora já com a 3ª e "é isso?"; "Não é da família" → Outras pessoas com
   "Desfazer"; o formulário abre no topo com o Tipo em destaque ("Da casa (família)"…) e "Parece alguém de fora da família. É isso?";
   a migração única: ficha da casa que parece de fora, sem confirmação nem lançamento marcado à mão como da casa, vai para Outras
   pessoas com um aviso só; fotos de Pessoas da família nas 6 larguras × 3 idiomas.
   Uso: node teste/teste-3142.js   (fotos em <tmp>/familia-3142/)
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..'), FOTOS = path.join(os.tmpdir(), 'familia-3142');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LARGURAS = [360, 390, 768, 1366, 1920, 2560];
const LOCAL = { v: 1, config: { fitaLigada: false, pessoasV: 2, pessoasFora3142: 1, pessoasRevisar: true }, posicoes: [], recorrentes: [], cartoes: [],
  pessoas: [
    { id: 'pche', tipo: 'casa', papel: 'responsavel', nome: 'Paulo', sobrenome: 'Exemplo', uid: 'u1', banco: [], aliases: [] },
    { id: 'pinq', tipo: 'casa', papel: '', nome: 'Inquilino', banco: [], aliases: [] },
    { id: 'pana', tipo: 'casa', papel: 'dependente', nome: 'Ana', sobrenome: 'Exemplo', banco: [], aliases: [] },
    { id: 'ppre', tipo: 'casa', papel: '', nome: 'Prestador', sobrenome: 'Exemplo', banco: [], aliases: [] },
    { id: 'pbia', tipo: 'casa', papel: '', nome: 'Bia', sobrenome: 'Exemplo', banco: [], aliases: [] }],
  visaoCasa: { pessoas: ['pinq', 'pana'] },
  gastos: [{ id: 'g1', data: '2026-11-10', valor: 50, desc: 'MERCADO EXEMPLO', fluxo: 'saida', grupo: 'ALIMENTACAO', sub: 'Supermercado', quem: 'Paulo Exemplo', quemId: 'pche', origem: 'manual' }] };

(async () => {
  fs.mkdirSync(FOTOS, { recursive: true });
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.clock.setFixedTime(new Date('2026-11-28T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Escopo !== 'undefined' && typeof Pessoas !== 'undefined');
    /* a nuvem simulada: o chefe (u1) logado, vê tudo, a casa ainda não separada */
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar();
      const real = window.MoneyNuvem || {};
      window.MoneyNuvem = Object.assign(Object.create(real), { iniciado: true, local: true, nomePessoa: () => 'Paulo Exemplo', email: () => '',
        escopos: { estado: () => ({ mk: true, tudo: true, feito: false, pin: true }), eu: () => 'u1', visoes: () => Promise.resolve([]), pinConta: () => Promise.resolve(true), criarPinConta: () => {} } });
      abrirApp('budget'); });
    const familia = async () => { await p.evaluate(() => { irPara('config'); cfgSecao = 'todos'; render(); }); await p.waitForFunction(() => !!document.querySelector('#vcFamilia .vc-pessoas')); await p.waitForTimeout(150); };

    console.log('1) o chefe no topo, o inquilino desmarcado, a frase curta');
    await familia();
    const t1 = await p.evaluate(() => {
      const rows = [...document.querySelectorAll('#vcFamilia .vc-pessoa')], ch = rows[0], cb = ch && ch.querySelector('input[type=checkbox]');
      const inq = document.querySelector('#vcFamilia .vc-pessoa[data-id="pinq"] input[type=checkbox]'), ana = document.querySelector('#vcFamilia .vc-pessoa[data-id="pana"] input[type=checkbox]');
      return { primeiro: ch ? ch.textContent.replace(/\s+/g, ' ').trim() : '', marcado: !!(cb && cb.checked), travado: !!(cb && cb.disabled), editar: !!(ch && ch.querySelector('[data-acao="ps-abrir"][data-id="pche"]')),
        inq: inq ? inq.checked : null, ana: ana ? ana.checked : null, intro: [...document.querySelectorAll('#vcFamilia .vc-intro p')].map((x) => x.textContent.trim()).join(' '),
        lerMais: document.querySelectorAll('#vcFamilia .explica-mais').length, velho: /não precisa estar na lista/.test(document.querySelector('#vcFamilia').textContent) };
    });
    ok(/^Paulo Exemplo \(você · chefe\)/.test(t1.primeiro) && t1.marcado && t1.travado && t1.editar, 'o primeiro da lista é "Paulo Exemplo (você · chefe)", marcado, travado e com "editar" — ' + t1.primeiro);
    ok(t1.inq === false && t1.ana === true, 'o Inquilino (que estava na lista) NÃO vem marcado; a Ana continua marcada');
    ok(t1.intro === 'Quem é da casa Marque quem mora com você. Os gastos dessas pessoas e dos cartões delas entram na parte da casa. Você (chefe) sempre vê tudo.' && t1.lerMais === 0 && !t1.velho, 'a frase curta, sem "ler mais" nem o texto antigo "não precisa estar na lista"');
    await p.click('#vcFamilia .vc-chefe input[type=checkbox]', { force: true }).catch(() => {});
    ok(await p.evaluate(() => document.querySelector('#vcFamilia .vc-chefe input[type=checkbox]').checked), 'a caixa do chefe não desmarca');
    const esc1 = await p.evaluate(() => { Escopo.preparar(Store.estado); return Escopo.pessoasDela().sort().join(); });
    ok(esc1 === 'pana', 'na parte da casa só entra a Ana; o Inquilino não conta até alguém confirmar (' + esc1 + ')');
    ok(await p.evaluate(() => !document.querySelector('#vcFamilia [data-acao="vc-preparar"]').disabled), '"Preparar" continua liberado (a Ana conta)');

    console.log('2) o aviso numa linha própria, dentro do cartão, em todas as larguras e idiomas (com foto)');
    const fotos = [];
    for (const lang of ['pt', 'en', 'es']) {
      for (const w of LARGURAS) {
        await p.setViewportSize({ width: w, height: 900 });
        await p.evaluate((l) => { I18n.atual = l; }, lang); await familia();
        const m = await p.evaluate(() => {
          const card = document.getElementById('vcFamilia').getBoundingClientRect(), row = document.querySelector('#vcFamilia .vc-pessoa[data-id="pinq"]');
          const lab = row.querySelector('.vc-pessoa-l').getBoundingClientRect(), av = row.querySelector('.vc-de-fora'), a = av.getBoundingClientRect();
          const sp = av.querySelector('span').getBoundingClientRect(), bt = av.querySelector('button'), bb = bt.getBoundingClientRect();
          /* o texto do botão numa linha só (o botão tem altura mínima de toque no celular; o que importa é não quebrar o texto) */
          const rg = document.createRange(); rg.selectNodeContents(bt); const linhas = new Set([...rg.getClientRects()].map((r) => Math.round(r.top))).size;
          const fora = [...document.querySelectorAll('#vcFamilia .aviso-box, #vcFamilia .callout, #vcFamilia .vc-pessoa, #vcFamilia button')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.left < card.left - 0.5 || r.right > card.right + 0.5); }).length;
          const sobre = !(sp.right <= bb.left + 0.5 || bb.right <= sp.left + 0.5 || sp.bottom <= bb.top + 0.5 || bb.bottom <= sp.top + 0.5);
          return { abaixo: a.top >= lab.bottom - 0.5, larg: Math.abs(a.width - row.getBoundingClientRect().width) < 1.5, dentro: a.left >= card.left - 0.5 && a.right <= card.right + 0.5,
            botaoInteiro: linhas === 1 && bt.scrollWidth <= bt.clientWidth + 1, sobre: sobre, fora: fora, rolaLado: document.documentElement.scrollWidth > innerWidth + 1 };
        });
        const nome = w + ' ' + lang, ruim = Object.keys(m).filter((k) => (k === 'sobre' || k === 'rolaLado') ? m[k] : (k === 'fora' ? m[k] > 0 : !m[k]));
        ok(!ruim.length, nome + ': aviso embaixo do nome, na largura da linha, dentro do cartão, botão inteiro, sem sobrepor nem rolar para o lado' + (ruim.length ? ' — ' + JSON.stringify(m) : ''));
        const arq = path.join(FOTOS, 'familia-' + w + '-' + lang + '.png');
        /* a tela pode se redesenhar sozinha (aviso de cotação): tira a foto de novo se o cartão foi trocado no meio */
        for (let k = 0; k < 3; k++) { try { await p.locator('#vcFamilia').screenshot({ path: arq }); break; } catch (e) { if (k === 2) throw e; await p.waitForTimeout(200); } }
        fotos.push(arq);
      }
    }
    console.log('    fotos: ' + FOTOS + ' (' + fotos.length + ')');
    await p.setViewportSize({ width: 390, height: 900 }); await p.evaluate(() => { I18n.atual = 'pt'; });

    console.log('3) "Não, é de fora" e "Desfazer"; marcar confirma que é da família');
    await familia();
    await p.click('#vcFamilia [data-acao="vc-de-fora"][data-id="pinq"]');
    await p.waitForFunction(() => /Inquilino agora está em Outras pessoas\./.test(document.getElementById('toasts').textContent));
    const d1 = await p.evaluate(() => ({ tipo: Pessoas.porId('pinq').tipo, lista: !!document.querySelector('#vcFamilia .vc-pessoa[data-id="pinq"]'), desf: [...document.querySelectorAll('#toasts button')].some((x) => /Desfazer/.test(x.textContent)), fora: (document.querySelector('#vcFamilia .vc-fora') || {}).textContent || '' }));
    ok(d1.tipo === 'outra' && !d1.lista && d1.desf && /Inquilino/.test(d1.fora), '"Não, é de fora": vira Outras pessoas, sai da lista e o aviso "Inquilino agora está em Outras pessoas." tem "Desfazer"');
    await p.evaluate(() => [...document.querySelectorAll('#toasts button')].find((x) => /Desfazer/.test(x.textContent)).click());
    await p.waitForTimeout(150);
    const d2 = await p.evaluate(() => ({ tipo: Pessoas.porId('pinq').tipo, lista: !!document.querySelector('#vcFamilia .vc-pessoa[data-id="pinq"]') }));
    ok(d2.tipo === 'casa' && d2.lista, '"Desfazer": volta para a família, na lista');
    await p.click('#vcFamilia .vc-pessoa[data-id="pinq"] input[type=checkbox]'); await p.waitForTimeout(150);
    const d3 = await p.evaluate(() => { Escopo.preparar(Store.estado); return { conf: !!Pessoas.porId('pinq').familiaConfirmada, aviso: !!document.querySelector('#vcFamilia .vc-pessoa[data-id="pinq"] .vc-de-fora'), dela: Escopo.pessoasDela().sort().join(), marcado: document.querySelector('#vcFamilia .vc-pessoa[data-id="pinq"] input').checked }; });
    ok(d3.conf && !d3.aviso && d3.marcado && d3.dela === 'pana,pinq', 'marcar a caixa = "é da família": o aviso some e passa a contar na parte da casa (' + d3.dela + ')');

    console.log('4) "editar" do chefe: renomear muda em todo o app; Pessoas da família com o chefe primeiro');
    await p.click('#vcFamilia .vc-chefe [data-acao="ps-abrir"]');
    await p.waitForFunction(() => !!document.getElementById('psNome'));
    const prim = await p.evaluate(() => { const r = document.querySelector('.ps-grupo[data-grupo="casa"] tbody tr'); return r ? r.textContent.replace(/\s+/g, ' ').trim() : ''; });
    ok(/^Paulo \(você · chefe\)/.test(prim), 'em Pessoas da família, o chefe vem primeiro, com "(você · chefe)" — ' + prim.slice(0, 40));
    await p.fill('#psNome', 'Alex'); await p.click('[data-acao="ps-salvar"]'); await p.waitForTimeout(150);
    const r4 = await p.evaluate(() => ({ g: ST.gastos.find((x) => x.id === 'g1').quem, rot: Pessoas.rotulo(Pessoas.porId('pche')) }));
    await familia();
    const ch2 = await p.evaluate(() => document.querySelector('#vcFamilia .vc-chefe').textContent.replace(/\s+/g, ' ').trim());
    ok(r4.rot === 'Alex' && r4.g === 'Alex' && /^Alex Exemplo \(você · chefe\)/.test(ch2), 'renomeado de Paulo para Alex: no lançamento ("quem" = Alex), em Pessoas e no topo de "Quem é da casa" (' + r4.g + ' / ' + ch2 + ')');

    console.log('5) Pessoas da família: o "Confirme" com 3 opções, o chefe travado');
    const pess = async () => { await p.evaluate(() => { irPara('cfg-pessoas'); render(); }); await p.waitForFunction(() => !!document.querySelector('.ps-grupo[data-grupo="casa"]')); await p.waitForTimeout(100); };
    await pess();
    const c5 = await p.evaluate(() => { const lin = (id) => document.querySelector('tr[data-ps="' + id + '"]'); const sel = (id) => lin(id) && lin(id).querySelector('.ps-papel-sel');
      return { chefe: lin('pche').textContent.replace(/\s+/g, ' '), chefeSel: !!sel('pche'), pre: sel('ppre') && [...sel('ppre').options].map((o) => o.value + (o.selected ? '*' : '')).join(','), preIsso: !!lin('ppre').querySelector('[data-acao="ps-fora"]') && /é isso\?/.test(lin('ppre').textContent),
        bia: sel('pbia') && [...sel('pbia').options].map((o) => o.textContent + (o.selected ? '*' : '')).join(' | ') }; });
    ok(/Alex \(você · chefe\)/.test(c5.chefe) && !c5.chefeSel && /Responsável 🔒/.test(c5.chefe), 'o chefe: "(você · chefe)", sem seletor, "Responsável 🔒"');
    ok(c5.bia === 'escolha…* | Responsável | Dependente | Não é da família (de fora)', 'o seletor tem 3 opções: Responsável · Dependente · Não é da família (de fora) — ' + c5.bia);
    ok(c5.pre === 'responsavel,dependente,fora*' && c5.preIsso, 'quem parece de fora (Prestador) já vem com "Não é da família" escolhido e "é isso? [Sim]", nunca "escolha…"');
    await p.selectOption('tr[data-ps="pbia"] .ps-papel-sel', 'fora');
    await p.waitForFunction(() => /Bia agora está em Outras pessoas\./.test(document.getElementById('toasts').textContent));
    ok(await p.evaluate(() => Pessoas.porId('pbia').tipo === 'outra' && !!document.querySelector('.ps-grupo[data-grupo="outra"] tr[data-ps="pbia"]') && [...document.querySelectorAll('#toasts button')].some((x) => /Desfazer/.test(x.textContent))), 'escolher "Não é da família": vai na hora para "Outras pessoas", com "Desfazer"');
    await p.evaluate(() => [...document.querySelectorAll('#toasts .toast')].filter((t) => /Bia agora/.test(t.textContent)).forEach((t) => [...t.querySelectorAll('button')].find((x) => /Desfazer/.test(x.textContent)).click()));
    await p.waitForTimeout(120);
    ok(await p.evaluate(() => Pessoas.porId('pbia').tipo === 'casa'), '"Desfazer": a Bia volta para a família');

    console.log('6) o formulário abre no topo, com o Tipo em destaque');
    await p.setViewportSize({ width: 390, height: 800 }); await pess();
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p.click('tr[data-ps="ppre"] [data-acao="ps-editar"]');
    await p.waitForTimeout(250);
    const f6 = await p.evaluate(() => { const t = document.getElementById('psTipo'), r = t.closest('.ps-tipo-destaque').getBoundingClientRect();
      return { visivel: r.top >= 0 && r.bottom <= innerHeight, ops: [...t.options].map((o) => o.textContent).join(' | '), aviso: (document.querySelector('.ps-fora-aviso') || {}).textContent || '' }; });
    ok(f6.visivel, 'o formulário abre com o Tipo à vista no topo (390 px)');
    ok(f6.ops === 'Da casa (família) | Outras pessoas (não é da família) | Empresas e instituições', 'os rótulos do Tipo: ' + f6.ops);
    ok(/Parece alguém de fora da família\. É isso\?/.test(f6.aviso), 'na ficha do Prestador: "Parece alguém de fora da família. É isso?"');
    await p.click('[data-acao="ps-cancelar"]'); await p.waitForTimeout(100);
    await p.click('tr[data-ps="pche"] [data-acao="ps-editar"]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => document.getElementById('psTipo').disabled && document.getElementById('psPapel').disabled && document.getElementById('psPapel').value === 'responsavel' && !document.querySelector('.ps-fora-aviso')), 'na ficha do chefe, Tipo e Papel (Responsável) travados');
    await p.click('[data-acao="ps-cancelar"]'); await p.waitForTimeout(100);

    console.log('7) fotos de Pessoas da família (o "Confirme" e o formulário) nas 6 larguras × 3 idiomas');
    for (const lang of ['pt', 'en', 'es']) {
      for (const w of LARGURAS) {
        await p.setViewportSize({ width: w, height: 900 });
        await p.evaluate((l) => { I18n.atual = l; }, lang); await pess();
        await p.click('tr[data-ps="ppre"] [data-acao="ps-editar"]'); await p.waitForTimeout(200);
        const m = await p.evaluate(() => { const g = document.querySelector('.ps-grupo[data-grupo="casa"]').getBoundingClientRect();
          const fora = [...document.querySelectorAll('.ps-grupo[data-grupo="casa"] select, .ps-grupo[data-grupo="casa"] .ps-papel-linha, .ps-grupo[data-grupo="casa"] button, .ps-tipo-destaque')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.left < g.left - 0.5 || r.right > g.right + 0.5); }).map((e) => e.className || e.tagName);
          const fm = document.querySelector('.ps-form').getBoundingClientRect();
          /* nada do formulário cortado ou para fora dele (rótulos, dicas, campos) */
          [...document.querySelectorAll('.ps-form .lb, .ps-form .hint, .ps-form input, .ps-form select, .ps-form .ps-fora-aviso')].forEach((e) => { const r = e.getBoundingClientRect(); if (r.width && (r.right > fm.right + 0.5 || r.left < fm.left - 0.5 || e.scrollWidth > e.clientWidth + 1 && !/INPUT|SELECT/.test(e.tagName))) fora.push('form:' + (e.className || e.id || e.tagName)); });
          /* o título do formulário não fica debaixo do cabeçalho fixo da tabela */
          const h3 = document.querySelector('.ps-form h3').getBoundingClientRect(), th = document.querySelector('.ps-grupo[data-grupo="casa"] thead th'), thr = th ? th.getBoundingClientRect() : { bottom: 0 };
          if (h3.top < thr.bottom - 0.5 && h3.bottom > thr.top) fora.push('titulo-coberto');
          const tp = document.getElementById('psTipo').getBoundingClientRect();
          return { fora: fora, tipoVisivel: tp.top >= 0 && tp.bottom <= innerHeight, rola: document.documentElement.scrollWidth > innerWidth + 1 }; });
        ok(!m.fora.length && m.tipoVisivel && !m.rola, w + ' ' + lang + ': Pessoas da família sem nada para fora do cartão, o Tipo à vista, sem rolar para o lado' + (m.fora.length || m.rola || !m.tipoVisivel ? ' — ' + JSON.stringify(m) : ''));
        const arq = path.join(FOTOS, 'pessoas-' + w + '-' + lang + '.png');
        for (let k = 0; k < 3; k++) { try { await p.screenshot({ path: arq }); break; } catch (e) { if (k === 2) throw e; await p.waitForTimeout(200); } }
        fotos.push(arq);
        await p.click('[data-acao="ps-cancelar"]').catch(() => {});
      }
    }
    console.log('    fotos: ' + FOTOS + ' (' + fotos.length + ' no total)');
    await p.setViewportSize({ width: 390, height: 900 }); await p.evaluate(() => { I18n.atual = 'pt'; });
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));

    console.log('8) a migração única: o inquilino criado como "da casa" passa para Outras pessoas');
    const ctx2 = await b.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
    await ctx2.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    const L2 = JSON.parse(JSON.stringify(LOCAL)); delete L2.config.pessoasFora3142; delete L2.config.pessoasRevisar;
    L2.pessoas.find((x) => x.id === 'ppre').nome = 'Prestador'; L2.gastos.push({ id: 'g2', data: '2026-11-12', valor: 80, desc: 'SERVICO EXEMPLO', fluxo: 'saida', grupo: 'HABITACAO', sub: 'Manutenção', quem: 'Prestador Exemplo', quemId: 'ppre', escopo: 'casa', origem: 'manual' });
    await ctx2.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(L2));
    const p2 = await ctx2.newPage(); p2.erros = []; p2.on('pageerror', (e) => p2.erros.push(String(e)));
    await p2.goto(BASE + '/'); await p2.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && Store.estado.config && Store.estado.config.pessoasFora3142 === 1);
    await p2.waitForFunction(() => /passou para Outras pessoas/.test((document.getElementById('toasts') || {}).textContent || ''), null, { timeout: 8000 }).catch(() => {});
    const m8 = await p2.evaluate(() => ({ inq: Pessoas.porId('pinq').tipo, pre: Pessoas.porId('ppre').tipo, ana: Pessoas.porId('pana').tipo, casa: (ST.visaoCasa.pessoas || []).join(), toast: (document.getElementById('toasts') || {}).textContent || '' }));
    ok(m8.inq === 'outra' && m8.casa === 'pana' && /Inquilino passou para Outras pessoas\./.test(m8.toast) && /Desfazer/.test(m8.toast), 'o Inquilino (da casa, sem confirmação) vai para Outras pessoas, sai da lista da casa e o aviso único "Inquilino passou para Outras pessoas." tem "Desfazer"');
    ok(m8.pre === 'casa' && m8.ana === 'casa', 'quem tem lançamento marcado à mão como da casa (o Prestador) e quem não parece de fora (a Ana) ficam');
    await p2.reload(); await p2.waitForFunction(() => typeof Store !== 'undefined' && Store.estado); await p2.waitForTimeout(2200);
    ok(!/passou para Outras pessoas/.test(await p2.evaluate(() => (document.getElementById('toasts') || {}).textContent || '')), 'o aviso aparece uma vez só (ao abrir de novo, nada)');
    ok(p2.erros.length === 0, 'migração: sem erro de página' + (p2.erros.length ? ': ' + p2.erros.join(' | ') : ''));
    await ctx2.close();
  } catch (e) { falhas++; console.log('  ✗ FALHOU: ' + (e && e.stack || e)); }
  finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
