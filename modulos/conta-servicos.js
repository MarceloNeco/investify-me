/* =====================================================================
   modulos/conta-servicos.js — SERVIÇO NOVO OU AUMENTO na conta recorrente   1.0.0 · 27/Nov/2026 (3.136)
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono: "essas companhias adoram começar a cobrar mais"; sem IA)
     O robô manda, nas contas de telefone/internet/TV (comprovante, ficha inteira — modulos/comprovantes.js 1.5.0):
       itens_conta [{descricao, quantidade, valor, incluso}] · conta_chave ("vivo-<conta>") e, quando muda contra a fatura anterior
       da mesma conta, mudancas_conta {referencia_anterior, servicos_novos, servicos_que_sairam, aumentos [{descricao, de, para}],
       total_anterior, total_atual, variacao_pct}.
     · Serviço novo (📥, em destaque): "Vivo (conta ···840): serviço novo na fatura de 11/2026 — 'Vivo Música R$ 12,90'. Você contratou?"
         [Sim, contratei] → regra: esse serviço dessa conta não pergunta mais;
         [Não pedi] → o passo a passo para contestar (app da operadora, central, ANATEL 1331) e o aviso fica guardado até o valor
         sumir de uma fatura seguinte da mesma conta (ou "Já resolvi").
     · Aumento (aumentos ou variacao_pct > 0): aviso "Vivo subiu de R$ 49,00 para R$ 54,90 (+12%)", com "ver o que mudou".
     · Serviço que saiu: só informação, dentro do "ver o que mudou".
     · Na ficha do lançamento que pagou a conta: "🧾 serviços desta fatura".
   API (window.ContaServicos)
     conta(x) → {chave, nome, final} · novos(x) → [{k, desc, valor}] · perguntas() · aumentos() · contestados() · fechar()
   DADOS
     ST.config.contaServicos = {aceitos: {chave: {servico: 1}}, contestados: {'chave|servico': {chave, desc, valor, ref, nome, final}},
       vistos: {idDoComprovante: 1}, encerrados: {'idDoComprovante|servico': 1}}
   PONTOS QUE USA
     inbox.grupos ('comprovantes' para a pergunta; 'avisos' para aumento e contestação) · lancamento.form · ações csv-*
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function num(v) { var n = Number(v); return v != null && v !== '' && isFinite(n) ? n : null; }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function cfg() { var c = (ST.config = ST.config || {}); c.contaServicos = c.contaServicos || {}; ['aceitos', 'contestados', 'vistos', 'encerrados'].forEach(function (k) { c.contaServicos[k] = c.contaServicos[k] || {}; }); return c.contaServicos; }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function lista() { return window.Comprovantes ? Comprovantes.abertos() : []; }
  function refK(r) { var s = String(r || ''), a = /^(\d{1,2})\/(\d{4})$/.exec(s), b = /^(\d{4})-(\d{2})/.exec(s); return a ? a[2] + '-' + ('0' + a[1]).slice(-2) : b ? b[1] + '-' + b[2] : ''; }
  function refTxt(x) { return x.referencia || (x.ficha && x.ficha.referencia) || (x.data ? x.data.slice(5, 7) + '/' + x.data.slice(0, 4) : ''); }
  function refDe(x) { return refK(refTxt(x)) || String(x.data || '').slice(0, 7); }
  function desc(s) { return typeof s === 'string' ? s : s && (s.descricao || s.nome || s.servico) || ''; }
  function itens(x) { var l = x.ficha && x.ficha.itens_conta; return Array.isArray(l) ? l.filter(function (i) { return i && desc(i); }) : []; }
  function cobra(i) { return !i.incluso && num(i.valor) > 0; }
  function botao(acao, rot, extra, cls) { return '<button type="button" class="btn sm' + (cls ? ' ' + cls : '') + '" data-acao="' + acao + '"' + (extra || '') + '>' + esc(rot) + '</button>'; }

  var API = {
    conta: function (x) {
      var ch = String(x.ficha && x.ficha.conta_chave || '').slice(0, 80); if (!ch) return null;
      var p = ch.split('-'), dig = p.slice(1).join('').replace(/\D/g, '');
      return { chave: ch, nome: x.loja || p[0].charAt(0).toUpperCase() + p[0].slice(1), final: dig.slice(-3) };
    },
    rotulo: function (c) { return c.nome + (c.final ? ' (' + tr('conta ', 'account ', 'cuenta ') + '···' + c.final + ')' : ''); },
    mudancas: function (x) { var m = x.ficha && x.ficha.mudancas_conta; return m && typeof m === 'object' ? m : null; },
    /* os serviços novos desta fatura, com o valor (o da lista de serviços quando o robô manda só o nome) */
    novos: function (x) {
      var m = API.mudancas(x), its = itens(x); if (!m || !Array.isArray(m.servicos_novos)) return [];
      return m.servicos_novos.map(function (s) {
        var d = desc(s), k = N(d), it = its.find(function (i) { return N(desc(i)) === k; });
        return { k: k, desc: d.slice(0, 120), valor: num(s && s.valor) != null ? num(s.valor) : it ? num(it.valor) : null };
      }).filter(function (s) { return s.k; });
    },
    /* "Você contratou?": o serviço novo que ainda não foi aceito nem contestado */
    perguntas: function () {
      var c = cfg(), r = [];
      lista().forEach(function (x) {
        var ct = API.conta(x); if (!ct) return;
        API.novos(x).forEach(function (s) {
          if ((c.aceitos[ct.chave] || {})[s.k] || c.contestados[ct.chave + '|' + s.k] || c.encerrados[x.id + '|' + s.k]) return;
          r.push({ x: x, conta: ct, s: s });
        });
      });
      return r;
    },
    /* o que subiu (aviso informativo, até "Entendi") */
    aumentos: function () {
      var c = cfg();
      return lista().map(function (x) {
        var m = API.mudancas(x), ct = API.conta(x); if (!m || !ct || c.vistos[x.id]) return null;
        var a = num(m.total_anterior), b = num(m.total_atual), au = Array.isArray(m.aumentos) ? m.aumentos.filter(function (u) { return u && desc(u); }) : [];
        var pct = a > 0 && b != null ? Math.round((b / a - 1) * 100) : num(m.variacao_pct) != null ? Math.round(num(m.variacao_pct)) : null;
        if (!au.length && !(pct > 0)) return null;
        return { x: x, conta: ct, de: a, para: b, pct: pct, aumentos: au };
      }).filter(Boolean);
    },
    /* "Não pedi": continua até o serviço sumir (ou ficar incluso/sem valor) de uma fatura seguinte da mesma conta */
    contestados: function () {
      var c = cfg();
      return Object.keys(c.contestados).map(function (k) {
        var q = c.contestados[k], depois = lista().filter(function (x) { var ct = API.conta(x); return ct && ct.chave === q.chave && refDe(x) > q.ref && itens(x).length; });
        var ult = depois.sort(function (a, b) { return refDe(a) < refDe(b) ? 1 : -1; })[0];
        var ainda = !!ult && itens(ult).some(function (i) { return N(desc(i)) === q.k && cobra(i); });
        return { k: k, q: q, sumiu: !!ult && !ainda, ainda: ainda ? refTxt(ult) : '' };
      });
    },
    fechar: function () { var c = cfg(), mudou = false; API.contestados().forEach(function (o) { if (o.sumiu) { encerrar(o.k); mudou = true; } }); return mudou; },
    texto: function (s) { return "'" + s.desc + (s.valor != null ? ' ' + fmt(s.valor) : '') + "'"; },
    /* "ver o que mudou" */
    oQueMudou: function (x) {
      var m = API.mudancas(x); if (!m) return '';
      var l = [];
      API.novos(x).forEach(function (s) { l.push('➕ ' + tr('novo: ', 'new: ', 'nuevo: ') + s.desc + (s.valor != null ? ' ' + fmt(s.valor) : '')); });
      (Array.isArray(m.aumentos) ? m.aumentos : []).forEach(function (u) { if (desc(u)) l.push('↑ ' + desc(u) + ': ' + (num(u.de) != null ? fmt(num(u.de)) : '?') + ' → ' + (num(u.para) != null ? fmt(num(u.para)) : '?')); });
      (Array.isArray(m.servicos_que_sairam) ? m.servicos_que_sairam : []).forEach(function (s) { if (desc(s)) l.push('➖ ' + tr('saiu: ', 'removed: ', 'salió: ') + desc(s)); });
      if (num(m.total_anterior) != null && num(m.total_atual) != null) l.push(tr('Total: ', 'Total: ', 'Total: ') + fmt(num(m.total_anterior)) + ' → ' + fmt(num(m.total_atual)) + (m.referencia_anterior ? ' (' + tr('antes: ', 'before: ', 'antes: ') + m.referencia_anterior + ')' : ''));
      return l.length ? '<details class="csv-mudou"><summary>' + esc(tr('ver o que mudou', 'see what changed', 'ver qué cambió')) + '</summary>' + l.map(function (t) { return '<div class="small">' + esc(t) + '</div>'; }).join('') + '</details>' : '';
    },
    passos: function (aberto) {
      return '<details class="csv-passos"' + (aberto ? ' open' : '') + '><summary>' + esc(tr('Como contestar', 'How to dispute it', 'Cómo reclamar')) + '</summary><ol class="small" style="margin:4px 0 0 18px;padding:0">' + [
        tr('Abra o app ou o site oficial da operadora (não clique em links do e-mail), procure "Meus serviços" ou "Serviços contratados", cancele o serviço e peça a devolução do que foi cobrado.', 'Open the carrier\'s official app or site (do not click links in the e-mail), look for "My services", cancel the service and ask for a refund of what was charged.', 'Abre la app o la web oficial de la operadora (no hagas clic en los enlaces del correo), busca "Mis servicios", cancela el servicio y pide la devolución de lo cobrado.'),
        tr('Ou ligue para a central da operadora (o número está na fatura), peça o cancelamento e a devolução e anote o número do protocolo.', 'Or call the carrier (the number is on the bill), ask to cancel and refund, and write down the ticket number.', 'O llama a la operadora (el número está en la factura), pide la cancelación y la devolución y apunta el número de reclamación.'),
        tr('Se não resolver, reclame na ANATEL: ligue 1331 (ou pelo site/app Anatel Consumidor), com o protocolo da operadora.', 'If that fails, complain to ANATEL: call 1331 (or use the Anatel Consumidor site/app), with the carrier\'s ticket number.', 'Si no se resuelve, reclama a ANATEL: llama al 1331 (o por la web/app Anatel Consumidor), con el número de la operadora.')
      ].map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol><div class="tiny muted">' + esc(tr('O app confere nas próximas faturas: este aviso some quando o valor sair.', 'The app checks the next bills: this notice goes away when the charge is gone.', 'La app revisa las próximas facturas: este aviso desaparece cuando salga el cargo.')) + '</div></details>';
    },
    /* "🧾 serviços desta fatura" na ficha do lançamento que pagou a conta */
    doGasto: function (g) { return g ? (window.Comprovantes ? Comprovantes.lista() : []).find(function (y) { return (y.pagoId === g.id || y.gastoId === g.id) && itens(y).length; }) || null : null; },
    bloco: function (x) {
      if (!x) return '';
      var its = itens(x);
      return '<details class="bloco-regra csv-servicos"><summary class="bf-tit">🧾 ' + esc(tr('serviços desta fatura', 'services on this bill', 'servicios de esta factura') + ' (' + its.length + ')') + '</summary>' +
        its.map(function (i) { var q = num(i.quantidade); return '<div class="small">' + esc(desc(i) + (q > 1 ? ' · ' + q + '×' : '') + ' · ' + (i.incluso ? tr('incluso', 'included', 'incluido') : num(i.valor) != null ? fmt(num(i.valor)) : '—')) + '</div>'; }).join('') +
        API.oQueMudou(x) + '</details>';
    }
  };

  MoneyModulos.registrar({
    id: 'conta-servicos',
    versao: '1.0.0',
    pontos: {
      'inbox.grupos': function () {
        if (casa() || typeof ST === 'undefined' || !ST) return [];
        if (API.fechar() && typeof Store !== 'undefined') Store.salvar();
        var out = [], h = '', n = 0;
        API.perguntas().forEach(function (p) {
          n++; var d = ' data-ch="' + esc(p.conta.chave) + '" data-k="' + esc(p.s.k) + '" data-id="' + esc(p.x.id) + '"';
          h += '<li class="inb-item csv-novo" style="border-left:4px solid var(--down);padding-left:8px"><div><b style="color:var(--down)">⚠️ ' + esc(API.rotulo(p.conta) + ': ' + tr('serviço novo na fatura de ', 'new service on the bill for ', 'servicio nuevo en la factura de ') + refTxt(p.x) + ' — ' + API.texto(p.s) + '. ' + tr('Você contratou?', 'Did you sign up for it?', '¿Lo contrataste?')) + '</b>' +
            API.oQueMudou(p.x) + '</div><span class="inb-acoes">' + botao('csv-sim', tr('Sim, contratei', 'Yes, I did', 'Sí, lo contraté'), d, 'primary') + botao('csv-nao', tr('Não pedi', 'I did not ask for it', 'No lo pedí'), d) + '</span></li>';
        });
        if (n) out.push({ id: 'comprovantes', n: n, html: h });
        h = ''; n = 0;
        API.contestados().forEach(function (o) {
          n++; var q = o.q;
          h += '<li class="inb-item csv-contestado"><div><b>🚫 ' + esc(tr('Contestando: ', 'Disputing: ', 'Reclamando: ') + q.nome + (q.final ? ' (···' + q.final + ')' : '') + ' — ' + API.texto({ desc: q.desc, valor: q.valor })) + '</b>' +
            '<span class="t-sub">' + esc(o.ainda ? tr('ainda aparece na fatura de ', 'still on the bill for ', 'aún aparece en la factura de ') + o.ainda : tr('apareceu na fatura de ', 'showed up on the bill for ', 'apareció en la factura de ') + q.refTxt + tr('; o app confere a próxima', '; the app checks the next one', '; la app revisa la próxima')) + '</span>' +
            API.passos(q.abrir) + '</div><span class="inb-acoes">' + botao('csv-resolvi', tr('Já resolvi', 'Sorted', 'Ya lo resolví'), ' data-k="' + esc(o.k) + '"') + '</span></li>';
        });
        API.aumentos().forEach(function (a) {
          n++;
          var t = a.de != null && a.para != null ? a.conta.nome + tr(' subiu de ', ' went up from ', ' subió de ') + fmt(a.de) + tr(' para ', ' to ', ' a ') + fmt(a.para) + (a.pct != null ? ' (' + (a.pct >= 0 ? '+' : '') + a.pct + '%)' : '')
            : a.conta.nome + ': ' + desc(a.aumentos[0]) + tr(' subiu', ' went up', ' subió') + (num(a.aumentos[0].de) != null && num(a.aumentos[0].para) != null ? tr(' de ', ' from ', ' de ') + fmt(num(a.aumentos[0].de)) + tr(' para ', ' to ', ' a ') + fmt(num(a.aumentos[0].para)) : '');
          h += '<li class="inb-item csv-aumento"><div><b>📈 ' + esc(t) + '</b><span class="t-sub">' + esc(API.rotulo(a.conta) + ' · ' + tr('fatura de ', 'bill for ', 'factura de ') + refTxt(a.x)) + '</span>' + API.oQueMudou(a.x) + '</div>' +
            '<span class="inb-acoes">' + botao('csv-ok', tr('Entendi', 'Got it', 'Entendido'), ' data-id="' + esc(a.x.id) + '"') + '</span></li>';
        });
        if (n) out.push({ id: 'avisos', n: n, html: h });
        return out;
      },
      'lancamento.form': function (ctx) { return API.bloco(API.doGasto(ctx && ctx.g)); }
    },
    acoes: {
      'csv-sim': function (el) { var c = cfg(), m = c.aceitos[el.dataset.ch] = Object.assign({}, c.aceitos[el.dataset.ch]); m[el.dataset.k] = 1; depois(tr('Anotado: esse serviço não pergunta mais.', 'Noted: this service will not be asked about again.', 'Anotado: ese servicio no se preguntará más.')); },
      'csv-nao': function (el) {
        var x = (window.Comprovantes ? Comprovantes.lista() : []).find(function (y) { return y.id === el.dataset.id; }); if (!x) return;
        var ct = API.conta(x), s = API.novos(x).find(function (v) { return v.k === el.dataset.k; }); if (!ct || !s) return;
        cfg().contestados[ct.chave + '|' + s.k] = { id: x.id, chave: ct.chave, k: s.k, desc: s.desc, valor: s.valor, ref: refDe(x), refTxt: refTxt(x), nome: ct.nome, final: ct.final, abrir: true };
        depois(tr('Guardado: o app avisa até o valor sair da fatura.', 'Saved: the app keeps the notice until the charge leaves the bill.', 'Guardado: la app avisa hasta que el cargo salga de la factura.'));
      },
      'csv-resolvi': function (el) { encerrar(el.dataset.k); depois(); },
      'csv-ok': function (el) { cfg().vistos[el.dataset.id] = 1; depois(); }
    }
  });
  /* a contestação acabou: a pergunta daquela fatura não volta (a mesma cobrança, se o robô a der como nova de novo noutra fatura, pergunta) */
  function encerrar(k) { var c = cfg(), q = c.contestados[k]; if (q && q.id) c.encerrados[q.id + '|' + q.k] = 1; delete c.contestados[k]; }
  function depois(msg) { Store.salvar(); if (msg && typeof toast === 'function') toast(msg); if (typeof abrirInbox === 'function' && document.querySelector('#genModal:not(.hidden) .inb-item')) abrirInbox(); if (typeof render === 'function') render(); if (typeof renderInboxN === 'function') renderInboxN(); }
  window.ContaServicos = API;
})();
