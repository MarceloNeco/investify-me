/* =====================================================================
   nuvem.js — MoneyTRIO na nuvem (usada pelo index.html desde a 3.30)       1.12.0 · 11/Nov/2026
   ---------------------------------------------------------------------
   O que faz, na ordem (igual ao OmniLifeONE — ARQUITETURA.md dele, "Conta", "Cofre", "CloudDriver"):
   1. Conta SolverONE (a mesma de todos os apps): e-mail e senha ou Google, por REST, sem biblioteca.
      A sessão fica na chave COMUM da plataforma (solverone.sessao.v1).
   2. Família: chefe ou responsável escolhe a família (sol_meus_grupos). Só eles veem as finanças (RLS do money_docs).
   3. Cadeado: na primeira vez, o código de recuperação (o mesmo do OmniLifeONE) abre a chave privada da pessoa
      (omni_chave_privada, PBKDF2 600 mil) e ela abre a chave da família (CF, sol_minha_chave_grupo, RSA-OAEP 3072).
      Depois, o PIN (PBKDF2 600 mil) e a digital (WebAuthn PRF) abrem a chave do aparelho (CA), que guarda as
      outras fechadas no IndexedDB. Chaves abertas só na memória; 10 erros de PIN bloqueiam.
   4. Dados: cada lançamento, conta, posição… vira uma linha de money_docs, fechada com a CF (AES-GCM 256, iv por
      linha). Cópia local fechada no IndexedDB, fila de envio, trava otimista por versao, busca a cada 20 s.
   5. Caixa do robô (money_entrada): pacotes fechados para a chave pública da caixa; o app abre, transforma em
      lançamento do BudgetONE, grava fechado e marca como aproveitado.
   7. 1.8.0 — Ponte entre apps (contrato C5, sol_ponte): a cada 3 buscas lê a caixa do MoneyTRIO
      (sol_ponte_minha_caixa), abre o pacote "cif" de cada mensagem com a CF (o mesmo formato do cofre) e entrega
      aos módulos pelo evento 'ponte.recebida' [{id, de_app, tipo, criado_em, conteudo|null}]. Quem usou chama
      MoneyNuvem.ponte.marcarLido(id). Um app nunca lê a tabela do outro (C3): só a ponte.
   8. 1.8.1 — o cursor automático (1º campo, 60 ms depois de abrir a tela) não sai do campo onde a pessoa já está.
   9. 1.9.0 — SEM código de recuperação (Aparelhos, formato v2; supabase/2026-11-07-sol-aparelhos.sql): a primeira vez num
      aparelho é aprovada pelo outro aparelho aberto da mesma conta (6 números com compromisso), por chefe/responsável da
      família (só a chave da família) ou pela digital sincronizada (passkey, WebAuthn PRF). ⚙ Nuvem → Aparelhos: a lista,
      "Tirar" (o aparelho tirado apaga o cadeado na próxima abertura) e "Ver pedidos de acesso". O código antigo fica num
      link discreto, só para quem tem a cópia no servidor. Sem o SQL aplicado, tudo isso fica quieto e o resto funciona.
  10. 1.10.0 — PIN DA CONTA (Pin; supabase/2026-11-11-sol-pin-conta.sql): um PIN só, igual em todos os aparelhos. O banco
      confere v = PBKDF2(PIN, sal da conta) (guarda só SHA-256(v)), conta as tentativas (espera do 5º erro; 24 h por erro do
      10º em diante) e entrega o segredo do aparelho. L.pin (PBKDF2 do PIN) abre sem internet; L.srv (segredo + chave não
      extraível do navegador) abre com internet e acompanha a troca de PIN feita em outro aparelho. Migração dos PINs antigos.
  11. 1.10.1 — as telas da nuvem (.nv-portao, .nv-painel) com overscroll-behavior:contain: o fim da rolagem não passa para a
      página de trás (a trava do fundo é o html:has(#nvPortao / .nv-painel) do estilo.css 3.63).
  12. 1.11.0 (3.64) — CAIXA DO ROBÔ: "IRPF…" marca o IR (antes só "sim"; o texto fica em irTexto); só os tipos conhecidos viram
      lançamento ('saldo' vai para modulos/saldo-banco.js; tipo desconhecido é ignorado e anotado); estorno = valor negativo na
      categoria do gasto de origem (120 dias; os antigos "Renda · Estorno" migram uma vez); confianca 'palpite'/'desconhecido'
      marca para conferir só o lançamento NOVO; para_quem; o apelido do extrato → a pessoa do cadastro (modulos/pessoas.js); gasto
      que o robô reclassifica como transferência/fatura sai do livro (editado: sugestão em Revisar).
      PLANILHA ESPELHO (Espelho; supabase/2026-11-11b-moneytrio-espelho.sql): fila no IndexedDB fechada com a CF, pacote
      ECDH P-256 + HKDF + AES-GCM para a chave do robô, lotes de 200; sem permissão ou sem a chave do robô, a fila espera.
      Nuvem.membros(): os membros da família (sol_grupo_membros) para o cadastro de pessoas.
  13. 1.12.0 (3.65) — cartão pela conta do cartão e pelos finais (Cartoes.doRobo; antes procurava c.final, mas o app guarda
      c.fim); finalCartao, contaCartao e contraparte {cnpj, idp, nome, meio, mcc} guardados (o idp nunca aparece) e
      reconhecidos (Contraparte.aplicar); barra de andamento global: "Caixa do robô: x de N", sincronizar, espelho.
   6. Tranca sozinho: 15 min sem uso (avisa 1 min antes) ou 10 min fora do app; nunca no meio de um trabalho; sem recarregar.
   Nunca grava nada de finanças em claro: o localStorage 'investifyme.dados.v1' (do app principal) só é LIDO, para
   oferecer "levar para a nuvem". Só a URL e a publishable key do Supabase ficam aqui (públicas por desenho).
   ===================================================================== */
(function () {
  'use strict';

  var SB = 'https://qvdvkqydhnadhewcidia.supabase.co';
  var KEY = 'sb_publishable_oRJmeUwlBbOP_HoOXf0xLw_4O8v43EA';
  var APP = 'moneytrio';
  var VERSAO = '1.12.0';
  var ITER = 600000;
  var K_SESSAO = 'solverone.sessao.v1', K_CONTADOR = 'ch_solverone_sessao';
  var K_FAM = 'moneytrio.nuvem.familia', K_PEDIDO = 'moneytrio.contaPedido', K_TRANCOU = 'moneytrio.nuvem.trancou';
  var K_LOCAL = 'investifyme.dados.v1';
  var K_SO_AQUI = 'moneytrio.soNesteAparelho';   /* escolheu usar sem conta: o app de sempre, só neste aparelho */
  var RX_ID = /^[A-Za-z0-9_.:@-]{1,80}$/;
  var PRF_INFO = 'moneytrio-cadeado-prf';
  var ESPERAS = [0, 0, 0, 0, 30, 60, 300, 900, 1800, 3600];   /* segundos depois do n-ésimo erro de PIN; no 10º bloqueia */
  var BUSCA_MS = 20000, OCIOSO_MS = 15 * 60000, FORA_MS = 10 * 60000, AVISO_MS = 60000;

  /* ---------------- pequenas ajudas ---------------- */
  function lang() { try { return localStorage.getItem('investifyme.idioma.v1') === 'en' ? 'en' : 'pt'; } catch (e) { return 'pt'; } }
  function tt(pt, en) { return lang() === 'en' ? en : pt; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {} }
  function b64(buf) { var b = new Uint8Array(buf), s = ''; for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(t) { var s = atob(String(t)), b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
  function utf8(s) { return new TextEncoder().encode(s); }
  function deUtf8(b) { return new TextDecoder().decode(b); }
  function dorme(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function apN() { return /Mobi|Android|iPhone/i.test(navigator.userAgent) ? tt('celular', 'phone') : tt('computador', 'computer'); }
  /* hash curto e estável (cyrb53, duas sementes) para ids que não cabem na regra do banco */
  function hash(str) {
    function c53(s, seed) {
      var h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
      for (var i = 0, ch; i < s.length; i++) { ch = s.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
    }
    return c53(str, 1) + c53(str, 7);
  }
  /* data e hora no horário de Brasília: 03/Nov/2026 09:35 (PT) · Nov/03/2026 09:35 (EN) */
  function dataHora(iso, semHora) {
    var d = new Date(iso); if (isNaN(d)) return '';
    var p = {}; new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: 'numeric', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
    var M = lang() === 'en' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    var mes = M[+p.month - 1], dia = lang() === 'en' ? mes + '/' + p.day + '/' + p.year : p.day + '/' + mes + '/' + p.year;
    return semHora ? dia : dia + ' ' + (p.hour === '24' ? '00' : p.hour) + ':' + p.minute;
  }
  /* aviso de sucesso sempre por cima do painel e de qualquer janela, por ~6 s */
  function avisoAlto(msg) {
    var el = document.getElementById('nvAviso'); if (!el) { el = document.createElement('div'); el.id = 'nvAviso'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.className = 'nv-aviso on alto';
    clearTimeout(aviso._t); aviso._t = setTimeout(function () { el.className = 'nv-aviso'; }, 6000);
  }
  function aviso(msg, tipo) {
    if (Nuvem.iniciado && typeof toast === 'function') { try { return toast(msg, tipo); } catch (e) {} }
    var el = document.getElementById('nvAviso'); if (!el) return;
    el.textContent = msg; el.className = 'nv-aviso on ' + (tipo || '');
    clearTimeout(aviso._t); aviso._t = setTimeout(function () { el.className = 'nv-aviso'; }, Math.min(9000, 4000 + msg.length * 25));
  }

  /* ---------------- IndexedDB: kv (cadeado, cursor, famílias), docs (cópia fechada), fila (o que falta subir) ---------------- */
  var IDB = {
    abrir: function () {
      if (this._p) return this._p;
      this._p = new Promise(function (res, rej) {
        var r = indexedDB.open('moneytrio-nuvem', 1);
        r.onupgradeneeded = function () { var d = r.result; ['kv', 'docs', 'fila'].forEach(function (s) { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s); }); };
        r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
      });
      return this._p;
    },
    get: function (s, k) {
      return this.abrir().then(function (d) { return new Promise(function (res, rej) { var r = d.transaction(s).objectStore(s).get(k); r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); });
    },
    /* pares [[chave, valor]]; valor undefined = apagar */
    muitos: function (s, pares) {
      if (!pares.length) return Promise.resolve();
      return this.abrir().then(function (d) { return new Promise(function (res, rej) {
        var t = d.transaction(s, 'readwrite'), o = t.objectStore(s);
        pares.forEach(function (p) { if (p[1] === undefined) o.delete(p[0]); else o.put(p[1], p[0]); });
        t.oncomplete = function () { res(); }; t.onerror = function () { rej(t.error); }; t.onabort = function () { rej(t.error); };
      }); });
    },
    set: function (s, k, v) { return this.muitos(s, [[k, v]]); },
    del: function (s, k) { return this.muitos(s, [[k, undefined]]); },
    prefixo: function (s, p) {
      return this.abrir().then(function (d) { return new Promise(function (res, rej) {
        var out = [], r = d.transaction(s).objectStore(s).openCursor(IDBKeyRange.bound(p, p + '￿'));
        r.onsuccess = function () { var c = r.result; if (c) { out.push([c.key, c.value]); c.continue(); } else res(out); };
        r.onerror = function () { rej(r.error); };
      }); });
    },
    apagarPrefixo: function (s, p) {
      return this.abrir().then(function (d) { return new Promise(function (res, rej) {
        var t = d.transaction(s, 'readwrite'); t.objectStore(s).delete(IDBKeyRange.bound(p, p + '￿'));
        t.oncomplete = function () { res(); }; t.onerror = function () { rej(t.error); };
      }); });
    }
  };

  /* ---------------- cifra (WebCrypto) ---------------- */
  var Cifra = {
    rnd: function (n) { return crypto.getRandomValues(new Uint8Array(n)); },
    id: function () { return b64(this.rnd(9)).replace(/[+/=]/g, ''); },
    kdf: async function (segredo, sal, iter) {
      var base = await crypto.subtle.importKey('raw', utf8(String(segredo)), 'PBKDF2', false, ['deriveKey']);
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unb64(sal), iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    },
    aes: function (raw) { return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']); },
    cifrar: async function (key, bytes) { var iv = this.rnd(12); return { iv: b64(iv), ct: b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, bytes)) }; },
    decifrar: async function (key, o) { return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.iv) }, key, unb64(o.ct))); },
    hkdf: async function (bytes, info) {
      var k = await crypto.subtle.importKey('raw', bytes, 'HKDF', false, ['deriveKey']);
      return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: utf8(info) }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    },
    /* o mesmo jeito de escrever o código de recuperação do OmniLifeONE (Restore.normCode) */
    normCode: function (s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{5})(?=.)/g, '$1-'); },
    importarSk: function (pkcs8) { return crypto.subtle.importKey('pkcs8', pkcs8, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']); },
    /* a CF embrulhada para a pessoa (formato do OmniLifeONE: "1." + RSA-OAEP({v,kv,fk,k})) */
    desembrulhar: async function (sk, txt) {
      var o = JSON.parse(deUtf8(new Uint8Array(await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, sk, unb64(String(txt).replace(/^1\./, ''))))));
      return { kv: o.kv, fk: o.fk, raw: unb64(o.k) };
    },
    /* par de chaves da CAIXA do robô: RSA-OAEP 3072, SHA-256 */
    novoParCaixa: async function () {
      var p = await crypto.subtle.generateKey({ name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['encrypt', 'decrypt']);
      var j = await crypto.subtle.exportKey('jwk', p.publicKey);
      return { pub: { kty: 'RSA', n: j.n, e: j.e, alg: 'RSA-OAEP-256', kid: 'cx' + this.id() }, pkcs8: new Uint8Array(await crypto.subtle.exportKey('pkcs8', p.privateKey)) };
    },
    /* abre um pacote do robô: {"v":1,"k":RSA-OAEP(chave AES),"iv":12 bytes,"ct":AES-GCM(texto)+tag} → objeto */
    abrirPacote: async function (sk, texto) {
      var o = typeof texto === 'string' ? JSON.parse(texto) : texto;
      if (!o || o.v !== 1 || typeof o.k !== 'string' || typeof o.iv !== 'string' || typeof o.ct !== 'string') throw new Error('formato');
      var raw = new Uint8Array(await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, sk, unb64(o.k)));
      if (raw.length !== 32) throw new Error('chave AES');
      var iv = unb64(o.iv); if (iv.length !== 12) throw new Error('iv');
      var k = await this.aes(raw); raw.fill(0);
      return JSON.parse(deUtf8(new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, k, unb64(o.ct)))));
    },
    /* o mesmo pacote, feito no navegador (para o teste de ida e volta com o Python) */
    selarPacote: async function (pubJwk, obj) {
      var pk = await crypto.subtle.importKey('jwk', { kty: 'RSA', n: pubJwk.n, e: pubJwk.e, alg: 'RSA-OAEP-256', ext: true }, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
      var raw = this.rnd(32), iv = this.rnd(12), k = await this.aes(raw);
      var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, utf8(JSON.stringify(obj)));
      var out = JSON.stringify({ v: 1, k: b64(await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, pk, raw)), iv: b64(iv), ct: b64(ct) });
      raw.fill(0); return out;
    }
  };

  /* ---------------- Conta SolverONE (REST, sem biblioteca) — copiado do OmniLifeONE ---------------- */
  var Conta = {
    ler: function () {
      var s = lsGet(K_SESSAO, null); if (s && s.refresh_token) return s;
      var c = lsGet(K_CONTADOR, null); if (c && c.refresh_token && c.access_token) { lsSet(K_SESSAO, c); return c; }
      return null;
    },
    on: function () { return !!this.ler(); },
    email: function () { var s = this.ler(); return (s && s.email) || ''; },
    gravar: function (nova, antiga) {
      if (nova) lsSet(K_SESSAO, nova); else lsDel(K_SESSAO);
      var c = lsGet(K_CONTADOR, null);
      if (c && antiga && c.refresh_token === antiga.refresh_token) { if (nova) lsSet(K_CONTADOR, nova); else lsDel(K_CONTADOR); }
    },
    dados: function (t) { try { var b = atob(String(t).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')); return JSON.parse(deUtf8(Uint8Array.from(b, function (c) { return c.charCodeAt(0); }))); } catch (e) { return {}; } },
    guardar: function (j) {
      var antiga = this.ler(), d = this.dados(j.access_token);
      var meta = (j.user && j.user.user_metadata) || d.user_metadata || {};
      var email = (j.user && j.user.email) || d.email || '';
      var nova = { access_token: j.access_token, refresh_token: j.refresh_token, expira: Date.now() + (Number(j.expires_in) || 3600) * 1000, em: Date.now(), email: email,
        nome: meta.full_name || meta.name || (antiga && antiga.email === email && antiga.nome) || '',
        desde: (antiga && antiga.email === email && antiga.desde) || Date.now() };
      this.gravar(nova, antiga); return nova;
    },
    auth: async function (caminho, corpo, metodo, token) {
      var cab = { apikey: KEY, 'Content-Type': 'application/json' };
      if (token) cab.Authorization = 'Bearer ' + token;
      var r = await fetch(SB + '/auth/v1/' + caminho, { method: metodo || 'POST', headers: cab, body: corpo ? JSON.stringify(corpo) : undefined });
      var j = null; try { j = await r.json(); } catch (e) {}
      if (!r.ok) { var e = new Error((j && (j.msg || j.error_description || j.message || j.error)) || 'HTTP ' + r.status); e.status = r.status; e.codigo = j && (j.error_code || j.error); throw e; }
      return j;
    },
    token: async function (forcar) {
      var s = this.ler(), self = this; if (!s) return null;
      if (!forcar && Date.now() < s.expira - 60000) return s.access_token;
      if (!this._renova) this._renova = this.auth('token?grant_type=refresh_token', { refresh_token: s.refresh_token })
        .then(function (j) { return self.guardar(j).access_token; })
        .catch(async function (e) {
          if ([400, 401, 403].indexOf(e.status) >= 0) {
            if (/banned/i.test((e.codigo || '') + ' ' + (e.message || ''))) { try { await Nuvem.apagarDoAparelho(self.dados(s.access_token).sub); } catch (er) {} }
            self.gravar(null, s);
          }
          return null;
        })
        .finally(function () { self._renova = null; });
      return this._renova;
    },
    uid: function () { var s = this.ler(); return (s && this.dados(s.access_token).sub) || ''; },
    /* PostgREST. Erro sem "status" = sem internet ou sem sessão */
    rest: async function (metodo, caminho, corpo, prefer, extras) {
      var t = await this.token(); if (!t) throw new Error(tt('Entre na sua conta SolverONE.', 'Sign in to your SolverONE account.'));
      var cab = Object.assign({ apikey: KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, extras || {});
      if (prefer) cab.Prefer = prefer;
      var r = await fetch(SB + '/rest/v1/' + caminho, { method: metodo, headers: cab, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
      var txt = await r.text(), j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) {}
      if (!r.ok) { var e = new Error((j && (j.message || j.msg)) || 'HTTP ' + r.status); e.status = r.status; e.code = j && j.code; throw e; }
      return j;
    },
    rpc: function (nome, args) { return this.rest('POST', 'rpc/' + nome, args || {}); },
    /* registro de acesso (C9), sem esperar a resposta; uma vez por aba e por conta */
    registrarAcesso: async function (evento) {
      try {
        var u = this.uid(); if (!u) return;
        if (evento !== 'login' && ssGet('moneytrio.contaAcesso') === u) return;
        ssSet('moneytrio.contaAcesso', u);
        var t = await this.token(); if (!t) return;
        fetch(SB + '/functions/v1/solverone-admin', { method: 'POST', keepalive: true, headers: { apikey: KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'registrar-acesso', evento: evento, app: APP }) }).catch(function () {});
        this.rpc('sol_registrar_uso', { p_app: APP }).catch(function () {});
      } catch (e) {}
    },
    explicar: function (e) {
      var m = String(e && (e.codigo || '') + ' ' + (e.message || ''));
      if (/invalid_credentials|invalid login/i.test(m)) return tt('E-mail ou senha incorretos.', 'Wrong e-mail or password.');
      if (/email_not_confirmed|not confirmed/i.test(m)) return tt('Confirme o e-mail primeiro (veja a caixa de entrada).', 'Confirm your e-mail first (check your inbox).');
      if (/already registered|user_already_exists/i.test(m)) return tt('Este e-mail já tem conta. É só entrar.', 'This e-mail already has an account. Just sign in.');
      if (/weak_password|password should/i.test(m)) return tt('Senha fraca: use pelo menos 8 caracteres.', 'Weak password: use at least 8 characters.');
      if (/rate limit|over_email_send_rate/i.test(m)) return tt('Muitas tentativas. Espere alguns minutos.', 'Too many attempts. Wait a few minutes.');
      if (/failed to fetch|networkerror|load failed/i.test(m)) return tt('Sem internet agora.', 'No internet right now.');
      return tt('Não deu certo: ', 'That did not work: ') + ((e && e.message) || '');
    },
    volta: function () { return location.origin + location.pathname; },
    marcarPedido: function () { lsSet(K_PEDIDO, Date.now()); },
    google: function () { this.marcarPedido(); location.href = SB + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(this.volta()); },
    /* volta do Google, da confirmação de e-mail ou do "esqueci a senha": a sessão chega no endereço */
    lerRetorno: function () {
      var h = location.hash || '';
      if (!/access_token=|error_description=/.test(h)) return null;
      var p = new URLSearchParams(h.slice(1));
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      if (p.get('error_description')) { this._erroRetorno = p.get('error_description'); return null; }
      var tok = { access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: p.get('expires_in') }, tipo = p.get('type') || 'login';
      var pedido = lsGet(K_PEDIDO, 0); lsDel(K_PEDIDO);
      if (pedido && Date.now() - pedido < 2 * 864e5) { this.guardar(tok); return tipo; }
      /* link que este aparelho não pediu: pergunta antes de conectar */
      this._pendente = { tok: tok, tipo: tipo };
      return 'confirmar';
    },
    sair: async function () {
      var s = this.ler(); if (!s) return;
      var t = await this.token();
      if (t) this.auth('logout?scope=local', null, 'POST', t).catch(function () {});
      this.gravar(null, s); ssSet('moneytrio.contaAcesso', null);
    }
  };

  /* ---------------- Vale (3.35): recarregar dentro dos 15 min não pede o PIN de novo ----------------
     Ao abrir o cadeado, a chave da família (CryptoKey NÃO extraível) fica no IndexedDB deste aparelho com um "vale até"
     (agora + 15 min, renovado pelo uso; no máximo 10 min depois de sair do app). Ao carregar a página, se o vale ainda vale,
     usa sem pedir PIN/digital. Some ao trancar (tempo, 10 min fora, manual), ao sair da conta e ao entrar com outra conta.
     Nunca em formato exportável, nunca em localStorage/sessionStorage. */
  var Vale = {
    K: function (uid) { return 'vale|' + (uid || Conta.uid()); },
    guardar: async function () {
      if (!Cadeado.cf || Cadeado.cf.extractable) return;
      this._o = { cf: Cadeado.cf, kv: Cadeado.kv, fk: Cadeado.fk, gid: Cadeado.gid, ate: Date.now() + OCIOSO_MS };
      this._gravou = Date.now();
      try { await IDB.set('kv', this.K(), this._o); } catch (e) {}
    },
    renovar: function () {
      if (!this._o || !Cadeado.aberto()) return;
      this._o.ate = Date.now() + OCIOSO_MS;
      if (Date.now() - (this._gravou || 0) < 20000) return;   /* no máximo uma gravação a cada 20 s */
      this._gravou = Date.now(); IDB.set('kv', this.K(), this._o).catch(function () {});
    },
    limitar: function (ate) {
      if (!this._o || !Cadeado.aberto()) return;
      this._o.ate = Math.min(this._o.ate, ate); this._gravou = Date.now();
      IDB.set('kv', this.K(), this._o).catch(function () {});
    },
    usar: async function (gid) {
      var v = null; try { v = await IDB.get('kv', this.K()); } catch (e) {}
      if (!v) return false;
      var bom = v.gid === gid && v.ate > Date.now() && v.cf && typeof CryptoKey !== 'undefined' && v.cf instanceof CryptoKey && !v.cf.extractable;
      if (!bom) { await this.apagar(); return false; }
      Cadeado.usarChave(v.cf, v.kv, v.fk, gid);
      this._o = v; this.renovar();
      return true;
    },
    apagar: function (uid) { this._o = null; return IDB.del('kv', this.K(uid)).catch(function () {}); },
    apagarOutros: async function (uid) {
      try { var l = await IDB.prefixo('kv', 'vale|'); for (var i = 0; i < l.length; i++) if (l[i][0] !== this.K(uid)) await IDB.del('kv', l[i][0]); } catch (e) {}
    }
  };

  /* ---------------- Cadeado: PIN, digital, código de recuperação ---------------- */
  var Cadeado = {
    cf: null, cfRaw: null, kv: 0, fk: '', gid: null, dukRaw: null,
    K: function (uid) { return 'cadeado|' + (uid || Conta.uid()); },
    local: function (uid) { return IDB.get('kv', this.K(uid)).catch(function () { return null; }); },
    gravar: function (L, uid) { return IDB.set('kv', this.K(uid), L); },
    aberto: function () { return !!this.cf; },
    porPin: async function (pin, gid) {
      var r = await this.duk(pin); if (r.erro) return r;
      return this.comChaveDoAparelho(r.L, r.raw, gid);
    },
    /* 1.9.0: só confere o PIN (ou a digital) e devolve a chave do aparelho, sem abrir nada — para aprovar outro aparelho */
    duk: async function (pin) {
      var L = await this.local(); if (!L) return { erro: 'novo' };
      if (L.bloqueado) return { erro: 'bloqueado' };
      if (pin === null) {   /* pela digital */
        if (!L.prf) return { erro: 'semdigital' };
        var out = await this.prfAvaliar(L.prf.cred, L.prf.sal); if (!out) return { erro: 'digital' };
        try { return { L: L, raw: await Cifra.decifrar(await Cifra.hkdf(out, PRF_INFO), L.prf) }; } catch (e) { return { erro: 'digital' }; } finally { out.fill(0); }
      }
      if (L.ate && Date.now() < L.ate) return { erro: 'espera', ate: L.ate };
      var raw;
      try { raw = await Cifra.decifrar(await Cifra.kdf(pin, L.pin.sal, L.pin.iter), L.pin); }
      catch (e) {
        L.erros = (L.erros || 0) + 1;
        var w = ESPERAS[L.erros] || 0;
        if (L.erros >= 10) { L.bloqueado = true; L.ate = 0; } else L.ate = w ? Date.now() + w * 1000 : 0;
        await this.gravar(L);
        return { erro: L.bloqueado ? 'bloqueado' : 'pin', erros: L.erros, ate: L.ate };
      }
      if (L.erros || L.ate) { L.erros = 0; L.ate = 0; await this.gravar(L); }
      return { L: L, raw: raw };
    },
    /* 1.9.0: monta o cadeado deste aparelho com o que chegou (do outro aparelho, da família ou da passkey) e o PIN novo.
       pkcs8: a chave privada da pessoa (null quando a família aprovou: aí vem só a chave da família em fam = {gid, raw, kv, fk}) */
    montar: async function (pkcs8, fam, pin, gid, como, ap) {
      var uid = Conta.uid(), r = fam;
      if (pkcs8) { r = null; try { r = await this.buscarMinha(await Cifra.importarSk(pkcs8), gid); } catch (e) {} }
      if (!r || !r.raw) { if (pkcs8) pkcs8.fill(0); return { erro: 'semliberar' }; }
      var dukRaw = Cifra.rnd(32), duk = await Cifra.aes(dukRaw), sal = b64(Cifra.rnd(16));
      var L = { v: 1, uid: uid, pin: Object.assign({ sal: sal, iter: ITER }, await Cifra.cifrar(await Cifra.kdf(pin, sal, ITER), dukRaw)), prf: null,
        sk: pkcs8 ? await Cifra.cifrar(duk, pkcs8) : null, fam: {}, erros: 0, ate: 0, bloqueado: false,
        como: como, ap: ap || null, avisosAte: new Date().toISOString() };
      if (pkcs8) pkcs8.fill(0);
      L.fam[gid] = Object.assign({ kv: r.kv, fk: r.fk }, await Cifra.cifrar(duk, r.raw));
      await this.gravar(L); this.dukRaw = dukRaw;
      await this.usar(r.raw, r.kv, r.fk, gid);
      return { ok: true };
    },
    porDigital: async function (gid) {
      var L = await this.local(); if (!L || !L.prf) return { erro: 'semdigital' };
      if (L.bloqueado) return { erro: 'bloqueado' };
      var out = await this.prfAvaliar(L.prf.cred, L.prf.sal); if (!out) return { erro: 'digital' };
      var raw; try { raw = await Cifra.decifrar(await Cifra.hkdf(out, PRF_INFO), L.prf); } catch (e) { return { erro: 'digital' }; } finally { out.fill(0); }
      if (L.erros || L.ate) { L.erros = 0; L.ate = 0; await this.gravar(L); }
      return this.comChaveDoAparelho(L, raw, gid);
    },
    comChaveDoAparelho: async function (L, raw, gid) {
      var duk = await Cifra.aes(raw), f = (L.fam || {})[gid];
      if (f) { this.dukRaw = raw; await this.usar(await Cifra.decifrar(duk, f), f.kv, f.fk, gid); return { ok: true }; }
      /* a chave desta família ainda não está neste aparelho: vem do banco, embrulhada para mim (precisa de internet) */
      if (!L.sk) return { erro: 'semliberar' };
      if (!navigator.onLine) return { erro: 'offline' };
      var r = null; try { r = await this.buscarMinha(await Cifra.importarSk(await Cifra.decifrar(duk, L.sk)), gid); } catch (e) {}
      if (!r) return { erro: 'semliberar' };
      L.fam = Object.assign({}, L.fam); L.fam[gid] = Object.assign({ kv: r.kv, fk: r.fk }, await Cifra.cifrar(duk, r.raw));
      await this.gravar(L); this.dukRaw = raw;
      await this.usar(r.raw, r.kv, r.fk, gid); return { ok: true };
    },
    buscarMinha: async function (sk, gid) {
      var rows = await Conta.rpc('sol_minha_chave_grupo', { p_grupo: gid });
      for (var i = 0; i < (rows || []).length; i++) { try { return await Cifra.desembrulhar(sk, rows[i].chave_embrulhada); } catch (e) {} }
      return null;
    },
    /* primeira vez neste aparelho (ou esqueci o PIN): o código de recuperação do OmniLifeONE abre a chave privada */
    pelaPrimeiraVez: async function (codigo, pin, gid) {
      var uid = Conta.uid();
      var bk = await Conta.rest('GET', 'omni_chave_privada?user_id=eq.' + uid + '&select=privada_cifrado,sal,iteracoes');
      bk = bk && bk[0]; if (!bk) return { erro: 'semchave' };
      var pkcs8;
      try { pkcs8 = await Cifra.decifrar(await Cifra.kdf(Cifra.normCode(codigo), bk.sal, bk.iteracoes), JSON.parse(bk.privada_cifrado)); }
      catch (e) { return { erro: 'codigo' }; }
      var r = null; try { r = await this.buscarMinha(await Cifra.importarSk(pkcs8), gid); } catch (e) {}
      if (!r) { pkcs8.fill(0); return { erro: 'semliberar' }; }
      var dukRaw = Cifra.rnd(32), duk = await Cifra.aes(dukRaw), sal = b64(Cifra.rnd(16));
      var antigo = await this.local();
      var L = { v: 1, uid: uid, pin: Object.assign({ sal: sal, iter: ITER }, await Cifra.cifrar(await Cifra.kdf(pin, sal, ITER), dukRaw)), prf: null,
        sk: await Cifra.cifrar(duk, pkcs8), fam: {}, erros: 0, ate: 0, bloqueado: false };
      pkcs8.fill(0);
      L.fam[gid] = Object.assign({ kv: r.kv, fk: r.fk }, await Cifra.cifrar(duk, r.raw));
      await this.gravar(L); this.dukRaw = dukRaw;
      await this.usar(r.raw, r.kv, r.fk, gid);
      return { ok: true, tinhaDigital: !!(antigo && antigo.prf) };
    },
    usar: async function (raw, kv, fk, gid) {
      this.cfRaw = new Uint8Array(raw); this.kv = kv; this.fk = fk; this.gid = gid;
      this.cf = await Cifra.aes(this.cfRaw);   /* não extraível: o navegador nunca devolve os bytes desta chave */
      await Vale.guardar();
    },
    /* 3.35: abrir com a chave guardada pelo Vale (recarregou dentro dos 15 min) — sem os bytes, só a chave do navegador */
    usarChave: function (cf, kv, fk, gid) { this.cf = cf; this.cfRaw = null; this.dukRaw = null; this.kv = kv; this.fk = fk; this.gid = gid; },
    trancar: function () {
      if (this.cfRaw) this.cfRaw.fill(0); if (this.dukRaw) this.dukRaw.fill(0);
      this.cf = null; this.cfRaw = null; this.dukRaw = null; this.kv = 0; this.fk = ''; this.gid = null;
      return Vale.apagar();
    },
    /* um registro (texto JSON) ↔ pacote fechado com a CF, no mesmo formato do cofre do OmniLifeONE */
    selar: async function (txt) {
      if (!this.cf) throw new Error('fechado');
      return JSON.stringify(Object.assign({ c: 1, kv: this.kv, fk: this.fk }, await Cifra.cifrar(this.cf, utf8(txt))));
    },
    abrir: async function (cif) {
      var o; try { o = JSON.parse(cif); } catch (e) { return null; }
      if (!this.cf || !o || (o.fk && o.fk !== this.fk)) return null;
      try { return JSON.parse(deUtf8(await Cifra.decifrar(this.cf, o))); } catch (e) { return null; }
    },
    /* digital/rosto: WebAuthn com PRF — a digital libera um segredo que abre a chave do aparelho */
    temDigital: async function () {
      try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { return false; }
    },
    prfAvaliar: async function (cred, sal) {
      try {
        var r = await navigator.credentials.get({ publicKey: { challenge: Cifra.rnd(32), allowCredentials: [{ type: 'public-key', id: unb64(cred) }], userVerification: 'required', timeout: 60000, extensions: { prf: { eval: { first: unb64(sal) } } } } });
        var e = r && r.getClientExtensionResults ? r.getClientExtensionResults() : null;
        var f = e && e.prf && e.prf.results && e.prf.results.first; return f ? new Uint8Array(f) : null;
      } catch (e) { return null; }
    },
    ligarDigital: async function () {
      if (!this.dukRaw) return { erro: 'fechado' };
      var sal = b64(Cifra.rnd(32)), cred;
      try {
        cred = await navigator.credentials.create({ publicKey: { challenge: Cifra.rnd(32), rp: { name: 'MoneyTRIO' }, user: { id: Cifra.rnd(16), name: Conta.email() || 'moneytrio', displayName: 'MoneyTRIO · ' + tt('cadeado', 'lock') },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' }, extensions: { prf: { eval: { first: unb64(sal) } } }, timeout: 60000 } });
      } catch (e) { return { erro: 'cancelou' }; }
      var ext = cred && cred.getClientExtensionResults ? cred.getClientExtensionResults() : {};
      var id = b64(cred.rawId), f = ext.prf && ext.prf.results && ext.prf.results.first;
      var out = f ? new Uint8Array(f) : ext.prf && ext.prf.enabled === false ? null : await this.prfAvaliar(id, sal);
      if (!out) return { erro: 'semprf' };
      var L = await this.local(); L.prf = Object.assign({ cred: id, sal: sal }, await Cifra.cifrar(await Cifra.hkdf(out, PRF_INFO), this.dukRaw)); out.fill(0);
      await this.gravar(L); return { ok: true };
    },
    desligarDigital: async function () { var L = await this.local(); if (L) { L.prf = null; await this.gravar(L); } },
    trocarPin: async function (pin) {
      if (!this.dukRaw) return false;
      var L = await this.local(), sal = b64(Cifra.rnd(16));
      L.pin = Object.assign({ sal: sal, iter: ITER }, await Cifra.cifrar(await Cifra.kdf(pin, sal, ITER), this.dukRaw)); L.erros = 0; L.ate = 0; L.bloqueado = false;
      await this.gravar(L); return true;
    }
  };

  /* ---------------- 1.9.0 — Aparelhos: entrar SEM código de recuperação (plataforma, formato v2) ----------------
     Tabelas e funções de plataforma: supabase/2026-11-07-sol-aparelhos.sql (sol_aparelhos, sol_acesso_pedidos, sol_passkeys).
     O aparelho novo (B) gera um par ECDH P-256 efêmero e nB; grava pubB e C = SHA-256(pubB‖nB) (o compromisso).
     Quem aprova (A: outro aparelho aberto da mesma conta, ou chefe/responsável da família) grava pubA e nA (desafio);
     só então B revela nB; A confere C. Os dois mostram 6 números = SHA-256("sol-ap-v2"‖id‖pubA‖pubB‖nA‖nB): como B se
     comprometeu antes de ver nA, um banco que troque a pub não escolhe os números. A aprova com o PIN ou a digital e grava
     a resposta fechada: ECDH(A, pubB) → HKDF(id, uid, nA, nB) → AES-GCM (AAD = id). Pessoal: a chave privada da pessoa;
     família: só a chave da família. Passkey (WebAuthn PRF): a chave privada fechada com o segredo da passkey. */
  var AP_V = 'sol-ap-v2', AP_APP = 'moneytrio', PK_INFO = 'sol-passkey-v2', AP_POLL = 2000;
  function b64u(buf) { return b64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(t) { t = String(t).replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; return unb64(t); }
  function nomeAparelho() {
    var u = navigator.userAgent || '';
    var so = /Android/i.test(u) ? 'Android' : /iPhone/i.test(u) ? 'iPhone' : /iPad/i.test(u) ? 'iPad' : /Windows/i.test(u) ? 'Windows' : /Mac OS/i.test(u) ? 'Mac' : /Linux/i.test(u) ? 'Linux' : tt('Aparelho', 'Device');
    var nav = /SamsungBrowser/i.test(u) ? 'Samsung' : /Edg\//i.test(u) ? 'Edge' : /Firefox/i.test(u) ? 'Firefox' : /Chrome|CriOS/i.test(u) ? 'Chrome' : /Safari/i.test(u) ? 'Safari' : '';
    return (so + (nav ? ' · ' + nav : '')).slice(0, 60);
  }
  function rpId() { return /(^|\.)solverone\.com\.br$/.test(location.hostname) ? 'solverone.com.br' : location.hostname; }
  var Aparelhos = {
    ligado: null,          /* false = o SQL de plataforma ainda não foi aplicado (a função não existe) */
    _apr: {},              /* pedidos que ESTE aparelho está aprovando: {id: {priv, pub, nA}} */
    _vistos: {},           /* pedidos que a pessoa já fechou nesta sessão (não insiste) */
    canon: function (pub) { return pub.x + '.' + pub.y; },
    sha: async function (txt) { return new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(txt))); },
    compromisso: async function (pub, nB) { return b64u(await this.sha([AP_V, 'c', this.canon(pub), nB].join('|'))); },
    sas: async function (id, pubA, pubB, nA, nB) {
      var h = await this.sha([AP_V, id, this.canon(pubA), this.canon(pubB), nA, nB].join('|'));
      return String((((h[0] << 24) >>> 0) + (h[1] << 16) + (h[2] << 8) + h[3]) % 1000000).padStart(6, '0');
    },
    novoPar: async function () {
      var k = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
      var j = await crypto.subtle.exportKey('jwk', k.publicKey);
      return { priv: k.privateKey, pub: { kty: 'EC', crv: 'P-256', x: j.x, y: j.y } };
    },
    chave: async function (priv, pubOutro, id, uid, nA, nB) {
      var pk = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: pubOutro.x, y: pubOutro.y, ext: true }, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
      var bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: pk }, priv, 256));
      var base = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']); bits.fill(0);
      return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: utf8([AP_V, id, uid, nA, nB].join('|')) }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    },
    fechar: async function (key, id, obj) {
      var iv = Cifra.rnd(12), ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: utf8(id) }, key, utf8(JSON.stringify(obj)));
      return { v: 2, iv: b64(iv), ct: b64(ct) };
    },
    abrirResp: async function (key, id, o) {
      return JSON.parse(deUtf8(new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(o.iv), additionalData: utf8(id) }, key, unb64(o.ct)))));
    },
    rpc: async function (nome, args) {
      try { var r = await Conta.rpc(nome, args || {}); this.ligado = true; return r; }
      catch (e) { if (/PGRST202|404|does not exist|não existe/i.test(String(e && (e.code || e.message) || e))) this.ligado = false; throw e; }
    },

    /* ======== B: este aparelho é o novo ======== */
    pedir: async function (fam, modo) {
      var uid = Conta.uid(), par = await this.novoPar(), nB = b64u(Cifra.rnd(32)), C = await this.compromisso(par.pub, nB), id;
      try { id = await this.rpc('sol_pedido_criar', { p_nome: nomeAparelho(), p_app: AP_APP, p_pub: par.pub, p_compromisso: C, p_grupo: modo === 'familia' ? fam.grupo_id : null }); }
      catch (e) {
        if (this.ligado === false) return Portao.mensagem(tt('Ainda não está pronto', 'Not ready yet'), tt('A aprovação pelo outro aparelho ainda está sendo ligada. Por enquanto, use o código de recuperação, se tiver.', 'Approval from another device is still being switched on. For now, use the recovery code if you have it.'), [[tt('Voltar', 'Back'), function () { Portao.primeiraVez(fam, false); }]]);
        return Portao.mensagem(tt('Não deu para pedir', 'Could not request'), esc(Conta.explicar(e)), [[tt('Voltar', 'Back'), function () { Portao.primeiraVez(fam, false); }]]);
      }
      var ped = { id: id, uid: uid, priv: par.priv, pub: par.pub, nB: nB, modo: modo, gid: fam.grupo_id, criado: Date.now() };
      await IDB.set('kv', 'pedido|' + uid, ped).catch(function () {});
      this.esperar(fam, ped);
    },
    esperar: function (fam, ped) {
      var self = this, sas = '', revelou = false, fim = false;
      var tela = function (extra) {
        var el = Tela.mostrar(Tela.topo() + '<h2>' + (ped.modo === 'familia' ? '👪 ' + tt('Pedir para alguém da família', 'Ask someone in the family') : '📱 ' + tt('Aprovar pelo outro aparelho', 'Approve from your other device')) + '</h2>' +
          '<p>' + (ped.modo === 'familia'
            ? tt('Peça para um chefe ou responsável da família <b>' + esc(fam.nome || '') + '</b> abrir o MoneyTRIO (ou o OmniLifeONE). Vai aparecer o seu pedido para ele aprovar.', 'Ask a head or guardian of the family <b>' + esc(fam.nome || '') + '</b> to open MoneyTRIO (or OmniLifeONE). Your request will show up for them to approve.')
            : tt('Abra o MoneyTRIO (ou o OmniLifeONE) num aparelho onde você já entra, com esta mesma conta. Vai aparecer "Pedido de acesso".', 'Open MoneyTRIO (or OmniLifeONE) on a device where you are already in, with this same account. "Access request" will show up.')) + '</p>' +
          (sas ? '<div class="nv-sas" id="nvSas" aria-label="' + tt('Números para comparar', 'Numbers to compare') + '">' + sas.slice(0, 3) + ' ' + sas.slice(3) + '</div>' +
            '<p class="nv-muted">' + tt('Confira se o outro aparelho mostra estes mesmos 6 números. Se forem diferentes, não aprove.', 'Check that the other device shows these same 6 numbers. If they differ, do not approve.') + '</p>'
            : '<div class="nv-nota" id="nvEsperando">⏳ ' + tt('Esperando o outro aparelho abrir o pedido…', 'Waiting for the other device to open the request…') + '</div>') +
          (extra || '') + '<div class="nv-nota erro nv-hidden" id="nvErro" role="alert"></div>' +
          '<button class="nv-btn" id="nvApCancelar">' + tt('Cancelar', 'Cancel') + '</button>');
        el.querySelector('#nvApCancelar').onclick = function () { fim = true; esquecer(); Portao.primeiraVez(fam, false); };
      };
      /* o par efêmero (não extraível) sai do IndexedDB e da memória: nada dele fica depois do pedido */
      var esquecer = function () { IDB.del('kv', 'pedido|' + ped.uid).catch(function () {}); ped.priv = null; };
      var acabou = function (titulo, txt) {
        fim = true; esquecer();
        Portao.mensagem(titulo, txt, [[tt('Pedir de novo', 'Ask again'), function () { self.pedir(fam, ped.modo); }], [tt('Voltar', 'Back'), function () { Portao.primeiraVez(fam, false); }]]);
      };
      tela();
      var volta = async function () {
        if (fim) return;
        var r = null;
        try { r = await self.rpc('sol_pedido_buscar', { p_id: ped.id }); r = r && r[0]; } catch (e) { if (!fim) setTimeout(volta, AP_POLL * 2); return; }
        if (fim) return;
        if (!r || r.estado === 'vencido' || (r.estado === 'usado' && !r.resposta)) return acabou(tt('O pedido venceu', 'The request expired'), tt('Ninguém aprovou em 10 minutos. Peça de novo.', 'Nobody approved within 10 minutes. Ask again.'));
        if (r.estado === 'recusado') return acabou(tt('Pedido recusado', 'Request declined'), tt('O outro aparelho recusou o pedido.', 'The other device declined the request.'));
        if (r.estado === 'aberto' && r.pub_a && r.n_a && !revelou) {
          try { await self.rpc('sol_pedido_revelar', { p_id: ped.id, p_n_b: ped.nB }); } catch (e) {}
          revelou = true; ped.pubA = r.pub_a; ped.nA = r.n_a;
          sas = await self.sas(ped.id, r.pub_a, ped.pub, r.n_a, ped.nB); tela();
        }
        if (r.estado === 'aprovado' && r.resposta) {
          fim = true;
          var o, priv = ped.priv; esquecer();
          try { o = await self.abrirResp(await self.chave(priv, r.pub_a || ped.pubA, ped.id, ped.uid, r.n_a || ped.nA, ped.nB), ped.id, r.resposta); }
          catch (e) { return acabou(tt('Não abriu', 'Did not open'), tt('A resposta não abriu neste aparelho. Peça de novo.', 'The answer did not open on this device. Ask again.')); }
          return self.receber(fam, o, r.aparelho);
        }
        setTimeout(volta, AP_POLL);
      };
      setTimeout(volta, 300);
    },
    /* 1.10.0: depois da aprovação, a conta já tem PIN → "Digite o PIN da sua conta" (não cria outro); sem PIN → escolher */
    receber: async function (fam, o, apId) {
      var velho = await Cadeado.local().catch(function () { return null; }), apVelho = velho && velho.ap;
      if (!apId && o.como === 'passkey') { try { apId = await this.rpc('sol_aparelho_registrar', { p_nome: nomeAparelho(), p_app: AP_APP, p_como: 'passkey' }); } catch (e) {} }
      Pin.pedir(apId, async function (pin) {
        Portao.carregando(tt('Preparando o cadeado deste aparelho…', 'Preparing the lock on this device…'));
        try {
          if (o.tipo === 'pessoal') return await Cadeado.montar(unb64(o.sk), null, pin, fam.grupo_id, o.como || 'aparelho', apId);
          return await Cadeado.montar(null, { raw: unb64(o.cf), kv: o.kv, fk: o.fk }, pin, o.gid || fam.grupo_id, 'familia', apId);
        } catch (e) { return { erro: 'rede', e: e }; }
      }, function (r) {
        if (!r.ok) return Portao.mensagem(tt('Não deu', 'It did not work'), r.erro === 'semliberar' ? tt('O cadeado desta família ainda não foi liberado para você.', 'This family lock has not been released to you yet.') : esc(Conta.explicar(r.e)), [[tt('Voltar', 'Back'), function () { Portao.primeiraVez(fam, false); }]]);
        /* "Esqueci o PIN" neste mesmo aparelho: o lugar antigo dele na lista sai (fica só o novo) */
        if (apVelho && apVelho !== apId) Aparelhos.rpc('sol_aparelho_tirar', { p_id: apVelho }).catch(function () {});
        IDB.set('kv', 'digitalPerguntada|' + Conta.uid(), Date.now()).catch(function () {});
        Portao.oferecerDigital(function () { if (Nuvem.iniciado) Nuvem.destrancado(); else Nuvem.depoisDoCadeado(true); });
      });
    },
    /* recarregou no meio do pedido: continua de onde parou (o par efêmero fica no IndexedDB, não extraível) */
    retomar: async function (fam) {
      var ped = await IDB.get('kv', 'pedido|' + Conta.uid()).catch(function () { return null; });
      if (!ped || ped.gid !== fam.grupo_id || Date.now() - ped.criado > 10 * 60 * 1000) return false;
      this.esperar(fam, ped); return true;
    },

    /* ======== A: este aparelho está aberto e aprova ======== */
    olharPedidos: async function () {
      if (this.ligado === false || !Cadeado.aberto() || this._olhando || Tela.el) return;   /* com uma tela do portão aberta, espera */
      this._olhando = true;
      try {
        var lista = (await this.rpc('sol_pedidos_para_mim')) || [], self = this;
        var meu = await IDB.get('kv', 'pedido|' + Conta.uid()).catch(function () { return null; });   /* o pedido que ESTE aparelho criou não é para ele aprovar */
        this.pendentes = lista.filter(function (p) { return !self._vistos[p.id] && !(meu && meu.id === p.id); });
        this.avisarPedido();
      } catch (e) {} finally { this._olhando = false; }
    },
    avisarPedido: function () {
      var p = (this.pendentes || [])[0], el = document.getElementById('nvPedido');
      if (!p) { if (el) el.remove(); return; }
      if (!el) { el = document.createElement('div'); el.id = 'nvPedido'; el.className = 'nv-pedido'; el.setAttribute('role', 'alert'); document.body.appendChild(el); }
      el.innerHTML = '<span>🔔 ' + esc(p.tipo === 'familia' ? tt('Pedido de acesso de ', 'Access request from ') + (p.quem_nome || p.quem_email) + ': ' + p.nome : tt('Pedido de acesso: ', 'Access request: ') + p.nome) + ' · ' + esc(dataHora(p.criado_em)) + '</span>' +
        '<button class="nv-btn pri" id="nvPedidoVer">' + tt('Ver', 'View') + '</button><button class="nv-x" id="nvPedidoX" aria-label="' + tt('Agora não', 'Not now') + '">✕</button>';
      var self = this;
      el.querySelector('#nvPedidoVer').onclick = function () { el.remove(); self.aprovar(p); };
      el.querySelector('#nvPedidoX').onclick = function () { self._vistos[p.id] = 1; self.pendentes.shift(); self.avisarPedido(); };
    },
    aprovar: async function (p) {
      var self = this, eu = this._apr[p.id], fim = false;
      this._vistos[p.id] = 1;
      var cabeca = Tela.topo() + '<h2>🔔 ' + tt('Pedido de acesso', 'Access request') + '</h2>' +
        (p.tipo === 'familia'
          ? '<p><b>' + esc(p.quem_nome || p.quem_email) + '</b>' + (p.quem_nome ? ' (' + esc(p.quem_email) + ')' : '') + tt(' quer entrar nas finanças da família pelo aparelho ', ' wants to open the family finances on the device ') + '<b>' + esc(p.nome) + '</b> · ' + esc(dataHora(p.criado_em)) + '</p>' +
            '<div class="nv-nota atencao">' + tt('Só aprove se a pessoa está com você (ou ao telefone) e lê o mesmo número.', 'Only approve if the person is with you (or on the phone) and reads the same number.') + '</div>'
          : '<p>' + tt('Pedido de acesso de: ', 'Access request from: ') + '<b>' + esc(p.nome) + '</b> · ' + esc(dataHora(p.criado_em)) + '</p>' +
            '<div class="nv-nota atencao">' + tt('Só aprove se este pedido é do aparelho que você está segurando agora.', 'Only approve if this request comes from the device you are holding now.') + '</div>');
      var sair = function (msg) { fim = true; delete self._apr[p.id]; eu = null; Tela.fechar(); if (msg) aviso(msg); };
      var recusar = function () { fim = true; self.rpc('sol_pedido_recusar', { p_id: p.id }).catch(function () {}); sair(tt('Pedido recusado.', 'Request declined.')); };
      var botoes = function () { return '<div class="nv-row"><button class="nv-btn" id="nvApRecusar">' + tt('Recusar', 'Decline') + '</button><button class="nv-btn" id="nvApDepois">' + tt('Agora não', 'Not now') + '</button></div>'; };
      var ligar = function (el) { el.querySelector('#nvApRecusar').onclick = recusar; el.querySelector('#nvApDepois').onclick = function () { sair(); }; };
      var el = Tela.mostrar(cabeca + '<div class="nv-nota">⏳ ' + tt('Conectando com o outro aparelho…', 'Connecting to the other device…') + '</div>' + botoes()); ligar(el);
      try {
        if (!eu) {
          var par = await this.novoPar(), nA = b64u(Cifra.rnd(32));
          if (!(await this.rpc('sol_pedido_desafio', { p_id: p.id, p_pub_a: par.pub, p_n_a: nA }))) return sair(tt('Outro aparelho já está cuidando deste pedido (ou ele venceu).', 'Another device is already handling this request (or it expired).'));
          eu = this._apr[p.id] = { priv: par.priv, pub: par.pub, nA: nA };
        }
        /* espera o aparelho novo revelar nB */
        var q = p;
        for (var i = 0; !q.n_b && !fim && i < 300; i++) {
          await dorme(1500);
          var l = (await this.rpc('sol_pedidos_para_mim')) || []; q = l.find(function (x) { return x.id === p.id; });
          if (!q) return sair(tt('O pedido não está mais aberto.', 'The request is no longer open.'));
        }
        if (fim) return;
        if ((await this.compromisso(q.pub, q.n_b)) !== q.compromisso) {
          el = Tela.mostrar(cabeca + '<div class="nv-nota erro" id="nvApAdulterado">⚠️ ' + tt('Este pedido foi alterado no caminho. Não aprove: recuse e peça de novo no outro aparelho.', 'This request was altered on the way. Do not approve: decline and ask again on the other device.') + '</div>' + botoes()); ligar(el); return;
        }
        var sas = await this.sas(p.id, eu.pub, q.pub, eu.nA, q.n_b), L = await Cadeado.local();
        el = Tela.mostrar(cabeca + '<div class="nv-sas" id="nvSas">' + sas.slice(0, 3) + ' ' + sas.slice(3) + '</div>' +
          '<p>' + tt('O outro aparelho mostra estes mesmos 6 números? Se sim, digite o seu PIN para aprovar.', 'Does the other device show these same 6 numbers? If so, type your PIN to approve.') + '</p>' +
          '<label class="nv-fld"><span>PIN</span><input type="text" class="nv-pinc" id="nvApPin" inputmode="numeric" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true"></label>' +
          '<div class="nv-nota erro nv-hidden" id="nvErro" role="alert"></div>' +
          '<button class="nv-btn pri" id="nvApOk">' + tt('Os números são iguais: aprovar', 'The numbers match: approve') + '</button>' +
          (L && L.prf ? '<button class="nv-btn" id="nvApDig">👆 ' + tt('Aprovar com a digital', 'Approve with fingerprint') + '</button>' : '') + botoes());
        ligar(el);
        var ir = function (pin) { return Tela.ocupar(el.querySelector(pin === null ? '#nvApDig' : '#nvApOk'), async function () {
          var d = await Cadeado.duk(pin);
          if (d.erro) return Tela.erro(d.erro === 'pin' ? tt('PIN errado.', 'Wrong PIN.') : d.erro === 'espera' ? tt('Espere um pouco para tentar de novo.', 'Wait a bit to try again.') : tt('Não conferiu.', 'Could not verify.'));
          var duk = await Cifra.aes(d.raw), carga;
          if (p.tipo === 'familia') {
            var f = (d.L.fam || {})[p.grupo_id]; if (!f) return Tela.erro(tt('Esta família não está aberta neste aparelho.', 'This family is not open on this device.'));
            var cf = await Cifra.decifrar(duk, f); carga = { v: 2, tipo: 'familia', gid: p.grupo_id, kv: f.kv, fk: f.fk, cf: b64(cf) }; cf.fill(0);
          } else {
            if (!d.L.sk) return Tela.erro(tt('Este aparelho entrou pela família e não guarda a sua chave pessoal: aprove por outro aparelho seu.', 'This device joined through the family and does not keep your personal key: approve from another device of yours.'));
            var sk = await Cifra.decifrar(duk, d.L.sk); carga = { v: 2, tipo: 'pessoal', sk: b64(sk) }; sk.fill(0);
          }
          d.raw.fill(0);
          var resp = await self.fechar(await self.chave(eu.priv, q.pub, p.id, p.quem, eu.nA, q.n_b), p.id, carga); carga = null;
          var ok = await self.rpc('sol_pedido_aprovar', { p_id: p.id, p_resposta: resp, p_meu_ap: d.L.ap || null });
          delete self._apr[p.id];
          sair(ok ? '✓ ' + tt('Aprovado. O outro aparelho já pode criar o PIN dele.', 'Approved. The other device can now create its PIN.') : tt('Não deu para aprovar: o pedido venceu ou já foi respondido.', 'Could not approve: the request expired or was already answered.'));
        }); };
        el.querySelector('#nvApPin').addEventListener('keydown', function (e) { if (e.key === 'Enter') el.querySelector('#nvApOk').click(); });
        el.querySelector('#nvApOk').onclick = function () { var v = el.querySelector('#nvApPin').value; if (v) ir(v); };
        if (el.querySelector('#nvApDig')) el.querySelector('#nvApDig').onclick = function () { ir(null); };
      } catch (e) { if (!fim) sair(tt('Não deu para aprovar: ', 'Could not approve: ') + Conta.explicar(e)); }
    },

    /* ======== ao abrir: registrar este aparelho, conferir se não foi tirado, avisar aparelho novo aprovado pela família ======== */
    aoAbrir: async function () {
      if (this.ligado === false || !navigator.onLine) return;
      var L = await Cadeado.local(); if (!L) return;
      try {
        if (!L.ap) {
          L.ap = await this.rpc('sol_aparelho_registrar', { p_nome: nomeAparelho(), p_app: AP_APP, p_como: L.como === 'passkey' || L.como === 'kit' ? L.como : 'primeiro' });
          if (!L.avisosAte) L.avisosAte = new Date().toISOString();
          await Cadeado.gravar(L);
        } else if ((await this.rpc('sol_aparelho_visto', { p_id: L.ap })) === false) {
          return this.tirado();
        }
        /* 1.10.0: o PIN da conta foi trocado em outro aparelho → tranca e pede o PIN novo (conferido no banco) */
        var pi = L.srv ? await Pin.info() : null;
        if (pi && pi.tem && L.pinVersao && pi.versao !== L.pinVersao && Cadeado.aberto()) { Nuvem.trancar('pinTrocado'); return; }
        var lista = (await this.rpc('sol_aparelhos_meus')) || [], ate = L.avisosAte || '', eu = Conta.uid();
        var novos = lista.filter(function (a) { return a.id !== L.ap && a.como === 'familia' && a.aprovado_por !== eu && String(a.criado_em) > ate; });
        if (novos.length) {
          L.avisosAte = novos.map(function (a) { return String(a.criado_em); }).sort().pop(); await Cadeado.gravar(L);
          this.avisoFamilia(novos[0]);
        }
      } catch (e) {}
    },
    avisoFamilia: function (a) {
      var el = document.getElementById('nvAvisoAp') || document.createElement('div');
      el.id = 'nvAvisoAp'; el.className = 'nv-pedido'; el.setAttribute('role', 'alert');
      el.innerHTML = '<span>⚠️ ' + esc(tt('Um aparelho novo entrou na sua conta: ', 'A new device joined your account: ') + a.nome + tt(', aprovado por ', ', approved by ') + (a.aprovado_por_nome || a.aprovado_por_email || '?') + ' · ' + dataHora(a.criado_em) + '. ') +
        esc(tt('Não foi você?', 'Was it not you?')) + '</span><button class="nv-btn" id="nvAvisoTirar">' + tt('Tirar', 'Remove') + '</button><button class="nv-x" id="nvAvisoX" aria-label="' + tt('Está certo', 'It is fine') + '">✕</button>';
      document.body.appendChild(el);
      var self = this;
      el.querySelector('#nvAvisoX').onclick = function () { el.remove(); };
      el.querySelector('#nvAvisoTirar').onclick = async function () { try { await self.rpc('sol_aparelho_tirar', { p_id: a.id }); aviso('✓ ' + tt('Aparelho tirado da sua conta.', 'Device removed from your account.')); } catch (e) {} el.remove(); };
    },
    /* este aparelho foi tirado da conta em outro aparelho: o cadeado local e a cópia daqui saem */
    tirado: async function () {
      var uid = Conta.uid();
      try { await Cadeado.trancar(); await IDB.del('kv', Cadeado.K(uid)); await Nuvem.apagarDoAparelho(uid); } catch (e) {}
      alertaERecarrega(tt('Este aparelho foi tirado da sua conta em outro aparelho. Para usar aqui de novo, entre e peça a aprovação.', 'This device was removed from your account on another device. To use it here again, sign in and ask for approval.'));
    },
    lista: async function () { try { return (await this.rpc('sol_aparelhos_meus')) || []; } catch (e) { return null; } },

    /* ======== passkey sincronizada (WebAuthn PRF) ======== */
    temPasskeys: async function () { try { return ((await this.rpc('sol_passkeys_minhas')) || []).length > 0; } catch (e) { return false; } },
    criarPasskey: async function () {
      if (!Cadeado.dukRaw) return { erro: 'fechado' };
      var L = await Cadeado.local(); if (!L || !L.sk) return { erro: 'semchave' };
      var sal = Cifra.rnd(32), cred;
      try {
        cred = await navigator.credentials.create({ publicKey: { challenge: Cifra.rnd(32), rp: { id: rpId(), name: 'SolverONE' }, user: { id: utf8(Conta.uid()).slice(0, 64), name: Conta.email() || 'solverone', displayName: 'SolverONE · ' + (Conta.email() || '') },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { residentKey: 'required', userVerification: 'required' }, extensions: { prf: { eval: { first: sal } } }, timeout: 60000 } });
      } catch (e) { return { erro: 'cancelou' }; }
      var ext = cred.getClientExtensionResults ? cred.getClientExtensionResults() : {}, f = ext.prf && ext.prf.results && ext.prf.results.first, id = b64u(cred.rawId);
      var out = f ? new Uint8Array(f) : null;
      if (!out && !(ext.prf && ext.prf.enabled === false)) out = await this.prfDe([{ cred_id: id, sal: b64u(sal) }]).then(function (r) { return r && r.out; });
      if (!out) return { erro: 'semprf' };
      var sk = await Cifra.decifrar(await Cifra.aes(Cadeado.dukRaw), L.sk), fechada = await Cifra.cifrar(await Cifra.hkdf(out, PK_INFO), sk); sk.fill(0); out.fill(0);
      await this.rpc('sol_passkey_guardar', { p_cred: id, p_sal: b64u(sal), p_fechada: fechada });
      return { ok: true };
    },
    prfDe: async function (linhas) {
      var ev = {}; linhas.forEach(function (k) { ev[k.cred_id] = { first: unb64u(k.sal) }; });
      try {
        var r = await navigator.credentials.get({ publicKey: { challenge: Cifra.rnd(32), rpId: rpId(), allowCredentials: linhas.map(function (k) { return { type: 'public-key', id: unb64u(k.cred_id) }; }), userVerification: 'required', timeout: 60000, extensions: { prf: { evalByCredential: ev } } } });
        var e = r && r.getClientExtensionResults ? r.getClientExtensionResults() : null, f = e && e.prf && e.prf.results && e.prf.results.first;
        return f ? { cred: b64u(r.rawId), out: new Uint8Array(f) } : null;
      } catch (e2) { return null; }
    },
    entrarPasskey: async function (fam) {
      var linhas = []; try { linhas = (await this.rpc('sol_passkeys_minhas')) || []; } catch (e) {}
      var r = linhas.length ? await this.prfDe(linhas) : null;
      var k = r && linhas.find(function (x) { return x.cred_id === r.cred; });
      if (!k) return Tela.erro(tt('A digital (passkey) não abriu neste aparelho. Use a aprovação pelo outro aparelho.', 'The fingerprint (passkey) did not open on this device. Use approval from another device.'));
      var sk; try { sk = await Cifra.decifrar(await Cifra.hkdf(r.out, PK_INFO), k.fechada); } catch (e) { return Tela.erro(tt('A passkey não abriu a chave.', 'The passkey did not open the key.')); } finally { r.out.fill(0); }
      this.receber(fam, { tipo: 'pessoal', como: 'passkey', sk: b64(sk) }, null); sk.fill(0);
    }
  };

  /* ---------------- 1.10.0 — PIN DA CONTA (um PIN só, igual em todos os aparelhos) ----------------
     Plataforma: supabase/2026-11-11-sol-pin-conta.sql. O PIN nunca sai do aparelho: vai v = PBKDF2(PIN, sal da conta, 600 mil);
     o banco guarda SHA-256(v), conta as tentativas (espera a partir do 5º erro; 24 h por erro do 10º em diante) e, com o PIN
     certo, entrega o SEGREDO deste aparelho. A chave do aparelho (DUK) fica fechada de dois jeitos:
       L.pin = AES(PBKDF2(PIN da conta), DUK) → abre SEM internet (limite local de 10, como antes);
       L.srv = AES(HKDF(segredo), AES(chave não extraível deste navegador, DUK)) → abre COM internet; é o que faz "trocou
       num aparelho, vale em todos" (com o PIN novo vem o segredo, abre o L.srv e o L.pin é refeito com o PIN novo).
     L.pinVersao: a versão do PIN da conta que o L.pin deste aparelho conhece. Sem o SQL, tudo volta ao PIN do aparelho. */
  var PIN_SRV = 'sol-pin-v1';
  var Pin = {
    ligado: null,
    rpc: async function (nome, args) {
      try { var r = await Conta.rpc(nome, args || {}); this.ligado = true; return r; }
      catch (e) { if (/PGRST202|404|does not exist|não existe/i.test(String(e && (e.code || e.message) || e))) this.ligado = false; throw e; }
    },
    info: async function () {
      if (this.ligado === false || !navigator.onLine || !Conta.on()) return null;
      try { var r = await this.rpc('sol_pin_info'); return (r && r[0]) || null; } catch (e) { return null; }
    },
    v: async function (pin, sal) {
      var base = await crypto.subtle.importKey('raw', utf8(String(pin)), 'PBKDF2', false, ['deriveBits']);
      return b64u(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64u(sal), iterations: ITER, hash: 'SHA-256' }, base, 256)));
    },
    conferir: async function (pin, info, ap) {
      try { return await this.rpc('sol_pin_conferir', { p_v: await this.v(pin, info.sal), p_ap: ap }); } catch (e) { return null; }
    },
    definir: async function (pin, atual, info, ap) {
      var sal = b64u(Cifra.rnd(16));
      return this.rpc('sol_pin_definir', { p_v_novo: await this.v(pin, sal), p_sal_novo: sal, p_v_atual: atual && info ? await this.v(atual, info.sal) : null, p_ap: ap });
    },
    chaveAp: async function () {
      var k = 'chaveAp|' + Conta.uid(), c = await IDB.get('kv', k).catch(function () { return null; });
      if (!c) { c = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); await IDB.set('kv', k, c); }
      return c;
    },
    fecharSrv: async function (dukRaw, segredo) {
      var dentro = await Cifra.cifrar(await this.chaveAp(), dukRaw);
      return Cifra.cifrar(await Cifra.hkdf(unb64u(segredo), PIN_SRV), utf8(JSON.stringify(dentro)));
    },
    abrirSrv: async function (srv, segredo) {
      var dentro = JSON.parse(deUtf8(await Cifra.decifrar(await Cifra.hkdf(unb64u(segredo), PIN_SRV), srv)));
      return Cifra.decifrar(await this.chaveAp(), dentro);
    },
    /* a DUK aberta + o PIN da conta confirmado: grava L.srv (com o segredo), refaz o L.pin com o PIN da conta e a versão */
    gravar: async function (L, pin, dukRaw, segredo, versao, ap) {
      if (segredo) L.srv = await this.fecharSrv(dukRaw, segredo);
      var sal = b64(Cifra.rnd(16));
      L.pin = Object.assign({ sal: sal, iter: ITER }, await Cifra.cifrar(await Cifra.kdf(pin, sal, ITER), dukRaw));
      L.pinVersao = versao || L.pinVersao || 0; L.erros = 0; L.ate = 0; L.bloqueado = false;
      if (ap) L.ap = ap;
      await Cadeado.gravar(L);
    },
    /* destravar com o PIN. Devolve o mesmo que Cadeado.porPin, ou {erro:'pinConta'} (o PIN antigo deste aparelho abriu, mas
       a conta já tem outro PIN) ou {erro:'pinAntigo'} (o PIN da conta está certo, mas este aparelho ainda está no PIN antigo) */
    abrir: async function (pin, gid) {
      var L = await Cadeado.local(); if (!L) return { erro: 'novo' };
      var info = L.ap ? await this.info() : null;
      if (!info) return Cadeado.porPin(pin, gid);                          /* sem internet ou sem o SQL: o PIN deste aparelho */
      if (!info.tem) {                                                      /* conta sem PIN: o deste aparelho vira o da conta */
        var r = await Cadeado.duk(pin); if (r.erro) return r;
        try { var d = await this.definir(pin, null, null, L.ap); if (d && d.ok) await this.gravar(r.L, pin, r.raw, d.segredo, d.versao); } catch (e) {}
        return Cadeado.comChaveDoAparelho(await Cadeado.local(), r.raw, gid);
      }
      if (info.espera_ate && Date.parse(info.espera_ate) > Date.now()) return { erro: 'espera', ate: Date.parse(info.espera_ate), muitas: info.tentativas >= 10, conta: true };
      var local = !L.srv ? await Cadeado.duk(pin) : null;                   /* migração: o PIN antigo daqui primeiro (não gasta tentativa da conta) */
      var c = await this.conferir(pin, info, L.ap);
      if (!c || c.erro === 'aparelho') return local && !local.erro ? Cadeado.comChaveDoAparelho(local.L, local.raw, gid) : local || Cadeado.porPin(pin, gid);
      if (c.ok) {
        var raw = null;
        if (L.srv) { try { raw = await this.abrirSrv(L.srv, c.segredo); } catch (e) {} }
        if (!raw && local && !local.erro) raw = local.raw;
        if (!raw) return { erro: 'pinAntigo', segredo: c.segredo, versao: c.versao, pinConta: pin, ap: L.ap };
        await this.gravar(await Cadeado.local(), pin, raw, c.segredo, c.versao);
        return Cadeado.comChaveDoAparelho(await Cadeado.local(), raw, gid);
      }
      if (c.erro === 'pin' && local && !local.erro) return { erro: 'pinConta', raw: local.raw, info: info, ap: L.ap, restam: c.restam };
      if (c.erro === 'pin') return { erro: 'pin', conta: true, restam: c.restam, tentativas: c.tentativas, ate: c.espera_ate ? Date.parse(c.espera_ate) : 0 };
      if (c.erro === 'espera') return { erro: 'espera', ate: Date.parse(c.espera_ate), muitas: c.tentativas >= 10, conta: true };
      return Cadeado.porPin(pin, gid);
    },
    /* texto do erro do PIN da conta (o mesmo nas telas) */
    explicar: function (r) {
      if (r.erro === 'espera' && r.muitas) return tt('PIN errado muitas vezes: tente de novo em 24 h ou aprove por outro aparelho seu ("Esqueci o PIN").', 'Wrong PIN too many times: try again in 24 h or approve from another device of yours ("I forgot the PIN").');
      if (r.erro === 'espera') return tt('Espere ', 'Wait ') + Math.max(1, Math.ceil((r.ate - Date.now()) / 1000)) + tt(' segundos para tentar de novo.', ' seconds to try again.');
      if (r.erro === 'pin' && r.conta) return tt('PIN errado. ', 'Wrong PIN. ') + (r.restam > 0 && r.restam <= 5 ? tt('Faltam ', '') + r.restam + tt(' tentativas antes da espera de 24 h.', ' tries left before the 24 h wait.') : '') + (r.ate ? ' ' + tt('Espere um pouco para tentar de novo.', 'Wait a bit to try again.') : '');
      return '';
    },
    /* aparelho que acabou de entrar (aprovado, passkey ou código antigo): a conta tem PIN → "Digite o PIN da sua conta";
       não tem → "Escolha o PIN da conta". aoMontar(pin) monta o cadeado; depois(r) segue. */
    pedir: async function (ap, aoMontar, depois) {
      var info = ap ? await this.info() : null;
      if (info && info.tem) return Portao.pinConta(info, ap, async function (pin, c) {
        var r = await aoMontar(pin);
        if (r.ok) { try { await Pin.gravar(await Cadeado.local(), pin, Cadeado.dukRaw, c.segredo, c.versao, ap); } catch (e) {} }
        depois(r);
      });
      Portao.novoPin(async function (pin) {
        var r = await aoMontar(pin);
        if (r.ok && info && !info.tem) { try { var d = await Pin.definir(pin, null, null, ap); if (d && d.ok) await Pin.gravar(await Cadeado.local(), pin, Cadeado.dukRaw, d.segredo, d.versao, ap); } catch (e) {} }
        depois(r);
      });
    },
    /* trocar o PIN da conta (com o atual), com o cadeado aberto pelo PIN */
    trocar: async function (atual, novo) {
      var L = await Cadeado.local(), info = L && L.ap ? await this.info() : null;
      if (!info || !info.tem) return (await Cadeado.trocarPin(novo)) ? { ok: true, local: true } : { erro: 'fechado' };
      var d; try { d = await this.definir(novo, atual, info, L.ap); } catch (e) { return { erro: 'rede', e: e }; }
      if (!d || !d.ok) return d || { erro: 'rede' };
      await this.gravar(L, novo, Cadeado.dukRaw, d.segredo, d.versao); return { ok: true };
    }
  };

  /* ---------------- Mapa: estado do Store ↔ registros do money_docs ----------------
     Listas de itens: um registro por item (colecao = nome da lista no Store; tax.* vira tax_*).
     O resto do estado (config sem as chaves de API, categorias, vistos, moeda…): colecao 'config', id = nome do campo,
     dados = { v: valor }. 'config/caixa_robo' é a chave secreta da caixa do robô (não é do Store). */
  var ITENS = ['posicoes', 'movimentos', 'gastos', 'recorrentes', 'pagamentos', 'precos', 'extratos', 'agenda', 'metas', 'bancos', 'cartoes', 'beneficios', 'lugares', 'trajetos', 'transferencias'];
  var TAX_ITENS = ['declaracoes', 'processos', 'docs'];
  /* 1.6.0: as coleções dos módulos (modulos/*.js, MoneyModulos.colecoes()) entram na mesma conta: um registro por item */
  function itens() {
    if (!window.MoneyModulos) return ITENS;
    var extra = MoneyModulos.colecoes().filter(function (c) { return ITENS.indexOf(c) < 0 && c !== 'tax' && c !== 'config'; });
    return extra.length ? ITENS.concat(extra) : ITENS;
  }
  var FORA = { atualizadoEm: 1, gastosZ: 1 };
  var RESERVADOS = { caixa_robo: 1 };
  function chaveItem(x) {
    if (!x || typeof x !== 'object') return null;
    if (x.id != null && x.id !== '') return String(x.id);
    if (x.chave) return String(x.chave);
    if (x.rid != null) return String(x.rid) + '@' + String(x.data || '');
    return null;
  }
  function idsDaLista(lista) {
    var vistos = {}, out = [];
    for (var i = 0; i < lista.length; i++) {
      var x = lista[i], j = JSON.stringify(x), c = chaveItem(x);
      var id = c != null && c.length <= 70 && RX_ID.test(c) ? c : 'h' + hash(c != null ? c : j);
      if (vistos[id]) { var n = 2; while (vistos[id + '@@' + n]) n++; id = id + '@@' + n; }
      vistos[id] = 1; out.push([id, j]);
    }
    return out;
  }
  function listaDe(est, col) {
    if (col.indexOf('tax_') === 0) { var t = est.tax || {}; return Array.isArray(t[col.slice(4)]) ? t[col.slice(4)] : null; }
    return Array.isArray(est[col]) ? est[col] : null;
  }
  function mapear(est) {
    var out = new Map();
    itens().forEach(function (c) { idsDaLista(Array.isArray(est[c]) ? est[c] : []).forEach(function (p) { out.set(c + '|' + p[0], p[1]); }); });
    var tax = est.tax && typeof est.tax === 'object' ? est.tax : {}, resto = {};
    TAX_ITENS.forEach(function (c) { idsDaLista(Array.isArray(tax[c]) ? tax[c] : []).forEach(function (p) { out.set('tax_' + c + '|' + p[0], p[1]); }); });
    Object.keys(tax).forEach(function (k) { if (TAX_ITENS.indexOf(k) < 0) resto[k] = tax[k]; });
    out.set('config|tax', JSON.stringify({ v: resto }));
    Object.keys(est).forEach(function (k) {
      if (itens().indexOf(k) >= 0 || k === 'tax' || FORA[k] || RESERVADOS[k] || est[k] === undefined) return;
      if (!RX_ID.test(k)) return;
      var v = est[k];
      if (k === 'config' && v && typeof v === 'object') { v = Object.assign({}, v); delete v.chaves; }   /* chaves de API nunca sobem */
      out.set('config|' + k, JSON.stringify({ v: v }));
    });
    return out;
  }
  /* registros abertos → estado do Store (o Store.migrar completa o que faltar) */
  function reconstruir(regs) {
    var est = {}, tax = { declaracoes: [], processos: [], docs: [] }, resto = {};
    itens().forEach(function (c) { est[c] = []; });
    regs.forEach(function (r) {
      var col = r[0], id = r[1], o = r[2]; if (!o) return;
      if (col === 'config') {
        if (RESERVADOS[id]) return;
        if (id === 'tax') Object.assign(resto, o.v || {}); else est[id] = o.v;
      } else if (itens().indexOf(col) >= 0) est[col].push(o);
      else if (col.indexOf('tax_') === 0 && tax[col.slice(4)]) tax[col.slice(4)].push(o);
    });
    est.tax = Object.assign(resto, tax);
    return Store.migrar(est);
  }

  /* ---------------- Sincronia: cópia fechada no aparelho, fila, trava otimista, busca ---------------- */
  var Sinc = {
    gid: null, docs: new Map(), fila: new Map(), ultimo: new Map(), cursor: '', recusados: 0, online: navigator.onLine,
    k: function (k) { return this.gid + '|' + k; },
    carregar: async function (gid) {
      this.gid = gid; this.docs = new Map(); this.fila = new Map();
      var self = this, p = gid + '|';
      (await IDB.prefixo('docs', p)).forEach(function (e) { self.docs.set(e[0].slice(p.length), e[1]); });
      (await IDB.prefixo('fila', p)).forEach(function (e) { self.fila.set(e[0].slice(p.length), e[1]); });
      this.cursor = (await IDB.get('kv', 'cursor|' + gid)) || '';
    },
    vivos: function () { var n = 0; this.docs.forEach(function (d, k) { if (d.cif && k !== 'config|caixa_robo') n++; }); return n; },
    /* abre tudo da cópia local → lista [colecao, id, objeto] */
    abrirTudo: async function (aoAndar) {
      var regs = [], falhas = 0, i = 0, total = this.docs.size, self = this;
      for (var par of this.docs) {
        var k = par[0], d = par[1]; i++;
        if (!d.cif) continue;
        var o = await Cadeado.abrir(d.cif);
        if (!o) { falhas++; continue; }
        var c = k.indexOf('|'); regs.push([k.slice(0, c), k.slice(c + 1), o]);
        if (aoAndar && i % 500 === 0) aoAndar(i, total);
      }
      self.falhasAbrir = falhas;
      return regs;
    },
    /* o Store mudou: compara com o último retrato e põe na fila só o que mudou (já fechado com a CF) */
    registrar: function () {
      var self = this;
      this._reg = (this._reg || Promise.resolve()).then(function () { return self._registrar(); }).catch(function (e) { console.warn('nuvem: registrar', e); });
      return this._reg;
    },
    _registrar: async function () {
      clearTimeout(this._tReg); this._sujo = false;
      if (!Cadeado.aberto() || !Nuvem.iniciado || typeof Store === 'undefined' || this._recusou) return 0;
      var agora = mapear(Store.estado), muda = [], self = this;
      agora.forEach(function (j, k) { if (self.ultimo.get(k) !== j) muda.push([k, j]); });
      this.ultimo.forEach(function (j, k) { if (!agora.has(k)) muda.push([k, null]); });
      if (!muda.length) return 0;
      /* trava de segurança: apagar muita coisa de uma vez na nuvem pede confirmação (apagado na nuvem não volta) */
      var apaga = muda.filter(function (m) { return m[1] === null; }).length, vivos = this.vivos();
      if (apaga > 20 && apaga > vivos * 0.3 && !confirmar(tt('Isto vai apagar ', 'This will erase ') + apaga + tt(' registros da nuvem desta família, e não dá para desfazer. Continuar?', ' records from this family\'s cloud, and it cannot be undone. Continue?'))) {
        this._recusou = true;
        aviso(tt('Tudo bem: nada foi apagado. Recarregando o que está na nuvem…', 'OK: nothing was erased. Reloading what is in the cloud…'), 'warn');
        setTimeout(function () { Promise.resolve(Cadeado.trancar()).then(function () { ssSet(K_TRANCOU, 'manual'); location.reload(); }); }, 1500);
        return 0;
      }
      this.ultimo = agora;
      var pd = [], pf = [];
      for (var i = 0; i < muda.length; i++) {
        var k = muda[i][0], j = muda[i][1], d = this.docs.get(k) || { versao: null, srv: null, cif: null };
        if (j === null && d.versao == null) { this.docs.delete(k); this.fila.delete(k); pd.push([this.k(k), undefined]); pf.push([this.k(k), undefined]); continue; }
        var cif = j === null ? null : await Cadeado.selar(j);
        var nd = { versao: d.versao, srv: d.srv || null, cif: cif };
        this.docs.set(k, nd); pd.push([this.k(k), nd]);
        var f = { cif: cif, t: Date.now() }; this.fila.set(k, f); pf.push([this.k(k), f]);
      }
      await IDB.muitos('docs', pd); await IDB.muitos('fila', pf);
      Painel.atualizar();
      this.enviar();
      return muda.length;
    },
    marcar: function () {
      var self = this; this._sujo = true;
      clearTimeout(this._tReg); this._tReg = setTimeout(function () { self.registrar(); }, 800);
    },
    /* sobe a fila: novos em lotes (POST, sem sobrescrever), mudados um a um (PATCH com versao=eq. — trava otimista) */
    enviar: function () {
      var self = this;
      if (this._env) { this._denovo = true; return this._env; }
      this._env = (async function () {
        try { do { self._denovo = false; await self._enviar(); } while (self._denovo && navigator.onLine); }
        finally { self._env = null; Painel.atualizar(); }
      })();
      return this._env;
    },
    _enviar: async function () {
      if (!navigator.onLine || !Conta.on()) return;
      var self = this, tentativas = {};
      for (var volta = 0; volta < 50 && this.fila.size; volta++) {
        var novos = [], velhos = [];
        this.fila.forEach(function (f, k) {
          if (f.recusado) return;
          var d = self.docs.get(k) || {};
          if (d.versao == null) { if (f.cif) novos.push(k); } else velhos.push(k);
        });
        if (!novos.length && !velhos.length) break;
        try {
          for (var i = 0; i < novos.length; i += 200) await this.lote(novos.slice(i, i + 200), tentativas);
          for (var j = 0; j < velhos.length; j++) await this.um(velhos[j], tentativas);
        } catch (e) {
          if (e.status) console.warn('nuvem: envio', e.status, e.message);
          return;   /* sem internet ou sessão: tenta na próxima busca */
        }
      }
    },
    lote: async function (ks, tent) {
      var self = this, corpo = ks.map(function (k) { var c = k.indexOf('|'); return { grupo_id: self.gid, colecao: k.slice(0, c), id: k.slice(c + 1), dados_cifrado: self.fila.get(k).cif }; });
      var cifs = ks.map(function (k) { return self.fila.get(k).cif; });
      var rows;
      try { rows = await Conta.rest('POST', 'money_docs?on_conflict=grupo_id,colecao,id', corpo, 'return=representation,resolution=ignore-duplicates'); }
      catch (e) { if (e.status && e.status < 500 && e.status !== 401) { await this.recusar(ks, e); return; } throw e; }
      var veio = {}; (rows || []).forEach(function (r) { veio[r.colecao + '|' + r.id] = r; });
      for (var i = 0; i < ks.length; i++) {
        if (veio[ks[i]]) await this.ok(ks[i], veio[ks[i]], cifs[i]);
        else await this.conflito(ks[i], tent);   /* já existia no banco (outro aparelho criou o mesmo id) */
      }
    },
    um: async function (k, tent) {
      var f = this.fila.get(k), d = this.docs.get(k); if (!f || !d) return;
      var c = k.indexOf('|'), q = 'money_docs?grupo_id=eq.' + this.gid + '&colecao=eq.' + encodeURIComponent(k.slice(0, c)) + '&id=eq.' + encodeURIComponent(k.slice(c + 1)) + '&versao=eq.' + d.versao;
      var corpo = f.cif ? { dados_cifrado: f.cif, apagado_em: null } : { dados_cifrado: null, apagado_em: new Date().toISOString() };
      var rows;
      try { rows = await Conta.rest('PATCH', q, corpo, 'return=representation'); }
      catch (e) { if (e.status && e.status < 500 && e.status !== 401) { await this.recusar([k], e); return; } throw e; }
      if (rows && rows[0]) await this.ok(k, rows[0], f.cif);
      else await this.conflito(k, tent);
    },
    ok: async function (k, row, cifEnviado) {
      var d = { versao: row.versao, srv: cifEnviado, cif: cifEnviado }, f = this.fila.get(k);
      var aindaIgual = f && f.cif === cifEnviado;
      if (!aindaIgual && f) d.cif = f.cif;     /* mudou de novo enquanto subia: continua na fila, agora com a versão nova */
      this.docs.set(k, d); await IDB.set('docs', this.k(k), d);
      if (aindaIgual) { this.fila.delete(k); await IDB.del('fila', this.k(k)); }
    },
    recusar: async function (ks, e) {
      for (var i = 0; i < ks.length; i++) { var f = this.fila.get(ks[i]); if (f) { f.recusado = String((e && (e.code || e.status)) || 'erro'); await IDB.set('fila', this.k(ks[i]), f); } }
      this.recusados = 0; var self = this; this.fila.forEach(function (f) { if (f.recusado) self.recusados++; });
      console.warn('nuvem: o banco não aceitou', ks.length, e && e.message);
    },
    tentarDeNovo: async function () {
      var pf = [], self = this;
      this.fila.forEach(function (f, k) { if (f.recusado) { delete f.recusado; pf.push([self.k(k), f]); } });
      await IDB.muitos('fila', pf); this.recusados = 0; return this.enviar();
    },
    /* conflito: o banco tem uma versão que este aparelho não viu. Junta campo a campo (o que mudou aqui ganha) */
    conflito: async function (k, tent) {
      tent[k] = (tent[k] || 0) + 1; if (tent[k] > 3) return;
      var c = k.indexOf('|');
      var rows = await Conta.rest('GET', 'money_docs?grupo_id=eq.' + this.gid + '&colecao=eq.' + encodeURIComponent(k.slice(0, c)) + '&id=eq.' + encodeURIComponent(k.slice(c + 1)) + '&select=dados_cifrado,versao,apagado_em');
      var row = rows && rows[0], f = this.fila.get(k), d = this.docs.get(k) || {};
      if (!f) return;
      if (!row) { d.versao = null; this.docs.set(k, d); await IDB.set('docs', this.k(k), d); return; }   /* não existe: vai como novo */
      var deles = row.apagado_em ? null : await Cadeado.abrir(row.dados_cifrado);
      var base = d.srv ? await Cadeado.abrir(d.srv) : null;
      var meu = f.cif ? await Cadeado.abrir(f.cif) : null;
      var fim;   /* objeto final; null = apagado */
      if (!f.cif) fim = (!deles || (base && JSON.stringify(deles) === JSON.stringify(base))) ? null : deles;   /* apagado aqui; se mudou lá, fica o de lá */
      else if (!deles) fim = meu;                                                                                 /* apagado lá e mudado aqui: fica o daqui */
      else fim = juntar(base, meu, deles, c > 0 && k.slice(0, c) === 'config');
      var fimTxt = fim === null ? null : JSON.stringify(fim);
      var delesTxt = deles === null ? null : JSON.stringify(deles);
      if (fimTxt === delesTxt) {
        /* o resultado é o que já está no banco: aceita e mostra na tela */
        var nd = { versao: row.versao, srv: row.dados_cifrado || null, cif: row.dados_cifrado || null };
        this.docs.set(k, nd); await IDB.set('docs', this.k(k), nd);
        this.fila.delete(k); await IDB.del('fila', this.k(k));
        Nuvem.aplicar([[k, deles]]);
        return;
      }
      var cif = fimTxt === null ? null : await Cadeado.selar(fimTxt);
      var nd2 = { versao: row.versao, srv: row.dados_cifrado || null, cif: cif };
      this.docs.set(k, nd2); await IDB.set('docs', this.k(k), nd2);
      var nf = { cif: cif, t: Date.now() }; this.fila.set(k, nf); await IDB.set('fila', this.k(k), nf);
      if (fimTxt !== (meu === null ? null : JSON.stringify(meu))) Nuvem.aplicar([[k, fim]]);
      await this.um(k, tent);
    },
    /* busca o que mudou no banco desde a última vez (folga de 2 min) */
    buscar: async function () {
      if (!navigator.onLine || !Conta.on()) return [];
      var desde = this.cursor ? new Date(Date.parse(this.cursor) - 120000).toISOString() : '';
      var mudou = [], pd = [], maior = this.cursor, self = this;
      for (var off = 0; ; off += 1000) {
        var q = 'money_docs?grupo_id=eq.' + this.gid + '&select=colecao,id,dados_cifrado,versao,atualizado_em,apagado_em&order=atualizado_em.asc,colecao.asc,id.asc&limit=1000&offset=' + off +
          (desde ? '&atualizado_em=gte.' + encodeURIComponent(desde) : '');
        var rows = await Conta.rest('GET', q);
        (rows || []).forEach(function (r) {
          var k = r.colecao + '|' + r.id, d = self.docs.get(k);
          if (!maior || r.atualizado_em > maior) maior = r.atualizado_em;
          if (d && d.versao != null && d.versao >= r.versao) return;
          if (self.fila.has(k)) return;   /* mudou aqui também: a trava otimista resolve no envio */
          var nd = { versao: r.versao, srv: r.apagado_em ? null : r.dados_cifrado, cif: r.apagado_em ? null : r.dados_cifrado };
          self.docs.set(k, nd); pd.push([self.k(k), nd]); mudou.push([k, nd.cif]);
        });
        if (!rows || rows.length < 1000) break;
      }
      await IDB.muitos('docs', pd);
      if (maior && maior !== this.cursor) { this.cursor = maior; await IDB.set('kv', 'cursor|' + this.gid, maior); }
      return mudou;
    },
    apagarFamilia: async function (gid) {
      await IDB.apagarPrefixo('docs', gid + '|'); await IDB.apagarPrefixo('fila', gid + '|'); await IDB.del('kv', 'cursor|' + gid);
    }
  };
  /* junta três versões campo a campo: base (a que este aparelho viu), meu, deles. O campo que mudou aqui ganha. */
  function juntar(base, meu, deles, ehConfig) {
    if (ehConfig) { if (!meu || !deles || typeof meu.v !== 'object' || typeof deles.v !== 'object' || Array.isArray(meu.v) || !meu.v || !deles.v) return meu; return { v: juntar(base ? base.v : null, meu.v, deles.v, false) }; }
    if (!meu || typeof meu !== 'object' || !deles || typeof deles !== 'object') return meu;
    var r = Object.assign({}, deles), b = base || {}, ks = {};
    Object.keys(meu).concat(Object.keys(b)).forEach(function (x) { ks[x] = 1; });
    Object.keys(ks).forEach(function (x) {
      if (JSON.stringify(meu[x]) !== JSON.stringify(b[x])) { if (x in meu) r[x] = meu[x]; else delete r[x]; }
    });
    return r;
  }

  /* ---------------- Caixa do robô (money_entrada) ---------------- */
  var Caixa = {
    ligada: null, sk: null, kid: '', erros: new Set(), ultimos: null,
    /* transforma o lançamento do robô no formato do BudgetONE. null = não vira lançamento (transferência, fatura) */
    /* 1.11.0: só estes tipos viram lançamento; 'saldo' vai para a conferência; qualquer outro é ignorado (e anotado), nunca vira gasto */
    TIPOS: { '': 1, despesa: 1, receita: 1, transferencia: 1, fatura: 1, saldo: 1, investimento: 1 },
    desconhecidos: [],
    irDe: function (ir) {
      if (ir === true) return true;
      var t = String(ir == null ? '' : ir).trim();
      return /^irpf/i.test(t) || /^(s|sim|y|yes|1|true)$/i.test(t);
    },
    converter: function (l) {
      if (!l || typeof l !== 'object' || !l.id) throw new Error('sem id');
      var tipo = String(l.tipo || '').toLowerCase();
      if (tipo === 'transferencia' || tipo === 'fatura' || tipo === 'saldo' || tipo === 'investimento' || !this.TIPOS[tipo]) return null;
      var valor = Number(l.valor); if (!isFinite(valor) || valor === 0) throw new Error('valor');
      var G = typeof GRUPOS !== 'undefined' ? GRUPOS : {}, grupoRobo = String(l.grupo || '').toUpperCase().trim();
      var g = {
        id: 'rb_' + String(l.id).replace(/[^A-Za-z0-9_.:@-]/g, '_').slice(0, 70),
        data: /^\d{4}-\d{2}-\d{2}$/.test(String(l.data || '')) ? l.data : '',
        valor: Math.abs(valor),
        grupo: G[grupoRobo] ? grupoRobo : 'OUTROS',
        sub: String(l.categoria || '').trim(),
        desc: String(l.descricao || '').trim(),
        quem: String(l.quem || '').trim(),
        forma: String(l.forma || '').trim(),
        conta: String(l.banco || '').trim(),
        /* 1.11.0: o robô manda "IRPF", "IRPF (saúde…)"; antes só "sim" valia e nada chegava marcado para o IR */
        irpf: this.irDe(l.ir),
        per: typeof PERIODICIDADES !== 'undefined' && PERIODICIDADES[l.freq] ? l.freq : 'Pontual',
        origem: 'robo',
        origemRobo: String(l.origem || '').slice(0, 40),
        idRobo: String(l.id)
      };
      if (l.cat_pluggy) g.catPluggy = String(l.cat_pluggy).slice(0, 80);
      var irT = String(l.ir == null || l.ir === true ? '' : l.ir).trim();
      if (irT && !/^(s|sim|y|yes|1|true|n|nao|não|no|0|false)$/i.test(irT)) g.irTexto = irT.slice(0, 120);   /* a anotação do IR do robô */
      if (g.desc) g.descRobo = g.desc.slice(0, 160);                                    /* o texto original do extrato (regra do espelho) */
      if (l.conta) g.contaRobo = String(l.conta).trim().slice(0, 80);                   /* a conta do banco (conferência do saldo) */
      if (l.para_quem) g.paraQuem = String(l.para_quem).trim().slice(0, 80);
      /* 1.12.0: a outra parte (contraparte): CNPJ, id_pessoa (o CPF virou HMAC no robô; nunca aparece na tela), nome no banco,
         meio e MCC. Reconhece contato/profissional nessa ordem (modulos/contraparte.js); MCC só vira palpite de categoria */
      if (l.contraparte && typeof l.contraparte === 'object') {
        var cp = l.contraparte, cpo = {};
        if (/^\d{14}$/.test(String(cp.cnpj || ''))) cpo.cnpj = String(cp.cnpj);
        if (/^[0-9a-f]{24}$/i.test(String(cp.id_pessoa || ''))) cpo.idp = String(cp.id_pessoa).toLowerCase();
        if (cp.nome) cpo.nome = String(cp.nome).trim().slice(0, 80);
        if (/^(PIX|TED|BOLETO|DEBIT|TEF|OTHER)$/.test(String(cp.meio || ''))) cpo.meio = String(cp.meio);
        if (/^\d{4}$/.test(String(cp.mcc || ''))) cpo.mcc = String(cp.mcc);
        if (Object.keys(cpo).length) g.contraparte = cpo;
      }
      var conf = String(l.confianca || '').toLowerCase();
      if (conf === 'palpite' || conf === 'desconhecido') g.confianca = conf;            /* sem o campo = dado antigo, não é palpite */
      if (tipo === 'receita') g.grupo = 'RENDA';
      /* 3.39 (N24): Renda · Rescisão e Renda · FGTS (separado) */
      if (g.grupo === 'RENDA' && valor > 0) {
        var txt = (g.sub + ' ' + g.desc + ' ' + String(l.cat_pluggy || ''));
        if (/\bfgts\b/i.test(txt)) g.sub = 'FGTS';
        else if (/rescis/i.test(txt)) g.sub = 'Rescisão';
      }
      else if (tipo === 'despesa' && g.grupo === 'RENDA') g.grupo = 'OUTROS';
      /* 1.11.0: estorno (valor negativo) = lançamento NEGATIVO na categoria do gasto de origem, na data em que aconteceu;
         abate o "Para onde foi" e não conta como renda */
      if (valor < 0) this.estornar(g);
      if (g.grupo === 'OUTROS') g.revisar = true;
      /* cartão: pelo final */
      /* 1.12.0: cartão pela conta do cartão e pelos finais (modulos/cartoes.js); antes procurava c.final, mas o app guarda c.fim */
      if (window.Cartoes) Cartoes.doRobo(l, g);
      else { var fim = String(l.final || '').replace(/\D/g, '').slice(-4); if (fim) { var ca = (Store.estado.cartoes || []).find(function (c) { return String(c.fim || '').replace(/\D/g, '').slice(-4) === fim; }); if (ca) g.cartaoId = ca.id; } }
      if (l.cartao) g.cartaoNome = String(l.cartao).slice(0, 60);
      try { if (g.forma && typeof Banco !== 'undefined' && Banco.formaDoTextoAntigo) g.formaId = Banco.formaDoTextoAntigo(g.forma); } catch (e) {}
      /* 1.12.0: o "Debito" do robô é débito NA CONTA (Pix, boleto, encargos), não cartão de débito; o meio da contraparte diz qual */
      if (/^d[eé]bito$/i.test(g.forma) && !g.finalCartao) {
        var meio = (g.contraparte || {}).meio, mf = { PIX: ['pix', 'Pix'], TED: ['transf', 'TED'], TEF: ['transf', 'TEF'], BOLETO: ['boleto', 'Boleto'] }[meio];
        g.formaId = mf ? mf[0] : 'debconta'; g.forma = mf ? mf[1] : 'Débito em conta';
      }
      if (window.Pessoas) Pessoas.ligarTudo(g);   /* "Neco" → a pessoa do cadastro (o mesmo nome que o lançamento guardado tem) */
      if (window.Contraparte) Contraparte.aplicar(g);   /* 1.12.0: contato/profissional pelo CNPJ → id_pessoa → nome; MCC = palpite */
      return g;
    },
    andamento: function (mais) {
      if (typeof Fundo === 'undefined' || !Fundo.mostrar) return;
      if (mais === null) { this._seq = null; Fundo.esconder('caixa'); return; }
      var q = this._seq; if (!q) return;
      q.feitos += mais; if (q.feitos > q.total) q.total = q.feitos;
      if (q.feitos % 10 && q.feitos !== q.total) return;   /* a cada 10, para não redesenhar à toa */
      var f = function (n) { return Number(n).toLocaleString(tt('pt-BR', 'en-US')); };
      Fundo.mostrar('caixa', q.feitos / q.total, tt('Caixa do robô: ', 'Robot inbox: ') + f(q.feitos) + tt(' de ', ' of ') + f(q.total));
    },
    marcarConfianca: function (at, g) {
      if (!at || !g || !g.confianca || at.editadoPessoa || at.confirmadoEm || at.confianca === g.confianca) return false;
      at.confianca = g.confianca; at.revisar = true; return true;
    },
    idDe: function (l) { return 'rb_' + String(l.id).replace(/[^A-Za-z0-9_.:@-]/g, '_').slice(0, 70); },
    /* sem edição da pessoa: sai do livro (vira só a movimentação entre contas, que não conta no "Para onde foi");
       editado pela pessoa: fica, com a sugestão em Revisar ("o robô diz que isto é transferência") */
    virouTransferencia: function (ja, tp) {
      if (!ja || ja.fluxo === 'entrada' && tp === 'fatura') return '';
      if (ja.editadoPessoa) {
        if (ja.roboSugeriu && ja.roboSugeriu.tipo === tp) return '';
        ja.roboSugeriu = { tipo: tp }; ja.revisar = true; return 'sugerido';
      }
      Gasto.excluir(ja.id); Gasto._idx = null;
      return 'removido';
    },
    /* acha o gasto de origem: mesma descrição e mesmo valor (ou maior, estorno parcial) nos 120 dias antes */
    origemDoEstorno: function (g, lista) {
      var alvo = Math.abs(g.valor), d0 = g.data ? new Date(Date.parse(g.data) - 120 * 86400000).toISOString().slice(0, 10) : '';
      var norm = function (t) { return window.Profissionais ? Profissionais.norm(t) : String(t || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean); };
      var w = norm(String(g.desc || '').replace(/^↩\s*/, '')), melhor = null;
      if (!w.length) return null;
      (lista || Store.estado.gastos || []).forEach(function (o) {
        if (o.id === g.id || o.estorno || o.fluxo === 'entrada' || !(Number(o.valor) > 0) || Number(o.valor) + 0.005 < alvo) return;
        if (g.data && o.data && (o.data > g.data || o.data < d0)) return;
        var nota = window.Profissionais ? Profissionais.parecido(w, norm(o.descRobo || o.desc)) : (norm(o.descRobo || o.desc).join(' ') === w.join(' ') ? 1 : 0);
        if (nota < 0.6) return;
        var pontos = nota + (Math.abs(Number(o.valor) - alvo) < 0.005 ? 1 : 0) + (o.data || '') / 1e9;
        if (!melhor || pontos > melhor.pontos) melhor = { o: o, pontos: pontos };
      });
      return melhor ? melhor.o : null;
    },
    estornar: function (g, lista) {
      g.estorno = true; g.valor = -Math.abs(g.valor);
      var o = this.origemDoEstorno(g, lista);
      if (o) { g.grupo = o.grupo; g.sub = o.sub; g.estornoDe = o.id; if (o.paraQuem && !g.paraQuem) g.paraQuem = o.paraQuem; if (o.irpf) g.irpf = true; }
      else if (g.grupo === 'RENDA' || !g.grupo) { g.grupo = 'OUTROS'; g.revisar = true; }   /* sem origem: a categoria que o robô mandou */
      if (!/^↩/.test(g.desc)) g.desc = '↩ ' + g.desc;
      return g;
    },
    /* os estornos de antes (viravam Renda · Estorno) que a pessoa não editou: uma vez */
    migrarEstornos: function () {
      var ST = Store.estado, cfg = (ST.config = ST.config || {}); if (cfg.estornosV) return 0;
      var n = 0, self = this;
      (ST.gastos || []).forEach(function (g) {
        if (g.origem !== 'robo' || g.editadoPessoa || g.estorno || g.grupo !== 'RENDA' || !/^↩/.test(String(g.desc || ''))) return;
        var resto = String(g.desc).replace(/^↩\s*(Estorno|Refund)\s*·?\s*/i, '');
        var x = Object.assign({}, g, { desc: resto, grupo: 'OUTROS', sub: '' });
        self.estornar(x, ST.gastos);
        if (!x.estornoDe) { x.sub = 'Estorno'; }
        Gasto.atualizar(g.id, { estorno: true, valor: x.valor, grupo: x.grupo, sub: x.sub, desc: x.desc, estornoDe: x.estornoDe || undefined, revisar: !x.estornoDe });
        n++;
      });
      cfg.estornosV = 1;
      return n;
    },
    /* o robô mandou de novo um lançamento que já existe (correção).
       A pessoa não mexeu nele: atualiza. A pessoa editou: a edição dela vence; guarda o que o robô
       sugeriu (roboSugeriu) e marca para conferir, para ela decidir. Devolve 'corrigido', 'sugerido' ou ''. */
    CAMPOS_ROBO: ['data', 'valor', 'grupo', 'sub', 'desc', 'quem', 'forma', 'conta', 'irpf', 'per', 'cartaoId', 'cartaoNome', 'formaId', 'catPluggy', 'origemRobo', 'irTexto', 'estorno', 'finalCartao', 'contaCartao', 'contraparte'],
    corrigir: function (ja, g) {
      var muda = {}, n = 0;
      if (g.paraQuem && g.paraQuem !== ja.paraQuem) { muda.paraQuem = g.paraQuem; n++; }   /* "para_quem" só quando o robô manda */
      this.CAMPOS_ROBO.forEach(function (k) {
        var a = ja[k] == null ? '' : ja[k], b = g[k] == null ? '' : g[k];
        if (JSON.stringify(a) !== JSON.stringify(b)) { muda[k] = g[k]; n++; }
      });
      if (!n) { if (ja.roboSugeriu) { delete ja.roboSugeriu; return 'corrigido'; } return ''; }
      if (ja.editadoPessoa) {
        var antes = JSON.stringify(ja.roboSugeriu || null);
        ja.roboSugeriu = muda; ja.revisar = true;
        return antes === JSON.stringify(muda) ? '' : 'sugerido';
      }
      Gasto.atualizar(ja.id, Object.assign({}, muda, { revisar: !!(ja.revisar || g.revisar), corrigidoRoboEm: new Date().toISOString() }));
      return 'corrigido';
    },
    /* a chave da caixa: lê a pública; a privada está no money_docs (config/caixa_robo), fechada com a CF */
    preparar: async function () {
      var rows;
      try { rows = await Conta.rest('GET', 'money_caixa_chave?grupo_id=eq.' + Sinc.gid + '&select=chave_publica'); }
      catch (e) { if (e.status === 404 || /money_caixa_chave|schema cache|PGRST20/i.test(e.message + ' ' + e.code)) { this.ligada = false; return false; } throw e; }
      this.ligada = true;
      var pub = rows && rows[0] && rows[0].chave_publica;
      var d = Sinc.docs.get('config|caixa_robo'), priv = d && d.cif ? await Cadeado.abrir(d.cif) : null;
      if (pub && priv && priv.kid === pub.kid) { if (!this.sk || this.kid !== priv.kid) { this.sk = await Cifra.importarSk(unb64(priv.pkcs8)); this.kid = priv.kid; } return true; }
      if (pub && !priv) { this.problema = 'semsecreta'; return false; }          /* a parte secreta não chegou aqui: não troca sozinho */
      if (pub && priv && priv.kid !== pub.kid) { this.problema = 'diferente'; return false; }
      /* não há chave da caixa: cria agora (a parte secreta primeiro, para nunca ficar só a pública) */
      if (!priv) {
        var par = await Cifra.novoParCaixa();
        priv = { v: 1, kid: par.pub.kid, pub: par.pub, pkcs8: b64(par.pkcs8), criado: new Date().toISOString() }; par.pkcs8.fill(0);
        var cif = await Cadeado.selar(JSON.stringify(priv)), r;
        try { r = await Conta.rest('POST', 'money_docs', { grupo_id: Sinc.gid, colecao: 'config', id: 'caixa_robo', dados_cifrado: cif }, 'return=representation'); }
        catch (e) { if (e.status === 409) { await Nuvem.buscarAgora(); return this.preparar(); } throw e; }
        var nd = { versao: r[0].versao, srv: cif, cif: cif }; Sinc.docs.set('config|caixa_robo', nd); await IDB.set('docs', Sinc.k('config|caixa_robo'), nd);
      }
      await Conta.rest('POST', 'money_caixa_chave?on_conflict=grupo_id', { grupo_id: Sinc.gid, chave_publica: priv.pub }, 'resolution=merge-duplicates,return=minimal');
      this.sk = await Cifra.importarSk(unb64(priv.pkcs8)); this.kid = priv.kid; this.problema = '';
      return true;
    },
    /* esvazia a caixa: abre, vira lançamento, grava fechado no money_docs e só então marca como aproveitado */
    esvaziar: async function () {
      if (this._rodando || !navigator.onLine || !Nuvem.iniciado || !Cadeado.aberto()) return;
      this._rodando = true;
      try {
        if (!(await this.preparar())) return;
        if (this.migrarEstornos()) Store.salvar();   /* 1.11.0: uma vez */
        var rows = await Conta.rest('GET', 'money_entrada?grupo_id=eq.' + Sinc.gid + '&consumido_em=is.null&select=id,pacote,origem&order=criado_em.asc&limit=200');
        if (!rows || !rows.length) { this.andamento(null); return; }
        /* 1.12.0: a barra de andamento global ("Caixa do robô: x de N"); com lote cheio, conta quantos esperam */
        if (!this._seq) {
          var total = rows.length;
          if (rows.length === 200) { try { total = ((await Conta.rest('GET', 'money_entrada?grupo_id=eq.' + Sinc.gid + '&consumido_em=is.null&select=id&limit=50000')) || []).length || 200; } catch (e) { total = 200; } }
          this._seq = { total: total, feitos: 0 };
        }
        var ST = Store.estado, ids = {}, novos = 0, ignorados = 0, corrigidos = 0, sugeridos = 0, transf = 0, prontos = [], mudou = false;
        (ST.gastos || []).forEach(function (g) { ids[g.id] = g; if (g.idRobo) ids['rb_' + g.idRobo] = g; });
        for (var i = 0; i < rows.length; i++) {
          var l;
          try { l = await Cifra.abrirPacote(this.sk, rows[i].pacote); } catch (e) { this.erros.add(rows[i].id); continue; }   /* não abre com esta chave: fica na caixa */
          var tp = l ? String(l.tipo || '').toLowerCase() : '';
          if (tp === 'saldo' || tp === 'investimento') {   /* a conferência com o banco (1.11.0) e os investimentos (1.12.0); nunca viram lançamento */
            if (window.SaldoBanco && (tp === 'saldo' ? SaldoBanco.receber(l) : SaldoBanco.receberInvest(l))) mudou = true; else ignorados++;
            prontos.push(rows[i].id); continue;
          }
          if (l && !this.TIPOS[tp]) {              /* tipo que este app não conhece: anota e deixa de lado */
            this.desconhecidos.push({ tipo: tp.slice(0, 30), id: String(l.id || '').slice(0, 80), em: new Date().toISOString() });
            if (this.desconhecidos.length > 50) this.desconhecidos.shift();
            console.warn('nuvem: caixa do robô — tipo desconhecido ignorado:', tp);
            ignorados++; prontos.push(rows[i].id); continue;
          }
          /* 1.11.0: um gasto já entregue que o robô agora diz ser transferência ou fatura: não conta em dobro */
          if (l && (tp === 'transferencia' || tp === 'fatura') && ids[this.idDe(l)]) {
            var rv = this.virouTransferencia(ids[this.idDe(l)], tp);
            if (rv === 'removido') { delete ids[this.idDe(l)]; corrigidos++; mudou = true; } else if (rv === 'sugerido') { sugeridos++; mudou = true; }
          }
          if (l && tp === 'transferencia' && typeof Transferencia !== 'undefined') {
            var rt = Transferencia.receber(l, true); if (rt) { mudou = true; transf++; } else ignorados++;
            prontos.push(rows[i].id); continue;
          }
          var g; try { g = this.converter(l); } catch (e) { this.erros.add(rows[i].id); continue; }
          if (g === null) { ignorados++; prontos.push(rows[i].id); continue; }
          var ja = ids[g.id];
          if (!ja) { if (g.confianca) g.revisar = true; ids[g.id] = Gasto.add(g); novos++; }   /* palpite só marca para conferir quando é NOVO */
          else {                                  /* 3.39 (N24): o robô corrigiu um lançamento que já existe */
            var r = this.corrigir(ja, g);
            if (r === 'corrigido') corrigidos++; else if (r === 'sugerido') sugeridos++;
            if (r) mudou = true;
            /* 1.12.0: o já existente que a pessoa nunca tocou nem confirmou também ganha a confiança do robô ("A confirmar") */
            var at = Gasto.todos().find(function (x) { return x.id === ja.id; }) || ja;
            if (this.marcarConfianca(at, g)) { mudou = true; ids[g.id] = at; }
          }
          prontos.push(rows[i].id);
          this.andamento(1);
        }
        if ((novos || transf) && typeof Transferencia !== 'undefined' && Transferencia.todas().length) Transferencia.ligarTudo();   /* uma vez por lote (3.40) */
        if (novos || mudou) { Store.salvar(); }
        await Sinc.registrar(); await Sinc.enviar();
        /* só marca o que já está guardado no banco */
        var pend = false; Sinc.fila.forEach(function (f, k) { if (k.indexOf('gastos|rb_') === 0 || k.indexOf('transferencias|tf_') === 0) pend = true; });
        if (pend || !prontos.length) return;
        await Conta.rpc('money_entrada_consumir', { p_grupo: Sinc.gid, p_ids: prontos });
        this.ultimos = { quando: Date.now(), novos: novos, ignorados: ignorados };
        this.ultimos.corrigidos = corrigidos; this.ultimos.sugeridos = sugeridos; this.ultimos.transferencias = transf;
        if (novos) { aviso('🤖 ' + novos + tt(' lançamento(s) novo(s) chegaram do robô.', ' new entr(ies) arrived from the robot.')); }
        if (corrigidos) aviso('🤖 ' + corrigidos + tt(' lançamento(s) corrigido(s) pelo robô.', ' entr(ies) corrected by the robot.'));
        if (sugeridos) aviso('🤖 ' + sugeridos + tt(' lançamento(s) que você editou: o robô sugeriu outra coisa (veja em Custos → Revisar).', ' entr(ies) you edited: the robot suggested something else (see Costs → Review).'));
        if (novos || mudou) Nuvem.redesenhar();
        if (rows.length === 200) setTimeout(function () { Caixa.esvaziar(); }, 1500);
        else this.andamento(null);
      } catch (e) { console.warn('nuvem: caixa do robô', e); this.andamento(null); }
      finally { this._rodando = false; Painel.atualizar(); }
    }
  };


  /* ---------------- 1.11.0: planilha espelho (o app manda as edições da pessoa para o robô) ----------------
     Contrato v1 (supabase/2026-11-11b-moneytrio-espelho.sql; vetor em teste/espelho/vetor-espelho.json):
       ECDH P-256 efêmero × a chave pública do robô (money_espelho_chave_de) → 32 bytes → HKDF-SHA256 (sal 32 zeros,
       info "money-espelho-v1|" + grupo) → AES-256-GCM (iv 12 bytes, AAD = grupo); {"v":1,"epk":{x,y},"iv","ct"}.
     A fila fica no IndexedDB FECHADA com a chave da família (nada de finanças em claro); um registro por lançamento
     (a última edição vale). Vai em lotes de até 200 quando há internet. Sem permissão (não é chefe nem responsável)
     ou sem a chave do robô: a fila espera, sem insistir. */
  var Espelho = {
    ligado: null, problema: '', enviados: 0, _rodando: false,
    k: function () { return 'espelho|' + Sinc.gid; },
    fila: async function () { return (await IDB.get('kv', this.k()).catch(function () { return null; })) || []; },
    pendentes: async function () { return Sinc.gid ? (await this.fila()).length : 0; },
    /* texto aberto → pacote fechado para o robô (opt.efemera = JWK com d, opt.iv = 12 bytes: só para o teste do vetor) */
    selar: async function (texto, jwkRobo, gid, opt) {
      opt = opt || {};
      var pub = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwkRobo.x, y: jwkRobo.y, ext: true }, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
      var ef = opt.efemera
        ? { privateKey: await crypto.subtle.importKey('jwk', Object.assign({ kty: 'EC', crv: 'P-256', ext: true }, opt.efemera), { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']),
            pub: { x: opt.efemera.x, y: opt.efemera.y } }
        : await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
      if (!ef.pub) { var j = await crypto.subtle.exportKey('jwk', ef.publicKey); ef.pub = { x: j.x, y: j.y }; }
      var seg = await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, ef.privateKey, 256);
      var base = await crypto.subtle.importKey('raw', seg, 'HKDF', false, ['deriveKey']);
      var chave = await crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: utf8('money-espelho-v1|' + gid) }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
      var iv = opt.iv || crypto.getRandomValues(new Uint8Array(12));
      var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: utf8(gid) }, chave, utf8(texto));
      return JSON.stringify({ v: 1, epk: { x: ef.pub.x, y: ef.pub.y }, iv: b64(iv), ct: b64(ct) });
    },
    /* guarda a edição (fechada com a CF) e tenta mandar */
    enfileirar: async function (obj) {
      if (!Sinc.gid || !Cadeado.aberto() || !obj || !obj.id) return false;
      var f = await this.fila(), cif = await Cadeado.selar(JSON.stringify(obj));
      f = f.filter(function (x) { return x.id !== obj.id; }); f.push({ id: obj.id, cif: cif });
      await IDB.set('kv', this.k(), f);
      var self = this; setTimeout(function () { self.enviar(); }, 0);
      return true;
    },
    enviar: async function () {
      if (this._rodando || !navigator.onLine || !Sinc.gid || !Conta.on() || !Cadeado.aberto()) return 0;
      this._rodando = true;
      try {
        var f = await this.fila(); if (!f.length) return 0;
        if (typeof Fundo !== 'undefined' && Fundo.mostrar) Fundo.mostrar('espelho', null, tt('Mandando as edições para a planilha', 'Sending edits to the spreadsheet'));
        var jwk;
        try { jwk = await Conta.rpc('money_espelho_chave_de', { p_grupo: Sinc.gid }); }
        catch (e) {
          if (e.status === 404 || /schema cache|PGRST20/i.test(e.message + ' ' + e.code)) { this.ligado = false; this.problema = 'semsql'; return 0; }
          if (e.code === '42501' || e.status === 403) { this.problema = 'sempermissao'; return 0; }
          throw e;
        }
        this.ligado = true;
        if (!jwk || !jwk.x) { this.problema = 'semchave'; return 0; }   /* o robô ainda não publicou a chave dele */
        var n = 0;
        while (f.length) {
          var lote = f.slice(0, 200), pacotes = [], ids = [];
          for (var i = 0; i < lote.length; i++) {
            var aberto = await Cadeado.abrir(lote[i].cif);
            if (aberto) { pacotes.push(await this.selar(JSON.stringify(aberto), jwk, Sinc.gid)); }
            ids.push(lote[i].id);
          }
          if (pacotes.length) {
            try { await Conta.rpc('money_espelho_depositar', { p_grupo: Sinc.gid, p_pacotes: pacotes }); }
            catch (e) { if (e.code === '42501' || e.status === 403) { this.problema = 'sempermissao'; break; } throw e; }
          }
          n += pacotes.length;
          var atual = await this.fila();                      /* o que mudou enquanto mandava fica para a próxima */
          var mandados = {}; lote.forEach(function (x) { mandados[x.id] = x.cif; });
          f = atual.filter(function (x) { return mandados[x.id] !== x.cif; });
          await IDB.set('kv', this.k(), f);
        }
        if (n) { this.problema = ''; this.enviados += n; }
        return n;
      } catch (e) { console.warn('nuvem: espelho', e); return 0; }
      finally { this._rodando = false; if (typeof Fundo !== 'undefined' && Fundo.esconder) Fundo.esconder('espelho'); }
    }
  };

  /* ---------------- telas (portão de entrada e painel) ---------------- */
  /* o "G" colorido oficial do Google (o mesmo do RootifyONE, RF.h.iconeLogin('google')) */
  var G_GOOGLE = '<svg class="nv-g" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
    '<path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>' +
    '<path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>' +
    '<path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>' +
    '<path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>';
  var CSS = '' +
    '.nv-portao{position:fixed;inset:0;z-index:99990;overscroll-behavior:contain;background:var(--bg,#0b0f14);color:var(--txt,#e7edf5);overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:24px 16px;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
    '.nv-card{width:100%;max-width:440px;background:var(--card,#151c26);border:1px solid var(--line,#243040);border-radius:16px;padding:20px;box-sizing:border-box;margin-top:4vh}' +
    '.nv-card h1{font-size:1.25rem;margin:0 0 6px}.nv-card h2{font-size:1.05rem;margin:14px 0 6px}' +
    '.nv-card p{margin:8px 0}.nv-muted{color:var(--txt2,#9fb0c4);font-size:.92rem}.nv-tiny{color:var(--txt3,#6f8299);font-size:.82rem}' +
    '.nv-fld{display:block;margin:10px 0}.nv-fld span{display:block;font-size:.88rem;color:var(--txt2,#9fb0c4);margin-bottom:4px}' +
    '.nv-fld input{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid var(--line2,#2e3c4f);background:var(--bg2,#121821);color:inherit;font-size:16px}' +
    '.nv-btn{display:block;width:100%;box-sizing:border-box;margin:8px 0;padding:12px 14px;border-radius:10px;border:1px solid var(--line2,#2e3c4f);background:var(--card2,#1b2430);color:inherit;font-size:15px;cursor:pointer;text-align:center}' +
    '.nv-btn.pri{background:var(--accent,#3ddc97);border-color:var(--accent,#3ddc97);color:#06281a;font-weight:600}' +
    '.nv-btn.google{background:#fff;color:#1f1f1f;border-color:#747775;font-weight:600;display:flex;align-items:center;justify-content:center;gap:10px;min-height:48px}.nv-btn.google:hover{background:#f6f8fc}.nv-g{width:20px;height:20px;flex:none}' +
    '.nv-ou{display:flex;align-items:center;gap:10px;color:var(--txt3,#6f8299);font-size:.85rem;margin:12px 0 4px}.nv-ou:before,.nv-ou:after{content:"";flex:1;border-top:1px solid var(--line,#243040)}' +
    '.nv-btn:disabled{opacity:.6;cursor:wait}.nv-lnk{background:none;border:0;color:var(--accent2,#2bb3ff);cursor:pointer;padding:6px 0;font-size:.9rem}' +
    '.nv-nota{border-radius:10px;padding:10px 12px;margin:10px 0;font-size:.92rem;background:var(--bg2,#121821);border:1px solid var(--line,#243040)}' +
    '.nv-nota.info{border-color:var(--accent2,#2bb3ff)}.nv-nota.atencao{border-color:var(--warn,#ffb84d)}.nv-nota.erro{border-color:var(--down,#ff6b6b);color:var(--down,#ff6b6b)}.nv-nota.ok{border-color:var(--accent,#3ddc97)}' +
    '.nv-pinc{-webkit-text-security:disc;text-security:disc;letter-spacing:.2em}' +
    '.nv-hidden{display:none!important}.nv-row{display:flex;gap:8px;flex-wrap:wrap}.nv-row .nv-btn{flex:1 1 140px}' +
    '.nv-sas{font:700 2.2rem/1.2 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.12em;text-align:center;margin:12px 0;padding:10px;border-radius:12px;background:var(--card2,#1b2430);border:1px solid var(--line2,#2e3c4f)}' +
    '.nv-pedido{position:fixed;left:50%;transform:translateX(-50%);top:12px;z-index:99980;display:flex;align-items:center;gap:8px;flex-wrap:wrap;max-width:calc(100vw - 24px);padding:10px 12px;border-radius:12px;background:var(--card,#151c26);border:1px solid var(--warn,#ffb84d);color:var(--txt,#e7edf5);font:14px system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.35)}' +
    '.nv-pedido span{flex:1 1 220px}.nv-pedido .nv-btn{width:auto;margin:0}' +
    '.nv-selo{position:fixed;left:12px;bottom:84px;z-index:9990;border-radius:999px;padding:8px 12px;background:var(--card,#151c26);border:1px solid var(--line2,#2e3c4f);color:var(--txt,#e7edf5);font:13px system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25);max-width:calc(100vw - 24px)}' +
    '@media(min-width:900px){.nv-selo{bottom:16px}}' +
    '.nv-aviso{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:99995;background:var(--card2,#1b2430);color:var(--txt,#e7edf5);border:1px solid var(--line2,#2e3c4f);border-radius:12px;padding:10px 14px;max-width:calc(100vw - 32px);display:none;font:14px system-ui,sans-serif}.nv-aviso.on{display:block}' +
    '.nv-painel{position:fixed;inset:0;z-index:99980;overscroll-behavior:contain;background:rgba(0,0,0,.55);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 16px}' +
    '.nv-aviso.alto{z-index:2147483000}.nv-nota.fixa{position:relative;padding-right:36px}.nv-x{position:absolute;top:6px;right:6px;background:none;border:0;color:inherit;font-size:16px;cursor:pointer;padding:4px 8px}.nv-sub{font-size:.95rem;margin:10px 0 4px}' +
    '.nv-lista button{margin:6px 0}.nv-cod{font-family:ui-monospace,monospace;letter-spacing:.04em}';

  var Tela = {
    el: null,
    montar: function () {
      if (!document.getElementById('nvCss')) { var s = document.createElement('style'); s.id = 'nvCss'; s.textContent = CSS; document.head.appendChild(s); }
      if (!document.getElementById('nvAviso')) { var a = document.createElement('div'); a.id = 'nvAviso'; a.className = 'nv-aviso'; a.setAttribute('role', 'status'); document.body.appendChild(a); }
      if (!this.el) { this.el = document.createElement('div'); this.el.className = 'nv-portao'; this.el.id = 'nvPortao'; document.body.appendChild(this.el); }
      return this.el;
    },
    mostrar: function (html) {
      var el = this.montar();
      el.innerHTML = '<div class="nv-card" role="dialog" aria-modal="true">' + html + '</div>';
      var f = el.querySelector('input'); if (f) setTimeout(function () { try { if (!el.contains(document.activeElement)) f.focus(); } catch (e) {} }, 60);   /* não rouba o cursor de quem já está num campo */
      return el;
    },
    fechar: function () { if (this.el) { this.el.remove(); this.el = null; } },
    q: function (s) { return this.el ? this.el.querySelector(s) : null; },
    erro: function (txt, id) { var e = this.q(id || '#nvErro'); if (e) { e.textContent = txt || ''; e.classList.toggle('nv-hidden', !txt); } },
    ocupar: async function (botao, fn) {
      var h = botao.innerHTML; botao.disabled = true; botao.innerHTML = '⏳ ' + tt('Aguarde…', 'Please wait…');
      try { await fn(); } catch (e) { Tela.erro(Conta.explicar(e)); } finally { if (botao.isConnected) { botao.disabled = false; botao.innerHTML = h; } }
    },
    topo: function () {
      return '<h1>☁️ MoneyTRIO</h1>';
    }
  };

  /* ---------------- painel (depois de entrar) ---------------- */
  var Painel = {
    selo: null,
    montar: function () {
      if (this.selo) return;
      this.selo = document.createElement('button'); this.selo.className = 'nv-selo'; this.selo.id = 'nvSelo'; this.selo.type = 'button';
      this.selo.onclick = function () { Painel.abrir(); };
      document.body.appendChild(this.selo); this.atualizar();
    },
    texto: function () {
      var n = 0, r = 0; Sinc.fila.forEach(function (f) { if (f.recusado) r++; else n++; });
      if (r) return '⚠️ ' + r + tt(' não aceitos', ' not accepted');
      if (!navigator.onLine) return '📴 ' + tt('sem internet', 'offline') + (n ? ' · ' + n + tt(' esperando', ' waiting') : '');
      if (n) return '⏳ ' + n + tt(' guardando na nuvem…', ' saving to the cloud…');
      return '☁️ ' + tt('Tudo guardado', 'All saved');
    },
    atualizar: function () {
      if (this.selo) this.selo.textContent = this.texto();
      var st = this.aberto && this.aberto.querySelector('#nvStatus'); if (st) st.textContent = this.texto();   /* só o texto: não apaga o que a pessoa digita */
    },
    abrir: function () {
      this.aberto = document.createElement('div'); this.aberto.className = 'nv-painel';
      this.aberto.onclick = function (e) { if (e.target === Painel.aberto) Painel.fechar(); };
      document.body.appendChild(this.aberto); this.desenhar();
    },
    fechar: function () { if (this.aberto) { this.aberto.remove(); this.aberto = null; } this._msg = null; this._conf = null; },
    desenhar: async function () {
      var el = this.aberto; if (!el) return;
      var fam = Nuvem.familia || {}, L = await Cadeado.local(), dig = await Cadeado.temDigital();
      var robos = Painel._robos || [];
      var cx = Caixa.ligada === false ? '<p class="nv-tiny">' + tt('A caixa do robô ainda não foi ligada no banco (falta o "pode aplicar" do SQL v2).', 'The robot inbox is not switched on in the database yet (SQL v2 not applied).') + '</p>'
        : Caixa.problema === 'semsecreta' ? '<div class="nv-nota atencao">' + tt('A caixa do robô existe, mas a parte secreta dela ainda não chegou a este aparelho. Espere a próxima busca.', 'The robot inbox exists, but its secret part has not reached this device yet. Wait for the next check.') + '</div>'
        : Caixa.problema === 'diferente' ? '<div class="nv-nota erro">' + tt('As duas partes da chave da caixa do robô não combinam. Anote e avise o suporte.', 'The two parts of the robot inbox key do not match. Tell support.') + '</div>'
        : '<p class="nv-tiny">' + (Caixa.ultimos ? tt('Última vez: ', 'Last time: ') + new Date(Caixa.ultimos.quando).toLocaleString() + ' · ' + Caixa.ultimos.novos + tt(' novos', ' new') : tt('Nada novo do robô por enquanto.', 'Nothing new from the robot so far.')) + (Caixa.erros.size ? ' · ' + Caixa.erros.size + tt(' não abriram', ' did not open') : '') + '</p>';
      el.innerHTML = '<div class="nv-card">' +
        '<h1>☁️ ' + tt('Nuvem', 'Cloud') + '</h1>' +
        '<p class="nv-muted">' + tt('Conta: ', 'Account: ') + '<b>' + esc(Conta.email()) + '</b><br>' + tt('Família: ', 'Family: ') + '<b>' + esc(fam.nome || '') + '</b> · ' + esc(fam.meu_papel === 'chefe' ? tt('chefe', 'head') : tt('responsável', 'guardian')) + '</p>' +
        '<div class="nv-nota"><span id="nvStatus">' + esc(this.texto()) + '</span><br><span class="nv-tiny">' + Sinc.vivos() + tt(' registros guardados (fechados com o cadeado).', ' records saved (locked).') + '</span></div>' +
        (Sinc.recusados ? '<button class="nv-btn" id="nvDeNovo">' + tt('Tentar de novo os não aceitos', 'Retry the ones not accepted') + '</button>' : '') +
        '<h2>🤖 ' + tt('Caixa do robô', 'Robot inbox') + '</h2>' + cx +
        (Caixa.ligada !== false ? this.htmlRobo() : '') +
        '<h2>🔒 ' + tt('Cadeado', 'Lock') + '</h2>' +
        '<div class="nv-row"><button class="nv-btn" id="nvTrancar">🔒 ' + tt('Fechar agora', 'Lock now') + '</button><button class="nv-btn" id="nvPin">' + tt('Trocar o PIN', 'Change PIN') + '</button></div>' +
        (dig ? (L && L.prf ? '<button class="nv-btn" id="nvDigOff">' + tt('Não abrir mais com a digital', 'Stop opening with fingerprint') + '</button>' : '<button class="nv-btn" id="nvDigOn">👆 ' + tt('Abrir também com a digital', 'Also open with fingerprint') + '</button>') : '') +
        '<h2>📱 ' + tt('Aparelhos', 'Devices') + '</h2><div id="nvAps" class="nv-lista"><p class="nv-tiny">' + tt('Carregando…', 'Loading…') + '</p></div>' +
        '<div class="nv-row"><button class="nv-btn" id="nvApPedidos">🔔 ' + tt('Ver pedidos de acesso', 'See access requests') + '</button>' +
        (dig && Aparelhos.ligado !== false && L && L.sk ? '<button class="nv-btn" id="nvApPk">👆 ' + tt('Usar a digital em todos os aparelhos (passkey)', 'Use the fingerprint on all devices (passkey)') + '</button>' : '') + '</div>' +
        '<h2>' + tt('Este aparelho', 'This device') + '</h2>' +
        (Nuvem.podeLevar ? '<button class="nv-btn" id="nvLevar">' + tt('Levar para a nuvem os dados guardados só neste aparelho', 'Move the data kept only on this device to the cloud') + '</button>' : '') +
        '<div class="nv-row"><button class="nv-btn" id="nvSair">' + tt('Sair da conta', 'Sign out') + '</button><button class="nv-btn" id="nvDesc">📴 ' + tt('Desconectar este aparelho', 'Disconnect this device') + '</button></div>' +
        '<p class="nv-tiny">' + tt('Sair: fecha o cadeado e sai da conta. Desconectar: também apaga deste aparelho a cópia guardada aqui (na nuvem continua tudo).', 'Sign out: locks and signs out. Disconnect: also erases the copy kept on this device (everything stays in the cloud).') + '</p>' +
        '<p class="nv-tiny"><button class="nv-lnk" id="nvIrLocal">' + tt('Usar o MoneyTRIO só neste aparelho (sem nuvem)', 'Use MoneyTRIO only on this device (no cloud)') + '</button> · nuvem ' + VERSAO + '</p>' +
        '<button class="nv-btn" id="nvFechar">' + tt('Fechar', 'Close') + '</button></div>';
      var $ = function (s) { return el.querySelector(s); };
      $('#nvFechar').onclick = function () { Painel.fechar(); };
      $('#nvIrLocal').onclick = async function () { try { await Promise.race([Sinc.registrar().then(function () { return Sinc.enviar(); }), dorme(5000)]); } catch (e) {} await Cadeado.trancar(); lsSet(K_SO_AQUI, 1); location.reload(); };
      $('#nvTrancar').onclick = function () { Nuvem.trancar('manual'); };
      $('#nvSair').onclick = function () { Nuvem.sair(false); };
      $('#nvDesc').onclick = function () { Nuvem.sair(true); };
      $('#nvPin').onclick = function () { if (!Cadeado.dukRaw) return aviso(tt('Para trocar o PIN, feche o cadeado (🔒 Fechar agora) e abra de novo com o PIN.', 'To change the PIN, lock (🔒 Lock now) and open again with the PIN.')); Painel.fechar(); Portao.trocarPinConta(); };
      if ($('#nvDeNovo')) $('#nvDeNovo').onclick = function () { Sinc.tentarDeNovo(); };
      if ($('#nvDigOn')) $('#nvDigOn').onclick = async function () { if (!Cadeado.dukRaw) return aviso(tt('Para ligar a digital, feche o cadeado (🔒 Fechar agora) e abra de novo com o PIN.', 'To turn on the fingerprint, lock (🔒 Lock now) and open again with the PIN.')); var r = await Cadeado.ligarDigital(); aviso(r.ok ? '✓ ' + tt('Pronto: abre com a digital neste ' + apN() + '.', 'Done: opens with your fingerprint on this ' + apN() + '.') : tt('A digital não foi ligada. Continue usando o PIN.', 'Fingerprint was not turned on. Keep using the PIN.')); Painel.desenhar(); };
      if ($('#nvDigOff')) $('#nvDigOff').onclick = async function () { await Cadeado.desligarDigital(); Painel.desenhar(); };
      if ($('#nvLevar')) $('#nvLevar').onclick = function () { Painel.fechar(); Nuvem.levarDeNovo(); };
      if ($('#nvCaixaJa')) $('#nvCaixaJa').onclick = function () { Caixa.esvaziar(); };
      this.ligarRobo(el);
      if (!this._pediuRobos) { this._pediuRobos = true; this.robos(); }
      $('#nvApPedidos').onclick = async function () { Aparelhos._vistos = {}; await Aparelhos.olharPedidos(); if (!(Aparelhos.pendentes || []).length) aviso(tt('Nenhum pedido de acesso agora.', 'No access request right now.')); else Painel.fechar(); };
      if ($('#nvApPk')) $('#nvApPk').onclick = async function () {
        if (!Cadeado.dukRaw) return aviso(tt('Para isso, feche o cadeado (🔒 Fechar agora) e abra de novo com o PIN.', 'For this, lock (🔒 Lock now) and open again with the PIN.'));
        var r = await Aparelhos.criarPasskey();
        aviso(r.ok ? '✓ ' + tt('Pronto: a digital (passkey) abre o MoneyTRIO nos seus outros aparelhos.', 'Done: the fingerprint (passkey) opens MoneyTRIO on your other devices.')
          : r.erro === 'semprf' ? tt('Este aparelho ou navegador ainda não oferece isso. Use a aprovação pelo outro aparelho.', 'This device or browser does not offer this yet. Use approval from another device.')
          : tt('A passkey não foi criada.', 'The passkey was not created.'));
      };
      this.aparelhos(el, L);
    },
    /* ---- 1.9.0: a lista de aparelhos da conta, com "Tirar" ---- */
    aparelhos: async function (el, L) {
      var caixa = el.querySelector('#nvAps'), lista = await Aparelhos.lista(); if (!caixa || !caixa.isConnected) return;
      if (lista === null) { caixa.innerHTML = '<p class="nv-tiny">' + tt('A lista de aparelhos ainda está sendo ligada.', 'The device list is still being switched on.') + '</p>'; return; }
      var como = { primeiro: tt('primeiro aparelho', 'first device'), aparelho: tt('aprovado por outro aparelho', 'approved by another device'), familia: tt('aprovado pela família', 'approved by the family'), passkey: tt('pela digital (passkey)', 'by fingerprint (passkey)'), kit: tt('pelo kit de emergência', 'by the emergency kit') };
      caixa.innerHTML = lista.map(function (a) {
        var este = L && a.id === L.ap;
        return '<div class="nv-nota nv-ap" data-ap="' + esc(a.id) + '"><b>' + esc(a.nome) + '</b>' + (este ? ' <span class="nv-tiny">(' + tt('este aparelho', 'this device') + ')</span>' : '') +
          '<br><span class="nv-tiny">' + esc((como[a.como] || a.como) + (a.como === 'familia' && (a.aprovado_por_nome || a.aprovado_por_email) ? ' (' + (a.aprovado_por_nome || a.aprovado_por_email) + ')' : '') + ' · ' + tt('desde ', 'since ') + dataHora(a.criado_em, true) + ' · ' + tt('última vez ', 'last seen ') + dataHora(a.visto_em)) + '</span>' +
          '<br><button class="nv-btn" data-tirar="' + esc(a.id) + '">' + (este ? tt('Tirar este aparelho', 'Remove this device') : tt('Tirar', 'Remove')) + '</button></div>';
      }).join('') || '<p class="nv-tiny">' + tt('Nenhum aparelho registrado ainda.', 'No device registered yet.') + '</p>';
      caixa.querySelectorAll('[data-tirar]').forEach(function (b) { b.onclick = async function () {
        var id = b.getAttribute('data-tirar'), este = L && id === L.ap;
        if (!window.confirm(este ? tt('Tirar ESTE aparelho? O cadeado e a cópia daqui saem (na nuvem continua tudo).', 'Remove THIS device? The lock and the copy here are erased (everything stays in the cloud).') : tt('Tirar este aparelho da sua conta? Na próxima vez que ele abrir com internet, o cadeado de lá some.', 'Remove this device from your account? The next time it opens online, its lock is erased.'))) return;
        try { await Aparelhos.rpc('sol_aparelho_tirar', { p_id: id }); } catch (e) { return aviso(Conta.explicar(e), 'erro'); }
        if (este) return Aparelhos.tirado();
        aviso('✓ ' + tt('Aparelho tirado.', 'Device removed.')); Painel.aparelhos(el, L);
      }; });
    },
    /* ---- robôs autorizados (aprovado pelo dono, 03/Nov/2026): confirmação antes, mensagem fixa depois ---- */
    _msg: null, _rascunho: '', _conf: null,
    htmlRobo: function () {
      var ativos = (this._robos || []).filter(function (r) { return !r.desligado_em; });
      var m = this._msg, c = this._conf;
      return '<div class="nv-lista" id="nvRobo">' +
        (m ? '<div class="nv-nota fixa ' + m.tipo + '" role="' + (m.tipo === 'erro' ? 'alert' : 'status') + '"><button class="nv-x" id="nvMsgX" aria-label="' + tt('Fechar a mensagem', 'Close message') + '">✕</button>' + m.html + '</div>' : '') +
        '<h3 class="nv-sub">' + tt('Robôs autorizados', 'Authorized robots') + '</h3>' +
        (ativos.length ? ativos.map(function (r) {
          var nome = /@/.test(r.nome || '') ? esc(r.nome) : esc(r.nome || tt('robô', 'robot')) + ' <span class="nv-tiny">' + tt('(e-mail não registrado)', '(e-mail not recorded)') + '</span>';
          return '<div class="nv-nota"><b>' + nome + '</b><br><span class="nv-tiny">' + tt('autorizado em ', 'authorized on ') + esc(dataHora(r.criado_em)) + '</span>' +
            '<br><button class="nv-btn" data-remover="' + esc(r.user_id) + '">' + tt('Remover acesso', 'Remove access') + '</button></div>';
        }).join('') : '<p class="nv-tiny">' + tt('Nenhum robô autorizado ainda.', 'No robot authorized yet.') + '</p>') +
        (c ? '<div class="nv-nota atencao" role="alertdialog"><p>' + c.html + '</p><div class="nv-row"><button class="nv-btn" id="nvConfNao">' + tt('Cancelar', 'Cancel') + '</button><button class="nv-btn pri" id="nvConfSim">' + c.sim + '</button></div></div>' : '') +
        '<label class="nv-fld"><span>' + tt('E-mail da conta do robô (para autorizar)', 'Robot account e-mail (to authorize)') + '</span><input type="email" id="nvRoboEmail" autocomplete="off" value="' + esc(this._rascunho) + '"></label>' +
        '<button class="nv-btn" id="nvRoboOk">' + tt('Autorizar o robô nesta família', 'Authorize the robot in this family') + '</button><button class="nv-btn" id="nvCaixaJa">' + tt('Ver se chegou algo agora', 'Check for new entries now') + '</button></div>';
    },
    mensagem: function (tipo, html) { this._msg = { tipo: tipo, html: html }; this._conf = null; this.desenhar(); },
    ligarRobo: function (el) {
      var self = this, $ = function (s) { return el.querySelector(s); }, fam = esc((Nuvem.familia || {}).nome || '');
      var campo = $('#nvRoboEmail'); if (!campo) return;
      campo.oninput = function () { self._rascunho = campo.value; };
      if ($('#nvMsgX')) $('#nvMsgX').onclick = function () { self._msg = null; self.desenhar(); };
      if ($('#nvCaixaJa')) $('#nvCaixaJa').onclick = function () { Caixa.esvaziar(); };
      if ($('#nvConfNao')) $('#nvConfNao').onclick = function () { self._conf = null; self.desenhar(); };
      if ($('#nvConfSim')) $('#nvConfSim').onclick = function () { var c = self._conf; self._conf = null; $('#nvConfSim').disabled = true; c.acao(); };
      $('#nvRoboOk').onclick = function () {
        var em = campo.value.trim().toLowerCase(); self._rascunho = campo.value;
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return self.mensagem('erro', '❌ ' + tt('Escreva o e-mail completo da conta do robô (ex.: robo@exemplo.com).', 'Write the full e-mail of the robot account (e.g. robot@example.com).'));
        var ja = (self._robos || []).find(function (r) { return !r.desligado_em && String(r.nome || '').toLowerCase() === em; });
        if (ja) return self.mensagem('info', 'ℹ️ <b>' + esc(em) + '</b>' + tt(' já está autorizado desde ', ' is already authorized since ') + esc(dataHora(ja.criado_em, true)) + tt('. Nada mudou.', '. Nothing changed.'));
        self._msg = null;
        self._conf = { sim: tt('Sim, autorizar', 'Yes, authorize'),
          html: tt('Autorizar <b>', 'Authorize <b>') + esc(em) + tt('</b>? Ele poderá <b>entregar</b> lançamentos dos seus bancos para a família <b>', '</b>? It will be able to <b>deliver</b> entries from your banks to the family <b>') + fam + tt('</b>. Ele não consegue ler nada do que está guardado. Você pode remover o acesso quando quiser.', '</b>. It cannot read anything that is stored. You can remove access whenever you want.'),
          acao: async function () {
            try {
              await Conta.rpc('money_robo_autorizar', { p_grupo: Sinc.gid, p_email: em, p_nome: em.slice(0, 60) });
              self._rascunho = '';
              await self.robos(true);
              var r = (self._robos || []).find(function (x) { return !x.desligado_em && String(x.nome || '').toLowerCase() === em.slice(0, 60); });
              self.mensagem('ok', '✅ <b>' + esc(em) + '</b>' + tt(' autorizado em ', ' authorized on ') + esc(dataHora(r ? r.criado_em : new Date().toISOString())) + '.<br>' + tt('Próximo passo: nada para você fazer. Os lançamentos dos bancos chegam sozinhos todo dia às 7h15.', 'Next step: nothing for you to do. Bank entries arrive by themselves every day at 7:15 am.'));
              avisoAlto('✓ ' + tt('Robô autorizado.', 'Robot authorized.'));
            } catch (e) {
              self.mensagem('erro', '❌ ' + (/P0002|não há conta|e-mail/i.test((e.code || '') + ' ' + (e.message || '')) ? tt('Não existe conta SolverONE com esse e-mail. Confira e tente de novo.', 'There is no SolverONE account with that e-mail. Check it and try again.') : esc(Conta.explicar(e))));
            }
          } };
        self.desenhar();
      };
      el.querySelectorAll('[data-remover]').forEach(function (b) { b.onclick = function () {
        var r = (self._robos || []).find(function (x) { return x.user_id === b.dataset.remover; }) || {};
        var nome = /@/.test(r.nome || '') ? r.nome : tt('o robô', 'the robot');
        self._msg = null;
        self._conf = { sim: tt('Sim, remover', 'Yes, remove'),
          html: tt('Remover o acesso de <b>', 'Remove access for <b>') + esc(nome) + tt('</b>? Ele para de entregar lançamentos. O que já chegou continua guardado.', '</b>? It stops delivering entries. What already arrived stays stored.'),
          acao: async function () {
            try { await Conta.rpc('money_robo_desligar', { p_grupo: Sinc.gid, p_user: r.user_id }); await self.robos(true); self.mensagem('ok', '✅ ' + tt('Acesso removido: ', 'Access removed: ') + '<b>' + esc(nome) + '</b>.'); avisoAlto('✓ ' + tt('Acesso removido.', 'Access removed.')); }
            catch (e) { self.mensagem('erro', '❌ ' + esc(Conta.explicar(e))); }
          } };
        self.desenhar();
      }; });
    },
    robos: async function (quieto) {
      try { this._robos = (await Conta.rest('GET', 'money_robos?grupo_id=eq.' + Sinc.gid + '&select=user_id,nome,criado_em,desligado_em&order=criado_em.asc')) || []; } catch (e) { this._robos = this._robos || []; }
      if (quieto) return;
      this._pediuRobos = false; if (this.aberto) { this._pediuRobos = true; this.desenhar(); }
    }
  };

  /* ---------------- portão: conta → família → cadeado → dados ---------------- */
  var Portao = {
    dadosLocais: function () {
      try {
        var t = localStorage.getItem(K_LOCAL); if (!t) return null;
        var o = JSON.parse(t), n = (o.gastos ? o.gastos.length : 0) + (o.posicoes || []).length + (o.movimentos || []).length + (o.recorrentes || []).length;
        if (!n && !o.gastosZ) return null;
        return { texto: t, gastos: o.gastos ? o.gastos.length : (o.gastosZ ? -1 : 0), posicoes: (o.posicoes || []).length, movimentos: (o.movimentos || []).length };
      } catch (e) { return null; }
    },
    entrar: function () {
      var loc = this.dadosLocais();
      var el = Tela.mostrar(Tela.topo() +
        '<p class="nv-muted">' + tt('Entre com a sua conta SolverONE (a mesma do OmniLifeONE). Os seus dados de finanças ficam guardados na nuvem, fechados com o cadeado da família: só quem tem o código ou o PIN abre.', 'Sign in with your SolverONE account (the same as OmniLifeONE). Your finance data is kept in the cloud, closed with the family lock: only someone with the code or the PIN can open it.') + '</p>' +
        (loc ? '<div class="nv-nota atencao">📦 ' + tt('Este aparelho tem dados do MoneyTRIO guardados só aqui. Depois de entrar e abrir o cadeado, você poderá levá-los para a nuvem. Nada é apagado deste aparelho.', 'This device has MoneyTRIO data kept only here. After signing in and opening the lock, you can move it to the cloud. Nothing is erased from this device.') + '</div>' : '') +
        (Conta._erroRetorno ? '<div class="nv-nota erro">' + esc(tt('Não deu para entrar: ', 'Could not sign in: ') + Conta._erroRetorno) + '</div>' : '') +
        '<button class="nv-btn google" id="nvGo">' + G_GOOGLE + '<span>' + tt('Entrar com Google', 'Sign in with Google') + '</span></button>' +
        '<div class="nv-ou">' + tt('ou com e-mail e senha', 'or with e-mail and password') + '</div>' +
        '<label class="nv-fld"><span>E-mail</span><input type="email" id="nvEm" autocomplete="username" inputmode="email"></label>' +
        '<label class="nv-fld"><span>' + tt('Senha', 'Password') + '</span><input type="password" id="nvPw" autocomplete="current-password"></label>' +
        '<div class="nv-nota erro nv-hidden" id="nvErro" role="alert"></div><div class="nv-nota ok nv-hidden" id="nvOk" role="status"></div>' +
        '<button class="nv-btn" id="nvIn">' + tt('Entrar com e-mail', 'Sign in with e-mail') + '</button>' +
        '<div class="nv-row"><button class="nv-lnk" id="nvNova">' + tt('Criar conta', 'Create account') + '</button><button class="nv-lnk" id="nvEsq">' + tt('Esqueci a senha', 'Forgot password') + '</button></div>' +
        '<button class="nv-lnk" id="nvSoAqui">' + tt('Usar o MoneyTRIO só neste aparelho (sem conta, sem nuvem)', 'Use MoneyTRIO only on this device (no account, no cloud)') + '</button>');
      var $ = function (s) { return el.querySelector(s); };
      var dd = function () { return { email: $('#nvEm').value.trim().toLowerCase(), senha: $('#nvPw').value }; };
      var ok = function (t) { Tela.erro(''); var o = $('#nvOk'); o.textContent = t; o.classList.remove('nv-hidden'); };
      $('#nvIn').onclick = function () { Tela.ocupar($('#nvIn'), async function () {
        var d = dd(); if (!d.email || !d.senha) return Tela.erro(tt('Preencha e-mail e senha.', 'Fill in e-mail and password.'));
        Conta.guardar(await Conta.auth('token?grant_type=password', { email: d.email, password: d.senha }));
        Conta.registrarAcesso('login'); Nuvem.depoisDaConta();
      }); };
      $('#nvPw').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('#nvIn').click(); });
      $('#nvGo').onclick = function () { Conta.google(); };
      $('#nvSoAqui').onclick = function () { Nuvem.soNesteAparelho(); };
      $('#nvNova').onclick = function () { Tela.ocupar($('#nvNova'), async function () {
        var d = dd(); if (!d.email || d.senha.length < 8) return Tela.erro(tt('Para criar a conta: e-mail e uma senha de pelo menos 8 caracteres.', 'To create the account: e-mail and a password of at least 8 characters.'));
        Conta.marcarPedido();
        var j = await Conta.auth('signup?redirect_to=' + encodeURIComponent(Conta.volta()), { email: d.email, password: d.senha });
        if (j && j.access_token) { Conta.guardar(j); Nuvem.depoisDaConta(); }
        else ok(tt('Enviamos um e-mail de confirmação para ', 'We sent a confirmation e-mail to ') + d.email + tt('. Abra o link nele neste mesmo aparelho.', '. Open its link on this same device.'));
      }); };
      $('#nvEsq').onclick = function () { Tela.ocupar($('#nvEsq'), async function () {
        var d = dd(); if (!d.email) return Tela.erro(tt('Escreva o seu e-mail.', 'Write your e-mail.'));
        Conta.marcarPedido();
        await Conta.auth('recover?redirect_to=' + encodeURIComponent(Conta.volta()), { email: d.email });
        ok(tt('Se houver conta com este e-mail, chegou um link para criar uma senha nova. Abra neste aparelho.', 'If there is an account with this e-mail, a link to set a new password has arrived. Open it on this device.'));
      }); };
    },
    confirmarLink: function () {
      var pd = Conta._pendente; Conta._pendente = null;
      var email = Conta.dados(pd.tok.access_token).email || '?';
      var el = Tela.mostrar(Tela.topo() + '<p>' + tt('Este link quer conectar a conta SolverONE <b>', 'This link wants to connect the SolverONE account <b>') + esc(email) + tt('</b> neste aparelho. Foi você que pediu?', '</b> on this device. Did you request it?') + '</p>' +
        '<button class="nv-btn pri" id="nvSim">' + tt('Sim, sou eu', "Yes, it's me") + '</button><button class="nv-btn" id="nvNao">' + tt('Não', 'No') + '</button>');
      el.querySelector('#nvSim').onclick = function () { Conta.guardar(pd.tok); Conta.registrarAcesso('login'); if (pd.tipo === 'recovery') Portao.novaSenha(); else Nuvem.depoisDaConta(); };
      el.querySelector('#nvNao').onclick = function () { Portao.entrar(); };
    },
    novaSenha: function () {
      var el = Tela.mostrar(Tela.topo() + '<h2>🔑 ' + tt('Nova senha da conta', 'New account password') + '</h2><label class="nv-fld"><span>' + tt('Pelo menos 8 caracteres', 'At least 8 characters') + '</span><input type="password" id="nvNs" autocomplete="new-password"></label><div class="nv-nota erro nv-hidden" id="nvErro"></div><button class="nv-btn pri" id="nvNsOk">' + tt('Salvar a senha', 'Save password') + '</button><button class="nv-btn" id="nvNsDep">' + tt('Depois', 'Later') + '</button>');
      el.querySelector('#nvNsDep').onclick = function () { Nuvem.depoisDaConta(); };
      el.querySelector('#nvNsOk').onclick = function () { Tela.ocupar(el.querySelector('#nvNsOk'), async function () {
        var v = el.querySelector('#nvNs').value; if (v.length < 8) return Tela.erro(tt('Use pelo menos 8 caracteres.', 'Use at least 8 characters.'));
        await Conta.auth('user', { password: v }, 'PUT', await Conta.token()); aviso('✓ ' + tt('Senha trocada', 'Password changed')); Nuvem.depoisDaConta();
      }); };
    },
    mensagem: function (titulo, texto, botoes) {
      var el = Tela.mostrar(Tela.topo() + '<h2>' + titulo + '</h2><p>' + texto + '</p>' + (botoes || []).map(function (b, i) { return '<button class="nv-btn' + (i ? '' : ' pri') + '" data-i="' + i + '">' + b[0] + '</button>'; }).join(''));
      el.querySelectorAll('[data-i]').forEach(function (b) { b.onclick = function () { botoes[+b.dataset.i][1](); }; });
    },
    carregando: function (txt) { Tela.mostrar(Tela.topo() + '<p>⏳ ' + esc(txt) + '</p><p class="nv-tiny" id="nvAnda"></p>'); },
    andar: function (txt) { var e = Tela.q('#nvAnda'); if (e) e.textContent = txt; },
    familias: function (lista, aoEscolher) {
      var el = Tela.mostrar(Tela.topo() + '<h2>' + tt('Qual família?', 'Which family?') + '</h2><p class="nv-muted">' + tt('As finanças ficam com a família. Só chefe e responsável veem.', 'Finances belong to the family. Only heads and guardians see them.') + '</p><div class="nv-lista">' +
        lista.map(function (g, i) { return '<button class="nv-btn" data-i="' + i + '">👪 ' + esc(g.nome) + ' <span class="nv-tiny">· ' + esc(g.meu_papel === 'chefe' ? tt('chefe', 'head') : tt('responsável', 'guardian')) + '</span></button>'; }).join('') + '</div>');
      el.querySelectorAll('[data-i]').forEach(function (b) { b.onclick = function () { aoEscolher(lista[+b.dataset.i]); }; });
    },
    /* primeira vez: o código de recuperação do OmniLifeONE */
    /* 1.9.0: primeira vez (ou esqueci o PIN) SEM código de recuperação: aprovar pelo outro aparelho, pedir para alguém da
       família ou a digital (passkey). O código antigo fica num link discreto, só para quem tem a cópia dele no servidor. */
    primeiraVez: async function (fam, esqueci) {
      if (!esqueci && (await Aparelhos.retomar(fam))) return;
      var el = Tela.mostrar(Tela.topo() + '<h2>🔐 ' + (esqueci ? tt('Abrir sem o PIN', 'Open without the PIN') : tt('Primeira vez neste ' + apN(), 'First time on this ' + apN())) + '</h2>' +
        '<p>' + tt('Para abrir as finanças da família <b>' + esc(fam.nome || '') + '</b> aqui, escolha um jeito:', 'To open the finances of the family <b>' + esc(fam.nome || '') + '</b> here, choose one way:') + '</p>' +
        '<button class="nv-btn pri" id="nvApOutro">📱 ' + tt('Aprovar pelo outro aparelho', 'Approve from my other device') + '</button>' +
        ((fam.membros || 0) > 1 ? '<button class="nv-btn" id="nvApFam">👪 ' + tt('Pedir para alguém da família aprovar', 'Ask someone in the family to approve') + '</button>' : '') +
        '<span id="nvApPkLugar"></span>' +
        '<div class="nv-nota erro nv-hidden" id="nvErro" role="alert"></div>' +
        '<p class="nv-tiny">' + tt('Funciona com outro aparelho onde você já entra (celular ou computador), no MoneyTRIO ou no OmniLifeONE.', 'Works with another device where you are already in (phone or computer), in MoneyTRIO or OmniLifeONE.') + '</p>' +
        '<div class="nv-row"><span id="nvCodLugar"></span>' + (esqueci ? '<button class="nv-lnk" id="nvCodVolta">' + tt('Voltar', 'Back') + '</button>' : '') +
        '<button class="nv-lnk" id="nvSairC">' + tt('Sair da conta', 'Sign out') + '</button></div>');
      var $ = function (s) { return el.querySelector(s); };
      $('#nvSairC').onclick = function () { Nuvem.sair(false); };
      if ($('#nvCodVolta')) $('#nvCodVolta').onclick = function () { Portao.pin(fam, Nuvem.motivoTranca); };
      $('#nvApOutro').onclick = function () { if (!navigator.onLine) return Tela.erro(tt('Para isso, ligue a internet.', 'For this, connect to the internet.')); Tela.ocupar($('#nvApOutro'), function () { return Aparelhos.pedir(fam, 'pessoal'); }); };
      if ($('#nvApFam')) $('#nvApFam').onclick = function () { if (!navigator.onLine) return Tela.erro(tt('Para isso, ligue a internet.', 'For this, connect to the internet.')); Tela.ocupar($('#nvApFam'), function () { return Aparelhos.pedir(fam, 'familia'); }); };
      /* a digital (passkey) só aparece se a conta tem uma e este aparelho tem leitor; o código só para quem tem a cópia antiga */
      (async function () {
        if ((await Cadeado.temDigital()) && (await Aparelhos.temPasskeys()) && Tela.el === el) {
          $('#nvApPkLugar').innerHTML = '<button class="nv-btn" id="nvApPasskey">👆 ' + tt('Usar a digital (passkey)', 'Use the fingerprint (passkey)') + '</button>';
          $('#nvApPasskey').onclick = function () { Tela.ocupar($('#nvApPasskey'), function () { return Aparelhos.entrarPasskey(fam); }); };
        }
        var bk = null; try { bk = await Conta.rest('GET', 'omni_chave_privada?user_id=eq.' + Conta.uid() + '&select=user_id'); } catch (e) {}
        if (bk && bk.length && Tela.el === el) {
          $('#nvCodLugar').innerHTML = '<button class="nv-lnk" id="nvCodigoAntigo">' + tt('Tenho o código de recuperação antigo', 'I have the old recovery code') + '</button>';
          $('#nvCodigoAntigo').onclick = function () { Portao.codigo(fam, esqueci); };
        }
      })();
    },
    /* o jeito antigo: o código de recuperação do OmniLifeONE (só para quem já tem) */
    codigo: function (fam, esqueci) {
      var el = Tela.mostrar(Tela.topo() +
        '<h2>🔐 ' + (esqueci ? tt('Abrir com o código de recuperação', 'Open with the recovery code') : tt('Primeira vez neste ' + apN(), 'First time on this ' + apN())) + '</h2>' +
        '<p>' + tt('Digite o <b>código de recuperação</b>: aquele código em pedaços (ex.: ABCDE-FGH23-…) que o OmniLifeONE mostrou na primeira vez e você anotou num papel. É o mesmo cadeado da família ', 'Type the <b>recovery code</b>: the code in parts (e.g. ABCDE-FGH23-…) that OmniLifeONE showed the first time and you wrote on paper. It is the same family lock ') + '<b>' + esc(fam.nome) + '</b>.</p>' +
        '<label class="nv-fld"><span>' + tt('Código de recuperação (pode ser sem os tracinhos)', 'Recovery code (dashes optional)') + '</span><input type="text" id="nvCod" class="nv-cod" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>' +
        '<div class="nv-nota atencao">⚠️ ' + tt('Importante: sem o código de recuperação e sem o PIN, os dados não voltam. Nem a SolverONE consegue abrir.', 'Important: without the recovery code and without the PIN, the data cannot come back. Not even SolverONE can open it.') + '</div>' +
        '<div class="nv-nota erro nv-hidden" id="nvErro" role="alert"></div>' +
        '<button class="nv-btn pri" id="nvCodOk">' + tt('Continuar', 'Continue') + '</button>' +
        '<button class="nv-btn" id="nvCodSem">' + tt('Não tenho o código', "I don't have the code") + '</button>' +
        '<button class="nv-btn" id="nvCodVolta">' + tt('Voltar', 'Back') + '</button>' +
        '<button class="nv-lnk" id="nvSairC">' + tt('Sair da conta', 'Sign out') + '</button>');
      var $ = function (s) { return el.querySelector(s); };
      $('#nvSairC').onclick = function () { Nuvem.sair(false); };
      $('#nvCodVolta').onclick = function () { Portao.primeiraVez(fam, esqueci); };
      $('#nvCodSem').onclick = function () { Portao.primeiraVez(fam, esqueci); };
      $('#nvCodOk').onclick = function () {
        var cod = $('#nvCod').value; if (Cifra.normCode(cod).replace(/-/g, '').length < 10) return Tela.erro(tt('Digite o código inteiro, do jeito que está no papel.', 'Type the whole code, as it is on the paper.'));
        if (!navigator.onLine) return Tela.erro(tt('Para esta primeira vez, ligue a internet.', 'For this first time, connect to the internet.'));
        /* 1.10.0: o código antigo vale como "kit": o aparelho entra na lista e usa o PIN da conta (se a conta já tem) */
        (async function () { var ap = null; try { ap = await Aparelhos.rpc('sol_aparelho_registrar', { p_nome: nomeAparelho(), p_app: AP_APP, p_como: 'kit' }); } catch (e) {}
        Pin.pedir(ap, async function (pin) {
          Portao.carregando(tt('Conferindo o código e preparando o cadeado… (leva alguns segundos)', 'Checking the code and preparing the lock… (takes a few seconds)'));
          var r; try { r = await Cadeado.pelaPrimeiraVez(cod, pin, fam.grupo_id); } catch (e) { r = { erro: 'rede', e: e }; }
          if (r.ok && ap) { var L = await Cadeado.local(); L.ap = ap; L.como = 'kit'; L.avisosAte = L.avisosAte || new Date().toISOString(); await Cadeado.gravar(L); }
          if (!r.ok && ap) { Aparelhos.rpc('sol_aparelho_tirar', { p_id: ap }).catch(function () {}); }
          return r;
        }, function (r) {
          if (r.ok) { IDB.set('kv', 'digitalPerguntada|' + Conta.uid(), Date.now()).catch(function () {}); return Portao.oferecerDigital(function () { if (Nuvem.iniciado) Nuvem.destrancado(); else Nuvem.depoisDoCadeado(true); }); }
          var msg = r.erro === 'codigo' ? tt('Esse código não confere. Confira as letras e os números no papel.', "That code doesn't match. Check the letters and numbers on the paper.")
            : r.erro === 'semchave' ? tt('Esta conta ainda não tem cadeado. Abra antes as Senhas da casa no OmniLifeONE (com esta mesma conta) e volte aqui.', 'This account has no lock yet. First open the home passwords in OmniLifeONE (with this same account) and come back.')
            : r.erro === 'semliberar' ? tt('O código está certo, mas o cadeado desta família ainda não foi liberado para você. Peça para outro responsável abrir as Senhas da casa no OmniLifeONE, com internet, e tente de novo.', 'The code is right, but this family lock has not been released to you yet. Ask another guardian to open the home passwords in OmniLifeONE, online, and try again.')
            : Conta.explicar(r.e);
          Portao.codigo(fam, esqueci); Tela.erro(msg);
        }); })();
      };
    },
    novoPin: function (aoSalvar, podeVoltar) {
      var el = Tela.mostrar(Tela.topo() + '<h2>🔢 ' + tt('Escolha o PIN da conta', 'Choose the account PIN') + '</h2>' +
        '<p class="nv-tiny" id="nvPinUm">' + tt('É um PIN só para a sua conta: o mesmo em todos os seus aparelhos (como a senha do banco).', 'It is one PIN for your account: the same on all your devices (like a bank password).') + '</p>' +
        '<p>' + tt('O PIN abre o MoneyTRIO, até sem internet. Escolha <b>6 números</b> fáceis para você lembrar e difíceis para os outros — não use data de aniversário nem 123456. Não é a senha do e-mail.', 'The PIN opens MoneyTRIO, even offline. Choose <b>6 digits</b> easy for you and hard for others — not a birthday or 123456. It is not your e-mail password.') + '</p>' +
        '<label class="nv-fld"><span>' + tt('PIN (6 números ou mais)', 'PIN (6 digits or more)') + '</span><input type="text" class="nv-pinc" id="nvP1" inputmode="numeric" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true"></label>' +
        '<label class="nv-fld"><span>' + tt('Digite o mesmo PIN de novo', 'Type the same PIN again') + '</span><input type="text" class="nv-pinc" id="nvP2" inputmode="numeric" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true"></label>' +
        '<div class="nv-nota erro nv-hidden" id="nvErro" role="alert"></div>' +
        '<button class="nv-btn pri" id="nvPOk">' + tt('Salvar o PIN', 'Save PIN') + '</button>' + (podeVoltar ? '<button class="nv-btn" id="nvPVolta">' + tt('Cancelar', 'Cancel') + '</button>' : ''));
      var $ = function (s) { return el.querySelector(s); };
      if ($('#nvPVolta')) $('#nvPVolta').onclick = function () { Tela.fechar(); };
      $('#nvP2').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('#nvPOk').click(); });
      $('#nvPOk').onclick = function () {
        var a = $('#nvP1').value, b = $('#nvP2').value;
        if (a.length < 6) return Tela.erro(tt('O PIN precisa ter pelo menos 6 números.', 'The PIN needs at least 6 digits.'));
        if (/^(\d)\1+$/.test(a) || '0123456789012'.indexOf(a) >= 0 || '9876543210987'.indexOf(a) >= 0) return Tela.erro(tt('Esse PIN é fácil de adivinhar (números repetidos ou em sequência). Escolha outro.', 'That PIN is easy to guess (repeated or sequential digits). Choose another.'));
        if (a !== b) return Tela.erro(tt('Os dois PINs ficaram diferentes. Digite de novo.', "The two PINs don't match. Type them again."));
        aoSalvar(a);
      };
    },
    /* 1.10.0: trocar o PIN da conta (pede o atual; vale em todos os aparelhos; precisa de internet) */
    trocarPinConta: function () {
      var campo = function (id, rot) { return '<label class="nv-fld"><span>' + rot + '</span><input type="text" class="nv-pinc" id="' + id + '" inputmode="numeric" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true"></label>'; };
      var el = Tela.mostrar(Tela.topo() + '<h2>🔢 ' + tt('Trocar o PIN da conta', 'Change the account PIN') + '</h2>' +
        '<p class="nv-tiny">' + tt('O PIN novo vale em todos os seus aparelhos.', 'The new PIN works on all your devices.') + '</p>' +
        campo('nvTA', tt('PIN atual', 'Current PIN')) + campo('nvT1', tt('PIN novo (6 números ou mais)', 'New PIN (6 digits or more)')) + campo('nvT2', tt('Digite o PIN novo de novo', 'Type the new PIN again')) +
        '<div class="nv-nota erro nv-hidden" id="nvErro" role="alert"></div>' +
        '<button class="nv-btn pri" id="nvTOk">' + tt('Trocar o PIN', 'Change PIN') + '</button><button class="nv-btn" id="nvTVolta">' + tt('Cancelar', 'Cancel') + '</button>');
      var $ = function (q) { return el.querySelector(q); };
      $('#nvTVolta').onclick = function () { Tela.fechar(); };
      $('#nvTOk').onclick = function () {
        var at = $('#nvTA').value, a = $('#nvT1').value, b = $('#nvT2').value;
        if (!at) return Tela.erro(tt('Digite o PIN atual.', 'Type the current PIN.'));
        if (a.length < 6) return Tela.erro(tt('O PIN precisa ter pelo menos 6 números.', 'The PIN needs at least 6 digits.'));
        if (/^(\d)\1+$/.test(a) || '0123456789012'.indexOf(a) >= 0 || '9876543210987'.indexOf(a) >= 0) return Tela.erro(tt('Esse PIN é fácil de adivinhar (números repetidos ou em sequência). Escolha outro.', 'That PIN is easy to guess (repeated or sequential digits). Choose another.'));
        if (a !== b) return Tela.erro(tt('Os dois PINs novos ficaram diferentes.', "The two new PINs don't match."));
        if (!navigator.onLine) return Tela.erro(tt('Para trocar o PIN da conta, ligue a internet.', 'To change the account PIN, connect to the internet.'));
        Tela.ocupar($('#nvTOk'), async function () {
          var r = await Pin.trocar(at, a);
          if (r.ok) { Tela.fechar(); return aviso('✓ ' + tt('PIN trocado. Vale em todos os seus aparelhos.', 'PIN changed. It works on all your devices.')); }
          if (r.erro === 'pin' || r.erro === 'espera') return Tela.erro(Pin.explicar(r.erro === 'espera' ? { erro: 'espera', ate: Date.parse(r.espera_ate), muitas: r.tentativas >= 10 } : { erro: 'pin', conta: true, restam: r.restam }));
          Tela.erro(r.e ? Conta.explicar(r.e) : tt('Não deu para trocar o PIN.', 'Could not change the PIN.'));
        });
      };
    },
    /* 1.10.0: aparelho que acabou de entrar e a conta já tem PIN: "Digite o PIN da sua conta" (conferido no banco) */
    pinConta: function (info, ap, aoOk) {
      var el = Tela.mostrar(Tela.topo() + '<h2>🔢 ' + tt('Digite o PIN da sua conta', 'Type your account PIN') + '</h2>' +
        '<p>' + tt('É o mesmo PIN dos seus outros aparelhos.', 'It is the same PIN as on your other devices.') + '</p>' +
        '<label class="nv-fld"><span>PIN</span><input type="text" class="nv-pinc" id="nvPC" inputmode="numeric" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true"></label>' +
        '<div class="nv-nota erro nv-hidden" id="nvErro" role="alert"></div>' +
        '<button class="nv-btn pri" id="nvPCOk">' + tt('Continuar', 'Continue') + '</button>' +
        '<button class="nv-lnk" id="nvPCNovo">' + tt('Não lembro o PIN da conta: escolher outro', "I don't remember the account PIN: choose another") + '</button>');
      var $ = function (q) { return el.querySelector(q); };
      $('#nvPC').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('#nvPCOk').click(); });
      $('#nvPCOk').onclick = function () { var pin = $('#nvPC').value; if (!pin) return; Tela.ocupar($('#nvPCOk'), async function () {
        var c = await Pin.conferir(pin, info, ap);
        if (!c) return Tela.erro(tt('Sem conexão com a nuvem. Tente de novo.', 'No connection to the cloud. Try again.'));
        if (!c.ok) return Tela.erro(Pin.explicar(c.erro === 'espera' ? { erro: 'espera', ate: Date.parse(c.espera_ate), muitas: c.tentativas >= 10 } : { erro: 'pin', conta: true, restam: c.restam, ate: c.espera_ate ? 1 : 0 }));
        Portao.carregando(tt('Preparando o cadeado deste aparelho…', 'Preparing the lock on this device…')); await aoOk(pin, c);
      }); };
      $('#nvPCNovo').onclick = function () {
        Portao.novoPin(async function (pin) {
          var d; try { d = await Pin.definir(pin, null, null, ap); } catch (e) { d = null; }
          if (!d || !d.ok) { Portao.pinConta(info, ap, aoOk); return Tela.erro(tt('Para escolher outro PIN da conta, este aparelho precisa ter sido aprovado pelo seu outro aparelho (há menos de 10 minutos). Se foi a família que aprovou, use o PIN da conta.', 'To choose another account PIN, this device must have been approved by your other device (less than 10 minutes ago). If the family approved it, use the account PIN.')); }
          Portao.carregando(tt('Preparando o cadeado deste aparelho…', 'Preparing the lock on this device…')); await aoOk(pin, d);
        }, false);
      };
    },
    /* 1.10.0 (migração): o PIN antigo deste aparelho abriu, mas a conta já tem outro PIN */
    pinDaConta: function (fam, r, seguir) {
      var el = Tela.mostrar(Tela.topo() + '<h2>🔢 ' + tt('Agora o PIN é um só para a conta', 'Now there is one PIN for the account') + '</h2>' +
        '<p>' + tt('Este ' + apN() + ' ainda usava um PIN só dele. Digite o <b>PIN da conta</b> (o mesmo dos seus outros aparelhos). Depois disso, ele vale aqui também.', 'This ' + apN() + ' still had its own PIN. Type the <b>account PIN</b> (the same as on your other devices). After that, it works here too.') + '</p>' +
        '<label class="nv-fld"><span>' + tt('PIN da conta', 'Account PIN') + '</span><input type="text" class="nv-pinc" id="nvPDC" inputmode="numeric" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true"></label>' +
        '<div class="nv-nota erro nv-hidden" id="nvErro" role="alert"></div>' +
        '<button class="nv-btn pri" id="nvPDCOk">' + tt('Continuar', 'Continue') + '</button>' +
        '<button class="nv-lnk" id="nvPDCEsq">' + tt('Esqueci o PIN da conta', 'I forgot the account PIN') + '</button>');
      var $ = function (q) { return el.querySelector(q); };
      $('#nvPDC').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('#nvPDCOk').click(); });
      $('#nvPDCEsq').onclick = function () { Portao.primeiraVez(fam, true); };
      $('#nvPDCOk').onclick = function () { var pin = $('#nvPDC').value; if (!pin) return; Tela.ocupar($('#nvPDCOk'), async function () {
        var c = await Pin.conferir(pin, r.info, r.ap);
        if (!c) return Tela.erro(tt('Sem conexão com a nuvem. Tente de novo.', 'No connection to the cloud. Try again.'));
        if (!c.ok) return Tela.erro(Pin.explicar(c.erro === 'espera' ? { erro: 'espera', ate: Date.parse(c.espera_ate), muitas: c.tentativas >= 10 } : { erro: 'pin', conta: true, restam: c.restam, ate: c.espera_ate ? 1 : 0 }));
        await Pin.gravar(await Cadeado.local(), pin, r.raw, c.segredo, c.versao);
        seguir(await Cadeado.comChaveDoAparelho(await Cadeado.local(), r.raw, fam.grupo_id));
      }); };
    },
    /* 1.10.0 (migração): o PIN da conta está certo, mas este aparelho ainda está no PIN antigo dele: uma vez o antigo
       (ou a digital); não lembra → aprovar pelo outro aparelho */
    pinAntigo: async function (fam, r, seguir) {
      var L = await Cadeado.local();
      var el = Tela.mostrar(Tela.topo() + '<h2>🔢 ' + tt('Falta só um passo', 'Just one more step') + '</h2>' +
        '<p>' + tt('O PIN da conta está certo. Este ' + apN() + ' ainda está no PIN antigo dele: digite o <b>PIN antigo deste ' + apN() + '</b> uma vez só, para ele passar a usar o PIN da conta.', 'The account PIN is right. This ' + apN() + ' still uses its old PIN: type the <b>old PIN of this ' + apN() + '</b> once, so it switches to the account PIN.') + '</p>' +
        '<label class="nv-fld"><span>' + tt('PIN antigo deste aparelho', 'Old PIN of this device') + '</span><input type="text" class="nv-pinc" id="nvPA" inputmode="numeric" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true"></label>' +
        '<div class="nv-nota erro nv-hidden" id="nvErro" role="alert"></div>' +
        '<button class="nv-btn pri" id="nvPAOk">' + tt('Continuar', 'Continue') + '</button>' +
        (L && L.prf ? '<button class="nv-btn" id="nvPADig">👆 ' + tt('Usar a digital', 'Use the fingerprint') + '</button>' : '') +
        '<button class="nv-lnk" id="nvPAEsq">' + tt('Não lembro: aprovar pelo outro aparelho', "I don't remember: approve from my other device") + '</button>');
      var $ = function (q) { return el.querySelector(q); };
      var ir = function (pin) { return Tela.ocupar($(pin === null ? '#nvPADig' : '#nvPAOk'), async function () {
        var d = await Cadeado.duk(pin);
        if (d.erro) return Tela.erro(d.erro === 'pin' ? tt('Esse não é o PIN antigo deste aparelho.', 'That is not the old PIN of this device.') : d.erro === 'espera' ? tt('Espere um pouco para tentar de novo.', 'Wait a bit to try again.') : tt('Não abriu.', 'Did not open.'));
        await Pin.gravar(d.L, r.pinConta, d.raw, r.segredo, r.versao);
        seguir(await Cadeado.comChaveDoAparelho(await Cadeado.local(), d.raw, fam.grupo_id));
      }); };
      $('#nvPA').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('#nvPAOk').click(); });
      $('#nvPAOk').onclick = function () { var v = $('#nvPA').value; if (v) ir(v); };
      if ($('#nvPADig')) $('#nvPADig').onclick = function () { ir(null); };
      $('#nvPAEsq').onclick = function () { Portao.primeiraVez(fam, true); };
    },
    /* logo depois do PIN: abrir com a digital (mais fácil que digitar o PIN) */
    oferecerDigital: async function (seguir) {
      if (!(await Cadeado.temDigital())) return seguir();
      var el = Tela.mostrar(Tela.topo() + '<h2>👆 ' + tt('Usar a digital neste ' + apN() + '?', 'Use your fingerprint on this ' + apN() + '?') + '</h2>' +
        '<p>' + tt('Fica mais fácil: o MoneyTRIO abre com a digital (ou o rosto), sem digitar o PIN. O PIN continua valendo, caso a digital não funcione.', 'Easier: MoneyTRIO opens with your fingerprint (or face), without typing the PIN. The PIN still works if the fingerprint fails.') + '</p>' +
        '<div class="nv-nota erro nv-hidden" id="nvErro" role="alert"></div>' +
        '<button class="nv-btn pri" id="nvDigSim">👆 ' + tt('Usar a digital', 'Use fingerprint') + '</button><button class="nv-btn" id="nvDigNao">' + tt('Agora não', 'Not now') + '</button>');
      el.querySelector('#nvDigNao').onclick = function () { seguir(); };
      el.querySelector('#nvDigSim').onclick = function () { Tela.ocupar(el.querySelector('#nvDigSim'), async function () {
        var r = await Cadeado.ligarDigital();
        if (r.ok) { aviso('✓ ' + tt('Pronto: abre com a digital neste ' + apN() + '.', 'Done: opens with your fingerprint on this ' + apN() + '.')); return seguir(); }
        Tela.erro(r.erro === 'semprf' ? tt('Neste ' + apN() + ' (ou neste navegador) a digital ainda não consegue abrir com segurança. Continue com o PIN. Dica: no Chrome atualizado costuma funcionar.', 'On this ' + apN() + ' (or browser) the fingerprint cannot open securely yet. Keep using the PIN. Tip: an up-to-date Chrome usually works.') : tt('A digital não foi ligada. Pode tentar de novo ou tocar em "Agora não".', 'Fingerprint was not turned on. Try again or tap "Not now".'));
      }); };
    },
    pin: async function (fam, motivo) {
      var L = await Cadeado.local(), dig = L && L.prf, trancou = motivo || ssGet(K_TRANCOU);
      ssSet(K_TRANCOU, null);
      var hora = dataHora(new Date().toISOString());
      var el = Tela.mostrar(Tela.topo() +
        '<h2>🔒 ' + tt('MoneyTRIO fechado', 'MoneyTRIO is locked') + '</h2>' +
        (trancou ? '<div class="nv-nota" id="nvMotivo">' + (trancou === 'manual' ? tt('Você fechou o cadeado.', 'You locked it.')
          : trancou === 'fora' ? tt('Trancado porque o app ficou 10 min em segundo plano', 'Locked because the app was in the background for 10 min')
          : trancou === 'ocioso' ? tt('Trancado após 15 min sem uso', 'Locked after 15 min without use')
          : trancou === 'pinTrocado' ? tt('O PIN da conta foi trocado em outro aparelho: digite o PIN novo.', 'The account PIN was changed on another device: type the new PIN.')
          : tt('Fechado sozinho por segurança.', 'Locked by itself for safety.')) + (trancou === 'manual' ? '' : ' · ' + esc(hora)) + '</div>' : '') +
        '<p class="nv-muted" id="nvConectado">' + tt('Você continua conectado como ', 'You are still signed in as ') + '<b>' + esc(nomeConta()) + '</b>. ' + tt('Só falta destravar.', 'You only need to unlock.') + '<br>' + tt('Família ', 'Family ') + '<b>' + esc(fam.nome) + '</b></p>' +
        (L && L.bloqueado ? '<div class="nv-nota erro">' + tt('O PIN errou muitas vezes e ficou bloqueado neste ' + apN() + '. Toque em "Esqueci o PIN" e aprove pelo outro aparelho.', 'The PIN failed too many times and is blocked on this ' + apN() + '. Tap "I forgot the PIN" and approve from your other device.') + '</div>'
          : '<label class="nv-fld"><span>PIN</span><input type="text" class="nv-pinc" id="nvPin" inputmode="numeric" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true"></label><button class="nv-btn pri" id="nvPinOk">' + tt('Abrir', 'Open') + '</button>' +
            (dig ? '<button class="nv-btn" id="nvDig">👆 ' + tt('Abrir com a digital', 'Open with fingerprint') + '</button>' : '')) +
        '<div class="nv-nota erro nv-hidden" id="nvErro" role="alert"></div>' +
        '<div class="nv-row"><button class="nv-lnk" id="nvEsqPin">' + tt('Esqueci o PIN', 'I forgot the PIN') + '</button><button class="nv-lnk" id="nvSairP">' + tt('Entrar com outra conta', 'Sign in with another account') + '</button></div>');
      var $ = function (s) { return el.querySelector(s); };
      $('#nvSairP').onclick = function () { Nuvem.sair(false); };
      $('#nvEsqPin').onclick = function () { Portao.primeiraVez(fam, true); };
      var tratar = function (r) {
        if (r.ok) return (async function () {
          /* quem já tinha PIN e ainda não usa a digital: oferece uma vez */
          var L2 = await Cadeado.local(), k = 'digitalPerguntada|' + Conta.uid();
          var seguir = function () { if (Nuvem.iniciado) Nuvem.destrancado(); else Nuvem.depoisDoCadeado(false); };
          if (L2 && !L2.prf && !(await IDB.get('kv', k).catch(function () { return 1; }))) { await IDB.set('kv', k, Date.now()).catch(function () {}); return Portao.oferecerDigital(seguir); }
          seguir();
        })();
        if (r.erro === 'pinConta') return Portao.pinDaConta(fam, r, tratar);      /* 1.10.0: migração para o PIN da conta */
        if (r.erro === 'pinAntigo') return Portao.pinAntigo(fam, r, tratar);
        if (r.conta) return Tela.erro(Pin.explicar(r));
        if (r.erro === 'bloqueado') return Portao.pin(fam, motivo);
        if (r.erro === 'espera') return Tela.erro(tt('Espere ', 'Wait ') + Math.ceil((r.ate - Date.now()) / 1000) + tt(' segundos para tentar de novo.', ' seconds to try again.'));
        if (r.erro === 'pin') return Tela.erro(tt('PIN errado. ', 'Wrong PIN. ') + (r.erros >= 4 ? tt('Tentativas erradas: ', 'Wrong attempts: ') + r.erros + tt(' de 10. Na 10ª o PIN fica bloqueado.', ' of 10. On the 10th the PIN is blocked.') : ''));
        if (r.erro === 'offline') return Tela.erro(tt('Para abrir esta família pela primeira vez neste ' + apN() + ', ligue a internet.', 'To open this family for the first time on this ' + apN() + ', connect to the internet.'));
        if (r.erro === 'semliberar') return Tela.erro(tt('O cadeado desta família ainda não foi liberado para você. Peça para outro responsável abrir as Senhas da casa no OmniLifeONE.', 'This family lock has not been released to you yet. Ask another guardian to open the home passwords in OmniLifeONE.'));
        if (r.erro === 'novo') return Portao.primeiraVez(fam, false);
        Tela.erro(tt('A digital não abriu. Use o PIN.', 'Fingerprint did not open. Use the PIN.'));
      };
      if ($('#nvPinOk')) {
        $('#nvPin').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('#nvPinOk').click(); });
        $('#nvPinOk').onclick = function () { var p = $('#nvPin').value; if (!p) return; Tela.ocupar($('#nvPinOk'), async function () { tratar(await Pin.abrir(p, fam.grupo_id)); }); };
      }
      if ($('#nvDig')) $('#nvDig').onclick = function () { Tela.ocupar($('#nvDig'), async function () { tratar(await Cadeado.porDigital(fam.grupo_id)); }); };
    },
    /* dados só neste aparelho: levar para a nuvem (antes de qualquer coisa) */
    levar: function (loc, aoFim) {
      var partes = [];
      if (loc.gastos) partes.push((loc.gastos > 0 ? loc.gastos : '') + tt(' lançamentos', ' entries'));
      if (loc.posicoes) partes.push(loc.posicoes + tt(' investimentos', ' investments'));
      if (loc.movimentos) partes.push(loc.movimentos + tt(' movimentações', ' transactions'));
      var el = Tela.mostrar(Tela.topo() + '<h2>📦 ' + tt('Levar para a nuvem?', 'Move to the cloud?') + '</h2>' +
        '<p>' + tt('Este aparelho tem dados do MoneyTRIO guardados só aqui', 'This device has MoneyTRIO data kept only here') + (partes.length ? ': <b>' + esc(partes.join(', ')) + '</b>' : '') + '.</p>' +
        '<p>' + tt('A nuvem desta família ainda está vazia. Quer levar esses dados para lá? Eles vão fechados com o cadeado da família, e continuam também neste aparelho (no MoneyTRIO sem nuvem).', "This family's cloud is still empty. Move this data there? It goes closed with the family lock, and also stays on this device (in MoneyTRIO without cloud).") + '</p>' +
        '<p class="nv-muted">' + tt('Antes, baixe uma cópia de segurança (um arquivo) e guarde no computador.', 'First, download a backup copy (a file) and keep it on your computer.') + '</p>' +
        '<button class="nv-btn" id="nvCopia">⬇️ ' + tt('Baixar a cópia de segurança', 'Download the backup copy') + '</button>' +
        '<button class="nv-btn pri" id="nvLevarOk">☁️ ' + tt('Levar para a nuvem', 'Move to the cloud') + '</button>' +
        '<button class="nv-btn" id="nvLevarNao">' + tt('Agora não (começar vazio)', 'Not now (start empty)') + '</button>');
      var $ = function (s) { return el.querySelector(s); }, baixou = false;
      $('#nvCopia').onclick = function () {
        var blob = new Blob([loc.texto], { type: 'application/json' }), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'moneytrio-copia-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
        baixou = true; $('#nvCopia').textContent = '✓ ' + tt('Cópia baixada', 'Backup downloaded');
      };
      $('#nvLevarOk').onclick = function () {
        if (!baixou) { return Portao.mensagem(tt('Sem cópia de segurança?', 'No backup copy?'), tt('É mais seguro baixar a cópia antes. Quer levar assim mesmo?', 'It is safer to download the copy first. Move anyway?'),
          [[tt('Voltar e baixar a cópia', 'Go back and download'), function () { Portao.levar(loc, aoFim); }], [tt('Levar assim mesmo', 'Move anyway'), function () { aoFim(true); }]]); }
        aoFim(true);
      };
      $('#nvLevarNao').onclick = function () { aoFim(false); };
    }
  };

  /* ---------------- tranca sozinho (3.31, aprovado pelo dono em 03/Nov/2026) ----------------
     15 min sem uso (aviso com contagem 1 min antes) ou 10 min com o app em segundo plano. Nunca no meio de um trabalho
     (sincronia, levar para a nuvem, caixa do robô, tarefa do Fundo): espera terminar e conta o tempo de novo dali.
     Tranca sem recarregar: a tela do cadeado cobre o app e, ao abrir, tudo volta como estava (campos e rolagem). */
  var Trava = {
    ultimo: Date.now(), foraDesde: 0, _mov: 0, adiado: null, aviso: null,
    usou: function () { this.ultimo = Date.now(); if (this.aviso) this.tirarAviso(); Vale.renovar(); },
    /* 'pesado' = trabalho da pessoa (importação no Fundo, levar para a nuvem): espera e conta o tempo de novo.
       'leve' = a sincronia de rotina e a caixa do robô: só espera terminar (segundos) e tranca. */
    ocupado: function () {
      var fundo = false; try { fundo = typeof Fundo !== 'undefined' && Fundo.ativa && Fundo.ativa(); } catch (e) {}
      if (fundo || Nuvem.levando) return 'pesado';
      if (Sinc._env || Caixa._rodando || Nuvem._buscando) return 'leve';
      return '';
    },
    ligar: function () {
      var self = this;
      ['pointerdown', 'keydown', 'touchstart', 'wheel', 'input', 'scroll'].forEach(function (ev) {
        document.addEventListener(ev, function (e) {
          if (!Cadeado.aberto()) return;
          if (!e.isTrusted) return;   /* evento de mentira (de script) não é a pessoa usando */
          /* rolagem só conta se veio de um gesto da pessoa (toque, roda, tecla nos últimos 3 s): a rolagem que o próprio app
             causa ao redesenhar ou mudar de tamanho não é uso */
          if (ev === 'scroll') { if (Date.now() - (self._gesto || 0) > 3000) return; }
          else if (ev !== 'input') self._gesto = Date.now();
          self.porque = ev; self.usou();
        }, { passive: true, capture: true });
      });
      document.addEventListener('mousemove', function () { var t = Date.now(); if (t - self._mov < 5000) return; self._mov = t; if (Cadeado.aberto()) self.usou(); }, { passive: true, capture: true });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          self.foraDesde = Date.now(); Sinc.registrar(); Vale.limitar(Date.now() + FORA_MS);
          clearTimeout(self._t); self._t = setTimeout(function () { if (document.hidden) self.pedir('fora'); }, FORA_MS);
        } else {
          clearTimeout(self._t);
          var fora = self.foraDesde && Date.now() - self.foraDesde >= FORA_MS;
          self.foraDesde = 0;
          if (fora && Cadeado.aberto()) return self.pedir('fora');
          self.usou(); Nuvem.buscarAgora();
        }
      });
      setInterval(function () { self.conferir(); }, 1000);
      window.addEventListener('pagehide', function () { Sinc.registrar(); Vale.limitar(Date.now() + FORA_MS); });
      window.addEventListener('beforeunload', function (e) { if (Sinc._sujo || Nuvem.levando) { Sinc.registrar(); e.preventDefault(); e.returnValue = ''; } });
    },
    conferir: function () {
      if (!Cadeado.aberto()) return;
      if (this.adiado) { if (this.ocupado() === 'pesado') return; var m = this.adiado; this.adiado = null; this.ultimo = Date.now(); if (m === 'fora' && document.hidden) { this.foraDesde = Date.now(); var self = this; clearTimeout(this._t); this._t = setTimeout(function () { if (document.hidden) self.pedir('fora'); }, FORA_MS); } return; }
      if (document.hidden) return;
      var parado = Date.now() - this.ultimo;
      if (parado >= OCIOSO_MS) return this.pedir('ocioso');
      if (parado >= OCIOSO_MS - AVISO_MS) this.mostrarAviso(Math.ceil((OCIOSO_MS - parado) / 1000));
      else if (this.aviso) this.tirarAviso();
    },
    pedir: function (motivo) {
      var oc = this.ocupado();
      if (oc === 'pesado') { this.adiado = motivo; this.tirarAviso(); return; }
      if (oc === 'leve') { var self = this; clearTimeout(this._tLeve); this._tLeve = setTimeout(function () { if (Cadeado.aberto()) self.pedir(motivo); }, 1000); return; }
      this.tirarAviso(); Nuvem.trancar(motivo);
    },
    mostrarAviso: function (seg) {
      if (this.ocupado() === 'pesado') { this.ultimo = Date.now(); return; }   /* trabalho da pessoa rodando: conta de novo */
      if (!this.aviso) {
        var d = document.createElement('div'); d.className = 'nv-painel nv-avisotr'; d.setAttribute('role', 'alertdialog');
        d.innerHTML = '<div class="nv-card" style="margin-top:20vh;text-align:center"><h2>🔒 ' + tt('Por segurança, o MoneyTRIO vai trancar em ', 'For safety, MoneyTRIO will lock in ') + '<span id="nvConta">60</span> s</h2>' +
          '<p class="nv-muted">' + tt('Ficou 14 minutos sem uso.', 'It has been idle for 14 minutes.') + '</p>' +
          '<button class="nv-btn pri" id="nvContinuar" style="font-size:18px;padding:16px">' + tt('Continuar usando', 'Keep using') + '</button></div>';
        document.body.appendChild(d); this.aviso = d;
        var self = this; d.querySelector('#nvContinuar').onclick = function () { self.usou(); };
      }
      var c = this.aviso.querySelector('#nvConta'); if (c) c.textContent = String(Math.max(0, seg));
    },
    tirarAviso: function () { if (this.aviso) { this.aviso.remove(); this.aviso = null; } }
  };

  /* ---------------- o maestro ---------------- */
  /* ---------------- Arquivos (1.7.0): bytes fechados com a chave da família, no Storage ----------------
     Bucket privado 'money-arquivos', caminho '<grupo>/<id>' (SQL: supabase/2026-11-06-moneytrio-arquivos.sql).
     Formato: 'MTA1' + kv (4 bytes) + iv (12) + AES-GCM(bytes). O banco nunca vê o arquivo aberto.
     Usado pelo modulos/arquivos.js; sem nuvem (ou cadeado fechado), ativo() = false. */
  var BUCKET = 'money-arquivos', RX_ARQ = /^[A-Za-z0-9_-]{6,80}$/;
  var Arquivos = {
    ativo: function () { return !!(Nuvem.iniciado && Cadeado.aberto() && Sinc.gid); },
    cifrar: async function (bytes) {
      if (!Cadeado.aberto()) throw new Error('cadeado fechado');
      var iv = Cifra.rnd(12), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, Cadeado.cf, bytes));
      var out = new Uint8Array(4 + 4 + 12 + ct.length);
      out.set([77, 84, 65, 49], 0); new DataView(out.buffer).setUint32(4, Cadeado.kv >>> 0); out.set(iv, 8); out.set(ct, 20);
      return out;
    },
    decifrar: async function (bytes) {
      var b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      if (b.length < 21 || b[0] !== 77 || b[1] !== 84 || b[2] !== 65 || b[3] !== 49) throw new Error('formato');
      if (!Cadeado.aberto()) throw new Error('cadeado fechado');
      var kv = new DataView(b.buffer, b.byteOffset).getUint32(4);
      if (kv !== (Cadeado.kv >>> 0)) { var e = new Error('chave de outra versão'); e.codigo = 'kv'; throw e; }
      return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(8, 20) }, Cadeado.cf, b.slice(20)));
    },
    url: function (id, ler) {
      if (!RX_ARQ.test(String(id))) throw new Error('id do arquivo');
      return SB + '/storage/v1/object/' + (ler ? 'authenticated/' : '') + BUCKET + '/' + Sinc.gid + '/' + id;
    },
    /* sobe os bytes JÁ cifrados. true = guardado (ou já estava); erro com .codigo 'sembucket' se o SQL ainda não foi aplicado */
    subir: async function (id, cifrados) {
      var t = await Conta.token(); if (!t) throw new Error('sem sessão');
      var r = await fetch(this.url(id), { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'application/octet-stream', 'x-upsert': 'false' }, body: cifrados });
      if (r.ok) return true;
      var txt = await r.text().catch(function () { return ''; });
      if (r.status === 409 || /duplicate|already exists/i.test(txt)) return true;
      var e = new Error('Storage ' + r.status + ' ' + txt.slice(0, 120)); e.status = r.status;
      if (/bucket not found/i.test(txt) || r.status === 404) e.codigo = 'sembucket';
      throw e;
    },
    /* baixa os bytes cifrados; null se não existe */
    baixar: async function (id) {
      var t = await Conta.token(); if (!t) throw new Error('sem sessão');
      var r = await fetch(this.url(id, true), { headers: { apikey: KEY, Authorization: 'Bearer ' + t } });
      if (r.status === 404 || r.status === 400) return null;
      if (!r.ok) { var e = new Error('Storage ' + r.status); e.status = r.status; throw e; }
      return new Uint8Array(await r.arrayBuffer());
    }
  };

  /* 1.8.0 — mensagens de outros apps da família (sol_ponte), fechadas com a CF */
  var Ponte = {
    vistos: new Set(),
    buscar: async function () {
      if (!window.MoneyModulos || !Cadeado.aberto()) return [];
      var rows; try { rows = await Conta.rpc('sol_ponte_minha_caixa', { p_app: APP, p_so_nao_lidas: true, p_limite: 50 }); } catch (e) { return []; }
      var out = [];
      for (var i = 0; i < (rows || []).length; i++) {
        var r = rows[i]; if (this.vistos.has(r.id) || (r.grupo_id && r.grupo_id !== Cadeado.gid)) continue;
        this.vistos.add(r.id);
        var d = r.dados || {}, cif = d.cif == null ? null : (typeof d.cif === 'string' ? d.cif : JSON.stringify(d.cif));
        out.push({ id: r.id, de_app: r.de_app, tipo: r.tipo, criado_em: r.criado_em, conteudo: cif ? await Cadeado.abrir(cif) : null });
      }
      if (out.length) MoneyModulos.emitir('ponte.recebida', out);
      return out;
    },
    marcarLido: function (id) { return Conta.rpc('sol_ponte_marcar_lido', { p_id: id, p_app: APP }); }
  };

  var Nuvem = {
    ponte: { marcarLido: function (id) { return Ponte.marcarLido(id); } },
    /* 1.11.0: planilha espelho e os membros da família (para o cadastro de pessoas) */
    espelho: { enfileirar: function (o) { return Espelho.enfileirar(o); }, enviar: function () { return Espelho.enviar(); },
      pendentes: function () { return Espelho.pendentes(); }, selar: function (t, j, g, o) { return Espelho.selar(t, j, g, o); },
      estado: function () { return { ligado: Espelho.ligado, problema: Espelho.problema, enviados: Espelho.enviados, ativo: !!(Sinc.gid && Cadeado.aberto()) }; } },
    membros: async function () {
      if (!Sinc.gid || !Conta.on()) return [];
      try { return (await Conta.rest('GET', 'sol_grupo_membros?grupo_id=eq.' + Sinc.gid + '&status=eq.ativo&select=id,user_id,perfil_id,apelido,papel')) || []; } catch (e) { return []; }
    },
    arquivos: Arquivos,
    iniciado: false, familia: null, podeLevar: false,
    /* 3.32: o nome da pessoa no topo (no lugar de "Dono da carteira"): nome do perfil SolverONE (user_settings.display_name),
       senão o nome do Google (user_metadata), senão a parte do e-mail antes do @. Sem nuvem: o app fica como sempre. */
    _nome: '',
    email: function () { return this.iniciado && !this.local ? Conta.email() : ''; },
    nomePessoa: function () {
      if (!this.iniciado || this.local || !Conta.on()) return '';
      if (this._nome) return this._nome;
      var s = Conta.ler() || {}, d = Conta.dados(s.access_token).user_metadata || {};
      var n = String(s.nome || d.full_name || d.name || '').trim();
      if (!n) n = String(Conta.email() || '').split('@')[0];
      return n.slice(0, 60);
    },
    buscarNome: async function () {
      try {
        var r = await Conta.rest('GET', 'user_settings?user_id=eq.' + Conta.uid() + '&select=display_name');
        var n = r && r[0] && String(r[0].display_name || '').trim();
        if (n) this._nome = n.slice(0, 60);
      } catch (e) {}
      try { if (typeof renderPerfilTopo === 'function') renderPerfilTopo(); } catch (e) {}
    },
    /* chamado no lugar do iniciar() do app (index.html) */
    portao: function (iniciarApp) {
      this.iniciarApp = iniciarApp;
      /* voltou do Google / e-mail com a sessão no endereço: é para a nuvem, mesmo quem usava só no aparelho */
      if (/access_token=|error_description=/.test(location.hash || '')) lsDel(K_SO_AQUI);
      if (lsGet(K_SO_AQUI, 0)) return this.modoLocal();
      this.ligarStore();
      if (!(window.crypto && crypto.subtle && window.indexedDB)) {
        return Portao.mensagem(tt('Este navegador não serve para a nuvem', 'This browser cannot use the cloud'), tt('Para a nuvem, use o Chrome, o Edge ou o Safari atualizados, pelo endereço https.', 'For the cloud, use an up-to-date Chrome, Edge or Safari, over https.'), [[tt('Usar só neste aparelho', 'Use only on this device'), function () { Nuvem.soNesteAparelho(); }]]);
      }
      var ret = Conta.lerRetorno();
      if (ret === 'confirmar') return Portao.confirmarLink();
      if (ret) Conta.registrarAcesso('login');
      if (ret === 'recovery') return Portao.novaSenha();
      if (!Conta.on()) return Portao.entrar();
      this.depoisDaConta();
    },
    /* sem conta: o MoneyTRIO de sempre, guardado só neste aparelho (nada da nuvem é carregado) */
    soNesteAparelho: function () { lsSet(K_SO_AQUI, 1); location.reload(); },   /* recarrega: o Store volta a ser o de sempre */
    modoLocal: function () {
      this.local = true;
      Tela.montar(); Tela.fechar();
      try { this.iniciarApp(); } catch (e) { console.error('app:', e); }
      var b = document.createElement('button'); b.className = 'nv-selo'; b.id = 'nvSelo'; b.type = 'button';
      b.textContent = '☁️ ' + tt('Entrar na nuvem', 'Use the cloud');
      b.title = tt('Guardar na nuvem com a conta SolverONE', 'Save in the cloud with your SolverONE account');
      b.onclick = function () { lsDel(K_SO_AQUI); location.reload(); };
      document.body.appendChild(b);
    },
    /* o Store do app passa a guardar na nuvem (nada de finanças em claro no localStorage) */
    ligarStore: function () {
      var S = Store;
      S.carregar = function () { return { origem: 'nuvem' }; };
      S.salvar = function () {
        this.estado.atualizadoEm = new Date().toISOString();
        try { var ch = (this.estado.config && this.estado.config.chaves) || {}; Cofre.gravar(ch); } catch (e) {}   /* chaves de API: o cofre local de sempre */
        Sinc.marcar();
        return true;
      };
      /* "Apagar tudo" com a nuvem não apaga nada: nem a nuvem da família, nem o MoneyTRIO sem nuvem deste aparelho */
      S.limparTudo = function () { aviso(tt('Com a nuvem, "apagar tudo" não apaga os dados da família. Para tirar os dados deste aparelho: ☁️ → Desconectar este aparelho.', 'With the cloud, "erase all" does not erase the family data. To remove the data from this device: ☁️ → Disconnect this device.'), 'warn'); };
    },
    depoisDaConta: async function () {
      Portao.carregando(tt('Procurando as suas famílias…', 'Looking for your families…'));
      var uid = Conta.uid(), lista = null;
      await Vale.apagarOutros(uid);   /* entrou com outra conta: o vale de quem estava antes sai */
      try {
        if ((await Conta.rpc('minha_conta_encerrada')) === true) {
          await this.apagarDoAparelho(uid); await Conta.sair();
          return Portao.mensagem(tt('Conta encerrada', 'Account closed'), tt('Esta conta SolverONE foi encerrada. A cópia deste aparelho foi apagada.', 'This SolverONE account was closed. The copy on this device was erased.'), [[tt('Ok', 'Ok'), function () { Portao.entrar(); }]]);
        }
      } catch (e) {}
      try { lista = await Conta.rpc('sol_meus_grupos'); await IDB.set('kv', 'familias|' + uid, lista); }
      catch (e) {
        if (!Conta.on()) return Portao.entrar();
        lista = await IDB.get('kv', 'familias|' + uid).catch(function () { return null; });   /* sem internet: a última lista */
        if (!lista) return Portao.mensagem(tt('Sem internet', 'No internet'), tt('Para a primeira vez neste ' + apN() + ', ligue a internet.', 'For the first time on this ' + apN() + ', connect to the internet.'), [[tt('Tentar de novo', 'Try again'), function () { Nuvem.depoisDaConta(); }]]);
      }
      var minhas = (lista || []).filter(function (g) { return g.meu_papel === 'chefe' || g.meu_papel === 'responsavel'; });
      if (!minhas.length) {
        return Portao.mensagem(tt('Nenhuma família para as finanças', 'No family for finances'), tt('As finanças ficam com a família, e só chefe ou responsável veem. Esta conta (', 'Finances belong to the family, and only heads or guardians see them. This account (') + esc(Conta.email()) + tt(') não é chefe nem responsável de nenhuma família. Crie ou entre na família pelo OmniLifeONE e volte aqui.', ') is not head or guardian of any family. Create or join the family in OmniLifeONE and come back.'),
          [[tt('Sair da conta', 'Sign out'), function () { Nuvem.sair(false); }], [tt('Tentar de novo', 'Try again'), function () { Nuvem.depoisDaConta(); }]]);
      }
      var ult = lsGet(K_FAM, null), achou = minhas.find(function (g) { return g.grupo_id === ult; });
      if (achou || minhas.length === 1) return this.abrirFamilia(achou || minhas[0]);
      Portao.familias(minhas, function (g) { Nuvem.abrirFamilia(g); });
    },
    abrirFamilia: async function (fam) {
      this.familia = fam; lsSet(K_FAM, fam.grupo_id);
      var L = await Cadeado.local();
      if (!L) return Portao.primeiraVez(fam, false);
      if (!L.bloqueado && (await Vale.usar(fam.grupo_id))) return this.depoisDoCadeado(false);   /* recarregou dentro dos 15 min */
      Portao.pin(fam);
    },
    /* cadeado aberto: carrega a cópia fechada do aparelho, busca o que mudou e liga o app */
    depoisDoCadeado: async function (primeira) {
      var fam = this.familia;
      Portao.carregando(tt('Abrindo os seus dados…', 'Opening your data…'));
      try {
        await Sinc.carregar(fam.grupo_id);
        if (navigator.onLine) { try { Portao.andar(tt('Buscando na nuvem…', 'Fetching from the cloud…')); await Sinc.buscar(); } catch (e) { console.warn('nuvem: busca', e); } }
        var regs = await Sinc.abrirTudo(function (i, n) { Portao.andar(i + ' / ' + n); });
        var loc = Portao.dadosLocais(), migrado = await IDB.get('kv', 'migrado|' + fam.grupo_id);
        this.podeLevar = !!loc && Sinc.vivos() === 0 && !migrado;
        if (this.podeLevar && navigator.onLine) {
          var querLevar = await new Promise(function (res) { Portao.levar(loc, res); });
          await IDB.set('kv', 'migrado|' + fam.grupo_id, querLevar ? 'levou' : 'nao');
          if (querLevar) { this.podeLevar = false; return this.comecar(Store.migrar(JSON.parse(loc.texto)), true); }
        }
        this.comecar(reconstruir(regs), false);
        if (Sinc.falhasAbrir) aviso('⚠️ ' + Sinc.falhasAbrir + tt(' registros não abriram com este cadeado.', ' records did not open with this lock.'), 'warn');
      } catch (e) {
        console.error('nuvem:', e);
        Portao.mensagem(tt('Não deu para abrir', 'Could not open'), esc(Conta.explicar(e)), [[tt('Tentar de novo', 'Try again'), function () { Nuvem.depoisDoCadeado(false); }]]);
      }
    },
    comecar: async function (estado, levar) {
      var S = Store;
      S.estado = estado;
      Sinc.ultimo = levar ? new Map() : mapear(estado);
      Tela.fechar();
      this.iniciado = true;
      try { await this.iniciarApp(); } catch (e) { console.error('app:', e); }
      Painel.montar(); Trava.ligar();
      this.buscarNome();
      window.addEventListener('online', function () { Painel.atualizar(); Nuvem.buscarAgora(); });
      window.addEventListener('offline', function () { Painel.atualizar(); });
      if (levar) {
        this.levando = true; aviso('☁️ ' + tt('Levando para a nuvem… Pode continuar usando.', 'Moving to the cloud… You can keep using it.'));
        await Sinc.registrar(); await Sinc.enviar(); this.levando = false;
        if (!Sinc.fila.size) aviso('✓ ' + tt('Pronto: tudo guardado na nuvem.', 'Done: everything is saved in the cloud.'));
      }
      setInterval(function () { Nuvem.buscarAgora(); }, BUSCA_MS);
      setTimeout(function () { Nuvem.buscarAgora(); }, 1500);
      Aparelhos.aoAbrir();   /* 1.9.0: registra este aparelho (quem já usava), confere se não foi tirado, avisa aparelho novo */
    },
    levarDeNovo: async function () {
      var loc = Portao.dadosLocais(); if (!loc || Sinc.vivos() > 0) { this.podeLevar = false; return; }
      var ok = await new Promise(function (res) { Portao.levar(loc, res); }); Tela.fechar();
      if (!ok) return;
      this.podeLevar = false; await IDB.set('kv', 'migrado|' + Sinc.gid, 'levou');
      var novo = Store.migrar(JSON.parse(loc.texto));
      Object.keys(Store.estado).forEach(function (k) { delete Store.estado[k]; });
      Object.assign(Store.estado, novo);
      try { Store.estado.config.chaves = await Cofre.carregar(); } catch (e) {}
      this.levando = true; await Sinc.registrar(); this.redesenhar(); await Sinc.enviar(); this.levando = false;
      aviso(Sinc.fila.size ? '⏳ ' + tt('Continua subindo…', 'Still uploading…') : '✓ ' + tt('Pronto: tudo guardado na nuvem.', 'Done: everything is saved in the cloud.'));
    },
    /* a cada 20 s, ao voltar para o app e quando a internet volta */
    buscarAgora: async function () {
      if (typeof Fundo !== 'undefined' && Fundo.mostrar) Fundo.mostrar('nuvem', null, tt('Sincronizando com a nuvem', 'Syncing with the cloud'));
      try { return await this._buscarAgora.apply(this, arguments); } finally { if (typeof Fundo !== 'undefined' && Fundo.esconder) Fundo.esconder('nuvem'); }
    },
    _buscarAgora: async function () {
      if (!this.iniciado || !Cadeado.aberto() || this._buscando) return;
      this._buscando = true;
      try {
        if (!navigator.onLine || !Conta.on()) return;
        await Sinc.registrar();
        await Sinc.enviar();
        var mudou = await Sinc.buscar();
        if (mudou.length) {
          var abertos = [];
          for (var i = 0; i < mudou.length; i++) abertos.push([mudou[i][0], mudou[i][1] ? await Cadeado.abrir(mudou[i][1]) : null]);
          this.aplicar(abertos);
        }
        this._voltas = (this._voltas || 0) + 1;
        if (this._voltas % 3 === 1) { await this.conferirPapel(); await Ponte.buscar(); if (this._voltas > 1) await Aparelhos.aoAbrir(); }
        Aparelhos.olharPedidos();   /* 1.9.0: pedido de acesso de um aparelho novo (meu ou da família) */
        Caixa.esvaziar();
        Espelho.enviar();   /* 1.11.0: o que ficou na fila do espelho (sem internet, chave do robô ainda não publicada) */
      } catch (e) { console.warn('nuvem: busca', e); }
      finally { this._buscando = false; Painel.atualizar(); }
    },
    /* mudanças que vieram de outro aparelho → dentro do Store, sem recarregar */
    aplicar: function (lista) {
      var est = Store.estado, mexeu = false, idx = {};
      lista.forEach(function (p) {
        var k = p[0], o = p[1], c = k.indexOf('|'), col = k.slice(0, c), id = k.slice(c + 1);
        if (col === 'config') {
          if (RESERVADOS[id]) return;
          if (id === 'tax') { if (o) { est.tax = est.tax || {}; Object.keys(o.v || {}).forEach(function (x) { est.tax[x] = o.v[x]; }); } }
          else if (o) { var v = o.v; if (id === 'config' && v && typeof v === 'object') { v = Object.assign({}, v, { chaves: (est.config && est.config.chaves) || {} }); } est[id] = v; }
          mexeu = true; return;
        }
        var lista2 = listaDe(est, col);
        if (!lista2) {
          if (itens().indexOf(col) >= 0) { est[col] = []; lista2 = est[col]; }
          else if (col.indexOf('tax_') === 0 && TAX_ITENS.indexOf(col.slice(4)) >= 0) { est.tax = est.tax || {}; est.tax[col.slice(4)] = []; lista2 = est.tax[col.slice(4)]; }
          else return;   /* coleção que esta versão não conhece: fica guardada, não aparece */
        }
        if (!idx[col]) { idx[col] = {}; idsDaLista(lista2).forEach(function (q, i) { idx[col][q[0]] = i; }); }
        var i = idx[col][id];
        if (o) { if (i == null) { lista2.push(o); idx[col][id] = lista2.length - 1; } else lista2[i] = o; }
        else if (i != null) { lista2.splice(i, 1); idx[col] = null; }
        mexeu = true;
      });
      if (!mexeu) return;
      Sinc.ultimo = mapear(est);
      this.redesenhar();
    },
    redesenhar: function () {
      var self = this;
      clearTimeout(this._tDes);
      this._tDes = setTimeout(function () {
        var ae = document.activeElement, digitando = ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName);
        var janela = document.querySelector('.modal-wrap:not(.hidden)');
        if (digitando || janela) return self.redesenhar();   /* não atrapalha quem está escrevendo: espera */
        try { Nuvem._redesenhouEm = Date.now(); if (typeof render === 'function') render(); } catch (e) { console.warn('nuvem: redesenhar', e); }
      }, 400);
    },
    /* a pessoa saiu da família ou deixou de ser chefe/responsável: a cópia deste aparelho sai */
    conferirPapel: async function () {
      var lista; try { lista = await Conta.rpc('sol_meus_grupos'); } catch (e) { return; }
      var g = (lista || []).find(function (x) { return x.grupo_id === Sinc.gid; });
      if (g && (g.meu_papel === 'chefe' || g.meu_papel === 'responsavel')) return;
      await Sinc.apagarFamilia(Sinc.gid);
      var L = await Cadeado.local(); if (L && L.fam) { delete L.fam[Sinc.gid]; await Cadeado.gravar(L); }
      await Cadeado.trancar(); lsDel(K_FAM);
      alertaERecarrega(tt('Você não é mais chefe ou responsável desta família. A cópia deste aparelho foi apagada.', 'You are no longer head or guardian of this family. The copy on this device was erased.'));
    },
    trancar: async function (motivo) {
      if (!Cadeado.aberto()) return;
      try { await Promise.race([Sinc.registrar(), dorme(4000)]); } catch (e) {}
      Trava.tirarAviso(); Painel.fechar();
      this._rolagem = [window.scrollX, window.scrollY];
      this._foco = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
      this.motivoTranca = motivo || 'manual';
      await Cadeado.trancar();   /* a chave da família sai da memória (e o vale deste aparelho também) */
      var app = document.getElementById('app'); if (app) app.setAttribute('aria-hidden', 'true');
      Portao.pin(this.familia, this.motivoTranca);
    },
    /* abriu de novo com o PIN/digital: tira a tela do cadeado; o app continua exatamente como estava */
    destrancado: function () {
      Tela.fechar(); this.motivoTranca = null;
      var app = document.getElementById('app'); if (app) app.removeAttribute('aria-hidden');
      if (this._rolagem) window.scrollTo(this._rolagem[0], this._rolagem[1]);
      try { if (this._foco && this._foco.isConnected) this._foco.focus({ preventScroll: true }); } catch (e) {}
      Trava.usou(); this.buscarAgora();
    },
    sair: async function (desconectar) {
      var n = 0; Sinc.fila.forEach(function () { n++; });
      if (desconectar && n && !confirmar(tt('Ainda há ', 'There are still ') + n + tt(' mudanças que não subiram para a nuvem. Se desconectar agora, elas se perdem. Desconectar assim mesmo?', ' changes not uploaded yet. If you disconnect now, they are lost. Disconnect anyway?'))) return;
      if (!desconectar) { try { await Promise.race([Sinc.registrar().then(function () { return Sinc.enviar(); }), dorme(5000)]); } catch (e) {} }
      var uid = Conta.uid();
      if (desconectar) await this.apagarDoAparelho(uid);
      await Cadeado.trancar(); await Conta.sair();
      location.href = location.pathname;
    },
    /* "Desconectar este aparelho", conta encerrada ou banida: a cópia fechada e o cadeado saem deste aparelho */
    apagarDoAparelho: async function (uid) {
      var lista = (await IDB.get('kv', 'familias|' + uid).catch(function () { return null; })) || [];
      for (var i = 0; i < lista.length; i++) await Sinc.apagarFamilia(lista[i].grupo_id);
      if (Sinc.gid) await Sinc.apagarFamilia(Sinc.gid);
      await IDB.del('kv', 'cadeado|' + uid); await IDB.del('kv', 'familias|' + uid);
      lsDel(K_FAM);
    },
    /* para os testes automáticos (teste/nuvem.js): as peças, sem estado aberto */
    _teste: { Pin: Pin, Aparelhos: Aparelhos, Ponte: Ponte, IDB: IDB, Vale: Vale, Trava: Trava, Cifra: Cifra, mapear: mapear, reconstruir: reconstruir, juntar: juntar, idsDaLista: idsDaLista, Caixa: Caixa, Sinc: Sinc, Cadeado: Cadeado, Portao: Portao, Espelho: Espelho }
  };
  function nomeConta() { var s = Conta.ler() || {}, d = Conta.dados(s.access_token).user_metadata || {}; return String(s.nome || d.full_name || d.name || '').trim() || String(Conta.email() || '').split('@')[0]; }
  function confirmar(t) { try { return window.confirm(t); } catch (e) { return false; } }
  function alertaERecarrega(t) { try { window.alert(t); } catch (e) {} location.reload(); }

  window.MoneyNuvem = Nuvem;
})();
