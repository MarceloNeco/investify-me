/* =====================================================================
   teste/teste-previsao.js — 3.69: o previsto × realizado por categoria (modulos/previsao.js). Dados fictícios.
   Confere: novembro na metade (combustível média 500, gastou 300 → falta ~200, corrigido pelo IPCA do grupo); a escola
   que vence dia 10 vista no dia 8 (comprometida, "vem dia 10") e depois substituída pelo real sem contar duas vezes;
   julho com peso menor (entre 0,6 e 1,5); uma viagem descoberta pelo combustível, confirmada, saindo da média; a viagem
   registrada no Futuro somando gasolina; o cartão no Painel; a visão da casa sem renda nem sobra.
   Uso: node teste/teste-previsao.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const z = (n) => String(n).padStart(2, '0');
const gastos = [];
/* combustível: 125 nos dias 3, 10, 17 e 24 (500 por mês), de maio a outubro de 2026; novembro: 150 nos dias 3 e 10 (300) */
for (let m = 5; m <= 10; m++) [3, 10, 17, 24].forEach((d) => gastos.push({ id: 'c' + m + '-' + d, data: '2026-' + z(m) + '-' + z(d), valor: 125, grupo: 'VEICULO', sub: 'Combustível', desc: 'POSTO EXEMPLO', fluxo: 'saida' }));
/* a viagem: dois abastecimentos a mais em 25 e 26 de outubro */
gastos.push({ id: 'v1', data: '2026-10-25', valor: 160, grupo: 'VEICULO', sub: 'Combustível', desc: 'POSTO ESTRADA EXEMPLO', fluxo: 'saida' });
gastos.push({ id: 'v2', data: '2026-10-26', valor: 160, grupo: 'VEICULO', sub: 'Combustível', desc: 'POSTO ESTRADA EXEMPLO', fluxo: 'saida' });
[3, 10].forEach((d) => gastos.push({ id: 'cn' + d, data: '2026-11-' + z(d), valor: 150, grupo: 'VEICULO', sub: 'Combustível', desc: 'POSTO EXEMPLO', fluxo: 'saida' }));
/* restaurante: 400 por mês desde julho de 2025, só julho de 2025 foi 200 (férias) */
for (let k = 0; k < 17; k++) { const y = 2025 + Math.floor((6 + k) / 12), m = (6 + k) % 12 + 1; gastos.push({ id: 'r' + k, data: y + '-' + z(m) + '-12', valor: (y === 2025 && m === 7) ? 200 : 400, grupo: 'LAZER', sub: 'Restaurantes', desc: 'RESTAURANTE EXEMPLO', fluxo: 'saida' }); }
/* escola: compromisso de 1.500 no dia 10; os meses passados já casados (recorrenteId) */
for (let m = 5; m <= 10; m++) gastos.push({ id: 'e' + m, data: '2026-' + z(m) + '-10', valor: 1500, grupo: 'DEPENDENTES', sub: 'Escola', desc: 'ESCOLA EXEMPLO', fluxo: 'saida', recorrenteId: 'rEsc' });
for (let m = 5; m <= 10; m++) gastos.push({ id: 's' + m, data: '2026-' + z(m) + '-05', valor: 6000, grupo: 'RENDA', sub: 'Salário', desc: 'SALARIO EXEMPLO', fluxo: 'entrada' });
const recorrentes = [{ id: 'rEsc', nome: 'Escola Exemplo', grupo: 'DEPENDENTES', sub: 'Escola', valor: 1500, dia: 10, regra: 'dia', per: 'Mensal', criadoEm: '2026-01-01' }];
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos, recorrentes };
const IPCA = JSON.stringify({ s1639: { codigo: 1639, ano: 4, meses: [], em: Date.now() } });

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript(([t, ip]) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('investifyme.ipca.v1', ip); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, [JSON.stringify(LOCAL), IPCA]);
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Previsao !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); Previsao._hoje = '2026-11-15'; });

    console.log('1) viagem descoberta pelo combustível');
    const s1 = await p.evaluate(() => Previsao.suspeitas());
    ok(s1.length === 1 && s1[0].de === '2026-10-24' && s1[0].ate === '2026-10-26' && s1[0].valor === 445, 'pergunta "Foi viagem?" entre 24 e 26/10 (R$ 445 de combustível; o normal é R$ 125 por semana): ' + JSON.stringify(s1.map((x) => [x.de, x.ate, x.valor])));
    const antes = await p.evaluate(() => Previsao.previstoMes('VEICULO', 'Combustível', '2026-11'));
    await p.evaluate(() => { irPara('b-painel'); render(); });
    const card = await p.evaluate(() => { const c = document.querySelector('.pv-atencao'); return c ? c.textContent.replace(/\s+/g, ' ') : ''; });
    ok(/Precisa da sua atenção/.test(card) && /Parece que teve viagem entre 24\/Out\/2026 e 26\/Out\/2026 \(R\$ 445,00 de combustível\)\. Foi viagem\?/.test(card), 'o Painel pergunta em "Precisa da sua atenção" (' + card.slice(0, 140) + ')');
    const inbox = await p.evaluate(() => inboxItens().filter((x) => x.tipo === 'atencao' && x.ico === '🧳').length);   /* 3.75: o 📥 tem outras perguntas (ex.: "Parece conta fixa") */
    ok(inbox === 1, 'e o 📥 também mostra a pergunta');
    ok(await p.evaluate(() => !Gasto.todos().some((g) => g.evento)), 'nada é marcado sozinho antes da resposta');
    await p.fill('.pv-dest', 'Praia Exemplo'); await p.click('[data-acao="pv-sim"]'); await p.waitForTimeout(150);
    const dep = await p.evaluate(() => ({ marc: Gasto.todos().filter((g) => g.evento).map((g) => g.id).sort(), ev: Previsao.eventos()[0], sus: Previsao.suspeitas().length, km: Previsao.kmDe('praia exemplo'), pv: Previsao.previstoMes('VEICULO', 'Combustível', '2026-11') }));
    ok(dep.marc.join(',') === 'c10-24,v1,v2' && dep.sus === 0, 'respondeu "sim": os 3 abastecimentos ficam marcados como da viagem e a pergunta some');
    ok(dep.km > 0 && dep.ev.destino === 'Praia Exemplo', 'aprendeu a distância do destino: ' + dep.km + ' km de ida');
    ok(dep.pv.base === 500 && antes.base > 500, 'a viagem sai da média: base ' + antes.base + ' → ' + dep.pv.base);

    console.log('2) novembro na metade: combustível');
    const c = dep.pv;
    ok(c.gasto === 300 && c.previsto > 500 && c.previsto < 510 && c.previsto - c.gasto > 200 && c.previsto - c.gasto < 210,
      'média 500 corrigida pelo IPCA do grupo (4% ao ano) = ' + c.previsto + '; já foi 300; falta ' + Math.round(c.previsto - c.gasto));
    ok(Math.abs(c.ritmoHoje - c.previsto * 0.5) < 1 && c.estado === 'adiantado', 'ritmo de hoje (dia 15 de 30) = metade do previsto (' + c.ritmoHoje + '); gastou 300, à frente do ritmo: estado "adiantado"');

    console.log('3) escola vencendo dia 10, vista no dia 8');
    const e1 = await p.evaluate(() => { Previsao._hoje = '2026-11-08'; return Previsao.previstoMes('DEPENDENTES', 'Escola', '2026-11'); });
    ok(e1.previsto === 1500 && e1.fixo === 1500 && e1.variavel === 0 && e1.gasto === 0 && e1.comprometidoAVir.length === 1 && e1.comprometidoAVir[0].dia === 10,
      'no dia 8: previsto 1.500 como conta certa, "vem dia 10", nada gasto ainda');
    const t1 = await p.evaluate(() => Previsao.totalMes('2026-11'));
    const e2 = await p.evaluate(() => { Gasto.add({ id: 'eNov', data: '2026-11-10', valor: 1520, grupo: 'DEPENDENTES', sub: 'Escola', desc: 'ESCOLA EXEMPLO', fluxo: 'saida', recorrenteId: 'rEsc' }); Previsao._hoje = '2026-11-11'; return { p: Previsao.previstoMes('DEPENDENTES', 'Escola', '2026-11'), t: Previsao.totalMes('2026-11') }; });
    ok(e2.p.previsto === 1520 && e2.p.gasto === 1520 && e2.p.comprometidoAVir.length === 0, 'o real (1.520) chegou: substitui a previsão; nada mais "vem"');
    ok(Math.abs((e2.t.previsto - t1.previsto) - 20) < 0.01, 'o total do mês sobe só a diferença (+20), nunca 1.500 + 1.520');
    ok(t1.aVirCertas === 1500 && e2.t.aVirCertas === 0, '"em contas certas" a vir: 1.500 no dia 8, 0 depois');

    console.log('4) julho com peso menor');
    const j = await p.evaluate(() => { Previsao._hoje = '2026-06-15'; const r = Previsao.previstoMes('LAZER', 'Restaurantes', '2026-07'); const ag = Previsao.previstoMes('LAZER', 'Restaurantes', '2026-08'); return { r, ag }; });
    ok(j.r.peso === 0.6 && Math.abs(j.r.previsto - 240) < 0.01, 'julho: o do ano passado foi metade da média → peso 0,6 (o mínimo) → previsto 240 em vez de 400');
    ok(j.ag.peso === 1 && Math.abs(j.ag.previsto - 400) < 0.01, 'agosto (mês comum no ano passado): peso 1, previsto 400');

    console.log('5) viagem registrada no Futuro');
    const f = await p.evaluate(() => { Previsao._hoje = '2026-11-15'; ST.config.veiculo = { consumo: 10, precoLitro: 6 }; const sem = Previsao.previstoMes('VEICULO', 'Combustível', '2026-12').previsto;
      const e = Previsao.salvarEvento({ destino: 'Serra Exemplo', de: '2026-12-20', ate: '2026-12-27', carro: true, km: 300 }); return { g: Previsao.gasolinaDe(e), sem, com: Previsao.previstoMes('VEICULO', 'Combustível', '2026-12').previsto }; });
    ok(f.g === 360 && Math.abs(f.com - f.sem - 360) < 0.01, '300 km de ida × 2 ÷ 10 km/l × R$ 6 = R$ 360 a mais no combustível de dezembro');
    await p.evaluate(() => { irPara('b-custos'); custosSecao = 'planejados'; planejadosParte = 'viagens'; render(); });   /* 3.76: saiu do Futuro */
    ok(await p.evaluate(() => /Serra Exemplo/.test((document.querySelector('#view-b-custos .pv-eventos') || {}).textContent || '')), 'Contas fixas → Gastos planejados → Viagens e eventos lista a viagem');

    console.log('6) o cartão do Painel');
    await p.evaluate(() => { irPara('b-painel'); render(); });
    const fr = await p.evaluate(() => ({ t: (document.querySelector('.pv-frase') || {}).textContent || '', barras: document.querySelectorAll('.pv-barra').length, ritmo: document.querySelectorAll('.pv-ritmo').length }));
    ok(/^Previsto para novembro: R\$ [\d.]+,\d\d · já foi R\$ [\d.]+,\d\d · ainda vem R\$ [\d.]+,\d\d \(R\$ [\d.]+,\d\d em contas certas\) · deve (sobrar|faltar) R\$/.test(fr.t), 'a frase: ' + fr.t);
    ok(fr.barras >= 3 && fr.ritmo >= 1, 'barras empilhadas com o risquinho do ritmo (' + fr.barras + ' barras)');
    const pj = await p.evaluate(() => ({ r: OrcamentoMes.projecao(), t: Previsao.totalMes() }));
    ok(pj.r.entra === 6000 && pj.r.sai === pj.t.previsto, 'a projeção usa o previsto (renda prevista 6.000; sai = o previsto do mês)');

    console.log('7) visão da casa: sem renda e sem sobra');
    const vc = await p.evaluate(() => { const o = Escopo.soCasa; Escopo.soCasa = () => true; const t = Previsao.totalMes(); render(); const txt = (document.querySelector('.pv-frase') || {}).textContent || ''; const sus = Previsao.suspeitas().length; Escopo.soCasa = o; render(); return { t, txt, sus }; });
    ok(vc.t.rendaPrevista === null && vc.t.sobra === null && !/sobrar|faltar/.test(vc.txt) && vc.sus === 0, 'na visão da casa: sem renda, sem sobra, sem pergunta de viagem (' + vc.txt + ')');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
