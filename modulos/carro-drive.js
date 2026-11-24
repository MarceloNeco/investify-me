/* =====================================================================
   modulos/carro-drive.js — a foto do serviço do carro no GOOGLE DRIVE da pessoa (3.103)        1.0.0 · 24/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (plano aprovado pelo dono, 24/Nov/2026, com o ajuste "o usuário final NUNCA mexe no Google Cloud")
     · A parte do MoneyTRIO; o "Conectar Google" é o componente da plataforma (modulos/google-drive.js, window.SolverGoogle).
     · Sem a configuração da plataforma (o master do RootifyONE ou a tela escondida do dono), nada aparece: nem botão nem aviso.
     · 🚗 Carro → "📁 Conectar meu Google Drive": a tela do próprio Google e "Permitir". Em uma linha: o app só vê as pastas e os
       arquivos que ele mesmo criar ou que você escolher.
     · "📁 Enviar ao Drive" no serviço com foto/documento (a ficha parcelada ou o lançamento do Veículo): sempre num toque, no Fundo.
       Sem pasta escolhida, o app cria a dele: "MoneyTRIO / Carro / <apelido> / AAAA-MM-DD OFICINA" (a do mesmo dia e oficina é
       reaproveitada). Opção "usar uma pasta que já tenho" (o seletor do Google) para quem já tem o padrão: a subpasta do serviço vai
       dentro dela. Na 1ª vez de cada carro, o aviso: a foto sai do cofre cifrado e vai para o Drive da pessoa (a cópia no app continua).
     · Sem internet: fica na fila ("📁 N envios ao Drive esperando a internet" no 📥) e sobe num toque.
     · Visão da casa (membro): não envia. Tela escondida do dono: Configurações com #dono-google no endereço.
   API (window.CarroDrive)
     pasta(nomeData, oficina) → "AAAA-MM-DD OFICINA" · enviar(tipo, id) → Promise<{n, link} | {fila}> · fila() · botao(tipo, id) · botaoPasta(v) · topo()
   DADOS
     ST.veiculos[i].drive = {raizId, raizNome, minha?, avisado?} · ficha/lançamento .drive = {pastaId, nome, link, arquivos, enviadoEm}
     ST.config.driveFila = ['f:<fichaId>' | 'g:<gastoId>']
   PONTOS QUE USA
     config.todos (só com #dono-google) · inbox.grupos ('docs') · ações cd-*, sg-dono-salvar · modulos/veiculos.js chama botao()/botaoPasta()/topo()
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function cfg() { return (ST.config = ST.config || {}); }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function SG() { return window.SolverGoogle || null; }
  function pronto() { return !!(SG() && SG().estado().configurado) && !casa(); }
  function botao(acao, rot, extra, cls) { return '<button type="button" class="btn sm' + (cls ? ' ' + cls : '') + '" data-recurso="google-drive" data-acao="' + acao + '"' + (extra || '') + '>' + esc(rot) + '</button>'; }
  function veiculo(vid) { return (ST.veiculos || []).find(function (v) { return v.id === vid; }) || null; }
  function semAcento(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function pasta(data, oficina) { return String(data || '').slice(0, 10) + ' ' + (semAcento(oficina).replace(/\s*\(?OS \d+\)?$/, '').slice(0, 60) || 'OFICINA'); }
  function item(tipo, id) {
    var x = tipo === 'f' ? (window.CompraParcelada ? CompraParcelada.achar(id) : null) : Gasto.todos().find(function (g) { return g.id === id; });
    if (!x) return null;
    var vid = x.veiculoId || (tipo === 'f' ? (CompraParcelada.parcelas(x)[0] || {}).veiculoId : '') || '', docs = [];
    if (x.docId) docs.push(x.docId);
    if (window.ArquivosFamilia) ArquivosFamilia.lista({ ligado: x.id }).forEach(function (m) { if (docs.indexOf(m.id) < 0) docs.push(m.id); });
    return { obj: x, data: x.data, oficina: tipo === 'f' ? (x.desc || x.loja) : ((x.contraparte && x.contraparte.nome) || x.descRobo || x.desc), vid: vid, docs: docs };
  }
  function naFila(k, sim) { var f = (cfg().driveFila || []).filter(function (x) { return x !== k; }); if (sim) f.push(k); cfg().driveFila = f; }
  function msg(e) {
    var c = e && e.codigo, m = { sem_config: '', cancelou: '', sem_token: tr('A permissão do Google venceu: toque de novo.', 'The Google permission expired: tap again.', 'El permiso de Google caducó: toca de nuevo.'),
      sem_internet: tr('Sem internet: fica na fila e sobe num toque depois.', 'Offline: it waits in the queue and goes with a tap later.', 'Sin internet: queda en la cola y se sube con un toque después.'),
      recusado: tr('O Google não deu a permissão.', 'Google did not grant the permission.', 'Google no dio el permiso.'), cota: tr('O seu Google Drive está cheio.', 'Your Google Drive is full.', 'Tu Google Drive está lleno.') };
    if (c && m[c] != null) return m[c];
    return e && e.message && !c ? e.message : tr('Não deu para enviar agora. Tente de novo.', 'Could not send now. Try again.', 'No se pudo enviar ahora. Inténtalo de nuevo.');
  }

  /* a pasta do carro: a que a pessoa escolheu ou a do app ("MoneyTRIO / Carro / <apelido>") */
  async function raizDo(v) {
    if (v.drive && v.drive.raizId) return v.drive.raizId;
    var a = await SG().garantirSubpasta('root', 'MoneyTRIO'), b = await SG().garantirSubpasta(a.id, tr('Carro', 'Car', 'Coche')), c = await SG().garantirSubpasta(b.id, String(v.apelido || 'Carro').slice(0, 40));
    v.drive = Object.assign({}, v.drive, { raizId: c.id, raizNome: 'MoneyTRIO / ' + tr('Carro', 'Car', 'Coche') + ' / ' + v.apelido });
    return c.id;
  }
  async function enviar(tipo, id) {
    if (!pronto()) throw Object.assign(new Error('sem_config'), { codigo: 'sem_config' });
    var it = item(tipo, id); if (!it || !it.docs.length) throw new Error(tr('Este serviço não tem foto nem documento guardado.', 'This service has no photo or document saved.', 'Este servicio no tiene foto ni documento guardado.'));
    var v = veiculo(it.vid); if (!v) throw new Error(tr('Diga antes de qual carro é este serviço.', 'First say which car this service is for.', 'Primero indica de qué coche es este servicio.'));
    if (navigator.onLine === false) { naFila(tipo + ':' + id, true); Store.salvar(); return { fila: true }; }
    var fid = 'drive-' + id, temFundo = typeof Fundo !== 'undefined';
    if (temFundo) Fundo.comecar({ id: fid, titulo: tr('Enviando ao Drive…', 'Sending to Drive…', 'Enviando a Drive…') });
    try {
      await SG().conectar({ escopos: [SG().ESCOPO_DRIVE], motivo: tr('Guardar a foto do serviço do carro', 'Keep the car service photo', 'Guardar la foto del servicio del coche') });
      var raiz = await raizDo(v), nome = pasta(it.data, it.oficina), sub = await SG().garantirSubpasta(raiz, nome), ids = [];
      for (var i = 0; i < it.docs.length; i++) {
        var meta = ArquivosFamilia.achar(it.docs[i]) || { nome: 'documento' }, bytes = await ArquivosFamilia.ler(it.docs[i]); if (!bytes) continue;
        if (temFundo) Fundo.passo(fid, (meta.nome || '') + ' (' + (i + 1) + '/' + it.docs.length + ')', i / it.docs.length);
        ids.push((await SG().enviar({ pastaId: sub.id, nome: meta.nome || 'documento', blob: new Blob([bytes], { type: meta.mime || 'application/octet-stream' }), mime: meta.mime, descricao: 'MoneyTRIO · ' + v.apelido })).id);
      }
      it.obj.drive = { pastaId: sub.id, nome: nome, link: 'https://drive.google.com/drive/folders/' + sub.id, arquivos: ids, enviadoEm: new Date().toISOString() };
      naFila(tipo + ':' + id, false); Store.salvar();
      if (temFundo) { Fundo.terminar(fid, tr('No Drive: ', 'On Drive: ', 'En Drive: ') + nome); Fundo.limpar(fid); }
      return { n: ids.length, link: it.obj.drive.link };
    } catch (e) {
      if (temFundo) Fundo.limpar(fid);
      if (e && e.codigo === 'sem_internet') { naFila(tipo + ':' + id, true); Store.salvar(); return { fila: true }; }
      throw e;
    }
  }

  /* ---------- o que a tela do carro mostra ---------- */
  function topo() {
    if (!pronto() || SG().estado().conectado) return '';
    return '<p class="small cd-topo" data-recurso="google-drive" style="margin:6px 0">' + botao('cd-conectar', '📁 ' + tr('Conectar meu Google Drive', 'Connect my Google Drive', 'Conectar mi Google Drive'), '', 'primary') +
      ' <span class="muted">' + esc(tr('O app só vê as pastas e os arquivos que ele mesmo criar ou que você escolher.', 'The app only sees the folders and files it creates or that you choose.', 'La app solo ve las carpetas y los archivos que ella misma cree o que tú elijas.')) + '</span></p>';
  }
  function botaoPasta(v) {
    if (!pronto() || !v) return '';
    if (v.drive && v.drive.raizId) return ' <span class="small muted cd-raiz" data-recurso="google-drive">📁 ' + esc(v.drive.raizNome || '') + '</span> ' + botao('cd-pasta', tr('Trocar a pasta', 'Change folder', 'Cambiar la carpeta'), ' data-v="' + esc(v.id) + '"');
    return ' <button type="button" class="linkinho cd-minha" data-recurso="google-drive" data-acao="cd-pasta" data-v="' + esc(v.id) + '">' + esc(tr('usar uma pasta que já tenho no Drive', 'use a folder I already have on Drive', 'usar una carpeta que ya tengo en Drive')) + '</button>';
  }
  function botaoEnviar(tipo, id) {
    if (!pronto()) return '';
    var it = item(tipo, id); if (!it || !it.docs.length) return '';
    if (it.obj.drive && it.obj.drive.pastaId) return ' <a class="small cd-link" data-recurso="google-drive" href="' + esc(it.obj.drive.link) + '" target="_blank" rel="noopener noreferrer">📁 ' + esc(tr('no Drive', 'on Drive', 'en Drive')) + ' ↗</a>';
    return ' ' + botao('cd-enviar', '📁 ' + tr('Enviar ao Drive', 'Send to Drive', 'Enviar a Drive'), ' data-t="' + tipo + '" data-id="' + esc(id) + '"');
  }
  function depois() { if (typeof Store !== 'undefined') Store.salvar(); if (typeof render === 'function') render(); if (typeof renderInboxN === 'function') renderInboxN(); }
  function falhou(e) { var m = msg(e); if (m) toast(m, 'warn'); depois(); }
  function donoAqui() { return /dono-google/.test(location.hash || ''); }

  var API = { pasta: pasta, enviar: enviar, fila: function () { return (cfg().driveFila || []).slice(); }, botao: botaoEnviar, botaoPasta: botaoPasta, topo: topo };
  MoneyModulos.registrar({
    id: 'carro-drive', versao: '1.0.0',
    pontos: {
      'config.todos': function () { return donoAqui() && SG() ? '<div class="card cfg-sec cd-dono" data-sec="todos"><div class="card-head"><h3>📁 Google Drive · ' + esc(tr('plataforma', 'platform', 'plataforma')) + '</h3></div>' + SG().formularioDono() + '</div>' : ''; },
      'inbox.grupos': function () {
        if (!pronto()) return [];
        var f = API.fila(); if (!f.length) return [];
        return [{ id: 'docs', n: 1, html: '<li class="inb-item cd-fila" data-recurso="google-drive"><div><b>📁 ' + esc(f.length + tr(' envio(s) ao Drive esperando a internet', ' Drive upload(s) waiting for the internet', ' envío(s) a Drive esperando internet')) + '</b><span class="t-sub">' + esc(tr('Toque quando estiver com internet.', 'Tap when you are online.', 'Toca cuando tengas internet.')) + '</span></div><span class="inb-acoes">' + botao('cd-fila', tr('Enviar agora', 'Send now', 'Enviar ahora'), '', 'primary') + '</span></li>' }];
      }
    },
    acoes: {
      'sg-dono-salvar': function () {
        var v = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
        var m = SG().salvarDono({ clienteId: v('sgCliente'), chavePicker: v('sgChave'), projeto: v('sgProjeto') });
        if (m) return toast(m, 'warn');
        SG().configurar({ app: 'moneytrio' }).then(function () { depois(); toast(tr('Google Drive da plataforma salvo neste aparelho.', 'Platform Google Drive saved on this device.', 'Google Drive de la plataforma guardado en este dispositivo.')); });
      },
      'cd-conectar': function () { SG().conectar({ escopos: [SG().ESCOPO_DRIVE] }).then(depois, falhou); },
      'cd-pasta': function (el) {
        var v = veiculo(el.dataset.v); if (!v) return;
        SG().escolherPasta({ titulo: tr('A pasta do carro ', 'The folder of the car ', 'La carpeta del coche ') + v.apelido }).then(function (p) { v.drive = Object.assign({}, v.drive, { raizId: p.id, raizNome: p.nome, minha: true }); depois(); }, falhou);
      },
      'cd-enviar': function (el) {
        var it = item(el.dataset.t, el.dataset.id), v = it && veiculo(it.vid);
        if (v && !(v.drive && v.drive.avisado)) {
          if (!window.confirm(tr('A foto sai do cofre cifrado do app e vai para o seu Google Drive, com a proteção do Google (não a do app). A cópia no app continua. Enviar?', 'The photo leaves the app’s encrypted vault and goes to your Google Drive, protected by Google (not by the app). The copy in the app stays. Send?', 'La foto sale del cofre cifrado de la app y va a tu Google Drive, con la protección de Google (no la de la app). La copia en la app sigue. ¿Enviar?'))) return;
          v.drive = Object.assign({}, v.drive, { avisado: true });
        }
        enviar(el.dataset.t, el.dataset.id).then(function (r) { depois(); toast(r.fila ? msg({ codigo: 'sem_internet' }) : '📁 ' + tr('No Drive: ', 'On Drive: ', 'En Drive: ') + r.n + tr(' arquivo(s).', ' file(s).', ' archivo(s).')); }, falhou);
      },
      'cd-fila': function () {
        var n = 0;
        API.fila().reduce(function (p, k) { return p.then(function () { return enviar(k.slice(0, 1), k.slice(2)).then(function (r) { if (!r.fila) n++; }); }); }, Promise.resolve())
          .then(function () { depois(); toast('📁 ' + n + tr(' enviado(s) ao Drive.', ' sent to Drive.', ' enviado(s) a Drive.')); }, falhou);
      }
    }
  });
  window.CarroDrive = API;
  if (window.SolverGoogle) SolverGoogle.configurar({ app: 'moneytrio' }).then(function (e) { if (e.configurado && typeof render === 'function' && typeof ST !== 'undefined' && ST) render(); });
})();
