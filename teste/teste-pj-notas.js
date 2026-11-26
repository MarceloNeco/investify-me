/* =====================================================================
   teste/teste-pj-notas.js — 3.130 (item M): FiscalONE › PJ, as notas emitidas e o DAS do mês (modulos/pj-notas.js). Dados FICTÍCIOS.
   Confere: só as notas com o CNPJ da empresa; a nota em US$ ligada ao crédito pelo valor na moeda (receita em reais = o crédito);
   a nota sem os campos novos do robô aparece sem quebrar; o DAS pela competência (padrão) e pelo caixa (Configurações da PJ:
   "Base do DAS" no Cofre da empresa), com o vencimento no dia 20 do mês seguinte e o "pago"; a previsão do DAS do pj.js usa a
   mesma base; exportação (sem PIS/COFINS; ISS a confirmar) e a linha do IBS/CBS; o lembrete de 2027 no 📥 com a pergunta aberta.
   Uso: node teste/teste-pj-notas.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const CNPJ = '11222333000181';
const gastos = [];
['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'].forEach((m, i) => {
  gastos.push({ id: 'fat' + i, data: m + '-05', valor: 20000, grupo: 'RENDA', sub: 'Faturamento PJ (Cliente Exemplo)', desc: 'WIRE CLIENTE EXEMPLO', fluxo: 'entrada', conta: 'BS2 Internacional', irTexto: 'PJ', origem: 'robo', moeda: 'USD', valorMoeda: 4000 });
  if (m < '2026-11') gastos.push({ id: 'das' + i, data: m + '-20', valor: 1200, grupo: 'BANCARIOS', sub: 'IRPF / DARF', desc: 'DAS-SIMPLES', fluxo: 'saida', conta: 'BS2 PJ', irTexto: 'PJ', origem: 'robo' });
});
const NF = (id, data, valor, cnpj, ficha, extra) => Object.assign({ id, subtipo: 'nota_fiscal', data, valor, cnpj, estado: 'aberto', ficha }, extra || {});
const COMP = [
  NF('n1', '2026-10-28', 4000, CNPJ, { moeda: 'USD', valor_moeda: 4000, tomador_exterior: 'Estados Unidos', competencia: '2026-10', codigo_servico: '01.07', servico: 'Consultoria em software' }, { numero: '101' }),
  NF('n2', '2026-10-30', 3000, CNPJ, { servico: 'Suporte' }, { numero: '102' }),
  NF('n3', '2026-10-15', 1000, CNPJ, null),                                       /* a nota como o robô manda hoje: sem os campos novos */
  NF('n9', '2026-10-10', 250, '99888777000166', { irpf_candidata: 'saude' })       /* nota de outro CNPJ (despesa médica): fica de fora */
];

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify({ v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [], gastos }));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.PJ && window.PJNotas);
    await p.evaluate(([cnpj, comp]) => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); PJ._hoje = PJNotas._hoje = '2026-11-13';
      ST.empresas = [{ id: 'e1', cnpj, razao: 'EMPRESA EXEMPLO LTDA', regime: 'simples', contasRobo: ['BS2 PJ', 'BS2 Internacional'] }]; ST.comprovantes = comp; }, [CNPJ, COMP]);

    const ns = await p.evaluate(() => PJNotas.notas(ST.empresas[0]).map((n) => ({ id: n.x.id, comp: n.competencia, cr: n.credito && n.credito.id, reais: n.reais, ext: n.exterior })));
    ok(ns.map((n) => n.id).join() === 'n3,n1,n2', 'só as notas com o CNPJ da empresa (a da despesa médica de outro CNPJ fica de fora): ' + ns.map((n) => n.id).join());
    const n1 = ns.find((n) => n.id === 'n1');
    ok(n1.cr === 'fat7' && n1.reais === 20000 && n1.ext, 'a nota em US$ 4.000 liga ao crédito de US$ 4.000 de 05/11 e a receita em reais é a do crédito (R$ 20.000, o câmbio do dia)');
    ok(ns.find((n) => n.id === 'n3').reais === 1000 && ns.find((n) => n.id === 'n2').reais === 3000, 'as notas em R$ sem crédito: o valor da nota (a sem os campos novos do robô também)');

    let d = await p.evaluate(() => PJNotas.das(ST.empresas[0], '2026-10'));
    ok(d.fonte === 'competencia' && d.base === 24000 && Math.abs(d.valor - 1440) < 0.01 && d.vence === '2026-11-20', 'DAS da competência 10/2026 (padrão): base R$ 24.000 (as notas) × 6% = R$ 1.440, vence 20/11: ' + JSON.stringify(d));
    const prev = await p.evaluate(() => PJ.previsto({ empresaId: 'e1', condicional: 'receita' }, '2026-11-20'));
    ok(prev && Math.abs(prev.valor - 1440) < 0.01 && prev.baseDe === 'competencia', 'a previsão do DAS de novembro (conta fixa e "Transfira para a PJ") usa a mesma base: R$ 1.440');
    await p.evaluate(() => { ST.empresas[0].baseDas = 'caixa'; });
    d = await p.evaluate(() => PJNotas.das(ST.empresas[0], '2026-10'));
    ok(d.fonte === 'caixa' && d.base === 20000 && Math.abs(d.valor - 1200) < 0.01, 'com "Base do DAS: Caixa": a base é o que entrou em outubro (R$ 20.000) → R$ 1.200');
    await p.evaluate(() => { ST.empresas[0].baseDas = 'competencia'; Gasto.add({ id: 'dasnov', data: '2026-11-20', valor: 1440, grupo: 'BANCARIOS', sub: 'IRPF / DARF', desc: 'DAS-SIMPLES', fluxo: 'saida', conta: 'BS2 PJ', irTexto: 'PJ', origem: 'robo' }); });

    const h = await p.evaluate(() => { const d = document.createElement('div'); d.innerHTML = PJNotas.bloco({ e: ST.empresas[0], mes: '2026-10' }); return d.textContent.replace(/\s+/g, ' '); });
    ok(/Nota 101/.test(h) && /🌎 Estados Unidos/.test(h) && /código 01\.07/.test(h) && /USD 4000,00/.test(h) && /crédito de 05\/11 \(o câmbio do dia\)/.test(h), 'o cartão mostra a nota 101: tomador no exterior, código do serviço, US$ e o crédito de 05/11');
    ok(/Exportação: sem PIS\/COFINS; ISS: confirme com o contador\./.test(h) && /IBS\/CBS: 2026 é ano de teste/.test(h), 'exportação "sem PIS/COFINS; ISS: confirme com o contador" e a linha do IBS/CBS de 2026');
    ok(/DAS da competência 10\/2026: ≈ R\$\s?1\.440,00 · vence 20\/11\/2026 · ✅ pago R\$\s?1\.440,00/.test(h) && /pela competência \(as notas do mês\)/.test(h) && /confirme com o contador/.test(h), 'o DAS da competência com o vencimento e o "pago" que chegou do banco: ' + (h.match(/DAS da competência[^.]*/) || [''])[0]);

    await p.evaluate(() => { abrirApp('tax'); irPara('t-pj'); render(); });
    await p.waitForTimeout(150);
    ok(await p.evaluate(() => !!document.querySelector('.pjn')), 'o cartão "Notas e DAS do mês" aparece na tela PJ do FiscalONE');
    await p.evaluate(() => { const b = document.createElement('button'); b.dataset.acao = 'em-editar'; b.dataset.id = 'e1'; document.body.appendChild(b); b.click(); b.remove(); });
    await p.waitForTimeout(150);
    const sel = await p.evaluate(() => { const s = document.getElementById('emBaseDas'); return s ? s.value + '|' + s.options.length : ''; });
    ok(sel === 'competencia|2', 'Configurações da PJ (Cofre da empresa): "Base do DAS" com Competência (padrão) e Caixa: ' + sel);
    await p.evaluate(() => typeof fechar === 'function' && fechar('genModal'));

    ok(!(await p.evaluate(() => /2027 na PJ/.test((inboxGrupos().find((g) => g.id === 'pj') || {}).html || ''))), 'o lembrete de 2027 ainda não aparece em novembro de 2026');
    await p.evaluate(() => { PJNotas._hoje = '2026-12-02'; });
    const ib = await p.evaluate(() => (inboxGrupos().find((g) => g.id === 'pj') || {}).html || '');
    ok(/2027 na PJ EMPRESA EXEMPLO LTDA/.test(ib) && /por fora do DAS em 2027/.test(ib) && /Pergunta aberta: a Contabilizei avisou que, em 2027, (&quot;|")o DAS passa a ser calculado com base em um período diferente/.test(ib), 'a partir de 01/12/2026, o 📥 traz o lembrete de 2027 com a decisão do IBS/CBS e a pergunta aberta do DAS');
    await p.evaluate(() => { abrirInbox(); });
    await p.click('#genBody [data-acao="pjn-anotei"]'); await p.waitForTimeout(100);
    ok(!(await p.evaluate(() => /2027 na PJ/.test((inboxGrupos().find((g) => g.id === 'pj') || {}).html || ''))), '"Anotei" tira o lembrete');
    ok(await p.evaluate(() => { Comprovantes.ligarTudo(); return ST.comprovantes.find((x) => x.id === 'n1').estado === 'ok' && ST.comprovantes.find((x) => x.id === 'n9').estado !== 'ok'; }), 'no 📥 de comprovantes, a nota emitida pela PJ não pede nada (vai para FiscalONE › PJ); a de outro CNPJ continua');
    await p.evaluate(() => { I18n.atual = 'en'; });
    ok(/Export: no PIS\/COFINS/.test(await p.evaluate(() => PJNotas.bloco({ e: ST.empresas[0], mes: '2026-10' }))), 'em inglês: "Export: no PIS/COFINS"');
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
    await ctx.close();
  } finally { await b.close(); srv.close(); }
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
