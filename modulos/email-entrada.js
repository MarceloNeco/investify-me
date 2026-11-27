/* =====================================================================
   modulos/email-entrada.js — "📧 Mandar e-mails para o MoneyTRIO"        1.0.0 · 27/Nov/2026 (3.133)
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, regra zero aprovada em 27/Nov/2026)
     Quem gerencia a família (comm_inbox_can_manage) cadastra os e-mails que podem mandar contas, notas e compras para
     moneytrio@solverone.com.br, sem script:
       · "E-mails que podem mandar para o MoneyTRIO": a lista com o estado (confirmado, esperando código, cancelado),
         "+ Adicionar e-mail" ligado a uma pessoa da família, o código de 6 dígitos grande com "Abrir e-mail pronto"
         (mailto: com o destinatário e o assunto "CONFIRMAR 123456"), renovar o código e cancelar;
       · "Encaminhar automaticamente": o passo a passo de iniciante do Gmail, Outlook/Hotmail, iCloud e Yahoo (o Yahoo grátis não
         encaminha sozinho: o caminho é encaminhar à mão, que vale para qualquer provedor), e "Baixar filtros do Gmail (.xml)",
         gerado no próprio aparelho, com grupos para marcar e desmarcar (nada pessoal do dono);
       · o "Código do Google" (o e-mail forwarding-noreply@google.com que chega ao MoneyTRIO), quando o servidor listar a mensagem.
     Aviso honesto: tudo o que bater no filtro vai para o MoneyTRIO; o app usa e o servidor apaga 7 dias depois de lido.
   API (window.EmailEntrada)
     estadoDe(r) · normalizar(r) · mailto(codigo) · xmlFiltros(grupos) → texto · codigoGoogle(msgs) → '123456789' | ''
   PONTOS QUE USA
     config.todos (Configurações › Compartilhadas) · ações ee-*
   NUVEM
     MoneyNuvem.emails (nuvem.js 1.17.0): podeGerenciar, lista, adicionar, novoCodigo, renovar, cancelar, mensagens
   ===================================================================== */
(function () {
  'use strict';
  var DESTINO = 'moneytrio@solverone.com.br';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function e$(t) { return typeof esc === 'function' ? esc(t) : String(t == null ? '' : t); }
  function nv() { return window.MoneyNuvem && MoneyNuvem.emails && MoneyNuvem.emails.logado && MoneyNuvem.emails.logado() ? MoneyNuvem.emails : null; }
  function lst(x) { return Array.isArray(x) ? x : (x && typeof x === 'object' ? [x] : []); }

  /* os grupos do filtro do Gmail: genéricos, iguais para todo mundo */
  var GRUPOS = [
    { id: 'contas', nome: ['Contas e cobranças', 'Bills and charges', 'Facturas y cobros'], campo: 'subject', termos: ['boleto', 'fatura', '"aviso de cobrança"'] },
    { id: 'notas', nome: ['Notas fiscais e recibos', 'Invoices and receipts', 'Facturas fiscales y recibos'], campo: 'subject', termos: ['"nota fiscal"', 'NFS-e', 'DANFE', 'recibo', 'comprovante'] },
    { id: 'compras', nome: ['Compras confirmadas', 'Confirmed purchases', 'Compras confirmadas'], campo: 'subject', termos: ['"pedido confirmado"', '"compra aprovada"', '"compra confirmada"'] },
    { id: 'ir', nome: ['Imposto de renda e extratos', 'Income tax and statements', 'Renta y extractos'], campo: 'subject', termos: ['"informe de rendimentos"', 'extrato'] },
    { id: 'lojas', nome: ['Lojas e apps de compra', 'Shops and shopping apps', 'Tiendas y apps de compra'], campo: 'from', termos: ['amazon.com.br', 'mercadolivre.com', 'mercadopago.com', 'shopee.com.br', 'magazineluiza.com.br', 'ifood.com.br', 'uber.com', '99app.com'] },
    { id: 'servicos', nome: ['Luz, gás, água e telefone', 'Power, gas, water and phone', 'Luz, gas, agua y teléfono'], campo: 'from', termos: ['enel.com.br', 'cpfl.com.br', 'light.com.br', 'cemig.com.br', 'copel.com', 'celesc.com.br', 'equatorialenergia.com.br', 'neoenergia.com', 'comgas.com.br', 'naturgy.com.br', 'sabesp.com.br', 'vivo.com.br', 'claro.com.br', 'tim.com.br', 'oi.com.br'] }
  ];
  var marcados = {}; GRUPOS.forEach(function (g) { marcados[g.id] = true; });
  var T = { pode: null, lista: null, carregando: false, erro: '', adicionando: false, google: '', codigos: {} };   /* codigos: o que o add/renovar devolveu (a lista pode não trazer) */

  var API = {
    GRUPOS: GRUPOS, DESTINO: DESTINO,
    /* o estado vindo do servidor, em três palavras */
    estadoDe: function (r) {
      var s = String((r && (r.status || r.estado || r.state)) || '').toLowerCase();
      if (/confirm|ativ|active|ok/.test(s)) return 'confirmado';
      if (/cancel|revog|inativ/.test(s)) return 'cancelado';
      return 'pendente';
    },
    normalizar: function (r) {
      r = r || {};
      return { id: r.id || r.sender_id || '', email: String(r.email || r.endereco || r.address || ''), pessoa: String(r.person || r.pessoa || r.p_person || ''),
        estado: API.estadoDe(r), codigo: String(r.code || r.codigo || r.confirm_code || '').replace(/\D/g, '').slice(0, 6), validade: r.code_expires_at || r.expires_at || r.validade || '' };
    },
    mailto: function (codigo) { return 'mailto:' + DESTINO + '?subject=' + encodeURIComponent('CONFIRMAR ' + codigo); },
    /* o XML de filtros do Gmail (Configurações › Filtros › Importar filtros): um filtro por grupo, "encaminhar para" o MoneyTRIO */
    xmlFiltros: function (ids) {
      var x = function (s) { return String(s).replace(/&/g, '&amp;').replace(/'/g, '&apos;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); };
      var es = GRUPOS.filter(function (g) { return ids.indexOf(g.id) >= 0; }).map(function (g) {
        return "<entry><category term='filter'></category><title>Mail Filter</title><content></content>" +
          "<apps:property name='" + g.campo + "' value='" + x('(' + g.termos.join(' OR ') + ')') + "'/>" +
          "<apps:property name='forwardTo' value='" + DESTINO + "'/>" +
          "<apps:property name='sizeOperator' value='s_sl'/><apps:property name='sizeUnit' value='s_smb'/></entry>";
      });
      return "<?xml version='1.0' encoding='UTF-8'?><feed xmlns='http://www.w3.org/2005/Atom' xmlns:apps='http://schemas.google.com/apps/2006'><title>Mail Filters</title>" + es.join('') + '</feed>';
    },
    /* o código de confirmação do encaminhamento do Gmail, quando a mensagem do Google chega ao MoneyTRIO */
    codigoGoogle: function (msgs) {
      var m = lst(msgs).filter(function (x) { return /forwarding-noreply@google\.com/i.test(String(x.from || x.remetente || x.sender || '')); })
        .map(function (x) { return (String(x.subject || x.assunto || '').match(/\(#(\d{9})\)/) || [])[1] || ''; }).filter(Boolean);
      return m[m.length - 1] || '';
    },
    carregar: function () {
      var n = nv(); if (!n || T.carregando) return;
      T.carregando = true; T.erro = '';
      Promise.resolve(n.podeGerenciar()).then(function (p) {
        T.pode = p === true || (Array.isArray(p) && p.length && (p[0] === true || Object.keys(p[0] || {}).some(function (k) { return p[0][k] === true; })));
        if (!T.pode) return;
        return Promise.all([n.lista(), n.mensagens ? Promise.resolve(n.mensagens()).catch(function () { return []; }) : []]).then(function (r) {
          T.lista = lst(r[0]).map(API.normalizar).map(function (x) { if (!x.codigo) x.codigo = T.codigos[x.id] || T.codigos[x.email] || ''; return x; }); T.google = API.codigoGoogle(r[1]);
        });
      }).catch(function (e) { T.erro = String(e && e.message || e); }).then(function () { T.carregando = false; if (typeof render === 'function') render(); });
    },
    /* o código que o servidor devolveu ao adicionar ou renovar (número solto, {code}, ou a linha da lista) */
    guardarCodigo: function (r, chave) {
      var x = typeof r === 'number' || typeof r === 'string' ? { code: r } : (lst(r)[0] || {}), n = API.normalizar(x);
      if (n.codigo) { T.codigos[chave] = n.codigo; if (n.id) T.codigos[n.id] = n.codigo; if (n.email) T.codigos[n.email] = n.codigo; }
      return n.codigo;
    },
    _estado: T
  };

  function rotEstado(s) { return s === 'confirmado' ? '✅ ' + tr('confirmado', 'confirmed', 'confirmado') : s === 'cancelado' ? tr('cancelado', 'cancelled', 'cancelado') : '⏳ ' + tr('esperando o código', 'waiting for the code', 'esperando el código'); }
  function blocoCodigo(r) {
    return '<div class="ee-codigo"><p class="small">' + e$(tr('Mande, DESTE endereço (' + r.email + '), um e-mail para ' + DESTINO + ' com este código no assunto:', 'Send, FROM this address (' + r.email + '), an e-mail to ' + DESTINO + ' with this code in the subject:', 'Envía, DESDE esta dirección (' + r.email + '), un correo a ' + DESTINO + ' con este código en el asunto:')) + '</p>' +
      '<div class="ee-num">' + e$(r.codigo) + '</div>' +
      '<a class="btn sm primary" href="' + e$(API.mailto(r.codigo)) + '">✉️ ' + e$(tr('Abrir e-mail pronto', 'Open ready e-mail', 'Abrir correo listo')) + '</a></div>';
  }
  function passos(lista) { return '<ol class="small ee-passos">' + lista.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>'; }
  function b(t) { return '<b>' + e$(t) + '</b>'; }
  function guias() {
    var d = '<code>' + DESTINO + '</code>';
    return '<details class="ee-guia"><summary><b>Gmail</b></summary>' + passos([
        e$(tr('No computador, abra o Gmail › ⚙️ Configurações › Ver todas as configurações › ', 'On the computer, open Gmail › ⚙️ Settings › See all settings › ', 'En el ordenador, abre Gmail › ⚙️ Configuración › Ver toda la configuración › ')) + b(tr('Encaminhamento e POP/IMAP', 'Forwarding and POP/IMAP', 'Reenvío y correo POP/IMAP')) + ' › ' + b(tr('Adicionar um endereço de encaminhamento', 'Add a forwarding address', 'Añadir una dirección de reenvío')) + ': ' + d + '.',
        e$(tr('O Google manda um código para o MoneyTRIO. Ele aparece aqui no app em até alguns minutos: copie e cole no Gmail.', 'Google sends a code to MoneyTRIO. It shows here in the app within a few minutes: copy it and paste it in Gmail.', 'Google envía un código a MoneyTRIO. Aparece aquí en la app en unos minutos: cópialo y pégalo en Gmail.')),
        e$(tr('Baixe os filtros abaixo e, no Gmail, vá em ', 'Download the filters below and, in Gmail, go to ', 'Descarga los filtros de abajo y, en Gmail, ve a ')) + b(tr('Filtros e endereços bloqueados › Importar filtros', 'Filters and Blocked Addresses › Import filters', 'Filtros y direcciones bloqueadas › Importar filtros')) + e$(tr(': escolha o arquivo, marque todos e toque em Criar filtros.', ': pick the file, tick them all and tap Create filters.', ': elige el archivo, marca todos y toca Crear filtros.'))
      ]) + '</details>' +
      '<details class="ee-guia"><summary><b>Outlook / Hotmail</b></summary>' + passos([
        e$(tr('No Outlook.com: ⚙️ Configurações › Email › ', 'On Outlook.com: ⚙️ Settings › Mail › ', 'En Outlook.com: ⚙️ Configuración › Correo › ')) + b(tr('Regras', 'Rules', 'Reglas')) + ' › ' + b(tr('Adicionar nova regra', 'Add new rule', 'Agregar nueva regla')) + '.',
        e$(tr('Condição: "O assunto inclui" boleto, fatura, nota fiscal… (ou "De" a loja).', 'Condition: "Subject includes" bill, invoice… (or "From" the shop).', 'Condición: "El asunto incluye" boleto, factura… (o "De" la tienda).')),
        e$(tr('Ação: "Encaminhar para" ', 'Action: "Forward to" ', 'Acción: "Reenviar a" ')) + d + e$(tr(' e Salvar.', ' and Save.', ' y Guardar.'))
      ]) + '</details>' +
      '<details class="ee-guia"><summary><b>iCloud</b></summary>' + passos([
        e$(tr('Em icloud.com/mail: ⚙️ › ', 'On icloud.com/mail: ⚙️ › ', 'En icloud.com/mail: ⚙️ › ')) + b(tr('Regras', 'Rules', 'Reglas')) + ' › ' + b(tr('Adicionar uma regra', 'Add a rule', 'Añadir una regla')) + '.',
        e$(tr('"Se o assunto contém" boleto, fatura, nota fiscal… → "Encaminhar para" ', '"If subject contains" bill, invoice… → "Forward to" ', '"Si el asunto contiene" boleto, factura… → "Reenviar a" ')) + d + '.'
      ]) + '</details>' +
      '<details class="ee-guia"><summary><b>Yahoo</b></summary><p class="small">' +
        e$(tr('No Yahoo grátis não existe encaminhamento automático (desde 2021). O que funciona: cadastre o seu endereço Yahoo acima (com o código) e encaminhe à mão: abra o e-mail › Encaminhar › ', 'Free Yahoo has no automatic forwarding (since 2021). What works: add your Yahoo address above (with the code) and forward by hand: open the e-mail › Forward › ', 'Yahoo gratis no tiene reenvío automático (desde 2021). Lo que funciona: registra tu dirección Yahoo arriba (con el código) y reenvía a mano: abre el correo › Reenviar › ')) + d + '.</p>' +
        '<p class="small">' + e$(tr('Dica: salve ' + DESTINO + ' nos contatos do Yahoo, e fica em 2 toques.', 'Tip: save ' + DESTINO + ' in your Yahoo contacts and it takes 2 taps.', 'Consejo: guarda ' + DESTINO + ' en los contactos de Yahoo y quedan 2 toques.')) + '</p></details>' +
      '<p class="small">' + e$(tr('Em qualquer provedor também dá para encaminhar à mão, um e-mail por vez, desde que o seu endereço esteja confirmado acima.', 'With any provider you can also forward by hand, one e-mail at a time, as long as your address is confirmed above.', 'Con cualquier proveedor también puedes reenviar a mano, un correo cada vez, siempre que tu dirección esté confirmada arriba.')) + '</p>';
  }
  function filtros() {
    return '<div class="ee-filtros"><p class="small"><b>' + e$(tr('Filtros do Gmail: o que encaminhar', 'Gmail filters: what to forward', 'Filtros de Gmail: qué reenviar')) + '</b></p>' +
      GRUPOS.map(function (g) { return '<label class="linha-check small"><input type="checkbox" class="ee-grupo" value="' + g.id + '"' + (marcados[g.id] ? ' checked' : '') + '> ' + e$(pt() ? g.nome[0] : (I18n.atual === 'es' ? g.nome[2] : g.nome[1])) + '</label>'; }).join('') +
      '<button class="btn sm" data-acao="ee-baixar">⬇️ ' + e$(tr('Baixar filtros do Gmail (.xml)', 'Download Gmail filters (.xml)', 'Descargar filtros de Gmail (.xml)')) + '</button>' +
      '<p class="tiny muted">' + e$(tr('Tudo o que bater no filtro vai para o MoneyTRIO. O app usa e o servidor apaga 7 dias depois de lido.', 'Everything that matches the filter goes to MoneyTRIO. The app uses it and the server deletes it 7 days after it is read.', 'Todo lo que coincida con el filtro va a MoneyTRIO. La app lo usa y el servidor lo borra 7 días después de leído.')) + '</p></div>';
  }
  function cartao() {
    if (!nv()) return '';
    if (T.pode === null && !T.carregando) { setTimeout(API.carregar, 0); return ''; }
    if (!T.pode) return '';
    var pessoas = window.Pessoas ? Pessoas.ativas().filter(function (p) { return p.tipo === 'casa'; }) : [];
    var h = '<div class="card cfg-sec" data-sec="todos" id="eeCartao"><div class="card-head"><h3>📧 ' + e$(tr('Mandar e-mails para o MoneyTRIO', 'Send e-mails to MoneyTRIO', 'Enviar correos a MoneyTRIO')) + '</h3></div>' +
      '<p class="small muted">' + e$(tr('Contas, notas e compras que chegam no seu e-mail podem ir para ' + DESTINO + ': o app lê e organiza.', 'Bills, invoices and purchases in your e-mail can go to ' + DESTINO + ': the app reads and sorts them.', 'Facturas, notas y compras de tu correo pueden ir a ' + DESTINO + ': la app las lee y ordena.')) + '</p>';
    if (T.google) h += '<div class="callout ee-google"><b>' + e$(tr('Código do Google: ', 'Google code: ', 'Código de Google: ')) + '<span class="ee-num-g">' + e$(T.google) + '</span></b> · ' + e$(tr('copie e cole no Gmail', 'copy it and paste it in Gmail', 'cópialo y pégalo en Gmail')) + '</div>';
    h += '<h4 class="bl-sub">' + e$(tr('E-mails que podem mandar para o MoneyTRIO', 'E-mails that can send to MoneyTRIO', 'Correos que pueden enviar a MoneyTRIO')) + '</h4>';
    if (T.erro) h += '<p class="small down">' + e$(tr('Não consegui falar com o servidor agora. ', 'Could not reach the server now. ', 'No pude hablar con el servidor ahora. ')) + '<button class="linkinho" data-acao="ee-recarregar">' + e$(tr('Tentar de novo', 'Try again', 'Reintentar')) + '</button></p>';
    var l = T.lista || [];
    h += l.length ? '<ul class="ee-lista">' + l.map(function (r) {
      return '<li class="ee-item" data-id="' + e$(r.id) + '"><div><b>' + e$(r.email) + '</b>' + (r.pessoa ? ' · ' + e$(r.pessoa) : '') + ' <span class="small">' + rotEstado(r.estado) + '</span></div>' +
        (r.estado === 'pendente' && r.codigo ? blocoCodigo(r) : '') +
        (r.estado !== 'cancelado' ? '<div class="row" style="gap:6px;flex-wrap:wrap">' + (r.estado === 'pendente' ? '<button class="btn sm" data-acao="ee-renovar" data-id="' + e$(r.id) + '">' + e$(tr('Novo código', 'New code', 'Nuevo código')) + '</button>' : '') +
          '<button class="btn sm" data-acao="ee-cancelar" data-id="' + e$(r.id) + '">' + e$(tr('Cancelar', 'Cancel', 'Cancelar')) + '</button></div>' : '') + '</li>';
    }).join('') + '</ul>' : (T.lista ? '<p class="small muted">' + e$(tr('Nenhum ainda.', 'None yet.', 'Ninguno todavía.')) + '</p>' : '<p class="small muted">…</p>');
    h += '<div class="ee-novo grid g2"><label class="f"><span class="lb">' + e$(tr('E-mail', 'E-mail', 'Correo')) + '</span><input id="eeEmail" type="email" inputmode="email" placeholder="nome@example.com" autocomplete="off"></label>' +
      '<label class="f"><span class="lb">' + e$(tr('De quem é', 'Whose is it', 'De quién es')) + '</span><select id="eePessoa"><option value="">—</option>' + pessoas.map(function (p) { return '<option value="' + e$(p.id) + '">' + e$(Pessoas.rotulo(p)) + '</option>'; }).join('') + '</select></label></div>' +
      '<button class="btn sm primary" data-acao="ee-adicionar"' + (T.adicionando ? ' disabled' : '') + '>' + e$(tr('+ Adicionar e-mail', '+ Add e-mail', '+ Añadir correo')) + '</button>';
    h += '<h4 class="bl-sub">' + e$(tr('Encaminhar automaticamente', 'Forward automatically', 'Reenviar automáticamente')) + '</h4>' + guias() + filtros();
    return h + '</div>';
  }
  function baixar(nome, texto) {
    var blob = new Blob([texto], { type: 'application/xml' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function acao(p, ok) {
    return Promise.resolve(p).then(function (r) { if (ok) ok(r); }).catch(function (e) { toast(tr('Não deu: ', 'Did not work: ', 'No funcionó: ') + String(e && e.message || e), 'warn'); })
      .then(function () { T.pode = null; API.carregar(); });
  }
  document.addEventListener('change', function (ev) { var t = ev.target; if (t && t.matches && t.matches('.ee-grupo')) marcados[t.value] = t.checked; });

  MoneyModulos.registrar({
    id: 'email-entrada',
    versao: '1.0.0',
    pontos: { 'config.todos': cartao },
    acoes: {
      'ee-recarregar': function () { T.pode = null; API.carregar(); },
      'ee-adicionar': function () {
        var n = nv(); if (!n) return;
        var em = String((document.getElementById('eeEmail') || {}).value || '').trim().toLowerCase(), pid = (document.getElementById('eePessoa') || {}).value || '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return toast(tr('Esse e-mail não parece certo.', 'That e-mail does not look right.', 'Ese correo no parece correcto.'), 'warn');
        var pes = pid && window.Pessoas ? Pessoas.porId(pid) : null;
        T.adicionando = true;
        acao(n.adicionar(em, pes ? Pessoas.rotulo(pes) : null), function (r) { API.guardarCodigo(r, em); toast(tr('Adicionado. Agora mande o código.', 'Added. Now send the code.', 'Añadido. Ahora envía el código.')); })
          .then(function () { T.adicionando = false; });
      },
      'ee-renovar': function (el) { var n = nv(), id = el.dataset.id; if (n) acao(n.renovar(id), function (r) { API.guardarCodigo(r, id); }); },
      'ee-cancelar': function (el) { var n = nv(); if (n) acao(n.cancelar(el.dataset.id)); },
      'ee-baixar': function () {
        var ids = GRUPOS.filter(function (g) { return marcados[g.id]; }).map(function (g) { return g.id; });
        if (!ids.length) return toast(tr('Marque pelo menos um grupo.', 'Tick at least one group.', 'Marca al menos un grupo.'), 'warn');
        baixar('moneytrio-filtros-gmail.xml', API.xmlFiltros(ids));
      }
    }
  });
  window.EmailEntrada = API;
})();
