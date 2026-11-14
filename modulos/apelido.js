/* =====================================================================
   modulos/apelido.js — apelido da loja ou da pessoa, por origem (3.68)        1.1.0 · 13/Nov/2026
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
     · 1.1.0 (3.69): o apelido pela CONTA FIXA, para boleto genérico do banco (Itaú "INT PAG TIT", sem beneficiário):
       um lançamento de saída com origem genérica ('u:'), sem apelido e sem compromisso ligado, que casa com um compromisso
       de Custos (valor dentro da faixa e data de 5 dias antes a 10 dias depois do vencimento) aparece na lista com o nome
       do compromisso e o selo amarelo "A confirmar". Faixa: mínimo e máximo dos últimos 12 pagamentos daquele compromisso,
       ±15%; sem histórico, o valor cadastrado ±25% (o valor varia: o condomínio leva água, gás e energia). Dois ou mais
       compromissos casam: não escolhe, mostra as opções. Nunca grava sozinho: confirmar liga o lançamento ao compromisso
       (recorrenteId + pagamento conciliado, o previsto × realizado vê a conta certa chegar) e grava o nome como apelido
       só daquele lançamento.
   API (window.Apelido)
     origem(g) → chave ('' sem origem) · de(g) → apelido ou '' · salvar(g, nome) · texto(g) → o que a lista mostra
     faixa(r) → {min, max, n} · contasFixas(g) → [{r, data}] (as sugestões) · ligarConta(id, rid)
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
    texto: function (g) {
      var a = API.de(g); if (a) return a;
      var c = API.contasFixas(g); return c.length === 1 ? c[0].r.nome : (g && g.desc) || '';
    },
    faixa: function (r) {
      var vs = Gasto.todos().filter(function (g) { return g.recorrenteId === r.id && g.data; }).sort(function (a, b) { return b.data.localeCompare(a.data); })
        .slice(0, 12).map(function (g) { return Number(g.valor) || 0; }).filter(function (v) { return v > 0; });
      if (!vs.length && typeof Pagamento !== 'undefined') vs = Pagamento.todos().filter(function (p) { return p.rid === r.id && p.valor > 0; })
        .sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); }).slice(0, 12).map(function (p) { return Number(p.valor); });
      if (!vs.length) { var v = Number(r.valor) || 0; return { min: v * 0.75, max: v * 1.25, n: 0 }; }
      return { min: Math.min.apply(null, vs) * 0.85, max: Math.max.apply(null, vs) * 1.15, n: vs.length };
    },
    contasFixas: function (g) {
      if (!g || g.fluxo !== 'saida' || g.recorrenteId || !g.data || typeof Recorrente === 'undefined') return [];
      if (origem(g).indexOf('u:') !== 0 || API.de(g)) return [];
      var v = Number(g.valor) || 0, out = [];
      Recorrente.ocorrencias(isoMais(g.data, -10), isoMais(g.data, 5)).forEach(function (o) {
        if ((GRUPOS[o.r.grupo] || {}).fluxo !== 'saida' || out.some(function (x) { return x.r.id === o.r.id; })) return;
        if (o.registro && o.registro.gastoId && o.registro.gastoId !== g.id) return;   /* esse vencimento já tem o pagamento dele */
        var f = API.faixa(o.r); if (v >= f.min && v <= f.max) out.push({ r: o.r, data: o.data });
      });
      return out;
    },
    ligarConta: function (id, rid) {
      var g = Gasto.todos().find(function (x) { return x.id === id; }), c = API.contasFixas(g).filter(function (x) { return x.r.id === rid; })[0];
      if (!c) return null;
      Gasto.atualizar(id, { recorrenteId: rid });
      if (typeof Pagamento !== 'undefined') Pagamento.conciliar(rid, c.data, id, Number(g.valor) || 0);
      API.salvar(Gasto.todos().find(function (x) { return x.id === id; }), c.r.nome);
      return c;
    }
  };
  function isoMais(iso, d) { var x = new Date(iso + 'T12:00:00'); x.setDate(x.getDate() + d); return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2); }
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  MoneyModulos.registrar({
    id: 'apelido', versao: '1.1.0', colecoes: [COL],
    pontos: {
      /* 3.69: a sugestão da conta fixa, na linha do lançamento; um toque confirma */
      'lancamento.linha': function (ctx) {
        var c = API.contasFixas(ctx.g); if (!c.length) return '';
        var bt = function (x) { return '<button type="button" class="or-ok ap-conta" data-acao="ap-conta" data-id="' + esc(ctx.g.id) + '" data-rid="' + esc(x.r.id) + '" title="' + esc(tr('Confirmar: é ', 'Confirm: it is ') + x.r.nome) + '">✓' + (c.length > 1 ? ' ' + esc(x.r.nome) : '') + '</button>'; };
        return '<div class="t-sub"><span class="or-selo or-amarelo">' + esc(tr('A confirmar', 'To confirm')) + '</span> ' +
          (c.length > 1 ? esc(tr('Qual conta é? ', 'Which bill is it? ')) : esc(tr('conta fixa ', 'fixed bill ')) + '<b>' + esc(c[0].r.nome) + '</b> ') + c.map(bt).join(' ') + '</div>';
      }
    },
    acoes: {
      'ap-conta': function (el) {
        var c = API.ligarConta(el.dataset.id, el.dataset.rid); if (!c) return;
        Store.salvar(); render(); toast(tr('Ligado à conta fixa: ', 'Linked to the fixed bill: ') + c.r.nome);
      }
    }
  });
  window.Apelido = API;
})();
