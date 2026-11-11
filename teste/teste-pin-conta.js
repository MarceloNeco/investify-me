/* =====================================================================
   teste/teste-pin-conta.js — 3.62: PIN DA CONTA (um PIN só, igual em todos os aparelhos; nuvem.js 1.10.0)
   ---------------------------------------------------------------------
   Ponta a ponta, um contexto de navegador por aparelho, com o "Supabase de mentira" de teste/mock-sol.js (as mesmas regras
   de supabase/2026-11-11-sol-pin-conta.sql, que tem o teste próprio em teste/sql/teste-sol-pin-conta.sql).
     1. migração com PINs DIFERENTES: o celular (PIN antigo 736251) destrava primeiro e o PIN dele vira o da conta; o
        computador (PIN antigo 482915) destrava com o antigo → "Agora o PIN é um só para a conta" → digita o da conta;
        um terceiro aparelho digita direto o PIN da conta → "Falta só um passo" (o PIN antigo dele, uma vez só);
     2. troca num aparelho vale no outro: o computador troca; o celular tranca ("foi trocado em outro aparelho") e só
        abre com o PIN novo;
     3. 10 erros → espera de 24 h (nem o PIN certo entra);
     4. desbloquear por aprovação: "Esqueci o PIN" → o celular aprova → o computador escolhe um PIN novo da conta;
     5. sem internet: o PIN que o aparelho conhecia abre (L.pin); de volta à internet, pede o PIN novo.
   Uso (na pasta raiz): node teste/teste-pin-conta.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { SB, M, db, supabase, prepararChaves, PESSOAS, ANA } = require('./mock-sol');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
function servidor() {
  const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
  const s = http.createServer((req, res) => {
    const p = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': tipos[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
  });
  return new Promise((r) => s.listen(0, '127.0.0.1', () => r(s)));
}
let BASE = '';
async function aparelho(browser, viewport, nome) {
  const ctx = await browser.newContext({ viewport, serviceWorkers: 'block' });
  await ctx.route('**/*', (route) => { const u = route.request().url(); if (u.startsWith(SB)) return supabase(route); if (u.startsWith(BASE)) return route.continue(); return route.abort(); });
  const page = await ctx.newPage(); page.erros = []; page.nome = nome;
  page.on('pageerror', (e) => { page.erros.push(String(e)); console.log('  [' + nome + ' pageerror] ' + e); });
  page.on('dialog', (d) => d.accept());
  return page;
}
/* um aparelho "de antes" (3.61): entra pelo código antigo e cria um PIN só dele (o banco ainda sem PIN da conta) */
async function antigo(page, pin) {
  M.semPin = true;
  await page.goto(BASE + '/'); await page.waitForSelector('#nvEm');
  await page.fill('#nvEm', PESSOAS[ANA].email); await page.fill('#nvPw', PESSOAS[ANA].senha); await page.click('#nvIn');
  await page.click('#nvCodigoAntigo', { timeout: 20000 }); await page.waitForSelector('#nvCod');
  await page.fill('#nvCod', PESSOAS[ANA].codigo); await page.click('#nvCodOk');
  await page.waitForSelector('#nvP1'); await page.fill('#nvP1', pin); await page.fill('#nvP2', pin); await page.click('#nvPOk');
  await page.waitForSelector('#nvSelo', { timeout: 90000 });
  M.semPin = false;
}
/* fecha o cadeado e mostra a tela do PIN (recarrega sem o "vale" de 15 min: o app começa de novo, com o PIN da conta ligado) */
async function trancar(page) {
  await page.evaluate(() => MoneyNuvem._teste.Vale.apagar());
  await page.reload(); await page.waitForSelector('#nvPin', { timeout: 60000 });
}
async function digitarPin(page, pin) { await page.fill('#nvPin', pin); await page.click('#nvPinOk'); }
const local = (page) => page.evaluate(() => MoneyNuvem._teste.Cadeado.local());
const conta = () => db.sol_pin_conta.find((p) => p.user_id === ANA);
const erroTela = (page) => page.evaluate(() => (document.querySelector('#nvErro') || {}).textContent || '');

(async () => {
  const srv = await servidor(); BASE = 'http://127.0.0.1:' + srv.address().port;
  await prepararChaves();
  const browser = await chromium.launch();
  try {
    console.log('1) migração: dois aparelhos com PINs DIFERENTES');
    const CEL = await aparelho(browser, { width: 390, height: 800 }, 'CEL');
    const PC = await aparelho(browser, { width: 1366, height: 768 }, 'PC');
    await antigo(CEL, '736251');
    await antigo(PC, '482915');
    ok(!conta() && db.sol_aparelhos.filter((a) => a.user_id === ANA).length === 2, 'antes: a conta sem PIN e os 2 aparelhos na lista, cada um com o PIN dele');
    await trancar(CEL); await digitarPin(CEL, '736251'); await CEL.waitForSelector('#nvSelo', { timeout: 60000 });
    const Lc = await local(CEL);
    ok(conta() && conta().versao === 1 && Lc.srv && Lc.pinVersao === 1, 'o 1º que destrava (celular) define o PIN da conta = o PIN dele; o aparelho ganha a cópia do servidor (L.srv)');
    ok(!/736251/.test(JSON.stringify(db.sol_pin_conta)) && /^[0-9a-f]{64}$/.test(conta().hv), 'o banco não tem o PIN: só SHA-256(v)');
    await trancar(PC); await digitarPin(PC, '482915');
    await PC.waitForSelector('#nvPDC', { timeout: 30000 });
    ok(/Agora o PIN é um só para a conta/.test(await PC.textContent('.nv-card')), 'o computador destrava com o PIN antigo dele → "Agora o PIN é um só para a conta: digite o PIN da conta"');
    await PC.fill('#nvPDC', '000000'); await PC.click('#nvPDCOk');
    await PC.waitForFunction(() => /PIN errado/.test((document.querySelector('#nvErro') || {}).textContent || ''));
    ok(true, 'PIN da conta errado: avisa');
    await PC.fill('#nvPDC', '736251'); await PC.click('#nvPDCOk'); await PC.waitForSelector('#nvSelo', { timeout: 60000 });
    const Lp = await local(PC);
    ok(Lp.srv && Lp.pinVersao === 1 && conta().tentativas === 0, 'com o PIN da conta, o computador passa a usar o PIN da conta (e as tentativas zeram)');
    await trancar(PC); await digitarPin(PC, '482915');
    await PC.waitForFunction(() => /PIN errado/.test((document.querySelector('#nvErro') || {}).textContent || ''), null, { timeout: 30000 });
    ok(true, 'o PIN antigo do computador não abre mais');
    await digitarPin(PC, '736251'); await PC.waitForSelector('#nvSelo', { timeout: 60000 });
    ok(true, 'o computador abre com o PIN da conta');
    /* terceiro aparelho antigo: digita direto o PIN da conta → "Falta só um passo" (o PIN antigo dele, uma vez só) */
    const T = await aparelho(browser, { width: 390, height: 800 }, 'T');
    M.semPin = true; await antigo(T, '590317');
    await trancar(T); await digitarPin(T, '736251');
    await T.waitForSelector('#nvPA', { timeout: 30000 });
    ok(/Falta só um passo/.test(await T.textContent('.nv-card')) && await T.isVisible('#nvPAEsq'), 'aparelho antigo que digita o PIN da conta: "Falta só um passo" (o PIN antigo dele uma vez, ou aprovar pelo outro)');
    await T.fill('#nvPA', '590317'); await T.click('#nvPAOk'); await T.waitForSelector('#nvSelo', { timeout: 60000 });
    ok((await local(T)).srv, 'com o PIN antigo uma vez, ele passa para o PIN da conta');
    await T.context().close();

    console.log('2) troca num aparelho vale no outro');
    await PC.click('#nvSelo'); await PC.click('#nvPin');
    await PC.waitForSelector('#nvTA');
    await PC.fill('#nvTA', '736251'); await PC.fill('#nvT1', '864213'); await PC.fill('#nvT2', '864213'); await PC.click('#nvTOk');
    await PC.waitForFunction(() => !document.querySelector('#nvTA'), null, { timeout: 30000 });
    ok(conta().versao === 2, 'o computador troca o PIN da conta (versão 2)');
    await CEL.evaluate(() => MoneyNuvem._teste.Aparelhos.aoAbrir());
    await CEL.waitForSelector('#nvPin', { timeout: 15000 });
    ok(/foi trocado em outro aparelho/.test(await CEL.textContent('.nv-card')), 'o celular percebe e tranca: "O PIN da conta foi trocado em outro aparelho"');
    await digitarPin(CEL, '736251');
    await CEL.waitForFunction(() => /PIN errado/.test((document.querySelector('#nvErro') || {}).textContent || ''), null, { timeout: 30000 });
    ok(true, 'o PIN velho não abre o celular');
    await digitarPin(CEL, '864213'); await CEL.waitForFunction(() => !document.querySelector('#nvPin'), null, { timeout: 60000 });
    ok((await local(CEL)).pinVersao === 2, 'o PIN novo abre o celular (pela cópia do servidor) e o PIN local dele é refeito');

    console.log('3) 10 erros → espera de 24 h');
    await trancar(PC);
    for (let i = 1; i <= 10; i++) {
      conta().espera_ate = null;   /* o tempo "passa" entre as tentativas (as esperas de 30 s a 30 min são testadas no SQL) */
      await digitarPin(PC, '111' + String(100 + i).slice(1));
      await PC.waitForFunction((n) => /PIN errado|Espere|24 h/.test((document.querySelector('#nvErro') || {}).textContent || '') && document.querySelector('#nvPinOk') && !document.querySelector('#nvPinOk').disabled, i, { timeout: 30000 });
    }
    ok(conta().tentativas === 10 && conta().espera_ate > M.relogio + 23 * 3600e3, '10º erro: 24 h de espera, contadas no banco');
    await digitarPin(PC, '864213');
    await PC.waitForFunction(() => /24 h/.test((document.querySelector('#nvErro') || {}).textContent || ''), null, { timeout: 30000 });
    ok(/PIN errado muitas vezes: tente de novo em 24 h ou aprove por outro aparelho seu/.test(await erroTela(PC)), 'nem o PIN certo entra: "PIN errado muitas vezes: tente de novo em 24 h ou aprove por outro aparelho seu"');

    console.log('4) desbloquear por aprovação de outro aparelho');
    const apVelhoPC = (await local(PC)).ap;
    await PC.click('#nvEsqPin'); await PC.waitForSelector('#nvApOutro'); await PC.click('#nvApOutro'); await PC.waitForSelector('#nvEsperando');
    await CEL.evaluate(() => { const ap = MoneyNuvem._teste.Aparelhos; ap._vistos = {}; return ap.olharPedidos(); });
    await CEL.waitForSelector('#nvPedidoVer', { timeout: 10000 }); await CEL.click('#nvPedidoVer');
    await CEL.waitForSelector('#nvApPin', { timeout: 30000 }); await CEL.fill('#nvApPin', '864213'); await CEL.click('#nvApOk');
    await PC.waitForSelector('#nvPC', { timeout: 30000 });
    ok(/Digite o PIN da sua conta/.test(await PC.textContent('.nv-card')), 'aprovado: o computador pede o PIN da conta (não cria outro)');
    await PC.click('#nvPCNovo'); await PC.waitForSelector('#nvP1');
    await PC.fill('#nvP1', '951357'); await PC.fill('#nvP2', '951357'); await PC.click('#nvPOk');
    await PC.waitForSelector('#nvSelo', { timeout: 60000 });
    ok(conta().versao === 3 && conta().tentativas === 0 && !conta().espera_ate, '"Não lembro": escolhe um PIN novo da conta (versão 3), sem espera e com as tentativas zeradas');
    const apNovoPC = (await local(PC)).ap;
    ok(apNovoPC && apNovoPC !== apVelhoPC && db.sol_aparelhos.find((a) => a.id === apVelhoPC).removido_em && !db.sol_aparelhos.find((a) => a.id === apNovoPC).removido_em, 'o lugar antigo do computador na lista sai (fica o novo)');

    console.log('5) sem internet: abre com o PIN que o aparelho conhecia');
    await CEL.click('#nvSelo'); await CEL.click('#nvTrancar'); await CEL.waitForSelector('#nvPin');
    await CEL.context().setOffline(true);
    await digitarPin(CEL, '864213'); await CEL.waitForFunction(() => !document.querySelector('#nvPin'), null, { timeout: 60000 });
    ok(true, 'sem internet, o celular abre com o PIN que conhecia (o L.pin)');
    await CEL.context().setOffline(false);
    await CEL.evaluate(() => MoneyNuvem._teste.Aparelhos.aoAbrir());
    await CEL.waitForSelector('#nvPin', { timeout: 15000 });
    await digitarPin(CEL, '951357'); await CEL.waitForFunction(() => !document.querySelector('#nvPin'), null, { timeout: 60000 });
    ok((await local(CEL)).pinVersao === 3, 'de volta à internet: tranca, pede o PIN novo da conta e passa a usá-lo');

    for (const pg of [CEL, PC]) ok(pg.erros.length === 0, pg.nome + ': sem erro de página' + (pg.erros.length ? ': ' + pg.erros.join(' | ') : ''));
  } catch (e) {
    falhas++; console.error('ERRO NO TESTE:', e);
  } finally { await browser.close(); srv.close(); }
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
