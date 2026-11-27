/* =====================================================================
   teste/teste-bens-carregar.js — 3.140: o topo da Carteira com 2 botões e o cadastro guiado de imóveis, carro e outros bens.
   Dados FICTÍCIOS. Confere: só "📎 Carregar documento" e "🏠 Imóveis, carro e outros bens" no topo (os 5 de antes saíram); a janela
   do Carregar documento (arquivo, foto ou print, colar texto) com o ⓘ do que o app entende; o palpite pelo nome (FGTS, escritura);
   o "o que é?" com os 6 tipos; imóvel alugado → renda; financiado → dívida + parcela (sem duplicar ao editar); na planta → "a pagar";
   de quem é (pessoas da família); carro (marca, modelo, ano); "veio da declaração de <ano>"; celular sem rolar para o lado.
   Uso: node teste/teste-bens-carregar.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, gastos: [], recorrentes: [], posicoes: [{ id: 'a', ticker: 'EXMP3', nome: 'Exemplo', tipo: 'acao-br', inst: 'Corretora Exemplo', qtd: 10, pm: 10, moeda: 'BRL' }],
  pessoas: [{ id: 'pe1', nome: 'Pessoa', sobrenome: 'Exemplo', tipo: 'casa', papel: 'titular' }, { id: 'pe2', nome: 'Outra', sobrenome: 'Exemplo', tipo: 'casa', papel: 'conjuge' }],
  patrimonio_iliquido: [{ id: 'il1', nome: 'Terreno Exemplo', tipo: 'imovel', inst: '', valor: 50000, data: '2025-12-31', obs: '', decRef: '11.01|terreno exemplo', decAno: 2026 }] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.Bens && window.CarregarDoc);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('investify'); irPara('carteira'); render(); });

    console.log('1) o topo da Carteira');
    const topo = await p.evaluate(() => [...document.querySelectorAll('#view-carteira .cd-acoes button')].map((x) => x.textContent.trim()));
    const velhos = await p.evaluate(() => ['iliq-novo', 'fgts-ler', 'pt-colar', 'pt-foto', 'posimp-escolher'].filter((a) => [...document.querySelectorAll('#view-carteira [data-acao="' + a + '"]')].some((e) => e.offsetParent)));
    ok(topo.length === 2 && /📎 Carregar documento/.test(topo[0]) && /🏠 Imóveis, carro e outros bens/.test(topo[1]) && !velhos.length, 'dois botões: "📎 Carregar documento" e "🏠 Imóveis, carro e outros bens"; os 5 de antes saíram ' + JSON.stringify(velhos));
    await p.click('#view-carteira [data-acao="cd-abrir"]');
    const jan = await p.evaluate(() => ({ b: [...document.querySelectorAll('#genBody button')].map((x) => x.textContent.trim()).join(' | '), i: [...document.querySelectorAll('#genBody .cd-entende li')].map((x) => x.textContent) }));
    ok(/Escolher arquivo/.test(jan.b) && /Foto ou print/.test(jan.b) && /Colar texto/.test(jan.b), 'a janela: 📁 Escolher arquivo · 📷 Foto ou print · 📋 Colar texto');
    ok(jan.i.length === 6 && /Extrato da corretora/.test(jan.i[0]) && /Informe de rendimentos/.test(jan.i[1]) && /Declaração do IR/.test(jan.i[2]) && /Extrato do FGTS/.test(jan.i[3]) && /Extrato bancário/.test(jan.i[4]) && /Contrato ou escritura de imóvel/.test(jan.i[5]), 'o ⓘ "O que o app entende": corretora, informe, declaração, FGTS, extrato bancário, contrato/escritura');
    const pal = await p.evaluate(() => { const F = (n) => new File(['x'], n, { type: 'application/pdf' }); return [Partilha.palpite([F('extrato-fgts-exemplo.pdf')]), Partilha.palpite([F('escritura-apartamento.pdf')]), Partilha.palpite([F('informe_rendimentos_2025.pdf')]), Partilha.palpite([F('documento.pdf')], 'RECIBO DE ENTREGA DA DECLARAÇÃO DE AJUSTE ANUAL')].join('|'); });
    ok(pal === 'fgts|imovel|informe|declaracao', 'o palpite: FGTS, escritura → imóvel, informe, declaração (' + pal + ')');
    await p.evaluate(() => fechar('genModal'));

    console.log('2) o cadastro guiado: o que é?');
    await p.click('#view-carteira .cd-acoes [data-acao="bens-novo"]');
    const tipos = await p.evaluate(() => [...document.querySelectorAll('#genBody [data-acao="bens-tipo"]')].map((x) => x.dataset.v).join());
    ok(tipos === 'imovel,carro,fgts,previdencia,empresa,outro', 'primeiro "o que é?": Imóvel, Carro ou moto, FGTS, Previdência bloqueada, Participação em empresa, Outro');
    await p.click('#genBody [data-acao="bens-tipo"][data-v="imovel"]');
    await p.fill('#bnNome', 'Apartamento Exemplo'); await p.selectOption('#bnUso', 'alugado');
    ok(await p.evaluate(() => !document.querySelector('.bn-aluguel').hidden && document.querySelector('.bn-planta').hidden && document.querySelector('.bn-fin').hidden), 'imóvel alugado: aparece "Aluguel recebido"; na planta e financiamento escondidos');
    await p.fill('#bnCompra', '300000'); await p.fill('#bnValor', '400000'); await p.fill('#bnAluguel', '2000'); await p.fill('#bnAluguelDia', '5');
    await p.check('#bnFinanciado'); await p.fill('#bnFinBanco', 'Banco Exemplo'); await p.fill('#bnFinSaldo', '150000'); await p.fill('#bnFinParcela', '1800'); await p.fill('#bnFinDia', '15');
    await p.check('.bn-dono[value="pe1"]'); await p.check('.bn-dono[value="pe2"]');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= 391), 'celular (390): o formulário não rola para o lado');
    await p.click('[data-acao="bens-salvar"]'); await p.waitForFunction(() => document.getElementById('genModal').classList.contains('hidden'));
    const im = await p.evaluate(() => { const x = PatrimonioIliquido.lista().find((y) => y.nome === 'Apartamento Exemplo'); const rs = Recorrente.todos().filter((r) => r.bemRef === x.id); const dv = Dividas.lista().filter((d) => d.bemRef === x.id);
      return { valor: x.valor, uso: x.uso, compra: x.compra, dono: x.dono, rs: rs.map((r) => [r.fluxo, r.grupo, r.sub, r.valor, r.dia].join('|')).sort(), dv: dv.map((d) => [d.tipo, d.instituicao, d.saldo, d.parcela].join('|')) }; });
    ok(im.valor === 400000 && im.uso === 'alugado' && im.compra === 300000 && im.dono === 'Pessoa, Outra', 'guardado: valor de hoje R$ 400.000, uso alugado, compra R$ 300.000, de Pessoa e Outra ' + JSON.stringify(im));
    ok(im.rs.includes('entrada|RENDA|Aluguel|2000|5'), 'o aluguel vira renda: conta fixa de entrada em Renda › Aluguel, R$ 2.000 todo dia 5');
    ok(im.dv.length === 1 && im.dv[0] === 'financiamento|Banco Exemplo|150000|1800' && im.rs.includes('saida|HABITACAO|Financiamento|1800|15'), 'o financiamento vira dívida (saldo R$ 150.000) e compromisso (parcela R$ 1.800 dia 15)');
    await p.evaluate(() => { const x = PatrimonioIliquido.lista().find((y) => y.nome === 'Apartamento Exemplo'); Bens.abrir(null, { id: x.id }); });
    await p.fill('#bnFinParcela', '1900'); await p.click('[data-acao="bens-salvar"]'); await p.waitForTimeout(150);
    const ed = await p.evaluate(() => { const x = PatrimonioIliquido.lista().find((y) => y.nome === 'Apartamento Exemplo'); return { r: Recorrente.todos().filter((r) => r.bemRef === x.id).length, d: Dividas.lista().filter((d) => d.bemRef === x.id).length, p: Recorrente.todos().find((r) => r.bemRef === x.id && r.fluxo === 'saida').valor }; });
    ok(ed.r === 2 && ed.d === 1 && ed.p === 1900, 'editar a parcela atualiza a mesma conta fixa e a mesma dívida (sem duplicar)');

    console.log('3) na planta, carro e a declaração');
    await p.evaluate(() => Bens.abrir('imovel'));
    await p.fill('#bnNome', 'Apartamento na Planta Exemplo'); await p.selectOption('#bnUso', 'planta');
    await p.fill('#bnContrato', '500000'); await p.fill('#bnPago', '120000'); await p.fill('#bnChaves', '2028-06-30');
    ok(/380\.000,00/.test(await p.textContent('#bnAPagar')), 'na planta: "a pagar" = contrato − pago (R$ 380.000)');
    await p.click('[data-acao="bens-salvar"]'); await p.waitForTimeout(150);
    const pl = await p.evaluate(() => PatrimonioIliquido.lista().find((y) => y.nome === 'Apartamento na Planta Exemplo'));
    ok(pl && pl.valor === 120000 && pl.planta.aPagar === 380000 && pl.planta.chaves === '2028-06-30', 'sem valor de hoje, conta o que já foi pago (R$ 120.000); chaves em 30/06/2028');
    await p.evaluate(() => Bens.abrir('carro'));
    await p.fill('#bnMarca', 'Marca Exemplo'); await p.fill('#bnModelo', 'Modelo X'); await p.fill('#bnAno', '2022'); await p.fill('#bnValor', '80000');
    await p.click('[data-acao="bens-salvar"]'); await p.waitForTimeout(150);
    const car = await p.evaluate(() => PatrimonioIliquido.lista().find((y) => y.tipo === 'carro'));
    ok(car && car.nome === 'Marca Exemplo Modelo X 2022' && car.carro.ano === 2022 && car.valor === 80000, 'carro: marca, modelo e ano viram o nome; valor informado (sem FIPE)');
    await p.evaluate(() => { irPara('carteira'); render(); });
    const card = await p.evaluate(() => (document.querySelector('#view-carteira .il-card') || {}).textContent || '');
    ok(/Terreno Exemplo/.test(card) && /📄 veio da declaração de 2026/.test(card), 'o que veio da declaração mostra "📄 veio da declaração de 2026"');
    ok(/Imóveis, carro e outros bens/.test(card) && /🚗 Marca Exemplo Modelo X 2022/.test(card), 'o cartão "🏠 Imóveis, carro e outros bens", cada bem com o ícone do tipo');
    await p.evaluate(() => { const r = [...document.querySelectorAll('#view-carteira tr[data-acao="bens-editar"]')].find((e) => /Terreno Exemplo/.test(e.textContent)); r.click(); });
    ok(await p.evaluate(() => !document.getElementById('genModal').classList.contains('hidden') && document.getElementById('bnNome').value === 'Terreno Exemplo'), 'tocar na linha abre o mesmo cadastro (na janela, sem precisar rolar)');
    await p.evaluate(() => fechar('genModal'));

    console.log('4) a escritura pelo Carregar documento');
    await p.evaluate(async () => { await Partilha.perguntar([new File(['%PDF-1.4'], 'escritura-casa-exemplo.pdf', { type: 'application/pdf' })]); });
    ok(/Parece: 🏠 Contrato ou escritura de imóvel/.test(await p.textContent('#genBody')), '"O que é isto?" → "Parece: 🏠 Contrato ou escritura de imóvel"');
    await p.click('#genBody [data-acao="pa-dest"][data-v="imovel"]'); await p.waitForSelector('#bnNome');
    ok(/Fica guardado junto: escritura-casa-exemplo\.pdf/.test(await p.textContent('#genBody')), 'abre o cadastro do imóvel, com "Fica guardado junto: escritura-casa-exemplo.pdf"');
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
    await ctx.close();
  } finally { await b.close(); srv.close(); }
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
