/* =====================================================================
   modulos/orcamento.js — orçamento por categoria com alerta e a projeção do mês (3.67)        1.1.0 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedidos do dono, 13/Nov/2026; o layout do Painel NÃO muda agora: são dois cartões no ponto budget.painel)
     · Orçamento do mês: um limite mensal por categoria (grupo › categoria). Barra de progresso do mês atual; a partir de
       80% fica "perto do limite" (âmbar) e acima de 100% "estourou" (vermelho). Ao entrar um lançamento novo (à mão ou
       do robô) que passa dos 80% ou dos 100%, aparece o aviso na hora.
     · Projeção do mês: no ritmo de sempre, quanto sobra ou falta no fim do mês.
       Entra = o maior entre a renda já lançada no mês e a média mensal (sem a renda extraordinária).
       Sai = o que já saiu no mês + a média diária de gasto (12 meses) × os dias que faltam.
       Não aparece na visão da casa (lá não há a renda da família inteira, e a renda dele nunca entra).
     · Visão da casa: o orçamento é da família (coleção da casa). O total de cada categoria com limite vem do resumo
       (Escopo: resumo.orc), sem nenhum lançamento reservado; o aviso diz só a categoria e os totais.
     · 1.1.0 (3.69): o previsto × realizado (modulos/previsao.js). A barra de cada categoria virou empilhada: cheio = já
       gasto; só contorno = o que falta do previsto; risquinho = o ritmo de hoje; o que passa do previsto em vermelho forte;
       a linha tracejada é a meta (o limite digitado). Conta certa ainda não paga: "vem dia 10". Além das categorias com
       limite, as maiores pelo previsto (até 6). A "Projeção do mês" usa o previsto: "Previsto para novembro: R$ X · já foi
       R$ Y · ainda vem R$ Z (R$ W em contas certas) · deve sobrar R$ S", e os 3 meses seguintes. Na visão da casa ela
       aparece sem renda e sem sobra (o desenho final vem do Claude Design).
   API (window.OrcamentoMes)
     lista() · gastoNoMes(grupo, sub, mes?) · situacao(o) → {gasto, pct, estado: 'ok'|'perto'|'estourou'}
     salvar(grupo, sub, limite) · tirar(id) · projecao() → {entra, sai, sobra, ...}
   DADOS
     Store.estado.orcamentos = [{id: 'GRUPO|sub', grupo, sub, limite}]   (a nuvem guarda cada um no money_docs)
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'orcamentos', PERTO = 0.8;
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function mesDe(d) { return String(d || '').slice(0, 7); }
  function nomeG(g) { return (typeof GRUPOS !== 'undefined' && GRUPOS[g] && GRUPOS[g].nome) || g; }

  var API = {
    lista: lista,
    gastoNoMes: function (grupo, sub, mes) {
      mes = mes || mesDe(hojeISO());
      var casa = window.Escopo && Escopo.soCasa && Escopo.soCasa();
      /* na visão da casa o limite é da família: o total vem do resumo (só o número da categoria, sem lançamento nenhum),
         mais o que esta pessoa lançou depois da última conta do resumo (o aparelho de quem vê tudo ainda não somou) */
      var r = casa ? (ST.resumo || []).filter(function (x) { return x.id === mes; })[0] : null, desde = r ? r.atualizadoEm || '' : '';
      var meu = Gasto.todos().reduce(function (t, g) {
        if (!(g.fluxo === 'saida' && g.grupo === grupo && g.sub === sub && mesDe(g.data) === mes)) return t;
        if (r && r.orc && (g.criadoEm || '') <= desde) return t;   /* já está no total da família */
        return t + (Number(g.valor) || 0);
      }, 0);
      return (r && r.orc ? Number(r.orc[grupo + '|' + sub]) || 0 : 0) + meu;
    },
    situacao: function (o) {
      var gasto = API.gastoNoMes(o.grupo, o.sub), pct = o.limite > 0 ? gasto / o.limite : 0;
      return { gasto: gasto, pct: pct, estado: pct > 1 ? 'estourou' : pct >= PERTO ? 'perto' : 'ok' };
    },
    salvar: function (grupo, sub, limite) {
      limite = Math.round((Number(limite) || 0) * 100) / 100;
      if (!grupo || !sub || !(limite > 0)) return null;
      var id = grupo + '|' + sub, l = lista(), o = l.filter(function (x) { return x.id === id; })[0];
      if (o) o.limite = limite; else { o = { id: id, grupo: grupo, sub: sub, limite: limite }; l.push(o); }
      return o;
    },
    tirar: function (id) { ST[COL] = lista().filter(function (x) { return x.id !== id; }); },
    projecao: function () {
      /* 3.69: o previsto de cada categoria (contas certas + variáveis + eventos) no lugar de "média diária × dias que faltam" */
      var t = Previsao.totalMes();
      return { entra: t.rendaPrevista, sai: t.previsto, sobra: t.sobra, saiAteHoje: t.gasto, aVir: t.aVir, aVirCertas: t.aVirCertas, mes: t.mes };
    }
  };

  function opcoes() {
    var arv = Gasto.arvore(), out = [];
    Object.keys(arv).filter(function (g) { return g !== 'RENDA' && g !== 'INVESTIMENTO'; }).sort(function (a, b) { return nomeG(a).localeCompare(nomeG(b), 'pt'); }).forEach(function (g) {
      Array.from(arv[g]).filter(Boolean).sort(function (a, b) { return a.localeCompare(b, 'pt', { sensitivity: 'base' }); }).forEach(function (s) { out.push([g + '|' + s, nomeG(g) + ' › ' + s]); });
    });
    return out;
  }
  /* 3.69: a barra empilhada (o mínimo para ver os números; o desenho final vem do Claude Design) */
  function barra(p, limite) {
    var esc_ = Math.max(p.previsto, p.gasto, limite || 0) * 1.05 || 1, pc = function (v) { return Math.max(0, Math.min(100, v / esc_ * 100)).toFixed(1) + '%'; };
    var dentro = Math.min(p.gasto, p.previsto), passou = Math.max(0, p.gasto - p.previsto), falta = Math.max(0, p.previsto - p.gasto);
    return '<div class="orc-barra pv-barra" role="img" aria-label="' + esc(tr('Gasto ', 'Spent ') + fmt(p.gasto) + tr(' de ', ' of ') + fmt(p.previsto) + tr(' previsto', ' forecast')) + '">' +
      '<i class="pv-gasto" style="width:' + pc(dentro) + '"></i>' + (passou ? '<i class="pv-passou" style="width:' + pc(passou) + '"></i>' : '') +
      (falta ? '<i class="pv-falta" style="width:' + pc(falta) + '"></i>' : '') +
      (p.ritmoHoje > 0 ? '<b class="pv-ritmo" style="left:' + pc(p.ritmoHoje) + '" title="' + esc(tr('ritmo de hoje: ', 'pace today: ') + fmt(p.ritmoHoje)) + '"></b>' : '') +
      (limite ? '<b class="pv-meta" style="left:' + pc(limite) + '" title="' + esc(tr('meta: ', 'goal: ') + fmt(limite)) + '"></b>' : '') + '</div>';
  }
  function linhaPrevisto(p, o, sit) {
    if (sit) p = Object.assign({}, p, { gasto: sit.gasto });   /* com limite, o gasto é o mesmo do aviso (na visão da casa, o total da família) */
    var vem = p.comprometidoAVir.map(function (c) { return c.nome + tr(' vem dia ', ' due on the ') + c.dia + tr('', 'th') + ' (' + fmt(c.valor) + ')'; }).join(' · ');
    return '<div class="orc-linha orc-' + (sit ? sit.estado : 'ok') + ' pv-' + p.estado + '"><div class="orc-nome"><b>' + esc(p.sub) + '</b> <span class="t-sub">' + esc(nomeG(p.grupo)) + '</span></div>' +
      '<div class="orc-valor">' + esc(fmt(p.gasto)) + ' <span class="tiny muted">' + esc(tr('de ', 'of ') + fmt(p.previsto) + tr(' previsto', ' forecast') +
        (o ? tr(' · meta ', ' · goal ') + fmt(o.limite) : '') + (p.gasto > p.previsto ? tr(' · passou ', ' · over by ') + fmt(p.gasto - p.previsto) : '')) + '</span>' +
      (o ? ' <button type="button" class="linkinho" data-acao="orc-tirar" data-id="' + esc(o.id) + '" aria-label="' + esc(tr('Tirar o limite de ', 'Remove the limit of ') + o.sub) + '">✕</button>' : '') + '</div>' +
      barra(p, o && o.limite) + (vem ? '<div class="tiny muted pv-vem">' + esc(vem) + '</div>' : '') + '</div>';
  }
  function cartaoOrcamento() {
    var l = lista().map(function (o) { return { o: o, s: API.situacao(o) }; }).sort(function (a, b) { return b.s.pct - a.s.pct; });
    var alertas = l.filter(function (x) { return x.s.estado !== 'ok'; });
    var nomeMes = new Date(hojeISO() + 'T12:00:00').toLocaleDateString(pt() ? 'pt-BR' : 'en-US', { month: 'long', year: 'numeric' });
    var h = '<div class="card orc"><div class="card-head"><h3>' + esc(tr('Orçamento do mês', 'Monthly budget')) + '</h3><span class="small muted pn-periodo">' + esc(nomeMes) + '</span></div>';
    if (alertas.length) h += '<p class="orc-alerta small" role="status">⚠️ ' + esc(alertas.map(function (x) { return x.o.sub + ' ' + Math.round(x.s.pct * 100) + '%'; }).join(' · ')) + '</p>';
    /* 3.69: as categorias com limite e as maiores pelo previsto, cada uma com a barra empilhada */
    var cats = Previsao.categorias(), porK = {}; cats.forEach(function (p) { porK[p.grupo + '|' + p.sub] = p; });
    h += l.map(function (x) { return linhaPrevisto(porK[x.o.id] || Previsao.previstoMes(x.o.grupo, x.o.sub), x.o, x.s); }).join('');
    h += cats.filter(function (p) { return !l.some(function (x) { return x.o.id === p.grupo + '|' + p.sub; }); }).slice(0, 6).map(function (p) { return linhaPrevisto(p, null, null); }).join('');
    if (!l.length) h += '<p class="small muted">' + esc(tr('Defina um limite por mês para as categorias que você quer vigiar. O app avisa quando passar de 80% e quando estourar.', 'Set a monthly limit for the categories you want to watch. The app warns at 80% and when it goes over.')) + '</p>';
    h += '<form class="orc-novo" data-orc-form><select id="orcCat" aria-label="' + esc(tr('Categoria', 'Category')) + '"><option value="">' + esc(tr('Categoria…', 'Category…')) + '</option>' +
      opcoes().map(function (x) { return '<option value="' + esc(x[0]) + '">' + esc(x[1]) + '</option>'; }).join('') + '</select>' +
      '<input id="orcLim" type="number" inputmode="decimal" min="1" step="0.01" placeholder="' + esc(tr('Limite por mês', 'Monthly limit')) + '" aria-label="' + esc(tr('Limite por mês', 'Monthly limit')) + '">' +
      '<button type="button" class="btn sm primary" data-acao="orc-salvar">' + esc(tr('Definir limite', 'Set limit')) + '</button></form>';
    return h + '</div>';
  }
  function cartaoProjecao() {
    var t = Previsao.totalMes(); if (!t.previsto && !t.gasto) return '';
    var mes = Previsao.nomeMes(t.mes), sobra = t.sobra;
    var frase = tr('Previsto para ' + mes + ': ', 'Forecast for ' + mes + ': ') + fmt(t.previsto) + tr(' · já foi ', ' · spent so far ') + fmt(t.gasto) +
      tr(' · ainda vem ', ' · still to come ') + fmt(t.aVir) + ' (' + fmt(t.aVirCertas) + tr(' em contas certas)', ' in fixed bills)') +
      (sobra == null ? '' : (sobra >= 0 ? tr(' · deve sobrar ', ' · should be left over ') : tr(' · deve faltar ', ' · should fall short by ')) + fmt(Math.abs(sobra)));
    var prox = Previsao.proximos(3).map(function (x) {
      return Previsao.nomeMes(x.mes) + ' ' + fmt(x.previsto) + (x.sobra == null ? '' : ' (' + (x.sobra >= 0 ? tr('sobra ', 'left ') : tr('falta ', 'short ')) + fmt(Math.abs(x.sobra)) + ')');
    }).join(' · ');
    return '<div class="card orc-proj"><div class="card-head"><h3>' + esc(tr('Projeção do mês', 'Month projection')) + '</h3><span class="small muted pn-periodo">' + esc(tr('previsto × realizado', 'forecast × actual')) + '</span></div>' +
      (sobra == null ? '' : '<p class="orc-proj-n ' + (sobra >= 0 ? 'up' : 'down') + '"><b>' + esc((sobra >= 0 ? tr('Sobra prevista: ', 'Expected surplus: ') : tr('Falta prevista: ', 'Expected shortfall: ')) + fmt(Math.abs(sobra))) + '</b></p>') +
      '<p class="small pv-frase">' + esc(frase) + '</p>' +
      '<p class="tiny muted">' + esc(tr('Próximos meses: ', 'Next months: ') + prox) + '</p>' +
      '<p class="tiny muted">' + esc(tr('Previsto = contas certas pelo valor e dia + a média dos últimos 6 meses (com o peso da época do ano e a inflação do grupo) + as viagens registradas no Futuro.',
        'Forecast = fixed bills by amount and date + the average of the last 6 months (weighted by time of year and the group\'s inflation) + the trips registered in Forecast.')) + '</p></div>';
  }

  MoneyModulos.registrar({
    id: 'orcamento', versao: '1.1.0', colecoes: [COL],
    pontos: { 'budget.painel': function () { return cartaoOrcamento() + cartaoProjecao(); } },
    acoes: {
      'orc-salvar': function () {
        var c = (document.getElementById('orcCat') || {}).value || '', v = (document.getElementById('orcLim') || {}).value;
        var i = c.indexOf('|'), o = i > 0 ? API.salvar(c.slice(0, i), c.slice(i + 1), v) : null;
        if (!o) return toast(tr('Escolha a categoria e o limite por mês.', 'Choose the category and the monthly limit.'), 'warn');
        Store.salvar(); render(); toast(tr('Limite de ', 'Limit for ') + o.sub + ': ' + fmt(o.limite) + tr(' por mês.', ' per month.'));
      },
      'orc-tirar': function (el) { API.tirar(el.dataset.id); Store.salvar(); render(); }
    },
    ouvir: {
      /* o aviso na hora: o lançamento novo passou dos 80% ou dos 100% do limite */
      'gasto.novo': function (g) {
        if (!g || g.fluxo !== 'saida' || String(g.data || '').slice(0, 7) !== hojeISO().slice(0, 7)) return;
        var o = lista().filter(function (x) { return x.grupo === g.grupo && x.sub === g.sub; })[0]; if (!o) return;
        var depois = API.gastoNoMes(o.grupo, o.sub), antes = depois - (Number(g.valor) || 0);
        if (depois > o.limite && antes <= o.limite) toast('⚠️ ' + o.sub + tr(': estourou o limite do mês (', ': over the monthly limit (') + fmt(depois) + ' / ' + fmt(o.limite) + ')', 'warn');
        else if (depois >= o.limite * PERTO && antes < o.limite * PERTO) toast('⚠️ ' + o.sub + tr(': perto do limite do mês (', ': near the monthly limit (') + Math.round(depois / o.limite * 100) + '%)', 'warn');
      }
    }
  });
  window.OrcamentoMes = API;
})();
