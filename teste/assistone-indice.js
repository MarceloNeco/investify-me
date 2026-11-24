/* =====================================================================
   teste/assistone-indice.js — 3.106: a busca do AssistONE acha o próprio app (modulos/assistone-indice.js 1.0.0)
   ---------------------------------------------------------------------
   Diretriz geral: "O AssistONE conhece TUDO o que o app tem". Confere:
     1. "pin", "celular", "aparelho", "digital", "cartão", "OS" dão resultados "No app", e "No app" vem antes do Coach e do glossário;
     2. toda tela com ajuda (AJUDA_TELAS e as telas dos módulos) é achada por uma palavra do título;
     3. sem acento ("cartao" = "cartão"), e em EN e ES;
     4. o resultado leva à tela ("Material escolar" abre a tela) ou à ação ("Criar o PIN da conta", sem conta na nuvem, abre o
        passo a passo "PIN da conta e aparelho novo"); Configurações, Tutorial e Novidades também entram.
   Nome do arquivo combinado com o chat principal: quando o master assistone.js 1.3 sair (pendência #153 do RootifyONE), este
   teste é trocado pela cópia do master. Dados fictícios. Uso: node teste/assistone-indice.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], gastos: [], recorrentes: [], cartoes: [{ id: 'c1', apelido: 'Cartao Ficticio', bandeira: 'master', fim: '1234', vence: 10, fecha: 3 }] };

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
    const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
    await p.clock.setFixedTime(new Date('2026-11-24T12:00:00-03:00'));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.AssistIndice);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); abrirApp('budget'); irPara('b-painel'); render(); });
    const buscarNaTela = (q) => p.evaluate((x) => { assistBusca = x; Assist.abrir('buscar'); const r = document.querySelector('#asResultados');
      const cards = [...r.querySelectorAll('.card')].map((c) => (c.querySelector('h3') || {}).textContent || '');
      return { cards, app: [...r.querySelectorAll('#aiNoApp .res-t')].map((e) => e.textContent) }; }, q);

    console.log('1) as palavras do dia a dia dão "No app" primeiro');
    for (const q of ['pin', 'celular', 'aparelho', 'digital', 'cartão', 'OS']) {
      const r = await buscarNaTela(q);
      ok(r.cards[0] === 'No app' && r.app.length > 0, '"' + q + '": "No app" primeiro (' + r.app.length + ': ' + r.app.slice(0, 3).join(' | ') + ')');
    }
    ok((await buscarNaTela('cartão')).app.slice(0, 3).some((t) => /cartões/i.test(t)), '"cartão": a seção "Bancos e cartões" vem entre as primeiras (o plural "-ões" também casa)');
    const pin = await buscarNaTela('pin');
    ok(pin.app.some((t) => /Criar o PIN da conta \(opcional\)/.test(t)) && pin.app.some((t) => /PIN da conta e aparelho novo/.test(t)) && pin.app.some((t) => /Esqueci o PIN/.test(t)), '"pin": criar, esqueci e o passo a passo do aparelho novo');
    ok((await buscarNaTela('OS')).app.some((t) => /Foto de nota ou recibo/.test(t)), '"OS": acha "Foto de nota ou recibo" (OS da oficina)');
    ok((await buscarNaTela('6 numeros')).app.some((t) => /Pedido de acesso/.test(t)), '"6 numeros": "Aprovar um aparelho novo (Pedido de acesso)"');
    const dv = await buscarNaTela('dividendo');
    ok(dv.cards.indexOf('No app') <= 0 && dv.cards.some((c) => /Coach|glossário/.test(c)), '"dividendo": o Coach e o glossário continuam aparecendo');

    console.log('2) toda tela com ajuda é achada por uma palavra do título');
    const faltam = await p.evaluate(() => {
      const telas = Object.keys(AJUDA_TELAS).filter((v) => v !== 'hub').map((v) => [v, AJUDA_TELAS[v].pt.t])
        .concat(MoneyModulos.telas().filter((x) => x.info && x.info.ajuda).map((x) => [x.id, x.info.ajuda.pt.t]));
      const sem = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      return { n: telas.length, faltam: telas.filter(([v, t]) => { const w = sem(t).split(/[^a-z0-9]+/).filter((x) => x.length >= 4).sort((a, b) => b.length - a.length)[0] || sem(t);
        return !AssistIndice.buscar(w).some((it) => it.v === v); }).map(([v, t]) => v + ' (' + t + ')') };
    });
    ok(faltam.n > 20 && !faltam.faltam.length, faltam.n + ' telas, todas achadas pela palavra mais longa do título' + (faltam.faltam.length ? ' — faltam: ' + faltam.faltam.join(', ') : ''));
    const fontes = await p.evaluate(() => { const o = {}; AssistIndice.itens().forEach((it) => { o[it.onde.replace(/ .*/, '')] = (o[it.onde.replace(/ .*/, '')] || 0) + 1; }); return o; });
    ok(fontes['Configurações'] > 5 && fontes['Tutorial'] >= 5 && fontes['Começar'] >= 5 && fontes['Novidades'] > 20 && fontes['Conta'] >= 10 && fontes['Menu'] > 10, 'as fontes: ' + JSON.stringify(fontes));

    console.log('3) sem acento, EN e ES');
    ok(JSON.stringify((await buscarNaTela('cartao')).app) === JSON.stringify((await buscarNaTela('cartão')).app), '"cartao" = "cartão"');
    await p.evaluate(() => { I18n.atual = 'en'; });
    const en = await buscarNaTela('device');
    ok(en.cards[0] === 'In the app' && en.app.some((t) => /Approve a new device/.test(t)), 'EN: "device" → "In the app": "Approve a new device (Access request)"');
    await p.evaluate(() => { I18n.atual = 'es'; });
    const es = await buscarNaTela('dispositivo');
    ok(es.cards[0] === 'En la app' && es.app.some((t) => /Aprobar un dispositivo nuevo/.test(t)), 'ES: "dispositivo" → "En la app": "Aprobar un dispositivo nuevo"');
    await p.evaluate(() => { I18n.atual = 'pt'; });

    console.log('4) o resultado leva à tela ou à ação');
    await buscarNaTela('material escolar');
    await p.click('#aiNoApp .res-item >> text=Material escolar');
    await p.waitForTimeout(200);
    ok(await p.evaluate(() => document.querySelector('#view-b-material') && !document.querySelector('#view-b-material').classList.contains('hidden') && document.querySelector('#assistModal').classList.contains('hidden')), '"Material escolar" abre a tela e fecha o AssistONE');
    await buscarNaTela('pin');
    await p.click('#aiNoApp .res-item >> text=Criar o PIN da conta');
    await p.waitForSelector('#nvAjPinPassos', { timeout: 5000 }).catch(() => {});
    ok(!!(await p.$('#nvAjPinPassos')), 'sem conta na nuvem, "Criar o PIN da conta" abre o passo a passo "PIN da conta e aparelho novo"');
    await p.click('#nvAjPinOk');
    await buscarNaTela('idioma');
    const cfg = await p.evaluate(() => [...document.querySelectorAll('#aiNoApp .res-item')].map((e) => e.textContent));
    ok(cfg.some((t) => /Configurações/.test(t)), '"idioma": uma seção de Configurações');
    await p.evaluate(() => { const el = [...document.querySelectorAll('#aiNoApp .res-item')].find((e) => /Configurações/.test(e.textContent)); el.click(); });
    await p.waitForTimeout(300);
    ok(await p.evaluate(() => !document.querySelector('#view-config').classList.contains('hidden') && !!document.querySelector('#view-config .cfg-acc.aberta')), 'leva a Configurações, com a seção aberta');
    ok(!erros.length, 'sem erro na página ' + erros.join(' | '));
  } finally { await b.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
