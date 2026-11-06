/* =====================================================================
   modulos/assinaturas.js — assinaturas: anual × mensal e renovação (N29 b)   1.0.0 · 06/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     Compromisso que é assinatura (streaming, app, clube…) ganha: plano mensal ou anual pré-pago, data
     de renovação, aviso antes de renovar (7 dias no mensal, 30 no anual) e a comparação "anual × mensal"
     quando os dois preços são conhecidos (ex.: YouTube anual R$ 269 × mensal R$ 26,90 = R$ 322,80/ano).
     Depois da data, a renovação seguinte é calculada sozinha (mais 1 mês ou 1 ano).
   API (window.Assinaturas)
     de(rid) · gravar(rid, dados) · proxima(reg, hoje?) → 'AAAA-MM-DD'
     comparar(precoMensal, precoAnual) → {anoMensal, anual, economia, pct, melhor: 'anual'|'mensal'|''}
     pareceAssinatura(r) → true/false (categoria ou nome conhecido)
     vencendo(hoje?) → [{reg, r, data, dias}]
   DADOS
     Store.estado.assinaturas = [{id: <id do compromisso>, plano: 'mensal'|'anual', renova, precoMensal, precoAnual}]
   PONTOS QUE USA
     compromisso.detalhes · evento compromisso.salvo · custos.topo · fita.budget · recorrente.linha
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'assinaturas';
  var RX = /assinatura|streaming|netflix|spotify|youtube|disney|prime|\bmax\b|hbo|globoplay|deezer|apple|icloud|google one|paramount|chatgpt|claude|microsoft 365|office 365|dropbox|kindle|audible|clube/i;
  function pt() { return I18n.atual === 'pt'; }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function soma(iso, plano) { return plano === 'anual' ? (Number(iso.slice(0, 4)) + 1) + iso.slice(4).replace('-02-29', '-02-28')
      : (window.Agendamentos ? Agendamentos.maisMeses(iso, 1) : iso); }

  var API = {
    de: function (rid) { return lista().find(function (x) { return x.id === rid; }) || null; },
    pareceAssinatura: function (r) { return !!r && RX.test([r.sub, r.nome].join(' ')); },
    gravar: function (rid, d) {
      var x = API.de(rid);
      if (!d) { ST[COL] = lista().filter(function (y) { return y.id !== rid; }); return null; }
      if (!x) { x = { id: rid }; lista().push(x); }
      x.plano = d.plano === 'anual' ? 'anual' : 'mensal';
      x.renova = /^\d{4}-\d{2}-\d{2}$/.test(String(d.renova || '')) ? d.renova : '';
      x.precoMensal = n2(d.precoMensal); x.precoAnual = n2(d.precoAnual);
      return x;
    },
    proxima: function (reg, hoje) {
      hoje = String(hoje || hojeISO()).slice(0, 10);
      var d = reg.renova; if (!d) return '';
      for (var i = 0; i < 600 && d < hoje; i++) d = soma(d, reg.plano);
      return d;
    },
    comparar: function (m, a) {
      m = Number(m) || 0; a = Number(a) || 0;
      if (!(m > 0 && a > 0)) return null;
      var anoM = n2(m * 12), eco = n2(Math.abs(anoM - a));
      return { anoMensal: anoM, anual: a, economia: eco, pct: Math.round(eco / Math.max(anoM, a) * 100), melhor: anoM > a ? 'anual' : anoM < a ? 'mensal' : '' };
    },
    vencendo: function (hoje) {
      hoje = String(hoje || hojeISO()).slice(0, 10);
      return lista().map(function (reg) {
        var r = Recorrente.achar(reg.id); if (!r || r.ativo === false) return null;
        var d = API.proxima(reg, hoje); if (!d) return null;
        var dias = Math.round((new Date(d + 'T12:00:00') - new Date(hoje + 'T12:00:00')) / 86400000);
        return dias <= (reg.plano === 'anual' ? 30 : 7) ? { reg: reg, r: r, data: d, dias: dias } : null;
      }).filter(Boolean).sort(function (a, b) { return a.data.localeCompare(b.data); });
    }
  };
  function textoComparacao(c) {
    if (!c) return '';
    return pt() ? 'Anual ' + fmt(c.anual) + ' × mensal ' + fmt(c.anoMensal / 12) + ' = ' + fmt(c.anoMensal) + '/ano' + (c.melhor ? ': o ' + c.melhor + ' sai ' + fmt(c.economia) + ' (' + c.pct + '%) mais barato.' : ': dá no mesmo.')
                : 'Yearly ' + fmt(c.anual) + ' × monthly ' + fmt(c.anoMensal / 12) + ' = ' + fmt(c.anoMensal) + '/yr' + (c.melhor ? ': ' + c.melhor + ' is ' + fmt(c.economia) + ' (' + c.pct + '%) cheaper.' : ': the same.');
  }
  function frase(v) {
    return (pt() ? 'Assinatura renova: ' : 'Subscription renews: ') + v.r.nome + ' (' + (v.reg.plano === 'anual' ? (pt() ? 'anual' : 'yearly') : (pt() ? 'mensal' : 'monthly')) + ') ' +
      (v.dias === 0 ? (pt() ? 'hoje' : 'today') : (pt() ? 'em ' : 'on ') + I18n.data(v.data));
  }

  MoneyModulos.registrar({
    id: 'assinaturas',
    versao: '1.0.0',
    colecoes: [COL],
    pontos: {
      'compromisso.detalhes': function (ctx) {
        var r = ctx.r || {}, x = r.id ? API.de(r.id) : null, liga = !!x || API.pareceAssinatura(r);
        x = x || { plano: 'mensal', renova: '', precoMensal: '', precoAnual: '' };
        return '<div class="bloco-regra as-box"><label class="linha-check"><input type="checkbox" id="asLiga"' + (liga ? ' checked' : '') + '> <b>' + (pt() ? 'É uma assinatura' : 'It is a subscription') + '</b></label>' +
          '<div id="asCampos"' + (liga ? '' : ' class="hidden"') + '><div class="grid g2">' +
            campo(pt() ? 'Plano' : 'Plan', '<select id="asPlano"><option value="mensal"' + (x.plano !== 'anual' ? ' selected' : '') + '>' + (pt() ? 'Mensal' : 'Monthly') + '</option><option value="anual"' + (x.plano === 'anual' ? ' selected' : '') + '>' + (pt() ? 'Anual (pago adiantado)' : 'Yearly (prepaid)') + '</option></select>') +
            campo(pt() ? 'Renova em' : 'Renews on', Cal.campo('asRenova', x.renova || '', { vazio: pt() ? 'não sei' : 'not sure' })) +
            campo(pt() ? 'Preço mensal (R$)' : 'Monthly price', '<input type="number" id="asMensal" min="0" step="0.01" inputmode="decimal" value="' + (x.precoMensal || '') + '">') +
            campo(pt() ? 'Preço anual (R$)' : 'Yearly price', '<input type="number" id="asAnual" min="0" step="0.01" inputmode="decimal" value="' + (x.precoAnual || '') + '">') +
          '</div><p class="small as-comp" id="asComp">' + esc(textoComparacao(API.comparar(x.precoMensal, x.precoAnual))) + '</p></div></div>';
      },
      'custos.topo': function () {
        var v = API.vencendo(); if (!v.length) return '';
        return '<div class="aviso-box as-aviso">' + v.map(function (x) { return '<div class="small">📺 ' + esc(frase(x)) + '</div>'; }).join('') + '</div>';
      },
      'fita.budget': function () { return API.vencendo().map(function (x) { return { ico: '📺', texto: frase(x), tom: 'warn' }; }); },
      'recorrente.linha': function (ctx) {
        var x = ctx.r && ctx.r.id ? API.de(ctx.r.id) : null; if (!x) return '';
        var d = API.proxima(x);
        return '<div class="t-sub">📺 ' + esc((x.plano === 'anual' ? (pt() ? 'anual' : 'yearly') : (pt() ? 'mensal' : 'monthly')) + (d ? (pt() ? ' · renova ' : ' · renews ') + I18n.data(d) : '')) + '</div>';
      }
    },
    ouvir: {
      'compromisso.form': function () {
        var ck = document.getElementById('asLiga'); if (!ck) return;
        var cx = document.getElementById('asCampos');
        ck.addEventListener('change', function () { cx.classList.toggle('hidden', !ck.checked); });
        var at = function () { var c = API.comparar(document.getElementById('asMensal').value, document.getElementById('asAnual').value); document.getElementById('asComp').textContent = textoComparacao(c); };
        ['asMensal', 'asAnual'].forEach(function (id) { document.getElementById(id).addEventListener('input', at); });
      },
      'compromisso.salvo': function (d) {
        var ck = document.getElementById('asLiga'); if (!ck || !d || !d.id) return;
        var v = function (id) { return (document.getElementById(id) || {}).value || ''; };
        API.gravar(d.id, ck.checked ? { plano: v('asPlano'), renova: v('asRenova'), precoMensal: v('asMensal'), precoAnual: v('asAnual') } : null);
      }
    }
  });
  window.Assinaturas = API;
})();
