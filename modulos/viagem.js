/* =====================================================================
   modulos/viagem.js — VIAGEM POR JANELA DE TEMPO (3.98)        1.0.0 · 22/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 22/Nov/2026; sem IA, sem integração)
     · Cadastro "✈️ Viagem" (BudgetONE → ✈️ Viagens): nome, destino(s), início e fim, margem antes/depois (1 dia, editável),
       quem foi (Pessoas), cartões e contas que contam (padrão: os de quem foi), orçamento (puxa o planejado em Gastos
       planejados → Viagens / RachAI, se houver), link do roteiro (GuiaXpert: só o endereço; ligar de verdade é integração
       nova, regra zero) e a viagem do RachAI (rateio com outras famílias).
     · Sugestão, nunca sozinho: na janela (início − margem … fim + margem), os lançamentos do banco (postados e pendentes)
       de alimentação, transporte, hospedagem, passeios, compras no destino e IOF/câmbio; sinais fortes: a cidade do destino
       no texto do banco (qualquer um dos destinos; o Itaú cola a cidade: "…GRAMADOBR"), aeroporto/terminal/loja de aeroporto, MCC de
       turismo, moeda estrangeira. Nos dias de ida e de volta, compras pequenas (até R$ 300, config.viagemPequena) contam mesmo na
       cidade de casa; os supérfluos também (lanche, sorvete, lembrança): a ideia é o custo TOTAL da viagem.
       Ficam fora: contas fixas e recorrentes, assinaturas, parcelas de compras de antes, transferências, investimentos,
       faturas e boletos, tudo da PJ, compras grandes sem relação (acima de um valor, ajustável) e a loja que a pessoa já
       disse "não é da viagem".
       Antes da viagem (até 180 dias): passagem, reserva, aluguel de carro, seguro viagem (palavra-chave, nome do hotel ou
       destino). Estornos ligados (ex.: do hotel) entram abatendo; o que ainda não caiu pode ir para Valores a receber.
     · "Gastos da viagem: confirme": ✅ É da viagem / ❌ Não é / ✂️ Parte (modulos/dividir.js) e "Confirmar todos". A
       resposta vira regra por loja (Origem). A viagem é uma ETIQUETA (g.viagem): a categoria não muda. O lançamento
       confirmado também ganha o evento da viagem (g.evento, modulos/previsao.js): sai da média do mês, como "Foi viagem?".
       Pendente confirmada: a etiqueta vai para o definitivo quando ele chegar (PreAut.substituir), sem contar em dobro.
     · Hora (complemento do dono): a viagem guarda a hora em que saiu e chegou em casa (opcional). Nos dias de ida e de volta, o 📥
       pergunta "Qual foi o PRIMEIRO gasto da viagem?" / "o ÚLTIMO?" com a lista do dia em ordem de hora (g.hora, que vem do robô,
       do print e dos canhotos; os sem hora no fim, para confirmar um a um); a resposta grava horaInicio/horaFim e o que foi antes
       do primeiro (ida) e depois do último (volta) fica fora. Com a hora conhecida, a margem daquele lado deixa de valer.
     · "Como foi" (complemento do dono): ✈️ avião / 🚗 carro próprio / 🚌 ônibus / 🚆 outro / misto (sem dizer = misto). Cada meio
       soma os seus sinais fortes: avião (aeroporto, terminal, códigos, bagagem), carro (combustível — também o de antes de sair no dia
       da ida —, pedágio, restaurantes de estrada, estacionamento; km opcional → combustível estimado), ônibus (rodoviária, empresas de
       ônibus, a passagem comprada antes). O "Foi viagem?" (pico de combustível) cria a viagem já como carro.
     · Resumo: total; por categoria, dia, pessoa e cartão; antes/durante/depois; previsto × realizado; custo por dia e por
       pessoa; a parte da família no RachAI; ✈️ no Mês a mês (MesAMes) nos meses da viagem.
     · 📥 ("viagem"): muitos gastos seguidos numa cidade que não é a de casa → "Parece que você está viajando (Gramado,
       18–22/11). Criar a viagem?"; o combustível fora do normal ("Foi viagem?", previsao.js) também oferece criar.
     · Visão da casa: a viagem é da casa quando quem foi é da casa (marcável: escopo).
   API (window.Viagem)
     lista() · salvar(d, id?) · janela(v) → {de, ate} · sugestoes(v) → [{g, fase, motivo, pend, estorno}] · confirmar(v, id, sim)
     parte(v, id, valor) · confirmarTodos(v) · itens(v) · resumo(v) · noMes('AAAA-MM') · detectar() · cidadeDe(g)
   DADOS
     ST.viagens = [{id, nome, destinos, inicio, fim, antes, depois, pessoas: [id], cartoes: [id], contas: [id], orcamento,
       link, rachaiId, eventoId, escopo, decisoes: {id: 'sim'|'nao'}, criadoEm}]
     ST.config.viagemRegras = {origem: 'sim'|'nao'} · ST.config.viagemLimite (1500) · ST.config.viagemSugNao = {chave: 1}
     lançamento: g.viagem = id da viagem (+ g.evento)
   PONTOS QUE USA
     tela b-viagens · inbox.grupos ('viagem') · lancamento.form · planejados.viagens · ações vg-*
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'viagens', ANTES_MAX = 180, DEPOIS_EST = 60;
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function hoje() { return API._hoje || hojeISO(); }
  function mais(d, n) { var x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
  function dias(a, b) { return Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000); }
  function cfg() { return (ST.config = ST.config || {}); }
  function lista() { if (!ST) return []; return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function visivel(v) { return !casa() || Escopo.de(COL, v) === 'casa'; }
  function C(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function txt(g) { return [g.descRobo, g.desc, g.contraparte && g.contraparte.nome].filter(Boolean).join(' '); }
  function pend() { return window.PreAut ? PreAut.lista() : []; }
  function gasto(id) { return Gasto.todos().find(function (g) { return g.id === id; }) || null; }
  function origem(g) { return window.Origem ? Origem.origemDe(g) : 'd:' + C(g.descRobo || g.desc).slice(0, 20); }
  function credito(g) { return !!g && (g.estorno || Number(g.valor) < 0 || g.fluxo === 'entrada'); }
  function ehPJ(g) { return !!(g.empresaId || g.pj || (window.Escopo && Escopo.ehPJ && Escopo.ehPJ(g))); }

  /* ---------- o que entra, o que fica fora ---------- */
  var RX_ENTRA = /restaur|lanch|hamburg|burguer|snack|doceria|a[cç]a[ií]|padaria|panific|confeit|cafe|cafeter|bar\b|pizz|burger|churras|sorvet|food|ifood|rappi|mercad|empori|uber|\b99\b|99app|taxi|combust|gasolin|posto|pedag|sem ?parar|conectcar|veloe|estacion|park|locadora|localiza|movida|unidas|aluguel de carro|hotel|pousada|hosped|resort|airbnb|booking|hostel|ingresso|parque|passeio|museu|tour|teleferico|chocolat|lembranc|souvenir|artesan|presente|\biof\b|cambio|turism/i;
  /* 3.98 (complemento do dono): aeroporto, terminal e lojas de aeroporto são sinal forte (o aeroporto de casa também) */
  var RX_AERO = /aeroporto|airport|terminal|\b(gru|cgh|poa|vcp|gig|sdu|bsb|cnf|rec|ssa|for|flp|cwb)\b|duty ?free|dufry|hudson news|relay\b|casa do p[aã]o de queijo|viena\b|rei do mate|\bbobs?\b|starbucks/i;
  /* 3.98 (complemento do dono): "Como foi" muda os sinais. Carro: combustível, pedágio, restaurantes de estrada, estacionamento;
     ônibus: rodoviária, empresas de ônibus, Uber/táxi até lá. Avião: o RX_AERO acima + bagagem. Misto (ou sem dizer): todos. */
  var RX_CARRO = /combust|gasolin|etanol|diesel|posto|auto ?posto|pedag|sem ?parar|conectcar|veloe|move ?mais|graal|frango assado|rodoserv|estrada|rodovia|\bkm ?\d|estacion/i;
  var RX_AVIAO = /bagagem|despacho/i;
  var MEIOS = ['aviao', 'carro', 'onibus', 'outro', 'misto'];
  function meioTem(v, m) { return !v.meio || v.meio === 'misto' || v.meio === m; }
  var RX_SUB = /restaurante|alimenta|lanche|padaria|caf[eé]|combust|ped[aá]gio|estacion|t[aá]xi|aplicativo|uber|hosped|hotel|passeio|lazer|viage|ingresso|parque|lembran|presente/i;
  /* antes da viagem: hospedagem, carro alugado e seguro sempre; passagem aérea só se foi de avião; de ônibus só se foi de ônibus */
  var RX_ANTES = /booking|airbnb|hotel|pousada|resort|hostel|decolar|123 ?milhas|maxmilhas|hurb|expedia|trivago|hoteis|localiza|movida|unidas|rent ?a ?car|aluguel de carro|seguro viagem|assist ?card|affinity|travel ace|cvc/i;
  var RX_ANTES_AVIAO = /passag|\bgol\b|gol linhas|voegol|\bazul\b|voeazul|latam|\btam\b|a[eé]rea|airlines/i;
  var RX_ANTES_ONIBUS = /passag|clickbus|buser|quero passagem|cometa|itapemirim|gontijo|[aá]guia branca|catarinense|via[cç][aã]o|rodovi[aá]ri/i;
  function ehAntes(v, g) { var t = txt(g); return RX_ANTES.test(t) || (meioTem(v, 'aviao') && RX_ANTES_AVIAO.test(t)) || (meioTem(v, 'onibus') && RX_ANTES_ONIBUS.test(t)); }
  var RX_ASSIN = /anthropic|claude|openai|chatgpt|netflix|spotify|disney|hbo|\bmax\b|prime ?video|amazon ?prime|google|youtube|apple\.com|icloud|deezer|globoplay|paramount|microsoft|adobe|dropbox|canva|assinatura/i;
  var RX_FORA = /pagamento (de )?fatura|pgto fatura|pag(amento|to)? boleto|\bboleto\b|\bted\b|\btef\b|transfer|aplica[cç][aã]o|resgate|invest/i;
  var RX_GRANDE = /eletro|celular|iphone|samsung|notebook|computador|televis|\btv\b|geladeira|m[oó]vel|moveis|concession|ve[ií]culo|carro novo|magazine|casas bahia|fast shop|kabum/i;
  /* MCC de turismo: companhias aéreas, locadoras, hotéis, transporte, restaurantes, combustível, pedágio, estacionamento, atrações, lembranças */
  function mccTurismo(m) {
    m = Number(m); if (!m) return false;
    return (m >= 3000 && m <= 3299) || (m >= 3351 && m <= 3441) || (m >= 3501 && m <= 3999) ||
      [4111, 4121, 4131, 4411, 4511, 4722, 4784, 4789, 5541, 5542, 5812, 5813, 5814, 5947, 7011, 7012, 7512, 7523, 7991, 7996, 7998, 7999].indexOf(m) >= 0;
  }
  function forte(v, g) {
    var t = C(txt(g)), ds = (v.destinos || []).map(C).filter(function (d) { return d.length >= 4; });
    if (ds.some(function (d) { return t.indexOf(d) >= 0; })) return tr('a cidade do destino no banco', 'the destination city at the bank', 'la ciudad del destino en el banco');
    if (meioTem(v, 'aviao') && (RX_AERO.test(txt(g)) || RX_AVIAO.test(txt(g)))) return tr('aeroporto', 'airport', 'aeropuerto');
    if (meioTem(v, 'carro') && v.meio && RX_CARRO.test(txt(g))) return tr('estrada (carro)', 'road trip (car)', 'carretera (coche)');
    if (meioTem(v, 'onibus') && v.meio && /rodovi[aá]ri|terminal rodov/i.test(txt(g))) return tr('rodoviária', 'bus station', 'estación de autobuses');
    if (g.moeda && g.moeda !== 'BRL') return tr('moeda estrangeira', 'foreign currency', 'moneda extranjera');
    if (mccTurismo(g.contraparte && g.contraparte.mcc)) return tr('tipo de loja de turismo', 'travel merchant type', 'tipo de comercio de turismo');
    return '';
  }
  function regra(g) { return (cfg().viagemRegras || {})[origem(g)] || ''; }
  /* por que fica fora (vazio = pode entrar) */
  function fora(v, g, fase) {
    if (ehPJ(g)) return 'pj';
    if (g.recorrenteId) return 'fixa';
    if (RX_ASSIN.test(txt(g)) || /assinatura/i.test(g.sub || '')) return 'assinatura';
    if (g.grupo === 'INVESTIMENTO' || g.grupo === 'RENDA' || g.resgate || RX_FORA.test(txt(g)) || /boleto/i.test(g.forma || '')) return 'transf';
    var p = Gasto.parcela ? Gasto.parcela(g.desc, g) : ''; if (p && Number(String(p).split('/')[0]) > 1) return 'parcela';
    var lim = Number(cfg().viagemLimite) || 1500;
    if (!credito(g) && (Number(g.valor) > lim || g.grupo === 'VEICULO' && !/combust|ped[aá]gio|estacion/i.test(g.sub || '')) && (RX_GRANDE.test(txt(g)) || !RX_ENTRA.test(txt(g)) && fase === 'durante')) return 'grande';
    if (regra(g) === 'nao') return 'regra';
    return '';
  }
  function daConta(v, g) {
    if ((v.cartoes || []).length || (v.contas || []).length) return (g.cartaoId && (v.cartoes || []).indexOf(g.cartaoId) >= 0) || (!g.cartaoId && g.bancoId && (v.contas || []).indexOf(g.bancoId) >= 0);
    var ps = v.pessoas || []; if (!ps.length) return true;
    if (g.cartaoId && typeof Banco !== 'undefined') { var c = Banco.acharCartao(g.cartaoId); var d = c && (c.usaId || c.titularId); if (d) return ps.indexOf(d) >= 0; }
    if (g.quemId) return ps.indexOf(g.quemId) >= 0;
    var dn = window.Pessoas && Pessoas.donoDe ? Pessoas.donoDe(g.bancoId, g.cartaoId) : null;
    return dn ? ps.indexOf(dn.id) >= 0 : true;
  }

  /* com a hora de saída/chegada conhecida, a margem daquele lado some: a viagem começa e acaba ali */
  function janela(v) {
    return { de: v.horaInicio ? v.inicio : mais(v.inicio, -(v.antes != null ? Number(v.antes) : 1)),
      ate: v.horaFim ? (v.fim || v.inicio) : mais(v.fim || v.inicio, v.depois != null ? Number(v.depois) : 1) };
  }
  /* nos dias de ida e de volta, o que foi antes de sair de casa ou depois de chegar fica fora (só quem tem hora) */
  function foraDaHora(v, g) {
    if (!g.hora) return false;
    if (g.data === v.inicio && v.horaInicio && g.hora < v.horaInicio) return true;
    if (g.data === (v.fim || v.inicio) && v.horaFim && g.hora > v.horaFim) return true;
    return false;
  }
  function fase(v, d) { var j = janela(v); return d < j.de ? 'antes' : d > j.ate ? 'depois' : 'durante'; }
  function decisao(v, id) { return (v.decisoes || {})[id] || ''; }
  function outra(v, g) { return g.viagem && g.viagem !== v.id; }

  /* ---------- sugestões ---------- */
  function sugestoes(v) {
    var j = janela(v), de0 = mais(v.inicio, -ANTES_MAX), ate0 = mais(j.ate, DEPOIS_EST), out = [], vistos = {};
    var origensViagem = {};
    Gasto.todos().forEach(function (g) { if (g.viagem === v.id) origensViagem[origem(g)] = 1; });
    var ver = function (g, ehPend) {
      if (!g || !g.data || g.data < de0 || g.data > ate0 || g.viagem === v.id || outra(v, g) || decisao(v, g.id) || vistos[g.id]) return;
      if (!daConta(v, g) || Math.abs(Number(g.valor) || 0) === 0 || foraDaHora(v, g)) return;
      var f = fase(v, g.data), motivo = '';
      if (credito(g)) {   /* estorno ligado a um gasto da viagem (ou a uma reserva/passagem) */
        if (g.grupo === 'RENDA' || ehPJ(g)) return;
        if (origensViagem[origem(g)] || (ehAntes(v, g) && f !== 'antes') || out.some(function (s) { return !s.estorno && origem(s.g) === origem(g); }))
          motivo = tr('estorno ligado à viagem', 'refund linked to the trip', 'reembolso vinculado al viaje');
        if (motivo) { vistos[g.id] = 1; out.push({ g: g, fase: f, motivo: motivo, pend: ehPend, estorno: true }); }
        return;
      }
      if (g.fluxo === 'entrada' || fora(v, g, f)) return;
      var r = regra(g) === 'sim' ? tr('como da última vez (esta loja)', 'like last time (this store)', 'como la última vez (esta tienda)') : '';
      if (f === 'durante') {
        var fo = forte(v, g);
        if (r) motivo = r; else if (fo) motivo = fo;
        else if (RX_ENTRA.test(txt(g)) || RX_SUB.test(g.sub || '')) motivo = tr('na janela da viagem', 'within the trip dates', 'dentro de las fechas del viaje');
        /* nos dias de ida e de volta, compras pequenas contam mesmo na cidade de casa (o lanche no aeroporto, o Uber até lá) */
        else if ((g.data <= v.inicio || g.data >= (v.fim || v.inicio)) && Number(g.valor) <= (Number(cfg().viagemPequena) || 300)) motivo = tr('dia de ida ou de volta', 'travel day (going or coming back)', 'día de ida o de vuelta');
      } else if (f === 'antes') {
        var hot = (v.destinos || []).concat(v.hotel ? [v.hotel] : []).map(C).filter(function (d) { return d.length >= 4; });
        if (ehAntes(v, g) || hot.some(function (d) { return C(txt(g)).indexOf(d) >= 0; })) motivo = tr('reserva ou passagem antes da viagem', 'booking or ticket before the trip', 'reserva o billete antes del viaje');
        else if (r) motivo = r;
      }
      if (motivo) { vistos[g.id] = 1; out.push({ g: g, fase: f, motivo: motivo, pend: ehPend, estorno: false }); }
    };
    /* a ordem importa: primeiro os gastos (os estornos procuram a loja deles) */
    Gasto.todos().filter(function (g) { return !credito(g); }).forEach(function (g) { ver(g, false); });
    pend().filter(function (p) { return p.estado === 'pendente'; }).forEach(function (p) { ver(p, true); });
    Gasto.todos().filter(credito).forEach(function (g) { ver(g, false); });
    return out.sort(function (a, b) { return a.g.data < b.g.data ? -1 : a.g.data > b.g.data ? 1 : 0; });
  }

  /* ---------- confirmar ---------- */
  function etiquetar(v, id) {
    var g = gasto(id); if (!g) return false;
    var d = { viagem: v.id }; if (v.eventoId) d.evento = v.eventoId;
    Gasto.atualizar(id, d); return true;
  }
  function confirmar(v, id, sim) {
    v.decisoes = v.decisoes || {};
    var g = gasto(id) || pend().find(function (p) { return p.id === id; }); if (!g) return false;
    v.decisoes[id] = sim ? 'sim' : 'nao';
    if (!credito(g)) { var rg = cfg().viagemRegras = Object.assign({}, cfg().viagemRegras); rg[origem(g)] = sim ? 'sim' : 'nao'; }
    if (sim) etiquetar(v, id);
    else if (gasto(id) && gasto(id).viagem === v.id) Gasto.atualizar(id, { viagem: undefined, evento: gasto(id).evento === v.eventoId ? undefined : gasto(id).evento });
    return true;
  }
  /* a pendente confirmada virou definitivo: a etiqueta vai para ele (sem contar em dobro) */
  function levarPendentes(v) {
    Object.keys(v.decisoes || {}).forEach(function (id) {
      if (v.decisoes[id] !== 'sim' || gasto(id)) return;
      var p = pend().find(function (x) { return x.id === id; });
      if (p && p.estado === 'cobrado' && p.gastoId && gasto(p.gastoId) && !gasto(p.gastoId).viagem) { v.decisoes[p.gastoId] = 'sim'; etiquetar(v, p.gastoId); }
    });
  }
  function itens(v) { return Gasto.todos().filter(function (g) { return g.viagem === v.id; }); }
  function pendentesSim(v) { return pend().filter(function (p) { return p.estado === 'pendente' && decisao(v, p.id) === 'sim'; }); }

  /* ---------- resumo ---------- */
  function rotCartao(g) {
    var c = g.cartaoId && typeof Banco !== 'undefined' ? Banco.acharCartao(g.cartaoId) : null;
    if (c) return (c.apelido || tr('Cartão', 'Card', 'Tarjeta')) + (c.fim ? ' ••' + c.fim : '');
    return g.conta || g.forma || tr('outros', 'other', 'otros');
  }
  function pessoaDe(v, g) {
    var nm = function (id) { var p = window.Pessoas && Pessoas.porId(id); return p ? Pessoas.rotulo(p) : ''; };
    if (g.paraQuemId) return nm(g.paraQuemId) || g.paraQuem;
    if (g.paraQuem) return g.paraQuem;
    if ((v.pessoas || []).length > 1) return tr('todos', 'everyone', 'todos');
    return (v.pessoas || []).length ? nm(v.pessoas[0]) : (g.quem || tr('todos', 'everyone', 'todos'));
  }
  function resumo(v) {
    var l = itens(v), soma = function (k, g, val) { k[g] = n2((k[g] || 0) + val); };
    var r = { total: 0, porCat: {}, porDia: {}, porPessoa: {}, porCartao: {}, fases: { antes: 0, durante: 0, depois: 0 }, n: l.length };
    l.forEach(function (g) {
      var val = credito(g) ? -Math.abs(Number(g.valor) || 0) : Number(g.valor) || 0;
      r.total = n2(r.total + val);
      soma(r.porCat, ((GRUPOS[g.grupo] || {}).nome || g.grupo || '') + (g.sub ? ' · ' + g.sub : ''), val);
      soma(r.porDia, g.data, val); soma(r.porPessoa, pessoaDe(v, g), val); soma(r.porCartao, rotCartao(g), val);
      r.fases[fase(v, g.data)] = n2(r.fases[fase(v, g.data)] + val);
    });
    var nd = Math.max(1, dias(v.fim || v.inicio, v.inicio) + 1), np = Math.max(1, (v.pessoas || []).length);
    r.dias = nd; r.pessoas = np; r.porDiaMedio = n2(r.total / nd); r.porPessoaMedio = n2(r.total / np);
    /* carro: com os km rodados, o combustível estimado da viagem (consumo e preço do litro de Deslocamentos) */
    if (v.km > 0) { var V = typeof Desloc !== 'undefined' && Desloc.veiculo ? Desloc.veiculo() : { consumo: 11, precoLitro: 6.2 }; r.combEstimado = n2(v.km / (Number(V.consumo) || 11) * (Number(V.precoLitro) || 6.2)); }
    r.orcamento = Number(v.orcamento) || orcamentoPlanejado(v) || 0; r.diferenca = n2(r.total - r.orcamento);
    r.pendentes = n2(pendentesSim(v).reduce(function (s, p) { return s + (Number(p.valor) || 0); }, 0));
    r.aReceber = window.AReceber ? n2(AReceber.abertos().filter(function (x) { return x.gastoId && l.some(function (g) { return g.id === x.gastoId; }); }).reduce(function (s, x) { return s + AReceber.restante(x); }, 0)) : 0;
    if (v.rachaiId && window.RachAI && RachAI.viagens) {
      var rv = RachAI.viagens().find(function (x) { return x.id === v.rachaiId; });
      if (rv) { var c = RachAI.calcViagem(rv); r.rachai = { nome: rv.nome, total: c.total, nossa: n2((rv.unidades || []).filter(function (u) { return u.nossa; }).reduce(function (s, u) { return s + c.unidades[u.id].devido; }, 0)) }; }
    }
    return r;
  }
  /* o orçamento planejado: o compromisso único de Viagens (Gastos planejados / RachAI) perto das datas */
  function orcamentoPlanejado(v) {
    if (typeof Recorrente === 'undefined') return 0;
    var de = mais(v.inicio, -45), ate = v.fim || v.inicio;
    var r = Recorrente.todos().find(function (x) { return (v.rachaiId && x.rachaiViagem === v.rachaiId) || (/viage|trip|viaje/i.test(x.sub || '') && x.desde && x.desde === x.ate && x.desde >= de && x.desde <= ate); });
    return r ? n2(r.valor) : 0;
  }

  /* ---------- ida e volta: "Qual foi o PRIMEIRO / o ÚLTIMO gasto da viagem?" ---------- */
  function doDia(v, d) {
    return Gasto.todos().concat(pend().filter(function (p) { return p.estado === 'pendente'; })).filter(function (g) {
      return g.data === d && !credito(g) && g.fluxo !== 'entrada' && daConta(v, g) && !fora(v, g, 'durante') && decisao(v, g.id) !== 'nao';
    }).sort(function (a, b) { return a.hora && b.hora ? a.hora.localeCompare(b.hora) : a.hora ? -1 : b.hora ? 1 : 0; });
  }
  function perguntasHora(v) {
    var out = [], h = hoje();
    if (!v.horaInicio && v.inicio <= h) { var l = doDia(v, v.inicio); if (l.some(function (g) { return g.hora; })) out.push({ lado: 'ida', dia: v.inicio, l: l }); }
    if (!v.horaFim && (v.fim || v.inicio) <= h && (v.fim || v.inicio) !== v.inicio) { var l2 = doDia(v, v.fim); if (l2.some(function (g) { return g.hora; })) out.push({ lado: 'volta', dia: v.fim, l: l2 }); }
    return out;
  }

  /* ---------- "Parece que você está viajando" ---------- */
  function cidadeDe(g) {
    var ws = String(g.descRobo || g.desc || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z ]/g, ' ').trim().split(/\s+/);
    var w = ws.pop() || ''; if (w === 'BR' && ws.length) w = ws.pop(); else if (/BR$/.test(w) && w.length > 6) w = w.slice(0, -2); else return '';
    return w.length >= 5 ? w : '';
  }
  function sufixo(a, b) { var i = 0; while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i++; return a.slice(a.length - i); }
  function detectar() {
    var h = hoje(), de = mais(h, -30), base = mais(h, -180), gs = Gasto.todos().filter(function (g) { return g.data && !credito(g) && !g.viagem && !ehPJ(g); });
    var rec = gs.filter(function (g) { return g.data >= de && g.data <= h; }).map(function (g) { return { g: g, c: cidadeDe(g) }; }).filter(function (x) { return x.c; });
    var casaC = {}; gs.filter(function (g) { return g.data >= base && g.data < de; }).forEach(function (g) { var c = cidadeDe(g); if (c) casaC[c] = (casaC[c] || 0) + 1; });
    /* a cidade de casa: 3 ou mais gastos dos meses antes com o mesmo fim (6 letras ou mais em comum: "…BAIRROSAOPAULO" e "…VILASAOPAULO") */
    var ehCasa = function (cid) { var n = 0; Object.keys(casaC).forEach(function (k) { if (sufixo(k, cid).length >= Math.min(6, cid.length)) n += casaC[k]; }); return n >= 3; };
    var grupos = {};
    rec.forEach(function (x, i) {
      rec.forEach(function (y, k) {
        if (k <= i) return; var s = sufixo(x.c, y.c); if (s.length < 5 || Math.abs(dias(x.g.data, y.g.data)) > 5) return;
        (grupos[s] = grupos[s] || {}); grupos[s][x.g.id] = x.g; grupos[s][y.g.id] = y.g;
      });
    });
    var out = [];
    Object.keys(grupos).sort(function (a, b) { return a.length - b.length; }).forEach(function (cid) {
      var l = Object.keys(grupos[cid]).map(function (k) { return grupos[cid][k]; }); if (l.length < 3 || ehCasa(cid)) return;
      var ds = l.map(function (g) { return g.data; }).sort(), d0 = ds[0], d1 = ds[ds.length - 1], chave = cid + '|' + d0.slice(0, 7);
      if ((cfg().viagemSugNao || {})[chave] || lista().some(function (v) { return v.inicio <= d1 && (v.fim || v.inicio) >= d0; })) return;
      if (out.some(function (o) { return o.cidade.indexOf(cid) >= 0 || cid.indexOf(o.cidade) >= 0; })) return;
      out.push({ chave: chave, cidade: cid, nome: cid.charAt(0) + cid.slice(1).toLowerCase(), de: d0, ate: d1, n: l.length });
    });
    /* o combustível fora do normal (previsao.js, "Foi viagem?") também oferece criar a viagem */
    if (window.Previsao && Previsao.suspeitas) Previsao.suspeitas().forEach(function (s) {
      if ((cfg().viagemSugNao || {})['c|' + s.chave] || out.some(function (o) { return o.de <= s.ate && o.ate >= s.de; }) || lista().some(function (v) { return v.inicio <= s.ate && (v.fim || v.inicio) >= s.de; })) return;
      out.push({ chave: 'c|' + s.chave, cidade: '', nome: '', de: s.de, ate: s.ate, n: (s.ids || []).length, comb: s.chave });
    });
    return out;
  }

  /* ---------- salvar ---------- */
  function salvar(d, id) {
    var v = id ? lista().find(function (x) { return x.id === id; }) : null;
    var dados = {
      nome: String(d.nome || '').trim().slice(0, 80) || (d.destinos || [])[0] || tr('Viagem', 'Trip', 'Viaje'),
      destinos: (d.destinos || []).map(function (x) { return String(x).trim().slice(0, 60); }).filter(Boolean),
      inicio: d.inicio, fim: d.fim && d.fim >= d.inicio ? d.fim : d.inicio,
      antes: d.antes != null && d.antes !== '' ? Math.max(0, Math.min(10, Number(d.antes) || 0)) : 1,
      depois: d.depois != null && d.depois !== '' ? Math.max(0, Math.min(10, Number(d.depois) || 0)) : 1,
      pessoas: d.pessoas || [], cartoes: d.cartoes || [], contas: d.contas || [],
      orcamento: Number(d.orcamento) > 0 ? n2(d.orcamento) : 0, link: /^https?:\/\//i.test(String(d.link || '').trim()) ? String(d.link).trim().slice(0, 300) : '',
      rachaiId: d.rachaiId || '', hotel: String(d.hotel || '').trim().slice(0, 60),
      meio: MEIOS.indexOf(d.meio) >= 0 ? d.meio : '', km: Number(d.km) > 0 ? Math.round(Number(d.km)) : 0,
      horaInicio: /^\d{2}:\d{2}$/.test(String(d.horaInicio || '')) ? d.horaInicio : '', horaFim: /^\d{2}:\d{2}$/.test(String(d.horaFim || '')) ? d.horaFim : ''
    };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dados.inicio || ''))) return null;
    if (d.escopo === 'casa' || d.escopo === 'reservado') dados.escopo = d.escopo;
    else if (!v || !v.escopoManual) dados.escopo = dados.pessoas.length && window.Pessoas && dados.pessoas.every(function (pid) { var p = Pessoas.porId(pid); return p && p.tipo === 'casa'; }) ? 'casa' : 'reservado';
    if (v) Object.assign(v, dados);
    else { v = Object.assign({ id: 'vg' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), decisoes: {}, criadoEm: hoje() }, dados); lista().push(v); }
    if (d.escopo) v.escopoManual = true;
    if (d.eventoId) v.eventoId = d.eventoId;   /* o evento que o "Foi viagem?" já criou */
    /* o evento da viagem (previsao.js): o que for confirmado sai da média do mês, como "Foi viagem?" */
    if (window.Previsao && Previsao.eventos) {
      var e = v.eventoId && Previsao.eventos().find(function (x) { return x.id === v.eventoId; });
      if (e) { e.de = v.inicio; e.ate = v.fim; e.destino = v.destinos[0] || v.nome; }
      else { e = Previsao.salvarEvento({ destino: v.destinos[0] || v.nome, de: v.inicio, ate: v.fim, carro: false }); if (e) v.eventoId = e.id; }
    }
    return v;
  }
  function tirar(id) {
    var v = lista().find(function (x) { return x.id === id; }); if (!v) return;
    itens(v).forEach(function (g) { Gasto.atualizar(g.id, { viagem: undefined, evento: g.evento === v.eventoId ? undefined : g.evento }); });
    if (v.eventoId && window.Previsao && Previsao.tirarEvento) Previsao.tirarEvento(v.eventoId);
    ST[COL] = lista().filter(function (x) { return x.id !== id; });
  }

  var API = {
    _hoje: null, lista: lista, salvar: salvar, tirar: tirar, janela: janela, sugestoes: sugestoes, itens: itens, resumo: resumo,
    detectar: detectar, cidadeDe: cidadeDe, fora: fora, perguntasHora: perguntasHora, orcamentoPlanejado: orcamentoPlanejado,
    confirmar: function (v, id, sim) { var r = confirmar(v, id, sim); levarPendentes(v); return r; },
    confirmarTodos: function (v) { var n = 0; sugestoes(v).forEach(function (s) { if (confirmar(v, s.g.id, true)) n++; }); levarPendentes(v); return n; },
    parte: function (v, id, valor) {
      var g = gasto(id), val = n2(valor); if (!g || !window.Divisao || !(val > 0) || val >= Math.abs(Number(g.valor))) return false;
      var tot = n2(Math.abs(Number(g.valor)));
      if (!Divisao.aplicar(id, [{ valor: val, grupo: g.grupo, sub: g.sub, nota: tr('parte da viagem', 'trip part', 'parte del viaje') }, { valor: n2(tot - val), grupo: g.grupo, sub: g.sub }])) return false;
      v.decisoes = v.decisoes || {}; v.decisoes[id] = 'sim'; etiquetar(v, id);
      Gasto.todos().forEach(function (x) { if (x.id.indexOf(id + '~') === 0) v.decisoes[x.id] = 'nao'; });
      return true;
    },
    ligarTudo: function () { lista().forEach(levarPendentes); },
    noMes: function (m) { return lista().some(function (v) { return visivel(v) && v.inicio && v.inicio.slice(0, 7) <= m && (v.fim || v.inicio).slice(0, 7) >= m; }); },
    abrir: function (id) { aberta = id; if (typeof irPara === 'function') irPara('b-viagens'); }
  };

  /* ---------- telas ---------- */
  var aberta = null, combPendente = '';
  function lerVia(id) { return lista().find(function (x) { return x.id === id; }) || null; }
  function fmtDias(v) { return I18n.data(v.inicio, { semAno: true }) + ' – ' + I18n.data(v.fim || v.inicio); }
  function botao(acao, rot, extra, cls) { return '<button type="button" class="btn sm' + (cls ? ' ' + cls : '') + '" data-acao="' + acao + '"' + (extra || '') + '>' + esc(rot) + '</button>'; }
  function rotFase(f) { return { antes: tr('antes', 'before', 'antes'), durante: tr('durante', 'during', 'durante'), depois: tr('depois', 'after', 'después') }[f]; }
  function linhaSug(v, s) {
    var g = s.g, d = ' data-v="' + esc(v.id) + '" data-id="' + esc(g.id) + '"';
    return '<li class="inb-item vg-sug" data-g="' + esc(g.id) + '"><div><b>' + (s.pend ? '⏳ ' : '') + esc((g.descRobo || g.desc || '') + ' · ' + (s.estorno ? '↩ ' : '') + fmt(Math.abs(Number(g.valor) || 0))) + '</b>' +
      '<span class="t-sub">' + esc(I18n.data(g.data) + ' · ' + rotFase(s.fase) + ' · ' + s.motivo + (s.pend ? ' · ' + tr('pendente no banco: entra quando virar definitiva', 'pending at the bank: counts when final', 'pendiente en el banco: cuenta cuando sea definitiva') : '')) + '</span></div>' +
      '<span class="inb-acoes" style="flex-wrap:wrap;gap:4px">' + botao('vg-sim', '✅ ' + tr('É da viagem', 'Trip', 'Es del viaje'), d) + botao('vg-nao', '❌ ' + tr('Não é', 'Not trip', 'No es'), d) +
      (!s.pend && !s.estorno ? botao('vg-parte', '✂️ ' + tr('Parte', 'Part', 'Parte'), d) : '') + '</span>' +
      '<div class="vg-parte-box" data-g="' + esc(g.id) + '" hidden><input type="text" inputmode="decimal" class="vg-parte-v" placeholder="' + esc(tr('quanto foi da viagem', 'how much was the trip', 'cuánto fue del viaje')) + '" style="width:9em"> ' + botao('vg-parte-ok', tr('Dividir', 'Split', 'Dividir'), d) + '</div></li>';
  }
  function bloco(tit, obj, total) {
    var ks = Object.keys(obj).sort(function (a, b) { return obj[b] - obj[a]; }); if (!ks.length) return '';
    return '<div class="vg-bloco"><h4 style="margin:10px 0 4px">' + esc(tit) + '</h4>' + ks.map(function (k) {
      var pct = total ? Math.max(0, Math.min(100, obj[k] / total * 100)) : 0;
      return '<div class="small row" style="justify-content:space-between"><span>' + esc(k) + '</span><b>' + esc(fmt(obj[k])) + '</b></div><div style="height:4px;background:var(--line);border-radius:2px"><div style="height:4px;width:' + pct.toFixed(1) + '%;background:var(--accent, #4aa3ff);border-radius:2px"></div></div>';
    }).join('') + '</div>';
  }
  function telaViagem(v) {
    levarPendentes(v);
    var sg = sugestoes(v), r = resumo(v), j = janela(v);
    var dPorDia = {}; Object.keys(r.porDia).sort().forEach(function (k) { dPorDia[I18n.data(k, { semAno: true })] = r.porDia[k]; });
    var h = '<div class="card-head"><h1>✈️ ' + esc(v.nome) + '</h1></div>' +
      '<p class="small muted">' + esc((v.destinos || []).join(', ') + ' · ' + fmtDias(v) + ' · ' + tr('janela ', 'window ', 'ventana ') + I18n.data(j.de, { semAno: true }) + ' – ' + I18n.data(j.ate, { semAno: true })) +
      (v.link ? ' · <a href="' + esc(v.link) + '" target="_blank" rel="noopener noreferrer">' + esc(tr('roteiro', 'itinerary', 'itinerario')) + ' ↗</a>' : '') + '</p>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap;margin:0 0 8px">' + botao('vg-voltar', '← ' + tr('Viagens', 'Trips', 'Viajes')) + botao('vg-editar', '✏️ ' + tr('Editar', 'Edit', 'Editar'), ' data-v="' + esc(v.id) + '"') +
      (v.rachaiId ? botao('ra-irviagem', '🧳 ' + tr('Rateio no RachAI', 'Split in RachAI', 'Reparto en RachAI'), ' data-id="' + esc(v.rachaiId) + '"') : '') + '</div>';
    h += '<div class="card vg-confirma"><div class="card-head"><h3>' + esc(tr('Gastos da viagem: confirme', 'Trip spending: confirm', 'Gastos del viaje: confirma')) + ' (' + sg.length + ')</h3></div>' +
      (sg.length ? '<p class="small muted" style="margin:0 0 6px">' + esc(tr('Sugestões pelo período, pela cidade e pelo tipo de gasto. A categoria não muda: a viagem é uma etiqueta. Sua resposta vale para a mesma loja da próxima vez.', 'Suggested by dates, city and kind of spending. The category does not change: the trip is a tag. Your answer applies to the same store next time.', 'Sugerencias por las fechas, la ciudad y el tipo de gasto. La categoría no cambia: el viaje es una etiqueta. Tu respuesta vale para la misma tienda la próxima vez.')) + '</p>' +
        '<ul class="inb-lista">' + sg.map(function (s) { return linhaSug(v, s); }).join('') + '</ul><p>' + botao('vg-todos', '✅ ' + tr('Confirmar todos os sugeridos', 'Confirm all suggested', 'Confirmar todos los sugeridos'), ' data-v="' + esc(v.id) + '"', 'primary') + '</p>'
        : '<p class="small muted">' + esc(tr('Nada para confirmar agora.', 'Nothing to confirm now.', 'Nada que confirmar ahora.')) + '</p>') + '</div>';
    h += '<div class="card vg-resumo"><div class="card-head"><h3>' + esc(tr('Resumo da viagem', 'Trip summary', 'Resumen del viaje')) + '</h3></div>' +
      '<p class="vg-total"><b style="font-size:1.4em">' + esc(fmt(r.total)) + '</b> · ' + esc(r.n + tr(' lançamentos', ' entries', ' movimientos')) + '</p>' +
      '<p class="small">' + esc(tr('Por dia: ', 'Per day: ', 'Por día: ') + fmt(r.porDiaMedio) + ' (' + r.dias + tr(' dias', ' days', ' días') + ') · ' + tr('por pessoa: ', 'per person: ', 'por persona: ') + fmt(r.porPessoaMedio) + ' (' + r.pessoas + ')') + '</p>' +
      (r.orcamento ? '<p class="small vg-orc">' + esc(tr('Previsto ', 'Planned ', 'Previsto ') + fmt(r.orcamento) + ' × ' + tr('realizado ', 'actual ', 'realizado ') + fmt(r.total) + ' · ' + (r.diferenca > 0 ? tr('passou ', 'over by ', 'pasó ') + fmt(r.diferenca) : tr('sobrou ', 'under by ', 'sobró ') + fmt(-r.diferenca))) + '</p>' : '') +
      '<p class="small">' + esc(tr('Antes ', 'Before ', 'Antes ') + fmt(r.fases.antes) + ' · ' + tr('durante ', 'during ', 'durante ') + fmt(r.fases.durante) + ' · ' + tr('depois ', 'after ', 'después ') + fmt(r.fases.depois)) + '</p>' +
      (r.combEstimado ? '<p class="small">⛽ ' + esc(tr('Combustível estimado pelos km: ', 'Fuel estimated from the km: ', 'Combustible estimado por los km: ') + fmt(r.combEstimado) + ' (' + v.km + ' km)') + '</p>' : '') +
      (r.pendentes ? '<p class="small muted">⏳ ' + esc(tr('Pendente no banco (ainda não conta): ', 'Pending at the bank (not counted yet): ', 'Pendiente en el banco (aún no cuenta): ') + fmt(r.pendentes)) + '</p>' : '') +
      (r.aReceber ? '<p class="small">↩ ' + esc(tr('A receber (estornos): ', 'To receive (refunds): ', 'Por cobrar (reembolsos): ') + fmt(r.aReceber)) + '</p>' : '') +
      (r.rachai ? '<p class="small">🧳 ' + esc(tr('RachAI "', 'RachAI "', 'RachAI "') + r.rachai.nome + '": ' + tr('total ', 'total ', 'total ') + fmt(r.rachai.total) + ' · ' + tr('a parte da família ', 'the family share ', 'la parte de la familia ') + fmt(r.rachai.nossa)) + '</p>' : '') +
      bloco(tr('Por categoria', 'By category', 'Por categoría'), r.porCat, r.total) + bloco(tr('Por dia', 'By day', 'Por día'), dPorDia, r.total) +
      bloco(tr('Por pessoa', 'By person', 'Por persona'), r.porPessoa, r.total) + bloco(tr('Por cartão', 'By card', 'Por tarjeta'), r.porCartao, r.total) + '</div>';
    return h;
  }
  function telaLista() {
    var l = lista().filter(visivel).slice().sort(function (a, b) { return (b.inicio || '').localeCompare(a.inicio || ''); });
    return '<div class="card-head"><h1>✈️ ' + esc(tr('Viagens', 'Trips', 'Viajes')) + '</h1></div>' +
      '<p class="small muted">' + esc(tr('Diga as datas e o app junta os gastos daquele período (você confirma). A categoria de cada gasto não muda.', 'Set the dates and the app gathers the spending of that period (you confirm). Each entry keeps its category.', 'Indica las fechas y la app junta los gastos de ese período (tú confirmas). La categoría de cada gasto no cambia.')) + '</p>' +
      '<p>' + botao('vg-nova', '+ ' + tr('Nova viagem', 'New trip', 'Nuevo viaje'), '', 'primary') + '</p>' +
      (l.length ? l.map(function (v) {
        var r = resumo(v), n = sugestoes(v).length;
        return '<button class="card card-link vg-item" data-acao="vg-abrir" data-v="' + esc(v.id) + '" style="width:100%;text-align:left"><span><b>✈️ ' + esc(v.nome) + '</b><span class="t-sub">' +
          esc(fmtDias(v) + ' · ' + fmt(r.total) + (n ? ' · ' + n + tr(' para confirmar', ' to confirm', ' por confirmar') : '')) + '</span></span></button>';
      }).join('') : '');
  }
  function tela() { var v = aberta && lerVia(aberta); return v && visivel(v) ? telaViagem(v) : telaLista(); }

  function opcoes(lst, sel, rot) { return lst.map(function (x) { return '<label class="chk" style="display:inline-flex;gap:4px;margin:2px 8px 2px 0"><input type="checkbox" value="' + esc(x.id) + '"' + (sel.indexOf(x.id) >= 0 ? ' checked' : '') + '> ' + esc(rot(x)) + '</label>'; }).join(''); }
  function form(v, semente) {
    v = v || semente || {};
    var ps = window.Pessoas ? Pessoas.ativas() : [], cs = typeof Banco !== 'undefined' ? Banco.cartoes() : [], bs = typeof Banco !== 'undefined' ? Banco.todos() : [];
    var rv = window.RachAI && RachAI.viagens ? RachAI.viagens() : [];
    var f = function (rot, campo) { return '<label class="field"><span>' + esc(rot) + '</span>' + campo + '</label>'; };
    var orc = v.orcamento || (v.inicio ? orcamentoPlanejado(v) : 0);
    $('#genTitle').textContent = v.id ? tr('Editar viagem', 'Edit trip', 'Editar viaje') : '✈️ ' + tr('Nova viagem', 'New trip', 'Nuevo viaje');
    $('#genBody').innerHTML = Verter.html('<div class="vg-form" data-v="' + esc(v.id || '') + '"><div class="grid g2">' +
      f(tr('Nome', 'Name', 'Nombre'), '<input id="vgNome" maxlength="80" value="' + esc(v.nome || '') + '" placeholder="' + esc(tr('Ex.: Serra em novembro', 'E.g.: Mountains in November', 'Ej.: Sierra en noviembre')) + '">') +
      f(tr('Destino(s), separados por vírgula', 'Destination(s), comma separated', 'Destino(s), separados por coma'), '<input id="vgDest" maxlength="160" value="' + esc((v.destinos || []).join(', ')) + '">') +
      f(tr('Início', 'Start', 'Inicio'), '<input id="vgIni" type="date" value="' + esc(v.inicio || '') + '">') + f(tr('Fim', 'End', 'Fin'), '<input id="vgFim" type="date" value="' + esc(v.fim || '') + '">') +
      f(tr('Como foi', 'How you went', 'Cómo fue'), '<select id="vgMeio">' + [['', tr('—', '—', '—')], ['aviao', '✈️ ' + tr('Avião', 'Plane', 'Avión')], ['carro', '🚗 ' + tr('Carro próprio', 'Own car', 'Coche propio')], ['onibus', '🚌 ' + tr('Ônibus (rodoviária)', 'Bus (bus station)', 'Autobús (estación)')], ['outro', '🚆 ' + tr('Outro', 'Other', 'Otro')], ['misto', tr('Misto', 'Mixed', 'Mixto')]].map(function (o) { return '<option value="' + o[0] + '"' + ((v.meio || '') === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>') +
      f(tr('Km rodados (carro, opcional)', 'Km driven (car, optional)', 'Km recorridos (coche, opcional)'), '<input id="vgKm" type="number" min="0" value="' + (v.km || '') + '">') +
      f(tr('Saí de casa às (opcional)', 'Left home at (optional)', 'Salí de casa a las (opcional)'), '<input id="vgHIni" type="time" value="' + esc(v.horaInicio || '') + '">') +
      f(tr('Cheguei em casa às (opcional)', 'Got home at (optional)', 'Llegué a casa a las (opcional)'), '<input id="vgHFim" type="time" value="' + esc(v.horaFim || '') + '">') +
      f(tr('Dias antes (aeroporto, estrada)', 'Days before (airport, road)', 'Días antes (aeropuerto, carretera)'), '<input id="vgAntes" type="number" min="0" max="10" value="' + (v.antes != null ? v.antes : 1) + '">') +
      f(tr('Dias depois', 'Days after', 'Días después'), '<input id="vgDepois" type="number" min="0" max="10" value="' + (v.depois != null ? v.depois : 1) + '">') +
      f(tr('Orçamento (R$)', 'Budget (R$)', 'Presupuesto (R$)'), '<input id="vgOrc" inputmode="decimal" value="' + (orc ? String(orc).replace('.', ',') : '') + '">') +
      f(tr('Hotel ou hospedagem (ajuda a achar a reserva)', 'Hotel or lodging (helps find the booking)', 'Hotel o alojamiento (ayuda a encontrar la reserva)'), '<input id="vgHotel" maxlength="60" value="' + esc(v.hotel || '') + '">') +
      f(tr('Link do roteiro (GuiaXpert)', 'Itinerary link (GuiaXpert)', 'Enlace del itinerario (GuiaXpert)'), '<input id="vgLink" type="url" maxlength="300" value="' + esc(v.link || '') + '" placeholder="https://">') +
      (rv.length ? f(tr('Viagem no RachAI (rateio)', 'RachAI trip (split)', 'Viaje en RachAI (reparto)'), '<select id="vgRachai"><option value="">—</option>' + rv.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === v.rachaiId ? ' selected' : '') + '>' + esc(x.nome) + '</option>'; }).join('') + '</select>') : '') +
      '</div>' +
      (ps.length ? '<p class="small" style="margin:8px 0 2px"><b>' + esc(tr('Quem foi', 'Who went', 'Quién fue')) + '</b></p><div id="vgPess">' + opcoes(ps, v.pessoas || [], function (p) { return Pessoas.rotulo(p); }) + '</div>' : '') +
      (cs.length || bs.length ? '<p class="small" style="margin:8px 0 2px"><b>' + esc(tr('Cartões e contas que contam', 'Cards and accounts that count', 'Tarjetas y cuentas que cuentan')) + '</b> <span class="muted">' + esc(tr('(nenhum marcado = os de quem foi)', '(none ticked = those of who went)', '(ninguno marcado = los de quien fue)')) + '</span></p>' +
        '<div id="vgCart">' + opcoes(cs, v.cartoes || [], function (c) { return (c.apelido || tr('Cartão', 'Card', 'Tarjeta')) + (c.fim ? ' ••' + c.fim : ''); }) + '</div><div id="vgContas">' + opcoes(bs, v.contas || [], function (b) { return b.nome || b.apelido || b.banco || b.id; }) + '</div>' : '') +
      '<label class="chk" style="display:block;margin-top:8px"><input type="checkbox" id="vgCasa"' + ((v.escopo || '') === 'casa' ? ' checked' : '') + '> ' + esc(tr('Viagem da casa (a família vê)', 'Household trip (the family sees it)', 'Viaje de la casa (la familia lo ve)')) + '</label>' +
      '<div class="f-actions">' + (v.id ? botao('vg-tirar', tr('Apagar a viagem', 'Delete the trip', 'Borrar el viaje'), ' data-v="' + esc(v.id) + '"') : '') + botao('vg-salvar', tr('Salvar', 'Save', 'Guardar'), '', 'primary') + '</div></div>');
    abrir('genModal');
  }
  function marcados(id) { return [].slice.call(document.querySelectorAll('#' + id + ' input:checked')).map(function (x) { return x.value; }); }
  function val(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }
  function num(t) { var s = String(t || '').trim(); if (/,/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); return Number(s) || 0; }
  function depois() { Store.salvar(); if (typeof render === 'function') render(); if (typeof renderInboxN === 'function') renderInboxN(); }

  MoneyModulos.registrar({
    id: 'viagem', versao: '1.0.0', colecoes: [COL],
    pontos: {
      'inbox.grupos': function () {
        if (casa()) return [];
        API.ligarTudo();
        var h = '', n = 0;
        detectar().forEach(function (s) {
          n++;
          var q = s.cidade ? tr('Parece que você está viajando (', 'Looks like you are traveling (', 'Parece que estás de viaje (') + s.nome + ', ' + I18n.data(s.de, { semAno: true }).replace(/\/\w+$/, '') + '–' + I18n.data(s.ate, { semAno: true }) + '). ' + tr('Criar a viagem?', 'Create the trip?', '¿Crear el viaje?')
            : tr('Combustível fora do normal (', 'Fuel above normal (', 'Combustible por encima de lo normal (') + I18n.data(s.de, { semAno: true }) + '–' + I18n.data(s.ate, { semAno: true }) + '). ' + tr('Foi viagem? Criar a viagem?', 'Was it a trip? Create the trip?', '¿Fue un viaje? ¿Crear el viaje?');
          h += '<li class="inb-item vg-detec"><div><b>✈️ ' + esc(q) + '</b><span class="t-sub">' + esc(s.n + tr(' gastos seguidos', ' spendings in a row', ' gastos seguidos')) + '</span></div><span class="inb-acoes">' +
            botao('vg-criar', tr('Criar a viagem', 'Create the trip', 'Crear el viaje'), ' data-ch="' + esc(s.chave) + '" data-n="' + esc(s.nome) + '" data-de="' + esc(s.de) + '" data-ate="' + esc(s.ate) + '"', 'primary') +
            botao('vg-sug-nao', tr('Não foi viagem', 'Not a trip', 'No fue un viaje'), ' data-ch="' + esc(s.chave) + '"') + '</span></li>';
        });
        lista().filter(visivel).forEach(function (v) {
          perguntasHora(v).forEach(function (q) {
            n++;
            h += '<li class="inb-item vg-hora" data-lado="' + q.lado + '"><div><b>✈️ ' + esc(v.nome + ' · ' + (q.lado === 'ida' ? tr('ida', 'going', 'ida') : tr('volta', 'coming back', 'vuelta')) + ' (' + I18n.data(q.dia, { semAno: true }) + '): ' +
              (q.lado === 'ida' ? tr('Qual foi o PRIMEIRO gasto da viagem?', 'Which was the FIRST trip spending?', '¿Cuál fue el PRIMER gasto del viaje?') : tr('Qual foi o ÚLTIMO gasto da viagem?', 'Which was the LAST trip spending?', '¿Cuál fue el ÚLTIMO gasto del viaje?'))) + '</b>' +
              '<span class="t-sub">' + esc(q.lado === 'ida' ? tr('O que veio antes dele fica fora.', 'What came before it stays out.', 'Lo anterior queda fuera.') : tr('O que veio depois dele fica fora.', 'What came after it stays out.', 'Lo posterior queda fuera.')) + '</span>' +
              '<ul class="vg-hora-lista" style="margin:4px 0 0;padding-left:16px">' + q.l.map(function (g) {
                return '<li class="small" data-g="' + esc(g.id) + '">' + esc((g.hora || tr('sem hora', 'no time', 'sin hora')) + ' · ' + (g.descRobo || g.desc || '') + ' · ' + fmt(g.valor)) +
                  (g.hora ? ' ' + botao(q.lado === 'ida' ? 'vg-primeiro' : 'vg-ultimo', q.lado === 'ida' ? tr('É o primeiro', 'First one', 'Es el primero') : tr('É o último', 'Last one', 'Es el último'), ' data-v="' + esc(v.id) + '" data-h="' + esc(g.hora) + '"')
                    : ' <span class="muted">(' + esc(tr('confirme um a um', 'confirm one by one', 'confirma uno a uno')) + ')</span>') + '</li>';
              }).join('') + '</ul></div></li>';
          });
          var k = sugestoes(v).length; if (!k) return; n++;
          h += '<li class="inb-item"><div><b>✈️ ' + esc(v.nome + ': ' + k + tr(' gastos para confirmar', ' spendings to confirm', ' gastos por confirmar')) + '</b><span class="t-sub">' + esc(fmtDias(v)) + '</span></div><span class="inb-acoes">' +
            botao('vg-abrir', tr('Confirmar', 'Confirm', 'Confirmar'), ' data-v="' + esc(v.id) + '" data-close="genModal"', 'primary') + '</span></li>';
        });
        return n ? [{ id: 'viagem', n: n, html: h }] : [];
      },
      'lancamento.form': function (ctx) {
        var g = ctx && ctx.g, v = g && g.viagem && lerVia(g.viagem); if (!v) return '';
        return '<div class="bloco-regra vg-etq"><span class="bf-tit">✈️ ' + esc(tr('Da viagem: ', 'Trip: ', 'Del viaje: ') + v.nome) + '</span>' +
          '<button type="button" class="btn sm" data-acao="vg-nao" data-v="' + esc(v.id) + '" data-id="' + esc(g.id) + '">' + esc(tr('Não é da viagem', 'Not from the trip', 'No es del viaje')) + '</button></div>';
      },
      'planejados.viagens': function () {
        return '<div class="row" style="margin:6px 0"><button class="btn sm" data-irpara="b-viagens">✈️ ' + esc(tr('Minhas viagens (gastos por período)', 'My trips (spending by dates)', 'Mis viajes (gastos por período)')) + '</button></div>';
      }
    },
    telas: { 'b-viagens': { app: 'budget', render: tela,
      ajuda: { pt: { t: 'Viagens', o: 'Os gastos de uma viagem pelo período, com a sua confirmação.', f: ['Crie a viagem com as datas.', 'Confirme o que o app sugere: é da viagem, não é, ou só uma parte.', 'O resumo mostra o total, por dia, por pessoa e por cartão.'] },
               en: { t: 'Trips', o: 'A trip’s spending by dates, with your confirmation.', f: ['Create the trip with its dates.', 'Confirm what the app suggests: trip, not trip, or just a part.', 'The summary shows the total, per day, per person and per card.'] } } } },
    acoes: {
      'vg-nova': function () { form(null); },
      'vg-editar': function (el) { form(lerVia(el.dataset.v)); },
      'vg-criar': function (el) {
        var ch = el.dataset.ch || ''; combPendente = /^c\|/.test(ch) ? ch.slice(2) : '';
        fechar('genModal'); form(null, { nome: el.dataset.n || '', destinos: el.dataset.n ? [el.dataset.n] : [], inicio: el.dataset.de, fim: el.dataset.ate, meio: combPendente ? 'carro' : '' });
      },
      'vg-sug-nao': function (el) {
        var ch = el.dataset.ch || ''; cfg().viagemSugNao = Object.assign({}, cfg().viagemSugNao); cfg().viagemSugNao[ch] = 1;
        if (/^c\|/.test(ch) && window.Previsao) Previsao.responder(ch.slice(2), false);
        depois();
      },
      'vg-salvar': function () {
        var box = document.querySelector('.vg-form'), id = box && box.dataset.v;
        var d = { nome: val('vgNome'), destinos: val('vgDest').split(',').map(function (x) { return x.trim(); }).filter(Boolean), inicio: val('vgIni'), fim: val('vgFim'),
          antes: val('vgAntes'), depois: val('vgDepois'), horaInicio: val('vgHIni'), horaFim: val('vgHFim'), meio: val('vgMeio'), km: val('vgKm'), orcamento: num(val('vgOrc')), hotel: val('vgHotel'), link: val('vgLink'), rachaiId: val('vgRachai'),
          pessoas: marcados('vgPess'), cartoes: marcados('vgCart'), contas: marcados('vgContas') };
        var antes = id && lerVia(id), casaMarc = (document.getElementById('vgCasa') || {}).checked;
        if (!antes || (antes.escopo === 'casa') !== casaMarc) d.escopo = casaMarc ? 'casa' : (antes || d.pessoas.length ? 'reservado' : undefined);
        if (!antes && !casaMarc) delete d.escopo;
        if (!antes && combPendente && window.Previsao) { var rp = Previsao.responder(combPendente, true, d.destinos[0] || ''); if (rp && rp.evento) d.eventoId = rp.evento.id; }
        combPendente = '';
        var v = salvar(d, id); if (!v) return toast(tr('Diga ao menos a data de início.', 'Give at least the start date.', 'Indica al menos la fecha de inicio.'), 'warn');
        fechar('genModal'); aberta = v.id; if (typeof irPara === 'function') irPara('b-viagens'); depois();
      },
      'vg-tirar': function (el) { tirar(el.dataset.v); aberta = null; fechar('genModal'); depois(); },
      'vg-abrir': function (el) { aberta = el.dataset.v; if (typeof irPara === 'function') irPara('b-viagens'); if (typeof render === 'function') render(); },
      /* a resposta grava a hora de saída / de chegada */
      'vg-primeiro': function (el) { var v = lerVia(el.dataset.v); if (!v) return; v.horaInicio = el.dataset.h; depois(); },
      'vg-ultimo': function (el) { var v = lerVia(el.dataset.v); if (!v) return; v.horaFim = el.dataset.h; depois(); },
      'vg-voltar': function () { aberta = null; if (typeof render === 'function') render(); },
      'vg-sim': function (el) { var v = lerVia(el.dataset.v); if (v && API.confirmar(v, el.dataset.id, true)) depois(); },
      'vg-nao': function (el) { var v = lerVia(el.dataset.v); if (v && API.confirmar(v, el.dataset.id, false)) depois(); },
      'vg-todos': function (el) { var v = lerVia(el.dataset.v); if (!v) return; var n = API.confirmarTodos(v); depois(); toast('✈️ ' + n + tr(' gastos na viagem.', ' spendings in the trip.', ' gastos en el viaje.')); },
      'vg-parte': function (el) { var b = document.querySelector('.vg-parte-box[data-g="' + el.dataset.id + '"]'); if (b) b.hidden = !b.hidden; },
      'vg-parte-ok': function (el) {
        var v = lerVia(el.dataset.v), b = document.querySelector('.vg-parte-box[data-g="' + el.dataset.id + '"] .vg-parte-v');
        if (!v || !b) return;
        if (!API.parte(v, el.dataset.id, num(b.value))) return toast(tr('Diga um valor menor que o total.', 'Enter an amount below the total.', 'Indica un importe menor que el total.'), 'warn');
        depois();
      }
    },
    ouvir: { 'gasto.novo': function () { if (lista().length) API.ligarTudo(); } }
  });
  window.Viagem = API;
})();
