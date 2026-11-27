/* =====================================================================
   teste/teste-consumo.js — 3.120: consumo de luz e gás dentro da categoria (modulos/consumo.js) e o "⛔ não pague" que não pode
   aparecer quando o robô diz que a conta NÃO está no débito automático. Dados FICTÍCIOS (concessionária, valores e consumo inventados).
   Uso: node teste/teste-consumo.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos: [],
  recorrentes: [{ id: 'r-luz', nome: 'Luz Ficticia', valor: 180, dia: 20, regra: 'dia', desde: '2026-01-20', grupo: 'HABITACAO', sub: 'Energia', fluxo: 'saida', estadoPadrao: 'automatico', forma: 'debaut', criadoEm: '2026-01-01' }] };
const FICHA = { consumo_kwh: 250, dias: 30, referencia: '2026-10', bandeira: 'amarela', tarifa_kwh: 0.92, multa: 2.5, juros: 1.2, cosip: 15, sem_debito_automatico: true,
  historico_kwh: [{ mes: '2026-06', kwh: 300, dias: 30 }, { mes: '2026-07', kwh: 280, dias: 31 }, { mes: '2026-08', kwh: 260, dias: 31 }, { mes: '2026-09', kwh: 240, dias: 30 }, { mes: '2026-10', kwh: 250, dias: 30 }] };

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
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.clock.setFixedTime(new Date('2026-11-19T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.Consumo && window.Comprovantes);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-painel'); render(); });

    console.log('1) a conta de luz que NÃO está no débito automático: nunca "⛔ não pague"');
    const nao = await p.evaluate((f) => {
      Comprovantes.receber({ id: 'cp-luz-1', subtipo: 'fatura', loja: 'Luz Ficticia', valor: 180, data: '2026-11-05', vencimento: '2026-11-20', debito_automatico: false, ficha: f });
      const g = inboxGrupos().find((x) => x.id === 'comprovantes'); return (g && g.html || '').replace(/<[^>]+>/g, ' ');
    }, FICHA);
    ok(/Luz Ficticia/.test(nao) && !/não pague/i.test(nao), 'o 📥 mostra a conta de luz e NÃO diz "não pague" (o robô disse sem débito automático), mesmo com a conta fixa marcada em débito');
    const com = await p.evaluate(() => { Comprovantes.receber({ id: 'cp-luz-2', subtipo: 'fatura', loja: 'Luz Ficticia', valor: 181, data: '2026-11-05', vencimento: '2026-11-21' }); const g = inboxGrupos().find((x) => x.id === 'comprovantes'); return (g && g.html || '').replace(/<[^>]+>/g, ' '); });
    ok(/não pague/i.test(com), 'controle: sem essa informação, a conta em débito automático continua com "⛔ não pague"');
    await p.evaluate(() => { const l = Comprovantes.lista(); l.splice(l.findIndex((x) => x.id === 'cp-luz-2'), 1); });

    console.log('2) o consumo no detalhe do lançamento que pagou a conta');
    const c = await p.evaluate(() => { Gasto.add({ id: 'rb_luz', data: '2026-11-20', valor: 180, desc: 'LUZ FICTICIA', fluxo: 'saida', grupo: 'HABITACAO', sub: 'Energia', origem: 'robo', conta: 'Itau' }); Comprovantes.ligarTudo();
      const x = Comprovantes.lista().find((y) => y.id === 'cp-luz-1'); const g = Gasto.todos().find((y) => y.id === 'rb_luz');
      const d = document.createElement('div'); d.innerHTML = MoneyModulos.html('lancamento.form', { g }); const b0 = d.querySelector('.cs-bloco');
      return { pago: x.pagoId, txt: b0 ? b0.textContent.replace(/\s+/g, ' ') : '', barras: b0 ? b0.querySelectorAll('.cs-col').length : 0, atual: b0 ? !!b0.querySelector('.cs-col.cs-atual') : false }; });
    ok(c.pago === 'rb_luz', 'a conta liga ao pagamento do banco (o mesmo valor, no vencimento)');
    ok(/⚡ 250 kWh em 30 dias \(8,3 kWh\/dia\) · ref\. 10\/2026/.test(c.txt), 'detalhe: "⚡ 250 kWh em 30 dias (8,3 kWh/dia) · ref. 10/2026": ' + c.txt.slice(0, 120));
    ok(/↓ 7% contra a média dos meses anteriores \(270 kWh\)/.test(c.txt), 'a comparação com a média dos meses anteriores (270 kWh → −7%)');
    ok(/bandeira amarela · tarifa R\$\s?0,92\/kWh · multa R\$\s?2,50 · juros R\$\s?1,20 · COSIP R\$\s?15,00/.test(c.txt), 'a bandeira, a tarifa por kWh, a multa, os juros e a COSIP');
    ok(c.barras === 5 && c.atual, 'o histórico dos meses em barrinhas, com o mês da conta destacado');

    console.log('3) na linha da categoria (Fluxo › Por categoria, este mês)');
    await p.evaluate(() => { irPara('b-fluxo'); render(); }); await p.waitForTimeout(150);
    const fl = await p.evaluate(() => { const r = [...document.querySelectorAll('#fluxoCat .fc-cat')].find((x) => /Energia/.test(x.textContent)); return r ? (r.querySelector('.cs-linha') || {}).textContent || '' : 'sem linha'; });
    ok(/⚡ 250 kWh · −7% contra a média/.test(fl), 'Energia: "⚡ 250 kWh · −7% contra a média": ' + fl);

    console.log('4) o gás (NF-e): m³, kg e o período');
    const gas = await p.evaluate(() => { const c0 = Consumo.de({ ficha: { consumo_m3: 12.5, consumo_kg: 9.4, periodo: '05/10/2026 a 04/11/2026' } }); const d = document.createElement('div'); d.innerHTML = Consumo.bloco(c0); return d.textContent.replace(/\s+/g, ' '); });
    ok(/Consumo de gás\s?🔥 12,5 m³ · 9,4 kg · 05\/10\/2026 a 04\/11\/2026/.test(gas), 'gás: "🔥 12,5 m³ · 9,4 kg · período": ' + gas);
    ok(await p.evaluate(() => Consumo.de({ ficha: { x: 1 } }) === null && Consumo.de({}) === null), 'sem consumo na ficha: nada');
    ok(await p.evaluate(() => { const x = Comprovantes.lista().find((y) => y.id === 'cp-luz-1'); return JSON.stringify(x.ficha).length < 2000 && typeof x.ficha.historico_kwh[0].kwh === 'number'; }), 'a ficha guardada é só dado simples e limitado');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
