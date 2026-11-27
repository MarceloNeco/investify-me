/* =====================================================================
   modulos/consorcio.js — o "mergulho" no consórcio ao tocar no custo (3.121)        1.0.0 · 26/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 26/Nov/2026; sem IA, sem integração nova)
     O robô lê o extrato do consórcio e manda um comprovante com id "consorcio-<grupo>-<cota>" e a ficha (modulos/comprovantes.js
     1.3.0): ficha.consorcio = {grupo, cota, bem, tipo: 'auto'|'imovel', valor_credito, prazo_meses, parcelas_pagas, parcelas_a_pagar,
     parcela_atual, total_pago, total_a_pagar, percentual_pago, parcelas: [{parcela, data_pagamento, valor}]}. É informação: não vai
     para o 📥.
     · Tocar no custo (o lançamento da parcela, ou a conta fixa dela) mostra, no detalhe, a cota: "🏠 Consórcio imóvel · grupo 1234 ·
       cota 56 — 45 de 200 parcelas (22,5%) · pago R$ X · falta R$ Y · crédito R$ Z" e a barra do quanto já foi pago; "Ver as
       parcelas" e "Ver todos os consórcios".
     · "Todos os consórcios": uma janela com cada cota (o mesmo resumo) e o total, com o filtro "🚗 Auto · 🏠 Imóvel · Ambos"
       (guardado no aparelho da pessoa); tocar numa cota abre as parcelas (nº, data do pagamento, valor).
     · Qual cota é a do lançamento: a parcela com o mesmo valor (até 1%) e a data de pagamento a até 5 dias; senão, o grupo e a cota
       escritos na descrição; senão, se a descrição fala de consórcio e só há uma cota do tipo (auto pelo grupo Veículo, imóvel pela
       Habitação), ela.
   API (window.Consorcio)
     cotas(tipo?) → [{id, grupo, cota, bem, tipo, credito, prazo, pagas, aPagar, atual, pago, falta, pct, parcelas}] · doGasto(g) → cota | null
     resumo(c) → texto curto · total(lista) → {pago, falta, credito, n}
   PONTOS QUE USA
     lancamento.form · recorrente.linha (Contas fixas: "🏠 45/200 (22,5%)") · ações cs-*
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function num(v) { if (v == null || v === '') return null; if (typeof v === 'number') return isFinite(v) ? v : null; var t = String(v).trim(); if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); var n = Number(t); return isFinite(n) ? n : null; }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function dataIso(d) { var s = String(d || ''), m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s); return m ? m[3] + '-' + m[2] + '-' + m[1] : s.slice(0, 10); }
  function dias(a, b) { return Math.abs(Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000)); }
  function tipoDe(f) { var t = N(f.tipo || f.bem); return /auto|veic|carro|moto/.test(t) ? 'auto' : 'imovel'; }
  function ico(t) { return t === 'auto' ? '🚗' : '🏠'; }
  function rotTipo(t) { return t === 'auto' ? tr('Consórcio auto', 'Car consortium', 'Consorcio de auto') : tr('Consórcio imóvel', 'Property consortium', 'Consorcio inmobiliario'); }

  var API = {
    cotas: function (tipo) {
      var l = (window.Comprovantes ? Comprovantes.lista() : []).filter(function (x) { return x.ficha && x.ficha.consorcio && x.estado !== 'dispensado'; }).map(function (x) {
        var f = x.ficha.consorcio, pagas = num(f.parcelas_pagas), prazo = num(f.prazo_meses), pct = num(f.percentual_pago);
        var parcelas = (Array.isArray(f.parcelas) ? f.parcelas : []).map(function (p) { return { n: num(p.parcela), data: dataIso(p.data_pagamento), valor: num(p.valor) }; })
          .filter(function (p) { return p.valor != null; }).sort(function (a, b) { return (a.n || 0) - (b.n || 0); });
        return { id: x.id, grupo: String(f.grupo || ''), cota: String(f.cota || ''), bem: String(f.bem || ''), tipo: tipoDe(f), credito: num(f.valor_credito), prazo: prazo,
          pagas: pagas, aPagar: num(f.parcelas_a_pagar), atual: num(f.parcela_atual), pago: num(f.total_pago), falta: num(f.total_a_pagar),
          pct: pct != null ? pct : (pagas != null && prazo ? pagas / prazo * 100 : null), parcelas: parcelas };
      });
      return tipo && tipo !== 'ambos' ? l.filter(function (c) { return c.tipo === tipo; }) : l;
    },
    doGasto: function (g) {
      if (!g || g.fluxo === 'entrada') return null;
      var l = API.cotas(), d = g.data, v = Math.abs(Number(g.valor) || 0), txt = N([g.descRobo, g.desc].join(' '));
      /* a parcela do extrato (valor e data) só vale quando o lançamento tem cara de consórcio (o texto ou a categoria): um aluguel do mesmo
         valor e dia não vira consórcio */
      var cara = /consorc|carta|cota|portoseg|porto seg/.test(txt) || /amortiza|presta|consorc/.test(N(g.sub));
      var porParcela = cara && l.find(function (c) { return c.parcelas.some(function (p) { return p.data && d && dias(p.data, d) <= 5 && Math.abs(p.valor - v) <= Math.max(0.5, p.valor * 0.01); }); });
      if (porParcela) return porParcela;
      var porTexto = l.find(function (c) { return c.grupo && c.cota && txt.indexOf(N(c.grupo)) >= 0 && txt.indexOf(N(c.cota)) >= 0; });
      if (porTexto) return porTexto;
      if (!/consorc/.test(txt)) return null;
      var t = g.grupo === 'VEICULO' ? 'auto' : g.grupo === 'HABITACAO' ? 'imovel' : '', doTipo = l.filter(function (c) { return !t || c.tipo === t; });
      return doTipo.length === 1 ? doTipo[0] : null;
    },
    total: function (l) { return l.reduce(function (t, c) { t.pago += c.pago || 0; t.falta += c.falta || 0; t.credito += c.credito || 0; t.n++; return t; }, { pago: 0, falta: 0, credito: 0, n: 0 }); },
    resumo: function (c) {
      return [rotTipo(c.tipo) + (c.bem ? ' (' + c.bem + ')' : ''), c.grupo ? tr('grupo ', 'group ', 'grupo ') + c.grupo : '', c.cota ? tr('cota ', 'share ', 'cuota ') + c.cota : ''].filter(Boolean).join(' · ');
    },
    numeros: function (c) {
      return [c.pagas != null && c.prazo ? c.pagas + tr(' de ', ' of ', ' de ') + c.prazo + tr(' parcelas', ' installments', ' cuotas') + (c.pct != null ? ' (' + String(Math.round(c.pct * 10) / 10).replace('.', ',') + '%)' : '') : '',
        c.pago != null ? tr('pago ', 'paid ', 'pagado ') + fmt(c.pago) : '', c.falta != null ? tr('falta ', 'remaining ', 'falta ') + fmt(c.falta) : '',
        c.credito != null ? tr('crédito ', 'credit ', 'crédito ') + fmt(c.credito) : '', c.atual != null ? tr('parcela atual ', 'current installment ', 'cuota actual ') + fmt(c.atual) : ''].filter(Boolean).join(' · ');
    }
  };

  function barra(c) { var p = Math.max(0, Math.min(100, c.pct || 0)); return '<div class="fc-barra" role="img" aria-label="' + esc(Math.round(p) + '% ' + tr('pago', 'paid', 'pagado')) + '"><span class="fc-gasto" style="width:' + p.toFixed(1) + '%;background:var(--accent)"></span></div>'; }
  function cartaoCota(c, op) {
    return '<div class="cs-cota" data-id="' + esc(c.id) + '"><div><b>' + ico(c.tipo) + ' ' + esc(API.resumo(c)) + '</b></div><div class="small">' + esc(API.numeros(c)) + '</div>' + barra(c) +
      (op && op.botoes ? '<p style="margin:6px 0 0"><button type="button" class="btn sm" data-acao="cs-parcelas" data-id="' + esc(c.id) + '">' + esc(tr('Ver as parcelas', 'See installments', 'Ver las cuotas')) + '</button> ' +
        '<button type="button" class="btn sm" data-acao="cs-todos">' + esc(tr('Ver todos os consórcios', 'See all consortiums', 'Ver todos los consorcios')) + '</button></p>' : '') + '</div>';
  }
  function filtro() { try { return localStorage.getItem('moneytrio.consorcio.filtro') || 'ambos'; } catch (e) { return 'ambos'; } }
  function todos() {
    var f = filtro(), l = API.cotas(f), t = API.total(l);
    var chip = function (v, txt) { return '<button type="button" class="chip click' + (f === v ? ' on' : '') + '" data-acao="cs-filtro" data-v="' + v + '">' + esc(txt) + '</button>'; };
    $('#genTitle').textContent = tr('Seus consórcios', 'Your consortiums', 'Tus consorcios');
    $('#genBody').innerHTML = Verter.html('<div class="row" style="gap:6px;flex-wrap:wrap;margin:0 0 8px">' + chip('auto', '🚗 ' + tr('Auto', 'Car', 'Auto')) + chip('imovel', '🏠 ' + tr('Imóvel', 'Property', 'Inmueble')) + chip('ambos', tr('Ambos', 'Both', 'Ambos')) + '</div>' +
      (l.length ? '<p class="small cs-total"><b>' + esc(t.n + tr(' cota(s)', ' share(s)', ' cuota(s)') + ' · ' + tr('pago ', 'paid ', 'pagado ') + fmt(n2(t.pago)) + ' · ' + tr('falta ', 'remaining ', 'falta ') + fmt(n2(t.falta)) + ' · ' + tr('crédito ', 'credit ', 'crédito ') + fmt(n2(t.credito))) + '</b></p>' +
        l.map(function (c) { return '<div class="cs-item" style="padding:8px 0;border-top:1px solid var(--line)">' + cartaoCota(c) + '<button type="button" class="linkinho" data-acao="cs-parcelas" data-id="' + esc(c.id) + '">' + esc(tr('ver as parcelas', 'see installments', 'ver las cuotas')) + '</button></div>'; }).join('')
        : '<p class="small muted">' + esc(tr('Nenhum consórcio deste tipo ainda. O robô traz o extrato quando chega no e-mail.', 'No consortium of this type yet. The robot brings the statement when it arrives by e-mail.', 'Aún no hay consorcio de este tipo. El robot trae el extracto cuando llega al correo.')) + '</p>') +
      '<div class="f-actions"><button class="btn primary" data-close="genModal">' + esc(tr('Fechar', 'Close', 'Cerrar')) + '</button></div>');
    abrir('genModal');
  }
  function parcelas(id) {
    var c = API.cotas().find(function (x) { return x.id === id; }); if (!c) return;
    $('#genTitle').textContent = ico(c.tipo) + ' ' + API.resumo(c);
    $('#genBody').innerHTML = Verter.html('<p class="small">' + esc(API.numeros(c)) + '</p>' + barra(c) +
      (c.parcelas.length ? '<div class="tbl-wrap"><table class="tbl cs-parc"><thead><tr><th>' + esc(tr('Parcela', 'Installment', 'Cuota')) + '</th><th>' + esc(tr('Pago em', 'Paid on', 'Pagado el')) + '</th><th class="num">' + esc(tr('Valor', 'Amount', 'Importe')) + '</th></tr></thead><tbody>' +
        c.parcelas.slice().reverse().map(function (p) { return '<tr><td>' + esc(p.n != null ? String(p.n) : '—') + '</td><td>' + esc(p.data ? I18n.data(p.data) : '—') + '</td><td class="num">' + esc(fmt(p.valor)) + '</td></tr>'; }).join('') + '</tbody></table></div>'
        : '<p class="small muted">' + esc(tr('O extrato não trouxe a lista das parcelas.', 'The statement did not include the installment list.', 'El extracto no trajo la lista de cuotas.')) + '</p>') +
      '<div class="f-actions"><button class="btn" data-acao="cs-todos">' + esc(tr('Todos os consórcios', 'All consortiums', 'Todos los consorcios')) + '</button><button class="btn primary" data-close="genModal">' + esc(tr('Fechar', 'Close', 'Cerrar')) + '</button></div>');
    abrir('genModal');
  }

  MoneyModulos.registrar({
    id: 'consorcio', versao: '1.0.0', colecoes: [], telas: {}, ouvir: {},
    pontos: {
      /* a conta fixa do consórcio (Contas fixas): um atalho para a cota */
      'recorrente.linha': function (ctx) {
        var r = ctx && ctx.r; if (!r) return '';
        var c = API.doGasto({ desc: r.nome, descRobo: r.nome, grupo: r.grupo, valor: r.valor, fluxo: r.fluxo }); if (!c) return '';
        return ' <button type="button" class="linkinho cs-atalho" data-acao="cs-parcelas" data-id="' + esc(c.id) + '">' + ico(c.tipo) + ' ' + esc((c.pagas != null && c.prazo ? c.pagas + '/' + c.prazo : tr('consórcio', 'consortium', 'consorcio')) + (c.pct != null ? ' (' + String(Math.round(c.pct * 10) / 10).replace('.', ',') + '%)' : '')) + '</button>';
      },
      'lancamento.form': function (ctx) { var c = API.doGasto(ctx && ctx.g); return c ? '<div class="bloco-regra cs-bloco-cota"><span class="bf-tit">' + esc(tr('Consórcio', 'Consortium', 'Consorcio')) + '</span>' + cartaoCota(c, { botoes: true }) + '</div>' : ''; }
    },
    acoes: {
      'cs-todos': function () { if (typeof fechar === 'function') fechar('assetModal'); todos(); },
      'cs-filtro': function (el) { try { localStorage.setItem('moneytrio.consorcio.filtro', el.dataset.v); } catch (e) { /* sem armazenamento */ } todos(); },
      'cs-parcelas': function (el) { if (typeof fechar === 'function') fechar('assetModal'); parcelas(el.dataset.id); }
    }
  });
  window.Consorcio = API;
})();
