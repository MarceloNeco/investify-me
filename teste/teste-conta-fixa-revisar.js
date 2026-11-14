/* =====================================================================
   teste/teste-conta-fixa-revisar.js — 3.86: "Parece conta fixa" com "Revisar" e "Não acompanhar". Dados FICTÍCIOS.
   Confere: mercado (pela categoria) e restaurante (pelo MCC) não viram sugestão; a janela "Revisar" (tipo, campos
   preenchidos, prévia, Salvar, Desfazer por 10 s); o DAS abre como "Imposto ou custo da empresa" da empresa certa;
   previsão CONDICIONAL (sem receita no mês anterior → nada; com receita → receita × alíquota efetiva); próximo dia
   útil (fim de semana e feriado); o contador mudou → "usar o último valor"; empresa "a encerrar" com data para de
   prever; visão da casa sem nada de PJ.
   Uso: node teste/teste-conta-fixa-revisar.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const CPJ = 'Conta PJ Ficticia';
const G = (id, data, valor, grupo, sub, desc, extra) => Object.assign({ id, data, valor, grupo, sub, desc, fluxo: 'saida', conta: 'Banco Ficticio' }, extra || {});
const gastos = [];
['2026-07', '2026-08', '2026-09', '2026-10'].forEach((m, k) => {
  gastos.push(G('mk' + k, m + '-08', 450, 'PESSOAL', 'Supermercado', 'SUPERMERCADO FICTICIO'));
  gastos.push(G('rs' + k, m + '-12', 90, 'LAZER', 'Outros', 'CANTINA IMAGINARIA', { contraparte: { mcc: '5812' } }));
  gastos.push(G('ac' + k, m + '-05', 120, 'SAUDE', 'Academia', 'ACADEMIA FICTICIA'));
  /* a PJ: receita (RENDA) de 10.000 em jul–set e 12.000 em out; DAS de 600 no mês seguinte (6%) */
  gastos.push(G('ft' + k, m + '-03', k === 3 ? 12000 : 10000, 'RENDA', 'Receita PJ', 'RECEBIMENTO CLIENTE FICTICIO', { fluxo: 'entrada', conta: CPJ, irTexto: 'PJ' }));
  if (k) gastos.push(G('das' + k, m + (k === 2 ? '-21' : '-20'), 600, 'BANCARIOS', 'IRPF / DARF', 'DAS-SIMPLES', { conta: CPJ, irTexto: 'PJ' }));
  gastos.push(G('ct' + k, m + '-10', k === 3 ? 227 : 405, 'BANCARIOS', 'Contador (PJ)', 'CONTABILIDADE FICTICIA', { conta: CPJ, irTexto: 'PJ' }));
});
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [], gastos, transferencias: [],
  empresas: [{ id: 'e1', razao: 'EMPRESA FICTICIA LTDA', fantasia: 'Ficticia', cnpj: '11222333000181', regime: 'simples', contasRobo: [CPJ], situacao: 'ativa' }] };

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
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof ContasMes !== 'undefined' && typeof PJ !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); ContasMes._hoje = '2026-11-15'; PJ._hoje = '2026-11-15'; abrirApp('budget'); irPara('b-painel'); render(); });
    const sug = () => p.evaluate(() => ContasMes.sugestoes().map((x) => ({ nome: x.nome, chave: x.chave, pj: x.pj, emp: x.empresaId, valor: x.valor, ultimo: x.ultimo })));

    console.log('1) gasto frequente não vira sugestão');
    const s1 = await sug();
    ok(!s1.some((x) => /SUPERMERCADO/.test(x.nome)), 'o mercado (categoria Supermercado, 1× por mês) não vira "Parece conta fixa"');
    ok(!s1.some((x) => /CANTINA/.test(x.nome)), 'o restaurante (MCC 5812) também não');
    ok(s1.some((x) => /ACADEMIA/.test(x.nome)) && s1.some((x) => /DAS-SIMPLES/.test(x.nome) && x.pj && x.emp === 'e1'), 'a academia é sugerida; o DAS é sugerido como imposto da empresa certa: ' + JSON.stringify(s1.map((x) => x.nome)));

    console.log('2) a janela Revisar');
    const card = await p.evaluate(() => (document.querySelector('#view-b-painel .cfs-atencao') || {}).textContent || '');
    ok(/Revisar/.test(card) && /Não acompanhar/.test(card) && !/Sim, cadastrar/.test(card) && /Parece imposto ou custo da empresa: DAS-SIMPLES/.test(card), 'os botões "Revisar" e "Não acompanhar"; o DAS aparece como imposto ou custo da empresa');
    const ac = s1.find((x) => /ACADEMIA/.test(x.nome));
    await p.click('#view-b-painel .cfs-atencao [data-acao="cfs-revisar"][data-chave="' + ac.chave + '"]'); await p.waitForTimeout(200);
    const j = await p.evaluate(() => ({ tipos: [...document.querySelectorAll('#genBody input[name="cfrTipo"]')].map((e) => e.value + (e.checked ? '*' : '')), nome: document.getElementById('cfrNome').value, v: document.getElementById('cfrV').value,
      dia: document.getElementById('cfrDia').value, previa: document.getElementById('cfrPrevia').textContent, pjVisivel: (document.getElementById('cfrPJ') || { style: {} }).style.display !== 'none' }));
    ok(j.tipos.join() === 'fixa*,variavel,imposto,frequente,umavez', 'os 5 tipos, um por linha, "Conta fixa" marcado: ' + j.tipos.join());
    ok(j.nome === 'ACADEMIA FICTICIA' && j.v === '120' && j.dia === '5' && !j.pjVisivel, 'nome, valor (média) e dia preenchidos; os campos da empresa escondidos');
    ok(/Vai criar a conta fixa "ACADEMIA FICTICIA" · R\$ 120,00 · por volta do dia 5 · em aberto/.test(j.previa), 'a prévia: ' + j.previa);
    await p.click('#genBody input[name="cfrFim"][value="data"]'); await p.evaluate(() => { const e = document.getElementById('cfrFimData'); e.value = '2027-06-30'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    ok(/até 30\/Jun\/2027/.test(await p.evaluate(() => document.getElementById('cfrPrevia').textContent)), '"Até quando": até uma data, na prévia');
    await p.evaluate(() => { ContasMes._desfazerMs = 1500; }); await p.click('#genBody [data-acao="cfs-salvar"]'); await p.waitForTimeout(200);
    const r1 = await p.evaluate(() => (ST.recorrentes || []).filter((r) => /ACADEMIA/.test(r.nome)).map((r) => [r.valor, r.dia, r.ate, r.varia, (r.janela || []).join('-')].join('|')));
    ok(r1.length === 1 && r1[0] === '120|5|2027-06-30|false|5-5', 'Salvar: a conta fixa criada (120, dia 5, até 30/06/2027): ' + r1);
    ok(await p.evaluate(() => !!document.querySelector('#cfrDesfazer [data-acao="cfs-desfazer"]')), 'o aviso com "Desfazer"');
    await p.click('#cfrDesfazer [data-acao="cfs-desfazer"]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => !(ST.recorrentes || []).some((r) => /ACADEMIA/.test(r.nome)) && ContasMes.sugestoes().some((x) => /ACADEMIA/.test(x.nome))), '"Desfazer": a conta some e a sugestão volta');
    await p.evaluate(() => { const x = ContasMes.sugestoes().find((s) => /ACADEMIA/.test(s.nome)); document.querySelector('[data-acao="cfs-revisar"][data-chave="' + CSS.escape(x.chave) + '"]').click(); });
    await p.click('#genBody input[name="cfrTipo"][value="frequente"]'); await p.click('#genBody [data-acao="cfs-salvar"]'); await p.waitForTimeout(1800);
    ok(await p.evaluate(() => !ContasMes.sugestoes().some((x) => /ACADEMIA/.test(x.nome)) && !(ST.recorrentes || []).length && !document.getElementById('cfrDesfazer')), '"Gasto frequente": não cadastra, não volta a sugerir; o "Desfazer" some depois do tempo');

    console.log('3) o DAS: imposto da empresa, condicional, dia útil');
    const das = (await sug()).find((x) => /DAS-SIMPLES/.test(x.nome));
    await p.evaluate((c) => document.querySelector('[data-acao="cfs-revisar"][data-chave="' + CSS.escape(c) + '"]').click(), das.chave); await p.waitForTimeout(150);
    const jd = await p.evaluate(() => ({ tipo: (document.querySelector('#genBody input[name="cfrTipo"]:checked') || {}).value, emp: document.getElementById('cfrEmp').value, cond: document.getElementById('cfrCond').value, txt: document.getElementById('genBody').textContent }));
    ok(jd.tipo === 'imposto' && jd.emp === 'e1' && jd.cond === 'receita', 'abre como "Imposto ou custo da empresa", com a empresa e "só nos meses em que houver receita"');
    ok(/vence no dia 20 do mês seguinte; em fim de semana ou feriado passa para o próximo dia útil \(por isso às vezes dia 22\)/.test(jd.txt), 'a linha do dia 20 → próximo dia útil');
    await p.click('#genBody [data-acao="cfs-salvar"]'); await p.waitForTimeout(200);
    const rd = await p.evaluate(() => { const r = ST.recorrentes.find((x) => /DAS/.test(x.nome)); return { r: [r.empresaId, r.pjTipo, r.condicional, r.diaUtilSeguinte, r.escopo].join('|'), oc: Recorrente.ocorrencias('2026-11-01', '2027-01-31').filter((o) => o.r.id === r.id).map((o) => o.data + '=' + o.valor + ':' + o.previstoFonte) }; });
    ok(rd.r === 'e1|das|receita|true|reservado', 'gravado: empresa, DAS, condicional pela receita, próximo dia útil, reservado: ' + rd.r);
    ok(rd.oc.length === 1 && rd.oc[0] === '2026-11-23=720:receita', 'novembro: 12.000 de receita em outubro × 6% = R$ 720 em 23/11 (20/11 é feriado, 21–22 fim de semana); dezembro e janeiro sem receita antes → sem previsão: ' + rd.oc.join(' '));
    const util = await p.evaluate(() => { let r = ST.recorrentes.find((x) => /DAS/.test(x.nome)); r = Object.assign({}, r, { desde: '' }); return [Recorrente.datasNoMes(r, 2026, 9)[0], Recorrente.datasNoMes(Object.assign({}, r, { diaUtilSeguinte: false }), 2026, 9)[0]]; });
    ok(util[0] === '2026-09-21' && util[1] === '2026-09-20', 'dia útil seguinte: 20/09/2026 é domingo → 21/09 (sem a marca, ficaria no 20): ' + util);
    await p.evaluate(() => { ST.gastos.push({ id: 'ftn', data: '2026-11-04', valor: 5000, grupo: 'RENDA', sub: 'Receita PJ', desc: 'RECEBIMENTO CLIENTE FICTICIO', fluxo: 'entrada', conta: 'Conta PJ Ficticia', irTexto: 'PJ' }); });
    const oc2 = await p.evaluate(() => { const r = ST.recorrentes.find((x) => /DAS/.test(x.nome)); return Recorrente.ocorrencias('2026-12-01', '2026-12-31').filter((o) => o.r.id === r.id).map((o) => o.data + '=' + o.valor); });
    ok(oc2.join() === '2026-12-21=300', 'com receita em novembro (5.000), dezembro prevê 300 (alíquota 6%) no dia 21 (20/12 é domingo): ' + oc2);

    console.log('4) o contador mudou: "usar o último valor"');
    await p.evaluate(() => { Recorrente.add({ nome: 'Contador · Ficticia', valor: 405, grupo: 'OUTROS', sub: 'Contador (PJ)', dia: 10, regra: 'dia', empresaId: 'e1', pjTipo: 'contador', escopo: 'reservado', desde: '2026-01-01' }); Store.salvar(); });
    const pj = await p.evaluate(() => (inboxGrupos().find((g) => g.id === 'pj') || {}).html || '');
    ok(/O contador mudou: último R\$ 227,00 \(previsto R\$ 405,00\)/.test(pj) && /Usar o último valor/.test(pj), 'no 📥: "O contador mudou: último R$ 227,00 (previsto R$ 405,00)" com "Usar o último valor"');
    await p.evaluate(() => { abrirInbox(); }); await p.click('#genBody [data-acao="pj-ultimo"]'); await p.waitForTimeout(200);
    ok(await p.evaluate(() => { const r = ST.recorrentes.find((x) => x.pjTipo === 'contador'); return Recorrente.valorEm(r, '2026-12-10') === 227 && !/O contador mudou/.test((inboxGrupos().find((g) => g.id === 'pj') || {}).html || ''); }), 'a previsão passa a R$ 227 e o aviso sai');
    await p.evaluate(() => fechar('genModal'));

    console.log('5) empresa "a encerrar" para de prever');
    const antes = await p.evaluate(() => Recorrente.ocorrencias('2026-12-01', '2027-02-28').filter((o) => o.r.pjTipo === 'contador').length);
    await p.evaluate(() => { const e = ST.empresas[0]; e.situacao = 'a-encerrar'; e.situacaoData = '2026-12-31'; });
    const depois = await p.evaluate(() => Recorrente.ocorrencias('2026-12-01', '2027-02-28').filter((o) => o.r.pjTipo === 'contador').map((o) => o.data));
    ok(antes === 3 && depois.join() === '2026-12-10' && await p.evaluate(() => ST.gastos.filter((g) => /CONTABILIDADE/.test(g.desc)).length === 4 && ST.recorrentes.length === 2), 'encerra em 31/12: prevê só dezembro (antes 3 meses); o histórico e a conta fixa ficam');

    console.log('6) visão da casa: nada da PJ');
    await p.evaluate(() => { ST.config.cfFrequentes = {}; Escopo.soCasa = () => true; });
    const sc = await sug();
    ok(sc.length && !sc.some((x) => x.pj || /DAS|CONTABILIDADE|RECEBIMENTO/.test(x.nome)), 'as sugestões da casa não têm nada da PJ: ' + JSON.stringify(sc.map((x) => x.nome)));
    await p.evaluate(() => { render(); const x = ContasMes.sugestoes()[0]; document.querySelector('[data-acao="cfs-revisar"][data-chave="' + CSS.escape(x.chave) + '"]').click(); });
    ok(await p.evaluate(() => !document.getElementById('cfrPJ') && !document.querySelector('#genBody input[value="imposto"]')), 'a janela Revisar na casa: sem empresa e sem "Imposto ou custo da empresa"');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
