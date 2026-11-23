/* =====================================================================
   modulos/compra-parcelada.js — a FICHA da compra parcelada (canhoto / print × parcelas do banco) (3.99)        1.1.0 · 23/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 23/Nov/2026; sem IA)
     · O canhoto da maquininha (ou o print) de uma compra parcelada diz o TOTAL e as parcelas ("CRÉDITO R$ 6.500,00 · 5X SEM
       JUROS DE R$ 1.300,00"), com a data e a hora do PAGAMENTO. No banco aparece uma parcela por mês ("LOJA 01/05", "02/05"…).
     · A ficha NUNCA cria gasto: liga a parcela "01/N" do banco (valor total ÷ N com tolerância de centavos; data do canhoto até
       +3 dias; o final do cartão e a loja só desempatam) e, depois, as irmãs (mesma descrição sem o k/N, mesmo N, mesmo valor,
       mesmo cartão), inclusive as que chegarem nos meses seguintes. Cada parcela ganha a categoria, a pessoa, o carro, a
       descrição e o documento da ficha (compraId). A categoria da compra também vale para as futuras em modulos/parcelados.js
       (ele usa a última parcela vista).
     · Foto antes da fatura: a ficha fica "⏳ aguardando o banco" e liga sozinha quando a 01/N chegar.
     · Vários candidatos empatados: não liga sozinha (fica aguardando; a pessoa liga pelo Conferir canhotos).
     · 1.1.0 (3.101), a OS da oficina: o CNPJ da loja desempata (com o CNPJ do lançamento do banco); a OS sem o pagamento espera
       a 01/N até 30 dias depois da emissão (ate), e aí só liga com a loja, o CNPJ, o cartão ou o final batendo.
   API (window.CompraParcelada)
     criar(d) → ficha · ligar(ficha) → n de parcelas ligadas · ligarTudo() · lista() · aguardando() · parcelas(ficha) → [gasto]
     base(desc) → a descrição sem o k/N
   DADOS
     ST.compras_parceladas = [{id, total, n, vp, data, hora, loja, final, cnpj?, ate?, cartaoId, grupo, sub, paraQuem, paraQuemId, veiculoId,
       docId, desc, estado: 'aguardando'|'ligada', gastoIds: [], escopo?, criadoEm}]
     lançamento: g.compraId (+ g.docId, g.veiculoId)
   PONTOS QUE USA
     evento gasto.novo (liga as parcelas que chegam)
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'compras_parceladas', TOL = 0.05, ATE = 3;
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function hoje() { return API._hoje || hojeISO(); }
  function dias(a, b) { return Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000); }
  function lista() { if (!ST) return []; return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function N(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  /* "OFICINA X 01/05", "OFICINA X (1/5)", "OFICINA X PARC 01/05" → "OFICINA X" */
  function base(desc) { return N(String(desc || '').split(' · ')[0].replace(/\s*\(?\s*(?:parc\w*\.?\s*)?\d{1,2}\s*(?:\/|de)\s*\d{1,2}\s*\)?\s*$/i, '')); }
  function parcela(g) { var p = typeof Gasto !== 'undefined' && Gasto.parcela ? Gasto.parcela(g.descRobo || g.desc, g) || Gasto.parcela(g.desc, g) : ''; if (!p) return null; var a = p.split('/'); return { k: +a[0], n: +a[1] }; }
  function fimDe(g) { return String(g.finalCartao || g.final || (g.cartaoId && typeof Banco !== 'undefined' ? (Banco.acharCartao(g.cartaoId) || {}).fim || '' : '')); }
  function lojaParecida(a, b) { return !!(a && b && window.PrintColar && PrintColar.lojaParecida(a, b)); }
  function usadoPorOutra(x, g) { return !!(g.compraId && g.compraId !== x.id); }

  /* a parcela 01/N do banco: o valor da parcela, a data do canhoto até +3 dias; o final e a loja só desempatam */
  function candidatos1(x) {
    return Gasto.todos().filter(function (g) {
      var p = parcela(g); if (!p || p.k !== 1 || p.n !== x.n || usadoPorOutra(x, g)) return false;
      if (Math.abs((Number(g.valor) || 0) - x.vp) > TOL || !g.data || !x.data) return false;
      var d = dias(g.data, x.data); return d >= 0 && d <= (x.ate || ATE);
    });
  }
  function pontos(x, g) { var p = 0; if (x.final && fimDe(g) === String(x.final)) p += 2; if (x.cartaoId && g.cartaoId === x.cartaoId) p += 2; if (lojaParecida(x.loja, g.descRobo || g.desc)) p += 2; if (x.cnpj && g.contraparte && String(g.contraparte.cnpj || '').replace(/\D/g, '') === x.cnpj) p += 2; return p; }
  function achar1(x) {
    var cs = candidatos1(x), longe = (x.ate || ATE) > ATE; if (!cs.length) return null;
    if (cs.length === 1 && !longe) return cs[0];
    cs.sort(function (a, b) { return pontos(x, b) - pontos(x, a); });
    if (longe && pontos(x, cs[0]) < 2) return null;   /* 1.1.0: janela longa (OS sem o pagamento): só com a loja, o CNPJ, o cartão ou o final */
    return cs.length === 1 || pontos(x, cs[0]) > pontos(x, cs[1]) ? cs[0] : null;   /* empate: não liga sozinha */
  }
  /* as irmãs: a mesma compra nos meses seguintes */
  function irmas(x, g1) {
    var b = base(g1.descRobo || g1.desc);
    return Gasto.todos().filter(function (g) {
      if (g.id === g1.id || usadoPorOutra(x, g)) return false;
      var p = parcela(g); if (!p || p.n !== x.n || p.k < 1) return false;
      if (Math.abs((Number(g.valor) || 0) - x.vp) > TOL || (g1.cartaoId && g.cartaoId && g.cartaoId !== g1.cartaoId)) return false;
      if (base(g.descRobo || g.desc) !== b) return false;
      var d = dias(g.data, g1.data); return d >= 0 && d <= (x.n + 1) * 31;
    });
  }
  function enriquecer(x, g) {
    var p = parcela(g) || { k: 1, n: x.n }, d = { compraId: x.id };
    if (x.grupo) d.grupo = x.grupo; if (x.sub) d.sub = x.sub;
    if (x.paraQuem) { d.paraQuem = x.paraQuem; if (x.paraQuemId) d.paraQuemId = x.paraQuemId; }
    if (x.veiculoId) d.veiculoId = x.veiculoId; if (x.docId) d.docId = x.docId;
    if (x.desc) { d.desc = x.desc + ' ' + ('0' + p.k).slice(-2) + '/' + ('0' + p.n).slice(-2); d.descRobo = g.descRobo || g.desc; }
    if (x.grupo || x.desc) { d.editadoPessoa = true; d.revisar = false; }
    Gasto.atualizar(g.id, d);
  }
  function ligar(x) {
    if (!x || typeof Gasto === 'undefined') return 0;
    x.gastoIds = (x.gastoIds || []).filter(function (id) { return Gasto.todos().some(function (g) { return g.id === id; }); });
    var g1 = x.gastoIds.length ? Gasto.todos().find(function (g) { return g.id === x.gastoIds[0]; }) : achar1(x);
    if (!g1) { x.estado = 'aguardando'; return 0; }
    var n = 0, todos = [g1].concat(irmas(x, g1));
    todos.forEach(function (g) { if (x.gastoIds.indexOf(g.id) < 0) x.gastoIds.push(g.id); if (g.compraId !== x.id || (x.docId && g.docId !== x.docId) || (x.veiculoId && g.veiculoId !== x.veiculoId)) { enriquecer(x, g); n++; } });
    x.estado = 'ligada';
    return n;
  }

  var API = {
    _hoje: null, lista: lista, base: base, ligar: ligar,
    criar: function (d) {
      var total = n2(d.total), nn = Math.round(Number(d.n) || 0);
      if (!(total > 0) || !(nn >= 2 && nn <= 48) || !/^\d{4}-\d{2}-\d{2}$/.test(String(d.data || ''))) return null;
      var x = { id: 'cp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), total: total, n: nn, vp: n2(d.vp || total / nn), data: d.data, hora: d.hora || '',
        loja: String(d.loja || '').trim().slice(0, 60), final: String(d.final || '').replace(/\D/g, '').slice(-4), cartaoId: d.cartaoId || '', grupo: d.grupo || '', sub: d.sub || '',
        paraQuem: d.paraQuem || '', paraQuemId: d.paraQuemId || '', veiculoId: d.veiculoId || '', docId: d.docId || '', desc: String(d.desc || '').trim().slice(0, 80),
        estado: 'aguardando', gastoIds: [], criadoEm: hoje() };
      if (/^\d{14}$/.test(String(d.cnpj || ''))) x.cnpj = d.cnpj;
      if (Number(d.ate) > ATE) x.ate = Math.min(45, Math.round(Number(d.ate)));
      if (d.escopo) x.escopo = d.escopo;
      if (d.gastoId) x.gastoIds = [d.gastoId];
      lista().push(x); ligar(x);
      return x;
    },
    ligarTudo: function () { var n = 0; lista().forEach(function (x) { n += ligar(x); }); return n; },
    aguardando: function () { return lista().filter(function (x) { return x.estado !== 'ligada'; }); },
    parcelas: function (x) { return (x.gastoIds || []).map(function (id) { return Gasto.todos().find(function (g) { return g.id === id; }); }).filter(Boolean); },
    achar: function (id) { return lista().find(function (x) { return x.id === id; }) || null; }
  };

  MoneyModulos.registrar({
    id: 'compra-parcelada', versao: '1.1.0', colecoes: [COL],
    ouvir: { 'gasto.novo': function () { if (lista().length && API.ligarTudo() && typeof Store !== 'undefined') Store.salvar(); } }
  });
  window.CompraParcelada = API;
})();
