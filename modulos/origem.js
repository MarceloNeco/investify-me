/* =====================================================================
   modulos/origem.js — "A confirmar" / "A identificar" e confirmar por ORIGEM (3.65)        1.1.0 · 24/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     · Selo na coluna Categoria (no lugar do "palpite do robô"): amarelo "A confirmar" (o robô tem sugestão,
       confianca 'palpite') com um ✓ de um toque; vermelho "A identificar" (sem sugestão: Outros/Sem categoria).
       Tocar na linha abre a edição, como sempre. Filtros "A confirmar (N)" e "A identificar (N)" em Lançamentos.
     · Confirmar ou corrigir (grupo, categoria, para quem, IR) um lançamento vale para os outros da MESMA ORIGEM que
       ainda estão "A confirmar" ou "A identificar". Nunca mexe num lançamento que a pessoa já editou ou confirmou.
       Mesma origem, nesta ordem (igual ao robô, espelho.py achar_regra): contraparte.cnpj → contraparte.id_pessoa →
       a chave da descrição (NFKD sem acento, maiúsculas, o que não é A–Z vira espaço, palavras de 1 letra saem:
       "RAIA DROGASIL SA 03/04" → "RAIA DROGASIL SA").
       Aviso "Aplicado também a N lançamentos da mesma origem · Desfazer". Cada um vai para o espelho (a planilha
       acompanha); a regra vai uma vez só (no lançamento que a pessoa confirmou).
     · Tela "A confirmar" agrupada por origem: "RAIA DROGASIL SA · 14 lançamentos · Saúde › Farmácia · ✓ Confirmar
       todos | Mudar".
   API (window.Origem)
     chaveDesc(t) · mesma(a, b) · status(g) → 'confirmar' | 'identificar' | ''
     replicar(g, antes) → n · desfazer() → n · grupos() → [{chave, rotulo, itens, grupo, sub}] · confirmarGrupo(chave) → n
     1.1.0 (3.107): resumo(x) {n, total, de, ate, ultimo, itens} · sugestao(x) "Bancários > Tarifa" · motivo(x) {k: mcc|banco|parecido|robo, txt}
       · viagem(x) {v, n} | {cidade, nome, de, ate} | null · detalhe(x) → o html do grupo (📥 e tela b-confirmar)
   PONTOS QUE USA
     lancamento.categoria (selo) · lancamentos.topo (aviso) · tela b-confirmar · ações or-*
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  var CAMPOS = ['grupo', 'sub', 'paraQuem', 'paraQuemId', 'irpf'];
  var ultimo = null;   /* o que dá para desfazer: [{id, antes}] */

  var API = {
    chaveDesc: function (t) {
      return String(t || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]+/g, ' ')
        .split(' ').filter(function (w) { return w.length > 1; }).join(' ');
    },
    /* 1.0.1 (3.65.1): descrição genérica ("Pagamento de boleto INT PAG TIT ULO ITAU", "PIX ENVIADO"…) sem CNPJ nem
       id_pessoa não identifica ninguém: a origem é SÓ aquele lançamento (não replica, não manda regra ao espelho).
       A mesma lista do robô (espelho.py GENERICA). O Itaú não manda o beneficiário do boleto. */
    GENERICA: /PAG(AMENTO DE)? ?(BOLETO|TIT)|PAG TIT|^COMPRA D[EÉ]BITO\s*$|^PIX (ENVIADO|RECEBIDO)\s*$|^TED\b|^DOC\b/,
    generica: function (g) {
      var cp = (g && g.contraparte) || {};
      if (cp.cnpj || cp.idp) return false;
      return API.GENERICA.test(String((g && (g.descRobo || g.desc)) || '').trim().toUpperCase());
    },
    origemDe: function (g) {
      var cp = g.contraparte || {};
      if (cp.cnpj) return 'c:' + cp.cnpj;
      if (cp.idp) return 'i:' + cp.idp;
      if (API.generica(g)) return 'u:' + g.id;   /* só ele */
      var k = API.chaveDesc(g.descRobo || g.desc);
      return k ? 'd:' + k : '';
    },
    mesma: function (a, b) {
      var ca = a.contraparte || {}, cb = b.contraparte || {};
      if (ca.cnpj) return cb.cnpj === ca.cnpj;
      if (ca.idp) return cb.idp === ca.idp;
      if (API.generica(a) || API.generica(b)) return false;   /* 3.65.1 */
      var k = API.chaveDesc(a.descRobo || a.desc); return !!k && k === API.chaveDesc(b.descRobo || b.desc);
    },
    status: function (g) {
      if (!g || g.editadoPessoa || g.confirmadoEm || g.fluxo === 'entrada' && g.grupo === 'RENDA' && !g.confianca) return '';
      if (g.confianca === 'palpite') return 'confirmar';
      if (g.confianca === 'desconhecido') return 'identificar';
      if (g.grupo === 'OUTROS' && (!g.sub || /^(sem categoria|a identificar|\?)$/i.test(g.sub)) && g.origem === 'robo') return 'identificar';
      return '';
    },
    pendente: function (g) { return !!API.status(g); },
    replicar: function (g, antes) {
      if (!g) return 0;
      var muda = {}; CAMPOS.forEach(function (k) { if (g[k] !== undefined) muda[k] = g[k]; });
      var alvos = Gasto.todos().filter(function (o) { return o.id !== g.id && API.pendente(o) && API.mesma(g, o); });
      if (!alvos.length) return 0;
      var agora = new Date().toISOString(), desfaz = [];
      alvos.forEach(function (o) {
        var a = {}; CAMPOS.concat(['confianca', 'revisar', 'confirmadoEm', 'fluxo']).forEach(function (k) { a[k] = o[k]; });
        desfaz.push({ id: o.id, antes: a });
        var velho = Object.assign({}, o);
        Gasto.atualizar(o.id, Object.assign({}, muda, { confianca: undefined, revisar: false, confirmadoEm: agora }));
        var novo = Gasto.todos().find(function (x) { return x.id === o.id; }); delete novo.confianca;
        if (window.Espelho) Espelho.registrar(novo, velho, { semRegra: true });   /* a planilha acompanha; a regra vai uma vez só */
      });
      Gasto._idx = null;
      ultimo = desfaz;
      return desfaz.length;
    },
    desfazer: function () {
      if (!ultimo) return 0;
      var n = 0;
      ultimo.forEach(function (x) {
        var o = Gasto.todos().find(function (g) { return g.id === x.id; }); if (!o) return;
        var velho = Object.assign({}, o), volta = Object.assign({}, x.antes);
        Gasto.atualizar(x.id, volta);
        var novo = Gasto.todos().find(function (g) { return g.id === x.id; });
        Object.keys(volta).forEach(function (k) { if (volta[k] === undefined) delete novo[k]; });
        if (window.Espelho) Espelho.registrar(novo, velho, { semRegra: true });
        n++;
      });
      ultimo = null; Gasto._idx = null;
      return n;
    },
    /* depois de confirmar ou editar: replica e avisa com "Desfazer" */
    depoisDe: function (g, antes) {
      var n = API.replicar(g, antes);
      if (n) avisar(n);
      return n;
    },
    grupos: function () {
      var por = {};
      Gasto.todos().forEach(function (g) {
        if (API.status(g) !== 'confirmar' && API.status(g) !== 'identificar') return;
        var k = API.origemDe(g); if (!k) return;
        var x = por[k] || (por[k] = { chave: k, rotulo: (g.contraparte && g.contraparte.nome) || API.chaveDesc(g.descRobo || g.desc), itens: [], cont: {} });
        x.itens.push(g);
        var c = g.grupo + '|' + g.sub; x.cont[c] = (x.cont[c] || 0) + 1;
      });
      return Object.keys(por).map(function (k) {
        var x = por[k], melhor = Object.keys(x.cont).sort(function (a, b) { return x.cont[b] - x.cont[a]; })[0].split('|');
        x.grupo = melhor[0]; x.sub = melhor[1]; x.status = x.itens.some(function (g) { return API.status(g) === 'confirmar'; }) ? 'confirmar' : 'identificar';
        return x;
      }).sort(function (a, b) { return b.itens.length - a.itens.length; });
    },
    /* 1.1.0 (3.107): o que a pessoa precisa para decidir sem abrir nada: total, quantos, de quando a quando, o último valor;
       a sugestão legível e por que o app sugeriu; se parece de uma viagem; a lista (data, valor, conta/cartão, descrição original) */
    resumo: function (x) {
      var l = x.itens.slice().sort(function (a, b) { return String(a.data || '') < String(b.data || '') ? -1 : 1; }), ult = l[l.length - 1] || {};
      return { n: l.length, total: Math.round(l.reduce(function (s, g) { return s + (Number(g.valor) || 0); }, 0) * 100) / 100,
        de: (l[0] || {}).data || '', ate: ult.data || '', ultimo: Number(ult.valor) || 0, itens: l };
    },
    sugestao: function (x) {
      if (x.status !== 'confirmar') return '';
      return ((GRUPOS[x.grupo] || {}).nome || x.grupo) + ' > ' + x.sub;
    },
    /* por que o app sugeriu: o tipo de loja (MCC), a categoria do banco, um parecido que a pessoa já confirmou, ou o robô pela descrição */
    motivo: function (x) {
      var base = x.itens.filter(function (g) { return g.grupo === x.grupo && g.sub === x.sub; }), g0 = base[0] || x.itens[0] || {};
      if (base.some(function (g) { return g.palpiteMcc; })) return { k: 'mcc', txt: tr('pelo tipo de loja que o banco informa', 'from the store type the bank reports', 'por el tipo de tienda que informa el banco') };
      var cb = (base.find(function (g) { return g.catPluggy; }) || {}).catPluggy;
      if (cb) return { k: 'banco', txt: tr('pela categoria que o banco informa ("', 'from the bank\'s category ("', 'por la categoría que informa el banco ("') + cb + '")' };
      var k = API.chaveDesc(g0.descRobo || g0.desc).split(' ')[0] || '', ids = {}; x.itens.forEach(function (g) { ids[g.id] = 1; });
      var par = k.length >= 4 && Gasto.todos().find(function (o) { return !ids[o.id] && (o.confirmadoEm || o.editadoPessoa) && o.grupo === x.grupo && o.sub === x.sub && API.chaveDesc(o.descRobo || o.desc).split(' ')[0] === k; });
      if (par) return { k: 'parecido', txt: tr('parecido com "', 'similar to "', 'parecido a "') + String(par.desc || '').slice(0, 40) + tr('", que você já confirmou', '", which you already confirmed', '", que ya confirmaste') };
      return { k: 'robo', txt: tr('o robô sugeriu pela descrição do banco', 'the robot suggested it from the bank description', 'el robot lo sugirió por la descripción del banco') };
    },
    /* parece da viagem cadastrada (as datas e a cidade batem), ou, sem viagem, a cidade no texto do cartão */
    viagem: function (x) {
      if (!window.Viagem) return null;
      var ids = {}; x.itens.forEach(function (g) { ids[g.id] = 1; });
      var achou = null;
      (Viagem.lista() || []).some(function (v) { var n = Viagem.sugestoes(v).filter(function (s) { return ids[s.g.id]; }).length; if (n) achou = { v: v, n: n }; return !!n; });
      if (achou) return achou;
      var c = ''; x.itens.some(function (g) { c = Viagem.cidadeDe(g); return !!c; });
      if (!c) return null;
      var r = API.resumo(x), antes = new Date(Date.parse(r.de + 'T12:00:00Z') - 7 * 864e5).toISOString().slice(0, 10);
      /* a cidade de casa (3 ou mais gastos de antes com a mesma cidade) não é viagem */
      if (Gasto.todos().filter(function (g) { return !ids[g.id] && g.data && g.data < antes && Viagem.cidadeDe(g) === c; }).length >= 3) return null;
      return { cidade: c, nome: c.charAt(0) + c.slice(1).toLowerCase(), de: r.de, ate: r.ate };
    },
    detalhe: function (x, op) {
      op = op || {};
      var r = API.resumo(x), d = function (iso) { return iso ? String(iso).slice(8, 10) + '/' + String(iso).slice(5, 7) : ''; };   /* DD/MM */
      var h = '<span class="t-sub">' + esc(r.n + tr(' lançamento(s) · ', ' entr(ies) · ', ' movimiento(s) · ') + fmt(r.total) +
        (r.de ? (r.de === r.ate ? tr(' · em ', ' · on ', ' · el ') + d(r.de) : tr(' · de ', ' · from ', ' · del ') + d(r.de) + tr(' a ', ' to ', ' al ') + d(r.ate)) : '') +
        (r.n > 1 ? tr(' · último ', ' · last ', ' · último ') + fmt(r.ultimo) : '')) + '</span>';
      var sg = API.sugestao(x);
      if (sg) h += '<span class="t-sub or-sug">' + esc(tr('Sugestão: ', 'Suggestion: ', 'Sugerencia: ') + sg + ' (' + API.motivo(x).txt + ')') + '</span>';
      var vg = API.viagem(x);
      if (vg && vg.v) h += '<span class="t-sub or-viagem">✈️ ' + esc(tr('Parece da viagem ', 'Looks like the trip ', 'Parece del viaje ') + vg.v.nome) +
        ' · <button type="button" class="linkinho" data-acao="vg-abrir" data-close="genModal" data-v="' + esc(vg.v.id) + '">' + esc(tr('conferir na viagem', 'check in the trip', 'revisar en el viaje')) + '</button></span>';
      else if (vg && vg.cidade) h += '<span class="t-sub or-viagem">✈️ ' + esc(tr('Compra em ', 'Purchase in ', 'Compra en ') + vg.nome + tr(': foi viagem?', ': was it a trip?', ': ¿fue un viaje?')) +
        ' <button type="button" class="linkinho" data-acao="vg-criar" data-n="' + esc(vg.nome) + '" data-de="' + esc(vg.de) + '" data-ate="' + esc(vg.ate) + '">' + esc(tr('Criar a viagem', 'Create the trip', 'Crear el viaje')) + '</button></span>';
      var conta = function (g) {
        var c = g.cartaoId && Array.isArray(ST.cartoes) && ST.cartoes.find(function (k) { return k.id === g.cartaoId; });
        return c ? (c.apelido || c.nome || tr('cartão', 'card', 'tarjeta')) + (c.fim ? ' ···' + c.fim : '') : (g.cartaoNome || g.conta || '');
      };
      h += '<details class="or-lista"' + (op.aberto ? ' open' : '') + '><summary class="small">' + esc(tr('ver os lançamentos', 'see the entries', 'ver los movimientos')) + '</summary>' +
        '<ul class="small" style="margin:4px 0 0;padding-left:18px">' + r.itens.slice().reverse().slice(0, 30).map(function (g) {
          return '<li>' + esc([d(g.data), fmt(Number(g.valor) || 0), conta(g), String(g.descRobo || g.desc || '').slice(0, 80)].filter(Boolean).join(' · ')) + '</li>';
        }).join('') + (r.n > 30 ? '<li>' + esc(tr('… e mais ', '… and ', '… y ') + (r.n - 30)) + '</li>' : '') + '</ul></details>';
      return h;
    },
    confirmarGrupo: function (chave) {
      var x = API.grupos().find(function (y) { return y.chave === chave; }); if (!x || x.status !== 'confirmar') return 0;
      var base = x.itens.find(function (g) { return g.grupo === x.grupo && g.sub === x.sub; }) || x.itens[0];
      if (window.Espelho) Espelho.confirmar(base.id); else Gasto.atualizar(base.id, { confianca: undefined, revisar: false, confirmadoEm: new Date().toISOString() });
      var g = Gasto.todos().find(function (y) { return y.id === base.id; });
      return 1 + API.replicar(g, base);
    }
  };

  function avisar(n) {
    var caixa = document.getElementById('toasts'); if (!caixa) return;
    var d = document.createElement('div'); d.className = 'toast or-toast';
    d.innerHTML = '<span>' + esc(tr('Aplicado também a ' + n + ' lançamento(s) da mesma origem', 'Also applied to ' + n + ' entr(ies) from the same origin')) + '</span> · ' +
      '<button type="button" class="linkinho" data-acao="or-desfazer">' + esc(tr('Desfazer', 'Undo')) + '</button>';
    caixa.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 12000);
  }
  function selo(g) {
    var s = API.status(g); if (!s) return '';
    if (s === 'confirmar') return '<span class="or-selo or-amarelo">' + esc(tr('A confirmar', 'To confirm')) + '</span>' +
      '<button type="button" class="or-ok" data-acao="esp-confirmar" data-id="' + esc(g.id) + '" title="' + esc(tr('Confirmar esta categoria', 'Confirm this category')) + '" aria-label="' + esc(tr('Confirmar esta categoria', 'Confirm this category')) + '">✓</button>';
    return '<span class="or-selo or-vermelho">' + esc(tr('A identificar', 'To identify')) + '</span>';
  }
  function tela() {
    var gs = API.grupos(), nome = function (k) { return (GRUPOS[k] || {}).nome || k; };
    var h = '<div class="card-head"><h1>' + esc(tr('A confirmar, por origem', 'To confirm, by origin')) + '</h1></div>' +
      '<p class="small muted aba-explica">' + esc(tr('Cada linha junta os lançamentos da mesma origem (CNPJ, pessoa ou descrição). Confirme todos de uma vez, ou toque em Mudar: o que você escolher vale para todos os da mesma origem.',
        'Each row groups entries from the same origin. Confirm them all at once, or tap Change: what you choose applies to all from the same origin.')) + '</p>';
    if (!gs.length) return h + '<div class="card"><p class="small muted" style="margin:0">' + esc(tr('Nada a confirmar. 🎉', 'Nothing to confirm. 🎉')) + '</p></div>';
    return h + '<div class="card sem-pad"><table class="tbl or-tbl"><tbody>' + gs.map(function (x) {
      return '<tr><td><span class="t-main">' + esc(x.rotulo) + '</span><div class="or-det">' + API.detalhe(x) + '</div></td>' +
        '<td>' + (x.status === 'confirmar' ? esc(nome(x.grupo) + ' › ' + x.sub) + ' <span class="or-selo or-amarelo">' + esc(tr('A confirmar', 'To confirm')) + '</span>'
          : '<span class="or-selo or-vermelho">' + esc(tr('A identificar', 'To identify')) + '</span>') + '</td>' +
        '<td class="num"><div class="row" style="gap:6px;justify-content:flex-end">' +
        (x.status === 'confirmar' ? '<button class="btn sm primary" data-acao="or-confirmar-grupo" data-chave="' + esc(x.chave) + '">✓ ' + esc(tr('Confirmar todos', 'Confirm all')) + '</button>' : '') +
        '<button class="btn sm" data-acao="or-mudar" data-id="' + esc(x.itens[0].id) + '">' + esc(tr('Mudar', 'Change')) + '</button></div></td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  MoneyModulos.registrar({
    id: 'origem',
    versao: '1.1.0',
    pontos: {
      'lancamento.categoria': function (ctx) { return selo(ctx.g); },
      'lancamentos.topo': function () {
        var n = 0, m = 0; Gasto.todos().forEach(function (g) { var s = API.status(g); if (s === 'confirmar') n++; else if (s === 'identificar') m++; });
        if (!n && !m) return '';
        /* os filtros ficam à vista (não escondidos em "mais filtros") */
        return '<div class="callout or-aviso small">' + (n ? '<button type="button" class="chip click or-chip' + (bFiltro.aconfirmar ? ' on' : '') + '" data-bmarca="aconfirmar"><span class="or-selo or-amarelo">' + esc(tr('A confirmar', 'To confirm')) + '</span> ' + n + '</button>' : '') +
          (m ? '<button type="button" class="chip click or-chip' + (bFiltro.aidentificar ? ' on' : '') + '" data-bmarca="aidentificar"><span class="or-selo or-vermelho">' + esc(tr('A identificar', 'To identify')) + '</span> ' + m + '</button>' : '') +
          '· <button type="button" class="linkinho" data-irpara="b-confirmar">' + esc(tr('revisar por origem ›', 'review by origin ›')) + '</button></div>';
      }
    },
    telas: { 'b-confirmar': { app: 'budget', render: tela, ajuda: { pt: { t: 'A confirmar, por origem', o: 'Confirme os lançamentos do robô por origem.' }, en: { t: 'To confirm, by origin', o: 'Confirm the robot\'s entries by origin.' } } } },
    acoes: {
      'or-desfazer': function (el) {
        var n = API.desfazer(); var t = el.closest('.toast'); if (t && t.parentNode) t.parentNode.removeChild(t);
        Store.salvar(); render(); if (n) toast(tr('Desfeito em ' + n + ' lançamento(s).', 'Undone on ' + n + ' entr(ies).'));
      },
      'or-confirmar-grupo': function (el) { var n = API.confirmarGrupo(el.dataset.chave); Store.salvar(); render(); if (n) toast(tr(n + ' lançamento(s) confirmado(s).', n + ' entr(ies) confirmed.')); },
      'or-mudar': function (el) { abrirLancamento(el.dataset.id); }
    }
  });
  window.Origem = API;
})();
