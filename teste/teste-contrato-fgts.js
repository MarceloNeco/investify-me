/* =====================================================================
   teste/teste-contrato-fgts.js — 3.47: contrato da escola por modelo (escolar, período ampliado, boleto da
   matrícula) e extrato do FGTS (leitura, JAM estimado, aviso de agosto, conta zerada escondida).
   Textos SINTÉTICOS (nomes e valores trocados), nada de dado real. Chromium headless, "só neste aparelho".
   Uso (na pasta raiz): node teste/teste-contrato-fgts.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
function pdfCom(linhas) {
  const e = (l) => l.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const conteudo = 'BT /F1 9 Tf 30 770 Td 12 TL ' + linhas.map((l) => '(' + e(l) + ') Tj T*').join(' ') + ' ET';
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    '<< /Length ' + conteudo.length + ' >>\nstream\n' + conteudo + '\nendstream', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let out = '%PDF-1.4\n'; const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
  const x = out.length;
  out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('') +
    'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF\n';
  return Buffer.from(out, 'latin1');
}
/* o modelo do texto que o pdftotext tira dos contratos (sem acento no PDF de teste, que é Helvetica simples) */
const ESCOLAR = ['ASSOCIACAO EDUCACIONAL EXEMPLO', 'CONTRATO DE SERVICOS DE EDUCACAO ESCOLAR - 2027', 'RA: 99999',
  'Curso: ( ) Educacao infantil / ( X ) Ensino Fundamental Ano/Serie: Turno: ( ) Ensino Medio (X ) Manha ( ) Tarde',
  'Nome Completo: Ana Teste Exemplo',
  'CLAUSULA 7a: O valor da anuidade para o ano letivo de janeiro a dezembro de 2027 podera ser parcelado em ate 13 parcelas,',
  'sendo a primeira parcela devida no ato da contratacao, como antecipacao da propria anuidade e 12 mensais iguais, de janeiro',
  'a dezembro, venciveis no dia 10. Havendo feriado, o primeiro ocorrera em 11/01/2027.',
  'Curso / Etapa Valor da Anuidade 1a Parcela Antecipada Valor Restante Numero de Parcela Valor de Cada Parcela',
  'Educacao Infantil R$ 30.000,00 R$ 1.200,00 R$ 28.800,00 12 R$ 2.400,00',
  'Ens. Fundamental (1o ao 5o', 'ano) R$ 40.000,00 R$ 1.600,00 R$ 38.400,00 12 R$ 3.200,00',
  'Ens. Medio R$ 45.000,00 R$ 1.800,00 R$ 43.200,00 12 R$ 3.600,00'];
const AMPLIADO = ['CONTRATO DE SERVICO DO PERIODO AMPLIADO - 2027', 'Nome Completo: Ana Teste Exemplo',
  'Modalidade Horario Valor da Anuidade No de Parcelas Valor da Parcela',
  'Periodo Ampliado (5x na semana) 8h30 as 13h / 12h as 16h30 R$ 12.000,00 10 R$ 1.200,00',
  '(3x na semana) R$ 7.000,00 10 R$ 700,00',
  'As 10 (dez) parcelas terao vencimento nos meses de fevereiro a junho e de agosto a dezembro de 2027, nao havendo parcela com vencimento em julho.'];
const BOLETO = ['Beneficiario: ASSOCIACAO EDUCACIONAL EXEMPLO', 'Vencimento 30/10/2026', 'Descricao Qtd Valor Desconto Total',
  '1a Parcela da Anuidade - 1 1.600,00 130,00 1.470,00'];
const FGTS1 = ['EXTRATO DO FGTS', 'Empregador: EMPRESA EXEMPLO TECNOLOGIA LTDA CNPJ: 00.000.000/0001-00', 'Data de admissao: 01/03/2018',
  'Data e codigo de afastamento: 30/06/2024 - I1', 'DATA LANCAMENTOS VALOR TOTAL',
  '10/04/2026 115-DEPOSITO MARCO/2026 R$ 0,00 R$ 100.000,00',
  '21/04/2026 CREDITO DE JAM 0,002470 R$ 247,00 R$ 100.247,00', '21/05/2026 CREDITO DE JAM 0,002470 R$ 247,61 R$ 100.494,61',
  '21/06/2026 SAQUE DEP JAM R$ 494,61 R$ 100.000,00', 'Saldo disponivel: R$ 100.000,00', 'Atualizado em 01/07/2026'];
const FGTS2 = ['EXTRATO DO FGTS', 'Empregador: OUTRA FIRMA COMERCIO SA', 'Data de admissao: 02/01/2010', 'Data de afastamento: 31/12/2012',
  '15/01/2013 SAQUE DEP. MULTA RESCISORIA R$ 5.000,00 R$ 0,00', 'Saldo disponivel: R$ 0,00', 'Atualizado em 01/07/2026'];
const LOCAL = { v: 1, posicoes: [], config: {}, gastos: [], recorrentes: [],
  patrimonio_iliquido: [{ id: 'il1', nome: 'FGTS — Exemplo', tipo: 'fgts', inst: 'Empresa Exemplo', valor: 90000, data: '2025-08-01', obs: '' }] };
(async () => {
  const srv = http.createServer((q, s) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'application/octet-stream' }); fs.createReadStream(p).pipe(s); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-'));
  const arq = (n, l) => { const f = path.join(tmp, n); fs.writeFileSync(f, pdfCom(l)); return f; };
  const fEsc = arq('contrato.pdf', ESCOLAR), fAmp = arq('ampliado.pdf', AMPLIADO), fBol = arq('boleto.pdf', BOLETO), fF1 = arq('fgts1.pdf', FGTS1), fF2 = arq('fgts2.pdf', FGTS2);
  const b = await chromium.launch();
  try {
    for (const vp of [{ width: 390, height: 800 }, { width: 1366, height: 768 }]) {
      console.log('tela ' + vp.width + 'x' + vp.height);
      const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('semeado')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('semeado', '1'); } }, JSON.stringify(LOCAL));
      const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
      const semToasts = () => p.evaluate(() => document.querySelectorAll('#toasts .toast').forEach((e) => e.parentNode.removeChild(e)));
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.patrimonio_iliquido || []).length === 1 && window.Fgts && window.CompromissoDe);
      await p.evaluate(() => { I18n.atual = 'pt'; });

      console.log(' contrato da escola pelo modelo');
      const e1 = await p.evaluate((t) => CompromissoDe.lerModelo(t), ESCOLAR.join('\n'));
      ok(e1.tipo === 'escolar' && e1.ano === 2027 && e1.aluno === 'Ana' && e1.curso === 'fundamental' && e1.turno === 'manha', 'contrato escolar: tipo, ano 2027, aluno, curso e turno marcados com X');
      ok(e1.opcoes.length === 3 && e1.escolhida === 1 && e1.opcoes[1].nome === 'Ens. Fundamental (1o ao 5o ano)' && e1.opcoes[1].parcela === 3200 && e1.opcoes[1].antecipada === 1600 && e1.opcoes[1].anuidade === 40000,
        'a tabela tem 3 etapas; escolhe a do curso marcado, mesmo com o nome quebrado em 2 linhas');
      ok(e1.meses.length === 12 && e1.dia === 10 && e1.primeiroVenc === '2027-01-11' && e1.antecipadaNoAto, '12 mensais de janeiro a dezembro, dia 10, 1º vencimento 11/01/2027, 1ª parcela no ato');
      const e2 = await p.evaluate((t) => CompromissoDe.lerModelo(t.replace('Ens. Medio R$ 45.000,00', 'Ens. Fundamental (6o ao 9o ano) R$ 45.000,00')), ESCOLAR.join('\n'));
      ok(e2.escolhida === -1, 'duas linhas do Fundamental e sem série: o app pergunta');
      const e3 = await p.evaluate((t) => CompromissoDe.lerModelo(t.replace('Ano/Serie:', 'Ano/Serie: 7').replace('Ens. Medio R$ 45.000,00', 'Ens. Fundamental (6o ao 9o ano) R$ 45.000,00')), ESCOLAR.join('\n'));
      ok(e3.escolhida === 2, 'com a série (7º ano): escolhe "6º ao 9º ano"');
      const a1 = await p.evaluate((t) => CompromissoDe.lerModelo(t), AMPLIADO.join('\n'));
      ok(a1.tipo === 'ampliado' && a1.opcoes.length === 2 && a1.opcoes[1].nome === '(3x na semana)' && a1.opcoes[1].parcela === 700 && a1.opcoes[0].parcelas === 10 && a1.escolhida === -1 && a1.dia === 0,
        'período ampliado: 2 opções (5x e 3x), sem X → perguntar; dia não informado');
      ok(a1.meses.join() === '2,3,4,5,6,8,9,10,11,12', 'meses: fevereiro a junho e agosto a dezembro (sem julho)');
      ok(await p.evaluate((t) => CompromissoDe.lerModelo(t.replace('(3x na semana)', '( X ) (3x na semana)')).escolhida, AMPLIADO.join('\n')) === 1, 'com "( X )" na opção: escolhe sozinho');
      const b1 = await p.evaluate((t) => CompromissoDe.lerModelo(t), BOLETO.join('\n'));
      ok(b1.tipo === 'boleto' && b1.bruto === 1600 && b1.desconto === 130 && b1.pagar === 1470 && b1.venc === '2026-10-30', 'boleto da matrícula: bruto, desconto, a pagar e vencimento');
      ok(await p.evaluate(() => CompromissoDe.lerModelo('Contrato de prestacao de servicos qualquer') === null), 'texto de outro contrato: não é modelo (fica o leitor genérico)');

      await p.evaluate(() => { abrirApp('budget'); irPara('b-custos'); custosAba = 'recorrentes'; render(); });
      await p.waitForFunction(() => window.scrollY === 0); await semToasts();
      const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#view-b-custos [data-acao="cdl-contrato"]')]);
      await fc.setFiles([fEsc, fAmp, fBol]); await p.waitForSelector('#genModal:not(.hidden) .cdl-item');
      ok(await p.$$eval('#genBody .cdl-item', (l) => l.length) === 2 && await p.isChecked('#cdlGasto') && await p.inputValue('#cdlGValor') === '1470', 'prévia: escola + período ampliado + 1ª parcela (R$ 1.470, marcada)');
      ok(/Qual opção vocês contrataram/.test(await p.textContent('#genBody')), 'o período ampliado sem X pergunta qual opção');
      await semToasts(); await p.click('#genBody [data-acao="cdl-criar"]');
      ok(await p.evaluate(() => (Store.estado.recorrentes || []).length === 0) && /Escolha a opção/.test(await p.textContent('#toasts')), 'sem escolher a opção: não cria nada e avisa');
      await p.selectOption('#genBody .cdl-item[data-k="1"] .cdl-op', '1');
      await semToasts(); await p.click('#genBody [data-acao="cdl-criar"]');
      await p.waitForFunction(() => (Store.estado.recorrentes || []).length === 2 && document.getElementById('genModal').classList.contains('hidden'));
      const rs = await p.evaluate(() => Store.estado.recorrentes.map((r) => ({ n: r.nome, v: r.valor, d: r.dia, de: r.desde, ate: r.ate, fora: r.fora.join(), c: r.aConfirmar, ir: r.irpf, g: r.grupo, q: r.quem })));
      ok(rs[0].n === 'Escola Ana 2027' && rs[0].v === 3200 && rs[0].d === 10 && rs[0].de === '2027-01-01' && rs[0].ate === '2027-12-31' && rs[0].fora === '' && rs[0].c && rs[0].ir && rs[0].g === 'DEPENDENTES' && rs[0].q === 'Ana',
        'criou "Escola Ana 2027": R$ 3.200, dia 10, jan–dez, IR, a confirmar');
      ok(rs[1].n === 'Período ampliado Ana 2027' && rs[1].v === 700 && rs[1].d === 10 && rs[1].de === '2027-02-01' && rs[1].fora === '7' && rs[1].c && rs[1].ir,
        'criou "Período ampliado Ana 2027": R$ 700, fev–dez sem julho, dia do contrato escolar, a confirmar');
      const gs = await p.evaluate(() => Store.estado.gastos.map((g) => [g.data, g.valor, g.grupo, g.quem, g.irpf, g.per].join('|')));
      ok(gs.length === 1 && gs[0] === '2026-10-30|1470|DEPENDENTES|Ana|true|Pontual', '1ª parcela lançada como gasto pontual (30/10/2026, R$ 1.470, IR)');
      ok(await p.evaluate(() => (Store.estado.arquivos || []).filter((a) => a.tipo === 'contrato').length === 2 && Store.estado.arquivos.some((a) => a.tipo === 'boleto')), 'os 3 PDFs ficam guardados (2 contratos e o boleto)');
      ok(await p.evaluate((t) => CompromissoDe.planoModelo([CompromissoDe.lerModelo(t)]).gasto.jaLancado, BOLETO.join('\n')), 'ler o boleto de novo: a 1ª parcela já aparece como lançada');
      ok((await p.textContent('#view-b-custos')).match(/a confirmar/g).length >= 2, 'a lista mostra "⚠ a confirmar" nos dois');
      await p.evaluate(() => abrirRecorrente(Store.estado.recorrentes[0].id, null, {})); await p.waitForSelector('#assetModal:not(.hidden) #rcNome');
      ok(/Criado a partir do contrato/.test(await p.textContent('#assetModalBody')), 'abrir o compromisso explica: "Criado a partir do contrato. Confira…"');
      await p.click('#assetModal .f-actions [data-close="assetModal"]');

      console.log(' extrato do FGTS');
      const x1 = await p.evaluate((t) => Fgts.lerExtrato(t), FGTS1.join('\n'));
      ok(x1.empregador === 'Empresa Exemplo Tecnologia Ltda' && x1.admissao === '2018-03-01' && x1.afastamento === '2024-06-30' && x1.saldo === 100000 && x1.data === '2026-07-01',
        'lê empregador, admissão, afastamento, saldo e data da atualização');
      ok(x1.lancs.length === 4 && x1.lancs[3].v === -494.61 && x1.taxaJam === 0.00247, 'lançamentos (saque negativo) e a taxa do último JAM (0,247%/mês)');
      ok(await p.evaluate(() => Fgts.lerExtrato('Extrato de conta corrente\nSaldo R$ 10,00') === null), 'extrato de banco: não é FGTS');
      const est = await p.evaluate(() => Fgts.estimar({ tipo: 'fgts', valor: 100000, data: '2026-07-01', fgts: { taxaJam: 0.00247 } }, '2026-11-06'));
      ok(est.meses === 4 && Math.abs(est.valor - 100991.67) < 0.02 && est.desde === '2026-07-01', 'estimado: 4 JAMs (21/jul a 21/out) → R$ ' + est.valor);
      ok(await p.evaluate(() => Fgts.estimar({ tipo: 'fgts', valor: 100000, data: '2026-07-01' }, '2026-07-20') === null), 'antes do dia 21: nada a estimar');
      ok(await p.evaluate(() => Fgts.precisaAtualizar('2026-08-10') && !Fgts.precisaAtualizar('2026-09-10')), 'em agosto: "atualize o FGTS" (fora de agosto, não)');

      await p.evaluate(() => { abrirApp('investify'); irPara('carteira'); }); await p.waitForFunction(() => window.scrollY === 0); await semToasts();
      const [fc2] = await Promise.all([p.waitForEvent('filechooser'), p.click('#view-carteira [data-acao="fgts-ler"]')]);
      await fc2.setFiles([fF1, fF2]); await p.waitForSelector('#genModal:not(.hidden) .fg-item');
      const prev = await p.textContent('#genBody');
      ok(/Atualizar FGTS — Exemplo: R\$\s?90\.000,00 → R\$\s?100\.000,00/.test(prev) && /Nova conta: FGTS — Outra Firma/.test(prev) && /Saldo zero/.test(prev), 'prévia: atualiza a conta que já existe e cria a outra (zerada)');
      await semToasts(); await p.click('#genBody [data-acao="fgts-gravar"]');
      await p.waitForFunction(() => Store.estado.patrimonio_iliquido.length === 2 && document.getElementById('genModal').classList.contains('hidden'));
      const il = await p.evaluate(() => Store.estado.patrimonio_iliquido.map((x) => [x.nome, x.valor, x.data, x.fgts && x.fgts.taxaJam].join('|')));
      ok(il[0] === 'FGTS — Exemplo|100000|2026-07-01|0.00247' && il[1] === 'FGTS — Outra Firma|0|2026-07-01|0', 'gravou: saldo e data do extrato; a conta zerada fica guardada');
      const card = await p.textContent('#view-carteira .il-card');
      ok(/estimado desde 01\/Jul\/2026/i.test(card) || /estimado desde 01\/07\/2026/.test(card), 'a linha mostra "estimado desde 01/07/2026"');
      ok(!/Outra Firma/.test(card) && /1 conta zerada guardada/.test(card), 'conta zerada escondida, com "1 conta zerada guardada — mostrar"');
      await p.click('#view-carteira [data-acao="iliq-zeradas"]');
      ok(/Outra Firma/.test(await p.textContent('#view-carteira .il-card')), '"mostrar" traz a conta zerada');
      const tot = await p.evaluate(() => PatrimonioIliquido.total()), estH = await p.evaluate(() => Fgts.estimar(Store.estado.patrimonio_iliquido[0]));
      ok(estH ? tot === estH.valor : tot === 100000, 'o total sem liquidez (e o Patrimônio total) usa o valor estimado');
      ok(await p.evaluate(() => (Store.estado.arquivos || []).filter((a) => a.tipo === 'fgts').length === 2), 'os extratos ficam guardados (tipo fgts)');
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem para o lado');
      ok(erros.length === 0, 'sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
