/* =====================================================================
   teste/teste-3144-contas.js — 3.144: conta fixa automática com os tipos de gasto que o dono explicou (28/Nov/2026). Dados FICTÍCIOS.
   Confere:
   1) fixo mensal (assinatura de streaming, assinatura de IA): 2 meses seguidos viram conta fixa; um REAJUSTE (valor novo que se repete)
      atualiza o valor da mesma conta e não cria outra;
   2) fixo variável (condomínio, luz): o mesmo recebedor no mesmo dia (±5) todo mês, com valor que muda até ±40 %, vira UMA conta que
      varia, "≈ R$ X (varia) · último R$ Y";
   3) parcelas ("PARC 1/4"… do seguro do carro) não viram conta fixa;
   4) anual (seguro da casa, uma vez por ano) e pagamento único (hospedagem de 2 anos) não entram como mensais;
   5) conta de outra pessoa (a de gás que chega no seu nome mas é da inquilina: "processar para ela") não vira conta fixa sua;
   6) a escola com 2 contas (mensalidade ~dia 10 e período ampliado dia 25) vira 2 contas.
   Uso: node teste/teste-3144-contas.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const G = (id, data, valor, desc, grupo, sub, extra) => Object.assign({ id, data, valor, desc, descRobo: desc, fluxo: 'saida', grupo, sub, origem: 'robo', per: 'Mensal' }, extra || {});
const gastos = [
  G('s1', '2026-08-05', 21.9, 'STREAMING EXEMPLO', 'LAZER', 'Streaming'), G('s2', '2026-09-05', 21.9, 'STREAMING EXEMPLO', 'LAZER', 'Streaming'),
  G('i1', '2026-09-12', 110, 'ASSINATURA IA EXEMPLO', 'PESSOAL', 'Assinaturas de tecnologia'), G('i2', '2026-10-12', 110, 'ASSINATURA IA EXEMPLO', 'PESSOAL', 'Assinaturas de tecnologia'), G('i3', '2026-11-12', 110, 'ASSINATURA IA EXEMPLO', 'PESSOAL', 'Assinaturas de tecnologia'),
  G('c1', '2026-08-10', 980, 'CONDOMINIO EXEMPLO', 'HABITACAO', 'Condomínio'), G('c2', '2026-09-09', 1210, 'CONDOMINIO EXEMPLO', 'HABITACAO', 'Condomínio'),
  G('c3', '2026-10-11', 1050, 'CONDOMINIO EXEMPLO', 'HABITACAO', 'Condomínio'), G('c4', '2026-11-10', 1340, 'CONDOMINIO EXEMPLO', 'HABITACAO', 'Condomínio'),
  G('l1', '2026-09-18', 210, 'LUZ EXEMPLO ENERGIA', 'HABITACAO', 'Energia'), G('l2', '2026-10-17', 160, 'LUZ EXEMPLO ENERGIA', 'HABITACAO', 'Energia'), G('l3', '2026-11-19', 245, 'LUZ EXEMPLO ENERGIA', 'HABITACAO', 'Energia'),
  G('p1', '2026-08-15', 600, 'SEGURO AUTO EXEMPLO PARC 1/4', 'VEICULO', 'Seguro'), G('p2', '2026-09-15', 600, 'SEGURO AUTO EXEMPLO PARC 2/4', 'VEICULO', 'Seguro'),
  G('p3', '2026-10-15', 600, 'SEGURO AUTO EXEMPLO PARC 3/4', 'VEICULO', 'Seguro'), G('p4', '2026-11-15', 600, 'SEGURO AUTO EXEMPLO PARC 4/4', 'VEICULO', 'Seguro'),
  G('a1', '2025-11-14', 900, 'SEGURO RESIDENCIA EXEMPLO', 'HABITACAO', 'Seguro', { per: 'Anual' }), G('a2', '2026-11-14', 950, 'SEGURO RESIDENCIA EXEMPLO', 'HABITACAO', 'Seguro', { per: 'Anual' }),
  G('h1', '2026-06-03', 480, 'EBN*HOSPEDAGEM EXEMPLO', 'PESSOAL', 'Assinaturas de tecnologia', { per: 'Pontual' }),
  G('g1', '2026-09-20', 85, 'GAS EXEMPLO DISTRIBUIDORA', 'HABITACAO', 'Gás', { paraQuem: 'Inquilina Exemplo', paraQuemId: 'pinq' }),
  G('g2', '2026-10-20', 92, 'GAS EXEMPLO DISTRIBUIDORA', 'HABITACAO', 'Gás', { paraQuem: 'Inquilina Exemplo', paraQuemId: 'pinq' }),
  G('g3', '2026-11-20', 88, 'GAS EXEMPLO DISTRIBUIDORA', 'HABITACAO', 'Gás', { paraQuem: 'Inquilina Exemplo', paraQuemId: 'pinq' }),
  G('e1', '2026-09-10', 2100, 'ESCOLA EXEMPLO LTDA', 'DEPENDENTES', 'Escola'), G('e2', '2026-10-09', 2100, 'ESCOLA EXEMPLO LTDA', 'DEPENDENTES', 'Escola'), G('e3', '2026-11-11', 2100, 'ESCOLA EXEMPLO LTDA', 'DEPENDENTES', 'Escola'),
  G('f1', '2026-09-25', 650, 'ESCOLA EXEMPLO LTDA', 'DEPENDENTES', 'Escola'), G('f2', '2026-10-25', 650, 'ESCOLA EXEMPLO LTDA', 'DEPENDENTES', 'Escola'), G('f3', '2026-11-25', 650, 'ESCOLA EXEMPLO LTDA', 'DEPENDENTES', 'Escola')];
const pessoas = [{ id: 'pinq', tipo: 'outra', papel: '', nome: 'Inquilina Exemplo', meio: '', sobrenome: '', apelido: '', banco: [], aliases: [], relacao: 'inquilino' }];
const LOCAL = { v: 1, config: { fitaLigada: false, pessoasV: 2, pessoasFora3142: 1 }, posicoes: [], recorrentes: [], cartoes: [], pessoas, gastos };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.clock.setFixedTime(new Date('2026-11-28T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof ContasAuto !== 'undefined');
    await p.waitForFunction(() => (ST.recorrentes || []).some((r) => r.auto));
    await p.waitForTimeout(300);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); });
    const rs = () => p.evaluate(() => JSON.parse(JSON.stringify(Recorrente.todos().filter((r) => r.auto).map((r) => ({ id: r.id, nome: r.nome, valor: r.valor, dia: r.dia, varia: !!r.varia, ult: r.ultimoValor,
      pagos: Gasto.todos().filter((g) => g.recorrenteId === r.id).map((g) => g.id).sort().join(',') })))));
    const acha = (l, re) => l.filter((r) => re.test(r.nome));
    let r = await rs();
    console.log('    contas criadas: ' + r.map((x) => x.nome + ' ' + x.valor + (x.varia ? ' (varia)' : '')).join(' | '));

    console.log('1) fixo mensal e o reajuste');
    ok(acha(r, /STREAMING/).length === 1 && acha(r, /STREAMING/)[0].valor === 21.9 && !acha(r, /STREAMING/)[0].varia, 'streaming: 2 meses seguidos = 1 conta fixa de R$ 21,90, sem "varia"');
    ok(acha(r, /ASSINATURA IA/).length === 1 && acha(r, /ASSINATURA IA/)[0].valor === 110 && acha(r, /ASSINATURA IA/)[0].pagos === 'i1,i2,i3', 'assinatura de IA: 1 conta de R$ 110, com os 3 pagamentos ligados');
    await p.evaluate(() => { Gasto.add({ id: 's3', data: '2026-10-06', valor: 26.9, desc: 'STREAMING EXEMPLO', descRobo: 'STREAMING EXEMPLO', fluxo: 'saida', grupo: 'LAZER', sub: 'Streaming', origem: 'robo' });
      Gasto.add({ id: 's4', data: '2026-11-05', valor: 26.9, desc: 'STREAMING EXEMPLO', descRobo: 'STREAMING EXEMPLO', fluxo: 'saida', grupo: 'LAZER', sub: 'Streaming', origem: 'robo' }); ContasAuto.detectar(); });
    r = await rs();
    const st = acha(r, /STREAMING/);
    ok(st.length === 1 && st[0].valor === 26.9 && st[0].pagos === 's1,s2,s3,s4', 'reajuste (R$ 21,90 → R$ 26,90, 2 meses): a MESMA conta passa a R$ 26,90 e liga os novos pagamentos; nenhuma conta a mais: ' + JSON.stringify(st));

    console.log('2) fixo variável');
    const cd = acha(r, /CONDOMINIO/), lz = acha(r, /LUZ/);
    ok(cd.length === 1 && cd[0].varia && cd[0].ult === 1340 && Math.abs(cd[0].valor - 1145) < 0.01 && cd[0].pagos === 'c1,c2,c3,c4', 'condomínio (980 → 1.340, dia 9–11): UMA conta que varia, média R$ 1.145, último R$ 1.340, os 4 meses ligados: ' + JSON.stringify(cd));
    ok(lz.length === 1 && lz[0].varia && lz[0].ult === 245, 'luz (160–245, dia 17–19): UMA conta que varia, último R$ 245');
    await p.evaluate(() => { irPara('b-custos'); render(); });
    const txt = await p.evaluate(() => (document.getElementById('view-b-custos') || document.body).innerText);
    ok(/≈ R\$\s?1\.145,00 \(varia\) · último R\$\s?1\.340,00/.test(txt), 'Contas fixas mostra "≈ R$ 1.145,00 (varia) · último R$ 1.340,00"');

    console.log('3) parcelas, 4) anual e pagamento único, 5) conta de outra pessoa');
    ok(!acha(r, /SEGURO AUTO/).length, 'seguro do carro em "PARC 1/4…4/4": parcelamento, não vira conta fixa');
    ok(!acha(r, /SEGURO RESIDENCIA/).length, 'seguro da casa (uma vez por ano): não entra como mensal');
    ok(!acha(r, /HOSPEDAGEM/).length, 'hospedagem paga uma vez (plano de 2 anos): não entra');
    ok(!acha(r, /GAS EXEMPLO/).length, 'a conta de gás da inquilina (processar para ela): não vira conta fixa sua');
    const sg = await p.evaluate(() => ContasMes.sugestoes({ min: 2 }).map((x) => x.nome));
    ok(!sg.some((n) => /GAS EXEMPLO|SEGURO AUTO/.test(n)), 'nem como sugestão "Parece conta fixa"');

    console.log('6) a escola com 2 contas');
    const es = acha(r, /ESCOLA/).map((x) => x.nome + '=' + x.valor).sort();
    ok(es.length === 2 && /dia 10=2100/.test(es.join()) && /dia 25=650/.test(es.join()), 'escola: mensalidade (dia 10, R$ 2.100) e período ampliado (dia 25, R$ 650) = 2 contas: ' + JSON.stringify(es));
    ok(r.length === 6, 'no total 6 contas detectadas (streaming, IA, condomínio, luz e as 2 da escola): ' + r.length);
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ FALHOU (exceção): ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
