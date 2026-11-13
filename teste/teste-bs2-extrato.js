/* =====================================================================
   teste/teste-bs2-extrato.js — 3.81: importador do extrato BS2 no app (modulos/bs2-extrato.js) e o painel "Dados para
   receber" do Cofre da empresa (modulos/cofre-empresa.js 1.1.0). Dados FICTÍCIOS (contas, nomes e valores inventados).
   Confere: CSV nacional (BOM, ';', "R$ -1.234,56", linhas Saldo fora, id da movimentação ou da transação) e OFX (USD com
   movimento, EUR vazio fora, BRL da conta antiga) com as regras do robô; PTAX de compra do dia (sábado → sexta); custo de
   câmbio; não duplica o que o robô já mandou nem numa 2ª importação; o painel da PJ com os números; copiar campo, copiar
   tudo PT/EN, o mailto; visão da casa sem nada disso.
   Uso: node teste/teste-bs2-extrato.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const CSV = '﻿Extrato Bancário - Empresas\nBanco BS2 S.A.;218;Agência;0001;Conta;12345678\n' +
  'DataContabil;Data Operação;Tipo;Detalhe;Banco;Agencia;Conta;Identificador da transação;Identificador da movimentação;Valor;Observação\n' +
  '01/11/2026;01/11/2026;Saldo Inicial;;;;;;;R$ 10.000,00;\n' +
  '05/11/2026;05/11/2026;Débito;Débito PIX - FULANO EXEMPLO;218;0001;12345678;T1;MOV1;R$ -3.204,00;\n' +
  '20/11/2026;20/11/2026;Débito;DAS-SIMPLES NACIONAL;218;0001;12345678;T2;MOV2;R$ -1.200,00;\n' +
  '20/11/2026;20/11/2026;Débito;RECEITA FED-DARF;218;0001;12345678;T3;MOV3;R$ -600,00;\n' +
  '10/11/2026;10/11/2026;Débito;Pagamento boleto - CONTABILIDADE MODELO;218;0001;12345678;T4;MOV4;R$ -400,00;\n' +
  '07/11/2026;07/11/2026;Crédito;RECEBIM DA CONTA-INTERN;218;0001;12345678;T5;MOV5;R$ 19.000,00;\n' +
  '﻿12/11/2026;12/11/2026;Débito;Débito PIX - FULANO EXEMPLO;218;0001;12345678;T6;MOV6;R$ -5.000,00;Lucros\n' +
  '15/11/2026;15/11/2026;Débito;PAGAMENTO DIVERSO;218;0001;12345678;T7;;R$ -50,00;\n' +
  '30/11/2026;30/11/2026;Saldo Final;;;;;;;R$ 0,00;\nTotal de lançamentos;8\n';
const OFX = 'OFXHEADER:100\n<OFX><BANKMSGSRSV1>' +
  '<STMTTRNRS><STMTRS><CURDEF>USD<BANKACCTFROM><ACCTID>99887766</BANKACCTFROM><BANKTRANLIST>' +
  '<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261105<TRNAMT>4000.00<FITID>FIT1<NAME>CLIENTE EXEMPLO INC</STMTTRN>' +
  '<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261107<TRNAMT>-3840.00<FITID>FIT2<NAME>CONVERSION TO BRL</STMTTRN>' +
  '<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261107<TRNAMT>-15.00<FITID>FIT2<NAME>Tarifa TED internacional</STMTTRN>' +
  '</BANKTRANLIST></STMTRS></STMTTRNRS>' +
  '<STMTTRNRS><STMTRS><CURDEF>EUR<BANKACCTFROM><ACCTID>99887766</BANKACCTFROM><BANKTRANLIST></BANKTRANLIST></STMTRS></STMTTRNRS>' +
  '<STMTTRNRS><STMTRS><CURDEF>BRL<BANKACCTFROM><ACCTID>55554444</BANKACCTFROM><BANKTRANLIST>' +
  '<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260715<TRNAMT>-300.00<FITID>A1<NAME>PREF MUN SAO PAULO</STMTTRN>' +
  '</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>';
const EMP = [
  { id: 'emA', cnpj: '11222333000181', razao: 'FULANO EXEMPLO CONSULTORIA LTDA', regime: 'fator-r', socio: 'Fulano Exemplo', prolabore: { bruto: 3600, irrf: 0, liquido: 3204 },
    contador: { nome: 'Contabilidade Modelo', cnpj: '22333444000105' }, docs: [], pix: [],
    contas: [{ banco: 'BS2', conta: '12345678', rotuloRobo: 'BS2 PJ', bancoCod: '218', agencia: '0001', digito: '9', tipo: 'Corrente', titular: 'FULANO EXEMPLO CONSULTORIA LTDA', cnpj: '11.222.333/0001-81', pixes: [{ tipo: 'CNPJ', chave: '11222333000181' }] },
      { internacional: true, iban: '99887766', rotuloRobo: 'BS2 Internacional', moeda: 'USD', beneficiario: 'FULANO EXEMPLO CONSULTORIA LTDA', endereco: 'Rua Exemplo 100, Sao Paulo, Brazil', bancoNome: 'Banco Exemplo SA', swift: 'EXMPBRSP', intNome: 'Intermediary Bank Example', intSwift: 'INTMUS33', intConta: '000111222', finalidade: 'Services' }] },
  { id: 'emB', cnpj: '33444555000191', razao: 'FULANO ANTIGA ME', regime: 'simples', docs: [], pix: [], contas: [{ banco: 'BS2', conta: '55554444', rotuloRobo: 'BS2 PJ antiga' }] }];
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [], transferencias: [], empresas: EMP,
  gastos: [{ id: 'rb_bs2-MOV2', idRobo: 'bs2-MOV2', data: '2026-11-20', valor: 1200, grupo: 'BANCARIOS', sub: 'IRPF / DARF', desc: 'DAS-SIMPLES NACIONAL', fluxo: 'saida', conta: 'BS2 PJ', irTexto: 'PJ', origem: 'robo' }] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bs2-')), fCsv = path.join(tmp, 'extrato-pj.csv'), fOfx = path.join(tmp, 'extrato-int.ofx');
  fs.writeFileSync(fCsv, CSV, 'utf8'); fs.writeFileSync(fOfx, OFX, 'utf8');
  let pedidosPtax = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block', permissions: ['clipboard-read', 'clipboard-write'] });
    await ctx.route('**/*', (r) => {
      const u = r.request().url();
      if (/api\.bcb\.gov\.br\/dados\/serie\/bcdata\.sgs\.10813/.test(u)) { pedidosPtax.push(u); return r.fulfill({ contentType: 'application/json', body: JSON.stringify([{ data: '05/11/2026', valor: '5.0000'.replace('.', ',') }, { data: '06/11/2026', valor: '5,0100' }]) }); }
      return u.startsWith(BASE) ? r.continue() : r.abort();
    });
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); localStorage.removeItem('moneytrio.ptax.compra'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof BS2Extrato !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('tax'); irPara('t-pj'); render(); });

    console.log('1) a leitura');
    const l1 = await p.evaluate((t) => { const c = BS2Extrato.lerCsv(t[0]), o = BS2Extrato.lerOfx(t[1]); return { conta: c.conta, ids: c.linhas.map((x) => x.id + '|' + x.valor), ofx: o.map((b) => b.moeda + '|' + b.conta + '|' + b.linhas.length) }; }, [CSV, OFX]);
    ok(l1.conta === '12345678' && l1.ids.join() === 'MOV1|-3204,MOV2|-1200,MOV3|-600,MOV4|-400,MOV5|19000,MOV6|-5000,T7|-50', 'CSV: conta do cabeçalho, sinal depois do "R$", Saldo e rodapé fora, sem movimentação → transação, BOM no meio: ' + l1.ids.join());
    ok(l1.ofx.join() === 'USD|99887766|3,BRL|55554444|1', 'OFX: só os STMTRS com movimento (o EUR vazio fica fora): ' + l1.ofx.join());

    console.log('2) a prévia, com as regras do robô');
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-acao="bs2-importar"]')]);
    await fc.setFiles([fCsv, fOfx]); await p.waitForSelector('#genModal:not(.hidden) .bs2-previa');
    const pv = await p.evaluate(() => {
      const t = document.querySelector('#genBody').innerText;
      return { t, n: document.querySelectorAll('.bs2-previa tr').length };
    });
    ok(/11 novo\(s\); 1 já estavam no app/.test(pv.t), 'prévia: 11 novos; o DAS que o robô já mandou ("bs2-MOV2") aparece como "já existe": ' + pv.t.split('\n')[0]);
    ok(pedidosPtax.length === 1 && /sgs\.10813/.test(pedidosPtax[0]), 'PTAX de COMPRA do Banco Central (série 10813), um pedido só');
    await p.click('[data-acao="bs2-gravar"]');
    const g2 = await p.evaluate(() => ({ g: Gasto.todos().filter((g) => /^rb_bs2|^rb_cambio/.test(g.id)).map((g) => [g.id, g.conta, g.sub, g.rotulo || '', g.valor, g.valorMoeda || '', g.ptax || ''].join('|')).sort(),
      t: Transferencia.todas().map((t) => [t.id, t.banco, t.sub, t.valor, t.irTexto || ''].join('|')).sort() }));
    const tem = (l, s) => l.some((x) => x === s);
    ok(tem(g2.t, 'tf_bs2-MOV1|BS2 PJ|Pró-labore PJ → PF|3204|IRPF (pró-labore tributável: bruto 3.600,00, IRRF 0,00)'), 'a) saída = pró-labore líquido do Cofre e com o nome do sócio → transferência "Pró-labore PJ → PF" com o IR do cadastro');
    ok(tem(g2.g, 'rb_bs2-MOV3|BS2 PJ|IRPF / DARF|DARF (PJ)|600||') && tem(g2.g, 'rb_bs2-MOV4|BS2 PJ|Mensalidades / Anuidades|Contador (PJ)|400||'), 'c) "RECEITA FED-DARF" → DARF (PJ); o contador do Cofre → Contador (PJ)');
    ok(tem(g2.t, 'tf_bs2-MOV5|BS2 PJ|Conversão US$ → R$ (chegada na PJ)|19000|PJ') && tem(g2.t, 'tf_bs2-MOV6|BS2 PJ|Distribuição de lucros PJ → PF|5000|IRPF (lucro isento, cód. 13)'), 'c) conversão (chegada na PJ) e lucros (sócio + observação "Lucros") como transferências');
    ok(tem(g2.g, 'rb_bs2-T7|BS2 PJ|A identificar||50||'), 'd) nada casou → "A identificar"');
    ok(tem(g2.g, 'rb_bs2usd-FIT1-c|BS2 Internacional|Faturamento PJ (CLIENTE EXEMPLO INC)||20000|4000|5'), 'US$: crédito → "Faturamento PJ (cliente)", 4.000 × PTAX 5,00 = R$ 20.000 (com o valor em US$ guardado)');
    ok(tem(g2.t, 'tf_bs2usd-FIT2-d|BS2 Internacional|Conversão US$ → R$ (saída da conta internacional)|19238.4|PJ') && tem(g2.g, 'rb_bs2usd-FIT2-d-tarifa|BS2 Internacional|Outros (Bancarios)||75.15|15|5.01'), 'US$ em sábado (07/11) → PTAX de sexta (5,01); a tarifa com o mesmo FITID ganha "-tarifa"');
    ok(tem(g2.g, 'rb_cambio-2026-11-07|BS2 PJ|IOF / TED / DOC||238.4||'), 'custo de câmbio: 3.840 × 5,01 − 19.000 = R$ 238,40');
    ok(tem(g2.g, 'rb_bs2-A1|BS2 PJ antiga|Outros (Bancarios)|TFE Prefeitura SP (PJ)|300||'), 'OFX em R$ da conta antiga → "BS2 PJ antiga", TFE');

    console.log('3) não duplica');
    const [fc2] = await Promise.all([p.waitForEvent('filechooser'), p.click('[data-acao="bs2-importar"]')]);
    await fc2.setFiles([fCsv, fOfx]); await p.waitForSelector('#genModal:not(.hidden) .bs2-previa');
    ok(/^0 novo\(s\); 12 já estavam no app/.test(await p.evaluate(() => document.querySelector('#genBody').innerText)), 'a 2ª importação: 0 novos, 12 já existem');
    await p.evaluate(() => fechar('genModal'));

    console.log('4) o painel da PJ');
    const r4 = await p.evaluate(() => ({ a: PJ.resumo(ST.empresas[0], '2026-11'), b: PJ.resumo(ST.empresas[1], '2026-07') }));
    ok(r4.a.faturamento === 20000 && r4.a.conversao === 19000 && r4.a.das === 1200 && r4.a.darf === 600 && r4.a.contador === 400 && r4.a.prolabore === 3204 && r4.a.lucros === 5000 && r4.a.tarifas === 313.55, 'nov: faturamento 20.000, conversão 19.000, DAS 1.200, DARF 600, contador 400, pró-labore 3.204, lucros 5.000, tarifas 75,15 + câmbio 238,40 = 313,55 ' + JSON.stringify(r4.a));
    ok(r4.b.tfe === 300, 'a empresa antiga: a TFE de julho');

    console.log('5) dados para receber');
    await p.evaluate(() => { irPara('t-empresa'); render(); });
    await p.click('.em-card[data-emp="emA"] [data-acao="em-receber"][data-i="1"]'); await p.waitForSelector('#genModal:not(.hidden) .em-receber');
    const t5 = await p.evaluate(() => document.querySelector('.em-receber').innerText);
    ok(/Beneficiário \(nome exato\)\s+FULANO EXEMPLO CONSULTORIA LTDA/.test(t5) && /SWIFT\/BIC\s+EXMPBRSP/.test(t5) && /Banco intermediário\s+Intermediary Bank Example/.test(t5), 'painel: beneficiário, SWIFT/BIC, banco intermediário');
    await p.click('.em-receber tr:nth-child(1) [data-acao="em-copiar"]');
    ok(await p.evaluate(() => navigator.clipboard.readText()) === 'FULANO EXEMPLO CONSULTORIA LTDA', '📋 copia só o valor do campo');
    await p.click('[data-acao="em-copiar-tudo"][data-lg="en"]'); await p.waitForTimeout(200);
    const en = await p.evaluate(() => navigator.clipboard.readText());
    ok(/^Bank wire instructions — FULANO EXEMPLO CONSULTORIA LTDA\nBeneficiary: FULANO EXEMPLO CONSULTORIA LTDA\nBeneficiary address: Rua Exemplo 100/.test(en) && /\nSWIFT\/BIC: EXMPBRSP\n/.test(en) && /\nIntermediary Bank: Intermediary Bank Example\nIntermediary SWIFT\/BIC: INTMUS33\nAccount at intermediary: 000111222/.test(en), '"Copiar tudo (EN)": bank wire instructions com os rótulos em inglês');
    await p.click('[data-acao="em-copiar-tudo"][data-lg="pt"]'); await p.waitForTimeout(200);
    ok(/^Dados para receber — FULANO EXEMPLO CONSULTORIA LTDA\nBeneficiário \(nome exato\): FULANO/.test(await p.evaluate(() => navigator.clipboard.readText())), '"Copiar tudo (PT)"');
    const m5 = await p.evaluate(() => { const e = ST.empresas[0]; return CofreEmpresa.mailto(e, e.contas[0], 'pt'); });
    ok(/^mailto:\?subject=Dados%20para%20pagamento%20%E2%80%94%20FULANO/.test(m5) && decodeURIComponent(m5.split('body=')[1]).indexOf('Chave Pix (CNPJ): 11222333000181') >= 0 && /Conta: 12345678/.test(decodeURIComponent(m5.split('body=')[1])), 'mailto (PT) da conta em R$: assunto e corpo prontos, com a chave Pix e o tipo');

    console.log('6) visão da casa');
    const v6 = await p.evaluate(() => { const o = Escopo.soCasa; Escopo.soCasa = () => true; const r = { tela: MoneyModulos.infoTela('t-empresa').render(), pj: MoneyModulos.infoTela('t-pj').render(), esc: Escopo.de('empresas', ST.empresas[0]), tr: Escopo.de('transferencias', Transferencia.todas()[0]), g: Escopo.de('gastos', Gasto.todos().find((g) => g.id === 'rb_bs2-MOV3')) }; Escopo.soCasa = o; return r; });
    ok(!/FULANO|EXMPBRSP/.test(v6.tela + v6.pj) && v6.esc === 'reservado' && v6.tr === 'reservado' && v6.g === 'reservado', 'nada de PJ nem dos dados bancários; empresas, transferências e lançamentos da PJ: reservados');

    ok(p.erros.length === 0, 'sem erros na página: ' + p.erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)'); process.exit(falhas ? 1 : 0);
})();
