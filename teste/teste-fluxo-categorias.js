/* =====================================================================
   teste/teste-fluxo-categorias.js — 3.118: Fluxo › "Por categoria" (previsto × realizado) e o ⓘ do previsto. Dados FICTÍCIOS.
   Confere: o cartão no fim do Fluxo, os grupos em destaque com as categorias em ordem alfabética; "Este mês" com barras de TODAS as
   categorias; "Últimos 6 meses" com a grade de 6 meses, as cores (verde < 80%, âmbar 80–100%, vermelho acima), o total do grupo, a
   linha "Passou do previsto no mês" e a célula que abre os lançamentos daquele mês e categoria; o filtro "só as que passaram" e
   "escolher categorias…" guardado por pessoa; o ⓘ (contas certas + média × peso × IPCA + meta) também no Painel; o salto
   ("Virou conta fixa?"); na Projeção, as categorias do grupo em ordem alfabética. Fotos em /tmp/fluxo-cat-*.png.
   Uso: node teste/teste-fluxo-categorias.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const G = [];
const add = (id, data, valor, grupo, sub, desc) => G.push({ id, data, valor, grupo, sub, desc: desc || sub.toUpperCase() + ' FICTICIA', fluxo: 'saida', origem: 'robo' });
['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'].forEach((m, i) => {
  add('mk' + i, m + '-05', 600, 'HABITACAO', 'Supermercado');
  add('fa' + i, m + '-08', 100, 'SAUDE', 'Farmácia');
  add('lu' + i, m + '-10', 200, 'HABITACAO', 'Energia'); G[G.length - 1].recorrenteId = 'r-luz';   /* a conta de luz ligada ao compromisso */
  add('ac' + i, m + '-12', 50, 'HABITACAO', 'Água');
});
add('fa-x', '2026-11-20', 150, 'SAUDE', 'Farmácia');           /* novembro passa do previsto da farmácia */
add('ia1', '2026-11-03', 3000, 'PESSOAL', 'IA e software', 'ASSINATURA IA FICTICIA');   /* o salto (sem histórico) */
add('ia0', '2026-09-03', 30, 'PESSOAL', 'IA e software', 'ASSINATURA IA FICTICIA');
const serie = (cod, ano) => ({ codigo: cod, nome: 'série ' + cod, ano, meses: [], ultimo: '01/10/2026', em: Date.now() });
const IPCA = JSON.stringify({ s433: serie(433, 4), s1636: serie(1636, 4), s1643: serie(1643, 6) });   /* IPCA fictício guardado: a Projeção não busca nada */
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos: G, orcamentos: [{ id: 'SAUDE|Farmácia', grupo: 'SAUDE', sub: 'Farmácia', limite: 180 }],
  recorrentes: [{ id: 'r-luz', nome: 'Luz Ficticia', valor: 200, dia: 10, regra: 'dia', desde: '2026-01-10', grupo: 'HABITACAO', sub: 'Energia', fluxo: 'saida', estadoPadrao: 'pendente', criadoEm: '2026-01-01' }] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    for (const vp of [{ width: 390, height: 844 }, { width: 1366, height: 900 }]) {
      const W = vp.width; console.log('tela ' + W);
      const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript(([t, ip]) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('investifyme.ipca.v1', ip); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, [JSON.stringify(LOCAL), IPCA]);
      const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
      await p.clock.setFixedTime(new Date('2026-11-25T12:00:00-03:00'));
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.FluxoCat && window.Previsao);
      await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-fluxo'); render(); });
      await p.waitForTimeout(200);

      const m1 = await p.evaluate(() => { const c = document.getElementById('fluxoCat'); if (!c) return null;
        return { grupos: [...c.querySelectorAll('.fc-grupo')].map((x) => x.textContent.replace(/[▾▸]/g, '').trim().split(/\s{2,}|R\$/)[0].trim()), hab: [...c.querySelectorAll('.fc-bloco')].find((x) => /Habitação/.test(x.textContent)), txt: c.textContent }; });
      ok(m1 && m1.grupos.length >= 3, W + ': o cartão "Por categoria" aparece no fim do Fluxo, com os grupos em destaque: ' + (m1 && m1.grupos.join(' / ')));
      const hab = await p.evaluate(() => [...[...document.querySelectorAll('#fluxoCat .fc-bloco')].find((x) => /Habitação/.test(x.querySelector('.fc-grupo').textContent)).querySelectorAll('.fc-cat-l > span:first-child')].map((x) => x.textContent));
      ok(hab.join(',') === 'Água,Energia,Supermercado', W + ': dentro do grupo, as categorias em ordem alfabética: ' + hab.join(','));
      const info = await p.evaluate(() => { const d = [...document.querySelectorAll('#fluxoCat .fc-cat')].find((x) => /Energia/.test(x.textContent)).querySelector('.pv-info'); d.open = true; return d.textContent; });
      ok(/contas certas R\$\s?200,00 \(compromissos e parcelas\)/.test(info) && /Previsto \(pelo histórico\)/.test(info), W + ': ⓘ da Energia: "Previsto (pelo histórico)" e "contas certas R$ 200,00 (compromissos e parcelas)"');
      const infoF = await p.evaluate(() => { const d = [...document.querySelectorAll('#fluxoCat .fc-cat')].find((x) => /Farmácia/.test(x.textContent)).querySelector('.pv-info'); d.open = true; return d.textContent; });
      ok(/média dos 6 meses fechados R\$\s?100,00/.test(infoF) && /Limite \(definido por você\): R\$\s?180,00/.test(infoF), W + ': ⓘ da Farmácia: a média dos 6 meses fechados e o "Limite (definido por você)"');
      const ia = await p.evaluate(() => { const d = [...document.querySelectorAll('#fluxoCat .fc-cat')].find((x) => /IA e software/.test(x.textContent)); return { txt: d.querySelector('.pv-info').textContent, fixa: !!d.querySelector('[data-acao="fc-fixa"]'), lim: !!d.querySelector('[data-acao="fc-limite"]'), cls: d.className }; });
      ok(ia.fixa && ia.lim && /fc-passou/.test(ia.cls), W + ': o salto (IA e software): vermelho, com "Virou conta fixa? Cadastrar" e "Definir limite"');
      if (W === 390) await p.screenshot({ path: '/tmp/fluxo-cat-mes-390.png', fullPage: true });

      await p.click('#fluxoCat [data-acao="fc-pref"][data-k="modo"][data-v="6m"]'); await p.waitForTimeout(150);
      const g = await p.evaluate(() => { const t = document.querySelector('#fluxoCat .fc-tbl'); if (!t) return null;
        const row = (rx) => [...t.querySelectorAll('tbody tr')].find((r) => rx.test(r.querySelector('th').textContent));
        const far = row(/^Farmácia$/), ths = [...t.querySelectorAll('thead th')].map((x) => x.textContent);
        const st = getComputedStyle(t.querySelector('tbody th.fc-col1'));
        return { meses: ths.length - 1, farNov: far && far.lastElementChild.className, farOut: far && far.children[5].className, passou: row(/Passou do previsto/).lastElementChild.textContent, sticky: st.position, gru: !!row(/Saúde/) }; });
      ok(g && g.meses === 6, W + ': "Últimos 6 meses": a grade tem 6 colunas de mês');
      ok(g && /fc-passou/.test(g.farNov) && /fc-perto|fc-ok/.test(g.farOut), W + ': as cores: Farmácia em novembro vermelha (passou), em outubro dentro do previsto: ' + (g && g.farNov + ' / ' + g.farOut));
      ok(g && /R\$/.test(g.passou) && g.gru, W + ': o total do grupo por mês e a linha "Passou do previsto no mês": ' + (g && g.passou));
      ok(g && g.sticky === 'sticky', W + ': a 1ª coluna fica fixa ao rolar para o lado');
      if (W === 390) await p.screenshot({ path: '/tmp/fluxo-cat-6m-390.png', fullPage: true });
      else await (await p.$('#fluxoCat')).screenshot({ path: '/tmp/fluxo-cat-6m-1366.png' });
      await p.click('#fluxoCat tbody tr:has(th:text-is("Farmácia")) td:last-child .fc-cel'); await p.waitForTimeout(200);
      const lf = await p.evaluate(() => ({ view: !document.getElementById('view-b-lanc').classList.contains('hidden'), f: bFiltro.subs.join() + '|' + bFiltro.de + '|' + bFiltro.ate }));
      ok(lf.view && lf.f === 'Farmácia|2026-11-01|2026-11-30', W + ': tocar na célula abre os lançamentos daquele mês e daquela categoria: ' + lf.f);

      await p.evaluate(() => { irPara('b-fluxo'); render(); }); await p.waitForTimeout(150);
      await p.click('#fluxoCat [data-acao="fc-pref"][data-k="mostrar"][data-v="passaram"]'); await p.waitForTimeout(150);
      const so = await p.evaluate(() => [...document.querySelectorAll('#fluxoCat tbody th.fc-sub')].map((x) => x.textContent).sort().join(','));
      ok(/Farmácia/.test(so) && /IA e software/.test(so) && !/Água/.test(so), W + ': "só as que passaram": ' + so);
      await p.click('#fluxoCat [data-acao="fc-pref"][data-k="mostrar"][data-v="escolher"]'); await p.waitForTimeout(150);
      await p.evaluate(() => { const c = document.querySelector('#fluxoCat [data-fc-cat="HABITACAO|Água"]'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(150);
      const esc = await p.evaluate(() => ({ cats: [...document.querySelectorAll('#fluxoCat tbody th.fc-sub')].map((x) => x.textContent).join(','), salvo: JSON.stringify(ST.config.fluxoCat) }));
      ok(esc.cats === 'Água' && /"escolhidas":\["HABITACAO\|Água"\]/.test(esc.salvo), W + ': "escolher categorias…": só a escolhida, guardada por pessoa: ' + esc.cats);
      await p.evaluate(() => { ST.config.fluxoCat = {}; });

      await p.evaluate(() => { irPara('b-painel'); render(); }); await p.waitForTimeout(150);
      ok(await p.evaluate(() => !!document.querySelector('.orc .pv-info')), W + ': o mesmo ⓘ no "Orçamento do mês" do Painel');

      await p.evaluate(() => { Orcamento._tentou = true; irPara('b-futuro'); render(); }); await p.waitForTimeout(200);
      const pj = await p.evaluate(() => { const b0 = [...document.querySelectorAll('.proj-g')].find((x) => /Habitação/.test(x.textContent)); if (!b0) return null; b0.click(); return true; });
      await p.waitForTimeout(200);
      const pj2 = await p.evaluate(() => { const l = [...document.querySelectorAll('.proj-tbl tr.proj-sub .proj-cat')].map((x) => x.textContent); const gr = document.querySelector('.proj-tbl tr.proj-grupo th'); return { l: l.join(','), peso: gr ? getComputedStyle(gr).fontWeight : '' }; });
      ok(pj && pj2.l === 'Água,Energia,Supermercado' && +pj2.peso >= 600, W + ': na Projeção, o grupo em destaque (negrito) e as categorias em ordem alfabética: ' + pj2.l);
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), W + ': sem rolagem da página para o lado (só a grade rola)');
      ok(p.erros.length === 0, W + ': sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
      await ctx.close();
    }
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
