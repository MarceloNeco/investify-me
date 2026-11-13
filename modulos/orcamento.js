/* =====================================================================
   modulos/orcamento.js — orçamento por categoria com alerta e a projeção do mês (3.67)        1.0.0 · 13/Nov/2026
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
      var hoje = hojeISO(), mes = mesDe(hoje), d = Number(hoje.slice(8, 10)), y = Number(hoje.slice(0, 4)), m = Number(hoje.slice(5, 7));
      var dias = new Date(y, m, 0).getDate(), resto = dias - d;
      var extra = typeof rendaExtra === 'function' ? rendaExtra : function () { return false; };
      var doze = Gasto.filtrar({ de: Gasto.recuar(hoje, 365), ate: hoje }), ent12 = 0, sai12 = 0, entMes = 0, saiMes = 0;
      doze.forEach(function (g) {
        var v = Number(g.valor) || 0, noMes = mesDe(g.data) === mes;
        if (g.fluxo === 'saida') { sai12 += v; if (noMes) saiMes += v; }
        else if (g.fluxo === 'entrada' && !extra(g)) { ent12 += v; if (noMes) entMes += v; }
      });
      var entra = Math.max(entMes, ent12 / 12), sai = saiMes + (sai12 / 365) * resto;
      return { entra: entra, sai: sai, sobra: entra - sai, saiAteHoje: saiMes, entrouNoMes: entMes, diasFaltam: resto, mediaEntrada: ent12 / 12 };
    }
  };

  function opcoes() {
    var arv = Gasto.arvore(), out = [];
    Object.keys(arv).filter(function (g) { return g !== 'RENDA' && g !== 'INVESTIMENTO'; }).sort(function (a, b) { return nomeG(a).localeCompare(nomeG(b), 'pt'); }).forEach(function (g) {
      Array.from(arv[g]).filter(Boolean).sort(function (a, b) { return a.localeCompare(b, 'pt', { sensitivity: 'base' }); }).forEach(function (s) { out.push([g + '|' + s, nomeG(g) + ' › ' + s]); });
    });
    return out;
  }
  function barra(sit) {
    var w = Math.min(100, Math.round(sit.pct * 100)), cor = sit.estado === 'estourou' ? 'var(--down)' : sit.estado === 'perto' ? 'var(--warn, #d99a00)' : 'var(--up)';
    return '<div class="orc-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(sit.pct * 100) + '"><i style="width:' + w + '%;background:' + cor + '"></i></div>';
  }
  function cartaoOrcamento() {
    var l = lista().map(function (o) { return { o: o, s: API.situacao(o) }; }).sort(function (a, b) { return b.s.pct - a.s.pct; });
    var alertas = l.filter(function (x) { return x.s.estado !== 'ok'; });
    var nomeMes = new Date(hojeISO() + 'T12:00:00').toLocaleDateString(pt() ? 'pt-BR' : 'en-US', { month: 'long', year: 'numeric' });
    var h = '<div class="card orc"><div class="card-head"><h3>' + esc(tr('Orçamento do mês', 'Monthly budget')) + '</h3><span class="small muted pn-periodo">' + esc(nomeMes) + '</span></div>';
    if (alertas.length) h += '<p class="orc-alerta small" role="status">⚠️ ' + esc(alertas.map(function (x) { return x.o.sub + ' ' + Math.round(x.s.pct * 100) + '%'; }).join(' · ')) + '</p>';
    h += l.map(function (x) {
      var o = x.o, s = x.s, falta = o.limite - s.gasto;
      return '<div class="orc-linha orc-' + s.estado + '"><div class="orc-nome"><b>' + esc(o.sub) + '</b> <span class="t-sub">' + esc(nomeG(o.grupo)) + '</span></div>' +
        '<div class="orc-valor">' + esc(fmt(s.gasto)) + ' / ' + esc(fmt(o.limite)) + ' <span class="tiny muted">' +
        esc(s.estado === 'estourou' ? tr('estourou ', 'over by ') + fmt(-falta) : s.estado === 'perto' ? tr('perto do limite: faltam ', 'near the limit: ') + fmt(falta) + tr('', ' left') : tr('faltam ', '') + fmt(falta) + tr('', ' left')) + '</span>' +
        ' <button type="button" class="linkinho" data-acao="orc-tirar" data-id="' + esc(o.id) + '" aria-label="' + esc(tr('Tirar o limite de ', 'Remove the limit of ') + o.sub) + '">✕</button></div>' + barra(s) + '</div>';
    }).join('');
    if (!l.length) h += '<p class="small muted">' + esc(tr('Defina um limite por mês para as categorias que você quer vigiar. O app avisa quando passar de 80% e quando estourar.', 'Set a monthly limit for the categories you want to watch. The app warns at 80% and when it goes over.')) + '</p>';
    h += '<form class="orc-novo" data-orc-form><select id="orcCat" aria-label="' + esc(tr('Categoria', 'Category')) + '"><option value="">' + esc(tr('Categoria…', 'Category…')) + '</option>' +
      opcoes().map(function (x) { return '<option value="' + esc(x[0]) + '">' + esc(x[1]) + '</option>'; }).join('') + '</select>' +
      '<input id="orcLim" type="number" inputmode="decimal" min="1" step="0.01" placeholder="' + esc(tr('Limite por mês', 'Monthly limit')) + '" aria-label="' + esc(tr('Limite por mês', 'Monthly limit')) + '">' +
      '<button type="button" class="btn sm primary" data-acao="orc-salvar">' + esc(tr('Definir limite', 'Set limit')) + '</button></form>';
    return h + '</div>';
  }
  function cartaoProjecao() {
    if (window.Escopo && Escopo.soCasa && Escopo.soCasa()) return '';
    var p = API.projecao(); if (!p.entra && !p.sai) return '';
    var sobra = p.sobra >= 0;
    return '<div class="card orc-proj"><div class="card-head"><h3>' + esc(tr('Projeção do mês', 'Month projection')) + '</h3><span class="small muted pn-periodo">' + esc(tr('até o fim do mês', 'to the end of the month')) + '</span></div>' +
      '<p class="orc-proj-n ' + (sobra ? 'up' : 'down') + '"><b>' + esc((sobra ? tr('Sobra prevista: ', 'Expected surplus: ') : tr('Falta prevista: ', 'Expected shortfall: ')) + fmt(Math.abs(p.sobra))) + '</b></p>' +
      '<p class="small muted">' + esc(tr('Entra ', 'In ') + fmt(p.entra) + tr(' (a renda do mês ou a média, sem a extraordinária) · sai ', ' (this month\'s income or the average, without the extraordinary) · out ') + fmt(p.sai) +
        tr(' (' + fmt(p.saiAteHoje) + ' até hoje + o ritmo de sempre nos ' + p.diasFaltam + ' dias que faltam).', ' (' + fmt(p.saiAteHoje) + ' so far + the usual pace for the ' + p.diasFaltam + ' days left).')) + '</p></div>';
  }

  MoneyModulos.registrar({
    id: 'orcamento', versao: '1.0.0', colecoes: [COL],
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
