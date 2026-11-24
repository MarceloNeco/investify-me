/* =====================================================================
   teste/teste-os-oficina.js — 3.101: a ordem de serviço da oficina (leitor os_oficina do Leitor OCR 0.9.7, motor 1.13.0) em
   "🧾 Conferir canhotos" → a ficha da compra parcelada. Dados FICTÍCIOS (valores, loja, CNPJ de exemplo e carros inventados).
   Confere: o motor 1.13.0 com o leitor da OS (sem IA no catálogo); o financeiro da OS chega ao item; OS + canhoto da mesma compra
   = um item (o canhoto, com a data do pagamento) que casa com a parcela 01/N; grupo Veículo, a categoria da OS e o carro prontos;
   a ficha com o CNPJ e a descrição da OS; a OS sozinha casa pela loja/CNPJ (até 30 dias depois) e não casa sem eles; orçamento;
   "Esperar o banco" com a OS: a parcela de outra loja não liga, a da oficina liga; EN e ES.
   Uso: node teste/teste-os-oficina.js
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
  gastos: [R('a1', '2026-11-12', 472, 'OFICINA EXEMPLO 01/05', OFI),
    R('b1', '2026-11-20', 500, 'OFICINA EXEMPLO 01/06', OFI), R('b2', '2026-11-18', 500, 'LOJA QUALQUER 01/06'),
    R('c1x', '2026-11-15', 250, 'LOJA QUALQUER 01/03')] };
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
    await p.clock.setFixedTime(new Date('2026-11-23T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Canhotos !== 'undefined' && typeof CompraParcelada !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-lanc'); render(); });
    const ler = (itens) => p.evaluate((x) => { Canhotos._ler = async () => JSON.parse(JSON.stringify(x)); return Canhotos.processar([new File([new Uint8Array([1])], 'f.png', { type: 'image/png' })]); }, itens);

    console.log('1) o motor 0.9.7 e o financeiro da OS');
    await ler([IT(9, 12.34, { data: '01/11/2026' })]);
    const m = await p.evaluate(() => { const t = Leitura.tipo && Leitura.tipo('os_oficina'); return { v: Leitura.versao, os: !!(Leitura.leitores && Leitura.leitores['os-oficina']), semIA: !!(t && t.semIA), cnpj: Leitura.consultaCnpjLigada() }; });
    ok(m.v === '1.13.0' && m.os && m.semIA && m.cnpj === false, 'o motor 1.13.0 (Leitor OCR 0.9.7) carrega com o leitor da OS, sem IA no catálogo, e sem a consulta de CNPJ na internet ' + JSON.stringify(m));
    const it0 = await p.evaluate((f) => Canhotos.daPapel({ tipo: 'os_oficina', fonte: { nome: 'os.jpg' }, readings: [{ text: 'OFICINA EXEMPLO\nVALOR FECHADO R$ 2.360,00 EM 5X' }],
      result: { valor: 2360, fields: [{ key: 'Estabelecimento', val: 'OFICINA EXEMPLO' }, { key: 'Data', val: '10/11/2026' }], financeiro: f, operacional: { veiculo: {} } } }, 0), FIN());
    ok(it0.documento === 'os_oficina' && it0.valor === 2360 && it0.financeiro && it0.financeiro.os === '4321' && !('operacional' in it0), 'o papel da OS vira o item do contrato 1 com o financeiro (o operacional fica de fora)');
    await p.evaluate(() => fechar('genModal'));

    console.log('2) OS + canhoto da mesma compra: um item, casa com a parcela 01/05, e já vem classificado');
    await ler([OS(1, FIN(), { mesmaCompra: 2 }), IT(2, 2360, { parcelas: 5, hora: '15:02', final: '1234', loja: 'OFIC EXEMPLO', mesmaCompra: 1 })]);
    const g1 = await p.evaluate(() => ({ txt: document.querySelector('#genBody').textContent, n: document.querySelectorAll('#genBody .cn-item').length, casou: [...document.querySelectorAll('#genBody .cn-item[data-grupo="casou"]')].length }));
    ok(g1.n === 1 && g1.casou === 1, 'a OS e o canhoto contam uma vez e casam com a 01/05 do banco (2.360 ÷ 5 = 472, data do canhoto)');
    ok(/🔧 OS 4321 · Veículo › Funilaria e pintura · 🚗 Argo Ficticio/.test(g1.txt) && /12\/11\/2026 · 15:02 · ••1234 · 5x de R\$ 472,00/.test(g1.txt), 'mostra a data e a hora do pagamento (do canhoto), o final, as parcelas e o nº da OS com a categoria e o carro (3.105: o apelido, não o texto lido)');
    await p.click('#genBody .cn-item[data-grupo="casou"] [data-acao="cn-classe"]');
    const fm = await p.evaluate(() => { const c = document.querySelector('#genBody .cn-item[data-grupo="casou"]'); return { gr: c.querySelector('[data-cn="grupo"]').value, sub: c.querySelector('[data-cn="sub"]').value, v: c.querySelector('[data-cn="veiculo"]').value }; });
    ok(fm.gr === 'VEICULO' && fm.sub === 'Funilaria e pintura' && fm.v === 'vc1', 'o formulário já vem com Veículo › Funilaria e pintura e o carro certo ("Argo Ficticio", pelo nome do veículo da OS) ' + JSON.stringify(fm));
    await p.click('#genBody .cn-item[data-grupo="casou"] [data-acao="cn-aplicar"]'); await p.waitForTimeout(100);
    const a = await p.evaluate(() => { const g = ST.gastos.find((y) => y.id === 'rb_a1'), f = CompraParcelada.lista()[0] || {}; return { g: [g.grupo, g.sub, g.veiculoId, g.desc, g.compraId === f.id], f: [f.n, f.total, f.cnpj, f.desc, f.veiculoId, f.estado, f.ate || 0], n: ST.gastos.length }; });
    ok(a.g.join('|') === 'VEICULO|Funilaria e pintura|vc1|OFICINA EXEMPLO (OS 4321) 01/05|true', 'a parcela do banco ganhou o grupo, a categoria, o carro e a descrição com o nº da OS ' + a.g.join('|'));
    ok(a.f.join('|') === '5|2360|' + CNPJ + '|OFICINA EXEMPLO (OS 4321)|vc1|ligada|0' && a.n === 4, 'a ficha da compra: 5x de 2.360, com o CNPJ da OS, ligada; nenhum lançamento criado ' + a.f.join('|'));
    await p.evaluate(() => fechar('genModal'));

    console.log('3) a OS sozinha (sem o canhoto)');
    const c = await p.evaluate((x) => { const r = Canhotos.classificar(Canhotos.juntarOS(x)); return { casou: r.casou.map((y) => y.it.papel + '=' + y.g.id), parecido: r.parecido.map((y) => y.it.papel + ':' + y.cs.map((g) => g.id).join('/')), novo: r.novo.map((y) => y.it.papel), duvida: r.duvida.map((y) => y.it.papel) }; },
      [OS(1, FIN({ valor: 3000, parcelas: 6, data: '05/11/2026' })), OS(2, FIN({ valor: 750, parcelas: 3, data: '05/11/2026', estabelecimento: 'OUTRA OFICINA', cnpj: '' }), { loja: 'OUTRA OFICINA' }),
        OS(3, FIN({ valor: null, fonte: null, parcelas: null, situacao: 'orcamento' })), OS(4, FIN({ valor: 1800, parcelas: 4, data: '01/11/2026' }))]);
    ok(c.casou.join() === '1=rb_b1', 'a OS de 3.000 em 6x (emitida 15 dias antes do pagamento) casa com a 01/06 da oficina pela loja e pelo CNPJ, e não com a 01/06 de outra loja do mesmo valor: ' + c.casou.join());
    ok(c.parecido.join() === '2:rb_c1x', 'a OS sem a loja nem o CNPJ batendo (só o valor e as parcelas) NÃO casa sozinha: vira 🟡 para confirmar: ' + c.parecido.join());
    ok(c.duvida.join() === '3' && c.novo.join() === '4', 'o orçamento (sem valor fechado nem pagamento) vai para ❓; a OS sem nada no banco vai para ➕');
    await ler([OS(3, FIN({ valor: null, fonte: null, parcelas: null, situacao: 'orcamento' })), OS(4, FIN({ valor: 1800, parcelas: 4, data: '01/11/2026' }))]);
    ok(await p.evaluate(() => /orçamento \(ainda não pago\)/.test(document.querySelector('#genBody .cn-item[data-grupo="duvida"]').textContent)), 'o orçamento aparece como "orçamento (ainda não pago)"');

    console.log('4) "Esperar o banco" com a OS: liga só com a parcela da oficina');
    await p.click('#genBody .cn-item[data-grupo="novo"] [data-acao="cn-esperar"]'); await p.waitForTimeout(100);
    const f0 = await p.evaluate(() => { const f = CompraParcelada.lista().find((x) => x.n === 4); return f && [f.estado, f.ate, f.cnpj, f.grupo, f.sub, f.veiculoId, f.desc].join('|'); });
    ok(f0 === 'aguardando|30|' + CNPJ + '|VEICULO|Funilaria e pintura|vc1|OFICINA EXEMPLO (OS 4321)', '⏳ a ficha espera a 01/04 até 30 dias depois da OS, com o CNPJ, a categoria e o carro ' + f0);
    await p.evaluate(() => { Gasto.add({ data: '2026-11-19', valor: 450, desc: 'LOJA QUALQUER 01/04', descRobo: 'LOJA QUALQUER 01/04', fluxo: 'saida', grupo: 'OUTROS', sub: '', cartaoId: 'c1', origem: 'robo' }); });
    ok(await p.evaluate(() => CompraParcelada.lista().find((x) => x.n === 4).estado === 'aguardando'), 'a 01/04 de outra loja (sem a loja nem o CNPJ) não liga');
    await p.evaluate(() => { Gasto.add({ data: '2026-11-21', valor: 450, desc: 'OFICINA EXEMPLO 01/04', descRobo: 'OFICINA EXEMPLO 01/04', fluxo: 'saida', grupo: 'OUTROS', sub: '', cartaoId: 'c1', origem: 'robo', contraparte: { nome: 'OFICINA EXEMPLO', cnpj: '11222333000181' } }); });
    const f1 = await p.evaluate(() => { const f = CompraParcelada.lista().find((x) => x.n === 4), g = ST.gastos.find((y) => y.compraId === f.id); return [f.estado, g && g.desc, g && g.grupo, g && g.veiculoId].join('|'); });
    ok(f1 === 'ligada|OFICINA EXEMPLO (OS 4321) 01/04|VEICULO|vc1', 'a 01/04 da oficina (20 dias depois da OS) liga e ganha a classificação ' + f1);
    await p.evaluate(() => fechar('genModal'));

    console.log('4b) o teste real do dono (3.105): a OS e o canhoto em fotos separadas, um pedaço do canhoto no canto da OS');
    await p.evaluate(() => { ST.cartoes.push({ id: 'c2', apelido: 'Master Ficticio', bandeira: 'master', fim: '5555', vence: 10, fecha: 3, finais: [{ fim: '5555', tipo: 'fisico' }, { fim: '9876', tipo: 'virtual' }] }); });
    const FR = FIN({ valor: 2360, parcelas: 5, data: '10/11/2026', veiculo: 'JEEP LRENEGADE 1.8 FLEX PRETA', fonte: 'fechado' });
    await ler([Object.assign(OS(1, FR, { mesmaCompra: 2, hora: '12:30' }), { arquivo: 'os.jpg' }),
      IT(2, 2360, { arquivo: 'os.jpg', data: null, loja: null, parcelas: 1, mesmaCompra: 1 }),
      Object.assign(OS(3, FIN({ valor: 2360, parcelas: 5, data: '23/11/2026', veiculo: null, fonte: 'comprovante', os: '' }), { final: '9876', hora: '12:13' }), { arquivo: 'canhoto.jpg' })]);
    const real = await p.evaluate(() => { const its = [...document.querySelectorAll('#genBody .cn-item')]; return { n: its.length, txt: its.map((x) => x.textContent).join(' || '), cart: (document.querySelector('#genBody .cn-item[data-grupo="novo"] [data-cn="cartao"]') || {}).value }; });
    ok(real.n === 1, 'as 3 leituras (a OS, o pedaço do canhoto no canto dela e o canhoto) viram UM item só: ' + real.n);
    ok(/23\/11\/2026 · 12:13 · ••9876 · 5x de R\$\s?472,00/.test(real.txt) && /🔧 OS 4321 · Veículo › Funilaria e pintura · 🚗 Renegade 2019/.test(real.txt) && !/LRENEGADE/.test(real.txt), 'fica a data, a hora e o final do canhoto, com a OS, "Veículo › Funilaria e pintura" e o carro pelo apelido (não "LRENEGADE"): ' + real.txt.replace(/\s+/g, ' ').slice(0, 200));
    ok(real.cart === 'c2', 'o cartão vem escolhido pelo final ••9876 (o 2º final do Master Ficticio), não fica em "cartão…"');
    await p.evaluate(() => fechar('genModal'));

    console.log('5) EN e ES');
    for (const [l, rx] of [['en', /🔧 Work order 4321/], ['es', /🔧 OT 4321/]]) {
      await p.evaluate((x) => { I18n.atual = x; }, l);
      await ler([OS(5, FIN({ valor: 990, parcelas: 1, data: '02/11/2026' }))]);
      ok(rx.test(await p.evaluate(() => document.querySelector('#genBody').textContent)), l.toUpperCase() + ': o rótulo da OS');
      await p.evaluate(() => fechar('genModal'));
    }
    ok(!p.erros.length, 'sem erro na página ' + p.erros.join(' | '));
    ok(!fora.some((u) => /receita|brasilapi|cnpj/i.test(u)), 'nenhuma consulta de CNPJ na internet (a OS é lida só no aparelho)');
  } finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
