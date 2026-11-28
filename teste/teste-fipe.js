/* =====================================================================
   teste/teste-fipe.js — 3.141: o valor do carro pela Tabela FIPE (modulos/fipe.js no cadastro de modulos/bens.js). A API da FIPE
   é SIMULADA com dados FICTÍCIOS (Marca Exemplo, código 999999-9, valores redondos); nada sai para a internet.
   Confere: marca → modelo → ano; "Valor FIPE de <mês/ano>: R$ X"; o código FIPE guardado e o valor do bem = FIPE; a nota na lista;
   uma vez por mês ao abrir (1 consulta pelo código; no mesmo mês, nenhuma; no começo do mês, enquanto a FIPE do mês não sai, tenta
   de novo); fonte fora do ar ou no limite (429): fica o último valor, com a data, nunca zera; "o valor que eu acho" (mexer no valor
   marca sozinho) não atualiza; só marca/modelo/ano vão à FIPE; EN e ES; 390 px.
   Uso: node teste/teste-fipe.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [], cartoes: [], gastos: [] };
const FIPE = 'https://fipe.parallelum.com.br/api/v2';

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  /* a FIPE simulada: o que responde por código muda conforme o teste */
  const pedidos = []; let porCodigo = { status: 200, price: 'R$ 48.500,00', ref: 'dezembro de 2026' };
  const RESP = {
    '/cars/brands': [{ code: '901', name: 'Marca Exemplo' }, { code: '902', name: 'Outra Marca Exemplo' }],
    '/cars/brands/901/models': [{ code: '7001', name: 'Modelo Exemplo 1.0' }],
    '/cars/brands/901/models/7001/years': [{ code: '2022-1', name: '2022 Gasolina' }],
    '/cars/brands/901/models/7001/years/2022-1': { vehicleType: 1, price: 'R$ 50.000,00', brand: 'Marca Exemplo', model: 'Modelo Exemplo 1.0', modelYear: 2022, fuel: 'Gasolina', codeFipe: '999999-9', referenceMonth: 'novembro de 2026' },
    '/motorcycles/brands': [{ code: '951', name: 'Moto Exemplo' }]
  };
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => {
      const u = r.request().url();
      if (u.startsWith(BASE)) return r.continue();
      if (u.startsWith(FIPE)) {
        const c = u.slice(FIPE.length); pedidos.push(c);
        const h = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
        if (c === '/cars/999999-9/years/2022-1') return porCodigo.status !== 200 ? r.fulfill({ status: porCodigo.status, headers: h, body: '{"error":"limite"}' })
          : r.fulfill({ status: 200, headers: h, body: JSON.stringify({ vehicleType: 1, price: porCodigo.price, brand: 'Marca Exemplo', model: 'Modelo Exemplo 1.0', modelYear: 2022, codeFipe: '999999-9', referenceMonth: porCodigo.ref }) });
        return RESP[c] ? r.fulfill({ status: 200, headers: h, body: JSON.stringify(RESP[c]) }) : r.fulfill({ status: 404, headers: h, body: '[]' });
      }
      return r.abort();
    });
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.clock.setFixedTime(new Date('2026-11-24T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Fipe !== 'undefined' && typeof Bens !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('investify'); irPara('carteira'); render(); });
    const carro = () => p.evaluate(() => JSON.parse(JSON.stringify(PatrimonioIliquido.lista().find((y) => y.tipo === 'carro') || null)));
    const info = () => p.evaluate(() => document.querySelector('.bn-fipe-info').textContent);

    console.log('1) marca → modelo → ano → valor');
    await p.evaluate(() => Bens.abrir('carro'));
    await p.waitForFunction(() => document.querySelectorAll('#bnFipeMarca option').length > 1);
    ok(await p.evaluate(() => [...document.querySelectorAll('#bnFipeMarca option')].map((o) => o.textContent).join('|')) === 'escolha…|Marca Exemplo|Outra Marca Exemplo', 'a lista de marcas da FIPE aparece ao abrir o carro');
    await p.selectOption('#bnFipeMarca', '901'); await p.waitForFunction(() => document.querySelectorAll('#bnFipeModelo option').length > 1);
    await p.selectOption('#bnFipeModelo', '7001'); await p.waitForFunction(() => document.querySelectorAll('#bnFipeAno option').length > 1);
    await p.selectOption('#bnFipeAno', '2022-1'); await p.waitForFunction(() => /Valor FIPE/.test(document.querySelector('.bn-fipe-info').textContent));
    const f1 = await p.evaluate(() => ({ i: document.querySelector('.bn-fipe-info').textContent, v: document.getElementById('bnValor').value, m: document.getElementById('bnMarca').value, mo: document.getElementById('bnModelo').value, a: document.getElementById('bnAno').value, man: document.getElementById('bnManual').checked }));
    ok(/^Valor FIPE de novembro de 2026: R\$\s?50\.000,00$/.test(f1.i), '"Valor FIPE de novembro de 2026: R$ 50.000,00" ' + f1.i);
    ok(f1.v === '50000' && f1.m === 'Marca Exemplo' && f1.mo === 'Modelo Exemplo 1.0' && f1.a === '2022' && !f1.man, 'preenche marca, modelo, ano e o valor; "o valor que eu acho" desmarcado');
    await p.click('[data-acao="bens-salvar"]'); await p.waitForTimeout(100);
    const c1 = await carro();
    ok(c1 && c1.valor === 50000 && c1.carro.fipe.codigo === '999999-9' && c1.carro.fipe.ano === '2022-1' && c1.carro.fipe.tipo === 'cars' && c1.carro.fipe.mes === '2026-11' && !c1.valorManual, 'guarda o código FIPE (999999-9, ano 2022-1) e o valor do bem é o da FIPE ' + JSON.stringify(c1 && c1.carro.fipe));
    await p.evaluate(() => { irPara('carteira'); render(); });
    ok(/Tabela FIPE de novembro de 2026/.test(await p.evaluate(() => document.querySelector('.il-card').textContent)), 'na lista dos bens: "Tabela FIPE de novembro de 2026"');

    console.log('2) uma vez por mês, ao abrir');
    let n = pedidos.length; await p.evaluate(() => Fipe.atualizarTodos());
    ok(pedidos.length === n, 'no mesmo mês (novembro), nenhuma consulta');
    await p.clock.setFixedTime(new Date('2026-12-05T12:00:00-03:00'));
    n = pedidos.length; await p.evaluate(() => Fipe.atualizarTodos());
    const c2 = await carro();
    ok(pedidos.slice(n).join() === '/cars/999999-9/years/2022-1' && c2.valor === 48500 && c2.carro.fipe.ref === 'dezembro de 2026' && c2.carro.fipe.mes === '2026-12' && c2.data === '2026-12-05', 'em dezembro: 1 consulta pelo código FIPE e o valor vira 48.500,00 (dezembro de 2026)');
    await p.clock.setFixedTime(new Date('2027-01-02T12:00:00-03:00'));
    n = pedidos.length; await p.evaluate(() => Fipe.atualizarTodos());
    ok(pedidos.length === n + 1 && (await carro()).carro.fipe.mes === '2026-12', '2 de janeiro, a FIPE ainda diz "dezembro de 2026": guarda e tenta de novo na próxima vez que abrir');
    n = pedidos.length; await p.evaluate(() => Fipe.atualizarTodos());
    ok(pedidos.length === n + 1, '… e tenta mesmo (1 consulta)');
    porCodigo = { status: 200, price: 'R$ 47.000,00', ref: 'janeiro de 2027' };
    await p.evaluate(() => Fipe.atualizarTodos());
    ok((await carro()).valor === 47000 && (await carro()).carro.fipe.mes === '2027-01', 'saiu a de janeiro: 47.000,00, e para de consultar no mês');

    console.log('3) a fonte falha ou bate o limite');
    await p.clock.setFixedTime(new Date('2027-02-10T12:00:00-03:00'));
    porCodigo = { status: 429 };
    await p.evaluate(() => Fipe.atualizarTodos());
    const c3 = await carro();
    ok(c3.valor === 47000 && c3.data === '2027-01-02' && c3.carro.fipe.falhou === '2027-02-10', 'limite (429): fica 47.000,00 com a data dele (02/01/2027), nunca zera');
    await p.evaluate(() => { irPara('carteira'); render(); });
    const l3 = await p.evaluate(() => document.querySelector('.il-card').textContent);
    ok(/Tabela FIPE de janeiro de 2027 · não atualizou em 10\/Fev\/2027/.test(l3) && /valor de 02\/Jan\/2027/.test(l3), 'a lista diz "não atualizou em 10/Fev/2027" e "valor de 02/Jan/2027" ' + (l3.match(/Tabela FIPE[^R]*/) || [''])[0]);
    porCodigo = { status: 500 };
    await p.evaluate(() => Fipe.atualizarTodos());
    ok((await carro()).valor === 47000, 'fora do ar (500): continua 47.000,00');

    console.log('4) o valor que eu acho');
    await p.evaluate((id) => Bens.abrir(null, { id: id }), c3.id);
    ok(/Valor FIPE de janeiro de 2027: R\$\s?47\.000,00 \(a FIPE não respondeu em 10\/Fev\/2027; fica este\)/.test(await info()), 'ao editar: "Valor FIPE de janeiro de 2027: R$ 47.000,00 (a FIPE não respondeu em …; fica este)"');
    await p.fill('#bnValor', '45000');
    ok(await p.evaluate(() => document.getElementById('bnManual').checked), 'mexer no valor marca sozinho "Usar o valor que eu acho"');
    await p.click('[data-acao="bens-salvar"]'); await p.waitForTimeout(100);
    porCodigo = { status: 200, price: 'R$ 46.000,00', ref: 'fevereiro de 2027' };
    n = pedidos.length; await p.evaluate(() => Fipe.atualizarTodos());
    const c4 = await carro();
    ok(c4.valor === 45000 && c4.valorManual === true && pedidos.length === n, 'com "o valor que eu acho": fica 45.000,00 e o app não consulta a FIPE');
    await p.evaluate(() => { irPara('carteira'); render(); });
    ok(!/Tabela FIPE/.test(await p.evaluate(() => document.querySelector('.il-card').textContent)), 'e a lista não diz mais "Tabela FIPE"');
    await p.evaluate((id) => Bens.abrir(null, { id: id }), c3.id);
    await p.uncheck('#bnManual'); await p.waitForTimeout(50);
    ok(await p.evaluate(() => document.getElementById('bnValor').value) === '47000', 'desmarcar volta o valor da FIPE');
    await p.click('[data-acao="bens-salvar"]'); await p.waitForTimeout(100);
    await p.evaluate(() => Fipe.atualizarTodos());
    ok((await carro()).valor === 46000 && !(await carro()).valorManual, 'de volta à FIPE: atualiza para 46.000,00 (fevereiro de 2027)');

    console.log('5) privacidade, fonte fora ao abrir, idiomas, celular');
    ok(pedidos.every((c) => /^\/(cars|motorcycles)\/(brands(\/\d+\/models(\/\d+\/years(\/[\w-]+)?)?)?|\d{6}-\d\/years\/[\w-]+)$/.test(c)), 'à FIPE só vão tipo, marca, modelo e ano (códigos): ' + [...new Set(pedidos)].join(' '));
    await p.evaluate(() => fechar('genModal'));
    await ctx.route(FIPE + '/**', (r) => r.abort());
    await p.evaluate(() => { Bens.abrir('carro'); });
    await p.selectOption('#bnFipeTipo', 'motorcycles'); await p.waitForTimeout(150);
    ok(/A tabela FIPE não respondeu agora/.test(await info()), 'sem a FIPE: "A tabela FIPE não respondeu agora…" e dá para preencher à mão');
    await p.evaluate(() => fechar('genModal'));
    for (const [l, rx] of [['en', /FIPE table \(Brazil’s official used-car price list\)[\s\S]*Use my own value/], ['es', /Tabla FIPE \(precios oficiales de usados en Brasil\)[\s\S]*Usar el valor que yo creo/]]) {
      await p.evaluate((x) => { I18n.atual = x; Bens.abrir('carro'); }, l);
      ok(rx.test(await p.evaluate(() => document.querySelector('.bn-fipe').textContent)), l.toUpperCase() + ': o bloco da FIPE traduzido');
      await p.evaluate(() => fechar('genModal'));
    }
    await p.evaluate(() => { I18n.atual = 'pt'; });
    await p.setViewportSize({ width: 390, height: 800 }); await p.evaluate(() => Bens.abrir('carro')); await p.waitForTimeout(100);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= 391 && document.querySelector('#genModal .modal').scrollWidth <= document.querySelector('#genModal .modal').clientWidth + 1), '390 px: a janela do carro sem rolagem para o lado');
    await p.screenshot({ path: path.join(require('os').tmpdir(), 'fipe-390.png') });
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
  } catch (e) { falhas++; console.log('  ✗ FALHOU: ' + (e && e.stack || e)); }
  finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
