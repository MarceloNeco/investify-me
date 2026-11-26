/* =====================================================================
   modulos/consumo.js — consumo de LUZ e GÁS dentro da categoria (3.119)        1.0.0 · 26/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 26/Nov/2026; sem menu novo, sem IA)
     O robô lê a conta e manda, na ficha do comprovante (modulos/comprovantes.js 1.3.0, x.ficha):
       · luz (Enel): consumo_kwh, dias, referencia, historico_kwh [{mes, kwh, dias}], bandeira, tarifa_kwh, multa, juros, cosip,
         sem_debito_automatico;
       · gás (NF-e XML): consumo_m3, consumo_kg, periodo.
     Onde aparece (dentro da categoria, nada de tela nova):
       · no detalhe do lançamento que pagou a conta (ponto lancamento.form): "⚡ 250 kWh em 30 dias (8,3 kWh/dia) · ref. 10/2026",
         o quanto mudou contra a média do histórico, a bandeira, a tarifa por kWh, multa/juros/COSIP e o histórico dos meses em
         barrinhas; no gás: m³, kg e o período;
       · na linha da categoria em Fluxo › Por categoria (FluxoCat): "⚡ 250 kWh · −8% contra a média".
   API (window.Consumo)
     de(x) → {tipo: 'luz'|'gas', kwh, dias, porDia, referencia, historico: [{mes, kwh, dias}], media, variacao, bandeira, tarifa, multa,
             juros, cosip, m3, kg, periodo} | null      (x = comprovante com ficha)
     doGasto(g) → o consumo do comprovante pago por este lançamento · daCategoria(grupo, sub, mes) → o do mês naquela categoria
     linha(grupo, sub, mes) → o html curto para a linha da categoria · bloco(c) → o html do detalhe
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function num(v) { var n = Number(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) && v !== '' && v != null ? n : null; }
  function n1(v) { return (Math.round(v * 10) / 10).toLocaleString(I18n.locale ? I18n.locale() : 'pt-BR'); }
  function mesDe(m) { var s = String(m || ''), a = /^(\d{4})-(\d{2})/.exec(s), b = /^(\d{1,2})\/(\d{4})$/.exec(s); return a ? a[1] + '-' + a[2] : b ? b[2] + '-' + ('0' + b[1]).slice(-2) : s.slice(0, 7); }
  function rotMes(m) { var k = mesDe(m); return /^\d{4}-\d{2}$/.test(k) ? k.slice(5) + '/' + k.slice(0, 4) : String(m || ''); }
  function lista() { return window.Comprovantes ? Comprovantes.lista() : []; }

  var API = {
    de: function (x) {
      var f = x && x.ficha; if (!f) return null;
      var kwh = num(f.consumo_kwh), m3 = num(f.consumo_m3), kg = num(f.consumo_kg);
      if (kwh == null && m3 == null && kg == null) return null;
      if (kwh != null) {
        var dias = num(f.dias), hist = (Array.isArray(f.historico_kwh) ? f.historico_kwh : []).map(function (h) { return { mes: mesDe(h.mes), kwh: num(h.kwh), dias: num(h.dias) }; })
          .filter(function (h) { return h.kwh != null; }).sort(function (a, b) { return a.mes < b.mes ? -1 : 1; });
        var ref = mesDe(f.referencia), outros = hist.filter(function (h) { return h.mes !== ref; });
        var media = outros.length ? outros.reduce(function (s, h) { return s + h.kwh; }, 0) / outros.length : null;
        return { tipo: 'luz', kwh: kwh, dias: dias, porDia: dias ? kwh / dias : null, referencia: ref, historico: hist, media: media,
          variacao: media ? (kwh - media) / media : null, bandeira: String(f.bandeira || ''), tarifa: num(f.tarifa_kwh),
          multa: num(f.multa), juros: num(f.juros), cosip: num(f.cosip) };
      }
      return { tipo: 'gas', m3: m3, kg: kg, periodo: String(f.periodo || '') };
    },
    doGasto: function (g) {
      if (!g) return null;
      var x = lista().find(function (y) { return y.ficha && (y.pagoId === g.id || y.gastoId === g.id); });
      return x ? API.de(x) : null;
    },
    daCategoria: function (grupo, sub, mes) {
      var gs = typeof Gasto !== 'undefined' ? Gasto.todos() : [], achado = null;
      lista().forEach(function (x) {
        var c = x.ficha && API.de(x); if (!c) return;
        var g = (x.pagoId || x.gastoId) && gs.find(function (y) { return y.id === (x.pagoId || x.gastoId); });
        var m = g ? String(g.data || '').slice(0, 7) : String(x.vencimento || x.data || '').slice(0, 7);
        if (m !== mes) return;
        if (g ? (g.grupo === grupo && g.sub === sub) : (c.tipo === 'luz' ? /energia|luz/i.test(sub) : /g[aá]s/i.test(sub))) achado = achado || c;
      });
      return achado;
    },
    texto: function (c) {
      if (!c) return '';
      if (c.tipo === 'luz') return '⚡ ' + n1(c.kwh) + ' kWh' + (c.variacao != null ? ' · ' + (c.variacao >= 0 ? '+' : '−') + Math.round(Math.abs(c.variacao) * 100) + '% ' + tr('contra a média', 'vs. average', 'frente a la media') : '');
      return '🔥 ' + [c.m3 != null ? n1(c.m3) + ' m³' : '', c.kg != null ? n1(c.kg) + ' kg' : ''].filter(Boolean).join(' · ');
    },
    linha: function (grupo, sub, mes) { var c = API.daCategoria(grupo, sub, mes); return c ? '<div class="tiny muted cs-linha">' + esc(API.texto(c)) + '</div>' : ''; },
    bloco: function (c) {
      if (!c) return '';
      var l = [];
      if (c.tipo === 'luz') {
        l.push('⚡ ' + n1(c.kwh) + ' kWh' + (c.dias ? tr(' em ', ' in ', ' en ') + c.dias + tr(' dias', ' days', ' días') + ' (' + n1(c.porDia) + ' kWh/' + tr('dia', 'day', 'día') + ')' : '') + (c.referencia ? ' · ' + tr('ref. ', 'ref. ', 'ref. ') + rotMes(c.referencia) : ''));
        if (c.media != null) l.push((c.variacao >= 0 ? '↑ ' : '↓ ') + Math.round(Math.abs(c.variacao) * 100) + '% ' + tr('contra a média dos meses anteriores (', 'vs. the average of previous months (', 'frente a la media de los meses anteriores (') + n1(c.media) + ' kWh)');
        var ex = [c.bandeira ? tr('bandeira ', 'tariff flag ', 'bandera ') + c.bandeira : '', c.tarifa != null ? tr('tarifa ', 'rate ', 'tarifa ') + fmt(c.tarifa) + '/kWh' : '',
          c.multa ? tr('multa ', 'late fee ', 'multa ') + fmt(c.multa) : '', c.juros ? tr('juros ', 'interest ', 'intereses ') + fmt(c.juros) : '', c.cosip ? 'COSIP ' + fmt(c.cosip) : ''].filter(Boolean);
        if (ex.length) l.push(ex.join(' · '));
      } else {
        l.push(API.texto(c) + (c.periodo ? ' · ' + c.periodo : ''));
      }
      var hist = c.tipo === 'luz' && c.historico.length > 1 ? (function () {
        var mx = Math.max.apply(null, c.historico.map(function (h) { return h.kwh; })) || 1;
        return '<div class="cs-hist" role="img" aria-label="' + esc(tr('Consumo dos meses', 'Monthly consumption', 'Consumo de los meses')) + '">' + c.historico.slice(-12).map(function (h) {
          return '<span class="cs-col' + (h.mes === c.referencia ? ' cs-atual' : '') + '" title="' + esc(rotMes(h.mes) + ': ' + n1(h.kwh) + ' kWh') + '"><i style="height:' + Math.max(4, Math.round(h.kwh / mx * 40)) + 'px"></i><small>' + esc(h.mes.slice(5)) + '</small></span>';
        }).join('') + '</div>';
      })() : '';
      return '<div class="bloco-regra cs-bloco"><span class="bf-tit">' + esc(c.tipo === 'luz' ? tr('Consumo de luz', 'Electricity use', 'Consumo de luz') : tr('Consumo de gás', 'Gas use', 'Consumo de gas')) + '</span>' +
        l.map(function (t) { return '<div class="small">' + esc(t) + '</div>'; }).join('') + hist + '</div>';
    }
  };

  MoneyModulos.registrar({
    id: 'consumo', versao: '1.0.0', colecoes: [], telas: {}, ouvir: {}, acoes: {},
    pontos: { 'lancamento.form': function (ctx) { return API.bloco(API.doGasto(ctx && ctx.g)); } }
  });
  window.Consumo = API;
})();
