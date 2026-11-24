/* =====================================================================
   modulos/veiculos.js — MEUS VEÍCULOS e "QUANTO O CARRO CUSTA" (3.99)        1.0.1 · 24/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 23/Nov/2026: "quanto o carro me custa e para onde vai o dinheiro"; sem IA)
     · Meus veículos: cada carro com um APELIDO ("Renegade 2019"), nunca a placa. Cada lançamento do grupo Veículo ganha o carro
       (g.veiculoId, uma etiqueta: a categoria não muda). Com um carro só, vai direto; com dois ou mais, o 📥 pergunta "Qual
       carro?" e aprende pela loja (Origem).
     · Categorias do Veículo separadas: Mecânica e revisão · Funilaria e pintura · Pneus · Seguro Auto · IPVA e licenciamento ·
       Combustível · Estacionamento · Sem Parar / Pedagio · Multas · Lavagem (as que já existiam continuam; as novas entram na
       lista do grupo). A antiga "Mecânico / Elétrico / Funilaria" continua valendo; o 📥 oferece reclassificar item a item,
       nunca muda nada sozinho.
     · "🚗 Quanto o carro custa" (tela b-carro): por carro, no mês e no ano, em 3 blocos — ter o carro (prestação/consórcio,
       seguro, IPVA e licenciamento), usar (combustível, estacionamento, pedágio, lavagem, multas) e manutenção (mecânica,
       funilaria, pneus). O serviço parcelado aparece pelo valor contratado (a ficha, modulos/compra-parcelada.js) e pelo que
       caiu no mês (as parcelas); a lista do que foi pago, com o documento (cofre de arquivos). Total dos 12 meses e média por
       mês, para comparar com trocar de carro.
     · Ponto de saída preparado (regra zero: NÃO envia): eventoServico(ficha|gasto) monta {veiculo_ref, data, oficina,
       categoria, valor_pago, parcelas, ref_documento} para o evento "servico_veiculo_feito" do OmniLifeONE (sol_ponte),
       quando o dono aprovar essa integração.
   API (window.Veiculos)
     lista() · ativos() · salvar(apelido, id?) · arquivar(id) · veiculoDe(g) · definir(gid, vid) · bloco(sub) → 'ter'|'usar'|'manut'|'outros'
     semCarro() · paraReclassificar() · reclassificar(gid, sub) · relatorio(vid, mes) · eventoServico(x) · SUBS
   DADOS
     ST.veiculos = [{id, apelido, ativo, criadoEm}] · ST.config.veicRegras = {origem: vid} · ST.config.veicReclassNao = {gid: 1}
     lançamento: g.veiculoId
   1.0.1 (3.103): os botões do Google Drive (modulos/google-drive.js): "📁 Pasta no Drive" em cada carro e "📁 Enviar ao Drive" no
     serviço com documento (a ficha parcelada ou o lançamento).
   PONTOS QUE USA
     tela b-carro · inbox.grupos ('confirmar') · lancamento.form · ações vc-*
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'veiculos';
  var SUBS = ['Mecânica e revisão', 'Funilaria e pintura', 'Pneus', 'Seguro Auto', 'IPVA e licenciamento', 'Combustível', 'Estacionamento', 'Sem Parar / Pedagio', 'Multas', 'Lavagem'];
  var NOVAS_MANUT = ['Mecânica e revisão', 'Funilaria e pintura', 'Pneus'];
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function hoje() { return API._hoje || hojeISO(); }
  function cfg() { return (ST.config = ST.config || {}); }
  function lista() { if (!ST) return []; return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function ativos() { return lista().filter(function (v) { return v.ativo !== false; }); }
  function origem(g) { return window.Origem ? Origem.origemDe(g) : String(g.descRobo || g.desc || '').slice(0, 20); }
  function credito(g) { return !!g && (g.estorno || Number(g.valor) < 0 || g.fluxo === 'entrada'); }
  function doCarro(g) { return g && g.grupo === 'VEICULO' && !credito(g); }
  function mesMais(m, n) { var a = +m.slice(0, 4), k = +m.slice(5, 7) - 1 + n; a += Math.floor(k / 12); k = ((k % 12) + 12) % 12; return a + '-' + ('0' + (k + 1)).slice(-2); }
  function nomeMes(m) { try { return new Date(m + '-15T12:00:00Z').toLocaleDateString(I18n.locale ? I18n.locale() : 'pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }); } catch (e) { return m; } }

  function bloco(sub) {
    var s = String(sub || '');
    if (/presta|financ|cons[oó]rcio|seguro|ipva|licenc|inspe|document/i.test(s)) return 'ter';
    if (/combust|gasol|etanol|diesel|estacion|ped[aá]g|sem parar|\btag\b|lavag|lava.?jato|multa|zona azul/i.test(s)) return 'usar';
    if (/mec[aâ]n|revis|funil|pintur|pneu|el[eé]tric|oficina|pe[cç]a|manuten|alinh|balanc|bateria|[oó]leo/i.test(s)) return 'manut';
    return 'outros';
  }
  var ANTIGA = /mec[aâ]nico\s*\/\s*el[eé]trico|el[eé]trico\s*\/\s*funilaria/i;

  function veiculoDe(g) {
    if (!g) return null;
    var l = lista();
    if (g.veiculoId) return l.find(function (v) { return v.id === g.veiculoId; }) || null;
    var at = ativos(); if (at.length === 1) return at[0];
    var r = (cfg().veicRegras || {})[origem(g)];
    return r ? l.find(function (v) { return v.id === r; }) || null : null;
  }
  /* com um carro só: todo lançamento do Veículo ganha o carro (fica gravado; um 2º carro depois não bagunça os antigos) */
  function ligarTudo() {
    var at = ativos(), n = 0; if (at.length !== 1) return 0;
    Gasto.todos().forEach(function (g) { if (doCarro(g) && !g.veiculoId) { Gasto.atualizar(g.id, { veiculoId: at[0].id }); n++; } });
    return n;
  }
  function definir(gid, vid) {
    var g = Gasto.todos().find(function (x) { return x.id === gid; }); if (!g) return false;
    var ids = [gid];
    if (g.compraId && window.CompraParcelada) { var f = CompraParcelada.achar(g.compraId); if (f) { f.veiculoId = vid; ids = ids.concat(f.gastoIds || []); } }
    ids.forEach(function (id) { Gasto.atualizar(id, { veiculoId: vid }); });
    var rg = cfg().veicRegras = Object.assign({}, cfg().veicRegras); rg[origem(g)] = vid;
    return true;
  }
  function semCarro() {
    if (ativos().length < 2) return [];
    var de = mesMais(hoje().slice(0, 7), -6) + '-01';
    return Gasto.todos().filter(function (g) { return doCarro(g) && g.data >= de && !veiculoDe(g); });
  }
  function paraReclassificar() { var nao = cfg().veicReclassNao || {}; return Gasto.todos().filter(function (g) { return g.grupo === 'VEICULO' && ANTIGA.test(g.sub || '') && !nao[g.id]; }); }
  /* as categorias novas entram na lista do grupo (uma vez); as que já existiam continuam */
  function garantirCategorias() {
    if (cfg().veic399) return false;
    ST.categorias = ST.categorias || {};
    var l = ST.categorias.VEICULO = Array.isArray(ST.categorias.VEICULO) ? ST.categorias.VEICULO : [];
    SUBS.forEach(function (s) { if (l.indexOf(s) < 0) l.push(s); });
    cfg().veic399 = true; return true;
  }

  /* ---------- o relatório ---------- */
  function relatorio(vid, mes) {
    mes = mes || hoje().slice(0, 7);
    var meses = []; for (var k = 11; k >= 0; k--) meses.push(mesMais(mes, -k));
    var gs = Gasto.todos().filter(function (g) { if (!doCarro(g) || !g.data) return false; var v = veiculoDe(g); return vid === 'todos' || (v && v.id === vid); });
    var r = { mes: mes, blocos: { ter: 0, usar: 0, manut: 0, outros: 0 }, porSub: {}, itens: [], contratado: [], ano: 0, porMes: {} };
    meses.forEach(function (m) { r.porMes[m] = 0; });
    gs.forEach(function (g) {
      var m = g.data.slice(0, 7), v = Number(g.valor) || 0;
      if (r.porMes[m] != null) { r.porMes[m] = n2(r.porMes[m] + v); r.ano = n2(r.ano + v); }
      if (m !== mes) return;
      var b = bloco(g.sub); r.blocos[b] = n2(r.blocos[b] + v);
      var ks = (g.sub || tr('sem categoria', 'no category', 'sin categoría')); r.porSub[ks] = r.porSub[ks] || { bloco: b, valor: 0 }; r.porSub[ks].valor = n2(r.porSub[ks].valor + v);
      r.itens.push(g);
    });
    /* o serviço pelo valor contratado: as fichas das compras parceladas deste carro (a do mês e as que ainda caem) */
    if (window.CompraParcelada) CompraParcelada.lista().forEach(function (f) {
      var ps = CompraParcelada.parcelas(f), v = f.veiculoId ? lista().find(function (x) { return x.id === f.veiculoId; }) : (ps[0] && veiculoDe(ps[0]));
      if (vid !== 'todos' && (!v || v.id !== vid)) return;
      if (f.grupo && f.grupo !== 'VEICULO') return;
      var noMes = ps.filter(function (g) { return g.data && g.data.slice(0, 7) === mes; });
      /* entra no mês do contrato, nos meses em que cai parcela e enquanto faltam parcelas */
      if (f.data.slice(0, 7) > mes || !(noMes.length || f.data.slice(0, 7) === mes || ps.length < f.n)) return;
      r.contratado.push({ f: f, caiu: n2(noMes.reduce(function (s, g) { return s + (Number(g.valor) || 0); }, 0)), pagas: ps.length });
    });
    r.total = n2(r.blocos.ter + r.blocos.usar + r.blocos.manut + r.blocos.outros);
    r.media = n2(r.ano / 12);
    r.itens.sort(function (a, b) { return a.data < b.data ? -1 : 1; });
    return r;
  }

  /* ponto de saída para o OmniLifeONE (servico_veiculo_feito, sol_ponte): só monta, NÃO envia (regra zero) */
  function eventoServico(x) {
    if (!x) return null;
    var f = x.total != null && x.n ? x : (x.compraId && window.CompraParcelada ? CompraParcelada.achar(x.compraId) : null);
    var g = f ? null : x, v = f ? (f.veiculoId || (CompraParcelada.parcelas(f)[0] || {}).veiculoId) : (veiculoDe(g) || {}).id;
    return { veiculo_ref: v || '', data: f ? f.data : g.data, oficina: f ? (f.desc || f.loja) : (g.descRobo || g.desc || ''), categoria: f ? f.sub : g.sub,
      valor_pago: f ? f.total : n2(g.valor), parcelas: f ? f.n : 1, ref_documento: (f ? f.docId : g.docId) || '' };
  }

  var API = {
    _hoje: null, SUBS: SUBS, lista: lista, ativos: ativos, veiculoDe: veiculoDe, definir: definir, bloco: bloco, semCarro: semCarro,
    paraReclassificar: paraReclassificar, relatorio: relatorio, eventoServico: eventoServico, ligarTudo: ligarTudo, garantirCategorias: garantirCategorias,
    salvar: function (apelido, id) {
      apelido = String(apelido || '').trim().slice(0, 40); if (!apelido) return null;
      var v = id ? lista().find(function (x) { return x.id === id; }) : null;
      if (v) v.apelido = apelido; else { v = { id: 'vc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), apelido: apelido, ativo: true, criadoEm: hoje() }; lista().push(v); }
      garantirCategorias(); ligarTudo(); return v;
    },
    arquivar: function (id) { var v = lista().find(function (x) { return x.id === id; }); if (v) v.ativo = false; return !!v; },
    reclassificar: function (gid, sub) {
      var g = Gasto.todos().find(function (x) { return x.id === gid; }); if (!g) return false;
      if (sub) Gasto.atualizar(gid, { sub: sub, editadoPessoa: true });
      cfg().veicReclassNao = Object.assign({}, cfg().veicReclassNao); cfg().veicReclassNao[gid] = 1;
      return true;
    }
  };

  /* ---------- tela ---------- */
  var sel = { vid: '', mes: '' };
  function botao(acao, rot, extra, cls) { return '<button type="button" class="btn sm' + (cls ? ' ' + cls : '') + '" data-acao="' + acao + '"' + (extra || '') + '>' + esc(rot) + '</button>'; }
  function rotBloco(b) { return { ter: tr('Ter o carro', 'Owning the car', 'Tener el coche'), usar: tr('Usar', 'Using it', 'Usarlo'), manut: tr('Manutenção', 'Maintenance', 'Mantenimiento'), outros: tr('Outros', 'Other', 'Otros') }[b]; }
  function tela() {
    var at = ativos(), mes = sel.mes || hoje().slice(0, 7), vid = sel.vid && (sel.vid === 'todos' || at.some(function (v) { return v.id === sel.vid; })) ? sel.vid : (at[0] ? at[0].id : 'todos');
    var h = '<div class="card-head"><h1>🚗 ' + esc(tr('Quanto o carro custa', 'What the car costs', 'Cuánto cuesta el coche')) + '</h1></div>';
    h += '<div class="card vc-meus"><div class="card-head"><h3>' + esc(tr('Meus veículos', 'My vehicles', 'Mis vehículos')) + '</h3></div>' +
      '<p class="small muted">' + esc(tr('Um apelido para cada carro (ex.: "Renegade 2019"), nunca a placa.', 'A nickname for each car (e.g. "Renegade 2019"), never the plate.', 'Un apodo para cada coche (ej.: "Renegade 2019"), nunca la matrícula.')) + '</p>' +
      at.map(function (v) { return '<div class="row" style="gap:6px;margin:2px 0"><b>🚗 ' + esc(v.apelido) + '</b>' + botao('vc-arquivar', tr('Não tenho mais', 'Sold it', 'Ya no lo tengo'), ' data-id="' + esc(v.id) + '"') + (window.GoogleDrive ? GoogleDrive.botaoPasta(v) : '') + '</div>'; }).join('') +
      '<div class="row" style="gap:6px;margin-top:6px"><input id="vcApelido" maxlength="40" placeholder="' + esc(tr('Apelido do carro', 'Car nickname', 'Apodo del coche')) + '">' + botao('vc-novo', '+ ' + tr('Adicionar', 'Add', 'Añadir'), '', 'primary') + '</div></div>';
    if (!at.length) return h;
    var r = relatorio(vid, mes);
    h += '<div class="row" style="gap:6px;flex-wrap:wrap;margin:8px 0">' +
      (at.length > 1 ? '<select id="vcSel">' + at.map(function (v) { return '<option value="' + esc(v.id) + '"' + (v.id === vid ? ' selected' : '') + '>' + esc(v.apelido) + '</option>'; }).join('') + '<option value="todos"' + (vid === 'todos' ? ' selected' : '') + '>' + esc(tr('Todos os carros', 'All cars', 'Todos los coches')) + '</option></select>' : '') +
      botao('vc-mes', '‹', ' data-d="-1"') + '<b class="vc-mes">' + esc(nomeMes(mes)) + '</b>' + botao('vc-mes', '›', ' data-d="1"') + '</div>';
    h += '<div class="card vc-rel"><p><b style="font-size:1.3em">' + esc(fmt(r.total)) + '</b> ' + esc(tr('no mês', 'this month', 'en el mes')) + '</p>' +
      ['ter', 'usar', 'manut', 'outros'].filter(function (b) { return b !== 'outros' || r.blocos.outros; }).map(function (b) {
        var subs = Object.keys(r.porSub).filter(function (k) { return r.porSub[k].bloco === b; });
        return '<div class="vc-bloco" data-bloco="' + b + '"><div class="row" style="justify-content:space-between"><b>' + esc(rotBloco(b)) + '</b><b>' + esc(fmt(r.blocos[b])) + '</b></div>' +
          subs.map(function (k) { return '<div class="small row" style="justify-content:space-between;padding-left:10px"><span>' + esc(k) + '</span><span>' + esc(fmt(r.porSub[k].valor)) + '</span></div>'; }).join('') + '</div>';
      }).join('') +
      (r.contratado.length ? '<h4 style="margin:10px 0 4px">' + esc(tr('Serviços parcelados', 'Installment services', 'Servicios a plazos')) + '</h4>' + r.contratado.map(function (c) {
        return '<div class="small vc-contrato">' + esc((c.f.desc || c.f.loja || '') + (c.f.sub ? ' · ' + c.f.sub : '') + ' · ' + tr('contratado ', 'contracted ', 'contratado ') + fmt(c.f.total) + ' ' + tr('em ', 'in ', 'en ') + c.f.n + 'x · ' + tr('caiu no mês ', 'fell this month ', 'cayó en el mes ') + fmt(c.caiu) + ' (' + c.pagas + '/' + c.f.n + ')') +
          (c.f.docId ? ' ' + botao('vc-doc', '📄 ' + tr('documento', 'document', 'documento'), ' data-id="' + esc(c.f.docId) + '"') : '') + (window.GoogleDrive ? GoogleDrive.botao('f', c.f.id) : '') + '</div>';
      }).join('') : '') +
      '<h4 style="margin:10px 0 4px">' + esc(tr('O que foi pago no mês', 'Paid this month', 'Lo pagado en el mes')) + '</h4>' +
      (r.itens.length ? r.itens.map(function (g) { return '<div class="small row vc-item" style="justify-content:space-between"><span>' + esc(I18n.data(g.data, { semAno: true }) + ' · ' + (g.desc || '') + ' · ' + (g.sub || '')) + (g.docId ? ' ' + botao('vc-doc', '📄', ' data-id="' + esc(g.docId) + '"') : '') + (window.GoogleDrive && !g.compraId ? GoogleDrive.botao('g', g.id) : '') + '</span><span>' + esc(fmt(g.valor)) + '</span></div>'; }).join('') : '<p class="small muted">' + esc(tr('Nada neste mês.', 'Nothing this month.', 'Nada este mes.')) + '</p>') +
      '<p class="small vc-ano" style="margin-top:10px">' + esc(tr('Últimos 12 meses: ', 'Last 12 months: ', 'Últimos 12 meses: ') + fmt(r.ano) + ' · ' + tr('média por mês ', 'monthly average ', 'media por mes ') + fmt(r.media)) + '</p></div>';
    return h;
  }
  function depois() { Store.salvar(); if (typeof render === 'function') render(); if (typeof renderInboxN === 'function') renderInboxN(); }
  document.addEventListener('change', function (ev) {
    var el = ev.target; if (!el || !el.id) return;
    if (el.id === 'vcSel') { sel.vid = el.value; if (typeof render === 'function') render(); }
    if (el.id === 'vcLanc' && el.dataset.g) { if (el.value) { definir(el.dataset.g, el.value); Store.salvar(); } }
  });

  MoneyModulos.registrar({
    id: 'veiculos', versao: '1.0.1', colecoes: [COL],
    pontos: {
      'inbox.grupos': function () {
        if (window.Escopo && Escopo.soCasa && Escopo.soCasa()) return [];
        var h = '', n = 0, at = ativos();
        semCarro().slice(0, 8).forEach(function (g) {
          n++;
          h += '<li class="inb-item vc-qual" data-g="' + esc(g.id) + '"><div><b>🚗 ' + esc(tr('Qual carro? ', 'Which car? ', '¿Qué coche? ') + (g.desc || '') + ' · ' + fmt(g.valor)) + '</b><span class="t-sub">' + esc(I18n.data(g.data) + ' · ' + (g.sub || '')) + '</span></div><span class="inb-acoes">' +
            at.map(function (v) { return botao('vc-qual', v.apelido, ' data-g="' + esc(g.id) + '" data-v="' + esc(v.id) + '"'); }).join('') + '</span></li>';
        });
        paraReclassificar().slice(0, 8).forEach(function (g) {
          n++;
          h += '<li class="inb-item vc-reclass" data-g="' + esc(g.id) + '"><div><b>🔧 ' + esc(tr('Reclassificar? ', 'Reclassify? ', '¿Reclasificar? ') + (g.desc || '') + ' · ' + fmt(g.valor)) + '</b><span class="t-sub">' + esc(I18n.data(g.data) + ' · ' + g.sub) + '</span></div><span class="inb-acoes" style="flex-wrap:wrap;gap:4px">' +
            NOVAS_MANUT.map(function (s) { return botao('vc-reclass', s, ' data-g="' + esc(g.id) + '" data-s="' + esc(s) + '"'); }).join('') + botao('vc-reclass', tr('Manter', 'Keep', 'Mantener'), ' data-g="' + esc(g.id) + '" data-s=""') + '</span></li>';
        });
        return n ? [{ id: 'confirmar', n: n, html: h }] : [];
      },
      'lancamento.form': function (ctx) {
        var g = ctx && ctx.g, at = ativos(); if (!g || g.grupo !== 'VEICULO' || !at.length) return '';
        var v = veiculoDe(g);
        return '<div class="bloco-regra vc-form"><span class="bf-tit">🚗 ' + esc(tr('Carro', 'Car', 'Coche')) + '</span><select id="vcLanc" data-g="' + esc(g.id) + '"><option value="">—</option>' +
          at.map(function (x) { return '<option value="' + esc(x.id) + '"' + (v && v.id === x.id ? ' selected' : '') + '>' + esc(x.apelido) + '</option>'; }).join('') + '</select></div>';
      }
    },
    telas: { 'b-carro': { app: 'budget', render: tela,
      ajuda: { pt: { t: 'Quanto o carro custa', o: 'O custo de cada carro no mês e no ano.', f: ['Cadastre o carro com um apelido (nunca a placa).', 'Os gastos do grupo Veículo ganham o carro.', 'Ter, usar e manutenção, com o serviço parcelado pelo total e pelo que caiu no mês.'] },
               en: { t: 'What the car costs', o: 'Each car’s cost per month and year.', f: ['Add the car with a nickname (never the plate).', 'Vehicle spending gets the car.', 'Owning, using and maintenance, with installment services by total and by what fell in the month.'] } } } },
    acoes: {
      'vc-novo': function () { var v = API.salvar((document.getElementById('vcApelido') || {}).value); if (!v) return toast(tr('Dê um apelido ao carro.', 'Give the car a nickname.', 'Dale un apodo al coche.'), 'warn'); sel.vid = v.id; depois(); },
      'vc-arquivar': function (el) { API.arquivar(el.dataset.id); depois(); },
      'vc-mes': function (el) { sel.mes = mesMais(sel.mes || hoje().slice(0, 7), Number(el.dataset.d) || 0); if (typeof render === 'function') render(); },
      'vc-qual': function (el) { if (definir(el.dataset.g, el.dataset.v)) depois(); },
      'vc-reclass': function (el) { if (API.reclassificar(el.dataset.g, el.dataset.s)) depois(); },
      'vc-doc': function (el) { if (window.ArquivosFamilia) ArquivosFamilia.baixar(el.dataset.id); }
    },
    ouvir: { 'gasto.novo': function () { if (ativos().length === 1 && ligarTudo()) Store.salvar(); } }
  });
  /* as categorias novas do Veículo entram na lista do grupo assim que os dados abrem (uma vez) */
  (function tentar(k) { if (typeof ST !== 'undefined' && ST && ST.config) { if (garantirCategorias() && typeof Store !== 'undefined') Store.salvar(); } else if (k < 40) setTimeout(function () { tentar(k + 1); }, 500); })(0);
  window.Veiculos = API;
})();
