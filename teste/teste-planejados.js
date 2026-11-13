/* =====================================================================
   teste/teste-planejados.js — 3.76: menu do BudgetONE e Contas fixas → "Gastos planejados" (modulos/planejados.js,
   previsao.js 1.2.0). Dados FICTÍCIOS.
   Confere: a ordem do menu (sem Deslocamentos; Futuro → Projeção); o link antigo b-desloc leva a Gastos planejados;
   a tela vazia só com "Começar"; a rotina seg–sex dá os km/mês certos; a viagem 2×/ano vira provisão ÷ 12 no previsto do
   combustível; a viagem com data muda o mês dela e a provisão se ajusta; Viagens e eventos e Parcelados moram aqui.
   Uso: node teste/teste-planejados.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const gastos = [];
['08', '09', '10'].forEach((m) => { gastos.push({ id: 'c' + m, data: '2026-' + m + '-10', valor: 400, grupo: 'VEICULO', sub: 'Combustível', desc: 'POSTO EXEMPLO', fluxo: 'saida' }); });
const LOCAL = { v: 1, config: { fitaLigada: false, veiculo: { consumo: 10, precoLitro: 6, tanque: 50, tarifaPublico: 5 } }, posicoes: [], gastos, recorrentes: [] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    for (const vp of [{ width: 1366, height: 900 }, { width: 390, height: 800 }]) {
      console.log('tela ' + vp.width);
      const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
      const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e))); p.on('dialog', (x) => x.accept());
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof Planejados !== 'undefined');
      await p.evaluate(() => { I18n.atual = 'pt'; ST.config.assistOne = false; AssistOne.aplicar(); Planejados._hoje = '2026-11-15'; Previsao._hoje = '2026-11-15'; abrirApp('budget'); irPara('b-painel'); render(); });

      if (vp.width > 800) {
        console.log('1) o menu');
        const menu = await p.evaluate(() => [...document.querySelectorAll('#navLista .nav-item')].map((b) => b.dataset.view).join(','));
        ok(menu === 'b-painel,b-lanc,b-custos,b-renda,b-fluxo,b-futuro,b-precos,config', 'a ordem: Painel · Lançamentos · Contas fixas · Renda · Fluxo · Projeção · Preços · Configurações (sem Deslocamentos): ' + menu);
        ok(await p.evaluate(() => /Projeção/.test(document.querySelector('#navLista [data-view="b-futuro"]').textContent)), '"Futuro" agora se chama "Projeção" (o id b-futuro continua)');
      }
      console.log('2) o link antigo e a tela vazia');
      await p.evaluate(() => { irPara('b-desloc'); render(); });
      const v = await p.evaluate(() => ({ view: viewAtual, sec: custosSecao, parte: planejadosParte, vazio: !!document.querySelector('#view-b-custos .pl-vazio [data-acao="pl-comecar"]'), form: !!document.getElementById('plForm') }));
      ok(v.view === 'b-custos' && v.sec === 'planejados' && v.parte === 'carro' && v.vazio && !v.form, 'b-desloc → Contas fixas → Gastos planejados → Carro e deslocamentos; vazio, só o "Começar"');
      console.log('3) a rotina, o fim de semana e a viagem longa');
      await p.click('#view-b-custos [data-acao="pl-comecar"]');
      await p.fill('#plDeTxt', 'Casa Exemplo'); await p.fill('#plParaTxt', 'Escola Exemplo'); await p.fill('#plKm', '10');
      await p.click('[data-acao="pl-rotina"]'); await p.waitForTimeout(150);
      const r1 = await p.evaluate(() => { const t = Desloc.trajetos().find((x) => x.plano === 'rotina'); return { km: Planejados.kmMesRotina(t), dias: t.dias.join(), passo2: !!document.getElementById('plFdsKm') }; });
      ok(r1.km === 434.5 && r1.dias === '1,2,3,4,5' && r1.passo2, 'Casa → Escola, 10 km, seg–sex, ida e volta, 1× por dia = 434,5 km/mês (5 × 4,345 × 2 × 10); segue para o fim de semana');
      await p.fill('#plFdsKm', '60'); await p.fill('#plFdsN', '2'); await p.click('[data-acao="pl-fds"]'); await p.waitForTimeout(150);
      ok(await p.evaluate(() => Planejados.kmMesRotina(Desloc.trajetos().find((x) => x.plano === 'fds'))) === 120, 'fim de semana: 60 km × 2 por mês = 120 km/mês');
      await p.fill('#plVgDest', 'Cidade Exemplo'); await p.fill('#plVgKm', '300'); await p.fill('#plVgN', '2'); await p.fill('#plVgPed', '40');
      await p.click('[data-acao="pl-viagem"]'); await p.waitForTimeout(150);
      const vg = await p.evaluate(() => ({ c: Planejados.custoViagem(Planejados.viagens()[0]), prov: Planejados.provisaoMes('2026-11'), pv: Previsao.previstoMes('VEICULO', 'Combustível', '2026-12').evento }));
      ok(vg.c === 400 && vg.prov === 66.67 && vg.pv === 66.67, 'viagem 2×/ano, 300 km: 300 × 2 ÷ 10 × 6 + 40 = R$ 400 por viagem → provisão R$ 66,67/mês no previsto do combustível ' + JSON.stringify(vg));
      await p.evaluate(() => { Previsao.salvarEvento({ destino: 'Cidade Exemplo', de: '2026-12-20', ate: '2026-12-27', carro: true }); });
      const vg2 = await p.evaluate(() => ({ dez: Previsao.previstoMes('VEICULO', 'Combustível', '2026-12').evento, nov: Planejados.provisaoMes('2026-11') }));
      ok(vg2.dez === 360 + 33.33 && vg2.nov === 33.33, 'com a data (dez): dezembro recebe a viagem (360 de combustível pelo km cadastrado) e a provisão cai para 1 viagem restante (33,33) ' + JSON.stringify(vg2));
      await p.evaluate(() => render());
      const k = await p.evaluate(() => (document.querySelector('#view-b-custos .pl-kpis') || {}).textContent || '');
      ok(/Combustível\/mês previsto/.test(k) && /real: R\$ 400,00 \(média de 3 meses\)/.test(k), 'com dados, o quadro do topo compara o previsto com o real (média de 3 meses dos abastecimentos)');
      console.log('4) as outras partes');
      await p.click('#view-b-custos [data-parte="viagens"]'); await p.waitForTimeout(150);
      ok(await p.evaluate(() => /Viagens e eventos/.test((document.querySelector('#view-b-custos .pv-eventos') || {}).textContent || '') && /Cidade Exemplo/.test(document.querySelector('#view-b-custos .pv-eventos').textContent)), '"Viagens e eventos" mora aqui (e mostra a viagem com data)');
      await p.evaluate(() => { irPara('b-futuro'); render(); });
      ok(await p.evaluate(() => !document.querySelector('#view-b-futuro .pv-eventos') && !document.querySelector('#view-b-futuro .pc-card')), 'e saiu da Projeção (antes Futuro), junto com os parcelados');
      await p.evaluate(() => { irPara('b-custos'); custosSecao = 'contas'; render(); });
      ok(await p.evaluate(() => !document.querySelector('#view-b-custos .pl-partes')), 'a parte "Contas fixas" continua a tela de antes');
      ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
      await ctx.close();
    }
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
