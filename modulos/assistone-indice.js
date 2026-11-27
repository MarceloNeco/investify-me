/* =====================================================================
   modulos/assistone-indice.js — a busca do AssistONE acha o próprio app   1.2.0 · 27/Nov/2026 (3.132: Pessoas da família; 3.137: Compartilhar)
   ---------------------------------------------------------------------
   O QUE FAZ
     Diretriz geral: "O AssistONE conhece TUDO o que o app tem". Antes, o 🔎 Buscar só procurava nas aulas do Coach e no
     glossário. Este índice junta o que o app tem e leva direto à tela ou à ação:
       • as telas (menu ☰ e a ajuda 💡 de cada uma, das telas do index.html e dos módulos);
       • as seções de Configurações (nome + a primeira linha que explica);
       • os passos do Tutorial e os atalhos do Começar;
       • as Novidades (cada item das últimas versões);
       • a conta e os aparelhos (nuvem.js): PIN da conta (criar, trocar, esqueci), aparelho novo (Aprovar pelo outro aparelho,
         Pedido de acesso, 6 números), digital e passkey, código de recuperação, tirar aparelho, bloquear, instalar o app.
     Sem acento, nos 3 idiomas (o espanhol pelo FRASES_ES, e sem ele o inglês). Palavras de 1-2 letras ("OS") só casam com
     palavra inteira do título ou das palavras-chave (senão "os" acharia metade do app).
     Quando o master assistone.js 1.3 trouxer o índice comum da plataforma (pendência #153 do RootifyONE), este arquivo vira
     só a lista do que é do MoneyTRIO, e o teste teste/assistone-indice.js é trocado pela cópia do master.
   API
     window.AssistIndice.buscar(q)  → [{ico, t, x, onde, i}] (no máximo 12, os de título primeiro)
     window.AssistIndice.itens()    → o índice inteiro (para o teste)
     window.AssistIndice.html(q)    → o grupo "No app" pronto para a lista de resultados ('' sem resultado)
     ação 'ai-ir' (data-ai = i)     → vai para a tela ou faz a ação do item i
   DADOS
     nenhum (o índice é montado na hora e guardado por 20 s)
   ===================================================================== */
(function () {
  'use strict';
  var VER = '1.1.0';
  var cache = null, cacheL = '', cacheEm = 0, acoes = [];

  function tr(pt, en, es) { return I18n.tr(pt, en, es); }
  function sem(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /* um texto que o app guarda em PT (e às vezes com o EN ao lado) no idioma atual */
  function no(pt, en) {
    if (I18n.atual === 'pt') return pt;
    if (I18n.atual === 'es' && typeof FRASES_ES !== 'undefined' && FRASES_ES[pt] !== undefined) return FRASES_ES[pt];
    if (en != null) return en;
    return typeof Verter !== 'undefined' ? Verter.txt(pt) : pt;
  }
  function fecharAssist() { try { if (typeof Assist !== 'undefined') Assist.fechar(); } catch (e) {} try { if (typeof AssistOne !== 'undefined' && AssistOne.fechar) AssistOne.fechar(); } catch (e) {} }
  function irTela(v) {
    fecharAssist();
    var app = appDaView(v);
    if (v !== 'config' && app !== (ST.appAtual || 'investify')) abrirApp(app);
    if ($('#app') && $('#app').classList.contains('hidden')) abrirApp(ST.appAtual || 'budget');
    irPara(v);
  }
  /* aciona um data-acao que já existe no app (o mesmo caminho do clique) */
  function acionar(acao) {
    var b = document.createElement('button'); b.setAttribute('data-acao', acao); b.style.display = 'none';
    document.body.appendChild(b); b.click(); b.remove();
  }
  function nuvem() { return window.MoneyNuvem && MoneyNuvem.iniciado ? MoneyNuvem : null; }
  function ajudaPin() { fecharAssist(); if (window.MoneyNuvem && MoneyNuvem.ajudaPin) MoneyNuvem.ajudaPin(); }
  function painel() { fecharAssist(); var n = nuvem(); if (n && n.abrirPainel) n.abrirPainel(); else ajudaPin(); }

  /* ---------- as fontes ---------- */
  function telas(out) {
    var vistas = {}, L = I18n.atual === 'pt' ? 'pt' : 'en';
    var ajudaDe = function (v) {
      var a = (typeof AJUDA_TELAS !== 'undefined' && AJUDA_TELAS[v]) || (window.MoneyModulos && (MoneyModulos.infoTela(v) || {}).ajuda) || null;
      if (!a || !a.pt) return null;
      var e = a.en || {};
      return { t: no(a.pt.t, e.t), o: no(a.pt.o, e.o), f: (a.pt.f || []).map(function (x, i) { return no(x, (e.f || [])[i]); }).join(' '), pt: a.pt.t + ' ' + a.pt.o };
    };
    var add = function (v, nome, ico, onde) {
      if (vistas[v] || v === 'hub') return; vistas[v] = 1;
      var a = ajudaDe(v);
      if (!nome && !a) return;
      out.push({ v: v, ico: ico || '💡', t: nome || a.t, x: a ? a.o : '', extra: (a ? a.t + ' ' + a.f + ' ' + a.pt : ''), onde: onde, ir: function () { irTela(v); }, peso: 3 });
    };
    var nomesApp = { budget: 'BudgetONE', investify: 'InvestifyONE', tax: 'FiscalONE' };
    (typeof appsVisiveis === 'function' ? appsVisiveis() : ['budget']).forEach(function (app) {
      (ABAS[app] || []).forEach(function (a) { add(a.v, nomeAba(a), a.ico, tr('Menu', 'Menu', 'Menú') + ' · ' + nomesApp[app]); });
    });
    if (typeof AJUDA_TELAS !== 'undefined') Object.keys(AJUDA_TELAS).forEach(function (v) { add(v, null, '💡', tr('Tela', 'Screen', 'Pantalla')); });
    if (window.MoneyModulos && MoneyModulos.telas) MoneyModulos.telas().forEach(function (x) { if (x.info && x.info.ajuda) add(x.id, null, '💡', tr('Tela', 'Screen', 'Pantalla')); });
    void L;
  }
  function config(out) {
    var h = ''; try { h = viewConfig(); if (typeof Verter !== 'undefined') h = Verter.html(h); } catch (e) { return; }
    var d = new DOMParser().parseFromString('<div>' + h + '</div>', 'text/html');
    d.querySelectorAll('.cfg-sec').forEach(function (sec) {
      var card = sec.classList.contains('card') ? sec : sec.querySelector('.card'); if (!card) return;
      var h3 = card.querySelector('.card-head h3'); if (!h3) return;
      var nome = h3.textContent.replace(/\s+/g, ' ').trim(); if (!nome) return;
      var dica = '', p = card.querySelector('p, .small, .tiny'); if (p) dica = p.textContent.replace(/\s+/g, ' ').trim().slice(0, 160);
      var qual = sec.getAttribute('data-sec') || (sec.closest('[data-sec]') || { getAttribute: function () { return 'todos'; } }).getAttribute('data-sec') || 'todos';
      out.push({ ico: '⚙️', t: nome, x: dica, extra: card.textContent.replace(/\s+/g, ' ').slice(0, 600), onde: tr('Configurações', 'Settings', 'Ajustes'), peso: 2,
        ir: function () {
          fecharAssist(); if ($('#app') && $('#app').classList.contains('hidden')) abrirApp(ST.appAtual || 'budget');
          irPara('config'); cfgSecao = qual; render();
          setTimeout(function () {
            var c = Array.prototype.find.call(document.querySelectorAll('#view-config .card'), function (x) { var t = x.querySelector('.card-head h3'); return t && t.textContent.replace(/\s+/g, ' ').trim() === nome; });
            if (c) { c.classList.add('aberta'); c.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
          }, 100);
        } });
    });
  }
  function tutorial(out) {
    if (typeof TUTORIAL === 'undefined') return;
    TUTORIAL.forEach(function (p, i) {
      out.push({ ico: p.ico, t: no(p.pt.t, p.en.t), x: no(p.pt.x, p.en.x), extra: p.pt.t + ' ' + p.pt.x, onde: tr('Tutorial', 'Tutorial', 'Tutorial'), peso: 1,
        ir: function () { if (window.Tour) { fecharAssist(); tutorialPasso = i; Tour.iniciar(i); } else { assistAba = 'tutorial'; tutorialPasso = i; Assist.render(); } } });
    });
    [['✨', 'Renda e custos fixos', 'Income and fixed costs', 'Ingresos y gastos fijos', 'Salário, moradia, carro, seguros, filhos, assinaturas — em oito passos, com leitura do holerite.', 'as-wizard', 'passo a passo wizard cadastro'],
     ['➕', 'Cadastrar um investimento', 'Register an investment', 'Registrar una inversión', 'Ação, fundo, renda fixa, cripto ou dinheiro em conta.', 'as-novo-ativo', 'ativo carteira'],
     ['📄', 'Importar um extrato', 'Import a statement', 'Importar un extracto', 'Avenue, BTG e Itaú: o app lê e preenche o histórico.', 'as-importar', 'extrato importar'],
     ['📷', 'Fotografar um cupom', 'Photograph a receipt', 'Fotografiar un ticket', 'QR de nota fiscal, código de boleto ou leitura do cupom pela câmera.', 'as-camera', 'camera foto nota cupom boleto'],
     ['🔑', 'Ligar as chaves gratuitas', 'Turn on the free keys', 'Activar las claves gratuitas', 'Duas chaves gratuitas liberam cotações dos EUA e mais manchetes.', 'as-chaves', 'chave api cotacao']
    ].forEach(function (c) {
      out.push({ ico: c[0], t: tr(c[1], c[2], c[3]), x: no(c[4]), extra: c[1] + ' ' + c[4] + ' ' + c[6], onde: tr('Começar', 'Get started', 'Empezar'), peso: 2, ir: function () { acionar(c[5]); } });
    });
    /* 1.1.0 (3.132): renomear uma pessoa, o e-mail dela, incluir alguém → Pessoas da família */
    out.push({ ico: '👥', t: tr('Pessoas da família: renomear, e-mail, incluir alguém', 'Family people: rename, e-mail, add someone', 'Personas de la familia: renombrar, correo, añadir a alguien'),
      x: tr('Mude o nome ou o apelido de alguém (muda em tudo), ponha o e-mail de quem entra no app ou inclua uma pessoa.', 'Change someone\'s name or nickname (it changes everywhere), add the e-mail of who signs in, or add a person.', 'Cambia el nombre o el apodo de alguien (cambia en todo), pon el correo de quien entra en la app o añade a una persona.'),
      k: 'renomear pessoa mudar nome trocar nome apelido email e-mail da pessoa familia incluir alguem rename person', onde: tr('Configurações', 'Settings', 'Configuración'), peso: 3, ir: function () { irTela('cfg-pessoas'); } });
    /* o botão da foto de gasto (a OS da oficina, a nota, o recibo, o canhoto) */
    out.push({ ico: '📷', t: tr('Foto de nota ou recibo', 'Photo of an invoice or receipt', 'Foto de factura o recibo'),
      x: tr('OS da oficina, nota, recibo ou canhoto: o app lê e liga ao banco (em Lançamentos).', 'Workshop service order, invoice, receipt or card slip: the app reads it and links it to the bank (in Entries).', 'Orden del taller, factura, recibo o ticket: la app lo lee y lo vincula al banco (en Movimientos).'),
      k: 'OS oficina nota recibo canhoto comprovante orcamento foto', onde: tr('Lançamentos', 'Entries', 'Movimientos'), peso: 3, ir: function () { irTela('b-lanc'); } });
  }
  function novidades(out) {
    if (typeof MUDANCAS === 'undefined') return;
    MUDANCAS.slice(0, 15).forEach(function (m) {
      (m.itens || []).forEach(function (it) {
        out.push({ ico: '🆕', t: no(m.t), x: no(it), extra: m.t + ' ' + it, onde: tr('Novidades', "What's new", 'Novedades') + ' ' + m.v, peso: -5, versao: m.v, ir: function () { fecharAssist(); acionar('ver-mudancas'); } });
      });
    });
  }
  function conta(out) {
    var C = function (ico, t, x, k, ir) { out.push({ ico: ico, t: tr(t[0], t[1], t[2]), x: tr(x[0], x[1], x[2]), k: k, onde: tr('Conta e aparelhos', 'Account and devices', 'Cuenta y dispositivos'), peso: 3, ir: ir }); };
    C('🔢', ['Criar o PIN da conta (opcional)', 'Create the account PIN (optional)', 'Crear el PIN de la cuenta (opcional)'],
      ['Um PIN só para todos os seus aparelhos e apps. Se não criar, ao entrar num aparelho novo você escolhe o PIN lá.', 'One PIN for all your devices and apps. If you skip it, you choose the PIN when you sign in on a new device.', 'Un solo PIN para todos tus dispositivos y apps. Si no lo creas, al entrar en un dispositivo nuevo eliges el PIN allí.'],
      'pin senha numero conta criar password', function () { fecharAssist(); var n = nuvem(); if (n && n.criarPinConta) n.criarPinConta(); else ajudaPin(); });
    C('🔢', ['Trocar o PIN da conta', 'Change the account PIN', 'Cambiar el PIN de la cuenta'],
      ['Em Segurança e aparelhos → PIN e digital → Trocar o PIN. Vale em todos os aparelhos.', 'In Security and devices → PIN and fingerprint → Change PIN. It works on all devices.', 'En Seguridad y dispositivos → PIN y huella → Cambiar el PIN. Vale en todos los dispositivos.'],
      'pin trocar mudar alterar senha change', painel);
    C('❓', ['Esqueci o PIN', 'I forgot the PIN', 'Olvidé el PIN'],
      ['Na tela do cadeado, toque em "Esqueci o PIN" e aprove pelo outro aparelho.', 'On the lock screen, tap "I forgot the PIN" and approve from your other device.', 'En la pantalla del candado, toca "Olvidé el PIN" y aprueba desde el otro dispositivo.'],
      'pin esqueci esquecer perdi senha forgot', ajudaPin);
    C('📱', ['PIN da conta e aparelho novo (passo a passo)', 'Account PIN and a new device (step by step)', 'PIN de la cuenta y dispositivo nuevo (paso a paso)'],
      ['O que é o PIN da conta, se é obrigatório e como entrar num celular novo.', 'What the account PIN is, whether it is required and how to sign in on a new phone.', 'Qué es el PIN de la cuenta, si es obligatorio y cómo entrar en un móvil nuevo.'],
      'pin celular aparelho novo telefone entrar primeira vez instalar phone device mobile', ajudaPin);
    C('🔔', ['Aprovar um aparelho novo (Pedido de acesso)', 'Approve a new device (Access request)', 'Aprobar un dispositivo nuevo (Solicitud de acceso)'],
      ['No aparelho novo, "📱 Aprovar pelo outro aparelho"; aqui, Pedido de acesso → Ver → confira os 6 números → PIN.', 'On the new device, "📱 Approve from my other device"; here, Access request → See → check the 6 numbers → PIN.', 'En el dispositivo nuevo, "📱 Aprobar desde el otro dispositivo"; aquí, Solicitud de acceso → Ver → comprueba los 6 números → PIN.'],
      'aparelho celular pedido acesso aprovar 6 numeros seis outro aparelho device approve', painel);
    C('👆', ['Desbloquear com a digital', 'Unlock with the fingerprint', 'Desbloquear con la huella'],
      ['Abre o app com a digital (ou o rosto) neste aparelho, sem digitar o PIN.', 'Opens the app with the fingerprint (or face) on this device, without typing the PIN.', 'Abre la app con la huella (o la cara) en este dispositivo, sin escribir el PIN.'],
      'digital biometria rosto face fingerprint', painel);
    C('👆', ['Entrar com a digital num aparelho novo (passkey)', 'Sign in with the fingerprint on a new device (passkey)', 'Entrar con la huella en un dispositivo nuevo (passkey)'],
      ['Só para um aparelho que você ainda não usou: a chave de acesso que o Google ou a Apple guardam.', 'Only for a device you have not used yet: the access key Google or Apple keep.', 'Solo para un dispositivo que aún no has usado: la clave de acceso que guardan Google o Apple.'],
      'digital passkey chave de acesso aparelho novo celular', painel);
    C('🧾', ['Código de recuperação', 'Recovery code', 'Código de recuperación'],
      ['O código antigo do OmniLifeONE (ABCDE-…): na primeira vez num aparelho, "Tenho o código de recuperação antigo".', 'The old OmniLifeONE code (ABCDE-…): the first time on a device, "I have the old recovery code".', 'El código antiguo de OmniLifeONE (ABCDE-…): la primera vez en un dispositivo, "Tengo el código de recuperación antiguo".'],
      'codigo recuperacao recovery code', ajudaPin);
    C('📵', ['Tirar um aparelho da conta', 'Remove a device from the account', 'Quitar un dispositivo de la cuenta'],
      ['Segurança e aparelhos → Seus aparelhos → remover… (para celular perdido, vendido ou emprestado).', 'Security and devices → Your devices → remove… (for a lost, sold or lent phone).', 'Seguridad y dispositivos → Tus dispositivos → quitar… (para un móvil perdido, vendido o prestado).'],
      'tirar remover aparelho celular perdi roubado vendi remove device', painel);
    C('🔒', ['Bloquear agora', 'Lock now', 'Bloquear ahora'],
      ['Fecha o app na hora e pede o PIN ou a digital para abrir.', 'Closes the app at once and asks for the PIN or fingerprint to open.', 'Cierra la app al momento y pide el PIN o la huella para abrir.'],
      'bloquear trancar cadeado fechar lock', painel);
    C('📲', ['Instalar o app no celular', 'Install the app on the phone', 'Instalar la app en el móvil'],
      ['No Chrome, toque em ⋮ e em Instalar app: o ícone vai para a tela do celular.', 'In Chrome, tap ⋮ and Install app: the icon goes to the phone screen.', 'En Chrome, toca ⋮ e Instalar app: el icono va a la pantalla del móvil.'],
      'instalar icone tela inicial celular atalho install', ajudaPin);
    C('📤', ['Compartilhar PDF, extrato ou nota com o app', 'Share a PDF, statement or invoice with the app', 'Compartir un PDF, extracto o factura con la app'],
      ['No celular, abra o arquivo, toque em Compartilhar e escolha o MoneyTRIO (só aparece com o app instalado pelo Chrome; se não aparecer para PDF, reinstale). O app pergunta "O que é isto?" e lê aqui no aparelho.', 'On the phone, open the file, tap Share and pick MoneyTRIO (it only shows up with the app installed from Chrome; if it does not show for PDFs, reinstall). The app asks "What is this?" and reads it here on the device.', 'En el móvil, abre el archivo, toca Compartir y elige MoneyTRIO (solo aparece con la app instalada desde Chrome; si no aparece para PDF, reinstálala). La app pregunta "¿Qué es esto?" y lo lee aquí en el dispositivo.'],
      'compartilhar share pdf extrato csv ofx xml nota arquivo enviar', ajudaPin);
    C('🔐', ['Segurança e aparelhos', 'Security and devices', 'Seguridad y dispositivos'],
      ['Seus dados na nuvem, PIN e digital, seus aparelhos, robô do banco e sair.', 'Your cloud data, PIN and fingerprint, your devices, bank robot and sign out.', 'Tus datos en la nube, PIN y huella, tus dispositivos, robot del banco y salir.'],
      'seguranca aparelhos nuvem sair conta', painel);
  }

  /* 3.106 (diretriz "Avisos passageiros"): cada toast com id tem um tópico aqui (modulos/toast-fechavel.js) */
  function avisos(out) {
    if (!window.Toque || !Toque.topicos) return;
    var t = Toque.topicos();
    Object.keys(t).forEach(function (id) { var x = t[id]; out.push({ ico: '💬', t: x.t, x: x.x || '', k: id, onde: tr('Aviso', 'Notice', 'Aviso'), peso: 2, ir: function () { fecharAssist(); if (x.acao) acionar(x.acao); } }); });
  }
  function itens() {
    var L = I18n.atual;
    if (cache && cacheL === L && Date.now() - cacheEm < 20000) return cache;
    var out = [];
    [conta, telas, tutorial, avisos, config, novidades].forEach(function (f) { try { f(out); } catch (e) { console.warn('assistone-indice', f.name, e); } });
    out.forEach(function (it, i) {
      it.i = i;
      it._t = sem(it.t); it._k = sem((it.k || '') + ' ' + it.t);
      it._tudo = sem(it.t + ' ' + (it.x || '') + ' ' + (it.extra || '') + ' ' + (it.k || ''));
    });
    acoes = out.map(function (it) { return it.ir; });
    cache = out; cacheL = L; cacheEm = Date.now();
    return out;
  }
  function buscar(q) {
    var qn = sem(q).trim(); if (qn.length < 2) return [];
    var curta = qn.length <= 2, rx = new RegExp('(^|[^a-z0-9])' + qn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^a-z0-9])');
    var achados = [], qs = [qn];
    if (/ao$/.test(qn)) qs.push(qn.replace(/ao$/, 'oes'));   /* "cartão" também acha "Cartões" */
    var tem = function (txt) { return qs.some(function (x) { return txt.indexOf(x) >= 0; }); };
    itens().forEach(function (it) {
      var nota;
      if (curta) nota = rx.test(it._k) ? 10 : 0;
      else nota = tem(it._t) ? 10 : tem(it._k) ? 8 : tem(it._tudo) ? 4 : 0;
      if (nota) achados.push({ it: it, n: nota + it.peso });
    });
    achados.sort(function (a, b) { return b.n - a.n || a.it.i - b.it.i; });
    var versoes = {};   /* das Novidades, um item por versão */
    achados = achados.filter(function (a) { if (!a.it.versao) return true; if (versoes[a.it.versao]) return false; return (versoes[a.it.versao] = 1); });
    return achados.slice(0, 12).map(function (a) { return a.it; });
  }
  function html(q) {
    var r = buscar(q); if (!r.length) return '';
    var dest = typeof destacar === 'function' ? destacar : function (t) { return esc(t); };
    return '<div class="card" id="aiNoApp"><div class="card-head"><h3>' + esc(tr('No app', 'In the app', 'En la app')) + '</h3><div class="spacer"></div>' +
      '<span class="tiny muted">' + esc(tr('toque para ir até lá', 'tap to go there', 'toca para ir allí')) + '</span></div>' +
      r.map(function (it) {
        return '<div class="res-item" role="button" tabindex="0" data-acao="ai-ir" data-ai="' + it.i + '">' +
          '<div class="res-t">' + it.ico + ' ' + dest(it.t, q) + ' <span class="badge">' + esc(it.onde) + '</span></div>' +
          (it.x ? '<div class="res-x">' + dest(it.x, q) + '</div>' : '') + '</div>';
      }).join('') + '</div>';
  }

  MoneyModulos.registrar({
    id: 'assistone-indice',
    versao: VER,
    colecoes: [],
    pontos: {},
    acoes: {
      'ai-ir': function (el) { var f = acoes[+el.getAttribute('data-ai')]; if (typeof f === 'function') f(); }
    },
    telas: {},
    ouvir: {}
  });
  window.AssistIndice = { buscar: buscar, itens: itens, html: html, versao: VER };
})();
