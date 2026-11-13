/* =====================================================================
   teste/teste-painel-mes.js — 3.67: o Painel do BudgetONE sem mudar o layout (pedidos do dono, 13/Nov/2026)
   Confere: o período em cada bloco e o "por mês" pelos meses do período; "Para onde foi" × "As dez maiores contas"
   coerentes; drill-down grupo → categoria → lançamentos; a renda extraordinária (rescisão, FGTS, resgate) fora das
   médias e do "Mês a mês"; orçamento por categoria com alerta (80% e estouro); a projeção do mês.
   Fotos em /tmp/painel-mes-*.png (1366, 1920 e 390, nos dois temas). Dados fictícios.
   Uso: node teste/teste-painel-mes.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };

const hoje = new Date(), ano = hoje.getFullYear(), mesAtual = hoje.getMonth() + 1;
const mm = (m) => { let y = ano, x = m; while (x < 1) { x += 12; y--; } return y + '-' + String(x).padStart(2, '0'); };
const gastos = [];
for (let k = 11; k >= 0; k--) {
  const t = mm(mesAtual - k);
  gastos.push({ id: 'cond' + k, data: t + '-05', valor: 900, grupo: 'HABITACAO', sub: 'Condomínio', desc: 'CONDOMINIO', fluxo: 'saida' });
  gastos.push({ id: 'rest' + k, data: t + '-02', valor: 200, grupo: 'LAZER', sub: 'Restaurantes', desc: 'IFOOD TESTE', fluxo: 'saida' });
  gastos.push({ id: 'cine' + k, data: t + '-03', valor: 50, grupo: 'LAZER', sub: 'Cinema', desc: 'CINEMA TESTE', fluxo: 'saida' });
  gastos.push({ id: 'sal' + k, data: t + '-01', valor: 5000, grupo: 'RENDA', sub: 'Salário', desc: 'SALARIO TESTE', fluxo: 'entrada' });
}
gastos.push({ id: 'resc', data: mm(mesAtual - 4) + '-20', valor: 30000, grupo: 'RENDA', sub: 'Rescisão', desc: 'RESCISAO CONTRATO', fluxo: 'entrada' });
/* resgate de investimento (como o robô manda desde a 3.65.2): é a volta de um aporte, não renda nenhuma */
gastos.push({ id: 'rb_resg', data: mm(mesAtual - 2) + '-15', valor: -8000, grupo: 'INVESTIMENTO', sub: 'Resgate', desc: 'RESGATE PRIVILEGE', fluxo: 'aplicacao', resgate: true, origem: 'robo' });
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos, recorrentes: [] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  const novo = async (vp, tema) => {
    const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (d) => d.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof OrcamentoMes !== 'undefined');
    await p.evaluate((t) => { I18n.atual = 'pt'; ST.tema = t; aplicarTema(); Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); bAplicarPeriodo('12m'); irPara('b-painel'); render(); }, tema);
    return p;
  };
  try {
    const p = await novo({ width: 1366, height: 768 }, 'dark');
    console.log('1) período e coerência');
    const a = await p.evaluate(() => {
      const v = document.getElementById('view-b-painel'), txt = (s) => [...v.querySelectorAll(s)].map((x) => x.textContent.replace(/\s+/g, ' ').trim());
      const kpis = txt('.kpi'), per = txt('.pn-periodo'), cab = txt('.card-head h3');
      const linhas = [...v.querySelectorAll('table.tbl tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent.trim()));
      return { kpis, per, cab, linhas };
    });
    ok(/Entrou por mês\s*i?R\$ 5\.000,00/.test(a.kpis[0]) && /sem R\$ 30\.000,00 de renda extraordinária/.test(a.kpis[0]), '"Entrou por mês" = R$ 5.000,00, sem a rescisão de R$ 30.000 (dito embaixo): ' + a.kpis[0]);
    ok(/Saiu por mês\s*i?R\$ 1\.150,00/.test(a.kpis[1]) && /média de 12 meses/.test(a.kpis[1]), '"Saiu por mês" no mesmo período dos blocos (12 meses): ' + a.kpis[1]);
    ok(a.per.length >= 4 && a.per.filter((x) => /últimos 12 meses/i.test(x)).length >= 3, 'o período aparece no Painel e em cada bloco (' + a.per.length + ' rótulos)');
    const rest = a.linhas.find((l) => /Restaurantes/.test(l[0]));
    ok(rest && rest[1] === 'R$ 2.400,00' && rest[2] === 'R$ 200,00', '"As dez maiores contas": Restaurantes R$ 2.400,00 no período, R$ 200,00 por mês');
    /* mês atual: o "por mês" divide por 1, e o rótulo diz "mês atual" */
    const b1 = await p.evaluate(() => { bAplicarPeriodo('mes'); render();
      const v = document.getElementById('view-b-painel'); const tr = [...v.querySelectorAll('table.tbl tbody tr')].find((t) => /Restaurantes/.test(t.textContent));
      return { th: v.querySelector('table.tbl thead').textContent, cel: tr ? [...tr.children].map((td) => td.textContent.trim()) : null, per: v.querySelector('.pn-periodo').textContent };
    }).catch((e) => ({ erro: String(e) }));
    ok(b1.cel && b1.cel[1] === 'R$ 200,00' && b1.cel[2] === 'R$ 200,00' && /no mês/.test(b1.th) && /mês atual/i.test(b1.per), 'filtro "Mês atual": a tabela diz "no mês", e o "por mês" não divide por 12 (' + JSON.stringify(b1.cel) + ')');
    await p.evaluate(() => { bAplicarPeriodo('12m'); render(); });

    const rg = await p.evaluate(() => ({ extraResg: rendaExtra({ fluxo: 'entrada', grupo: 'RENDA', sub: 'Resgate', desc: 'RESGATE PRIVILEGE' }), extraInv: rendaExtra(Gasto.todos().find((g) => g.id === 'rb_resg')),
      entrada: Gasto.caixa(bLista()).entrada, fgts: rendaExtra({ fluxo: 'entrada', sub: 'FGTS', desc: 'SAQUE FGTS' }) }));
    ok(!rg.extraResg && !rg.extraInv && rg.fgts && rg.entrada === 90000, '"RESGATE PRIVILEGE" (investimento) não é renda nem renda extraordinária; FGTS é (entrada do período = 12 salários + a rescisão)');

    console.log('2) drill-down: grupo → categoria → lançamentos');
    await p.click('[data-pngrupo="LAZER"]'); await p.waitForTimeout(150);
    const d1 = await p.evaluate(() => [...document.querySelectorAll('.pn-sub')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
    ok(d1.length === 2 && /Restaurantes/.test(d1[0]) && /R\$ 2\.400,00/.test(d1[0]) && /Cinema/.test(d1[1]), 'Lazer abre as categorias: ' + d1.join(' | '));
    await p.click('[data-pnsub="Restaurantes"]'); await p.waitForTimeout(250);
    const d2 = await p.evaluate(() => ({ view: !document.getElementById('view-b-lanc').classList.contains('hidden'), g: bFiltro.grupos.join(), s: bFiltro.subs.join(), n: bLista().length, todos: bLista().every((g) => g.sub === 'Restaurantes') }));
    ok(d2.view && d2.g === 'LAZER' && d2.s === 'Restaurantes' && d2.n === 12 && d2.todos, 'Restaurantes leva aos lançamentos dela, no mesmo período (12 iFood)');
    await p.evaluate(() => { bFiltro.grupos = []; bFiltro.subs = []; irPara('b-painel'); render(); });

    console.log('3) renda extraordinária no "Mês a mês"');
    const mx = await p.evaluate(() => [...document.querySelectorAll('#view-b-painel .viz-div-row, #view-b-painel .div-row, #view-b-painel [class*="div"] .nm')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()).filter((t) => /extra/.test(t)));
    const txtMes = await p.evaluate(() => { const c = [...document.querySelectorAll('#view-b-painel .card')].find((x) => /Mês a mês/.test(x.textContent)); return c ? c.textContent.replace(/\s+/g, ' ') : ''; });
    ok(/★ Renda extraordinária \(rescisão, FGTS\), fora das barras: \d\d\/\d{4} \+R\$ 30\.000,00/.test(txtMes) && !/R\$ 33\.850/.test(txtMes) && /\+R\$ 3\.850,00/.test(txtMes), 'o mês da rescisão: a barra mostra o resultado recorrente (+R$ 3.850,00); a rescisão vem marcada (★) e listada embaixo, fora das barras');

    console.log('4) orçamento por categoria com alerta');
    await p.selectOption('#orcCat', 'LAZER|Restaurantes'); await p.fill('#orcLim', '240'); await p.click('[data-acao="orc-salvar"]'); await p.waitForTimeout(200);
    const o1 = await p.evaluate(() => { const c = document.querySelector('.orc'); return { t: c.textContent.replace(/\s+/g, ' '), cls: c.querySelector('.orc-linha').className, lim: ST.orcamentos.length }; });
    ok(o1.lim === 1 && /R\$ 200,00 \/ R\$ 240,00/.test(o1.t) && /orc-perto/.test(o1.cls), 'limite de R$ 240 em Restaurantes: R$ 200 no mês = 83%, "perto do limite" (' + o1.t.slice(0, 120) + ')');
    const o2 = await p.evaluate(() => { const ts = []; const orig = window.toast; window.toast = (m) => { ts.push(m); }; Gasto.add({ id: 'rest-extra', data: hojeISO(), valor: 60, grupo: 'LAZER', sub: 'Restaurantes', desc: 'IFOOD NOVO', fluxo: 'saida' }); window.toast = orig; Store.salvar(); render(); return { ts, cls: document.querySelector('.orc-linha').className, alerta: (document.querySelector('.orc-alerta') || {}).textContent || '' }; });
    ok(o2.ts.some((m) => /Restaurantes: estourou o limite do mês/.test(m)) && /orc-estourou/.test(o2.cls) && /Restaurantes 108%/.test(o2.alerta), 'lançamento novo passa do limite: aviso na hora ("' + (o2.ts[0] || '') + '") e a barra fica vermelha');

    console.log('5) projeção do mês');
    const pj = await p.evaluate(() => { const r = OrcamentoMes.projecao(); return { r, t: (document.querySelector('.orc-proj') || {}).textContent || '' }; });
    ok(pj.r.entra === 5000 && pj.r.saiAteHoje === 1210 && /Sobra prevista|Falta prevista/.test(pj.t), 'entra R$ 5.000 (sem a rescisão), saiu R$ 1.210 até hoje; o cartão diz a sobra ou a falta prevista');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
    await p.close();

    console.log('6) fotos');
    for (const [w, h] of [[1366, 768], [1920, 1080], [390, 844]]) for (const tema of ['dark', 'light']) {
      const q = await novo({ width: w, height: h }, tema);
      await q.evaluate(() => { OrcamentoMes.salvar('LAZER', 'Restaurantes', 240); OrcamentoMes.salvar('HABITACAO', 'Condomínio', 1000); painelGrupoAberto = 'LAZER'; render(); });
      await q.waitForTimeout(300);
      await q.screenshot({ path: '/tmp/painel-mes-' + w + '-' + tema + '.png', fullPage: true });
      ok(q.erros.length === 0 && await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), w + ' ' + tema + ': sem erro e sem rolagem para o lado');
      await q.close();
    }
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
