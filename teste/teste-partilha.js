/* =====================================================================
   teste/teste-partilha.js — 3.137: compartilhar PDF, CSV, XML ou OFX com o app (modulos/partilha.js, sw.js, manifest.json).
   Dados FICTÍCIOS. Confere: o manifest aceita PDF/CSV/texto/XML/OFX; o sw.js de verdade guarda o arquivo com o nome; o "O que é
   isto?" com o palpite (Stmt_… → posições; XML → nota; OFX/CSV → extrato); o PDF de texto (simulado) e o CSV caem no leitor de
   posições da 3.134 e na mesma prévia; o XML vai para o 📷 Foto de nota ou recibo como texto; o OFX vai para o "Importar arquivo";
   a imagem sozinha continua com a pergunta de antes; a dica de reinstalar na tela de instalar.
   Uso: node teste/teste-partilha.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const TAB = 'Corretora Exemplo — Avenue (US$)\nTicker | Nome | Qtd | Preço médio | Valor atual\nABCD | Empresa Exemplo | 10 | 50.00 | 550.00\nVOO | ETF Exemplo | 2 | 400.00 | 820.00';
const CSV = 'Ativo;Quantidade;PM;Valor atual\nEXMP3;100;12,50;1.300,00\nFUND11;10;98,40;1.000,00';
const XML = '<?xml version="1.0"?><nfeProc><NFe><infNFe><emit><xNome>LOJA EXEMPLO LTDA</xNome><CNPJ>00000000000000</CNPJ></emit><total><ICMSTot><vNF>123.45</vNF></ICMSTot></total><ide><dhEmi>2026-11-10T10:00:00-03:00</dhEmi></ide></infNFe></NFe></nfeProc>';
const OFX = 'OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\n\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL<BANKACCTFROM><BANKID>000<ACCTID>12345-6</BANKACCTFROM><BANKTRANLIST><DTSTART>20261101<DTEND>20261130' +
  '<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261105<TRNAMT>-45.90<FITID>EX1<MEMO>PADARIA EXEMPLO</STMTTRN><STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261106<TRNAMT>100.00<FITID>EX2<MEMO>PIX RECEBIDO EXEMPLO</STMTTRN></BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>';

(async () => {
  const man = JSON.parse(fs.readFileSync(path.join(RAIZ, 'manifest.json'), 'utf8')).share_target;
  const ac = [].concat(...man.params.files.map((f) => f.accept));
  ok(['image/*', 'application/pdf', 'text/csv', 'text/plain', 'application/xml', 'text/xml', '.ofx'].every((t) => ac.includes(t)) && man.method === 'POST', 'manifest: o Compartilhar aceita imagem, PDF, CSV, texto, XML (NF-e) e OFX');
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  try {
    /* o sw.js de verdade: o POST do Compartilhar guarda o arquivo com o nome e abre ./?print=1 */
    const cs = await b.newContext({ viewport: { width: 390, height: 844 } });
    await cs.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    const s = await cs.newPage();
    await s.goto(BASE + '/sw.js');
    const sw = await s.evaluate(async () => {
      const reg = await navigator.serviceWorker.register('./sw.js'); await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise((ok) => { navigator.serviceWorker.addEventListener('controllerchange', ok); setTimeout(ok, 5000); });
      const fd = new FormData(); fd.append('arquivos', new File(['%PDF-1.4 exemplo'], 'Stmt_20261031.pdf', { type: 'application/pdf' }));
      const r = await fetch('./?compartilhar=1', { method: 'POST', body: fd, redirect: 'manual' });
      const c = await caches.open('partilha-moneytrio'), ks = await c.keys(), m = ks.length ? await c.match(ks[0]) : null;
      return { ctrl: !!navigator.serviceWorker.controller, status: r.type, n: ks.length, nome: m ? decodeURIComponent(m.headers.get('x-nome') || '') : '', tipo: m ? m.headers.get('content-type') : '' };
    });
    ok(sw.n === 1 && sw.nome === 'Stmt_20261031.pdf' && sw.tipo === 'application/pdf', 'sw.js: o PDF compartilhado fica no cache de passagem com o nome e o tipo (' + JSON.stringify(sw) + ')');
    await cs.close();

    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    await ctx.addInitScript(() => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', JSON.stringify({ v: 1, config: { fitaLigada: false }, gastos: [], posicoes: [] })); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } });
    const p = await ctx.newPage(); p.erros = []; p.on('pageerror', (e) => p.erros.push(String(e)));
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.Partilha && window.PosicoesTexto);
    await p.evaluate(() => { I18n.atual = 'pt'; Assist.marcarTutorial(); ST.config.assistOne = false; AssistOne.aplicar(); });

    console.log('1) o palpite pelo nome e pelo texto');
    const pal = await p.evaluate(() => { const F = (n, t) => new File(['x'], n, { type: t || '' });
      return [Partilha.palpite([F('Stmt_20261031.pdf', 'application/pdf')]), Partilha.palpite([F('nota.xml', 'text/xml')]), Partilha.palpite([F('extrato.ofx')]), Partilha.palpite([F('lancamentos.csv', 'text/csv')]),
        Partilha.palpite([F('documento.pdf', 'application/pdf')], 'DANFE Documento auxiliar'), Partilha.palpite([F('documento.pdf', 'application/pdf')])].join('|'); });
    ok(pal === 'posicoes|nota|extrato|extrato|nota|', 'Stmt_… → posições · XML → nota · OFX e CSV → extrato · "DANFE" no texto → nota · sem pista → nenhum palpite (' + pal + ')');

    console.log('2) o PDF compartilhado (texto simulado) → "O que é isto?" → posições → a mesma prévia');
    await p.evaluate(async () => {
      await (await caches.open('partilha-moneytrio')).put('./partilha/1', new Response(new Blob(['%PDF-1.4 exemplo'], { type: 'application/pdf' }), { headers: { 'content-type': 'application/pdf', 'x-nome': encodeURIComponent('Stmt_20261031.pdf') } })); });
    await p.goto(BASE + '/?print=1');
    await p.waitForFunction(() => window.Partilha && document.getElementById('genTitle').textContent === 'O que é isto?', null, { timeout: 15000, polling: 250 });
    const q = await p.evaluate(() => ({ t: document.getElementById('genBody').textContent.replace(/\s+/g, ' '), b: [...document.querySelectorAll('#genBody [data-acao="pa-dest"]')].map((x) => x.dataset.v + (x.classList.contains('primary') ? '*' : '')).join(',') }));
    ok(/Stmt_20261031\.pdf/.test(q.t) && /Parece: 📈 Posições de investimento/.test(q.t) && q.b === 'posicoes*,nota,extrato,fgts,informe,declaracao,imovel', '"O que é isto?" mostra o arquivo, "Parece: 📈 Posições de investimento" e o palpite vem primeiro, em destaque (' + q.b + ')');
    ok(/Lido aqui no aparelho, sem IA/.test(q.t) && await p.evaluate(async () => (await (await caches.open('partilha-moneytrio')).keys()).length === 0 && !/print=1/.test(location.search)), 'lido no aparelho, sem IA; o cache de passagem é apagado na hora');
    await p.evaluate((t) => { PdfTexto.extrair = async () => t; }, TAB);   /* o PDF de texto, simulado: o que o leitor de PDF do app devolve */
    await p.click('#genBody [data-acao="pa-dest"][data-v="posicoes"]');
    await p.waitForFunction(() => document.getElementById('ptInst'), null, { timeout: 15000, polling: 250 });
    ok(await p.evaluate(() => document.getElementById('ptInst').value === 'Avenue' && /Achei 2 posição/.test(document.getElementById('genBody').textContent)), 'o texto do PDF passa pelo leitor da 3.134: "Achei 2 posições", corretora Avenue');
    await p.click('[data-acao="pt-previa"]'); await p.waitForTimeout(150);
    ok(await p.evaluate(() => document.querySelectorAll('#genBody .pi-tbl tbody tr').length === 2), 'e cai na mesma prévia do JSON');
    await p.evaluate(() => fechar('genModal'));

    console.log('3) CSV como posições');
    await p.evaluate((t) => Partilha.ir('posicoes', [new File([t], 'carteira.csv', { type: 'text/csv' })]), CSV);
    await p.waitForFunction(() => document.getElementById('ptInst'), null, { timeout: 15000, polling: 250 });
    ok(await p.evaluate(() => /Achei 2 posição/.test(document.getElementById('genBody').textContent)), 'o CSV com ; vira colunas e o leitor acha as 2 posições');
    await p.evaluate(() => fechar('genModal'));

    console.log('4) XML → nota (o 📷 Foto de nota ou recibo), OFX → extrato');
    const nota = await p.evaluate(async (x) => { let rec = null; Canhotos.processar = async (fs) => { rec = fs; }; await Partilha.ir('nota', [new File([x], 'nfe-exemplo.xml', { type: 'text/xml' })]);
      return rec ? { n: rec.length, nome: rec[0].name, tipo: rec[0].type, t: await rec[0].text() } : null; }, XML);
    ok(nota && nota.n === 1 && nota.nome === 'nfe-exemplo.txt' && nota.tipo === 'text/plain' && /LOJA EXEMPLO LTDA/.test(nota.t) && /123\.45/.test(nota.t) && !/</.test(nota.t), 'o XML da NF-e vai para o Foto de nota ou recibo como texto, sem as marcações');
    await p.evaluate((x) => Partilha.perguntar([new File([x], 'extrato-exemplo.ofx', { type: '' })]), OFX);
    ok(/Parece: 🏦 Extrato do banco/.test(await p.textContent('#genBody')), 'OFX: "Parece: 🏦 Extrato do banco"');
    await p.click('#genBody [data-acao="pa-dest"][data-v="extrato"]');
    await p.waitForFunction(() => /PADARIA EXEMPLO|2 lan/i.test((document.getElementById('plResultado') || {}).textContent || ''), null, { timeout: 20000, polling: 250 });
    ok(await p.evaluate(() => !document.getElementById('assetModal').classList.contains('hidden')), 'o OFX abre no "Importar arquivo" de sempre, com os lançamentos para conferir');
    await p.evaluate(() => fechar('assetModal'));

    console.log('5) a imagem sozinha: a pergunta de antes; a dica de reinstalar');
    await p.evaluate(async () => { await (await caches.open('partilha-moneytrio')).put('./partilha/1', new Response(new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }), { headers: { 'content-type': 'image/png' } })); });
    await p.goto(BASE + '/?print=1');
    await p.waitForSelector('#genBody [data-acao="pc-dest"][data-v="print"]', { timeout: 15000 });
    ok(/É print do app do banco ou nota\/canhoto\/orçamento\?/.test(await p.textContent('#genBody')), 'só imagem: continua "É print do app do banco ou nota/canhoto/orçamento?"');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= 391), 'celular (390): nada rola para o lado');
    ok(!p.erros.length, 'sem erro na página' + (p.erros.length ? ': ' + p.erros.join(' | ') : ''));
    await ctx.close();

    const cel = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' });
    await cel.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    const c = await cel.newPage();
    await c.goto(BASE + '/'); await c.waitForFunction(() => window.AbrirChrome);
    const ins = await c.evaluate(() => { AbrirChrome.abrir(); const e = document.querySelector('#acInstalar .ac-partilha'); return e ? e.textContent : ''; });
    ok(/aparece no "Compartilhar" \(fotos, PDF, extrato, nota\) só quando instalado pelo Chrome/.test(ins) && /desinstale e instale de novo/.test(ins), 'tela "Instalar o app" no celular: o Compartilhar só com o app instalado pelo Chrome; se não aparecer para PDF, reinstalar');
    await cel.close();
  } finally { await b.close(); srv.close(); }
  console.log(oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
