/* =====================================================================
   teste/teste-tempo-real.js — 3.106 (item m): o aviso em TEMPO REAL da conta (nuvem.js 1.15.7, TempoReal)
   ---------------------------------------------------------------------
   Um servidor Realtime de mentira (page.routeWebSocket, protocolo Phoenix) no lugar do Supabase:
     1. phx_join no tópico realtime:sol:conta:<uid>, privado, com o access_token; heartbeat;
     2. 'pin' → o aviso "Crie o PIN" some na hora; 'pedido' → abre o "Pedido de acesso"; 'aparelho' de outro id não tira este;
     3. a queda do websocket não quebra nada e ele volta sozinho; o join com erro desiste em silêncio (não insiste).
   O canal está ligado (SQL sol_conta_tempo_real aplicado em 24/Nov/2026); no servidor local dos testes ele só conecta quando o teste
   pede (TempoReal.local = true), para os outros testes não abrirem conexão com o banco de verdade.
   Com o "Supabase de mentira" (teste/mock-sol.js). Dados fictícios. Uso: node teste/teste-tempo-real.js
   ===================================================================== */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { SB, M, db, rpcs, supabase, prepararChaves, PESSOAS, ANA, agora } = require('./mock-sol');
const crypto = require('crypto');
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
    ok(RT.conexoes === 0 && (await P.evaluate(() => MoneyNuvem._teste.TempoReal.ligado)), 'ligado (o banco está pronto); no servidor local dos testes só conecta quando o teste pede');
    await P.evaluate(() => { const T = MoneyNuvem._teste.TempoReal; T.local = true; return T.iniciar(); });
    await P.waitForFunction(() => MoneyNuvem._teste.TempoReal.juntou, null, { timeout: 10000 });
    const j = RT.joins[0];
    ok(j && j.topic === 'realtime:sol:conta:' + ANA.toLowerCase() && j.payload.config.private === true && j.payload.config.broadcast.self === false && Array.isArray(j.payload.config.postgres_changes) && typeof j.payload.access_token === 'string' && j.payload.access_token.length > 10,
      'phx_join em realtime:sol:conta:<uid em minúsculas>, privado, sem eco, postgres_changes [], com o access_token');
    ok(/^wss:\/\/qvdvkqydhnadhewcidia\.supabase\.co\/realtime\/v1\/websocket\?apikey=sb_publishable_[^&]+&vsn=1\.0\.0$/.test(RT.url), 'o endereço do contrato (wss://qvdvkqydhnadhewcidia.supabase.co/realtime/v1/websocket?apikey=<publishable>&vsn=1.0.0)');
    ok(/^wss:\/\/.*\/realtime\/v1\/websocket\?apikey=.+&vsn=1\.0\.0$/.test(RT.url), 'o endereço do websocket: /realtime/v1/websocket?apikey=…&vsn=1.0.0');

    console.log('2) os eventos');
    await P.evaluate(() => { localStorage.removeItem('dgo:moneytrio:aviso:pin-conta:depois'); MoneyNuvem._teste.Aparelhos.avisoCriarPin(); });
    ok(!!(await P.$('#nvAvisoPin')), 'o aviso "Crie o PIN" está na tela');
    /* o PIN da conta criado "no celular" (pelo próprio banco de mentira, com o mesmo cálculo do app) */
    const PIN_CONTA = '582914', sal = crypto.randomBytes(16).toString('base64url'), apAqui = await P.evaluate(async () => (await MoneyNuvem._teste.Cadeado.local()).ap);
    rpcs.sol_pin_definir(ANA, { p_ap: apAqui, p_sal_novo: sal, p_v_novo: crypto.pbkdf2Sync(PIN_CONTA, Buffer.from(sal, 'base64url'), 600000, 32, 'sha256').toString('base64url') });
    mandar('pin', { versao: 1, id: 'x' });
    await P.waitForFunction(() => !document.getElementById('nvAvisoPin'), null, { timeout: 5000 }).catch(() => {});
    ok(!(await P.$('#nvAvisoPin')), "'pin': o aviso some na hora (o PIN foi criado em outro aparelho)");
    console.log('2b) este aparelho, aberto, ainda no PIN antigo: pede uma vez o PIN da conta (defeito "Falta só um passo")');
    await P.waitForSelector('#nvMig', { timeout: 10000 }).catch(() => {});
    ok(/Você criou o PIN da conta em outro aparelho\. Digite-o aqui uma vez para este computador passar a usar o mesmo\./.test(await P.textContent('#nvMigTxt').catch(() => '')), '"Você criou o PIN da conta em outro aparelho. Digite-o aqui uma vez…" (com a chave do aparelho na mão)');
    await P.fill('#nvMig', '000000'); await P.click('#nvMigOk');
    await P.waitForFunction(() => /PIN errado/.test((document.querySelector('#nvErro') || {}).textContent || ''), null, { timeout: 30000 }).catch(() => {});
    ok(/PIN errado/.test(await P.textContent('#nvErro')), 'PIN da conta errado: avisa e continua na tela');
    await P.fill('#nvMig', PIN_CONTA); await P.click('#nvMigOk');
    await P.waitForFunction(() => !document.querySelector('#nvMig'), null, { timeout: 60000 });
    const Lm = await P.evaluate(async () => MoneyNuvem._teste.Cadeado.local());
    ok(Lm.srv && Lm.pinVersao === 1, 'pronto: este aparelho passa a usar o PIN da conta (no próximo desbloqueio não pede o PIN antigo)');
    console.log('2c) "Falta só um passo" com a digital neste aparelho: a digital vem primeiro');
    const pa = await P.evaluate(async () => { const T = MoneyNuvem._teste, L = await T.Cadeado.local(); const prf0 = L.prf; L.prf = { cred: 'ficticio', sal: 'ficticio' }; await T.Cadeado.gravar(L);
      await T.Portao.pinAntigo({ grupo_id: 'g' }, { pinConta: 'x' }, () => {}); const c = document.querySelector('#nvPortao .nv-card'), d = c.querySelector('#nvPADig'), i = c.querySelector('#nvPA'), o = c.querySelector('#nvPAOk');
      const r = { txt: c.querySelector('#nvPAtxt').textContent, dig: d && d.textContent, pri: d && d.classList.contains('pri'), antes: d && i && !!(d.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_FOLLOWING), okPri: o.classList.contains('pri') };
      T.Tela.fechar(); L.prf = prf0; await T.Cadeado.gravar(L); return r; });
    ok(/Seu PIN novo está certo\. Este computador só precisa de uma confirmação para passar a usar o PIN novo: use a digital \(ou o PIN que você usava aqui antes\)\./.test(pa.txt), 'texto simples: "Seu PIN novo está certo. Este computador só precisa de uma confirmação…"');
    ok(pa.dig === '👆 Confirmar com a digital (uma vez só)' && pa.pri && pa.antes && !pa.okPri, 'a digital é o botão principal ("👆 Confirmar com a digital (uma vez só)"); o PIN antigo vem depois, como segunda opção');
    db.sol_acesso_pedidos.push({ id: '7e7e7e7e-0000-4000-8000-000000000001', user_id: ANA, nome: 'Android · Chrome', app: 'moneytrio', pub: { x: 'a', y: 'b' }, compromisso: 'c', grupo_id: null, pub_a: null, n_a: null, n_b: null, desafio_por: null,
      criado_em: agora(), expira_em: new Date(Date.now() + 10 * 60000).toISOString(), estado: 'aberto', resposta: null });
    await P.evaluate(() => { MoneyNuvem._teste.Aparelhos._vistos = {}; });
    mandar('pedido', { id: '7e7e7e7e-0000-4000-8000-000000000001' });
    await P.waitForSelector('#nvPedido', { timeout: 5000 }).catch(() => {});
    ok(/Pedido de acesso: Android · Chrome/.test(await P.textContent('#nvPedido').catch(() => '')), "'pedido': o \"Pedido de acesso\" aparece na hora (sem esperar a busca)");
    await P.click('#nvPedidoX');
    await P.click('#nvSelo'); await P.waitForSelector('.nv-painel #nvAps');
    await P.waitForFunction(() => !/Carregando/.test(document.querySelector('#nvAps').textContent), null, { timeout: 10000 });
    db.sol_aparelhos.push({ id: '00000000-0000-4000-8000-0000000000ff', user_id: ANA, nome: 'iPhone · Safari', app: 'moneytrio', como: 'aparelho', aprovado_por: ANA, criado_em: agora(), visto_em: agora(), removido_em: null });
    mandar('aparelho', { id: '00000000-0000-4000-8000-0000000000ff', removido: false });
    await P.waitForFunction(() => /Seu celular \(Safari\)/.test(document.querySelector('#nvAps').textContent), null, { timeout: 5000 }).catch(() => {});
    ok(/Seu celular \(Safari\)/.test(await P.textContent('#nvAps')), "'aparelho' {removido:false}: a lista do painel mostra o aparelho novo na hora");
    await P.click('#nvFechar');
    /* 3.106.1 (item 5): o aparelho que aprovou também fica sabendo quando o novo substitui o antigo */
    await P.evaluate((a) => { MoneyNuvem._teste.Aparelhos._subst = [{ id: '00000000-0000-4000-8000-0000000000ff', nome: 'iPhone · Safari', criado_em: a }]; }, '2026-11-11T12:00:00Z');
    mandar('aparelho', { id: '00000000-0000-4000-8000-0000000000ff', removido: true }); await esperar(500);
    ok(/Substituímos o registro antigo do seu computador \(de 11\/Nov\)\./.test(await P.evaluate(() => document.getElementById('toasts').textContent)), "'aparelho' removido que o aparelho novo substituiu: aqui também \"Substituímos o registro antigo… (de 11/Nov).\"");
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
    await P.evaluate(() => { const T = MoneyNuvem._teste.TempoReal; T.desistiu = false; T.espera = 1000; }); RT.responder = 'ok';
    await P.evaluate(() => MoneyNuvem._teste.TempoReal.iniciar()); await P.waitForFunction(() => MoneyNuvem._teste.TempoReal.juntou, null, { timeout: 8000 });
    RT.atual.send(JSON.stringify({ topic: RT.topico, event: 'phx_error', payload: {}, ref: null })); await esperar(300);
    ok(await P.evaluate(() => MoneyNuvem._teste.TempoReal.desistiu && !MoneyNuvem._teste.TempoReal.ws), 'phx_error depois de entrar: desiste e segue só com o poll');
    ok(!erros.length, 'sem erro na página ' + erros.join(' | '));
  } finally { await browser.close(); srv.close(); }
  console.log((falhas ? '✗ ' : '✓ ') + oks + ' ok, ' + falhas + ' falha(s)');
  process.exit(falhas ? 1 : 0);
})();
