/* =====================================================================
   modulos/carregar-doc.js — o topo da Carteira com DOIS botões (3.140)        1.0.0 · 27/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (feedback do dono: 5 botões espalhados no topo — "Patrimônio sem liquidez", "Ler extrato do FGTS (PDF)", "Colar texto",
   "Foto ou print", "Importar posições (JSON)"; e "nenhum usuário normal tem JSON")
     · "📎 Carregar documento": numa janela só, arquivo (PDF, planilha, OFX, CSV, XML, ZIP), foto ou print, ou colar texto; o ⓘ diz o
       que o app entende (extrato de corretora, informe de rendimentos, declaração do IR, extrato do FGTS, extrato bancário, contrato
       ou escritura de imóvel). Depois, o "O que é isto?" de sempre (modulos/partilha.js), com o palpite pelo nome e pelo texto.
       O arquivo .json de posições ainda é aceito aqui (sem botão próprio).
     · "🏠 Imóveis, carro e outros bens": o cadastro guiado (modulos/bens.js).
     · Tudo no aparelho, sem IA.
   API (window.CarregarDoc)
     abrir() · receber(arquivos) · botoes() → html dos dois botões
   PONTOS QUE USA
     investify.carteira.topo · ações cd-*
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  var ACEITA = '.pdf,.csv,.tsv,.txt,.ofx,.qfx,.xml,.xlsx,.xlsm,.zip,.json,application/pdf,text/csv,text/plain,text/xml,application/xml,application/zip,application/json,image/*';
  function entende() {
    return [
      tr('Extrato da corretora (PDF, CSV ou print) → as posições da Carteira', 'Broker statement (PDF, CSV or screenshot) → your Portfolio holdings', 'Extracto del bróker (PDF, CSV o captura) → las posiciones de la Cartera'),
      tr('Informe de rendimentos → os documentos do IR', 'Income statement → your tax documents', 'Certificado de rendimientos → los documentos de la renta'),
      tr('Declaração do IR (PDF) → o resumo da declaração e os bens', 'Tax return (PDF) → the return summary and assets', 'Declaración de la renta (PDF) → el resumen y los bienes'),
      tr('Extrato do FGTS (PDF) → o saldo de cada conta', 'FGTS statement (PDF) → each account balance', 'Extracto del FGTS (PDF) → el saldo de cada cuenta'),
      tr('Extrato bancário (OFX, CSV, PDF) → os lançamentos para conferir', 'Bank statement (OFX, CSV, PDF) → entries to review', 'Extracto bancario (OFX, CSV, PDF) → los movimientos para revisar'),
      tr('Contrato ou escritura de imóvel → fica guardado junto do imóvel, e você confere os valores', 'Property contract or deed → kept with the property, and you check the amounts', 'Contrato o escritura de inmueble → se guarda junto al inmueble y tú revisas los importes')
    ];
  }

  var API = {
    botoes: function () {
      return '<div class="row cd-acoes" style="gap:8px;margin:0 0 12px;justify-content:flex-end;flex-wrap:wrap">' +
        '<button class="btn sm" data-acao="cd-abrir" data-ajuda="carregar-documento">📎 ' + esc(tr('Carregar documento', 'Upload a document', 'Subir un documento')) + '</button>' +
        '<button class="btn sm" data-acao="bens-novo" data-ajuda="bens">🏠 ' + esc(tr('Imóveis, carro e outros bens', 'Property, car and other assets', 'Inmuebles, coche y otros bienes')) + '</button></div>';
    },
    abrir: function () {
      $('#genTitle').textContent = '📎 ' + tr('Carregar documento', 'Upload a document', 'Subir un documento');
      $('#genBody').innerHTML = Verter.html('<div class="cd-escolhas">' +
        '<button type="button" class="btn primary" data-acao="cd-arquivo">📁 ' + esc(tr('Escolher arquivo', 'Choose a file', 'Elegir un archivo')) + '</button>' +
        '<button type="button" class="btn" data-acao="cd-foto">📷 ' + esc(tr('Foto ou print', 'Photo or screenshot', 'Foto o captura')) + '</button>' +
        '<button type="button" class="btn" data-acao="cd-colar">📋 ' + esc(tr('Colar texto', 'Paste text', 'Pegar texto')) + '</button></div>' +
        '<p class="tiny muted">PDF · ' + esc(tr('planilha', 'spreadsheet', 'hoja de cálculo')) + ' · OFX · CSV · XML · ZIP · ' + esc(tr('foto', 'photo', 'foto')) + '</p>' +
        '<details class="cd-entende"><summary class="small">ⓘ ' + esc(tr('O que o app entende', 'What the app understands', 'Qué entiende la app')) + '</summary><ul class="small">' +
        entende().map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul><p class="tiny muted">' +
        esc(tr('Tudo é lido aqui no aparelho, sem IA. Depois de escolher, o app pergunta "O que é isto?" e já sugere a resposta.', 'Everything is read here on the device, no AI. After you choose, the app asks "What is this?" and suggests the answer.', 'Todo se lee aquí en el dispositivo, sin IA. Después de elegir, la app pregunta "¿Qué es esto?" y sugiere la respuesta.')) + '</p></details>');
      abrir('genModal');
    },
    escolher: function (accept, captura) {
      var i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = true; i.style.display = 'none';
      if (captura) i.setAttribute('capture', 'environment');
      i.addEventListener('change', function () { var l = Array.from(i.files || []); if (i.parentNode) i.parentNode.removeChild(i); if (l.length) API.receber(l); });
      document.body.appendChild(i); i.click();
    },
    receber: function (arquivos) {
      arquivos = [].slice.call(arquivos || []); if (!arquivos.length) return;
      fechar('genModal');
      var json = arquivos.filter(function (f) { return /\.json$/i.test(f.name || '') || f.type === 'application/json'; });
      if (json.length && json.length === arquivos.length && window.ImportarPosicoes && ImportarPosicoes.deArquivo) return ImportarPosicoes.deArquivo(json[0]);
      if (window.Partilha) return Partilha.perguntar(arquivos);
    }
  };

  MoneyModulos.registrar({
    id: 'carregar-doc',
    versao: '1.0.0',
    pontos: { 'investify.carteira.topo': function () { return API.botoes(); } },
    acoes: {
      'cd-abrir': function () { API.abrir(); },
      'cd-arquivo': function () { API.escolher(ACEITA, false); },
      'cd-foto': function () { API.escolher('image/*', false); },
      'cd-colar': function () { fechar('genModal'); var b = document.createElement('button'); b.dataset.acao = 'pt-colar'; if (window.MoneyModulos && MoneyModulos.acao) MoneyModulos.acao('pt-colar', b); }
    }
  });
  window.CarregarDoc = API;
})();
