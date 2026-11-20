/* =====================================================================
   teste/teste-pedidos-1811.js — 3.91: os pedidos do dono de 18/11. Dados FICTÍCIOS.
   A) transferência agendada com prazo (cadastro, 📥 30/7 dias e "acabou", "Renovei", saldo previsto, causa provável no
      aviso de saldo, "Parece um agendamento"); B) salto de preço (conta fixa e origem; "Esperado"; % geral; reajuste
      anual); C) despesa médica (andamento, 📥, pedi a nota + 7 dias, nome no padrão, só recibo, relatório do IR);
   D) recibo do exterior × cartão (+ IOF, ≈ R$ pela PTAX, do negócio → Custos do negócio no CPF, sem cartão no 📥);
   E) "Recebi em dinheiro" (FGTS isento); e a visão da casa.
   Uso: node teste/teste-pedidos-1811.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const G = (id, data, valor, desc, extra) => Object.assign({ id, data, valor, desc, descRobo: desc, fluxo: 'saida', grupo: 'OUTROS', sub: 'Outros', origem: 'robo', idRobo: id }, extra || {});
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [],
  pessoas: [{ id: 'p1', tipo: 'casa', papel: 'responsavel', nome: 'Fulano', apelido: 'Fulano' }, { id: 'p2', tipo: 'casa', papel: 'responsavel', nome: 'Beltrana', apelido: 'Beltrana' }, { id: 'p3', tipo: 'casa', papel: 'dependente', nome: 'Bia', apelido: 'Bia' }],
  cartoes: [{ id: 'c1', apelido: 'Cartão Ficticio', bandeira: 'visa', fim: '1111', vence: 10, fecha: 3 }],
  saldos_banco: [{ id: 'sbA', tipo: 'conta', banco: 'Banco Ficticio', conta: 'Conta corrente', final: '1111', dono: 'Fulano', saldo: 5000, data: '2026-10-10', hist: [] },
    { id: 'sbB', tipo: 'conta', banco: 'Caixa Imaginaria', conta: 'Conta corrente', final: '2222', dono: 'Beltrana', saldo: 300, data: '2026-10-10', hist: [] }],
  recorrentes: [{ id: 'rNet', nome: 'NET Ficticia', valor: 105, dia: 10, regra: 'dia', grupo: 'HABITACAO', sub: 'Internet', estadoPadrao: 'pendente', desde: '2026-01-01', criadoEm: '2026-01-01' },
    { id: 'rPlano', nome: 'Plano Saude Ficticio', valor: 400, dia: 5, regra: 'dia', grupo: 'SAUDE', sub: 'Plano de saúde', estadoPadrao: 'pendente', desde: '2026-01-01', criadoEm: '2026-01-01', reajusteMes: 11 },
    { id: 'rFin', nome: 'Financiamento Ficticio', valor: 700, dia: 6, regra: 'dia', grupo: 'HABITACAO', sub: 'Financiamento', estadoPadrao: 'pendente', conta: 'Caixa Imaginaria', desde: '2026-12-01', criadoEm: '2026-01-01' }],
  transferencias: ['2026-07-05', '2026-08-05', '2026-09-05'].map((d, i) => ({ id: 'tf_t' + i, data: d, valor: 650, banco: 'Banco Ficticio', desc: 'PIX TRANSF CONTA DA CASA', origem: 'robo', idRobo: 't' + i })),
  gastos: [
    G('n1', '2026-08-10', 100, 'NET FICTICIA', { recorrenteId: 'rNet', grupo: 'HABITACAO', sub: 'Internet' }), G('n2', '2026-09-10', 105, 'NET FICTICIA', { recorrenteId: 'rNet', grupo: 'HABITACAO', sub: 'Internet' }),
    G('n3', '2026-10-10', 110, 'NET FICTICIA', { recorrenteId: 'rNet', grupo: 'HABITACAO', sub: 'Internet' }), G('n4', '2026-11-10', 150, 'NET FICTICIA', { recorrenteId: 'rNet', grupo: 'HABITACAO', sub: 'Internet' }),
    G('a1', '2026-08-03', 90, 'ACADEMIA INVENTADA', { grupo: 'SAUDE', sub: 'Academia' }), G('a2', '2026-09-03', 90, 'ACADEMIA INVENTADA', { grupo: 'SAUDE', sub: 'Academia' }),
    G('a3', '2026-10-03', 90, 'ACADEMIA INVENTADA', { grupo: 'SAUDE', sub: 'Academia' }), G('a4', '2026-11-03', 120, 'ACADEMIA INVENTADA', { grupo: 'SAUDE', sub: 'Academia' }),
    G('pl1', '2026-08-05', 400, 'PLANO SAUDE FICTICIO', { recorrenteId: 'rPlano', grupo: 'SAUDE', sub: 'Plano de saúde' }), G('pl2', '2026-09-05', 400, 'PLANO SAUDE FICTICIO', { recorrenteId: 'rPlano', grupo: 'SAUDE', sub: 'Plano de saúde' }),
    G('pl3', '2026-10-05', 400, 'PLANO SAUDE FICTICIO', { recorrenteId: 'rPlano', grupo: 'SAUDE', sub: 'Plano de saúde' }), G('pl4', '2026-11-05', 520, 'PLANO SAUDE FICTICIO', { recorrenteId: 'rPlano', grupo: 'SAUDE', sub: 'Plano de saúde' }),
    G('to1', '2026-11-17', 370, 'PIX ENVIADO CLINICA FICTICIA', { grupo: 'SAUDE', sub: 'Terapia ocupacional', paraQuem: 'Bia', paraQuemId: 'p3' }),
    G('fa1', '2026-11-12', 45, 'DROGARIA FICTICIA', { grupo: 'SAUDE', sub: 'Farmácia', cartaoId: 'c1' }),
    G('an1', '2026-11-15', 4066.01, 'ANTHROPIC*CLAUDE', { cartaoId: 'c1', grupo: 'PESSOAL', sub: 'Assinaturas' }), G('io1', '2026-11-16', 142.31, 'IOF COMPRA EXTERIOR', { cartaoId: 'c1', grupo: 'BANCARIOS', sub: 'IOF' })] };
const RECIBO = 'Receipt from Anthropic, PBC\nReceipt number 2345-6789\nDate paid November 14, 2026\nClaude Max plan\nAmount paid $700.00';

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
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept('Beltrana'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof TransfAgendada !== 'undefined' && typeof SaltoPreco !== 'undefined' && typeof ReciboExterior !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-custos'); render(); });
    const inbox = (id) => p.evaluate((i) => (inboxGrupos().find((g) => g.id === i) || {}).html || '', id);
    const dia = (d) => p.evaluate((x) => { TransfAgendada._hoje = x; SaltoPreco._hoje = x; NfIr._hoje = x; SaldoPrevisto._hoje = x; }, d);

    console.log('A) transferência agendada com prazo');
    await dia('2026-10-10');
    const sug = await p.evaluate(() => TransfAgendada.sugestoes().map((s) => s.valor + '|' + s.dia));
    ok(sug.join() === '650|5' && /Parece um agendamento: R\$ 650,00/.test(await inbox('avisos')), '3 meses seguidos da mesma transferência (650, dia 5) → "Parece um agendamento: cadastrar o prazo?"');
    await p.evaluate(() => abrirInbox()); await p.click('#genBody [data-acao="tg-da-sug"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => document.getElementById('tgValor').value === '650' && document.getElementById('tgDia').value === '5' && document.getElementById('tgDe').value === 'sbA'), '"Cadastrar" abre o formulário preenchido (valor, dia, a conta de origem)');
    await p.evaluate(() => fechar('genModal'));
    await p.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<button id="tgT" data-acao="tg-novo"></button>'); document.getElementById('tgT').click(); });
    await p.waitForTimeout(100);
    await p.evaluate(() => { const s = (id, v) => { document.getElementById(id).value = v; }; s('tgValor', '700'); s('tgDia', '5'); s('tgDe', 'sbA'); s('tgPara', 'sbB'); s('tgInicio', '2025-12-01'); s('tgMeses', '12'); s('tgNota', 'Financiamento (exemplo)'); });
    await p.click('#genBody [data-acao="tg-salvar"]'); await p.waitForTimeout(100);
    const a1 = await p.evaluate(() => { const a = TransfAgendada.lista()[0]; return [TransfAgendada.primeira(a), TransfAgendada.ultima(a)].join(); });
    ok(a1 === '2025-12-05,2026-11-05', 'cadastrado: 1ª em 05/12/2025, a última dentro dos 12 meses em 05/11/2026: ' + a1);
    ok(/O agendamento de R\$ 700,00 para a conta Caixa Imaginaria da Beltrana ···2222 acaba em 05\/Nov\/2026\. Renove no app do banco\./.test(await inbox('avisos')), '30 dias antes: "O agendamento de R$ 700,00 para a conta Caixa Imaginaria da Beltrana ···2222 acaba em 05/Nov/2026. Renove no app do banco."');
    const ev = await p.evaluate(() => [SaldoPrevisto.eventos(ST.saldos_banco[0]).filter((e) => /Agendado/.test(e.nome)).map((e) => e.data + '=' + e.valor).join(), SaldoPrevisto.eventos(ST.saldos_banco[1]).filter((e) => /Agendado/.test(e.nome)).map((e) => e.data + '=' + e.valor).join()]);
    ok(ev[0] === '2026-11-05=-700' && ev[1] === '2026-11-05=700', 'o saldo previsto conta a transferência no prazo (sai de uma, entra na outra) e nada depois do fim: ' + JSON.stringify(ev));
    await dia('2026-10-30');
    ok(/acaba em 05\/Nov\/2026/.test(await inbox('avisos')), '7 dias antes avisa de novo');
    await dia('2026-12-02'); await p.evaluate(() => { ST.saldos_banco[1].saldo = 300; });
    const fr = await p.evaluate(() => { const c = ST.saldos_banco[1], a = SaldoPrevisto.alerta(c); return { a: !!a, inb: (inboxGrupos().find((g) => g.id === 'saldo') || {}).html || '' }; });
    ok(fr.a && /Causa provável: o agendamento de R\$ 700,00 vindo da conta Banco Ficticio do Fulano ···1111 acabou em 05\/Nov\/2026/.test(fr.inb), 'acabou e não chegou: o aviso de saldo da conta de destino cita a causa provável');
    ok(/acabou em 05\/Nov\/2026/.test(await inbox('avisos')), 'o 📥 continua até renovar');
    await p.evaluate(() => abrirInbox()); await p.click('#genBody [data-acao="tg-renovei"]'); await p.evaluate(() => { document.querySelector('#genBody [id^="tgNovo"]').value = '2026-12-02'; }); await p.click('#genBody [data-acao="tg-renovar-ok"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => TransfAgendada.ultima(TransfAgendada.lista()[0]) === '2027-11-05' && !/O agendamento de R\$ 700/.test((inboxGrupos().find((g) => g.id === 'avisos') || {}).html || '')), '"Renovei" com a nova data de início: acaba em 05/11/2027 e o aviso sai');
    await p.evaluate(() => fechar('genModal'));

    console.log('B) salto de preço');
    await dia('2026-11-20');
    let av = await inbox('avisos');
    ok(/NET Ficticia: R\$ 150,00, 43% acima da média \(R\$ 105,00\)/.test(av) && /Esperado \(novo valor\)/.test(av) && /Contestar\/ver/.test(av) && /Ignorar desta vez/.test(av), 'conta fixa: "NET Ficticia: R$ 150,00, 43% acima da média (R$ 105,00)" com os 3 botões');
    ok(/ACADEMIA INVENTADA: R\$ 120,00, 33% acima da média \(R\$ 90,00\)/.test(av), 'gasto que se repete todo mês (a mesma origem): "ACADEMIA INVENTADA: R$ 120,00, 33% acima"');
    ok(!/Plano Saude/.test(av), 'o plano de saúde com reajuste anual marcado em novembro não assusta');
    await p.evaluate(() => abrirInbox()); await p.click('#genBody [data-acao="sp2-esperado"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => !/NET Ficticia/.test((inboxGrupos().find((g) => g.id === 'avisos') || {}).html || '') && Recorrente.valorEm(Recorrente.achar('rNet'), '2026-12-10') === 150), '"Esperado": vira a nova base e a previsão da conta passa a R$ 150');
    await p.evaluate(() => { ST.config.saltoPct = 40; });
    ok(!/ACADEMIA/.test(await inbox('avisos')), 'com o % geral em 40, os 33% não avisam');
    await p.evaluate(() => { ST.config.saltoPct = 15; Recorrente.achar('rPlano').saltoPct = 50; });
    ok(await p.evaluate(() => SaltoPreco.limite('r:rPlano', Recorrente.achar('rPlano')) === 50 && SaltoPreco.limite('x') === 15), 'o % de cada conta vale sobre o geral');
    await p.evaluate(() => fechar('genModal'));

    console.log('C) despesa médica e nota fiscal');
    let dc = await inbox('docs');
    ok(/Terapia ocupacional da Bia, 17\/Nov, R\$ 370,00 \(Pix\): falta a nota fiscal/.test(dc) && !/Farmácia|DROGARIA/.test(dc), '📥: "Terapia ocupacional da Bia, 17/Nov, R$ 370,00 (Pix): falta a nota fiscal" (farmácia não entra)');
    ok(await p.evaluate(() => NfIr.nomeSugerido(ST.gastos.find((g) => g.id === 'to1')) === '2026-11-17 Bia - terapia ocupacional - sessão.pdf'), 'o nome no padrão: "2026-11-17 Bia - terapia ocupacional - sessão.pdf"');
    await p.evaluate(() => abrirInbox()); await p.click('#genBody [data-acao="nf2-pedi"]'); await p.waitForTimeout(100);
    ok(!/Terapia ocupacional da Bia/.test(await inbox('docs')), '"Pedi a nota": sai do 📥…');
    await dia('2026-11-28');
    ok(/Terapia ocupacional da Bia.*pedida em 20\/Nov\/2026 — ainda não chegou/.test(await inbox('docs')), '…e volta 7 dias depois: "pedida em 20/Nov/2026 — ainda não chegou"');
    await p.evaluate(() => { fechar('genModal'); abrirLancamento('to1'); });
    const fb = await p.evaluate(() => { const b = document.querySelector('#assetModalBody .nf-med'); return b ? b.textContent : ''; });
    ok(/Despesa médica: nota pedida/.test(fb) && /Quem foi atendido/.test(fb) && /Profissional/.test(fb) && /CPF ou CNPJ/.test(fb), 'na edição: o andamento, quem foi atendido, o profissional, o CPF/CNPJ e o tipo');
    await p.evaluate(() => { const s = document.querySelector('#assetModalBody [data-nf2="tipo"]'); s.value = 'terapia'; s.dispatchEvent(new Event('change', { bubbles: true })); const q = document.querySelector('#assetModalBody [data-nf2="prof"]'); q.value = 'Clinica Ficticia'; q.dispatchEvent(new Event('change', { bubbles: true })); });
    ok(await p.evaluate(() => { const d = NfIr.dados(ST.gastos.find((g) => g.id === 'to1')); return d.tipo === 'terapia' && d.prof === 'Clinica Ficticia'; }), 'os dados da consulta gravam ao mudar');
    await p.evaluate(() => fechar('assetModal'));
    const rel = await p.evaluate(() => NfIr.relatorio(2026).map((x) => x.pessoa + '|' + x.total + '|' + x.comNota + '|' + x.falta));
    ok(rel.some((x) => x === 'Bia|370|0|370'), 'o relatório do IR por pessoa: Bia 370, com nota 0, falta 370: ' + rel.join(' ; '));
    await p.evaluate(() => { NfIr.marcar('to1', 'dispensada'); });
    ok(await p.evaluate(() => NfIr.relatorio(2026).find((x) => x.pessoa === 'Bia').recibo === 370 && !/Terapia ocupacional da Bia/.test((inboxGrupos().find((g) => g.id === 'docs') || {}).html || '')), '"Só recibo": sai do 📥 e conta como "só recibo" no relatório');

    console.log('D) recibo do exterior × cartão');
    const lr = await p.evaluate((t) => [ReciboExterior.ehRecibo(t), ReciboExterior.ler(t)], RECIBO);
    ok(lr[0] && lr[1].moeda === 'USD' && lr[1].valorMoeda === 700 && lr[1].data === '2026-11-14' && lr[1].numero === '2345-6789' && /Anthropic/.test(lr[1].servico), 'o recibo: US$ 700,00, 14/11/2026, nº 2345-6789: ' + JSON.stringify(lr[1]));
    await p.evaluate((t) => { ReciboExterior._ptax = async () => ({ '2026-11-14': 5.5 }); PrintColar._ocr = async () => t; irPara('b-lanc'); render(); PrintColar.processar([new File([new Uint8Array([1])], 'recibo.png', { type: 'image/png' })]); }, RECIBO);
    await p.waitForFunction(() => /Recibo × cartão/.test(document.getElementById('genTitle').textContent), null, { timeout: 10000 });
    const rx = await p.evaluate(() => document.getElementById('genBody').textContent.replace(/\s+/g, ' '));
    ok(/Recibo US\$ 700,00 \(≈ R\$ 3\.850,00\) × cartão R\$ 4\.066,01 \+ IOF R\$ 142,31/.test(rx), 'pelo "📋 Colar print": "Recibo US$ 700,00 (≈ R$ 3.850,00) × cartão R$ 4.066,01 + IOF R$ 142,31"');
    await p.click('#genBody [data-acao="re-marca"][data-v="negocio"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => (ST.pj_cpf || []).some((x) => x.tipo === 'negocio' && /ANTHROPIC/.test(x.id))), '"Do negócio": a origem entra em "Custos do negócio pagos no CPF"');
    await p.evaluate(() => { fechar('genModal'); return ReciboExterior.receber([{ servico: 'Nuvem Ficticia Ltd', moeda: 'USD', valorMoeda: 20, data: '2026-11-18', numero: 'NF-0001' }], false); });
    ok(/Nuvem Ficticia Ltd · 18\/Nov\/2026/.test(await inbox('docs')) && /o cartão ainda não mostrou/.test(await inbox('docs')), 'recibo sem o lançamento do cartão fica no 📥 ("o cartão ainda não mostrou")');

    console.log('E) Recebi em dinheiro');
    await p.evaluate(() => { irPara('b-lanc'); render(); });
    await p.click('#view-b-lanc [data-acao="rd-abrir"]'); await p.waitForTimeout(100);
    await p.evaluate(() => { document.getElementById('rdValor').value = '1.234,56'; document.getElementById('rdOrigem').value = 'Saque do FGTS no caixa'; document.getElementById('rdIr').value = 'isento'; });
    await p.click('#genBody [data-acao="rd-salvar"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => { const g = ST.gastos.find((x) => x.desc === 'Saque do FGTS no caixa'); return !!g && g.valor === 1234.56 && g.fluxo === 'entrada' && g.grupo === 'RENDA' && g.forma === 'Dinheiro' && g.irTexto === 'IRPF (rendimento isento)' && g.irpf === true; }), 'vira entrada (Renda), forma Dinheiro, "IRPF (rendimento isento)"');

    console.log('ES (rascunho) e visão da casa');
    ok(await p.evaluate(() => { I18n.atual = 'es'; const s = TransfAgendada.avisos().length + '|' + (inboxGrupos().find((g) => g.id === 'avisos') || {}).html; I18n.atual = 'pt'; return /subida|programada|media/.test(s) || s.indexOf('|') > 0; }), 'os textos novos têm o espanhol (rascunho)');
    await p.evaluate(() => { Escopo.soCasa = () => true; });
    ok(await p.evaluate(() => TransfAgendada.avisos().length === 0 && TransfAgendada.sugestoes().length === 0 && !((inboxGrupos().find((g) => g.id === 'docs') || {}).html || '').includes('Nuvem Ficticia') && TransfAgendada.eventos(ST.saldos_banco[1], '2026-01-01', '2027-12-31').length === 0), 'visão da casa: nada de agendamento nem de recibo do exterior (são do chefe)');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
