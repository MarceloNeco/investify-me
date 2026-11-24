/* =====================================================================
   teste/teste-tempo-real.js — 3.106 (item m): o aviso em TEMPO REAL da conta (nuvem.js 1.15.7, TempoReal)
   ---------------------------------------------------------------------
   Um servidor Realtime de mentira (page.routeWebSocket, protocolo Phoenix) no lugar do Supabase:
     1. phx_join no tópico realtime:sol:conta:<uid>, privado, com o access_token; heartbeat;
     2. 'pin' → o aviso "Crie o PIN" some na hora; 'pedido' → abre o "Pedido de acesso"; 'aparelho' de outro id não tira este;
     3. a queda do websocket não quebra nada e ele volta sozinho; o join com erro desiste em silêncio (não insiste).
   O canal fica DESLIGADO no app até o banco ficar pronto: o teste liga só aqui (TempoReal.ligado = true).
   Com o "Supabase de mentira" (teste/mock-sol.js). Dados fictícios. Uso: node teste/teste-tempo-real.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { SB, M, db, supabase, prepararChaves, PESSOAS, ANA, agora } = require('./mock-sol');
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
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const srv = await servidor(); BASE = 'http://localhost:' + srv.address().port;
  await prepararChaves();
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, serviceWorkers: 'block' });
    await ctx.route('**/*', (route) => { const u = route.request().url(); if (u.startsWith(SB)) return supabase(route); if (u.startsWith(BASE)) return route.continue(); return route.abort(); });
    /* o Realtime de mentira */
    const RT = { conexoes: 0, joins: [], hb: 0, atual: null, responder: 'ok' };
    await ctx.routeWebSocket(/\/realtime\/v1\/websocket/, (ws) => {
      RT.conexoes++; RT.atual = ws; RT.url = ws.url();
      ws.onMessage((m) => { const o = JSON.parse(m);
        if (o.event === 'phx_join') { RT.joins.push(o); ws.send(JSON.stringify({ topic: o.topic, event: 'phx_reply', payload: { status: RT.responder, response: {} }, ref: o.ref })); RT.topico = o.topic; }
        if (o.event === 'heartbeat') RT.hb++; });
    });
    const mandar = (event, payload) => RT.atual.send(JSON.stringify({ topic: RT.topico, event: 'broadcast', payload: { type: 'broadcast', event, payload }, ref: null }));
    const P = await ctx.newPage(); const erros = [];
    P.on('pageerror', (e) => { erros.push(String(e)); console.log('  [pageerror] ' + e); });
    P.on('dialog', (d) => d.accept());

    console.log('1) entrar e ligar o canal');
    M.semPin = true;
    await P.goto(BASE + '/'); await P.waitForSelector('#nvEm');
    await P.fill('#nvEm', PESSOAS[ANA].email); await P.fill('#nvPw', PESSOAS[ANA].senha); await P.click('#nvIn');
    await P.click('#nvCodigoAntigo', { timeout: 20000 }); await P.waitForSelector('#nvCod');
    await P.fill('#nvCod', PESSOAS[ANA].codigo); await P.click('#nvCodOk');
    await P.waitForSelector('#nvP1'); await P.fill('#nvP1', '736251'); await P.fill('#nvP2', '736251'); await P.click('#nvPOk');
    await P.waitForSelector('#nvSelo', { timeout: 90000 });
    M.semPin = false; await P.evaluate(() => { MoneyNuvem._teste.Pin.ligado = null; });   /* como numa recarga: o SQL do PIN "voltou" */
    ok(RT.conexoes === 0 && !(await P.evaluate(() => MoneyNuvem._teste.TempoReal.ligado)), 'desligado por padrão: nenhuma conexão até o banco ficar pronto');
    await P.evaluate(() => { const T = MoneyNuvem._teste.TempoReal; T.ligado = true; return T.iniciar(); });
    await P.waitForFunction(() => MoneyNuvem._teste.TempoReal.juntou, null, { timeout: 10000 });
    const j = RT.joins[0];
    ok(j && j.topic === 'realtime:sol:conta:' + ANA && j.payload.config.private === true && j.payload.config.broadcast.self === false && typeof j.payload.access_token === 'string' && j.payload.access_token.length > 10,
      'phx_join em realtime:sol:conta:<uid>, privado, sem eco, com o access_token');
    ok(/^wss:\/\/.*\/realtime\/v1\/websocket\?apikey=.+&vsn=1\.0\.0$/.test(RT.url), 'o endereço do websocket: /realtime/v1/websocket?apikey=…&vsn=1.0.0');

    console.log('2) os eventos');
    await P.evaluate(() => { localStorage.removeItem('dgo:moneytrio:aviso:pin-conta:depois'); MoneyNuvem._teste.Aparelhos.avisoCriarPin(); });
    ok(!!(await P.$('#nvAvisoPin')), 'o aviso "Crie o PIN" está na tela');
    db.sol_pin_conta = db.sol_pin_conta || []; db.sol_pin_conta.push({ user_id: ANA, sal: 'c2FsLWZpY3RpY2lv', versao: 1, v: 'x', tentativas: 0 });
    mandar('pin', { versao: 1 });
    await P.waitForFunction(() => !document.getElementById('nvAvisoPin'), null, { timeout: 5000 }).catch(() => {});
    ok(!(await P.$('#nvAvisoPin')), "'pin': o aviso some na hora (o PIN foi criado em outro aparelho)");
    db.sol_pin_conta.pop();
    db.sol_acesso_pedidos.push({ id: '7e7e7e7e-0000-4000-8000-000000000001', user_id: ANA, nome: 'Android · Chrome', app: 'moneytrio', pub: { x: 'a', y: 'b' }, compromisso: 'c', grupo_id: null, pub_a: null, n_a: null, n_b: null, desafio_por: null,
      criado_em: agora(), expira_em: new Date(Date.now() + 10 * 60000).toISOString(), estado: 'aberto', resposta: null });
    await P.evaluate(() => { MoneyNuvem._teste.Aparelhos._vistos = {}; });
    mandar('pedido', { id: '7e7e7e7e-0000-4000-8000-000000000001' });
    await P.waitForSelector('#nvPedido', { timeout: 5000 }).catch(() => {});
    ok(/Pedido de acesso: Android · Chrome/.test(await P.textContent('#nvPedido').catch(() => '')), "'pedido': o \"Pedido de acesso\" aparece na hora (sem esperar a busca)");
    await P.click('#nvPedidoX');
    mandar('aparelho', { id: '00000000-0000-4000-8000-0000000000ff', removido: true }); await esperar(500);
    ok(!!(await P.$('#nvSelo')) && !(await P.$('#nvEm')), "'aparelho' de outro id: este continua entrando");

    console.log('3) a queda e o erro');
    const antes = RT.conexoes;
    await RT.atual.close();
    await P.waitForFunction((n) => MoneyNuvem._teste.TempoReal.juntou && true, antes, { timeout: 8000 }).catch(() => {});
    await esperar(2500);
    ok(RT.conexoes > antes && await P.evaluate(() => MoneyNuvem._teste.TempoReal.juntou), 'caiu o websocket: o app segue e ele volta sozinho (' + RT.conexoes + ' conexões)');
    ok(!!(await P.$('#nvSelo')), 'o app continua funcionando');
    await P.evaluate(() => { const T = MoneyNuvem._teste.TempoReal; T.parar(); T.desistiu = false; T.espera = 1000; });
    RT.responder = 'error'; const c0 = RT.conexoes;
    await P.evaluate(() => MoneyNuvem._teste.TempoReal.iniciar()); await esperar(3500);
    ok(await P.evaluate(() => MoneyNuvem._teste.TempoReal.desistiu && !MoneyNuvem._teste.TempoReal.ws) && RT.conexoes === c0 + 1, 'join com erro (o banco ainda não tem o canal): desiste em silêncio, sem tentar de novo');
    ok(!erros.length, 'sem erro na página ' + erros.join(' | '));
  } finally { await browser.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
