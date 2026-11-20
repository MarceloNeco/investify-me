/* =====================================================================
   modulos/transf-agendada.js — TRANSFERÊNCIA AGENDADA NO BANCO entre contas da família, com prazo (3.91)        1.0.1 · 20/Nov/2026
   ---------------------------------------------------------------------
   1.0.1 (3.92): "Renovei" tem data-inb-fica — o 📥 não se redesenha e o campo da nova data não some.
   O QUE FAZ (pedido do dono, 18/Nov/2026; sem IA)
     · Contas fixas → "+ Adicionar" → "Transferência agendada no banco": valor, de qual conta para qual conta, dia do mês,
       a data em que o agendamento começou e o prazo máximo do banco (12 meses, editável). Ex.: Pix de R$ 700 todo mês da
       conta de uma pessoa da casa para a conta de outra (financiamento): o banco para sozinho depois de 12 meses e, se
       ninguém renovar, vem atraso e multa.
     · 📥: 30 e 7 dias antes de acabar, "O agendamento de R$ 700 para a <conta> acaba em DD/MM. Renove no app do banco.";
       depois de acabar, o aviso fica até renovar. "Renovei" pede a nova data de início.
     · O saldo previsto (modulos/saldo-previsto.js) conta cada transferência que ainda está no prazo (sai de uma conta, entra
       na outra); acabou e não chegou no mês → o aviso de saldo da conta de destino cita a causa provável.
     · A mesma transferência entre contas da família em 3 meses seguidos, sem agendamento cadastrado → 📥 "Parece um
       agendamento: cadastrar o prazo?".
     · Diferente do modulos/agendamentos.js (N37: a CONTA FIXA paga por "Agendado no banco", com "vale até"): aqui é a
       transferência entre contas da família, que não é gasto.
     · Visão da casa: nada (é do chefe; a coleção é reservada).
   API (window.TransfAgendada)
     lista() · ativos() · primeira(a) · ultima(a) → 'AAAA-MM-DD' · datas(a, de, ate) · eventos(conta, de, ate) · causa(conta)
     sugestoes() · avisos()
   DADOS
     ST.transf_agendadas = [{id, valor, de, deNome, para, paraNome, dia, inicio, meses, nota, renovadoEm?}]   (de/para: id do saldo
     do banco ou texto) · ST.config.agSugVistas = {chave: 1}
   PONTOS QUE USA
     custos.adicionar · custos.topo · inbox.grupos ('avisos') · ações tg-*
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'transf_agendadas';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function hoje() { return API._hoje || hojeISO(); }
  function cfg() { return (ST.config = ST.config || {}); }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function mais(iso, d) { var x = new Date(iso + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); }
  function somaMes(mes, k) { var a = +mes.slice(0, 4), m = +mes.slice(5, 7) - 1 + k; a += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return a + '-' + ('0' + (m + 1)).slice(-2); }
  function noDia(mes, dia) { var u = new Date(+mes.slice(0, 4), +mes.slice(5, 7), 0).getDate(); return mes + '-' + ('0' + Math.min(dia, u)).slice(-2); }
  function contas() { return (ST.saldos_banco || []).filter(function (x) { return x.tipo === 'conta' || x.tipo === 'poupanca'; }); }
  function nomeConta(id, txt) { var c = contas().find(function (x) { return x.id === id; }); return c ? (window.SaldoPrevisto && SaldoPrevisto.nome ? SaldoPrevisto.nome(c) : c.banco) : (txt || id || ''); }

  var API = {
    _hoje: null, lista: lista,
    ativos: function () { return lista().filter(function (a) { return !a.encerrado; }); },
    /* a 1ª transferência: o dia do mês na data de início ou depois */
    primeira: function (a) { var d = noDia(a.inicio.slice(0, 7), a.dia); return d >= a.inicio ? d : noDia(somaMes(a.inicio.slice(0, 7), 1), a.dia); },
    /* a última dentro do prazo do banco */
    ultima: function (a) { var p = API.primeira(a); return noDia(somaMes(p.slice(0, 7), (Number(a.meses) || 12) - 1), a.dia); },
    datas: function (a, de, ate) {
      var out = [], p = API.primeira(a), u = API.ultima(a), m = p.slice(0, 7);
      for (var k = 0; k < 400; k++) { var d = noDia(m, a.dia); if (d > u || d > ate) break; if (d >= de) out.push(d); m = somaMes(m, 1); }
      return out;
    },
    /* o saldo previsto: sai da conta de origem e entra na de destino, enquanto está no prazo */
    eventos: function (conta, de, ate) {
      if (casa()) return [];
      var ev = [];
      API.ativos().forEach(function (a) {
        var sai = a.de === conta.id, entra = a.para === conta.id; if (!sai && !entra) return;
        API.datas(a, de, ate).forEach(function (d) { ev.push({ data: d, valor: n2(entra ? a.valor : -a.valor), nome: '🔁 ' + tr('Agendado: ', 'Scheduled: ', 'Programado: ') + (entra ? nomeConta(a.de, a.deNome) : nomeConta(a.para, a.paraNome)) }); });
      });
      return ev;
    },
    /* acabou o prazo e o dinheiro não chegou neste mês: a causa provável do aviso de saldo da conta de destino */
    causa: function (conta) {
      if (casa()) return '';
      var h = hoje(), mes = h.slice(0, 7);
      var a = API.ativos().find(function (x) {
        if (x.para !== conta.id || API.ultima(x) >= h) return false;
        var chegou = (typeof Transferencia !== 'undefined' ? Transferencia.todas() : []).concat(Gasto.todos().filter(function (g) { return g.fluxo === 'entrada'; }))
          .some(function (t) { return String(t.data).slice(0, 7) === mes && Math.abs((Number(t.valor) || 0) - x.valor) <= x.valor * 0.01; });
        return !chegou;
      });
      return a ? tr('Causa provável: o agendamento de ', 'Likely cause: the scheduled transfer of ', 'Causa probable: la transferencia programada de ') + fmt(a.valor) + tr(' vindo da conta ', ' from the account ', ' desde la cuenta ') + nomeConta(a.de, a.deNome) +
        tr(' acabou em ', ' ended on ', ' terminó el ') + I18n.data(API.ultima(a)) + tr('. Renove no app do banco.', '. Renew it in the bank app.', '. Renuévala en la app del banco.') : '';
    },
    /* 📥: 30 e 7 dias antes; depois de acabar, até renovar */
    avisos: function () {
      if (casa()) return [];
      var h = hoje(), vistos = cfg().inboxVistos || {}, out = [];
      API.ativos().forEach(function (a) {
        var u = API.ultima(a), falta = Math.round((Date.parse(u + 'T12:00:00Z') - Date.parse(h + 'T12:00:00Z')) / 86400000);
        var etapa = falta < 0 ? 'acabou' : falta <= 7 ? '7' : falta <= 30 ? '30' : ''; if (!etapa) return;
        var k = 'ag|' + a.id + '|' + u + '|' + etapa; if (etapa !== 'acabou' && vistos[k]) return;
        out.push({ a: a, k: k, etapa: etapa, ultima: u });
      });
      return out;
    },
    /* a mesma transferência entre contas da família em 3 meses seguidos, sem agendamento */
    sugestoes: function () {
      if (casa() || typeof Transferencia === 'undefined') return [];
      var por = {}, vistas = cfg().agSugVistas || {};
      Transferencia.todas().forEach(function (t) {
        var v = Number(t.valor) || 0; if (!(v > 0) || !t.data) return;
        var k = N(t.banco) + '|' + (window.Origem ? Origem.chaveDesc(t.desc) : N(t.desc)) + '|' + Math.round(v);
        (por[k] = por[k] || []).push(t);
      });
      return Object.keys(por).map(function (k) {
        var ts = por[k], meses = {}; ts.forEach(function (t) { meses[String(t.data).slice(0, 7)] = t; });
        var ms = Object.keys(meses).sort(), seguidos = 1, melhor = 1;
        for (var i = 1; i < ms.length; i++) { seguidos = somaMes(ms[i - 1], 1) === ms[i] ? seguidos + 1 : 1; melhor = Math.max(melhor, seguidos); }
        if (melhor < 3 || vistas[k]) return null;
        var u = meses[ms[ms.length - 1]], v = n2(u.valor);
        if (lista().some(function (a) { return Math.abs(a.valor - v) <= v * 0.01; })) return null;
        return { chave: k, valor: v, dia: +String(u.data).slice(8, 10), banco: u.banco || '', desc: u.desc || '', desde: meses[ms[0]].data };
      }).filter(Boolean);
    }
  };

  /* ---------- o formulário ---------- */
  function val(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }
  function campo(rot, h) { return '<label class="field"><span>' + esc(rot) + '</span>' + h + '</label>'; }
  function selConta(id, atual, txt) {
    var cs = contas();
    return '<select id="' + id + '"><option value="">' + esc(tr('Outra (escrever)', 'Other (type it)', 'Otra (escribir)')) + '</option>' + cs.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === atual ? ' selected' : '') + '>' + esc(nomeConta(c.id)) + '</option>'; }).join('') + '</select>' +
      '<input id="' + id + 'T" maxlength="60" placeholder="' + esc(tr('ou escreva: banco e de quem', 'or type: bank and whose', 'o escribe: banco y de quién')) + '" value="' + esc(txt || '') + '" style="margin-top:4px">';
  }
  function abrirForm(a) {
    a = a || {};
    $('#genTitle').textContent = a.id ? tr('Transferência agendada', 'Scheduled transfer', 'Transferencia programada') : tr('Nova transferência agendada no banco', 'New scheduled bank transfer', 'Nueva transferencia programada en el banco');
    $('#genBody').innerHTML = Verter.html('<p class="small muted" style="margin:0 0 8px">' + esc(tr('O banco só agenda por um prazo (em geral 12 meses) e depois para sozinho. O app avisa 30 e 7 dias antes, para você renovar a tempo. Ex.: Pix de R$ 700 todo mês da sua conta para a conta de outra pessoa da casa (financiamento): se o agendamento acaba e ninguém percebe, vem atraso e multa.',
      'The bank only schedules for a limited time (usually 12 months) and then stops on its own. The app warns you 30 and 7 days before, so you can renew in time. E.g. a R$ 700 Pix every month from your account to another household member\'s (a financing payment): if the schedule ends unnoticed, it is late and there is a fine.',
      'El banco solo programa por un plazo (en general 12 meses) y luego se detiene solo. La app avisa 30 y 7 días antes para que lo renueves a tiempo. Ej.: un Pix de R$ 700 cada mes de tu cuenta a la de otra persona de casa (financiación): si la programación termina sin que nadie lo note, llega el retraso y la multa.')) + '</p>' +
      '<div class="grid g2">' + campo(tr('Valor (R$)', 'Amount (R$)', 'Importe (R$)'), '<input id="tgValor" inputmode="decimal" value="' + (a.valor ? String(a.valor).replace('.', ',') : '') + '">') +
      campo(tr('Dia do mês', 'Day of the month', 'Día del mes'), '<input id="tgDia" type="number" min="1" max="31" inputmode="numeric" value="' + (a.dia || '') + '">') +
      campo(tr('De qual conta', 'From which account', 'Desde qué cuenta'), selConta('tgDe', a.de, a.deNome)) +
      campo(tr('Para qual conta', 'To which account', 'A qué cuenta'), selConta('tgPara', a.para, a.paraNome)) +
      campo(tr('O agendamento começou em', 'The schedule started on', 'La programación empezó el'), '<input id="tgInicio" type="date" value="' + esc(a.inicio || hoje()) + '">') +
      campo(tr('Prazo máximo do banco (meses)', 'Bank\'s maximum term (months)', 'Plazo máximo del banco (meses)'), '<input id="tgMeses" type="number" min="1" max="120" inputmode="numeric" value="' + (a.meses || 12) + '">') + '</div>' +
      campo(tr('Para que é (opcional)', 'What it is for (optional)', 'Para qué es (opcional)'), '<input id="tgNota" maxlength="80" value="' + esc(a.nota || '') + '">') +
      '<div class="f-actions">' + (a.id ? '<button class="btn" data-acao="tg-apagar" data-id="' + esc(a.id) + '">' + esc(tr('Apagar', 'Delete', 'Borrar')) + '</button>' : '') +
      '<button class="btn" data-close="genModal">' + esc(t('ac.cancelar')) + '</button><button class="btn primary" data-acao="tg-salvar" data-id="' + esc(a.id || '') + '"' + (a.sug ? ' data-sug="' + esc(a.sug) + '"' : '') + '>' + esc(t('ac.salvar')) + '</button></div>');
    delete $('#genBody').dataset.inbox;
    abrir('genModal');
  }
  function depois() { Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN(); }

  function cartao() {
    if (casa() || !API.ativos().length) return '';
    return '<div class="card tg-card"><div class="card-head"><h3>🔁 ' + esc(tr('Transferências agendadas no banco', 'Scheduled bank transfers', 'Transferencias programadas en el banco')) + '</h3></div>' +
      API.ativos().map(function (a) {
        var u = API.ultima(a), acabou = u < hoje();
        return '<div class="row" style="justify-content:space-between;gap:8px;padding:6px 0;border-top:1px solid var(--line)"><span><b>' + fmt(a.valor) + '</b> ' + esc(nomeConta(a.de, a.deNome) + ' → ' + nomeConta(a.para, a.paraNome)) +
          '<span class="t-sub">' + esc(tr('todo dia ', 'every month on day ', 'cada mes el día ') + a.dia + ' · ' + (acabou ? tr('acabou em ', 'ended on ', 'terminó el ') : tr('acaba em ', 'ends on ', 'termina el ')) + I18n.data(u)) + '</span></span>' +
          '<span><button class="btn sm" data-acao="tg-editar" data-id="' + esc(a.id) + '">' + esc(tr('Editar', 'Edit', 'Editar')) + '</button></span></div>';
      }).join('') + '</div>';
  }

  MoneyModulos.registrar({
    id: 'transf-agendada', versao: '1.0.1', colecoes: [COL],
    pontos: {
      'custos.adicionar': function () {
        return [{ ico: '🔁', pt: 'Transferência agendada no banco', en: 'Scheduled bank transfer', es: 'Transferencia programada en el banco',
          dpt: 'Pix ou TED que o banco faz todo mês por um prazo (ex.: 12 meses): o app avisa antes de acabar.', den: 'A Pix or wire the bank makes every month for a limited time (e.g. 12 months): the app warns before it ends.', des: 'Pix o transferencia que el banco hace cada mes por un plazo (p. ej., 12 meses): la app avisa antes de que termine.', acao: 'tg-novo' }];
      },
      'custos.topo': cartao,
      'inbox.grupos': function () {
        var h = '', n = 0;
        API.avisos().forEach(function (x) {
          n++;
          var frase = x.etapa === 'acabou'
            ? tr('O agendamento de ', 'The scheduled transfer of ', 'La transferencia programada de ') + fmt(x.a.valor) + tr(' para a conta ', ' to the account ', ' a la cuenta ') + nomeConta(x.a.para, x.a.paraNome) + tr(' acabou em ', ' ended on ', ' terminó el ') + I18n.data(x.ultima) + tr('. Renove no app do banco.', '. Renew it in the bank app.', '. Renuévala en la app del banco.')
            : tr('O agendamento de ', 'The scheduled transfer of ', 'La transferencia programada de ') + fmt(x.a.valor) + tr(' para a conta ', ' to the account ', ' a la cuenta ') + nomeConta(x.a.para, x.a.paraNome) + tr(' acaba em ', ' ends on ', ' termina el ') + I18n.data(x.ultima) + tr('. Renove no app do banco.', '. Renew it in the bank app.', '. Renuévala en la app del banco.');
          h += '<li class="inb-item"><div><b>' + (x.etapa === '30' ? '🔁 ' : '⚠ ') + esc(frase) + '</b><span class="t-sub tg-renovar-box" data-id="' + esc(x.a.id) + '"></span></div><span class="inb-acoes">' +
            '<button class="btn sm primary" data-acao="tg-renovei" data-inb-fica="1" data-id="' + esc(x.a.id) + '">' + esc(tr('Renovei', 'I renewed it', 'La renové')) + '</button>' +
            (x.etapa !== 'acabou' ? '<button class="btn sm" data-acao="inb-visto" data-k="' + esc(x.k) + '">' + esc(tr('ok, entendi', 'ok, got it', 'vale, entendido')) + '</button>' : '') + '</span></li>';
        });
        API.sugestoes().forEach(function (s) {
          n++;
          h += '<li class="inb-item"><div><b>🔁 ' + esc(tr('Parece um agendamento: ', 'Looks like a scheduled transfer: ', 'Parece una transferencia programada: ') + fmt(s.valor) + ' · ' + s.desc + tr(' · todo dia ~', ' · every month on day ~', ' · cada mes el día ~') + s.dia + tr('. Cadastrar o prazo?', '. Add its term?', '. ¿Registrar el plazo?')) + '</b><span class="t-sub">' + esc(s.banco + tr(' · desde ', ' · since ', ' · desde ') + I18n.data(s.desde)) + '</span></div><span class="inb-acoes">' +
            '<button class="btn sm primary" data-acao="tg-da-sug" data-k="' + esc(s.chave) + '">' + esc(tr('Cadastrar', 'Add', 'Registrar')) + '</button><button class="btn sm" data-acao="tg-sug-nao" data-k="' + esc(s.chave) + '">' + esc(tr('Não é', 'It is not', 'No lo es')) + '</button></span></li>';
        });
        return n ? [{ id: 'avisos', n: n, html: h }] : [];
      }
    },
    acoes: {
      'tg-novo': function () { abrirForm(null); },
      'tg-editar': function (el) { abrirForm(lista().find(function (a) { return a.id === el.dataset.id; })); },
      'tg-salvar': function (el) {
        var v = n2(Number(val('tgValor').replace(/\./g, '').replace(',', '.'))), dia = Number(val('tgDia')), ini = val('tgInicio');
        if (!(v > 0) || !(dia >= 1 && dia <= 31) || !/^\d{4}-\d{2}-\d{2}$/.test(ini)) return toast(tr('Diga o valor, o dia e a data de início.', 'Enter the amount, the day and the start date.', 'Indica el importe, el día y la fecha de inicio.'), 'warn');
        var d = { valor: v, dia: dia, inicio: ini, meses: Math.max(1, Number(val('tgMeses')) || 12), de: val('tgDe'), deNome: val('tgDeT'), para: val('tgPara'), paraNome: val('tgParaT'), nota: val('tgNota') };
        var a = el.dataset.id && lista().find(function (x) { return x.id === el.dataset.id; });
        if (a) Object.assign(a, d); else lista().push(Object.assign({ id: 'ag' + Date.now().toString(36) }, d));
        if (el.dataset.sug) (cfg().agSugVistas = cfg().agSugVistas || {})[el.dataset.sug] = 1;
        fechar('genModal'); depois();
        toast(tr('Agendamento guardado: o app avisa antes de acabar.', 'Schedule saved: the app warns before it ends.', 'Programación guardada: la app avisa antes de que termine.'));
      },
      'tg-apagar': function (el) { ST[COL] = lista().filter(function (a) { return a.id !== el.dataset.id; }); fechar('genModal'); depois(); },
      /* "Renovei": a nova data de início, ali mesmo */
      'tg-renovei': function (el) {
        var box = document.querySelector('.tg-renovar-box[data-id="' + el.dataset.id + '"]'); if (!box) return;
        box.innerHTML = '<span class="row" style="gap:6px;margin-top:4px">' + esc(tr('Novo início: ', 'New start: ', 'Nuevo inicio: ')) + '<input type="date" id="tgNovo' + esc(el.dataset.id) + '" value="' + hoje() + '"><button class="btn sm primary" data-acao="tg-renovar-ok" data-id="' + esc(el.dataset.id) + '">' + esc(t('ac.salvar')) + '</button></span>';
      },
      'tg-renovar-ok': function (el) {
        var a = lista().find(function (x) { return x.id === el.dataset.id; }), d = val('tgNovo' + el.dataset.id); if (!a || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
        a.inicio = d; a.renovadoEm = hoje(); depois();
        toast(tr('Renovado: acaba em ', 'Renewed: ends on ', 'Renovada: termina el ') + I18n.data(API.ultima(a)) + '.');
      },
      'tg-da-sug': function (el) {
        var s = API.sugestoes().find(function (x) { return x.chave === el.dataset.k; }); if (!s) return;
        var de = contas().find(function (c) { return N(c.banco).split(' ')[0] === N(s.banco).split(' ')[0]; });
        abrirForm({ valor: s.valor, dia: s.dia, inicio: s.desde, meses: 12, de: de ? de.id : '', deNome: de ? '' : s.banco, paraNome: s.desc, sug: s.chave });
      },
      'tg-sug-nao': function (el) { (cfg().agSugVistas = cfg().agSugVistas || {})[el.dataset.k] = 1; depois(); }
    }
  });
  window.TransfAgendada = API;
})();
