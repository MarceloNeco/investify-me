/* =====================================================================
   modulos/comprovantes.js — COMPROVANTES DO E-MAIL que o robô manda (3.95)        1.2.1 · 24/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, "adiante tudo do e-mail"; sem IA)
     · A caixa do robô (nuvem.js, money_entrada) traz um tipo novo de item, tipo "comprovante", tirado dos e-mails lidos
       sem IA. NUNCA vira lançamento sozinho: fica em "🧾 Comprovantes a conferir" (Lançamentos), no 📥 e liga ao que já
       existe no app.
     · compra (Kirvano, Cakto, Hotmart, Amazon…): casa com a compra do cartão pelo motor dos canhotos (3.92/3.90: o
       mesmo valor, data ±3 dias, final do cartão e loja/descritor da fatura só desempatam; parcelado: a 1ª parcela =
       valor_parcela). Casou: a ficha (produto, pedido, loja) vai para o lançamento e o app sugere a categoria (a regra
       da loja ou o que a pessoa já usou para ela).
     · reembolso (Amazon): vira um item em "Valores a receber" (modulos/a-receber.js, 3.79), com o cartão do final e a
       referência; sai sozinho quando o crédito cai (AReceber.vigiar).
     · nota_fiscal (NFS-e): liga à compra (mesmo produto ou loja, data ±30 dias; o valor pode ser outro) e, se for
       despesa médica (nf-ir 1.1.0), marca a nota como recebida, com o número, o CNPJ e o prestador para o IR.
     · recibo_exterior (USD): vai para o recibo × cartão da 3.91 (modulos/recibo-exterior.js: câmbio, IOF, negócio/casa).
     · boleto: conta a pagar com vencimento; 📥 a partir de 2 dias antes; "⛔ não pague" se a mesma conta está no débito
       automático (modulos/debito-auto.js); some quando o pagamento aparece (mesmo valor, até 5 dias depois do vencimento).
     · outro: a pessoa escolhe o que é (ou guarda só).
     · fotos_a_ler: "📷 foto a ler" — o robô ainda não lê foto; o botão abre o 📷 Foto de nota ou recibo (antes "Conferir canhotos") para a pessoa
       mandar a mesma foto.
     · Repetido (o mesmo id): atualiza, nunca duplica.
     · Visão da casa: segue o escopo da caixa do robô de onde veio (reservado por padrão; visao-casa 1.1.5).
     · 1.1.0 (3.96): compra com valor incerto (confianca 'baixa', ou valor null com opcoes) nunca casa sozinho: "⚠️ Valor incerto:
       confira olhando o comprovante" e, se o banco tem perto (mesmo cartão/final, data ±1, até R$ 1,00 ou os mesmos reais), "No banco
       tem R$ X nesse dia: é este?" [É este]; confirmado, o valor do banco vale.
     · 1.2.0 (3.104), o robô novo: o subtipo "fatura" (conta ou fatura genérica: telefone, cartão, condomínio, consórcio, com valor a
       pagar e vencimento, do e-mail ou do PDF) é conta a pagar como o boleto: "Já paguei", liga sozinha ao pagamento ou ao débito (o
       mesmo valor, até 5 dias depois do vencimento), "⛔ não pague" se a conta está no débito automático e ainda não venceu (3.100), e
       "pague" se o débito não caiu. "links" (o arquivo no Drive do robô): 📎 na linha do comprovante (só https do Google Drive/Docs).
       recibo_exterior em BRL: o recibo × cartão casa pelo valor em reais, sem câmbio nem IOF (modulos/recibo-exterior.js 1.0.1).
     · 1.2.1 (3.105): "Não é meu (conta de outra pessoa)" e a lista de terceiros (modulos/terceiros.js): o que bate com "ignorar" é
       dispensado sozinho (sai do 📥); "processar" ganha o "para quem".
   API (window.Comprovantes)
     receber(l, escopo?) → true (guardado) | false · lista() · abertos() · ligarTudo() · casarCompra(x) · palpiteCat(loja)
   DADOS
     ST.comprovantes = [{id, subtipo, data, valor, moeda, loja, cnpj, produto, pedido, numero, parcelas, valor_parcela, final,
       descritor_fatura, vencimento, linha, referencia, remetente, assunto, arquivo, arquivos, fotos_a_ler, descricao,
       escopo, recebidoEm, estado: 'novo'|'ok'|'dispensado', gastoId, pendId, cands, sugestao, arId, reciboId, compraId,
       nfGastoId, pagoId, fotosLidas, links}]
     gasto.ficha = {cid, produto, pedido, loja, nf}   (a ficha da compra no lançamento do banco)
   PONTOS QUE USA
     lancamentos.topo · lancamento.form · inbox.grupos ('comprovantes') · ações cp-*
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'comprovantes', SUBS = ['compra', 'reembolso', 'nota_fiscal', 'recibo_exterior', 'boleto', 'fatura', 'outro'];
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function num(v) { var n = Number(v); return isFinite(n) ? n : null; }
  function txt(v, m) { return v == null ? '' : String(v).trim().slice(0, m || 120); }
  function dataOk(d) { return /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) ? d : ''; }
  function dias(a, b) { return Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000); }
  function hoje() { return API._hoje || hojeISO(); }
  function br(d) { return d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : ''; }
  function lista() { if (!ST) return []; return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function visivel(x) { return !(window.Escopo && Escopo.soCasa && Escopo.soCasa()) || Escopo.de(COL, x) === 'casa'; }
  function gasto(id) { return id ? Gasto.todos().find(function (g) { return g.id === id; }) || null : null; }
  function parecida(a, b) { return !!(a && b && window.PrintColar && PrintColar.lojaParecida(a, b)); }
  function N(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function nomeG(g) { return ((g.contraparte && g.contraparte.nome) || g.descRobo || g.desc || '') + ' · ' + I18n.data(g.data); }
  function rotSub(s) {
    return ({ compra: tr('Compra', 'Purchase', 'Compra'), reembolso: tr('Reembolso', 'Refund', 'Reembolso'), nota_fiscal: tr('Nota fiscal', 'Invoice', 'Factura'),
      recibo_exterior: tr('Recibo do exterior', 'Foreign receipt', 'Recibo del exterior'), boleto: tr('Boleto', 'Bank slip', 'Boleto'), fatura: tr('Fatura ou conta', 'Bill', 'Factura o recibo'), outro: tr('Outro', 'Other', 'Otro') })[s] || s;
  }
  function quem(x) { return x.loja || x.remetente || x.descritor_fatura || ''; }
  function valorTxt(x) { return x.valor == null ? '' : (x.moeda === 'USD' ? 'US$ ' + I18n.num(x.valor, 2) : fmt(x.valor)); }

  /* a categoria: a regra da loja (modulos/loja-nova.js) ou o que a pessoa já usou para a mesma loja */
  function palpiteCat(loja) {
    if (!loja) return null;
    var k = window.Origem ? 'd:' + Origem.chaveDesc(loja) : '', r = k && window.LojaNova && LojaNova.regra(k);
    if (r && r.grupo) return { grupo: r.grupo, sub: r.sub || '' };
    var g = Gasto.todos().slice().reverse().find(function (y) { return y.grupo && y.grupo !== 'OUTROS' && parecida(loja, y.descRobo || y.desc); });
    return g ? { grupo: g.grupo, sub: g.sub || '' } : null;
  }

  /* ---------- compra: o motor dos canhotos (3.92) ---------- */
  function casarCompra(x) {
    if (x.subtipo !== 'compra' || x.estado === 'dispensado') return;
    var g0 = gasto(x.gastoId); if (g0) return;
    x.gastoId = ''; x.pendId = ''; x.cands = []; x.perto = [];
    var incerto = incertoDe(x);   /* 1.1.0 (3.96): valor incerto nunca casa sozinho */
    if (!window.Canhotos || (!(x.valor > 0) && !incerto) || !x.data) return;
    var v = x.parcelas > 1 && x.valor_parcela > 0 ? x.valor_parcela : x.valor;
    var it = { valor: v != null ? n2(v) : null, opcoes: x.opcoes || [], data: br(x.data), final: x.final || '', loja: x.descritor_fatura || x.loja || '', confianca: { valor: incerto ? 'baixa' : 'alta' }, arquivo: x.id, papel: 0 };
    var r = Canhotos.classificar([it]), tomado = function (g) { return g && ((g.ficha && g.ficha.cid && g.ficha.cid !== x.id) || (x.naoE || []).indexOf(g.id) >= 0); };
    if (r.duvida.length) x.perto = (r.duvida[0].perto || []).filter(function (c) { return !tomado(c) && gasto(c.id); }).map(function (c) { return c.id; });
    else if (r.casou.length && !tomado(r.casou[0].g)) {
      var g = r.casou[0].g;
      if (gasto(g.id)) ligarCompra(x, g); else x.pendId = g.id;   /* a pendente do robô: liga quando o definitivo chegar */
    } else if (r.parecido.length) x.cands = r.parecido[0].cs.filter(function (c) { return !tomado(c) && gasto(c.id); }).map(function (c) { return c.id; });
  }
  function incertoDe(x) { return x.confianca === 'baixa' || (x.valor == null && (x.opcoes || []).length > 0); }
  function ligarCompra(x, g) {
    x.gastoId = g.id; x.pendId = ''; x.cands = []; x.perto = [];
    /* 1.1.0 (3.96): a pessoa confirmou um valor incerto: o valor do banco vale */
    if (incertoDe(x)) { if (x.parcelas > 1) x.valor_parcela = n2(g.valor); else x.valor = n2(g.valor); x.confianca = 'conferido'; }
    g.ficha = { cid: x.id, produto: x.produto || '', pedido: x.pedido || '', loja: x.loja || '', nf: (g.ficha && g.ficha.nf) || '' };
    var s = palpiteCat(x.descritor_fatura) || palpiteCat(x.loja);
    x.sugestao = s && (s.grupo !== g.grupo || (s.sub || '') !== (g.sub || '')) ? s : null;
  }

  /* ---------- reembolso → Valores a receber (3.79) ---------- */
  function ligarReembolso(x) {
    if (x.arId || !window.AReceber || !(x.valor > 0)) return;
    var c = x.final && typeof Banco !== 'undefined' ? (Banco.cartoes() || []).find(function (k) { return String(k.fim) === String(x.final); }) : null;
    var ar = AReceber.salvar({ quem: quem(x), cnpj: String(x.cnpj || '').replace(/\D/g, ''), tipo: 'estorno', total: n2(x.valor), ondeCartaoId: c ? c.id : '',
      protocolo: x.referencia || x.pedido || '', pedidoEm: x.data || hoje(), escopo: x.escopo, comprovanteId: x.id });
    x.arId = ar.id; x.estado = 'ok';
  }

  /* ---------- nota fiscal → a compra e a despesa médica (nf-ir 1.1.0) ---------- */
  function ligarNota(x) {
    if (!x.data) return;
    if (!x.compraId) {
      var c = lista().find(function (y) {
        return y.subtipo === 'compra' && y.data && Math.abs(dias(y.data, x.data)) <= 30 &&
          ((x.produto && y.produto && N(x.produto) === N(y.produto)) || parecida(x.loja, y.loja));
      });
      if (c) { x.compraId = c.id; var gc = gasto(c.gastoId); if (gc && gc.ficha) gc.ficha.nf = x.numero || '✓'; }
    }
    if (!x.nfGastoId && window.NfIr) {
      var cn = String(x.cnpj || '').replace(/\D/g, '');
      var gs = Gasto.todos().filter(function (g) {
        if (!g.data || g.fluxo === 'entrada' || !NfIr.medica(g) || Math.abs(dias(g.data, x.data)) > 30 || lista().some(function (y) { return y !== x && y.nfGastoId === g.id; })) return false;
        var gc2 = String((g.contraparte && g.contraparte.cnpj) || '').replace(/\D/g, '');
        return (cn && gc2 === cn) || parecida(x.loja, (g.contraparte && g.contraparte.nome) || g.descRobo || g.desc) || (x.valor > 0 && Math.abs(Number(g.valor) - x.valor) < 0.005);
      }).sort(function (a, b) { return Math.abs(dias(a.data, x.data)) - Math.abs(dias(b.data, x.data)); });
      if (gs[0]) {
        x.nfGastoId = gs[0].id;
        NfIr.marcar(gs[0].id, 'recebida');
        NfIr.guardarDados(gs[0].id, { prof: NfIr.dados(gs[0]).prof || x.loja || '', doc: NfIr.dados(gs[0]).doc || x.cnpj || '', nf: x.numero || '' });
      }
    }
    if (x.compraId || x.nfGastoId) x.estado = 'ok';
  }

  /* ---------- recibo do exterior → recibo × cartão (3.91) ---------- */
  var ligando = {};   /* 1.2.0 (3.104): receber() redesenha o 📥, que religa tudo: sem a trava, laço sem fim (recibo em R$, sem a espera da PTAX) */
  function ligarRecibo(x) {
    if (x.reciboId || ligando[x.id] || !window.ReciboExterior || !(x.valor > 0)) return;
    var r = { servico: quem(x), moeda: x.moeda || 'USD', valorMoeda: n2(x.valor), data: x.data, numero: x.numero || '' };
    ligando[x.id] = 1;
    try { ReciboExterior.receber([r], false); } finally { delete ligando[x.id]; }
    var y = ReciboExterior.lista().find(function (z) { return (r.numero && z.numero === r.numero) || (z.servico === r.servico && z.valorMoeda === r.valorMoeda && z.data === r.data); });
    if (y) { x.reciboId = y.id; x.estado = 'ok'; }
  }

  /* ---------- boleto: conta a pagar ---------- */
  function pagoDe(x) {
    if (!(x.valor > 0)) return null;
    var ate = x.vencimento || x.data, usados = {}; lista().forEach(function (y) { if (y !== x && y.pagoId) usados[y.pagoId] = 1; });
    return Gasto.todos().find(function (g) {
      return g.fluxo !== 'entrada' && !usados[g.id] && g.data && Math.abs(Number(g.valor) - x.valor) < 0.005 &&
        (!x.data || g.data >= x.data) && (!ate || dias(g.data, ate) <= 5);
    }) || null;
  }
  function ligarBoleto(x) { if (x.pagoId && gasto(x.pagoId)) return; var g = pagoDe(x); if (g) { x.pagoId = g.id; x.estado = 'ok'; } }
  function debito(x) { return window.DebitoAuto ? DebitoAuto.conflito({ nome: quem(x), cnpj: x.cnpj || '', texto: [x.descricao, x.assunto].join(' ') }) : null; }

  function processar(x) {
    if (x.estado === 'dispensado') return;
    if (window.Terceiros && Terceiros.aplicar(x)) return;   /* 1.2.1 (3.105): conta de outra pessoa a ignorar */
    if (x.subtipo === 'compra') casarCompra(x);
    else if (x.subtipo === 'reembolso') ligarReembolso(x);
    else if (x.subtipo === 'nota_fiscal') ligarNota(x);
    else if (x.subtipo === 'recibo_exterior') ligarRecibo(x);
    else if (x.subtipo === 'boleto' || x.subtipo === 'fatura') ligarBoleto(x);
  }

  var CAMPOS = ['loja', 'cnpj', 'produto', 'pedido', 'numero', 'descritor_fatura', 'linha', 'referencia', 'remetente', 'assunto', 'arquivo', 'descricao'];
  var API = {
    _hoje: null, SUBS: SUBS, lista: lista, palpiteCat: palpiteCat, casarCompra: casarCompra,
    /* o item do robô (tipo "comprovante"); o mesmo id de novo atualiza, nunca duplica */
    receber: function (l, escopo) {
      if (!l || typeof l !== 'object' || !l.id || typeof ST === 'undefined' || !ST) return false;
      var id = String(l.id).slice(0, 120), d = {
        subtipo: SUBS.indexOf(String(l.subtipo || '').toLowerCase()) >= 0 ? String(l.subtipo).toLowerCase() : 'outro',
        data: dataOk(l.data), vencimento: dataOk(l.vencimento), valor: num(l.valor) != null ? n2(Math.abs(num(l.valor))) : null,
        moeda: /^usd$/i.test(l.moeda || '') ? 'USD' : 'BRL', parcelas: Math.max(0, Math.round(num(l.parcelas) || 0)),
        valor_parcela: num(l.valor_parcela) != null ? n2(Math.abs(num(l.valor_parcela))) : null,
        final: String(l.final || '').replace(/\D/g, '').slice(-4),
        confianca: /^(baixa|media|alta)$/.test(String(l.confianca || '')) ? String(l.confianca) : '',
        opcoes: Array.isArray(l.opcoes) ? l.opcoes.map(Number).filter(function (v) { return v > 0; }).slice(0, 5) : [],
        arquivos: Array.isArray(l.arquivos) ? l.arquivos.slice(0, 20).map(function (a) { return txt(a); }) : [],
        fotos_a_ler: Array.isArray(l.fotos_a_ler) ? l.fotos_a_ler.slice(0, 20).map(function (a) { return txt(a); }) : [],
        /* 1.2.0: o arquivo no Drive do robô (só https do Google Drive/Docs) */
        links: (Array.isArray(l.links) ? l.links : l.links ? [l.links] : []).map(function (a) { return txt(a, 300); }).filter(function (u) { return /^https:\/\/(drive|docs)\.google\.com\//.test(u); }).slice(0, 10)
      };
      CAMPOS.forEach(function (k) { d[k] = txt(l[k], k === 'descricao' || k === 'linha' ? 300 : 120); });
      var x = lista().find(function (y) { return y.id === id; });
      if (x) Object.assign(x, d);
      else { x = Object.assign({ id: id, escopo: escopo === 'casa' ? 'casa' : 'reservado', recebidoEm: new Date().toISOString(), estado: 'novo' }, d); lista().push(x); }
      processar(x);
      return true;
    },
    ligarTudo: function () { lista().forEach(processar); },
    abertos: function () { return lista().filter(function (x) { return x.estado !== 'dispensado' && visivel(x); }); },
    /* o que pede a pessoa (📥) */
    pendencias: function () {
      var h = hoje();
      return API.abertos().filter(function (x) {
        if (x.fotos_a_ler && x.fotos_a_ler.length && !x.fotosLidas) return true;
        if (x.estado !== 'novo') return false;
        if (x.subtipo === 'compra') return !!(x.gastoId || (x.cands && x.cands.length) || (x.perto && x.perto.length));
        if (x.subtipo === 'boleto' || x.subtipo === 'fatura') return !!(x.vencimento || x.data) && dias(x.vencimento || x.data, h) <= 2;
        return x.subtipo === 'outro' || x.subtipo === 'nota_fiscal';
      });
    },
    frase: function (x) {
      var s = rotSub(x.subtipo) + ' · ' + [quem(x), x.produto].filter(Boolean).join(' — ') + (x.valor != null ? ' · ' + valorTxt(x) : '') + (x.data ? ' · ' + I18n.data(x.data) : '');
      if (x.parcelas > 1) s += ' · ' + x.parcelas + 'x' + (x.valor_parcela ? ' ' + fmt(x.valor_parcela) : '');
      return s;
    },
    situacao: function (x) {
      var g = gasto(x.gastoId), h = hoje();
      if (x.estado === 'dispensado') return tr('dispensado', 'dismissed', 'descartado');
      switch (x.subtipo) {
        case 'compra':
          if (g) return '= ' + nomeG(g) + (x.estado === 'ok' ? ' ✓' : '');
          if (x.pendId) return '⏳ ' + tr('pendente no banco; liga quando o lançamento chegar', 'pending at the bank; links when the entry arrives', 'pendiente en el banco; se vincula cuando llegue el movimiento');
          if (x.cands && x.cands.length) return tr('Mais de um lançamento parecido: escolha qual é', 'More than one similar entry: pick the right one', 'Más de un movimiento parecido: elige cuál es');
          if (incertoDe(x)) return '⚠️ ' + tr('Valor incerto: confira olhando o comprovante', 'Unsure amount: check against the receipt', 'Importe dudoso: compruébalo mirando el comprobante') + ((x.opcoes || []).length ? ' (' + tr('pode ser ', 'could be ', 'puede ser ') + x.opcoes.map(fmt).join(' / ') + ')' : '');
          return tr('O cartão ainda não mostrou esta compra', 'Not on the card yet', 'Aún no aparece en la tarjeta');
        case 'reembolso': return x.arId ? tr('Em Valores a receber; sai quando o crédito cair', 'In Money to receive; goes away when the credit lands', 'En Valores a cobrar; sale cuando llegue el crédito') : '';
        case 'nota_fiscal':
          return [x.compraId ? tr('ligada à compra', 'linked to the purchase', 'vinculada a la compra') : '', x.nfGastoId ? tr('despesa médica: nota recebida', 'medical expense: invoice received', 'gasto médico: factura recibida') : '',
            !x.compraId && !x.nfGastoId ? tr('guardada para o IR (nº, CNPJ e prestador)', 'kept for taxes (number, tax ID and provider)', 'guardada para la renta (nº, CIF y proveedor)') : ''].filter(Boolean).join(' · ');
        case 'recibo_exterior': return x.reciboId ? (x.moeda === 'BRL' ? tr('Em Recibo × cartão (em reais: sem câmbio nem IOF)', 'In Receipt × card (in reais: no exchange rate or IOF)', 'En Recibo × tarjeta (en reales: sin cambio ni IOF)') : tr('Em Recibo × cartão (câmbio e IOF)', 'In Receipt × card (exchange rate and IOF)', 'En Recibo × tarjeta (cambio e IOF)')) : '';
        case 'boleto': case 'fatura': {
          if (x.pagoId) return tr('Pago: ', 'Paid: ', 'Pagado: ') + nomeG(gasto(x.pagoId) || {});
          var v = x.vencimento || x.data, dd = v ? dias(v, h) : null, c = debito(x);
          var nc = !c && window.DebitoNaoCaiu ? DebitoNaoCaiu.paraTexto([quem(x), x.assunto, x.descricao].join(' ')) : null;   /* 1.1.1 (3.100) */
          return (c ? '⛔ ' + DebitoAuto.frase(c) + ' · ' : nc ? '⚠️ ' + tr('O débito automático não caiu: pague este boleto', 'The auto-debit did not go through: pay this slip', 'El débito automático no se hizo: paga este boleto') + ' · ' : '') +
            (dd == null ? '' : dd < 0 ? tr('venceu em ', 'was due on ', 'venció el ') + I18n.data(v) : dd === 0 ? tr('vence hoje', 'due today', 'vence hoy') : tr('vence em ', 'due on ', 'vence el ') + I18n.data(v));
        }
        default: return tr('Diga o que é', 'Say what it is', 'Di qué es');
      }
    }
  };

  /* ---------- telas ---------- */
  function botoes(x) {
    var b = function (acao, rot, extra) { return '<button type="button" class="btn sm" data-acao="' + acao + '" data-id="' + esc(x.id) + '"' + (extra || '') + '>' + esc(rot) + '</button>'; }, h = '';
    if (x.fotos_a_ler && x.fotos_a_ler.length && !x.fotosLidas)
      h += '<button type="button" class="btn sm" data-acao="cn-abrir">📷 ' + esc(tr('Foto a ler: abrir "Foto de nota ou recibo"', 'Photo to read: open "Receipt or invoice photo"', 'Foto por leer: abrir "Foto de factura o recibo"')) + '</button>' + b('cp-foto-ok', tr('Já li a foto', 'Photo read', 'Foto leída'));
    if (x.estado === 'novo') {
      if (x.subtipo === 'compra' && x.gastoId) {
        if (x.sugestao) h += b('cp-cat', tr('Usar ', 'Use ', 'Usar ') + ((GRUPOS[x.sugestao.grupo] || {}).nome || x.sugestao.grupo) + (x.sugestao.sub ? ' · ' + x.sugestao.sub : ''));
        h += b('cp-ok', tr('Está certo', 'Correct', 'Es correcto')) + b('cp-naoe', tr('Não é este lançamento', 'Not this entry', 'No es este movimiento'));
      }
      if (x.subtipo === 'compra' && !x.gastoId && x.perto && x.perto.length)
        h += x.perto.map(function (gid) { var g = gasto(gid); return g ? '<span class="small">' + esc(tr('No banco tem ', 'The bank has ', 'En el banco hay ') + fmt(g.valor) + tr(' nesse dia: é este?', ' on that day: is it this one?', ' ese día: ¿es este?')) + '</span>' + b('cp-esse', tr('É este', 'This one', 'Es este'), ' data-g="' + esc(gid) + '"') : ''; }).join('');
      if (x.subtipo === 'compra' && !x.gastoId && x.cands && x.cands.length)
        h += x.cands.map(function (gid) { var g = gasto(gid); return g ? b('cp-esse', '= ' + nomeG(g), ' data-g="' + esc(gid) + '"') : ''; }).join('');
      if (x.subtipo === 'boleto' || x.subtipo === 'fatura') h += b('cp-ok', tr('Já paguei', 'Already paid', 'Ya pagué'));
      if (x.subtipo === 'nota_fiscal') h += b('cp-ok', tr('Guardar', 'Keep', 'Guardar'));
      if (x.subtipo === 'outro') h += ['compra', 'reembolso', 'nota_fiscal', 'boleto', 'fatura'].map(function (s) { return b('cp-tipo', rotSub(s), ' data-v="' + s + '"'); }).join('') + b('cp-ok', tr('Guardar só', 'Just keep', 'Solo guardar'));
    }
    if (x.estado !== 'dispensado') h += (window.Terceiros ? Terceiros.botao(x) : '') + b('cp-tirar', tr('Dispensar', 'Dismiss', 'Descartar'));
    return '<span class="inb-acoes" style="flex-wrap:wrap;gap:4px">' + h + '</span>';
  }
  function linha(x, tag) {
    return '<' + tag + ' class="inb-item cp-item" data-cp="' + esc(x.id) + '"><div><b>🧾 ' + esc(API.frase(x)) + '</b><span class="t-sub">' +
      esc([API.situacao(x), x.pedido ? tr('pedido ', 'order ', 'pedido ') + x.pedido : '', x.numero ? 'nº ' + x.numero : '', x.cnpj ? 'CNPJ ' + x.cnpj : '', x.paraQuem ? '👤 ' + tr('para ', 'for ', 'para ') + x.paraQuem : ''].filter(Boolean).join(' · ')) + '</span>' +
      (x.links || []).map(function (u, i) { return ' <a class="small cp-link" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">📎 ' + esc(tr('arquivo', 'file', 'archivo') + ((x.links.length > 1) ? ' ' + (i + 1) : '')) + ' ↗</a>'; }).join('') + '</div>' + botoes(x) + '</' + tag + '>';
  }
  function abrirLista() {
    API.ligarTudo();
    var l = API.abertos().slice().sort(function (a, b) { return (b.data || '').localeCompare(a.data || ''); });
    $('#genTitle').textContent = tr('Comprovantes a conferir', 'Receipts to check', 'Comprobantes por revisar');
    $('#genBody').innerHTML = Verter.html('<p class="small muted" style="margin:0 0 8px">' + esc(tr('Vieram dos e-mails, lidos pelo robô sem IA. Nenhum vira lançamento sozinho: cada um liga ao que o banco mandou.',
      'They came from e-mails read by the robot with no AI. None becomes an entry on its own: each links to what the bank sent.', 'Vienen de los correos que el robot leyó sin IA. Ninguno se convierte en movimiento solo: cada uno se vincula a lo que mandó el banco.')) + '</p>' +
      (l.length ? '<ul class="inb-lista" id="cpLista">' + l.map(function (x) { return linha(x, 'li'); }).join('') + '</ul>' : '<p class="small muted">' + esc(tr('Nenhum comprovante.', 'No receipts.', 'Ningún comprobante.')) + '</p>'));
    abrir('genModal');
  }
  function depois() { Store.salvar(); if (typeof renderInboxN === 'function') renderInboxN(); var b = document.getElementById('cpLista'); if (b) abrirLista(); else if (typeof render === 'function') render(); }
  function achar(el) { return lista().find(function (y) { return y.id === el.dataset.id; }); }

  MoneyModulos.registrar({
    id: 'comprovantes', versao: '1.2.1', colecoes: [COL],
    pontos: {
      'lancamentos.topo': function () {
        var n = API.abertos().length; if (!n) return '';
        var p = API.pendencias().length;
        return '<div class="row" style="margin:0 0 8px"><button type="button" class="btn sm" data-acao="cp-abrir">🧾 ' + esc(tr('Comprovantes a conferir', 'Receipts to check', 'Comprobantes por revisar')) + ' (' + (p || n) + ')</button></div>';
      },
      'lancamento.form': function (ctx) {
        var g = ctx && ctx.g, f = g && g.ficha; if (!f || !f.cid) return '';
        return '<div class="bloco-regra cp-ficha"><span class="bf-tit">🧾 ' + esc(tr('Comprovante do e-mail', 'E-mail receipt', 'Comprobante del correo')) + '</span><p class="small" style="margin:2px 0">' +
          esc([f.loja, f.produto, f.pedido ? tr('pedido ', 'order ', 'pedido ') + f.pedido : '', f.nf ? tr('nota ', 'invoice ', 'factura ') + f.nf : ''].filter(Boolean).join(' · ')) + '</p></div>';
      },
      'inbox.grupos': function () {
        API.ligarTudo();
        var l = API.pendencias(); if (!l.length) return [];
        return [{ id: 'comprovantes', n: l.length, html: l.map(function (x) { return linha(x, 'li'); }).join('') }];
      }
    },
    acoes: {
      'cp-abrir': function () { abrirLista(); },
      'cp-ok': function (el) { var x = achar(el); if (!x) return; x.estado = 'ok'; x.sugestao = null; depois(); },
      'cp-cat': function (el) {
        var x = achar(el), g = x && gasto(x.gastoId); if (!g || !x.sugestao) return;
        Gasto.atualizar(g.id, { grupo: x.sugestao.grupo, sub: x.sugestao.sub });
        x.estado = 'ok'; x.sugestao = null; depois();
      },
      'cp-naoe': function (el) {
        var x = achar(el), g = x && gasto(x.gastoId); if (!x) return;
        if (g && g.ficha && g.ficha.cid === x.id) delete g.ficha;
        x.naoE = (x.naoE || []).concat(x.gastoId); x.gastoId = ''; x.sugestao = null; x.cands = []; x.estado = 'novo';
        depois();
      },
      'cp-esse': function (el) { var x = achar(el), g = x && gasto(el.dataset.g); if (!g) return; ligarCompra(x, g); depois(); },
      'cp-tipo': function (el) { var x = achar(el); if (!x) return; x.subtipo = el.dataset.v; x.estado = 'novo'; processar(x); depois(); },
      'cp-foto-ok': function (el) { var x = achar(el); if (!x) return; x.fotosLidas = true; depois(); },
      'cp-tirar': function (el) { var x = achar(el); if (!x) return; x.estado = 'dispensado'; var g = gasto(x.gastoId); if (g && g.ficha && g.ficha.cid === x.id) delete g.ficha; depois(); }
    },
    ouvir: { 'gasto.novo': function () { if (lista().length) API.ligarTudo(); } }
  });
  window.Comprovantes = API;
})();
