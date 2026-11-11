/* =====================================================================
   modulos/espelho.js — planilha espelho: as edições da pessoa vão para o robô (3.64)        1.1.1 · 11/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     Quando a PESSOA cria, edita ou apaga um lançamento, ou confirma o palpite do robô, o app monta o texto do
     contrato v1 (o mesmo formato do robô) e põe na fila do espelho (nuvem.js 1.11.0: fechada com a chave da
     família no aparelho; vai fechada para a chave do robô, em lotes de 200, quando há internet).
     Correção do próprio robô, sem edição da pessoa, NÃO gera pacote.
     · "regra" {desc original, grupo, categoria, para_quem} só quando a pessoa mudou grupo/categoria de um lançamento
       que veio do robô, ou confirmou (então com "confirmada": true). O robô aprende e a planilha dele espelha.
     · Palpite do robô (confianca 'palpite', só em lançamento NOVO; sem o campo = dado antigo, não é palpite):
       a linha mostra "palpite do robô" discreto e "✓ Confirmar categoria" (um toque). "desconhecido" = "A identificar".
       Painel e gráficos não mudam.
     · "📄 Planilha espelho" no menu do perfil abre a planilha numa aba nova; o link fica nas configurações da
       família (que vão fechadas para a nuvem). Só aceita docs.google.com/spreadsheets.
     · 1.1.0 (3.65): o "palpite do robô" saiu da descrição: virou o selo "A confirmar" na coluna Categoria
       (modulos/origem.js); confirmar vale para a mesma origem. opt.semRegra: a planilha acompanha, sem repetir a regra.
   TEXTO ABERTO (contrato v1)
     {v:1, acao:'upsert'|'apagar', id: idRobo | 'app_'+id, em: ISO, quem_editou:'app', data, valor (positivo), tipo,
      grupo, categoria, descricao, freq, quem, para_quem, forma, cartao, ir, banco, regra?: {desc, grupo, categoria, para_quem, confirmada?}}
   API (window.Espelho)
     texto(g, acao, opt)        → o objeto do contrato (sem fechar)
     registrar(g, antes, opt)   → põe na fila (true se pôs) · apagar(g) · confirmar(id) · regraProfissional(p)
     linkValido(url)            → true só para https://docs.google.com/spreadsheets/…
   PONTOS QUE USA
     lancamento.linha · config.todos · ações esp-*
   ===================================================================== */
(function () {
  'use strict';
  var RX_LINK = /^https:\/\/docs\.google\.com\/spreadsheets\/[A-Za-z0-9/_?=&#.%-]+$/;
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function nuvem() { return window.MoneyNuvem && MoneyNuvem.espelho; }
  function cfg() { return (ST.config = ST.config || {}); }

  var API = {
    linkValido: function (u) { return RX_LINK.test(String(u || '').trim()) && String(u).length <= 400; },
    idDe: function (g) { return g.idRobo ? String(g.idRobo) : 'app_' + g.id; },
    texto: function (g, acao, opt) {
      opt = opt || {};
      var o = { v: 1, acao: acao || 'upsert', id: API.idDe(g), em: opt.em || new Date().toISOString(), quem_editou: 'app' };
      if (o.acao === 'apagar') return o;
      var cartao = g.cartaoNome || ((typeof Banco !== 'undefined' && Banco.cartao && g.cartaoId && (Banco.cartao(g.cartaoId) || {}).nome) || '');
      Object.assign(o, {
        data: g.data || '', valor: Math.abs(Number(g.valor) || 0), tipo: g.estorno ? 'estorno' : (g.fluxo === 'entrada' ? 'receita' : 'despesa'),
        grupo: g.grupo || '', categoria: g.sub || '', descricao: g.desc || '', freq: g.per || 'Pontual',
        quem: g.quem || '', para_quem: g.paraQuem || '', forma: g.forma || '', cartao: cartao,
        ir: g.irpf ? (g.irTexto || 'IRPF') : '', banco: g.conta || ''
      });
      if (opt.regra) o.regra = opt.regra;
      return o;
    },
    regraDe: function (g, confirmada) {
      var r = { desc: g.descRobo || g.desc || '', grupo: g.grupo || '', categoria: g.sub || '' };
      if (g.paraQuem) r.para_quem = g.paraQuem;
      if (confirmada) r.confirmada = true;
      return r;
    },
    registrar: function (g, antes, opt) {
      opt = opt || {};
      var n = nuvem(); if (!g || !n) return false;
      var regra = null;
      if (!opt.semRegra && g.origem === 'robo' && (opt.confirmada || (antes && (antes.grupo !== g.grupo || antes.sub !== g.sub || (antes.paraQuem || '') !== (g.paraQuem || '')))))
        regra = API.regraDe(g, !!(opt.confirmada || (antes && antes.confianca)));
      if (regra && window.Origem && Origem.generica && Origem.generica(g)) regra = null;   /* 1.1.1 (3.65.1): genérica sem CNPJ não vira regra */
      n.enfileirar(API.texto(g, 'upsert', { regra: regra })).catch(function (e) { console.warn('espelho', e); });
      return true;
    },
    apagar: function (g) { var n = nuvem(); if (!g || !n) return false; n.enfileirar(API.texto(g, 'apagar')).catch(function () {}); return true; },
    confirmar: function (id) {
      var g = Gasto.todos().find(function (x) { return x.id === id; }); if (!g) return null;
      Gasto.atualizar(id, { confianca: undefined, revisar: false, confirmadoEm: new Date().toISOString() });
      var novo = Gasto.todos().find(function (x) { return x.id === id; }); delete novo.confianca;
      API.registrar(novo, g, { confirmada: true });
      return novo;
    },
    /* a pessoa confirmou um profissional: cada lançamento do robô com ele vira regra confirmada */
    regraProfissional: function (p) {
      if (!p || !nuvem()) return 0;
      var n = 0;
      Gasto.todos().forEach(function (g) { if (g.profissional === p.id && g.origem === 'robo') { API.registrar(g, null, { confirmada: true }); n++; } });
      return n;
    }
  };

  MoneyModulos.registrar({
    id: 'espelho',
    versao: '1.1.1',
    pontos: {
      'config.todos': function () {
        var l = cfg().espelhoLink || '';
        return '<div class="card cfg-sec" data-sec="todos"><div class="card-head"><h3>📄 ' + esc(tr('Planilha espelho', 'Mirror spreadsheet')) + '</h3></div>' +
          '<p class="small muted" style="margin:0 0 8px">' + esc(tr('O robô copia os lançamentos para uma planilha do Google e recebe de volta o que você muda aqui. Cole o link dela para abrir pelo menu do perfil.',
            'The robot copies entries to a Google spreadsheet and gets back what you change here. Paste its link to open it from the profile menu.')) + '</p>' +
          '<div class="row" style="gap:6px;flex-wrap:wrap"><input id="espLink" type="url" inputmode="url" style="flex:1;min-width:220px" placeholder="https://docs.google.com/spreadsheets/…" value="' + esc(l) + '">' +
          '<button class="btn sm" data-acao="esp-link">' + esc(tr('Salvar', 'Save')) + '</button></div></div>';
      }
    },
    acoes: {
      'esp-confirmar': function (el) {
        var antes = Gasto.todos().find(function (x) { return x.id === el.dataset.id; }); antes = antes && Object.assign({}, antes);
        var g = API.confirmar(el.dataset.id); if (!g) return;
        toast(tr('Categoria confirmada: ', 'Category confirmed: ') + g.sub);
        if (window.Origem) Origem.depoisDe(g, antes);   /* vale para a mesma origem */
        Store.salvar(); render();
      },
      'esp-link': function () {
        var v = String((document.getElementById('espLink') || {}).value || '').trim();
        if (v && !API.linkValido(v)) { toast(tr('Use o link de uma planilha do Google (docs.google.com/spreadsheets/…).', 'Use a Google Sheets link (docs.google.com/spreadsheets/…).'), 'warn'); return; }
        if (v) cfg().espelhoLink = v; else delete cfg().espelhoLink;
        Store.salvar(); render(); toast(v ? tr('Link salvo.', 'Link saved.') : tr('Link tirado.', 'Link removed.'));
      }
    }
  });
  window.Espelho = API;
})();
