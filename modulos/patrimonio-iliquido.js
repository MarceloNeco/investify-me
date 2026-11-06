/* =====================================================================
   modulos/patrimonio-iliquido.js — patrimônio SEM LIQUIDEZ (InvestifyONE)   1.1.1 · 06/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     Guarda o que é da família mas não dá para sacar quando quiser: saldo de FGTS por empregador,
     previdência ainda bloqueada, imóvel, participação em empresa… Entra no "Patrimônio total" do
     Painel, sempre SEPARADO do que é líquido, com a etiqueta "🔒 sem liquidez — não dá para sacar".
     Não entra em alocação, rentabilidade, rebalanceamento nem cotação (só o valor informado).
     1.1.0: outro módulo pode dar o valor de hoje (ponto `iliquido.valor`, ex.: FGTS estimado pelo JAM) e
     pôr botões e avisos no cartão (`iliquido.topo`); conta de FGTS com saldo zero fica guardada e escondida.
   API (window.PatrimonioIliquido)
     lista()                    → [item]
     total()                    → soma em R$ (pelo valor de hoje)
     valorHoje(item)            → {valor, nota} (o último módulo que responder em iliquido.valor; senão o informado)
     adicionar(item)            → item (com id) | lança erro se faltar nome ou valor
     iguais(item)               → item já cadastrado com o mesmo nome e instituição (ou null)
     TIPOS                      → {fgts, previdencia, imovel, empresa, outro}
   DADOS
     Store.estado.patrimonio_iliquido = [{id, nome, tipo, inst, valor, data (saldo em), obs}]
   PONTOS QUE USA
     itens patrimonio.extra (o Painel soma ao total) · investify.painel · investify.carteira.topo · ações iliq-*
   PONTOS QUE OFERECE
     itens iliquido.valor {item} → [{valor, nota}] · html iliquido.topo {}
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'patrimonio_iliquido';
  var TIPOS = { fgts: { pt: 'FGTS', en: 'FGTS' }, previdencia: { pt: 'Previdência bloqueada', en: 'Locked pension' },
    imovel: { pt: 'Imóvel', en: 'Property' }, empresa: { pt: 'Participação em empresa', en: 'Company stake' }, outro: { pt: 'Outro', en: 'Other' } };
  function pt() { return I18n.atual === 'pt'; }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function norm(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  var ETIQUETA = { pt: '🔒 sem liquidez — não dá para sacar', en: '🔒 not liquid — cannot be withdrawn' };

  var API = {
    TIPOS: TIPOS,
    lista: lista,
    valorHoje: function (x) {
      var aj = window.MoneyModulos ? MoneyModulos.itens('iliquido.valor', { item: x }).filter(function (v) { return v && v.valor >= 0; }) : [];
      return aj.length ? { valor: n2(aj[aj.length - 1].valor), nota: aj[aj.length - 1].nota || '' } : { valor: n2(x.valor), nota: '' };
    },
    total: function () { return n2(lista().reduce(function (s, x) { return s + API.valorHoje(x).valor; }, 0)); },
    arruma: function (x) {
      var o = { nome: String(x.nome || '').trim().slice(0, 80), tipo: TIPOS[x.tipo] ? x.tipo : 'outro', inst: String(x.inst || '').trim().slice(0, 80),
        valor: n2(Math.abs(Number(x.valor) || 0)), data: /^\d{4}-\d{2}-\d{2}$/.test(String(x.data || '')) ? x.data : hojeISO(), obs: String(x.obs || '').trim().slice(0, 200) };
      if (!o.nome) throw new Error(pt() ? 'falta o nome' : 'missing name');
      if (!(o.valor > 0) && o.tipo !== 'fgts') throw new Error(pt() ? 'valor tem de ser maior que zero' : 'amount must be above zero');   /* FGTS sacado: zero, guardado */
      return o;
    },
    iguais: function (x) { return lista().find(function (y) { return norm(y.nome) === norm(x.nome) && norm(y.inst) === norm(x.inst); }) || null; },
    adicionar: function (x) { var o = API.arruma(x); o.id = 'il' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); lista().push(o); return o; }
  };

  var editando = null;      /* null = fechado; '' = novo; id = editando */
  var verZeradas = false;
  function form(x) {
    x = x || { tipo: 'fgts', data: hojeISO() };
    return '<div class="card" id="ilForm"><div class="card-head"><h3>' + (x.id ? (pt() ? 'Editar' : 'Edit') : (pt() ? 'Novo item sem liquidez' : 'New non-liquid item')) + '</h3></div>' +
      '<input type="hidden" id="ilId" value="' + esc(x.id || '') + '">' +
      '<div class="grid g2">' + campo(pt() ? 'Nome' : 'Name', '<input id="ilNome" value="' + esc(x.nome || '') + '" placeholder="' + (pt() ? 'FGTS Empresa' : 'e.g. FGTS employer') + '">') +
        campo(pt() ? 'Tipo' : 'Type', '<select id="ilTipo">' + Object.keys(TIPOS).map(function (k) { return '<option value="' + k + '"' + (x.tipo === k ? ' selected' : '') + '>' + esc(TIPOS[k][pt() ? 'pt' : 'en']) + '</option>'; }).join('') + '</select>') +
        campo(pt() ? 'Onde está (empregador, banco…)' : 'Where (employer, bank…)', '<input id="ilInst" value="' + esc(x.inst || '') + '">') +
        campo(pt() ? 'Valor (R$)' : 'Amount (R$)', '<input type="number" id="ilValor" min="0" step="0.01" inputmode="decimal" value="' + (x.valor || '') + '">') +
        campo(pt() ? 'Saldo em' : 'Balance on', Cal.campo('ilData', x.data || hojeISO(), {})) + '</div>' +
      campo(pt() ? 'Observação' : 'Note', '<input id="ilObs" value="' + esc(x.obs || '') + '">') +
      '<div class="f-actions">' + (x.id ? '<button class="btn danger" data-acao="iliq-excluir" data-id="' + esc(x.id) + '">' + esc(t('ac.excluir')) + '</button>' : '') +
      '<button class="btn" data-acao="iliq-fechar">' + esc(t('ac.cancelar')) + '</button>' +
      '<button class="btn primary" data-acao="iliq-salvar">' + esc(t('ac.salvar')) + '</button></div></div>';
  }
  function cartao(onde) {
    var topo = window.MoneyModulos ? MoneyModulos.html('iliquido.topo', {}) : '';
    var todas = lista().slice().sort(function (a, b) { return (Number(b.valor) || 0) - (Number(a.valor) || 0); });
    var zeradas = todas.filter(function (x) { return !(Number(x.valor) > 0); }), l = verZeradas ? todas : todas.filter(function (x) { return Number(x.valor) > 0; });
    if (!todas.length && editando === null) {
      return onde === 'carteira' ? '<div class="row il-acoes" style="gap:8px;margin:0 0 12px;flex-wrap:wrap"><button class="btn sm" data-acao="iliq-novo">🔒 ' + (pt() ? 'Patrimônio sem liquidez' : 'Non-liquid assets') + '</button>' + topo + '</div>' : '';
    }
    var h = '<div class="card il-card"><div class="card-head"><h3>🔒 ' + (pt() ? 'Sem liquidez' : 'Not liquid') + ' <span class="small muted">' + fmt(API.total()) + '</span></h3>' +
      '<button class="btn sm" data-acao="iliq-novo">+ ' + (pt() ? 'Item' : 'Item') + '</button></div>' +
      '<p class="small il-etiqueta">' + esc(ETIQUETA[pt() ? 'pt' : 'en']) + '. ' + (pt() ? 'Entra no patrimônio total, separado do que é líquido; não entra em alocação nem rentabilidade.' : 'Counts in total net worth, separate from liquid assets; not in allocation or returns.') + '</p>' +
      (topo ? '<div class="row il-topo" style="gap:8px;margin:0 0 8px;flex-wrap:wrap">' + topo + '</div>' : '');
    if (l.length) h += '<table class="tbl"><tbody>' + l.map(function (x) {
      var vh = API.valorHoje(x);
      return '<tr class="linha-click" data-acao="iliq-editar" data-id="' + esc(x.id) + '"><td><span class="t-main">' + esc(x.nome) + '</span>' +
        '<div class="t-sub">' + esc([TIPOS[x.tipo] ? TIPOS[x.tipo][pt() ? 'pt' : 'en'] : '', x.inst, (pt() ? 'saldo em ' : 'balance on ') + I18n.data(x.data)].filter(Boolean).join(' · ')) + '</div></td>' +
        (vh.nota ? '<div class="t-sub il-nota">' + esc(vh.nota) + '</div>' : '') + '</td>' +
        '<td class="num">' + fmt(vh.valor) + '<div class="t-sub il-tag">🔒 ' + (pt() ? 'não dá para sacar' : 'cannot withdraw') + '</div></td></tr>';
    }).join('') + '</tbody></table>';
    if (zeradas.length) h += '<p class="tiny muted il-zeradas"><button class="btn sm" data-acao="iliq-zeradas">' + esc(verZeradas ? (pt() ? 'Esconder as contas zeradas' : 'Hide empty accounts')
      : (pt() ? zeradas.length + (zeradas.length === 1 ? ' conta zerada guardada' : ' contas zeradas guardadas') + ' — mostrar' : zeradas.length + ' empty account(s) kept — show')) + '</button></p>';
    if (editando !== null) h += form(editando ? lista().find(function (x) { return x.id === editando; }) : null);
    return h + '</div>';
  }

  MoneyModulos.registrar({
    id: 'patrimonio-iliquido',
    versao: '1.1.1',
    colecoes: [COL],
    pontos: {
      'patrimonio.extra': function () { var v = API.total(); return v ? [{ valor: v, rotulo: pt() ? 'sem liquidez' : 'not liquid' }] : []; },
      'investify.painel': function () { return lista().length ? cartao('painel') : ''; },
      'investify.carteira.topo': function () { return cartao('carteira'); }
    },
    acoes: {
      'iliq-novo': function () { editando = ''; render(); setTimeout(function () { var f = document.getElementById('ilForm'); if (f) f.scrollIntoView({ block: 'center' }); }, 60); },
      'iliq-editar': function (el) { editando = el.dataset.id; render(); },
      'iliq-fechar': function () { editando = null; render(); },
      'iliq-zeradas': function () { verZeradas = !verZeradas; render(); },
      'iliq-salvar': function () {
        var v = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
        var dados = { nome: v('ilNome'), tipo: v('ilTipo'), inst: v('ilInst'), valor: v('ilValor'), data: v('ilData'), obs: v('ilObs') };
        try {
          var id = v('ilId');
          if (id) { var x = lista().find(function (y) { return y.id === id; }); Object.assign(x, API.arruma(dados)); }
          else API.adicionar(dados);
        } catch (e) { toast(e.message, 'err'); return; }
        editando = null; Store.salvar(); render(); toast(pt() ? 'Guardado.' : 'Saved.');
      },
      'iliq-excluir': function (el) { ST[COL] = lista().filter(function (x) { return x.id !== el.dataset.id; }); editando = null; Store.salvar(); render(); }
    }
  });
  window.PatrimonioIliquido = API;
})();
