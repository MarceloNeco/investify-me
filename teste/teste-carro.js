/* =====================================================================
   teste/teste-carro.js — 3.99: canhoto parcelado × parcelas do banco, Meus veículos, categorias do Veículo, "Quanto o carro custa",
   imagem compartilhada. Dados FICTÍCIOS (nenhum nome, placa, CPF ou final de cartão de verdade).
   Caso: serviço de funilaria de R$ 6.500 em 5x de R$ 1.300 no crédito; o canhoto tem a data do PAGAMENTO (23/11); o banco mostra
   "OFICINA FICTICIA 01/05" em 24/11 (e um outro 01/05 de R$ 1.300 noutro cartão, para desempatar). Confere: casa com a 01/05
   (não com a outra), não cria gasto, enriquece a compra inteira (a 01/05 e a 02/05 que chega depois) com a categoria, o carro e a
   foto; a ficha antes da fatura fica "aguardando o banco" e liga sozinha; valor 'baixa' não casa sozinho; o print "em 5x de R$
   1.300,00" é um item só e vira ficha; categorias novas e reclassificar item a item; "Qual carro?" com dois carros e a regra da
   loja; o relatório (ter, usar, manutenção; contratado × caiu no mês; 12 meses); o ponto de saída (sem enviar); a pergunta da
   imagem compartilhada; visão da casa; EN/ES.
   Uso: node teste/teste-carro.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const R = (id, data, valor, desc, extra) => Object.assign({ id: 'rb_' + id, idRobo: id, data, valor, desc, descRobo: desc, fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1', conta: 'Banco Ficticio' }, extra || {});
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [],
  cartoes: [{ id: 'c1', apelido: 'Cartao Ficticio', bandeira: 'visa', fim: '4321', vence: 10, fecha: 3 }, { id: 'c2', apelido: 'Outro Ficticio', bandeira: 'master', fim: '8765', vence: 10, fecha: 3 }],
  gastos: [R('p1', '2026-11-24', 1300, 'OFICINA FICTICIA 01/05'), R('x1', '2026-11-24', 1300, 'OUTRA LOJA FICTICIA 01/05', { cartaoId: 'c2' }),
    R('s1', '2026-11-05', 200, 'SEGURADORA FICTICIA', { grupo: 'VEICULO', sub: 'Seguro Auto' }), R('k1', '2026-11-08', 300, 'AUTO POSTO FICTICIO', { grupo: 'VEICULO', sub: 'Combustível' }),
    R('m1', '2026-10-15', 450, 'MECANICA ANTIGA FICTICIA', { grupo: 'VEICULO', sub: 'Mecânico / Eletrico / Funilaria' }), R('m2', '2026-09-15', 120, 'ELETRICA ANTIGA FICTICIA', { grupo: 'VEICULO', sub: 'Mecânico / Eletrico / Funilaria' })] };
const IT = (papel, valor, extra) => Object.assign({ arquivo: 'canhoto.jpg', papel, documento: 'cartao', valor, opcoes: [], data: '23/11/2026', hora: '15:20', loja: 'OFICINA FICTICIA', cnpj: null, bandeira: 'visa', tipo: 'credito', parcelas: 5, final: '4321', nsu: null, aut: null, doc: null, mesmaCompra: null,
  confianca: { valor: 'alta', data: 'alta' } }, extra || {});

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
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Veiculos !== 'undefined' && typeof CompraParcelada !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-lanc'); render(); });
    const g = (id) => p.evaluate((i) => JSON.parse(JSON.stringify(Gasto.todos().find((x) => x.id === i) || null)), id);
    const inbox = () => p.evaluate(() => (inboxGrupos().find((x) => x.id === 'confirmar') || {}).html || '');

    console.log('1) categorias do Veículo e o primeiro carro');
    await p.waitForFunction(() => ST.config.veic399 === true, null, { timeout: 15000 });
    ok(await p.evaluate(() => ['Mecânica e revisão', 'Funilaria e pintura', 'Pneus', 'Multas', 'Lavagem', 'Seguro Auto', 'Combustível'].every((s) => (Gasto.arvore().VEICULO || []).includes(s)) && (Gasto.arvore().VEICULO || []).includes('Mecânico / Eletrico / Funilaria')), 'as categorias novas do Veículo entram na lista; a antiga continua valendo');
    await p.evaluate(() => { irPara('b-carro'); render(); });
    await p.fill('#vcApelido', 'Carro Exemplo 2019'); await p.click('[data-acao="vc-novo"]'); await p.waitForTimeout(200);
    const car1 = await p.evaluate(() => Veiculos.ativos()[0].id);
    ok(await p.evaluate((c) => ['rb_s1', 'rb_k1', 'rb_m1'].every((id) => Gasto.todos().find((x) => x.id === id).veiculoId === c) && Gasto.todos().find((x) => x.id === 'rb_s1').sub === 'Seguro Auto', car1), 'com um carro só, todo lançamento do Veículo ganha o carro (etiqueta: a categoria não muda)');

    console.log('2) canhoto parcelado × parcela 01/05 do banco');
    const cl = await p.evaluate((x) => { const r = Canhotos.classificar(x); return { casou: r.casou.map((y) => y.g.id), par: r.parecido.length, duv: r.duvida.length }; }, [IT(1, 6500)]);
    ok(cl.casou.join() === 'rb_p1' && !cl.par, 'R$ 6.500 em 5x casa com a parcela 01/05 de R$ 1.300 do banco (data do pagamento até +3 dias; o final e a loja desempatam da outra 01/05)');
    const baixa = await p.evaluate((x) => { const r = Canhotos.classificar(x); return { casou: r.casou.length, duv: r.duvida.length, perto: (r.duvida[0] && r.duvida[0].perto || []).map((g) => g.id) }; }, [IT(2, 6500, { confianca: { valor: 'baixa', data: 'alta' } })]);
    ok(baixa.casou === 0 && baixa.duv === 1 && baixa.perto.includes('rb_p1'), 'valor com confiança baixa: não casa sozinho; o banco perto (a parcela) vira pergunta');
    const n0 = await p.evaluate(() => Gasto.todos().length);
    await p.evaluate((x) => { Canhotos._ler = async () => x; irPara('b-lanc'); render(); return Canhotos.processar([new File([new Uint8Array([137, 80, 78, 71, 1, 2, 3])], 'canhoto.jpg', { type: 'image/jpeg' })]); }, [IT(1, 6500)]);
    await p.click('#genBody .cn-item[data-grupo="casou"][data-i="0"] [data-acao="cn-classe"]');
    ok(/5x de R\$\s?1\.300,00/.test(await p.textContent('#genBody .cn-item[data-grupo="casou"][data-i="0"]')), 'a tela mostra "5x de R$ 1.300,00"');
    await p.evaluate((c) => { const e = document.querySelector('#genBody .cn-item[data-grupo="casou"][data-i="0"]'); e.querySelector('[data-cn="grupo"]').value = 'VEICULO'; e.querySelector('[data-cn="sub"]').value = 'Funilaria e pintura'; e.querySelector('[data-cn="veiculo"]').value = c; }, car1);
    await p.click('#genBody .cn-item[data-grupo="casou"][data-i="0"] [data-acao="cn-aplicar"]');
    await p.waitForFunction(() => { const f = CompraParcelada.lista()[0]; return f && f.docId; }, null, { timeout: 10000 }).catch(() => {});
    const f1 = await p.evaluate(() => JSON.parse(JSON.stringify(CompraParcelada.lista()[0])));
    const p1 = await g('rb_p1');
    ok(f1 && f1.total === 6500 && f1.n === 5 && f1.vp === 1300 && f1.data === '2026-11-23' && f1.estado === 'ligada' && f1.gastoIds.join() === 'rb_p1', 'a ficha da compra: R$ 6.500 em 5x de R$ 1.300, data do pagamento (23/11), ligada à 01/05');
    ok(p1.grupo === 'VEICULO' && p1.sub === 'Funilaria e pintura' && p1.veiculoId === car1 && p1.compraId === f1.id && /^OFICINA FICTICIA 01\/05$/.test(p1.desc), 'a 01/05 ganha a categoria, o carro e a descrição (com o k/N)');
    ok(!!f1.docId && await p.evaluate((d) => !!ArquivosFamilia.achar(d), f1.docId) && p1.docId === f1.docId, 'a foto foi para o cofre de arquivos e ficou ligada à compra');
    ok(await p.evaluate(() => Gasto.todos().length) === n0, 'a foto NÃO criou gasto');
    await p.evaluate(() => fechar('genModal'));
    await p.evaluate(() => { Gasto.add({ id: 'rb_p2', idRobo: 'p2', data: '2026-12-24', valor: 1300, desc: 'OFICINA FICTICIA 02/05', descRobo: 'OFICINA FICTICIA 02/05', fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1' }); CompraParcelada.ligarTudo(); });
    const p2 = await g('rb_p2');
    ok(p2.grupo === 'VEICULO' && p2.sub === 'Funilaria e pintura' && p2.veiculoId === car1 && p2.docId === f1.docId && p2.compraId === f1.id, 'a parcela 02/05 que chega depois ganha a mesma categoria, carro e documento');
    ok(await p.evaluate(() => { const c = Parcelados.compras().find((x) => /OFICINA/.test(x.desc)); return c && c.grupo === 'VEICULO' && c.sub === 'Funilaria e pintura' && c.futuras.length === 3; }), 'as parcelas futuras (parcelados.js) já saem como Veículo › Funilaria e pintura (3 a vir)');

    console.log('3) foto antes da fatura e o print "em 5x"');
    await p.evaluate((x) => { Canhotos._ler = async () => x; return Canhotos.processar([new File([new Uint8Array([1, 2, 3])], 'canhoto2.jpg', { type: 'image/jpeg' })]); }, [IT(3, 2400, { parcelas: 4, loja: 'AUTO PECAS FICTICIA', data: '20/11/2026' })]);
    await p.click('#genBody .cn-item[data-grupo="novo"][data-i="0"] [data-acao="cn-esperar"]'); await p.waitForTimeout(200);
    const f2 = await p.evaluate(() => JSON.parse(JSON.stringify(CompraParcelada.lista().find((x) => x.loja === 'AUTO PECAS FICTICIA'))));
    ok(f2 && f2.estado === 'aguardando' && f2.vp === 600 && await p.evaluate(() => Gasto.todos().length) === n0 + 1, 'a foto chegou antes da fatura: "⏳ aguardando o banco" (nenhum gasto criado)');
    await p.evaluate(() => { fechar('genModal'); Gasto.add({ id: 'rb_q1', idRobo: 'q1', data: '2026-11-21', valor: 600, desc: 'AUTO PECAS FICTICIA 01/04', descRobo: 'AUTO PECAS FICTICIA 01/04', fluxo: 'saida', grupo: 'OUTROS', sub: '', origem: 'robo', cartaoId: 'c1' }); CompraParcelada.ligarTudo(); });
    ok(await p.evaluate(() => { const f = CompraParcelada.lista().find((x) => x.loja === 'AUTO PECAS FICTICIA'); return f.estado === 'ligada' && Gasto.todos().find((x) => x.id === 'rb_q1').compraId === f.id; }), 'a 01/04 chegou: liga sozinha');
    const pi = await p.evaluate(() => PrintColar.itensDoTexto('Compra aprovada de R$ 6.500,00 em 5x de R$ 1.300,00 no cartão final 4321 em OFICINA FICTICIA no dia 23/11 às 15:20', '2026-11-23'));
    ok(pi.length === 1 && pi[0].valor === 6500 && pi[0].parcelas === 5, 'o print "R$ 6.500,00 em 5x de R$ 1.300,00" é um item só, com as 5 parcelas');
    const nF = await p.evaluate(() => CompraParcelada.lista().length), nP = await p.evaluate(() => (ST.cartao_pendentes || []).length);
    await p.evaluate((x) => PrintColar.abrirPrevia(x), pi);
    await p.evaluate(() => { const s = document.querySelector('#pcItens .pc-item [data-pc="onde"]'); s.value = [...s.options].find((o) => /^c:c1$/.test(o.value)).value; });
    await p.click('#genBody [data-acao="pc-lancar"]'); await p.waitForTimeout(200);
    ok(await p.evaluate((a) => CompraParcelada.lista().length === a[0] + 1 && (ST.cartao_pendentes || []).length === a[1] && CompraParcelada.lista()[a[0]].n === 5 && CompraParcelada.lista()[a[0]].cartaoId === 'c1', [nF, nP]), '"esperar o banco" do print: a parcelada vira a ficha (não uma pendente de R$ 6.500)');

    console.log('4) reclassificar e dois carros');
    let ib = await inbox();
    ok(/Reclassificar\? MECANICA ANTIGA FICTICIA/.test(ib) && /Reclassificar\? ELETRICA ANTIGA FICTICIA/.test(ib), 'o 📥 oferece reclassificar a categoria antiga, item a item');
    await p.evaluate(() => abrirInbox());
    await p.click('#genBody .vc-reclass[data-g="rb_m1"] [data-acao="vc-reclass"][data-s="Mecânica e revisão"]'); await p.waitForTimeout(250);
    await p.click('#genBody .vc-reclass[data-g="rb_m2"] [data-acao="vc-reclass"][data-s=""]'); await p.waitForTimeout(250);
    await p.evaluate(() => fechar('genModal'));
    ok((await g('rb_m1')).sub === 'Mecânica e revisão' && (await g('rb_m2')).sub === 'Mecânico / Eletrico / Funilaria' && !/Reclassificar/.test(await inbox()), '"Mecânica e revisão" reclassifica; "Manter" deixa como está; nada muda sozinho');
    await p.evaluate(() => { Veiculos.salvar('Moto Exemplo 2021'); Gasto.add({ id: 'rb_k2', idRobo: 'k2', data: '2026-11-20', valor: 150, desc: 'POSTO DA ESQUINA FICTICIO', descRobo: 'POSTO DA ESQUINA FICTICIO', fluxo: 'saida', grupo: 'VEICULO', sub: 'Combustível', origem: 'robo', cartaoId: 'c1' }); });
    ib = await inbox();
    ok(/Qual carro\? POSTO DA ESQUINA FICTICIO/.test(ib) && /Moto Exemplo 2021/.test(ib), 'com dois carros, o 📥 pergunta "Qual carro?"');
    await p.evaluate(() => abrirInbox());
    await p.click('#genBody .vc-qual[data-g="rb_k2"] [data-acao="vc-qual"]:has-text("Moto Exemplo 2021")'); await p.waitForTimeout(250);
    await p.evaluate(() => { fechar('genModal'); Gasto.add({ id: 'rb_k3', idRobo: 'k3', data: '2026-11-27', valor: 160, desc: 'POSTO DA ESQUINA FICTICIO', descRobo: 'POSTO DA ESQUINA FICTICIO', fluxo: 'saida', grupo: 'VEICULO', sub: 'Combustível', origem: 'robo', cartaoId: 'c1' }); });
    ok(await p.evaluate(() => { const moto = Veiculos.ativos().find((v) => /Moto/.test(v.apelido)); return Gasto.todos().find((x) => x.id === 'rb_k2').veiculoId === moto.id && Veiculos.veiculoDe(Gasto.todos().find((x) => x.id === 'rb_k3')).id === moto.id && !Veiculos.semCarro().length; }), 'a resposta vale para a loja: o próximo do mesmo posto já vai para a moto');

    console.log('5) "Quanto o carro custa"');
    const r = await p.evaluate((c) => Veiculos.relatorio(c, '2026-11'), car1);
    ok(r.blocos.ter === 200 && r.blocos.usar === 300 && r.blocos.manut === 1300 && r.total === 1800, 'novembro do carro: ter 200 (seguro) · usar 300 (combustível) · manutenção 1.300 (a parcela da funilaria)');
    ok(r.contratado.length === 1 && r.contratado[0].f.total === 6500 && r.contratado[0].caiu === 1300, 'o serviço pelo valor contratado (6.500 em 5x) e pelo que caiu no mês (1.300)');
    ok(r.ano === 2370 && r.media === 197.5, '12 meses: 2.370 = 200 + 300 + 1.300 + 450 + 120 (média 197,50 por mês)');
    await p.evaluate(() => { irPara('b-carro'); render(); });
    await p.evaluate(() => { const s = document.getElementById('vcSel'); if (s) { s.value = Veiculos.ativos()[0].id; s.dispatchEvent(new Event('change', { bubbles: true })); } });
    for (let i = 0; i < 12; i++) { if (await p.evaluate(() => /novembro de 2026/i.test(document.querySelector('.vc-mes').textContent))) break; await p.click('[data-acao="vc-mes"][data-d="-1"]'); }
    const tx = await p.evaluate(() => document.getElementById('view-b-carro').textContent);
    ok(/Ter o carro/.test(tx) && /Usar/.test(tx) && /Manutenção/.test(tx) && /contratado R\$\s?6\.500,00 em 5x · caiu no mês R\$\s?1\.300,00/.test(tx) && /Últimos 12 meses/.test(tx), 'a tela mostra os 3 blocos, o contratado × caiu no mês e os 12 meses');
    ok(await p.evaluate(() => !!document.querySelector('#view-b-carro .vc-contrato [data-acao="vc-doc"]')), 'com o documento ligado (📄)');
    const ev = await p.evaluate(() => Veiculos.eventoServico(CompraParcelada.lista()[0]));
    ok(ev && ev.veiculo_ref === car1 && ev.data === '2026-11-23' && ev.oficina === 'OFICINA FICTICIA' && ev.categoria === 'Funilaria e pintura' && ev.valor_pago === 6500 && ev.parcelas === 5 && !!ev.ref_documento, 'o ponto de saída monta {veiculo_ref, data, oficina, categoria, valor_pago, parcelas, ref_documento} (sem enviar nada)');

    console.log('6) imagem compartilhada, visão da casa, idiomas');
    await p.evaluate((x) => { Canhotos._ler = async () => x; PrintColar._destino([new File([new Uint8Array([1])], 'f.jpg', { type: 'image/jpeg' })]); }, [IT(9, 99, { parcelas: 1, loja: 'LOJA X', data: '22/11/2026' })]);
    ok(/É print do app do banco ou nota\/canhoto\/orçamento\?/.test(await p.textContent('#genBody')), 'a imagem compartilhada pergunta "É print do app do banco ou nota/canhoto/orçamento?"');
    await p.click('#genBody [data-acao="pc-dest"][data-v="canhoto"]');
    await p.waitForFunction(() => document.getElementById('genTitle').textContent === 'Foto de nota ou recibo', null, { timeout: 10000 });
    ok(true, '"Nota, canhoto ou orçamento" vai para o "📷 Foto de nota ou recibo" (antes "Conferir canhotos")');
    await p.evaluate(() => fechar('genModal'));
    ok(await p.evaluate(() => Escopo.de('veiculos', Veiculos.ativos()[0]) === 'casa'), 'visão da casa: o carro é da casa');
    ok(await p.evaluate(() => { I18n.atual = 'en'; render(); const a = document.getElementById('view-b-carro').textContent; I18n.atual = 'es'; render(); const b = document.getElementById('view-b-carro').textContent; I18n.atual = 'pt'; render(); return /What the car costs/.test(a) && /Cuánto cuesta el coche/.test(b); }), 'EN e ES (rascunho)');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
