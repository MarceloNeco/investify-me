/* =====================================================================
   modulos/declaracao-escolhas.js — importar a declaração do IR COM ESCOLHAS (3.65)        1.0.0 · 11/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (leitura por texto, como já era; nada de IA)
     Ao importar a declaração (TaxONE → Declarações), antes de salvar, uma lista de escolhas, cada uma com uma frase:
     [x] Patrimônio com os Bens e Direitos de 31/12: imóveis, veículos, consórcio e previdência entram como patrimônio
         SEM LIQUIDEZ (modulos/patrimonio-iliquido.js), com "de quem é" e a dívida do financiamento ao lado (se a
         declaração trouxer). Os que já existem são atualizados; os novos vêm desmarcados, para confirmar um a um.
         Contas e investimentos aparecem para conferir no InvestifyONE (não viram posição sozinhos).
     [ ] Restituição como renda prevista (DESMARCADO: pode cair na malha, atrasar ou vir errada). Marcando, vira um
         compromisso de renda numa data só (a do lote), "a confirmar" quando cair.
     [ ] Imposto a pagar → compromissos (cota única ou até 8 quotas, no último dia útil de cada mês, a partir de maio).
     [x] Conferir as deduções (saúde e educação) da declaração com os lançamentos marcados para IR no app: o que falta
         de um lado ou do outro.
   API (window.DeclEscolhas)
     html(d) · ler() · aplicar(d, escolhas) → resumo · conferir(d) → {saude:{dec, app, so*}, educacao:{…}}
   PONTOS QUE USA
     declaracao.escolhas (abrirDeclaracao, só quando é nova) · salvarDeclaracaoTela chama ler() e aplicar()
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  var SEM_LIQUIDEZ = { '01': 'imovel', '02': 'outro', '99': 'outro' };
  function tipoIliq(b) { if (/previd/i.test(b.desc)) return 'previdencia'; if (/cons[oó]rcio/i.test(b.desc)) return 'outro'; return SEM_LIQUIDEZ[b.grupo] || ''; }
  function nomeBem(b) { return String(b.desc || '').replace(/\s+/g, ' ').split(/[.,;]/)[0].slice(0, 60) || (tr('Bem ', 'Asset ') + b.grupo + '.' + b.codigo); }
  /* pagamentos da declaração: códigos de saúde (09–26) e educação (01–02) */
  function classe(cod) { var c = Number(cod); return c >= 1 && c <= 2 ? 'educacao' : (c >= 9 && c <= 26 ? 'saude' : ''); }
  function casaOpcoes() { return window.Pessoas ? Pessoas.ativas().filter(function (p) { return p.tipo === 'casa'; }) : []; }

  var API = {
    bens: function (d) {
      return (d.itensBens || []).map(function (b, i) {
        var tp = tipoIliq(b); if (!tp || !(b.depois > 0)) return null;
        var ja = window.PatrimonioIliquido ? PatrimonioIliquido.lista().find(function (x) { return N(x.nome) === N(nomeBem(b)) || (x.decRef && x.decRef === b.grupo + '.' + b.codigo + '|' + N(b.desc).slice(0, 40)); }) : null;
        return { i: i, b: b, tipo: tp, nome: nomeBem(b), ja: ja };
      }).filter(Boolean);
    },
    liquidos: function (d) { return (d.itensBens || []).filter(function (b) { return !tipoIliq(b) && b.depois > 0; }); },
    html: function (d) {
      if (!d) return '';
      var bens = API.bens(d), liq = API.liquidos(d), div = d.dividas || [], casa = casaOpcoes();
      var exe = d.exercicio || (d.anoCalendario ? d.anoCalendario + 1 : new Date().getFullYear());
      var h = '<div class="card dec-esc"><div class="card-head"><h3>' + esc(tr('O que fazer com esta declaração', 'What to do with this return')) + '</h3></div>';
      h += '<label class="linha-check"><input type="checkbox" id="deBens"' + (bens.length ? ' checked' : ' disabled') + '> <span><b>' + esc(tr('Atualizar o patrimônio com os Bens e Direitos de 31/12', 'Update net worth with the assets at 31/12')) + '</b><br><span class="small muted">' +
        esc(tr('Imóvel e veículo entram como patrimônio sem liquidez. Os que já existem são atualizados; os novos, você confirma um a um.', 'Property and vehicles go in as non-liquid assets. Existing ones are updated; you confirm each new one.')) + '</span></span></label>';
      if (bens.length) {
        h += '<ul class="dec-bens">' + bens.map(function (x) {
          var donos = '<select class="de-dono" data-i="' + x.i + '"><option value="">' + esc(tr('de quem é', 'whose')) + '</option>' + casa.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(Pessoas.rotulo(p)) + '</option>'; }).join('') + '</select>';
          var dv = div.length && x.tipo === 'imovel' ? '<select class="de-div" data-i="' + x.i + '"><option value="">' + esc(tr('sem dívida', 'no debt')) + '</option>' + div.map(function (v, k) {
            var auto = /financ|caixa|habita/i.test(v.desc) && /financ|caixa|habita|minha casa/i.test(x.b.desc);
            return '<option value="' + k + '"' + (auto ? ' selected' : '') + '>' + esc(String(v.desc).slice(0, 40) + ' · ' + fmt(v.depois)) + '</option>'; }).join('') + '</select>' : '';
          return '<li><label class="linha-check small"><input type="checkbox" class="de-bem" data-i="' + x.i + '"' + (x.ja ? ' checked' : '') + '> ' + esc(x.nome) + ' · <b>' + fmt(x.b.depois) + '</b> ' +
            '<span class="muted">' + esc(x.ja ? tr('(já existe: atualizar)', '(exists: update)') : tr('(novo: confirme)', '(new: confirm)')) + '</span></label>' + donos + dv + '</li>';
        }).join('') + '</ul>';
      }
      if (liq.length) h += '<p class="tiny muted" style="margin:2px 0 8px">' + esc(tr('Contas e investimentos (' + liq.length + ') ficam para conferir no InvestifyONE: ', 'Accounts and investments (' + liq.length + ') to check in InvestifyONE: ') +
        liq.slice(0, 6).map(function (b) { return nomeBem(b) + ' ' + fmt(b.depois); }).join(' · ')) + '</p>';
      h += '<label class="linha-check"><input type="checkbox" id="deRest"' + (d.restituir > 0 ? '' : ' disabled') + '> <span><b>' + esc(tr('Lançar a restituição como renda prevista', 'Add the refund as expected income')) + (d.restituir > 0 ? ' · ' + fmt(d.restituir) : '') + '</b><br><span class="small muted">' +
        esc(tr('Desmarcado de propósito: pode cair na malha, atrasar ou vir diferente. Marcando, entra na data do lote, a confirmar quando cair.', 'Off on purpose: it may be held, delayed or differ. If ticked, it goes in on the batch date, to confirm when it lands.')) + '</span>' +
        ' <input type="date" id="deRestData" value="' + exe + '-07-31" aria-label="' + esc(tr('data do lote', 'batch date')) + '"></span></label>';
      h += '<label class="linha-check"><input type="checkbox" id="dePagar"' + (d.pagar > 0 ? '' : ' disabled') + '> <span><b>' + esc(tr('Imposto a pagar / quotas → compromissos', 'Tax due / instalments → commitments')) + (d.pagar > 0 ? ' · ' + fmt(d.pagar) : '') + '</b><br><span class="small muted">' +
        esc(tr('No último dia útil de cada mês, a partir de maio.', 'On the last business day of each month, from May.')) + '</span> <select id="deQuotas">' +
        [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return '<option value="' + n + '">' + (n === 1 ? tr('cota única', 'single payment') : n + tr(' quotas', ' instalments')) + '</option>'; }).join('') + '</select></span></label>';
      h += '<label class="linha-check"><input type="checkbox" id="deConf" checked> <span><b>' + esc(tr('Conferir as deduções com o app', 'Check deductions against the app')) + '</b><br><span class="small muted">' +
        esc(tr('Saúde e educação da declaração × os lançamentos marcados para IR: o que falta de um lado ou do outro.', 'Health and education in the return × entries marked for tax: what is missing on either side.')) + '</span></span></label>';
      return h + '</div>';
    },
    ler: function () {
      var q = function (s) { return document.querySelector(s); };
      if (!q('.dec-esc')) return null;
      var bens = [];
      document.querySelectorAll('.de-bem').forEach(function (c) {
        if (!c.checked) return;
        var i = c.dataset.i, dn = q('.de-dono[data-i="' + i + '"]'), dv = q('.de-div[data-i="' + i + '"]');
        bens.push({ i: Number(i), dono: dn ? dn.value : '', divida: dv && dv.value !== '' ? Number(dv.value) : null });
      });
      return { bens: q('#deBens') && q('#deBens').checked ? bens : [], rest: !!(q('#deRest') && q('#deRest').checked), restData: (q('#deRestData') || {}).value || '',
        pagar: !!(q('#dePagar') && q('#dePagar').checked), quotas: Number((q('#deQuotas') || {}).value) || 1, conf: !!(q('#deConf') && q('#deConf').checked) };
    },
    aplicar: function (d, e) {
      if (!e) return null;
      var r = { bens: 0, novos: 0, rest: false, quotas: 0, conf: null }, todos = API.bens(d);
      e.bens.forEach(function (sel) {
        var x = todos.find(function (t) { return t.i === sel.i; }); if (!x || !window.PatrimonioIliquido) return;
        var p = sel.dono && window.Pessoas ? Pessoas.porId(sel.dono) : null, dv = sel.divida != null ? (d.dividas || [])[sel.divida] : null;
        var obs = [p ? tr('De ', 'Owner: ') + Pessoas.rotulo(p) : '', dv ? tr('Dívida: ', 'Debt: ') + String(dv.desc).slice(0, 60) + ' · ' + fmt(dv.depois) : ''].filter(Boolean).join(' · ');
        var data = (d.anoCalendario || (d.exercicio - 1)) + '-12-31', o = x.ja;
        if (o) { o.valor = Math.round(x.b.depois * 100) / 100; o.data = data; if (obs) o.obs = obs; r.bens++; }
        else { o = PatrimonioIliquido.adicionar({ nome: x.nome, tipo: x.tipo, inst: '', valor: x.b.depois, data: data, obs: obs }); r.novos++; }
        o.decRef = x.b.grupo + '.' + x.b.codigo + '|' + N(x.b.desc).slice(0, 40);
        if (p) { o.dono = Pessoas.rotulo(p); o.donoId = p.id; }
        if (dv) o.divida = { desc: String(dv.desc).slice(0, 80), valor: dv.depois };
      });
      var exe = d.exercicio || (d.anoCalendario + 1);
      if (e.rest && d.restituir > 0 && typeof Recorrente !== 'undefined') {
        var dt = /^\d{4}-\d{2}-\d{2}$/.test(e.restData) ? e.restData : exe + '-07-31';
        Recorrente.add({ nome: tr('Restituição do IR ', 'Tax refund ') + exe, valor: d.restituir, grupo: 'RENDA', sub: tr('Restituição IR', 'Tax refund'), regra: 'dia', dia: Number(dt.slice(8, 10)),
          desde: dt.slice(0, 8) + '01', ate: dt, estadoPadrao: 'pendente', obs: tr('a confirmar quando cair (malha, atraso)', 'to confirm when it lands') });
        r.rest = true;
      }
      if (e.pagar && d.pagar > 0 && typeof Recorrente !== 'undefined') {
        var n = Math.max(1, Math.min(8, e.quotas)), ate = new Date(Date.UTC(exe, 4 + n - 1, 28)).toISOString().slice(0, 10);
        Recorrente.add({ nome: tr('IR ', 'Income tax ') + exe + (n > 1 ? tr(' — quotas', ' — instalments') : tr(' — cota única', ' — single payment')), valor: Math.round(d.pagar / n * 100) / 100, grupo: 'BANCARIOS', sub: tr('Imposto de renda', 'Income tax'),
          regra: 'dia', dia: -1, desde: exe + '-05-01', ate: ate, estadoPadrao: 'pendente' });
        r.quotas = n;
      }
      if (e.conf) r.conf = API.conferir(d);
      return r;
    },
    conferir: function (d) {
      var ano = String(d.anoCalendario || (d.exercicio - 1)), out = {};
      ['saude', 'educacao'].forEach(function (k) {
        var dec = (d.pagamentos || []).filter(function (p) { return classe(p.codigo) === k; }).map(function (p) { return { nome: p.nome, valor: (p.valor || 0) - (p.naoDedutivel || 0) }; });
        var app = (typeof Gasto !== 'undefined' ? Gasto.todos() : []).filter(function (g) {
          return g.irpf && String(g.data || '').slice(0, 4) === ano && (k === 'saude' ? g.grupo === 'SAUDE' : (g.grupo === 'DEPENDENTES' && /escola|col[eé]gio|faculd|educa|curso/i.test(g.sub)));
        });
        var parecido = function (a, b) { return window.Profissionais ? Profissionais.parecido(Profissionais.norm(a), Profissionais.norm(b)) >= 0.5 : N(a) === N(b); };
        var soDec = dec.filter(function (x) { return !app.some(function (g) { return parecido(x.nome, g.desc) || parecido(x.nome, g.sub); }); });
        var soApp = app.filter(function (g) { return !dec.some(function (x) { return parecido(x.nome, g.desc) || parecido(x.nome, g.sub); }); });
        out[k] = { dec: dec.reduce(function (s, x) { return s + x.valor; }, 0), app: app.reduce(function (s, g) { return s + (Number(g.valor) || 0); }, 0),
          soDec: soDec, soApp: soApp.map(function (g) { return { desc: g.desc, valor: g.valor, data: g.data }; }) };
      });
      return out;
    },
    /* o resultado da conferência, numa janela depois de salvar */
    mostrarConferencia: function (c) {
      if (!c) return;
      var bloco = function (k, rot) {
        var x = c[k], dif = Math.round((x.dec - x.app) * 100) / 100;
        return '<h4 class="bl-sub">' + esc(rot) + '</h4><p class="small">' + esc(tr('Declaração ', 'Return ') + fmt(x.dec) + tr(' · app (marcados IR) ', ' · app (marked for tax) ') + fmt(x.app)) +
          (Math.abs(dif) > 1 ? ' · <b class="down">' + esc(tr('diferença ', 'difference ') + fmt(dif)) + '</b>' : ' · <b class="up">✓</b>') + '</p>' +
          (x.soDec.length ? '<p class="tiny muted" style="margin:0">' + esc(tr('Só na declaração: ', 'Only in the return: ') + x.soDec.slice(0, 8).map(function (y) { return y.nome + ' ' + fmt(y.valor); }).join(' · ')) + '</p>' : '') +
          (x.soApp.length ? '<p class="tiny muted" style="margin:0">' + esc(tr('Só no app: ', 'Only in the app: ') + x.soApp.slice(0, 8).map(function (y) { return y.desc + ' ' + fmt(y.valor); }).join(' · ')) + '</p>' : '');
      };
      document.getElementById('genTitle').textContent = tr('Deduções: declaração × app', 'Deductions: return × app');
      document.getElementById('genBody').innerHTML = Verter.html(bloco('saude', tr('Saúde', 'Health')) + bloco('educacao', tr('Educação', 'Education')) +
        '<div class="f-actions"><button class="btn primary" data-close="genModal">' + esc(tr('Fechar', 'Close')) + '</button></div>');
      abrir('genModal');
    }
  };

  MoneyModulos.registrar({ id: 'declaracao-escolhas', versao: '1.0.0', pontos: { 'declaracao.escolhas': function (ctx) { return API.html(ctx.d); } } });
  window.DeclEscolhas = API;
})();
