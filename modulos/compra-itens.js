/* =====================================================================
   modulos/compra-itens.js — compra com itens de categorias diferentes vira lançamento DIVIDIDO   1.0.0 · 27/Nov/2026 (3.135)
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono: a compra da Amazon com material escolar e papel higiênico não vai inteira para Material escolar)
     O robô manda no comprovante da compra (subtipo "compra") os itens [{produto, quantidade, valor, categoria_sugerida?}] e
     dividir_por_categoria. Quando o comprovante casa com a cobrança (a conciliação dos comprovantes), o 📥 mostra
       "Compra Amazon R$ 200,50 (pedido …) — dividir assim?  · Material Escolar R$ 160,00 (1 item: Livro…) · Mercado R$ 40,50 (…)"
       [Dividir] [Tudo numa categoria] [Ajustar]
     · Dividir usa o "Dividir lançamento" de sempre (modulos/dividir.js); a diferença entre os itens e o total (frete, desconto,
       cupom) é rateada na proporção e aparece ("frete/desconto rateado: R$ X").
     · Item sem categoria: um seletor na própria linha ("Qual a categoria de: <item>?").
     · A resposta vira regra POR ITEM (produto parecido → categoria; ST.config.itemRegras), nunca por loja.
     · Itens todos da mesma categoria: sem divisão; vira o "É isso?" de sempre (comprovantes catDoRobo).
     · Na ficha do lançamento: "ver itens" (produto, quantidade, valor).
     · O e-mail de "Enviado/Entregue" (aviso_envio) não é outra compra: não concilia e não pede nada (comprovantes 1.4.0).
   API (window.CompraItens)
     chave(produto) · categoriaDe(item) · proposta(x, g) → {partes, rateio, faltam} | null · grupoUnico(itens) · aprender(itens)
   PONTOS QUE USA
     lancamento.form ("ver itens") · ações ci-* (o 📥 é desenhado pelo comprovantes.js, que chama CompraItens.html)
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function cfg() { return (ST.config = ST.config || {}); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function e$(t) { return typeof esc === 'function' ? esc(t) : String(t == null ? '' : t); }
  function nomeCat(c) { return c ? ((GRUPOS[c.grupo] || {}).nome || c.grupo) + (c.sub ? ' › ' + c.sub : '') : ''; }
  var PARADAS = { de: 1, da: 1, do: 1, das: 1, dos: 1, com: 1, para: 1, e: 1, em: 1, a: 1, o: 1, un: 1, und: 1, kit: 1, pacote: 1, cx: 1, caixa: 1, pct: 1 };

  var API = {
    /* "Papel Higiênico Folha Dupla 12 rolos" → "papel higienico folha": as 3 primeiras palavras que dizem o que é */
    chave: function (produto) { return N(produto).split(' ').filter(function (w) { return w.length > 1 && !PARADAS[w] && !/^\d/.test(w); }).slice(0, 3).join(' '); },
    /* a categoria de um item: a escolha da pessoa → a regra aprendida (produto parecido) → o palpite do robô */
    categoriaDe: function (it) {
      if (it.escolha) return it.escolha;
      var k = API.chave(it.produto), r = (cfg().itemRegras || {})[k];
      if (r) return { grupo: r.grupo, sub: r.sub, regra: true };
      return it.cat || null;
    },
    grupoUnico: function (itens) {
      var cs = (itens || []).map(API.categoriaDe);
      if (!cs.length || cs.some(function (c) { return !c; })) return null;
      var k = cs[0].grupo + '|' + cs[0].sub;
      return cs.every(function (c) { return c.grupo + '|' + c.sub === k; }) ? cs[0] : null;
    },
    /* as partes por categoria; a diferença para o total (frete, desconto, cupom) rateada na proporção; centavos fechados no maior */
    proposta: function (x, g) {
      var itens = x.itens || []; if (itens.length < 2 || !g || g.divisao) return null;
      var total = n2(g.valor), cats = {}, ordem = [], faltam = [];
      itens.forEach(function (it, i) {
        var c = API.categoriaDe(it); if (!c) { faltam.push(i); return; }
        var k = c.grupo + '|' + c.sub;
        if (!cats[k]) { cats[k] = { grupo: c.grupo, sub: c.sub, soma: 0, itens: [] }; ordem.push(k); }
        cats[k].soma = n2(cats[k].soma + n2(it.valor)); cats[k].itens.push(it);   /* o valor do item é o da linha (quantidade já dentro) */
      });
      if (!faltam.length && ordem.length < 2) return null;
      var soma = n2(ordem.reduce(function (s, k) { return s + cats[k].soma; }, 0)), rateio = faltam.length ? 0 : n2(total - soma);
      var partes = ordem.map(function (k) { var c = cats[k]; return { grupo: c.grupo, sub: c.sub, itens: c.itens, valor: soma ? n2(total * c.soma / soma) : 0 }; });
      if (partes.length && !faltam.length) {
        var dif = n2(total - partes.reduce(function (s, p) { return s + p.valor; }, 0));
        var maior = partes.reduce(function (a, b) { return b.valor > a.valor ? b : a; }); maior.valor = n2(maior.valor + dif);
      }
      return { partes: partes, rateio: rateio, faltam: faltam, total: total };
    },
    /* a regra POR ITEM: cada produto (a chave) → a categoria em que ficou */
    aprender: function (itens) {
      var r = cfg().itemRegras = cfg().itemRegras || {};
      (itens || []).forEach(function (it) { var c = API.categoriaDe(it), k = API.chave(it.produto); if (c && k) r[k] = { grupo: c.grupo, sub: c.sub }; });
    },
    opcoes: function (sel) {
      var arv = typeof Gasto !== 'undefined' && Gasto.arvore ? Gasto.arvore() : {}, h = '<option value="">' + e$(tr('escolha…', 'choose…', 'elige…')) + '</option>';
      Object.keys(arv).filter(function (k) { return (GRUPOS[k] || {}).fluxo !== 'entrada'; }).forEach(function (k) {
        h += '<optgroup label="' + e$((GRUPOS[k] || {}).nome || k) + '">' + (arv[k] || []).map(function (s) { var v = k + '|' + s; return '<option value="' + e$(v) + '"' + (v === sel ? ' selected' : '') + '>' + e$(s) + '</option>'; }).join('') + '</optgroup>';
      });
      return h;
    },
    /* o bloco do 📥 (o comprovantes.js chama quando a compra casou e os itens pedem divisão) */
    html: function (x, g) {
      var pr = API.proposta(x, g); if (!pr) return '';
      var b = function (acao, rot, extra) { return '<button type="button" class="btn sm" data-acao="' + acao + '" data-id="' + e$(x.id) + '"' + (extra || '') + '>' + e$(rot) + '</button>'; };
      var h = '<div class="ci-prop"><p class="small"><b>' + e$(tr('Compra ', 'Purchase ', 'Compra ') + (x.loja || '') + ' ' + fmt(pr.total) + (x.pedido ? tr(' (pedido ', ' (order ', ' (pedido ') + x.pedido + ')' : '') + tr(' — dividir assim?', ' — split like this?', ' — ¿dividir así?')) + '</b></p><ul class="small ci-partes">' +
        pr.partes.map(function (p) {
          var n = p.itens.length, nomes = p.itens.map(function (it) { return it.produto; }).join(', ');
          return '<li>' + e$(nomeCat(p) + ' ' + fmt(p.valor) + ' (' + (n === 1 ? tr('1 item: ', '1 item: ', '1 artículo: ') : n + tr(' itens: ', ' items: ', ' artículos: ')) + nomes.slice(0, 80) + ')') + '</li>';
        }).join('') + '</ul>';
      pr.faltam.forEach(function (i) {
        var it = x.itens[i];
        h += '<label class="ci-falta small">' + e$(tr('Qual a categoria de: ', 'Which category for: ', '¿Qué categoría para: ') + it.produto + '?') + ' <select class="ci-sel" data-id="' + e$(x.id) + '" data-i="' + i + '">' + API.opcoes('') + '</select></label>';
      });
      if (pr.rateio) h += '<p class="tiny muted ci-rateio">' + e$(tr('frete/desconto rateado: ', 'shipping/discount spread: ', 'envío/descuento repartido: ') + fmt(pr.rateio)) + '</p>';
      h += '<div class="row" style="gap:6px;flex-wrap:wrap">' + (pr.faltam.length ? '' : b('ci-dividir', '✂️ ' + tr('Dividir', 'Split', 'Dividir'))) +
        b('ci-uma', tr('Tudo numa categoria', 'All in one category', 'Todo en una categoría')) + b('ci-ajustar', tr('Ajustar', 'Adjust', 'Ajustar')) + '</div></div>';
      return h;
    }
  };

  function comp(id) { return window.Comprovantes ? Comprovantes.lista().find(function (x) { return x.id === id; }) : null; }
  function gastoDe(x) { return x && x.gastoId ? Gasto.todos().find(function (g) { return g.id === x.gastoId; }) : null; }
  function depois() { Store.salvar(); if (typeof render === 'function') render(); if (typeof renderInboxN === 'function') renderInboxN(); }
  document.addEventListener('change', function (ev) {
    var t = ev.target; if (!t || !t.matches || !t.matches('.ci-sel') || !t.value) return;
    var x = comp(t.dataset.id), it = x && x.itens && x.itens[Number(t.dataset.i)]; if (!it) return;
    var pp = t.value.split('|'); it.escolha = { grupo: pp[0], sub: pp.slice(1).join('|') };
    depois();
  });

  MoneyModulos.registrar({
    id: 'compra-itens',
    versao: '1.0.0',
    pontos: {
      /* "ver itens" na ficha do lançamento */
      'lancamento.form': function (ctx) {
        var g = ctx && ctx.g, its = g && g.ficha && g.ficha.itens; if (!its || !its.length) return '';
        return '<details class="ci-itens"><summary class="small">🧾 ' + e$(tr('ver itens', 'see items', 'ver artículos') + ' (' + its.length + ')') + '</summary><ul class="small">' +
          its.map(function (it) { return '<li>' + e$(it.produto + (it.quantidade > 1 ? ' · ' + it.quantidade + '×' : '') + ' · ' + fmt(it.valor)) + '</li>'; }).join('') + '</ul></details>';
      }
    },
    acoes: {
      'ci-dividir': function (el) {
        var x = comp(el.dataset.id), g = gastoDe(x), pr = x && g && API.proposta(x, g); if (!pr || pr.faltam.length) return;
        var r = window.Divisao && Divisao.aplicar(g.id, pr.partes.map(function (p) { return { valor: p.valor, grupo: p.grupo, sub: p.sub, nota: p.itens.map(function (it) { return it.produto; }).join(', ').slice(0, 80) }; }));
        if (!r) return toast(tr('Não deu para dividir: confira os valores.', 'Could not split: check the amounts.', 'No se pudo dividir: revisa los importes.'), 'warn');
        API.aprender(x.itens); x.estado = 'ok'; x.sugestao = null; depois();
        toast(tr('Dividido em ', 'Split into ', 'Dividido en ') + pr.partes.length + tr(' partes.', ' parts.', ' partes.'));
      },
      'ci-uma': function (el) {
        var x = comp(el.dataset.id), g = gastoDe(x), pr = x && g && API.proposta(x, g); if (!pr || !pr.partes.length) return;
        var m = pr.partes.reduce(function (a, b) { return b.valor > a.valor ? b : a; });
        Gasto.atualizar(g.id, { grupo: m.grupo, sub: m.sub, revisar: false, confirmadoEm: new Date().toISOString() });
        x.estado = 'ok'; x.sugestao = null; depois();
      },
      'ci-ajustar': function (el) { var x = comp(el.dataset.id), g = gastoDe(x); if (g && typeof abrirLancamento === 'function') abrirLancamento(g.id); }
    }
  });
  window.CompraItens = API;
})();
