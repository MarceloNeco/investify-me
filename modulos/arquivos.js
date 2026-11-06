/* =====================================================================
   modulos/arquivos.js — cofre de arquivos (PDF de NF, informes, apólices)   1.0.0 · 06/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     Guarda arquivos da família e devolve quando pedem, sem IA e sem olhar o conteúdo.
     · Com a nuvem: os bytes são fechados com a chave da família (MoneyNuvem.arquivos.cifrar) antes de
       sair do navegador; ficam numa cópia local (IndexedDB) e sobem para o Storage do Supabase
       (bucket privado 'money-arquivos'). Se o SQL do bucket ainda não foi aplicado, ficam só no
       aparelho e sobem sozinhos depois (sincronizar()).
     · Sem nuvem ("só neste aparelho"): ficam só no IndexedDB deste navegador, como o resto dos dados.
   API (window.ArquivosFamilia)
     guardar(meta, bytes)  → Promise<meta>. meta = {nome, tipo, ano, ligado?, mime?}; devolve com id, tamanho…
     ler(id)               → Promise<Uint8Array|null>   (abre, de onde estiver: aparelho ou nuvem)
     baixar(id)            → Promise<boolean>           (entrega o arquivo com o nome guardado)
     lista(filtro?)        → [meta]                     filtro = {ano, tipo, ligado}
     achar(id)             → meta | null
     sincronizar()         → Promise<{subiram, faltam}> (sobe o que ainda não está na nuvem)
     nomeLimpo(texto)      → texto que serve de nome de arquivo
     LIMITE                → tamanho máximo (15 MB)
   DADOS
     Store.estado.arquivos = [{id, nome, tipo, ano, ligado, mime, tamanho, criadoEm, nuvem, kv?}]
     (só a descrição; os bytes ficam no IndexedDB 'moneytrio-arquivos' e no Storage)
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'arquivos', DB = 'moneytrio-arquivos', LOJA = 'arq', LIMITE = 15 * 1024 * 1024;

  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function nv() { return window.MoneyNuvem && MoneyNuvem.arquivos && MoneyNuvem.arquivos.ativo() ? MoneyNuvem.arquivos : null; }
  function novoId() { var a = crypto.getRandomValues(new Uint8Array(12)); return 'f' + Array.from(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }

  /* ---------- IndexedDB (uma loja só, chave = id) ---------- */
  var _db = null;
  function abrirDb() {
    if (_db) return _db;
    _db = new Promise(function (ok, erro) {
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { if (!r.result.objectStoreNames.contains(LOJA)) r.result.createObjectStore(LOJA); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { _db = null; erro(r.error); };
    });
    return _db;
  }
  function idb(modo, fn) {
    return abrirDb().then(function (db) {
      return new Promise(function (ok, erro) {
        var tx = db.transaction(LOJA, modo), st = tx.objectStore(LOJA), req = fn(st);
        tx.oncomplete = function () { ok(req && req.result); };
        tx.onerror = function () { erro(tx.error); };
      });
    });
  }
  var Local = {
    gravar: function (id, v) { return idb('readwrite', function (st) { return st.put(v, id); }); },
    pegar: function (id) { return idb('readonly', function (st) { return st.get(id); }); }
  };

  var API = {
    LIMITE: LIMITE,
    lista: function (f) {
      f = f || {};
      return lista().filter(function (m) {
        return (f.ano == null || Number(m.ano) === Number(f.ano)) && (!f.tipo || m.tipo === f.tipo) && (!f.ligado || m.ligado === f.ligado);
      }).sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome)); });
    },
    achar: function (id) { return lista().find(function (m) { return m.id === id; }) || null; },
    nomeLimpo: function (t) {
      return String(t || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90);
    },
    guardar: async function (meta, bytes) {
      var b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      if (!b.length) throw new Error(I18n.atual === 'pt' ? 'Arquivo vazio.' : 'Empty file.');
      if (b.length > LIMITE) throw new Error(I18n.atual === 'pt' ? 'Arquivo grande demais (máximo 15 MB).' : 'File too large (15 MB max).');
      var m = {
        id: novoId(), nome: API.nomeLimpo(meta.nome) || 'arquivo.pdf', tipo: String(meta.tipo || 'outro'),
        ano: Number(meta.ano) || new Date().getFullYear(), ligado: String(meta.ligado || ''), mime: String(meta.mime || 'application/pdf'),
        tamanho: b.length, criadoEm: new Date().toISOString(), nuvem: false
      };
      var N = nv();
      if (N) { var c = await N.cifrar(b); await Local.gravar(m.id, { cif: true, bytes: c }); }
      else await Local.gravar(m.id, { cif: false, bytes: b });
      lista().push(m); Store.salvar();
      if (N) API.sincronizar();
      return m;
    },
    ler: async function (id) {
      var m = API.achar(id); if (!m) return null;
      var loc = await Local.pegar(id).catch(function () { return null; });
      var N = nv();
      if (loc) {
        if (!loc.cif) return loc.bytes instanceof Uint8Array ? loc.bytes : new Uint8Array(loc.bytes);
        if (!N) throw new Error(I18n.atual === 'pt' ? 'Abra o cadeado da nuvem para ver este arquivo.' : 'Unlock the cloud to see this file.');
        return N.decifrar(loc.bytes);
      }
      if (!N) return null;
      var c = await N.baixar(id); if (!c) return null;
      await Local.gravar(id, { cif: true, bytes: c }).catch(function () {});
      return N.decifrar(c);
    },
    baixar: async function (id) {
      var m = API.achar(id), b = await API.ler(id);
      if (!m || !b) { toast(I18n.atual === 'pt' ? 'Este arquivo não está neste aparelho nem na nuvem ainda.' : 'This file is not on this device or in the cloud yet.', 'warn'); return false; }
      var url = URL.createObjectURL(new Blob([b], { type: m.mime || 'application/pdf' }));
      var a = document.createElement('a'); a.href = url; a.download = m.nome; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); if (a.parentNode) a.parentNode.removeChild(a); }, 4000);
      return true;
    },
    _subindo: false,
    sincronizar: async function () {
      var N = nv(); if (!N || API._subindo || !navigator.onLine) return { subiram: 0, faltam: lista().filter(function (m) { return !m.nuvem; }).length };
      API._subindo = true; var subiram = 0, mudou = false;
      try {
        var pend = lista().filter(function (m) { return !m.nuvem; });
        for (var i = 0; i < pend.length; i++) {
          var loc = await Local.pegar(pend[i].id).catch(function () { return null; });
          if (!loc) continue;                                        /* guardado em outro aparelho: ele sobe */
          var c = loc.cif ? loc.bytes : await N.cifrar(loc.bytes instanceof Uint8Array ? loc.bytes : new Uint8Array(loc.bytes));
          if (!loc.cif) await Local.gravar(pend[i].id, { cif: true, bytes: c });
          try { await N.subir(pend[i].id, c); pend[i].nuvem = true; subiram++; mudou = true; }
          catch (e) { if (e.codigo === 'sembucket') break; throw e; }
        }
      } catch (e) { try { console.warn('arquivos: subir', e); } catch (e2) {} }
      finally { API._subindo = false; if (mudou) Store.salvar(); }
      return { subiram: subiram, faltam: lista().filter(function (m) { return !m.nuvem; }).length };
    }
  };

  MoneyModulos.registrar({
    id: 'arquivos',
    versao: '1.0.0',
    colecoes: [COL],
    iniciar: function () {
      setTimeout(function () { API.sincronizar(); }, 5000);
      setInterval(function () { API.sincronizar(); }, 120000);
      window.addEventListener('online', function () { API.sincronizar(); });
    }
  });
  window.ArquivosFamilia = API;
})();
