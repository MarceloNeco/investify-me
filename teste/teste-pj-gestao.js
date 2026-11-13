/* =====================================================================
   teste/teste-pj-gestao.js — 3.82: o FiscalONE como gestão da PJ (modulos/pj-gestao.js, cofre-empresa 1.2.0, pj 1.1.0).
   Dados FICTÍCIOS. Confere: a ficha da empresa (fantasia, CNAE, anexo, sócios, honorário, situação; certificado digital
   com lembrete); a ativa primeiro; os gráficos (receita em R$ e a moeda de origem, custos por tipo, margem, PF) em 12 meses
   e no ano; contas a receber (nota em US$ que casa sozinha com a entrada) e a pagar (calendário + à mão), com atrasado;
   o fluxo de caixa dos próximos 90 dias; os custos do negócio pagos no CPF (negócio / casa / dividido %, a soma do mês,
   o aviso dos serviços do exterior); a visão da casa sem nada de PJ.
   Uso: node teste/teste-pj-gestao.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const PJ = (id, data, valor, sub, conta, extra) => Object.assign({ id, data, valor, grupo: 'BANCARIOS', sub, desc: sub.toUpperCase(), fluxo: 'saida', conta, irTexto: 'PJ', origem: 'robo' }, extra || {});
const TF = (id, data, valor, sub, banco, desc) => ({ id: 'tf_' + id, data, valor, banco, desc, forma: 'Debito', origem: 'robo', idRobo: id, sub, irTexto: 'PJ' });
const gastos = [], transferencias = [];
for (let k = 0; k < 12; k++) {
  const m = new Date(Date.UTC(2025, 11 + k, 1)).toISOString().slice(0, 7);
  gastos.push(PJ('rb_bs2usd-f' + k + '-c', m + '-05', 20000, 'Faturamento PJ (Cliente Exemplo)', 'BS2 Internacional', { fluxo: 'entrada', grupo: 'RENDA', moeda: 'USD', valorMoeda: 4000, ptax: 5 }));
  gastos.push(PJ('das' + k, m + '-20', 1200, 'IRPF / DARF', 'BS2 PJ', { desc: 'DAS-SIMPLES' }));
  gastos.push(PJ('ct' + k, m + '-10', 400, 'Mensalidades / Anuidades', 'BS2 PJ', { desc: 'Pagamento boleto - CONTABILIDADE MODELO' }));
  transferencias.push(TF('bs2-pl' + k, m + '-06', 3000, 'Pró-labore PJ → PF', 'BS2 PJ', 'Débito PIX - FULANO EXEMPLO'));
  /* PF: assinaturas com cara de negócio, uma padaria (não é) */
  gastos.push({ id: 'an' + k, data: m + '-03', valor: 110, grupo: 'PESSOAL', sub: 'IA e software', desc: 'ANTHROPIC CLAUDE PRO', fluxo: 'saida', cartaoId: 'ctpf' });
  gastos.push({ id: 'vi' + k, data: m + '-08', valor: 120, grupo: 'HABITACAO', sub: 'Internet', desc: 'VIVO FIBRA INTERNET', fluxo: 'saida' });
  gastos.push({ id: 'pa' + k, data: m + '-09', valor: 30, grupo: 'ALIMENTACAO', sub: 'Padaria', desc: 'PADARIA EXEMPLO', fluxo: 'saida' });
}
gastos.push(PJ('tfe1', '2026-07-15', 300, 'Outros (Bancarios)', 'BS2 PJ', { desc: 'PREF MUN SAO PAULO' }));
gastos.push(PJ('rb_cambio-2026-11-07', '2026-11-07', 238.4, 'IOF / TED / DOC', 'BS2 PJ'));
gastos.push(PJ('tar1', '2026-11-11', 35, 'Outros (Bancarios)', 'BS2 PJ', { desc: 'TARIFA PACOTE' }));
transferencias.push(TF('bs2-lu1', '2026-11-12', 5000, 'Distribuição de lucros PJ → PF', 'BS2 PJ', 'Débito PIX - FULANO EXEMPLO [lucros]'));
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [], gastos, transferencias,
  empresas: [{ id: 'emB', cnpj: '33444555000191', razao: 'FULANO ANTIGA ME', regime: 'simples', situacao: 'a-encerrar', contasRobo: ['BS2 PJ antiga'], docs: [], pix: [], contas: [] },
    { id: 'emA', cnpj: '11222333000181', razao: 'FULANO EXEMPLO CONSULTORIA LTDA', regime: 'fator-r', contasRobo: ['BS2 PJ', 'BS2 Internacional'], contador: { nome: 'Contabilidade Modelo' }, docs: [], pix: [], contas: [] }],
  saldos_banco: [{ id: 'sbpj', tipo: 'conta', banco: 'BS2', conta: 'BS2 PJ', saldo: 7000, data: '2026-11-13', hist: [] }] };

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
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept(x.type() === 'prompt' ? '50' : undefined));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof PJGestao !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); PJ._hoje = PJGestao._hoje = CofreEmpresa._hoje = '2026-11-13'; });

    console.log('1) a ficha da empresa');
    await p.evaluate(() => { abrirApp('tax'); irPara('t-empresa'); render(); });
    await p.click('.em-card[data-emp="emA"] [data-acao="em-editar"]'); await p.waitForSelector('#genModal:not(.hidden) #emFantasia');
    await p.fill('#emFantasia', 'Exemplo Consultoria'); await p.selectOption('#emAnexo', 'III'); await p.fill('#emCnaes', '6201-5/01\n6204-0/00');
    await p.fill('#emIm', '1.234.567-8'); await p.fill('#emEndereco', 'Rua Exemplo 100, São Paulo'); await p.fill('#emSocios', 'Fulano Exemplo; 99\nBeltrana Exemplo; 1');
    await p.fill('#emContHon', '400'); await p.evaluate(() => { document.getElementById('emAbertura').value = '2020-03-02'; });
    await p.click('[data-acao="em-salvar"]');
    const f1 = await p.evaluate(() => ST.empresas.find((e) => e.id === 'emA'));
    ok(f1.fantasia === 'Exemplo Consultoria' && f1.anexo === 'III' && f1.cnaes.length === 2 && f1.im === '1.234.567-8' && f1.socios.length === 2 && f1.socios[0].pct === 99 && f1.contador.honorario === 400 && f1.situacao === 'ativa' && f1.abertura === '2020-03-02' && f1.contasRobo.length === 2,
      'ficha: fantasia, anexo III, 2 CNAEs, inscrição municipal, sócios e %, honorário, abertura, situação ativa (e as contas continuam)');
    const t1 = await p.evaluate(() => document.querySelector('.em-card[data-emp="emA"]').innerText);
    ok(/Exemplo Consultoria/.test(t1) && /Anexo III/.test(t1) && /6201-5\/01/.test(t1) && /Fulano Exemplo \(99%\)/.test(t1) && /honorário R\$\s?400,00/.test(t1), 'o cartão da empresa mostra a ficha');
    await p.evaluate(() => { ST.empresas.find((e) => e.id === 'emA').docs.push({ id: 'dc1', tipo: 'certificado', nome: 'e-CNPJ A1', arquivoId: '', validade: '2026-12-01' }); });
    ok(/Certificado digital · FULANO EXEMPLO CONSULTORIA LTDA/.test(await p.evaluate(() => (inboxGrupos().find((g) => g.id === 'avisos') || {}).html || '')), 'certificado digital com validade → lembrete no 📥');
    await p.evaluate(() => { irPara('t-pj'); render(); });
    ok(await p.evaluate(() => document.querySelector('.pj-abas .cfg-aba').innerText.indexOf('FULANO EXEMPLO CONSULTORIA') >= 0 && /a encerrar/.test(document.querySelectorAll('.pj-abas .cfg-aba')[1].innerText)), 'a ativa primeiro; a outra com "a encerrar"');

    console.log('2) gráficos');
    const s2 = await p.evaluate(() => { const e = ST.empresas.find((x) => x.id === 'emA'), s = PJGestao.serie(e, '2026-11'); return { n: s.length, nov: s[11], dez: s[0] }; });
    ok(s2.n === 12 && s2.nov.receita === 20000 && s2.nov.moedas.USD === 4000 && s2.nov.impostos === 1200 && s2.nov.contador === 400 && s2.nov.tarifas === 35 && s2.nov.cambio === 238.4 && s2.nov.custos === 1873.4 && s2.nov.margem === 18126.6 && s2.nov.pf === 8000,
      'nov: receita 20.000 (US$ 4.000), impostos 1.200, contador 400, tarifas 35, câmbio 238,40, custos 1.873,40, margem 18.126,60, PF 8.000 ' + JSON.stringify(s2.nov));
    ok(s2.dez.t === '2025-12' && s2.dez.receita === 20000, '12 meses: de dez/2025 a nov/2026');
    const g2 = await p.evaluate(() => { const c = document.querySelector('.pjg-graf'); return { svg: !!c.querySelector('svg .viz-zero') && c.querySelectorAll('svg .col-e').length === 12 && c.querySelectorAll('svg .col-s').length === 12 && !!c.querySelector('svg .viz-saldo'), tit: c.querySelector('svg .col-e title').textContent, ano: c.querySelector('.pjg-ano').innerText }; });
    ok(g2.svg && /USD 4,000\.00/.test(g2.tit), 'gráfico: 12 colunas de receita e 12 de custos, a linha do zero e a da margem; a moeda de origem no título');
    ok(/ano 2026[\s\S]*R\$\s?220\.000,00/i.test(g2.ano), 'a linha do ano: receita 2026 = 11 × 20.000 = R$ 220.000 ' + g2.ano);

    console.log('3) contas a receber e a pagar');
    await p.evaluate(() => { PJ.criarCalendario(ST.empresas.find((x) => x.id === 'emA')); render(); });
    await p.click('[data-acao="pjg-nova"][data-tipo="receber"]'); await p.waitForSelector('#genModal:not(.hidden) #pjgValor');
    await p.fill('#pjgQuem', 'Cliente Exemplo'); await p.fill('#pjgNota', '42'); await p.fill('#pjgValor', '4000'); await p.selectOption('#pjgMoeda', 'USD');
    await p.evaluate(() => { document.getElementById('pjgData').value = '2026-12-05'; }); await p.click('[data-acao="pjg-salvar"]');
    await p.click('[data-acao="pjg-nova"][data-tipo="pagar"]'); await p.waitForSelector('#genModal:not(.hidden) #pjgValor');
    await p.fill('#pjgQuem', 'Software Exemplo'); await p.fill('#pjgDesc', 'Licença anual'); await p.fill('#pjgValor', '900');
    await p.evaluate(() => { document.getElementById('pjgData').value = '2026-11-01'; }); await p.click('[data-acao="pjg-salvar"]');
    const c3 = await p.evaluate(() => { const e = ST.empresas.find((x) => x.id === 'emA'); return { pag: PJGestao.aPagar(e, 90).map((x) => x.desc + '|' + x.data + '|' + x.status), t: document.querySelector('.pjg-contas').innerText }; });
    ok(c3.pag.indexOf('Licença anual|2026-11-01|atrasado') >= 0 && c3.pag.some((x) => /^DAS Simples.*\|2026-11-20\|avencer$/.test(x)) && c3.pag.some((x) => /^Contador.*\|2026-12-10\|avencer$/.test(x)), 'a pagar: a conta à mão atrasada e o calendário (DAS 20/11, contador 10/12) a vencer');
    ok(/NF 42/.test(c3.t) && /USD 4,000\.00 \(≈ R\$\s?20\.000,00\)/.test(c3.t) && /a vencer/.test(c3.t), 'a receber: a nota 42 em US$, com o valor aproximado em R$');
    await p.evaluate(() => { Gasto.add({ id: 'rb_bs2usd-fx-c', data: '2026-12-03', valor: 20400, grupo: 'RENDA', sub: 'Faturamento PJ (Cliente Exemplo)', desc: 'WIRE', fluxo: 'entrada', conta: 'BS2 Internacional', irTexto: 'PJ', moeda: 'USD', valorMoeda: 4000, ptax: 5.1, origem: 'robo' }); PJGestao._hoje = '2026-12-04'; render(); });
    ok(await p.evaluate(() => { const x = ST.pj_contas.find((y) => y.nota === '42'); return x.feitoEm === '2026-12-03' && x.gid === 'rb_bs2usd-fx-c'; }), 'a entrada de US$ 4.000 em 03/12 casa sozinha com a nota: recebida');

    console.log('4) fluxo de caixa (90 dias)');
    const f4 = await p.evaluate(() => { PJGestao._hoje = '2026-11-13'; const e = ST.empresas.find((x) => x.id === 'emA'); ST.pj_contas.find((y) => y.nota === '42').feitoEm = ''; ST.pj_contas.find((y) => y.nota === '42').gid = '';
      Gasto.excluir('rb_bs2usd-fx-c'); return PJGestao.fluxo(e); });
    ok(f4.saldo === 7000 && f4.realizado.length === 3 && f4.realizado[2].t === '2026-11' && f4.realizado[2].entrou === 20000, 'saldo de hoje R$ 7.000 (contas da PJ); realizado de 3 meses (nov: entrou 20.000)');
    const rec = f4.proximos.find((x) => /NF 42/.test(x.desc)), lic = f4.proximos.find((x) => /Licença/.test(x.desc));
    ok(rec && rec.valor === 20000 && rec.aprox && lic && lic.data === '2026-11-13' && lic.valor === -900, 'próximos: a nota (≈ R$ 20.000 pela última PTAX) e a conta atrasada (hoje, −900)');
    ok(Math.abs(f4.fim - (7000 + f4.proximos.reduce((s, x) => s + x.valor, 0))) < 0.01, 'saldo previsto em 90 dias = saldo + entradas − saídas: ' + f4.fim);

    console.log('5) custos do negócio pagos no CPF');
    const c5 = await p.evaluate(() => PJGestao.candidatosCpf().map((x) => x.nome + '|' + x.media + '|' + x.ext));
    ok(c5.length === 2 && c5.indexOf('Anthropic / Claude|110|true') >= 0 && c5.indexOf('Internet|120|false') >= 0, 'candidatos: Anthropic/Claude (exterior) e a internet; a padaria não: ' + c5.join());
    await p.evaluate(() => { irPara('t-pj'); render(); });
    await p.click('.pjg-cpf li:has-text("Anthropic") [data-tipo="negocio"]');
    await p.click('.pjg-cpf li:has-text("Internet") [data-tipo="dividido"]');
    const m5 = await p.evaluate(() => ({ m: PJGestao.cpfDoMes('2026-11'), t: document.querySelector('.pjg-cpf').innerText }));
    ok(m5.m.negocio === 170, 'novembro: 110 (Claude, do negócio) + 50% de 120 (internet) = R$ 170 do negócio saindo do CPF');
    ok(/Neste mês saíram do CPF R\$\s?170,00/.test(m5.t) && /cadastre o cartão da PJ/.test(m5.t) && /IOF e tributos de importação de serviço/.test(m5.t) && /não promete economia/.test(m5.t), 'a frase do mês, a sugestão do cartão da PJ e o aviso honesto dos serviços do exterior');
    await p.click('.pjg-cpf li:has-text("Internet") [data-tipo="casa"]');
    ok(await p.evaluate(() => PJGestao.cpfDoMes('2026-11').negocio === 110), 'marcar "da casa" tira da soma');

    console.log('6) visão da casa');
    const v6 = await p.evaluate(() => { const o = Escopo.soCasa; Escopo.soCasa = () => true; const e = ST.empresas.find((x) => x.id === 'emA');
      const r = { cpf: PJGestao.candidatosCpf().length, bloco: MoneyModulos.html('pj.empresa', { e, mes: '2026-11' }), pc: Escopo.de('pj_contas', ST.pj_contas[0]), pcpf: Escopo.de('pj_cpf', ST.pj_cpf[0]) }; Escopo.soCasa = o; return r; });
    ok(v6.cpf === 0 && v6.bloco === '' && v6.pc === 'reservado' && v6.pcpf === 'reservado', 'nada de PJ: sem candidatos, sem gráfico; contas e marcas da PJ reservadas');

    ok(p.erros.length === 0, 'sem erros na página: ' + p.erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)'); process.exit(falhas ? 1 : 0);
})();
