/* =====================================================================
   modulos/_modelo.js — MODELO para copiar (não é carregado pelo app)   0.0.0
   ---------------------------------------------------------------------
   Para criar um módulo: copie para modulos/<nome>.js, troque <nome> e a versão, e siga o
   "Guia de módulos" do ARQUITETURA.md (ligar no index.html, no sw.js, teste em teste/).

   O QUE FAZ (uma linha)
     …
   API (o que outros pedaços do app podem chamar)
     window.<Nome>.algo(x) → …
   DADOS
     Store.estado.<colecao> = [{id, …}]   (a nuvem guarda cada item fechado no money_docs)
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'exemplo_itens';

  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }

  var API = {
    lista: lista
  };

  MoneyModulos.registrar({
    id: 'exemplo',
    versao: '0.0.0',
    colecoes: [COL],
    pontos: {
      /* 'custos.topo': function (ctx) { return '<div class="card">…</div>'; } */
    },
    acoes: {
      /* 'exemplo-fazer': function (el, dados) { …; Store.salvar(); render(); } */
    },
    telas: {
      /* 'b-exemplo': { app: 'budget', render: function () { return '<div class="card-head"><h1>…</h1></div>'; } } */
    },
    ouvir: {
      /* 'gasto.salvo': function (g) { … } */
    }
  });
  window.Exemplo = API;
})();
