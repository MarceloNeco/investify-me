/* =====================================================================
   modulos/apelido.js — apelido da loja ou da pessoa, por origem (3.68)        1.0.0 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 13/Nov/2026)
     · Campo "Apelido" na edição de um lançamento: "PANIFICADORA EXEMPLO LTDA" → "Padaria Exemplo".
     · O apelido fica guardado na ORIGEM do lançamento, a mesma da confirmação (modulos/origem.js): CNPJ → id da pessoa →
       chave da descrição. Vale para os lançamentos passados e os que vierem dessa origem.
       Descrição genérica do banco ("PIX ENVIADO", boleto sem beneficiário) não identifica ninguém: o apelido vale só
       para aquele lançamento (3.65.1).
     · A lista mostra o apelido no lugar do nome do banco (sem repetir "Pagamento de Pix QR Code" / "Pix enviado");
       o nome original continua no detalhe (passar o dedo/mouse e na edição) e na busca.
     · Cofre: o apelido acompanha o lançamento (modulos/visao-casa.js): é da casa quando algum lançamento dessa origem é
       da casa; senão fica reservado. Quem vê só a casa só vê apelido de lançamento que ela vê.
   API (window.Apelido)
     origem(g) → chave ('' sem origem) · de(g) → apelido ou '' · salvar(g, nome) · texto(g) → o que a lista mostra
   DADOS
     Store.estado.apelidos = [{id, origem, nome}]   (a nuvem guarda cada um no money_docs)
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'apelidos';
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function origem(g) { return g && window.Origem ? Origem.origemDe(g) : ''; }

  var API = {
    origem: origem,
    de: function (g) {
      var k = origem(g); if (!k) return '';
      var a = lista().filter(function (x) { return x.origem === k; })[0];
      return a ? a.nome : '';
    },
    salvar: function (g, nome) {
      var k = origem(g); nome = String(nome || '').trim().slice(0, 60);
      if (!k) return;
      var l = lista(), a = l.filter(function (x) { return x.origem === k; })[0];
      if (!nome) { if (a) ST[COL] = l.filter(function (x) { return x !== a; }); return; }
      if (a) a.nome = nome; else l.push({ id: k, origem: k, nome: nome });
    },
    texto: function (g) { return API.de(g) || (g && g.desc) || ''; }
  };

  MoneyModulos.registrar({ id: 'apelido', versao: '1.0.0', colecoes: [COL] });
  window.Apelido = API;
})();
