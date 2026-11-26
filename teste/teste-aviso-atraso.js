/* teste/teste-aviso-atraso.js — 3.128: o aviso de atraso marcado pelo robô (ficha.aviso_atraso + fornecedor_aviso) vira alerta urgente
   ligado à conta fixa do fornecedor; encaminhado pela própria pessoa, só informa. Dados FICTÍCIOS. */
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
      JSON.stringify({ v: 1, config: { fitaLigada: false }, posicoes: [], gastos: [],
        recorrentes: [{ id: 'r-agua', nome: 'Agua Ficticia', valor: 95, dia: 15, regra: 'dia', desde: '2026-01-15', grupo: 'HABITACAO', sub: 'Água', fluxo: 'saida', estadoPadrao: 'pendente', criadoEm: '2026-01-01' }] }));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.clock.setFixedTime(new Date('2026-11-20T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.DebitoNaoCaiu && window.Comprovantes);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); });
    const li = () => p.evaluate(() => { const g = inboxGrupos().find((x) => x.id === 'atrasadas'); const d = document.createElement('div'); d.innerHTML = (g && g.html) || ''; return [...d.querySelectorAll('.dnc-email')].map((x) => ({ txt: x.textContent.replace(/\s+/g, ' '), info: x.classList.contains('dnc-info'), urg: /var\(--down\)/.test(x.getAttribute('style') || '') })); });
    await p.evaluate(() => Comprovantes.receber({ id: 'av-agua', subtipo: 'outro', remetente: 'atendimento@exemplo.invalid', assunto: 'Comunicado', valor: 95, vencimento: '2026-10-15', ficha: { aviso_atraso: true, fornecedor_aviso: 'Agua Ficticia' } }));
    const a = await li();
    ok(a.length === 1 && a[0].urg && !a[0].info && /Aviso de atraso por e-mail: Agua Ficticia/.test(a[0].txt), 'aviso do robô (sem a palavra "atraso" no assunto): alerta urgente ligado à conta fixa "Agua Ficticia": ' + (a[0] && a[0].txt.slice(0, 90)));
    ok(/R\$\s?95,00 · vence 15\/Out\/2026/.test(a[0] && a[0].txt), 'com o valor e a data');
    await p.evaluate(() => { Comprovantes.lista().find((x) => x.id === 'av-agua').estado = 'dispensado';
      Comprovantes.receber({ id: 'av-agua-2', subtipo: 'outro', remetente: 'eu@exemplo.invalid', assunto: 'Fwd: aviso', valor: 95, vencimento: '2026-10-15', ficha: { aviso_atraso: true, fornecedor_aviso: 'Agua Ficticia', encaminhado_pela_pessoa: true } }); });
    const b2 = await li();
    ok(b2.length === 1 && b2[0].info && !b2[0].urg && /Você encaminhou o aviso de atraso: Agua Ficticia/.test(b2[0].txt) && /confira se já foi pago/.test(b2[0].txt), 'encaminhado pela própria pessoa: só informa, sem o alarme vermelho');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
