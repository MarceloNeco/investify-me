/* =====================================================================
   teste/teste-dividas.js — 3.73: dívidas e consórcios, a fatura do cartão Porto e o seguro (modulos/dividas.js,
   modulos/seguros.js). Dados FICTÍCIOS (as amostras saem de teste/amostras/gerar-dividas.py).
   Confere: o saldo estimado baixa com a parcela paga (±3%, uma por mês); o cartão no InvestifyONE e no BudgetONE com a
   barra; o bem ligado "valor − dívida = parte sua"; o patrimônio total do Painel e o patrimonioHoje descontam as dívidas
   à vista; o CSV de cotas (nova e atualização com histórico); a fatura Porto em XLSX e PDF (ano pelo nome do arquivo,
   consórcio por parcela, empate a confirmar, detalhe do pagamento PORTOSEG dividido, sem gasto novo, diferença);
   o seguro lido da apólice vira compromisso e lembra de renovar 30 dias antes; a visão da casa não vê nada.
   Uso: node teste/teste-dividas.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..'), AM = path.join(__dirname, 'amostras');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const gastos = [
  { id: 'c9', data: '2026-09-10', valor: 1010, grupo: 'VEICULO', sub: 'Consórcio', desc: 'CONSORCIO EXEMPLO', fluxo: 'saida' },
  { id: 'c9b', data: '2026-09-20', valor: 1000, grupo: 'VEICULO', sub: 'Consórcio', desc: 'CONSORCIO EXEMPLO', fluxo: 'saida' },   /* o mesmo mês: conta uma vez */
  { id: 'c10', data: '2026-10-10', valor: 1000, grupo: 'VEICULO', sub: 'Consórcio', desc: 'CONSORCIO EXEMPLO', fluxo: 'saida' },
  { id: 'cx', data: '2026-10-11', valor: 1200, grupo: 'VEICULO', sub: 'Consórcio', desc: 'CONSORCIO EXEMPLO', fluxo: 'saida' },    /* fora dos 3% */
  { id: 'p1', data: '2026-11-05', valor: 1200, grupo: 'OUTROS', sub: 'Cartão', desc: 'PORTOSEG SA CR', fluxo: 'saida' },
  { id: 'p2', data: '2026-11-05', valor: 700, grupo: 'OUTROS', sub: 'Cartão', desc: 'PORTOSEG SA CR', fluxo: 'saida' },
  { id: 's1', data: '2026-10-05', valor: 6000, grupo: 'RENDA', sub: 'Salário', desc: 'SALARIO EXEMPLO', fluxo: 'entrada' }
];
const LOCAL = { v: 1, config: { fitaLigada: false }, gastos, recorrentes: [],
  posicoes: [{ id: 'pp1', ticker: 'CDB BANCO X', nome: 'CDB', tipo: 'fundo', inst: 'Banco X', qtd: 1, pm: 100000, valorManual: 100000, moeda: 'BRL' }],
  patrimonio_iliquido: [{ id: 'bem1', nome: 'Carro Exemplo', tipo: 'outro', inst: '', valor: 80000, data: '2026-11-01' }],
  dividas: [{ id: 'dA', nome: 'Consórcio do carro', tipo: 'consorcio', instituicao: 'Porto Seguro Consórcio', grupo: '1111', cota: '22', bemRef: 'bem1',
    pctPago: 40, saldo: 30000, parcela: 1000, atualizadoEm: '2026-08-01', historico: [{ data: '2026-08-01', saldo: 30000, pctPago: 40, fonte: 'manual' }], pagas: [] }] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Dividas !== 'undefined' && typeof Seguros !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); Dividas._hoje = '2026-11-15'; Seguros._hoje = '2026-11-15'; });

    console.log('1) o saldo estimado baixa com as parcelas pagas');
    const e1 = await p.evaluate(() => Dividas.estado(Dividas.lista()[0]));
    ok(e1.saldo === 28000 && e1.pagas.length === 2 && e1.estimado, 'duas parcelas reconhecidas (set: 1.010 a ±3%; out: 1.000; a de 1.200 não; uma por mês): saldo 30.000 → ' + e1.saldo);
    ok(Math.abs(e1.pctPago - 44) < 0.05, '% pago estimado: 40% → ' + e1.pctPago + '% (total 50.000)');
    ok(e1.quitaEm === '2029-03', 'quita em ~03/2029 (28 parcelas de 1.000 a partir de nov/2026): ' + e1.quitaEm);
    ok(await p.evaluate(() => Dividas.total()) === 28000, 'total das dívidas: 28.000');
    ok(await p.evaluate(() => Dividas.emMes('2026-07')) === 30000, 'antes da primeira atualização, o mês passado usa a primeira (30.000)');

    console.log('2) o patrimônio desconta as dívidas, à vista');
    await p.evaluate(() => { abrirApp('investify'); irPara('painel'); render(); });
    const inv = await p.evaluate(() => { const v = document.querySelector('.kpi.hero') || document.querySelector('.kpi'); return v ? v.textContent.replace(/\s+/g, ' ') : ''; });
    ok(/152\.000,00/.test(inv) && /dívidas: −R\$ 28\.000,00/.test(inv), 'Painel do InvestifyONE: 100.000 + 80.000 sem liquidez − 28.000 = 152.000, com "dívidas: −R$ 28.000,00" (' + inv.slice(0, 160) + ')');
    const card = await p.evaluate(() => { const c = document.querySelector('.dv-card'); return c ? { txt: c.textContent.replace(/\s+/g, ' '), w: c.querySelector('.dv-pago').style.width, n: c.querySelectorAll('.dv-linha').length } : null; });
    ok(card && card.n === 1 && card.w === '44%', 'cartão "Dívidas" no InvestifyONE com a barra (44% cheia)');
    ok(card && /−R\$ 28\.000,00/.test(card.txt) && /parcela R\$ 1\.000,00/.test(card.txt) && /quita em ~03\/2029 \(estimativa\)/.test(card.txt), 'saldo, parcela e "quita em ~03/2029 (estimativa)"');
    ok(card && /Carro Exemplo R\$ 80\.000,00 − R\$ 28\.000,00 = R\$ 52\.000,00 parte sua/.test(card.txt), 'agrupado pelo bem: "valor − dívida = parte sua"');
    const il = await p.evaluate(() => { const n = document.querySelector('.il-nota'); return n ? n.textContent : ''; });
    ok(/R\$ 80\.000,00 − R\$ 28\.000,00 de dívida = R\$ 52\.000,00 parte sua/.test(il), 'o bem no "Sem liquidez" mostra a parte sua (' + il + ')');
    const ph = await p.evaluate(() => patrimonioHoje());
    ok(ph && ph.dividas === 28000 && ph.valor === 100000 - 28000 && /dívidas: −R\$ 28\.000,00/.test(ph.sub), 'patrimonioHoje desconta: ' + JSON.stringify(ph && [ph.valor, ph.sub]));
    await p.evaluate(() => { abrirApp('budget'); irPara('b-painel'); render(); });
    ok(await p.evaluate(() => !!document.querySelector('#view-b-painel .dv-card .dv-linha')), 'o cartão também aparece no Painel do BudgetONE');

    console.log('3) edição à mão: histórico');
    await p.locator('.dv-linha:visible').first().click(); await p.waitForSelector('#dvForm');
    await p.fill('#dvSaldo', '27.500,00'); await p.fill('#dvPct', '45'); await p.evaluate(() => { const e = document.getElementById('dvData'); e.value = '2026-11-12'; });
    await p.click('[data-acao="dv-salvar"]'); await p.waitForTimeout(150);
    const e3 = await p.evaluate(() => { const d = Dividas.lista()[0]; return { h: d.historico.length, e: Dividas.estado(d) }; });
    ok(e3.h === 2 && e3.e.saldo === 27500 && !e3.e.estimado, 'saldo novo guardado no histórico (2 pontos); as parcelas antigas não baixam de novo: ' + e3.e.saldo);

    console.log('4) CSV das posições do consórcio');
    const tab = 'Grupo;Cota;Tipo do bem;Situação;% Pago;% a pagar;Saldo devedor;Valor da parcela\n1111;22;Automóvel;Contemplada;46,5;53,5;26.750,00;1.000,00\n3333;7;Imóvel;Não contemplada;10;90;180.000,00;2.500,00';
    const l4 = await p.evaluate((t) => Dividas.lerCsv(Arquivos.tabelaDoTexto(t)), tab);
    ok(l4.length === 2 && l4[0].existente && !l4[1].existente && l4[0].contemplada && !l4[1].contemplada && l4[1].saldo === 180000 && l4[1].parcela === 2500 && l4[0].pctPago === 46.5,
      'lidas 2 cotas (1111/22 atualiza, 3333/7 nova; contemplada sim/não; 46,5%; 180.000; 2.500)');
    const l4b = await p.evaluate(() => Dividas.lerCsv([['grupo/cota', 'pct_falta', 'saldo', 'parcela'], ['5555-9', '75', '9000', '300']]));
    ok(l4b.length === 1 && l4b[0].grupo === '5555' && l4b[0].cota === '9' && l4b[0].pctPago === 25, 'cabeçalho com outro nome (grupo/cota junto, pct_falta): 25% pago');
    const n4 = await p.evaluate((l) => { const r = Dividas.lerCsv(Arquivos.tabelaDoTexto(l)); const n = Dividas.aplicarCsv(r, '2026-11-14'); return { n, ds: Dividas.lista().map((d) => [d.grupo, d.cota, d.saldo, d.historico.length, d.historico[d.historico.length - 1].fonte]) }; }, tab);
    ok(n4.n === 2 && n4.ds.length === 2 && n4.ds[0][2] === 26750 && n4.ds[0][3] === 3 && n4.ds[0][4] === 'csv' && n4.ds[1][2] === 180000, 'importadas: a cota existente atualiza e soma ao histórico; a nova entra ' + JSON.stringify(n4.ds));

    console.log('5) a fatura do cartão Porto (XLSX)');
    await p.evaluate(() => { irPara('b-painel'); render(); });
    await p.setInputFiles('#dvFatArq', path.join(AM, 'Fatura_Porto_Seguro_2026-11-05.xlsx'));
    await p.waitForSelector('#dvFat', { timeout: 15000 });
    const f5 = await p.evaluate(() => ({ txt: document.getElementById('dvFat').textContent.replace(/\s+/g, ' '), sel: Array.from(document.querySelectorAll('[data-dvcota]')).map((s) => s.value) }));
    ok(/6 linhas · total R\$ 1\.928,00/.test(f5.txt), 'lidas as 6 linhas, total 1.928,00 (sem o PAGAMENTO; o estorno desconta)');
    ok(/PORTOSEG SA CR/.test(f5.txt) && /R\$ 1\.900,00/.test(f5.txt) && /Diferença: \+R\$ 28,00/.test(f5.txt), 'vira detalhe do pagamento PORTOSEG dividido em dois (1.900) e mostra a diferença +28,00');
    ok(f5.sel.length === 2 && f5.sel[0] === 'dA' && f5.sel[1] === '' && /A confirmar/.test(f5.txt), 'consórcio: 1.005 vai para a cota de 1.000 (±3%); 777 fica "A confirmar" com a escolha');
    const nG = await p.evaluate(() => Gasto.todos().length);
    await p.selectOption('[data-dvcota="1"]', { index: 2 });
    await p.click('[data-acao="dv-fat-ok"]'); await p.waitForTimeout(150);
    const r5 = await p.evaluate(() => { const f = Dividas.faturas()[0]; const d = Dividas.lista(); return { n: Gasto.todos().length, f: f && [f.id, f.venc, f.total, f.dif, f.final, f.itens[2].data], ligados: Gasto.todos().filter((g) => g.faturaId).map((g) => g.id).sort(), pagas: d.map((x) => (x.pagas || []).length) }; });
    ok(r5.n === nG, 'nenhum gasto novo (sem gasto em dobro)');
    ok(r5.f && r5.f[1] === '2026-11-05' && r5.f[2] === 1928 && r5.f[3] === 28 && r5.f[4] === '4321' && r5.f[5] === '2026-10-15', 'fatura guardada: vencimento do nome do arquivo, ano 2026 nas compras, final 4321: ' + JSON.stringify(r5.f));
    ok(r5.ligados.join(',') === 'p1,p2' && r5.pagas[0] === 1 && r5.pagas[1] === 1, 'os dois pagamentos ganham o detalhe; cada cota ganhou a sua parcela paga');
    await p.evaluate(() => { irPara('b-lanc'); render(); });
    ok(await p.evaluate(() => document.querySelectorAll('.dv-tag').length) === 2, 'na lista de lançamentos, o selo "🧾 fatura detalhada" nos dois pagamentos');

    console.log('6) a fatura em PDF, o ano que vira e o empate');
    await p.evaluate(() => { irPara('b-painel'); render(); });
    await p.setInputFiles('#dvFatArq', path.join(AM, 'fatura-porto-exemplo.pdf'));
    await p.waitForSelector('#dvFat', { timeout: 20000 });
    const f6 = await p.evaluate(() => document.getElementById('dvFat').textContent.replace(/\s+/g, ' '));
    ok(/6 linhas · total R\$ 1\.928,00/.test(f6) && /Diferença: \+R\$ 28,00/.test(f6), 'o PDF dá o mesmo: 6 linhas, 1.928,00, diferença +28,00');
    await p.click('[data-acao="dv-fat-fora"]');
    const y6 = await p.evaluate(() => Dividas.lerPortoTabela([['', '', 'Crédito', 'Débito', 'Total', 'Cartão'], ['TITULAR EXEMPLO', '', '', '', '', 'Final 4321'], ['28/12', 'LOJA EXEMPLO', '', '50'], ['03/01', 'LOJA EXEMPLO', '', '10']], 'Fatura_Porto_Seguro_2026-01-05.xlsx').itens.map((i) => i.data));
    ok(y6[0] === '2025-12-28' && y6[1] === '2026-01-03', 'dezembro numa fatura de janeiro fica no ano anterior: ' + y6.join(', '));
    const emp = await p.evaluate(() => { const o = ST.dividas; ST.dividas = [{ id: 'x1', nome: 'A', tipo: 'consorcio', parcela: 1000 }, { id: 'x2', nome: 'B', tipo: 'consorcio', parcela: 1000 }];
      const c = Dividas.consorcios({ itens: [{ data: '2026-10-15', desc: 'PORTO SEGURO CONSORCIO', valor: 1000 }] }); ST.dividas = o; return c[0]; });
    ok(emp.aConfirmar && emp.escolhida === '', 'duas cotas com a mesma parcela: empate → "A confirmar"');

    console.log('7) o seguro: apólice → compromisso → lembrete de renovar');
    await p.evaluate(() => { irPara('b-custos'); render(); });
    await p.setInputFiles('#sgArq', path.join(AM, 'apolice-exemplo.pdf'));
    await p.waitForSelector('#sgForm', { timeout: 20000 });
    const s7 = await p.evaluate(() => ({ seg: sgSeg.value, ap: sgApolice.value, tipo: sgTipo.value, ini: sgIni.value, fim: sgFim.value, pr: sgPremio.value, pc: sgParc.value }));
    ok(s7.seg === 'Porto Seguro' && s7.ap === '0531.12.345678' && s7.tipo === 'auto' && s7.ini === '2025-12-10' && s7.fim === '2026-12-10' && s7.pr === '3600' && s7.pc === '6', 'lido da apólice: ' + JSON.stringify(s7));
    await p.click('[data-acao="sg-salvar"]'); await p.waitForTimeout(150);
    const r7 = await p.evaluate(() => { const s = Seguros.lista()[0], r = Recorrente.achar(s.recId); return { r: r && [r.valor, r.grupo, r.sub, r.desde, r.ate, r.dia], ren: Seguros.renovar().length }; });
    ok(r7.r && r7.r[0] === 600 && r7.r[1] === 'VEICULO' && r7.r[2] === 'Seguro Auto' && r7.r[3] === '2025-12-01' && r7.r[4] === '2026-05-31' && r7.r[5] === 10, 'virou compromisso: 6 × 600 de dez/2025 a mai/2026, dia 10 ' + JSON.stringify(r7.r));
    ok(r7.ren === 1, 'em 15/11 (25 dias antes do fim de 10/12) já pede para renovar');
    const ren = await p.evaluate(() => { Seguros._hoje = '2026-11-20'; const a = Seguros.renovar().length, i = inboxItens().filter((x) => /Renovar o seguro/.test(x.nome)).length; Seguros._hoje = '2026-11-09'; const c = Seguros.renovar().length; Seguros._hoje = '2026-12-11'; const d = Seguros.renovar().length; Seguros._hoje = '2026-11-20'; render(); return { a, i, c, d, aviso: !!document.querySelector('.sg-renovar') }; });
    ok(ren.a === 1 && ren.i === 1 && ren.aviso && ren.c === 0 && ren.d === 0, 'lembra de renovar de 30 dias antes até o fim (no 📥 e em Custos); antes e depois, não');

    console.log('8) visão da casa: nada');
    const vc = await p.evaluate(() => { const o = Escopo.soCasa; Escopo.soCasa = () => true; irPara('b-painel'); render(); const r = { card: !!document.querySelector('#view-b-painel .dv-card'), tot: Dividas.total(), ren: Seguros.renovar().length }; Escopo.soCasa = o; render(); return r; });
    ok(!vc.card && vc.tot === 0 && vc.ren === 0, 'na visão da casa: sem cartão, sem total, sem lembrete ' + JSON.stringify(vc));
    ok(await p.evaluate(() => Escopo.de('dividas', {}) === 'reservado' && Escopo.de('faturas_cartao', {}) === 'reservado' && Escopo.de('seguros', {}) === 'reservado'), 'as três coleções vão no cofre reservado');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
