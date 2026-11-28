/* =====================================================================
   modulos/categorias.js — renomear categoria, com o mapa de apelidos (3.65)        1.1.0 · 27/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     · Renomear uma categoria (Configurações → BudgetONE): muda em todos os lançamentos, compromissos, profissionais e
       categorias criadas à mão; o histórico dos gráficos continua junto (é o mesmo nome em tudo).
     · Mapa de apelidos (nome antigo → novo, por grupo), aplicado em tudo o que chega (robô, importação, tela:
       Gasto.arruma e Recorrente.arruma chamam Categorias.alias), para nada recriar a categoria velha.
     · Uma vez (3.65): Lazer · "Locação de Vídeo/DVD/Midias" e "CDs/DVDs/Jogos/Fitas/acessórios" → "Streaming e mídias".
     · 1.1.0 (3.141, pedido do dono): Veículo · "Sem Parar / Pedagio" → "Tag e pedágio" (EN "Toll tag and tolls", ES "Telepeaje y
       peajes"), uma vez (ST.config.cat3141). O nome antigo é APELIDO FIXO (FIXOS): vale mesmo sem a migração feita — o que chega do
       robô (nuvem.js 1.18.1 chama alias no converter) ou de um backup antigo entra com o nome novo.
       renomear() agora também leva o limite do orçamento (id 'GRUPO|sub'), as regras aprendidas em ST.config (lojaRegras,
       itemRegras… qualquer {chave: {grupo, sub}}) e os totais por categoria do resumo da casa (resumo[].orc).
   API (window.Categorias)
     alias(o)                       → troca o.sub pelo nome novo, se houver apelido
     renomear(grupo, de, para) → n  → propaga e guarda o apelido
   DADOS
     ST.config.subAlias = {'GRUPO|nome antigo': 'nome novo'} · ST.config.cat365 e ST.config.cat3141 (as migrações feitas)
   ===================================================================== */
(function () {
  'use strict';
  var STREAMING = 'Streaming e mídias';
  var INICIAIS = { 'LAZER|Locação de Vídeo/DVD/Midias': STREAMING, 'LAZER|CDs/DVDs/Jogos/Fitas/acessórios': STREAMING };
  var TAG = 'Tag e pedágio', FIXOS = { 'VEICULO|Sem Parar / Pedagio': TAG };   /* 1.1.0 (3.141) */
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function temST() { return typeof ST !== 'undefined' && !!ST; }
  function mapa() { return temST() ? ((ST.config = ST.config || {}).subAlias = ST.config.subAlias || {}) : {}; }

  var API = {
    STREAMING: STREAMING,
    TAG: TAG,
    alias: function (o) {
      if (!o || !o.sub) return o;
      var k = o.grupo + '|' + o.sub, novo = (temST() && ST.config && ST.config.subAlias && ST.config.subAlias[k]) || FIXOS[k]; if (novo) o.sub = novo;
      return o;
    },
    renomear: function (grupo, de, para) {
      de = String(de || '').trim(); para = String(para || '').trim();
      if (!grupo || !de || !para || de === para) return 0;
      var n = 0;
      Object.keys(ST).forEach(function (col) {
        if (!Array.isArray(ST[col])) return;
        ST[col].forEach(function (o) {
          if (!o || typeof o !== 'object') return;
          if (o.grupo === grupo && o.sub === de) { o.sub = para; n++; }
          if (o.roboSugeriu && (o.roboSugeriu.grupo || o.grupo) === grupo && o.roboSugeriu.sub === de) o.roboSugeriu.sub = para;
        });
      });
      /* 1.1.0 (3.141): as regras aprendidas (ST.config.lojaRegras, itemRegras…: {chave: {grupo, sub}}) */
      Object.keys(ST.config || {}).forEach(function (c) {
        var v = ST.config[c]; if (!v || typeof v !== 'object' || Array.isArray(v)) return;
        Object.keys(v).forEach(function (k) { var r = v[k]; if (r && typeof r === 'object' && r.grupo === grupo && r.sub === de) { r.sub = para; n++; } });
      });
      /* o limite do orçamento (id 'GRUPO|sub'; se o nome novo já tinha limite, fica o dele) e os totais do resumo da casa */
      var kDe = grupo + '|' + de, kPara = grupo + '|' + para;
      if (Array.isArray(ST.orcamentos)) {
        var jaTem = ST.orcamentos.some(function (o) { return o && o.id === kPara; });
        ST.orcamentos = ST.orcamentos.filter(function (o) { return !(o && o.id === kDe && jaTem); });
        ST.orcamentos.forEach(function (o) { if (o && o.id === kDe) o.id = kPara; });
      }
      (Array.isArray(ST.resumo) ? ST.resumo : []).forEach(function (r) {
        if (!r || !r.orc || r.orc[kDe] == null) return;
        r.orc[kPara] = Math.round(((r.orc[kPara] || 0) + r.orc[kDe]) * 100) / 100; delete r.orc[kDe];
      });
      if (ST.categorias && Array.isArray(ST.categorias[grupo])) {
        ST.categorias[grupo] = ST.categorias[grupo].map(function (x) { return x === de ? para : x; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
      }
      var m = mapa(); m[grupo + '|' + de] = para;
      Object.keys(m).forEach(function (k) { if (m[k] === de && k.split('|')[0] === grupo) m[k] = para; });   /* apelido de apelido */
      delete m[grupo + '|' + para];
      if (typeof Gasto !== 'undefined') Gasto._idx = null;
      return n;
    },
    /* as renomeações de uma vez (ao abrir o app; um backup antigo sem a marca refaz na próxima abertura) */
    migrar: function () {
      try {
        if (!temST()) return 0;
        ST.config = ST.config || {}; var n = 0, mudou = false;
        if (!ST.config.cat365) { Object.keys(INICIAIS).forEach(function (k) { var p = k.split('|'); n += API.renomear(p[0], p[1], INICIAIS[k]); }); ST.config.cat365 = 1; mudou = true; }
        if (!ST.config.cat3141) { Object.keys(FIXOS).forEach(function (k) { var p = k.split('|'); n += API.renomear(p[0], p[1], FIXOS[k]); }); ST.config.cat3141 = 1; mudou = true; }
        if (mudou && typeof Store !== 'undefined') Store.salvar();
        return n;
      } catch (e) { console.warn('categorias', e); return 0; }
    }
  };

  function cartao() {
    var arv = typeof Gasto !== 'undefined' ? Gasto.arvore() : {}, m = mapa();
    var gs = Object.keys(GRUPOS).filter(function (k) { return (arv[k] || []).length; });
    var h = '<div class="card cfg-sec" data-sec="budget"><div class="card-head"><h3>🏷️ ' + esc(tr('Renomear categoria', 'Rename category')) + '</h3></div>' +
      '<p class="small muted" style="margin:0 0 8px">' + esc(tr('Muda em todos os lançamentos e compromissos, e o histórico continua junto. O que chegar com o nome antigo (do robô ou de importação) entra com o nome novo.',
        'Changes it in every entry and commitment, keeping the history together. Anything arriving with the old name (robot or import) comes in with the new name.')) + '</p>' +
      '<div class="grid g2"><label class="f"><span class="lb">' + esc(tr('Grupo', 'Group')) + '</span><select id="catGrupo">' + gs.map(function (k) { return '<option value="' + k + '">' + esc((GRUPOS[k] || {}).nome || k) + '</option>'; }).join('') + '</select></label>' +
      '<label class="f"><span class="lb">' + esc(tr('Categoria', 'Category')) + '</span><select id="catDe">' + (arv[gs[0]] || []).map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap"><input id="catPara" placeholder="' + esc(tr('nome novo', 'new name')) + '" style="flex:1;min-width:200px">' +
      '<button class="btn sm primary" data-acao="cat-renomear">' + esc(tr('Renomear', 'Rename')) + '</button></div>';
    var ks = Object.keys(m);
    if (ks.length) h += '<p class="tiny muted" style="margin:8px 0 0">' + esc(tr('Nomes antigos que viram o novo: ', 'Old names that become the new one: ') +
      ks.map(function (k) { return k.split('|')[1] + ' → ' + m[k]; }).join(' · ')) + '</p>';
    return h + '</div>';
  }
  document.addEventListener('change', function (e) {
    if (!e.target || e.target.id !== 'catGrupo') return;
    var arv = Gasto.arvore(), sel = document.getElementById('catDe');
    if (sel) sel.innerHTML = (arv[e.target.value] || []).map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('');
  });

  MoneyModulos.registrar({
    id: 'categorias',
    versao: '1.1.0',
    iniciar: function () { API.migrar(); },
    pontos: { 'config.todos': cartao },
    acoes: {
      'cat-renomear': function () {
        var g = (document.getElementById('catGrupo') || {}).value, de = (document.getElementById('catDe') || {}).value, para = (document.getElementById('catPara') || {}).value;
        if (!String(para || '').trim()) { toast(tr('Escreva o nome novo.', 'Type the new name.'), 'warn'); return; }
        var n = API.renomear(g, de, para); Store.salvar(); render();
        toast(tr('Renomeado em ' + n + ' registro(s).', 'Renamed in ' + n + ' record(s).'));
      }
    }
  });
  window.Categorias = API;
})();
