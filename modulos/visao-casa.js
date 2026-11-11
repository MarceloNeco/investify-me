/* =====================================================================
   modulos/visao-casa.js — "dois cofres": o que é da casa e o que é reservado (3.66)        1.0.0 · 12/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 11/Nov/2026; desenho em DESENHO-visao-da-casa.md)
     Um membro da família com a visão "Só a casa" vê a parte da casa; o resto fica RESERVADO e nem chega ao aparelho dele
     (outra chave e outra regra no banco). Este módulo diz, no aparelho de quem vê tudo, o escopo de cada registro.
     A nuvem (nuvem.js 1.14.0) usa a resposta: o reservado sobe com o id "r.<id>" e a chave reservada.
   A REGRA (na dúvida: reservado)
     · Lançamentos (gastos): da casa quando são de uma pessoa da visão casa (quem ou para quem), do cartão que ela usa,
       ou pagam um compromisso da casa. PJ (contador, DAS, TFE, Contabilizei, pró-labore…) é sempre reservado.
     · Compromissos (recorrentes): da casa, menos os PJ e os marcados "Só eu vejo". Os pagamentos seguem o compromisso.
     · Cartões: os que ela usa e os que pagam compromissos da casa. Bancos (só o nome), pessoas, profissionais, saúde,
       agendamentos, assinaturas (menos PJ) e preços: da casa.
     · Todo o resto (investimentos, renda dele, extratos, IR, saldos, patrimônio, robô, espelho, ponte…): reservado.
     · O chefe muda um item na mão: campo `escopo` ('casa' | 'reservado') no lançamento ou no compromisso.
   TOTAIS DA FAMÍLIA
     Coleção `resumo` (da casa), um por mês ('AAAA-MM'): {grupos: {GRUPO: valor}, total, n, atualizadoEm} de TODOS os
     gastos da família (sem renda, investimento nem transferência). Quem calcula é o aparelho de quem vê tudo, logo antes
     de subir (Escopo.antesDeSubir).
   API (window.Escopo)
     de(colecao, item) → 'casa' | 'reservado'      deConfig(chave) → 'casa' | 'reservado'
     preparar(estado)  · ehPJ(item)  · pessoasDela()  · antesDeSubir(estado)
   DADOS
     Store.estado.visaoCasa = {pessoas: [ids das pessoas com a visão casa]}   (da casa: o app dela sabe quem ela é)
     Store.estado.resumo = [{id: 'AAAA-MM', grupos, total, n, atualizadoEm}]
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'resumo';
  /* PJ: siglas em maiúsculas (DAS e TFE também são palavras comuns), o resto sem diferença de caixa */
  var PJ_SIGLA = /\b(PJ|DAS|TFE|CNPJ|ISS|DARF PJ)\b/;
  var PJ_TEXTO = /\b(contador(a)?|contabilidade|cont[aá]bil|contabilizei|simples nacional|pr[oó][ -]?labore|alvar[aá]|junta comercial|certificado digital)\b/i;
  var CASA_COLS = { pessoas: 1, profissionais: 1, saude_planos: 1, agendamentos: 1, precos: 1, bancos: 1, resumo: 1 };
  var CASA_CONFIG = { visaoCasa: 1, categorias: 1, moedaBase: 1 };

  var C = { dela: {}, cartoes: {}, rec: {} };
  function tem(o, k) { return !!(k && o[k]); }
  function ehPJ(x) {
    if (!x || typeof x !== 'object') return false;
    if (x.pj === true) return true;
    var t = [x.sub, x.desc, x.nome, x.categoria, x.grupoPluggy, x.catPluggy].filter(Boolean).join(' · ');
    return PJ_SIGLA.test(t) || PJ_TEXTO.test(t);
  }
  function manual(x) { return x && (x.escopo === 'casa' || x.escopo === 'reservado') ? x.escopo : ''; }
  function recCasa(r) { if (manual(r)) return manual(r) === 'casa'; return !ehPJ(r); }

  var API = {
    ehPJ: ehPJ,
    pessoasDela: function () { return Object.keys(C.dela); },
    /* as listas que a regra consulta (pessoas da visão casa, cartões dela, compromissos da casa) */
    preparar: function (est) {
      var dela = {}, cartoes = {}, rec = {};
      ((est.visaoCasa && est.visaoCasa.pessoas) || []).forEach(function (id) { dela[id] = 1; });
      (est.cartoes || []).forEach(function (c) {
        var quem = c.usaId || c.titularId;
        if (manual(c) === 'casa' || (quem && dela[quem]) || (c.finais || []).some(function (f) { return f.titularId && dela[f.titularId]; })) cartoes[c.id] = 1;
      });
      (est.recorrentes || []).forEach(function (r) { if (recCasa(r)) { rec[r.id] = 1; if (r.cartaoId) cartoes[r.cartaoId] = 1; } });
      C = { dela: dela, cartoes: cartoes, rec: rec };
    },
    de: function (col, x) {
      if (CASA_COLS[col]) return 'casa';
      if (!x || typeof x !== 'object') return 'reservado';
      switch (col) {
        case 'gastos':
          if (manual(x)) return manual(x);
          if (ehPJ(x)) return 'reservado';
          if (tem(C.dela, x.quemId) || tem(C.dela, x.paraQuemId) || tem(C.cartoes, x.cartaoId) || tem(C.rec, x.recorrenteId)) return 'casa';
          return 'reservado';
        case 'recorrentes': return C.rec[x.id] ? 'casa' : 'reservado';
        case 'pagamentos': return tem(C.rec, x.rid) ? 'casa' : 'reservado';
        case 'cartoes': return C.cartoes[x.id] ? 'casa' : 'reservado';
        case 'assinaturas': return manual(x) || (ehPJ(x) ? 'reservado' : 'casa');
        default: return 'reservado';
      }
    },
    deConfig: function (k) { return CASA_CONFIG[k] ? 'casa' : 'reservado'; },
    /* os totais da família por mês; só muda o atualizadoEm do mês que mudou */
    antesDeSubir: function (est) {
      var meses = {};
      (est.gastos || []).forEach(function (g) {
        if (!g || !g.data || !g.grupo || g.grupo === 'RENDA' || g.grupo === 'INVESTIMENTO') return;
        if (g.fluxo && g.fluxo !== 'saida') return;
        var m = String(g.data).slice(0, 7), v = Number(g.valor) || 0; if (!/^\d{4}-\d{2}$/.test(m)) return;
        var o = meses[m] || (meses[m] = { grupos: {}, total: 0, n: 0 });
        o.grupos[g.grupo] = Math.round(((o.grupos[g.grupo] || 0) + v) * 100) / 100;
        o.total = Math.round((o.total + v) * 100) / 100; o.n++;
      });
      var antes = {}; (est[COL] || []).forEach(function (r) { antes[r.id] = r; });
      var agora = new Date().toISOString(), out = [];
      Object.keys(meses).sort().forEach(function (m) {
        var o = meses[m], a = antes[m];
        var igual = a && a.total === o.total && a.n === o.n && JSON.stringify(a.grupos) === JSON.stringify(o.grupos);
        out.push(igual ? a : { id: m, grupos: o.grupos, total: o.total, n: o.n, atualizadoEm: agora });
      });
      est[COL] = out;
    }
  };

  /* ---------------- telas ---------------- */
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nv() { return window.MoneyNuvem && MoneyNuvem.escopos && MoneyNuvem.iniciado ? MoneyNuvem.escopos : null; }
  /* quem vê só a parte da casa (tem a chave da casa e não a reservada) */
  API.soCasa = function () { var n = nv(); if (!n) return false; var e = n.estado(); return e.mk && !e.tudo; };
  function dm(iso) { var d = new Date(iso); return isNaN(d) ? '' : ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2); }

  /* Painel de quem vê só a casa: os totais da família (do resumo que o aparelho do chefe calcula) */
  function gastosDaFamilia() {
    var l = (ST[COL] || []).slice().sort(function (a, b) { return a.id < b.id ? 1 : -1; }).slice(0, 6);
    if (!l.length) return '';
    var ult = l.reduce(function (m, r) { return r.atualizadoEm > m ? r.atualizadoEm : m; }, '');
    var grupos = {}; l.forEach(function (r) { Object.keys(r.grupos || {}).forEach(function (g) { grupos[g] = (grupos[g] || 0) + r.grupos[g]; }); });
    var ord = Object.keys(grupos).sort(function (a, b) { return grupos[b] - grupos[a]; });
    var nome = function (g) { return (typeof GRUPOS !== 'undefined' && GRUPOS[g] && GRUPOS[g].nome) || g; };
    return '<div class="card vc-familia"><div class="card-head"><h2>' + esc(tr('Gastos da família', 'Family spending')) + '</h2>' +
      '<span class="small muted">' + esc(tr('atualizado em ', 'updated on ') + dm(ult)) + '</span></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + esc(tr('Mês', 'Month')) + '</th><th class="num">' + esc(tr('Total', 'Total')) + '</th>' +
      ord.slice(0, 4).map(function (g) { return '<th class="num">' + esc(nome(g)) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      l.map(function (r) {
        return '<tr><td>' + esc(r.id.slice(5) + '/' + r.id.slice(0, 4)) + '</td><td class="num"><b>' + esc(fmt(r.total)) + '</b></td>' +
          ord.slice(0, 4).map(function (g) { return '<td class="num">' + esc(fmt((r.grupos || {})[g] || 0)) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  /* Configurações → "Família no MoneyTRIO" (só no aparelho do chefe) */
  var Tela = { lista: null, erro: '' };
  function cartaoChefe() {
    var n = nv(); if (!n) return '';
    var e = n.estado(); if (!e.tudo) return '';
    if (!Tela.lista && !Tela._pedindo) {
      Tela._pedindo = true;
      n.visoes().then(function (l) { Tela.lista = l || []; }).catch(function (er) { Tela.lista = []; Tela.erro = (er && er.status === 403) ? 'chefe' : String(er && er.message || er); })
        .then(function () { Tela._pedindo = false; if (typeof render === 'function') render(); });
    }
    var h = '<div class="card" id="vcFamilia"><div class="card-head"><h2>👪 ' + esc(tr('Família no MoneyTRIO', 'Family in MoneyTRIO')) + '</h2></div>';
    if (Tela.erro === 'chefe') return h + '<p class="small muted">' + esc(tr('Só o chefe da família escolhe quem vê o quê.', 'Only the family head chooses who sees what.')) + '</p></div>';
    var pessoas = (ST.pessoas || []).filter(function (p) { return p.tipo === 'casa' && !p.arquivada; });
    var marcadas = (ST.visaoCasa && ST.visaoCasa.pessoas) || [];
    var membros = (Tela.lista || []).filter(function (m) { return m.papel !== 'chefe'; });
    if (!e.feito) {
      h += '<p class="small">' + esc(tr('Para alguém da família ver só a parte da casa (compromissos, contas da casa, os gastos dela e os totais da família), o MoneyTRIO separa antes o que é da casa e o que é só seu. É feito uma vez, neste aparelho.',
        'For someone in the family to see only the household part (commitments, household bills, their own spending and the family totals), MoneyTRIO first separates what belongs to the household and what is yours only. Done once, on this device.')) + '</p>' +
        '<p class="small"><b>' + esc(tr('Quem é da casa (os lançamentos dessas pessoas e dos cartões que elas usam ficam na parte da casa):', 'Who belongs to the household (their entries and the cards they use go to the household part):')) + '</b></p>' +
        '<div class="vc-pessoas">' + (pessoas.length ? pessoas.map(function (p) {
          return '<label class="linha-check" style="margin-right:18px"><input type="checkbox" data-acao="vc-pessoa" data-id="' + esc(p.id) + '"' + (marcadas.indexOf(p.id) >= 0 ? ' checked' : '') + '> ' + esc(p.apelido || p.nome) + '</label>';
        }).join(' ') : '<span class="small muted">' + esc(tr('Cadastre as pessoas da casa em "Pessoas da família".', 'Add the household people in "Family people".')) + '</span>') + '</div>' +
        '<p class="small muted">' + esc(tr('Compromissos de PJ (contador, DAS, TFE…) ficam sempre só seus. Você pode mudar um item depois.', 'Business commitments (accountant, taxes…) always stay yours only. You can change an item later.')) + '</p>' +
        '<button class="btn primary" data-acao="vc-preparar"' + (marcadas.length ? '' : ' disabled') + '>' + esc(tr('Preparar a visão da família', 'Prepare the family view')) + '</button>' +
        (e.pin ? '' : '<p class="small muted">' + esc(tr('Abra pelo PIN ou pela digital antes de preparar (🔒 Bloquear agora e abrir de novo).', 'Unlock with the PIN or fingerprint before preparing.')) + '</p>');
      return h + '</div>';
    }
    h += '<p class="small">' + esc(tr('Escolha o que cada pessoa vê. "Só a casa": compromissos, contas da casa, os lançamentos dela e os totais da família.', 'Choose what each person sees. "Household only": commitments, household bills, their own entries and the family totals.')) + '</p>';
    if (!Tela.lista) return h + '<p class="small muted">…</p></div>';
    if (!membros.length) return h + '<p class="small muted">' + esc(tr('Ainda não há outra pessoa na família. Convide pelo OmniLifeONE e volte aqui.', 'No one else in the family yet. Invite through OmniLifeONE and come back.')) + '</p></div>';
    h += '<div class="vc-membros">' + membros.map(function (m) {
      var p = pessoas.filter(function (x) { return x.uid === m.user_id; })[0];
      var nome = p ? (p.apelido || p.nome) : tr('Pessoa da família', 'Family member');
      return '<div class="vc-membro" style="display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px 0;border-bottom:1px solid var(--line, rgba(127,127,127,.2))">' +
        '<div style="flex:1 1 160px;min-width:0"><b>' + esc(nome) + '</b> <span class="tiny muted">' + esc(m.papel === 'responsavel' ? tr('responsável', 'guardian') : tr('membro', 'member')) +
        (m.visao ? ' · ' + esc(m.visao === 'casa' ? tr('vê a casa', 'sees the household') : tr('vê tudo', 'sees everything')) : '') + '</span></div>' +
        '<select class="vc-visao" data-uid="' + esc(m.user_id) + '" aria-label="' + esc(tr('O que vê', 'What they see')) + '" style="flex:0 1 180px;min-width:140px;width:auto">' +
        '<option value="casa"' + (m.visao !== 'tudo' ? ' selected' : '') + '>' + esc(tr('Só a casa', 'Household only')) + '</option>' +
        '<option value="tudo"' + (m.visao === 'tudo' ? ' selected' : '') + '>' + esc(tr('Tudo', 'Everything')) + '</option></select>' +
        '<button class="btn sm" data-acao="vc-liberar" data-uid="' + esc(m.user_id) + '">' + esc(m.visao ? tr('Liberar de novo', 'Grant again') : tr('Liberar', 'Grant')) + '</button></div>';
    }).join('') + '</div>';
    return h + '</div>';
  }

  MoneyModulos.registrar({
    id: 'visao-casa', versao: '1.0.0', colecoes: [COL],
    pontos: {
      'budget.painel': function () { return API.soCasa() ? gastosDaFamilia() : ''; },
      'config.todos': function () { return cartaoChefe(); }
    },
    acoes: {
      'vc-pessoa': function (el) {
        var v = ST.visaoCasa = Object.assign({ pessoas: [] }, ST.visaoCasa), id = el.dataset.id;
        v.pessoas = v.pessoas.filter(function (x) { return x !== id; }); if (el.checked) v.pessoas.push(id);
        Store.salvar(); render();
      },
      'vc-preparar': async function () {
        var n = nv(); if (!n || n.estado().rodando) return;
        Fundo.comecar({ id: 'vc-preparar', titulo: tr('Preparando a visão da família', 'Preparing the family view') });
        try {
          var c = await n.migrar(function (msg) { Fundo.passo('vc-preparar', msg); });
          Fundo.terminar('vc-preparar', c.ok && c.concluida
            ? tr('Pronto: a parte da casa e a reservada estão separadas (' + c.casa + ' + ' + c.reservado + '). Agora libere quem vai ver.', 'Done: household and private parts separated. Now grant access.')
            : tr('Quase: alguns registros não ficaram prontos. Toque em "Preparar" de novo para continuar.', 'Almost: some records were not ready. Tap "Prepare" again to continue.'));
        } catch (e) { Fundo.limpar('vc-preparar'); toast(e && e.message || String(e), 'warn'); }
        Tela.lista = null; render();
      },
      'vc-liberar': async function (el) {
        var n = nv(), uid = el.dataset.uid, sel = document.querySelector('select.vc-visao[data-uid="' + uid + '"]'), v = (sel && sel.value) || 'casa';
        try { await n.liberar(uid, v); toast(v === 'casa' ? tr('Liberado: essa pessoa vê a parte da casa.', 'Granted: this person sees the household part.') : tr('Liberado: essa pessoa vê tudo.', 'Granted: this person sees everything.')); }
        catch (e) { toast(e && e.message || String(e), 'warn'); }
        Tela.lista = null; render();
      }
    }
  });
  window.Escopo = API;
})();
