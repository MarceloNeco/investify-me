/* =====================================================================
   teste/teste-nuvem.js — teste automático do MoneyTRIO com a nuvem (index.html + nuvem.js; Chromium headless, Playwright)
   ---------------------------------------------------------------------
   Não toca no Supabase de verdade: um "Supabase de mentira" em memória (aqui embaixo) responde às mesmas
   chamadas (conta, sol_*, omni_chave_privada, money_docs, money_caixa_chave, money_entrada, money_robos).
   O que confere:
     1. vetor fixo do Python (robo-pacote/vetor-caixa-robo.json) abre no navegador; pacote feito no navegador abre no Python;
     2. aparelho A (celular 390x800): entra, código de recuperação, PIN, leva os dados do aparelho para a nuvem;
        no banco só há pacote fechado (nenhum texto aberto);
     3. caixa do robô: o app cria a chave da caixa; o Python fecha um lançamento para ela; o app abre, grava e marca;
     4. recarregar pede o PIN; PIN errado avisa; certo abre a cópia do aparelho;
     5. aparelho B (computador 1366x768): mesma conta, outro aparelho; recebe tudo; muda e apaga; A recebe;
     6. conflito: A e B mudam o mesmo lançamento em campos diferentes → os dois ficam;
     7. nenhum erro de página (pageerror) nos dois tamanhos de tela;
     8. cadeado (3.31, relógio falso): 14 min sem uso não tranca e avisa; 15 min tranca; 9 min escondido não tranca; 10 min tranca;
        trabalho rodando não tranca; o que foi digitado continua depois de abrir.
   Uso (na pasta raiz):  node teste/teste-nuvem.js
   ===================================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { webcrypto } = require('crypto');
const { chromium } = require('playwright');
const subtle = webcrypto.subtle;

const RAIZ = path.join(__dirname, '..');
const SB = 'https://qvdvkqydhnadhewcidia.supabase.co';
const SAIDA = process.env.SAIDA || path.join(require('os').tmpdir(), 'teste-nuvem');
fs.mkdirSync(SAIDA, { recursive: true });

let falhas = 0, oks = 0;
function ok(c, msg) { if (c) { oks++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ FALHOU: ' + msg); } }
const b64 = (b) => Buffer.from(b).toString('base64');
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

/* ---------------- Supabase de mentira ---------------- */
const UID = '11111111-1111-1111-1111-111111111111', GID = '22222222-2222-2222-2222-222222222222';
const CODIGO = 'KQ7PZ-3MXWD-H8RTA-2BCNE';
const db = { user_settings: [], money_docs: [], money_caixa_chave: [], money_entrada: [], money_robos: [], omni_chave_privada: [] };
let relogio = Date.parse('2026-11-03T10:00:00Z'), CF_RAW = null, embrulhada = '';
const agora = () => new Date(relogio += 7).toISOString();
function jwt(sub, email) { const p = Buffer.from(JSON.stringify({ sub, email, exp: 9999999999 })).toString('base64url'); return 'h.' + p + '.s'; }
function filtrar(linhas, params) {
  return linhas.filter((r) => {
    for (const [k, v] of params) {
      if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k)) continue;
      const i = v.indexOf('.'), op = v.slice(0, i), val = v.slice(i + 1), x = r[k];
      if (op === 'eq' && String(x) !== val) return false;
      if (op === 'neq' && String(x) === val) return false;
      if (op === 'gte' && !(x >= val)) return false;
      if (op === 'gt' && !(x > val)) return false;
      if (op === 'is' && val === 'null' && x != null) return false;
    }
    return true;
  });
}
function escolher(linhas, params) {
  const sel = params.get('select'); let out = linhas;
  const ord = params.get('order');
  if (ord) { const cs = ord.split(',').map((c) => c.split('.')[0]); out = out.slice().sort((a, b) => { for (const c of cs) { if (a[c] < b[c]) return -1; if (a[c] > b[c]) return 1; } return 0; }); }
  const off = +(params.get('offset') || 0), lim = params.get('limit') ? +params.get('limit') : 1000;
  out = out.slice(off, off + lim);
  if (sel && sel !== '*') out = out.map((r) => Object.fromEntries(sel.split(',').map((c) => [c, r[c]])));
  return out;
}
const chamadas = [];
const storage = { ligado: false, objs: {} };   /* Storage de mentira: bucket money-arquivos (3.42) */
async function supabase(route) {
  const req = route.request(), url = new URL(req.url()), metodo = req.method();
  if (url.pathname.startsWith('/storage/v1/object/') && metodo !== 'OPTIONS') {
    chamadas.push(metodo + ' ' + url.pathname);
    const m = url.pathname.match(/^\/storage\/v1\/object\/(authenticated\/)?money-arquivos\/(.+)$/);
    const cab = { 'access-control-allow-origin': '*' };
    if (!m || !storage.ligado) return route.fulfill({ status: 404, contentType: 'application/json', headers: cab, body: JSON.stringify({ statusCode: '404', error: 'Bucket not found', message: 'Bucket not found' }) });
    if (metodo === 'POST') { if (storage.objs[m[2]]) return route.fulfill({ status: 409, headers: cab, body: '{"error":"Duplicate"}' }); storage.objs[m[2]] = req.postDataBuffer(); return route.fulfill({ status: 200, contentType: 'application/json', headers: cab, body: '{"Key":"x"}' }); }
    if (metodo === 'GET') { const b = storage.objs[m[2]]; return b ? route.fulfill({ status: 200, contentType: 'application/octet-stream', headers: cab, body: b }) : route.fulfill({ status: 400, headers: cab, body: '{"error":"not_found"}' }); }
  }
  const corpo = req.postData() ? JSON.parse(req.postData()) : null;
  const json = (st, o) => route.fulfill({ status: st, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: o === undefined ? '' : JSON.stringify(o) });
  if (metodo === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  const p = url.pathname; chamadas.push(metodo + ' ' + p + url.search);
  if (p === '/auth/v1/token') {
    if (url.searchParams.get('grant_type') === 'password' && !(corpo.email === 'dono@teste.com' && corpo.password === 'senha-de-teste-1')) return json(400, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
    return json(200, { access_token: jwt(UID, 'dono@teste.com'), refresh_token: 'r' + Date.now(), expires_in: 3600, user: { email: 'dono@teste.com' } });
  }
  if (p.startsWith('/auth/v1/')) return json(200, {});
  if (p.startsWith('/functions/v1/')) return json(200, { ok: true });
  const rpc = p.match(/^\/rest\/v1\/rpc\/(\w+)$/);
  if (rpc) {
    const n = rpc[1];
    if (n === 'minha_conta_encerrada') return json(200, false);
    if (n === 'sol_registrar_uso') return json(200, true);
    if (n === 'sol_meus_grupos') return json(200, [{ grupo_id: GID, tipo: 'familia', nome: 'Família Teste', meu_papel: 'chefe', membros: 2, governanca: 'omnilife-one', sou_dono: true }]);
    if (n === 'sol_minha_chave_grupo') return json(200, [{ versao: 1, chave_embrulhada: embrulhada }]);
    if (n === 'money_entrada_consumir') { let c = 0; db.money_entrada.forEach((e) => { if (corpo.p_ids.includes(e.id) && !e.consumido_em) { e.consumido_em = agora(); c++; } }); return json(200, c); }
    if (n === 'money_robo_autorizar') {
      if (!/^robo-financas@solverone\.com\.br$/i.test(String(corpo.p_email).trim())) return json(404, { code: 'P0002', message: 'Não há conta SolverONE com esse e-mail.' });
      const ja = db.money_robos.find((x) => x.user_id === '33333333-3333-3333-3333-333333333333');
      const novo = { grupo_id: GID, user_id: '33333333-3333-3333-3333-333333333333', nome: corpo.p_nome || 'robô', criado_em: agora(), desligado_em: null };
      if (ja) Object.assign(ja, novo); else db.money_robos.push(novo);
      return json(200, novo.user_id);
    }
    if (n === 'money_robo_desligar') { const r = db.money_robos.find((x) => x.user_id === corpo.p_user && !x.desligado_em); if (r) r.desligado_em = agora(); return json(200, !!r); }
    return json(404, { code: 'PGRST202', message: 'função ' + n + ' não existe no teste' });
  }
  const tab = p.match(/^\/rest\/v1\/(\w+)$/); if (!tab || !db[tab[1]]) return json(404, { code: 'PGRST205', message: 'tabela não existe no teste' });
  const t = tab[1], linhas = db[t], prm = url.searchParams, prefer = req.headers()['prefer'] || '';
  if (metodo === 'GET') return json(200, escolher(filtrar(linhas, prm), prm));
  if (metodo === 'POST') {
    const lista = Array.isArray(corpo) ? corpo : [corpo], feitas = [];
    const chave = t === 'money_docs' ? (r) => r.grupo_id + '|' + r.colecao + '|' + r.id : t === 'money_caixa_chave' ? (r) => r.grupo_id : (r) => JSON.stringify(r);
    for (const r of lista) {
      const ja = linhas.find((x) => chave(x) === chave(r));
      if (ja) {
        if (/ignore-duplicates/.test(prefer)) continue;
        if (/merge-duplicates/.test(prefer)) { Object.assign(ja, r); feitas.push(ja); continue; }
        return json(409, { code: '23505', message: 'duplicate key' });
      }
      const n = Object.assign({}, r);
      if (t === 'money_docs') Object.assign(n, { versao: 1, criado_em: agora(), atualizado_em: agora(), apagado_em: null });
      linhas.push(n); feitas.push(n);
    }
    return /return=representation/.test(prefer) ? json(201, feitas) : json(201);
  }
  if (metodo === 'PATCH') {
    const alvo = filtrar(linhas, prm);
    alvo.forEach((r) => { Object.assign(r, corpo); if (t === 'money_docs') { r.versao++; r.atualizado_em = agora(); if (corpo.apagado_em) r.apagado_em = r.atualizado_em; } });
    return json(200, alvo);
  }
  return json(405, { message: 'método' });
}

/* ---------------- chaves do "OmniLifeONE" (o que já existe no banco do dono) ---------------- */
async function prepararChaves() {
  const par = await subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
  const pkcs8 = new Uint8Array(await subtle.exportKey('pkcs8', par.privateKey));
  const sal = b64(webcrypto.getRandomValues(new Uint8Array(16)));
  const base = await subtle.importKey('raw', new TextEncoder().encode(normCode(CODIGO)), 'PBKDF2', false, ['deriveKey']);
  const k = await subtle.deriveKey({ name: 'PBKDF2', salt: unb64(sal), iterations: 600000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  db.omni_chave_privada.push({ user_id: UID, privada_cifrado: JSON.stringify({ v: 1, kid: 'k1', iv: b64(iv), ct: b64(await subtle.encrypt({ name: 'AES-GCM', iv }, k, pkcs8)) }), sal, iteracoes: 600000 });
  CF_RAW = webcrypto.getRandomValues(new Uint8Array(32));
  embrulhada = '1.' + b64(await subtle.encrypt({ name: 'RSA-OAEP' }, par.publicKey, new TextEncoder().encode(JSON.stringify({ v: 1, kv: 1, fk: 'fk-teste', k: b64(CF_RAW) }))));
}
async function abrirDoBanco(cif) {
  const o = JSON.parse(cif), k = await subtle.importKey('raw', CF_RAW, 'AES-GCM', false, ['decrypt']);
  return JSON.parse(new TextDecoder().decode(await subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.iv) }, k, unb64(o.ct))));
}

/* ---------------- dados "só neste aparelho" (o MoneyTRIO sem nuvem) ---------------- */
const LOCAL = {
  v: 1, moedaBase: 'BRL', nivel: 'iniciante', tema: 'dark',
  posicoes: [{ id: 'p1', ticker: 'PETR4', nome: 'Petrobras PN', tipo: 'acao', qtd: 10, pm: 30, moeda: 'BRL', inst: 'XP', data: '2025-01-10' }],
  gastos: [
    { id: 'g1', data: '2026-10-01', valor: 59.9, grupo: 'LAZER', sub: 'Cinema', desc: 'Cinema com as crianças', per: 'Pontual', quem: 'Neco', forma: 'Pix', fluxo: 'saida' },
    { id: 'g2', data: '2026-10-05', valor: 412.3, grupo: 'HABITACAO', sub: 'Supermercado', desc: 'Compra do mês', per: 'Mensal', quem: '', forma: 'Credito', fluxo: 'saida' },
    { id: 'g3', data: '2026-10-05', valor: 9000, grupo: 'RENDA', sub: 'Salário', desc: 'Salário outubro', per: 'Mensal', quem: 'Neco', forma: 'Pix', fluxo: 'entrada' }],
  cartoes: [{ id: 'c1', nome: 'Visa', final: '1234', fechamento: 1, vencimento: 10 }],
  pagamentos: [{ rid: 'r1', data: '2026-10-10', pago: true }],
  agenda: [{ chave: 'ag|1', data: '2026-12-01', valor: 1000, tipo: 'resgate' }],
  categorias: { LAZER: ['Cinema'] }, config: { aporteMensal: 500, chaves: { brapi: '' } }
};

async function abrirPagina(browser, viewport, nome, comLocal) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true, serviceWorkers: 'block' });
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith(SB)) return supabase(route);
    if (u.startsWith(BASE)) return route.continue();
    return route.abort();   /* cotações, notícias etc.: fora do teste */
  });
  if (comLocal) await ctx.addInitScript((t) => { if (!localStorage.getItem('investifyme.dados.v1') && !sessionStorage.getItem('semeado')) { localStorage.setItem('investifyme.dados.v1', t); sessionStorage.setItem('semeado', '1'); } }, JSON.stringify(LOCAL));
  const page = await ctx.newPage();
  page.erros = [];
  page.on('pageerror', (e) => { page.erros.push(String(e && e.stack || e)); console.log('  [' + nome + ' pageerror] ' + e); });
  page.on('dialog', (d) => d.accept());
  return page;
}
async function entrarComCodigo(page, nome) {
  await page.goto(BASE + '/');
  await page.waitForSelector('#nvEm');
  ok(true, nome + ': tela de entrar aparece');
  await page.fill('#nvEm', 'dono@teste.com'); await page.fill('#nvPw', 'errada-123'); await page.click('#nvIn');
  await page.waitForFunction(() => { const e = document.querySelector('#nvErro'); return e && !e.classList.contains('nv-hidden'); });
  ok(/incorretos/.test(await page.textContent('#nvErro')), nome + ': senha errada avisa');
  await page.fill('#nvPw', 'senha-de-teste-1'); await page.click('#nvIn');
  await page.waitForSelector('#nvCod', { timeout: 20000 });
  ok(/recupera/.test(await page.textContent('.nv-card')) && /os dados não voltam/.test(await page.textContent('.nv-card')), nome + ': pede o código de recuperação e avisa que sem código e PIN os dados não voltam');
  await page.fill('#nvCod', 'KQ7PZ-3MXWD-ERRAD-0BCNE'); await page.click('#nvCodOk');
  await page.waitForSelector('#nvP1');
  ok(await page.evaluate(() => [...document.querySelectorAll('#nvP1,#nvP2')].every((i) => i.type === 'text' && i.autocomplete === 'off') && !document.querySelector('.nv-card input[type=password]')), nome + ': campo do PIN não é tratado como senha pelo navegador (não oferece salvar senha)');
  await page.fill('#nvP1', '482915'); await page.fill('#nvP2', '482915'); await page.click('#nvPOk');
  await page.waitForSelector('#nvCod', { timeout: 90000 });
  await page.waitForFunction(() => /não confere/.test((document.querySelector('#nvErro') || {}).textContent || ''), null, { timeout: 30000 });
  ok(true, nome + ': código errado é recusado');
  await page.fill('#nvCod', CODIGO.toLowerCase().replace(/-/g, '')); await page.click('#nvCodOk');
  await page.waitForSelector('#nvP1'); await page.fill('#nvP1', '123456'); await page.fill('#nvP2', '123456'); await page.click('#nvPOk');
  ok(/fácil de adivinhar/.test(await page.textContent('#nvErro')), nome + ': PIN fácil é recusado');
  await page.fill('#nvP1', '482915'); await page.fill('#nvP2', '482915'); await page.click('#nvPOk');
}
const estado = (page) => page.evaluate(() => ({ gastos: Store.estado.gastos.map((g) => ({ id: g.id, desc: g.desc, valor: g.valor, quem: g.quem, grupo: g.grupo, sub: g.sub })), posicoes: Store.estado.posicoes.length, fila: MoneyNuvem._teste.Sinc.fila.size }));
async function filaVazia(page) { await page.waitForFunction(() => MoneyNuvem._teste.Sinc.fila.size === 0 && !MoneyNuvem._teste.Sinc._env, null, { timeout: 30000 }); }

let BASE = '';
(async () => {
  const srv = await servidor(); BASE = 'http://127.0.0.1:' + srv.address().port;
  await prepararChaves();
  const browser = await chromium.launch();
  try {
    /* ---------- 1. vetor fixo Python ↔ navegador ---------- */
    console.log('1) cifra do robô: Python ↔ navegador');
    const vetor = JSON.parse(fs.readFileSync(path.join(__dirname, 'robo-pacote', 'vetor-caixa-robo.json'), 'utf8'));
    const pu = await abrirPagina(browser, { width: 390, height: 800 }, 'vetor', false);
    await pu.goto(BASE + '/'); await pu.waitForSelector('#nvEm');
    const res = await pu.evaluate(async (v) => {
      const C = MoneyNuvem._teste.Cifra, j = v.chave_privada_teste;
      const sk = await crypto.subtle.importKey('jwk', { kty: 'RSA', n: j.n, e: j.e, d: j.d, p: j.p, q: j.q, dp: j.dp, dq: j.dq, qi: j.qi, alg: 'RSA-OAEP-256', ext: true }, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']);
      const abertos = []; for (const it of v.itens) abertos.push(JSON.stringify(await C.abrirPacote(sk, it.pacote)) === JSON.stringify(it.lancamento));
      let estragado = false; try { const o = JSON.parse(v.itens[0].pacote); o.ct = o.ct.slice(0, -4) + 'AAAA'; await C.abrirPacote(sk, JSON.stringify(o)); } catch (e) { estragado = true; }
      const meu = await C.selarPacote(v.chave_publica, v.itens[0].lancamento);
      const conv = v.itens.map((it) => { try { return MoneyNuvem._teste.Caixa.converter(it.lancamento); } catch (e) { return 'erro:' + e.message; } });
      return { abertos, estragado, meu, conv };
    }, vetor);
    ok(res.abertos.length === 4 && res.abertos.every(Boolean), 'o navegador abre os 4 pacotes fechados pelo Python');
    ok(res.estragado, 'pacote mexido não abre (a etiqueta do AES-GCM confere)');
    fs.writeFileSync(path.join(SAIDA, 'pacote-do-navegador.json'), JSON.stringify({ pacote: res.meu, lancamento: vetor.itens[0].lancamento }));
    const py = execFileSync('python3', ['-I', path.join(__dirname, 'robo-pacote', 'gerar_vetor.py'), '--conferir', path.join(SAIDA, 'pacote-do-navegador.json')]).toString();
    ok(/abre o pacote feito no navegador/.test(py), 'o Python abre o pacote fechado pelo navegador');
    const [cv1, cv2, cv3, cv4] = res.conv;
    ok(cv1.grupo === 'HABITACAO' && cv1.sub === 'Supermercado' && cv1.valor === 123.45 && cv1.id === 'rb_pluggy-teste-0001' && cv1.origem === 'robo', 'despesa do robô vira lançamento do BudgetONE');
    ok(cv2.grupo === 'RENDA' && cv2.irpf === true && cv2.per === 'Mensal', 'receita vai para Renda, com IR e frequência');
    ok(cv3.grupo === 'RENDA' && cv3.valor === 40 && cv3.revisar === true && /Estorno/.test(cv3.desc), 'estorno (valor negativo) entra como dinheiro que voltou, marcado para revisar');
    ok(cv4 === null, 'transferência não vira lançamento');
    await pu.context().close();

    /* ---------- 1b. sem conta: só neste aparelho (o MoneyTRIO de sempre) ---------- */
    console.log('1b) sem conta: só neste aparelho');
    const L = await abrirPagina(browser, { width: 390, height: 800 }, 'local', true);
    await L.goto(BASE + '/teste-nuvem.html#x');
    await L.waitForSelector('#nvSoAqui');
    ok(new URL(L.url()).pathname === '/', 'o endereço antigo teste-nuvem.html leva para o MoneyTRIO');
    ok(!/teste/i.test(await L.textContent('.nv-card')), 'a tela de entrada não fala mais em "teste"');
    await L.click('#nvSoAqui');
    await L.waitForFunction(() => typeof Store !== 'undefined' && Store.estado.gastos.length === 3);
    ok(/Entrar na nuvem/.test(await L.textContent('#nvSelo')), 'local: abre o app com os dados do aparelho e o botão "Entrar na nuvem"');
    ok(/Tudo fica guardado no seu navegador/.test(await L.textContent('.hub-pe')), 'local: o rodapé continua dizendo que fica no navegador');
    ok(!/^dono$/i.test((await L.textContent('#perfilNome').catch(() => '')).trim()), 'local: o topo continua como era (sem o nome da conta)');
    await L.evaluate(() => { Store.estado.gastos[0].desc = 'mudado no modo local'; Store.salvar(); });
    ok(/mudado no modo local/.test(await L.evaluate(() => localStorage.getItem('investifyme.dados.v1'))), 'local: salvar grava no aparelho, como sempre');
    ok(!chamadas.some((c) => /money_docs/.test(c)), 'local: nada vai para a nuvem');
    await L.reload(); await L.waitForSelector('#nvSelo');
    ok(!(await L.$('#nvEm')) && (await L.evaluate(() => Store.estado.gastos[0].desc)) === 'mudado no modo local', 'local: ao recarregar, abre direto no aparelho (sem pedir conta)');
    await L.click('#nvSelo'); await L.waitForSelector('#nvEm');
    ok(true, 'local: "Entrar na nuvem" leva para a tela de entrar');
    ok(L.erros.length === 0, 'local: nenhum erro de página (' + L.erros.length + ')');
    await L.context().close();

    /* ---------- 2. aparelho A: entra e leva os dados do aparelho ---------- */
    console.log('2) aparelho A (390x800): conta, código, PIN, levar para a nuvem');
    const A = await abrirPagina(browser, { width: 390, height: 800 }, 'A', true);
    await entrarComCodigo(A, 'A');
    await A.waitForSelector('#nvLevarOk', { timeout: 60000 });
    ok(/3 lançamentos/.test(await A.textContent('.nv-card')), 'A: oferece levar os dados que estão só no aparelho (3 lançamentos)');
    await A.screenshot({ path: path.join(SAIDA, 'A-levar.png') });
    const [dl] = await Promise.all([A.waitForEvent('download'), A.click('#nvCopia')]);
    ok(/moneytrio-copia-/.test(dl.suggestedFilename()), 'A: baixa a cópia de segurança antes');
    await A.click('#nvLevarOk');
    await A.waitForSelector('#nvSelo', { timeout: 30000 });
    await filaVazia(A);
    const vivos = db.money_docs.filter((r) => !r.apagado_em);
    ok(vivos.length >= 10, 'A: os registros subiram para money_docs (' + vivos.length + ')');
    ok(!JSON.stringify(db.money_docs).match(/Cinema|PETR4|Supermercado|Neco|9000/), 'no banco não há nenhum texto aberto (só pacotes fechados)');
    const g1 = vivos.find((r) => r.colecao === 'gastos' && r.id === 'g1');
    ok(g1 && (await abrirDoBanco(g1.dados_cifrado)).desc === 'Cinema com as crianças', 'o pacote do banco abre com a chave da família (g1)');
    ok(vivos.some((r) => r.colecao === 'pagamentos' && r.id === 'r1@2026-10-10') && vivos.some((r) => r.colecao === 'agenda' && r.id === 'ag|1') === false && vivos.some((r) => r.colecao === 'agenda'), 'ids: pagamento por rid@data; chave com "|" vira id seguro');
    const cfg = vivos.find((r) => r.colecao === 'config' && r.id === 'config');
    ok(cfg && !('chaves' in (await abrirDoBanco(cfg.dados_cifrado)).v), 'as chaves de API nunca sobem');
    ok(JSON.parse(await A.evaluate(() => localStorage.getItem('investifyme.dados.v1'))).gastos.length === 3, 'o MoneyTRIO sem nuvem deste aparelho continua igual');
    ok(/Tudo guardado/.test(await A.textContent('#nvSelo')), 'A: selo "Tudo guardado"');
    await A.waitForFunction(() => (document.querySelector('#perfilNome') || {}).textContent === 'dono', null, { timeout: 10000 }).catch(() => {});
    ok((await A.textContent('#perfilNome')) === 'dono' && (await A.textContent('#perfilAv')) === 'D', 'A: sem nome no perfil nem no Google, o topo mostra a parte do e-mail antes do @ ("dono", iniciais "D")');
    db.user_settings.push({ user_id: UID, display_name: 'Marcelo Freitas' });
    await A.evaluate(() => MoneyNuvem.buscarNome());
    ok((await A.textContent('#perfilNome')) === 'Marcelo Freitas' && (await A.textContent('#perfilAv')) === 'MF', 'A: com o nome do perfil SolverONE, o topo mostra "Marcelo Freitas" e as iniciais "MF"');
    db.user_settings.length = 0;
    ok(/Fica guardado na nuvem/.test(await A.textContent('.hub-pe')), 'A: rodapé da tela inicial diz que fica na nuvem');
    await A.screenshot({ path: path.join(SAIDA, 'A-app.png') });

    /* 3.33: importar compromissos com a nuvem: grava pelo caminho normal (fechado) */
    await A.evaluate(() => { ImportRec.abrir(JSON.stringify({ tipo: 'moneytrio-compromissos', versao: 1, itens: [{ nome: 'Escola Ana 2027', valor: 3100, grupo: 'DEPENDENTES', sub: 'Escola', regra: 'dia', dia: 5, quem: 'Ana', irpf: true }] })); ImportRec.importar(); });
    await esperar(1200); await filaVazia(A);
    const recNuvem = db.money_docs.filter((r) => r.colecao === 'recorrentes' && !r.apagado_em);
    ok(recNuvem.length === 1 && (await abrirDoBanco(recNuvem[0].dados_cifrado)).nome === 'Escola Ana 2027' && !/Escola Ana/.test(recNuvem[0].dados_cifrado), 'importar compromissos com a nuvem: sobe fechado para money_docs (recorrentes)');

    /* ---------- 3. caixa do robô ---------- */
    console.log('3) caixa do robô');
    await A.evaluate(() => MoneyNuvem.buscarAgora());
    await A.waitForFunction(() => true);
    for (let i = 0; i < 40 && !db.money_caixa_chave.length; i++) await esperar(250);
    const cx = db.money_caixa_chave[0];
    ok(cx && cx.chave_publica.kty === 'RSA' && cx.chave_publica.n.length === 512 && !cx.chave_publica.d, 'A: criou a chave pública da caixa (3072 bits, sem a parte privada)');
    const sec = db.money_docs.find((r) => r.colecao === 'config' && r.id === 'caixa_robo');
    ok(sec && (await abrirDoBanco(sec.dados_cifrado)).kid === cx.chave_publica.kid, 'a parte secreta da caixa está no money_docs, fechada com a chave da família');
    const lanc = { id: 'pluggy-e2e-1', data: '2026-11-03', valor: 87.5, tipo: 'despesa', grupo: 'VEICULO', categoria: 'Combustível', descricao: 'Posto teste', quem: 'Neco', forma: 'Crédito', cartao: 'Visa', final: '1234', banco: 'Banco Teste', ir: false, freq: 'Pontual', origem: 'pluggy', cat_pluggy: 'Gas' };
    const pacPy = execFileSync('python3', ['-I', '-c', 'import sys,json; sys.path.insert(0, sys.argv[1]); import pacote_caixa as pc; print(pc.selar(json.loads(sys.argv[2]), json.loads(sys.argv[3])))', path.join(__dirname, 'robo-pacote'), JSON.stringify(cx.chave_publica), JSON.stringify(lanc)]).toString().trim();
    db.money_entrada.push({ grupo_id: GID, id: 'pluggy-e2e-1', pacote: pacPy, origem: 'pluggy', criado_em: agora(), consumido_em: null });
    db.money_entrada.push({ grupo_id: GID, id: 'pluggy-e2e-2', pacote: vetor.itens[0].pacote, origem: 'pluggy', criado_em: agora(), consumido_em: null });   /* fechado para outra chave */
    await A.evaluate(() => MoneyNuvem._teste.Caixa.esvaziar());
    await A.waitForFunction(() => Store.estado.gastos.some((g) => g.id === 'rb_pluggy-e2e-1'), null, { timeout: 20000 });
    const gr = (await estado(A)).gastos.find((g) => g.id === 'rb_pluggy-e2e-1');
    ok(gr && gr.grupo === 'VEICULO' && gr.valor === 87.5 && gr.desc === 'Posto teste', 'o lançamento do robô (fechado pelo Python) entrou no BudgetONE');
    for (let i = 0; i < 40 && !db.money_entrada[0].consumido_em; i++) await esperar(250);
    ok(!!db.money_entrada[0].consumido_em, 'e foi marcado como aproveitado na caixa');
    ok(!db.money_entrada[1].consumido_em, 'pacote que não abre com esta chave fica na caixa (não some)');
    ok(db.money_docs.some((r) => r.colecao === 'gastos' && r.id === 'rb_pluggy-e2e-1' && !r.apagado_em), 'o lançamento do robô está no money_docs, fechado');
    db.money_entrada[0].consumido_em = null;   /* o robô reenviou o mesmo: não duplica */
    await A.evaluate(() => MoneyNuvem._teste.Caixa.esvaziar()); await esperar(1500);
    ok((await estado(A)).gastos.filter((g) => g.id === 'rb_pluggy-e2e-1').length === 1, 'o mesmo lançamento do robô duas vezes não duplica');
    /* 3.39 (N24): correção do robô atualiza; se a pessoa editou, a edição dela vence */
    const selarPy = (l) => execFileSync('python3', ['-I', '-c', 'import sys,json; sys.path.insert(0, sys.argv[1]); import pacote_caixa as pc; print(pc.selar(json.loads(sys.argv[2]), json.loads(sys.argv[3])))', path.join(__dirname, 'robo-pacote'), JSON.stringify(cx.chave_publica), JSON.stringify(l)]).toString().trim();
    const reenviar = async (l) => { db.money_entrada[0].pacote = selarPy(l); db.money_entrada[0].consumido_em = null; await A.evaluate(() => MoneyNuvem._teste.Caixa.esvaziar()); for (let i = 0; i < 40 && !db.money_entrada[0].consumido_em; i++) await esperar(250); };
    await reenviar(Object.assign({}, lanc, { categoria: 'Pedágio', valor: 90 }));
    let gc = (await estado(A)).gastos.find((g) => g.id === 'rb_pluggy-e2e-1');
    ok(gc && gc.sub === 'Pedágio' && gc.valor === 90 && !gc.roboSugeriu && (await estado(A)).gastos.filter((g) => g.id === 'rb_pluggy-e2e-1').length === 1, 'correção do robô (categoria e valor) atualiza o lançamento que a pessoa não mexeu');
    ok(!!db.money_entrada[0].consumido_em, 'a correção também é marcada como aproveitada');
    await A.evaluate(() => { Gasto.atualizar('rb_pluggy-e2e-1', { desc: 'Pedágio da viagem (meu)', editadoPessoa: true }); Store.salvar(); });
    await reenviar(Object.assign({}, lanc, { categoria: 'Pedágio', valor: 95 }));
    gc = await A.evaluate(() => JSON.parse(JSON.stringify(Store.estado.gastos.find((g) => g.id === 'rb_pluggy-e2e-1'))));
    ok(gc && gc.valor === 90 && gc.desc === 'Pedágio da viagem (meu)' && gc.roboSugeriu && gc.roboSugeriu.valor === 95 && gc.revisar, 'a pessoa editou: a edição dela vence e fica "o robô sugeriu outra coisa" (valor 95) para decidir');
    await A.evaluate(() => { abrirApp('budget'); abrirLancamento('rb_pluggy-e2e-1'); });
    await A.waitForSelector('#assetModal:not(.hidden) .robo-sug');
    ok(/O robô sugeriu outra coisa/.test(await A.textContent('.robo-sug')) && /Valor:/.test(await A.textContent('.robo-sug')), 'o formulário mostra o que o robô sugeriu, com [Usar o do robô] [Manter o meu]');
    await A.click('[data-acao="robo-aceitar"]');
    gc = await A.evaluate(() => JSON.parse(JSON.stringify(Store.estado.gastos.find((g) => g.id === 'rb_pluggy-e2e-1'))));
    ok(gc && gc.valor === 95 && !gc.roboSugeriu && !gc.editadoPessoa && !gc.revisar, '"Usar o do robô" aplica e limpa a marca');
    /* 3.39 (N24): transferência do robô não some: fica guardada (em cinza) e não vira lançamento */
    const tf = { id: 'pluggy-tf-1', data: '2026-11-03', valor: 95, tipo: 'transferencia', grupo: '', categoria: '', descricao: 'TED para Itaú', quem: '', forma: 'Pix', cartao: '', final: '', banco: 'BTG', ir: false, freq: 'Pontual', origem: 'pluggy', cat_pluggy: 'Transfer' };
    db.money_entrada.push({ grupo_id: GID, id: 'pluggy-tf-1', pacote: selarPy(tf), origem: 'pluggy', criado_em: agora(), consumido_em: null });
    await A.evaluate(() => MoneyNuvem._teste.Caixa.esvaziar());
    const linhaTf = () => db.money_entrada.find((e) => e.id === 'pluggy-tf-1');
    for (let i = 0; i < 40 && !linhaTf().consumido_em; i++) await esperar(250);
    const tfs = await A.evaluate(() => JSON.parse(JSON.stringify(Store.estado.transferencias || [])));
    ok(tfs.length === 1 && tfs[0].id === 'tf_pluggy-tf-1' && tfs[0].valor === 95 && tfs[0].banco === 'BTG' && (await estado(A)).gastos.length === 4, 'transferência do robô fica guardada (não vira lançamento, não some)');
    ok(!!linhaTf().consumido_em && db.money_docs.some((r) => r.colecao === 'transferencias' && r.id === 'tf_pluggy-tf-1'), 'e vai para o money_docs fechada, e é marcada como aproveitada');
    /* 3.42: arquivos (NF/pasta do IR) fechados com a chave da família; Storage ainda sem o SQL → ficam no aparelho */
    const ORIG = 'PDF-de-teste-NFS-e-Dentista-R$-350,00-' + 'x'.repeat(300);
    const m1 = await A.evaluate(async (t) => { const m = await ArquivosFamilia.guardar({ nome: '2026-11-05 Dentista Ana.pdf', tipo: 'nf', ano: 2026 }, new TextEncoder().encode(t)); return m; }, ORIG);
    await esperar(800);
    ok(m1 && !m1.nuvem && Object.keys(storage.objs).length === 0, 'arquivo: sem o bucket (SQL não aplicado), fica só no aparelho, sem erro');
    for (let i = 0; i < 40 && !db.money_docs.some((r) => r.colecao === 'arquivos' && r.id === m1.id); i++) await esperar(250);
    const regArq = db.money_docs.find((r) => r.colecao === 'arquivos' && r.id === m1.id);
    ok(regArq && !/Dentista|PDF-de-teste/.test(JSON.stringify(regArq)), 'a descrição do arquivo vai para o money_docs fechada (nem o nome aparece)');
    storage.ligado = true;
    const sinc = await A.evaluate(() => ArquivosFamilia.sincronizar());
    const obj = storage.objs[GID + '/' + m1.id];
    ok(sinc.subiram === 1 && obj && obj.slice(0, 4).toString() === 'MTA1', 'com o bucket: sobe sozinho, fechado (formato MTA1)');
    ok(obj && obj.indexOf(Buffer.from('Dentista')) < 0 && obj.indexOf(Buffer.from('PDF-de-teste')) < 0, 'o Storage não vê o conteúdo do arquivo');
    ok(await A.evaluate((id) => (Store.estado.arquivos.find((x) => x.id === id) || {}).nuvem === true, m1.id), 'e marca "na nuvem"');
    const volta = await A.evaluate(async (id) => { await new Promise((ok2) => { const r = indexedDB.open('moneytrio-arquivos', 1); r.onsuccess = () => { const tx = r.result.transaction('arq', 'readwrite'); tx.objectStore('arq').delete(id); tx.oncomplete = ok2; }; }); const b = await ArquivosFamilia.ler(id); return b ? new TextDecoder().decode(b) : null; }, m1.id);
    ok(volta === ORIG, 'sem a cópia do aparelho, baixa da nuvem e abre com a chave da família');

    /* ---------- 4. recarregar: dentro dos 15 min não pede o PIN (3.35); trancado, pede ---------- */
    console.log('4) recarregar: PIN');
    const vale = (pg) => pg.evaluate(async () => { const v = await MoneyNuvem._teste.IDB.get('kv', MoneyNuvem._teste.Vale.K()); return v ? { extraivel: v.cf.extractable, ehChave: v.cf instanceof CryptoKey, falta: v.ate - Date.now() } : null; });
    const v0 = await vale(A);
    ok(v0 && v0.ehChave && v0.extraivel === false && v0.falta > 13 * 60000 && v0.falta <= 15 * 60000, 'A: a chave guardada para recarregar é do navegador, NÃO extraível, e vale 15 min');
    const guardado = await A.evaluate(() => { let t = ''; for (const st of [localStorage, sessionStorage]) for (let i = 0; i < st.length; i++) t += st.key(i) + '=' + st.getItem(st.key(i)); return t; });
    ok(!/vale|"cf"|fk-teste/.test(guardado), 'A: nada da chave em localStorage/sessionStorage');
    await A.reload(); await A.waitForSelector('#nvSelo', { timeout: 30000 });
    ok(!(await A.$('#nvPin')) && (await estado(A)).gastos.length === 4, 'A: recarregar dentro dos 15 min abre direto, sem pedir PIN');
    await A.evaluate(() => MoneyNuvem.trancar('manual'));
    await A.waitForSelector('#nvPin', { timeout: 20000 });
    ok(/Você fechou o cadeado/.test(await A.textContent('.nv-card')), 'A: "Fechar agora" tranca e pede o PIN');
    ok(/Você continua conectado como .*dono.*Só falta destravar/.test(await A.textContent('#nvConectado')) && /Entrar com outra conta/.test(await A.textContent('#nvSairP')), 'A: a tela do cadeado diz "Você continua conectado… Só falta destravar" e tem "Entrar com outra conta"');
    ok((await vale(A)) === null, 'A: trancar apaga a chave guardada');
    await A.reload(); await A.waitForSelector('#nvPin', { timeout: 30000 });
    ok(true, 'A: trancado e recarregado: pede o PIN');
    ok(await A.evaluate(() => document.querySelector('#nvPin').type === 'text' && !document.querySelector('.nv-card input[type=password]')), 'A: o PIN de abrir também não é campo de senha');
    await A.fill('#nvPin', '999111'); await A.click('#nvPinOk');
    await A.waitForFunction(() => /PIN errado/.test((document.querySelector('#nvErro') || {}).textContent || ''), null, { timeout: 20000 });
    ok(true, 'A: PIN errado avisa');
    await A.fill('#nvPin', '482915'); await A.click('#nvPinOk');
    await A.waitForSelector('#nvSelo', { timeout: 30000 });
    const ea = await estado(A);
    ok(ea.gastos.length === 4 && ea.posicoes === 1, 'A: abriu com a cópia do aparelho (4 lançamentos, 1 investimento)');
    await A.evaluate(async () => { const T = MoneyNuvem._teste, v = await T.IDB.get('kv', T.Vale.K()); v.ate = Date.now() - 1000; await T.IDB.set('kv', T.Vale.K(), v); });
    await A.reload(); await A.waitForSelector('#nvPin', { timeout: 30000 });
    ok((await vale(A)) === null, 'A: depois dos 15 min, recarregar pede o PIN (e o vale vencido é apagado)');
    await A.fill('#nvPin', '482915'); await A.click('#nvPinOk'); await A.waitForSelector('#nvSelo', { timeout: 30000 });
    const ls = await A.evaluate(() => { let t = ''; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k !== 'investifyme.dados.v1') t += localStorage.getItem(k); } return t; });
    ok(!/Posto teste|Combustível/.test(ls), 'nada do que veio da nuvem foi parar aberto no localStorage');

    /* ---------- 5. aparelho B ---------- */
    console.log('5) aparelho B (1366x768): mesma conta, outro aparelho');
    const B = await abrirPagina(browser, { width: 1366, height: 768 }, 'B', false);
    await entrarComCodigo(B, 'B');
    await B.waitForSelector('#nvSelo', { timeout: 60000 });
    const eb = await estado(B);
    ok(eb.gastos.length === 4 && eb.posicoes === 1, 'B: recebeu tudo da nuvem (sem oferta de levar, a nuvem já tem dados)');
    await B.screenshot({ path: path.join(SAIDA, 'B-app.png') });
    await B.evaluate(() => { const g = Store.estado.gastos.find((x) => x.id === 'g1'); g.desc = 'Cinema (mudado no B)'; Store.estado.gastos = Store.estado.gastos.filter((x) => x.id !== 'g2'); Store.salvar(); });
    await esperar(1200); await filaVazia(B);
    await A.evaluate(() => MoneyNuvem.buscarAgora()); await esperar(800);
    const ea2 = await estado(A);
    ok(ea2.gastos.find((g) => g.id === 'g1').desc === 'Cinema (mudado no B)', 'A recebe a mudança feita no B');
    ok(!ea2.gastos.some((g) => g.id === 'g2'), 'A recebe o apagado no B');
    ok(db.money_docs.find((r) => r.id === 'g2').apagado_em && db.money_docs.find((r) => r.id === 'g2').dados_cifrado === null, 'apagar = marcar apagado_em e esvaziar o pacote');

    /* ---------- 6. conflito ---------- */
    console.log('6) conflito: mesmo lançamento, campos diferentes');
    await B.evaluate(() => { Store.estado.gastos.find((x) => x.id === 'g3').quem = 'Ana'; Store.salvar(); });
    await esperar(1200); await filaVazia(B);
    await A.evaluate(() => { Store.estado.gastos.find((x) => x.id === 'g3').valor = 9500; Store.salvar(); });
    await esperar(1200); await filaVazia(A);
    const g3 = await abrirDoBanco(db.money_docs.find((r) => r.id === 'g3').dados_cifrado);
    ok(g3.quem === 'Ana' && g3.valor === 9500, 'no banco ficaram as duas mudanças (quem do B, valor do A)');
    ok((await estado(A)).gastos.find((g) => g.id === 'g3').quem === 'Ana', 'A já mostra o que veio do B');
    await B.evaluate(() => MoneyNuvem.buscarAgora()); await esperar(800);
    ok((await estado(B)).gastos.find((g) => g.id === 'g3').valor === 9500, 'B recebe o valor do A');

    ok(chamadas.some((c) => /GET \/rest\/v1\/money_docs\?.*id=eq\.g3&select=dados_cifrado/.test(c)), 'o conflito foi detectado pela trava otimista (versao) e resolvido juntando');

    /* ---------- 6b. trava de segurança: apagar muita coisa pede confirmação ---------- */
    console.log('6b) apagar muita coisa de uma vez');
    await B.evaluate(() => { for (let i = 0; i < 30; i++) Gasto.add({ data: '2026-09-' + String(1 + (i % 28)).padStart(2, '0'), valor: 10 + i, grupo: 'PESSOAL', sub: 'Teste', desc: 'lote ' + i }); Store.salvar(); });
    await esperar(1200); await filaVazia(B);
    const vivosAntes = db.money_docs.filter((r) => r.colecao === 'gastos' && !r.apagado_em).length;
    B.removeAllListeners('dialog'); B.once('dialog', (d) => d.dismiss());
    await B.evaluate(() => { Store.estado.gastos.length = 0; Store.salvar(); });
    await B.waitForSelector('#nvPin', { timeout: 20000 });
    ok(db.money_docs.filter((r) => r.colecao === 'gastos' && !r.apagado_em).length === vivosAntes && vivosAntes >= 33, 'recusou a confirmação: nada foi apagado na nuvem (' + vivosAntes + ' lançamentos)');
    B.on('dialog', (d) => d.accept());
    await B.fill('#nvPin', '482915'); await B.click('#nvPinOk'); await B.waitForSelector('#nvSelo', { timeout: 30000 });
    ok((await estado(B)).gastos.length === vivosAntes, 'B abre de novo com tudo');

    /* ---------- 6c. painel: autorizar e remover o robô ---------- */
    console.log('6c) painel: autorizar e remover o robô');
    db.money_robos.push({ grupo_id: GID, user_id: '44444444-4444-4444-4444-444444444444', nome: 'robô', criado_em: '2026-11-03T12:55:00Z', desligado_em: null });
    await A.click('#nvSelo'); await A.waitForSelector('#nvRoboEmail');
    await A.waitForFunction(() => /e-mail não registrado/.test(document.querySelector('#nvRobo').textContent));
    ok(/03\/Nov\/2026 09:55/.test(await A.textContent('#nvRobo')), 'A: robô antigo aparece como "robô (e-mail não registrado)", com data no horário de Brasília');
    await A.fill('#nvRoboEmail', 'ninguem@teste.com'); await A.click('#nvRoboOk');
    await A.waitForSelector('#nvConfSim');
    ok(/poderá <b>entregar<\/b>|poderá entregar/.test(await A.innerHTML('#nvRobo')) && /não consegue ler nada/.test(await A.textContent('#nvRobo')), 'A: pede confirmação antes de autorizar (entrega, não lê)');
    await A.click('#nvConfSim');
    await A.waitForSelector('.nv-nota.fixa.erro');
    ok(/Não existe conta SolverONE com esse e-mail/.test(await A.textContent('.nv-nota.fixa')) && (await A.inputValue('#nvRoboEmail')) === 'ninguem@teste.com', 'A: e-mail sem conta → mensagem vermelha fixa, e o que foi digitado continua');
    await A.fill('#nvRoboEmail', 'Robo-Financas@solverone.com.br'); await A.click('#nvRoboOk'); await A.waitForSelector('#nvConfSim'); await A.click('#nvConfNao');
    await A.waitForFunction(() => !document.querySelector('#nvConfSim'));
    ok(!(await A.$('#nvConfSim')) && db.money_robos.filter((r) => r.nome === 'robo-financas@solverone.com.br').length === 0, 'A: Cancelar não autoriza');
    await A.click('#nvRoboOk'); await A.waitForSelector('#nvConfSim'); await A.click('#nvConfSim');
    await A.waitForSelector('.nv-nota.fixa.ok');
    const txtOk = await A.textContent('.nv-nota.fixa');
    ok(/robo-financas@solverone\.com\.br autorizado em \d\d\/\w{3}\/2026 \d\d:\d\d/.test(txtOk) && /7h15/.test(txtOk), 'A: sucesso → mensagem fixa com e-mail, data e próximo passo');
    ok((await A.inputValue('#nvRoboEmail')) === '' && /robo-financas@solverone\.com\.br/.test(await A.textContent('#nvRobo')), 'A: campo limpo depois do sucesso; a lista mostra o e-mail');
    ok(await A.evaluate(() => { const a = document.getElementById('nvAviso'), p = document.querySelector('.nv-painel'); return a.classList.contains('on') && +getComputedStyle(a).zIndex > +getComputedStyle(p).zIndex; }), 'A: aviso de sucesso aparece por cima do painel');
    await esperar(2500);
    ok(await A.$('.nv-nota.fixa.ok') !== null, 'A: a mensagem fixa não some sozinha');
    await A.fill('#nvRoboEmail', 'robo-financas@solverone.com.br'); await A.click('#nvRoboOk');
    await A.waitForFunction(() => /já está autorizado desde/.test((document.querySelector('.nv-nota.fixa') || {}).textContent || ''));
    ok(!(await A.$('#nvConfSim')), 'A: e-mail já autorizado → "já está autorizado desde…", sem chamar a função');
    await A.click('#nvMsgX'); await A.waitForFunction(() => !document.querySelector('.nv-nota.fixa')).catch(() => {}); ok(!(await A.$('.nv-nota.fixa')), 'A: ✕ fecha a mensagem');
    const n0 = db.money_robos.filter((r) => !r.desligado_em).length;
    await A.click('[data-remover="33333333-3333-3333-3333-333333333333"]'); await A.waitForSelector('#nvConfSim');
    ok(/O que já chegou continua guardado/.test(await A.textContent('#nvRobo')), 'A: pede confirmação antes de remover o acesso');
    await A.click('#nvConfSim'); await A.waitForSelector('.nv-nota.fixa.ok');
    ok(db.money_robos.filter((r) => !r.desligado_em).length === n0 - 1 && !/robo-financas@solverone\.com\.br<\/b><br>/.test(await A.innerHTML('#nvRobo').then((h) => h.split('Robôs autorizados')[1] || '')), 'A: remover acesso desliga o robô e tira da lista');
    await A.screenshot({ path: path.join(SAIDA, 'A-robo.png') });
    await A.click('#nvFechar');

    /* ---------- 8. cadeado com relógio falso ---------- */
    console.log('8) cadeado (relógio falso)');
    const C = await abrirPagina(browser, { width: 390, height: 800 }, 'C', false);
    await C.clock.install();
    await C.goto(BASE + '/'); await C.waitForSelector('#nvEm');
    await C.fill('#nvEm', 'dono@teste.com'); await C.fill('#nvPw', 'senha-de-teste-1'); await C.click('#nvIn');
    await C.waitForSelector('#nvCod', { timeout: 30000 }); await C.fill('#nvCod', CODIGO); await C.click('#nvCodOk');
    await C.waitForSelector('#nvP1'); await C.fill('#nvP1', '482915'); await C.fill('#nvP2', '482915'); await C.click('#nvPOk');
    await C.waitForSelector('#nvSelo', { timeout: 60000 });
    if (await C.$('#nvDigNao')) await C.click('#nvDigNao');
    await C.evaluate(() => { const d = document.createElement('div'); d.style.height = '2000px'; const i = document.createElement('input'); i.id = 'campoRascunho'; d.prepend(i); document.body.prepend(d); });
    await C.fill('#campoRascunho', 'rascunho que não pode sumir');
    await C.evaluate(() => window.scrollTo(0, 300));
    const rolagem = await C.evaluate(() => window.scrollY);
    await esperar(800); await C.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));   /* a rolagem do teste termina antes de adiantar o relógio */
    await C.evaluate(() => { MoneyNuvem._teste.Trava.ultimo = Date.now(); });
    const trancado = () => C.evaluate(() => !!document.querySelector('#nvPin'));
    await C.clock.fastForward('13:50'); await C.clock.runFor(1500);
    ok(!(await trancado()) && !(await C.$('.nv-avisotr')), 'C: 13 min e 50 s sem uso: não tranca nem avisa');
    await C.clock.fastForward('00:20'); await C.clock.runFor(1500);
    if (!(await C.$('.nv-avisotr'))) console.log('    (depuração) último uso por:', await C.evaluate(() => MoneyNuvem._teste.Trava.porque), 'parado (s):', await C.evaluate(() => (Date.now() - MoneyNuvem._teste.Trava.ultimo) / 1000));
    ok(!(await trancado()) && /vai trancar em/.test(await C.textContent('.nv-avisotr', { timeout: 3000 }).catch(() => '')), 'C: aos 14 min aparece o aviso "vai trancar em … s"');
    await C.evaluate(() => document.querySelector('#nvContinuar').click());   /* sem mexer o mouse (mexer já conta como uso) */
    ok(!(await C.$('.nv-avisotr')), 'C: "Continuar usando" tira o aviso e zera o tempo');
    await C.clock.fastForward('14:10'); await C.clock.runFor(1500);
    ok(!(await trancado()), 'C: depois de "Continuar usando", 14 min ainda não tranca');
    await C.clock.fastForward('01:00'); await C.clock.runFor(2500);
    await C.waitForSelector('#nvPin', { timeout: 10000 });
    ok(/Trancado após 15 min sem uso · \d\d\/\w{3}\/2026 \d\d:\d\d/.test(await C.textContent('#nvMotivo')), 'C: 15 min sem uso tranca, com o motivo e a hora');
    ok(await C.evaluate(() => !MoneyNuvem._teste.Cadeado.aberto()), 'C: a chave da família saiu da memória');
    ok(await C.evaluate(async () => !(await MoneyNuvem._teste.IDB.get('kv', MoneyNuvem._teste.Vale.K()))), 'C: trancar por tempo apaga a chave guardada para recarregar');
    await C.fill('#nvPin', '482915'); await C.click('#nvPinOk');
    await C.waitForFunction(() => !document.querySelector('#nvPortao'), null, { timeout: 30000 });
    ok((await C.inputValue('#campoRascunho')) === 'rascunho que não pode sumir', 'C: ao abrir, o que foi digitado continua lá (sem recarregar)');
    ok(Math.abs((await C.evaluate(() => window.scrollY)) - rolagem) < 5, 'C: e a rolagem também');
    const esconder = (h) => C.evaluate((h) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => h ? 'hidden' : 'visible' }); document.dispatchEvent(new Event('visibilitychange')); }, h);
    await esconder(true); await C.clock.fastForward('09:00'); await esconder(false); await C.clock.runFor(1500);
    ok(!(await trancado()), 'C: 9 min em segundo plano e volta: não tranca');
    await esconder(true); await C.clock.fastForward('10:01'); await C.clock.runFor(2500);
    await esconder(false); await C.waitForSelector('#nvPin', { timeout: 10000 });
    ok(/10 min em segundo plano/.test(await C.textContent('#nvMotivo')), 'C: 10 min em segundo plano tranca, com o motivo');
    await C.fill('#nvPin', '482915'); await C.click('#nvPinOk');
    await C.waitForFunction(() => !document.querySelector('#nvPortao'), null, { timeout: 30000 });
    await C.evaluate(() => Fundo.comecar({ id: 'imp-teste', titulo: 'Importação de teste' }));
    await C.clock.fastForward('16:00'); await C.clock.runFor(2500);
    ok(!(await trancado()), 'C: importação longa rodando (Fundo): 16 min sem uso e não tranca no meio');
    await C.evaluate(() => Fundo.limpar('imp-teste')); await C.clock.runFor(2500);
    ok(!(await trancado()), 'C: terminou a importação: não tranca na hora, conta o tempo de novo');
    await C.clock.fastForward('15:01'); await C.clock.runFor(2500); await C.clock.runFor(2500);
    const tr = await C.waitForSelector('#nvPin', { timeout: 10000 }).then(() => true).catch(() => false);
    if (!tr) console.log('    (depuração) último uso por:', await C.evaluate(() => MoneyNuvem._teste.Trava.porque), 'parado (s):', await C.evaluate(() => (Date.now() - MoneyNuvem._teste.Trava.ultimo) / 1000), 'adiado:', await C.evaluate(() => MoneyNuvem._teste.Trava.adiado), 'ocupado:', await C.evaluate(() => MoneyNuvem._teste.Trava.ocupado()));
    ok(tr, 'C: 15 min depois de terminar, tranca');
    ok(C.erros.length === 0, 'C: nenhum erro de página (' + C.erros.length + ')');
    await C.context().close();

    /* ---------- 7. telas sem erro ---------- */
    console.log('7) telas');
    for (const [pg, nm] of [[A, 'A'], [B, 'B']]) {
      for (const v of ['b-lanc', 'b-painel', 'carteira', 'config']) { await pg.evaluate((x) => { try { irPara(x); } catch (e) { throw e; } }, v); await esperar(150); }
      await pg.click('#nvSelo'); await pg.waitForSelector('.nv-painel .nv-card'); await pg.screenshot({ path: path.join(SAIDA, nm + '-painel.png') });
      ok(/Caixa do robô/.test(await pg.textContent('.nv-painel')), nm + ': painel da nuvem abre (conta, família, caixa do robô, cadeado)');
      await pg.click('#nvFechar');
      ok(pg.erros.length === 0, nm + ': nenhum erro de página (' + pg.erros.length + ')');
    }
    const sem = chamadas.filter((c) => /\/rest\/v1\/(?!rpc|money_|omni_chave_privada|user_settings)/.test(c));
    ok(sem.length === 0, 'só chama as tabelas previstas (' + sem.slice(0, 3).join(', ') + ')');
  } catch (e) {
    falhas++; console.error('ERRO NO TESTE:', e);
  } finally {
    await browser.close(); srv.close();
  }
  console.log('\n' + (falhas ? '✗ ' + falhas + ' falha(s), ' : '✓ ') + oks + ' verificações ok. Fotos em ' + SAIDA);
  process.exit(falhas ? 1 : 0);
})();
