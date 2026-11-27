/* =====================================================================
   modulos/cotacoes-eua.js — cotações dos papéis dos EUA pelo SERVIDOR (3.140)        1.0.0 · 27/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono; o servidor foi testado com os papéis da carteira)
     · As ações e ETFs dos EUA da Carteira pedem a cotação à função "cotacoes" do servidor (nuvem.js 1.18.0, Nuvem.cotacoes), com o
       login da pessoa. SÓ OS TICKERS saem do app (nada de quantidade, preço médio nem corretora). O que o servidor não entregar segue
       pelas chaves gratuitas de antes (Mercado.atualizar).
     · Cada papel mostra o preço, a fonte, a data/hora e o tipo (fechamento ou último). "Sem cotação" fica sem valor (nada inventado).
     · Mudança maior que 30% chega "pendente": o app pergunta antes de trocar ([Trocar] [Manter] → acao "confirmar").
     · "Atualizar agora": busca de novo na hora (até 3 por dia; mostra quantas restam). Bonds ficam manuais.
     · Sem login: nada muda. Sem acesso (403 "sem-acesso"; hoje só a família do dono): o recurso some sem alarde.
     · Nunca troca quantidade, preço médio nem corretora: só o preço do dia (Mercado.precos['us:TICKER']).
   API (window.CotacoesEua)
     ativo() · buscar(tickers, forcar) → os tickers que o servidor NÃO entregou · estado · cartao() → html
   PONTOS QUE USA
     investify.carteira.fim · ações ce-*
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  var K_SEM = 'moneytrio.cotEua.semAcesso';
  function semAcesso() { try { return localStorage.getItem(K_SEM) === '1'; } catch (e) { return false; } }
  function usd(v) { return typeof fmt === 'function' ? fmt(v, 'USD') : 'US$ ' + Number(v).toFixed(2); }
  function quando(iso) { if (!iso) return ''; var d = new Date(iso); return isNaN(d) ? String(iso) : I18n.data(iso.slice(0, 10)) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function doEua(p) { var tp = (typeof TIPOS !== 'undefined' ? TIPOS : {})[p.tipo]; return !!tp && tp.fonte === 'us'; }
  function tickers() { return (ST.posicoes || []).filter(doEua).map(function (p) { return String(p.ticker || '').toUpperCase(); }).filter(function (t, i, a) { return t && a.indexOf(t) === i; }); }

  var API = {
    estado: { porTicker: {}, resumo: null, quando: null },
    ativo: function () { return !!(window.MoneyNuvem && MoneyNuvem.cotacoes && MoneyNuvem.cotacoes.logado() && !semAcesso()); },
    /* pede ao servidor; devolve os tickers que ele não entregou (seguem pelas chaves gratuitas) */
    buscar: async function (lista, forcar) {
      lista = (lista || []).map(function (t) { return String(t).toUpperCase(); }).filter(Boolean);
      if (!lista.length || !API.ativo()) return lista;
      var j;
      try { j = await MoneyNuvem.cotacoes.buscar(lista, forcar); }
      catch (e) {
        if (e.status === 403) { try { localStorage.setItem(K_SEM, '1'); } catch (x) { /* sem armazenamento */ } return lista; }   /* sem acesso: some sem alarde */
        if (e.status === 429 && forcar) throw e;
        return lista;
      }
      var servidos = {};
      ((j && j.cotacoes) || []).forEach(function (c) {
        if (!c || !c.ticker) return;
        var t = String(c.ticker).toUpperCase(); API.estado.porTicker[t] = c;
        if (c.status === 'ok' && c.preco != null && isFinite(Number(c.preco))) {
          Mercado.precos['us:' + t] = { p: Number(c.preco), moeda: 'USD', var: null, hora: c.preco_em || new Date().toISOString(), fonte: c.fonte || tr('servidor', 'server', 'servidor'), tipo: c.tipo || '', servidor: true };
          servidos[t] = 1;
        } else if (c.status === 'pendente' || c.status === 'sem-cotacao') servidos[t] = 1;   /* pendente: fica o preço de antes até a pessoa decidir; sem cotação: não busca em outro lugar */
      });
      API.estado.resumo = (j && j.resumo) || API.estado.resumo; API.estado.quando = new Date().toISOString();
      return lista.filter(function (t) { return !servidos[t]; });
    },
    cartao: function () {
      var tk = tickers(); if (!API.ativo() || !tk.length || !Object.keys(API.estado.porTicker).length) return '';
      var r = API.estado.resumo || {}, restam = r.manual_restam;
      var linhas = tk.map(function (t) {
        var c = API.estado.porTicker[t]; if (!c) return '';
        var st = c.status, info;
        if (st === 'ok') info = '<b class="mono">' + esc(usd(c.preco)) + '</b> <span class="tiny muted">' + esc([c.fonte, quando(c.preco_em), c.tipo === 'fechamento' ? tr('fechamento', 'close', 'cierre') : c.tipo === 'ultimo' ? tr('último', 'last', 'último') : ''].filter(Boolean).join(' · ')) + '</span>' +
          (c.divergente && c.alt ? '<div class="tiny" style="color:var(--warn)">' + esc(tr('outra fonte diz ', 'another source says ', 'otra fuente dice ') + usd(c.alt.preco) + (c.alt.fonte ? ' (' + c.alt.fonte + ')' : '')) + '</div>' : '');
        else if (st === 'pendente' && c.candidato) info = '<span class="small">' + esc(tr('Mudou ', 'Changed ', 'Cambió ') + (c.candidato.variacao != null ? (c.candidato.variacao > 0 ? '+' : '') + Math.round(c.candidato.variacao) + '% ' : '') + tr('para ', 'to ', 'a ') + usd(c.candidato.preco) + tr(': trocar?', ': switch?', ': ¿cambiar?')) + '</span> ' +
          '<button class="btn sm primary" data-acao="ce-trocar" data-t="' + esc(t) + '">' + esc(tr('Trocar', 'Switch', 'Cambiar')) + '</button> <button class="btn sm" data-acao="ce-manter" data-t="' + esc(t) + '">' + esc(tr('Manter', 'Keep', 'Mantener')) + '</button>';
        else if (st === 'mantido') info = '<span class="small muted">' + esc(tr('ficou o preço de antes', 'kept the previous price', 'se mantuvo el precio anterior')) + '</span>';
        else if (st === 'sem-cotacao') info = '<span class="small muted">' + esc(tr('sem cotação (o valor não é inventado)', 'no quote (no value made up)', 'sin cotización (no se inventa el valor)')) + '</span>';
        else info = '<span class="small muted">' + esc(st === 'aguardando' ? tr('aguardando o servidor', 'waiting for the server', 'esperando al servidor') : tr('não deu agora; tenta de novo depois', 'not now; it tries again later', 'ahora no; se reintenta luego')) + '</span>';
        return '<div class="ib-linha ce-linha" data-t="' + esc(t) + '"><span><b>' + esc(t) + '</b></span><div style="text-align:right">' + info + '</div></div>';
      }).join('');
      return '<details class="card ce-card" open><summary><b>🇺🇸 ' + esc(tr('Cotações dos EUA', 'US quotes', 'Cotizaciones de EE. UU.')) + '</b> <span class="tiny muted">' + esc(tr('pelo servidor da SolverONE; só o código do papel sai do app', 'via the SolverONE server; only the ticker leaves the app', 'por el servidor de SolverONE; solo el código sale de la app')) + '</span></summary>' +
        linhas + '<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center"><button class="btn sm" data-acao="ce-atualizar"' + (restam === 0 ? ' disabled' : '') + '>↻ ' + esc(tr('Atualizar agora', 'Update now', 'Actualizar ahora')) + '</button>' +
        (restam != null ? '<span class="tiny muted ce-restam">' + esc(tr('restam ', '', 'quedan ') + restam + tr(' hoje', ' left today', ' hoy')) + '</span>' : '') +
        '<span class="tiny muted">' + esc(tr('Bonds ficam com o valor informado por você.', 'Bonds keep the value you entered.', 'Los bonos mantienen el valor que indicaste.')) + '</span></div></details>';
    }
  };

  function depois() { if (typeof render === 'function') render(); }
  MoneyModulos.registrar({
    id: 'cotacoes-eua',
    versao: '1.0.0',
    pontos: { 'investify.carteira.fim': function () { return API.cartao(); } },
    acoes: {
      'ce-atualizar': async function () {
        try { await API.buscar(tickers(), true); toast(tr('Cotações dos EUA atualizadas.', 'US quotes updated.', 'Cotizaciones de EE. UU. actualizadas.')); }
        catch (e) { toast(e.status === 429 ? tr('Já foram as 3 atualizações de hoje. Amanhã tem de novo.', 'You have used today\'s 3 updates. More tomorrow.', 'Ya usaste las 3 actualizaciones de hoy. Mañana hay más.') : e.message, 'warn'); }
        if (typeof Store !== 'undefined') Store.salvar(); depois();
      },
      'ce-trocar': async function (el) {
        var t = el.dataset.t, c = API.estado.porTicker[t];
        try { await MoneyNuvem.cotacoes.confirmar(t, true); } catch (e) { toast(e.message, 'warn'); return; }
        if (c && c.candidato) { Mercado.precos['us:' + t] = { p: Number(c.candidato.preco), moeda: 'USD', var: null, hora: new Date().toISOString(), fonte: c.fonte || tr('servidor', 'server', 'servidor'), tipo: c.tipo || '', servidor: true }; API.estado.porTicker[t] = Object.assign({}, c, { status: 'ok', preco: c.candidato.preco, preco_em: new Date().toISOString() }); }
        depois();
      },
      'ce-manter': async function (el) {
        var t = el.dataset.t, c = API.estado.porTicker[t];
        try { await MoneyNuvem.cotacoes.confirmar(t, false); } catch (e) { toast(e.message, 'warn'); return; }
        if (c) API.estado.porTicker[t] = Object.assign({}, c, { status: 'mantido' });
        depois();
      }
    }
  });
  window.CotacoesEua = API;
})();
