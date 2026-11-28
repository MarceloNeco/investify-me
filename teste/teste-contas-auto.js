/* =====================================================================
   teste/teste-contas-auto.js — 3.142: o pagamento que se repete entra SOZINHO em Contas fixas (modulos/contas-auto.js + contas-mes.js 1.3.0).
   Dados FICTÍCIOS (Escola Exemplo, Internet Exemplo, Mercado Exemplo; valores redondos).
   Confere: 2 meses seguidos bastam, sem confirmação; a mesma escola com mensalidade (~dia 12) e período ampliado (dia 25) vira 2 contas;
   os pagamentos de antes ficam ligados e aparecem como pagos; mercado (gasto do dia a dia), pagamento de 1 mês só e imposto da empresa
   não entram sozinhos; o selinho "detectada automaticamente"; tocar → [Não é conta fixa] (tira, desliga e não volta) e [Editar]; o
   lançamento novo (gasto.novo) dispara a detecção; o aviso antes do vencimento no 📥; quem vê só a casa não cria nada; fotos de
   Contas fixas em 360/390/768/1366/1920/2560 × PT/EN/ES.
   Uso: node teste/teste-contas-auto.js   (fotos em <tmp>/contas-auto-3142/)
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..'), FOTOS = path.join(os.tmpdir(), 'contas-auto-3142');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const G = (id, data, valor, desc, grupo, sub, extra) => Object.assign({ id: id, data: data, valor: valor, desc: desc, descRobo: desc, fluxo: 'saida', grupo: grupo, sub: sub, origem: 'robo', per: 'Mensal' }, extra || {});
const LOCAL = { v: 1, config: { fitaLigada: false, pessoasV: 2, pessoasFora3142: 1 }, posicoes: [], recorrentes: [], cartoes: [], pessoas: [],
  gastos: [
    G('e1', '2026-10-12', 2300, 'ESCOLA EXEMPLO LTDA', 'DEPENDENTES', 'Escola'), G('e2', '2026-11-13', 2310, 'ESCOLA EXEMPLO LTDA', 'DEPENDENTES', 'Escola'),
    G('a1', '2026-10-25', 900, 'ESCOLA EXEMPLO LTDA', 'DEPENDENTES', 'Escola'), G('a2', '2026-11-25', 900, 'ESCOLA EXEMPLO LTDA', 'DEPENDENTES', 'Escola'),
    G('m1', '2026-10-03', 120, 'MERCADO EXEMPLO', 'ALIMENTACAO', 'Supermercado', { per: 'Pontual' }), G('m2', '2026-11-04', 130, 'MERCADO EXEMPLO', 'ALIMENTACAO', 'Supermercado', { per: 'Pontual' }),
    G('u1', '2026-11-08', 450, 'LOJA UMA VEZ EXEMPLO', 'OUTROS', 'Sem categoria', { per: 'Pontual' }),
    G('d1', '2026-10-20', 300, 'DAS SIMPLES NACIONAL', 'OUTROS', 'Impostos'), G('d2', '2026-11-20', 300, 'DAS SIMPLES NACIONAL', 'OUTROS', 'Impostos')] };

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
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof ContasAuto !== 'undefined');
    await p.waitForFunction(() => (ST.recorrentes || []).some((r) => r.auto));
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); });
    const rs = () => p.evaluate(() => JSON.parse(JSON.stringify(Recorrente.todos().filter((r) => r.auto).map((r) => ({ id: r.id, nome: r.nome, valor: r.valor, dia: r.dia, sub: r.sub, pagos: Gasto.todos().filter((g) => g.recorrenteId === r.id).map((g) => g.id).sort().join(',') })).sort((a, b) => a.dia - b.dia))));

    console.log('1) entra sozinho, sem confirmação');
    const r1 = await rs();
    ok(r1.length === 2, 'duas contas fixas criadas sozinhas ao abrir o app (' + r1.map((r) => r.nome + ' ' + r.valor + ' dia ' + r.dia).join(' / ') + ')');
    ok(r1[0] && r1[0].dia >= 12 && r1[0].dia <= 13 && r1[0].valor === 2305 && r1[0].pagos === 'e1,e2', 'a mensalidade: média R$ 2.305, dia ~12, os 2 pagamentos ligados');
    ok(r1[1] && r1[1].dia === 25 && r1[1].valor === 900 && r1[1].pagos === 'a1,a2', 'o período ampliado: R$ 900, dia 25, os 2 pagamentos ligados (a mesma escola vira 2 contas)');
    ok(r1.length === 2 && / · dia 13$/.test(r1[0].nome) && / · dia 25$/.test(r1[1].nome), 'as duas contas da mesma escola se distinguem pelo dia no nome (' + r1.map((r) => r.nome).join(' / ') + ')');
    ok(await p.evaluate(() => Recorrente.atrasados().length === 0 && Pagamento.todos().filter((x) => x.estado === 'confirmado' && x.gastoId).length === 4), 'os meses pagos ficam registrados (4 pagamentos conciliados) e nada aparece como "vencimento sem marcação"');
    ok(await p.evaluate(() => !Recorrente.todos().some((r) => /MERCADO|UMA VEZ|DAS/i.test(r.nome))), 'mercado (dia a dia), pagamento de 1 mês só e imposto da empresa não entram sozinhos');

    console.log('2) Contas fixas: pagas, selinho, tocar');
    await p.evaluate(() => { irPara('b-custos'); render(); }); await p.waitForTimeout(150);
    const t2 = await p.evaluate(() => [...document.querySelectorAll('.cm-linha')].map((l) => l.textContent.replace(/\s+/g, ' ').trim()));
    ok(t2.filter((x) => /ESCOLA EXEMPLO|Escola Exemplo/i.test(x) && /detectada automaticamente/.test(x) && /Paga/.test(x)).length === 2, 'as duas aparecem em Contas fixas de novembro, pagas, com "detectada automaticamente" — ' + t2.join(' | ').slice(0, 200));
    await p.click('.cm-linha[data-acao="ca-abrir"]'); await p.waitForTimeout(100);
    const m2 = await p.evaluate(() => ({ t: document.getElementById('genBody').textContent, b: [...document.querySelectorAll('#genBody button')].map((x) => x.textContent) }));
    ok(/Detectada automaticamente/.test(m2.t) && m2.b.join('|') === 'Não é conta fixa|Editar', 'tocar abre "Não é conta fixa" e "Editar" (' + m2.b.join(' | ') + ')');
    const alvo = await p.evaluate(() => document.querySelector('#genBody [data-acao="ca-nao"]').dataset.id);
    await p.click('#genBody [data-acao="ca-nao"]'); await p.waitForTimeout(150);
    const r3 = await p.evaluate((id) => ({ existe: !!Recorrente.achar(id), ligados: Gasto.todos().filter((g) => g.recorrenteId === id).length, n: Recorrente.todos().filter((r) => r.auto).length }), alvo);
    ok(!r3.existe && r3.ligados === 0 && r3.n === 1, '"Não é conta fixa": sai, os pagamentos se desligam e a outra continua');
    await p.evaluate(() => ContasAuto.detectar());
    ok((await rs()).length === 1, 'e não volta na próxima detecção');

    console.log('3) lançamento novo dispara; aviso antes do vencimento; visão da casa');
    await p.evaluate(() => { Gasto.add({ id: 'i1', data: '2026-10-15', valor: 99.9, desc: 'INTERNET EXEMPLO', descRobo: 'INTERNET EXEMPLO', fluxo: 'saida', grupo: 'HABITACAO', sub: 'Internet', origem: 'robo', per: 'Mensal' });
      Gasto.add({ id: 'i2', data: '2026-11-15', valor: 99.9, desc: 'INTERNET EXEMPLO', descRobo: 'INTERNET EXEMPLO', fluxo: 'saida', grupo: 'HABITACAO', sub: 'Internet', origem: 'robo', per: 'Mensal' }); });
    await p.waitForFunction(() => Recorrente.todos().some((r) => r.auto && /INTERNET/i.test(r.nome)), null, { timeout: 4000 }).catch(() => {});
    ok(await p.evaluate(() => Recorrente.todos().some((r) => r.auto && /INTERNET/i.test(r.nome) && r.dia === 15)), 'a internet (2º mês chegou agora) entra sozinha logo depois do lançamento novo');
    await p.clock.setFixedTime(new Date('2026-12-12T12:00:00-03:00'));
    const v = await p.evaluate(() => inboxItens().filter((x) => x.tipo === 'vencer').map((x) => x.nome + ' ' + x.data));
    ok(v.some((x) => /INTERNET/i.test(x) && /2026-12-15/.test(x)), 'o 📥 avisa antes do vencimento (internet em 15/12) — ' + v.join(' | '));
    await p.clock.setFixedTime(new Date('2026-11-28T12:00:00-03:00'));
    const casa = await p.evaluate(() => { const o = Escopo.soCasa; Escopo.soCasa = () => true; Gasto.add({ id: 't1', data: '2026-10-05', valor: 60, desc: 'ACADEMIA EXEMPLO', descRobo: 'ACADEMIA EXEMPLO', fluxo: 'saida', grupo: 'SAUDE', sub: 'Academia', origem: 'robo' });
      Gasto.add({ id: 't2', data: '2026-11-05', valor: 60, desc: 'ACADEMIA EXEMPLO', descRobo: 'ACADEMIA EXEMPLO', fluxo: 'saida', grupo: 'SAUDE', sub: 'Academia', origem: 'robo' });
      const n = ContasAuto.detectar().length; Escopo.soCasa = o; return n; });
    ok(casa === 0, 'no aparelho de quem vê só a casa, nada é criado');

    console.log('4) fotos de Contas fixas nas 6 larguras × 3 idiomas');
    for (const lang of ['pt', 'en', 'es']) {
      for (const w of [360, 390, 768, 1366, 1920, 2560]) {
        await p.setViewportSize({ width: w, height: 900 });
        await p.evaluate((l) => { I18n.atual = l; irPara('b-custos'); render(); }, lang); await p.waitForTimeout(120);
        const m = await p.evaluate(() => { const c = document.querySelector('.cm-card').getBoundingClientRect();
          const fora = [...document.querySelectorAll('.cm-card .cm-linha, .cm-card .ca-selo, .cm-card .cm-selo')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > c.right + 0.5 || r.left < c.left - 0.5); }).length;
          return { fora: fora, rola: document.documentElement.scrollWidth > innerWidth + 1, selo: document.querySelectorAll('.cm-card .ca-selo').length }; });
        ok(!m.fora && !m.rola && m.selo >= 2, w + ' ' + lang + ': Contas fixas sem nada fora do cartão, sem rolar para o lado, com o selinho' + (m.fora || m.rola ? ' — ' + JSON.stringify(m) : ''));
        await p.screenshot({ path: path.join(FOTOS, 'contas-' + w + '-' + lang + '.png') });
      }
    }
    console.log('    fotos: ' + FOTOS);
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
  } catch (e) { falhas++; console.log('  ✗ FALHOU: ' + (e && e.stack || e)); }
  finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
