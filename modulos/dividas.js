/* =====================================================================
   modulos/dividas.js — dívidas, consórcios e a fatura do cartão Porto (3.73)        1.0.0 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 13/Nov/2026)
     · Cadastro de dívidas: consórcio, financiamento ou outra. Cada uma tem saldo, % pago, parcela e, se quiser, o bem
       a que pertence (um item do "Sem liquidez": imóvel, carro…). Cada atualização de saldo fica no histórico.
     · Cartão "Dívidas" no Painel do InvestifyONE e no Painel do BudgetONE: uma barra por dívida (cheia = o que já foi
       pago, tracejada = o que falta), saldo, parcela e "quita em ~mm/aaaa (estimativa)", agrupadas por bem, total no topo.
     · O bem ligado mostra "valor − dívida = parte sua". O patrimônio total (patrimonioHoje, Fluxo, Painel do
       InvestifyONE) DESCONTA as dívidas, com a linha "dívidas: −R$ X" à vista.
     · Cada parcela paga reconhecida baixa o saldo em uma parcela (estimativa) até a próxima atualização: o lançamento ligado à dívida
       (g.dividaId), o lançamento de consórcio/financiamento com valor a ±3% da parcela, ou a linha da fatura Porto.
       Uma por mês. A parcela continua gasto fixo no orçamento, sem fluxo novo nem cor nova.
     · Importar posições de consórcio (CSV): grupo/cota, tipo, situação, % pago, % a pagar, saldo, parcela — com acento
       ou sem, nomes parecidos. Prévia; a mesma grupo+cota atualiza e soma ao histórico; depois dá para editar à mão.
     · Fatura do cartão Porto (XLSX "nacional" ou PDF com texto): lê as compras; "PORTO SEGURO CONSORCIO" vai para a cota
       de parcela mais parecida (±3%); empate ou nenhuma → "A confirmar", com a escolha na prévia. A fatura vira DETALHE do
       pagamento "PORTOSEG" que o robô trouxe do Itaú (sem gasto em dobro) e a diferença aparece.
     · Visão da casa: não vê nada disso (coleções do cofre reservado; o cartão nem aparece).
   API (window.Dividas)
     lista() · estado(d) → {saldo, pctPago, estimado, quitaEm, pagas} · total() · emMes('AAAA-MM') · doBem(id)
     salvar(dados, id) → d · num(t) · lerCsv(tabela) → [linha] · aplicarCsv(linhas)
     lerPortoTabela(tabela, nome) · lerPortoTexto(texto, nome) → fatura · consorcios(f) · pagamentoDe(f) · aplicarFatura(f)
   DADOS (no money_docs, cofre RESERVADO: Escopo.de devolve 'reservado' para coleção que não é da casa)
     Store.estado.dividas = [{id, nome, tipo: 'consorcio'|'financiamento'|'outro', instituicao, grupo, cota, contrato, bemRef,
       pctPago, saldo, parcela, diaVenc, formaPgto, contemplada, atualizadoEm, historico: [{data, saldo, pctPago, fonte}],
       pagas: [{mes, data, valor, fonte: 'fatura', fatura}]}]
     Store.estado.faturas_cartao = [{id, cartao: 'porto', venc, final, total, totalArquivo, itens: [{data, desc, valor}],
       pagIds: [id], pago, dif, em}]
     no lançamento: g.faturaId (o pagamento detalhado) · g.dividaId (parcela ligada à mão)
   PONTOS QUE USA
     investify.painel · budget.painel · iliquido.valor (a nota "parte sua") · lancamento.linha (selo 🧾)
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'dividas', FCOL = 'faturas_cartao';
  var TIPOS = { consorcio: ['Consórcio', 'Consortium'], financiamento: ['Financiamento', 'Financing'], outro: ['Outra dívida', 'Other debt'] };
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function faturas() { return (ST[FCOL] = Array.isArray(ST[FCOL]) ? ST[FCOL] : []); }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function hoje() { return API._hoje || hojeISO(); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9%]+/g, ' ').trim(); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function num(v) {
    if (typeof v === 'number') return v;
    var s = String(v == null ? '' : v).replace(/R\$|%|\s/gi, ''), neg = /^-|-$|^\(.*\)$/.test(s);
    s = s.replace(/[()\-]/g, '');
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
    var n = parseFloat(s); return isNaN(n) ? null : (neg ? -n : n);
  }
  function mesMais(iso, n) { var a = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7)) - 1 + n; a += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return a + '-' + ('0' + (m + 1)).slice(-2); }
  function mmaaaa(mes) { return mes.slice(5, 7) + '/' + mes.slice(0, 4); }
  function novoId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function bens() { return (ST.patrimonio_iliquido || []).filter(function (x) { return x.tipo !== 'fgts'; }); }
  function bemDe(id) { return id ? bens().filter(function (b) { return b.id === id; })[0] || null : null; }
  function grupoCota(d) { return [d.grupo, d.cota].filter(Boolean).join('/'); }

  /* ---------- o saldo de hoje: a última atualização menos as parcelas reconhecidas depois dela ---------- */
  function base(d) {
    var h = (d.historico || []).slice().sort(function (a, b) { return a.data < b.data ? -1 : 1; });
    return h.length ? h[h.length - 1] : { data: d.atualizadoEm || '', saldo: Number(d.saldo) || 0, pctPago: Number(d.pctPago) || 0 };
  }
  function ehParcela(d, g) {
    if (!g || g.fluxo === 'entrada') return false;
    if (g.dividaId) return g.dividaId === d.id;
    var p = Number(d.parcela) || 0, v = Number(g.valor) || 0, x = N(g.desc);
    if (!(p > 0) || Math.abs(v - p) > p * 0.03) return false;
    if (d.tipo === 'consorcio') return /consorc/.test(x);
    if (d.tipo === 'financiamento') return /financ/.test(x) || (!!d.instituicao && x.indexOf(N(d.instituicao)) >= 0);
    return false;
  }
  function pagasDepois(d) {
    var b = base(d), desde = String(b.data || '').slice(0, 7), por = {};
    (d.pagas || []).forEach(function (p) { if (p.mes > desde) por[p.mes] = por[p.mes] || { mes: p.mes, valor: Number(p.valor) || 0, fonte: 'fatura' }; });
    (ST.gastos || []).forEach(function (g) {
      var m = String(g.data || '').slice(0, 7);
      if (m > desde && m <= hoje().slice(0, 7) && !por[m] && ehParcela(d, g)) por[m] = { mes: m, valor: Number(g.valor) || 0, fonte: 'lancamento' };
    });
    return Object.keys(por).sort().map(function (k) { return por[k]; });
  }

  var API = {
    _hoje: null,
    TIPOS: TIPOS,
    num: num,
    lista: lista,
    faturas: faturas,
    estado: function (d) {
      var b = base(d), pagas = pagasDepois(d), pago = pagas.reduce(function (s, p) { return s + (Number(d.parcela) || p.valor); }, 0);   /* uma parcela a menos por mês pago */
      var s0 = Number(b.saldo) || 0, pct0 = Math.min(100, Math.max(0, Number(b.pctPago) || 0));
      var saldo = n2(Math.max(0, s0 - pago)), total = pct0 < 100 ? s0 / (1 - pct0 / 100) : s0;
      var pct = total > 0 ? Math.min(100, (1 - saldo / total) * 100) : pct0, parc = Number(d.parcela) || 0;
      return { saldo: saldo, pctPago: Math.round(pct * 10) / 10, estimado: pagas.length > 0, pagas: pagas, desde: b.data,
        quitaEm: parc > 0 && saldo > 0 ? mesMais(hoje(), Math.ceil(saldo / parc)) : null };
    },
    total: function () { return casa() ? 0 : n2(lista().reduce(function (s, d) { return s + API.estado(d).saldo; }, 0)); },
    /* a dívida no fim de um mês passado (para o patrimônio mês a mês): a última atualização até lá; antes da primeira, a primeira */
    emMes: function (mes) {
      if (casa()) return 0;
      return n2(lista().reduce(function (s, d) {
        var h = (d.historico || []).slice().sort(function (a, b) { return a.data < b.data ? -1 : 1; });
        if (!h.length) return s + (Number(d.saldo) || 0);
        var x = h.filter(function (e) { return String(e.data).slice(0, 7) <= mes; }).pop() || h[0];
        return s + (Number(x.saldo) || 0);
      }, 0));
    },
    doBem: function (id) { return lista().filter(function (d) { return d.bemRef === id; }); },
    arruma: function (x) {
      var o = { nome: String(x.nome || '').trim().slice(0, 80), tipo: TIPOS[x.tipo] ? x.tipo : 'outro', instituicao: String(x.instituicao || '').trim().slice(0, 80),
        grupo: String(x.grupo || '').trim().slice(0, 20), cota: String(x.cota || '').trim().slice(0, 20), contrato: String(x.contrato || '').trim().slice(0, 40),
        bemRef: x.bemRef || '', pctPago: Math.min(100, Math.max(0, num(x.pctPago) || 0)), saldo: n2(Math.abs(num(x.saldo) || 0)),
        parcela: n2(Math.abs(num(x.parcela) || 0)), diaVenc: Math.min(31, Math.max(0, parseInt(x.diaVenc, 10) || 0)) || '',
        formaPgto: String(x.formaPgto || '').trim().slice(0, 40), contemplada: !!x.contemplada,
        atualizadoEm: /^\d{4}-\d{2}-\d{2}$/.test(String(x.atualizadoEm || '')) ? x.atualizadoEm : hoje() };
      if (!o.nome) o.nome = o.tipo === 'consorcio' && grupoCota(o) ? tr('Consórcio ', 'Consortium ') + grupoCota(o) : '';
      if (!o.nome) throw new Error(tr('falta o nome', 'missing name'));
      return o;
    },
    /* guarda; saldo ou % pago diferente da última vez → entra no histórico */
    salvar: function (dados, id, fonte) {
      var o = API.arruma(dados), d = id ? lista().filter(function (x) { return x.id === id; })[0] : null;
      if (!d) { d = { id: novoId('dv'), historico: [], pagas: [] }; lista().push(d); }
      var b = (d.historico || []).length ? base(d) : null;
      Object.assign(d, o); d.historico = d.historico || [];
      if (!b || b.saldo !== o.saldo || b.pctPago !== o.pctPago || b.data !== o.atualizadoEm) {
        d.historico = d.historico.filter(function (h) { return h.data !== o.atualizadoEm; });
        d.historico.push({ data: o.atualizadoEm, saldo: o.saldo, pctPago: o.pctPago, fonte: fonte || 'manual' });
      }
      return d;
    },

    /* ---------- CSV de posições de consórcio ---------- */
    lerCsv: function (tab) {
      var t = (tab || []).filter(function (l) { return l && l.some(function (c) { return String(c || '').trim(); }); });
      if (t.length < 2) return [];
      var cab = t[0].map(N), col = function (rx) { for (var i = 0; i < cab.length; i++) if (rx.test(cab[i])) return i; return -1; };
      var c = { gc: col(/^grupo ?(e )?cota$|^grupo cota$/), g: col(/^grupo$/), q: col(/^cota$/), tipo: col(/^tipo|^bem|^produto/), sit: col(/situac|status/),
        pp: col(/(pct|%|perc).*pag|^pago|amortiz/), pf: col(/(pct|%|perc).*(falta|a pagar|restant|pagar)/), saldo: col(/saldo|devedor/), parc: col(/parcela|prestac/) };
      if (c.pp >= 0 && c.pp === c.pf) c.pp = -1;
      if (c.gc < 0 && c.g < 0) return [];
      return t.slice(1).map(function (l) {
        var v = function (i) { return i >= 0 ? String(l[i] == null ? '' : l[i]).trim() : ''; };
        var g = v(c.g), q = v(c.q);
        if (c.gc >= 0) { var p = v(c.gc).split(/\s*[\/\-]\s*/); g = p[0] || ''; q = p[1] || ''; }
        if (!g) return null;
        var pp = num(v(c.pp)), pf = num(v(c.pf)), sit = v(c.sit);
        if (pp == null && pf != null) pp = 100 - pf;
        var x = { grupo: g, cota: q, tipo: 'consorcio', bem: v(c.tipo), situacao: sit, pctPago: pp == null ? 0 : n2(pp), saldo: n2(num(v(c.saldo)) || 0),
          parcela: n2(num(v(c.parc)) || 0), contemplada: /contempl/.test(N(sit)) && !/nao contempl/.test(N(sit)) };
        x.existente = lista().filter(function (d) { return d.grupo === g && String(d.cota) === String(q); })[0] || null;
        x.marcada = true;
        return x;
      }).filter(Boolean);
    },
    aplicarCsv: function (linhas, data) {
      var n = 0;
      (linhas || []).filter(function (x) { return x.marcada; }).forEach(function (x) {
        var d = x.existente;
        var dados = Object.assign({}, d || { nome: tr('Consórcio ', 'Consortium ') + (x.bem ? x.bem + ' ' : '') + x.grupo + '/' + x.cota, tipo: 'consorcio', instituicao: 'Porto Seguro Consórcio' },
          { grupo: x.grupo, cota: x.cota, pctPago: x.pctPago, saldo: x.saldo, parcela: x.parcela || (d && d.parcela) || 0, contemplada: x.contemplada, atualizadoEm: data || hoje() });
        API.salvar(dados, d && d.id, 'csv'); n++;
      });
      return n;
    },

    /* ---------- a fatura do cartão Porto ---------- */
    vencDoNome: function (nome) { var m = String(nome || '').match(/(\d{4})-(\d{2})-(\d{2})/); return m ? m[1] + '-' + m[2] + '-' + m[3] : ''; },
    dataItem: function (t, venc) {
      var s = String(t || '').trim();
      if (/^\d{5}(\.\d+)?$/.test(s)) return new Date(Math.round((Number(s) - 25569) * 864e5)).toISOString().slice(0, 10);   /* data do Excel */
      var m = s.match(/^(\d{2})\/(\d{2})(?:\/(\d{2,4}))?$/); if (!m) return '';
      var a = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : '';
      if (!a) { var va = Number((venc || hoje()).slice(0, 4)), vm = Number((venc || hoje()).slice(5, 7)); a = String(Number(m[2]) > vm ? va - 1 : va); }
      return a + '-' + m[2] + '-' + m[1];
    },
    fechar: function (f) {
      f.itens = f.itens.filter(function (i) { return i.data && i.desc; });
      f.total = n2(f.itens.filter(function (i) { return !i.pagamento; }).reduce(function (s, i) { return s + i.valor; }, 0));
      f.id = 'porto-' + (f.venc || hoje()); f.cartao = 'porto';
      return f;
    },
    /* XLSX, aba "nacional": linha 1 cabeçalhos ['', '', 'Crédito', 'Débito', 'Total', 'Cartão']; linha 2 titular e final;
       depois [DD/MM, descrição, crédito, débito]; PAGAMENTO é crédito; a última é TOTAL */
    lerPortoTabela: function (tab, nome, venc) {
      var f = { venc: venc || API.vencDoNome(nome), final: '', itens: [], totalArquivo: null };
      (tab || []).forEach(function (l, i) {
        l = l || []; var a = String(l[0] || '').trim(), desc = String(l[1] || '').trim();
        if (i < 3 && !f.final) { var fm = l.map(String).join(' ').match(/(\d{4})\s*$/); if (fm && !/^\d{2}\/\d{2}/.test(a)) f.final = fm[1]; }
        if (/^total$/i.test(a) || /^total$/i.test(desc)) { var tt = num(l[4]); f.totalArquivo = tt != null ? n2(tt) : n2((num(l[3]) || 0) - (num(l[2]) || 0)); return; }
        var data = API.dataItem(a, f.venc); if (!data || !desc) return;
        var cr = Math.abs(num(l[2]) || 0), db = Math.abs(num(l[3]) || 0);
        f.itens.push({ data: data, desc: desc, valor: n2(db - cr), pagamento: /pagamento/i.test(desc) });
      });
      return API.fechar(f);
    },
    /* PDF com texto: linhas "DD/MM DESCRIÇÃO 1.234,56" (crédito com sinal de menos) */
    lerPortoTexto: function (texto, nome, venc) {
      var t = String(texto || ''), vm = t.match(/vencimento[^0-9]{0,20}(\d{2})\/(\d{2})\/(\d{4})/i);
      var f = { venc: venc || API.vencDoNome(nome) || (vm ? vm[3] + '-' + vm[2] + '-' + vm[1] : ''), final: '', itens: [], totalArquivo: null };
      var fm = t.match(/final\s*(\d{4})/i); if (fm) f.final = fm[1];
      var tm = t.match(/total (?:desta |da )?fatura[^0-9\-]{0,20}(-?[\d.]+,\d{2})/i); if (tm) f.totalArquivo = n2(num(tm[1]));
      t.split(/\r?\n/).forEach(function (l) {
        var m = l.trim().match(/^(\d{2}\/\d{2})\s+(.+?)\s+(-\s?)?(?:R\$\s?)?([\d.]+,\d{2})\s*(-)?$/); if (!m) return;
        var v = num(m[4]), cred = !!(m[3] || m[5]) || /pagamento/i.test(m[2]);
        f.itens.push({ data: API.dataItem(m[1], f.venc), desc: m[2].trim(), valor: n2(cred ? -v : v), pagamento: /pagamento/i.test(m[2]) });
      });
      return API.fechar(f);
    },
    /* as linhas de consórcio e a cota de cada uma: a de parcela mais parecida (±3%); empate ou nenhuma → a confirmar */
    consorcios: function (f) {
      var cs = lista().filter(function (d) { return d.tipo === 'consorcio'; });
      return (f.itens || []).map(function (it, i) {
        if (!/porto ?seguro ?consorc/.test(N(it.desc)) || it.valor <= 0) return null;
        var perto = cs.filter(function (d) { var p = Number(d.parcela) || 0; return p > 0 && Math.abs(it.valor - p) <= p * 0.03; });
        var melhor = perto.slice().sort(function (a, b) { return Math.abs(it.valor - a.parcela) - Math.abs(it.valor - b.parcela); });
        var empate = melhor.length > 1 && Math.abs(Math.abs(it.valor - melhor[0].parcela) - Math.abs(it.valor - melhor[1].parcela)) < 0.01;
        var ok = melhor.length && !empate;
        return { i: i, item: it, opcoes: cs, escolhida: ok ? melhor[0].id : (it.dividaId || ''), aConfirmar: !ok };
      }).filter(Boolean);
    },
    /* o pagamento da fatura que o robô trouxe do Itaú ("PORTOSEG SA CR"), mesmo dividido em vários lançamentos */
    pagamentoDe: function (f) {
      var v = f.venc || hoje(), ms = 864e5, dv = new Date(v + 'T12:00:00').getTime();
      var gs = (ST.gastos || []).filter(function (g) {
        if (g.fluxo === 'entrada' || !/portoseg|porto seg/.test(N(g.desc)) || /consorc/.test(N(g.desc))) return false;
        return Math.abs(new Date(String(g.data) + 'T12:00:00').getTime() - dv) <= 10 * ms;
      });
      var pago = n2(gs.reduce(function (s, g) { return s + (Number(g.valor) || 0); }, 0));
      return { gastos: gs, pago: pago, dif: gs.length ? n2(f.total - pago) : null };
    },
    /* guarda a fatura como detalhe do pagamento (nenhum gasto novo) e baixa as parcelas de consórcio */
    aplicarFatura: function (f, escolhas) {
      var p = API.pagamentoDe(f), id = f.id;
      ST[FCOL] = faturas().filter(function (x) { return x.id !== id; });
      faturas().push({ id: id, cartao: 'porto', venc: f.venc, final: f.final, total: f.total, totalArquivo: f.totalArquivo,
        itens: f.itens.map(function (i) { return { data: i.data, desc: i.desc, valor: i.valor }; }), pagIds: p.gastos.map(function (g) { return g.id; }),
        pago: p.pago, dif: p.dif, em: hoje() });
      p.gastos.forEach(function (g) { g.faturaId = id; });
      var n = 0;
      (escolhas || []).forEach(function (c) {
        var d = c.escolhida && lista().filter(function (x) { return x.id === c.escolhida; })[0]; if (!d) return;
        var mes = c.item.data.slice(0, 7);
        d.pagas = (d.pagas || []).filter(function (x) { return !(x.fatura === id && x.mes === mes); });
        d.pagas.push({ mes: mes, data: c.item.data, valor: c.item.valor, fonte: 'fatura', fatura: id }); n++;
      });
      return { ligados: p.gastos.length, consorcios: n, dif: p.dif };
    }
  };

  /* ---------- a tela ---------- */
  var editando = null, csv = null, fat = null, verFatura = false;
  function campoTxt(rot, id, v, extra) { return campo(rot, '<input id="' + id + '" value="' + esc(v == null ? '' : v) + '"' + (extra || '') + '>'); }
  function form(d) {
    d = d || { tipo: 'consorcio', atualizadoEm: hoje() };
    var bs = bens();
    return '<div class="card dv-form" id="dvForm"><div class="card-head"><h3>' + (d.id ? tr('Editar dívida', 'Edit debt') : tr('Nova dívida', 'New debt')) + '</h3></div>' +
      '<input type="hidden" id="dvId" value="' + esc(d.id || '') + '">' +
      '<div class="grid g2">' + campoTxt(tr('Nome', 'Name'), 'dvNome', d.nome, ' placeholder="' + esc(tr('Consórcio do carro', 'Car consortium')) + '"') +
        campo(tr('Tipo', 'Type'), '<select id="dvTipo">' + Object.keys(TIPOS).map(function (k) { return '<option value="' + k + '"' + (d.tipo === k ? ' selected' : '') + '>' + esc(TIPOS[k][pt() ? 0 : 1]) + '</option>'; }).join('') + '</select>') +
        campoTxt(tr('Instituição', 'Institution'), 'dvInst', d.instituicao) + campoTxt(tr('Contrato', 'Contract'), 'dvContrato', d.contrato) +
        campoTxt(tr('Grupo', 'Group'), 'dvGrupo', d.grupo) + campoTxt(tr('Cota', 'Quota'), 'dvCota', d.cota) +
        campoTxt(tr('Saldo devedor (R$)', 'Balance owed (R$)'), 'dvSaldo', d.saldo ? String(d.saldo).replace('.', ',') : '', ' inputmode="decimal"') +
        campoTxt(tr('% já pago', '% paid'), 'dvPct', d.pctPago ? String(d.pctPago).replace('.', ',') : '', ' inputmode="decimal"') +
        campoTxt(tr('Parcela (R$)', 'Instalment (R$)'), 'dvParcela', d.parcela ? String(d.parcela).replace('.', ',') : '', ' inputmode="decimal"') +
        campoTxt(tr('Dia do vencimento', 'Due day'), 'dvDia', d.diaVenc, ' inputmode="numeric"') +
        campoTxt(tr('Como paga', 'How it is paid'), 'dvForma', d.formaPgto, ' placeholder="' + esc(tr('cartão Porto, débito…', 'Porto card, debit…')) + '"') +
        campo(tr('De qual bem', 'Which asset'), '<select id="dvBem"><option value="">' + esc(tr('— nenhum —', '— none —')) + '</option>' +
          bs.map(function (b) { return '<option value="' + esc(b.id) + '"' + (d.bemRef === b.id ? ' selected' : '') + '>' + esc(b.nome) + '</option>'; }).join('') + '</select>') +
        campo(tr('Saldo em', 'Balance on'), Cal.campo('dvData', d.atualizadoEm || hoje(), {})) +
        campo(tr('Contemplada', 'Awarded'), '<label class="row" style="gap:6px"><input type="checkbox" id="dvContemplada"' + (d.contemplada ? ' checked' : '') + '> ' + esc(tr('já contemplada', 'already awarded')) + '</label>') + '</div>' +
      '<div class="f-actions">' + (d.id ? '<button class="btn danger" data-acao="dv-excluir" data-id="' + esc(d.id) + '">' + esc(t('ac.excluir')) + '</button>' : '') +
      '<button class="btn" data-acao="dv-fechar">' + esc(t('ac.cancelar')) + '</button>' +
      '<button class="btn primary" data-acao="dv-salvar">' + esc(t('ac.salvar')) + '</button></div></div>';
  }
  function linha(d) {
    var e = API.estado(d), pc = Math.max(0, Math.min(100, e.pctPago));
    var sub = [TIPOS[d.tipo][pt() ? 0 : 1], d.instituicao, grupoCota(d) ? tr('grupo/cota ', 'group/quota ') + grupoCota(d) : '', d.contemplada ? tr('contemplada', 'awarded') : ''].filter(Boolean).join(' · ');
    return '<div class="dv-linha linha-click" data-acao="dv-editar" data-id="' + esc(d.id) + '">' +
      '<div class="dv-topo"><span class="t-main">' + esc(d.nome) + '</span><span class="num dv-saldo">−' + fmt(e.saldo) + '</span></div>' +
      '<div class="dv-barra" role="img" aria-label="' + esc(tr(pc + '% pago', pc + '% paid')) + '"><span class="dv-pago" style="width:' + pc + '%"></span></div>' +
      '<div class="t-sub">' + esc(sub) + '</div>' +
      '<div class="t-sub">' + esc(pc.toString().replace('.', ',') + tr('% pago', '% paid') + (d.parcela ? ' · ' + tr('parcela ', 'instalment ') + fmt(d.parcela) : '') +
        (e.quitaEm ? ' · ' + tr('quita em ~', 'paid off ~') + mmaaaa(e.quitaEm) + tr(' (estimativa)', ' (estimate)') : '') +
        (e.estimado ? ' · ' + tr('saldo estimado: ', 'estimated balance: ') + e.pagas.length + tr(' parcela(s) paga(s) desde ', ' instalment(s) paid since ') + I18n.data(e.desde) : '')) + '</div></div>';
  }
  function prevCsv() {
    if (!csv) return '';
    if (!csv.linhas.length) return '<div class="aviso-box">' + esc(tr('Não achei as colunas de consórcio neste arquivo (grupo e cota, % pago, saldo, parcela).', 'I could not find consortium columns in this file (group and quota, % paid, balance, instalment).')) +
      ' <button class="btn sm" data-acao="dv-csv-fora">' + esc(t('ac.cancelar')) + '</button></div>';
    return '<div class="card dv-prev" id="dvCsv"><div class="card-head"><h3>' + esc(tr('Conferir as cotas', 'Check the quotas')) + '</h3></div><table class="tbl"><tbody>' +
      csv.linhas.map(function (x, i) {
        return '<tr><td><label class="row" style="gap:6px"><input type="checkbox" data-dvcsv="' + i + '"' + (x.marcada ? ' checked' : '') + '> <span class="t-main">' + esc(x.grupo + '/' + x.cota) + '</span></label>' +
          '<div class="t-sub">' + esc([x.bem, x.situacao, x.existente ? tr('atualiza a cota que já existe', 'updates the existing quota') : tr('nova', 'new')].filter(Boolean).join(' · ')) + '</div></td>' +
          '<td class="num">' + fmt(x.saldo) + '<div class="t-sub">' + esc(String(x.pctPago).replace('.', ',') + tr('% pago', '% paid') + (x.parcela ? ' · ' + fmt(x.parcela) : '')) + '</div></td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="f-actions"><button class="btn" data-acao="dv-csv-fora">' + esc(t('ac.cancelar')) + '</button><button class="btn primary" data-acao="dv-csv-ok">' + esc(tr('Importar as marcadas', 'Import the checked ones')) + '</button></div></div>';
  }
  function prevFatura() {
    if (!fat) return '';
    var f = fat.f, p = API.pagamentoDe(f);
    if (!f.itens.length) return '<div class="aviso-box">' + esc(tr('Não achei as compras nesta fatura. Ela é do cartão Porto (planilha .xlsx ou PDF com texto)?', 'I could not find the purchases in this bill. Is it a Porto card bill (.xlsx or PDF with text)?')) +
      ' <button class="btn sm" data-acao="dv-fat-fora">' + esc(t('ac.cancelar')) + '</button></div>';
    var h = '<div class="card dv-prev" id="dvFat"><div class="card-head"><h3>🧾 ' + esc(tr('Fatura do cartão Porto', 'Porto card bill')) + '</h3></div>' +
      '<div class="grid g2">' + campo(tr('Vencimento', 'Due date'), Cal.campo('dvFatVenc', f.venc || hoje(), {})) +
      '<p class="small" style="margin:0">' + esc(f.itens.length + tr(' linhas · total ', ' lines · total ') + fmt(f.total)) +
        (f.totalArquivo != null && Math.abs(f.totalArquivo - f.total) >= 0.01 ? '<br><span class="tiny">' + esc(tr('o arquivo diz ', 'the file says ') + fmt(f.totalArquivo)) + '</span>' : '') + '</p></div>' +
      '<p class="small">' + (p.gastos.length
        ? esc(tr('Vira detalhe do pagamento que o robô trouxe ', 'Becomes the detail of the payment the robot brought ') + '(' + p.gastos.map(function (g) { return g.desc + ' ' + I18n.data(g.data); }).join(', ') + '): ' + fmt(p.pago) + '. ') +
          (Math.abs(p.dif) >= 0.01 ? '<b class="dv-dif">' + esc(tr('Diferença: ', 'Difference: ') + (p.dif > 0 ? '+' : '−') + fmt(Math.abs(p.dif))) + '</b>' : esc(tr('Bate certinho.', 'It matches.')))
        : esc(tr('Não achei o pagamento "PORTOSEG" perto do vencimento: a fatura fica guardada e liga quando ele chegar.', 'No "PORTOSEG" payment near the due date: the bill is kept and links when it arrives.'))) +
      ' ' + esc(tr('Nenhum gasto novo é criado.', 'No new spending is created.')) + '</p>';
    if (fat.cs.length) h += '<p class="small"><b>' + esc(tr('Parcelas de consórcio', 'Consortium instalments')) + '</b></p><table class="tbl"><tbody>' + fat.cs.map(function (c, k) {
      return '<tr><td><span class="t-main">' + esc(c.item.desc) + '</span><div class="t-sub">' + esc(I18n.data(c.item.data)) + (c.aConfirmar && !c.escolhida ? ' · <b>⚠ ' + esc(tr('A confirmar', 'To confirm')) + '</b>' : '') + '</div></td>' +
        '<td class="num">' + fmt(c.item.valor) + '<div><select data-dvcota="' + k + '"><option value="">' + esc(tr('— qual cota? —', '— which quota? —')) + '</option>' +
        c.opcoes.map(function (d) { return '<option value="' + esc(d.id) + '"' + (c.escolhida === d.id ? ' selected' : '') + '>' + esc(d.nome + (d.parcela ? ' · ' + fmt(d.parcela) : '')) + '</option>'; }).join('') + '</select></div></td></tr>';
    }).join('') + '</tbody></table>';
    return h + '<div class="f-actions"><button class="btn" data-acao="dv-fat-fora">' + esc(t('ac.cancelar')) + '</button><button class="btn primary" data-acao="dv-fat-ok">' + esc(tr('Guardar o detalhe', 'Save the detail')) + '</button></div></div>';
  }
  function ultimaFatura() {
    var f = faturas().slice().sort(function (a, b) { return a.venc < b.venc ? 1 : -1; })[0]; if (!f) return '';
    var h = '<p class="tiny muted dv-ultima"><button class="btn sm" data-acao="dv-fat-ver">🧾 ' + esc(tr('Fatura Porto ', 'Porto bill ') + I18n.data(f.venc) + ' · ' + fmt(f.total) + ' · ' + f.itens.length + tr(' linhas', ' lines') +
      (f.dif != null && Math.abs(f.dif) >= 0.01 ? tr(' · diferença ', ' · difference ') + (f.dif > 0 ? '+' : '−') + fmt(Math.abs(f.dif)) : '')) + '</button></p>';
    if (verFatura) h += '<table class="tbl dv-itens"><tbody>' + f.itens.map(function (i) { return '<tr><td>' + esc(I18n.data(i.data)) + '</td><td>' + esc(i.desc) + '</td><td class="num">' + fmt(i.valor) + '</td></tr>'; }).join('') + '</tbody></table>';
    return h;
  }
  function botoes() {
    return '<div class="row dv-acoes" style="gap:8px;flex-wrap:wrap"><button class="btn sm" data-acao="dv-novo">+ ' + esc(tr('Dívida', 'Debt')) + '</button>' +
      '<label class="btn sm" for="dvCsvArq">📄 ' + esc(tr('Posições do consórcio (CSV)', 'Consortium positions (CSV)')) + '</label>' +
      '<label class="btn sm" for="dvFatArq">🧾 ' + esc(tr('Fatura do cartão Porto', 'Porto card bill')) + '</label>' +
      '<input type="file" id="dvCsvArq" accept=".csv,.tsv,.txt,.xlsx" hidden><input type="file" id="dvFatArq" accept=".xlsx,.pdf" hidden></div>';
  }
  function cartao() {
    if (casa()) return '';
    var l = lista();
    if (!l.length && editando === null && !csv && !fat)
      return '<div class="card dv-card dv-vazio"><div class="card-head"><h3>💳 ' + esc(tr('Dívidas e consórcios', 'Debts and consortiums')) + '</h3></div>' + botoes() + ultimaFatura() + '</div>';
    var tot = API.total(), grupos = {}, ordem = [];
    l.forEach(function (d) { var k = bemDe(d.bemRef) ? d.bemRef : ''; if (!grupos[k]) { grupos[k] = []; ordem.push(k); } grupos[k].push(d); });
    ordem.sort(function (a, b) { return a ? (b ? 0 : -1) : 1; });
    var h = '<div class="card dv-card"><div class="card-head"><h3>💳 ' + esc(tr('Dívidas', 'Debts')) + ' <span class="small muted dv-total">−' + fmt(tot) + '</span></h3>' +
      '<button class="info-dot" data-info="dividas">i</button></div>' +
      '<p class="small dv-explica">' + esc(tr('Descontadas do patrimônio total. A barra cheia é o que já foi pago; a tracejada, o que falta.', 'Subtracted from total net worth. The solid bar is what is paid; the dashed one, what is left.')) + '</p>';
    ordem.forEach(function (k) {
      var b = bemDe(k);
      if (b) {
        var dv = grupos[k].reduce(function (s, d) { return s + API.estado(d).saldo; }, 0), v = Number(b.valor) || 0;
        h += '<div class="dv-bem"><b>' + esc(b.nome) + '</b> <span class="small">' + esc(fmt(v) + ' − ' + fmt(dv) + ' = ') + '<b>' + esc(fmt(v - dv)) + '</b> ' + esc(tr('parte sua', 'your share')) + '</span></div>';
      } else if (ordem.length > 1) h += '<div class="dv-bem"><b>' + esc(tr('Sem bem ligado', 'No linked asset')) + '</b></div>';
      h += grupos[k].map(linha).join('');
    });
    h += botoes() + ultimaFatura() + prevCsv() + prevFatura();
    if (editando !== null) h += form(editando ? l.filter(function (x) { return x.id === editando; })[0] : null);
    return h + '</div>';
  }

  /* ---------- ler os arquivos (no Fundo: pílula, tela acesa, aviso antes de fechar) ---------- */
  async function lerArquivo(inp, qual) {
    var a = inp.files && inp.files[0]; inp.value = ''; if (!a) return;
    var id = 'dividas-' + qual, temFundo = typeof Fundo !== 'undefined';
    if (temFundo) Fundo.comecar({ id: id, titulo: qual === 'csv' ? tr('Lendo as cotas…', 'Reading the quotas…') : tr('Lendo a fatura…', 'Reading the bill…'),
      aoAbrir: function () { if (typeof abrirApp === 'function') abrirApp('budget'); if (typeof irPara === 'function') irPara('b-painel'); } });
    try {
      if (temFundo) Fundo.passo(id, tr('Lendo ', 'Reading ') + a.name + '…', 0.2);
      var r = await Arquivos.ler(a);
      if (r.erro) throw new Error(r.erro);
      if (qual === 'csv') csv = { linhas: API.lerCsv(r.tabela) };
      else {
        var f = r.tipo === 'xlsx' ? API.lerPortoTabela(r.tabela, a.name) : API.lerPortoTexto(r.texto, a.name);
        fat = { f: f, cs: API.consorcios(f) };
      }
      if (temFundo) Fundo.terminar(id, qual === 'csv' ? tr('Cotas lidas', 'Quotas read') : tr('Fatura lida', 'Bill read'));
      if (temFundo) Fundo.limpar(id);
      if (typeof render === 'function') render();
      setTimeout(function () { var e = document.getElementById(qual === 'csv' ? 'dvCsv' : 'dvFat'); if (e) e.scrollIntoView({ block: 'center' }); }, 60);
    } catch (e) {
      if (temFundo) Fundo.limpar(id);
      toast(tr('Não consegui ler ', 'Could not read ') + a.name + ': ' + (e.message || e), 'warn');
    }
  }
  document.addEventListener('change', function (e) {
    var t0 = e.target; if (!t0) return;
    if (t0.id === 'dvCsvArq') lerArquivo(t0, 'csv');
    else if (t0.id === 'dvFatArq') lerArquivo(t0, 'fatura');
    else if (t0.dataset && t0.dataset.dvcsv != null && csv) csv.linhas[Number(t0.dataset.dvcsv)].marcada = t0.checked;
    else if (t0.dataset && t0.dataset.dvcota != null && fat) { var c = fat.cs[Number(t0.dataset.dvcota)]; c.escolhida = t0.value; }
    else if (t0.id === 'dvFatVenc' && fat) {
      var f = fat.f; f.venc = t0.value; f.itens.forEach(function (i) { i.data = API.dataItem(i.data.slice(8, 10) + '/' + i.data.slice(5, 7), f.venc); });
      API.fechar(f); if (typeof render === 'function') render();
    }
  });

  MoneyModulos.registrar({
    id: 'dividas',
    versao: '1.0.0',
    colecoes: [COL, FCOL],
    pontos: {
      'investify.painel': function () { return cartao(); },
      'budget.painel': function () { return cartao(); },
      'iliquido.valor': function (ctx) {
        var x = ctx.item; if (!x || casa() || x.tipo === 'fgts') return [];
        var ds = API.doBem(x.id); if (!ds.length) return [];
        var dv = ds.reduce(function (s, d) { return s + API.estado(d).saldo; }, 0), v = Number(x.valor) || 0;
        return [{ valor: v, nota: fmt(v) + ' − ' + fmt(dv) + tr(' de dívida = ', ' of debt = ') + fmt(v - dv) + tr(' parte sua', ' your share') }];
      },
      'lancamento.linha': function (ctx) {
        var g = ctx.g; if (!g || !g.faturaId || casa()) return '';
        var f = faturas().filter(function (x) { return x.id === g.faturaId; })[0]; if (!f) return '';
        return ' <span class="tag dv-tag" title="' + esc(f.itens.length + tr(' linhas na fatura', ' lines on the bill')) + '">🧾 ' + esc(tr('fatura detalhada', 'itemised bill')) + '</span>';
      }
    },
    acoes: {
      'dv-novo': function () { editando = ''; render(); setTimeout(function () { var f = document.getElementById('dvForm'); if (f) f.scrollIntoView({ block: 'center' }); }, 60); },
      'dv-editar': function (el) { editando = el.dataset.id; render(); setTimeout(function () { var f = document.getElementById('dvForm'); if (f) f.scrollIntoView({ block: 'center' }); }, 60); },
      'dv-fechar': function () { editando = null; render(); },
      'dv-salvar': function () {
        var v = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
        try {
          API.salvar({ nome: v('dvNome'), tipo: v('dvTipo'), instituicao: v('dvInst'), contrato: v('dvContrato'), grupo: v('dvGrupo'), cota: v('dvCota'),
            saldo: v('dvSaldo'), pctPago: v('dvPct'), parcela: v('dvParcela'), diaVenc: v('dvDia'), formaPgto: v('dvForma'), bemRef: v('dvBem'),
            atualizadoEm: v('dvData'), contemplada: !!(document.getElementById('dvContemplada') || {}).checked }, v('dvId'));
        } catch (e) { toast(e.message, 'err'); return; }
        editando = null; Store.salvar(); render(); toast(tr('Guardado.', 'Saved.'));
      },
      'dv-excluir': function (el) { ST[COL] = lista().filter(function (x) { return x.id !== el.dataset.id; }); editando = null; Store.salvar(); render(); },
      'dv-csv-fora': function () { csv = null; render(); },
      'dv-csv-ok': function () { var n = API.aplicarCsv(csv.linhas); csv = null; Store.salvar(); render(); toast(n + tr(' cota(s) importada(s).', ' quota(s) imported.')); },
      'dv-fat-fora': function () { fat = null; render(); },
      'dv-fat-ok': function () {
        var r = API.aplicarFatura(fat.f, fat.cs); fat = null; Store.salvar(); render();
        toast(tr('Fatura guardada', 'Bill saved') + (r.consorcios ? ' · ' + r.consorcios + tr(' parcela(s) de consórcio', ' consortium instalment(s)') : '') +
          (r.dif != null && Math.abs(r.dif) >= 0.01 ? ' · ' + tr('diferença ', 'difference ') + fmt(r.dif) : '') + '.');
      },
      'dv-fat-ver': function () { verFatura = !verFatura; render(); }
    }
  });
  window.Dividas = API;
})();
