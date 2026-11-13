/* =====================================================================
   modulos/planejados.js — Contas fixas → "Gastos planejados" (3.76)        1.0.0 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 13/Nov/2026; o pai dele vai usar: sem IA, passo a passo)
     · Uma parte da tela Contas fixas com os gastos que dá para prever, em subpartes:
       🚗 Carro e deslocamentos · 🧳 Viagens e eventos (saiu do Futuro) · 💳 Parcelados no cartão · 🔧 Manutenção do carro
       (só o lugar, por enquanto). O id antigo b-desloc leva para cá.
     · Carro e deslocamentos, guiado:
       1) "Rotina de todo dia": de onde → para onde, dias da semana (seg–sex), ida e volta, quantas vezes por dia. O km sai
          dos lugares (linha reta × 1,3, como Deslocamentos já fazia) ou é digitado.
       2) "Fim de semana": km médio por fim de semana e quantos fins de semana por mês.
       3) "Viagens longas": destino, km de ida e quantas vezes por ANO, sem mês certo. O custo do ano (combustível +
          pedágio) vira PROVISÃO mensal (÷ 12) no previsto do combustível (modulos/previsao.js). A viagem com data
          registrada em "Viagens e eventos" entra no mês dela e a provisão se ajusta (conta só as que faltam).
       4) Ajustes do carro numa linha: consumo, preço do litro, tanque, tarifa do ônibus.
       Vazio: só o passo 1 com "Começar". Com dados: combustível/mês previsto × o real (média dos últimos 3 meses),
       pedágios, app/táxi, ônibus.
     · Os dados são os de Deslocamentos (ST.lugares, ST.trajetos, ST.config.veiculo): nada se perde; as rotinas são
       trajetos com plano 'rotina' ou 'fds'. As viagens longas ficam em ST.viagens_longas.
   API (window.Planejados)
     viagens() · custoViagem(v) · provisaoMes('AAAA-MM') · kmMesRotina(t) · resumo() → {estimado, real3m, pedagio, app, publico}
   PONTOS QUE USA
     custos.planejados {parte} · planejados.viagens / planejados.parcelados (outros módulos) · ações pl-*
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'viagens_longas';
  var DIAS = [['1', 'seg', 'Mon'], ['2', 'ter', 'Tue'], ['3', 'qua', 'Wed'], ['4', 'qui', 'Thu'], ['5', 'sex', 'Fri'], ['6', 'sáb', 'Sat'], ['0', 'dom', 'Sun']];
  var PARTES = [['carro', '🚗', 'Carro e deslocamentos', 'Car and getting around'], ['viagens', '🧳', 'Viagens e eventos', 'Trips and events'],
    ['parcelados', '💳', 'Parcelados no cartão', 'Card instalments'], ['manutencao', '🔧', 'Manutenção do carro', 'Car maintenance']];
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/\./g, '').replace(',', '.')); return isNaN(n) ? 0 : n; }
  function hoje() { return API._hoje || hojeISO(); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
  function V() { return typeof Desloc !== 'undefined' ? Desloc.veiculo() : { consumo: 11, precoLitro: 6.2, tanque: 45, tarifaPublico: 5.2 }; }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function rotinas() { return (typeof Desloc !== 'undefined' ? Desloc.trajetos() : []).filter(function (t) { return t.plano === 'rotina' || t.plano === 'fds'; }); }
  function somaMes(mes, k) { var y = +mes.slice(0, 4), m = +mes.slice(5, 7) + k; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } return y + '-' + ('0' + m).slice(-2); }
  function ehComb(g) { return g.grupo === 'VEICULO' && /combust|gasolin|etanol|diesel|posto|abastec/i.test((g.sub || '') + ' ' + (g.desc || '')); }

  var API = {
    _hoje: null,
    viagens: lista,
    /* uma viagem longa: ida e volta de combustível + o pedágio que a pessoa disse (ida e volta) */
    custoViagem: function (v) { var c = V(); return n2((Number(v.km) || 0) * 2 / (c.consumo || 11) * c.precoLitro + (Number(v.pedagio) || 0)); },
    /* quantas vezes daquela viagem já têm data no ano (em "Viagens e eventos") */
    datadas: function (v, ano) {
      if (!window.Previsao || !Previsao.eventos) return 0;
      return Previsao.eventos().filter(function (e) { return !e.detectado && N(e.destino) === N(v.destino) && String(e.de || '').slice(0, 4) === ano; }).length;
    },
    provisaoMes: function (mes) {
      var ano = String(mes || hoje()).slice(0, 4);
      return n2(lista().reduce(function (s, v) { return s + API.custoViagem(v) * Math.max(0, (Number(v.vezesAno) || 0) - API.datadas(v, ano)) / 12; }, 0));
    },
    kmMesRotina: function (t) { return typeof Desloc !== 'undefined' ? n2(Desloc.custo(t, hoje()).km) : 0; },
    resumo: function () {
      var r = typeof Desloc !== 'undefined' ? Desloc.resumo(hoje()) : { combustivel: 0, pedagio: 0, app: 0, publico: 0 };
      var h = hoje().slice(0, 7), real = 0;
      (typeof Gasto !== 'undefined' ? Gasto.todos() : []).forEach(function (g) {
        var m = String(g.data || '').slice(0, 7);
        if (g.fluxo === 'saida' && ehComb(g) && m >= somaMes(h, -3) && m < h) real += Number(g.valor) || 0;
      });
      return { estimado: n2(r.combustivel + API.provisaoMes(h)), real3m: n2(real / 3), pedagio: n2(r.pedagio), app: n2(r.app), publico: n2(r.publico) };
    }
  };

  /* ---------- a tela ---------- */
  var passo = 0;   /* 0 = fechado; 1 rotina; 2 fim de semana; 3 viagem longa */
  function cx(rot, inner) { return typeof campo === 'function' ? campo(rot, inner) : '<label>' + esc(rot) + inner + '</label>'; }
  function opLugares(id) {
    var l = typeof Desloc !== 'undefined' ? Desloc.lugares() : [];
    return '<option value="">' + esc(tr('— escreva abaixo —', '— type below —')) + '</option>' + l.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.nome) + '</option>'; }).join('');
  }
  function formRotina() {
    return '<div class="card pl-form" id="plForm"><div class="card-head"><h3>1 · ' + esc(tr('Rotina de todo dia', 'Everyday routine')) + '</h3></div>' +
      '<p class="small muted">' + esc(tr('Um trajeto que se repete: casa → escola, casa → trabalho. Se não souber os km, escolha os lugares: o app estima.', 'A trip that repeats: home → school, home → work. If you do not know the km, pick the places: the app estimates.')) + '</p>' +
      '<div class="grid g2">' +
      cx(tr('De onde', 'From'), '<select id="plDe">' + opLugares() + '</select><input id="plDeTxt" placeholder="' + esc(tr('ex.: Casa', 'e.g. Home')) + '">') +
      cx(tr('Para onde', 'To'), '<select id="plPara">' + opLugares() + '</select><input id="plParaTxt" placeholder="' + esc(tr('ex.: Escola', 'e.g. School')) + '">') +
      cx(tr('Km de ida (se souber)', 'One-way km (if known)'), '<input id="plKm" inputmode="decimal">') +
      cx(tr('Quantas vezes por dia', 'Times a day'), '<input id="plVezes" inputmode="numeric" value="1">') + '</div>' +
      '<div class="row pl-dias" style="gap:8px;flex-wrap:wrap;margin:6px 0">' + DIAS.map(function (d) {
        return '<label class="linha-check"><input type="checkbox" data-pldia="' + d[0] + '"' + (+d[0] >= 1 && +d[0] <= 5 ? ' checked' : '') + '> ' + esc(pt() ? d[1] : d[2]) + '</label>';
      }).join('') + '</div>' +
      '<label class="linha-check"><input type="checkbox" id="plIdaVolta" checked> ' + esc(tr('ida e volta', 'round trip')) + '</label>' +
      '<div class="f-actions"><button class="btn" data-acao="pl-fechar">' + esc(tr('Cancelar', 'Cancel')) + '</button><button class="btn primary" data-acao="pl-rotina">' + esc(tr('Guardar e seguir', 'Save and continue')) + '</button></div></div>';
  }
  function formFds() {
    return '<div class="card pl-form" id="plForm"><div class="card-head"><h3>2 · ' + esc(tr('Fim de semana', 'Weekends')) + '</h3></div>' +
      '<div class="grid g2">' + cx(tr('Km num fim de semana (média)', 'Km in a weekend (average)'), '<input id="plFdsKm" inputmode="decimal">') +
      cx(tr('Fins de semana por mês', 'Weekends a month'), '<input id="plFdsN" inputmode="numeric" value="4">') + '</div>' +
      '<div class="f-actions"><button class="btn" data-acao="pl-pular">' + esc(tr('Pular', 'Skip')) + '</button><button class="btn primary" data-acao="pl-fds">' + esc(tr('Guardar e seguir', 'Save and continue')) + '</button></div></div>';
  }
  function formViagem() {
    return '<div class="card pl-form" id="plForm"><div class="card-head"><h3>3 · ' + esc(tr('Viagens longas', 'Long trips')) + '</h3></div>' +
      '<p class="small muted">' + esc(tr('Uma viagem que você faz algumas vezes por ano, sem mês certo (ex.: visitar a família 2× por ano). O custo do ano vira uma reserva mensal no previsto.', 'A trip you make a few times a year, no set month (e.g. visiting family twice a year). The yearly cost becomes a monthly provision in the forecast.')) + '</p>' +
      '<div class="grid g2">' + cx(tr('Destino', 'Destination'), '<input id="plVgDest">') + cx(tr('Km de ida', 'One-way km'), '<input id="plVgKm" inputmode="decimal">') +
      cx(tr('Vezes por ano', 'Times a year'), '<input id="plVgN" inputmode="numeric" value="2">') + cx(tr('Pedágio, ida e volta (R$)', 'Tolls, round trip (R$)'), '<input id="plVgPed" inputmode="decimal">') + '</div>' +
      '<div class="f-actions"><button class="btn" data-acao="pl-pular">' + esc(tr('Terminar', 'Finish')) + '</button><button class="btn primary" data-acao="pl-viagem">' + esc(tr('Guardar', 'Save')) + '</button></div></div>';
  }
  function ajustes() {
    var c = V(), sug = sugestaoLitro();
    var inp = function (k, rot, v) { return '<label class="pl-aj"><span class="tiny muted">' + esc(rot) + '</span><input data-plveic="' + k + '" inputmode="decimal" value="' + esc(String(v).replace('.', ',')) + '"></label>'; };
    return '<details class="card pl-ajustes"><summary class="small"><b>⚙ ' + esc(tr('Ajustes do carro', 'Car settings')) + '</b> <span class="muted">' +
      esc(c.consumo + ' km/l · ' + fmt(c.precoLitro) + '/l · ' + c.tanque + ' l') + '</span></summary><div class="row" style="gap:10px;flex-wrap:wrap;margin-top:8px">' +
      inp('consumo', tr('consumo (km/l)', 'km per litre'), c.consumo) + inp('precoLitro', tr('preço do litro', 'price per litre'), c.precoLitro) +
      inp('tanque', tr('tanque (l)', 'tank (l)'), c.tanque) + inp('tarifaPublico', tr('ônibus (R$)', 'bus fare'), c.tarifaPublico) + '</div>' +
      (sug ? '<p class="tiny muted">' + esc(tr('Pelos seus abastecimentos, o litro médio foi ', 'From your fill-ups, the average litre was ') + fmt(sug)) + ' <button class="linkinho" data-acao="pl-litro" data-v="' + sug + '">' + esc(tr('usar', 'use')) + '</button></p>' : '') +
      '</details>';
  }
  /* o litro médio dos abastecimentos que têm litros anotados (quando houver) */
  function sugestaoLitro() {
    var v = 0, l = 0;
    (typeof Gasto !== 'undefined' ? Gasto.todos() : []).forEach(function (g) { if (ehComb(g) && Number(g.litros) > 0) { v += Number(g.valor) || 0; l += Number(g.litros); } });
    return l > 0 ? n2(v / l) : 0;
  }
  function carro() {
    var rs = rotinas(), vs = lista(), h = '';
    if (!rs.length && !vs.length && !passo) {
      return '<div class="card pl-vazio"><h3>🚗 ' + esc(tr('Quanto custa o carro e ir e vir', 'What the car and getting around cost')) + '</h3>' +
        '<p class="small">' + esc(tr('Três perguntas simples: a rotina de todo dia, o fim de semana e as viagens longas do ano. Com isso o app prevê o combustível do mês.', 'Three simple questions: the daily routine, weekends and the year\'s long trips. With that the app forecasts the month\'s fuel.')) + '</p>' +
        '<button class="btn primary" data-acao="pl-comecar">' + esc(tr('Começar', 'Start')) + '</button></div>';
    }
    if (rs.length || vs.length) {
      var r = API.resumo(), k = function (rot, v, sub) { return typeof kpiB === 'function' ? kpiB(rot, v, null, sub) : '<div class="kpi">' + esc(rot) + ' ' + v + '</div>'; };
      h += '<div class="kpis kpis-4 pl-kpis">' + k(tr('Combustível/mês previsto', 'Fuel/month forecast'), fmt(r.estimado), tr('real: ', 'actual: ') + fmt(r.real3m) + tr(' (média de 3 meses)', ' (3-month average)')) +
        (r.pedagio ? k(tr('Pedágios/mês', 'Tolls/month'), fmt(r.pedagio)) : '') + (r.app ? k(tr('App/táxi/mês', 'Ride-hailing/month'), fmt(r.app)) : '') + (r.publico ? k(tr('Ônibus/mês', 'Bus/month'), fmt(r.publico)) : '') + '</div>';
      h += '<div class="card pl-lista"><table class="tbl"><tbody>' + rs.map(function (t) {
        var de = Desloc.lugar(t.origemId), pa = Desloc.lugar(t.destinoId);
        var nome = t.plano === 'fds' ? tr('Fim de semana', 'Weekends') : ((de ? de.nome : '?') + ' → ' + (pa ? pa.nome : '?'));
        var sub = t.plano === 'fds' ? t.vezes + tr(' por mês', ' a month') : (t.dias || []).map(function (d) { var x = DIAS.filter(function (y) { return y[0] === String(d); })[0]; return x ? (pt() ? x[1] : x[2]) : ''; }).join(' ') + (t.idaVolta === false ? '' : tr(' · ida e volta', ' · round trip'));
        return '<tr><td><span class="t-main">' + esc(nome) + '</span><div class="t-sub">' + esc(sub) + '</div></td><td class="num">' + esc(API.kmMesRotina(t).toLocaleString(pt() ? 'pt-BR' : 'en-US')) + ' km/' + esc(tr('mês', 'mo')) +
          ' <button class="linkinho" data-acao="pl-tirar" data-id="' + esc(t.id) + '" aria-label="' + esc(tr('Tirar', 'Remove')) + '">✕</button></td></tr>';
      }).join('') + vs.map(function (v) {
        return '<tr><td><span class="t-main">🧳 ' + esc(v.destino) + '</span><div class="t-sub">' + esc(v.vezesAno + tr('× por ano · ', '× a year · ') + v.km + ' km · ' + fmt(API.custoViagem(v)) + tr(' por viagem', ' per trip')) + '</div></td>' +
          '<td class="num">' + fmt(API.custoViagem(v) * v.vezesAno / 12) + '/' + esc(tr('mês', 'mo')) + ' <button class="linkinho" data-acao="pl-vg-tirar" data-id="' + esc(v.id) + '" aria-label="' + esc(tr('Tirar', 'Remove')) + '">✕</button></td></tr>';
      }).join('') + '</tbody></table>' +
        '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn sm" data-acao="pl-passo" data-n="1">+ ' + esc(tr('Rotina', 'Routine')) + '</button>' +
        '<button class="btn sm" data-acao="pl-passo" data-n="2">+ ' + esc(tr('Fim de semana', 'Weekends')) + '</button><button class="btn sm" data-acao="pl-passo" data-n="3">+ ' + esc(tr('Viagem longa', 'Long trip')) + '</button></div></div>';
      h += ajustes();
    }
    if (passo === 1) h += formRotina(); else if (passo === 2) h += formFds(); else if (passo === 3) h += formViagem();
    return h;
  }
  function secao(ctx) {
    var parte = (ctx && ctx.parte) || 'carro';
    var h = '<div class="row pl-partes" role="group" style="gap:6px;flex-wrap:wrap;margin:0 0 12px">' + PARTES.map(function (p) {
      return '<button type="button" class="btn sm' + (p[0] === parte ? ' primary' : '') + '" data-acao="cf-secao" data-v="planejados" data-parte="' + p[0] + '" aria-pressed="' + (p[0] === parte) + '">' + p[1] + ' ' + esc(pt() ? p[2] : p[3]) + '</button>';
    }).join('') + '</div>';
    if (parte === 'viagens') return h + (MoneyModulos.html('planejados.viagens', {}) || '');
    if (parte === 'parcelados') return h + (MoneyModulos.html('planejados.parcelados', {}) || '<div class="card"><p class="small muted" style="margin:0">' + esc(tr('Nenhuma compra parcelada no cartão por enquanto.', 'No card instalments for now.')) + '</p></div>');
    if (parte === 'manutencao') return h + '<div class="card pl-manut"><h3>🔧 ' + esc(tr('Manutenção do carro', 'Car maintenance')) + '</h3><p class="small muted">' +
      esc(tr('Em breve: os gastos grandes do carro já feitos e os que vêm (revisão, pneus, IPVA), para prever o ano.', 'Coming soon: the car\'s big costs done and to come (service, tyres, tax), to plan the year.')) + '</p></div>';
    return h + carro();
  }
  function lerDias() { return Array.prototype.slice.call(document.querySelectorAll('[data-pldia]')).filter(function (c) { return c.checked; }).map(function (c) { return Number(c.dataset.pldia); }); }
  function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }
  function lugar(sel, txt) {
    if (val(sel)) return val(sel);
    var nome = String(val(txt) || '').trim(); if (!nome) return '';
    var ja = Desloc.lugares().filter(function (l) { return N(l.nome) === N(nome); })[0];
    return ja ? ja.id : Desloc.salvarLugar({ nome: nome, tipo: 'outro' }).id;
  }
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.dataset || !t.dataset.plveic) return;
    ST.config = ST.config || {}; ST.config.veiculo = Object.assign({}, ST.config.veiculo || {}); ST.config.veiculo[t.dataset.plveic] = num(t.value);
    Store.salvar(); if (typeof render === 'function') render();
  });

  MoneyModulos.registrar({
    id: 'planejados', versao: '1.0.0', colecoes: [COL],
    pontos: { 'custos.planejados': secao },
    acoes: {
      'pl-comecar': function () { passo = 1; render(); },
      'pl-passo': function (el) { passo = Number(el.dataset.n) || 1; render(); setTimeout(function () { var f = document.getElementById('plForm'); if (f) f.scrollIntoView({ block: 'center' }); }, 60); },
      'pl-fechar': function () { passo = 0; render(); },
      'pl-pular': function () { passo = passo >= 3 ? 0 : passo + 1; render(); },
      'pl-rotina': function () {
        var dias = lerDias(), de = lugar('plDe', 'plDeTxt'), para = lugar('plPara', 'plParaTxt'), km = num(val('plKm'));
        if (!de || !para) return toast(tr('Diga de onde e para onde.', 'Say from where and to where.'), 'warn');
        if (!dias.length) return toast(tr('Marque pelo menos um dia.', 'Tick at least one day.'), 'warn');
        var t = { plano: 'rotina', origemId: de, destinoId: para, modo: 'carro', freq: 'semana', vezes: dias.length * Math.max(1, parseInt(val('plVezes'), 10) || 1), dias: dias,
          idaVolta: !!(document.getElementById('plIdaVolta') || {}).checked, ativo: true };
        if (km > 0) t.km = km;
        var s = Desloc.salvarTrajeto(t);
        if (!(Desloc.km(s) > 0)) toast(tr('Não deu para estimar a distância: digite os km de ida.', 'Could not estimate the distance: type the one-way km.'), 'warn');
        passo = 2; Store.salvar(); render();
      },
      'pl-fds': function () {
        var km = num(val('plFdsKm')), n = Math.max(1, parseInt(val('plFdsN'), 10) || 4);
        if (km > 0) Desloc.salvarTrajeto({ plano: 'fds', modo: 'carro', km: km, freq: 'mes', vezes: n, idaVolta: false, ativo: true });
        passo = 3; Store.salvar(); render();
      },
      'pl-viagem': function () {
        var d = String(val('plVgDest') || '').trim(), km = num(val('plVgKm')), n = Math.max(1, parseInt(val('plVgN'), 10) || 1);
        if (!d || !(km > 0)) return toast(tr('Diga o destino e os km de ida.', 'Enter the destination and the one-way km.'), 'warn');
        lista().push({ id: 'vl' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), destino: d, km: km, vezesAno: n, pedagio: num(val('plVgPed')) });
        passo = 0; Store.salvar(); render(); toast(tr('Guardado: a reserva mensal entra no previsto do combustível.', 'Saved: the monthly provision goes into the fuel forecast.'));
      },
      'pl-tirar': function (el) { Desloc.excluirTrajeto(el.dataset.id); Store.salvar(); render(); },
      'pl-vg-tirar': function (el) { ST[COL] = lista().filter(function (v) { return v.id !== el.dataset.id; }); Store.salvar(); render(); },
      'pl-litro': function (el) { ST.config.veiculo = Object.assign({}, ST.config.veiculo || {}, { precoLitro: Number(el.dataset.v) }); Store.salvar(); render(); }
    }
  });
  window.Planejados = API;
})();
