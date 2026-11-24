/* =====================================================================
   modulos/google-drive.js — "Conectar Google": o componente SolverGoogle (3.103)        1.0.0 · 24/Nov/2026
   ---------------------------------------------------------------------
   Peça da PLATAFORMA, escrita no MoneyTRIO com o contrato da conversa de diretrizes (24/Nov/2026; pendência #151 do RootifyONE):
   sem nada do app dentro (o nome da subpasta, as telas e os textos do carro ficam em modulos/carro-drive.js). Para levar ao módulo
   comum como google.js é copiar este arquivo.
   O QUE FAZ
     · Configuração da PLATAFORMA (o usuário final nunca mexe no Google Cloud): o bloco "google" {clienteId, chavePicker, projeto} de
       <origem>/solverone-dados/servicos/<app>.json (o master publicado pelo RootifyONE). Enquanto o RootifyONE não tem a tela, o dono
       cola os três numa tela escondida (formularioDono, só no aparelho dele: localStorage, nunca nos dados da família nem na nuvem).
       Os três são identificadores públicos (a proteção é a lista de origens do cliente OAuth e a restrição da chave); nunca o client
       secret. Sem configuração, estado().configurado = false e o app não mostra o botão.
     · conectar: Google Identity Services (token client), sempre num toque da pessoa; o token fica SÓ na memória (nunca localStorage
       nem IndexedDB) e expira em ~1 h; renovar pede outro toque. As bibliotecas do Google só carregam no primeiro toque.
     · escolherPasta: Google Picker, só pastas. garantirSubpasta: acha ou cria. enviar: upload multipart (fields=id,webViewLink).
     · Erros tipados {codigo: 'sem_config' | 'sem_token' | 'sem_internet' | 'recusado' | 'cota' | 'falha'} e o evento 'dgo:google' no
       document ({tipo: 'conectado' | 'desconectado' | 'enviado' | 'erro', detalhe}).
     · Interruptor do RootifyONE: data-recurso="google-drive" (recursos-do-app.json); desligado, estado().configurado = false.
   API (window.SolverGoogle)
     configurar({app, clienteId?, chavePicker?, projeto?}) → Promise<estado> · estado() → {configurado, conectado, expiraEm}
     conectar({escopos, motivo}) → Promise<{token, expiraEm}> · desconectar() · escolherPasta({titulo}) → Promise<{id, nome}>
     garantirSubpasta(paiId, nome) → Promise<{id}> ('root' = Meu Drive) · enviar({pastaId, nome, blob, mime, descricao}) → Promise<{id, link}>
     formularioDono() → html · salvarDono({clienteId, chavePicker, projeto}) → '' | erro
   ===================================================================== */
(function (raiz) {
  'use strict';
  if (raiz.SolverGoogle) return;
  var DRIVE = 'https://www.googleapis.com/auth/drive.file', PASTA = 'application/vnd.google-apps.folder';
  var GSI = 'https://accounts.google.com/gsi/client', GAPI = 'https://apis.google.com/js/api.js';
  var FILES = 'https://www.googleapis.com/drive/v3/files', UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink';
  var app = '', plataforma = null, token = null;   /* token = {acesso, ate}: só aqui, na memória */
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function e(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function avisar(tipo, detalhe) { try { document.dispatchEvent(new CustomEvent('dgo:google', { detail: { tipo: tipo, detalhe: detalhe } })); } catch (x) { /* navegador antigo */ } }
  function erro(codigo, msg) { var x = new Error(msg || codigo); x.codigo = codigo; avisar('erro', { codigo: codigo }); return x; }
  function chaveDono() { return 'solver.google.' + (app || 'app'); }
  function valida(c) {
    if (!c || !/^[\w-]+\.apps\.googleusercontent\.com$/.test(c.clienteId || '')) return tr('O ID do cliente termina em .apps.googleusercontent.com.', 'The client ID ends in .apps.googleusercontent.com.', 'El ID de cliente termina en .apps.googleusercontent.com.');
    if (/GOCSPX|secret/i.test(c.chavePicker || '')) return tr('Isso é o "client secret": não cole, ele não é usado.', 'That is the "client secret": do not paste it, it is not used.', 'Eso es el "client secret": no lo pegues, no se usa.');
    if (!/^AIza[\w-]{30,45}$/.test(c.chavePicker || '')) return tr('A chave do seletor começa com AIza.', 'The picker key starts with AIza.', 'La clave del selector empieza por AIza.');
    if (!/^\d{6,15}$/.test(String(c.projeto || ''))) return tr('O número do projeto tem só números.', 'The project number has digits only.', 'El número del proyecto solo tiene números.');
    return '';
  }
  function limpa(c) { return { clienteId: String(c.clienteId || '').trim(), chavePicker: String(c.chavePicker || '').trim(), projeto: String(c.projeto || '').replace(/\D/g, '') }; }
  function doDono() { try { var c = JSON.parse(raiz.localStorage.getItem(chaveDono()) || 'null'); return c && !valida(c) ? c : null; } catch (x) { return null; } }
  function cfg() { return plataforma || doDono(); }
  function ligado() { return !(raiz.SolverRecursos && SolverRecursos.ligado('google-drive', true) === false); }
  function estado() { return { configurado: !!cfg() && ligado(), conectado: !!(token && token.ate > Date.now() + 60000), expiraEm: token ? token.ate : 0 }; }

  /* a configuração da plataforma: o master do app (RootifyONE); sem ele, o que o dono colou neste aparelho */
  function configurar(o) {
    o = o || {}; app = o.app || app;
    if (o.clienteId) { var c = limpa(o); plataforma = valida(c) ? null : c; return Promise.resolve(estado()); }
    var url = raiz.location.origin + '/solverone-dados/servicos/' + app + '.json';
    return fetch(url, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
      .then(function (j) { var g = j && j.google ? limpa(j.google) : null; plataforma = g && !valida(g) ? g : null; return estado(); });
  }

  var carregados = {};
  function script(src) {
    if (carregados[src]) return carregados[src];
    carregados[src] = new Promise(function (ok, falhou) { var s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = function () { carregados[src] = null; falhou(erro('sem_internet')); }; document.head.appendChild(s); });
    return carregados[src];
  }
  function conectar(o) {
    o = o || {};
    var c = cfg(); if (!c || !ligado()) return Promise.reject(erro('sem_config'));
    if (estado().conectado) return Promise.resolve({ token: token.acesso, expiraEm: token.ate });
    if (raiz.navigator && navigator.onLine === false) return Promise.reject(erro('sem_internet'));
    return script(GSI).then(function () {
      return new Promise(function (ok, falhou) {
        google.accounts.oauth2.initTokenClient({ client_id: c.clienteId, scope: (o.escopos || [DRIVE]).join(' '),
          callback: function (r) {
            if (!r || r.error || !r.access_token) return falhou(erro('recusado'));
            token = { acesso: r.access_token, ate: Date.now() + (Number(r.expires_in) || 3600) * 1000 };
            avisar('conectado', { expiraEm: token.ate }); ok({ token: token.acesso, expiraEm: token.ate });
          }, error_callback: function () { falhou(erro('recusado')); } }).requestAccessToken({ prompt: '' });
      });
    });
  }
  function desconectar() {
    if (token && raiz.google && google.accounts && google.accounts.oauth2 && google.accounts.oauth2.revoke) try { google.accounts.oauth2.revoke(token.acesso, function () {}); } catch (x) { /* sem rede */ }
    token = null; avisar('desconectado', {});
  }
  function escolherPasta(o) {
    o = o || {};
    return conectar({ escopos: [DRIVE] }).then(function (t) { return script(GAPI).then(function () { return new Promise(function (ok) { gapi.load('picker', { callback: ok }); }); }).then(function () { return t.token; }); })
      .then(function (tk) {
        return new Promise(function (ok, falhou) {
          var c = cfg(), v = new google.picker.DocsView(google.picker.ViewId.FOLDERS).setSelectFolderEnabled(true).setMimeTypes(PASTA);
          new google.picker.PickerBuilder().addView(v).setOAuthToken(tk).setDeveloperKey(c.chavePicker).setAppId(c.projeto).setTitle(o.titulo || '')
            .setCallback(function (d) {
              if (d.action === google.picker.Action.PICKED && d.docs && d.docs[0]) ok({ id: d.docs[0].id, nome: String(d.docs[0].name || '').slice(0, 120) });
              else if (d.action === google.picker.Action.CANCEL) { var x = new Error('cancelou'); x.codigo = 'cancelou'; falhou(x); }
            }).build().setVisible(true);
        });
      });
  }
  function pedir(url, op) {
    if (!estado().conectado) return Promise.reject(erro('sem_token'));
    op = op || {}; op.headers = Object.assign({ Authorization: 'Bearer ' + token.acesso }, op.headers || {});
    return fetch(url, op).then(function (r) {
      if (r.status === 401) { token = null; throw erro('sem_token'); }
      if (r.status === 403 || r.status === 429) throw erro(/quota|storage/i.test(r.statusText || '') || r.status === 429 ? 'cota' : 'recusado');
      if (!r.ok) throw erro('falha');
      return r.json();
    }, function () { throw erro('sem_internet'); });
  }
  function garantirSubpasta(paiId, nome) {
    var q = "name = '" + String(nome).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "' and '" + paiId + "' in parents and mimeType = '" + PASTA + "' and trashed = false";
    return pedir(FILES + '?fields=files(id,name)&q=' + encodeURIComponent(q)).then(function (r) {
      if (r.files && r.files[0]) return { id: r.files[0].id };
      return pedir(FILES + '?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nome, mimeType: PASTA, parents: [paiId] }) }).then(function (p) { return { id: p.id }; });
    });
  }
  function enviar(o) {
    var f = 'mt' + Math.random().toString(36).slice(2), mime = o.mime || 'application/octet-stream';
    var meta = { name: o.nome || 'documento', parents: [o.pastaId] }; if (o.descricao) meta.description = String(o.descricao).slice(0, 500);
    var corpo = new Blob(['--' + f + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(meta) + '\r\n--' + f + '\r\nContent-Type: ' + mime + '\r\n\r\n', o.blob, '\r\n--' + f + '--']);
    return pedir(UPLOAD, { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + f }, body: corpo })
      .then(function (r) { var x = { id: r.id, link: r.webViewLink || 'https://drive.google.com/file/d/' + r.id + '/view' }; avisar('enviado', x); return x; });
  }

  /* a tela escondida do dono (até o RootifyONE ter a dele): só neste aparelho */
  function formularioDono() {
    var c = doDono() || {}, f = function (id, rot, val, ph) { return '<label class="field"><span>' + e(rot) + '</span><input id="' + id + '" autocomplete="off" spellcheck="false" value="' + e(val) + '" placeholder="' + e(ph) + '"></label>'; };
    return '<div class="sg-dono"><p class="small muted">' + e(tr('Configuração da plataforma (só o dono, só neste aparelho; sai daqui quando o RootifyONE publicar o bloco "google" no master do app). Nenhum dos três é senha; nunca cole o client secret.', 'Platform setup (owner only, this device only; leaves here once RootifyONE publishes the "google" block in the app master). None of the three is a password; never paste the client secret.', 'Configuración de la plataforma (solo el dueño, solo en este dispositivo; sale de aquí cuando RootifyONE publique el bloque "google" en el master de la app). Ninguno de los tres es una contraseña; nunca pegues el client secret.')) + '</p>' +
      '<ol class="small sg-passos">' + [tr('No console.cloud.google.com, projeto "SolverONE": menu ☰ → "APIs e serviços" → "Credenciais".', 'At console.cloud.google.com, project "SolverONE": menu ☰ → "APIs & Services" → "Credentials".', 'En console.cloud.google.com, proyecto "SolverONE": menú ☰ → "APIs y servicios" → "Credenciales".'),
        tr('ID do cliente: em "IDs do cliente OAuth 2.0", abra "SolverONE web" e copie o "ID do cliente" (termina em .apps.googleusercontent.com).', 'Client ID: under "OAuth 2.0 Client IDs", open "SolverONE web" and copy the "Client ID" (ends in .apps.googleusercontent.com).', 'ID de cliente: en "IDs de cliente de OAuth 2.0", abre "SolverONE web" y copia el "ID de cliente" (termina en .apps.googleusercontent.com).'),
        tr('Chave do seletor: em "Chaves de API", na linha "SolverONE Picker key", toque em "Mostrar chave" (Show key) e copie (começa com AIza).', 'Picker key: under "API Keys", on the "SolverONE Picker key" row, tap "Show key" and copy it (starts with AIza).', 'Clave del selector: en "Claves de API", en la fila "SolverONE Picker key", toca "Mostrar clave" (Show key) y cópiala (empieza por AIza).'),
        tr('Número do projeto: engrenagem ⚙ → "Configurações do projeto" → "Número do projeto" (só números).', 'Project number: gear ⚙ → "Project settings" → "Project number" (digits only).', 'Número del proyecto: engranaje ⚙ → "Configuración del proyecto" → "Número del proyecto" (solo números).')].map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ol>' +
      '<div class="grid g2">' + f('sgCliente', tr('ID do cliente OAuth', 'OAuth client ID', 'ID de cliente OAuth'), c.clienteId || '', '…apps.googleusercontent.com') + f('sgChave', tr('Chave do seletor (API)', 'Picker key (API)', 'Clave del selector (API)'), c.chavePicker || '', 'AIza…') +
      f('sgProjeto', tr('Número do projeto', 'Project number', 'Número del proyecto'), c.projeto || '', '123456789012') + '</div>' +
      '<p class="small muted">' + e((plataforma ? tr('Em uso: o master do RootifyONE.', 'In use: the RootifyONE master.', 'En uso: el master de RootifyONE.') : doDono() ? tr('Em uso: o que está colado aqui.', 'In use: what is pasted here.', 'En uso: lo pegado aquí.') : tr('Ainda não configurado: o botão do Google não aparece para ninguém.', 'Not set up yet: the Google button shows for no one.', 'Aún sin configurar: el botón de Google no aparece para nadie.'))) + '</p>' +
      '<div class="f-actions"><button type="button" class="btn sm primary" data-acao="sg-dono-salvar">' + e(tr('Salvar', 'Save', 'Guardar')) + '</button></div></div>';
  }
  function salvarDono(d) {
    var c = limpa(d || {});
    if (!c.clienteId && !c.chavePicker && !c.projeto) { try { raiz.localStorage.removeItem(chaveDono()); } catch (x) { /* sem armazenamento */ } token = null; return ''; }
    var m = valida(c); if (m) return m;
    try { raiz.localStorage.setItem(chaveDono(), JSON.stringify(c)); } catch (x) { return 'localStorage'; }
    token = null; return '';
  }

  raiz.SolverGoogle = { ESCOPO_DRIVE: DRIVE, configurar: configurar, estado: estado, conectar: conectar, desconectar: desconectar, escolherPasta: escolherPasta,
    garantirSubpasta: garantirSubpasta, enviar: enviar, formularioDono: formularioDono, salvarDono: salvarDono };
})(window);
