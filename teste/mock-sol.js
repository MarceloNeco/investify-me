/* =====================================================================
   teste/mock-sol.js — o "Supabase de mentira" da plataforma (aparelhos, pedidos, passkeys e PIN da conta), em memória.
   Usado por teste/teste-aparelhos.js e teste/teste-pin-conta.js. Faz o mesmo que supabase/2026-11-07-sol-aparelhos.sql e
   supabase/2026-11-11-sol-pin-conta.sql (o SQL de verdade tem os testes próprios em teste/sql/). Dados todos fictícios.
   ===================================================================== */
'use strict';
const crypto = require('crypto');
const subtle = crypto.webcrypto.subtle;
const SB = 'https://qvdvkqydhnadhewcidia.supabase.co';
const b64 = (b) => Buffer.from(b).toString('base64');
const b64u = (b) => Buffer.from(b).toString('base64url');
const unb64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));
const normCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{5})(?=.)/g, '$1-');

/* ---------------- Supabase de mentira: duas pessoas da mesma família ---------------- */
const GID = '22222222-2222-2222-2222-222222222222';
const PESSOAS = {
  '11111111-1111-1111-1111-111111111111': { email: 'ana@teste.com', senha: 'senha-de-teste-1', nome: 'Ana Teste', papel: 'chefe', codigo: 'KQ7PZ-3MXWD-H8RTA-2BCNE' },
  '44444444-4444-4444-4444-444444444444': { email: 'bia@teste.com', senha: 'senha-de-teste-2', nome: 'Bia Teste', papel: 'responsavel', codigo: 'ZX9QW-4RTYU-PLMNB-7VCXE' } };
const ANA = '11111111-1111-1111-1111-111111111111', BIA = '44444444-4444-4444-4444-444444444444';
const db = { money_docs: [], omni_chave_privada: [], user_settings: [], sol_aparelhos: [], sol_acesso_pedidos: [], sol_passkeys: [] };
const embrulhadas = {};   /* uid → CF embrulhada para a chave pública da pessoa */
let CF_RAW = null;
const M = { relogio: Date.now(), ataque: null, ATACANTE: null, semPin: false };   /* começa na hora de verdade (o app compara com o relógio do navegador); o teste mexe no relógio e no ataque */
const agora = () => new Date(M.relogio += 7).toISOString();
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
  const t = new Date(M.relogio).toISOString();
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
      criado_em: agora(), expira_em: new Date(M.relogio + 10 * 60000).toISOString(), estado: 'aberto', resposta: null, tipo_resposta: null, respondido_por: null, respondido_por_ap: null };
    db.sol_acesso_pedidos.push(p); return p.id;
  },
  sol_pedidos_para_mim: (me) => {
    limpar();
    return db.sol_acesso_pedidos.filter((p) => p.estado === 'aberto' && posso(p, me) && (!p.desafio_por || p.desafio_por === me)).map((p) => {
      const o = { id: p.id, quem: p.user_id, quem_email: PESSOAS[p.user_id].email, quem_nome: PESSOAS[p.user_id].nome, nome: p.nome, app: p.app, pub: p.pub, compromisso: p.compromisso,
        pub_a: p.pub_a, n_a: p.n_a, n_b: p.n_b, desafio_meu: p.desafio_por === me, grupo_id: p.grupo_id, criado_em: p.criado_em, tipo: posso(p, me) };
      /* banco malicioso: troca a pub do aparelho novo pela do atacante */
      if (M.ataque) { o.pub = M.ATACANTE.pub; if (M.ataque === 'troca') { o.compromisso = compromisso(M.ATACANTE.pub, M.ATACANTE.n); if (o.n_b) o.n_b = M.ATACANTE.n; } }
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
    const f = M.semPin && /^sol_pin_/.test(rpc[1]) ? null : rpcs[rpc[1]]; if (!f) return json(404, { code: 'PGRST202', message: 'função ' + rpc[1] + ' não existe no teste' });
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
  M.ATACANTE = { pub: { kty: 'EC', crv: 'P-256', x: j.x, y: j.y }, n: b64u(crypto.randomBytes(32)) };
}


/* ---- PIN da conta: as mesmas regras de supabase/2026-11-11-sol-pin-conta.sql ---- */
db.sol_pin_conta = []; db.sol_aparelho_pin = [];
const hpin = (v) => crypto.createHash('sha256').update(String(v), 'utf8').digest('hex');
const esperaPin = (n) => n >= 10 ? 24 * 3600e3 : n === 9 ? 30 * 60e3 : n === 8 ? 15 * 60e3 : n === 7 ? 5 * 60e3 : n === 6 ? 60e3 : n === 5 ? 30e3 : 0;
const meuAp = (me, ap) => db.sol_aparelhos.some((a) => a.id === ap && a.user_id === me && !a.removido_em);
function segredoAp(me, ap) { let s = db.sol_aparelho_pin.find((x) => x.ap_id === ap); if (!s) { s = { ap_id: ap, user_id: me, segredo: b64u(crypto.randomBytes(32)), tentativas: 0 }; db.sol_aparelho_pin.push(s); } return s.segredo; }
function conferirPin(me, v, ap) {
  if (!meuAp(me, ap)) return { ok: false, erro: 'aparelho' };
  const p = db.sol_pin_conta.find((x) => x.user_id === me); if (!p) return { ok: false, erro: 'sempin' };
  if (p.espera_ate && p.espera_ate > M.relogio) return { ok: false, erro: 'espera', espera_ate: new Date(p.espera_ate).toISOString(), tentativas: p.tentativas };
  if (hpin(v) === p.hv) { p.tentativas = 0; p.espera_ate = null; return { ok: true, versao: p.versao, segredo: segredoAp(me, ap) }; }
  p.tentativas++; const w = esperaPin(p.tentativas); p.espera_ate = w ? M.relogio + w : null;
  return { ok: false, erro: 'pin', tentativas: p.tentativas, restam: Math.max(10 - p.tentativas, 0), espera_ate: w ? new Date(p.espera_ate).toISOString() : null };
}
Object.assign(rpcs, {
  sol_pin_info: (me) => { const p = db.sol_pin_conta.find((x) => x.user_id === me);
    return [p ? { tem: true, sal: p.sal, versao: p.versao, bloqueado: false, espera_ate: p.espera_ate ? new Date(p.espera_ate).toISOString() : null, tentativas: p.tentativas } : { tem: false, sal: null, versao: 0, bloqueado: false, espera_ate: null, tentativas: 0 }]; },
  sol_pin_conferir: (me, c) => conferirPin(me, c.p_v, c.p_ap),
  sol_pin_definir: (me, c) => {
    if (!meuAp(me, c.p_ap)) throw [400, { message: 'aparelho que não é seu' }];
    if (!/^[A-Za-z0-9_-]{22}$/.test(c.p_sal_novo) || !/^[A-Za-z0-9_-]{43}$/.test(c.p_v_novo)) throw [400, { message: 'formato' }];
    let p = db.sol_pin_conta.find((x) => x.user_id === me), pode = !p;
    if (!pode) { const a = db.sol_aparelhos.find((x) => x.id === c.p_ap); pode = a.como === 'aparelho' && Date.parse(a.criado_em) > M.relogio - 10 * 60e3; }
    if (!pode && c.p_v_atual) { const r = conferirPin(me, c.p_v_atual, c.p_ap); if (!r.ok) return r; pode = true; }
    if (!pode) return { ok: false, erro: 'sem_permissao' };
    if (!p) { p = { user_id: me, versao: 0 }; db.sol_pin_conta.push(p); }
    Object.assign(p, { sal: c.p_sal_novo, hv: hpin(c.p_v_novo), versao: p.versao + 1, tentativas: 0, espera_ate: null });
    return { ok: true, versao: p.versao, segredo: segredoAp(me, c.p_ap) };
  }
});
/* "primeiro" só na conta sem aparelho (a mesma regra do SQL da 3.62) */
const _registrar = rpcs.sol_aparelho_registrar;
rpcs.sol_aparelho_registrar = (me, c) => { if (c.p_como === 'primeiro' && db.sol_aparelhos.some((a) => a.user_id === me && !a.removido_em)) throw [400, { message: 'a conta já tem aparelho' }]; return _registrar(me, c); };

module.exports = { SB, M, db, rpcs, supabase, prepararChaves, PESSOAS, ANA, BIA, GID, compromisso, agora, b64u };
