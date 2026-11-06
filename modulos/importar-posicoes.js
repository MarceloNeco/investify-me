/* =====================================================================
   modulos/importar-posicoes.js — "Importar posições (JSON)" (InvestifyONE)   1.0.0 · 06/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     Lê um arquivo {"tipo":"moneytrio-posicoes","versao":1,"itens":[…]} e mostra a prévia em tabela:
     o que já existe e o que tem problema vem DESMARCADO; importa só o marcado. Nada é trocado nem
     apagado (o mesmo jeito do "Importar compromissos").
   FORMATO DE CADA ITEM
     Posição líquida (vai para a Carteira):
       {ticker, nome?, tipo: uma das chaves de TIPOS (acao-br, fii, renda-fixa, fundo, previdencia, caixa…),
        inst?, qtd, pm (preço médio; em renda fixa/fundo/previdência = valor aplicado), moeda?, data?,
        valorAtual? (fundo/previdência/outro: valor de hoje), ix?/taxa? (renda fixa), notas?}
     Sem liquidez (vai para PatrimonioIliquido):
       {semLiquidez: true, nome, tipo: 'fgts'|'previdencia'|'imovel'|'empresa'|'outro', inst?, valor, data?, obs?}
   API (window.ImportarPosicoes)
     preparar(objeto) → {ok, erro, lista: [{item, marcado, problema, jaExiste, liq}]}
     importar(lista)  → {liquidas, iliquidas}
     escolher()       → abre o seletor de arquivo e a prévia
   PONTOS QUE USA
     investify.carteira.topo (botão) · ações posimp-*
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return I18n.atual === 'pt'; }
  function norm(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  var lista = [];

  function itemLiquido(x) {
    var tp = TIPOS[x.tipo]; if (!tp) throw new Error(pt() ? 'tipo desconhecido: ' + x.tipo : 'unknown type: ' + x.tipo);
    var ticker = String(x.ticker || x.nome || '').trim().toUpperCase(); if (!ticker) throw new Error(pt() ? 'falta o código ou nome' : 'missing ticker or name');
    var p = { ticker: ticker, nome: String(x.nome || '').trim(), tipo: x.tipo, inst: String(x.inst || '').trim(), notas: String(x.notas || '').trim(),
      data: /^\d{4}-\d{2}-\d{2}$/.test(String(x.data || '')) ? x.data : '', moeda: String(x.moeda || tp.moeda || 'BRL').toUpperCase() };
    if (tp.fonte === 'taxa' || tp.fonte === 'manual') {
      p.qtd = 1; p.pm = Number(x.pm != null ? x.pm : x.valor) || 0;
      if (tp.fonte === 'taxa') { p.ix = String(x.ix || 'cdi'); p.taxa = Number(x.taxa) || 0; p.moeda = 'BRL'; }
      if (tp.fonte === 'manual' && Number(x.valorAtual) > 0) { p.valorManual = Number(x.valorAtual); p.valorManualData = new Date().toISOString(); p.historicoManual = [[hojeISO(), p.valorManual]]; }
      if (!(p.pm > 0)) throw new Error(pt() ? 'falta o valor aplicado (pm)' : 'missing invested amount (pm)');
    } else {
      p.qtd = Number(x.qtd) || 0; p.pm = Number(x.pm) || 0;
      if (tp.fonte === 'moeda') { p.ticker = p.moeda; if (!p.nome) p.nome = (pt() ? 'Dinheiro em ' : 'Cash in ') + p.moeda; }
      if (!(p.qtd > 0)) throw new Error(pt() ? 'falta a quantidade (qtd)' : 'missing quantity (qtd)');
    }
    return p;
  }

  var API = {
    preparar: function (o) {
      if (!o || typeof o !== 'object' || o.tipo !== 'moneytrio-posicoes' || !Array.isArray(o.itens))
        return { ok: false, erro: pt() ? 'Este arquivo não é uma lista de posições do MoneyTRIO (tipo "moneytrio-posicoes").' : 'This file is not a MoneyTRIO positions list.' };
      var out = o.itens.map(function (x) {
        var r = { item: null, marcado: false, problema: '', jaExiste: '', liq: !(x && x.semLiquidez) };
        try {
          if (!x || typeof x !== 'object') throw new Error(pt() ? 'linha vazia' : 'empty line');
          if (r.liq) {
            r.item = itemLiquido(x);
            var ja = ST.posicoes.find(function (y) { return norm(y.ticker) === norm(r.item.ticker) && norm(y.inst) === norm(r.item.inst); });
            if (ja) r.jaExiste = ja.ticker + (ja.inst ? ' · ' + ja.inst : '');
          } else {
            r.item = PatrimonioIliquido.arruma(x);
            var j2 = PatrimonioIliquido.iguais(r.item); if (j2) r.jaExiste = j2.nome + (j2.inst ? ' · ' + j2.inst : '');
          }
          r.marcado = !r.jaExiste;
        } catch (e) { r.problema = e.message; r.item = r.item || x; }
        return r;
      });
      return { ok: true, lista: out };
    },
    importar: function (l) {
      var n = { liquidas: 0, iliquidas: 0 };
      l.filter(function (r) { return r.marcado && !r.problema; }).forEach(function (r) {
        if (r.liq) { var p = Object.assign({ id: uid() }, r.item); ST.posicoes.push(p); n.liquidas++; }
        else { PatrimonioIliquido.adicionar(r.item); n.iliquidas++; }
      });
      return n;
    },
    escolher: function () {
      var i = document.createElement('input'); i.type = 'file'; i.accept = 'application/json,.json'; i.style.display = 'none';
      i.addEventListener('change', async function () {
        var a = i.files && i.files[0]; if (i.parentNode) i.parentNode.removeChild(i); if (!a) return;
        var o = null; try { o = JSON.parse(await a.text()); } catch (e) { o = null; }
        $('#genTitle').textContent = pt() ? 'Importar posições' : 'Import positions';
        if (!o) { $('#genBody').innerHTML = Verter.html('<p class="imp-erro small">' + (pt() ? 'Este arquivo não é um JSON válido.' : 'This file is not valid JSON.') + '</p><div class="f-actions"><button class="btn" data-close="genModal">OK</button></div>'); abrir('genModal'); return; }
        var r = API.preparar(o);
        if (!r.ok) { $('#genBody').innerHTML = Verter.html('<p class="imp-erro small">' + esc(r.erro) + '</p><div class="f-actions"><button class="btn" data-close="genModal">OK</button></div>'); abrir('genModal'); return; }
        lista = r.lista; mostrar();
      });
      document.body.appendChild(i); i.click();
    }
  };

  function rotulo(n) { return pt() ? 'Importar ' + n + ' marcada' + (n === 1 ? '' : 's') : 'Import ' + n + ' ticked'; }
  function mostrar() {
    var nOk = lista.filter(function (r) { return r.marcado; }).length, nRuim = lista.filter(function (r) { return !r.marcado; }).length;
    var linhas = lista.map(function (r, i) {
      var x = r.item || {}, nome = r.liq ? (x.ticker + (x.nome && x.nome !== x.ticker ? ' · ' + x.nome : '')) : x.nome;
      var tipo = r.liq ? ((TIPOS[x.tipo] || {}).curto || x.tipo) : '🔒 ' + ((PatrimonioIliquido.TIPOS[x.tipo] || {})[pt() ? 'pt' : 'en'] || x.tipo);
      var valor = r.liq ? (x.qtd === 1 ? fmt(x.valorManual || x.pm) : (x.qtd + ' × ' + fmt(x.pm))) : fmt(x.valor);
      var aviso = r.problema ? '<div class="t-sub" style="color:var(--down)">' + esc(r.problema) + '</div>' : r.jaExiste ? '<div class="t-sub" style="color:var(--warn)">' + esc((pt() ? 'já existe: ' : 'already there: ') + r.jaExiste) + '</div>' : '';
      return '<tr><td><input type="checkbox" class="pi-ck" data-i="' + i + '"' + (r.marcado ? ' checked' : '') + (r.problema ? ' disabled' : '') + '></td>' +
        '<td><span class="t-main">' + esc(nome || '—') + '</span>' + aviso + '</td><td>' + esc(tipo) + '</td><td>' + esc(x.inst || '') + '</td><td class="num">' + esc(valor) + '</td></tr>';
    }).join('');
    $('#genBody').innerHTML = Verter.html('<p class="small muted">' + (pt() ? 'Confira antes de importar. Os marcados entram; nada do que já existe é trocado ou apagado. 🔒 = sem liquidez (FGTS, previdência bloqueada…): entra no patrimônio, separado.' : 'Check before importing. Ticked lines are added; nothing existing is changed. 🔒 = not liquid.') + '</p>' +
      (nRuim ? '<p class="small" style="color:var(--warn)">' + nRuim + (pt() ? ' linha(s) vieram desmarcadas: com problema ou parecidas com o que já existe.' : ' line(s) came unticked.') + '</p>' : '') +
      '<div class="tbl-wrap tbl-fixa" style="overflow-x:auto;max-width:100%"><table class="tbl imp-tbl pi-tbl"><thead><tr><th></th><th>' + (pt() ? 'Nome' : 'Name') + '</th><th>' + (pt() ? 'Tipo' : 'Type') + '</th><th>' + (pt() ? 'Onde' : 'Where') + '</th><th class="num">' + (pt() ? 'Valor' : 'Amount') + '</th></tr></thead><tbody>' + linhas + '</tbody></table></div>' +
      '<div class="f-actions"><button class="btn" data-close="genModal">' + esc(t('ac.cancelar')) + '</button><button class="btn primary" data-acao="posimp-ok" id="piOk"' + (nOk ? '' : ' disabled') + '>' + rotulo(nOk) + '</button></div>');
    document.querySelectorAll('#genBody .pi-ck').forEach(function (c) {
      c.addEventListener('change', function () { lista[Number(c.dataset.i)].marcado = c.checked; var n = lista.filter(function (r) { return r.marcado; }).length, b = $('#piOk'); if (b) { b.textContent = rotulo(n); b.disabled = !n; } });
    });
    abrir('genModal'); $('#genModal').classList.add('larga');
  }

  MoneyModulos.registrar({
    id: 'importar-posicoes',
    versao: '1.0.0',
    pontos: {
      'investify.carteira.topo': function () { return '<div class="row il-acoes" style="gap:8px;margin:0 0 12px;justify-content:flex-end"><button class="btn sm" data-acao="posimp-escolher">⬆ ' + (pt() ? 'Importar posições (JSON)' : 'Import positions (JSON)') + '</button></div>'; }
    },
    acoes: {
      'posimp-escolher': function () { API.escolher(); },
      'posimp-ok': function () {
        var n = API.importar(lista); lista = [];
        Store.salvar(); fechar('genModal'); render();
        if (n.liquidas && typeof atualizarCotacoes === 'function') atualizarCotacoes(false);
        toast(pt() ? (n.liquidas + ' posição(ões) e ' + n.iliquidas + ' sem liquidez importada(s).') : (n.liquidas + ' position(s) and ' + n.iliquidas + ' non-liquid imported.'));
      }
    }
  });
  window.ImportarPosicoes = API;
})();
