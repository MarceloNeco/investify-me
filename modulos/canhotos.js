/* =====================================================================
   modulos/canhotos.js — "🧾 Conferir canhotos" com o banco (3.92)        1.0.0 · 20/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 18/Nov/2026; sem IA)
     · Em Lançamentos, "🧾 Conferir canhotos": uma foto (ou várias) com os canhotos da maquininha, cupons e recibos. O motor do
       Leitor OCR (leitor/, motor 1.12.0, cópia sem alterar) lê no aparelho, no Fundo: Leitura.lerVarios (contrato 1), um item
       por papel achado.
     · Resultado em 4 grupos:
         ✅ já está no banco (casou) · 🟡 parecido, confirme · ➕ não veio do banco (lançar à mão ou esperar o banco) ·
         ❓ valor em dúvida (escolher entre as opções lidas ou digitar).
     · Casar: valor com confiança 'alta' e data ±3 dias, com o lançamento do banco ou com a PENDENTE do robô (como na 3.90);
       a hora, o final do cartão e a loja só desempatam. "mesmaCompra" (o recibo e o canhoto da mesma compra) conta uma vez.
       Valor que não é 'alta' nunca casa sozinho: vira 🟡.
     · Casou: ali mesmo, quem, categoria e ✂️ dividir; a classificação vai para o lançamento do banco (ou para a pendente, e da
       pendente para o postado, pelo modulos/print-colar.js). Nada é duplicado: só "Lançar à mão" cria lançamento.
     · "Esperar o banco": vira um item "⏳ aguardando o banco" do print (a mesma conciliação da 3.87/3.90).
     · A consulta do CNPJ na internet do motor fica DESLIGADA aqui (seria uma integração nova; regra zero).
   API (window.Canhotos)
     classificar(itens) → {casou, parecido, novo, duvida} · processar(arquivos)
   PONTOS QUE USA
     lancamentos.topo · ações cn-*
   ===================================================================== */
(function () {
  'use strict';
  var MOTOR = ['leitor/leitura.js', 'leitor/leitura/catalogo.js', 'leitor/leitura/texto.js', 'leitor/leitura/relacoes.js', 'leitor/leitura/estabelecimentos.js', 'leitor/leitura/modelos.js',
    'leitor/leitores/cartao.js', 'leitor/leitores/nfce.js', 'leitor/leitores/conta.js', 'leitor/leitores/transferencia.js', 'leitor/leitores/boleto.js', 'leitor/leitores/arrecadacao.js',
    'leitor/leitores/extrato.js', 'leitor/leitores/cartao-plastico.js', 'leitor/leitura/varios.js'];
  var JANELA = 3;
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function iso(d) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(d || '')); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
  function dias(a, b) { return Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000); }
  function pend() { return window.PreAut ? PreAut.lista() : []; }

  var carregando = null;
  function carregarMotor() {
    if (window.Leitura && window.Leitura.lerVarios) return Promise.resolve();
    if (carregando) return carregando;
    carregando = MOTOR.reduce(function (p, src) {
      return p.then(function () {
        if (document.querySelector('script[src="' + src + '"]') && (src !== 'leitor/leitura/varios.js' || (window.Leitura && Leitura.lerVarios))) return;
        return new Promise(function (ok, erro) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { erro(new Error(src)); }; document.head.appendChild(s); });
      });
    }, Promise.resolve()).then(function () {
      /* sem a consulta do CNPJ na internet (integração nova: regra zero). Só nesta página; não mexe no ajuste do Leitor OCR */
      if (window.Leitura) Leitura.consultaCnpjLigada = function () { return false; };
    });
    carregando.catch(function () { carregando = null; });
    return carregando;
  }

  /* os candidatos do banco: lançamentos de saída e as pendentes do robô, com o mesmo valor e a data ±3 dias */
  function candidatos(it) {
    var d = iso(it.data); if (!d || !(it.valor > 0)) return [];
    var usados = {}; pend().forEach(function (x) { if (x.gastoId) usados[x.gastoId] = 1; });
    var ok = function (g) { return Math.abs((Number(g.valor) || 0) - it.valor) < 0.005 && g.data && Math.abs(dias(g.data, d)) <= JANELA; };
    return Gasto.todos().filter(function (g) { return g.fluxo === 'saida' && !usados[g.id] && !g.divisao && ok(g); })
      .concat(pend().filter(function (r) { return !r.doPrint && r.estado === 'pendente' && ok(r); }));
  }
  /* desempate: a hora, o final do cartão e a loja */
  function pontos(it, g) {
    var p = 0;
    if (it.final && (g.finalCartao === it.final || (g.cartaoId && typeof Banco !== 'undefined' && String((Banco.acharCartao(g.cartaoId) || {}).fim) === it.final))) p += 2;
    if (it.loja && window.PrintColar && PrintColar.lojaParecida(it.loja, (g.contraparte && g.contraparte.nome) || g.descRobo || g.desc)) p += 2;
    if (it.hora && g.hora && g.hora === it.hora) p += 1;
    if (iso(it.data) === g.data) p += 1;
    return p;
  }

  var API = {
    classificar: function (itens) {
      var out = { casou: [], parecido: [], novo: [], duvida: [] }, tomados = {}, papelVisto = {};
      (itens || []).forEach(function (it, i) {
        it._i = i;
        /* a mesma compra (o recibo e o canhoto) conta uma vez */
        if (it.mesmaCompra != null && papelVisto[it.arquivo + '#' + it.mesmaCompra]) return;
        papelVisto[it.arquivo + '#' + it.papel] = 1;
        if (it.valor == null) { out.duvida.push({ it: it }); return; }
        var todos = candidatos(it), cs = todos.filter(function (g) { return !tomados[g.id]; });
        if (!cs.length) { out.novo.push({ it: it }); return; }
        cs.sort(function (a, b) { return pontos(it, b) - pontos(it, a); });
        /* único de verdade: o único com o valor e a data, ou o que ganha de TODOS no desempate (mesmo dos já tomados) */
        var unico = todos.length === 1 || todos.every(function (g) { return g === cs[0] || pontos(it, cs[0]) > pontos(it, g); });
        var alta = it.confianca && it.confianca.valor === 'alta';
        if (alta && unico) { tomados[cs[0].id] = 1; out.casou.push({ it: it, g: cs[0] }); }
        else out.parecido.push({ it: it, cs: cs });
      });
      return out;
    }
  };

  /* ---------- ler (no Fundo) ---------- */
  var ultimo = null;   /* {itens, grupos} até a pessoa fechar */
  async function processar(arquivos) {
    arquivos = [].slice.call(arquivos || []); if (!arquivos.length) return;
    var id = 'canhotos-ler', temFundo = typeof Fundo !== 'undefined';
    if (temFundo) Fundo.comecar({ id: id, titulo: tr('Lendo os canhotos…', 'Reading the receipts…', 'Leyendo los tickets…'), aoAbrir: function () { if (ultimo) mostrar(); } });
    try {
      await carregarMotor();
      if (!Leitura.lerVarios || Leitura.lerVarios.contrato !== 1) throw new Error('contrato');
      var itens = await (API._ler || Leitura.lerVarios)(arquivos, { aviso: function (t) { if (temFundo) Fundo.passo(id, t); }, progresso: function (p) { if (temFundo) Fundo.passo(id, null, (Number(p) || 0) / 100); } });
      ultimo = { itens: itens, grupos: API.classificar(itens) };
      if (temFundo) { Fundo.terminar(id, tr('Canhotos lidos: ', 'Receipts read: ', 'Tickets leídos: ') + itens.length); Fundo.limpar(id); }
      mostrar();
    } catch (e) {
      if (temFundo) Fundo.limpar(id);
      toast(tr('Não deu para ler os canhotos aqui.', 'Could not read the receipts here.', 'No se pudieron leer los tickets aquí.'), 'warn');
    }
  }
  function escolher() {
    var inp = document.getElementById('cnArquivo');
    if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*,application/pdf,.pdf'; inp.multiple = true; inp.id = 'cnArquivo'; inp.hidden = true; document.body.appendChild(inp);
      inp.addEventListener('change', function () { var f = [].slice.call(inp.files || []); inp.value = ''; processar(f); }); }
    inp.click();
  }

  /* ---------- o resultado ---------- */
  function rot(it) { return [it.loja || tr('(loja não lida)', '(store not read)', '(tienda no leída)'), it.data, it.hora, it.final ? '••' + it.final : ''].filter(Boolean).join(' · '); }
  function nomeG(g) { return ((g.contraparte && g.contraparte.nome) || g.descRobo || g.desc || '') + ' · ' + I18n.data(g.data) + (g.pendente ? ' · ⏳ ' + tr('pendente no banco', 'pending at the bank', 'pendiente en el banco') : ''); }
  function classificacao(k, g) {
    var gs = Object.keys(GRUPOS);
    return '<div class="cn-class" data-k="' + k + '" hidden>' + (typeof recOpcoesPessoa === 'function' ? recOpcoesPessoa('cnPess' + k) : '') +
      '<div class="grid g2"><label class="field"><span>' + esc(tr('Para quem', 'For whom', 'Para quién')) + '</span><input data-cn="quem" list="cnPess' + k + '" value="' + esc(quemVer(g.paraQuem || '')) + '"></label>' +
      '<label class="field"><span>' + esc(tr('Grupo', 'Group', 'Grupo')) + '</span><select data-cn="grupo">' + gs.map(function (x) { return '<option value="' + x + '"' + (x === g.grupo ? ' selected' : '') + '>' + esc((GRUPOS[x].ico || '') + ' ' + GRUPOS[x].nome) + '</option>'; }).join('') + '</select></label>' +
      '<label class="field"><span>' + esc(tr('Categoria', 'Category', 'Categoría')) + '</span><input data-cn="sub" maxlength="60" value="' + esc(g.sub || '') + '"></label></div>' +
      '<p style="margin:4px 0"><button type="button" class="btn sm" data-acao="cn-dividir" data-k="' + k + '">✂️ ' + esc(tr('Dividir', 'Split', 'Dividir')) + '</button></p><div class="cn-div" hidden></div>' +
      '<button type="button" class="btn sm primary" data-acao="cn-aplicar" data-k="' + k + '">' + esc(tr('Aplicar no lançamento do banco', 'Apply to the bank entry', 'Aplicar al movimiento del banco')) + '</button></div>';
  }
  function mostrar() {
    if (!ultimo) return;
    var gr = ultimo.grupos, sec = function (ico, tit, l, corpo) { return l.length ? '<h4 style="margin:12px 0 4px">' + ico + ' ' + esc(tit) + ' (' + l.length + ')</h4>' + l.map(corpo).join('') : ''; };
    var opcCartao = function (it) {
      var cs = typeof Banco !== 'undefined' ? Banco.cartoes() : [];
      return '<select data-cn="cartao"><option value="">' + esc(tr('cartão…', 'card…', 'tarjeta…')) + '</option>' + cs.map(function (c) { return '<option value="' + esc(c.id) + '"' + (it.final && String(c.fim) === it.final ? ' selected' : '') + '>' + esc(Banco.rotuloCartao(c.id)) + '</option>'; }).join('') + '</select>';
    };
    var h = '<p class="small muted" style="margin:0 0 6px">' + esc(tr('Lido no aparelho, sem internet e sem IA. Só "Lançar à mão" cria lançamento; o resto liga ao que o banco mandou.', 'Read on the device, with no internet and no AI. Only "Enter manually" creates an entry; the rest links to what the bank sent.', 'Leído en el dispositivo, sin internet y sin IA. Solo "Registrar a mano" crea un movimiento; lo demás se vincula a lo que mandó el banco.')) + '</p>' +
      sec('✅', tr('Já está no banco', 'Already at the bank', 'Ya está en el banco'), gr.casou, function (x, i) {
        return '<div class="cn-item" data-grupo="casou" data-i="' + i + '" style="padding:6px 0;border-top:1px solid var(--line)"><b>' + fmt(x.it.valor) + '</b> · ' + esc(rot(x.it)) + '<span class="t-sub">' + esc('= ' + nomeG(x.g)) + '</span>' +
          '<button type="button" class="linkinho" data-acao="cn-classe" data-k="c' + i + '">' + esc(tr('classificar', 'classify', 'clasificar')) + '</button>' + classificacao('c' + i, x.g) + '</div>';
      }) +
      sec('🟡', tr('Parecido, confirme', 'Similar, please confirm', 'Parecido, confirma'), gr.parecido, function (x, i) {
        return '<div class="cn-item" data-grupo="parecido" data-i="' + i + '" style="padding:6px 0;border-top:1px solid var(--line)"><b>' + fmt(x.it.valor) + '</b> · ' + esc(rot(x.it)) +
          '<select data-cn="par">' + x.cs.map(function (g) { return '<option value="' + esc(g.id) + '">' + esc(fmt(g.valor) + ' · ' + nomeG(g)) + '</option>'; }).join('') + '<option value="">' + esc(tr('nenhum destes', 'none of these', 'ninguno de estos')) + '</option></select>' +
          '<button type="button" class="btn sm" data-acao="cn-confirmar" data-i="' + i + '">' + esc(tr('É este', 'This one', 'Es este')) + '</button></div>';
      }) +
      sec('➕', tr('Não veio do banco', 'Not from the bank', 'No vino del banco'), gr.novo, function (x, i) {
        return '<div class="cn-item" data-grupo="novo" data-i="' + i + '" style="padding:6px 0;border-top:1px solid var(--line)"><b>' + fmt(x.it.valor) + '</b> · ' + esc(rot(x.it)) + ' ' + opcCartao(x.it) +
          '<button type="button" class="btn sm" data-acao="cn-amao" data-i="' + i + '">' + esc(tr('Lançar à mão', 'Enter manually', 'Registrar a mano')) + '</button>' +
          '<button type="button" class="btn sm" data-acao="cn-esperar" data-i="' + i + '">⏳ ' + esc(tr('Esperar o banco', 'Wait for the bank', 'Esperar al banco')) + '</button></div>';
      }) +
      sec('❓', tr('Valor em dúvida', 'Amount unsure', 'Importe dudoso'), gr.duvida, function (x, i) {
        return '<div class="cn-item" data-grupo="duvida" data-i="' + i + '" style="padding:6px 0;border-top:1px solid var(--line)">' + esc(rot(x.it)) + ' · ' +
          (x.it.opcoes || []).map(function (v) { return '<button type="button" class="btn sm" data-acao="cn-valor" data-i="' + i + '" data-v="' + v + '">' + fmt(v) + '</button>'; }).join('') +
          '<input data-cn="valor" inputmode="decimal" placeholder="' + esc(tr('outro valor', 'other amount', 'otro importe')) + '" style="width:7em"><button type="button" class="btn sm" data-acao="cn-valor" data-i="' + i + '">' + esc(tr('Usar', 'Use', 'Usar')) + '</button></div>';
      }) +
      '<div class="f-actions"><button class="btn primary" data-acao="cn-fechar">' + esc(tr('Pronto', 'Done', 'Listo')) + '</button></div>';
    $('#genTitle').textContent = tr('Conferir canhotos', 'Check receipts', 'Revisar tickets');
    $('#genBody').innerHTML = Verter.html(h);
    delete $('#genBody').dataset.inbox;
    abrir('genModal');
  }
  function item(el) { var c = el.closest('.cn-item'); return { c: c, x: ultimo.grupos[c.dataset.grupo][Number(c.dataset.i)] }; }
  function campo(c, k) { var e = c.querySelector('[data-cn="' + k + '"]'); return e ? String(e.value || '').trim() : ''; }
  function alvo(id) { return Gasto.todos().find(function (g) { return g.id === id; }) || pend().find(function (r) { return r.id === id; }) || null; }
  /* a classificação vai para o lançamento do banco; numa pendente, fica nela e vai para o postado depois (print-colar) */
  function aplicar(g, d, partes) {
    var ehGasto = Gasto.todos().some(function (x) { return x.id === g.id; });
    if (window.Pessoas && d.paraQuem) Pessoas.ligar(d, 'paraQuem', 'paraQuemId');
    var obs = [g.obs, tr('conferido com o canhoto', 'checked against the receipt', 'comprobado con el ticket')].filter(Boolean).join(' · ');
    if (ehGasto) {
      Gasto.atualizar(g.id, Object.assign({}, d, { obs: obs, editadoPessoa: true, confirmadoEm: new Date().toISOString(), revisar: false }));
      var n = Gasto.todos().find(function (x) { return x.id === g.id; }); if (n) delete n.confianca;
      if (partes && window.Divisao) Divisao.aplicar(g.id, partes);
    } else {
      Object.assign(g, d, { obs: obs, doPrintClass: true, printId: g.printId || 'canhoto' }); if (partes) g.partes = partes;
    }
  }
  function depois() { Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN(); }

  MoneyModulos.registrar({
    id: 'canhotos', versao: '1.0.0',
    pontos: {
      'lancamentos.topo': function () { return '<div class="row" style="margin:0 0 8px"><button type="button" class="btn sm" data-acao="cn-abrir">🧾 ' + esc(tr('Conferir canhotos', 'Check receipts', 'Revisar tickets')) + '</button></div>'; }
    },
    acoes: {
      'cn-abrir': function () { escolher(); },
      'cn-fechar': function () { ultimo = null; fechar('genModal'); },
      'cn-classe': function (el) { var b = document.querySelector('.cn-class[data-k="' + el.dataset.k + '"]'); if (b) b.hidden = !b.hidden; },
      'cn-dividir': function (el) {
        var r = item(el), box = r.c.querySelector('.cn-div'); if (!box) return;
        if (!box.hidden) { box.hidden = true; box.innerHTML = ''; return; }
        var g = r.x.g, v = n2(g.valor);
        box.innerHTML = Verter.html(Divisao.blocoHtml('cnd' + el.dataset.k, v, [{ valor: v, grupo: campo(r.c, 'grupo'), sub: campo(r.c, 'sub') }, { valor: 0 }], window.Origem ? Origem.origemDe(g) : ''));
        box.hidden = false; Divisao.somarTodos();
      },
      'cn-aplicar': function (el) {
        var r = item(el), g = r.x.g, partes = null, box = r.c.querySelector('.cn-div:not([hidden]) [data-dvbloco]');
        if (box) { var l = Divisao.ler(box.dataset.dvbloco, n2(g.valor)); if (l.erro) return toast(l.erro, 'warn'); partes = l.partes; }
        aplicar(g, { paraQuem: campo(r.c, 'quem'), grupo: campo(r.c, 'grupo') || g.grupo, sub: campo(r.c, 'sub') || g.sub }, partes);
        depois(); r.c.querySelector('.cn-class').hidden = true; toast(tr('Classificado no lançamento do banco.', 'Classified on the bank entry.', 'Clasificado en el movimiento del banco.'));
      },
      'cn-confirmar': function (el) {
        var r = item(el), id = campo(r.c, 'par'), g = id && alvo(id);
        var gr = ultimo.grupos; gr.parecido.splice(gr.parecido.indexOf(r.x), 1);
        if (g) { aplicar(g, {}, null); gr.casou.push({ it: r.x.it, g: g }); depois(); } else gr.novo.push({ it: r.x.it });
        mostrar();
      },
      'cn-valor': function (el) {
        var r = item(el), v = el.dataset.v ? Number(el.dataset.v) : n2(Number(campo(r.c, 'valor').replace(/\./g, '').replace(',', '.')));
        if (!(v > 0)) return;
        var it = Object.assign({}, r.x.it, { valor: v, confianca: Object.assign({}, r.x.it.confianca, { valor: 'media' }) }), gr = ultimo.grupos;
        gr.duvida.splice(gr.duvida.indexOf(r.x), 1);
        var cs = candidatos(it); if (cs.length) gr.parecido.push({ it: it, cs: cs }); else gr.novo.push({ it: it });
        mostrar();
      },
      'cn-amao': function (el) {
        var r = item(el), it = r.x.it, d = iso(it.data) || hojeISO();
        Gasto.add({ data: d, valor: it.valor, desc: it.loja || tr('Compra (canhoto)', 'Purchase (receipt)', 'Compra (ticket)'), grupo: 'OUTROS', sub: '', fluxo: 'saida', cartaoId: campo(r.c, 'cartao') || undefined, hora: it.hora || '', origem: 'canhoto', forma: tr('manual (canhoto)', 'manual (receipt)', 'manual (ticket)'), editadoPessoa: true });
        ultimo.grupos.novo.splice(ultimo.grupos.novo.indexOf(r.x), 1); depois(); mostrar();
      },
      'cn-esperar': function (el) {
        var r = item(el), it = r.x.it, ct = campo(r.c, 'cartao');
        if (!ct) return toast(tr('Escolha o cartão para esperar o banco.', 'Pick the card to wait for the bank.', 'Elige la tarjeta para esperar al banco.'), 'warn');
        pend().push({ id: 'pp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), doPrint: true, estado: 'pendente', pendente: true, vistoEm: hojeISO(), cartaoId: ct, final: it.final || '',
          valor: it.valor, data: iso(it.data) || hojeISO(), hora: it.hora || '', desc: it.loja || '', grupo: 'OUTROS', sub: '', fluxo: 'saida', obs: tr('do canhoto', 'from the receipt', 'del ticket') });
        ultimo.grupos.novo.splice(ultimo.grupos.novo.indexOf(r.x), 1); depois(); mostrar();
      }
    }
  });
  API.processar = processar;
  window.Canhotos = API;
})();
