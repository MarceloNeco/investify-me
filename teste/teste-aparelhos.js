/* =====================================================================
   teste/teste-aparelhos.js — 3.61: entrar SEM código de recuperação (nuvem.js 1.9.0, formato v2 com compromisso); 3.62: PIN da conta
   ---------------------------------------------------------------------
   Ponta a ponta, com contextos de navegador separados (cada um é um aparelho) e um "Supabase de mentira" em memória que
   faz o que supabase/2026-11-07-sol-aparelhos.sql faz (o SQL de verdade tem o teste próprio: teste/sql/teste-sol-aparelhos.sql).
     · A (computador da Ana, aberto com o código antigo) aprova B (celular novo): os 6 números iguais nos dois; B abre com
       os dados; a lista registra quem aprovou e de qual aparelho; a resposta sai do banco depois de lida;
     · repetir: aprovar de novo e ler de novo não dão nada;
     · recusar e vencer;
     · banco trocando a pub do pedido: os 6 números ficam DIFERENTES (com o compromisso forjado antes) ou A acusa "alterado";
     · responsável aprova: a Bia aprova o celular da Ana pela família → abre só as finanças da família; o computador da Ana
       avisa "Um aparelho novo entrou na sua conta, aprovado por Bia";
     · tirar aparelho: A tira B; B, ao abrir de novo, perde o cadeado e volta para "Primeira vez";
     · passkey: sem leitor de digital no aparelho, a opção não aparece (a medição é nos aparelhos do dono).
   Uso (na pasta raiz): node teste/teste-aparelhos.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { chromium } = require('playwright');
const subtle = crypto.webcrypto.subtle;
const RAIZ = path.join(__dirname, '..');
const { SB } = require('./mock-sol');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const b64 = (b) => Buffer.from(b).toString('base64');
const b64u = (b) => Buffer.from(b).toString('base64url');
const unb64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));
const normCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{5})(?=.)/g, '$1-');
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- servidor dos arquivos do site ---------------- */
function servidor() {
  const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
  const s = http.createServer((req, res) => {
    const p = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': tipos[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
  });
  return new Promise((r) => s.listen(0, '127.0.0.1', () => r(s)));
}

const { M, db, supabase, prepararChaves, PESSOAS, ANA, BIA, GID, agora } = require('./mock-sol');

let BASE = '';
async function aparelho(browser, viewport, nome, extraInit) {
  const ctx = await browser.newContext({ viewport, serviceWorkers: 'block' });
  await ctx.route('**/*', (route) => { const u = route.request().url(); if (u.startsWith(SB)) return supabase(route); if (u.startsWith(BASE)) return route.continue(); return route.abort(); });
  if (extraInit) await ctx.addInitScript(extraInit);
  const page = await ctx.newPage(); page.erros = []; page.nome = nome;
  page.on('pageerror', (e) => { page.erros.push(String(e)); console.log('  [' + nome + ' pageerror] ' + e); });
  page.on('dialog', (d) => d.accept());
  return page;
}
async function entrar(page, uid) {
  await page.goto(BASE + '/'); await page.waitForSelector('#nvEm');
  await page.fill('#nvEm', PESSOAS[uid].email); await page.fill('#nvPw', PESSOAS[uid].senha); await page.click('#nvIn');
  await page.waitForSelector('#nvApOutro', { timeout: 20000 });
}
async function abrirComCodigo(page, uid) {   /* o aparelho que já existia: o código antigo (só para montar o cenário) */
  await entrar(page, uid);
  await page.click('#nvCodigoAntigo', { timeout: 20000 }); await page.waitForSelector('#nvCod');
  await page.fill('#nvCod', PESSOAS[uid].codigo); await page.click('#nvCodOk');
  /* 3.62: a conta sem PIN escolhe (este vira o PIN da conta); a conta com PIN digita o PIN da conta */
  await page.waitForSelector('#nvP1, #nvPC', { timeout: 30000 });
  if (await page.$('#nvPC')) { await page.fill('#nvPC', '482915'); await page.click('#nvPCOk'); }
  else { await page.fill('#nvP1', '482915'); await page.fill('#nvP2', '482915'); await page.click('#nvPOk'); }
  await page.waitForSelector('#nvSelo', { timeout: 90000 });
}
const pedidosDe = (uid) => db.sol_acesso_pedidos.filter((p) => p.user_id === uid);
const ultimoPedido = (uid) => pedidosDe(uid).slice(-1)[0];
async function verPedido(A) { await A.evaluate(() => { const ap = MoneyNuvem._teste.Aparelhos; ap._vistos = {}; return ap.olharPedidos(); }); await A.waitForSelector('#nvPedidoVer', { timeout: 10000 }); await A.click('#nvPedidoVer'); }
const sasDe = (pg) => pg.waitForSelector('#nvSas', { timeout: 30000 }).then(() => pg.textContent('#nvSas')).then((t) => t.replace(/\s/g, ''));

(async () => {
  const srv = await servidor(); BASE = 'http://127.0.0.1:' + srv.address().port;
  await prepararChaves();
  const browser = await chromium.launch();
  try {
    console.log('1) A (computador da Ana) já abre; B (celular novo) pede e A aprova');
    const A = await aparelho(browser, { width: 1366, height: 768 }, 'A');
    await abrirComCodigo(A, ANA);
    await A.waitForFunction(() => typeof Store !== 'undefined' && Store.estado && Array.isArray(Store.estado.gastos));
    await A.evaluate(() => { Gasto.add({ data: '2026-11-05', valor: 123.45, grupo: 'LAZER', sub: 'Cinema', desc: 'Cinema de teste', fluxo: 'saida' }); Store.salvar(); });
    await A.waitForFunction(() => MoneyNuvem._teste.Sinc.fila.size === 0 && !MoneyNuvem._teste.Sinc._env, null, { timeout: 30000 });
    await A.waitForFunction(() => true); await esperar(500);
    const apA = db.sol_aparelhos.find((a) => a.user_id === ANA);
    ok(apA && apA.como === 'kit', 'o aparelho que entrou pelo código antigo fica na lista (como "kit") (' + (apA && apA.nome) + ')');
    ok(!(await A.$('#nvApPk')), 'sem leitor de digital neste aparelho, a opção da passkey não aparece no painel (antes de abrir o painel)');

    const B = await aparelho(browser, { width: 390, height: 800 }, 'B');
    await entrar(B, ANA);
    ok(!(await B.$('#nvCod')) && await B.isVisible('#nvApOutro') && await B.isVisible('#nvApFam') && !(await B.$('#nvApPasskey')), 'B: "Primeira vez" sem código: Aprovar pelo outro aparelho / Pedir para alguém da família; sem passkey (não tem leitor)');
    await B.click('#nvApOutro'); await B.waitForSelector('#nvEsperando');
    const p1 = ultimoPedido(ANA);
    ok(p1 && p1.estado === 'aberto' && /^[A-Za-z0-9_-]{43}$/.test(p1.compromisso) && !p1.n_b, 'B criou o pedido com pubB e o compromisso (nB ainda guardado)');
    await verPedido(A);
    const [sasA, sasB] = await Promise.all([sasDe(A), sasDe(B)]);
    ok(/^\d{6}$/.test(sasA) && sasA === sasB, 'os dois mostram os MESMOS 6 números (' + sasA + ' = ' + sasB + ')');
    ok(/Só aprove se este pedido é do aparelho que você está segurando/.test(await A.textContent('.nv-card')), 'A avisa: só aprove se é o aparelho que você está segurando');
    await A.fill('#nvApPin', '000000'); await A.click('#nvApOk');
    await A.waitForFunction(() => /PIN errado/.test((document.querySelector('#nvErro') || {}).textContent || ''));
    ok(true, 'PIN errado não aprova');
    await A.fill('#nvApPin', '482915'); await A.click('#nvApOk');
    await B.waitForSelector('#nvPC', { timeout: 30000 });
    ok(/Digite o PIN da sua conta/.test(await B.textContent('.nv-card')) && !(await B.$('#nvP1')), '3.62: B não cria outro PIN: "Digite o PIN da sua conta"');
    await B.fill('#nvPC', '482915'); await B.click('#nvPCOk');
    await B.waitForSelector('#nvSelo', { timeout: 90000 });
    await B.waitForFunction(() => typeof Store !== 'undefined' && (Store.estado.gastos || []).some((g) => g.desc === 'Cinema de teste'), null, { timeout: 30000 });
    ok(true, 'B abre a nuvem com os dados da família (o lançamento feito em A)');
    const apB = db.sol_aparelhos.find((a) => a.user_id === ANA && a.como === 'aparelho');
    ok(apB && apB.aprovado_por === ANA && apB.aprovado_por_ap === apA.id, 'a lista registra quem aprovou e de qual aparelho');
    ok(p1.estado === 'usado' && p1.resposta === null, 'a resposta saiu do banco depois de lida (pedido "usado")');
    ok(!(await B.evaluate(() => MoneyNuvem._teste.IDB.get('kv', 'pedido|11111111-1111-1111-1111-111111111111'))), 'o par efêmero do pedido saiu do aparelho novo ao terminar');
    const Lb = await B.evaluate(() => MoneyNuvem._teste.Cadeado.local());
    ok(Lb && Lb.sk && Lb.ap === apB.id && Lb.como === 'aparelho', 'B guarda a chave pessoal fechada pelo cadeado do aparelho e sabe quem é na lista');

    console.log('2) repetir a resposta');
    const rep = await A.evaluate(async (id) => { const ap = MoneyNuvem._teste.Aparelhos; return [await ap.rpc('sol_pedido_aprovar', { p_id: id, p_resposta: { v: 2, iv: 'x', ct: 'y' }, p_meu_ap: null }), (await ap.rpc('sol_pedido_buscar', { p_id: id })).length]; }, p1.id);
    const rep2 = await B.evaluate(async (id) => (await MoneyNuvem._teste.Aparelhos.rpc('sol_pedido_buscar', { p_id: id }))[0], p1.id);
    ok(rep[0] === false && rep2.estado === 'usado' && !rep2.resposta, 'aprovar de novo não vale e ler de novo não traz resposta (' + JSON.stringify([rep[0], rep2.estado]) + ')');

    console.log('3) recusar e vencer');
    const C = await aparelho(browser, { width: 390, height: 800 }, 'C');
    await entrar(C, ANA); await C.click('#nvApOutro'); await C.waitForSelector('#nvEsperando');
    /* (a) um aparelho aberto que tem um pedido próprio guardado nunca vê esse pedido na lista "para aprovar" */
    const proprio = await A.evaluate(async (id) => { const T = MoneyNuvem._teste; await T.IDB.set('kv', 'pedido|11111111-1111-1111-1111-111111111111', { id: id, gid: 'x', criado: Date.now() });
      T.Aparelhos._vistos = {}; await T.Aparelhos.olharPedidos(); const r = (T.Aparelhos.pendentes || []).some((x) => x.id === id) || !!document.getElementById('nvPedido');
      await T.IDB.del('kv', 'pedido|11111111-1111-1111-1111-111111111111'); return r; }, ultimoPedido(ANA).id);
    ok(!proprio, 'o pedido que o próprio aparelho criou não aparece para ele aprovar');
    await verPedido(A); await A.waitForSelector('#nvApRecusar'); await A.click('#nvApRecusar');
    await C.waitForFunction(() => /Pedido recusado/.test(document.body.innerText), null, { timeout: 15000 });
    ok(ultimoPedido(ANA).estado === 'recusado', 'A recusa e C mostra "Pedido recusado"');
    await C.click('text=Pedir de novo'); await C.waitForSelector('#nvEsperando');
    const p3 = ultimoPedido(ANA); M.relogio = Date.parse(p3.expira_em) + 1000;
    await C.waitForFunction(() => /O pedido venceu/.test(document.body.innerText), null, { timeout: 15000 });
    const vistoA = await A.evaluate(() => MoneyNuvem._teste.Aparelhos.rpc('sol_pedidos_para_mim'));
    ok(p3.estado === 'vencido' && !vistoA.some((x) => x.id === p3.id), 'depois de 10 min: C mostra "O pedido venceu" e A não vê mais o pedido');

    console.log('4) banco trocando a pub do pedido');
    M.ataque = 'troca';
    await C.click('text=Pedir de novo'); await C.waitForSelector('#nvEsperando');
    await verPedido(A);
    const [sA2, sC2] = await Promise.all([sasDe(A), sasDe(C)]);
    ok(sA2 !== sC2, 'com a pub trocada (e o compromisso forjado antes de ver nA), os 6 números ficam DIFERENTES (' + sA2 + ' × ' + sC2 + '): ninguém aprova');
    await A.click('#nvApRecusar'); await C.waitForFunction(() => /Pedido recusado/.test(document.body.innerText), null, { timeout: 15000 });
    M.ataque = 'troca-sem-compromisso';
    await C.click('text=Pedir de novo'); await C.waitForSelector('#nvEsperando');
    await verPedido(A);
    await A.waitForSelector('#nvApAdulterado', { timeout: 30000 });
    ok(!(await A.$('#nvApOk')), 'trocando a pub sem acertar o compromisso: A acusa "pedido alterado" e não deixa aprovar');
    await A.click('#nvApRecusar'); M.ataque = null;
    await C.context().close();

    console.log('5) responsável aprova (a Bia aprova o celular novo da Ana pela família)');
    const D = await aparelho(browser, { width: 1366, height: 768 }, 'D');
    await abrirComCodigo(D, BIA);
    const E = await aparelho(browser, { width: 390, height: 800 }, 'E');
    await entrar(E, ANA); await E.click('#nvApFam'); await E.waitForSelector('#nvEsperando');
    ok(ultimoPedido(ANA).grupo_id === GID, 'o pedido "para a família" leva a família');
    await verPedido(D);
    await D.waitForSelector('#nvSas', { timeout: 30000 });
    const txtD = await D.textContent('.nv-card');
    ok(/Ana Teste/.test(txtD) && /ana@teste\.com/.test(txtD) && /Só aprove se a pessoa está com você \(ou ao telefone\) e lê o mesmo número/.test(txtD), 'a responsável vê o nome e o e-mail de quem pede e o aviso "só aprove se a pessoa está com você…"');
    const [sD, sE] = await Promise.all([sasDe(D), sasDe(E)]);
    ok(sD === sE, 'os 6 números batem (' + sD + ')');
    await D.fill('#nvApPin', '482915'); await D.click('#nvApOk');
    await E.waitForSelector('#nvPC', { timeout: 30000 }); await E.fill('#nvPC', '482915'); await E.click('#nvPCOk');
    await E.waitForSelector('#nvSelo', { timeout: 90000 });
    await E.waitForFunction(() => (Store.estado.gastos || []).some((g) => g.desc === 'Cinema de teste'), null, { timeout: 30000 });
    const Le = await E.evaluate(() => MoneyNuvem._teste.Cadeado.local());
    ok(Le && !Le.sk && Le.fam && Le.fam['22222222-2222-2222-2222-222222222222'] && Le.como === 'familia', 'E abre as finanças da família, sem a chave pessoal da Ana (a Bia não tem)');
    const apE = db.sol_aparelhos.find((a) => a.user_id === ANA && a.como === 'familia');
    ok(apE && apE.aprovado_por === BIA, 'fica registrado: aprovado pela Bia');
    await A.evaluate(() => MoneyNuvem._teste.Aparelhos.aoAbrir());
    await A.waitForSelector('#nvAvisoAp', { timeout: 10000 });
    ok(/Um aparelho novo entrou na sua conta: .*aprovado por Bia Teste/.test(await A.textContent('#nvAvisoAp')) && await A.isVisible('#nvAvisoTirar'), 'os aparelhos da Ana avisam: "Um aparelho novo entrou na sua conta, aprovado por Bia. Não foi você? Tirar"');
    await A.click('#nvAvisoX');

    console.log('6) tirar aparelho');
    await A.click('#nvSelo'); await A.waitForSelector('#nvAps .nv-ap');
    ok(!(await A.$('#nvApPk')), 'painel: sem leitor de digital, "passkey" não aparece');
    const nAps = await A.$$eval('#nvAps .nv-ap', (l) => l.length);
    ok(nAps === 3 && /este aparelho/.test(await A.textContent('#nvAps')), 'painel → Aparelhos: os 3 aparelhos da Ana, com "(este aparelho)"');
    await A.click('#nvAps [data-tirar="' + apB.id + '"]');
    await A.waitForFunction((id) => !document.querySelector('[data-tirar="' + id + '"]'), apB.id, { timeout: 10000 });
    ok(!!db.sol_aparelhos.find((a) => a.id === apB.id).removido_em, 'A tira o celular B da conta');
    await B.reload();
    await B.waitForSelector('#nvApOutro', { timeout: 60000 });
    const Lb2 = await B.evaluate(() => MoneyNuvem._teste.Cadeado.local());
    ok(!Lb2, 'B, ao abrir de novo: o cadeado local some e volta para "Primeira vez"');

    console.log('7) passkey: com uma passkey na conta, mas sem leitor de digital, a opção não aparece');
    db.sol_passkeys.push({ user_id: ANA, cred_id: 'credencial-de-teste-0001', sal: b64u(crypto.randomBytes(32)), fechada: { iv: 'x', ct: 'y' }, criado_em: agora() });
    await B.reload(); await B.waitForSelector('#nvApOutro', { timeout: 60000 }); await esperar(800);
    ok(!(await B.$('#nvApPasskey')), 'sem leitor (headless), "Usar a digital (passkey)" não aparece');
    const comLeitor = await aparelho(browser, { width: 390, height: 800 }, 'F', () => { if (window.PublicKeyCredential) PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = () => Promise.resolve(true); });
    await entrar(comLeitor, ANA); await comLeitor.waitForSelector('#nvApPasskey', { timeout: 10000 });
    ok(true, 'com leitor de digital e uma passkey na conta, "Usar a digital (passkey)" aparece');

    for (const pg of [A, B, D, E, comLeitor]) ok(pg.erros.length === 0, pg.nome + ': sem erro de página' + (pg.erros.length ? ': ' + pg.erros.join(' | ') : ''));
  } catch (e) {
    falhas++; console.error('ERRO NO TESTE:', e);
  } finally { await browser.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
