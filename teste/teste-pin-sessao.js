/* =====================================================================
   teste/teste-pin-sessao.js — 3.106 (nuvem.js 1.15.7): o PIN da conta com o app reaberto pela SESSÃO GUARDADA
   ---------------------------------------------------------------------
   Defeito 3 do dono: reaberto pela sessão guardada (Vale.usar → Cadeado.usarChave) o cadeado fica aberto, mas a chave do aparelho
   (dukRaw) não vem; "Criar agora" dava "Desbloqueie de novo e tente outra vez." (sem saída). Agora:
     1. o aviso do topo diz que é opcional, tem "O que é isso?" (abre o passo a passo) e "Depois" (esconde 7 dias e volta);
     2. "Criar agora" pede ali mesmo o PIN deste aparelho (PIN errado avisa) e segue para criar o PIN da conta;
     3. "Trocar o PIN" do painel, também reaberto pela sessão, pede o PIN deste aparelho e segue;
     4. o aparelho que está na lista, mas cujo navegador apagou a chave, ouve isso na tela "Primeira vez" (defeito f).
   Com o "Supabase de mentira" (teste/mock-sol.js). Dados fictícios. Uso: node teste/teste-pin-sessao.js
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
const conta = () => (db.sol_pin_conta || []).find((p) => p.user_id === ANA);
const PIN_VELHO = '736251', PIN_NOVO = '582914';
const K = 'dgo:moneytrio:aviso:pin-conta:depois';

(async () => {
  const srv = await servidor(); BASE = 'http://localhost:' + srv.address().port;
  await prepararChaves();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (route) => { const u = route.request().url(); if (u.startsWith(SB)) return supabase(route); if (u.startsWith(BASE)) return route.continue(); return route.abort(); });
    const P = await ctx.newPage(); const erros = [];
    P.on('pageerror', (e) => { erros.push(String(e)); console.log('  [pageerror] ' + e); });
    P.on('dialog', (d) => d.accept());
    const pinNaMemoria = () => P.evaluate(() => MoneyNuvem.escopos.estado().pin);
    const reabrirPelaSessao = async () => { await P.reload(); await P.waitForSelector('#nvSelo', { timeout: 60000 }); };

    console.log('1) conta sem PIN da conta; o app reaberto pela sessão guardada');
    M.semPin = true;
    await P.goto(BASE + '/'); await P.waitForSelector('#nvEm');
    await P.fill('#nvEm', PESSOAS[ANA].email); await P.fill('#nvPw', PESSOAS[ANA].senha); await P.click('#nvIn');
    await P.click('#nvCodigoAntigo', { timeout: 20000 }); await P.waitForSelector('#nvCod');
    await P.fill('#nvCod', PESSOAS[ANA].codigo); await P.click('#nvCodOk');
    await P.waitForSelector('#nvP1'); await P.fill('#nvP1', PIN_VELHO); await P.fill('#nvP2', PIN_VELHO); await P.click('#nvPOk');
    await P.waitForSelector('#nvSelo', { timeout: 90000 });
    M.semPin = false;
    await reabrirPelaSessao();
    ok(!(await P.$('input#nvPin')) && !(await pinNaMemoria()), 'reabriu pela sessão guardada (sem pedir o PIN): o cadeado aberto, mas a chave do aparelho não está na memória');

    console.log('2) o aviso do topo: opcional, "O que é isso?" e "Depois" por 7 dias');
    await P.waitForSelector('#nvAvisoPin', { timeout: 20000 });
    const tx = await P.textContent('#nvAvisoPin');
    ok(/\(opcional\)/.test(tx) && /Se não criar agora, ao entrar num aparelho novo você escolhe o PIN lá/.test(tx), 'o aviso diz que é opcional e o que acontece sem ele');
    ok(/Depois/.test(await P.textContent('#nvAvisoPinX')) && !/✕/.test(tx), 'o ✕ virou "Depois"');
    await P.click('#nvAvisoPinQue'); await P.waitForSelector('#nvAjPinPassos');
    const aj = await P.evaluate(() => document.querySelector('#nvPortao').innerText);
    ok(/É obrigatório\?/.test(aj) && /Aprovar pelo outro aparelho/.test(aj) && /Pedido de acesso/.test(aj) && /6 números/.test(aj) && /Instalar app/.test(aj), '"O que é isso?" abre o passo a passo (obrigatório?, Aprovar pelo outro aparelho, Pedido de acesso, 6 números, Instalar app)');
    await P.click('#nvAjPinOk');
    await P.click('#nvAvisoPinX');
    const ate = await P.evaluate((k) => JSON.parse(localStorage.getItem(k)), K);
    const dias = (ate - Date.now()) / 86400000;
    ok(!(await P.$('#nvAvisoPin')) && dias > 6.9 && dias <= 7.01, '"Depois" esconde e grava a chave ' + K + ' para daqui a 7 dias (' + dias.toFixed(2) + ')');
    await reabrirPelaSessao(); await P.waitForTimeout(4000);
    ok(!(await P.$('#nvAvisoPin')), 'reabrindo dentro dos 7 dias, o aviso não volta');
    await P.evaluate((k) => localStorage.setItem(k, JSON.stringify(Date.now() - 1000)), K);
    await reabrirPelaSessao(); await P.waitForSelector('#nvAvisoPin', { timeout: 20000 }).catch(() => {});
    ok(!!(await P.$('#nvAvisoPin')), 'passados os 7 dias, o aviso volta (aviso de segurança nunca some para sempre)');

    console.log('2b) o PIN da conta criado em OUTRO aparelho (item j): o aviso sai sozinho e "Criar" não deixa criar outro');
    db.sol_pin_conta = db.sol_pin_conta || []; const deOutro = { user_id: ANA, sal: 'c2FsLWZpY3RpY2lv', versao: 1, v: 'x', tentativas: 0 }; db.sol_pin_conta.push(deOutro);
    await P.evaluate(() => MoneyNuvem.buscarAgora && MoneyNuvem.buscarAgora());
    await P.waitForFunction(() => !document.getElementById('nvAvisoPin'), null, { timeout: 30000 }).catch(() => {});
    ok(!(await P.$('#nvAvisoPin')), 'na próxima busca, o aviso "Crie o PIN" sai sozinho');
    await P.evaluate(() => MoneyNuvem.criarPinConta()); await P.waitForSelector('#nvJaTem', { timeout: 10000 }).catch(() => {});
    ok(/já foi criado em outro aparelho seu\. Use esse mesmo PIN aqui/.test(await P.textContent('#nvJaTem').catch(() => '')) && !(await P.$('#nvC1')), '"Criar o PIN" com a conta já com PIN: "Sua conta já tem PIN… Use esse mesmo PIN aqui" (sem formulário)');
    await P.click('#nvJaTemOk');
    db.sol_pin_conta.splice(db.sol_pin_conta.indexOf(deOutro), 1);
    await P.evaluate(() => MoneyNuvem._teste.Aparelhos.avisoCriarPin());

    console.log('3) "Criar agora" sem a chave na memória: pede o PIN deste aparelho e cria');
    await P.click('#nvAvisoPinOk'); await P.waitForSelector('#nvKPin');
    ok(/Criar o PIN da conta/.test(await P.textContent('#nvPortao h2')) && !/Desbloqueie de novo/.test(await P.textContent('#nvPortao')), 'em vez do erro sem saída, a tela pede o "PIN deste aparelho"');
    await P.fill('#nvKPin', '000111'); await P.click('#nvKOk');
    await P.waitForFunction(() => /PIN errado/.test((document.querySelector('#nvErro') || {}).textContent || ''), null, { timeout: 30000 }).catch(() => {});
    ok(/PIN errado/.test(await P.textContent('#nvErro')) && !!(await P.$('#nvKPin')), 'PIN errado: avisa e continua na mesma tela');
    await P.fill('#nvKPin', PIN_VELHO); await P.click('#nvKOk');
    await P.waitForSelector('#nvC1', { timeout: 30000 });
    ok(await pinNaMemoria(), 'com o PIN certo, a chave do aparelho volta para a memória e abre a tela "Criar o PIN da conta"');
    await P.fill('#nvC1', PIN_NOVO); await P.fill('#nvC2', PIN_NOVO); await P.click('#nvCOk');
    await P.waitForFunction(() => !document.querySelector('#nvC1'), null, { timeout: 60000 });
    const L = await P.evaluate(() => MoneyNuvem._teste.Cadeado.local());
    ok(conta() && conta().versao === 1 && L.srv && L.pinVersao === 1, 'o PIN da conta foi criado (sem bloquear e desbloquear)');

    console.log('4) "Trocar o PIN" do painel, reaberto pela sessão: pede o PIN deste aparelho e segue');
    await reabrirPelaSessao();
    ok(!(await pinNaMemoria()), 'reaberto de novo pela sessão: sem a chave na memória');
    await P.click('#nvSelo'); await P.waitForSelector('.nv-painel #nvTrancar');
    await P.waitForFunction(() => !document.querySelector('#nvPin').classList.contains('nv-hidden'), null, { timeout: 20000 });
    await P.click('.nv-painel #nvPin'); await P.waitForSelector('#nvKPin');
    ok(/Trocar o PIN da conta/.test(await P.textContent('#nvPortao h2')), '"Trocar o PIN" pede o PIN deste aparelho (antes: "toque em Bloquear agora e desbloqueie de novo")');
    await P.fill('#nvKPin', PIN_NOVO); await P.click('#nvKOk'); await P.waitForSelector('#nvTA', { timeout: 30000 });
    ok(true, 'com o PIN, segue para a tela "Trocar o PIN da conta"');
    await P.click('#nvTVolta');

    console.log('5) aparelho que está na lista, mas o navegador apagou a chave (defeito f)');
    await P.evaluate(async () => { const T = MoneyNuvem._teste; await T.Vale.apagar(); await T.IDB.del('kv', T.Cadeado.K()); });
    await P.reload(); await P.waitForSelector('#nvApOutro', { timeout: 60000 });
    ok(/Este computador já entrou antes, mas o navegador apagou a chave guardada\. Aprove de novo pelo outro aparelho\./.test(await P.textContent('#nvJaEntrou').catch(() => '')), '"Primeira vez" de um aparelho que já está na lista explica: "já entrou antes, mas o navegador apagou a chave guardada"');

    console.log('6) EN e ES');
    for (const [l, rx] of [['en', /Create your SolverONE account PIN \(optional\)/], ['es', /Crea el PIN de tu cuenta SolverONE \(opcional\)/]]) {
      const t = await P.evaluate((x) => { I18n.atual = x; const a = document.getElementById('nvAvisoPin'); if (a) a.remove(); localStorage.removeItem('dgo:moneytrio:aviso:pin-conta:depois'); MoneyNuvem._teste.Aparelhos.avisoCriarPin(); const t = document.getElementById('nvAvisoPin').innerText; document.getElementById('nvAvisoPin').remove(); return t; }, l);
      ok(rx.test(t), l.toUpperCase() + ': o aviso traduzido');
    }
    await P.evaluate(() => { I18n.atual = 'pt'; });
    ok(!erros.length, 'sem erro na página ' + erros.join(' | '));
  } finally { await browser.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
