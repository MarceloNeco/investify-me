/* =====================================================================
   teste/teste-pj.js — 3.81: a PJ no FiscalONE, por empresa (modulos/pj.js). Dados FICTÍCIOS.
   Confere: empresa sugerida pela declaração (a fonte pagadora com o nome do titular); a conta do robô ligada à empresa;
   o painel do mês (faturamento, conversão, DAS, DARF, contador, TFE, tarifas, pró-labore, lucros, saldos); Fator R
   abaixo e acima de 28%; o calendário fiscal (DAS/DARF dia 20, contador dia 10, TFE em julho) como contas fixas da PJ
   reservadas, um dia antes no saldo previsto ("Transferir para a PJ") e "Transfira R$ X para a PJ até DD/MM" no 📥;
   DEFIS em março; visão da casa sem nada de PJ.
   Uso: node teste/teste-pj.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const PJ = (id, data, valor, sub, conta, extra) => Object.assign({ id, data, valor, grupo: 'BANCARIOS', sub, desc: sub.toUpperCase(), fluxo: 'saida', conta, irTexto: 'PJ', origem: 'robo' }, extra || {});
const TF = (id, data, valor, sub, banco, desc, ir) => ({ id: 'tf_' + id, data, valor, banco, desc, forma: 'Debito', origem: 'robo', idRobo: id, sub, irTexto: ir || 'PJ' });
const gastos = [], transferencias = [];
/* 12 meses no formato do robô: faturamento US$ (receita, RENDA, "Faturamento PJ (<cliente>)") 20.000/mês;
   pró-labore 3.000 (transferência) + DARF 600 (= 18%: Anexo V); DAS 1.200 ("DAS-SIMPLES", categoria "IRPF / DARF") */
for (let k = 0; k < 12; k++) {
  const m = new Date(Date.UTC(2025, 11 + k, 1)).toISOString().slice(0, 7);
  gastos.push(PJ('fat' + k, m + '-05', 20000, 'Faturamento PJ (Cliente Exemplo)', 'BS2 Internacional', { fluxo: 'entrada', grupo: 'RENDA', desc: 'WIRE CLIENTE EXEMPLO (US$ 4,000.00)' }));
  transferencias.push(TF('bs2-pl' + k, m + '-06', 3000, 'Pró-labore PJ → PF', 'BS2 PJ', 'Débito PIX - FULANO EXEMPLO', 'IRPF (pró-labore tributável: bruto 3.600, IRRF 0)'));
  gastos.push(PJ('df' + k, m + '-20', 600, 'IRPF / DARF', 'BS2 PJ', { desc: 'RECEITA FED-DARF' }));
  gastos.push(PJ('das' + k, m + '-20', 1200, 'IRPF / DARF', 'BS2 PJ', { desc: 'DAS-SIMPLES' }));
}
transferencias.push(TF('bs2-cv1', '2026-11-07', 19000, 'Conversão US$ → R$ (chegada na PJ)', 'BS2 PJ', 'RECEBIM DA CONTA-INTERN'));
transferencias.push(TF('bs2usd-cv1-d', '2026-11-07', 19200, 'Conversão US$ → R$ (saída da conta internacional)', 'BS2 Internacional', 'CONVERSION (US$ 3,840.00)'));
gastos.push(PJ('ct1', '2026-11-10', 400, 'Mensalidades / Anuidades', 'BS2 PJ', { desc: 'Pagamento boleto - CONTABILIDADE MODELO' }));
gastos.push(PJ('tf1', '2026-11-11', 35, 'Outros (Bancarios)', 'BS2 PJ', { desc: 'TARIFA PACOTE' }));
transferencias.push(TF('bs2-lu1', '2026-11-12', 5000, 'Distribuição de lucros PJ → PF', 'BS2 PJ', 'Débito PIX - FULANO EXEMPLO [lucros]', 'IRPF (lucro isento, cód. 13)'));
gastos.push(PJ('old1', '2026-07-15', 300, 'Outros (Bancarios)', 'BS2 PJ antiga', { desc: 'PREF MUN SAO PAULO' }));
gastos.push({ id: 'pf1', data: '2026-11-03', valor: 80, grupo: 'HABITACAO', sub: 'Internet', desc: 'INTERNET EXEMPLO', fluxo: 'saida', conta: 'Banco Exemplo' });
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [], gastos, transferencias,
  tax: { declaracoes: [{ id: 'd1', exercicio: 2026, titular: 'Fulano', fontes: [{ nome: 'FULANO EXEMPLO CONSULTORIA LTDA', cnpj: '11.222.333/0001-81', rendimentos: 36000 }, { nome: 'EMPREGADORA MODELO SA', cnpj: '22.333.444/0001-05', rendimentos: 1000 }] }], processos: [] },
  saldos_banco: [{ id: 'sbpf', tipo: 'conta', banco: 'Banco Exemplo', conta: 'Conta corrente', saldo: 10000, data: '2026-11-13', hist: [] },
    { id: 'sbpj', tipo: 'conta', banco: 'BS2', conta: 'BS2 PJ', saldo: 7000, data: '2026-11-13', hist: [] }] };

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
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof PJ !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); PJ._hoje = '2026-11-13'; });

    console.log('1) empresa sugerida pela declaração');
    const s1 = await p.evaluate(() => PJ.sugestoes().map((s) => s.nome + '|' + s.cnpj));
    ok(s1.length === 1 && s1[0] === 'FULANO EXEMPLO CONSULTORIA LTDA|11222333000181', 'só a fonte com o nome do titular (Fulano): ' + JSON.stringify(s1));
    ok(/Cadastrar esta empresa\? FULANO EXEMPLO CONSULTORIA LTDA · 11\.222\.333\/0001-81/.test(await p.evaluate(() => (inboxGrupos().find((g) => g.id === 'pj') || {}).html || '')), '📥: "Cadastrar esta empresa? FULANO EXEMPLO CONSULTORIA LTDA · 11.222.333/0001-81"');
    await p.evaluate(() => abrirInbox()); await p.click('#genBody [data-acao="pj-cadastrar"]');
    const e1 = await p.evaluate(() => (ST.empresas || []).map((e) => e.razao + '|' + e.cnpj));
    ok(e1.length === 1 && e1[0] === 'FULANO EXEMPLO CONSULTORIA LTDA|11222333000181' && (await p.evaluate(() => PJ.sugestoes().length)) === 0, '"Cadastrar" cria no Cofre da empresa e a sugestão some');

    console.log('2) de qual empresa é cada conta');
    const c2 = await p.evaluate(() => PJ.contasSemEmpresa().map((x) => x.conta).sort());
    ok(c2.join() === 'BS2 Internacional,BS2 PJ,BS2 PJ antiga', 'contas com lançamento PJ sem empresa: ' + c2.join());
    await p.evaluate(() => { ST.empresas.push({ id: 'emold', cnpj: '33444555000191', razao: 'FULANO ANTIGA ME', regime: 'simples', contasRobo: [], docs: [] }); ST.empresas[0].regime = 'fator-r'; ST.empresas[0].contador = { nome: 'Contabilidade Modelo' }; render(); fechar('genModal'); abrirInbox(); });
    for (const conta of ['BS2 PJ', 'BS2 Internacional']) await p.click('#genBody [data-acao="pj-conta"][data-conta="' + conta + '"][data-id="' + (await p.evaluate(() => ST.empresas[0].id)) + '"]');
    await p.click('#genBody [data-acao="pj-conta"][data-conta="BS2 PJ antiga"][data-id="emold"]');
    ok(await p.evaluate(() => ST.empresas[0].contasRobo.sort().join() === 'BS2 Internacional,BS2 PJ' && ST.empresas[1].contasRobo.join() === 'BS2 PJ antiga' && PJ.contasSemEmpresa().length === 0), 'a pessoa escolhe: BS2 PJ e BS2 Internacional → atual; BS2 PJ antiga → antiga');

    console.log('3) o painel do mês');
    const r3 = await p.evaluate(() => PJ.resumo(ST.empresas[0], '2026-11'));
    ok(r3.faturamento === 20000 && r3.conversao === 19000 && r3.das === 1200 && r3.darf === 600 && r3.impostos === 1800 && r3.contador === 400 && r3.tarifas === 35 && r3.prolabore === 3000 && r3.lucros === 5000, 'nov/2026: faturamento 20.000, conversão 19.000, DAS 1.200, DARF 600, contador 400, tarifas 35, pró-labore 3.000, lucros 5.000 ' + JSON.stringify(r3));
    ok(await p.evaluate(() => PJ.resumo(ST.empresas[1], '2026-07').tfe === 300 && PJ.resumo(ST.empresas[1], '2026-11').n === 0), 'a antiga: só a TFE de julho');
    await p.evaluate(() => { abrirApp('tax'); irPara('t-pj'); render(); });
    const t3 = await p.evaluate(() => document.querySelector('.view:not(.hidden)').innerText);
    ok(/FULANO EXEMPLO CONSULTORIA LTDA/.test(t3) && /FULANO ANTIGA ME/.test(t3) && /Faturamento[^\n]*\n?[^\n]*R\$\s?20\.000,00/.test(t3) && /BS2 · BS2 PJ[\s\S]*R\$\s?7\.000,00/.test(t3), 'tela PJ: uma aba por empresa, o faturamento e o saldo da conta da PJ');

    console.log('4) Fator R');
    const f4 = await p.evaluate(() => PJ.fatorR(ST.empresas[0], '2026-11'));
    ok(f4.fator === 18 && f4.anexo === 'V' && f4.folha === 43200 && f4.faturamento === 240000, '12 meses: (3.000 + 600) × 12 ÷ 240.000 = 18%: Anexo V ' + JSON.stringify(f4));
    ok(/Abaixo de 28%: Anexo V/.test(t3), 'o alerta "Abaixo de 28%: Anexo V"');
    const f4b = await p.evaluate(() => { Transferencia.todas().filter((g) => /bs2-pl/.test(g.id)).forEach((g) => { g.valor = 6500; }); return PJ.fatorR(ST.empresas[0], '2026-11'); });
    ok(f4b.fator === 35.5 && f4b.anexo === 'III', 'com pró-labore de 6.500: 35,5% → Anexo III');

    console.log('5) calendário fiscal');
    const c5 = await p.evaluate(() => { const e = ST.empresas[0]; const n = PJ.criarCalendario(e); const n2 = PJ.criarCalendario(e);
      return { n, n2, l: Recorrente.todos().filter((r) => r.empresaId === e.id).map((r) => [r.sub, r.regra, r.dia, r.mes, r.escopo, r.valor].join('|')).sort() }; });
    ok(c5.n === 4 && c5.n2 === 0, '4 contas fixas da PJ criadas; de novo, nenhuma repetida');
    ok(c5.l.join(' ; ') === ['Contador (PJ)|dia|10|0|reservado|400', 'DARF (PJ)|dia|20|0|reservado|600', 'DAS Simples Nacional (PJ)|dia|20|0|reservado|1200', 'TFE Prefeitura SP (PJ)|anual|10|7|reservado|1'].join(' ; '), 'DAS e DARF dia 20, contador dia 10, TFE em julho, todas reservadas, com a média como valor: ' + c5.l.join(' ; '));
    ok(await p.evaluate(() => Recorrente.todos().filter((r) => r.empresaId).every((r) => Escopo.de('recorrentes', r) === 'reservado')), 'visão da casa: as contas da PJ são reservadas');
    const c5b = await p.evaluate(() => { PJ._hoje = '2026-11-16'; return PJ.transferir().map((x) => x.r.sub + '|' + x.ate + '|' + x.valor); });
    ok(c5b.length === 2 && c5b.every((x) => /\|2026-11-19\|/.test(x)), 'em 16/11: DAS e DARF de 20/11 (feriado; com o fim de semana, vencem em 23/11) → transferir até 19/11, o dia útil anterior: ' + c5b.join());
    ok(/Transfira R\$\s?1\.200,00 para a PJ até 19\/Nov\/2026/.test(await p.evaluate(() => (inboxGrupos().find((g) => g.id === 'pj') || {}).html || '')), '📥: "Transfira R$ 1.200,00 para a PJ até 19/Nov/2026"');
    const c5c = await p.evaluate(() => { SaldoPrevisto._hoje = '2026-11-16'; const cs = SaldoPrevisto.contas(); const ev = SaldoPrevisto.eventos(cs[0]); return { n: cs.map((c) => c.id), ev: ev.filter((e) => /PJ/.test(e.nome)).map((e) => e.data + '|' + e.valor) }; });
    ok(c5c.n.join() === 'sbpf' && c5c.ev.indexOf('2026-11-19|-1200') >= 0 && c5c.ev.indexOf('2026-11-19|-600') >= 0, 'saldo previsto: só a conta da PF; DAS e DARF saem em 19/11 como "Transferir para a PJ" ' + JSON.stringify(c5c));
    ok(await p.evaluate(() => { PJ._hoje = '2027-03-05'; return PJ.avisosAnuais().some((a) => /DEFIS de FULANO EXEMPLO CONSULTORIA LTDA/.test(a.txt)); }), 'em março: "DEFIS de … entregar até 31/03"');

    console.log('6) visão da casa');
    const v6 = await p.evaluate(() => { const o = Escopo.soCasa; Escopo.soCasa = () => true; PJ._hoje = '2026-11-16'; const r = { s: PJ.sugestoes().length, c: PJ.contasSemEmpresa().length, t: PJ.transferir().length };
      r.txt = MoneyModulos.infoTela('t-pj').render(); r.apps = appsVisiveis().join(); Escopo.soCasa = o; return r; });
    ok(v6.s === 0 && v6.c === 0 && v6.t === 0 && v6.apps.indexOf('tax') < 0 && /Só o responsável vê a PJ/.test(v6.txt) && !/FULANO/.test(v6.txt), 'nada de PJ: nem sugestão, nem conta, nem transferência; a tela diz "Só o responsável vê a PJ" ' + JSON.stringify(v6).slice(0, 300));
    ok(await p.evaluate(() => Escopo.de('gastos', Gasto.todos().find((g) => g.id === 'das0')) === 'reservado' && Escopo.de('empresas', ST.empresas[0]) === 'reservado'), 'lançamentos da PJ e empresas: reservados');

    ok(p.erros.length === 0, 'sem erros na página: ' + p.erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)'); process.exit(falhas ? 1 : 0);
})();
