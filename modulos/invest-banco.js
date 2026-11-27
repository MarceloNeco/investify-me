/* =====================================================================
   modulos/invest-banco.js — os investimentos que o robô manda do banco entram na Carteira   1.0.0 · 26/Nov/2026 (3.119)
   ---------------------------------------------------------------------
   O QUE FAZ
     O robô manda {tipo:'investimento', banco, conta (nome do papel), conta_id, classe, subtipo, saldo, data, dono, moeda,
     vencimento, taxa, indexador}; o SaldoBanco guarda em saldos_banco (Conferência com o banco). Este módulo leva cada um
     à Carteira do InvestifyONE:
       · uma posição por conta_id (id 'bk_<conta_id>': o mesmo em todo aparelho, nunca duplica), com o saldo do banco
         atualizado a cada dia (valorManual + historicoManual);
       · se a pessoa já cadastrou o mesmo papel à mão (mesmo banco e mesmo nome, ou mesmo vencimento), casa com ele em vez
         de criar outro;
       · selo "🏦 veio do banco" na linha da Carteira e o quadro "Veio do banco": por banco e produto, com liquidez e vencimento.
     Saldo zero de um papel que nunca esteve na carteira não cria posição.
   API (window.InvestBanco)
     sincronizar() → quantas posições mudaram (salva se mudou) · tipoDe(r) · liquidez(p) → texto · selo() → html do selo
   DADOS
     ST.posicoes[i].doBanco = {chave, data, banco, classe, subtipo, vencimento, taxa, indexador, dono}
   PONTOS QUE USA
     investify.carteira.topo (quadro) · ouve 'investimento.banco' (o SaldoBanco emite ao receber)
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function safe(t) { return String(t || '').replace(/[^A-Za-z0-9_.:@-]/g, '_').slice(0, 60); }
  function e(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dma(iso) { return /^\d{4}-\d{2}-\d{2}/.test(String(iso || '')) ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; }
  function dinheiro(v, m) { return typeof fmt === 'function' ? fmt(v, m || 'BRL') : 'R$ ' + (Number(v) || 0).toFixed(2); }
  function posicoes() { return (ST.posicoes = Array.isArray(ST.posicoes) ? ST.posicoes : []); }
  function invs() {
    var l = window.SaldoBanco && SaldoBanco.contas ? SaldoBanco.contas() : (ST.saldos_banco || []);
    return l.filter(function (r) { return r && r.tipo === 'investimento' && r.saldo != null && isFinite(Number(r.saldo)); });
  }
  function chaveDe(r) { return r.contaId || r.id; }
  function bancoIgual(a, b) { var x = N(a).split(' ')[0], y = N(b).split(' ')[0]; return !!x && !!y && (x === y || N(a).indexOf(y) >= 0 || N(b).indexOf(x) >= 0); }

  var API = {
    /* o tipo da Carteira a partir da classe/subtipo do banco (Open Finance manda em inglês ou português) */
    tipoDe: function (r) {
      var inv = r.inv || {}, t = N([inv.classe, inv.subtipo, r.conta].join(' '));
      if (/previd|pgbl|vgbl/.test(t)) return 'previdencia';
      if (/fund|fundo|\bfi\b|fic|multimercado|mutual/.test(t)) return 'fundo';
      if (/fixed|renda fixa|cdb|\blci\b|\blca\b|\blc\b|tesouro|treasury|debenture|\bcri\b|\bcra\b|poupanca/.test(t)) return 'renda-fixa';
      return 'outro';
    },
    /* liquidez em palavras: o que o app sabe (saldo-previsto.liquidez) ou o vencimento */
    liquidez: function (p) {
      var d = window.SaldoPrevisto && SaldoPrevisto.liquidez ? SaldoPrevisto.liquidez(p) : null;
      var v = p.doBanco && p.doBanco.vencimento;
      if (d === 0) return tr('diária (no mesmo dia)', 'daily (same day)', 'diaria (el mismo día)');
      if (d != null) return tr('em ' + d + ' dia(s) útil(eis)', 'in ' + d + ' business day(s)', 'en ' + d + ' día(s) hábil(es)');
      if (v) return tr('no vencimento', 'at maturity', 'al vencimiento');
      return tr('veja as regras do produto no banco', 'check the product rules at the bank', 'mira las reglas del producto en el banco');
    },
    selo: function () { return '<span class="badge banco" title="' + e(tr('Saldo mandado pelo banco (Open Finance), atualizado todo dia', 'Balance sent by the bank (Open Finance), updated daily', 'Saldo enviado por el banco (Open Finance), actualizado cada día')) + '">🏦 ' + e(tr('veio do banco', 'from the bank', 'vino del banco')) + '</span>'; },
    /* o papel cadastrado à mão que é este: mesmo banco e (mesmo nome, ou um contém o outro, ou mesmo vencimento) */
    casar: function (r) {
      var nome = N(r.conta), venc = (r.inv && r.inv.vencimento) || '';
      return posicoes().filter(function (p) { return !p.doBanco && bancoIgual(p.inst, r.banco) && p.tipo !== 'caixa'; }).find(function (p) {
        var a = N(p.nome), b = N(p.ticker);
        if (nome && (a === nome || b === nome)) return true;
        if (nome.length >= 6 && ((a.length >= 6 && (a.indexOf(nome) >= 0 || nome.indexOf(a) >= 0)) || (b.length >= 6 && (b.indexOf(nome) >= 0 || nome.indexOf(b) >= 0)))) return true;
        return !!venc && p.vencimento === venc;
      }) || null;
    },
    sincronizar: function () {
      var mudou = 0;
      invs().forEach(function (r) {
        var chave = chaveDe(r), saldo = Math.round(Number(r.saldo) * 100) / 100, data = r.data || '';
        var p = posicoes().find(function (x) { return x.doBanco && x.doBanco.chave === chave; }) || posicoes().find(function (x) { return x.id === 'bk_' + safe(chave); });
        if (!p) p = API.casar(r);
        if (!p) {
          if (!(saldo > 0)) return;
          var tp = API.tipoDe(r);
          p = { id: 'bk_' + safe(chave), ticker: String(r.conta || r.banco).toUpperCase().slice(0, 30), nome: r.conta || '', tipo: tp,
            inst: r.banco || '', qtd: 1, pm: saldo, moeda: r.moeda || 'BRL', data: (r.abertura && r.abertura.data) || data, notas: '', historicoManual: [] };
          if (r.inv && r.inv.taxa != null) p.taxa = r.inv.taxa;
          if (r.inv && r.inv.indexador) p.ix = N(r.inv.indexador) || 'cdi';
          posicoes().push(p); mudou++;
        }
        var d = p.doBanco || {}, inv = r.inv || {};
        var novo = { chave: chave, data: data, banco: r.banco || '', classe: inv.classe || '', subtipo: inv.subtipo || '', vencimento: inv.vencimento || '',
          taxa: inv.taxa == null ? null : inv.taxa, indexador: inv.indexador || '', dono: r.dono || '' };
        if (p.valorManual === saldo && d.data === data && JSON.stringify(d) === JSON.stringify(novo)) return;
        if (!(d.data && data < d.data)) {   /* um saldo mais velho nunca passa por cima do de hoje */
          p.doBanco = novo; p.valorManual = saldo; p.valorManualData = data + 'T12:00:00';
          p.historicoManual = Array.isArray(p.historicoManual) ? p.historicoManual : [];
          var h = p.historicoManual.find(function (x) { return x[0] === data; });
          if (h) h[1] = saldo; else p.historicoManual.push([data, saldo]);
          p.historicoManual.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
          mudou++;
        }
      });
      if (mudou && window.Store && Store.salvar) Store.salvar();
      return mudou;
    },
    /* o quadro "Veio do banco": por banco, e dentro dele por produto */
    quadro: function () {
      var l = posicoes().filter(function (p) { return p.doBanco; });
      if (!l.length) return '';
      var bancos = {};
      l.forEach(function (p) {
        var b = p.doBanco.banco || p.inst || '—', prod = p.doBanco.subtipo || p.doBanco.classe || ((window.TIPOS && TIPOS[p.tipo]) ? TIPOS[p.tipo].curto : p.tipo);
        bancos[b] = bancos[b] || {}; (bancos[b][prod] = bancos[b][prod] || []).push(p);
      });
      var h = '<details class="card ib-quadro" open><summary><b>🏦 ' + e(tr('Veio do banco', 'From the bank', 'Vino del banco')) + '</b> <span class="tiny muted">' +
        e(tr('saldos que o banco manda pelo Open Finance, atualizados todo dia', 'balances the bank sends via Open Finance, updated daily', 'saldos que el banco envía por Open Finance, actualizados cada día')) + '</span></summary>';
      Object.keys(bancos).sort().forEach(function (b) {
        var tot = 0; Object.keys(bancos[b]).forEach(function (k) { bancos[b][k].forEach(function (p) { tot += Number(p.valorManual) || 0; }); });
        h += '<div class="ib-banco"><div class="row" style="justify-content:space-between"><b>' + e(b) + '</b><b class="mono">' + e(dinheiro(tot)) + '</b></div>';
        Object.keys(bancos[b]).sort().forEach(function (prod) {
          h += '<div class="ib-prod tiny muted">' + e(prod) + '</div>';
          bancos[b][prod].slice().sort(function (x, y) { return (x.nome || '').localeCompare(y.nome || ''); }).forEach(function (p) {
            var v = p.doBanco.vencimento;
            h += '<div class="ib-linha"><div><span>' + e(p.nome || p.ticker) + '</span>' +
              '<div class="tiny muted">' + e(tr('Liquidez: ', 'Liquidity: ', 'Liquidez: ') + API.liquidez(p)) +
              (v ? ' · ' + e(tr('vence ', 'matures ', 'vence ') + dma(v)) : '') +
              (p.doBanco.data ? ' · ' + e(tr('saldo de ', 'balance on ', 'saldo del ') + dma(p.doBanco.data)) : '') + '</div></div>' +
              '<span class="mono">' + e(dinheiro(p.valorManual, p.moeda)) + '</span></div>';
          });
        });
        h += '</div>';
      });
      return h + '</details>';
    }
  };

  var agendado = false;
  MoneyModulos.registrar({
    id: 'invest-banco',
    versao: '1.0.0',
    colecoes: [],
    pontos: { 'investify.carteira.topo': function () { return API.quadro(); } },
    ouvir: {
      'investimento.banco': function () {
        if (agendado) return; agendado = true;
        setTimeout(function () { agendado = false; API.sincronizar(); }, 0);
      }
    },
    iniciar: function () { API.sincronizar(); }
  });
  window.InvestBanco = API;
})();
