/* =====================================================================
   modulos/fatura-conferencia.js — a conferência da fatura do cartão que o robô manda (3.122)        1.0.0 · 26/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 26/Nov/2026; sem IA)
     O robô lê a fatura (PDF do e-mail) e manda, na ficha do comprovante (modulos/comprovantes.js 1.3.0): ficha.lancamentos (as linhas da
     fatura), encargos, multa_atraso, juros_mora, juros_rotativo, iof_internacional, proximas_faturas, limite_utilizado e
     ficha.conferencia = {casados, lancamentos_na_fatura, so_na_fatura, so_no_banco, leitura_completa, atencao: []}.
     · No 📥 e em "Comprovantes a conferir", a linha da fatura ganha "💳 Conferência: 38 de 40 casados · 2 só na fatura" e, aberta:
       os encargos (⚠️ quando há multa, juros ou IOF), o limite utilizado, as próximas faturas, o que está só na fatura e só no banco
       (data, descrição, valor), "a leitura do PDF não foi completa" e os avisos do robô (atencao).
     · O mesmo bloco no detalhe do lançamento que pagou a fatura (ponto lancamento.form).
   API (window.FaturaConf)
     de(x) → {casados, total, soFatura: [], soBanco: [], completa, atencao: [], encargos: [{rot, valor}], limite, proximas: [{rot, valor}], linhas} | null
     resumo(c) → o texto curto · bloco(x) → o html (vazio sem ficha de fatura)
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function num(v) { if (v == null || v === '') return null; if (typeof v === 'number') return isFinite(v) ? v : null; var t = String(v).trim(); if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); var n = Number(t); return isFinite(n) ? n : null; }
  function dataTxt(d) { var s = String(d || ''); return /^\d{4}-\d{2}-\d{2}/.test(s) ? I18n.data(s.slice(0, 10), { semAno: true }) : s; }
  function itens(v) {
    if (Array.isArray(v)) return v.map(function (l) { return typeof l === 'object' && l ? { data: l.data || '', desc: String(l.descricao || l.desc || l.loja || ''), valor: num(l.valor) } : { data: '', desc: String(l), valor: null }; });
    return [];
  }
  function qtd(v) { return Array.isArray(v) ? v.length : (num(v) || 0); }

  var API = {
    de: function (x) {
      var f = x && x.ficha; if (!f) return null;
      var c = f.conferencia || null, enc = [];
      [['multa_atraso', tr('multa por atraso', 'late fee', 'multa por atraso')], ['juros_mora', tr('juros de mora', 'late interest', 'intereses de mora')],
        ['juros_rotativo', tr('juros do rotativo', 'revolving interest', 'intereses del rotativo')], ['iof_internacional', tr('IOF internacional', 'international IOF', 'IOF internacional')], ['encargos', tr('encargos', 'charges', 'cargos')]]
        .forEach(function (k) { var v = num(f[k[0]]); if (v) enc.push({ rot: k[1], valor: v }); });
      var prox = Array.isArray(f.proximas_faturas) ? f.proximas_faturas.map(function (p) { return { rot: dataTxt(p.vencimento || p.mes || p.data), valor: num(p.valor) }; }).filter(function (p) { return p.valor != null; })
        : (f.proximas_faturas && typeof f.proximas_faturas === 'object' ? Object.keys(f.proximas_faturas).map(function (k) { return { rot: dataTxt(k), valor: num(f.proximas_faturas[k]) }; }) : []);
      if (!c && !enc.length && !prox.length && num(f.limite_utilizado) == null && !Array.isArray(f.lancamentos)) return null;
      return { casados: c ? num(c.casados) : null, total: c ? (num(c.lancamentos_na_fatura) != null ? num(c.lancamentos_na_fatura) : (Array.isArray(f.lancamentos) ? f.lancamentos.length : null)) : (Array.isArray(f.lancamentos) ? f.lancamentos.length : null),
        soFatura: c ? itens(c.so_na_fatura) : [], soFaturaN: c ? qtd(c.so_na_fatura) : 0, soBanco: c ? itens(c.so_no_banco) : [], soBancoN: c ? qtd(c.so_no_banco) : 0,
        completa: !c || c.leitura_completa !== false, atencao: c && Array.isArray(c.atencao) ? c.atencao.map(String) : [], encargos: enc, limite: num(f.limite_utilizado), proximas: prox,
        linhas: Array.isArray(f.lancamentos) ? f.lancamentos.length : 0 };
    },
    resumo: function (c) {
      if (!c) return '';
      var p = [];
      if (c.casados != null && c.total != null) p.push(c.casados + tr(' de ', ' of ', ' de ') + c.total + tr(' casados', ' matched', ' conciliados'));
      if (c.soFaturaN) p.push(c.soFaturaN + tr(' só na fatura', ' only on the bill', ' solo en la factura'));
      if (c.soBancoN) p.push(c.soBancoN + tr(' só no banco', ' only at the bank', ' solo en el banco'));
      if (c.encargos.length) p.push('⚠️ ' + tr('encargos', 'charges', 'cargos'));
      if (!c.completa) p.push('⚠️ ' + tr('leitura incompleta', 'incomplete reading', 'lectura incompleta'));
      return '💳 ' + tr('Conferência: ', 'Check: ', 'Conciliación: ') + (p.join(' · ') || tr('ok', 'ok', 'ok'));
    },
    bloco: function (x) {
      var c = API.de(x); if (!c) return '';
      var lista = function (l) { return '<ul class="small" style="margin:2px 0 4px;padding-left:18px">' + l.slice(0, 20).map(function (i) { return '<li>' + esc([dataTxt(i.data), i.desc, i.valor != null ? fmt(i.valor) : ''].filter(Boolean).join(' · ')) + '</li>'; }).join('') + '</ul>'; };
      var h = '';
      if (c.encargos.length) h += '<div class="small fcf-enc">⚠️ ' + esc(tr('Encargos: ', 'Charges: ', 'Cargos: ') + c.encargos.map(function (e) { return e.rot + ' ' + fmt(e.valor); }).join(' · ')) + '</div>';
      if (c.limite != null) h += '<div class="small">' + esc(tr('Limite utilizado: ', 'Credit used: ', 'Límite utilizado: ') + fmt(c.limite)) + '</div>';
      if (c.proximas.length) h += '<div class="small">' + esc(tr('Próximas faturas: ', 'Next bills: ', 'Próximas facturas: ') + c.proximas.map(function (p) { return p.rot + ' ' + fmt(p.valor); }).join(' · ')) + '</div>';
      if (c.soFatura.length) h += '<div class="small"><b>' + esc(tr('Só na fatura (não veio do banco):', 'Only on the bill (not from the bank):', 'Solo en la factura (no vino del banco):')) + '</b>' + lista(c.soFatura) + '</div>';
      if (c.soBanco.length) h += '<div class="small"><b>' + esc(tr('Só no banco (não está na fatura):', 'Only at the bank (not on the bill):', 'Solo en el banco (no está en la factura):')) + '</b>' + lista(c.soBanco) + '</div>';
      if (!c.completa) h += '<div class="small">⚠️ ' + esc(tr('A leitura do PDF não foi completa: confira no app do banco.', 'The PDF reading was not complete: check in the bank app.', 'La lectura del PDF no fue completa: revísalo en la app del banco.')) + '</div>';
      if (c.atencao.length) h += '<ul class="small" style="margin:2px 0;padding-left:18px">' + c.atencao.slice(0, 10).map(function (a) { return '<li>⚠️ ' + esc(a) + '</li>'; }).join('') + '</ul>';
      return '<details class="fcf"><summary class="small">' + esc(API.resumo(c)) + '</summary><div class="fcf-c">' + (h || '<div class="small muted">' + esc(tr('Tudo da fatura casou com o banco.', 'Everything on the bill matched the bank.', 'Todo lo de la factura concilió con el banco.')) + '</div>') + '</div></details>';
    }
  };

  MoneyModulos.registrar({
    id: 'fatura-conferencia', versao: '1.0.0', colecoes: [], telas: {}, ouvir: {}, acoes: {},
    pontos: {
      'lancamento.form': function (ctx) {
        var g = ctx && ctx.g; if (!g || !window.Comprovantes) return '';
        var x = Comprovantes.lista().find(function (y) { return y.ficha && y.pagoId === g.id && API.de(y); });
        return x ? '<div class="bloco-regra"><span class="bf-tit">' + esc(tr('Fatura do cartão', 'Card bill', 'Factura de la tarjeta')) + '</span>' + API.bloco(x) + '</div>' : '';
      }
    }
  });
  window.FaturaConf = API;
})();
