/* =====================================================================
   modulos/contas-mes.js — a tela "Contas fixas": o mês com o status de cada conta (3.75)        1.0.0 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 13/Nov/2026)
     · No topo da tela (id b-custos), dois seletores guardados: período "Este mês | Próximos 45 dias" e arrumação
       "Por dia | Por grupo".
     · Cada conta com o status: ✓ Paga (verde, com a data e o valor real) · ⚠ Atrasada (vermelho: passou do
       vencimento sem pagamento) · ⏰ Vence hoje (âmbar) · ○ A vencer (neutro) · 🔄 Débito automático (azul, até
       cair; depois Paga). A cor vai numa faixa fina à esquerda e no selo; o valor fica na cor normal.
     · "Próximos 45 dias": de hoje a +45, e no topo as ATRASADAS que ficaram para trás (meses anteriores e as deste mês
       antes de hoje, que não cabem na janela), ainda não pagas, com
       "N contas atrasadas · R$ X".
     · "Por grupo": os grupos do app, com o ícone, o total do período e "pagas X de Y"; abre e fecha.
     · Resumo: "R$ X em contas fixas · pagas R$ Y · faltam R$ Z · atrasadas R$ W", barra cheia (pago) + contorno (falta).
     · "Parece conta fixa" (sem IA): o mesmo recebedor (CNPJ → pessoa → descrição; nunca descrição genérica do banco)
       em 3 meses seguidos, valor parecido (±15%) e dia parecido (±5), sem conta fixa cadastrada → "Precisa da sua
       atenção": "Parece conta fixa: <nome> · ~R$ X · todo dia ~D. Cadastrar?". Dois boletos do mesmo recebedor com
       faixas de valor e dia diferentes = duas contas. O mesmo recebedor no mesmo mês em anos seguidos = conta anual.
       "Sim" abre o cadastro já preenchido (nome editável); "Não" não volta.
     · Retrocompatível: nada muda nos dados guardados; as abas de antes continuam embaixo. Visão da casa: só o que ela vê.
   API (window.ContasMes)
     itens(modo) → [{r, data, valor, status, pagoEm, grupo}] · atrasadasAntigas() · resumo(itens) · sugestoes() · STATUS
   DADOS
     ST.config.contasModo ('mes' | '45') · ST.config.contasArruma ('dia' | 'grupo') · ST.config.cfRecusadas {chave: 1}
   PONTOS QUE USA
     custos.contas (index.html, topo da tela) · budget.atencao · inbox.itens · ações cm-*, cfs-*
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function hoje() { return API._hoje || hojeISO(); }
  function cfg() { return (ST.config = ST.config || {}); }
  function mais(iso, d) { var x = new Date(iso + 'T12:00:00'); x.setDate(x.getDate() + d); return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2); }
  function ultimoDia(mes) { return mes + '-' + ('0' + new Date(+mes.slice(0, 4), +mes.slice(5, 7), 0).getDate()).slice(-2); }
  function somaMes(mes, k) { var y = +mes.slice(0, 4), m = +mes.slice(5, 7) + k; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } return y + '-' + ('0' + m).slice(-2); }
  function saida(r) { return (GRUPOS[r.grupo] || {}).fluxo !== 'entrada'; }

  var STATUS = {
    paga: { ico: '✓', pt: 'Paga', en: 'Paid', cor: '--up' },
    atrasada: { ico: '⚠', pt: 'Atrasada', en: 'Overdue', cor: '--down' },
    hoje: { ico: '⏰', pt: 'Vence hoje', en: 'Due today', cor: '--warn' },
    avencer: { ico: '○', pt: 'A vencer', en: 'Upcoming', cor: '--txt3' },
    debito: { ico: '🔄', pt: 'Débito automático', en: 'Auto-debit', cor: '--accent2' }
  };

  /* pago? pelo registro (marcado, conciliado) ou por um lançamento ligado ao compromisso no mesmo mês */
  function pago(o) {
    var reg = o.registro || (typeof Pagamento !== 'undefined' ? Pagamento.achar(o.r.id, o.data) : null);
    if (reg && (reg.estado === 'pago' || reg.estado === 'confirmado')) {
      var g = reg.gastoId ? Gasto.todos().filter(function (x) { return x.id === reg.gastoId; })[0] : null;
      return { em: g ? g.data : String(reg.em || o.data).slice(0, 10), valor: n2(reg.valor != null ? reg.valor : (g ? g.valor : o.valor)) };
    }
    var gl = Gasto.todos().filter(function (x) { return x.recorrenteId === o.r.id && String(x.data).slice(0, 7) === o.data.slice(0, 7); })[0];
    return gl ? { em: gl.data, valor: n2(gl.valor) } : null;
  }
  function item(o) {
    var h = hoje(), p = pago(o), st;
    if (p) st = 'paga';
    else if (o.estado === 'automatico' || o.r.estadoPadrao === 'automatico') st = o.data < h ? 'paga' : 'debito';
    else if (o.data < h) st = 'atrasada';
    else if (o.data === h) st = 'hoje';
    else st = 'avencer';
    return { r: o.r, data: o.data, valor: p ? p.valor : n2(o.valor), status: st, pagoEm: p ? p.em : (st === 'paga' ? o.data : ''), grupo: o.r.grupo };
  }
  function ocorr(de, ate) {
    if (typeof Recorrente === 'undefined') return [];
    return Recorrente.ocorrencias(de, ate).filter(function (o) {
      /* antes de a conta existir no app não há o que cobrar (nem atrasada) */
      return saida(o.r) && o.estado !== 'cancelado' && o.estado !== 'semconf' && !(o.r.criadoEm && o.data < String(o.r.criadoEm).slice(0, 10));
    });
  }

  var API = {
    _hoje: null, STATUS: STATUS,
    modo: function () { return cfg().contasModo === '45' ? '45' : 'mes'; },
    arruma: function () { return cfg().contasArruma === 'grupo' ? 'grupo' : 'dia'; },
    itens: function (modo) {
      var h = hoje(), m = h.slice(0, 7);
      return (modo === '45' ? ocorr(h, mais(h, 45)) : ocorr(m + '-01', ultimoDia(m))).map(item);
    },
    /* as atrasadas que ficaram para trás (até 12 meses, até ontem), ainda não pagas */
    atrasadasAntigas: function () {
      var h = hoje(), ini = somaMes(h.slice(0, 7), -12) + '-01', fim = mais(h, -1);
      return ocorr(ini, fim).map(item).filter(function (x) { return x.status === 'atrasada'; });
    },
    resumo: function (l) {
      var r = { total: 0, pagas: 0, faltam: 0, atrasadas: 0, n: l.length, nPagas: 0 };
      l.forEach(function (x) { r.total += x.valor; if (x.status === 'paga') { r.pagas += x.valor; r.nPagas++; } else r.faltam += x.valor; if (x.status === 'atrasada') r.atrasadas += x.valor; });
      ['total', 'pagas', 'faltam', 'atrasadas'].forEach(function (k) { r[k] = n2(r[k]); });
      return r;
    },

    /* ---------- "Parece conta fixa" ---------- */
    sugestoes: function () {
      if (!window.Origem || typeof Gasto === 'undefined') return [];
      var h = hoje(), desde = somaMes(h.slice(0, 7), -24) + '-01', por = {}, recus = cfg().cfRecusadas || {};
      Gasto.todos().forEach(function (g) {
        if (g.fluxo !== 'saida' || !g.data || g.data < desde || g.recorrenteId) return;
        if (Gasto.parcela && Gasto.parcela(g.desc, g)) return;
        var k = Origem.origemDe(g); if (!k || k.indexOf('u:') === 0) return;
        (por[k] = por[k] || []).push(g);
      });
      var out = [];
      Object.keys(por).forEach(function (k) {
        /* separa as contas do mesmo recebedor pela faixa de valor e de dia */
        var grupos = [];
        por[k].slice().sort(function (a, b) { return a.valor - b.valor; }).forEach(function (g) {
          var d = +g.data.slice(8, 10), v = Number(g.valor) || 0;
          var c = grupos.filter(function (x) { return Math.abs(v - x.media) <= x.media * 0.15 && Math.abs(d - x.dia) <= 5; })[0];
          if (!c) { c = { itens: [], media: v, dia: d }; grupos.push(c); }
          c.itens.push(g); c.media = c.itens.reduce(function (s, x) { return s + (Number(x.valor) || 0); }, 0) / c.itens.length;
          c.dia = Math.round(c.itens.reduce(function (s, x) { return s + +x.data.slice(8, 10); }, 0) / c.itens.length);
        });
        grupos.forEach(function (c) {
          var meses = {}; c.itens.forEach(function (g) { meses[g.data.slice(0, 7)] = 1; });
          var ms = Object.keys(meses).sort(), seguidos = 1, melhor = 1;
          for (var i = 1; i < ms.length; i++) { seguidos = somaMes(ms[i - 1], 1) === ms[i] ? seguidos + 1 : 1; if (seguidos > melhor) melhor = seguidos; }
          var tipo = '';
          if (melhor >= 3) tipo = 'mensal';
          else {
            var porMesAno = {}; ms.forEach(function (m) { (porMesAno[m.slice(5, 7)] = porMesAno[m.slice(5, 7)] || []).push(+m.slice(0, 4)); });
            Object.keys(porMesAno).forEach(function (mm) { var a = porMesAno[mm].sort(); for (var j = 1; j < a.length; j++) if (a[j] === a[j - 1] + 1) { tipo = 'anual'; c.mes = +mm; } });
          }
          if (!tipo) return;
          var media = n2(c.media), g0 = c.itens[c.itens.length - 1];
          var chave = k + '|' + tipo + '|' + Math.round(Math.log(media) / Math.log(1.3)) + '|' + Math.round(c.dia / 10);
          if (recus[chave]) return;
          /* já tem conta fixa parecida? */
          var ja = (typeof Recorrente !== 'undefined' ? Recorrente.ativos() : []).some(function (r) {
            var v = Number(r.valor) || 0; if (!(v > 0) || Math.abs(v - media) > media * 0.15) return false;
            if (tipo === 'mensal' && r.regra !== 'anual' && Math.abs((Number(r.dia) || 0) - c.dia) > 5) return false;
            return r.grupo === g0.grupo || Origem.chaveDesc(r.nome).split(' ').some(function (w) { return w.length > 3 && Origem.chaveDesc(g0.desc).indexOf(w) >= 0; });
          });
          if (ja) return;
          out.push({ chave: chave, tipo: tipo, nome: window.Apelido ? Apelido.texto(g0) : (g0.desc || ''), valor: media, dia: c.dia, mes: c.mes || 0,
            grupo: g0.grupo, sub: g0.sub, n: c.itens.length });
        });
      });
      return out.sort(function (a, b) { return b.valor - a.valor; });
    }
  };

  /* ---------- a tela ---------- */
  function selo(st) { var s = STATUS[st]; return '<span class="cm-selo cm-' + st + '">' + s.ico + ' ' + esc(s[pt() ? 'pt' : 'en']) + '</span>'; }
  function linha(x) {
    var s = STATUS[x.status];
    var sub = [tr('dia ', 'day ') + Number(x.data.slice(8, 10)) + ' · ' + I18n.data(x.data), (GRUPOS[x.grupo] || {}).nome || x.grupo,
      x.status === 'paga' && x.pagoEm ? tr('paga em ', 'paid on ') + I18n.data(x.pagoEm) : ''].filter(Boolean).join(' · ');
    return '<div class="cm-linha cm-' + x.status + '" style="--cm-cor:var(' + s.cor + ')" data-acao="cm-abrir" data-id="' + esc(x.r.id) + '">' +
      '<div class="cm-txt"><span class="t-main">' + esc(x.r.nome) + '</span><div class="t-sub">' + esc(sub) + '</div></div>' +
      '<div class="cm-dir"><span class="num">' + fmt(x.valor) + '</span>' + selo(x.status) + '</div></div>';
  }
  function porGrupo(l) {
    var gs = {}, ordem = [];
    l.forEach(function (x) { if (!gs[x.grupo]) { gs[x.grupo] = []; ordem.push(x.grupo); } gs[x.grupo].push(x); });
    var nomes = Object.keys(GRUPOS);
    ordem.sort(function (a, b) { return nomes.indexOf(a) - nomes.indexOf(b); });
    return ordem.map(function (g) {
      var it = gs[g].sort(function (a, b) { return a.data < b.data ? -1 : 1; }), r = API.resumo(it), G = GRUPOS[g] || {};
      return '<details class="cm-grupo"><summary><span>' + (G.ico || '') + ' <b>' + esc(G.nome || g) + '</b></span><span class="small">' + fmt(r.total) + ' · ' +
        esc(tr('pagas ', 'paid ') + r.nPagas + tr(' de ', ' of ') + r.n) + '</span></summary>' + it.map(linha).join('') + '</details>';
    }).join('');
  }
  function cartao() {
    var modo = API.modo(), arr = API.arruma(), l = API.itens(modo), antigas = modo === '45' ? API.atrasadasAntigas() : [];
    var todos = antigas.concat(l), r = API.resumo(todos);
    if (!todos.length && !Recorrente.ativos().filter(saida).length) return '';
    var bt = function (k, v, rot, on) { return '<button type="button" class="btn sm' + (on ? ' primary' : '') + '" data-acao="cm-' + k + '" data-v="' + v + '" aria-pressed="' + on + '">' + esc(rot) + '</button>'; };
    var pc = r.total > 0 ? Math.min(100, r.pagas / r.total * 100) : 0;
    var h = '<div class="card cm-card"><div class="row cm-sel" style="gap:10px;flex-wrap:wrap;margin-bottom:10px">' +
      '<div class="seg" role="group">' + bt('modo', 'mes', tr('Este mês', 'This month'), modo === 'mes') + bt('modo', '45', tr('Próximos 45 dias', 'Next 45 days'), modo === '45') + '</div>' +
      '<div class="seg" role="group">' + bt('arruma', 'dia', tr('Por dia', 'By day'), arr === 'dia') + bt('arruma', 'grupo', tr('Por grupo', 'By group'), arr === 'grupo') + '</div></div>' +
      '<p class="cm-resumo"><b>' + esc((modo === 'mes' ? tr('Este mês: ', 'This month: ') : tr('Próximos 45 dias: ', 'Next 45 days: ')) + fmt(r.total) + tr(' em contas fixas', ' in fixed bills')) + '</b>' +
      '<span class="small"> · ' + esc(tr('pagas ', 'paid ') + fmt(r.pagas) + ' · ' + tr('faltam ', 'left ') + fmt(r.faltam) + (r.atrasadas ? ' · ' + tr('atrasadas ', 'overdue ') + fmt(r.atrasadas) : '')) + '</span></p>' +
      '<div class="cm-barra" role="img" aria-label="' + esc(Math.round(pc) + tr('% pago', '% paid')) + '"><span style="width:' + pc.toFixed(1) + '%"></span></div>';
    if (antigas.length) {
      var ra = API.resumo(antigas);
      h += '<div class="aviso-box cm-antigas"><b>⚠ ' + esc(antigas.length + (antigas.length === 1 ? tr(' conta atrasada · ', ' overdue bill · ') : tr(' contas atrasadas · ', ' overdue bills · ')) + fmt(ra.total)) + '</b></div>' +
        antigas.map(linha).join('');
    }
    h += arr === 'grupo' ? porGrupo(l) : l.map(linha).join('');
    if (!l.length) h += '<p class="small muted">' + esc(tr('Nenhuma conta fixa no período.', 'No fixed bills in the period.')) + '</p>';
    return h + '</div>';
  }
  function cartaoSugestoes() {
    var s = API.sugestoes(); if (!s.length) return '';
    return '<div class="card cfs-atencao"><div class="card-head"><h3>' + esc(tr('Precisa da sua atenção', 'Needs your attention')) + '</h3></div>' + s.map(function (x) {
      var quando = x.tipo === 'anual' ? tr('todo ano em ', 'every year in ') + new Date(2026, x.mes - 1, 15).toLocaleDateString(pt() ? 'pt-BR' : 'en-US', { month: 'long' }) : tr('todo dia ~', 'every month on day ~') + x.dia;
      return '<div class="cfs-item"><p class="small" style="margin:0 0 6px">📌 ' + esc(tr('Parece conta fixa: ', 'Looks like a fixed bill: ') + x.nome + ' · ~' + fmt(x.valor) + ' · ' + quando + tr('. Cadastrar?', '. Add it?')) + '</p>' +
        '<button type="button" class="btn sm primary" data-acao="cfs-sim" data-chave="' + esc(x.chave) + '">' + esc(tr('Sim, cadastrar', 'Yes, add it')) + '</button> ' +
        '<button type="button" class="btn sm" data-acao="cfs-nao" data-chave="' + esc(x.chave) + '">' + esc(tr('Não é', 'No')) + '</button></div>';
    }).join('') + '</div>';
  }

  MoneyModulos.registrar({
    id: 'contas-mes', versao: '1.0.0',
    pontos: {
      'custos.contas': cartao,
      'budget.atencao': cartaoSugestoes,
      'inbox.itens': function () {
        return API.sugestoes().map(function (x) { return { tipo: 'atencao', ico: '📌', nome: tr('Parece conta fixa', 'Looks like a fixed bill'), valor: x.valor, data: hoje(), sub: x.nome + tr(' — responda no Painel', ' — answer on the Panel') }; });
      }
    },
    acoes: {
      'cm-modo': function (el) { cfg().contasModo = el.dataset.v === '45' ? '45' : 'mes'; Store.salvar(); render(); },
      'cm-arruma': function (el) { cfg().contasArruma = el.dataset.v === 'grupo' ? 'grupo' : 'dia'; Store.salvar(); render(); },
      'cm-abrir': function (el) { if (typeof abrirRecorrente === 'function') abrirRecorrente(el.dataset.id); },
      'cfs-sim': function (el) {
        var x = API.sugestoes().filter(function (s) { return s.chave === el.dataset.chave; })[0]; if (!x) return;
        var sem = { nome: x.nome, valor: x.valor, grupo: x.grupo, sub: x.sub, dia: x.tipo === 'anual' ? 10 : x.dia, regra: x.tipo === 'anual' ? 'anual' : 'dia', mes: x.mes || 0,
          desde: hoje().slice(0, 7) + '-01', obs: tr('Sugerido pelo app: o mesmo recebedor se repete.', 'Suggested by the app: the same payee repeats.') };
        if (typeof abrirRecorrente === 'function') abrirRecorrente(null, sem, { abrirMais: true });
      },
      'cfs-nao': function (el) { var c = cfg(); c.cfRecusadas = c.cfRecusadas || {}; c.cfRecusadas[el.dataset.chave] = 1; Store.salvar(); render(); }
    }
  });
  window.ContasMes = API;
})();
