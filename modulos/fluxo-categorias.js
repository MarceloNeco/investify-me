/* =====================================================================
   modulos/fluxo-categorias.js — Fluxo › "Por categoria" (previsto × realizado) e o ⓘ do previsto (3.118)        1.0.0 · 26/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 24/Nov/2026: a planilha antiga por categoria × mês era "horrível"; "IA e software previsto R$ 109 e gastei
   R$ 7.018: qual o critério?")
     · No fim do Fluxo, o cartão "Por categoria": cada GRUPO numa linha de destaque (ícone, negrito, letra maior, fundo leve), que
       recolhe; dentro, as categorias em ORDEM ALFABÉTICA. Dois modos:
         – "Este mês": barra de cada categoria com gasto ou previsto (todas, não só as 6 maiores do Painel);
         – "Últimos 6 meses": grade categoria × mês, cada célula com o valor e a cor (verde abaixo de 80% do previsto, âmbar de 80 a
           100%, vermelho acima); tocar abre os lançamentos daquele mês e daquela categoria. Total do grupo por mês e, no fim,
           "Passou do previsto no mês". No celular a grade rola para o lado com a 1ª coluna fixa.
       Filtro "Mostrar: todas · só as que passaram · escolher categorias…" (a escolha fica guardada por pessoa: ST.config.fluxoCat).
     · ⓘ em toda barra e célula (e no "Orçamento do mês" do Painel, modulos/orcamento.js): a composição do previsto, como o
       modulos/previsao.js calcula — "contas certas R$ X" (compromissos e parcelas), "média dos 6 meses fechados R$ Y × peso do mês ×
       IPCA", as viagens do mês e, quando há, a "meta que você definiu R$ Z". Rótulos: "previsto (pelo histórico)" × "limite (definido
       por você)". Quando o gasto do mês dá um salto muito acima do histórico: "Virou conta fixa? Cadastrar" e "Definir limite".
   API (window.FluxoCat)
     info(p, limite?) → o html do ⓘ (p = Previsao.previstoMes) · salto(p) → true quando o gasto saltou · cor(gasto, previsto) → 'ok'|'perto'|'passou'
     linhas(meses) → [{grupo, sub, por: {mes: p}}] (as categorias com previsto ou gasto em algum dos meses)
   PONTOS QUE USA
     fluxo.fim (index.html, viewBFluxo) · ações fc-*
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function hoje() { return API._hoje || hojeISO(); }
  function somaMes(mes, k) { var y = +mes.slice(0, 4), m = +mes.slice(5, 7) + k; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } return y + '-' + ('0' + m).slice(-2); }
  function nomeMesCurto(mes) { return new Date(mes + '-15T12:00:00').toLocaleDateString(I18n.locale ? I18n.locale() : 'pt-BR', { month: 'short' }).replace('.', ''); }
  function nomeG(k) { return ((typeof GRUPOS !== 'undefined' && GRUPOS[k]) || {}).nome || k; }
  function icoG(k) { return ((typeof GRUPOS !== 'undefined' && GRUPOS[k]) || {}).ico || ''; }
  function cfg() { return (ST.config = ST.config || {}); }
  function quem() { try { return (window.MoneyNuvem && MoneyNuvem.escopos && MoneyNuvem.escopos.eu && MoneyNuvem.escopos.eu()) || 'aqui'; } catch (e) { return 'aqui'; } }
  function pref() { var t = (cfg().fluxoCat = cfg().fluxoCat || {}); return (t[quem()] = t[quem()] || { modo: 'mes', mostrar: 'todas', escolhidas: [] }); }
  var abertosG = {}, ordem = function () { return typeof ORDEM_GRUPOS !== 'undefined' ? ORDEM_GRUPOS : Object.keys(GRUPOS); };

  var API = {
    _hoje: null,
    cor: function (gasto, previsto) {
      if (!(gasto > 0)) return 'zero';
      if (!(previsto > 0)) return 'passou';
      var r = gasto / previsto; return r > 1.0005 ? 'passou' : r >= 0.8 ? 'perto' : 'ok';
    },
    /* o gasto do mês muito acima do histórico (ex.: virou assinatura nova): 3× o previsto e R$ 200 a mais, sem conta certa */
    salto: function (p) { return !!p && p.gasto > Math.max(p.previsto * 3, p.previsto + 200) && !(p.fixo > 0); },
    info: function (p, limite) {
      if (!p) return '';
      var l = [];
      l.push(tr('Previsto (pelo histórico): ', 'Forecast (from history): ', 'Previsto (por el historial): ') + fmt(p.previsto));
      if (p.fixo > 0) l.push('· ' + tr('contas certas ', 'fixed bills ', 'cuentas fijas ') + fmt(p.fixo) + tr(' (compromissos e parcelas)', ' (commitments and installments)', ' (compromisos y cuotas)'));
      if (p.variavel > 0 || p.base > 0) l.push('· ' + tr('média dos 6 meses fechados ', 'average of the last 6 closed months ', 'media de los 6 meses cerrados ') + fmt(p.base) +
        (p.peso && p.peso !== 1 ? ' × ' + tr('peso do mês ', 'month weight ', 'peso del mes ') + String(p.peso).replace('.', ',') : '') + ' × IPCA = ' + fmt(p.variavel));
      if (p.evento > 0) l.push('· ' + tr('viagens do mês ', 'trips this month ', 'viajes del mes ') + fmt(p.evento));
      if (!(p.previsto > 0)) l.push(tr('Sem histórico nem conta certa nesta categoria: o previsto é zero.', 'No history or fixed bill in this category: the forecast is zero.', 'Sin historial ni cuenta fija en esta categoría: el previsto es cero.'));
      if (limite > 0) l.push(tr('Limite (definido por você): ', 'Limit (set by you): ', 'Límite (definido por ti): ') + fmt(limite));
      l.push(tr('Gasto no mês: ', 'Spent this month: ', 'Gasto en el mes: ') + fmt(p.gasto));
      var acoes = '';
      if (API.salto(p)) acoes = '<div class="fc-salto small">' + esc(tr('O gasto saltou muito acima do histórico.', 'Spending jumped far above history.', 'El gasto saltó muy por encima del historial.')) + ' ' +
        '<button type="button" class="btn sm" data-acao="fc-fixa" data-g="' + esc(p.grupo) + '" data-s="' + esc(p.sub) + '" data-v="' + n2(p.gasto) + '">' + esc(tr('Virou conta fixa? Cadastrar', 'Became a fixed bill? Add it', '¿Se volvió cuenta fija? Registrar')) + '</button> ' +
        '<button type="button" class="btn sm" data-acao="fc-limite" data-g="' + esc(p.grupo) + '" data-s="' + esc(p.sub) + '">' + esc(tr('Definir limite', 'Set a limit', 'Definir límite')) + '</button></div>';
      return '<details class="pv-info"><summary aria-label="' + esc(tr('De onde vem o previsto', 'Where the forecast comes from', 'De dónde sale el previsto')) + '">ⓘ</summary>' +
        '<div class="pv-info-c small">' + l.map(function (x) { return '<div>' + esc(x) + '</div>'; }).join('') + acoes + '</div></details>';
    },
    linhas: function (meses) {
      var por = {};
      meses.forEach(function (m) {
        (Previsao.categorias(m) || []).forEach(function (p) {
          if (!(p.previsto > 0) && !(p.gasto > 0)) return;
          var k = p.grupo + '|' + p.sub; (por[k] = por[k] || { grupo: p.grupo, sub: p.sub, por: {} }).por[m] = p;
        });
      });
      return Object.keys(por).map(function (k) { return por[k]; });
    }
  };

  function filtrar(l, meses) {
    var pf = pref();
    if (pf.mostrar === 'passaram') return l.filter(function (x) { return meses.some(function (m) { var p = x.por[m]; return p && API.cor(p.gasto, p.previsto) === 'passou'; }); });
    if (pf.mostrar === 'escolher' && pf.escolhidas.length) return l.filter(function (x) { return pf.escolhidas.indexOf(x.grupo + '|' + x.sub) >= 0; });
    return l;
  }
  function porGrupo(l) {
    var g = {}; l.forEach(function (x) { (g[x.grupo] = g[x.grupo] || []).push(x); });
    return ordem().filter(function (k) { return g[k]; }).map(function (k) {
      return { grupo: k, itens: g[k].sort(function (a, b) { return a.sub.localeCompare(b.sub, 'pt', { sensitivity: 'base' }); }) };
    });
  }
  function limiteDe(g, s) { var o = window.OrcamentoMes ? (OrcamentoMes.lista() || []).find(function (x) { return x.id === g + '|' + s; }) : null; return o ? Number(o.limite) || 0 : 0; }
  var COR = { ok: 'var(--up)', perto: 'var(--warn)', passou: 'var(--down)', zero: 'var(--line)' };
  function barra(p) {
    var max = Math.max(p.previsto, p.gasto) || 1, w = Math.min(100, p.gasto / max * 100), wp = Math.min(100, p.previsto / max * 100), c = API.cor(p.gasto, p.previsto);
    return '<div class="fc-barra" role="img" aria-label="' + esc(fmt(p.gasto) + tr(' de ', ' of ', ' de ') + fmt(p.previsto)) + '"><span class="fc-gasto" style="width:' + w.toFixed(1) + '%;background:' + COR[c] + '"></span>' +
      (p.previsto > 0 ? '<span class="fc-prev" style="left:' + wp.toFixed(1) + '%"></span>' : '') + '</div>';
  }
  function cabecalho(pf) {
    var chip = function (k, v, t) { return '<button type="button" class="chip click' + (pf[k] === v ? ' on' : '') + '" data-acao="fc-pref" data-k="' + k + '" data-v="' + v + '">' + esc(t) + '</button>'; };
    return '<div class="row fc-modos" style="gap:6px;flex-wrap:wrap;margin:0 0 6px">' + chip('modo', 'mes', tr('Este mês', 'This month', 'Este mes')) + chip('modo', '6m', tr('Últimos 6 meses', 'Last 6 months', 'Últimos 6 meses')) + '</div>' +
      '<div class="row fc-filtro small" style="gap:6px;flex-wrap:wrap;align-items:center;margin:0 0 8px"><span class="muted">' + esc(tr('Mostrar:', 'Show:', 'Mostrar:')) + '</span>' +
      chip('mostrar', 'todas', tr('todas', 'all', 'todas')) + chip('mostrar', 'passaram', tr('só as que passaram', 'only those over', 'solo las que se pasaron')) + chip('mostrar', 'escolher', tr('escolher categorias…', 'pick categories…', 'elegir categorías…')) + '</div>';
  }
  function escolher(todas, pf) {
    if (pf.mostrar !== 'escolher') return '';
    return '<details class="fc-escolher" open><summary class="small">' + esc(tr('Categorias que aparecem', 'Categories shown', 'Categorías que aparecen')) + '</summary><div class="small" style="columns:2;margin:4px 0 8px">' +
      porGrupo(todas).map(function (G) { return G.itens.map(function (x) { var k = x.grupo + '|' + x.sub; return '<label style="display:block"><input type="checkbox" data-fc-cat="' + esc(k) + '"' + (pf.escolhidas.indexOf(k) >= 0 ? ' checked' : '') + '> ' + esc(nomeG(x.grupo) + ' › ' + x.sub) + '</label>'; }).join(''); }).join('') + '</div></details>';
  }
  function grupoHead(k, extra) {
    var ab = abertosG[k] !== false;
    return '<button type="button" class="fc-grupo" data-acao="fc-grupo" data-g="' + esc(k) + '" aria-expanded="' + ab + '"><span>' + (ab ? '▾' : '▸') + ' ' + icoG(k) + ' ' + esc(nomeG(k)) + '</span>' + (extra || '') + '</button>';
  }
  function modoMes(l, mes) {
    return porGrupo(l).map(function (G) {
      var tg = G.itens.reduce(function (s, x) { var p = x.por[mes]; return s + (p ? p.gasto : 0); }, 0), tp = G.itens.reduce(function (s, x) { var p = x.por[mes]; return s + (p ? p.previsto : 0); }, 0);
      var h = '<div class="fc-bloco">' + grupoHead(G.grupo, '<span class="fc-tot small">' + esc(fmt(tg) + tr(' de ', ' of ', ' de ') + fmt(tp)) + '</span>');
      if (abertosG[G.grupo] !== false) h += G.itens.map(function (x) {
        var p = x.por[mes] || Previsao.previstoMes(x.grupo, x.sub, mes), lim = limiteDe(x.grupo, x.sub);
        return '<div class="fc-cat fc-' + API.cor(p.gasto, p.previsto) + '"><div class="fc-cat-l"><span>' + esc(x.sub) + '</span><span class="small">' + esc(fmt(p.gasto) + tr(' de ', ' of ', ' de ') + fmt(p.previsto)) + ' ' + API.info(p, lim) + '</span></div>' + barra(p) + (window.Consumo ? Consumo.linha(x.grupo, x.sub, mes) : '') + '</div>';   /* 3.120: ⚡ kWh / 🔥 m³ */
      }).join('');
      return h + '</div>';
    }).join('');
  }
  function modo6(l, meses) {
    var cel = function (x, m) {
      var p = x.por[m]; if (!p || (!(p.gasto > 0) && !(p.previsto > 0))) return '<td class="num fc-c fc-zero">—</td>';
      var c = API.cor(p.gasto, p.previsto);
      return '<td class="num fc-c fc-' + c + '"><button type="button" class="fc-cel" data-acao="fc-ver" data-g="' + esc(x.grupo) + '" data-s="' + esc(x.sub) + '" data-m="' + m + '" title="' + esc(fmt(p.gasto) + tr(' de ', ' of ', ' de ') + fmt(p.previsto) + tr(' previsto', ' forecast', ' previsto')) + '">' + esc(fmt(p.gasto)) + '</button>' + API.info(p, limiteDe(x.grupo, x.sub)) + '</td>';
    };
    var h = '<div class="fc-grade"><table class="tbl fc-tbl"><thead><tr><th class="fc-col1">' + esc(tr('Categoria', 'Category', 'Categoría')) + '</th>' + meses.map(function (m) { return '<th class="num">' + esc(nomeMesCurto(m)) + '</th>'; }).join('') + '</tr></thead><tbody>';
    porGrupo(l).forEach(function (G) {
      h += '<tr class="fc-g"><th class="fc-col1" scope="row">' + grupoHead(G.grupo) + '</th>' + meses.map(function (m) {
        var tg = G.itens.reduce(function (s, x) { return s + (x.por[m] ? x.por[m].gasto : 0); }, 0), tp = G.itens.reduce(function (s, x) { return s + (x.por[m] ? x.por[m].previsto : 0); }, 0);
        return (tg > 0 || tp > 0) ? '<td class="num fc-c fc-' + API.cor(tg, tp) + '"><b>' + esc(fmt(tg)) + '</b></td>' : '<td class="num fc-c fc-zero">—</td>';
      }).join('') + '</tr>';
      if (abertosG[G.grupo] !== false) G.itens.forEach(function (x) { h += '<tr><th class="fc-col1 fc-sub" scope="row">' + esc(x.sub) + '</th>' + meses.map(function (m) { return cel(x, m); }).join('') + '</tr>'; });
    });
    h += '<tr class="fc-passou"><th class="fc-col1" scope="row">' + esc(tr('Passou do previsto no mês', 'Over the forecast in the month', 'Se pasó del previsto en el mes')) + '</th>' + meses.map(function (m) {
      var s = l.reduce(function (t, x) { var p = x.por[m]; return t + (p ? Math.max(0, p.gasto - p.previsto) : 0); }, 0);
      return '<td class="num ' + (s > 0.005 ? 'down' : 'muted') + '">' + esc(s > 0.005 ? fmt(s) : '—') + '</td>';
    }).join('') + '</tr>';
    return h + '</tbody></table></div>';
  }
  function cartao() {
    if (typeof Previsao === 'undefined' || !Previsao.categorias) return '';
    var pf = pref(), mes = hoje().slice(0, 7), meses = pf.modo === '6m' ? [5, 4, 3, 2, 1, 0].map(function (k) { return somaMes(mes, -k); }) : [mes];
    var todas = API.linhas(meses); if (!todas.length) return '';
    var l = filtrar(todas, meses);
    return '<div class="card fc-card" id="fluxoCat"><div class="card-head"><h3>' + esc(tr('Por categoria', 'By category', 'Por categoría')) + '</h3><span class="small muted">' + esc(tr('previsto × realizado', 'forecast × actual', 'previsto × realizado')) + '</span></div>' +
      cabecalho(pf) + escolher(todas, pf) +
      (l.length ? (pf.modo === '6m' ? modo6(l, meses) : modoMes(l, mes)) : '<p class="small muted">' + esc(tr('Nenhuma categoria com esse filtro.', 'No category with this filter.', 'Ninguna categoría con este filtro.')) + '</p>') +
      '<p class="tiny muted" style="margin:6px 0 0">' + esc(tr('Verde: abaixo de 80% do previsto · âmbar: de 80 a 100% · vermelho: passou. Toque no ⓘ para ver de onde vem o previsto.', 'Green: under 80% of the forecast · amber: 80 to 100% · red: over. Tap ⓘ to see where the forecast comes from.', 'Verde: por debajo del 80 % del previsto · ámbar: del 80 al 100 % · rojo: se pasó. Toca ⓘ para ver de dónde sale el previsto.')) + '</p></div>';
  }
  function redesenhar() { var c = document.getElementById('fluxoCat'); if (!c) return render(); var d = document.createElement('div'); d.innerHTML = Verter.html(cartao()); if (d.firstElementChild) c.replaceWith(d.firstElementChild); }

  document.addEventListener('change', function (ev) {
    var t = ev.target; if (!t || !t.dataset || !t.dataset.fcCat) return;
    var pf = pref(), k = t.dataset.fcCat, i = pf.escolhidas.indexOf(k);
    if (t.checked && i < 0) pf.escolhidas.push(k); if (!t.checked && i >= 0) pf.escolhidas.splice(i, 1);
    Store.salvar(); redesenhar();
  });

  MoneyModulos.registrar({
    id: 'fluxo-categorias', versao: '1.0.0', colecoes: [], telas: {}, ouvir: {},
    pontos: { 'fluxo.fim': function () { return cartao(); } },
    acoes: {
      'fc-pref': function (el) { var pf = pref(); pf[el.dataset.k] = el.dataset.v; Store.salvar(); redesenhar(); },
      'fc-grupo': function (el) { var k = el.dataset.g; abertosG[k] = abertosG[k] === false; redesenhar(); },
      /* tocar na célula: os lançamentos daquele mês e daquela categoria */
      'fc-ver': function (el) {
        var m = el.dataset.m, fim = new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate();
        bFiltro = { busca: '', grupos: [el.dataset.g], subs: [el.dataset.s], quem: [], formas: [], de: m + '-01', ate: m + '-' + ('0' + fim).slice(-2), fluxo: '', periodo: 'tudo', favoritos: false, revisar: false, irpf: false, aconfirmar: false, aidentificar: false };
        irPara('b-lanc');
      },
      'fc-fixa': function (el) { if (typeof abrirRecorrente === 'function') abrirRecorrente(null, { grupo: el.dataset.g, sub: el.dataset.s, valor: Number(el.dataset.v) || 0 }); else irPara('b-custos'); },
      'fc-limite': function (el) { irPara('b-painel'); setTimeout(function () { var s = document.getElementById('orcCat'), v = el.dataset.g + '|' + el.dataset.s; if (s) { s.value = v; var lim = document.getElementById('orcLim'); if (lim) lim.focus(); } }, 80); }
    }
  });
  window.FluxoCat = API;
})();
