/* =====================================================================
   modulos/loja-nova.js — "Loja nova: X. O que é?" no 📥 (3.87)        1.0.0 · 14/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 14/Nov/2026; sem IA)
     · Loja que chegou do robô sem regra (a origem toda "A identificar": nenhum lançamento dela já confirmado) → no 📥
       "🏪 Loja nova: GLITZMANIA. O que é?", com grupo, categoria, para quem e "Dividir" (modulos/dividir.js).
     · A resposta vale para os lançamentos da mesma origem que ainda estão "A identificar" (Origem.replicar), vai uma vez à
       planilha do robô como regra (Espelho.registrar) e fica guardada como regra do app: o próximo lançamento dessa loja
       chega já classificado. A divisão nunca vira regra: só é SUGERIDA na próxima vez (modulos/dividir.js).
     · No 📥, o grupo "A identificar" do modulos/origem.js dessa loja dá lugar a esta pergunta (trata()).
   API (window.LojaNova)
     lojas() → [{chave, rotulo, itens}] · regra(chave) · trata(grupoDaOrigem) → true se esta pergunta cuida dele
   DADOS
     ST.config.lojaRegras = {origem: {grupo, sub, paraQuem, paraQuemId}} · ST.config.lojaNovaVista = {origem: 1}
   PONTOS QUE USA
     inbox.grupos ('confirmar') · evento gasto.novo · ações ln-*
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function cfg() { return (ST.config = ST.config || {}); }
  function doRobo(g) { return g.origem === 'robo' || !!g.idRobo; }

  var API = {
    regra: function (k) { return (cfg().lojaRegras || {})[k] || null; },
    lojas: function () {
      if (!window.Origem) return [];
      var vistas = cfg().lojaNovaVista || {}, todos = Gasto.todos();
      return Origem.grupos().filter(function (x) {
        if (x.status !== 'identificar' || x.chave.indexOf('u:') === 0 || vistas[x.chave] || API.regra(x.chave)) return false;
        if (!x.itens.some(doRobo)) return false;
        /* "nova": nenhum lançamento desta loja já foi confirmado ou editado */
        return !todos.some(function (g) { return (g.editadoPessoa || g.confirmadoEm) && Origem.origemDe(g) === x.chave; });
      });
    },
    trata: function (x) { return API.lojas().some(function (l) { return l.chave === x.chave; }); }
  };

  function ultimo(x) { return x.itens.slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; })[0]; }
  function abrirLoja(k) {
    var x = API.lojas().find(function (l) { return l.chave === k; }); if (!x) return;
    var g = ultimo(x), gs = Object.keys(GRUPOS).filter(function (c) { return GRUPOS[c].fluxo !== 'entrada'; });
    $('#genTitle').textContent = tr('Loja nova: ', 'New store: ') + x.rotulo;
    $('#genBody').innerHTML = Verter.html('<p class="small muted" style="margin:0 0 8px">' + esc(x.itens.length + tr(' lançamento(s) · o último: ', ' entr(ies) · the last: ') + fmt(g.valor) + ' · ' + I18n.data(g.data) + '. ' +
      tr('A resposta vira regra: a próxima vez desta loja já chega classificada.', 'Your answer becomes a rule: next time this store arrives already classified.')) + '</p>' +
      (typeof recOpcoesPessoa === 'function' ? recOpcoesPessoa('lnPess') : '') +
      '<div class="grid g2"><label class="field"><span>' + esc(tr('Grupo', 'Group')) + '</span><select id="lnGrupo">' + gs.map(function (c) { return '<option value="' + c + '"' + (c === g.grupo ? ' selected' : '') + '>' + esc((GRUPOS[c].ico || '') + ' ' + GRUPOS[c].nome) + '</option>'; }).join('') + '</select></label>' +
      '<label class="field"><span>' + esc(tr('Categoria', 'Category')) + '</span><input id="lnSub" maxlength="60" value="' + esc(/^(sem categoria|a identificar|\?)$/i.test(g.sub || '') ? '' : g.sub || '') + '"></label>' +
      '<label class="field"><span>' + esc(tr('Para quem é', 'Who it is for')) + '</span><input id="lnPara" list="lnPess" value=""></label></div>' +
      '<p style="margin:4px 0"><button type="button" class="btn sm" data-acao="ln-dividir" data-id="' + esc(g.id) + '">✂️ ' + esc(tr('Dividir o último (', 'Split the last one (') + fmt(g.valor) + ')') + '</button></p><div id="lnDiv" hidden></div>' +
      '<div class="f-actions"><button class="btn" data-acao="ln-depois" data-k="' + esc(k) + '">' + esc(tr('Não perguntar', 'Do not ask')) + '</button><button class="btn primary" data-acao="ln-salvar" data-k="' + esc(k) + '" data-id="' + esc(g.id) + '">' + esc(t('ac.salvar')) + '</button></div>');
    delete $('#genBody').dataset.inbox;
    abrir('genModal');
  }
  function val(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }

  MoneyModulos.registrar({
    id: 'loja-nova', versao: '1.0.0',
    pontos: {
      'inbox.grupos': function () {
        var l = API.lojas(); if (!l.length) return [];
        return [{ id: 'confirmar', n: l.length, html: l.map(function (x) {
          var g = ultimo(x);
          return '<li class="inb-item"><div><b>🏪 ' + esc(tr('Loja nova: ', 'New store: ') + x.rotulo + tr('. O que é?', '. What is it?')) + '</b><span class="t-sub">' + esc(x.itens.length + tr(' lançamento(s) · o último ', ' entr(ies) · the last ') + fmt(g.valor) + ' · ' + I18n.data(g.data)) + '</span></div>' +
            '<span class="inb-acoes"><button class="btn sm primary" data-acao="ln-abrir" data-k="' + esc(x.chave) + '">' + esc(tr('Responder', 'Answer')) + '</button></span></li>';
        }).join('') }];
      }
    },
    /* a regra: o próximo lançamento desta loja já chega classificado (a divisão, não: só a sugestão) */
    ouvir: {
      'gasto.novo': function (g) {
        if (!g || !doRobo(g) || !window.Origem || Origem.status(g) !== 'identificar') return;
        var r = API.regra(Origem.origemDe(g)); if (!r) return;
        Object.assign(g, { grupo: r.grupo, sub: r.sub, revisar: false, confirmadoEm: new Date().toISOString() });
        if (r.paraQuem) { g.paraQuem = r.paraQuem; if (r.paraQuemId) g.paraQuemId = r.paraQuemId; }
        delete g.confianca;
      }
    },
    acoes: {
      'ln-abrir': function (el) { abrirLoja(el.dataset.k); },
      'ln-dividir': function (el) {
        var box = document.getElementById('lnDiv'), g = Gasto.todos().find(function (x) { return x.id === el.dataset.id; }); if (!g || !box) return;
        if (!box.hidden) { box.hidden = true; box.innerHTML = ''; return; }
        box.innerHTML = Verter.html(Divisao.blocoHtml('lnD', n2(g.valor), [{ valor: n2(g.valor), grupo: val('lnGrupo'), sub: val('lnSub'), paraQuem: val('lnPara') }, { valor: 0, grupo: val('lnGrupo'), sub: val('lnSub') }], Origem.origemDe(g)));
        box.hidden = false; Divisao.somarTodos();
      },
      'ln-salvar': function (el) {
        var k = el.dataset.k, g = Gasto.todos().find(function (x) { return x.id === el.dataset.id; }); if (!g) return;
        var grupo = val('lnGrupo'), sub = val('lnSub');
        if (!sub) return toast(tr('Diga a categoria (ex.: Salão de beleza).', 'Enter the category (e.g. Beauty salon).'), 'warn');
        var partes = null, box = document.getElementById('lnDiv');
        if (box && !box.hidden) { var r = Divisao.ler('lnD', n2(g.valor)); if (r.erro) return toast(r.erro, 'warn'); partes = r.partes; }
        var d = { grupo: grupo, sub: sub, paraQuem: val('lnPara'), revisar: false, confirmadoEm: new Date().toISOString() };
        if (window.Pessoas) Pessoas.ligar(d, 'paraQuem', 'paraQuemId');
        var velho = Object.assign({}, g);
        Gasto.atualizar(g.id, d); var novo = Gasto.todos().find(function (x) { return x.id === g.id; }); delete novo.confianca;
        if (window.Espelho) Espelho.registrar(novo, velho, { confirmada: true });   /* a regra vai uma vez à planilha do robô */
        Origem.replicar(novo, velho);
        (cfg().lojaRegras = cfg().lojaRegras || {})[k] = { grupo: grupo, sub: sub, paraQuem: d.paraQuem || '', paraQuemId: d.paraQuemId || '' };
        if (partes) Divisao.aplicar(g.id, partes);
        fechar('genModal'); Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN();
        toast(tr('Pronto: a próxima vez desta loja já chega como ', 'Done: next time this store arrives as ') + (GRUPOS[grupo] || {}).nome + ' › ' + sub + '.');
      },
      'ln-depois': function (el) { (cfg().lojaNovaVista = cfg().lojaNovaVista || {})[el.dataset.k] = 1; fechar('genModal'); Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN(); }
    }
  });
  window.LojaNova = API;
})();
