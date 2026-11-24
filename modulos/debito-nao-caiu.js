/* =====================================================================
   modulos/debito-nao-caiu.js — O DÉBITO AUTOMÁTICO QUE NÃO CAIU (3.100)        1.1.0 · 24/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (caso real do dono, 23/Nov/2026: a conta de luz no débito automático do cartão não foi debitada em novembro, o app
   mostrou "paga" e só um e-mail de cobrança avisou; o medo é a multa e o corte)
     · Antes: 3 dias antes do vencimento, "A conta X vence dia D no débito automático: confira o saldo ou o limite".
     · No 1º dia útil depois do vencimento, se o débito não apareceu no banco (na conta OU na fatura do cartão, ex.: "PCAUT
       ENERGIA"), alerta vermelho no 📥 (Contas atrasadas) e em Contas do mês: "O débito automático de X (R$ V, venceu em D)
       não apareceu no banco. Pague hoje para evitar multa e corte." [Já paguei] [Foi debitado]. A conta deixa de aparecer como
       paga.
     · Só acusa o que o app consegue ver: o débito daquela conta já caiu antes (até 4 meses) ou o robô traz o cartão/a conta
       de onde ele sai. Débito de um banco que o robô não traz não vira alarme falso todo mês.
     · O pagamento feito depois (Pix ou boleto, ex.: Pix para a Enel em 23/11, que o robô classifica como Habitação › Luz) fecha
       a ocorrência sozinho: a mesma categoria ou o nome, o valor perto (até +30%, multa e juros), até 45 dias depois.
     · O "⛔ não pague: está no débito automático" (modulos/debito-auto.js, comprovantes) só vale até o vencimento; com o débito
       que não caiu, ele some e o comprovante diz "pague".
     · E-mail de aviso de atraso (comprovantes do robô: "contas em atraso", "débito pendente", "aviso de cobrança") vira alerta
       urgente, ligado à conta quando o nome bate.
     · Canais fora do app (Telegram, WhatsApp, e-mail, notificação no celular): no roadmap (PENDENCIAS N79), sem construir.
   1.1.0 (3.102), a conta paga com atraso (caso real do dono: a luz de novembro paga por Pix em 23/11, pelo valor, sem multa; na
     distribuidora a multa e os juros vêm na conta SEGUINTE):
     · atraso(o) → {em, como} | null: o débito não caiu e o pagamento veio depois do 1º dia útil seguinte ao vencimento (Pix,
       boleto ou "Já paguei"; o débito atrasado no próprio cartão/conta do débito não conta). Contas do mês: "Paga com atraso (Pix em
       23/11)", não "paga".
     · avisoMulta(o): na conta seguinte, "pode vir multa e juros da conta de <mês> (paga com atraso)"; se o comprovante ou o e-mail da
       conta trouxer a multa/os juros destacados, "multa por atraso: R$ x".
     · 📥 "Ver com o banco por que o débito automático não caiu" com anotação e "Resolvido" (ST.config.dncBanco); e, 3 dias antes do
       próximo vencimento, "confirme que o débito automático está ativo".
   API (window.DebitoNaoCaiu)
     emDebito(r) · naoCaiu() → [{r, data, valor}] · temNaoCaiu(r) · status(o) → 'paga'|'debito'|'atrasada' · fechar() → n
     antes() → [{r, data, valor}] · avisosEmail() → [{x, r}] · jaPaguei(rid, data) · paraTexto(texto) → r | null
   DADOS
     usa Store.estado.pagamentos (Pagamento.marcar / conciliar); ST.config.dncEmailVisto = {comprovanteId: 1}
     ST.config.dncBanco = {'rid|data': {nota, resolvido}} (1.1.0)
   PONTOS QUE USA
     inbox.grupos ('atrasadas') · evento gasto.novo (fecha com o pagamento que chegar) · ações dnc-*
   ===================================================================== */
(function () {
  'use strict';
  var DIAS_ATRAS = 60, DEPOIS = 45, ANTES = 3, TOL_MAIS = 0.30, TOL_MENOS = 0.15;
  var RX_ATRASO = /em atraso|contas? atrasad|d[eé]bito(s)? pendente|aviso de cobran|fatura vencida|conta vencida|pagamento pendente|evite o corte|suspens[aã]o do fornecimento|negocie seus d[eé]bitos/i;
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function hoje() { return API._hoje || hojeISO(); }
  function mais(d, n) { var x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
  function cfg() { return (ST.config = ST.config || {}); }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function emDebito(r) { return !!r && r.ativo !== false && r.fluxo !== 'entrada' && (r.estadoPadrao === 'automatico' || r.forma === 'debaut' || /d[eé]bito autom/i.test(r.forma || '')); }
  function utilDepois(d) { var x = mais(d, 1), k = 0; while (k++ < 7 && typeof Feriados !== 'undefined' && Feriados.ehNaoUtil && Feriados.ehNaoUtil(x)) x = mais(x, 1); return x; }
  function palavras(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, ' ').split(/\s+/).filter(function (w) { return w.length >= 4 && !/^(conta|contas|pagamento|debito|automatico|mensal|fatura)$/.test(w); }); }
  function nomeBate(texto, r) { var a = palavras([r.nome, r.recebedor, r.contraparte && r.contraparte.nome].join(' ')), b = palavras(texto); return a.some(function (w) { return b.indexOf(w) >= 0; }); }
  /* antes de a conta existir no app não há o que cobrar (como em Contas do mês) */
  function ocorr(de, ate) { return typeof Recorrente === 'undefined' ? [] : Recorrente.ocorrencias(de, ate).filter(function (o) { return emDebito(o.r) && o.estado !== 'cancelado' && !(o.r.criadoEm && o.data < String(o.r.criadoEm).slice(0, 10)); }); }
  /* pago de verdade: o caderninho (confirmado ou marcado) ou um lançamento ligado à conta naquele mês */
  function pago(o) {
    var p = Pagamento.achar(o.r.id, o.data);
    if (p && ESTADOS_PG[p.estado] && !ESTADOS_PG[p.estado].conta) return true;
    return Gasto.todos().some(function (g) { return g.recorrenteId === o.r.id && String(g.data).slice(0, 7) === o.data.slice(0, 7); });
  }
  /* só acusa o que o app consegue ver: o débito já caiu antes (até 4 meses) ou o robô traz o cartão/a conta de onde ele sai.
     Assim, débito de um banco que o robô não traz não vira alarme falso todo mês */
  function visto(o) {
    var de = mais(o.data, -120);
    if (Pagamento.todos().some(function (p) { return p.rid === o.r.id && p.estado === 'confirmado' && p.data < o.data && p.data >= de; })) return true;
    return Gasto.todos().some(function (g) {
      if (g.recorrenteId === o.r.id && g.data < o.data && g.data >= de) return true;
      return g.data > o.data && (g.origem === 'robo' || g.idRobo) && ((o.r.cartaoId && g.cartaoId === o.r.cartaoId) || (o.r.bancoId && g.bancoId === o.r.bancoId));
    });
  }
  /* 1.1.0: pago depois do 1º dia útil seguinte ao vencimento, por outro caminho que não o próprio débito */
  function atraso(o) {
    if (!o || !emDebito(o.r)) return null;
    var p = Pagamento.achar(o.r.id, o.data), lim = utilDepois(o.data), g = null;
    if (p && p.estado === 'pago') { var em = String(p.pagoEm || p.em || '').slice(0, 10); return p.nota === 'ja-paguei' && em > lim ? { em: em, como: '' } : null; }
    if (p && p.estado === 'confirmado' && p.gastoId) g = Gasto.todos().find(function (x) { return x.id === p.gastoId; }) || null;
    if (!g) g = Gasto.todos().find(function (x) { return x.recorrenteId === o.r.id && String(x.data).slice(0, 7) === o.data.slice(0, 7); }) || null;
    if (!g || !g.data || g.data <= lim) return null;
    var t = [g.forma, g.desc, g.descRobo].join(' ');
    if ((o.r.cartaoId && g.cartaoId === o.r.cartaoId) || /d[eé]b(ito)?\.? ?aut|pcaut/i.test(t)) return null;
    return { em: g.data, como: /\bpix\b/i.test(t) ? 'Pix' : /boleto/i.test(t) ? tr('boleto', 'payment slip', 'boleto') : '' };
  }
  function mesNome(d) { return (String(I18n.data(d, { semAno: true })).match(/[A-Za-zÀ-ÿ]{3,}/) || [])[0] || d.slice(5, 7); }
  /* a multa/os juros destacados no comprovante ou e-mail da conta (o texto que o robô trouxe) */
  var RX_MULTA = /(multa|juros|encargos|acr[eé]scimos?)[^\d\n]{0,40}?(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/gi;
  function multaDe(r, de, ate) {
    if (!window.Comprovantes) return 0;
    var t = 0;
    Comprovantes.lista().forEach(function (x) {
      var d = String(x.data || x.recebidoEm || '').slice(0, 10), txt = [x.loja, x.remetente, x.assunto, x.descricao, x.produto].join(' ');
      if (!d || d < de || d > ate || !nomeBate(txt, r)) return;
      var m; RX_MULTA.lastIndex = 0;
      while ((m = RX_MULTA.exec([x.assunto, x.descricao, x.produto].join(' \n ')))) t += Number(m[2].replace(/\./g, '').replace(',', '.')) || 0;
    });
    return n2(t);
  }
  /* a ocorrência anterior da mesma conta, se foi paga com atraso */
  function anteriorAtrasada(o) {
    var l = ocorr(mais(o.data, -45), mais(o.data, -1)).filter(function (x) { return x.r.id === o.r.id; }).sort(function (a, b) { return a.data < b.data ? 1 : -1; });
    var a = l[0]; return a && atraso(a) ? a : null;
  }
  function naoCaiuOc(o, h) { h = h || hoje(); return o.data < h && utilDepois(o.data) <= h && o.data >= mais(h, -DIAS_ATRAS) && !pago(o) && visto(o); }

  /* o pagamento que chegou depois (Pix, boleto) — ou o débito atrasado no cartão — fecha a ocorrência */
  function fechar() {
    var n = 0, h = hoje(), todas = ocorr(mais(h, -DIAS_ATRAS), mais(h, DEPOIS + 31));
    todas.forEach(function (o) {
      if (o.data >= h || pago(o)) return;
      /* o débito perto do vencimento SEGUINTE da mesma conta é dele, não deste */
      var prox = todas.filter(function (x) { return x.r.id === o.r.id && x.data > o.data; }).map(function (x) { return x.data; }).sort()[0];
      var alvo = Gasto.todos().filter(function (g) {
        if (!g.data || g.recorrenteId || g.fluxo === 'entrada' || Number(g.valor) <= 0) return false;
        if (g.data < mais(o.data, -10) || g.data > mais(o.data, DEPOIS) || (prox && g.data >= mais(prox, -10))) return false;
        var mesmaCat = g.grupo === o.r.grupo && String(g.sub || '').toLowerCase() === String(o.r.sub || '').toLowerCase();
        if (!mesmaCat && !nomeBate([g.desc, g.descRobo, g.contraparte && g.contraparte.nome].join(' '), o.r)) return false;
        var v = Number(o.valor) || 0; if (!v) return true;
        return g.valor >= v * (1 - TOL_MENOS) && g.valor <= v * (1 + TOL_MAIS);
      }).sort(function (a, b) { return Math.abs(a.valor - o.valor) - Math.abs(b.valor - o.valor); })[0];
      if (alvo) { Pagamento.conciliar(o.r.id, o.data, alvo.id, alvo.valor); Gasto.atualizar(alvo.id, { recorrenteId: o.r.id }); n++; }
    });
    return n;
  }

  var API = {
    _hoje: null, emDebito: emDebito, fechar: fechar,
    naoCaiu: function () { if (casa()) return []; return ocorr(mais(hoje(), -DIAS_ATRAS), hoje()).filter(function (o) { return naoCaiuOc(o); }).map(function (o) { return { r: o.r, data: o.data, valor: n2(o.valor) }; }); },
    temNaoCaiu: function (r) { return !!r && API.naoCaiu().some(function (x) { return x.r.id === r.id; }); },
    /* Contas do mês: a conta no débito automático só é "paga" quando o débito (ou o pagamento) apareceu */
    /* o que o app não consegue ver (débito nunca visto) continua como antes: passou a data, conta como paga */
    status: function (o, h) { h = h || hoje(); if (pago(o)) return 'paga'; if (o.data >= h) return 'debito'; if (!visto(o)) return 'paga'; return naoCaiuOc(o, h) ? 'atrasada' : 'debito'; },
    antes: function () { if (casa()) return []; var h = hoje(); return ocorr(h, mais(h, ANTES)).filter(function (o) { return !pago(o); }).map(function (o) { return { r: o.r, data: o.data, valor: n2(o.valor) }; }); },
    jaPaguei: function (rid, data, nota) { return Pagamento.marcar(rid, data, 'pago', { nota: nota || 'debito-nao-caiu', pagoEm: hoje() }); },
    atraso: atraso,
    /* 1.1.0: na conta seguinte, o aviso da multa (ou a multa destacada, quando veio) */
    avisoMulta: function (o) {
      var a = o && anteriorAtrasada(o); if (!a) return null;
      var v = multaDe(o.r, a.data, mais(o.data, 15));
      return { mes: mesNome(a.data), de: a.data, valor: v, texto: v ? tr('multa por atraso: ', 'late fee: ', 'recargo por atraso: ') + fmt(v) + tr(' (da conta de ', ' (from the ', ' (de la factura de ') + mesNome(a.data) + tr(')', ' bill)', ')')
        : tr('pode vir multa e juros da conta de ', 'late fees and interest from the ', 'pueden venir recargo e intereses de la factura de ') + mesNome(a.data) + tr(' (paga com atraso)', ' bill may come (paid late)', ' (pagada con atraso)') };
    },
    /* 1.1.0: as contas pagas com atraso nos últimos 60 dias ("ver com o banco") */
    atrasos: function () { if (casa()) return []; var h = hoje(); return ocorr(mais(h, -DIAS_ATRAS), h).map(function (o) { var a = atraso(o); return a ? { r: o.r, data: o.data, valor: n2(o.valor), em: a.em, como: a.como } : null; }).filter(Boolean); },
    bancoDe: function (rid, data) { return ((cfg().dncBanco || {})[rid + '|' + data]) || {}; },
    /* o boleto/e-mail de uma conta cujo débito não caiu */
    paraTexto: function (texto) { var l = API.naoCaiu(); var x = l.find(function (y) { return nomeBate(texto, y.r); }); return x ? x.r : null; },
    avisosEmail: function () {
      if (casa() || !window.Comprovantes) return [];
      var visto = cfg().dncEmailVisto || {}, rs = typeof Recorrente !== 'undefined' ? Recorrente.ativos().filter(emDebito) : [];
      return Comprovantes.lista().filter(function (x) { return x.estado !== 'dispensado' && !visto[x.id] && RX_ATRASO.test([x.assunto, x.descricao, x.produto].join(' ')); })
        .map(function (x) { var t = [x.loja, x.remetente, x.assunto, x.descricao].join(' '); return { x: x, r: rs.find(function (r) { return nomeBate(t, r); }) || null }; });
    }
  };

  /* ---------- 📥 ---------- */
  function botao(acao, rot, extra, cls) { return '<button type="button" class="btn sm' + (cls ? ' ' + cls : '') + '" data-acao="' + acao + '"' + (extra || '') + '>' + esc(rot) + '</button>'; }
  function frase(x) {
    return tr('O débito automático de ', 'The auto-debit of ', 'El débito automático de ') + x.r.nome + ' (' + fmt(x.valor) + tr(', venceu em ', ', due on ', ', venció el ') + I18n.data(x.data) +
      tr(') não apareceu no banco. Pague hoje para evitar multa e corte.', ') did not show up at the bank. Pay today to avoid late fees and a service cut.', ') no apareció en el banco. Paga hoy para evitar recargos y el corte.');
  }
  MoneyModulos.registrar({
    id: 'debito-nao-caiu', versao: '1.1.0',
    pontos: {
      'inbox.grupos': function () {
        if (casa() || typeof Recorrente === 'undefined') return [];
        if (fechar() && typeof Store !== 'undefined') Store.salvar();
        var h = '', n = 0, nc = API.naoCaiu();
        nc.forEach(function (x) {
          n++; var d = ' data-r="' + esc(x.r.id) + '" data-d="' + esc(x.data) + '"';
          h += '<li class="inb-item dnc-item" style="border-left:4px solid var(--down);padding-left:8px"><div><b style="color:var(--down)">⛔ ' + esc(frase(x)) + '</b>' +
            '<span class="t-sub">' + esc(tr('Se já pagou por Pix ou boleto, o app liga sozinho quando o pagamento aparecer.', 'If you already paid by Pix or slip, the app links it when the payment shows up.', 'Si ya pagaste por Pix o boleto, la app lo vincula cuando aparezca el pago.')) + '</span></div>' +
            '<span class="inb-acoes">' + botao('dnc-paguei', tr('Já paguei', 'Already paid', 'Ya pagué'), d, 'primary') + botao('dnc-debitado', tr('Foi debitado', 'It was debited', 'Se debitó'), d) + '</span></li>';
        });
        API.avisosEmail().forEach(function (a) {
          n++;
          h += '<li class="inb-item dnc-email" style="border-left:4px solid var(--down);padding-left:8px"><div><b style="color:var(--down)">📧 ' + esc(tr('Aviso de atraso por e-mail', 'Overdue notice by e-mail', 'Aviso de atraso por correo') + (a.r ? ': ' + a.r.nome : '') + ' — ' + (a.x.assunto || a.x.loja || a.x.remetente || '')) + '</b>' +
            '<span class="t-sub">' + esc(tr('Confira no app ou site oficial (não clique no e-mail) e pague para evitar o corte.', 'Check the official app or site (do not click the e-mail) and pay to avoid a cut.', 'Compruébalo en la app o web oficial (no hagas clic en el correo) y paga para evitar el corte.')) + '</span></div>' +
            '<span class="inb-acoes">' + botao('dnc-email-ok', tr('Entendi', 'Got it', 'Entendido'), ' data-id="' + esc(a.x.id) + '"') + '</span></li>';
        });
        API.atrasos().forEach(function (x) {
          var k = x.r.id + '|' + x.data, b = API.bancoDe(x.r.id, x.data); if (b.resolvido) return; n++;
          var d = ' data-k="' + esc(k) + '"';
          h += '<li class="inb-item dnc-banco"><div><b>🏦 ' + esc(tr('Ver com o banco por que o débito automático de ', 'Ask the bank why the auto-debit of ', 'Consulta con el banco por qué no se hizo el débito automático de ') + x.r.nome + tr(' não caiu', ' did not go through', '')) + '</b>' +
            '<span class="t-sub">' + esc(tr('Venceu em ', 'Due on ', 'Venció el ') + I18n.data(x.data) + ' · ' + tr('paga com atraso', 'paid late', 'pagada con atraso') + (x.como ? ' (' + x.como + tr(' em ', ' on ', ' el ') + I18n.data(x.em) + ')' : ' (' + I18n.data(x.em) + ')')) + '</span>' +
            '<div class="row" style="gap:6px;margin-top:4px"><input class="dnc-nota" data-k="' + esc(k) + '" maxlength="200" placeholder="' + esc(tr('anotação (o que o banco disse)', 'note (what the bank said)', 'nota (lo que dijo el banco)')) + '" value="' + esc(b.nota || '') + '" style="flex:1;min-width:10em">' +
            botao('dnc-nota-ok', tr('Guardar', 'Save', 'Guardar'), d + ' data-inb-fica="1"') + botao('dnc-resolvido', tr('Resolvido', 'Resolved', 'Resuelto'), d, 'primary') + '</div></div></li>';
        });
        API.antes().forEach(function (x) {
          n++;
          var am = API.avisoMulta(x), conf = am ? ' ' + tr('Confirme que o débito automático está ativo (o de ', 'Make sure the auto-debit is active (the ', 'Confirma que el débito automático está activo (el de ') + am.mes + tr(' não caiu).', ' one did not go through).', ' no se hizo).') : '';
          h += '<li class="inb-item dnc-antes"><div><b>🔄 ' + esc(x.r.nome + tr(' vence ', ' is due ', ' vence ') + I18n.data(x.data, { semAno: true }) + tr(' no débito automático: confira o saldo ou o limite.', ' on auto-debit: check the balance or the limit.', ' en débito automático: revisa el saldo o el límite.') + conf) + '</b><span class="t-sub">' + esc(fmt(x.valor) + (am ? ' · ' + am.texto : '')) + '</span></div></li>';
        });
        return n ? [{ id: 'atrasadas', n: n, html: h }] : [];
      }
    },
    acoes: {
      'dnc-paguei': function (el) { API.jaPaguei(el.dataset.r, el.dataset.d, 'ja-paguei'); depois(); },
      'dnc-debitado': function (el) { API.jaPaguei(el.dataset.r, el.dataset.d, 'foi-debitado'); depois(); },
      'dnc-nota-ok': function (el) { var i = document.querySelector('.dnc-nota[data-k="' + el.dataset.k + '"]'); var m = cfg().dncBanco = Object.assign({}, cfg().dncBanco); m[el.dataset.k] = Object.assign({}, m[el.dataset.k], { nota: i ? String(i.value || '').trim().slice(0, 200) : '' }); Store.salvar(); toast(tr('Anotação guardada.', 'Note saved.', 'Nota guardada.')); },
      'dnc-resolvido': function (el) { var i = document.querySelector('.dnc-nota[data-k="' + el.dataset.k + '"]'); var m = cfg().dncBanco = Object.assign({}, cfg().dncBanco); m[el.dataset.k] = Object.assign({}, m[el.dataset.k], { resolvido: hoje() }, i && i.value ? { nota: String(i.value).trim().slice(0, 200) } : {}); depois(); },
      'dnc-email-ok': function (el) { cfg().dncEmailVisto = Object.assign({}, cfg().dncEmailVisto); cfg().dncEmailVisto[el.dataset.id] = 1; depois(); }
    },
    ouvir: { 'gasto.novo': function () { if (typeof Recorrente !== 'undefined' && fechar() && typeof Store !== 'undefined') Store.salvar(); } }
  });
  function depois() { Store.salvar(); if (typeof render === 'function') render(); if (typeof renderInboxN === 'function') renderInboxN(); }
  window.DebitoNaoCaiu = API;
})();
