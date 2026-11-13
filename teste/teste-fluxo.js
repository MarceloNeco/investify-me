/* =====================================================================
   teste/teste-fluxo.js — 3.69: o Fluxo com o patrimônio de verdade (pedido do dono). Dados fictícios.
   Confere: com fotos (o patrimônio real nos meses com foto e hoje; a estimativa tracejada de trás para frente com
   P(m−1) = P(m) − (entrou(m) − gastou(m)); o aporte não muda o patrimônio estimado; área "dos quais investido");
   a foto do mês (no máximo 1 vez por dia); a barra de aporte separada do gasto e a renda extraordinária em amarelo;
   o saldo do mês = entrou − gastou; os quadrados do topo; sem fotos: só a estimativa e o aviso; a visão da casa sem
   patrimônio nem investimento (linha, área, quadrado e balão). Fotos em /tmp/fluxo-*.png (1366 e 390, dois temas).
   Uso: node teste/teste-fluxo.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const hoje = new Date(), ano = hoje.getFullYear(), mesAtual = hoje.getMonth() + 1;
const mm = (k) => { let y = ano, x = mesAtual - k; while (x < 1) { x += 12; y--; } return y + '-' + String(x).padStart(2, '0'); };
const gastos = [];
for (let k = 5; k >= 0; k--) {
  gastos.push({ id: 'e' + k, data: mm(k) + '-01', valor: 10000, grupo: 'RENDA', sub: 'Salário', desc: 'SALARIO EXEMPLO', fluxo: 'entrada' });
  gastos.push({ id: 's' + k, data: mm(k) + '-02', valor: 6000, grupo: 'HABITACAO', sub: 'Aluguel', desc: 'ALUGUEL EXEMPLO', fluxo: 'saida' });
  gastos.push({ id: 'a' + k, data: mm(k) + '-03', valor: 2000, grupo: 'INVESTIMENTO', sub: 'Aplicação', desc: 'APLICACAO CDB', fluxo: 'aplicacao' });
}
gastos.push({ id: 'resc', data: mm(3) + '-20', valor: 5000, grupo: 'RENDA', sub: 'Rescisão', desc: 'RESCISAO EXEMPLO', fluxo: 'entrada' });
const posicoes = [{ id: 'p1', ticker: 'CDB X', nome: 'CDB Exemplo', tipo: 'rf', inst: 'Banco Exemplo', qtd: 1, pm: 100000, moeda: 'BRL' }];
const fotos = [[mm(2) + '-10', 96000, 90000], [mm(2) + '-28', 97000, 90000], [mm(1) + '-27', 99000, 92000]];
const COM = { v: 1, config: { fitaLigada: false }, posicoes, fotos, gastos, recorrentes: [] };
const SEM = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos, recorrentes: [] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  const novo = async (dados, vp, tema) => {
    const ctx = await b.newContext({ viewport: vp || { width: 1366, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); }, JSON.stringify(dados));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.ctx = ctx;
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof PatrimonioMes !== 'undefined');
    await p.evaluate((t) => { I18n.atual = 'pt'; ST.tema = t || 'dark'; aplicarTema(); Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); bFiltro.periodo = 'tudo'; bFiltro.de = ''; bFiltro.ate = ''; irPara('b-fluxo'); render(); }, tema);
    await p.waitForTimeout(300);
    return p;
  };
  const kpis = (p) => p.evaluate(() => [...document.querySelectorAll('#view-b-fluxo .kpi .lbl')].map((x) => x.textContent.replace(/\s*i$/, '').trim()));
  try {
    console.log('1) com a carteira e fotos');
    const p = await novo(COM);
    const r = await p.evaluate(() => {
      const serie = Gasto.serieMensal(bLista()), pat = PatrimonioMes.serie(serie), hojeP = patrimonioHoje();
      return { serie: serie.map((m) => ({ t: m.t, e: m.entrada, s: m.saida, a: m.aplicacao })), pat, hoje: hojeP && hojeP.valor, foto: (ST.patrimonio_mes || []).slice() };
    });
    const n = r.pat.length, u = r.pat[n - 1];
    ok(u.real && u.valor === r.hoje && r.hoje > 0, 'o último ponto é o patrimônio de hoje (' + r.hoje + ')');
    ok(r.pat[n - 2].real && r.pat[n - 2].valor === 99000 && r.pat[n - 3].real && r.pat[n - 3].valor === 97000, 'os meses com foto da carteira são reais (a última foto do mês: 97.000 e 99.000)');
    let coerente = true, semAporte = true;
    for (let i = 0; i < n - 3; i++) { const sob = r.serie[i + 1].e - r.serie[i + 1].s; if (r.pat[i].real || r.pat[i].valor !== r.pat[i + 1].valor - sob) coerente = false; if (r.pat[i].valor === r.pat[i + 1].valor - sob + r.serie[i + 1].a) semAporte = false; }
    ok(coerente, 'os meses antes da primeira foto são estimados de trás para frente: P(m−1) = P(m) − (entrou(m) − gastou(m))');
    ok(semAporte, 'o aporte (2.000 por mês) não muda o patrimônio estimado');
    ok(r.foto.length === 1 && r.foto[0].id === mm(0) && r.foto[0].valor === r.hoje, 'a foto do mês foi guardada (' + JSON.stringify(r.foto[0]) + ')');
    const dia = await p.evaluate(() => { const a = JSON.stringify(ST.patrimonio_mes); PatrimonioMes.registrar(); const b1 = JSON.stringify(ST.patrimonio_mes);
      const d = new Date(Date.now() + 86400000).toISOString().slice(0, 10); PatrimonioMes._hoje = d.slice(0, 7) === hojeISO().slice(0, 7) ? d : hojeISO(); const x = PatrimonioMes.registrar(); PatrimonioMes._hoje = null; return { igual: a === b1, em: x.em, n: ST.patrimonio_mes.length }; });
    ok(dia.igual && dia.n === 1, 'no mesmo dia não regrava; no dia seguinte do mesmo mês atualiza a mesma foto (vale a última do mês)');
    const g = await p.evaluate(() => { const v = document.getElementById('view-b-fluxo'); const d = JSON.parse(v.querySelector('.viz-duplo').dataset.meses);
      return { est: !!v.querySelector('.pat-est'), real: !!v.querySelector('.pat-real'), inv: !!v.querySelector('.pat-inv'), bola: !!v.querySelector('circle[fill="var(--accent)"]'),
        a: v.querySelectorAll('.col-a').length, s: v.querySelectorAll('.col-s').length, x: v.querySelectorAll('.col-x').length, leg: v.querySelector('.viz-leg').textContent, laranja: /Investido acumulado/.test(v.textContent), d }; });
    ok(g.est && g.real && !g.bola, 'linha cheia nos meses reais, tracejada nos estimados; a bolinha solta sumiu (virou o fim da linha)');
    ok(g.inv && /dos quais investido/.test(g.leg) && !g.laranja, 'área "dos quais investido" (há fotos da carteira); a linha laranja "Investido acumulado" saiu');
    ok(g.a === 6 && g.s === 6 && g.x === 1, 'barras separadas: 6 de gasto, 6 de "foi para investimento" e a renda extraordinária em amarelo (1)');
    ok(g.d.every((m) => m.s === 6000 && m.a === 2000) && /estimado \(sem rendimentos\)/.test(g.leg), 'o balão e a legenda: gastou 6.000 e foi para investimento 2.000, separados; "estimado (sem rendimentos)"');
    const bal = await p.evaluate(() => { const c = document.querySelector('#view-b-fluxo .dup-captura'), rc = c.getBoundingClientRect(); c.dispatchEvent(new MouseEvent('mousemove', { clientX: rc.left + 5, clientY: rc.top + 50, bubbles: true })); return document.querySelector('#view-b-fluxo .dup-balao').textContent; });
    ok(/Patrimônio \(estimado\)/.test(bal) && /Saldo do mês\s*R\$\s*4\.000,00/.test(bal.replace(/ /g, ' ')), 'o balão do 1º mês: patrimônio estimado e saldo do mês = entrou − gastou = 4.000 (' + bal.replace(/\s+/g, ' ').slice(0, 160) + ')');
    const k1 = await kpis(p);
    ok(k1[0] === 'Patrimônio de hoje' && k1.indexOf('Variação do patrimônio no período') === 1 && k1.indexOf('Sobrou no período') >= 0 && k1.indexOf('Foi para investimento') >= 0 && k1.indexOf('Acumulado no período') < 0,
      'quadrados: "Patrimônio de hoje" primeiro, "Variação do patrimônio", "Sobrou", "Foi para investimento"; o "Acumulado" saiu (' + k1.join(' | ') + ')');
    const sob = await p.evaluate(() => [...document.querySelectorAll('#view-b-fluxo .kpi')].find((k) => /Sobrou/.test(k.textContent)).querySelector('.val').textContent);
    ok(/29\.000,00/.test(sob), 'sobrou no período = entrou − gastou = 6 × 4.000 + 5.000 = 29.000 (o aporte não é gasto): ' + sob);
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
    await p.ctx.close();

    console.log('2) sem carteira e sem saldos');
    const q = await novo(SEM);
    const s2 = await q.evaluate(() => { const v = document.getElementById('view-b-fluxo'); const serie = Gasto.serieMensal(bLista()); const pat = PatrimonioMes.serie(serie);
      return { aviso: /Falta a carteira ou os saldos/.test(v.textContent), real: !!v.querySelector('.pat-real'), est: !!v.querySelector('.pat-est'), inv: !!v.querySelector('.pat-inv'), pat, serie: serie.map((m) => m.entrada - m.saida) }; });
    let acc = 0, cum = true; s2.pat.forEach((x, i) => { acc += s2.serie[i]; if (x.real || x.valor !== acc) cum = false; });
    ok(s2.aviso && !s2.real && s2.est && !s2.inv && cum, 'só a estimativa (do zero, somando o que sobrou), tracejada, com o aviso de que falta a carteira ou os saldos; sem área de investido');
    await q.ctx.close();

    console.log('3) visão da casa: sem patrimônio nem investimento');
    const c = await novo(COM);
    const vc = await c.evaluate(() => { Escopo.soCasa = () => true; render(); const v = document.getElementById('view-b-fluxo'); const d = JSON.parse(v.querySelector('.viz-duplo').dataset.meses);
      const cap = v.querySelector('.dup-captura'), rc = cap.getBoundingClientRect(); cap.dispatchEvent(new MouseEvent('mousemove', { clientX: rc.left + 5, clientY: rc.top + 50, bubbles: true }));
      return { pat: v.querySelectorAll('.pat-real, .pat-est, .pat-inv, .pat-p').length, a: v.querySelectorAll('.col-a').length, txt: v.textContent, chaves: Object.keys(d[0]).join(','), bal: v.querySelector('.dup-balao').textContent }; });
    ok(vc.pat === 0 && vc.a === 0, 'sem linha, sem área e sem barra de investimento');
    ok(!/Patrimônio|patrimônio|investimento|Investiu|investido/.test(vc.txt), 'nenhum quadrado, título, legenda ou tabela fala de patrimônio ou investimento');
    ok(vc.chaves === 't,e,x,s' && !/Patrimônio|investimento/.test(vc.bal), 'o balão também não (só entrou, extraordinária, gastou e saldo): ' + vc.chaves);
    await c.ctx.close();

    console.log('4) fotos');
    for (const [w, h] of [[1366, 900], [390, 844]]) for (const tema of ['dark', 'light']) {
      const f = await novo(COM, { width: w, height: h }, tema);
      const el = await f.$('#view-b-fluxo'); await el.screenshot({ path: '/tmp/fluxo-' + w + '-' + tema + '.png' });
      ok(f.erros.length === 0 && await f.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), w + ' ' + tema + ': sem erro e sem rolagem para o lado');
      await f.ctx.close();
    }
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
