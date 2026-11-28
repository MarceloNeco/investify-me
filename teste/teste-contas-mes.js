/* =====================================================================
   teste/teste-contas-mes.js — 3.75: a tela "Contas fixas" com o status de cada conta e "Parece conta fixa"
   (modulos/contas-mes.js). Dados FICTÍCIOS. Hoje fixado em 15/11/2026.
   Confere: paga (data e valor real) / atrasada / vence hoje / a vencer / débito automático (e depois paga);
   o resumo e a barra; a atrasada antiga no topo dos 45 dias; por grupo com totais e "pagas X de Y"; os seletores
   guardados; a sugestão de conta fixa (3 meses), dois boletos do mesmo recebedor separados, a anual, a recusa que
   não volta, a descrição genérica do banco que não sugere; o "Sim" abre o cadastro preenchido.
   Uso: node teste/teste-contas-mes.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const R = (id, nome, grupo, sub, valor, dia, extra) => Object.assign({ id, nome, grupo, sub, valor, dia, regra: 'dia', criadoEm: '2026-11-01' }, extra || {});
const recorrentes = [
  R('r1', 'Aluguel Exemplo', 'HABITACAO', 'Aluguel', 2500, 10),
  R('r2', 'Escola Exemplo', 'DEPENDENTES', 'Escola', 1500, 5, { criadoEm: '2026-10-01' }),
  R('r3', 'Internet Exemplo', 'HABITACAO', 'Internet', 120, 15),
  R('r4', 'Condomínio Exemplo', 'HABITACAO', 'Condomínio', 800, 25),
  R('r5', 'Luz Exemplo', 'HABITACAO', 'Luz', 200, 20, { estadoPadrao: 'automatico' }),
  R('r6', 'Plano Exemplo', 'SAUDE', 'Plano de saúde', 300, 3, { estadoPadrao: 'automatico' })
];
const gastos = [{ id: 'gal', data: '2026-11-10', valor: 2500, grupo: 'HABITACAO', sub: 'Aluguel', desc: 'ALUGUEL EXEMPLO', fluxo: 'saida', recorrenteId: 'r1' }];
const CP = { cnpj: '00000000000191', nome: 'ESCOLA MODELO' };
[['08', 2260, '10', 990, '25'], ['09', 2255, '09', 985, '24'], ['10', 2270, '11', 995, '26']].forEach(([m, v1, d1, v2, d2]) => {
  gastos.push({ id: 'em' + m, data: '2026-' + m + '-' + d1, valor: v1, grupo: 'DEPENDENTES', sub: 'Escola', desc: 'ESCOLA MODELO MENSALIDADE', fluxo: 'saida', contraparte: CP });
  gastos.push({ id: 'ea' + m, data: '2026-' + m + '-' + d2, valor: v2, grupo: 'DEPENDENTES', sub: 'Escola', desc: 'ESCOLA MODELO PERIODO AMPLIADO', fluxo: 'saida', contraparte: CP });
  gastos.push({ id: 'px' + m, data: '2026-' + m + '-12', valor: 300, grupo: 'OUTROS', sub: 'Outros', desc: 'PIX ENVIADO', fluxo: 'saida' });
  ['03', '10', '17', '24'].forEach((d) => gastos.push({ id: 'po' + m + d, data: '2026-' + m + '-' + d, valor: 150, grupo: 'VEICULO', sub: 'Combustível', desc: 'POSTO EXEMPLO', fluxo: 'saida' }));
});
gastos.push({ id: 'ip25', data: '2025-02-10', valor: 1800, grupo: 'HABITACAO', sub: 'IPTU', desc: 'PREFEITURA EXEMPLO IPTU', fluxo: 'saida' });
gastos.push({ id: 'ip26', data: '2026-02-12', valor: 1850, grupo: 'HABITACAO', sub: 'IPTU', desc: 'PREFEITURA EXEMPLO IPTU', fluxo: 'saida' });
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos, recorrentes };

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
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof ContasMes !== 'undefined');
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); ContasMes._hoje = '2026-11-15'; abrirApp('budget'); irPara('b-custos'); render(); });

    console.log('1) o status de cada conta (este mês)');
    const it = await p.evaluate(() => Object.fromEntries(ContasMes.itens('mes').map((x) => [x.r.id, [x.status, x.pagoEm, x.valor]])));
    ok(it.r1[0] === 'paga' && it.r1[1] === '2026-11-10' && it.r1[2] === 2500, 'Aluguel: paga em 10/11 (lançamento ligado), valor real');
    ok(it.r2[0] === 'atrasada' && it.r3[0] === 'hoje' && it.r4[0] === 'avencer', 'Escola (dia 5) atrasada; Internet (dia 15) vence hoje; Condomínio (dia 25) a vencer');
    ok(it.r5[0] === 'debito' && it.r6[0] === 'paga', 'débito automático: Luz (dia 20) azul até cair; Plano (dia 3) já caiu = paga');
    const r1 = await p.evaluate(() => ContasMes.resumo(ContasMes.itens('mes')));
    ok(r1.total === 5420 && r1.pagas === 2800 && r1.faltam === 2620 && r1.atrasadas === 1500, 'resumo: 5.420 · pagas 2.800 · faltam 2.620 · atrasadas 1.500 ' + JSON.stringify(r1));
    const tela = await p.evaluate(() => { const c = document.querySelector('#view-b-custos .cm-card'); return c ? { txt: c.textContent.replace(/\s+/g, ' '), n: c.querySelectorAll('.cm-linha').length, cor: getComputedStyle(c.querySelector('.cm-atrasada')).borderLeftColor, w: c.querySelector('.cm-barra span').style.width } : null; });
    ok(tela && tela.n === 6 && /Este mês: R\$ 5\.420,00 em contas fixas/.test(tela.txt) && /pagas R\$ 2\.800,00 · faltam R\$ 2\.620,00 · atrasadas R\$ 1\.500,00/.test(tela.txt), 'no topo da tela: o resumo e as 6 contas');
    ok(tela && /✓ Paga/.test(tela.txt) && /⚠ Atrasada/.test(tela.txt) && /⏰ Vence hoje/.test(tela.txt) && /○ A vencer/.test(tela.txt) && /🔄 Débito automático/.test(tela.txt) && /paga em 10\/Nov\/2026/.test(tela.txt), 'cada status com o ícone e o nome (não só a cor); a paga com a data');
    ok(tela && tela.w === '51.7%' && /rgb/.test(tela.cor), 'a barra 51,7% pago; a faixa da atrasada tem cor');

    console.log('2) próximos 45 dias com as atrasadas antigas no topo');
    await p.click('#view-b-custos [data-acao="cm-modo"][data-v="45"]'); await p.waitForTimeout(150);
    const q = await p.evaluate(() => { const c = document.querySelector('#view-b-custos .cm-card'); const ls = [...c.querySelectorAll('.cm-linha')]; return { aviso: (c.querySelector('.cm-antigas') || {}).textContent || '', primeiro: ls[0].textContent, modo: ST.config.contasModo, antigas: ContasMes.atrasadasAntigas().map((x) => x.data) }; });
    ok(q.modo === '45' && q.antigas.join() === '2026-10-05,2026-11-05' && /2 contas atrasadas · R\$ 3\.000,00/.test(q.aviso) && /05\/Out\/2026/.test(q.primeiro), 'as atrasadas que ficaram para trás (a Escola de outubro e a de 05/11) no topo: "2 contas atrasadas · R$ 3.000,00"');
    console.log('3) por grupo');
    await p.click('#view-b-custos [data-acao="cm-arruma"][data-v="grupo"]'); await p.waitForTimeout(150);
    await p.click('#view-b-custos [data-acao="cm-modo"][data-v="mes"]'); await p.waitForTimeout(150);
    const g = await p.evaluate(() => [...document.querySelectorAll('#view-b-custos .cm-grupo > summary')].map((s) => s.textContent.replace(/\s+/g, ' ').trim()));
    ok(g.length === 3 && /Habitação ?R\$ 3\.620,00 · pagas 1 de 4/.test(g[0]) && /pagas 0 de 1/.test(g.join('|')) && /pagas 1 de 1/.test(g.join('|')), 'por grupo: Habitação 3.620 (pagas 1 de 4), Dependentes (0 de 1), Saúde (1 de 1): ' + g.join(' | '));
    await p.reload(); await p.waitForFunction(() => typeof ContasMes !== 'undefined' && Store.estado);
    ok(await p.evaluate(() => ContasMes.modo() === 'mes' && ContasMes.arruma() === 'grupo'), 'as escolhas ficam guardadas depois de recarregar');

    console.log('4) "Parece conta fixa"');
    await p.evaluate(() => { I18n.atual = 'pt'; ContasMes._hoje = '2026-11-15'; abrirApp('budget'); irPara('b-painel'); render(); });
    const s = await p.evaluate(() => ContasMes.sugestoes().map((x) => [x.tipo, x.nome, Math.round(x.valor), x.dia, x.mes]));
    const mens = s.filter((x) => x[0] === 'mensal');
    ok(mens.length === 2 && mens.some((x) => x[2] === 2262 && x[3] === 10) && mens.some((x) => x[2] === 990 && x[3] === 25), 'a mesma escola, dois boletos: ~2.262 no dia ~10 e ~990 no dia ~25 (duas contas) ' + JSON.stringify(mens));
    ok(s.some((x) => x[0] === 'anual' && x[4] === 2 && /PREFEITURA/.test(x[1])), 'o IPTU em fevereiro de 2025 e 2026 → conta anual');
    ok(!s.some((x) => /PIX/.test(x[1])), '"PIX ENVIADO" (descrição genérica do banco) não sugere nada');
    ok(!s.some((x) => /POSTO/.test(x[1])), 'o posto (4 vezes por mês, mesmo valor) não vira conta fixa');
    const card = await p.evaluate(() => (document.querySelector('#view-b-painel .cfs-atencao') || {}).textContent || '');
    ok(/Parece conta fixa: .*~R\$ 2\.261,67 · todo dia ~10\./.test(card.replace(/\s+/g, ' ')) && /Revisar/.test(card) && /Não acompanhar/.test(card), 'no Painel, em "Precisa da sua atenção": "Parece conta fixa: … · ~R$ 2.261,67 · todo dia ~10." com "Revisar" e "Não acompanhar"');
    await p.locator('#view-b-painel .cfs-atencao [data-acao="cfs-revisar"]').first().click(); await p.waitForTimeout(200);
    const form = await p.evaluate(() => ({ aberto: !document.getElementById('genModal').classList.contains('hidden'), v: (document.getElementById('cfrV') || {}).value }));
    ok(form.aberto && /^2261\.67$/.test(form.v), '"Revisar" abre a janela já preenchida (valor médio, nome editável)');
    await p.evaluate(() => fechar('genModal'));
    const antes = await p.evaluate(() => ContasMes.sugestoes().length);
    await p.locator('#view-b-painel .cfs-atencao [data-acao="cfs-nao"]').first().click(); await p.waitForTimeout(150);
    ok(await p.evaluate(() => ContasMes.sugestoes().length) === antes - 1, '"Não acompanhar": sai e não volta');
    await p.reload(); await p.waitForFunction(() => typeof ContasMes !== 'undefined' && Store.estado);
    ok(await p.evaluate(() => { ContasMes._hoje = '2026-11-15'; return ContasMes.sugestoes().length; }) === antes - 1, 'nem depois de recarregar');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
