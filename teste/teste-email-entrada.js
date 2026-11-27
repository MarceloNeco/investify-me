/* =====================================================================
   teste/teste-email-entrada.js — 3.133: "📧 Mandar e-mails para o MoneyTRIO" (modulos/email-entrada.js). Dados FICTÍCIOS
   (endereços example.com) e o servidor SIMULADO (MoneyNuvem.emails falso: nada vai para a rede).
   Confere: só aparece para quem gerencia a família; a lista com o estado; "+ Adicionar e-mail" ligado a uma pessoa; o código grande
   com o mailto pronto; novo código e cancelar; os guias (Gmail, Outlook, iCloud, Yahoo sem encaminhamento grátis); o XML de filtros
   do Gmail só com os grupos marcados; o "Código do Google"; o aviso dos 7 dias; o celular (390) sem rolar para o lado.
   Uso: node teste/teste-email-entrada.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: { fitaLigada: false, pessoasV: 2 }, posicoes: [], recorrentes: [], gastos: [], pessoas: [{ id: 'p1', tipo: 'casa', papel: 'responsavel', nome: 'Fulano', banco: [] }, { id: 'p2', tipo: 'casa', papel: 'dependente', nome: 'Beltrana', banco: [] }] };

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.EmailEntrada);
    /* o servidor simulado: quem gerencia = sim; a lista em memória; o código volta no add e no renew */
    const montar = (pode) => p.evaluate((pd) => {
      I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar();
      const S = window.__srv = { chamadas: [], lista: [{ id: 's1', email: 'confirmado@example.com', person_name: 'Fulano', status: 'confirmed', send_to: 'moneytrio@solverone.com.br' }, { id: 's0', email: 'vencido@example.com', person_name: '', status: 'expired' }], msgs: [] };
      const real = window.MoneyNuvem || {};
      window.MoneyNuvem = Object.assign(Object.create(real), { iniciado: true, emails: {
        logado: () => true, podeGerenciar: async () => { S.chamadas.push('can'); return pd; },
        lista: async () => { S.chamadas.push('list'); return S.lista.slice(); },
        adicionar: async (email, pessoa) => { S.chamadas.push('add:' + email + ':' + pessoa); const id = 's' + (S.lista.length + 1); S.lista.push({ id, email, person_name: pessoa, status: 'pending' }); return { id, email, code: '482913', send_to: 'moneytrio@solverone.com.br', subject: 'CONFIRMAR 482913' }; },
        renovar: async (id) => { S.chamadas.push('renew:' + id); return { id, code: '765432', subject: 'CONFIRMAR 765432' }; },
        cancelar: async (id) => { S.chamadas.push('cancel:' + id); S.lista = S.lista.filter((x) => x.id !== id); return true; },   /* as canceladas não vêm na lista */
        mensagens: async () => S.msgs.slice() } });
      EmailEntrada._estado.pode = null; EmailEntrada._estado.lista = null;
      abrirApp('budget'); irPara('config'); cfgSecao = 'todos'; render();
    }, pode);

    /* o servidor com erro (sem rede, sem permissão): o cartão some e NÃO pede de novo em laço (a tela não fica redesenhando) */
    await montar(true);
    await p.evaluate(() => { __srv.chamadas = []; MoneyNuvem.emails.podeGerenciar = async () => { __srv.chamadas.push('can'); throw new Error('falha de rede'); }; EmailEntrada._estado.pode = null; render(); });
    await p.waitForTimeout(1200);
    ok(await p.evaluate(() => __srv.chamadas.filter((x) => x === 'can').length === 1 && !document.getElementById('eeCartao')), 'com o servidor fora: pergunta uma vez só e esconde o cartão (sem laço de redesenho)');
    await montar(false); await p.waitForTimeout(250);
    ok(!(await p.evaluate(() => !!document.getElementById('eeCartao'))), 'quem NÃO gerencia a família não vê o cartão');
    await montar(true); await p.waitForTimeout(300);
    const c1 = await p.evaluate(() => { const c = document.getElementById('eeCartao'); return c ? c.textContent.replace(/\s+/g, ' ') : ''; });
    ok(/Mandar e-mails para o MoneyTRIO/.test(c1) && /confirmado@example\.com · Fulano ✅ confirmado/.test(c1) && /vencido@example\.com ⌛ código vencido/.test(c1), 'quem gerencia vê "📧 Mandar e-mails para o MoneyTRIO" e a lista com o estado ("✅ confirmado", "⌛ código vencido")');

    await p.evaluate(() => { document.getElementById('eeEmail').value = 'novo@example.com'; document.getElementById('eePessoa').value = 'p2'; });   /* o cartão fica recolhido nas Configurações */
    await p.evaluate(() => document.querySelector('[data-acao="ee-adicionar"]').click()); await p.waitForTimeout(300);
    const c2 = await p.evaluate(() => { const it = [...document.querySelectorAll('.ee-item')].find((x) => /novo@example\.com/.test(x.textContent)); return it ? { txt: it.textContent.replace(/\s+/g, ' '), num: (it.querySelector('.ee-num') || {}).textContent, href: (it.querySelector('a.btn') || {}).href || '', fonte: it.querySelector('.ee-num') ? parseFloat(getComputedStyle(it.querySelector('.ee-num')).fontSize) : 0 } : null; });
    ok(await p.evaluate(() => __srv.chamadas.indexOf('add:novo@example.com:Beltrana') >= 0), '"+ Adicionar e-mail" manda o endereço com a pessoa da família (Beltrana)');
    ok(c2 && /esperando o código/.test(c2.txt) && c2.num === '482913' && c2.fonte >= 24, 'o novo fica "⏳ esperando o código", com o código grande (482913)');
    ok(c2 && c2.href === 'mailto:moneytrio@solverone.com.br?subject=CONFIRMAR%20482913', '"Abrir e-mail pronto": mailto com o destinatário e o assunto "CONFIRMAR 482913"');
    await p.evaluate(() => document.querySelector('.ee-item[data-id="s3"] [data-acao="ee-renovar"]').click()); await p.waitForTimeout(300);
    ok(await p.evaluate(() => __srv.chamadas.indexOf('renew:s3') >= 0 && document.querySelector('.ee-item[data-id="s3"] .ee-num').textContent === '765432'), '"Novo código": mostra o código novo (765432)');
    ok(await p.evaluate(() => !!document.querySelector('.ee-item[data-id="s0"] [data-acao="ee-renovar"]') && !document.querySelector('.ee-item[data-id="s0"] .ee-num')), 'o código vencido não aparece; "Novo código" gera outro');
    await p.evaluate(() => document.querySelector('.ee-item[data-id="s3"] [data-acao="ee-cancelar"]').click()); await p.waitForTimeout(300);
    ok(await p.evaluate(() => __srv.chamadas.indexOf('cancel:s3') >= 0 && !document.querySelector('.ee-item[data-id="s3"]')), '"Cancelar": o endereço sai da lista');

    const g = await p.evaluate(() => { const c = document.getElementById('eeCartao'); return [...c.querySelectorAll('.ee-guia summary')].map((x) => x.textContent.trim()).join('|') + ' :: ' + c.textContent.replace(/\s+/g, ' '); });
    ok(/^Gmail\|Outlook \/ Hotmail\|iCloud\|Yahoo ::/.test(g), 'passo a passo do Gmail, Outlook/Hotmail, iCloud e Yahoo');
    ok(/Adicionar um endereço de encaminhamento/.test(g) && /aparece aqui no app em até alguns minutos/.test(g) && /Importar filtros/.test(g), 'Gmail: adicionar o endereço, o código chega no app, importar os filtros');
    ok(/No Yahoo grátis não existe encaminhamento automático/.test(g) && /encaminhe à mão/.test(g) && /salve moneytrio@solverone\.com\.br nos contatos/.test(g) && !/Plus/.test(g), 'Yahoo: honesto (grátis não encaminha), cadastrar e encaminhar à mão, a dica dos contatos, sem sugerir o Plus');
    ok(/apaga 7 dias depois de lido/.test(g), 'o aviso honesto: o servidor apaga 7 dias depois de lido');

    await p.evaluate(() => { document.querySelector('.ee-grupo[value="servicos"]').click(); document.querySelector('.ee-grupo[value="ir"]').click(); });
    const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => document.querySelector('[data-acao="ee-baixar"]').click())]);
    const xml = fs.readFileSync(await dl.path(), 'utf8');
    ok(dl.suggestedFilename() === 'moneytrio-filtros-gmail.xml' && /^<\?xml/.test(xml) && /xmlns:apps='http:\/\/schemas\.google\.com\/apps\/2006'/.test(xml), 'baixa o XML de filtros do Gmail (feed Atom com apps:property)');
    ok((xml.match(/<entry>/g) || []).length === 4 && (xml.match(/name='forwardTo' value='moneytrio@solverone\.com\.br'/g) || []).length === 4, 'um filtro por grupo marcado (4 de 6), cada um encaminhando para moneytrio@solverone.com.br');
    ok(/name='subject' value='\(boleto OR fatura OR &quot;aviso de cobrança&quot;\)'/.test(xml) && /name='from' value='\(amazon\.com\.br OR mercadolivre\.com/.test(xml) && !/enel\.com\.br|informe de rendimentos/.test(xml), 'os assuntos e os remetentes certos; os grupos desmarcados ficam de fora');
    ok(!/@example|Fulano|Beltrana/.test(xml), 'nada pessoal no arquivo');

    await p.evaluate(() => { __srv.msgs = [{ id: 'm1', from_email: 'forwarding-noreply@google.com', subject: '(#123456789) Gmail Forwarding Confirmation - Receive Mail from fulano@example.com', status: 'nova' }]; EmailEntrada._estado.pode = null; render(); });
    await p.waitForTimeout(300);
    ok(/Código do Google: 123456789/.test(await p.evaluate(() => (document.querySelector('.ee-google') || {}).textContent || '')), 'a mensagem do Google no MoneyTRIO vira o cartão "Código do Google: 123456789 · copie e cole no Gmail"');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= 391), 'celular (390): nada rola para o lado');
    await p.evaluate(() => { const c = document.getElementById('eeCartao'); c.classList.add('aberta'); c.scrollIntoView({ block: 'start' }); });
    await p.screenshot({ path: '/tmp/teste-email-entrada.png' });
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
    await ctx.close();
  } finally { await b.close(); srv.close(); }
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
