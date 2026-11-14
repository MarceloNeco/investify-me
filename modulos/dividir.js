/* =====================================================================
   modulos/dividir.js — DIVIDIR um lançamento em partes (3.87)        1.0.0 · 14/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 14/Nov/2026)
     · Um valor em partes: para quem (pessoa), categoria e valor; a soma tem de fechar com o total. Ex.: 236 = corte da
       filha A 118 + corte da filha B 118.
     · A divisão vira lançamentos de verdade: o original fica com a 1ª parte (o mesmo id, o do robô continua o mesmo) e
       cada outra parte é um lançamento novo (id "<original>~2", "~3"…), todos com divisao {id, total, n, k}. Assim tudo o
       que soma por categoria, pessoa, cartão e conta continua certo sem mudar nada. "Desfazer a divisão" junta de novo.
     · O robô mandar o mesmo lançamento de novo não desfaz a divisão (nuvem.js 1.15.3 compara com o total).
     · Na edição do lançamento ("✂️ Dividir"), na prévia do print (modulos/print-colar.js) e no 📥 da loja nova
       (modulos/loja-nova.js), o mesmo bloco (blocoHtml / ler).
     · A última divisão de cada loja (a ORIGEM: CNPJ → pessoa → descrição) fica guardada em proporção; quando a mesma loja
       aparece de novo, o app SUGERE ("Dividir como da última vez?"), nunca aplica sozinho.
   API (window.Divisao)
     aplicar(gid, partes) → [lançamentos] | null · desfazer(gid) · partesDe(gid) · ultima(origem, total) → partes | null
     blocoHtml(pref, total, partes, origem) · ler(pref, total) → {partes} | {erro} · lembrar(origem, partes, total)
   DADOS
     gasto.divisao = {id, total, n, k} · gasto.divNota (o que é a parte) · ST.config.divisoes = {origem: [{pct, paraQuem, paraQuemId, grupo, sub, nota}]}
     ST.config.divisaoVista = {gastoId: 1} (sugestão recusada)
   PONTOS QUE USA
     lancamento.form · inbox.grupos ('confirmar': "Dividir como da última vez?") · ações dv-*
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function cfg() { return (ST.config = ST.config || {}); }
  function num(t) { var s = String(t == null ? '' : t).trim(); if (/,/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); return Number(s) || 0; }
  function achar(id) { return Gasto.todos().find(function (g) { return g.id === id; }) || null; }
  function origemDe(g) { var k = g && window.Origem ? Origem.origemDe(g) : ''; return k && k.indexOf('u:') !== 0 ? k : ''; }
  function grupos() { return Object.keys(GRUPOS).filter(function (k) { return GRUPOS[k].fluxo !== 'entrada'; }); }
  function subsDe(gr) { var v = {}; Gasto.todos().forEach(function (g) { if (g.grupo === gr && g.sub) v[g.sub] = 1; }); return Object.keys(v).sort(); }

  var API = {
    /* a divisão inteira de um lançamento (o original e as partes) */
    partesDe: function (gid) {
      var g = achar(gid); if (!g) return [];
      var raiz = g.divisao ? g.divisao.id : g.id;
      return Gasto.todos().filter(function (x) { return x.id === raiz || (x.divisao && x.divisao.id === raiz); }).sort(function (a, b) { return ((a.divisao || {}).k || 1) - ((b.divisao || {}).k || 1); });
    },
    aplicar: function (gid, partes) {
      var g0 = achar(gid); if (!g0) return null;
      var raiz = g0.divisao ? achar(g0.divisao.id) || g0 : g0, total = raiz.divisao ? raiz.divisao.total : n2(raiz.valor);
      partes = (partes || []).filter(function (p) { return n2(p.valor) > 0; });
      var soma = n2(partes.reduce(function (s, p) { return s + n2(p.valor); }, 0));
      if (partes.length < 2 || Math.abs(soma - total) > 0.005) return null;
      if (raiz.divisao) API.desfazer(raiz.id);
      raiz = achar(raiz.id);
      var n = partes.length, out = [];
      partes.forEach(function (p, i) {
        var d = { valor: n2(p.valor), grupo: p.grupo || raiz.grupo, sub: p.sub || raiz.sub, paraQuem: p.paraQuem || '', divNota: p.nota || '', divisao: { id: raiz.id, total: total, n: n, k: i + 1 }, editadoPessoa: true };
        if (window.Pessoas) Pessoas.ligar(d, 'paraQuem', 'paraQuemId');
        if (i === 0) { out.push(Gasto.atualizar(raiz.id, d)); return; }
        var filho = Object.assign({}, raiz, d, { id: raiz.id + '~' + (i + 1), criadoEm: new Date().toISOString() });
        delete filho.idRobo; delete filho.roboSugeriu; delete filho.revisar;
        out.push(Gasto.add(filho));
      });
      API.lembrar(origemDe(raiz), partes, total);
      Gasto._idx = null;
      return out;
    },
    desfazer: function (gid) {
      var g = achar(gid); if (!g || !g.divisao) return false;
      var raiz = g.divisao.id, tot = g.divisao.total;
      ST.gastos = Gasto.todos().filter(function (x) { return !(x.divisao && x.divisao.id === raiz && x.id !== raiz); });
      var r = achar(raiz); if (r) { Gasto.atualizar(raiz, { valor: tot }); delete achar(raiz).divisao; delete achar(raiz).divNota; }
      Gasto._idx = null;
      return true;
    },
    lembrar: function (origem, partes, total) {
      if (!origem || !(total > 0)) return;
      (cfg().divisoes = cfg().divisoes || {})[origem] = partes.map(function (p) { return { pct: n2(p.valor) / total, paraQuem: p.paraQuem || '', grupo: p.grupo || '', sub: p.sub || '', nota: p.nota || '' }; });
    },
    /* a última divisão desta loja, no valor de agora (a última parte fecha a conta) */
    ultima: function (origem, total) {
      var d = origem && (cfg().divisoes || {})[origem]; if (!d || d.length < 2 || !(total > 0)) return null;
      var acc = 0;
      return d.map(function (p, i) { var v = i === d.length - 1 ? n2(total - acc) : n2(total * p.pct); acc = n2(acc + v); return { valor: v, paraQuem: p.paraQuem, grupo: p.grupo, sub: p.sub, nota: p.nota }; });
    },
    resumo: function (partes) { return partes.map(function (p) { return (p.nota || p.sub || '') + (p.paraQuem ? ' ' + quemVer(p.paraQuem) : '') + ' ' + fmt(p.valor); }).join(' + '); },

    /* ---------- o bloco (o mesmo em todo lugar) ---------- */
    blocoHtml: function (pref, total, partes, origem) {
      partes = partes && partes.length ? partes : [{ valor: total }, { valor: 0 }];
      var ult = API.ultima(origem, total), gs = grupos();
      var linha = function (p, i) {
        return '<div class="dv-parte row" data-dvparte style="gap:6px;flex-wrap:wrap;align-items:flex-end;margin:4px 0;padding:6px 0;border-top:1px solid var(--line)">' +
          '<label class="field" style="flex:1 1 9em;margin:0"><span>' + esc(tr('Para quem', 'For whom')) + '</span><input data-dv="paraQuem" list="' + pref + 'Pess" value="' + esc(quemVer(p.paraQuem || '')) + '"></label>' +
          '<label class="field" style="flex:1 1 9em;margin:0"><span>' + esc(tr('O que é', 'What it is')) + '</span><input data-dv="nota" maxlength="60" value="' + esc(p.nota || '') + '" placeholder="' + esc(tr('ex.: corte de cabelo', 'e.g. haircut')) + '"></label>' +
          '<label class="field" style="flex:1 1 9em;margin:0"><span>' + esc(tr('Grupo', 'Group')) + '</span><select data-dv="grupo"><option value="">—</option>' + gs.map(function (k) { return '<option value="' + k + '"' + (k === p.grupo ? ' selected' : '') + '>' + esc((GRUPOS[k].ico || '') + ' ' + GRUPOS[k].nome) + '</option>'; }).join('') + '</select></label>' +
          '<label class="field" style="flex:1 1 8em;margin:0"><span>' + esc(tr('Categoria', 'Category')) + '</span><input data-dv="sub" maxlength="60" value="' + esc(p.sub || '') + '"></label>' +
          '<label class="field" style="flex:0 1 7em;margin:0"><span>' + esc(tr('Valor', 'Amount')) + '</span><input data-dv="valor" inputmode="decimal" value="' + (n2(p.valor) ? String(n2(p.valor)).replace('.', ',') : '') + '"></label>' +
          (i > 1 ? '<button type="button" class="icon-btn" data-acao="dv-tirar" aria-label="' + esc(tr('Tirar esta parte', 'Remove this part')) + '">✕</button>' : '') + '</div>';
      };
      return '<div class="dv-bloco" data-dvbloco="' + pref + '" data-total="' + n2(total) + '">' +
        (typeof recOpcoesPessoa === 'function' ? recOpcoesPessoa(pref + 'Pess') : '') +
        (ult ? '<p class="small" style="margin:4px 0"><button type="button" class="btn sm" data-acao="dv-ultima" data-origem="' + esc(origem) + '">↺ ' + esc(tr('Usar a última divisão desta loja', 'Use the last split for this store')) + '</button> <span class="tiny muted">' + esc(API.resumo(ult)) + '</span></p>' : '') +
        '<div class="dv-partes">' + partes.map(linha).join('') + '</div>' +
        '<p class="row" style="gap:8px;justify-content:space-between;margin:6px 0"><button type="button" class="btn sm" data-acao="dv-mais">+ ' + esc(tr('Parte', 'Part')) + '</button>' +
        '<span class="small dv-soma" aria-live="polite"></span></p></div>';
    },
    ler: function (pref, total) {
      var b = document.querySelector('[data-dvbloco="' + pref + '"]'); if (!b) return { erro: 'sem bloco' };
      var partes = [].slice.call(b.querySelectorAll('[data-dvparte]')).map(function (l) {
        var v = function (k) { var e = l.querySelector('[data-dv="' + k + '"]'); return e ? String(e.value || '').trim() : ''; };
        return { paraQuem: v('paraQuem'), nota: v('nota'), grupo: v('grupo'), sub: v('sub'), valor: n2(num(v('valor'))) };
      }).filter(function (p) { return p.valor > 0; });
      var soma = n2(partes.reduce(function (s, p) { return s + p.valor; }, 0));
      if (partes.length < 2) return { erro: tr('Uma divisão tem pelo menos duas partes.', 'A split needs at least two parts.') };
      if (Math.abs(soma - total) > 0.005) return { erro: tr('A soma das partes (', 'The parts add up to (') + fmt(soma) + tr(') tem de fechar com o total (', ') and must match the total (') + fmt(total) + ').' };
      return { partes: partes };
    }
  };

  /* a soma ao vivo, em qualquer bloco aberto */
  function somar(b) {
    var tot = Number(b.dataset.total) || 0, s = n2([].slice.call(b.querySelectorAll('[data-dv="valor"]')).reduce(function (a, e) { return a + num(e.value); }, 0));
    var el = b.querySelector('.dv-soma'); if (!el) return;
    var falta = n2(tot - s);
    el.textContent = Verter.txt(tr('Soma ', 'Sum ') + fmt(s) + tr(' de ', ' of ') + fmt(tot) + (Math.abs(falta) > 0.005 ? (falta > 0 ? tr(' · falta ', ' · missing ') + fmt(falta) : tr(' · passou ', ' · over by ') + fmt(-falta)) : ' ✓'));
    el.style.color = Math.abs(falta) > 0.005 ? 'var(--down)' : 'var(--up)';
  }
  document.addEventListener('input', function (ev) { var b = ev.target.closest && ev.target.closest('[data-dvbloco]'); if (b) somar(b); });
  function somarTodos() { [].slice.call(document.querySelectorAll('[data-dvbloco]')).forEach(somar); }
  API.somarTodos = somarTodos;

  /* a janela de dividir um lançamento que já existe */
  function abrirDividir(gid) {
    var g = achar(gid); if (!g) return;
    var raiz = g.divisao ? achar(g.divisao.id) || g : g, total = raiz.divisao ? raiz.divisao.total : n2(raiz.valor), atual = API.partesDe(raiz.id);
    var partes = atual.length > 1 ? atual.map(function (x) { return { valor: x.valor, paraQuem: x.paraQuem, grupo: x.grupo, sub: x.sub, nota: x.divNota }; }) : [{ valor: total, grupo: raiz.grupo, sub: raiz.sub, paraQuem: raiz.paraQuem }, { valor: 0, grupo: raiz.grupo, sub: raiz.sub }];
    $('#genTitle').textContent = tr('Dividir: ', 'Split: ') + (raiz.desc || raiz.sub || '') + ' · ' + fmt(total);
    $('#genBody').innerHTML = Verter.html('<p class="small muted" style="margin:0 0 6px">' + esc(tr('Cada parte vira um lançamento (com a pessoa e a categoria dela); a soma tem de fechar com o total.', 'Each part becomes an entry (with its person and category); the parts must add up to the total.')) + '</p>' +
      API.blocoHtml('dvL', total, partes, origemDe(raiz)) +
      '<div class="f-actions">' + (raiz.divisao ? '<button class="btn" data-acao="dv-juntar" data-id="' + esc(raiz.id) + '">' + esc(tr('Desfazer a divisão', 'Undo the split')) + '</button>' : '') +
      '<button class="btn" data-close="genModal">' + esc(t('ac.cancelar')) + '</button><button class="btn primary" data-acao="dv-salvar" data-id="' + esc(raiz.id) + '">' + esc(t('ac.salvar')) + '</button></div>');
    delete $('#genBody').dataset.inbox;
    abrir('genModal'); somarTodos();
  }
  API.abrir = abrirDividir;
  function depois() { Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN(); }

  /* "Dividir como da última vez?": a mesma loja apareceu de novo (sem aplicar sozinho) */
  function sugestoes() {
    var ds = cfg().divisoes || {}, vistos = cfg().divisaoVista || {}, lim = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
    if (!Object.keys(ds).length) return [];
    return Gasto.todos().filter(function (g) { return g.fluxo === 'saida' && !g.divisao && !vistos[g.id] && g.data >= lim && ds[origemDe(g)]; });
  }

  MoneyModulos.registrar({
    id: 'dividir', versao: '1.0.0',
    pontos: {
      'lancamento.form': function (ctx) {
        var g = ctx.g; if (!g || !g.id || g.fluxo === 'entrada') return '';
        var ps = API.partesDe(g.id);
        return '<div class="row" style="margin:4px 0 10px;gap:8px;flex-wrap:wrap"><button type="button" class="btn sm" data-acao="dv-abrir" data-id="' + esc(g.id) + '">✂️ ' +
          esc(ps.length > 1 ? tr('Dividido em ', 'Split in ') + ps.length + tr(' partes · mudar', ' parts · change') : tr('Dividir', 'Split')) + '</button>' +
          (ps.length > 1 ? '<span class="tiny muted">' + esc(tr('de ', 'of ') + fmt(g.divisao.total) + ': ' + API.resumo(ps.map(function (x) { return { valor: x.valor, paraQuem: x.paraQuem, sub: x.sub, nota: x.divNota }; }))) + '</span>' : '') + '</div>';
      },
      'inbox.grupos': function () {
        var l = sugestoes(); if (!l.length) return [];
        return [{ id: 'confirmar', n: l.length, html: l.map(function (g) {
          var u = API.ultima(origemDe(g), n2(g.valor));
          return '<li class="inb-item"><div><b>✂️ ' + esc((g.desc || '') + ' · ' + fmt(g.valor) + tr(': dividir como da última vez?', ': split like last time?')) + '</b><span class="t-sub">' + esc(I18n.data(g.data) + ' · ' + API.resumo(u)) + '</span></div>' +
            '<span class="inb-acoes"><button class="btn sm primary" data-acao="dv-sugerida" data-id="' + esc(g.id) + '">' + esc(tr('Dividir assim', 'Split like this')) + '</button>' +
            '<button class="btn sm" data-acao="dv-abrir" data-id="' + esc(g.id) + '">' + esc(tr('Mudar', 'Change')) + '</button>' +
            '<button class="btn sm" data-acao="dv-nao" data-id="' + esc(g.id) + '">' + esc(tr('Não dividir', 'Do not split')) + '</button></span></li>';
        }).join('') }];
      }
    },
    acoes: {
      'dv-abrir': function (el) { abrirDividir(el.dataset.id); },
      'dv-mais': function (el) {
        var b = el.closest('[data-dvbloco]'), cont = b.querySelector('.dv-partes'), ult = cont.lastElementChild; if (!ult) return;
        var nova = ult.cloneNode(true); [].slice.call(nova.querySelectorAll('input')).forEach(function (i) { i.value = ''; });
        if (!nova.querySelector('[data-acao="dv-tirar"]')) nova.insertAdjacentHTML('beforeend', '<button type="button" class="icon-btn" data-acao="dv-tirar" aria-label="' + esc(tr('Tirar esta parte', 'Remove this part')) + '">✕</button>');
        cont.appendChild(nova); somar(b);
      },
      'dv-tirar': function (el) { var b = el.closest('[data-dvbloco]'); el.closest('[data-dvparte]').remove(); somar(b); },
      'dv-ultima': function (el) {
        var b = el.closest('[data-dvbloco]'), u = API.ultima(el.dataset.origem, Number(b.dataset.total)); if (!u) return;
        var pref = b.dataset.dvbloco, tmp = document.createElement('div'); tmp.innerHTML = Verter.html(API.blocoHtml(pref, Number(b.dataset.total), u, ''));
        b.querySelector('.dv-partes').replaceWith(tmp.querySelector('.dv-partes')); somar(b);
      },
      'dv-salvar': function (el) {
        var g = achar(el.dataset.id); if (!g) return;
        var total = g.divisao ? g.divisao.total : n2(g.valor), r = API.ler('dvL', total);
        if (r.erro) return toast(r.erro, 'warn');
        if (!API.aplicar(g.id, r.partes)) return toast(tr('Não deu para dividir.', 'Could not split.'), 'warn');
        fechar('genModal'); if (typeof fechar === 'function' && document.getElementById('assetModal')) fechar('assetModal');
        depois(); toast(tr('Dividido em ', 'Split in ') + r.partes.length + tr(' lançamentos.', ' entries.'));
      },
      'dv-juntar': function (el) { if (API.desfazer(el.dataset.id)) { fechar('genModal'); depois(); toast(tr('A divisão foi desfeita.', 'The split was undone.')); } },
      'dv-sugerida': function (el) {
        var g = achar(el.dataset.id), u = g && API.ultima(origemDe(g), n2(g.valor)); if (!u) return;
        if (API.aplicar(g.id, u)) { depois(); toast(tr('Dividido como da última vez.', 'Split like last time.')); }
      },
      'dv-nao': function (el) { (cfg().divisaoVista = cfg().divisaoVista || {})[el.dataset.id] = 1; depois(); }
    }
  });
  window.Divisao = API;
})();
