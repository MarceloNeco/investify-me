/* =====================================================================
   teste/teste-foto-pronto.js — 3.117: a janela "📷 Foto de nota ou recibo" mais simples (pedido do dono). Dados FICTÍCIOS.
   Confere: a categoria só da lista do grupo, com "+ Nova categoria…" (pergunta e confirma; vai para Categorias); um caminho só —
   o botão do "Classificar" é "Fechar" sem mudança e "Salvar" com mudança; "Pronto" com mudança não salva pergunta "Salvar as
   mudanças?"; "Cadastrar este carro" com 1 toque; a foto antes do banco: "Pronto" deixa ⏳ aguardando e o banco, quando chega,
   completa as 5 parcelas sem duplicar; sem cartão escolhido, só com o final lido, a pendente casa pelo final.
   Uso: node teste/teste-foto-pronto.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const CNPJ = '11222333000181';
const R = (id, data, valor, desc, extra) => Object.assign({ id: 'rb_' + id, idRobo: id, data, valor, desc, descRobo: desc, fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1', conta: 'Itau' }, extra || {});
const OFI = { contraparte: { nome: 'OFICINA EXEMPLO', cnpj: CNPJ } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [],
  cartoes: [{ id: 'c1', apelido: 'Cartão Ficticio', bandeira: 'visa', fim: '1234', vence: 10, fecha: 3 }],
  veiculos: [{ id: 'vc1', apelido: 'Argo Ficticio', ativo: true, criadoEm: '2026-01-01' }, { id: 'vc2', apelido: 'Renegade 2019', ativo: true, criadoEm: '2026-01-01' }],
  gastos: [R('a1', '2026-11-12', 472, 'OFICINA EXEMPLO 01/05', OFI)] };
const FIN = (x) => Object.assign({ valor: 2360, fonte: 'fechado', parcelas: 5, parcela: 472, forma: 'cartão de crédito', data: '10/11/2026', categoria: 'Veículo › Funilaria e pintura',
  veiculo: 'FIAT ARGO 2020 1.0 FLEX', estabelecimento: 'OFICINA EXEMPLO', cnpj: '11.222.333/0001-81', os: '4321', situacao: 'pago' }, x || {});
const IT = (papel, valor, extra) => Object.assign({ arquivo: 'foto.jpg', papel, documento: 'cartao', valor, opcoes: [], data: '12/11/2026', hora: null, loja: null, cnpj: null, bandeira: null, tipo: 'credito', parcelas: 1, final: null, nsu: null, aut: null, doc: null, mesmaCompra: null,
  confianca: { valor: valor == null ? 'baixa' : 'alta', data: 'alta' } }, extra || {});
const OS = (papel, fin, extra) => IT(papel, fin.valor, Object.assign({ documento: 'os_oficina', data: fin.data, loja: 'OFICINA EXEMPLO', parcelas: fin.parcelas || 1, financeiro: fin,
  opcoes: fin.valor == null ? [2500] : [], confianca: { valor: fin.valor == null ? 'baixa' : 'alta', data: 'alta' } }, extra || {}));

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch(), fora = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => { const u = r.request().url(); if (u.startsWith(BASE)) return r.continue(); fora.push(u); return r.abort(); });
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    const respostas = []; p.on('dialog', (d) => { const r = respostas.shift(); d.accept(typeof r === 'string' ? r : undefined); });
    await p.clock.setFixedTime(new Date('2026-11-23T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Canhotos !== 'undefined' && typeof CompraParcelada !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-lanc'); render(); });
    const ler = (itens) => p.evaluate((x) => { Canhotos._ler = async () => JSON.parse(JSON.stringify(x)); return Canhotos.processar([new File([new Uint8Array([1])], 'f.png', { type: 'image/png' })]); }, itens);

    console.log('1) "Classificar": categoria só da lista, "+ Nova categoria…" com confirmação, e "Salvar as mudanças?" no Pronto');
    await ler([OS(1, FIN(), { mesmaCompra: 2 }), IT(2, 2360, { parcelas: 5, hora: '15:02', final: '1234', loja: 'OFIC EXEMPLO', mesmaCompra: 1 })]);
    await p.click('#genBody .cn-item[data-grupo="casou"] [data-acao="cn-classe"]');
    const sel = await p.evaluate(() => { const s = document.querySelector('#genBody .cn-item[data-grupo="casou"] [data-cn="sub"]'); return { tag: s.tagName, nova: [...s.options].some((o) => o.value === '__nova'), v: s.value }; });
    ok(sel.tag === 'SELECT' && sel.nova && sel.v === 'Funilaria e pintura', 'a categoria é um seletor (as do grupo) com "+ Nova categoria…", já em "Funilaria e pintura": ' + JSON.stringify(sel));
    respostas.push('Polimento Ficticio', true);
    await p.evaluate(() => { const s = document.querySelector('#genBody .cn-item[data-grupo="casou"] [data-cn="sub"]'); s.value = '__nova'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await p.waitForTimeout(150);
    const nv = await p.evaluate(() => ({ v: document.querySelector('#genBody .cn-item[data-grupo="casou"] [data-cn="sub"]').value, cat: (ST.categorias.VEICULO || []).indexOf('Polimento Ficticio') >= 0, bt: document.querySelector('#genBody .cn-salvar').textContent }));
    ok(nv.v === 'Polimento Ficticio' && nv.cat && /Salvar/.test(nv.bt), '"+ Nova categoria…" pergunta o nome, confirma e cria em Categorias (Veículo); o botão vira "Salvar": ' + JSON.stringify(nv));
    await p.click('#genBody [data-acao="cn-fechar"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => /Salvar as mudanças\?/.test(document.querySelector('#genBody .cn-rodape').textContent) && !!document.querySelector('[data-acao="cn-salvar-tudo"]') && !!document.querySelector('[data-acao="cn-descartar"]')), 'Pronto com mudança não salva: "Salvar as mudanças?" (Salvar / Descartar)');
    await p.click('[data-acao="cn-salvar-tudo"]'); await p.waitForTimeout(150);
    const g = await p.evaluate(() => { const x = ST.gastos.find((y) => y.id === 'rb_a1'); return [x.grupo, x.sub, x.veiculoId].join('|'); });
    ok(g === 'VEICULO|Polimento Ficticio|vc1' && await p.evaluate(() => document.getElementById('genModal').classList.contains('hidden')), 'Salvar: a categoria nova vai para o lançamento do banco e a janela fecha: ' + g);

    console.log('2) o carro da OS que não está no cadastro: "Cadastrar este carro"');
    await ler([OS(3, FIN({ valor: 990, parcelas: 1, data: '20/11/2026', veiculo: 'CARRO INVENTADO XYZ 1.0', os: '777' }))]);
    const t0 = await p.evaluate(() => document.querySelector('#genBody').textContent);
    ok(/🚗 CARRO INVENTADO XYZ 1\.0/.test(t0) && !!(await p.$('#genBody [data-acao="cn-carro"]')), 'sem o carro no cadastro: o texto lido e o botão "Cadastrar este carro"');
    respostas.push('Xyz Inventado');
    await p.click('#genBody [data-acao="cn-carro"]'); await p.waitForTimeout(150);
    const t1 = await p.evaluate(() => ({ txt: document.querySelector('#genBody').textContent, v: Veiculos.lista().map((x) => x.apelido).join() }));
    ok(/🚗 Xyz Inventado/.test(t1.txt) && /Xyz Inventado/.test(t1.v) && !(await p.$('#genBody [data-acao="cn-carro"]')), 'um toque cadastra o carro e a linha passa a mostrar o apelido: ' + t1.v);
    await p.evaluate(() => fechar('genModal'));

    console.log('3) a foto antes do banco: Pronto → ⏳ aguardando; o banco chega → completa as 5 parcelas sem duplicar');
    const n0 = await p.evaluate(() => ST.gastos.length);
    await ler([OS(4, FIN({ valor: 1500, parcelas: 5, parcela: 300, data: '21/11/2026', estabelecimento: 'OFICINA EXEMPLO', os: '888' }), { final: '1234', hora: '10:00' })]);
    ok(await p.evaluate(() => /Quando o banco mandar, a foto se junta sozinha\./.test(document.querySelector('#genBody').textContent) && !document.querySelector('#genBody [data-acao="cn-esperar"]')), 'não veio do banco: "Quando o banco mandar, a foto se junta sozinha." e nada para escolher');
    await p.click('#genBody [data-acao="cn-fechar"]'); await p.waitForTimeout(150);
    const f0 = await p.evaluate(() => { const f = CompraParcelada.lista().find((x) => x.total === 1500); return f ? f.estado + '|' + f.n : ''; });
    ok(f0 === 'aguardando|5', 'Pronto: a compra fica ⏳ aguardando o banco (a ficha de 5 parcelas), sem escolher nada: ' + f0);
    await p.evaluate(() => { for (let k = 1; k <= 5; k++) Gasto.add({ id: 'rb_p' + k, idRobo: 'p' + k, data: '2026-1' + (k < 3 ? '1' : '2') + '-' + (k < 3 ? (k === 1 ? '24' : '30') : '0' + k), valor: 300, desc: 'OFICINA EXEMPLO 0' + k + '/05', descRobo: 'OFICINA EXEMPLO 0' + k + '/05', fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1', conta: 'Itau', contraparte: { nome: 'OFICINA EXEMPLO', cnpj: '11222333000181' } }); });
    await p.waitForTimeout(150);
    const f1 = await p.evaluate(() => { const f = CompraParcelada.lista().find((x) => x.total === 1500), gs = ST.gastos.filter((y) => /^rb_p/.test(y.id)); return { est: f.estado, gs: gs.map((y) => y.grupo + '|' + y.sub + '|' + (y.compraId === f.id)).join(','), n: ST.gastos.length }; });
    ok(f1.est === 'ligada' && f1.gs.split(',').length === 5 && f1.gs.split(',').every((x) => /^VEICULO\|Funilaria e pintura\|true$/.test(x)), 'o banco chegou: a ficha liga e as 5 parcelas ganham Veículo › Funilaria e pintura: ' + f1.gs);
    ok(f1.n === n0 + 5, 'nada duplicado: só as 5 parcelas do banco entraram (' + (f1.n - n0) + ')');

    console.log('4) sem cartão escolhido, só com o final lido (compra à vista): espera e casa pelo final');
    await p.evaluate(() => { ST.cartoes.push({ id: 'c3', apelido: 'Outro Ficticio', bandeira: 'master', fim: '4444', vence: 10, fecha: 3 }); });
    await ler([IT(5, 77.7, { data: '22/11/2026', loja: 'LOJA FINAL EXEMPLO', final: '7777', hora: '11:11' })]);
    await p.click('#genBody [data-acao="cn-fechar"]'); await p.waitForTimeout(150);
    const pe = await p.evaluate(() => PrintColar.pendentes().filter((x) => x.valor === 77.7).map((x) => x.final + '|' + (x.cartaoId || '-')).join());
    ok(pe === '7777|-', 'Pronto: fica ⏳ aguardando o banco com o final ••7777 (sem cartão cadastrado com esse final): ' + pe);
    await p.evaluate(() => { Gasto.add({ id: 'rb_f7', idRobo: 'f7', data: '2026-11-23', valor: 77.7, desc: 'LOJA FINAL EXEMPLO', descRobo: 'LOJA FINAL EXEMPLO', fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', finalCartao: '7777', conta: 'Itau' }); });
    await p.waitForTimeout(150);
    ok(await p.evaluate(() => !PrintColar.pendentes().some((x) => x.valor === 77.7)), 'o banco mandou a compra com o final ••7777: a pendente da foto se juntou a ela');

    ok(p.erros.length === 0 && !fora.some((u) => /receita|brasilapi|cnpj/i.test(u)), 'sem erro de página e nenhuma consulta de CNPJ na internet' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
