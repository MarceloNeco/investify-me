/* =====================================================================
   modulos/saldo-previsto.js — o saldo previsto da conta, dia a dia, e a sugestão de resgate (3.77)        1.1.1 · 14/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 13/Nov/2026)
     · Para cada conta corrente com saldo vindo do robô (SaldoBanco): parte do saldo de hoje e soma, dia a dia, nos
       próximos 45 dias: as contas fixas a vencer (pela forma de pagamento e pela conta: débito automático e boletos
       dessa conta; o que é pago no cartão entra pela fatura), as faturas de cartão que essa conta paga (a fatura aberta
       que o robô mandou, no vencimento, e os parcelados dos meses seguintes), as rendas previstas e o que a pessoa
       informou como "já resgatei / já agendei".
       Conta do pagamento: com uma conta só, é ela; com mais, a que tem o nome do banco na conta, na forma ou no
       cadastro do cartão; senão, a de maior saldo.
     · Saldo previsto NEGATIVO num dia D → "Precisa da sua atenção" e 📥: "Sua conta <banco> fica negativa em DD/MM
       (−R$ X). Resgate R$ Y até DD/MM−1." Y = o pior buraco dos 45 dias + 5% de folga, arredondado para cima em R$ 100.
       De onde: o investimento mais líquido da carteira (dinheiro em conta; CDB/LCI/LCA de liquidez diária: cai no mesmo
       dia; Tesouro Selic e fundo DI: cai no dia seguinte — "peça até DD/MM−2"); um campo liquidez (dias) na posição manda.
     · Gráfico simples da linha (zero sempre à vista, a parte abaixo de zero em vermelho) no Painel e em Contas fixas.
     · "Já resgatei / já agendei": valor e data; a linha se refaz.
     · Visão da casa: nada (é a conta do chefe).
     · 1.1.0 (3.86): cada aviso diz DE QUEM é a conta ("Itaú do Marcelo ···1292": o banco, a pessoa do app pelo dono que o
       robô manda — o apelido —, o final; sem repetir o banco) e DE QUANDO são os dados ("dados de 13/11 14:44", à direita,
       em letra menor; mais de 24 h → "pode estar desatualizado" em amarelo). "Já agendei" no aviso: valor e data; conta
       como entrada planejada até 2 dias depois da data; o lançamento real (entrada nesta conta, ±5%) o substitui sem contar
       duas vezes; sem o real até 2 dias depois, o aviso volta. As contas atrasadas do 📥 também dizem a conta e a data.
   API (window.SaldoPrevisto)
     contas() · eventos(conta) → [{data, valor, nome}] · linha(conta) → [{data, saldo}] · alerta(conta) → {dia, valor, resgate,
     pedirAte, de: {nome, dias, valor} | null} | null · resgate(buraco) · liquidez(p) · 1.1.0: nome(conta) · dono(conta) ·
     dados(conta) → {txt, velho} · contaDe(recorrente) · substituido(ajuste, conta)
   DADOS
     ST.saldo_ajustes = [{id, contaId, data, valor, nota, criadoEm (1.1.0)}]   (cofre reservado)
   PONTOS QUE USA
     budget.painel · custos.contas · budget.atencao · inbox.grupos ('saldo')
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'saldo_ajustes', DIAS = 45;
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function hoje() { return API._hoje || hojeISO(); }
  function mais(iso, d) { var x = new Date(iso + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); }
  function dm(iso) { return iso.slice(8, 10) + '/' + iso.slice(5, 7); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function ajustes() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function bancoTxt(c) { return N(c.banco || c.conta); }
  function primeiraPalavra(t) { return (N(t).split(' ').filter(function (w) { return w.length >= 3; })[0]) || ''; }

  /* qual conta corrente paga: a que tem o banco no texto; senão a de maior saldo */
  function contaPara(texto) {
    var cs = API.contas(); if (cs.length <= 1) return cs[0] || null;
    var x = N(texto);
    var achou = cs.filter(function (c) { var w = primeiraPalavra(c.banco || c.conta); return w && x.indexOf(w) >= 0; })[0];
    return achou || cs.slice().sort(function (a, b) { return (Number(b.saldo) || 0) - (Number(a.saldo) || 0); })[0];
  }
  function pagoNoCartao(r) { return !!r.cartao || /cr[eé]dito|cart[aã]o/i.test(r.forma || ''); }

  var API = {
    _hoje: null,
    contas: function () {
      if (casa()) return [];
      return (ST.saldos_banco || []).filter(function (r) { return r.tipo === 'conta' && r.saldo != null && !(window.PJ && PJ.ehContaPJ(r)); });   /* 1.0.2 (3.81): sem as contas da PJ */
    },
    eventos: function (conta) {
      var h = hoje(), fim = mais(h, DIAS), ev = [], id = conta.id;
      /* contas fixas e rendas (o que é pago no cartão entra pela fatura) */
      if (typeof Recorrente !== 'undefined') Recorrente.ocorrencias(mais(h, 1), fim).forEach(function (o) {
        var r = o.r; if (!(ESTADOS_PG[o.estado] || {}).conta) return;
        var entra = r.fluxo === 'entrada'; if (!entra && pagoNoCartao(r)) return;
        var c = contaPara([r.conta, r.forma, r.pagador, r.nome].join(' ')); if (!c || c.id !== id) return;
        /* 1.0.2 (3.81): conta da PJ — o dono transfere da PF um dia antes */
        /* 1.0.3 (3.86): até o dia útil anterior (PJ.ateTransferir) */
        if (r.empresaId) { var at = window.PJ && PJ.ateTransferir ? PJ.ateTransferir(o.data) : mais(o.data, -1); if (at > h) ev.push({ data: at, valor: n2(-o.valor), nome: tr('Transferir para a PJ: ', 'Transfer to the company: ') + r.nome }); return; }
        ev.push({ data: o.data, valor: n2(entra ? o.valor : -o.valor), nome: r.nome });
      });
      /* faturas: a aberta que o robô mandou, no vencimento; depois, os parcelados de cada mês */
      (ST.saldos_banco || []).filter(function (x) { return x.tipo === 'cartao' && x.cartao; }).forEach(function (k) {
        var c = contaPara(k.banco + ' ' + (k.conta || '')); if (!c || c.id !== id) return;
        var dia = Number(k.cartao.vence) || 0, v = Number(k.cartao.fatura) || 0; if (!dia || !(v > 0)) return;
        var d = h.slice(0, 8) + ('0' + dia).slice(-2); if (d <= h) d = mais(d.slice(0, 8) + '01', 32).slice(0, 8) + ('0' + dia).slice(-2);
        if (d <= fim) ev.push({ data: d, valor: n2(-v), nome: tr('Fatura ', 'Bill ') + (k.conta || k.banco) });
      });
      /* 1.0.1 (3.80): as pré-autorizações do cartão (pendente e caução) saem no vencimento da fatura em que caem */
      if (window.PreAut) PreAut.ativos().forEach(function (p) {
        var ct = p.cartaoId && typeof Banco !== 'undefined' ? Banco.acharCartao(p.cartaoId) : null, f = ct ? Banco.faturaDe(p.cartaoId, p.data) : null;
        var bn = ct && ct.bancoId && Banco.achar(ct.bancoId) ? Banco.achar(ct.bancoId).nome : (ct ? ct.apelido : p.conta);
        var c = contaPara(bn); if (!c || c.id !== id || !f) return;
        var d = f.vencimento > h ? f.vencimento : mais(h, 1);
        if (d <= fim) ev.push({ data: d, valor: n2(-p.valor), nome: (p.caucao ? '🔒 ' : '⏳ ') + PreAut.quem(p) });
      });
      /* 1.1.1 (3.87): o Pix/pagamento do print numa conta do robô, ainda não entregue */
      if (window.PrintColar) PrintColar.eventos(conta).forEach(function (e) { if (e.data <= fim) ev.push(e); });
      if (window.Parcelados) Parcelados.compras().forEach(function (pc) {
        var ct = pc.cartaoId && typeof Banco !== 'undefined' ? Banco.acharCartao(pc.cartaoId) : null;
        var bn = ct && ct.bancoId && Banco.achar(ct.bancoId) ? Banco.achar(ct.bancoId).nome : (ct ? ct.apelido : '');
        var c = contaPara(bn); if (!c || c.id !== id) return;
        pc.futuras.forEach(function (f) { if (f.data > mais(h, 31) && f.data <= fim) ev.push({ data: f.data, valor: n2(-f.valor), nome: pc.desc + ' ' + f.k + '/' + pc.n }); });
      });
      /* 1.1.0 (3.86): o "Já agendei" conta como entrada planejada até 2 dias depois da data; o real que chegar o substitui */
      ajustes().forEach(function (a) { if (a.contaId === id && mais(a.data, 2) >= h && a.data <= fim && !API.substituido(a, conta)) ev.push({ data: a.data > h ? a.data : mais(h, 1), valor: n2(a.valor), nome: a.nota || tr('Resgate / agendado', 'Redemption / scheduled'), planejado: true }); });
      return ev.sort(function (a, b) { return a.data < b.data ? -1 : 1; });
    },
    linha: function (conta) {
      var h = hoje(), saldo = Number(conta.saldo) || 0, ev = API.eventos(conta), out = [{ data: h, saldo: n2(saldo) }];
      for (var k = 1; k <= DIAS; k++) {
        var d = mais(h, k);
        ev.forEach(function (e) { if (e.data === d) saldo += e.valor; });
        out.push({ data: d, saldo: n2(saldo) });
      }
      return out;
    },
    /* o lançamento real (entrada nesta conta, valor parecido, entre o dia em que foi agendado e 2 dias depois da data) */
    substituido: function (a, conta) {
      var ls = window.SaldoBanco && SaldoBanco.lancamentos ? SaldoBanco.lancamentos(conta) : [], de = String(a.criadoEm || '').slice(0, 10) || mais(a.data, -7);
      return ls.some(function (g) { var v = Math.abs(Number(g.valor) || 0); return (g.fluxo === 'entrada' || g.grupo === 'RENDA' || g.grupo === 'INVESTIMENTO') && g.data >= de && g.data <= mais(a.data, 2) && Math.abs(v - a.valor) <= a.valor * 0.05; });
    },
    /* de quem é a conta (a pessoa do app, pelo dono que o robô manda) e de quando são os dados */
    dono: function (c) {
      var p = c.dono && window.Pessoas && Pessoas.achar ? Pessoas.achar(c.dono) : null, n = p ? Pessoas.rotulo(p) : String(c.dono || '').trim();
      if (!p && /^[a-z]/.test(n)) n = n.charAt(0).toUpperCase() + n.slice(1);
      return { nome: n, fem: p && p.genero ? p.genero === 'f' : /a$/i.test(N(n).split(' ')[0] || '') };
    },
    nome: function (c) {
      var d = API.dono(c), b = String(c.banco || '').trim(), ct = String(c.conta || '').trim();
      var extra = d.nome ? (d.fem ? tr(' da ', ' — ') : tr(' do ', ' — ')) + d.nome : (ct && N(ct).indexOf(N(b)) < 0 && N(b).indexOf(N(ct)) < 0 ? ' ' + ct : '');
      return (b || ct) + extra + (c.final ? ' ···' + c.final : '');
    },
    dados: function (c) {
      var em = c.atualizadoEm && !isNaN(Date.parse(c.atualizadoEm)) ? new Date(Date.parse(c.atualizadoEm)) : null, agora = API._agora || Date.now();
      var dd = function (x) { return ('0' + x).slice(-2); };
      var txt = em ? tr('dados de ', 'data from ') + dd(em.getDate()) + '/' + dd(em.getMonth() + 1) + ' ' + dd(em.getHours()) + ':' + dd(em.getMinutes()) : (c.data ? tr('dados de ', 'data from ') + dm(c.data) : '');
      var t = em ? em.getTime() : (c.data ? Date.parse(c.data + 'T23:59:59') : 0);
      return { txt: txt, velho: !!t && agora - t > 24 * 3600 * 1000 };
    },
    /* a conta corrente que paga esta conta fixa (para os outros avisos que dependem do banco) */
    contaDe: function (r) { if (casa() || !r || pagoNoCartao(r)) return null; return contaPara([r.conta, r.forma, r.pagador, r.nome].join(' ')); },
    resgate: function (buraco) { return Math.ceil(Math.abs(buraco) * 1.05 / 100) * 100; },
    /* dias até o dinheiro cair; null = não serve para resgate rápido */
    liquidez: function (p) {
      if (p.liquidez != null && p.liquidez !== '') return Number(String(p.liquidez).replace(/\D/g, '')) || 0;
      var t = N([p.ticker, p.nome, p.obs].join(' '));
      if (p.tipo === 'caixa') return 0;
      if (p.tipo === 'renda-fixa' && /\b(cdb|lci|lca)\b/.test(t) && /liquidez diaria|\bdi\b|diaria/.test(t)) return 0;
      if (p.tipo === 'renda-fixa' && /tesouro selic|\blft\b/.test(t)) return 1;
      if (p.tipo === 'fundo' && /\bdi\b|referenciado|selic|simples|liquidez/.test(t)) return 1;
      return null;
    },
    deOnde: function (valor) {
      var l = (ST.posicoes || []).map(function (p) { var d = API.liquidez(p); return d == null ? null : { nome: p.nome || p.ticker, dias: d, valor: typeof calc === 'function' ? n2(calc(p).valorBase) : n2(p.valorManual) }; })
        .filter(Boolean).filter(function (x) { return x.valor > 0; });
      var cabe = l.filter(function (x) { return x.valor >= valor; }).sort(function (a, b) { return a.dias - b.dias || b.valor - a.valor; });
      return cabe[0] || l.sort(function (a, b) { return a.dias - b.dias || b.valor - a.valor; })[0] || null;
    },
    alerta: function (conta) {
      var l = API.linha(conta), neg = l.filter(function (x) { return x.saldo < 0; })[0]; if (!neg) return null;
      var pior = l.reduce(function (m, x) { return Math.min(m, x.saldo); }, 0), y = API.resgate(pior), de = API.deOnde(y);
      return { dia: neg.data, valor: neg.saldo, pior: pior, resgate: y, ate: mais(neg.data, -1), pedirAte: mais(neg.data, -1 - (de ? de.dias : 0)), de: de };
    }
  };

  /* ---------- a tela ---------- */
  function nomeConta(c) { return API.nome(c); }
  /* 1.1.0 (3.86): à direita, em letra menor, "dados de 13/11 14:44"; passou de 24 h → "pode estar desatualizado" em amarelo */
  function selo(c) {
    var d = API.dados(c); if (!d.txt) return '';
    return '<span class="tiny sp-dados' + (d.velho ? ' sp-velho' : '') + '" style="margin-left:auto;white-space:nowrap' + (d.velho ? ';color:var(--warn)' : '') + '">' + esc(d.txt + (d.velho ? tr(' · pode estar desatualizado', ' · may be out of date') : '')) + '</span>';
  }
  function formAjuste(c) {
    return '<div class="row sp-form" style="gap:8px;flex-wrap:wrap;margin-top:6px"><input class="sp-valor" inputmode="decimal" placeholder="' + esc(tr('valor (R$)', 'amount (R$)')) + '">' +
      (typeof Cal !== 'undefined' ? Cal.campo('spData' + c.id, mais(hoje(), 1), {}) : '<input id="spData' + esc(c.id) + '" type="date">') +
      '<button class="btn sm primary" data-acao="sp-salvar" data-id="' + esc(c.id) + '">' + esc(tr('Guardar', 'Save')) + '</button></div>';
  }
  function frase(c, a) {
    var s = tr('Sua conta ', 'Your account ') + nomeConta(c) + tr(' fica negativa em ', ' goes negative on ') + dm(a.dia) + ' (−' + fmt(Math.abs(a.valor)) + '). ' +
      tr('Resgate ', 'Redeem ') + fmt(a.resgate) + tr(' até ', ' by ') + dm(a.ate) + '.';
    if (a.de) s += ' ' + tr('De: ', 'From: ') + a.de.nome + ' — ' + (a.de.dias === 0 ? tr('cai no mesmo dia', 'lands the same day') : tr('cai no dia seguinte: peça até ', 'lands the next day: ask by ') + dm(a.pedirAte)) + '.';
    return s;
  }
  function grafico(l) {
    var W = 600, H = 120, P = 6, vs = l.map(function (x) { return x.saldo; }), mn = Math.min(0, Math.min.apply(null, vs)), mx = Math.max(0, Math.max.apply(null, vs));
    if (mx === mn) mx = mn + 1;
    var x = function (i) { return P + i * (W - 2 * P) / (l.length - 1); }, y = function (v) { return P + (mx - v) * (H - 2 * P) / (mx - mn); }, z = y(0);
    var pts = l.map(function (p, i) { return x(i).toFixed(1) + ',' + y(p.saldo).toFixed(1); }).join(' '), id = 'sp' + Math.random().toString(36).slice(2, 7);
    return '<svg class="sp-graf" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="' + esc(tr('Saldo previsto nos próximos 45 dias', 'Forecast balance for the next 45 days')) + '">' +
      '<defs><clipPath id="' + id + 'a"><rect x="0" y="0" width="' + W + '" height="' + z.toFixed(1) + '"/></clipPath><clipPath id="' + id + 'b"><rect x="0" y="' + z.toFixed(1) + '" width="' + W + '" height="' + (H - z).toFixed(1) + '"/></clipPath></defs>' +
      '<line class="sp-zero" x1="0" x2="' + W + '" y1="' + z.toFixed(1) + '" y2="' + z.toFixed(1) + '"/>' +
      '<polyline class="sp-pos" clip-path="url(#' + id + 'a)" points="' + pts + '"/><polyline class="sp-neg" clip-path="url(#' + id + 'b)" points="' + pts + '"/></svg>';
  }
  var aberto = null, aondeForm = 'card';
  function cartao() {
    var cs = API.contas(); if (!cs.length) return '';
    return '<div class="card sp-card"><div class="card-head"><h3>📉 ' + esc(tr('Saldo previsto da conta', 'Forecast account balance')) + '</h3><span class="small muted">' + esc(tr('próximos 45 dias', 'next 45 days')) + '</span></div>' +
      cs.map(function (c) {
        var l = API.linha(c), a = API.alerta(c), fimS = l[l.length - 1].saldo;
        return '<div class="sp-conta"><div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><b>' + esc(nomeConta(c)) + '</b><span class="small">' +
          esc(tr('hoje ', 'today ') + fmt(c.saldo) + ' · ' + tr('em 45 dias ', 'in 45 days ') + fmt(fimS)) + '</span>' + selo(c) + '</div>' + grafico(l) +
          (a ? '<div class="aviso-box sp-alerta"><b>⚠ ' + esc(frase(c, a)) + '</b></div>' : '') +
          '<p class="tiny muted" style="margin:4px 0 0"><button class="linkinho" data-acao="sp-ajustar" data-id="' + esc(c.id) + '">' + esc(tr('Já resgatei / já agendei', 'Already redeemed / scheduled')) + '</button></p>' +
          (aberto === c.id && aondeForm === 'card' ? formAjuste(c) : '') + '</div>';
      }).join('') + '</div>';
  }
  function alertas() { return API.contas().map(function (c) { var a = API.alerta(c); return a ? { c: c, a: a } : null; }).filter(Boolean); }

  MoneyModulos.registrar({
    id: 'saldo-previsto', versao: '1.1.1', colecoes: [COL],
    pontos: {
      'budget.painel': cartao, 'custos.contas': cartao,
      'budget.atencao': function () {
        var l = alertas(); if (!l.length) return '';
        return '<div class="card sp-atencao"><div class="card-head"><h3>' + esc(tr('Precisa da sua atenção', 'Needs your attention')) + '</h3></div>' +
          l.map(function (x) { return '<div class="sp-aviso sp-conta" style="margin:0 0 8px"><div class="row" style="gap:8px;align-items:flex-start"><p class="small" style="margin:0">⚠ ' + esc(frase(x.c, x.a)) + '</p>' + selo(x.c) + '</div>' +
            '<button class="btn sm" data-acao="sp-ajustar" data-onde="atencao" data-id="' + esc(x.c.id) + '">' + esc(tr('Já agendei', 'Already scheduled')) + '</button>' +
            (aberto === x.c.id && aondeForm === 'atencao' ? formAjuste(x.c) : '') + '</div>'; }).join('') + '</div>';
      },
      'inbox.grupos': function () {
        var l = alertas(); if (!l.length) return [];
        return [{ id: 'saldo', n: l.length, html: l.map(function (x) {
          var d = API.dados(x.c);
          return '<li class="inb-item"><div><b>' + esc(frase(x.c, x.a)) + '</b>' + (d.txt ? '<span class="t-sub' + (d.velho ? ' sp-velho' : '') + '"' + (d.velho ? ' style="color:var(--warn)"' : '') + '>' + esc(d.txt + (d.velho ? tr(' · pode estar desatualizado', ' · may be out of date') : '')) + '</span>' : '') + '</div><span class="inb-acoes"><button class="btn sm" data-acao="sp-ajustar" data-onde="atencao" data-id="' + esc(x.c.id) + '" data-close="genModal" data-irpara="b-painel">' +
            esc(tr('Já agendei', 'Already scheduled')) + '</button></span></li>';
        }).join('') }];
      }
    },
    acoes: {
      'sp-ajustar': function (el) { var onde = el.dataset.onde || 'card'; aberto = aberto === el.dataset.id && aondeForm === onde ? null : el.dataset.id; aondeForm = onde; render(); setTimeout(function () { var i = document.querySelector('.view:not(.hidden) .sp-valor'); if (i) i.focus(); }, 60); },
      'sp-salvar': function (el) {
        var box = el.closest('.sp-conta'), v = Number(String((box.querySelector('.sp-valor') || {}).value || '').replace(/\./g, '').replace(',', '.')), d = (box.querySelector('[id^="spData"]') || {}).value;
        if (!(v > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(d || '')) return toast(tr('Diga o valor e a data.', 'Enter the amount and the date.'), 'warn');
        ajustes().push({ id: 'sa' + Date.now().toString(36), contaId: el.dataset.id, data: d, valor: n2(v), nota: tr('Resgate / agendado', 'Redemption / scheduled'), criadoEm: hoje() });
        aberto = null; Store.salvar(); render(); toast(tr('Guardado: a linha do saldo foi refeita.', 'Saved: the balance line was redone.'));
      }
    }
  });
  window.SaldoPrevisto = API;
})();
