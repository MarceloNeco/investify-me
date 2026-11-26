/* teste/teste-categoria-sugerida.js — 3.127: a categoria que o robô sugere pelo ITEM da compra (ficha.categoria_sugerida): "É isso?"
   com o item e o motivo; o "✓ É isso" classifica e vira regra (Espelho). Dados FICTÍCIOS. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } },
      JSON.stringify({ v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [], cartoes: [{ id: 'c1', apelido: 'Cartão Ficticio', bandeira: 'visa', fim: '1234', vence: 10, fecha: 3 }],
        gastos: [{ id: 'rb_fr', idRobo: 'fr', data: '2026-11-14', valor: 89.9, desc: 'LOJA AUTOPECAS FICT', descRobo: 'LOJA AUTOPECAS FICT', fluxo: 'saida', grupo: 'OUTROS', sub: 'Sem categoria', origem: 'robo', cartaoId: 'c1', finalCartao: '1234' }] }));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.clock.setFixedTime(new Date('2026-11-16T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.Comprovantes);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-painel'); render();
      window.__esp = []; if (window.Espelho) { const r0 = Espelho.registrar; Espelho.registrar = function (g, antes, opt) { __esp.push({ g: Object.assign({}, g), antes: antes && Object.assign({}, antes) }); return r0.apply(this, arguments); }; } });
    await p.evaluate(() => Comprovantes.receber({ id: 'cp-friso', subtipo: 'compra', loja: 'Loja Autopecas Fict', produto: 'Friso lateral cromado', valor: 89.9, data: '2026-11-14', final: '1234', confianca: 'alta',
      ficha: { categoria_sugerida: { grupo: 'VEICULO', categoria: 'Acessórios', confianca: 'palpite', motivo: 'pelo item: friso' } } }));
    const l = await p.evaluate(() => { abrirInbox(); const li = document.querySelector('#genModal [data-cp="cp-friso"]'); return { txt: li ? li.textContent.replace(/\s+/g, ' ') : '', btn: !!(li && li.querySelector('[data-acao="cp-cat"]')) }; });
    ok(/É isso\? Veículo › Acessórios \(pelo item: friso\) — item: Friso lateral cromado/.test(l.txt) && l.btn, 'o 📥 pergunta "É isso? Veículo › Acessórios (pelo item: friso)" mostrando o item: ' + l.txt.slice(0, 200));
    await p.click('#genModal [data-cp="cp-friso"] [data-acao="cp-cat"]'); await p.waitForTimeout(200);
    const g = await p.evaluate(() => { const x = Gasto.todos().find((y) => y.id === 'rb_fr'); return { cat: x.grupo + '|' + x.sub, conf: !!x.confirmadoEm, esp: __esp.map((e) => (e.antes && e.antes.sub) + '>' + e.g.sub).join(',') }; });
    ok(g.cat === 'VEICULO|Acessórios' && g.conf, '"✓ É isso" classifica o lançamento do banco: ' + g.cat);
    ok(/Sem categoria>Acessórios/.test(g.esp), 'a resposta vai para o Espelho como mudança de categoria (vira regra para o robô): ' + g.esp);
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
