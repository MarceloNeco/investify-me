/* =====================================================================
   modulos/pre-autorizacao.js — PRÉ-AUTORIZAÇÕES DO CARTÃO (pendentes e cauções) (3.80)        1.0.1 · 14/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 13/Nov/2026)
     O robô manda os lançamentos de cartão ainda PENDENTES no banco com "pendente": true e "caucao_provavel": true|false
     (locadora, hotel, pousada). Eles NÃO entram no livro (ST.gastos), então não contam no "gastou" do mês; ficam aqui:
     · Pendente: selo "⏳ Pendente no cartão"; entra no saldo previsto (modulos/saldo-previsto.js), na fatura aberta do
       cartão (Banco.faturas) e no previsto da categoria como comprometido (modulos/previsao.js).
     · Caução: selo "🔒 Caução (valor bloqueado no limite)", com a nota "costuma ser liberado; o valor final vem depois";
       NÃO entra no previsto da categoria; entra no limite usado (cartão do saldo do banco) e no saldo previsto da fatura.
     · O definitivo chega (mesmo cartão, mesmo recebedor normalizado, valor igual ou ±10%, de 1 dia antes até 15 dias depois)
       → SUBSTITUI o pendente, sem contar duas vezes. Não depende do id do banco (que muda entre um e outro).
     · Sumiu da entrega do robô (que manda os últimos 40 dias a cada rodada) e não virou definitivo em 7 dias → retirado com
       a nota "liberado (não foi cobrado)"; na caução, aviso no 📥 "A caução de <quem> foi liberada".
     · 1.0.1 (3.87): os itens do "📋 Colar print" (doPrint) moram aqui como "⏳ aguardando o banco" (fatura, saldo previsto,
       previsto da categoria), mas a conciliação e a saída são do modulos/print-colar.js.
     · Sem IA. Visão da casa: segue a regra do lançamento (Escopo.de('cartao_pendentes') = a dos gastos).
   API (window.PreAut)
     receber(g, l) → true se mudou · entrega(hoje?) · ativos() · lista() · doCartao(cartaoId) · comprometidos(grupo, sub, mes)
     substituir(g) → o pendente substituído | null · limpar(hoje?) → [liberados agora]
   DADOS
     ST.cartao_pendentes = [{id: 'pa_<idRobo>', ...o lançamento convertido, caucao, vistoEm, estado: 'pendente'|'cobrado'|
                             'liberado', nota, saiuEm, gastoId?}]
     ST.config.preEntrega = 'AAAA-MM-DD' (a última vez que o robô entregou algo)
   PONTOS QUE USA
     lancamentos.topo · inbox.grupos ('avisos') · evento gasto.novo
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'cartao_pendentes', SUMIU = 7, JANELA = 15;
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function hoje() { return API._hoje || hojeISO(); }
  function mais(iso, d) { var x = new Date(iso + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); }
  function cfg() { ST.config = ST.config || {}; return ST.config; }
  function norm(t) { t = String(t || '').replace(/^↩\s*/, ''); return window.Profissionais ? Profissionais.norm(t) : t.toLowerCase().split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 2; }); }
  function quem(p) { return (p.contraparte && p.contraparte.nome) || String(p.descRobo || p.desc || '').trim() || p.sub || ''; }
  function mesmoCartao(p, g) {
    if (p.cartaoId || g.cartaoId) return p.cartaoId === g.cartaoId;
    return !!p.finalCartao && p.finalCartao === g.finalCartao;
  }
  function mesmoRecebedor(p, g) {
    var a = p.contraparte && p.contraparte.cnpj, b = g.contraparte && g.contraparte.cnpj;
    if (a && b) return a === b;
    if (window.Origem && Origem.origemDe(p) && Origem.origemDe(p) === Origem.origemDe(g)) return true;
    var x = norm(p.descRobo || p.desc), y = norm(g.descRobo || g.desc); if (!x.length || !y.length) return false;
    return window.Profissionais ? Profissionais.parecido(x, y) >= 0.8 : x.join(' ') === y.join(' ');
  }
  function casa(p, g) {
    if (p.doPrint) return false;   /* 1.0.1 (3.87): o item do print tem a conciliação dele (modulos/print-colar.js) */
    if (!g || g.estorno || g.fluxo === 'entrada' || !(Number(g.valor) > 0)) return false;
    var v = Number(p.valor) || 0, d = Number(g.valor) || 0;
    if (Math.abs(d - v) > v * 0.1 + 0.005) return false;
    if (p.data && g.data && (g.data < mais(p.data, -1) || g.data > mais(p.data, JANELA))) return false;
    return mesmoCartao(p, g) && mesmoRecebedor(p, g);
  }

  var API = {
    _hoje: null, lista: lista,
    ativos: function () { return lista().filter(function (p) { return p.estado === 'pendente'; }); },
    /* um pendente que o robô entregou (de novo ou pela 1ª vez) */
    receber: function (g, l) {
      if (!g) return false;
      var id = 'pa_' + String(g.idRobo || g.id).replace(/^rb_/, '').replace(/[^A-Za-z0-9_.:@-]/g, '_').slice(0, 70);
      var p = lista().find(function (x) { return x.id === id; });
      if (p && p.estado !== 'pendente') return false;   /* já virou definitivo ou foi liberado */
      var caucao = !!(l && (l.caucao_provavel === true || l.caucao_provavel === 'true'));
      var novo = Object.assign({}, g, { id: id, caucao: caucao, vistoEm: hoje(), estado: 'pendente', pendente: true });
      delete novo.revisar;
      /* o definitivo já chegou antes? não entra */
      var def = (typeof Gasto !== 'undefined' ? Gasto.todos() : []).find(function (x) { return casa(novo, x) && !lista().some(function (y) { return y.gastoId === x.id; }); });
      if (def) { if (p) { p.estado = 'cobrado'; p.gastoId = def.id; p.saiuEm = hoje(); } return !!p; }
      if (p) Object.assign(p, novo); else lista().push(novo);
      return true;
    },
    entrega: function (h) { cfg().preEntrega = h || hoje(); },
    /* o definitivo chegou: tira o pendente (não conta em dobro) */
    substituir: function (g) {
      var p = API.ativos().filter(function (x) { return casa(x, g); }).sort(function (a, b) { return Math.abs(a.valor - g.valor) - Math.abs(b.valor - g.valor); })[0];
      if (!p) return null;
      p.estado = 'cobrado'; p.gastoId = g.id; p.saiuEm = g.data || hoje();
      return p;
    },
    /* sumiu da entrega e não virou definitivo em 7 dias: liberado */
    limpar: function (h) {
      h = h || hoje(); var ult = cfg().preEntrega || '', out = [];
      API.ativos().forEach(function (p) {
        if (p.doPrint) return;
        var def = (typeof Gasto !== 'undefined' ? Gasto.todos() : []).find(function (x) { return casa(p, x) && !lista().some(function (y) { return y.gastoId === x.id; }); });
        if (def) { p.estado = 'cobrado'; p.gastoId = def.id; p.saiuEm = def.data || h; out.push(p); return; }
        if (ult && p.vistoEm < ult && mais(p.vistoEm, SUMIU) <= h) { p.estado = 'liberado'; p.nota = tr('liberado (não foi cobrado)', 'released (not charged)'); p.saiuEm = h; out.push(p); }
      });
      return out;
    },
    doCartao: function (cartaoId) { return n2(API.ativos().filter(function (p) { return p.cartaoId === cartaoId; }).reduce(function (s, p) { return s + (Number(p.valor) || 0); }, 0)); },
    /* o que entra no previsto da categoria como comprometido (a caução não) */
    comprometidos: function (grupo, sub, mes) {
      return API.ativos().filter(function (p) { return !p.caucao && p.grupo === grupo && p.sub === sub && String(p.data).slice(0, 7) === mes; })
        .map(function (p) { return { nome: '⏳ ' + quem(p), dia: +String(p.data).slice(8, 10), data: p.data, valor: n2(p.valor), pendente: true }; });
    },
    selo: function (p) {
      if (p.doPrint) return '<span class="pa-selo">⏳ ' + esc(tr('aguardando o banco (print)', 'waiting for the bank (screenshot)')) + '</span>';
      return p.caucao ? '<span class="pa-selo pa-caucao" title="' + esc(tr('costuma ser liberado; o valor final vem depois', 'usually released; the final amount comes later')) + '">🔒 ' + esc(tr('Caução (valor bloqueado no limite)', 'Hold (amount blocked on the limit)')) + '</span>'
        : '<span class="pa-selo">⏳ ' + esc(tr('Pendente no cartão', 'Pending on the card')) + '</span>';
    },
    quem: quem
  };

  function cartaoLista() {
    var l = API.ativos(); if (!l.length) return '';
    var tot = n2(l.reduce(function (s, p) { return s + (Number(p.valor) || 0); }, 0));
    return '<div class="card pa-card"><div class="card-head"><h3>⏳ ' + esc(tr('No cartão, ainda não cobrado', 'On the card, not charged yet')) + '</h3><span class="small">' + fmt(tot) + '</span></div>' +
      '<p class="tiny muted" style="margin:0 0 6px">' + esc(tr('Não entra no "gastou" do mês até virar definitivo. Quando o banco cobrar de verdade, o definitivo toma o lugar.', 'Not counted as spent until it becomes final. When the bank really charges it, the final entry takes its place.')) + '</p>' +
      '<ul class="pa-lista">' + l.sort(function (a, b) { return a.data < b.data ? 1 : -1; }).map(function (p) {
        return '<li><div><b>' + esc(quem(p)) + '</b> · ' + fmt(p.valor) + ' ' + API.selo(p) + '<span class="t-sub">' + esc(I18n.data(p.data) + (p.cartaoId && typeof Banco !== 'undefined' ? ' · ' + Banco.rotuloCartao(p.cartaoId) : '') +
          (p.caucao ? ' · ' + tr('costuma ser liberado; o valor final vem depois', 'usually released; the final amount comes later') : '')) + '</span></div></li>';
      }).join('') + '</ul></div>';
  }

  MoneyModulos.registrar({
    id: 'pre-autorizacao', versao: '1.0.1', colecoes: [COL],
    pontos: {
      'lancamentos.topo': function () { if (API.limpar().length) Store.salvar(); return cartaoLista(); },
      'inbox.grupos': function () {
        var vistos = cfg().inboxVistos || {}, l = lista().filter(function (p) { return p.caucao && p.estado === 'liberado' && !vistos['pa|' + p.id]; });
        if (!l.length) return [];
        return [{ id: 'avisos', n: l.length, html: l.map(function (p) {
          return '<li class="inb-item"><div><b>🔓 ' + esc(tr('A caução de ', 'The hold from ') + quem(p) + tr(' foi liberada', ' was released')) + '</b><span class="t-sub">' + esc(fmt(p.valor) + ' · ' + I18n.data(p.data) + ' · ' + p.nota) + '</span></div>' +
            '<span class="inb-acoes"><button class="btn sm" data-acao="inb-visto" data-k="' + esc('pa|' + p.id) + '">' + esc(tr('ok, entendi', 'ok, got it')) + '</button></span></li>';
        }).join('') }];
      }
    },
    ouvir: { 'gasto.novo': function (g) { if (g && g.cartaoId && API.substituir(g)) setTimeout(function () { Store.salvar(); }, 0); } }
  });
  window.PreAut = API;
})();
