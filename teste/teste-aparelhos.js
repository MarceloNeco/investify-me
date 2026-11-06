/* =====================================================================
   teste/teste-aparelhos.js — 3.61: entrar SEM código de recuperação (nuvem.js 1.9.0, formato v2 com compromisso)
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
const SB = 'https://qvdvkqydhnadhewcidia.supabase.co';
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

/* ---------------- Supabase de mentira: duas pessoas da mesma família ---------------- */
const GID = '22222222-2222-2222-2222-222222222222';
const PESSOAS = {
  '11111111-1111-1111-1111-111111111111': { email: 'ana@teste.com', senha: 'senha-de-teste-1', nome: 'Ana Teste', papel: 'chefe', codigo: 'KQ7PZ-3MXWD-H8RTA-2BCNE' },
  '44444444-4444-4444-4444-444444444444': { email: 'bia@teste.com', senha: 'senha-de-teste-2', nome: 'Bia Teste', papel: 'responsavel', codigo: 'ZX9QW-4RTYU-PLMNB-7VCXE' } };
const ANA = '11111111-1111-1111-1111-111111111111', BIA = '44444444-4444-4444-4444-444444444444';
const db = { money_docs: [], omni_chave_privada: [], user_settings: [], sol_aparelhos: [], sol_acesso_pedidos: [], sol_passkeys: [] };
const embrulhadas = {};   /* uid → CF embrulhada para a chave pública da pessoa */
let CF_RAW = null, relogio = Date.parse('2026-11-07T10:00:00Z'), ataque = null, ATACANTE = null;
const agora = () => new Date(relogio += 7).toISOString();
const uuid = () => crypto.randomUUID();
function jwt(sub) { const p = PESSOAS[sub]; return 'h.' + Buffer.from(JSON.stringify({ sub, email: p.email, exp: 9999999999, user_metadata: { full_name: p.nome } })).toString('base64url') + '.s'; }
function quem(req) { const a = req.headers()['authorization'] || ''; const t = a.replace(/^Bearer /, '').split('.')[1]; try { return JSON.parse(Buffer.from(t, 'base64url').toString()).sub; } catch (e) { return null; } }
function filtrar(linhas, params) {
  return linhas.filter((r) => { for (const [k, v] of params) { if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k)) continue;
    const i = v.indexOf('.'), op = v.slice(0, i), val = v.slice(i + 1), x = r[k];
    if (op === 'eq' && String(x) !== val) return false; if (op === 'gt' && !(x > val)) return false; if (op === 'gte' && !(x >= val)) return false;
    if (op === 'is' && val === 'null' && x != null) return false; } return true; });
}
function escolher(linhas, params) {
  const sel = params.get('select'); let out = linhas.slice();
  const ord = params.get('order'); if (ord) { const c = ord.split('.')[0]; out.sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0)); }
  out = out.slice(+(params.get('offset') || 0), +(params.get('offset') || 0) + (params.get('limit') ? +params.get('limit') : 1000));
  return sel && sel !== '*' ? out.map((r) => Object.fromEntries(sel.split(',').map((c) => [c, r[c]]))) : out;
}
/* a mesma conta do app (nuvem.js, Aparelhos.compromisso): o atacante usa para forjar */
const compromisso = (pub, n) => b64u(crypto.createHash('sha256').update(['sol-ap-v2', 'c', pub.x + '.' + pub.y, n].join('|')).digest());
const posso = (p, me) => p.user_id === me ? 'pessoal' : (p.grupo_id && PESSOAS[me] && ['chefe', 'responsavel'].includes(PESSOAS[me].papel)) ? 'familia' : null;
function limpar() {
  const t = new Date(relogio).toISOString();
  db.sol_acesso_pedidos.forEach((p) => { if (p.expira_em <= t) { p.resposta = null; if (p.estado === 'aberto') p.estado = 'vencido'; } });
}
const rpcs = {
  minha_conta_encerrada: () => false, sol_registrar_uso: () => true,
  sol_meus_grupos: (me) => [{ grupo_id: GID, tipo: 'familia', nome: 'Família Teste', meu_papel: PESSOAS[me].papel, membros: 2, governanca: 'omnilife-one', sou_dono: me === ANA }],
  sol_minha_chave_grupo: (me) => [{ versao: 1, chave_embrulhada: embrulhadas[me] }],
  sol_ponte_minha_caixa: () => [],
  sol_pedido_criar: (me, c) => {
    limpar();
    if (db.sol_acesso_pedidos.filter((p) => p.user_id === me && p.estado === 'aberto').length >= 3) throw [400, { message: 'muitos pedidos em aberto' }];
    const p = { id: uuid(), user_id: me, nome: c.p_nome, app: c.p_app, pub: c.p_pub, compromisso: c.p_compromisso, grupo_id: c.p_grupo || null, pub_a: null, n_a: null, n_b: null, desafio_por: null,
      criado_em: agora(), expira_em: new Date(relogio + 10 * 60000).toISOString(), estado: 'aberto', resposta: null, tipo_resposta: null, respondido_por: null, respondido_por_ap: null };
    db.sol_acesso_pedidos.push(p); return p.id;
  },
  sol_pedidos_para_mim: (me) => {
    limpar();
    return db.sol_acesso_pedidos.filter((p) => p.estado === 'aberto' && posso(p, me) && (!p.desafio_por || p.desafio_por === me)).map((p) => {
      const o = { id: p.id, quem: p.user_id, quem_email: PESSOAS[p.user_id].email, quem_nome: PESSOAS[p.user_id].nome, nome: p.nome, app: p.app, pub: p.pub, compromisso: p.compromisso,
        pub_a: p.pub_a, n_a: p.n_a, n_b: p.n_b, desafio_meu: p.desafio_por === me, grupo_id: p.grupo_id, criado_em: p.criado_em, tipo: posso(p, me) };
      /* banco malicioso: troca a pub do aparelho novo pela do atacante */
      if (ataque) { o.pub = ATACANTE.pub; if (ataque === 'troca') { o.compromisso = compromisso(ATACANTE.pub, ATACANTE.n); if (o.n_b) o.n_b = ATACANTE.n; } }
      return o;
    });
  },
  sol_pedido_desafio: (me, c) => { const p = db.sol_acesso_pedidos.find((x) => x.id === c.p_id); if (!p || p.estado !== 'aberto' || p.pub_a) return false; if (!posso(p, me)) throw [400, { message: 'sem permissão' }]; Object.assign(p, { pub_a: c.p_pub_a, n_a: c.p_n_a, desafio_por: me }); return true; },
  sol_pedido_revelar: (me, c) => { const p = db.sol_acesso_pedidos.find((x) => x.id === c.p_id && x.user_id === me); if (!p || p.estado !== 'aberto' || !p.pub_a || p.n_b) return false; p.n_b = c.p_n_b; return true; },
  sol_pedido_aprovar: (me, c) => {
    const p = db.sol_acesso_pedidos.find((x) => x.id === c.p_id); if (!p || p.estado !== 'aberto' || !p.n_b || p.desafio_por !== me) return false;
    Object.assign(p, { estado: 'aprovado', resposta: c.p_resposta, tipo_resposta: posso(p, me), respondido_por: me, respondido_por_ap: c.p_meu_ap }); return true;
  },
  sol_pedido_recusar: (me, c) => { const p = db.sol_acesso_pedidos.find((x) => x.id === c.p_id); if (!p || p.estado !== 'aberto' || !posso(p, me)) return false; p.estado = 'recusado'; return true; },
  sol_pedido_buscar: (me, c) => {
    limpar();
    const p = db.sol_acesso_pedidos.find((x) => x.id === c.p_id && x.user_id === me); if (!p) return [];
    if (p.estado !== 'aprovado') return [{ estado: p.estado, pub_a: p.pub_a, n_a: p.n_a, resposta: null, tipo: null, aparelho: null }];
    const ap = { id: uuid(), user_id: me, nome: p.nome, app: p.app, como: p.tipo_resposta === 'pessoal' ? 'aparelho' : 'familia', aprovado_por: p.respondido_por, aprovado_por_ap: p.respondido_por_ap, criado_em: agora(), visto_em: agora(), removido_em: null };
    db.sol_aparelhos.push(ap); const resp = p.resposta; p.estado = 'usado'; p.resposta = null;
    return [{ estado: 'aprovado', pub_a: p.pub_a, n_a: p.n_a, resposta: resp, tipo: p.tipo_resposta, aparelho: ap.id }];
  },
  sol_aparelho_registrar: (me, c) => { const ap = { id: uuid(), user_id: me, nome: c.p_nome, app: c.p_app, como: c.p_como, aprovado_por: me, aprovado_por_ap: null, criado_em: agora(), visto_em: agora(), removido_em: null }; db.sol_aparelhos.push(ap); return ap.id; },
  sol_aparelho_visto: (me, c) => { const a = db.sol_aparelhos.find((x) => x.id === c.p_id && x.user_id === me && !x.removido_em); if (a) a.visto_em = agora(); return !!a; },
  sol_aparelho_tirar: (me, c) => { const a = db.sol_aparelhos.find((x) => x.id === c.p_id && x.user_id === me && !x.removido_em); if (a) a.removido_em = agora(); return !!a; },
  sol_aparelhos_meus: (me) => db.sol_aparelhos.filter((a) => a.user_id === me && !a.removido_em).map((a) => Object.assign({}, a, { aprovado_por_email: (PESSOAS[a.aprovado_por] || {}).email || null, aprovado_por_nome: (PESSOAS[a.aprovado_por] || {}).nome || '' })),
  sol_passkeys_minhas: (me) => db.sol_passkeys.filter((k) => k.user_id === me),
  sol_passkey_guardar: () => true
};
async function supabase(route) {
  const req = route.request(), url = new URL(req.url()), metodo = req.method(), cab = { 'access-control-allow-origin': '*' };
  const json = (st, o) => route.fulfill({ status: st, contentType: 'application/json', headers: cab, body: o === undefined ? '' : JSON.stringify(o) });
  if (metodo === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  const corpo = req.postData() ? JSON.parse(req.postData()) : null, p = url.pathname, me = quem(req);
  if (p === '/auth/v1/token') {
    if (url.searchParams.get('grant_type') === 'password') {
      const uid = Object.keys(PESSOAS).find((k) => PESSOAS[k].email === corpo.email && PESSOAS[k].senha === corpo.password);
      if (!uid) return json(400, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      return json(200, { access_token: jwt(uid), refresh_token: 'r' + uid, expires_in: 3600, user: { email: PESSOAS[uid].email } });
    }
    const uid = String(corpo && corpo.refresh_token || '').slice(1); return PESSOAS[uid] ? json(200, { access_token: jwt(uid), refresh_token: 'r' + uid, expires_in: 3600, user: { email: PESSOAS[uid].email } }) : json(400, {});
  }
  if (p.startsWith('/auth/v1/') || p.startsWith('/functions/v1/') || p.startsWith('/storage/')) return json(p.startsWith('/storage/') ? 404 : 200, {});
  const rpc = p.match(/^\/rest\/v1\/rpc\/(\w+)$/);
  if (rpc) {
    const f = rpcs[rpc[1]]; if (!f) return json(404, { code: 'PGRST202', message: 'função ' + rpc[1] + ' não existe no teste' });
    try { return json(200, f(me, corpo || {})); } catch (e) { return Array.isArray(e) ? json(e[0], e[1]) : json(500, { message: String(e) }); }
  }
  const tab = p.match(/^\/rest\/v1\/(\w+)$/); if (!tab || !db[tab[1]] || /^sol_/.test(tab[1])) return json(404, { code: 'PGRST205', message: 'tabela não existe no teste' });
  const t = tab[1], linhas = t === 'omni_chave_privada' ? db[t].filter((r) => r.user_id === me) : db[t], prm = url.searchParams, prefer = req.headers()['prefer'] || '';
  if (metodo === 'GET') return json(200, escolher(filtrar(linhas, prm), prm));
  if (metodo === 'POST') {
    const lista = Array.isArray(corpo) ? corpo : [corpo], feitas = [];
    for (const r of lista) {
      const ja = linhas.find((x) => t === 'money_docs' && x.grupo_id + '|' + x.colecao + '|' + x.id === r.grupo_id + '|' + r.colecao + '|' + r.id);
      if (ja) { if (/ignore-duplicates/.test(prefer)) continue; if (/merge-duplicates/.test(prefer)) { Object.assign(ja, r); feitas.push(ja); continue; } return json(409, { code: '23505' }); }
      const n = Object.assign({}, r); if (t === 'money_docs') Object.assign(n, { versao: 1, criado_em: agora(), atualizado_em: agora(), apagado_em: null });
      linhas.push(n); feitas.push(n);
    }
    return /return=representation/.test(prefer) ? json(201, feitas) : json(201);
  }
  if (metodo === 'PATCH') { const alvo = filtrar(linhas, prm); alvo.forEach((r) => { Object.assign(r, corpo); if (t === 'money_docs') { r.versao++; r.atualizado_em = agora(); } }); return json(200, alvo); }
  return json(405, {});
}
/* as chaves de cada pessoa (como o OmniLifeONE faz hoje): par RSA, cópia fechada pelo código, CF embrulhada */
async function prepararChaves() {
  CF_RAW = crypto.webcrypto.getRandomValues(new Uint8Array(32));
  for (const uid of Object.keys(PESSOAS)) {
    const par = await subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
    const pkcs8 = new Uint8Array(await subtle.exportKey('pkcs8', par.privateKey)), sal = b64(crypto.webcrypto.getRandomValues(new Uint8Array(16)));
    const base = await subtle.importKey('raw', new TextEncoder().encode(normCode(PESSOAS[uid].codigo)), 'PBKDF2', false, ['deriveKey']);
    const k = await subtle.deriveKey({ name: 'PBKDF2', salt: unb64(sal), iterations: 600000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const iv = crypto.webcrypto.getRandomValues(new Uint8Array(12));
    db.omni_chave_privada.push({ user_id: uid, privada_cifrado: JSON.stringify({ v: 1, kid: 'k1', iv: b64(iv), ct: b64(await subtle.encrypt({ name: 'AES-GCM', iv }, k, pkcs8)) }), sal, iteracoes: 600000 });
    embrulhadas[uid] = '1.' + b64(await subtle.encrypt({ name: 'RSA-OAEP' }, par.publicKey, new TextEncoder().encode(JSON.stringify({ v: 1, kv: 1, fk: 'fk-teste', k: b64(CF_RAW) }))));
  }
  const m = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']), j = await subtle.exportKey('jwk', m.publicKey);
  ATACANTE = { pub: { kty: 'EC', crv: 'P-256', x: j.x, y: j.y }, n: b64u(crypto.randomBytes(32)) };
}

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
  await page.waitForSelector('#nvP1'); await page.fill('#nvP1', '482915'); await page.fill('#nvP2', '482915'); await page.click('#nvPOk');
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
    ok(apA && apA.como === 'primeiro', 'quem já usava: o aparelho atual é registrado como "primeiro" ao abrir (' + (apA && apA.nome) + ')');
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
    await B.waitForSelector('#nvP1', { timeout: 30000 });
    ok(/O PIN vale só neste aparelho/.test(await B.textContent('#nvPinUm')), 'B pede o PIN e explica numa linha que o PIN é por aparelho');
    await B.fill('#nvP1', '482915'); await B.fill('#nvP2', '482915'); await B.click('#nvPOk');
    await B.waitForSelector('#nvSelo', { timeout: 90000 });
    await B.waitForFunction(() => typeof Store !== 'undefined' && (Store.estado.gastos || []).some((g) => g.desc === 'Cinema de teste'), null, { timeout: 30000 });
    ok(true, 'B abre a nuvem com os dados da família (o lançamento feito em A)');
    const apB = db.sol_aparelhos.find((a) => a.user_id === ANA && a.como === 'aparelho');
    ok(apB && apB.aprovado_por === ANA && apB.aprovado_por_ap === apA.id, 'a lista registra quem aprovou e de qual aparelho');
    ok(p1.estado === 'usado' && p1.resposta === null, 'a resposta saiu do banco depois de lida (pedido "usado")');
    const Lb = await B.evaluate(() => MoneyNuvem._teste.Cadeado.local());
    ok(Lb && Lb.sk && Lb.ap === apB.id && Lb.como === 'aparelho', 'B guarda a chave pessoal fechada pelo cadeado do aparelho e sabe quem é na lista');

    console.log('2) repetir a resposta');
    const rep = await A.evaluate(async (id) => { const ap = MoneyNuvem._teste.Aparelhos; return [await ap.rpc('sol_pedido_aprovar', { p_id: id, p_resposta: { v: 2, iv: 'x', ct: 'y' }, p_meu_ap: null }), (await ap.rpc('sol_pedido_buscar', { p_id: id })).length]; }, p1.id);
    const rep2 = await B.evaluate(async (id) => (await MoneyNuvem._teste.Aparelhos.rpc('sol_pedido_buscar', { p_id: id }))[0], p1.id);
    ok(rep[0] === false && rep2.estado === 'usado' && !rep2.resposta, 'aprovar de novo não vale e ler de novo não traz resposta (' + JSON.stringify([rep[0], rep2.estado]) + ')');

    console.log('3) recusar e vencer');
    const C = await aparelho(browser, { width: 390, height: 800 }, 'C');
    await entrar(C, ANA); await C.click('#nvApOutro'); await C.waitForSelector('#nvEsperando');
    await verPedido(A); await A.waitForSelector('#nvApRecusar'); await A.click('#nvApRecusar');
    await C.waitForFunction(() => /Pedido recusado/.test(document.body.innerText), null, { timeout: 15000 });
    ok(ultimoPedido(ANA).estado === 'recusado', 'A recusa e C mostra "Pedido recusado"');
    await C.click('text=Pedir de novo'); await C.waitForSelector('#nvEsperando');
    const p3 = ultimoPedido(ANA); relogio = Date.parse(p3.expira_em) + 1000;
    await C.waitForFunction(() => /O pedido venceu/.test(document.body.innerText), null, { timeout: 15000 });
    const vistoA = await A.evaluate(() => MoneyNuvem._teste.Aparelhos.rpc('sol_pedidos_para_mim'));
    ok(p3.estado === 'vencido' && !vistoA.some((x) => x.id === p3.id), 'depois de 10 min: C mostra "O pedido venceu" e A não vê mais o pedido');

    console.log('4) banco trocando a pub do pedido');
    ataque = 'troca';
    await C.click('text=Pedir de novo'); await C.waitForSelector('#nvEsperando');
    await verPedido(A);
    const [sA2, sC2] = await Promise.all([sasDe(A), sasDe(C)]);
    ok(sA2 !== sC2, 'com a pub trocada (e o compromisso forjado antes de ver nA), os 6 números ficam DIFERENTES (' + sA2 + ' × ' + sC2 + '): ninguém aprova');
    await A.click('#nvApRecusar'); await C.waitForFunction(() => /Pedido recusado/.test(document.body.innerText), null, { timeout: 15000 });
    ataque = 'troca-sem-compromisso';
    await C.click('text=Pedir de novo'); await C.waitForSelector('#nvEsperando');
    await verPedido(A);
    await A.waitForSelector('#nvApAdulterado', { timeout: 30000 });
    ok(!(await A.$('#nvApOk')), 'trocando a pub sem acertar o compromisso: A acusa "pedido alterado" e não deixa aprovar');
    await A.click('#nvApRecusar'); ataque = null;
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
    await E.waitForSelector('#nvP1', { timeout: 30000 }); await E.fill('#nvP1', '271828'); await E.fill('#nvP2', '271828'); await E.click('#nvPOk');
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
