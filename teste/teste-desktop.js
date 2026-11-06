/* =====================================================================
   teste/teste-desktop.js — layout no computador (N35, regra da plataforma)   3.58
   ---------------------------------------------------------------------
   Em 1280×720, 1366×768, 1920×1080 e 2560×1440 (e trocando a largura com a página aberta):
   · a barra lateral fica colada à esquerda da tela, ocupa a altura toda abaixo do topo e não passa do fim da tela;
   · o calendário do pé da barra aparece inteiro (dentro da tela);
   · a roda do mouse / dois dedos no touchpad em cima da lista do menu rola a lista (e não a página);
   · o conteúdo usa a largura que sobra (sem faixa vazia grande dos lados);
   · sem rolagem para o lado e sem erro de página;
   · 3.57: o calendário do menu recolhe numa etiqueta (teclado e toque), fica lembrado ao recarregar e abre de novo;
     o mesmo no celular (390×800, dentro do menu ☰);
   · 3.58: no celular, com o menu ☰ aberto, o selo "Entrar na nuvem" fica ao lado do menu (nunca em cima do calendário).
   Uso (na pasta raiz): node teste/teste-desktop.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const LOCAL = { v: 1, config: {}, posicoes: [], gastos: Array.from({ length: 80 }, (x, i) => ({ id: 'g' + i, data: '2026-10-' + String(1 + (i % 28)).padStart(2, '0'), valor: 100 + i, grupo: 'HABITACAO', sub: 'Energia', desc: 'LUZ ' + i, fluxo: 'saida' })),
  recorrentes: [{ id: 'r1', nome: 'Aluguel', valor: 2500, grupo: 'HABITACAO', sub: 'Aluguel', regra: 'dia', dia: 5 }] };

async function medir(p) {
  return p.evaluate(() => {
    const nav = document.getElementById('sidenav'), lista = document.getElementById('navLista'), cal = document.getElementById('navCal'), cont = document.getElementById('content');
    const rn = nav.getBoundingClientRect(), rc = cal.getBoundingClientRect(), rco = cont.getBoundingClientRect(), vista = document.querySelector('.view:not(.hidden)');
    const rv = vista ? vista.getBoundingClientRect() : rco;
    return { W: innerWidth, H: innerHeight, navL: Math.round(rn.left), navTop: Math.round(rn.top), navBot: Math.round(rn.bottom), calTop: Math.round(rc.top), calBot: Math.round(rc.bottom), calH: Math.round(rc.height),
      contL: Math.round(rco.left), contR: Math.round(rco.right), vistaW: Math.round(rv.width), listaRola: lista.scrollHeight > lista.clientHeight + 1,
      ovNav: getComputedStyle(nav).overflowY, scrollW: document.documentElement.scrollWidth };
  });
}


/* 3.57: o calendário do menu recolhe numa etiqueta e abre de novo; a escolha fica lembrada (recarregar) */
async function recolherAbrir(p, nome, antesDeMedir) {
  const cal = () => p.evaluate(() => {
    const c = document.getElementById('navCal'), r = c.getBoundingClientRect(), n = document.getElementById('sidenav').getBoundingClientRect();
    const rec = c.querySelector('.calm-rec'), etq = c.querySelector('.calm-etq'), mes = c.querySelector('.calm-mes');
    return { h: Math.round(r.height), top: Math.round(r.top), bot: Math.round(r.bottom), H: innerHeight, navBot: Math.round(n.bottom), grade: !!c.querySelector('.cal-grade'),
      rec: rec ? rec.getAttribute('aria-expanded') + '|' + rec.getAttribute('aria-label') : '', etq: etq ? etq.getAttribute('aria-expanded') : '', mes: mes ? mes.textContent : '',
      cortado: mes ? mes.scrollWidth > mes.clientWidth : false, foco: document.activeElement && document.activeElement.className, salvo: localStorage.getItem('moneytrio.calMenu.recolhido') };
  });
  const a = await cal();
  ok(a.grade && a.rec === 'true|Recolher o calendário' && !a.etq, nome + ': calendário aberto por padrão, com o botão de recolher no cabeçalho (aria-expanded=true)');
  await p.focus('#navCal .calm-rec'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  const r = await cal();
  ok(!r.grade && r.etq === 'false' && /^[A-ZÇ][a-zç]+ de 20\d\d$/.test(r.mes) && !r.cortado && r.h < 60, nome + ': pelo teclado recolhe numa etiqueta "' + r.mes + '" (' + r.h + ' px, aria-expanded=false, sem cortar o texto)');
  ok(r.foco === 'calm-etq' && r.salvo === '1', nome + ': o foco vai para a etiqueta e a escolha fica guardada no aparelho');
  ok(r.bot <= r.H + 1 && r.navBot <= r.H + 1, nome + ': recolhido, a etiqueta e a barra cabem na tela (' + r.top + '–' + r.bot + ')');
  await p.reload(); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.recorrentes || []).length >= 1);
  await antesDeMedir(); await p.waitForTimeout(300);
  const l = await cal();
  ok(!l.grade && l.etq === 'false', nome + ': depois de recarregar continua recolhido (lembrado)');
  await p.click('#navCal .calm-etq'); await p.waitForTimeout(150);
  const o = await cal();
  ok(o.grade && o.rec.startsWith('true') && o.salvo === null && o.bot <= o.H + 1 && o.h > 100, nome + ': tocar na etiqueta abre de novo, inteiro na tela (' + o.top + '–' + o.bot + ')');
  await p.reload(); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.recorrentes || []).length >= 1);
  await antesDeMedir(); await p.waitForTimeout(300);
  ok((await cal()).grade, nome + ': depois de recarregar continua aberto');
}

(async () => {
  const srv = http.createServer((q, s) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': TIPOS[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(s); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch();
  try {
    const conferir = async (p, nome) => {
      const m = await medir(p);
      ok(m.navL === 0, nome + ': barra lateral colada à esquerda (left ' + m.navL + ')');
      ok(m.navBot <= m.H + 1 && m.navTop >= 0, nome + ': barra lateral cabe na altura da tela (topo ' + m.navTop + ', fim ' + m.navBot + ' de ' + m.H + ')');
      ok(m.calH > 100 && m.calTop >= m.navTop && m.calBot <= m.H + 1, nome + ': calendário inteiro dentro da tela (' + m.calTop + '–' + m.calBot + ')');
      ok(m.W - m.contR <= 1 && m.vistaW >= Math.min(m.W - 260, 1100) - 40, nome + ': conteúdo usa a largura que sobra (tela ' + m.W + ', área ' + m.vistaW + ')');
      ok(m.scrollW <= m.W + 1, nome + ': sem rolagem para o lado');
      const selo = await p.evaluate(() => { const e = document.getElementById('nvSelo'), n = document.getElementById('sidenav'); if (!e) return null; const a = e.getBoundingClientRect(), b = n.getBoundingClientRect(); return a.left >= b.right - 1 || a.bottom <= b.top || a.top >= b.bottom; });
      ok(selo !== false, nome + ': o selo "Entrar na nuvem" não fica em cima da barra lateral (do calendário)');
      return m;
    };
    for (const vp of [{ width: 1280, height: 720 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }, { width: 2560, height: 1440 }]) {
      console.log('tela ' + vp.width + 'x' + vp.height);
      const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('semeado')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('semeado', '1'); } }, JSON.stringify(LOCAL));
      const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.recorrentes || []).length === 1);
      await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); irPara('b-custos'); });
      await p.waitForTimeout(300);
      const m = await conferir(p, 'BudgetONE');
      if (m.listaRola) {
        const lista = await p.$('#navLista'), bx = await lista.boundingBox();
        await p.mouse.move(bx.x + bx.width / 2, bx.y + Math.min(60, bx.height / 2));
        const antes = await p.evaluate(() => [document.getElementById('navLista').scrollTop, scrollY]);
        await p.mouse.wheel(0, 300); await p.waitForTimeout(200);
        const depois = await p.evaluate(() => [document.getElementById('navLista').scrollTop, scrollY]);
        ok(depois[0] > antes[0] && depois[1] === antes[1], 'a roda do mouse em cima do menu rola o menu, não a página (' + antes[0] + ' → ' + depois[0] + ')');
      } else ok(true, 'o menu cabe inteiro (nada a rolar)');
      /* rolando a página: o anúncio sobe, a barra gruda no topo e vai até o fim da tela */
      await p.evaluate(() => { irPara('b-lanc'); bFiltro.periodo = 'tudo'; render(); });
      await p.waitForTimeout(200); await p.mouse.move(m.W - 200, m.H / 2); await p.mouse.wheel(0, 900); await p.waitForTimeout(300);
      const r2 = await medir(p), sy = await p.evaluate(() => scrollY);
      ok(sy > 0 && r2.navBot <= r2.H + 1 && r2.navBot >= r2.H - 2 && r2.calBot <= r2.H + 1, 'rolando a página (' + sy + ' px): a barra vai até o fim da tela e o calendário continua inteiro (' + r2.navTop + '–' + r2.navBot + ')');
      await p.evaluate(() => scrollTo(0, 0));
      await recolherAbrir(p, 'calendário ' + vp.width, () => p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); irPara('b-custos'); }));
      ok(erros.length === 0, 'sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
      await ctx.close();
    }
    console.log('celular 390x800: o calendário fica no menu ☰');
    {
      const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block' });
      await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
      await ctx.addInitScript((t) => { if (!sessionStorage.getItem('semeado')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('semeado', '1'); } }, JSON.stringify(LOCAL));
      const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
      await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.recorrentes || []).length === 1);
      const abrirMenu = async () => { await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); irPara('b-custos'); }); await p.click('#btnMenu'); await p.waitForTimeout(350); };
      await abrirMenu();
      /* 3.58 (N44): com o menu ☰ aberto, o selo "Entrar na nuvem" fica ao lado do menu, nunca em cima do calendário; texto inteiro */
      const selo = () => p.evaluate(() => { const e = document.getElementById('nvSelo'), n = document.getElementById('sidenav'), c = document.getElementById('navCal');
        if (!e) return null; const a = e.getBoundingClientRect(), b = n.getBoundingClientRect(), k = c.getBoundingClientRect();
        const cobre = (r) => !(a.left >= r.right - 1 || a.right <= r.left + 1 || a.bottom <= r.top + 1 || a.top >= r.bottom - 1);
        return { menu: cobre(b), cal: cobre(k), dentro: a.left >= 0 && a.right <= innerWidth && a.bottom <= innerHeight, inteiro: e.scrollWidth <= e.clientWidth + 1, left: Math.round(a.left) }; });
      const s1 = await selo();
      ok(s1 && !s1.menu && !s1.cal && s1.dentro && s1.inteiro, 'celular, menu aberto com o calendário aberto: o selo fica ao lado do menu, sem cobrir o calendário (' + JSON.stringify(s1) + ')');
      await p.click('#navCal .calm-rec'); await p.waitForTimeout(150);
      const s2 = await selo();
      ok(s2 && !s2.menu && !s2.cal && s2.dentro && s2.inteiro, 'celular, menu aberto com o calendário recolhido: o selo também não cobre (' + JSON.stringify(s2) + ')');
      await p.click('#navCal .calm-etq'); await p.waitForTimeout(150);
      await p.click('#navBackdrop', { position: { x: 360, y: 300 } }); await p.waitForTimeout(350);   /* toca no escuro, fora do menu */
      const s3 = await selo();
      ok(s3 && s3.left <= 16, 'celular, menu fechado: o selo volta ao canto de sempre (left ' + (s3 && s3.left) + ')');
      await recolherAbrir(p, 'celular', abrirMenu);
      const en = await p.evaluate(() => { I18n.atual = 'en'; renderCalendarioMenu(); const b1 = document.querySelector('#navCal .calm-rec').getAttribute('aria-label');
        CalendarioMenu.alternar(true); const e = document.querySelector('#navCal .calm-etq'); const r = [b1, e.textContent, e.title]; CalendarioMenu.alternar(false); I18n.atual = 'pt'; return r; });
      ok(en[0] === 'Collapse the calendar' && /^[A-Z][a-z]+ 20\d\d$/.test(en[1]) && en[2] === 'Show the calendar', 'em inglês: "' + en.join('" · "') + '"');
      ok(erros.length === 0, 'celular: sem erro de página' + (erros.length ? ': ' + erros.join(' | ') : ''));
      await ctx.close();
    }
    console.log('trocando a largura com a página aberta (notebook → monitor grande → notebook)');
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('semeado')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('semeado', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && (Store.estado.recorrentes || []).length === 1);
    await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); irPara('b-custos'); });
    for (const vp of [{ width: 2560, height: 1440 }, { width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
      await p.setViewportSize(vp); await p.waitForTimeout(400);
      await conferir(p, 'virou ' + vp.width + 'x' + vp.height);
    }
    /* item 9: as ações da tabela de Recorrentes nunca ficam cortadas — nem depois de diminuir a janela */
    await p.setViewportSize({ width: 1920, height: 1080 });
    await p.evaluate(() => {
      for (let i = 0; i < 6; i++) Recorrente.add({ nome: 'Consorcio_imovel_Porto_seis_cartas_com_um_nome_bem_comprido_sem_espaco_' + 'X'.repeat(40) + i, valor: 1000 + i, grupo: 'HABITACAO', sub: 'Aluguel', regra: 'dia', dia: 5 + i });
      custosAba = 'recorrentes'; irPara('b-custos'); render();
    });
    await p.waitForTimeout(300);
    const acoes = async () => p.evaluate(() => {
      const tb = [...document.querySelectorAll('#view-b-custos .tbl-wrap > table')].pop(), caixa = tb.parentElement, card = caixa.closest('.card');
      const cr = card.getBoundingClientRect(), maxR = Math.max(...[...tb.querySelectorAll('tbody tr')].map((tr) => tr.lastElementChild.getBoundingClientRect().right));
      const rola = getComputedStyle(caixa).overflowX !== 'visible';
      return { cabe: caixa.classList.contains('tbl-cabe'), rola, maxR: Math.round(maxR), cardR: Math.round(cr.right), larga: tb.scrollWidth > caixa.clientWidth + 2 };
    });
    const a1 = await acoes();
    ok(!a1.larga ? a1.maxR <= a1.cardR + 1 : a1.rola, 'Recorrentes em 1920: as ações aparecem inteiras (' + JSON.stringify(a1) + ')');
    /* a tabela cresce DEPOIS de medida (selo, texto que chega): ela não pode passar a ser cortada */
    /* injeta de novo se o app redesenhar a tela no meio (o texto injetado sumiria) */
    await p.waitForFunction(() => {
      const tb = [...document.querySelectorAll('#view-b-custos .tbl-wrap > table')].pop(); if (!tb) return false;
      if (!tb.querySelector('.cresceu')) tb.querySelector('tbody tr td:nth-child(2)').insertAdjacentHTML('beforeend', '<span class="cresceu" style="white-space:nowrap"> ' + 'Z'.repeat(260) + '</span>');
      return tb.scrollWidth > tb.parentElement.clientWidth + 2;
    }, null, { polling: 200, timeout: 5000 });
    await p.waitForTimeout(400);
    const a3 = await acoes();
    ok(a3.larga && a3.rola && !a3.cabe, 'a tabela cresceu depois de desenhada: deixa de "caber", rola para o lado e as ações não ficam cortadas (' + JSON.stringify(a3) + ')');
    await p.evaluate(() => render());
    await p.setViewportSize({ width: 1280, height: 720 }); await p.waitForTimeout(600);
    const a2 = await acoes();
    ok((!a2.larga && a2.maxR <= a2.cardR + 1) || (a2.larga && a2.rola && !a2.cabe), 'diminuiu a janela para 1280: a tabela que não cabe rola para o lado, as ações não ficam cortadas (' + JSON.stringify(a2) + ')');
    ok(erros.length === 0, 'sem erro de página ao trocar a largura' + (erros.length ? ': ' + erros.join(' | ') : ''));
    await ctx.close();
  } finally { await b.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
