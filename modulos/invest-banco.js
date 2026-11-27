/* =====================================================================
   modulos/invest-banco.js — os investimentos que o robô manda do banco entram na Carteira   1.1.0 · 27/Nov/2026 (3.119; 3.137: extrato da corretora)
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
     1.1.0 (3.137) — O EXTRATO MENSAL DA CORRETORA (Avenue): um item por papel, com ticker, quantidade, preço e valor (US$), sem
     preço médio; o caixa com classe "caixa" (conta_id "<corretora>-caixa"). A data é o fim do mês do extrato.
       · casa com a posição da mesma instituição e do mesmo ticker (mesmo importada à mão) e atualiza a quantidade (no bond, o valor
         atual) SÓ se o extrato for mais novo que a última atualização da posição; o preço médio da pessoa nunca muda;
       · extrato mais velho que a última importação/edição daquela instituição (config.invUltima, e o atualizadoEm das posições)
         não cria posição nem apaga nada: fica só no comprovante ("extrato de dd/mm/aaaa" com o total, comprovantes 1.6.0);
       · extrato mais novo com papel que não existe: posição nova com o selo "📄 veio do extrato" (sem preço médio: o preço do dia,
         com o aviso na observação); papel da Carteira que não está no extrato novo: "Não está no extrato de dd/mm: vendeu?"
         [Sim, tirar] [Manter] no 📥 (nunca apaga sozinho);
       · o caixa: posição "Dinheiro em USD" da corretora (tipo caixa).
       · na primeira vez desta versão, a Carteira que já existe conta como atualizada hoje (o extrato velho não ressuscita papel
         vendido).
   API (window.InvestBanco)
     sincronizar() → quantas posições mudaram (salva se mudou) · tipoDe(r) · liquidez(p) → texto · selo() → html do selo
     ultima(banco) · marcarEdicao(inst) · sumidos() → [{p, data}] (1.1.0)
   DADOS
     ST.posicoes[i].doBanco = {chave, data, banco, classe, subtipo, vencimento, taxa, indexador, dono}
     ST.posicoes[i].doExtrato = {data, banco} · atualizadoEm (a última edição/importação) · ST.config.invUltima = {banco: data}
     ST.config.invManter = {'idDaPosicao|data': 1}
   PONTOS QUE USA
     investify.carteira.topo (quadro) · inbox.grupos ('avisos': papel sumido) · ações ib-* · ouve 'investimento.banco' (o SaldoBanco emite ao receber)
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
  function hoje() { return API._hoje || (typeof hojeISO === 'function' ? hojeISO() : new Date().toISOString().slice(0, 10)); }
  function cfg() { return (ST.config = ST.config || {}); }
  function kb(b) { return N(b).split(' ')[0] || ''; }
  function tk(t) { return String(t || '').toUpperCase().replace(/[^A-Z0-9.]/g, ''); }
  /* 1.1.0 (3.137): o item do extrato da corretora (papel com quantidade, ou o caixa) */
  function ehCaixa(r) { return /^(caixa|cash)$/i.test((r.inv || {}).classe || '') || /-caixa$/i.test(r.contaId || ''); }
  function ehExtrato(r) { var i = r.inv || {}; return ehCaixa(r) || (!!i.ticker && i.quantidade != null); }
  function tipoExtrato(r) { var c = N((r.inv || {}).classe); return ehCaixa(r) ? 'caixa' : /bond|treasury|titulo/.test(c) ? 'bond-us' : /etf/.test(c) ? 'etf-us' : /reit/.test(c) ? 'reit' : 'acao-us'; }
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
    _hoje: null,
    /* a última importação ou edição da Carteira naquela instituição */
    ultima: function (banco) {
      var u = (cfg().invUltima || {})[kb(banco)] || '';
      posicoes().forEach(function (p) { if (p.atualizadoEm && bancoIgual(p.inst, banco) && p.atualizadoEm > u) u = String(p.atualizadoEm).slice(0, 10); });
      return u;
    },
    marcarEdicao: function (inst) { var k = kb(inst); if (!k) return; var m = cfg().invUltima = Object.assign({}, cfg().invUltima); m[k] = hoje(); },
    /* a posição que é este papel: mesma instituição e mesmo ticker (o caixa: o dinheiro na moeda) */
    doPapel: function (r) {
      var chave = chaveDe(r), t = tk((r.inv || {}).ticker), cx = ehCaixa(r), m = r.moeda || 'USD';
      return posicoes().find(function (p) { return p.doBanco && p.doBanco.chave === chave; }) || posicoes().find(function (p) { return p.id === 'bk_' + safe(chave); }) ||
        posicoes().find(function (p) { return bancoIgual(p.inst, r.banco) && (cx ? p.tipo === 'caixa' && tk(p.ticker) === m : p.tipo !== 'caixa' && !!t && tk(p.ticker) === t); }) || null;
    },
    doExtrato: function (r) {
      var data = r.data || '', inv = r.inv || {}, valor = Math.round(Number(r.saldo) * 100) / 100, cx = ehCaixa(r), p = API.doPapel(r);
      if (p) {
        var ult = [p.atualizadoEm, p.doExtrato && p.doExtrato.data].filter(Boolean).map(function (x) { return String(x).slice(0, 10); }).sort().pop() || API.ultima(p.inst || r.banco);   /* sem data própria: a da instituição */
        if (!(data > ult)) return 0;   /* extrato mais velho (ou o mesmo): não mexe */
        var tp = TIPOS && TIPOS[p.tipo] && TIPOS[p.tipo].fonte;
        if (cx) p.qtd = valor;
        else if (tp === 'manual') { p.valorManual = valor; p.valorManualData = data + 'T12:00:00'; p.historicoManual = Array.isArray(p.historicoManual) ? p.historicoManual : []; var h = p.historicoManual.find(function (x) { return x[0] === data; }); if (h) h[1] = valor; else p.historicoManual.push([data, valor]); p.historicoManual.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; }); }
        else p.qtd = Number(inv.quantidade) || 0;
        p.doExtrato = { data: data, banco: r.banco || '' };
        return 1;
      }
      if (!(data > API.ultima(r.banco)) || !(valor > 0)) return 0;   /* extrato mais velho: só no comprovante; nunca ressuscita papel vendido */
      var tipo = tipoExtrato(r), preco = Number(inv.preco) || 0, qtd = Number(inv.quantidade) || 0;
      var np = { id: 'bk_' + safe(chaveDe(r)), ticker: cx ? (r.moeda || 'USD') : tk(inv.ticker), nome: cx ? 'Dinheiro em ' + (r.moeda || 'USD') : (r.conta || inv.ticker || ''), tipo: tipo, inst: r.banco || '',
        moeda: r.moeda || 'USD', data: data, notas: '', doExtrato: { data: data, banco: r.banco || '' } };
      if (cx) { np.qtd = valor; np.pm = 1; }
      else if (tipo === 'bond-us') { np.qtd = 1; np.pm = valor; np.valorManual = valor; np.valorManualData = data + 'T12:00:00'; np.historicoManual = [[data, valor]]; }
      else { np.qtd = qtd; np.pm = preco || (qtd ? Math.round(valor / qtd * 100) / 100 : 0); }
      if (!cx) np.notas = tr('Preço médio não veio no extrato (está o preço do dia): confira.', 'Average price was not in the statement (today\'s price is used): check it.', 'El precio medio no venía en el extracto (está el del día): revísalo.');
      posicoes().push(np);
      return 1;
    },
    /* papel da Carteira que não está no extrato mais novo daquela instituição ("vendeu?") */
    sumidos: function () {
      var porBanco = {}, r = [];
      invs().filter(ehExtrato).forEach(function (x) { var k = kb(x.banco); var b = porBanco[k] = porBanco[k] || { banco: x.banco, data: '', tickers: {} }; if (x.data > b.data) b.data = x.data; });
      invs().filter(ehExtrato).forEach(function (x) { var b = porBanco[kb(x.banco)]; if (x.data === b.data && !ehCaixa(x)) b.tickers[tk(x.inv.ticker)] = 1; });
      Object.keys(porBanco).forEach(function (k) {
        var b = porBanco[k], manter = cfg().invManter || {};
        if (!(b.data > API.ultima(b.banco)) || !Object.keys(b.tickers).length) return;
        posicoes().forEach(function (p) {
          if (p.tipo === 'caixa' || !bancoIgual(p.inst, b.banco) || b.tickers[tk(p.ticker)] || manter[p.id + '|' + b.data]) return;
          if ((p.atualizadoEm && String(p.atualizadoEm).slice(0, 10) >= b.data) || (p.doExtrato && p.doExtrato.data >= b.data)) return;
          r.push({ p: p, data: b.data });
        });
      });
      return r;
    },
    seloExtrato: function () { return '<span class="badge banco" title="' + e(tr('Posição que veio do extrato mensal da corretora (sem preço médio)', 'Position from the broker\'s monthly statement (no average price)', 'Posición que vino del extracto mensual del bróker (sin precio medio)')) + '">📄 ' + e(tr('veio do extrato', 'from the statement', 'vino del extracto')) + '</span>'; },
    sincronizar: function () {
      var mudou = 0;
      invs().forEach(function (r) {
        if (ehExtrato(r)) { mudou += API.doExtrato(r); return; }   /* 1.1.0 (3.137) */
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
    versao: '1.1.0',
    colecoes: [],
    pontos: {
      'investify.carteira.topo': function () { return API.quadro(); },
      /* 1.1.0 (3.137): "Não está no extrato de dd/mm: vendeu?" */
      'inbox.grupos': function () {
        if (typeof ST === 'undefined' || !ST || (window.Escopo && Escopo.soCasa && Escopo.soCasa())) return [];
        var l = API.sumidos(); if (!l.length) return [];
        return [{ id: 'avisos', n: l.length, html: l.map(function (s) {
          var d = ' data-id="' + e(s.p.id) + '" data-d="' + e(s.data) + '"';
          return '<li class="inb-item ib-sumido"><div><b>❓ ' + e(s.p.ticker + (s.p.inst ? ' (' + s.p.inst + ')' : '') + ': ' + tr('não está no extrato de ', 'not in the statement of ', 'no está en el extracto del ') + dma(s.data).slice(0, 5) + tr(': vendeu?', ': did you sell it?', ': ¿lo vendiste?')) + '</b>' +
            '<span class="t-sub">' + e(tr('O app não apaga sozinho.', 'The app never deletes it on its own.', 'La app no lo borra sola.')) + '</span></div>' +
            '<span class="inb-acoes"><button type="button" class="btn sm primary" data-acao="ib-tirar"' + d + '>' + e(tr('Sim, tirar', 'Yes, remove', 'Sí, quitar')) + '</button><button type="button" class="btn sm" data-acao="ib-manter"' + d + '>' + e(tr('Manter', 'Keep', 'Mantener')) + '</button></span></li>';
        }).join('') }];
      }
    },
    acoes: {
      'ib-tirar': function (el) { var p = posicoes().find(function (x) { return x.id === el.dataset.id; }); if (!p) return; ST.posicoes = posicoes().filter(function (x) { return x !== p; }); depois(); },   /* sem marcar edição: as outras perguntas do mesmo extrato continuam */
      'ib-manter': function (el) { var m = cfg().invManter = Object.assign({}, cfg().invManter); m[el.dataset.id + '|' + el.dataset.d] = 1; depois(); }
    },
    ouvir: {
      'investimento.banco': function () {
        if (agendado) return; agendado = true;
        setTimeout(function () { agendado = false; API.sincronizar(); }, 0);
      }
    },
    iniciar: function () {
      /* 1.1.0 (3.137): na primeira vez, a Carteira que já existe conta como atualizada hoje (o extrato velho não ressuscita papel vendido) */
      if (!cfg().invUltimaDesde) { var m = cfg().invUltima = Object.assign({}, cfg().invUltima); posicoes().forEach(function (p) { var k = kb(p.inst); if (k && !m[k]) m[k] = hoje(); }); cfg().invUltimaDesde = hoje(); }
      API.sincronizar();
    }
  });
  function depois() { if (window.Store && Store.salvar) Store.salvar(); if (typeof abrirInbox === 'function' && document.querySelector('#genModal:not(.hidden) .inb-item')) abrirInbox(); if (typeof render === 'function') render(); if (typeof renderInboxN === 'function') renderInboxN(); }
  window.InvestBanco = API;
})();
