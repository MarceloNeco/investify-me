/* =====================================================================
   modulos/previsao.js — previsto × realizado por categoria (3.69)        1.0.0 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (regra aprovada pelo dono, 13/Nov/2026)
     Para cada grupo › categoria de saída, o PREVISTO do mês M é a soma de três partes:
     a) Contas certas: as ocorrências dos compromissos (Custos/Recorrente) com vencimento em M, pelo valor e dia, como
        "comprometido", antes de o banco mandar. Quando o lançamento real chega e casa com o compromisso (pagamento
        conciliado, marcado como pago, ou lançamento com recorrenteId no mês), o valor real substitui a previsão (nunca
        conta duas vezes). Os lançamentos ligados a compromissos ficam fora da média dos variáveis.
     b) Variáveis: média dos últimos 6 meses fechados antes de M (sem os lançamentos de compromisso, sem os de evento e sem
        os meses em que a categoria teve evento) × peso do mês (o gasto daquele mês no ano anterior ÷ a média mensal do
        ano anterior; só com 12 meses ou mais de histórico da categoria; entre 0,6 e 1,5; sem isso, peso 1) × a correção
        pelo IPCA do grupo (GRUPOS[x].ipca, a taxa de 12 meses guardada pelo Futuro; do meio da janela até M). Sem a
        taxa guardada, sem correção (o app não busca nada sozinho).
     c) Eventos: viagens registradas no Futuro (destino, datas, de carro). A gasolina extra = km de ida × 2 ÷ consumo ×
        preço do litro (Deslocamentos → veículo) soma ao previsto do combustível do mês da ida. O km vem do que a pessoa
        digitou, ou do que o app aprendeu daquele destino (viagem descoberta), ou do lugar com o mesmo nome em
        Deslocamentos (linha reta × 1,3).
     d) Viagem descoberta depois: o normal é abastecer ~1 vez por semana. Se numa janela de 4 dias o combustível passa de
        2× a mediana semanal, ou há 2 abastecimentos ou mais quando o normal é 1, o app PERGUNTA em "Precisa da sua
        atenção" (Painel e 📥): "Parece que teve viagem entre X e Y (R$ Z de combustível). Foi viagem?". Sim: aceita um
        destino (opcional), marca esses lançamentos como do evento (g.evento), tira da média e aprende o km do destino.
        Não: nada muda (não pergunta de novo). Nunca marca sozinho.
     e) O limite digitado à mão (orçamento 3.67) continua como META; o previsto é a estimativa. O cartão mostra os dois.
     Visão da casa: só o que ela já vê (os lançamentos e compromissos dela); sem renda e sem "sobra"; não pergunta de viagem.
   API (window.Previsao)
     previstoMes(grupo, sub, mes?) → {previsto, fixo, variavel, evento, gasto, comprometidoAVir: [{nome, dia, valor}],
                                       ritmoHoje, estado: 'ok'|'adiantado'|'acima', peso, base}
     categorias(mes?) → [{grupo, sub, ...previstoMes}]   (as que têm previsto ou gasto no mês)
     totalMes(mes?) → {mes, previsto, gasto, aVir, aVirCertas, rendaPrevista, sobra}   (rendaPrevista/sobra null na visão da casa)
     proximos(n = 3) → [totalMes(M+1) … totalMes(M+n)]
     suspeitas() → [{chave, de, ate, valor, ids}]   (viagens que parecem ter acontecido e ainda não foram respondidas)
     responder(chave, foi, destino?) · eventos() · salvarEvento(dados) · tirarEvento(id) · kmDe(destino)
   DADOS
     Store.estado.eventos = [{id, tipo: 'viagem', destino, de, ate, carro, km?, combustivel?, detectado?}]
     ST.config.viagensNao = {chave: 1}   (as suspeitas que a pessoa disse que não eram viagem)
     lançamento: evento = id do evento (g.evento)
   PONTOS QUE USA
     futuro.topo (cartão "Viagens e eventos") · budget.atencao (pergunta) · itens inbox.itens (📥) · ações pv-*
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'eventos', RX_COMB = /combust|gasolin|etanol|diesel|posto|abastec/i;
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function hoje() { return API._hoje || hojeISO(); }
  function mesDe(d) { return String(d || '').slice(0, 7); }
  function somaMes(mes, k) { var y = +mes.slice(0, 4), m = +mes.slice(5, 7) + k; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } return y + '-' + ('0' + m).slice(-2); }
  function diasNoMes(mes) { return new Date(+mes.slice(0, 4), +mes.slice(5, 7), 0).getDate(); }
  function isoMais(iso, d) { var x = new Date(iso + 'T12:00:00'); x.setDate(x.getDate() + d); return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2); }
  function difDias(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000); }
  function mediana(l) { if (!l.length) return 0; var s = l.slice().sort(function (a, b) { return a - b; }), i = Math.floor(s.length / 2); return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2; }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function eventos() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function cfg() { return (ST.config = ST.config || {}); }
  function saidas() { return Gasto.todos().filter(function (g) { return g.fluxo === 'saida' && g.data; }); }
  function ehComb(g) { return g.grupo === 'VEICULO' && RX_COMB.test((g.sub || '') + ' ' + (g.desc || '')); }
  function nomeMes(mes) { return new Date(mes + '-15T12:00:00').toLocaleDateString(pt() ? 'pt-BR' : 'en-US', { month: 'long' }); }

  /* a categoria do combustível: a mais usada nos abastecimentos */
  function catComb() {
    var c = {}; saidas().forEach(function (g) { if (ehComb(g)) { var k = g.grupo + '|' + g.sub; c[k] = (c[k] || 0) + 1; } });
    var k = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; })[0] || 'VEICULO|Combustível', i = k.indexOf('|');
    return { grupo: k.slice(0, i), sub: k.slice(i + 1) };
  }
  /* a taxa de 12 meses do IPCA do grupo, se o Futuro já buscou (cache do Orcamento); senão, nenhuma */
  function taxaIpca(grupo) {
    try {
      var c = typeof Orcamento !== 'undefined' ? Orcamento.carregar() : {}, G = GRUPOS[grupo] || GRUPOS.OUTROS;
      var s = c['s' + G.ipca] || c.s433; return s && isFinite(s.ano) ? s.ano / 100 : 0;
    } catch (e) { return 0; }
  }

  /* ---- a) contas certas ---- */
  function pagoReal(o) {
    var reg = o.registro;
    if (reg && reg.valor != null && (reg.gastoId || reg.estado === 'confirmado' || reg.estado === 'pago')) return n2(reg.valor);
    var g = Gasto.todos().filter(function (x) { return x.recorrenteId === o.r.id && mesDe(x.data) === mesDe(o.data); })[0];
    if (g) return n2(g.valor);
    if (reg && (reg.estado === 'pago' || reg.estado === 'confirmado')) return n2(o.valor);
    return null;
  }
  function certasDoMes(mes) {
    if (typeof Recorrente === 'undefined') return [];
    return Recorrente.ocorrencias(mes + '-01', mes + '-' + diasNoMes(mes)).filter(function (o) {
      return (GRUPOS[o.r.grupo] || {}).fluxo === 'saida' && o.estado !== 'cancelado';
    }).map(function (o) { var real = pagoReal(o); return { o: o, grupo: o.r.grupo, sub: o.r.sub, nome: o.r.nome, data: o.data, valor: n2(o.valor), real: real }; });
  }

  /* ---- b) variáveis ---- */
  function historico(grupo, sub) {
    var l = saidas().filter(function (g) { return g.grupo === grupo && g.sub === sub; });
    var meses = {}, evMes = {}, primeiro = '';
    l.forEach(function (g) {
      var m = mesDe(g.data); if (!primeiro || m < primeiro) primeiro = m;
      if (g.evento) { evMes[m] = 1; return; }
      if (g.recorrenteId) return;
      meses[m] = (meses[m] || 0) + (Number(g.valor) || 0);
    });
    return { meses: meses, evMes: evMes, primeiro: primeiro };
  }
  function primeiroGeral() { var p = ''; Gasto.todos().forEach(function (g) { var m = mesDe(g.data); if (m && (!p || m < p)) p = m; }); return p; }
  function variavel(grupo, sub, mes) {
    var h = historico(grupo, sub), ini = primeiroGeral(), soma = 0, n = 0;
    for (var k = 1; k <= 6; k++) { var m = somaMes(mes, -k); if (!ini || m < ini) break; if (h.evMes[m]) continue; soma += h.meses[m] || 0; n++; }
    var base = n ? soma / n : 0, peso = 1;
    if (h.primeiro && h.primeiro <= somaMes(mes, -12)) {
      var ano = 0, nAno = 0; for (var j = 1; j <= 12; j++) { var mm = somaMes(mes, -j); if (h.evMes[mm]) continue; ano += h.meses[mm] || 0; nAno++; }
      var media = nAno ? ano / nAno : 0, mesmo = somaMes(mes, -12);
      if (media > 0 && !h.evMes[mesmo]) peso = Math.min(1.5, Math.max(0.6, (h.meses[mesmo] || 0) / media));
    }
    var corr = Math.pow(1 + taxaIpca(grupo), (n + 1) / 2 / 12 + Math.max(0, difDias(hoje().slice(0, 7) + '-15', mes + '-15')) / 365);
    return { base: n2(base), peso: Math.round(peso * 1000) / 1000, valor: n2(base * peso * corr) };
  }

  /* ---- c) eventos ---- */
  function kmDe(destino) {
    var k = N(destino); if (!k) return null;
    var ap = eventos().filter(function (e) { return N(e.destino) === k && Number(e.km) > 0; }).sort(function (a, b) { return String(b.de).localeCompare(String(a.de)); })[0];
    if (ap) return Number(ap.km);
    if (typeof Desloc !== 'undefined') {
      var lg = Desloc.lugares().filter(function (l) { return N(l.nome) === k; })[0], c = Desloc.lugares().filter(function (l) { return l.tipo === 'casa'; })[0];
      var d = lg && c ? Desloc.reta(c, lg) : null; if (d != null) return Math.round(d * 1.3);
    }
    return null;
  }
  function gasolinaDe(e) {
    if (!e.carro) return 0;
    var km = Number(e.km) > 0 ? Number(e.km) : kmDe(e.destino); if (!km) return 0;
    var V = typeof Desloc !== 'undefined' ? Desloc.veiculo() : { consumo: 11, precoLitro: 6.2 };
    return n2(km * 2 / (V.consumo || 11) * V.precoLitro);
  }
  function eventoNoMes(grupo, sub, mes) {
    var cc = catComb(); if (cc.grupo !== grupo || cc.sub !== sub) return 0;
    return eventos().reduce(function (t, e) { return t + (!e.detectado && mesDe(e.de) === mes ? gasolinaDe(e) : 0); }, 0);
  }

  /* ---- o previsto de uma categoria ---- */
  function previstoMes(grupo, sub, mes, certas) {
    mes = mes || hoje().slice(0, 7); certas = certas || certasDoMes(mes);
    var h = hoje(), minhas = certas.filter(function (c) { return c.grupo === grupo && c.sub === sub; });
    var fixo = 0, aVir = [], fixoAteHoje = 0;
    minhas.forEach(function (c) {
      fixo += c.real != null ? c.real : c.valor;
      if (c.real == null) aVir.push({ nome: c.nome, dia: +c.data.slice(8, 10), data: c.data, valor: c.valor });
      if (c.data <= h) fixoAteHoje += c.real != null ? c.real : c.valor;
    });
    var v = variavel(grupo, sub, mes), ev = eventoNoMes(grupo, sub, mes);
    var gasto = 0; saidas().forEach(function (g) { if (g.grupo === grupo && g.sub === sub && mesDe(g.data) === mes) gasto += Number(g.valor) || 0; });
    var f = mes < h.slice(0, 7) ? 1 : mes > h.slice(0, 7) ? 0 : (+h.slice(8, 10)) / diasNoMes(mes);
    var previsto = n2(fixo + v.valor + ev), ritmo = n2(v.valor * f + fixoAteHoje + (f > 0 ? ev * f : 0));
    gasto = n2(gasto);
    return {
      grupo: grupo, sub: sub, previsto: previsto, fixo: n2(fixo), variavel: v.valor, evento: n2(ev), base: v.base, peso: v.peso,
      gasto: gasto, comprometidoAVir: aVir.sort(function (a, b) { return a.dia - b.dia; }), ritmoHoje: ritmo,
      estado: gasto > previsto + 0.005 ? 'acima' : gasto > ritmo * 1.1 + 1 ? 'adiantado' : 'ok'
    };
  }
  function categorias(mes) {
    mes = mes || hoje().slice(0, 7);
    var certas = certasDoMes(mes), ks = {}, ini = somaMes(mes, -6);
    saidas().forEach(function (g) { var m = mesDe(g.data); if (m >= ini && m <= mes) ks[g.grupo + '|' + g.sub] = 1; });
    certas.forEach(function (c) { ks[c.grupo + '|' + c.sub] = 1; });
    if (eventos().some(function (e) { return mesDe(e.de) === mes; })) { var cc = catComb(); ks[cc.grupo + '|' + cc.sub] = 1; }
    return Object.keys(ks).map(function (k) { var i = k.indexOf('|'); return previstoMes(k.slice(0, i), k.slice(i + 1), mes, certas); })
      .filter(function (x) { return x.previsto > 0 || x.gasto > 0; }).sort(function (a, b) { return Math.max(b.previsto, b.gasto) - Math.max(a.previsto, a.gasto); });
  }

  /* ---- a renda prevista (nunca na visão da casa) ---- */
  function rendaPrevista(mes) {
    if (casa()) return null;
    var extra = typeof rendaExtra === 'function' ? rendaExtra : function () { return false; };
    var noMes = 0, soma = 0, ini = primeiroGeral(), n = 0;
    Gasto.todos().forEach(function (g) { if (g.fluxo === 'entrada' && !extra(g) && mesDe(g.data) === mes) noMes += Number(g.valor) || 0; });
    var porMes = {}; Gasto.todos().forEach(function (g) { if (g.fluxo === 'entrada' && !extra(g)) { var m = mesDe(g.data); porMes[m] = (porMes[m] || 0) + (Number(g.valor) || 0); } });
    for (var k = 1; k <= 6; k++) { var m = somaMes(mes, -k); if (!ini || m < ini) break; soma += porMes[m] || 0; n++; }
    var rec = 0;
    if (typeof Recorrente !== 'undefined') Recorrente.ocorrencias(mes + '-01', mes + '-' + diasNoMes(mes)).forEach(function (o) { if ((GRUPOS[o.r.grupo] || {}).fluxo === 'entrada') rec += Number(o.valor) || 0; });
    return n2(Math.max(noMes, rec > 0 ? rec : (n ? soma / n : 0)));
  }
  function totalMes(mes) {
    mes = mes || hoje().slice(0, 7);
    var cs = categorias(mes), t = { mes: mes, previsto: 0, gasto: 0, aVir: 0, aVirCertas: 0 };
    cs.forEach(function (c) {
      t.previsto += Math.max(c.previsto, c.gasto); t.gasto += c.gasto;
      t.aVir += Math.max(0, c.previsto - c.gasto);
      t.aVirCertas += c.comprometidoAVir.reduce(function (s, x) { return s + x.valor; }, 0);
    });
    ['previsto', 'gasto', 'aVir', 'aVirCertas'].forEach(function (k) { t[k] = n2(t[k]); });
    t.rendaPrevista = rendaPrevista(mes);
    t.sobra = t.rendaPrevista == null ? null : n2(t.rendaPrevista - t.previsto);
    return t;
  }

  /* ---- d) viagem descoberta depois ---- */
  function suspeitas() {
    if (casa()) return [];
    var h = hoje(), comb = saidas().filter(ehComb).filter(function (g) { return g.data <= h && !g.evento; });
    var ini = isoMais(h, -150); comb = comb.filter(function (g) { return g.data >= ini; });
    if (!comb.length || difDias(comb.reduce(function (m, g) { return g.data < m ? g.data : m; }, h), h) < 42) return [];
    /* o normal: semanas de 7 dias contadas de hoje para trás (as 12 de antes dos últimos 60 dias) */
    var semV = [], semN = [];
    for (var s = 0; s < 18; s++) {
      var a = isoMais(h, -7 * (s + 1) + 1), b = isoMais(h, -7 * s), v = 0, n = 0;
      comb.forEach(function (g) { if (g.data >= a && g.data <= b) { v += Number(g.valor) || 0; n++; } });
      semV.push(v); semN.push(n);
    }
    var medV = mediana(semV), medN = mediana(semN); if (!(medV > 0)) return [];
    var nao = cfg().viagensNao || {}, achou = [], janela = isoMais(h, -60);
    comb.filter(function (g) { return g.data >= janela; }).sort(function (a, b) { return a.data.localeCompare(b.data); }).forEach(function (g) {
      var fim = isoMais(g.data, 3), dentro = comb.filter(function (x) { return x.data >= g.data && x.data <= fim; });
      var v = dentro.reduce(function (t, x) { return t + (Number(x.valor) || 0); }, 0);
      if (!(v > 2 * medV || (dentro.length >= 2 && medN <= 1))) return;
      var de = g.data, ate = dentro.reduce(function (m, x) { return x.data > m ? x.data : m; }, g.data);
      var ult = achou[achou.length - 1];
      if (ult && de <= isoMais(ult.ate, 1)) { dentro.forEach(function (x) { if (ult.ids.indexOf(x.id) < 0) { ult.ids.push(x.id); ult.valor += Number(x.valor) || 0; } }); if (ate > ult.ate) ult.ate = ate; return; }
      achou.push({ de: de, ate: ate, valor: v, ids: dentro.map(function (x) { return x.id; }), medSemana: medV });
    });
    return achou.map(function (x) { x.valor = n2(x.valor); x.chave = x.de + '|' + x.ate; return x; }).filter(function (x) { return !nao[x.chave]; });
  }
  function responder(chave, foi, destino) {
    var s = suspeitas().filter(function (x) { return x.chave === chave; })[0]; if (!s) return null;
    if (!foi) { cfg().viagensNao = Object.assign({}, cfg().viagensNao, (function () { var o = {}; o[chave] = 1; return o; })()); return { foi: false }; }
    /* o que passou do normal daqueles dias vira a gasolina da viagem; dela sai o km do destino (ida e volta) */
    var dias = difDias(s.de, s.ate) + 1, normal = s.medSemana * Math.max(1, dias) / 7, extraComb = Math.max(0, s.valor - normal);
    var V = typeof Desloc !== 'undefined' ? Desloc.veiculo() : { consumo: 11, precoLitro: 6.2 };
    var km = String(destino || '').trim() && extraComb > 0 ? Math.round(extraComb / V.precoLitro * (V.consumo || 11) / 2) : null;
    var e = { id: 'ev' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), tipo: 'viagem', destino: String(destino || '').trim().slice(0, 60),
      de: s.de, ate: s.ate, carro: true, detectado: true, combustivel: s.valor };
    if (km) e.km = km;
    eventos().push(e);
    s.ids.forEach(function (id) { Gasto.atualizar(id, { evento: e.id }); });
    Gasto._idx = null;
    return { foi: true, evento: e };
  }
  function salvarEvento(d) {
    var de = String(d.de || ''), ate = String(d.ate || d.de || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(de) || !String(d.destino || '').trim()) return null;
    var e = { id: 'ev' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), tipo: 'viagem', destino: String(d.destino).trim().slice(0, 60),
      de: de, ate: ate < de ? de : ate, carro: !!d.carro };
    if (Number(d.km) > 0) e.km = Math.round(Number(d.km));
    eventos().push(e); return e;
  }
  function tirarEvento(id) {
    ST[COL] = eventos().filter(function (e) { return e.id !== id; });
    Gasto.todos().forEach(function (g) { if (g.evento === id) Gasto.atualizar(g.id, { evento: undefined }); });
  }

  var API = {
    _hoje: null, previstoMes: function (g, s, m) { return previstoMes(g, s, m); }, categorias: categorias, totalMes: totalMes,
    proximos: function (n) { var m = hoje().slice(0, 7), out = []; for (var k = 1; k <= (n || 3); k++) out.push(totalMes(somaMes(m, k))); return out; },
    suspeitas: suspeitas, responder: responder, eventos: eventos, salvarEvento: salvarEvento, tirarEvento: tirarEvento, kmDe: kmDe, gasolinaDe: gasolinaDe,
    nomeMes: nomeMes, catComb: catComb
  };

  /* ---- telas: o mínimo para ver os números (o desenho final vem do Claude Design) ---- */
  function cartaoEventos() {
    var l = eventos().filter(function (e) { return !e.detectado || e.destino; }).sort(function (a, b) { return String(b.de).localeCompare(String(a.de)); });
    var h = '<div class="card pv-eventos"><div class="card-head"><h3>' + esc(tr('Viagens e eventos', 'Trips and events')) + '</h3></div>' +
      '<p class="small muted">' + esc(tr('Vai viajar de carro? Registre aqui: a gasolina extra entra no previsto do mês (distância × consumo × preço do litro, de Deslocamentos).',
        'Driving somewhere? Register it here: the extra fuel goes into that month\'s forecast (distance × consumption × fuel price, from Commuting).')) + '</p>';
    h += l.map(function (e) {
      var gas = gasolinaDe(e);
      return '<div class="mini-linha"><span>🧳 <b>' + esc(e.destino || tr('Viagem', 'Trip')) + '</b> <span class="t-sub">' + esc(I18n.data(e.de) + (e.ate && e.ate !== e.de ? ' – ' + I18n.data(e.ate) : '') +
        (e.detectado ? tr(' · descoberta pelo combustível', ' · found from fuel') : '') + (e.km ? ' · ' + e.km + ' km' : '')) + '</span></span>' +
        '<span class="mono">' + (e.detectado ? esc(fmt(e.combustivel || 0)) : gas ? esc('+' + fmt(gas)) : '<span class="t-sub">' + esc(e.carro ? tr('sem distância', 'no distance') : tr('sem carro', 'no car')) + '</span>') +
        ' <button type="button" class="linkinho" data-acao="pv-tirar" data-id="' + esc(e.id) + '" aria-label="' + esc(tr('Tirar ', 'Remove ') + (e.destino || '')) + '">✕</button></span></div>';
    }).join('');
    h += '<form class="orc-novo pv-novo" data-pv-form><input id="pvDestino" maxlength="60" placeholder="' + esc(tr('Destino', 'Destination')) + '" aria-label="' + esc(tr('Destino', 'Destination')) + '">' +
      '<input id="pvDe" type="date" aria-label="' + esc(tr('Ida', 'Leaving')) + '"><input id="pvAte" type="date" aria-label="' + esc(tr('Volta', 'Back')) + '">' +
      '<input id="pvKm" type="number" min="1" step="1" inputmode="numeric" placeholder="' + esc(tr('km de ida (se souber)', 'one-way km (if known)')) + '" aria-label="' + esc(tr('km de ida', 'one-way km')) + '">' +
      '<label class="linha-check"><input type="checkbox" id="pvCarro" checked> ' + esc(tr('de carro', 'by car')) + '</label>' +
      '<button type="button" class="btn sm primary" data-acao="pv-salvar">' + esc(tr('Registrar', 'Register')) + '</button></form></div>';
    return h;
  }
  function cartaoAtencao() {
    var s = suspeitas(); if (!s.length) return '';
    return '<div class="card pv-atencao"><div class="card-head"><h3>' + esc(tr('Precisa da sua atenção', 'Needs your attention')) + '</h3></div>' + s.map(function (x) {
      return '<div class="pv-pergunta" data-chave="' + esc(x.chave) + '"><p class="small" style="margin:0 0 6px">🧳 ' + esc(tr('Parece que teve viagem entre ', 'Looks like there was a trip between ') + I18n.data(x.de) + tr(' e ', ' and ') + I18n.data(x.ate) +
        ' (' + fmt(x.valor) + tr(' de combustível). Foi viagem?', ' of fuel). Was it a trip?')) + '</p>' +
        '<input class="pv-dest" maxlength="60" placeholder="' + esc(tr('Destino (opcional)', 'Destination (optional)')) + '" aria-label="' + esc(tr('Destino (opcional)', 'Destination (optional)')) + '"> ' +
        '<button type="button" class="btn sm primary" data-acao="pv-sim" data-chave="' + esc(x.chave) + '">' + esc(tr('Sim, foi viagem', 'Yes, it was a trip')) + '</button> ' +
        '<button type="button" class="btn sm" data-acao="pv-nao" data-chave="' + esc(x.chave) + '">' + esc(tr('Não', 'No')) + '</button></div>';
    }).join('') + '</div>';
  }

  MoneyModulos.registrar({
    id: 'previsao', versao: '1.0.0', colecoes: [COL],
    pontos: {
      'futuro.topo': cartaoEventos, 'budget.atencao': cartaoAtencao,
      'inbox.itens': function () {
        return suspeitas().map(function (x) {
          return { tipo: 'atencao', ico: '🧳', nome: tr('Foi viagem?', 'Was it a trip?'), valor: x.valor, data: x.de,
            sub: tr('combustível acima do normal entre ', 'fuel above normal between ') + I18n.data(x.de) + tr(' e ', ' and ') + I18n.data(x.ate) + tr(' — responda no Painel', ' — answer on the Panel') };
        });
      }
    },
    acoes: {
      'pv-salvar': function () {
        var v = function (id) { return (document.getElementById(id) || {}).value || ''; };
        var e = salvarEvento({ destino: v('pvDestino'), de: v('pvDe'), ate: v('pvAte'), km: v('pvKm'), carro: !!(document.getElementById('pvCarro') || {}).checked });
        if (!e) return toast(tr('Diga o destino e a data da ida.', 'Enter the destination and the leaving date.'), 'warn');
        Store.salvar(); render();
        var g = gasolinaDe(e);
        toast(g ? tr('Viagem registrada: +', 'Trip registered: +') + fmt(g) + tr(' de combustível no previsto.', ' of fuel in the forecast.') : tr('Viagem registrada.', 'Trip registered.'));
      },
      'pv-tirar': function (el) { tirarEvento(el.dataset.id); Store.salvar(); render(); },
      'pv-sim': function (el) {
        var box = el.closest('.pv-pergunta'), d = box ? (box.querySelector('.pv-dest') || {}).value : '';
        var r = responder(el.dataset.chave, true, d); if (!r) return;
        Store.salvar(); render(); toast(tr('Marcado como viagem: esses abastecimentos saem da média.', 'Marked as a trip: these fill-ups leave the average.'));
      },
      'pv-nao': function (el) { responder(el.dataset.chave, false); Store.salvar(); render(); }
    }
  });
  window.Previsao = API;
})();
