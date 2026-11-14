/* =====================================================================
   teste/teste-idioma-es.js — 3.89: a estrutura para 3 idiomas (PT, EN e ES da Espanha), com o ES ESCONDIDO.
   Confere: ?lang=es liga o espanhol só nesta aba (não vai para o seletor, nem para o localStorage, nem para a nuvem);
   I18n.tr/de/t: o que tem ES aparece em ES, o que não tem cai no EN (e sem EN, no PT); o Verter usa FRASES_ES e cai no
   FRASES_EN; os módulos (tr(pt, en, es) e pt()) seguem; datas nos 3 (18/Set/2026 · Sep/18/2026 · 18/sep/2026); número em
   es-ES; o seletor de ⚙ só mostra PT e EN (o ES só enquanto é o atual, para dar para sair); a varredura conta o que falta
   em ES por tela; ?lang=pt volta. PT e EN idênticos ao main é a fumaça (teste-fumaca-telas.js) que confere.
   Uso: node teste/teste-idioma-es.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false }, posicoes: [], recorrentes: [], gastos: [{ id: 'g1', data: '2026-10-05', valor: 50, grupo: 'PESSOAL', sub: 'Outros', desc: 'LOJA FICTICIA', fluxo: 'saida' }] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!localStorage.getItem('investifyme.dados.v1')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    const pronto = () => p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && typeof I18n !== 'undefined' && typeof MoneyModulos !== 'undefined');

    console.log('1) PT por padrão; ?lang=es liga o espanhol escondido');
    await p.goto(BASE + '/'); await pronto();
    ok(await p.evaluate(() => I18n.atual === 'pt' && I18n.visiveis().join() === 'pt,en' && IDIOMAS.es.oculto === true && IDIOMAS.es.locale === 'es-ES'), 'abre em PT; o seletor só conhece PT e EN; o ES existe escondido (es-ES)');
    await p.goto(BASE + '/?lang=es'); await pronto();
    const e1 = await p.evaluate(() => ({ atual: I18n.atual, lang: document.documentElement.lang, ls: localStorage.getItem(CHAVE_IDIOMA), cfg: ST.config.idioma || '', vis: I18n.visiveis().join() }));
    ok(e1.atual === 'es' && e1.lang === 'es-ES' && e1.ls !== 'es' && e1.cfg !== 'es' && e1.vis === 'pt,en,es', '?lang=es: espanhol nesta aba (html lang es-ES); não fica no localStorage nem no ST.config (não sobe para a nuvem); o seletor mostra o ES só por ser o atual: ' + JSON.stringify(e1));
    await p.reload(); await pronto();
    ok(await p.evaluate(() => I18n.atual === 'es'), 'ao recarregar a aba, continua no teste em espanhol');

    console.log('2) o caminho único: ES onde existir, EN onde não');
    const e2 = await p.evaluate(() => {
      TEXTOS['teste.es'] = { pt: 'Olá', en: 'Hello', es: 'Hola' }; TEXTOS['teste.sem'] = { pt: 'Só português' };
      return [I18n.tr('Olá', 'Hello', 'Hola'), I18n.tr('Olá', 'Hello'), I18n.tr('Olá'), I18n.de({ pt: 'a', en: 'b', es: 'c' }), I18n.de({ pt: 'a', en: 'b' }), t('teste.es'), t('nav.painel'), t('teste.sem')];
    });
    ok(e2.join('|') === 'Hola|Hello|Olá|c|b|Hola|Dashboard|Só português', 'tr/de/t: com ES → ES; sem ES → EN; sem EN → PT: ' + e2.join('|'));
    const e3 = await p.evaluate(() => { FRASES_ES['Lançamentos'] = 'Movimientos'; return [Verter.txt('Lançamentos'), Verter.txt('Colar print, Dividir e Loja nova'), Verter.html('<b>Lançamentos</b><i>Colar print, Dividir e Loja nova</i>')]; });
    ok(e3[0] === 'Movimientos' && e3[1] === 'Paste a screenshot, Split and New store' && e3[2] === '<b>Movimientos</b><i>Paste a screenshot, Split and New store</i>', 'o Verter: FRASES_ES onde existe, o inglês onde não: ' + JSON.stringify(e3));
    const mod = await p.evaluate(() => { const r = []; const src = [...document.scripts].map((s) => s.src).filter((s) => /modulos\/contas-mes/.test(s)); return src.length; });
    ok(mod === 1, 'os módulos carregam com o tr(pt, en, es)');

    console.log('3) datas e números nos 3 idiomas');
    const d = await p.evaluate(() => { const out = {}; ['pt', 'en', 'es'].forEach((l) => { I18n.atual = l; out[l] = [I18n.data('2026-09-18'), I18n.data('2026-11-17', { semAno: true }), I18n.mesAno('2026-11'), I18n.mesLongo(11), I18n.diaSemana(3), I18n.num(1234.5, 2), I18n.quando(hojeISO().slice(0, 8) + '01') ]; }); I18n.atual = 'es'; return out; });
    ok(d.pt.slice(0, 3).join() === '18/Set/2026,17/Nov,Nov/2026' && d.en.slice(0, 3).join() === 'Sep/18/2026,Nov/17,Nov/2026' && d.es.slice(0, 3).join() === '18/sep/2026,17/nov,nov/2026', 'datas: 18/Set/2026 · Sep/18/2026 · 18/sep/2026 (o mês em minúsculas no espanhol): ' + JSON.stringify([d.pt[0], d.en[0], d.es[0]]));
    ok(d.es[3] === 'noviembre' && d.es[4] === 'mié' && d.pt[5] === '1.234,50' && d.en[5] === '1,234.50' && /1234,50|1\.234,50/.test(d.es[5]), 'mês longo, dia da semana e número em es-ES: ' + JSON.stringify([d.es[3], d.es[4], d.es[5]]));

    console.log('4) as telas em espanhol de teste: o que não tem ES aparece em inglês');
    await p.evaluate(() => { abrirApp('budget'); irPara('b-lanc'); render(); });
    const t4 = await p.evaluate(() => document.getElementById('view-b-lanc').innerText);
    ok(/Movimientos/.test(t4) && !/Lançamentos/.test(t4), 'Lançamentos em espanhol (a frase com ES) e o resto em inglês, nada em português nas frases do app');
    await p.evaluate(() => { irPara('config'); render(); });
    const t5 = await p.evaluate(() => ({ chips: [...document.querySelectorAll('[data-idioma]')].map((x) => x.dataset.idioma).join(), varre: ((document.getElementById('view-config') || document.body).textContent.match(/Español \(prueba\):.*?sin traducir \(en inglés\)/) || [''])[0] }));
    ok(t5.chips === 'pt,en,es' && /\d+\/\d+ claves · \d+\/\d+ frases · /.test(t5.varre) && /b-lanc: \d+/.test(t5.varre), 'a varredura em ⚙ conta o que falta em espanhol, por tela: ' + t5.varre);

    console.log('5) ?lang=pt volta (e o PT/EN não mostra nada do ES)');
    await p.goto(BASE + '/?lang=pt'); await pronto();
    await p.evaluate(() => { irPara('config'); render(); });
    const t6 = await p.evaluate(() => ({ atual: I18n.atual, chips: [...document.querySelectorAll('[data-idioma]')].map((x) => x.dataset.idioma).join(), es: /Español/.test((document.getElementById('view-config') || {}).textContent || '') }));
    ok(t6.atual === 'pt' && t6.chips === 'pt,en' && !t6.es, '?lang=pt: volta ao português; o seletor só PT e EN; nenhuma linha do espanhol: ' + JSON.stringify(t6));
    await p.evaluate(() => I18n.definir('en'));
    ok(await p.evaluate(() => I18n.atual === 'en' && localStorage.getItem(CHAVE_IDIOMA) === 'en' && t('nav.painel') === 'Dashboard' && I18n.data('2026-09-18') === 'Sep/18/2026'), 'em inglês, tudo como antes (guardado como sempre)');
    ok(p.erros.length === 0, 'sem erro de página' + (p.erros.length ? ': ' + p.erros[0] : ''));
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
