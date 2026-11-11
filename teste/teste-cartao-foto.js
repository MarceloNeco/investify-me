/* =====================================================================
   teste/teste-cartao-foto.js — 3.65: cadastrar cartão por foto (modulos/cartao-foto.js + o motor do Leitor OCR em leitor/)
   ---------------------------------------------------------------------
   Imagens de cartão FICTÍCIAS geradas aqui, com os números de teste públicos das bandeiras (4111 1111 1111 1111 e
   5555 5555 5555 4444), como no teste do leitor-ocr. Confere:
     1. "Cadastrar cartão" mostra "📷 Fotografar cartão" e "🖼️ Imagem ou print do cartão" (só no cadastro novo);
     2. a foto preenche final, bandeira, validade e apelido; a pessoa confere antes de salvar; o campo do arquivo é limpo;
     3. só o final é guardado: o número inteiro não aparece no Store, no localStorage, na tela nem no console;
     4. o final que já é de um cartão → "Abrir esse cartão"; o final que está nas compras do robô → o cadastro liga à conta;
     5. sem cartão na foto → pede outra foto; nenhum pedido para fora do site (sem IA e sem internet);
     6. o leitor antigo do app (comprovantes) lê igual, com o Tesseract da MESMA pasta (leitor/tesseract/);
     7. o sw.js apaga o cache antigo do OCR (a 2ª cópia) na ativação.
   Uso (na pasta raiz): node teste/teste-cartao-foto.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const LOCAL = { v: 1, config: {}, posicoes: [], gastos: [], recorrentes: [] };
const NUMEROS = ['4111111111111111', '5555555555554444'];
const temNumero = (t) => NUMEROS.some((n) => String(t || '').replace(/[^0-9]/g, '').includes(n));
const cartaoHtml = (num, nome, val, banco, marca, fundo, cor) => `<div style="width:856px;height:540px;border-radius:36px;background:${fundo};position:relative;font-family:'DejaVu Sans Mono',monospace">
  <div style="position:absolute;left:50px;top:40px;font:bold 40px sans-serif;color:${cor}">${banco}</div>
  <div style="position:absolute;left:70px;top:170px;width:110px;height:85px;border-radius:12px;background:#d4af37"></div>
  <div style="position:absolute;left:60px;top:300px;font:bold 56px 'DejaVu Sans Mono',monospace;letter-spacing:4px;color:${cor}">${num}</div>
  <div style="position:absolute;left:330px;top:390px;font:bold 18px sans-serif;color:${cor}">VALIDO ATÉ</div>
  <div style="position:absolute;left:470px;top:382px;font:bold 36px 'DejaVu Sans Mono',monospace;color:${cor}">${val}</div>
  <div style="position:absolute;left:60px;top:450px;font:bold 36px 'DejaVu Sans Mono',monospace;color:${cor}">${nome}</div>
  <div style="position:absolute;right:50px;bottom:40px;font:bold italic 44px sans-serif;color:${cor}">${marca}</div></div>`;

(async () => {
  const srv = http.createServer((q, r) => { const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm' }[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + srv.address().port, b = await chromium.launch();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cartao-foto-'));
  try {
    /* as imagens fictícias */
    const gen = await b.newPage();
    const shot = async (inner, nome) => { await gen.setContent(`<body style="margin:0;background:#444;padding:40px">${inner}</body>`); const f = path.join(tmp, nome); await gen.screenshot({ path: f, fullPage: true }); return f; };
    const visa = await shot(cartaoHtml('4111 1111 1111 1111', 'FULANO DE TAL', '08/29', 'Banco Exemplo', 'VISA', '#2a5298', '#fff'), 'visa.png');
    const master = await shot(cartaoHtml('5555 5555 5555 4444', 'MARIA EXEMPLO SILVA', '11/30', 'Itaú', 'mastercard', '#111', '#ddd'), 'master.png');
    const nada = await shot('<div style="width:600px;height:400px;background:#eee;font:30px sans-serif;padding:40px">Lista do mercado: arroz, feijão</div>', 'nada.png');
    await gen.close();

    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' });
    const fora = [];
    await ctx.route('**/*', (r) => { const u = r.request().url(); if (u.startsWith(BASE)) return r.continue(); fora.push(u); return r.abort(); });
    await ctx.addInitScript((t) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('investifyme.dados.v1', t); localStorage.setItem('moneytrio.soNesteAparelho', '1'); localStorage.setItem('moneytrio.tutorial.v1', 'visto'); sessionStorage.setItem('s', '1'); } }, JSON.stringify(LOCAL));
    const p = await ctx.newPage(); const erros = [], logs = [];
    p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => logs.push(m.text())); p.on('dialog', (d) => d.accept());
    await p.goto(BASE + '/'); await p.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && window.Cartoes && window.CartaoFoto);
    await p.evaluate(() => { I18n.atual = 'pt'; abrirApp('budget'); });
    const antesFora = fora.length;

    console.log('1) os botões');
    await p.evaluate(() => abrirCartao(null));
    await p.waitForSelector('label[for="ctFotoCam"]');
    ok(/Fotografar cartão/.test(await p.textContent('label[for="ctFotoCam"]')) && /Imagem ou print do cartão/.test(await p.textContent('label[for="ctFotoGal"]')), '"📷 Fotografar cartão" e "🖼️ Imagem ou print do cartão" no cadastro');
    ok(await p.evaluate(() => document.getElementById('ctFotoCam').getAttribute('capture') === 'environment' && !document.getElementById('ctFotoGal').hasAttribute('capture')), 'a câmera usa capture="environment"; a galeria, não (foto ou print)');
    ok(!(await p.evaluate(() => /verso/i.test(document.querySelector('.ctf').textContent.replace('Só a frente', '')))), 'não pede o verso');

    console.log('2) a foto preenche o cadastro (Visa)');
    await p.setInputFiles('#ctFotoGal', visa);
    await p.waitForFunction(() => /Li o cartão|Não achei|não deu/i.test((document.getElementById('ctFotoStatus') || {}).textContent || ''), null, { timeout: 180000 });
    const f1 = await p.evaluate(() => ({ fim: ctFim.value, band: ctBandeira.value, val: ctValidade.value, ap: ctApelido.value, st: ctFotoStatus.textContent, inp: document.getElementById('ctFotoGal').value }));
    ok(f1.fim === '1111' && f1.band === 'visa' && f1.val === '08/29', 'final 1111, bandeira Visa, validade 08/29 (' + JSON.stringify(f1) + ')');
    ok(/Confira e corrija antes de salvar/.test(f1.st) && f1.inp === '', '"Confira e corrija antes de salvar"; o campo do arquivo foi limpo');
    await p.screenshot({ path: '/tmp/cartao-foto.png' });
    await p.click('[data-acao="cartao-salvar"]'); await p.waitForTimeout(300);
    const salvo = await p.evaluate(() => ({ cs: Banco.cartoes().map((c) => c.fim + ':' + c.bandeira + ':' + (c.validade || '')), store: JSON.stringify(Store.estado), ls: JSON.stringify(localStorage), tela: document.body.innerText }));
    ok(salvo.cs.join() === '1111:visa:08/29', 'salvo: um cartão com o final 1111 (' + salvo.cs.join() + ')');
    ok(!temNumero(salvo.store) && !temNumero(salvo.ls) && !temNumero(salvo.tela) && !temNumero(logs.join('\n')), 'o número inteiro não está no Store, no localStorage, na tela nem no console');

    console.log('3) o final que já existe → abrir esse cartão');
    await p.evaluate(() => abrirCartao(null)); await p.waitForSelector('#ctFotoGal', { state: 'attached' });
    await p.setInputFiles('#ctFotoGal', visa);
    await p.waitForSelector('[data-acao="ctf-abrir"]', { timeout: 180000 });
    ok(/Este final já é do cartão/.test(await p.textContent('#ctFotoStatus')), 'o mesmo cartão de novo: "Este final já é do cartão …" com "Abrir esse cartão"');
    await p.click('[data-acao="ctf-abrir"]'); await p.waitForTimeout(200);
    ok(/Editar cartão/.test(await p.textContent('#assetModalTitle')) && !(await p.$('#ctFotoCam')), 'abre o cartão que já existe (editar; sem os botões de foto)');
    await p.evaluate(() => fechar('assetModal'));

    console.log('4) o final que está nas compras do robô → liga à conta');
    await p.evaluate(() => { const C = MoneyNuvem._teste.Caixa; Gasto.add(C.converter({ id: 'r1', tipo: 'despesa', data: '2026-11-02', valor: 80, descricao: 'LOJA TESTE', grupo: 'LAZER', categoria: 'Restaurante', banco: 'Itaú', cartao: 'MASTERCARD', final: '4444', conta_cartao: { id: 'acc-teste-9', nome: 'MASTER TESTE' } })); Store.salvar(); });
    await p.evaluate(() => abrirCartao(null)); await p.waitForSelector('#ctFotoGal', { state: 'attached' });
    await p.setInputFiles('#ctFotoGal', master);
    await p.waitForFunction(() => /Li o cartão|Não achei|não deu/i.test((document.getElementById('ctFotoStatus') || {}).textContent || ''), null, { timeout: 180000 });
    const f2 = await p.evaluate(() => ({ fim: ctFim.value, band: ctBandeira.value, conta: ctContaId.value, st: ctFotoStatus.textContent, fins: [...document.querySelectorAll('.ct-f-fim')].map((x) => x.value).join(',') }));
    ok(f2.fim === '4444' && f2.band === 'master' && f2.conta === 'acc-teste-9' && /compra\(s\) do robô/.test(f2.st), 'Mastercard final 4444: o cadastro liga à conta do robô ("já aparece em 1 compra(s) do robô") (' + JSON.stringify(f2) + ')');
    await p.click('[data-acao="cartao-salvar"]'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => { const c = Banco.cartoes().find((x) => x.fim === '4444'); const g = Gasto.todos().find((x) => x.idRobo === 'r1'); return c && c.contaId === 'acc-teste-9' && g.cartaoId === c.id; }), 'salvo com a conta do cartão; a compra do robô ganhou o cartão');

    console.log('5) foto sem cartão');
    await p.evaluate(() => abrirCartao(null)); await p.waitForSelector('#ctFotoGal', { state: 'attached' });
    await p.setInputFiles('#ctFotoGal', nada);
    await p.waitForFunction(() => /Não achei|não deu|Li o cartão/i.test((document.getElementById('ctFotoStatus') || {}).textContent || ''), null, { timeout: 180000 });
    ok(/Não achei um cartão nesta foto/.test(await p.textContent('#ctFotoStatus')) && !(await p.inputValue('#ctFim')), 'sem cartão: "Não achei um cartão nesta foto…", nada preenchido');
    const doLeitor = fora.slice(antesFora).filter((u) => /tesseract|traineddata|cdnjs|jsdelivr|unpkg|anthropic|openai|generativelanguage|googleapis|groq|mistral|ocr/i.test(u));   /* as cotações e notícias do app seguem como sempre */
    ok(doLeitor.length === 0, 'o leitor não pede nada fora do site (sem IA, sem CDN, sem internet)' + (doLeitor.length ? ': ' + doLeitor.join(' ') : ''));
    ok(!(await p.evaluate(async () => { try { const n = await indexedDB.databases(); return n.some((d) => /leitor/i.test(d.name)); } catch (e) { return false; } })), 'nada do leitor no IndexedDB (a foto não é guardada)');

    console.log('6) o leitor antigo (comprovantes) usa a mesma pasta do Tesseract');
    const pedidos = []; p.on('request', (r) => pedidos.push(r.url()));
    const cupom = await (async () => { const g = await b.newPage(); await g.setContent('<body style="margin:0;background:#fff;padding:40px;font:28px monospace;width:560px">PADARIA EXEMPLO LTDA<br>CNPJ 11.222.333/0001-81<br>08/10/2026 10:15<br>PAO FRANCES 10,00<br>CAFE 75,00<br>TOTAL R$ 85,00<br>CREDITO MASTERCARD</body>'); const f = path.join(tmp, 'cupom.png'); await g.screenshot({ path: f, fullPage: true }); await g.close(); return fs.readFileSync(f).toString('base64'); })();
    const lido = await p.evaluate(async (b64) => {
      const blob = await (await fetch('data:image/png;base64,' + b64)).blob(), file = new File([blob], 'cupom.png', { type: 'image/png' });
      const papeis = await Leitor.ler([file], { tipo: 'auto' });
      const c = papeis[0] && Leitor.paraCupom(papeis[0]);
      return { valor: c && c.valor, origem: Ocr.origem, texto: JSON.stringify(papeis[0] && papeis[0].result && papeis[0].result.fields || []).slice(0, 300) };
    }, cupom);
    ok(lido.origem === 'local' && Math.abs(Number(lido.valor) - 85) < 0.01, 'o leitor antigo lê o comprovante igual (total 85,00) com o Tesseract de leitor/tesseract/ (' + JSON.stringify({ valor: lido.valor, origem: lido.origem }) + ')');
    const tess = pedidos.filter((u) => /tesseract|traineddata|worker\.min/.test(u));
    ok(tess.length > 0 && tess.every((u) => u.indexOf(BASE + '/leitor/tesseract/') === 0), 'todos os arquivos do Tesseract vêm de leitor/tesseract/ (nada de assets/ocr/ nem CDN): ' + [...new Set(tess.map((u) => u.replace(BASE, '').split('?')[0]))].join(', '));
    ok(erros.length === 0, 'sem erro de página' + (erros.length ? ': ' + erros[0] : ''));
    /* a outra ordem: página nova, o leitor antigo primeiro (sem o cartão por foto antes) */
    const p2 = await ctx.newPage(); const ped2 = []; p2.on('request', (r) => ped2.push(r.url()));
    await p2.goto(BASE + '/'); await p2.waitForFunction(() => typeof Leitor !== 'undefined' && Store.estado);
    const lido2 = await p2.evaluate(async (b64) => {
      const blob = await (await fetch('data:image/png;base64,' + b64)).blob();
      const papeis = await Leitor.ler([new File([blob], 'cupom.png', { type: 'image/png' })], { tipo: 'auto' });
      return { valor: papeis[0] && Leitor.paraCupom(papeis[0]).valor, origem: Ocr.origem };
    }, cupom);
    const tess2 = ped2.filter((u) => /tesseract|traineddata|worker\.min/.test(u));
    ok(lido2.origem === 'local' && Math.abs(Number(lido2.valor) - 85) < 0.01 && tess2.length && tess2.every((u) => u.indexOf(BASE + '/leitor/tesseract/') === 0), 'página nova, o leitor antigo primeiro: lê igual, tudo de leitor/tesseract/ (' + [...new Set(tess2.map((u) => u.replace(BASE, '').split('?')[0]))].join(', ') + ')');
    await p2.close();

    console.log('7) sw.js: uma cópia só no aparelho');
    const sctx = await b.newContext();
    await sctx.route('**/*', (r) => r.request().url().startsWith(BASE) ? r.continue() : r.abort());
    const sp = await sctx.newPage();
    await sp.goto(BASE + '/manifest.json');
    await sp.evaluate(async () => { await (await caches.open('moneytrio-ocr-1')).put('/x', new Response('velho')); });
    const chaves = await sp.evaluate(async () => {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await new Promise((ok) => { const w = reg.installing || reg.waiting || reg.active; if (w.state === 'activated') return ok(); w.addEventListener('statechange', () => { if (w.state === 'activated') ok(); }); });
      await new Promise((ok) => setTimeout(ok, 500));
      return caches.keys();
    });
    ok(!chaves.includes('moneytrio-ocr-1'), 'na ativação o cache antigo do OCR (moneytrio-ocr-1, com a 2ª cópia) é apagado (' + chaves.join(', ') + ')');
    await sctx.close();
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
