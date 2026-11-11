/* =====================================================================
   teste/mock-escopos.js — o "Supabase de mentira" da 3.66 ("dois cofres"), por cima de teste/mock-sol.js.
   Faz em memória o que supabase/2026-11-12-moneytrio-escopos.sql faz no banco (o SQL de verdade tem o teste próprio em
   teste/sql/teste-moneytrio-escopos.sql):
     · money_visao (chefe = tudo; linha do chefe; responsável = tudo); money_docs com escopo, RLS por visão, "r." ⇔ reservado,
       e o gatilho "depois das chaves novas, nada fechado com a CF"; money_chaves (cada um lê as suas); recifrar em lote,
       apagar de verdade; caixa do robô por escopo (money_caixa_chave, money_entrada); comprovantes com "r/".
   Uma terceira pessoa: Beta, membro da família (a visão "Só a casa"). Dados todos fictícios.
   ===================================================================== */
'use strict';
const crypto = require('crypto');
const subtle = crypto.webcrypto.subtle;
const base = require('./mock-sol');
const { SB, M, db, rpcs, PESSOAS, ANA, GID } = base;
const b64 = (b) => Buffer.from(b).toString('base64');
const unb64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));
const normCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{5})(?=.)/g, '$1-');

const BETA = '55555555-5555-5555-5555-555555555555';
PESSOAS[BETA] = { email: 'beta@teste.com', senha: 'senha-de-teste-3', nome: 'Beta Teste', papel: 'membro', codigo: 'MN4BV-7CXZA-QW2ER-9TYUI' };
Object.assign(db, { money_visao: [], money_chaves: [], money_caixa_chave: [], money_entrada: [], arquivos: {} });
const pubs = {}, embrulhadas = {}, log = { beta: [] };
let CF_RAW = null;

function visao(me) {
  const p = PESSOAS[me]; if (!p) return null;
  if (p.papel === 'chefe') return 'tudo';
  const v = db.money_visao.find((x) => x.user_id === me); if (v) return v.visao;
  return p.papel === 'responsavel' ? 'tudo' : null;
}
const vejoTudo = (me) => visao(me) === 'tudo', vejoCasa = (me) => !!visao(me);
const podeLer = (me, r) => vejoTudo(me) || (r.escopo === 'casa' && vejoCasa(me));
const migrado = () => db.money_chaves.length > 0;
const negado = (msg) => { throw [403, { code: '42501', message: msg }]; };

async function prepararChaves() {
  CF_RAW = crypto.webcrypto.getRandomValues(new Uint8Array(32));
  db.omni_chave_privada.length = 0;
  for (const uid of Object.keys(PESSOAS)) {
    const par = await subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
    const pkcs8 = new Uint8Array(await subtle.exportKey('pkcs8', par.privateKey)), sal = b64(crypto.webcrypto.getRandomValues(new Uint8Array(16)));
    const kb = await subtle.importKey('raw', new TextEncoder().encode(normCode(PESSOAS[uid].codigo)), 'PBKDF2', false, ['deriveKey']);
    const k = await subtle.deriveKey({ name: 'PBKDF2', salt: unb64(sal), iterations: 600000, hash: 'SHA-256' }, kb, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const iv = crypto.webcrypto.getRandomValues(new Uint8Array(12));
    db.omni_chave_privada.push({ user_id: uid, privada_cifrado: JSON.stringify({ v: 1, kid: 'k1', iv: b64(iv), ct: b64(await subtle.encrypt({ name: 'AES-GCM', iv }, k, pkcs8)) }), sal, iteracoes: 600000 });
    const j = await subtle.exportKey('jwk', par.publicKey); pubs[uid] = { kty: 'RSA', n: j.n, e: j.e, alg: 'RSA-OAEP-256', kid: 'kp-' + uid.slice(0, 4) };
    embrulhadas[uid] = '1.' + b64(await subtle.encrypt({ name: 'RSA-OAEP' }, par.publicKey, new TextEncoder().encode(JSON.stringify({ v: 1, kv: 1, fk: 'fk-teste', k: b64(CF_RAW) }))));
  }
}
/* o pacote do robô: {"v":1,"k":RSA(chave AES),"iv","ct"} fechado com a chave pública da caixa do escopo */
async function pacoteRobo(pub, obj) {
  const pk = await subtle.importKey('jwk', { kty: 'RSA', n: pub.n, e: pub.e, alg: 'RSA-OAEP-256', ext: true }, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
  const raw = crypto.webcrypto.getRandomValues(new Uint8Array(32)), iv = crypto.webcrypto.getRandomValues(new Uint8Array(12));
  const k = await subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(JSON.stringify(obj)));
  return JSON.stringify({ v: 1, k: b64(await subtle.encrypt({ name: 'RSA-OAEP' }, pk, raw)), iv: b64(iv), ct: b64(ct) });
}
function depositar(escopo, id, pacote) { db.money_entrada.push({ grupo_id: GID, id, pacote, escopo, origem: 'teste', criado_em: base.agora(), consumido_em: null, versao: 1 }); }
/* abre um registro com a CF (a conferência do teste: depois da migração, nenhum vivo abre) */
async function abreComCf(txt) {
  try { const o = JSON.parse(txt); const k = await subtle.importKey('raw', CF_RAW, 'AES-GCM', false, ['decrypt']); await subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.iv) }, k, unb64(o.ct)); return true; } catch (e) { return false; }
}

Object.assign(rpcs, {
  sol_meus_grupos: (me) => [{ grupo_id: GID, tipo: 'familia', nome: 'Família Teste', meu_papel: PESSOAS[me].papel, membros: Object.keys(PESSOAS).length, governanca: 'omnilife-one', sou_dono: me === ANA }],
  sol_minha_chave_grupo: (me) => [{ versao: 1, chave_embrulhada: embrulhadas[me] }],
  sol_chaves_publicas_do_grupo: () => Object.keys(PESSOAS).map((u) => ({ membro_id: u, user_id: u, apelido: PESSOAS[u].nome, papel: PESSOAS[u].papel, algoritmo: 'RSA-OAEP-256', chave_publica: pubs[u], ultima_versao: 1 })),
  sol_grupo_membros: () => [],
  money_visao: (me) => visao(me),
  money_visoes: (me) => { if (PESSOAS[me].papel !== 'chefe') negado('só o chefe'); return Object.keys(PESSOAS).map((u) => ({ user_id: u, papel: PESSOAS[u].papel, visao: visao(u) })); },
  money_visao_definir: (me, c) => { if (PESSOAS[me].papel !== 'chefe') negado('só o chefe'); db.money_visao = db.money_visao.filter((x) => x.user_id !== c.p_user); if (c.p_visao) db.money_visao.push({ grupo_id: GID, user_id: c.p_user, visao: c.p_visao }); return true; },
  money_chave_guardar: (me, c) => {
    if (!vejoTudo(me)) negado('só quem vê tudo');
    const v = visao(c.p_user); if (!v) negado('sem visão'); if (c.p_escopo === 'reservado' && v !== 'tudo') negado('a reservada só para quem vê tudo');
    if (db.money_chaves.some((k) => k.user_id === c.p_user && k.escopo === c.p_escopo && k.versao === c.p_versao)) return false;
    db.money_chaves.push({ grupo_id: GID, user_id: c.p_user, escopo: c.p_escopo, versao: c.p_versao, embrulhada: c.p_embrulhada }); return true;
  },
  money_docs_recifrar: (me, c) => {
    if (!vejoTudo(me)) negado('só quem vê tudo');
    const out = [];
    for (const it of c.p_itens || []) {
      const r = db.money_docs.find((x) => x.colecao === it.colecao && x.id === it.id && x.versao === it.versao && !x.apagado_em);
      if (!r) continue; if (migrado() && !String(it.dados).startsWith('{"c":1,"m":')) negado('CF');
      r.dados_cifrado = it.dados; r.versao++; r.atualizado_em = base.agora(); out.push({ colecao: r.colecao, id: r.id, versao: r.versao });
    }
    return out;
  },
  money_reservar_apagar: (me, c) => {
    if (!vejoTudo(me)) negado('só quem vê tudo');
    const temCasa = db.money_visao.some((x) => x.visao === 'casa');
    const ids = c.p_ids || []; if (!temCasa ? false : ids.some((i) => !String(i).startsWith('r.'))) negado('depois de existir visão casa, só "r."');
    const antes = db.money_docs.length; db.money_docs = db.money_docs.filter((x) => !(x.colecao === c.p_colecao && ids.includes(x.id)));
    return antes - db.money_docs.length;
  },
  money_entrada_limpar: (me) => { if (!vejoTudo(me)) negado('só quem vê tudo'); const a = db.money_entrada.length; db.money_entrada = db.money_entrada.filter((x) => !x.consumido_em); return a - db.money_entrada.length; },
  money_entrada_consumir: (me, c) => { if (!vejoCasa(me)) negado('sem visão'); let n = 0; db.money_entrada.forEach((e) => { if ((c.p_ids || []).includes(e.id) && !e.consumido_em && (vejoTudo(me) || e.escopo === 'casa')) { e.consumido_em = base.agora(); n++; } }); return n; }
});

function filtrar(linhas, prm) {
  return linhas.filter((r) => { for (const [k, v] of prm) { if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k)) continue;
    const i = v.indexOf('.'), op = v.slice(0, i), val = v.slice(i + 1), x = r[k];
    if (op === 'eq' && String(x) !== val) return false; if (op === 'gte' && !(x >= val)) return false;
    if (op === 'is' && val === 'null' && x != null) return false; } return true; });
}
function escolher(linhas, prm) {
  const sel = prm.get('select'); let out = linhas.slice();
  const ord = prm.get('order'); if (ord) { const c = ord.split(',')[0].split('.')[0], desc = /\.desc/.test(ord.split(',')[0]); out.sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (desc ? -1 : 1)); }
  out = out.slice(+(prm.get('offset') || 0), +(prm.get('offset') || 0) + (prm.get('limit') ? +prm.get('limit') : 1000));
  return sel && sel !== '*' ? out.map((r) => Object.fromEntries(sel.split(',').map((c) => [c, r[c]]))) : out;
}

async function supabase(route) {
  const req = route.request(), url = new URL(req.url()), metodo = req.method(), p = url.pathname;
  const cab = { 'access-control-allow-origin': '*' };
  const json = (st, o) => route.fulfill({ status: st, contentType: 'application/json', headers: cab, body: o === undefined ? '' : JSON.stringify(o) });
  if (metodo === 'OPTIONS') return base.supabase(route);
  const a = req.headers()['authorization'] || '', me = (() => { try { return JSON.parse(Buffer.from(a.replace(/^Bearer /, '').split('.')[1], 'base64url').toString()).sub; } catch (e) { return null; } })();
  const prm = url.searchParams, prefer = req.headers()['prefer'] || '';
  const resp = (st, o) => { if (me === BETA) log.beta.push({ p, o }); return json(st, o); };
  /* comprovantes */
  const st = p.match(/^\/storage\/v1\/object\/(?:authenticated\/)?money-arquivos\/([^/]+)\/(r\/)?([A-Za-z0-9_-]+)$/);
  if (st) {
    const reservado = !!st[2], nome = st[1] + '/' + (st[2] || '') + st[3];
    if (reservado ? !vejoTudo(me) : !vejoCasa(me)) return route.fulfill({ status: 400, headers: cab, body: '{"error":"not found"}' });
    if (metodo === 'GET') { const b = db.arquivos[nome]; if (!b) return route.fulfill({ status: 400, headers: cab, body: '{"error":"not found"}' }); if (me === BETA) log.beta.push({ p, o: 'arquivo' }); return route.fulfill({ status: 200, headers: cab, contentType: 'application/octet-stream', body: b }); }
    if (metodo === 'POST') { if (db.arquivos[nome]) return json(409, { error: 'Duplicate' }); db.arquivos[nome] = req.postDataBuffer(); return json(200, { Key: nome }); }
    if (metodo === 'DELETE') { if (!vejoTudo(me)) return json(403, {}); delete db.arquivos[nome]; return json(200, {}); }
  }
  const rpc = p.match(/^\/rest\/v1\/rpc\/(\w+)$/);
  if (rpc && rpcs[rpc[1]]) {
    try { const corpo = req.postData() ? JSON.parse(req.postData()) : {}; return resp(200, rpcs[rpc[1]](me, corpo)); }
    catch (e) { return Array.isArray(e) ? json(e[0], e[1]) : json(500, { message: String(e) }); }
  }
  const tab = (p.match(/^\/rest\/v1\/(money_\w+)$/) || [])[1];
  if (!tab) return base.supabase(route);
  const corpo = req.postData() ? JSON.parse(req.postData()) : null;
  try {
    if (tab === 'money_docs') {
      if (!vejoCasa(me)) negado('sem visão');
      const vis = db.money_docs.filter((r) => podeLer(me, r));
      if (metodo === 'GET') return resp(200, escolher(filtrar(vis, prm), prm));
      const conferir = (r) => {
        if ((r.escopo === 'reservado') !== String(r.id).startsWith('r.')) throw [400, { code: '23514', message: 'money_docs_escopo' }];
        if (!podeLer(me, r)) negado('RLS');
        if (r.dados_cifrado && migrado() && !String(r.dados_cifrado).startsWith('{"c":1,"m":')) negado('Este aparelho precisa das chaves novas do MoneyTRIO');
      };
      if (metodo === 'POST') {
        const lista = Array.isArray(corpo) ? corpo : [corpo], feitas = [];
        for (const r0 of lista) {
          const r = Object.assign({ escopo: 'casa' }, r0); conferir(r);
          const ja = db.money_docs.find((x) => x.grupo_id === r.grupo_id && x.colecao === r.colecao && x.id === r.id);
          if (ja) { if (/ignore-duplicates/.test(prefer)) continue; return json(409, { code: '23505' }); }
          const n = Object.assign({}, r, { versao: 1, criado_em: base.agora(), atualizado_em: base.agora(), apagado_em: null }); db.money_docs.push(n); feitas.push(n);
        }
        return /return=representation/.test(prefer) ? resp(201, feitas) : json(201);
      }
      if (metodo === 'PATCH') {
        const alvo = filtrar(vis, prm);
        for (const r of alvo) { conferir(Object.assign({}, r, corpo)); if ('escopo' in corpo && corpo.escopo !== r.escopo) negado('escopo não muda'); }
        alvo.forEach((r) => { Object.assign(r, corpo); r.versao++; r.atualizado_em = base.agora(); });
        return resp(200, alvo);
      }
    }
    if (tab === 'money_chaves' && metodo === 'GET') return resp(200, escolher(filtrar(db.money_chaves.filter((k) => k.user_id === me && (k.escopo === 'casa' ? vejoCasa(me) : vejoTudo(me))), prm), prm));
    if (tab === 'money_caixa_chave') {
      if (metodo === 'GET') return resp(200, escolher(filtrar(db.money_caixa_chave.filter((c) => vejoTudo(me) || (c.escopo === 'casa' && vejoCasa(me))), prm), prm));
      if (metodo === 'POST') { if (!vejoTudo(me)) negado('só quem vê tudo'); const r = Object.assign({ escopo: 'reservado' }, corpo); if (!/escopo/.test(prm.get('on_conflict') || '') && migrado()) throw [400, { code: '42P10', message: 'no unique constraint' }]; db.money_caixa_chave = db.money_caixa_chave.filter((x) => x.escopo !== r.escopo); db.money_caixa_chave.push(r); return json(201); }
    }
    if (tab === 'money_entrada' && metodo === 'GET') return resp(200, escolher(filtrar(db.money_entrada.filter((r) => vejoTudo(me) || (r.escopo === 'casa' && vejoCasa(me))), prm), prm));
  } catch (e) { return Array.isArray(e) ? json(e[0], e[1]) : json(500, { message: String(e) }); }
  return json(404, { code: 'PGRST205', message: 'tabela não existe no teste' });
}

module.exports = Object.assign({}, base, { supabase, prepararChaves, BETA, pacoteRobo, depositar, abreComCf, log, visao });
