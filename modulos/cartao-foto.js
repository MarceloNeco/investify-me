/* =====================================================================
   modulos/cartao-foto.js — cadastrar cartão por foto (3.65)                1.0.0 · 11/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     Em "Cadastrar cartão", dois botões: "📷 Fotografar cartão" (câmera de trás) e "🖼️ Imagem ou print do cartão"
     (galeria: foto do cartão ou print do cartão virtual no app do banco). O motor do Leitor OCR lê a FRENTE do cartão no
     próprio aparelho (Leitura.lerCartao) e preenche o formulário: final, bandeira, validade, apelido, banco. A pessoa
     confere e corrige antes de salvar.
     · O final já é de um cartão → avisa e oferece abrir esse cartão (não cria outro).
     · O final aparece nas compras do robô (conta_cartao) → o cadastro abre já ligado àquela conta, com os outros finais.
     · Cartão virtual com final novo → oferece juntar a um cartão do mesmo banco que veio do robô (mesma fatura).
     · Sem final (não passou no dígito verificador, ou print com o número escondido) → pede outra foto ou os 4 dígitos.
   SEGURANÇA (não desfazer)
     Guarda só o final. A foto não vai para histórico, IndexedDB nem fila: o arquivo vai direto para Leitura.lerCartao e
     o campo é limpo logo depois (input.value = ''). Sem IA e sem internet. Não pede foto do verso.
   MOTOR (cópia sem alterar do leitor-ocr 0.9.4, motor 1.11.0; a cópia mestre fica lá)
     leitor/leitura.js, leitor/leitura/, leitor/leitores/cartao-plastico.js, leitor/tesseract/ (guardado no 1º uso, sw.js).
     Carregado só quando a pessoa toca num dos botões.
   PONTOS
     cartao.topo (index.html abrirCartao, só no cadastro novo)
   ===================================================================== */
(function () {
  'use strict';
  var MOTOR = ['leitor/leitura.js', 'leitor/leitura/catalogo.js', 'leitor/leitura/texto.js', 'leitor/leitores/cartao-plastico.js'];
  var BAND = { visa: 'visa', mastercard: 'master', elo: 'elo', 'american express': 'amex', hipercard: 'hiper', 'diners club': 'diners' };
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function $(id) { return document.getElementById(id); }
  function cartoes() { return (typeof ST !== 'undefined' && ST && ST.cartoes) || []; }
  function rotulo(c) { return typeof Banco !== 'undefined' && Banco.rotuloCartao ? Banco.rotuloCartao(c.id) : (c.apelido || c.fim); }

  var carregando = null;
  function carregarMotor() {
    if (window.Leitura && window.Leitura.lerCartao) return Promise.resolve();
    if (carregando) return carregando;
    carregando = MOTOR.reduce(function (p, src) {
      return p.then(function () {
        return new Promise(function (ok, erro) {
          var s = document.createElement('script'); s.src = src; s.onload = ok;
          s.onerror = function () { erro(new Error('motor')); }; document.head.appendChild(s);
        });
      });
    }, Promise.resolve()).catch(function (e) { carregando = null; throw e; });
    return carregando;
  }

  function status(txt, tipo) {
    var el = $('ctFotoStatus'); if (!el) return;
    el.className = 'ctf-status' + (tipo ? ' ' + tipo : ''); el.innerHTML = txt;
  }
  function pronto(el, v) { if (el && v != null && v !== '') { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } }

  /* o banco do cartão (emissor) entre os bancos cadastrados */
  function bancoDe(emissor) {
    if (!emissor || typeof Banco === 'undefined') return null;
    var e = N(emissor);
    return Banco.todos().find(function (b) { var n = N(Banco.rotulo ? Banco.rotulo(b.id) : (b.apelido || b.nome)); return n && (n.indexOf(e) >= 0 || e.indexOf(N(b.nome || '')) >= 0); }) || null;
  }

  /* preenche o formulário aberto com o que a foto trouxe (só o que está vazio, menos o final e a bandeira) */
  function preencher(c) {
    if (c.final) pronto($('ctFim'), c.final);
    var b = BAND[N(c.bandeira)]; if (b) pronto($('ctBandeira'), b);
    if (c.validade && $('ctValidade') && !$('ctValidade').value) pronto($('ctValidade'), c.validade);
    var banco = bancoDe(c.emissor);
    if (banco && $('ctBanco') && !$('ctBanco').value) pronto($('ctBanco'), banco.id);
    if ($('ctApelido') && !$('ctApelido').value) {
      var ap = [c.emissor, c.bandeira].filter(Boolean).join(' ') + (c.virtual ? ' ' + tr('virtual', 'virtual') : '');
      if (ap.trim()) pronto($('ctApelido'), ap.trim());
    }
    if (c.virtual && c.final) {   /* o final entra na lista como virtual */
      var li = Array.prototype.find.call(document.querySelectorAll('.ct-final'), function (x) { return x.querySelector('.ct-f-fim').value === c.final; });
      if (!li) { var mais = document.querySelector('[data-acao="ct-final-mais"]'); if (mais) { mais.click(); li = document.querySelector('.ct-finais').lastElementChild; } }
      if (li) { li.querySelector('.ct-f-fim').value = c.final; li.querySelector('.ct-f-tipo').value = 'virtual'; }
    }
    return banco;
  }

  /* o que a foto trouxe × o que já existe (cartões e compras do robô) */
  function casar(c, banco) {
    var C = window.Cartoes, msg = [];
    var conf = '✅ ' + tr('Li o cartão. Confira e corrija antes de salvar: ', 'Card read. Check and fix before saving: ') +
      esc([c.bandeira, c.final ? '••' + c.final : '', c.validade ? tr('validade ', 'expiry ') + c.validade : '', c.emissor, c.virtual === 'temporario' ? tr('virtual temporário', 'temporary virtual') : c.virtual ? tr('virtual', 'virtual') : ''].filter(Boolean).join(' · ')) + '.';
    if (!c.final) {
      return status('⚠️ ' + tr('Li o cartão, mas não deu para ter certeza do número. Tire outra foto (o cartão inteiro, sem reflexo) ou digite os 4 últimos dígitos.', 'I read the card, but could not be sure of the number. Take another photo (the whole card, no glare) or type the last 4 digits.'), 'atencao');
    }
    if (!C) return status(conf, 'ok');
    var ja = C.doFinal(c.final);
    if (ja) {
      return status(conf + '<br>' + esc(tr('Este final já é do cartão ', 'This ending already belongs to the card ') + rotulo(ja) + '.') +
        ' <button type="button" class="btn sm" data-acao="ctf-abrir" data-id="' + esc(ja.id) + '">' + esc(tr('Abrir esse cartão', 'Open that card')) + '</button>', 'atencao');
    }
    var enc = (C.encontrados() || []).find(function (x) { return x.finais.indexOf(c.final) >= 0; });
    if (enc && !$('ctContaId').value && typeof abrirCartao === 'function') {
      /* o final está nas compras do robô: o cadastro vira o daquela conta (com os outros finais), e a foto completa */
      var sem = C.semente(enc.chave);
      if (sem) { abrirCartao(null, sem); preencher(c); msg.push(tr('Este final já aparece em ', 'This ending already shows up in ') + enc.n + tr(' compra(s) do robô', ' robot purchase(s)') + (enc.nome ? ' (' + enc.nome + ')' : '') + tr(': o cartão fica ligado a elas.', ': the card will be linked to them.')); }
    } else if (c.virtual) {
      var mesmos = cartoes().filter(function (x) { return x.contaId && (!banco || x.bancoId === banco.id); }).slice(0, 3);
      if (mesmos.length) msg.push(tr('Cartão virtual é a mesma fatura do cartão de sempre. Juntar a: ', 'A virtual card is the same bill as the regular card. Join: ') +
        mesmos.map(function (x) { return '<button type="button" class="btn sm" data-acao="ctf-juntar" data-id="' + esc(x.id) + '" data-fim="' + esc(c.final) + '">' + esc(rotulo(x)) + '</button>'; }).join(' '));
    }
    status(conf + (msg.length ? '<br>' + msg.map(function (m) { return /<button/.test(m) ? m : esc(m); }).join('<br>') : ''), 'ok');
  }

  async function ler(input) {
    var foto = input.files && input.files[0];
    input.value = '';   /* a foto não fica no campo */
    if (!foto) return;
    var F = window.Fundo, fim = function () { if (F && F.esconder) F.esconder('cartao-foto'); };
    status('⏳ ' + tr('Preparando o leitor (na primeira vez demora um pouco)…', 'Getting the reader ready (the first time takes a while)…'));
    try {
      await carregarMotor();
      if (F && F.mostrar) F.mostrar('cartao-foto', null, tr('Lendo o cartão', 'Reading the card'));
      var c = await window.Leitura.lerCartao(foto, {
        aviso: function (t) { status('⏳ ' + esc(t)); },
        progresso: function (p) { if (F && F.mostrar) F.mostrar('cartao-foto', p, tr('Lendo o cartão', 'Reading the card')); }
      });
      foto = null; fim();
      if (!$('ctFotoStatus')) return;   /* a pessoa fechou o cadastro */
      if (!c) return status('⚠️ ' + tr('Não achei um cartão nesta foto. Tente outra, com o cartão inteiro, de frente e bem iluminado.', 'I could not find a card in this photo. Try another one, with the whole card, front side, well lit.'), 'atencao');
      casar(c, preencher(c));
    } catch (e) {
      foto = null; fim();
      status('⚠️ ' + tr('Não deu para ler agora. Digite os dados do cartão (só os 4 últimos dígitos).', 'Could not read it now. Type the card details (only the last 4 digits).'), 'atencao');
    }
  }

  document.addEventListener('change', function (e) {
    var t = e.target; if (t && (t.id === 'ctFotoCam' || t.id === 'ctFotoGal')) ler(t);
  });

  MoneyModulos.registrar({
    id: 'cartao-foto',
    versao: '1.0.0',
    pontos: {
      'cartao.topo': function () {
        return '<div class="ctf">' +
          '<div class="row"><label class="btn sm" for="ctFotoCam">📷 ' + esc(tr('Fotografar cartão', 'Photograph card')) + '</label>' +
          '<label class="btn sm" for="ctFotoGal">🖼️ ' + esc(tr('Imagem ou print do cartão', 'Card image or screenshot')) + '</label></div>' +
          '<input type="file" id="ctFotoCam" accept="image/*" capture="environment" hidden>' +
          '<input type="file" id="ctFotoGal" accept="image/*" hidden>' +
          '<p class="tiny muted">' + esc(tr('Só a frente do cartão. A leitura é feita neste aparelho, sem internet; a foto não é guardada e só os 4 últimos dígitos ficam.',
            'Front side only. It is read on this device, without internet; the photo is not kept and only the last 4 digits stay.')) + '</p>' +
          '<div id="ctFotoStatus" class="ctf-status" role="status" aria-live="polite"></div></div>';
      }
    },
    acoes: {
      'ctf-abrir': function (el) { if (typeof abrirCartao === 'function') abrirCartao(el.dataset.id); },
      'ctf-juntar': function (el) {
        var c = cartoes().find(function (x) { return x.id === el.dataset.id; }), fim = el.dataset.fim; if (!c || !window.Cartoes) return;
        c.finais = Cartoes.finais(c);
        if (!c.finais.some(function (f) { return f.fim === fim; })) c.finais.push({ fim: fim, tipo: 'virtual' });
        var n = Cartoes.ligarRetro(c); Store.salvar();
        if (typeof fechar === 'function') fechar('assetModal');
        if (typeof render === 'function') render();
        if (typeof toast === 'function') toast(tr('Final ', 'Ending ') + fim + tr(' juntado ao ', ' joined to ') + rotulo(c) + (n ? ' · ' + n + tr(' compra(s) ligada(s)', ' purchase(s) linked') : '') + '.');
      }
    }
  });
  window.CartaoFoto = { carregarMotor: carregarMotor, _casar: casar, _preencher: preencher };
})();
