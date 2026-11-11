/* =====================================================================
   teste/teste-sair-pin.js — 3.64.1: "Sair" sai de verdade, e "Criar o PIN da conta" sem o PIN antigo (nuvem.js 1.11.1)
   ---------------------------------------------------------------------
   Com o "Supabase de mentira" (teste/mock-sol.js) e a digital simulada (autenticador virtual com PRF):
     1. a conta SEM PIN da conta; abrir com o PIN antigo NÃO cria o PIN da conta e mostra o aviso no topo; o computador abre
        com a DIGITAL; o aviso "Criar agora" e o painel mostram "Criar o PIN da conta" (e não "Trocar");
        cria sem o PIN antigo → fecha → o PIN antigo dá "PIN errado" → abre com o PIN novo; um segundo aparelho, aprovado, entra com esse PIN; sem internet,
        o computador abre pelo L.pin;
     2. "Sair" do menu do perfil: nenhum dado na tela; recarregar continua na tela de entrar; o "Voltar" do navegador não mostra
        dados; entrar de novo funciona.
   Dados fictícios. Uso: node teste/teste-sair-pin.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { SB, M, db, supabase, prepararChaves, PESSOAS, ANA } = require('./mock-sol');
const RAIZ = path.join(__dirname, '..');
let falhas = 0, oks = 0;
const ok = (c, m) => { if (c) { oks++; console.log('  ✓ ' + m); } else { falhas++; console.log('  ✗ FALHOU: ' + m); } };
let BASE = '';
function servidor() {
  const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };
  const s = http.createServer((req, res) => {
    const p = path.join(RAIZ, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': tipos[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
  });
  return new Promise((r) => s.listen(0, '127.0.0.1', () => r(s)));
}
async function aparelho(browser, viewport, nome) {
  const ctx = await browser.newContext({ viewport, serviceWorkers: 'block' });
  await ctx.route('**/*', (route) => { const u = route.request().url(); if (u.startsWith(SB)) return supabase(route); if (u.startsWith(BASE)) return route.continue(); return route.abort(); });
  const page = await ctx.newPage(); page.erros = [];
  page.on('pageerror', (e) => { page.erros.push(String(e)); console.log('  [' + nome + ' pageerror] ' + e); });
  page.on('dialog', (d) => d.accept());
  return page;
}
const conta = () => (db.sol_pin_conta || []).find((p) => p.user_id === ANA);
const PIN_VELHO = '736251', PIN_NOVO = '582914';

(async () => {
  const srv = await servidor(); BASE = 'http://localhost:' + srv.address().port;   /* localhost: a digital (WebAuthn) não aceita IP */
  await prepararChaves();
  const browser = await chromium.launch();
  try {
    console.log('1) conta sem PIN da conta, aberta pela digital → criar o PIN da conta');
    const PC = await aparelho(browser, { width: 1366, height: 768 }, 'PC');
    const cdp = await PC.context().newCDPSession(PC);
    await cdp.send('WebAuthn.enable');
    await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, hasPrf: true, automaticPresenceSimulation: true } });
    /* o aparelho "de antes": entrou pelo código antigo e tem só o PIN dele (a conta sem PIN da conta) */
    M.semPin = true;
    await PC.goto(BASE + '/'); await PC.waitForSelector('#nvEm');
    await PC.fill('#nvEm', PESSOAS[ANA].email); await PC.fill('#nvPw', PESSOAS[ANA].senha); await PC.click('#nvIn');
    await PC.click('#nvCodigoAntigo', { timeout: 20000 }); await PC.waitForSelector('#nvCod');
    await PC.fill('#nvCod', PESSOAS[ANA].codigo); await PC.click('#nvCodOk');
    await PC.waitForSelector('#nvP1'); await PC.fill('#nvP1', PIN_VELHO); await PC.fill('#nvP2', PIN_VELHO); await PC.click('#nvPOk');
    await PC.waitForSelector('#nvDigSim', { timeout: 90000 }); await PC.click('#nvDigSim');   /* oferece a digital logo de cara */
    await PC.waitForSelector('#nvSelo', { timeout: 90000 });
    M.semPin = false;
    ok(!conta() && (await PC.evaluate(() => MoneyNuvem._teste.Cadeado.local())).prf, 'antes: a conta sem PIN da conta; a digital ligada neste computador');
    /* abre com o PIN ANTIGO deste aparelho: abre, mas NÃO cria o PIN da conta em silêncio; o aviso aparece no topo */
    await PC.evaluate(() => MoneyNuvem._teste.Vale.apagar()); await PC.reload();
    await PC.waitForSelector('#nvPin', { timeout: 60000 }); await PC.fill('#nvPin', PIN_VELHO); await PC.click('#nvPinOk');
    await PC.waitForSelector('#nvSelo', { timeout: 60000 });
    await PC.waitForSelector('#nvAvisoPin', { timeout: 20000 }).catch(() => {});
    ok(!conta(), 'abrir com o PIN antigo do aparelho NÃO cria o PIN da conta (sol_pin_conta continua vazio)');
    ok(/Crie o PIN da sua conta SolverONE: vale em todos os seus aparelhos e apps/.test(await PC.textContent('#nvAvisoPin').catch(() => '')), 'aviso no topo: "Crie o PIN da sua conta SolverONE … · Criar agora"');
    await PC.screenshot({ path: '/tmp/aviso-pin.png' });
    /* tranca e abre pela DIGITAL (o PIN antigo não é digitado) */
    await PC.evaluate(() => MoneyNuvem._teste.Vale.apagar()); await PC.reload();
    await PC.waitForSelector('#nvDig', { timeout: 60000 }); await PC.click('#nvDig');
    await PC.waitForSelector('#nvSelo', { timeout: 60000 });
    await PC.click('#nvSelo'); await PC.waitForSelector('.nv-painel #nvTrancar');
    await PC.waitForFunction(() => { const a = document.querySelector('#nvPinCriar'), b = document.querySelector('#nvPin'); return a && b && (!a.classList.contains('nv-hidden') || !b.classList.contains('nv-hidden')); }, null, { timeout: 20000 });
    const bts = await PC.evaluate(() => ({ criar: !document.querySelector('#nvPinCriar').classList.contains('nv-hidden'), trocar: !document.querySelector('#nvPin').classList.contains('nv-hidden') }));
    ok(bts.criar && !bts.trocar, 'aberto pela digital, conta sem PIN: o painel mostra "Criar o PIN da conta" (e não "Trocar o PIN")');
    ok(/Bloquear agora/.test(await PC.textContent('#nvTrancar')) && /pede o PIN ou a digital/.test(await PC.textContent('#nvTrancar')), 'o botão diz "🔒 Bloquear agora (pede o PIN ou a digital para abrir de novo)"');
    await PC.click('#nvFechar');
    await PC.waitForSelector('#nvAvisoPin', { timeout: 20000 });
    ok(true, 'aberto pela digital: o aviso "Crie o PIN da sua conta" também aparece no topo');
    await PC.click('#nvAvisoPinOk'); await PC.waitForSelector('#nvC1');
    ok(!(await PC.$('#nvAvisoPin')), '"Criar agora" leva à tela "Criar o PIN da conta"');
    ok(!(await PC.$('#nvTA')), 'não pede o PIN antigo');
    await PC.fill('#nvC1', '111111'); await PC.fill('#nvC2', '111111'); await PC.click('#nvCOk');
    ok(/fácil de adivinhar/.test(await PC.textContent('#nvErro')), 'PIN fácil é recusado (as mesmas regras)');
    await PC.fill('#nvC1', PIN_NOVO); await PC.fill('#nvC2', PIN_NOVO); await PC.click('#nvCOk');
    await PC.waitForFunction(() => !document.querySelector('#nvC1'), null, { timeout: 60000 });
    const L = await PC.evaluate(() => MoneyNuvem._teste.Cadeado.local());
    ok(conta() && conta().versao === 1 && L.srv && L.pin && L.pinVersao === 1 && !/582914/.test(JSON.stringify(db.sol_pin_conta)), 'criou o PIN da conta (o banco só guarda o resumo); o aparelho ganhou L.pin e L.srv');
    await PC.click('#nvSelo'); await PC.waitForSelector('.nv-painel #nvTrancar');
    await PC.waitForFunction(() => !document.querySelector('#nvPin').classList.contains('nv-hidden'), null, { timeout: 20000 });
    ok(await PC.evaluate(() => document.querySelector('#nvPinCriar').classList.contains('nv-hidden')), 'agora a conta tem PIN: aparece "Trocar o PIN" e some o "Criar"');
    ok(!(await PC.$('#nvAvisoPin')), 'o aviso do topo sumiu');
    /* fecha; o PIN ANTIGO do aparelho não abre mais; abre com o PIN novo */
    await PC.click('#nvTrancar'); await PC.waitForSelector('input#nvPin');
    await PC.fill('input#nvPin', PIN_VELHO); await PC.click('#nvPinOk');
    await PC.waitForFunction(() => /PIN errado/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
    ok(/PIN errado/.test(await PC.evaluate(() => document.body.innerText)) && await PC.$('#nvPin'), 'depois de criar o PIN da conta, o PIN antigo do aparelho dá "PIN errado"');
    await PC.fill('input#nvPin', '');
    await PC.fill('#nvPin', PIN_NOVO); await PC.click('#nvPinOk');
    await PC.waitForFunction(() => !document.querySelector('#nvPin'), null, { timeout: 60000 });
    ok(true, 'fechou e abriu com o PIN novo da conta');
    /* um segundo aparelho, aprovado, entra com esse PIN */
    const CEL = await aparelho(browser, { width: 390, height: 800 }, 'CEL');
    await CEL.goto(BASE + '/'); await CEL.waitForSelector('#nvEm');
    await CEL.fill('#nvEm', PESSOAS[ANA].email); await CEL.fill('#nvPw', PESSOAS[ANA].senha); await CEL.click('#nvIn');
    await CEL.waitForSelector('#nvApOutro', { timeout: 20000 }); await CEL.click('#nvApOutro'); await CEL.waitForSelector('#nvEsperando');
    await PC.evaluate(() => { const ap = MoneyNuvem._teste.Aparelhos; ap._vistos = {}; return ap.olharPedidos(); });
    await PC.waitForSelector('#nvPedidoVer', { timeout: 10000 }); await PC.click('#nvPedidoVer');
    await PC.waitForSelector('#nvApPin', { timeout: 30000 }); await PC.fill('#nvApPin', PIN_NOVO); await PC.click('#nvApOk');
    await CEL.waitForSelector('#nvPC', { timeout: 30000 });
    await CEL.fill('#nvPC', PIN_NOVO); await CEL.click('#nvPCOk');
    await CEL.waitForSelector('#nvSelo', { timeout: 60000 });
    ok(true, 'um segundo aparelho, aprovado pelo computador, entra com o PIN da conta criado');
    /* sem internet, o computador abre pelo L.pin */
    await PC.click('#nvSelo'); await PC.click('#nvTrancar'); await PC.waitForSelector('#nvPin');
    await PC.context().setOffline(true);
    await PC.fill('#nvPin', PIN_NOVO); await PC.click('#nvPinOk');
    await PC.waitForFunction(() => !document.querySelector('#nvPin'), null, { timeout: 60000 });
    ok(true, 'sem internet, o computador abre com o PIN da conta (pelo L.pin)');
    await PC.context().setOffline(false);

    console.log('2) "Sair" do menu do perfil sai de verdade');
    await PC.evaluate(() => { abrirApp('budget'); Gasto.add({ data: '2026-11-05', valor: 12.34, grupo: 'LAZER', sub: 'Bar', desc: 'BAR DO TESTE SAIR' }); Store.salvar(); irPara('b-lanc'); bFiltro.periodo = 'tudo'; render(); });
    await PC.waitForTimeout(400);
    ok(/BAR DO TESTE SAIR/.test(await PC.textContent('body')), 'antes: o lançamento está na tela');
    await PC.evaluate(() => alternarPerfilMenu()); await PC.click('[data-perfil="sair"]');
    await PC.waitForSelector('#nvEm', { timeout: 30000 });
    const sem = async () => !/BAR DO TESTE SAIR|12,34/.test(await PC.evaluate(() => document.body.innerText));
    ok(await sem(), 'depois de Sair: a tela de entrar e nenhum dado na tela');
    await PC.reload(); await PC.waitForSelector('#nvEm', { timeout: 30000 });
    ok(await sem(), 'recarregar continua na tela de entrar, sem dados');
    await PC.goBack().catch(() => {}); await PC.waitForTimeout(1500);
    ok(await sem(), 'o "Voltar" do navegador não mostra dados');
    await PC.goto(BASE + '/'); await PC.waitForSelector('#nvEm');
    await PC.fill('#nvEm', PESSOAS[ANA].email); await PC.fill('#nvPw', PESSOAS[ANA].senha); await PC.click('#nvIn');
    await PC.waitForSelector('#nvPin, #nvDig', { timeout: 30000 });
    await PC.fill('#nvPin', PIN_NOVO); await PC.click('#nvPinOk');
    await PC.waitForSelector('#nvSelo', { timeout: 60000 });
    await PC.evaluate(() => { abrirApp('budget'); irPara('b-lanc'); bFiltro.periodo = 'tudo'; render(); }); await PC.waitForTimeout(300);
    ok(/BAR DO TESTE SAIR/.test(await PC.textContent('body')), 'entrar de novo funciona (os dados voltam da nuvem)');
    ok(PC.erros.length === 0 && CEL.erros.length === 0, 'sem erro de página');
  } catch (e) { falhas++; console.log('  ✗ ERRO: ' + (e && e.stack || e)); }
  await browser.close(); srv.close();
  console.log('\n' + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
