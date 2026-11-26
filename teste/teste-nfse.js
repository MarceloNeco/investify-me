/* =====================================================================
   teste/teste-nfse.js — 3.122: a NFS-e que o robô manda com a ficha (modulos/comprovantes.js 1.3.0). Dados FICTÍCIOS (pessoas,
   prestadores, CNPJ de exemplo e valores inventados). Confere: a nota de saúde (terapia) liga ao pagamento e leva "para quem" (o
   paciente), o serviço e a categoria sugerida; a nota de EDUCAÇÃO liga ao gasto da escola e marca o IR; a despesa escolar extra
   (ampliado) liga mas NÃO deduz; "desconto já aplicado"; a categoria que a pessoa já escolheu não muda.
   Uso: node teste/teste-nfse.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [],
  pessoas: [{ id: 'p-cri', tipo: 'casa', papel: 'dependente', nome: 'Criança Ficticia', apelido: 'Criança Ficticia' }],
  gastos: [{ id: 'rb_to', data: '2026-11-10', valor: 370, desc: 'PIX CLINICA EXEMPLO', fluxo: 'saida', grupo: 'SAUDE', sub: 'Outros', origem: 'robo', confianca: 'palpite' },
    { id: 'rb_esc', data: '2026-11-05', valor: 2100, desc: 'ESCOLA FICTICIA MENS', fluxo: 'saida', grupo: 'DEPENDENTES', sub: 'Escola/Faculdade', origem: 'robo' },
    { id: 'rb_amp', data: '2026-11-06', valor: 480, desc: 'ESCOLA FICTICIA AMPL', fluxo: 'saida', grupo: 'DEPENDENTES', sub: 'Escola/Faculdade', origem: 'robo', irpf: true },
    { id: 'rb_med', data: '2026-11-12', valor: 250, desc: 'CONSULTORIO FICTICIO', fluxo: 'saida', grupo: 'SAUDE', sub: 'Médico', origem: 'robo', editadoPessoa: true }] };

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
    await p.clock.setFixedTime(new Date('2026-11-20T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.Comprovantes && window.NfIr);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-painel'); render(); });
    const g = (id) => p.evaluate((i) => JSON.parse(JSON.stringify(Gasto.todos().find((x) => x.id === i))), id);
    const sit = (id) => p.evaluate((i) => Comprovantes.situacao(Comprovantes.lista().find((x) => x.id === i)), id);

    console.log('1) saúde: terapia para o dependente');
    await p.evaluate(() => Comprovantes.receber({ id: 'nf-to', subtipo: 'nota_fiscal', loja: 'Clinica Exemplo', cnpj: '11222333000181', valor: 370, data: '2026-11-11', numero: '901',
      ficha: { irpf_candidata: 'saude', beneficiario: 'Criança Ficticia', servico: 'Terapia ocupacional', data_servico: '2026-11-10', categoria_sugerida: 'Saúde > Terapias (TO/Fono/Psicopedagogia)', desconto_ja_aplicado: true } }));
    const to = await g('rb_to'), sto = await sit('nf-to'), dto = await p.evaluate(() => NfIr.dados(Gasto.todos().find((x) => x.id === 'rb_to')));
    ok(to.paraQuem === 'Criança Ficticia' && to.paraQuemId === 'p-cri', 'o beneficiário vira o "para quem" do lançamento (ligado à pessoa do cadastro)');
    ok(to.grupo === 'SAUDE' && to.sub === 'Terapias (TO/Fono/Psicopedagogia)' && to.irpf === true, 'a categoria sugerida (o palpite ainda não confirmado muda) e entra no IR: ' + to.sub);
    ok(dto.pessoa === 'Criança Ficticia' && dto.tipo === 'Terapia ocupacional', 'os dados da despesa médica: paciente e serviço');
    ok(/Terapia ocupacional \(10\/Nov\/2026\) · 👤 para Criança Ficticia · categoria: Saúde › Terapias/.test(sto) && /desconto já aplicado \(o valor da nota é o que foi pago\)/.test(sto) && /despesa médica: nota recebida/.test(sto), 'a linha da nota: ' + sto);

    console.log('2) educação: a escola');
    await p.evaluate(() => Comprovantes.receber({ id: 'nf-esc', subtipo: 'nota_fiscal', loja: 'Escola Ficticia', valor: 2100, data: '2026-11-07', numero: '77',
      ficha: { irpf_candidata: 'educacao', beneficiario: 'Criança Ficticia', servico: 'Mensalidade escolar', categoria_sugerida: { grupo: 'DEPENDENTES', categoria: 'Escola/Faculdade' } } }));
    const esc = await g('rb_esc'), ses = await sit('nf-esc');
    ok(esc.irpf === true && esc.paraQuem === 'Criança Ficticia' && await p.evaluate(() => NfIr.estado(Gasto.todos().find((x) => x.id === 'rb_esc')) === 'recebida'), 'a nota de educação liga à mensalidade, marca o IR e a nota como recebida');
    ok(/educação: nota recebida \(entra no IR\)/.test(ses), 'a linha diz "educação: nota recebida (entra no IR)"');

    console.log('3) despesa escolar extra (ampliado): liga, mas NÃO deduz');
    await p.evaluate(() => Comprovantes.receber({ id: 'nf-amp', subtipo: 'nota_fiscal', loja: 'Escola Ficticia', valor: 480, data: '2026-11-07', numero: '78',
      ficha: { irpf_candidata: 'educacao', beneficiario: 'Criança Ficticia', servico: 'Período ampliado', despesa_escolar_extra: 'ampliado' } }));
    const amp = await g('rb_amp'), sam = await sit('nf-amp');
    ok(amp.irpf === false && await p.evaluate(() => NfIr.estado(Gasto.todos().find((x) => x.id === 'rb_amp')) !== 'aguardando'), 'o ampliado sai do IR e a nota não fica "aguardando"');
    ok(/despesa escolar extra \(ampliado\/alimentação\): não deduz no IR/.test(sam), 'a linha explica: ' + sam);

    console.log('4) o que a pessoa já classificou não muda');
    await p.evaluate(() => Comprovantes.receber({ id: 'nf-med', subtipo: 'nota_fiscal', loja: 'Consultorio Ficticio', valor: 250, data: '2026-11-12', numero: '5',
      ficha: { irpf_candidata: 'saude', servico: 'Consulta', categoria_sugerida: 'Saúde > Terapias (TO/Fono/Psicopedagogia)' } }));
    const med = await g('rb_med');
    ok(med.sub === 'Médico', 'a consulta que a pessoa editou continua em "Médico"');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
