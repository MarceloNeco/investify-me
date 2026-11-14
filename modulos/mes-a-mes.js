/* =====================================================================
   modulos/mes-a-mes.js — o "Mês a mês" do Painel do BudgetONE, refeito (3.73)        1.0.1 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 13/Nov/2026)
     · A barra de cada mês é o que SOBROU NA CONTA: tudo o que entrou − o que foi gasto − o que foi para investimento
       (líquido: aportes menos resgates). Uma cor só (verde para cima, vermelho para baixo); nada de parte amarela.
     · Marcas no nome do mês: ★ renda extraordinária no mês; 📈 investiu mais que a renda média do mês (1×);
       🔗 a renda extraordinária e o investimento grande no mesmo mês ou no vizinho (ex.: "rescisão investida no mês
       seguinte"). Tocar no mês abre UMA linha com o que entrou, gastou e investiu e o porquê das marcas.
     · Duas vistas, com a escolha guardada: "Sobrou na conta" (a de cima) e "Dia a dia" (a renda que se repete − o que foi
       gasto: sem renda extraordinária e sem investimento).
     · A escala vai até 2,5× o 3º quartil (p75) dos |valores| da vista: um mês fora da curva não achata os outros; a barra
       que passa é cortada com ⫽ e o número mostra o valor inteiro.
     · "Precisa da sua atenção" (e 📥): uma entrada maior que 2× a média da renda recorrente dos 6 meses anteriores, que
       ainda não foi marcada nem desmarcada, pergunta "É renda extraordinária?" (★ Sim / Não grava g.extra).
     · Visão da casa: nada muda (o Painel dela continua com o vizMesAMes de antes; a pergunta não aparece).
   API (window.MesAMes)
     itens(lista) → [{t, nome, entrada, extra, entRec, saida, aplic, conta, dia, estrela, invest, par}] · mediaRenda(itens)
     escala(valores) · modo() → 'conta'|'dia' · html(lista) · perguntas() → [g]
   DADOS
     ST.config.mesAMesModo ('conta' | 'dia') · no lançamento: g.extra (true/false, a resposta da pergunta)
   PONTOS QUE USA
     budget.atencao · inbox.itens · ações mm-modo, mm-extra-sim, mm-extra-nao
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function ehExtra(g) { return typeof rendaExtra === 'function' && rendaExtra(g); }
  function tipoExtra(gs) {
    var t = gs.map(function (g) { return (g.sub || '') + ' ' + (g.desc || ''); }).join(' ');
    return /rescis/i.test(t) ? tr('rescisão', 'severance') : /fgts/i.test(t) ? 'FGTS' : tr('renda extraordinária', 'extraordinary income');
  }
  function mesMais(t, n) { var a = Number(t.slice(0, 4)), m = Number(t.slice(5, 7)) - 1 + n; a += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return a + '-' + ('0' + (m + 1)).slice(-2); }

  var API = {
    _hoje: null,
    itens: function (lista) {
      var porMes = {}, extras = {};
      (lista || []).forEach(function (g) {
        if (!g.data) return; var t = g.data.slice(0, 7);
        var m = porMes[t] = porMes[t] || { t: t, entrada: 0, extra: 0, saida: 0, aplic: 0 };
        var v = Number(g.valor) || 0;
        if (g.fluxo === 'entrada') { m.entrada += v; if (ehExtra(g)) { m.extra += v; (extras[t] = extras[t] || []).push(g); } }
        else if (g.fluxo === 'aplicacao') m.aplic += v;
        else m.saida += v;
      });
      var l = Object.keys(porMes).sort().map(function (t) {
        var m = porMes[t];
        m.entRec = n2(m.entrada - m.extra); m.conta = n2(m.entrada - m.saida - m.aplic); m.dia = n2(m.entRec - m.saida);
        m.nome = t.slice(5, 7) + '/' + t.slice(0, 4); m.estrela = m.extra > 0; m.tipoExtra = m.estrela ? tipoExtra(extras[t]) : '';
        return m;
      });
      var media = API.mediaRenda(l);
      l.forEach(function (m) { m.invest = media > 0 && m.aplic > media; m.media = media; });
      /* 🔗: a renda extraordinária do mês X e o investimento grande em X−1, X ou X+1 (o maior) */
      l.forEach(function (m, i) {
        if (!m.estrela) return;
        var cand = [i + 1, i, i - 1].filter(function (j) { return l[j] && l[j].invest && Math.abs(Number(l[j].t.slice(0, 4)) * 12 + Number(l[j].t.slice(5, 7)) - Number(m.t.slice(0, 4)) * 12 - Number(m.t.slice(5, 7))) <= 1; });
        if (!cand.length) return;
        var j = cand.sort(function (a, b) { return l[b].aplic - l[a].aplic; })[0];
        m.par = { com: l[j].t, rel: j - i, lado: 'extra' };
        if (j !== i) l[j].par = { com: m.t, rel: i - j, lado: 'invest', tipoExtra: m.tipoExtra };
        else m.par.mesmo = true;
      });
      return l;
    },
    /* a renda média do mês: a recorrente, nos meses que tiveram renda */
    mediaRenda: function (l) {
      var c = (l || []).filter(function (m) { return m.entRec > 0; });
      return c.length ? n2(c.reduce(function (s, m) { return s + m.entRec; }, 0) / c.length) : 0;
    },
    escala: function (vals) {
      var a = (vals || []).map(function (v) { return Math.abs(Number(v) || 0); }).sort(function (x, y) { return x - y; });
      if (!a.length) return 1;
      var pos = 0.75 * (a.length - 1), lo = Math.floor(pos), p75 = a[lo] + (a[Math.min(a.length - 1, lo + 1)] - a[lo]) * (pos - lo);
      return p75 > 0 ? 2.5 * p75 : (a[a.length - 1] || 1);
    },
    modo: function () { var m = ST.config && ST.config.mesAMesModo; return m === 'dia' ? 'dia' : 'conta'; },
    frasePar: function (m) {
      var p = m.par; if (!p) return '';
      if (p.lado === 'extra') {
        if (p.mesmo) return m.tipoExtra + tr(' investida no mesmo mês', ' invested the same month');
        return p.rel > 0 ? m.tipoExtra + tr(' investida no mês seguinte', ' invested the following month') : m.tipoExtra + tr(' cobriu o investimento do mês anterior', ' covered the previous month\'s investment');
      }
      return p.rel < 0 ? tr('investimento da ', 'investment of the ') + p.tipoExtra + tr(' do mês anterior', ' from the previous month') : tr('investimento coberto pela ', 'investment covered by the ') + p.tipoExtra + tr(' do mês seguinte', ' of the following month');
    },
    linhaDet: function (m, modo) {
      var p = modo === 'dia'
        ? [tr('Entrou recorrente ', 'Recurring income ') + fmt(m.entRec), tr('gastou ', 'spent ') + fmt(m.saida)]
        : [tr('Entrou ', 'Came in ') + fmt(m.entrada), tr('gastou ', 'spent ') + fmt(m.saida), tr('foi para investimento ', 'went to investments ') + fmt(m.aplic) + tr(' (líquido)', ' (net)')];
      if (m.estrela) p.push('★ ' + m.tipoExtra + ' ' + fmt(m.extra));
      if (m.invest) p.push('📈 ' + tr('investiu mais que a renda média do mês (', 'invested more than the average monthly income (') + fmt(m.media) + ')');
      if (m.par) p.push('🔗 ' + API.frasePar(m));
      return p.join(' · ');
    },
    html: function (lista) {
      var l = API.itens(lista), modo = API.modo(), k = modo === 'dia' ? 'dia' : 'conta';
      if (!l.length) return '<p class="muted small">' + esc(tr('Sem dados ainda.', 'No data yet.')) + '</p>';
      var lim = API.escala(l.map(function (m) { return m[k]; }));
      var umLado = l.every(function (m) { return m[k] >= 0; }), H = umLado ? 100 : 50, Z = umLado ? 0 : 50;
      var botao = function (v, rot) { return '<button type="button" class="btn sm' + (modo === v ? ' primary' : '') + '" data-acao="mm-modo" data-m="' + v + '" aria-pressed="' + (modo === v) + '">' + esc(rot) + '</button>'; };
      var h = '<div class="mm-modos seg" role="group" aria-label="' + esc(tr('O que a barra mostra', 'What the bar shows')) + '">' + botao('conta', tr('Sobrou na conta', 'Left in the account')) + botao('dia', tr('Dia a dia', 'Day to day')) + '</div>';
      h += '<div class="viz-div mm mm2" data-modo="' + modo + '">';
      l.forEach(function (m) {
        var v = m[k], pos = v >= 0, w = Math.min(H, Math.abs(v) / lim * H), corta = Math.abs(v) > lim;
        var barra = '<div class="viz-div-zero" style="left:' + Z + '%"></div>' + (w > 0 ? '<div class="mm-seg ' + (pos ? 'mm-up' : 'mm-down') + '" style="left:' + (pos ? Z : Z - w).toFixed(2) + '%;width:' + w.toFixed(2) + '%"></div>' : '');
        if (corta) barra += '<span class="mm-quebra" style="' + (pos ? 'right' : 'left') + ':-2px" aria-hidden="true">⫽</span>';
        var marcas = modo === 'dia' ? '' : (m.estrela ? ' ★' : '') + (m.invest ? ' 📈' : '') + (m.par ? ' 🔗' : '');
        var det = API.linhaDet(m, modo);
        h += '<details class="mm-mes"><summary title="' + esc(det) + '"><div class="mm-linha"><div class="small mm-nome">' + esc(m.nome + marcas) + '</div>' +
          '<div class="mm-trilho">' + barra + '</div><div class="mm-valor"><div class="small mono ' + (pos ? 'up' : 'down') + '">' + (pos ? '+' : '−') + fmt(Math.abs(v)) + '</div></div></div></summary>' +
          '<p class="tiny muted mm-det">' + esc(det) + '</p></details>';
      });
      h += '</div><p class="tiny muted" style="margin-top:8px">' + esc(modo === 'dia'
        ? tr('Dia a dia: a renda que se repete menos o que foi gasto, sem renda extraordinária e sem investimento. Toque no mês para ver os números.', 'Day to day: the income that repeats minus spending, without extraordinary income and without investments. Tap a month to see the numbers.')
        : tr('Sobrou na conta: tudo o que entrou menos o que foi gasto e o que foi para investimento (aportes menos resgates). ★ renda extraordinária · 📈 investiu mais que a renda média do mês · 🔗 uma ligada à outra. Toque no mês para ver os números.',
             'Left in the account: everything that came in minus spending and what went to investments (contributions minus redemptions). ★ extraordinary income · 📈 invested more than the average monthly income · 🔗 linked. Tap a month to see the numbers.')) + '</p>';
      return h;
    },
    /* a pergunta da ★: entrada > 2× a média da renda recorrente dos 6 meses anteriores, sem resposta ainda */
    perguntas: function () {
      if (casa() || typeof Gasto === 'undefined') return [];
      var todos = Gasto.todos(), hoje = (API._hoje || hojeISO()).slice(0, 7), desde = mesMais(hoje, -11), porMes = {};
      todos.forEach(function (g) { if (g.fluxo === 'entrada' && g.data && !ehExtra(g)) { var t = g.data.slice(0, 7); porMes[t] = (porMes[t] || 0) + (Number(g.valor) || 0); } });
      return todos.filter(function (g) {
        if (g.fluxo !== 'entrada' || !g.data || g.extra === true || g.extra === false || ehExtra(g)) return false;
        var t = g.data.slice(0, 7); if (t < desde || t > hoje) return false;
        var ms = []; for (var i = 1; i <= 6; i++) { var x = mesMais(t, -i); if (porMes[x]) ms.push(porMes[x]); }
        if (ms.length < 3) return false;
        var med = ms.reduce(function (s, v) { return s + v; }, 0) / ms.length;
        return (Number(g.valor) || 0) > 2 * med;
      }).sort(function (a, b) { return a.data < b.data ? 1 : -1; });
    }
  };

  function itensPergunta(q, li) {
    return q.map(function (g) {
      return '<div class="mm-pergunta"><p class="small" style="margin:0 0 6px">★ ' + esc(tr('Entrou ', 'Received ') + fmt(g.valor) + tr(' em ', ' on ') + I18n.data(g.data) + ' (' + (g.desc || g.sub || '') + ')' +
        tr(': mais que o dobro da sua renda de sempre. É renda extraordinária (rescisão, prêmio, venda de um bem)? Se for, fica fora das médias.', ': more than twice your usual income. Is it extraordinary income (severance, prize, selling something)? If so, it stays out of the averages.')) + '</p>' +
        '<button type="button" class="btn sm primary" data-acao="mm-extra-sim" data-id="' + esc(g.id) + '">' + esc(tr('★ Sim, é extraordinária', '★ Yes, extraordinary')) + '</button> ' +
        '<button type="button" class="btn sm" data-acao="mm-extra-nao" data-id="' + esc(g.id) + '">' + esc(tr('Não, é renda normal', 'No, regular income')) + '</button></div>';
    }).map(function (h) { return li ? '<li class="inb-item">' + h + '</li>' : h; }).join('');
  }
  function cartaoAtencao() {
    var q = API.perguntas(); if (!q.length) return '';
    return '<div class="card mm-atencao"><div class="card-head"><h3>' + esc(tr('Precisa da sua atenção', 'Needs your attention')) + '</h3></div>' + itensPergunta(q) + '</div>';
  }
  function responder(id, sim) {
    var g = Gasto.todos().filter(function (x) { return x.id === id; })[0]; if (!g) return;
    g.extra = !!sim; Store.salvar(); render();
    toast(sim ? tr('Marcada como renda extraordinária: fica fora das médias.', 'Marked as extraordinary income: it stays out of the averages.') : tr('Certo: conta como renda normal.', 'Fine: it counts as regular income.'));
  }

  MoneyModulos.registrar({
    id: 'mes-a-mes', versao: '1.0.1',
    pontos: {
      'budget.atencao': cartaoAtencao,
      'inbox.grupos': function () { var q = API.perguntas(); return q.length ? [{ id: 'confirmar', n: q.length, html: itensPergunta(q, true) }] : []; },   /* 1.0.1 (3.76) */
      'inbox.itens': function () {
        return API.perguntas().map(function (g) {
          return { tipo: 'atencao', ico: '★', nome: tr('É renda extraordinária?', 'Is it extraordinary income?'), valor: g.valor, data: g.data,
            sub: (g.desc || g.sub || '') + tr(' — responda no Painel', ' — answer on the Panel') };
        });
      }
    },
    acoes: {
      'mm-modo': function (el) { ST.config = ST.config || {}; ST.config.mesAMesModo = el.dataset.m === 'dia' ? 'dia' : 'conta'; Store.salvar(); render(); },
      'mm-extra-sim': function (el) { responder(el.dataset.id, true); },
      'mm-extra-nao': function (el) { responder(el.dataset.id, false); }
    }
  });
  window.MesAMes = API;
})();
