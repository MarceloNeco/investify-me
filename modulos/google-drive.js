/* =====================================================================
   modulos/google-drive.js — a foto do serviço do carro no GOOGLE DRIVE da pessoa (3.103)        1.0.0 · 24/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (plano aprovado pelo dono, 24/Nov/2026; integração nova aprovada: Google Drive da própria pessoa)
     · Configurações → Google Drive: o dono cola o ID do cliente OAuth, a chave de API (a do seletor, restrita ao domínio) e o
       número do projeto, com o passo a passo para criar no Google Cloud. Nenhum dos três é senha (ficam no navegador por natureza;
       a proteção é a restrição de domínio no Google Cloud); NUNCA o "client secret" (não existe neste fluxo). Nada no repositório.
     · "Conectar Google": Google Identity Services (token client), escopo único drive.file (o app só vê o que ele mesmo criou ou
       o que a pessoa escolheu no seletor). O token vale ~1 hora e fica SÓ na memória (nunca no aparelho nem na nuvem); é pedido de
       novo num toque, sempre a partir de um toque da pessoa.
     · 🚗 Carro → em cada carro, "📁 Pasta no Drive": o seletor do próprio Google (Picker), só pastas; guarda {raizId, raizNome}.
     · "📁 Enviar ao Drive" na ficha do serviço (a compra parcelada, modulos/compra-parcelada.js) ou no lançamento do Veículo com
       documento: cria dentro da raiz a subpasta "AAAA-MM-DD OFICINA" (a data do serviço e a oficina sem acentos nem símbolos; a do
       mesmo dia e oficina é reaproveitada) e sobe os arquivos do cofre (ArquivosFamilia) ligados a ela. Sempre num toque, nunca
       sozinho; no Fundo (pílula de andamento). Na 1ª vez de cada carro, um aviso: a foto sai do cofre cifrado e vai para o Drive
       dele, com a proteção do Google. A cópia cifrada no app continua.
     · Sem internet: o envio fica na fila ("📁 N envios ao Drive esperando" no 📥) e sobe num toque quando a internet voltar.
     · Visão da casa (membro): não envia nada.
   API (window.GoogleDrive)
     config() · salvarConfig(d) → '' | erro · pronto() · conectado() · conectar() → Promise<token> · desconectar()
     escolherPasta(vid) → Promise · enviar(tipo, id) → Promise<{pastaId, n}> · nomePasta(data, oficina) · fila() · botao(tipo, id) · botaoPasta(v)
   DADOS
     ST.config.googleDrive = {clientId, apiKey, appId} · ST.veiculos[i].drive = {raizId, raizNome, avisado}
     ficha/lançamento .drive = {pastaId, link, arquivos: [ids], enviadoEm} · ST.config.driveFila = ['f:<fichaId>' | 'g:<gastoId>']
   PONTOS QUE USA
     config.todos · inbox.grupos ('docs') · ações gd-* · modulos/veiculos.js chama botao()/botaoPasta()
   ===================================================================== */
(function () {
  'use strict';
  var ESCOPO = 'https://www.googleapis.com/auth/drive.file', PASTA = 'application/vnd.google-apps.folder';
  var GSI = 'https://accounts.google.com/gsi/client', GAPI = 'https://apis.google.com/js/api.js';
  var API_DRIVE = 'https://www.googleapis.com/drive/v3/files', UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function cfg() { return (ST.config = ST.config || {}); }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function botao(acao, rot, extra, cls) { return '<button type="button" class="btn sm' + (cls ? ' ' + cls : '') + '" data-acao="' + acao + '"' + (extra || '') + '>' + esc(rot) + '</button>'; }

  /* ---------- a configuração (o que o dono cola) ---------- */
  function config() { var c = cfg().googleDrive || {}; return { clientId: c.clientId || '', apiKey: c.apiKey || '', appId: c.appId || '' }; }
  function salvarConfig(d) {
    var c = { clientId: String(d.clientId || '').trim(), apiKey: String(d.apiKey || '').trim(), appId: String(d.appId || '').replace(/\D/g, '') };
    if (!c.clientId && !c.apiKey && !c.appId) { delete cfg().googleDrive; token = null; return ''; }
    if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(c.clientId)) return tr('O ID do cliente termina em .apps.googleusercontent.com.', 'The client ID ends in .apps.googleusercontent.com.', 'El ID de cliente termina en .apps.googleusercontent.com.');
    if (!/^AIza[\w-]{30,45}$/.test(c.apiKey)) return tr('A chave de API começa com AIza.', 'The API key starts with AIza.', 'La clave de API empieza por AIza.');
    if (!/^\d{6,15}$/.test(c.appId)) return tr('O número do projeto tem só números.', 'The project number has digits only.', 'El número del proyecto solo tiene números.');
    if (/secret|GOCSPX/i.test(JSON.stringify(d))) return tr('Isso parece o "client secret": não cole, ele não é usado.', 'That looks like the "client secret": do not paste it, it is not used.', 'Eso parece el "client secret": no lo pegues, no se usa.');
    cfg().googleDrive = c; token = null;
    return '';
  }
  function pronto() { var c = config(); return !!(c.clientId && c.apiKey && c.appId); }

  /* ---------- os scripts do Google (só quando usados) ---------- */
  var carregados = {};
  function script(src) {
    if (carregados[src]) return carregados[src];
    carregados[src] = new Promise(function (ok, erro) { var s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = function () { carregados[src] = null; erro(new Error(src)); }; document.head.appendChild(s); });
    return carregados[src];
  }

  /* ---------- o token (só na memória) ---------- */
  var token = null;   /* {acesso, ate} */
  function conectado() { return !!(token && token.ate > Date.now() + 60000); }
  function conectar() {
    if (!pronto()) return Promise.reject(new Error(tr('Configure o Google Drive em Configurações.', 'Set up Google Drive in Settings.', 'Configura Google Drive en Ajustes.')));
    if (conectado()) return Promise.resolve(token.acesso);
    return script(GSI).then(function () {
      return new Promise(function (ok, erro) {
        var cli = google.accounts.oauth2.initTokenClient({ client_id: config().clientId, scope: ESCOPO, callback: function (r) {
          if (!r || r.error || !r.access_token) return erro(new Error((r && r.error) || 'token'));
          token = { acesso: r.access_token, ate: Date.now() + (Number(r.expires_in) || 3600) * 1000 }; ok(token.acesso);
        }, error_callback: function (e) { erro(new Error((e && e.type) || 'popup')); } });
        cli.requestAccessToken({ prompt: '' });
      });
    });
  }
  function desconectar() {
    if (token && window.google && google.accounts && google.accounts.oauth2 && google.accounts.oauth2.revoke) try { google.accounts.oauth2.revoke(token.acesso, function () {}); } catch (e) { /* sem rede: o token some daqui de qualquer jeito */ }
    token = null;
  }

  /* ---------- o seletor de pasta (Google Picker) ---------- */
  function veiculo(vid) { return (ST.veiculos || []).find(function (v) { return v.id === vid; }) || null; }
  function escolherPasta(vid) {
    var v = veiculo(vid); if (!v) return Promise.reject(new Error('veiculo'));
    return conectar().then(function (tk) { return script(GAPI).then(function () { return new Promise(function (ok) { gapi.load('picker', { callback: ok }); }); }).then(function () { return tk; }); })
      .then(function (tk) {
        return new Promise(function (ok, erro) {
          var c = config(), view = new google.picker.DocsView(google.picker.ViewId.FOLDERS).setSelectFolderEnabled(true).setMimeTypes(PASTA);
          var pk = new google.picker.PickerBuilder().addView(view).setOAuthToken(tk).setDeveloperKey(c.apiKey).setAppId(c.appId)
            .setTitle(tr('Escolha a pasta do carro', 'Choose the car folder', 'Elige la carpeta del coche'))
            .setCallback(function (d) {
              if (d.action === google.picker.Action.PICKED && d.docs && d.docs[0]) { v.drive = Object.assign({}, v.drive, { raizId: d.docs[0].id, raizNome: String(d.docs[0].name || '').slice(0, 120) }); ok(v.drive); }
              else if (d.action === google.picker.Action.CANCEL) erro(new Error('cancelou'));
            }).build();
          pk.setVisible(true);
        });
      });
  }

  /* ---------- o envio ---------- */
  function semAcento(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function nomePasta(data, oficina) { return String(data || '').slice(0, 10) + ' ' + (semAcento(oficina).replace(/\s*\(?OS \d+\)?$/, '').slice(0, 60) || 'OFICINA'); }
  function ficha(id) { return window.CompraParcelada ? CompraParcelada.achar(id) : null; }
  function gasto(id) { return Gasto.todos().find(function (g) { return g.id === id; }) || null; }
  /* o que vai: {obj, data, oficina, vid, docs} da ficha ('f') ou do lançamento ('g') */
  function item(tipo, id) {
    var x = tipo === 'f' ? ficha(id) : gasto(id); if (!x) return null;
    var vid = x.veiculoId || (tipo === 'f' && window.CompraParcelada ? (CompraParcelada.parcelas(x)[0] || {}).veiculoId : '') || '';
    var docs = [];
    if (x.docId) docs.push(x.docId);
    if (window.ArquivosFamilia) ArquivosFamilia.lista({ ligado: x.id }).forEach(function (m) { if (docs.indexOf(m.id) < 0) docs.push(m.id); });
    return { obj: x, data: x.data, oficina: tipo === 'f' ? (x.desc || x.loja) : ((x.contraparte && x.contraparte.nome) || x.descRobo || x.desc), vid: vid, docs: docs };
  }
  function pedir(url, op, tk) {
    op = op || {}; op.headers = Object.assign({ Authorization: 'Bearer ' + tk }, op.headers || {});
    return fetch(url, op).then(function (r) {
      if (r.status === 401) { token = null; throw new Error(tr('A permissão do Google venceu: toque de novo.', 'The Google permission expired: tap again.', 'El permiso de Google caducó: toca de nuevo.')); }
      if (!r.ok) throw new Error('Drive ' + r.status);
      return r.json();
    });
  }
  /* a subpasta do dia e da oficina: a mesma, se já existe */
  function subpasta(tk, raiz, nome) {
    var q = "name = '" + nome.replace(/'/g, "\\'") + "' and '" + raiz + "' in parents and mimeType = '" + PASTA + "' and trashed = false";
    return pedir(API_DRIVE + '?fields=files(id,name)&q=' + encodeURIComponent(q), {}, tk).then(function (r) {
      if (r.files && r.files[0]) return r.files[0].id;
      return pedir(API_DRIVE + '?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nome, mimeType: PASTA, parents: [raiz] }) }, tk).then(function (p) { return p.id; });
    });
  }
  function subir(tk, pastaId, meta, bytes) {
    var fronteira = 'mt' + Math.random().toString(36).slice(2), mime = meta.mime || 'application/octet-stream';
    var corpo = new Blob(['--' + fronteira + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify({ name: meta.nome || 'documento', parents: [pastaId] }) + '\r\n--' + fronteira + '\r\nContent-Type: ' + mime + '\r\n\r\n', bytes, '\r\n--' + fronteira + '--']);
    return pedir(UPLOAD, { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + fronteira }, body: corpo }, tk).then(function (r) { return r.id; });
  }
  function naFila(k, sim) { var f = (cfg().driveFila || []).filter(function (x) { return x !== k; }); if (sim) f.push(k); cfg().driveFila = f; }
  async function enviar(tipo, id) {
    if (casa()) throw new Error(tr('Na visão da casa não se envia nada ao Drive.', 'Nothing is sent to Drive in the household view.', 'En la vista de la casa no se envía nada a Drive.'));
    var it = item(tipo, id); if (!it) throw new Error('item');
    var v = veiculo(it.vid);
    if (!v || !v.drive || !v.drive.raizId) throw new Error(tr('Escolha antes a pasta do carro no Drive (🚗 Carro → 📁 Pasta no Drive).', 'First choose the car folder on Drive (🚗 Car → 📁 Drive folder).', 'Primero elige la carpeta del coche en Drive (🚗 Coche → 📁 Carpeta en Drive).'));
    if (!it.docs.length) throw new Error(tr('Este serviço não tem foto nem documento guardado.', 'This service has no photo or document saved.', 'Este servicio no tiene foto ni documento guardado.'));
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { naFila(tipo + ':' + id, true); Store.salvar(); return { fila: true }; }
    var fid = 'drive-' + id, temFundo = typeof Fundo !== 'undefined';
    if (temFundo) Fundo.comecar({ id: fid, titulo: tr('Enviando ao Drive…', 'Sending to Drive…', 'Enviando a Drive…') });
    try {
      var tk = await conectar(), nome = nomePasta(it.data, it.oficina), pastaId = await subpasta(tk, v.drive.raizId, nome), ids = [];
      for (var i = 0; i < it.docs.length; i++) {
        var meta = ArquivosFamilia.achar(it.docs[i]) || { nome: 'documento' }, bytes = await ArquivosFamilia.ler(it.docs[i]); if (!bytes) continue;
        if (temFundo) Fundo.passo(fid, (meta.nome || '') + ' (' + (i + 1) + '/' + it.docs.length + ')', i / it.docs.length);
        ids.push(await subir(tk, pastaId, meta, bytes));
      }
      it.obj.drive = { pastaId: pastaId, nome: nome, link: 'https://drive.google.com/drive/folders/' + pastaId, arquivos: ids, enviadoEm: new Date().toISOString() };
      naFila(tipo + ':' + id, false); Store.salvar();
      if (temFundo) { Fundo.terminar(fid, tr('No Drive: ', 'On Drive: ', 'En Drive: ') + nome); Fundo.limpar(fid); }
      return { pastaId: pastaId, n: ids.length };
    } catch (e) {
      if (temFundo) Fundo.limpar(fid);
      if (/fetch|network|Failed/i.test(String(e && e.message))) { naFila(tipo + ':' + id, true); Store.salvar(); }
      throw e;
    }
  }

  /* ---------- botões (a tela do carro chama) ---------- */
  function botaoPasta(v) {
    if (casa() || !v) return '';
    return v.drive && v.drive.raizId ? ' <span class="small muted gd-raiz">📁 ' + esc(v.drive.raizNome || tr('pasta no Drive', 'Drive folder', 'carpeta en Drive')) + '</span> ' + botao('gd-pasta', tr('Trocar', 'Change', 'Cambiar'), ' data-v="' + esc(v.id) + '"')
      : ' ' + botao('gd-pasta', '📁 ' + tr('Pasta no Drive', 'Drive folder', 'Carpeta en Drive'), ' data-v="' + esc(v.id) + '"');
  }
  function botaoEnviar(tipo, id) {
    if (casa()) return '';
    var it = item(tipo, id); if (!it || !it.docs.length) return '';
    if (it.obj.drive && it.obj.drive.pastaId) return ' <a class="small gd-link" href="' + esc(it.obj.drive.link) + '" target="_blank" rel="noopener noreferrer">📁 ' + esc(tr('no Drive', 'on Drive', 'en Drive')) + ' ↗</a>';
    return ' ' + botao('gd-enviar', '📁 ' + tr('Enviar ao Drive', 'Send to Drive', 'Enviar a Drive'), ' data-t="' + tipo + '" data-id="' + esc(id) + '"');
  }

  /* ---------- Configurações → Google Drive ---------- */
  function cartao() {
    if (casa()) return '';
    var c = config(), f = function (id, rot, val, ph) { return '<label class="field"><span>' + esc(rot) + '</span><input id="' + id + '" autocomplete="off" spellcheck="false" value="' + esc(val) + '" placeholder="' + esc(ph) + '"></label>'; };
    var passos = [tr('Entre em console.cloud.google.com com a sua conta Google → no topo, "Selecionar projeto" → "Novo projeto" → nome "SolverONE" → Criar.', 'Go to console.cloud.google.com with your Google account → at the top, "Select project" → "New project" → name "SolverONE" → Create.', 'Entra en console.cloud.google.com con tu cuenta de Google → arriba, "Seleccionar proyecto" → "Proyecto nuevo" → nombre "SolverONE" → Crear.'),
      tr('Menu ☰ → "APIs e serviços" → "Biblioteca": ative "Google Drive API" e depois "Google Picker API".', 'Menu ☰ → "APIs & Services" → "Library": enable "Google Drive API" and then "Google Picker API".', 'Menú ☰ → "APIs y servicios" → "Biblioteca": activa "Google Drive API" y después "Google Picker API".'),
      tr('"Tela de permissão OAuth": tipo Externo; nome "SolverONE"; o seu e-mail; escopo ".../auth/drive.file"; em "Usuários de teste", o seu e-mail (e o da família).', '"OAuth consent screen": External; name "SolverONE"; your e-mail; scope ".../auth/drive.file"; under "Test users", your e-mail (and the family\'s).', '"Pantalla de consentimiento de OAuth": Externo; nombre "SolverONE"; tu correo; alcance ".../auth/drive.file"; en "Usuarios de prueba", tu correo (y el de la familia).'),
      tr('"Credenciais" → "Criar credenciais" → "ID do cliente OAuth" → "Aplicativo da Web" → em "Origens JavaScript autorizadas", ', '"Credentials" → "Create credentials" → "OAuth client ID" → "Web application" → under "Authorized JavaScript origins", add ', '"Credenciales" → "Crear credenciales" → "ID de cliente de OAuth" → "Aplicación web" → en "Orígenes de JavaScript autorizados", añade ') + location.origin + tr(' → Criar → copie o "ID do cliente".', ' → Create → copy the "Client ID".', ' → Crear → copia el "ID de cliente".'),
      tr('"Criar credenciais" → "Chave de API" → "Restringir chave": referenciadores HTTP ', '"Create credentials" → "API key" → "Restrict key": HTTP referrers ', '"Crear credenciales" → "Clave de API" → "Restringir clave": referentes HTTP ') + location.origin + '/* ' + tr('e só "Google Picker API" → copie a chave.', 'and only "Google Picker API" → copy the key.', 'y solo "Google Picker API" → copia la clave.'),
      tr('Engrenagem → "Configurações do projeto" → copie o "Número do projeto".', 'Gear → "Project settings" → copy the "Project number".', 'Engranaje → "Configuración del proyecto" → copia el "Número del proyecto".'),
      tr('Cole os três aqui embaixo. Nenhum é senha. NUNCA cole o "client secret", se o Google mostrar um: não é usado.', 'Paste the three below. None is a password. NEVER paste the "client secret" if Google shows one: it is not used.', 'Pega los tres aquí abajo. Ninguno es una contraseña. NUNCA pegues el "client secret" si Google muestra uno: no se usa.')];
    return '<div class="card cfg-sec gd-cfg" data-sec="todos"><div class="card-head"><h3>📁 Google Drive</h3></div>' +
      '<p class="small muted" style="margin:0 0 6px">' + esc(tr('Para guardar a foto e a OS do serviço do carro numa pasta do seu Google Drive. O app só vê o que ele mesmo criar lá (permissão drive.file). Envio sempre num toque.', 'To keep the car service photo and work order in a folder of your Google Drive. The app only sees what it creates there (drive.file permission). Always sent with a tap.', 'Para guardar la foto y la orden del servicio del coche en una carpeta de tu Google Drive. La app solo ve lo que ella misma crea allí (permiso drive.file). Siempre se envía con un toque.')) + '</p>' +
      '<details class="gd-passos"><summary class="small">' + esc(tr('Passo a passo no Google Cloud (15–20 min, grátis)', 'Step by step on Google Cloud (15–20 min, free)', 'Paso a paso en Google Cloud (15–20 min, gratis)')) + '</summary><ol class="small">' + passos.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ol></details>' +
      '<div class="grid g2">' + f('gdClient', tr('ID do cliente', 'Client ID', 'ID de cliente'), c.clientId, '…apps.googleusercontent.com') + f('gdKey', tr('Chave de API', 'API key', 'Clave de API'), c.apiKey, 'AIza…') +
      f('gdApp', tr('Número do projeto', 'Project number', 'Número del proyecto'), c.appId, '123456789012') + '</div>' +
      '<div class="f-actions">' + botao('gd-salvar', tr('Salvar', 'Save', 'Guardar'), '', 'primary') +
      (pronto() ? (conectado() ? botao('gd-sair', tr('Desconectar o Google', 'Disconnect Google', 'Desconectar Google')) : botao('gd-conectar', tr('Conectar Google', 'Connect Google', 'Conectar Google'))) : '') + '</div>' +
      '<p class="small muted gd-estado">' + esc(!pronto() ? tr('Ainda não configurado.', 'Not set up yet.', 'Aún sin configurar.') : conectado() ? tr('✅ Conectado (a permissão vale por cerca de 1 hora; depois, um toque).', '✅ Connected (the permission lasts about 1 hour; then, one tap).', '✅ Conectado (el permiso dura cerca de 1 hora; luego, un toque).') : tr('Configurado. A permissão é pedida num toque, na hora de enviar.', 'Set up. Permission is asked with a tap, when sending.', 'Configurado. El permiso se pide con un toque, al enviar.')) + '</p></div>';
  }
  function depois() { if (typeof Store !== 'undefined') Store.salvar(); if (typeof render === 'function') render(); if (typeof renderInboxN === 'function') renderInboxN(); }
  function erro(e) { if (String(e && e.message) !== 'cancelou') toast(String((e && e.message) || e), 'warn'); }

  var API = {
    config: config, salvarConfig: salvarConfig, pronto: pronto, conectado: conectado, conectar: conectar, desconectar: desconectar, escolherPasta: escolherPasta,
    enviar: enviar, nomePasta: nomePasta, fila: function () { return (cfg().driveFila || []).slice(); }, botao: botaoEnviar, botaoPasta: botaoPasta
  };
  MoneyModulos.registrar({
    id: 'google-drive', versao: '1.0.0',
    pontos: {
      'config.todos': cartao,
      'inbox.grupos': function () {
        if (casa()) return [];
        var f = API.fila(); if (!f.length) return [];
        return [{ id: 'docs', n: 1, html: '<li class="inb-item gd-fila"><div><b>📁 ' + esc(f.length + tr(' envio(s) ao Drive esperando a internet', ' Drive upload(s) waiting for the internet', ' envío(s) a Drive esperando internet')) + '</b><span class="t-sub">' + esc(tr('Toque quando estiver com internet.', 'Tap when you are online.', 'Toca cuando tengas internet.')) + '</span></div><span class="inb-acoes">' + botao('gd-fila', tr('Enviar agora', 'Send now', 'Enviar ahora'), '', 'primary') + '</span></li>' }];
      }
    },
    acoes: {
      'gd-salvar': function () {
        var v = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
        var m = salvarConfig({ clientId: v('gdClient'), apiKey: v('gdKey'), appId: v('gdApp') });
        if (m) return toast(m, 'warn');
        depois(); toast(tr('Google Drive configurado.', 'Google Drive set up.', 'Google Drive configurado.'));
      },
      'gd-conectar': function () { conectar().then(depois, erro); },
      'gd-sair': function () { desconectar(); depois(); },
      'gd-pasta': function (el) { escolherPasta(el.dataset.v).then(function () { depois(); toast('📁 ' + tr('Pasta escolhida.', 'Folder chosen.', 'Carpeta elegida.')); }, erro); },
      'gd-enviar': function (el) {
        var it = item(el.dataset.t, el.dataset.id), v = it && veiculo(it.vid);
        if (v && v.drive && v.drive.raizId && !v.drive.avisado) {
          if (!window.confirm(tr('A foto sai do cofre cifrado do app e vai para o seu Google Drive, com a proteção do Google (não a do app). A cópia no app continua. Enviar?', 'The photo leaves the app’s encrypted vault and goes to your Google Drive, protected by Google (not by the app). The copy in the app stays. Send?', 'La foto sale del cofre cifrado de la app y va a tu Google Drive, con la protección de Google (no la de la app). La copia en la app sigue. ¿Enviar?'))) return;
          v.drive.avisado = true;
        }
        enviar(el.dataset.t, el.dataset.id).then(function (r) { depois(); toast(r && r.fila ? tr('Sem internet: fica na fila e sobe num toque depois.', 'Offline: it waits in the queue and goes with a tap later.', 'Sin internet: queda en la cola y se sube con un toque después.') : '📁 ' + tr('No Drive: ', 'On Drive: ', 'En Drive: ') + r.n + tr(' arquivo(s).', ' file(s).', ' archivo(s).')); }, function (e) { depois(); erro(e); });
      },
      'gd-fila': function () {
        var f = API.fila(), n = 0;
        f.reduce(function (p, k) { return p.then(function () { return enviar(k.slice(0, 1), k.slice(2)).then(function (r) { if (r && !r.fila) n++; }); }); }, Promise.resolve())
          .then(function () { depois(); toast('📁 ' + n + tr(' enviado(s) ao Drive.', ' sent to Drive.', ' enviado(s) a Drive.')); }, function (e) { depois(); erro(e); });
      }
    }
  });
  window.GoogleDrive = API;
})();
