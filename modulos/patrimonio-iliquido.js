/* =====================================================================
   modulos/patrimonio-iliquido.js — patrimônio SEM LIQUIDEZ (InvestifyONE)   1.2.0 · 27/Nov/2026 (3.140: o cadastro é o guiado de modulos/bens.js)
   ---------------------------------------------------------------------
   O QUE FAZ
     Guarda o que é da família mas não dá para sacar quando quiser: saldo de FGTS por empregador,
     previdência ainda bloqueada, imóvel, participação em empresa… Entra no "Patrimônio total" do
     Painel, sempre SEPARADO do que é líquido, com a etiqueta "🔒 sem liquidez — não dá para sacar".
     Não entra em alocação, rentabilidade, rebalanceamento nem cotação (só o valor informado).
     1.1.0: outro módulo pode dar o valor de hoje (ponto `iliquido.valor`, ex.: FGTS estimado pelo JAM) e
     pôr botões e avisos no cartão (`iliquido.topo`); conta de FGTS com saldo zero fica guardada e escondida.
     1.2.0 (3.140): "🏠 Imóveis, carro e outros bens" — o "+ Item" e a linha abrem o cadastro GUIADO (modulos/bens.js, numa janela);
     tipo novo "carro"; o que veio da declaração do IR mostra "📄 veio da declaração de <ano>"; sem bem cadastrado, a Carteira não
     mostra este cartão (o botão fica no topo, modulos/carregar-doc.js).
   API (window.PatrimonioIliquido)
     lista()                    → [item]
     total()                    → soma em R$ (pelo valor de hoje)
     valorHoje(item)            → {valor, nota} (o último módulo que responder em iliquido.valor; senão o informado)
     adicionar(item)            → item (com id) | lança erro se faltar nome ou valor
     iguais(item)               → item já cadastrado com o mesmo nome e instituição (ou null)
     TIPOS                      → {fgts, previdencia, imovel, carro, empresa, outro}
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
    imovel: { pt: 'Imóvel', en: 'Property' }, carro: { pt: 'Carro ou moto', en: 'Car or motorbike' }, empresa: { pt: 'Participação em empresa', en: 'Company stake' }, outro: { pt: 'Outro', en: 'Other' } };
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

  var verZeradas = false;
  var ICO = { fgts: '💼', previdencia: '🔒', imovel: '🏠', carro: '🚗', empresa: '🏢', outro: '📦' };
  /* 1.2.0 (3.140): de onde veio — a declaração do IR (modulos/declaracao-escolhas.js marca decRef/decAno) */
  function daDeclaracao(x) { if (!x.decRef) return ''; var a = x.decAno || (x.data ? Number(String(x.data).slice(0, 4)) + 1 : ''); return '📄 ' + (pt() ? 'veio da declaração' : 'from the tax return') + (a ? (pt() ? ' de ' : ' ') + a : ''); }
  function cartao(onde) {
    var topo = window.MoneyModulos ? MoneyModulos.html('iliquido.topo', {}) : '';
    var todas = lista().slice().sort(function (a, b) { return (Number(b.valor) || 0) - (Number(a.valor) || 0); });
    var zeradas = todas.filter(function (x) { return !(Number(x.valor) > 0); }), l = verZeradas ? todas : todas.filter(function (x) { return Number(x.valor) > 0; });
    if (!todas.length) return onde === 'carteira' && topo ? '<div class="row il-topo" style="gap:8px;margin:0 0 12px;flex-wrap:wrap">' + topo + '</div>' : '';
    var h = '<div class="card il-card"><div class="card-head"><h3>🏠 ' + (pt() ? 'Imóveis, carro e outros bens' : 'Property, car and other assets') + ' <span class="small muted">' + fmt(API.total()) + '</span></h3>' +
      '<button class="btn sm" data-acao="bens-novo">+ ' + (pt() ? 'Item' : 'Item') + '</button></div>' +
      '<p class="small il-etiqueta">' + esc(ETIQUETA[pt() ? 'pt' : 'en']) + '. ' + (pt() ? 'Entra no patrimônio total, separado do que é líquido; não entra em alocação nem rentabilidade.' : 'Counts in total net worth, separate from liquid assets; not in allocation or returns.') + '</p>' +
      (topo ? '<div class="row il-topo" style="gap:8px;margin:0 0 8px;flex-wrap:wrap">' + topo + '</div>' : '');
    if (l.length) h += '<table class="tbl"><tbody>' + l.map(function (x) {
      var vh = API.valorHoje(x);
      return '<tr class="linha-click" data-acao="bens-editar" data-id="' + esc(x.id) + '"><td class="bk-cel"><span class="t-main">' + (ICO[x.tipo] || '') + ' ' + esc(x.nome) + '</span>' +
        '<div class="t-sub">' + esc([TIPOS[x.tipo] ? TIPOS[x.tipo][pt() ? 'pt' : 'en'] : '', x.inst, x.dono, (pt() ? 'valor de ' : 'value as of ') + I18n.data(x.data), daDeclaracao(x)].filter(Boolean).join(' · ')) + '</div></td>' +
        (vh.nota ? '<div class="t-sub il-nota">' + esc(vh.nota) + '</div>' : '') + '</td>' +
        '<td class="num" style="white-space:nowrap;vertical-align:top">' + fmt(vh.valor) + '<div class="t-sub il-tag">🔒 ' + (pt() ? 'não dá para sacar' : 'cannot withdraw') + '</div></td></tr>';
    }).join('') + '</tbody></table>';
    if (zeradas.length) h += '<p class="tiny muted il-zeradas"><button class="btn sm" data-acao="iliq-zeradas">' + esc(verZeradas ? (pt() ? 'Esconder as contas zeradas' : 'Hide empty accounts')
      : (pt() ? zeradas.length + (zeradas.length === 1 ? ' conta zerada guardada' : ' contas zeradas guardadas') + ' — mostrar' : zeradas.length + ' empty account(s) kept — show')) + '</button></p>';
    return h + '</div>';
  }

  MoneyModulos.registrar({
    id: 'patrimonio-iliquido',
    versao: '1.2.0',
    colecoes: [COL],
    pontos: {
      'patrimonio.extra': function () { var v = API.total(); return v ? [{ valor: v, rotulo: pt() ? 'sem liquidez' : 'not liquid' }] : []; },
      'investify.painel': function () { return lista().length ? cartao('painel') : ''; },
      'investify.carteira.topo': function () { return cartao('carteira'); }
    },
    acoes: {
      'iliq-novo': function () { if (window.Bens) Bens.abrir(); },   /* 1.2.0 (3.140): o cadastro guiado (modulos/bens.js) */
      'bens-editar': function (el) { if (window.Bens) Bens.abrir(null, { id: el.dataset.id }); },
      'iliq-zeradas': function () { verZeradas = !verZeradas; render(); }
    }
  });
  window.PatrimonioIliquido = API;
})();
