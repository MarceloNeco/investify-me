/* =====================================================================
   modulos/contas-mes.js — a tela "Contas fixas": o mês com o status de cada conta (3.75)        1.1.0 · 14/Nov/2026
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
       "Sim" abre o cadastro já preenchido (nome editável); "Não" não volta. Quem aparece mais de 2× por mês (posto, mercado)
       não é sugerido.
     · 1.1.0 (3.86): gasto FREQUENTE (mercado, padaria, restaurante, farmácia, combustível, transporte, compras — pela
       categoria e pelo MCC) não é sugerido. "Sim, cadastrar / Não é" viraram "Revisar" e "Não acompanhar". "Revisar" abre
       uma janela curta (boa no celular): o tipo (conta fixa · valor variável · imposto ou custo da empresa · gasto frequente
       · foi só uma vez), nome, grupo, categoria, quem paga, empresa (PJ), o dia com a janela, o valor (média ou "usar o
       último valor"), "só nos meses em que houver receita" (imposto), até quando, a prévia e "Salvar"; depois, "Desfazer"
       por 10 s. Imposto da PJ (DAS, DARF, "PGTO CONCES.PUB … RECEITA FED") já abre como imposto da empresa certa.
       Visão da casa: nada da PJ.
     · Retrocompatível: nada muda nos dados guardados; as abas de antes continuam embaixo. Visão da casa: só o que ela vê.
   API (window.ContasMes)
     itens(modo) → [{r, data, valor, status, pagoEm, grupo}] · atrasadasAntigas() · resumo(itens) · sugestoes() · STATUS
   DADOS
     ST.config.contasModo ('mes' | '45') · ST.config.contasArruma ('dia' | 'grupo') · ST.config.cfRecusadas {chave: 1} · ST.config.cfFrequentes {origem: 1} (1.1.0) · recorrente: janela [de, até], diaUtilSeguinte (DAS) / diaUtilAnterior (DARF), condicional, empresaId
   PONTOS QUE USA
     custos.contas (index.html, topo da tela) · budget.atencao · inbox.itens · ações cm-*, cfs-*
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function hoje() { return API._hoje || hojeISO(); }
  function cfg() { return (ST.config = ST.config || {}); }
  function mais(iso, d) { var x = new Date(iso + 'T12:00:00'); x.setDate(x.getDate() + d); return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2); }
  function ultimoDia(mes) { return mes + '-' + ('0' + new Date(+mes.slice(0, 4), +mes.slice(5, 7), 0).getDate()).slice(-2); }
  function somaMes(mes, k) { var y = +mes.slice(0, 4), m = +mes.slice(5, 7) + k; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } return y + '-' + ('0' + m).slice(-2); }
  function saida(r) { return (GRUPOS[r.grupo] || {}).fluxo !== 'entrada'; }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  /* 1.1.0 (3.86): GASTO FREQUENTE nunca vira "Parece conta fixa": fica no previsto da categoria (pela categoria e pelo MCC) */
  var FREQ_SUB = /mercado|supermerc|padaria|restaur|lanchon|delivery|ifood|farm[aá]cia|drogaria|combust|posto|gasolina|transporte|uber|metr[oô]|[oô]nibus|estacionamento|compras|shopping|vestu|roupa/i;
  var FREQ_MCC = { 5411: 1, 5412: 1, 5499: 1, 5462: 1, 5812: 1, 5813: 1, 5814: 1, 5912: 1, 5541: 1, 5542: 1, 4111: 1, 4121: 1, 4131: 1, 4789: 1, 5310: 1, 5311: 1, 5651: 1, 5691: 1, 5699: 1 };
  function frequente(g) { var mcc = g.contraparte && g.contraparte.mcc; return g.grupo === 'TRANSPORTE' || FREQ_SUB.test(g.sub || '') || !!(mcc && FREQ_MCC[mcc]); }
  /* imposto ou custo da empresa: DAS, DARF, "PGTO CONCES.PUB ... RECEITA FED", ou um lançamento de conta da PJ */
  var IMPOSTO = /das[- ]simples|das[- ]mei|\bdarf\b|pgto conces\.? ?pub.*receita fed/i;
  function textoG(g) { return [g.desc, g.descRobo, g.sub].filter(Boolean).join(' '); }
  function empresaDe(g) { return window.PJ && PJ.empresaDe ? PJ.empresaDe(g) : null; }

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
      var h = hoje(), desde = somaMes(h.slice(0, 7), -24) + '-01', por = {}, recus = cfg().cfRecusadas || {}, freqs = cfg().cfFrequentes || {};
      Gasto.todos().forEach(function (g) {
        if (g.fluxo !== 'saida' || !g.data || g.data < desde || g.recorrenteId) return;
        if (Gasto.parcela && Gasto.parcela(g.desc, g)) return;
        if (frequente(g)) return;
        /* visão da casa: nada da PJ */
        if (casa() && (IMPOSTO.test(textoG(g)) || empresaDe(g) || /^pj\b/i.test(String(g.irTexto || '')))) return;
        var k = Origem.origemDe(g); if (!k || k.indexOf('u:') === 0 || freqs[k]) return;
        (por[k] = por[k] || []).push(g);
      });
      var out = [];
      Object.keys(por).forEach(function (k) {
        /* quem aparece mais de 2× por mês (posto, mercado, padaria) é gasto do dia a dia, não conta fixa */
        var nMeses = {}; por[k].forEach(function (g) { nMeses[g.data.slice(0, 7)] = 1; });
        if (por[k].length / Object.keys(nMeses).length > 2) return;
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
          var ult = c.itens.slice().sort(function (a, b) { return a.data < b.data ? 1 : -1; })[0];
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
            grupo: g0.grupo, sub: g0.sub, n: c.itens.length, origem: k, ultimo: n2(ult.valor), quem: ult.quem || '',
            diaMin: Math.min.apply(null, c.itens.map(function (g) { return +g.data.slice(8, 10); })), diaMax: Math.max.apply(null, c.itens.map(function (g) { return +g.data.slice(8, 10); })),
            pj: !casa() && (IMPOSTO.test(textoG(ult)) || !!empresaDe(ult)), empresaId: (empresaDe(ult) || {}).id || '',
            pjTipo: /\bdas\b/i.test(ult.desc || ult.descRobo || '') ? 'das' : /\bdarf\b|receita fed/i.test(ult.desc || ult.descRobo || '') ? 'darf' : '' });
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
  function itensSugestoes(s, li) {
    return s.map(function (x) {
      var quando = x.tipo === 'anual' ? tr('todo ano em ', 'every year in ') + new Date(2026, x.mes - 1, 15).toLocaleDateString(I18n.locale(), { month: 'long' }) : tr('todo dia ~', 'every month on day ~') + x.dia;
      return '<div class="cfs-item"><p class="small" style="margin:0 0 6px">📌 ' + esc((x.pj ? tr('Parece imposto ou custo da empresa: ', 'Looks like a company tax or cost: ') : tr('Parece conta fixa: ', 'Looks like a fixed bill: ')) + x.nome + ' · ~' + fmt(x.valor) + ' · ' + quando + '.') + '</p>' +
        '<button type="button" class="btn sm primary" data-acao="cfs-revisar" data-chave="' + esc(x.chave) + '">' + esc(tr('Revisar', 'Review')) + '</button> ' +
        '<button type="button" class="btn sm" data-acao="cfs-nao" data-chave="' + esc(x.chave) + '">' + esc(tr('Não acompanhar', 'Do not track')) + '</button></div>';
    }).map(function (h) { return li ? '<li class="inb-item">' + h + '</li>' : h; }).join('');
  }
  /* ---------- 1.1.0 (3.86): a janela "Revisar" ---------- */
  var TIPOS = [
    ['fixa', 'Conta fixa (valor quase igual)', 'Fixed bill (almost the same amount)'],
    ['variavel', 'Conta recorrente de valor variável (imposto, energia)', 'Recurring bill with a varying amount (tax, power)'],
    ['imposto', 'Imposto ou custo da empresa', 'Company tax or cost'],
    ['frequente', 'Gasto frequente (mercado etc.)', 'Frequent spending (groceries etc.)'],
    ['umavez', 'Foi só uma vez', 'It was just once']
  ];
  var aberta = null, desfazer = null;
  function val(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }
  function marcado(nome) { var e = document.querySelector('#genBody input[name="' + nome + '"]:checked'); return e ? e.value : ''; }
  function campo(rot, h, id) { return '<label class="field"' + (id ? ' id="' + id + '"' : '') + '><span>' + esc(rot) + '</span>' + h + '</label>'; }
  function radio(nome, v, rot, on) { return '<label class="cfr-op" style="display:block;padding:6px 0"><input type="radio" name="' + nome + '" value="' + v + '"' + (on ? ' checked' : '') + '> ' + esc(rot) + '</label>'; }
  /* o que a janela vai gravar, lido dos campos */
  function lido() {
    var x = aberta, tipo = marcado('cfrTipo') || 'fixa', v = marcado('cfrValor') === 'ultimo' ? x.ultimo : Number(val('cfrV')) || x.valor;
    if (marcado('cfrValor') === 'ultimo') { var ev = document.getElementById('cfrV'); if (ev) ev.value = x.ultimo; }
    var dia = Math.min(31, Math.max(1, Number(val('cfrDia')) || x.dia)), de = Number(val('cfrDe')) || dia, ate = Number(val('cfrAte')) || dia;
    return { tipo: tipo, nome: val('cfrNome') || x.nome, grupo: val('cfrGrupo') || x.grupo, sub: val('cfrSub') || x.sub, pagador: val('cfrQuem'), empresaId: val('cfrEmp'),
      dia: dia, janela: [Math.min(de, dia), Math.max(ate, dia)], valor: n2(v), condicional: val('cfrCond'), ate: marcado('cfrFim') === 'data' && /^\d{4}-\d{2}-\d{2}$/.test(val('cfrFimData')) ? val('cfrFimData') : '' };
  }
  function previa(l) {
    if (l.tipo === 'frequente') return tr('Não vira conta fixa: o gasto continua no previsto da categoria e este recebedor não é mais sugerido.', 'Not a fixed bill: the spending stays in the category forecast and this payee is no longer suggested.');
    if (l.tipo === 'umavez') return tr('Nada é cadastrado e esta sugestão não volta.', 'Nothing is added and this suggestion will not come back.');
    var t = (l.tipo === 'imposto' ? tr('Vai criar o imposto/custo da empresa ', 'Will add the company tax/cost ') : tr('Vai criar a conta fixa ', 'Will add the fixed bill ')) + '"' + l.nome + '" · ' +
      (l.tipo === 'imposto' && l.condicional === 'receita' ? tr('valor pela receita do mês anterior (hoje ~', 'amount from last month\'s revenue (today ~') + fmt(l.valor) + ')' : (l.tipo === 'fixa' ? '' : '~') + fmt(l.valor)) + ' · ' +
      tr('por volta do dia ', 'around day ') + l.dia + (l.janela[0] !== l.janela[1] ? tr(', entre ', ', between ') + l.janela[0] + tr(' e ', ' and ') + l.janela[1] : '') +
      (l.tipo === 'imposto' ? (aberta.pjTipo === 'darf' ? tr(' (fim de semana ou feriado → antecipa para o dia útil anterior)', ' (weekend or holiday → moves back to the previous business day)') : tr(' (fim de semana ou feriado → próximo dia útil)', ' (weekend or holiday → next business day)')) : '') +
      (l.condicional === 'receita' && l.tipo === 'imposto' ? tr(' · só nos meses depois de um mês com receita', ' · only in months after a month with revenue') : '') +
      ' · ' + (l.ate ? tr('até ', 'until ') + I18n.data(l.ate) : tr('em aberto', 'open-ended')) + '.';
    return t + ' ' + tr('Tudo continua editável em Contas fixas.', 'Everything stays editable in Fixed bills.');
  }
  function mostra() {
    var l = lido(), pj = document.getElementById('cfrPJ'); if (pj) pj.style.display = l.tipo === 'imposto' ? '' : 'none';
    var cp = document.getElementById('cfrCampos'); if (cp) cp.style.display = l.tipo === 'frequente' || l.tipo === 'umavez' ? 'none' : '';
    var p = document.getElementById('cfrPrevia'); if (p) p.textContent = Verter.txt(previa(l));
  }
  function abrirRevisar(x) {
    aberta = x;
    var emps = casa() ? [] : (window.CofreEmpresa && CofreEmpresa.ordenadas ? CofreEmpresa.ordenadas() : (ST.empresas || []));
    var tipo0 = x.pj ? 'imposto' : (Math.abs(x.ultimo - x.valor) > x.valor * 0.05 ? 'variavel' : 'fixa');
    var grupos = Object.keys(GRUPOS).filter(function (g) { return GRUPOS[g].fluxo !== 'entrada'; });
    $('#genTitle').textContent = tr('Revisar: ', 'Review: ') + x.nome;
    $('#genBody').innerHTML = Verter.html(
      '<fieldset class="cfr-tipos" style="border:0;padding:0;margin:0 0 8px"><legend class="small"><b>' + esc(tr('O que é?', 'What is it?')) + '</b></legend>' +
        TIPOS.filter(function (t) { return t[0] !== 'imposto' || !casa(); }).map(function (t) { return radio('cfrTipo', t[0], pt() ? t[1] : t[2], t[0] === tipo0); }).join('') + '</fieldset>' +
      '<div id="cfrCampos"><div class="grid g2">' +
        campo(tr('Nome', 'Name'), '<input id="cfrNome" maxlength="80" value="' + esc(x.nome) + '">') +
        campo(tr('Grupo', 'Group'), '<select id="cfrGrupo">' + grupos.map(function (g) { return '<option value="' + g + '"' + (g === x.grupo ? ' selected' : '') + '>' + esc((GRUPOS[g].ico || '') + ' ' + GRUPOS[g].nome) + '</option>'; }).join('') + '</select>') +
        campo(tr('Categoria', 'Category'), '<input id="cfrSub" maxlength="60" value="' + esc(x.sub || '') + '">') +
        campo(tr('Quem paga', 'Who pays'), '<input id="cfrQuem" maxlength="60" value="' + esc(x.quem || '') + '">') +
        campo(tr('Por volta do dia', 'Around day'), '<input id="cfrDia" type="number" min="1" max="31" inputmode="numeric" value="' + x.dia + '">') +
        campo(tr('Janela: entre o dia… e o dia…', 'Window: between day… and day…'), '<span class="row" style="gap:6px"><input id="cfrDe" type="number" min="1" max="31" inputmode="numeric" value="' + x.diaMin + '" style="width:5em"><input id="cfrAte" type="number" min="1" max="31" inputmode="numeric" value="' + x.diaMax + '" style="width:5em"></span>') + '</div>' +
        campo(tr('Valor estimado (R$)', 'Estimated amount (R$)'), '<input id="cfrV" type="number" min="0" step="0.01" inputmode="decimal" value="' + x.valor + '">') +
        radio('cfrValor', 'media', tr('Média dos últimos: ', 'Average of the last ones: ') + fmt(x.valor), Math.abs(x.ultimo - x.valor) <= x.valor * 0.15) +
        radio('cfrValor', 'ultimo', tr('Usar o último valor: ', 'Use the last amount: ') + fmt(x.ultimo), Math.abs(x.ultimo - x.valor) > x.valor * 0.15) +
        (casa() ? '' : '<div id="cfrPJ">' +
          campo(tr('Empresa', 'Company'), '<select id="cfrEmp"><option value="">—</option>' + emps.map(function (e) { return '<option value="' + esc(e.id) + '"' + (e.id === x.empresaId ? ' selected' : '') + '>' + esc(e.fantasia || e.nome || e.id) + '</option>'; }).join('') + '</select>') +
          campo(tr('Só nos meses em que houver…', 'Only in months with…'), '<select id="cfrCond"><option value="receita"' + (x.pjTipo !== 'darf' ? ' selected' : '') + '>' + esc(tr('nota emitida / receita da empresa no mês anterior', 'invoice issued / company revenue in the previous month')) + '</option><option value=""' + (x.pjTipo === 'darf' ? ' selected' : '') + '>' + esc(tr('todo mês', 'every month')) + '</option></select>') +
          '<p class="tiny muted">' + esc(tr('O DAS vence no dia 20 do mês seguinte; em fim de semana ou feriado passa para o próximo dia útil (por isso às vezes dia 22). O DARF do pró-labore (IRRF e INSS) também vence no dia 20, mas antecipa para o dia útil anterior.', 'The DAS is due on the 20th of the next month; on weekends or holidays it moves to the next business day (hence sometimes the 22nd). The pro-labore DARF (income tax and INSS) is also due on the 20th, but moves back to the previous business day.')) + '</p></div>') +
        '<p class="small" style="margin:8px 0 2px"><b>' + esc(tr('Até quando', 'Until when')) + '</b></p>' +
        radio('cfrFim', 'aberto', tr('Em aberto', 'Open-ended'), true) + radio('cfrFim', 'data', tr('Até uma data:', 'Until a date:'), false) + Cal.campo('cfrFimData', '', {}) +
      '</div>' +
      '<p class="aviso-box small" id="cfrPrevia" aria-live="polite"></p>' +
      '<div class="f-actions"><button class="btn" data-close="genModal">' + esc(t('ac.cancelar')) + '</button><button class="btn primary" data-acao="cfs-salvar">' + esc(t('ac.salvar')) + '</button></div>');
    var b = document.getElementById('genBody'); b.oninput = mostra; b.onchange = mostra;
    mostra(); abrir('genModal');
  }
  /* grava e devolve como desfazer */
  function salvar(x, l) {
    var c = cfg(), rec = c.cfRecusadas = c.cfRecusadas || {};
    if (l.tipo === 'frequente') { var fr = c.cfFrequentes = c.cfFrequentes || {}; fr[x.origem] = 1; return function () { delete fr[x.origem]; }; }
    if (l.tipo === 'umavez') { rec[x.chave] = 1; return function () { delete rec[x.chave]; }; }
    var d = { nome: l.nome, valor: l.valor, grupo: l.grupo, sub: l.sub, pagador: l.pagador, dia: l.dia, regra: x.tipo === 'anual' ? 'anual' : 'dia', mes: x.mes || 0,
      janela: l.janela, desde: hoje().slice(0, 7) + '-01', ate: l.ate, varia: l.tipo !== 'fixa',
      obs: tr('Sugerido pelo app: o mesmo recebedor se repete (dia ', 'Suggested by the app: the same payee repeats (day ') + l.janela[0] + '–' + l.janela[1] + ').' };
    if (l.tipo === 'imposto') {
      /* o DAS prorroga para o próximo dia útil; o DARF do pró-labore (IRRF/INSS) antecipa para o dia útil anterior */
      if (x.pjTipo === 'darf') d.diaUtilAnterior = true; else d.diaUtilSeguinte = true; d.escopo = 'reservado';
      if (l.empresaId) { d.empresaId = l.empresaId; if (x.pjTipo) d.pjTipo = x.pjTipo; }
      if (l.condicional === 'receita' && l.empresaId) d.condicional = 'receita';
    }
    var r = Recorrente.add(d);
    return function () { ST.recorrentes = (ST.recorrentes || []).filter(function (y) { return y.id !== r.id; }); };
  }
  function barraDesfazer(msg) {
    var caixa = document.getElementById('toasts'); if (!caixa) return;
    var v = document.getElementById('cfrDesfazer'); if (v) v.remove();
    var d = document.createElement('div'); d.className = 'toast'; d.id = 'cfrDesfazer';
    d.innerHTML = '<span>' + esc(Verter.txt(msg)) + '</span> <button type="button" class="btn sm" data-acao="cfs-desfazer">' + esc(tr('Desfazer', 'Undo')) + '</button>';
    caixa.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.remove(); desfazer = null; }, API._desfazerMs || 10000);
  }
  function cartaoSugestoes() {
    var s = API.sugestoes(); if (!s.length) return '';
    return '<div class="card cfs-atencao"><div class="card-head"><h3>' + esc(tr('Precisa da sua atenção', 'Needs your attention')) + '</h3></div>' + itensSugestoes(s) + '</div>';
  }

  MoneyModulos.registrar({
    id: 'contas-mes', versao: '1.1.0',
    pontos: {
      'custos.contas': cartao,
      'budget.atencao': cartaoSugestoes,
      'inbox.grupos': function () { var s = API.sugestoes(); return s.length ? [{ id: 'contafixa', n: s.length, html: itensSugestoes(s, true) }] : []; },   /* 1.0.1 (3.76) */
      'inbox.itens': function () {
        return API.sugestoes().map(function (x) { return { tipo: 'atencao', ico: '📌', nome: tr('Parece conta fixa', 'Looks like a fixed bill'), valor: x.valor, data: hoje(), sub: x.nome + tr(' — responda no Painel', ' — answer on the Panel') }; });
      }
    },
    acoes: {
      'cm-modo': function (el) { cfg().contasModo = el.dataset.v === '45' ? '45' : 'mes'; Store.salvar(); render(); },
      'cm-arruma': function (el) { cfg().contasArruma = el.dataset.v === 'grupo' ? 'grupo' : 'dia'; Store.salvar(); render(); },
      'cm-abrir': function (el) { if (typeof abrirRecorrente === 'function') abrirRecorrente(el.dataset.id); },
      /* 1.1.0 (3.86): "Revisar" abre a janela curta; "Salvar" grava e oferece "Desfazer" por 10 s */
      'cfs-revisar': function (el) {
        var x = API.sugestoes().filter(function (s) { return s.chave === el.dataset.chave; })[0]; if (x) abrirRevisar(x);
      },
      'cfs-salvar': function () {
        if (!aberta) return; var l = lido();
        if (!(l.valor > 0) && l.tipo !== 'frequente' && l.tipo !== 'umavez') { toast(tr('Informe o valor estimado.', 'Enter the estimated amount.'), 'err'); return; }
        desfazer = salvar(aberta, l); aberta = null;
        Store.salvar(); fechar('genModal'); render(); if (typeof renderInboxN === 'function') renderInboxN();
        barraDesfazer(l.tipo === 'frequente' ? tr('Marcado como gasto frequente.', 'Marked as frequent spending.') : l.tipo === 'umavez' ? tr('Não vamos sugerir de novo.', 'We will not suggest it again.') : tr('Salvo em Contas fixas.', 'Saved in Fixed bills.'));
      },
      'cfs-desfazer': function () {
        if (desfazer) { desfazer(); desfazer = null; Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN(); }
        var v = document.getElementById('cfrDesfazer'); if (v) v.remove();
      },
      'cfs-nao': function (el) { var c = cfg(); c.cfRecusadas = c.cfRecusadas || {}; c.cfRecusadas[el.dataset.chave] = 1; Store.salvar(); render(); }
    }
  });
  window.ContasMes = API;
})();
