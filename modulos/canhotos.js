/* =====================================================================
   modulos/canhotos.js — "🧾 Conferir canhotos" com o banco (3.92)        1.3.0 · 23/Nov/2026
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
     perto(item) → [lançamentos do banco perto do valor lido] (1.1.0)
   1.1.0 (3.96), pelo caso real do papel amassado (lido 512,87 com confiança baixa; o certo era 512,78): valor 'baixa' (ou null com
     opções) nunca casa sozinho nem vem escolhido — vai para ❓ com "confira olhando o papel", as opções como sugestão e o campo para
     digitar; se o banco (postado ou pendente) tem, no mesmo cartão/final e na data ±1 dia, um valor a até R$ 1,00 de uma opção ou com
     os mesmos reais e outros centavos: "No banco tem R$ X nesse dia: é este?" [É este] (o valor do banco vale).
   1.3.0 (3.101), ordem de serviço de oficina (leitor os_oficina do Leitor OCR 0.9.7, motor 1.13.0, cópia sem alterar): a leitura
     guarda o result.financeiro da OS (Leitura.lerVarios.item + o financeiro; o resto igual ao lerVarios). A OS e o canhoto da
     mesma compra ("mesmaCompra") viram UM item: fica o canhoto (data e hora do PAGAMENTO, final), com o que a OS sabe (veículo,
     categoria, CNPJ, parcelas, nº da OS). A OS sozinha (sem o canhoto) traz a data da emissão: procura a parcela até 30 dias depois,
     e só liga sozinha se a loja ou o CNPJ baterem. Grupo Veículo, a categoria da OS ("Funilaria e pintura") e o carro (pelo nome do
     veículo; ou o único carro ativo) já vêm prontos. O CNPJ desempata. result.operacional NÃO é usado nem enviado (é do OmniLifeONE).
   PONTOS QUE USA
     lancamentos.topo · ações cn-*
   ===================================================================== */
(function () {
  'use strict';
  var MOTOR = ['leitor/leitura.js', 'leitor/leitura/catalogo.js', 'leitor/leitura/texto.js', 'leitor/leitura/relacoes.js', 'leitor/leitura/estabelecimentos.js', 'leitor/leitura/modelos.js',
    'leitor/leitores/cartao.js', 'leitor/leitores/nfce.js', 'leitor/leitores/conta.js', 'leitor/leitores/transferencia.js', 'leitor/leitores/boleto.js', 'leitor/leitores/arrecadacao.js',
    'leitor/leitores/extrato.js', 'leitor/leitores/cartao-plastico.js', 'leitor/leitores/os-oficina.js', 'leitor/leitura/varios.js'];
  var JANELA = 3, JANELA_OS = 30;
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function iso(d) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(d || '')); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
  function dias(a, b) { return Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000); }
  function pend() { return window.PreAut ? PreAut.lista() : []; }
  function so(t) { return String(t || '').replace(/\D/g, ''); }
  function norm(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }

  /* ---------- 1.3.0 (3.101): a ordem de serviço da oficina ---------- */
  /* um papel lido → o item do contrato 1, com o financeiro da OS */
  function daPapel(p, i) { var it = Leitura.lerVarios.item(p, i); if (p.tipo === 'os_oficina' && p.result && p.result.financeiro) it.financeiro = p.result.financeiro; return it; }
  /* o mesmo caminho do Leitura.lerVarios, guardando o financeiro */
  async function lerComOS(arquivos, o) {
    var L = Leitura; if (!L.lerVarios.item || !L.abrir || !L.ler || !L.acharPapeis) return L.lerVarios(arquivos, o);
    var fontes = (await L.abrir(arquivos, o.aviso, null)).fontes;
    for (var k = 0; k < fontes.length; k++) { var f = fontes[k]; if (!f.img) continue; o.aviso('Procurando os papéis na foto...'); var cx = await L.acharPapeis(f.img); f.boxes = cx.length >= 2 ? cx : null; }
    var papeis = await L.ler(fontes, { tipo: 'auto', aviso: o.aviso, progresso: o.progresso });
    if (L.relacionar) L.relacionar(papeis);
    return papeis.map(daPapel).filter(function (v) { return !(v.valor === null && !v.opcoes.length && !v.data && !v.hora && !v.loja && !v.cnpj && !v.final); });
  }
  /* a OS vira os dados do item; a OS e o canhoto da mesma compra viram um item só (o canhoto, que tem o pagamento) */
  function juntarOS(itens) {
    var porPapel = {}, fora = {};
    itens.forEach(function (it) { porPapel[it.papel] = it; });
    itens.forEach(function (it) {
      var f = it.financeiro; if (it.documento !== 'os_oficina' || !f) return;
      it.os = { numero: f.os || '', veiculo: f.veiculo || '', sub: String(f.categoria || '').split(/\s*[›>]\s*/)[1] || 'Funilaria e pintura', situacao: f.situacao || '', fonte: f.fonte || '' };
      if (f.valor != null) it.valor = f.valor;
      if (f.parcelas > 1) it.parcelas = f.parcelas;
      if (f.data) it.data = f.data;
      if (f.estabelecimento) it.loja = f.estabelecimento;
      if (f.cnpj) it.cnpj = f.cnpj;
      var c = it.mesmaCompra != null && porPapel[it.mesmaCompra];
      if (c && c.documento !== 'os_oficina') {
        c.os = it.os; if (!(c.parcelas > 1) && it.parcelas > 1) c.parcelas = it.parcelas;
        if (it.cnpj && !c.cnpj) c.cnpj = it.cnpj; if (it.loja) c.lojaOS = it.loja; if (!c.loja) c.loja = it.loja;
        fora[it.papel] = 1;
      } else if (f.fonte !== 'comprovante') it.osLonge = true;   /* sem o pagamento: a data é a da emissão */
    });
    return itens.filter(function (it) { return !fora[it.papel]; });
  }
  /* o carro pelo nome do veículo da OS (uma palavra do apelido, sem número); sem o nome, o único carro ativo */
  function acharCarro(nome) {
    if (!window.Veiculos) return '';
    var at = Veiculos.ativos(), n = ' ' + norm(nome) + ' ';
    if (!n.trim()) return at.length === 1 ? at[0].id : '';
    var hit = at.filter(function (v) { return norm(v.apelido).split(' ').some(function (w) { return w.length >= 3 && !/^\d+$/.test(w) && n.indexOf(' ' + w + ' ') >= 0; }); });
    return hit.length === 1 ? hit[0].id : '';
  }
  function osPadrao(it) {
    if (!it || !it.os) return {};
    var d = { grupo: 'VEICULO', sub: it.os.sub, desc: (it.lojaOS || it.loja || tr('Oficina', 'Repair shop', 'Taller')) + (it.os.numero ? ' (OS ' + it.os.numero + ')' : '') }, v = acharCarro(it.os.veiculo);
    if (v) d.veiculoId = v;
    return d;
  }

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
  /* 1.2.0 (3.99): parcelado ("5X DE R$ 1.300,00"): o banco mostra a parcela "01/05" de valor ÷ parcelas (centavos de folga), da data
     do canhoto (o PAGAMENTO, nunca a da OS) até +3 dias */
  function parc1(g, n) { var p = Gasto.parcela ? (Gasto.parcela(g.descRobo || g.desc, g) || Gasto.parcela(g.desc, g)) : ''; return p === '1/' + n; }
  function candidatos(it) {
    var d = iso(it.data), ate = it.osLonge ? JANELA_OS : JANELA; if (!d || !(it.valor > 0)) return [];
    if (it.parcelas > 1) {
      var vp = n2(it.valor / it.parcelas);
      return Gasto.todos().filter(function (g) { var x = g.data ? dias(g.data, d) : -1; return g.fluxo === 'saida' && !g.divisao && !g.compraId && Math.abs((Number(g.valor) || 0) - vp) <= 0.05 && x >= 0 && x <= ate && parc1(g, it.parcelas); });
    }
    var usados = {}; pend().forEach(function (x) { if (x.gastoId) usados[x.gastoId] = 1; });
    var ok = function (g) { var x = g.data ? dias(g.data, d) : null; return Math.abs((Number(g.valor) || 0) - it.valor) < 0.005 && x !== null && (it.osLonge ? x >= 0 && x <= ate : Math.abs(x) <= JANELA); };
    return Gasto.todos().filter(function (g) { return g.fluxo === 'saida' && !usados[g.id] && !g.divisao && ok(g); })
      .concat(pend().filter(function (r) { return !r.doPrint && r.estado === 'pendente' && ok(r); }));
  }
  /* desempate: a hora, o final do cartão e a loja (1.3.0: e o CNPJ) */
  function pontos(it, g) {
    var p = 0;
    if (so(it.cnpj).length === 14 && g.contraparte && so(g.contraparte.cnpj) === so(it.cnpj)) p += 2;
    if (it.final && (g.finalCartao === it.final || (g.cartaoId && typeof Banco !== 'undefined' && String((Banco.acharCartao(g.cartaoId) || {}).fim) === it.final))) p += 2;
    if (it.loja && window.PrintColar && PrintColar.lojaParecida(it.loja, (g.contraparte && g.contraparte.nome) || g.descRobo || g.desc)) p += 2;
    if (it.hora && g.hora && g.hora === it.hora) p += 1;
    if (iso(it.data) === g.data) p += 1;
    return p;
  }

  /* 1.1.0 (3.96): ajuda na dúvida — no banco (postado ou pendente), o mesmo cartão/final, a data ±1 dia e o valor a até R$ 1,00
     de uma das opções ou com os mesmos reais e outros centavos (512,87 lido × 512,78 no banco). Hora, bandeira, tipo e final ordenam */
  function perto(it) {
    var d = iso(it.data), ops = (it.opcoes || []).concat(it.valor != null ? [it.valor] : []).map(Number).filter(function (v) { return v > 0; });
    if (it.parcelas > 1) ops = ops.map(function (v) { return n2(v / it.parcelas); });   /* 1.2.0 (3.99): parcelado: perto da parcela */
    if (!d || !ops.length) return [];
    var usados = {}; pend().forEach(function (x) { if (x.gastoId) usados[x.gastoId] = 1; });
    var fimDe = function (g) { return String(g.final || g.finalCartao || (g.cartaoId && typeof Banco !== 'undefined' ? (Banco.acharCartao(g.cartaoId) || {}).fim || '' : '')); };
    var ok = function (g) {
      var v = Number(g.valor) || 0;
      if (!(v > 0) || !g.data || Math.abs(dias(g.data, d)) > 1) return false;
      if (it.final && fimDe(g) && fimDe(g) !== String(it.final)) return false;
      return ops.some(function (o) { return Math.abs(v - o) <= 1.005 || Math.floor(v) === Math.floor(o); });
    };
    var extra = function (g) {
      var p = pontos(it, g), c = g.cartaoId && typeof Banco !== 'undefined' ? Banco.acharCartao(g.cartaoId) : null;
      if (it.bandeira && c && c.bandeira && String(c.bandeira).toLowerCase() === String(it.bandeira).toLowerCase()) p += 1;
      if (it.tipo === 'credito' && g.cartaoId) p += 1;
      if (it.tipo === 'debito' && !g.cartaoId) p += 1;
      return p;
    };
    var perto1 = function (g) { return Math.min.apply(null, ops.map(function (o) { return Math.abs((Number(g.valor) || 0) - o); })); };
    return Gasto.todos().filter(function (g) { return g.fluxo === 'saida' && !usados[g.id] && !g.divisao && ok(g); })
      .concat(pend().filter(function (r) { return !r.doPrint && r.estado === 'pendente' && ok(r); }))
      .sort(function (a, b) { return (extra(b) - extra(a)) || (perto1(a) - perto1(b)); }).slice(0, 3);
  }

  var API = {
    perto: perto,
    classificar: function (itens) {
      var out = { casou: [], parecido: [], novo: [], duvida: [] }, tomados = {}, papelVisto = {};
      (itens || []).forEach(function (it, i) {
        it._i = i;
        /* a mesma compra (o recibo e o canhoto) conta uma vez */
        if (it.mesmaCompra != null && papelVisto[it.arquivo + '#' + it.mesmaCompra]) return;
        papelVisto[it.arquivo + '#' + it.papel] = 1;
        /* 1.1.0 (3.96): valor com confiança 'baixa' (ou null com opções) nunca casa sozinho nem vem escolhido: vira dúvida,
           com o que foi lido como sugestão e o que o banco tem perto ("No banco tem R$ X nesse dia: é este?") */
        if (it.valor == null || (it.confianca && it.confianca.valor === 'baixa')) {
          if (it.valor != null && (it.opcoes || []).indexOf(it.valor) < 0) it = Object.assign({}, it, { opcoes: [it.valor].concat(it.opcoes || []) });
          out.duvida.push({ it: it, perto: API.perto(it) }); return;
        }
        var todos = candidatos(it), cs = todos.filter(function (g) { return !tomados[g.id]; });
        if (!cs.length) { out.novo.push({ it: it }); return; }
        cs.sort(function (a, b) { return pontos(it, b) - pontos(it, a); });
        /* único de verdade: o único com o valor e a data, ou o que ganha de TODOS no desempate (mesmo dos já tomados) */
        var unico = todos.length === 1 || todos.every(function (g) { return g === cs[0] || pontos(it, cs[0]) > pontos(it, g); });
        var alta = it.confianca && it.confianca.valor === 'alta';
        /* 1.3.0: a OS sem o pagamento (janela de 30 dias) só casa sozinha com a loja ou o CNPJ batendo */
        var perto = !it.osLonge || pontos(it, cs[0]) >= 2;
        if (alta && unico && perto) { tomados[cs[0].id] = 1; out.casou.push({ it: it, g: cs[0] }); }
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
      var itens = await (API._ler || lerComOS)(arquivos, { aviso: function (t) { if (temFundo) Fundo.passo(id, t); }, progresso: function (p) { if (temFundo) Fundo.passo(id, null, (Number(p) || 0) / 100); } });
      itens = juntarOS(itens);
      ultimo = { itens: itens, grupos: API.classificar(itens), arquivos: arquivos };
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
  function rot(it) { return [it.loja || tr('(loja não lida)', '(store not read)', '(tienda no leída)'), it.data, it.hora, it.final ? '••' + it.final : '', it.parcelas > 1 && it.valor ? it.parcelas + 'x ' + tr('de ', 'of ', 'de ') + fmt(n2(it.valor / it.parcelas)) : '',
    it.os ? '🔧 ' + [tr('OS', 'Work order', 'OT') + (it.os.numero ? ' ' + it.os.numero : ''), it.os.veiculo, it.os.situacao === 'orcamento' ? tr('orçamento (ainda não pago)', 'estimate (not paid yet)', 'presupuesto (aún no pagado)') : ''].filter(Boolean).join(' · ') : ''].filter(Boolean).join(' · '); }
  function nomeG(g) { return ((g.contraparte && g.contraparte.nome) || g.descRobo || g.desc || '') + ' · ' + I18n.data(g.data) + (g.pendente ? ' · ⏳ ' + tr('pendente no banco', 'pending at the bank', 'pendiente en el banco') : ''); }
  function classificacao(k, g0, it) {
    var gs = Object.keys(GRUPOS), g = Object.assign({}, g0, osPadrao(it));
    return '<div class="cn-class" data-k="' + k + '" hidden>' + (typeof recOpcoesPessoa === 'function' ? recOpcoesPessoa('cnPess' + k) : '') +
      '<div class="grid g2"><label class="field"><span>' + esc(tr('Para quem', 'For whom', 'Para quién')) + '</span><input data-cn="quem" list="cnPess' + k + '" value="' + esc(quemVer(g.paraQuem || '')) + '"></label>' +
      '<label class="field"><span>' + esc(tr('Grupo', 'Group', 'Grupo')) + '</span><select data-cn="grupo">' + gs.map(function (x) { return '<option value="' + x + '"' + (x === g.grupo ? ' selected' : '') + '>' + esc((GRUPOS[x].ico || '') + ' ' + GRUPOS[x].nome) + '</option>'; }).join('') + '</select></label>' +
      '<label class="field"><span>' + esc(tr('Categoria', 'Category', 'Categoría')) + '</span><input data-cn="sub" maxlength="60" value="' + esc(g.sub || '') + '"></label>' +
      (window.Veiculos && Veiculos.ativos().length ? '<label class="field"><span>' + esc(tr('Carro (se for do Veículo)', 'Car (if Vehicle)', 'Coche (si es Vehículo)')) + '</span><select data-cn="veiculo"><option value="">—</option>' +
        Veiculos.ativos().map(function (v) { return '<option value="' + esc(v.id) + '"' + (g.veiculoId === v.id ? ' selected' : '') + '>' + esc(v.apelido) + '</option>'; }).join('') + '</select></label>' : '') + '</div>' +
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
          '<button type="button" class="linkinho" data-acao="cn-classe" data-k="c' + i + '">' + esc(tr('classificar', 'classify', 'clasificar')) + '</button>' + classificacao('c' + i, x.g, x.it) + '</div>';
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
        var tomados = {}; gr.casou.forEach(function (y) { tomados[y.g.id] = 1; });
        return '<div class="cn-item" data-grupo="duvida" data-i="' + i + '" style="padding:6px 0;border-top:1px solid var(--line)">' + esc(rot(x.it)) +
          '<span class="t-sub">⚠️ ' + esc(tr('Leitura incerta: confira olhando o papel.', 'Unsure reading: check against the paper.', 'Lectura dudosa: compruébalo mirando el papel.')) + '</span>' +
          (x.perto || []).filter(function (g) { return !tomados[g.id]; }).map(function (g) {
            return '<div class="cn-perto" style="margin:4px 0">' + esc(tr('No banco tem ', 'The bank has ', 'En el banco hay ') + fmt(g.valor) + tr(' nesse dia: é este?', ' on that day: is it this one?', ' ese día: ¿es este?')) +
              '<span class="t-sub">' + esc(nomeG(g)) + '</span><button type="button" class="btn sm primary" data-acao="cn-perto" data-i="' + i + '" data-g="' + esc(g.id) + '">' + esc(tr('É este', 'This one', 'Es este')) + '</button></div>';
          }).join('') +
          ((x.it.opcoes || []).length ? '<span class="small muted">' + esc(tr('Pode ser: ', 'Could be: ', 'Puede ser: ')) + '</span>' : '') +
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
  function aplicar(g, d, partes, it) {
    var po = osPadrao(it); delete po.desc; d = Object.assign(po, d);   /* 1.3.0: o que a OS sabe (o que a pessoa escolheu vale mais) */
    if (it && it.hora && !g.hora && /^\d{2}:\d{2}$/.test(it.hora)) d = Object.assign({}, d, { hora: it.hora });   /* 1.1.1 (3.98): a hora do canhoto vai para o lançamento do banco sem hora */
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
    if (ehGasto && it && it.parcelas > 1) ficha(it, g, d);
  }
  /* 1.2.0 (3.99): o canhoto parcelado NÃO cria gasto: vira a ficha da compra (modulos/compra-parcelada.js), que enriquece todas
     as parcelas (as que já vieram e as que vierem) com a categoria, a pessoa, o carro, a descrição e a foto (cofre de arquivos) */
  function ficha(it, g, d) {
    if (!window.CompraParcelada) return null;
    var po = osPadrao(it), dd = { total: it.valor, n: it.parcelas, data: iso(it.data) || (g && g.data) || hojeISO(), hora: it.hora || '', loja: it.loja || '', final: it.final || '',
      cartaoId: (g && g.cartaoId) || (d && d.cartaoId) || '', grupo: (d && d.grupo) || po.grupo || (g && g.grupo !== 'OUTROS' ? g.grupo : ''), sub: (d && d.sub) || po.sub || (g && g.sub) || '',
      paraQuem: (d && d.paraQuem) || '', paraQuemId: (d && d.paraQuemId) || '', veiculoId: (d && d.veiculoId) || po.veiculoId || '', desc: po.desc || it.loja || '',
      cnpj: so(it.cnpj).length === 14 ? so(it.cnpj) : '', ate: it.osLonge ? JANELA_OS : 0 };
    var f = g && CompraParcelada.lista().find(function (x) { return (x.gastoIds || []).indexOf(g.id) >= 0; });
    if (f) { Object.keys(dd).forEach(function (k) { if (dd[k]) f[k] = dd[k]; }); CompraParcelada.ligar(f); }
    else f = CompraParcelada.criar(Object.assign(dd, g ? { gastoId: g.id } : {}));
    if (f && !f.docId) guardarFoto(f, it);
    return f;
  }
  function guardarFoto(f, it) {
    var arqs = (ultimo && ultimo.arquivos) || [], a = arqs.find(function (x) { return x && x.name === it.arquivo; }) || arqs[0];
    if (!a || !window.ArquivosFamilia || !a.arrayBuffer) return;
    a.arrayBuffer().then(function (buf) {
      return ArquivosFamilia.guardar({ nome: tr('canhoto ', 'receipt ', 'ticket ') + f.data + (f.loja ? ' ' + f.loja : ''), tipo: 'comprovante', ano: +f.data.slice(0, 4), ligado: f.id, mime: a.type || 'image/jpeg' }, new Uint8Array(buf));
    }).then(function (meta) { if (meta && meta.id) { f.docId = meta.id; CompraParcelada.ligar(f); Store.salvar(); } }).catch(function () { /* sem cofre: fica sem a foto */ });
  }
  function depois() { Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN(); }

  MoneyModulos.registrar({
    id: 'canhotos', versao: '1.3.0',
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
        var dc = { paraQuem: campo(r.c, 'quem'), grupo: campo(r.c, 'grupo') || g.grupo, sub: campo(r.c, 'sub') || g.sub }; if (campo(r.c, 'veiculo')) dc.veiculoId = campo(r.c, 'veiculo');
        aplicar(g, dc, partes, r.x.it);
        depois(); r.c.querySelector('.cn-class').hidden = true; toast(tr('Classificado no lançamento do banco.', 'Classified on the bank entry.', 'Clasificado en el movimiento del banco.'));
      },
      'cn-confirmar': function (el) {
        var r = item(el), id = campo(r.c, 'par'), g = id && alvo(id);
        var gr = ultimo.grupos; gr.parecido.splice(gr.parecido.indexOf(r.x), 1);
        if (g) { aplicar(g, {}, null, r.x.it); gr.casou.push({ it: r.x.it, g: g }); depois(); } else gr.novo.push({ it: r.x.it });
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
      /* 1.1.0 (3.96): a pessoa confirma o lançamento do banco perto do valor lido; o valor do banco vale */
      'cn-perto': function (el) {
        var r = item(el), g = alvo(el.dataset.g); if (!g) return;
        var gr = ultimo.grupos, it = Object.assign({}, r.x.it, { valor: n2(g.valor), confianca: Object.assign({}, r.x.it.confianca, { valor: 'conferido' }) });
        gr.duvida.splice(gr.duvida.indexOf(r.x), 1);
        aplicar(g, {}, null, it); gr.casou.push({ it: it, g: g }); depois(); mostrar();
      },
      'cn-amao': function (el) {
        var r = item(el), it = r.x.it, d = iso(it.data) || hojeISO();
        var po = osPadrao(it);
        Gasto.add({ data: d, valor: it.valor, desc: po.desc || it.loja || tr('Compra (canhoto)', 'Purchase (receipt)', 'Compra (ticket)'), grupo: po.grupo || 'OUTROS', sub: po.sub || '', veiculoId: po.veiculoId || undefined, fluxo: 'saida', cartaoId: campo(r.c, 'cartao') || undefined, hora: it.hora || '', origem: 'canhoto', forma: tr('manual (canhoto)', 'manual (receipt)', 'manual (ticket)'), editadoPessoa: true });
        ultimo.grupos.novo.splice(ultimo.grupos.novo.indexOf(r.x), 1); depois(); mostrar();
      },
      'cn-esperar': function (el) {
        var r = item(el), it = r.x.it, ct = campo(r.c, 'cartao');
        if (it.parcelas > 1 && window.CompraParcelada) {   /* 1.2.0 (3.99): parcelado: a ficha espera a parcela 01/N do banco */
          var f = ficha(it, null, { cartaoId: ct }); if (!f) return;
          ultimo.grupos.novo.splice(ultimo.grupos.novo.indexOf(r.x), 1); depois(); mostrar();
          return toast('⏳ ' + tr('Aguardando o banco: liga sozinho quando a parcela 01/', 'Waiting for the bank: links by itself when installment 01/', 'Esperando al banco: se vincula sola cuando aparezca la cuota 01/') + it.parcelas + tr(' aparecer.', ' shows up.', '.'));
        }
        if (!ct) return toast(tr('Escolha o cartão para esperar o banco.', 'Pick the card to wait for the bank.', 'Elige la tarjeta para esperar al banco.'), 'warn');
        pend().push({ id: 'pp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), doPrint: true, estado: 'pendente', pendente: true, vistoEm: hojeISO(), cartaoId: ct, final: it.final || '',
          valor: it.valor, data: iso(it.data) || hojeISO(), hora: it.hora || '', desc: it.loja || '', grupo: 'OUTROS', sub: '', fluxo: 'saida', obs: tr('do canhoto', 'from the receipt', 'del ticket') });
        ultimo.grupos.novo.splice(ultimo.grupos.novo.indexOf(r.x), 1); depois(); mostrar();
      }
    }
  });
  API.processar = processar; API.daPapel = daPapel; API.juntarOS = juntarOS;
  window.Canhotos = API;
})();
