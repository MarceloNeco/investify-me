/* =====================================================================
   modulos/print-colar.js — "📋 Colar print": notificação do banco vira lançamento (3.87)        1.0.0 · 14/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 14/Nov/2026; sem IA)
     · Entradas: colar da área de transferência (Ctrl+V no computador; no celular o botão "Colar", com
       navigator.clipboard.read(), e se não der, escolher a imagem), escolher arquivo e, com o app instalado, o
       "Compartilhar" do Android (Web Share Target no manifest.json; o sw.js guarda a imagem num cache de passagem,
       'partilha-moneytrio', e abre ./?print=1; o app lê e apaga na hora). Em Lançamentos e no 📥.
     · Leitura por OCR NO APARELHO (Ocr.texto, o Tesseract de leitor/tesseract/, o mesmo motor do Leitor OCR; carregado só
       quando usado e guardado pelo sw.js), no módulo Fundo (barra de andamento, Wake Lock, não morre ao sair da tela).
     · Leitores de texto (itensDoTexto): notificação de compra ("Compra aprovada de R$ X em LOJA no dia DD/MM às HH:MM no
       seu cartão …"; a notificação cortada "R$ X em LOJA… HH:MM" também), Pix enviado, Pix recebido, comprovante de
       pagamento. Um print com várias notificações vira vários itens; o que não reconhecer, a pessoa completa à mão.
     · Prévia: cada item com valor, loja, data/hora, banco/cartão, quem pagou, categoria e "Dividir" (modulos/dividir.js).
     · Confirmado num cartão ou conta que o robô traz: vira "⏳ aguardando o banco" na lista das pré-autorizações
       (ST.cartao_pendentes, doPrint: true): entra no saldo previsto e na fatura, sem contar duas vezes, e não no "gastou".
     · Conciliação: chegou do robô o mesmo valor EXATO, data ±3 dias, mesmo cartão/conta e loja parecida (normalizada) →
       os dois viram um só: fica o lançamento do robô (o id dele) com a classificação, a divisão e a nota "conferido com o
       print". Loja diferente → 📥 "No banco veio como: …" e a pessoa confirma o par.
     · Conta que o robô não traz: a pessoa escolhe a conta e o item já vira lançamento ("manual (print)").
     · A imagem não é guardada, a não ser que a pessoa marque "guardar como comprovante" (ArquivosFamilia: no cofre,
       fechado com a chave da família).
   API (window.PrintColar)
     itensDoTexto(texto, hoje?) → [{tipo, valor, loja, data, hora, banco}] · processar(arquivos) · abrirPrevia(itens)
     conciliar() → n · pendentes() · lojaParecida(a, b)
   DADOS
     ST.cartao_pendentes += {id: 'pp_…', doPrint: true, estado: 'pendente'|'cobrado'|'tirado', cartaoId | contaSaldo, conta,
       desc, valor, data, hora, grupo, sub, quem, partes?, par?, parNao?, gastoId?}
   PONTOS QUE USA
     lancamentos.topo · inbox.topo · inbox.grupos ('confirmar') · evento gasto.novo · ações pc-*
   ===================================================================== */
(function () {
  'use strict';
  var JANELA = 3, LEMBRAR = 5;
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function hoje() { return API._hoje || hojeISO(); }
  function mais(iso, d) { var x = new Date(iso + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); }
  function dias(a, b) { return Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function num(t) { return Number(String(t || '').replace(/\./g, '').replace(',', '.')) || 0; }
  function cfg() { return (ST.config = ST.config || {}); }
  function lista() { return window.PreAut ? PreAut.lista() : (ST.cartao_pendentes = ST.cartao_pendentes || []); }
  function novoId() { return 'pp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ---------- os leitores de texto ---------- */
  var BANCOS = [['Itaú', /ita[uú]/i], ['Nubank', /nubank|\bnu\b/i], ['Bradesco', /bradesco/i], ['Santander', /santander/i], ['Caixa', /\bcaixa\b/i],
    ['Inter', /\binter\b/i], ['C6', /\bc6\b/i], ['BTG', /\bbtg\b/i], ['Banco do Brasil', /banco do brasil|\bbb\b/i], ['Sicoob', /sicoob/i], ['Sicredi', /sicredi/i],
    ['PicPay', /picpay/i], ['Mercado Pago', /mercado ?pago/i], ['XP', /\bxp\b/i]];
  var VALOR = /R\s?\$\s?(\d{1,3}(?:\.\d{3})*,\d{2})/g;
  function bancoDe(t) { var b = BANCOS.find(function (x) { return x[1].test(t); }); return b ? b[0] : ''; }
  function dataDe(t, h) {
    var m = t.match(/(\d{2})\/(\d{2})(?:\/(\d{2,4}))?/); if (!m) return '';
    var a = m[3] ? (m[3].length === 2 ? '20' + m[3] : m[3]) : h.slice(0, 4), iso = a + '-' + m[2] + '-' + m[1];
    if (!m[3] && iso > mais(h, 1)) iso = (+a - 1) + iso.slice(4);
    return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(iso) ? iso : '';
  }
  function limpaLoja(t) {
    return String(t || '').replace(/\s*(…|\.\.\.).*$/, '').replace(/\s+(no dia|às|as|no seu|no cart[aã]o|em \d|com o cart[aã]o|final \d|\d{1,2}:\d{2}).*$/i, '')
      .replace(/[,;.]+$/, '').replace(/\s+/g, ' ').trim().slice(0, 60);
  }
  /* um texto (de OCR ou colado) → os itens que dá para reconhecer */
  function itensDoTexto(texto, h) {
    h = h || hoje();
    var linhas = String(texto || '').replace(/\r/g, '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    var t = linhas.join(' ').replace(/R\s?5\s?(?=\d)/g, 'R$ ').replace(/RS\s(?=\d)/g, 'R$ ').replace(/\s+/g, ' ');
    var banco = bancoDe(t);
    /* o comprovante é um papel só */
    if (/comprovante/i.test(t) && !/compra aprovada/i.test(t)) {
      var mv = t.match(/valor(?: pago| total| do pagamento)?\s*:?\s*R\$\s?(\d{1,3}(?:\.\d{3})*,\d{2})/i) || t.match(/R\$\s?(\d{1,3}(?:\.\d{3})*,\d{2})/);
      var quem = '';
      linhas.some(function (l, i) {
        var m = l.match(/^(benefici[aá]rio|favorecido|destinat[aá]rio|recebedor|para|nome do recebedor|empresa)\s*:?\s*(.*)$/i);
        if (!m) return false; quem = m[2] || linhas[i + 1] || ''; return !!quem;
      });
      return mv ? [{ tipo: /pix/i.test(t) ? 'pix-env' : 'pagamento', valor: n2(num(mv[1])), loja: limpaLoja(quem), data: dataDe(t, h) || h, hora: (t.match(/\b(\d{2}:\d{2})\b/) || [])[1] || '', banco: banco }] : [];
    }
    var out = [], ms = [], m;
    VALOR.lastIndex = 0;
    while ((m = VALOR.exec(t))) ms.push({ i: m.index, fim: m.index + m[0].length, v: m[1] });
    ms.forEach(function (x, k) {
      var antes = t.slice(k ? ms[k - 1].fim : 0, x.i), depois = t.slice(x.fim, k + 1 < ms.length ? ms[k + 1].i : t.length);
      var seg = antes.slice(-80) + ' R$ ' + x.v + depois, it = { valor: n2(num(x.v)), banco: bancoDe(seg) || banco, hora: '' };
      var hm = depois.match(/[àa]s (\d{1,2})[:h](\d{2})/i) || depois.match(/\b(\d{1,2}):(\d{2})\b/) || antes.slice(-30).match(/\b(\d{1,2}):(\d{2})\b/);
      if (hm) it.hora = ('0' + hm[1]).slice(-2) + ':' + hm[2];
      it.data = dataDe(depois.match(/no dia (\d{2}\/\d{2}(?:\/\d{2,4})?)/i) ? depois.match(/no dia (\d{2}\/\d{2}(?:\/\d{2,4})?)/i)[1] : depois.slice(0, 60), h) || h;
      if (/pix recebido|recebeu (um )?pix|voc[eê] recebeu/i.test(antes.slice(-60) + ' ' + depois.slice(0, 30))) {
        it.tipo = 'pix-rec'; it.loja = limpaLoja((depois.match(/^\s*(?:de|do|da)\s+([^,.]+)/i) || antes.match(/(?:de|do|da)\s+([A-ZÀ-Ú][^,.]{2,40})\s*$/i) || [])[1]);
      } else if (/pix (enviado|realizado|feito|agendado|transferido)|voc[eê] (enviou|fez|pagou) (um )?pix|transfer[eê]ncia pix/i.test(antes.slice(-60) + ' ' + depois.slice(0, 30))) {
        it.tipo = 'pix-env'; it.loja = limpaLoja((depois.match(/^\s*(?:para|pra|a)\s+([^,.]+)/i) || [])[1]);
      } else {
        var lj = depois.match(/^\s*(?:em|no|na)\s+(.+)/i);
        if (!lj && !/compra|aprovad|d[ée]bito|cr[ée]dito/i.test(antes.slice(-60))) return;   /* um valor solto (saldo, limite): não é item */
        it.tipo = 'compra'; it.loja = limpaLoja(lj ? lj[1] : '');
      }
      out.push(it);
    });
    return out;
  }

  /* ---------- onde caiu: cartões e contas (o robô traz ou é à mão) ---------- */
  function cartaoDoRobo(c) { return Gasto.todos().some(function (g) { return g.cartaoId === c.id && (g.origem === 'robo' || g.idRobo); }); }
  function opcoes() {
    var o = [];
    (typeof Banco !== 'undefined' ? Banco.cartoes() : []).forEach(function (c) { var r = cartaoDoRobo(c); o.push({ k: (r ? 'c:' : 'mc:') + c.id, rot: '💳 ' + Banco.rotuloCartao(c.id) + (r ? '' : tr(' · à mão', ' · manual')), banco: c.apelido || '', robo: r, cartao: true }); });
    var sbs = (ST.saldos_banco || []).filter(function (x) { return x.tipo === 'conta'; });
    sbs.forEach(function (x) { o.push({ k: 'b:' + x.id, rot: '🏦 ' + (window.SaldoPrevisto && SaldoPrevisto.nome ? SaldoPrevisto.nome(x) : x.banco), banco: x.banco, robo: true }); });
    (typeof Banco !== 'undefined' ? Banco.todos() : []).forEach(function (b) {
      if (sbs.some(function (x) { return N(x.banco) === N(b.nome) || N(x.banco).split(' ')[0] === N(b.nome).split(' ')[0]; })) return;
      o.push({ k: 'm:' + b.id, rot: '🏦 ' + (b.apelido || b.nome) + tr(' · à mão', ' · manual'), banco: b.nome, robo: false });
    });
    o.push({ k: 'm:', rot: tr('✍️ Outra conta (lançar à mão)', '✍️ Another account (enter manually)'), banco: '', robo: false });
    return o;
  }
  function palpiteOnde(it, os) {
    var b = N(it.banco).split(' ')[0], cart = it.tipo === 'compra';
    var cand = os.filter(function (o) { return !!o.cartao === cart && b && N(o.banco + ' ' + o.rot).indexOf(b) >= 0; });
    return (cand.find(function (o) { return o.robo; }) || cand[0] || os.find(function (o) { return !!o.cartao === cart && o.robo; }) || os[0]).k;
  }
  /* a categoria: a regra da loja (modulos/loja-nova.js) ou o que a pessoa já usou para a mesma loja */
  function palpiteCat(it) {
    if (it.tipo === 'pix-rec') return { grupo: 'RENDA', sub: 'Pix recebido' };
    var k = window.Origem && it.loja ? 'd:' + Origem.chaveDesc(it.loja) : '';
    var r = k && window.LojaNova && LojaNova.regra(k); if (r) return { grupo: r.grupo, sub: r.sub, paraQuem: r.paraQuem };
    var g = it.loja && Gasto.todos().slice().reverse().find(function (x) { return x.grupo !== 'OUTROS' && lojaParecida(it.loja, x.descRobo || x.desc); });
    return g ? { grupo: g.grupo, sub: g.sub } : { grupo: 'OUTROS', sub: '' };
  }
  function tokens(t) { return (window.Profissionais ? Profissionais.norm(t) : N(t).split(' ')).filter(function (w) { return w.length >= 3 && !/^(compra|pag|pagto|pagamento|pix|ltda|eireli|me|sa|com|br)$/.test(w); }); }
  function lojaParecida(a, b) {
    var A = tokens(a), B = tokens(b); if (!A.length || !B.length) return false;
    var n = A.filter(function (w) { return B.some(function (x) { return x === w || (w.length >= 5 && x.length >= 5 && (x.indexOf(w) === 0 || w.indexOf(x) === 0)); }); }).length;
    return n / Math.min(A.length, B.length) >= 0.6;
  }

  /* ---------- ler: OCR no aparelho, no Fundo ---------- */
  var lido = null;   /* {itens, arquivos} até a pessoa confirmar ou fechar; a imagem nunca vai para o Store */
  async function processar(arquivos) {
    arquivos = [].slice.call(arquivos || []).filter(function (a) { return a && /^image\//.test(a.type || ''); });
    if (!arquivos.length) return toast(tr('Nenhuma imagem para ler. Copie o print e tente de novo, ou escolha a imagem.', 'No image to read. Copy the screenshot and try again, or pick the image.'), 'warn');
    var id = 'print-ler', temFundo = typeof Fundo !== 'undefined', itens = [];
    if (temFundo) Fundo.comecar({ id: id, titulo: tr('Lendo o print…', 'Reading the screenshot…'), aoAbrir: function () { if (lido) abrirPrevia(lido.itens); } });
    try {
      for (var i = 0; i < arquivos.length; i++) {
        if (temFundo) Fundo.passo(id, tr('Lendo o print ', 'Reading screenshot ') + (i + 1) + '/' + arquivos.length + '…', i / arquivos.length);
        var txt = await (API._ocr || lerImagem)(arquivos[i], function (m) { if (temFundo) Fundo.passo(id, m); });
        itens = itens.concat(itensDoTexto(txt));
      }
      lido = { itens: itens, arquivos: arquivos };
      if (temFundo) { Fundo.terminar(id, itens.length ? tr('Print lido: ', 'Screenshot read: ') + itens.length + tr(' item(ns)', ' item(s)') : tr('Print lido: complete à mão', 'Screenshot read: fill in by hand')); Fundo.limpar(id); }
      abrirPrevia(itens.length ? itens : [{ tipo: 'compra', valor: 0, loja: '', data: hoje(), hora: '', banco: '' }]);
    } catch (e) {
      if (temFundo) Fundo.limpar(id);
      toast(tr('Não deu para ler o print aqui. Complete à mão.', 'Could not read the screenshot here. Fill in by hand.'), 'warn');
      lido = { itens: [], arquivos: arquivos }; abrirPrevia([{ tipo: 'compra', valor: 0, loja: '', data: hoje(), hora: '', banco: '' }]);
    }
  }
  /* o Tesseract de leitor/tesseract/ só com o português, que também está lá: lê sem internet (o trabalhador, o núcleo e o
     idioma vêm do aparelho, guardados pelo sw.js) */
  async function lerImagem(arquivo, aviso) {
    var T = await Ocr.carregar(aviso);
    if (typeof T.createWorker !== 'function') return Ocr.texto(arquivo, aviso);
    if (aviso) aviso(tr('Preparando o leitor de texto…', 'Preparing the text reader…'));
    var w = await T.createWorker('por', 1, Object.assign(Ocr.opcoesTrabalhador('por'), { logger: function (m) { if (aviso && m.status === 'recognizing text') aviso(tr('Lendo o print… ', 'Reading the screenshot… ') + Math.round((m.progress || 0) * 100) + '%'); } }));
    try { var r = await w.recognize(arquivo); return (r && r.data && r.data.text) || ''; } finally { try { await w.terminate(); } catch (e) { /* já fechou */ } }
  }
  async function colar() {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) throw new Error('sem');
      var its = await navigator.clipboard.read(), fs = [];
      for (var i = 0; i < its.length; i++) { var tp = its[i].types.find(function (x) { return /^image\//.test(x); }); if (tp) fs.push(new File([await its[i].getType(tp)], 'print.png', { type: tp })); }
      if (!fs.length) throw new Error('vazio');
      processar(fs);
    } catch (e) { escolher(); }
  }
  function escolher() {
    var inp = document.getElementById('pcArquivo');
    if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true; inp.id = 'pcArquivo'; inp.hidden = true; document.body.appendChild(inp);
      inp.addEventListener('change', function () { var f = [].slice.call(inp.files || []); inp.value = ''; processar(f); }); }
    inp.click();
  }
  /* Ctrl+V com uma imagem, em Lançamentos ou com o 📥 aberto */
  document.addEventListener('paste', function (ev) {
    var fs = [].slice.call((ev.clipboardData && ev.clipboardData.files) || []).filter(function (f) { return /^image\//.test(f.type); });
    if (!fs.length) return;
    var inbox = document.getElementById('genBody') && document.getElementById('genBody').dataset.inbox === '1' && !document.getElementById('genModal').classList.contains('hidden');
    if (!inbox && (typeof viewAtual === 'undefined' || viewAtual !== 'b-lanc')) return;
    ev.preventDefault(); processar(fs);
  });
  /* o "Compartilhar" do Android: o sw.js guardou a imagem no cache de passagem e abriu ./?print=1 */
  async function compartilhado() {
    if (!/[?&]print=1\b/.test(location.search) || !window.caches) return;
    try {
      var c = await caches.open('partilha-moneytrio'), ks = await c.keys(), fs = [];
      for (var i = 0; i < ks.length; i++) { var r = await c.match(ks[i]); if (r) { var b = await r.blob(); fs.push(new File([b], 'print', { type: b.type || 'image/png' })); } await c.delete(ks[i]); }
      history.replaceState(null, '', location.pathname + location.hash);
      if (fs.length) processar(fs);
    } catch (e) { /* nada a ler */ }
  }
  setTimeout(compartilhado, 1500);

  /* ---------- a prévia ---------- */
  var TIPOS = { compra: ['🛒 Compra', '🛒 Purchase'], 'pix-env': ['↗ Pix enviado', '↗ Pix sent'], 'pix-rec': ['↘ Pix recebido', '↘ Pix received'], pagamento: ['🧾 Pagamento', '🧾 Payment'] };
  function abrirPrevia(itens) {
    var os = opcoes(), gs = Object.keys(GRUPOS);
    var bloco = function (it, k) {
      var cat = palpiteCat(it), onde = palpiteOnde(it, os), T = TIPOS[it.tipo] || TIPOS.compra;
      return '<div class="card pc-item" data-pck="' + k + '" data-tipo="' + esc(it.tipo || 'compra') + '" style="padding:10px;margin:0 0 10px">' +
        '<div class="row" style="justify-content:space-between"><b>' + esc(pt() ? T[0] : T[1]) + '</b><button type="button" class="icon-btn" data-acao="pc-tirar" aria-label="' + esc(tr('Tirar este item', 'Remove this item')) + '">✕</button></div>' +
        '<div class="grid g2">' +
        '<label class="field"><span>' + esc(tr('Valor (R$)', 'Amount (R$)')) + '</span><input data-pc="valor" inputmode="decimal" value="' + (it.valor ? String(it.valor).replace('.', ',') : '') + '"></label>' +
        '<label class="field"><span>' + esc(it.tipo === 'pix-rec' ? tr('De quem', 'From whom') : tr('Loja ou para quem', 'Store or payee')) + '</span><input data-pc="loja" maxlength="60" value="' + esc(it.loja || '') + '"></label>' +
        '<label class="field"><span>' + esc(tr('Data', 'Date')) + '</span><input data-pc="data" type="date" value="' + esc(it.data || hoje()) + '"></label>' +
        '<label class="field"><span>' + esc(tr('Hora', 'Time')) + '</span><input data-pc="hora" maxlength="5" inputmode="numeric" value="' + esc(it.hora || '') + '"></label>' +
        '<label class="field"><span>' + esc(tr('Banco ou cartão', 'Bank or card')) + '</span><select data-pc="onde">' + os.map(function (o) { return '<option value="' + esc(o.k) + '"' + (o.k === onde ? ' selected' : '') + '>' + esc(o.rot) + '</option>'; }).join('') + '</select></label>' +
        '<label class="field"><span>' + esc(tr('Quem pagou', 'Who paid')) + '</span><input data-pc="quem" list="pcPess" value=""></label>' +
        '<label class="field"><span>' + esc(tr('Grupo', 'Group')) + '</span><select data-pc="grupo">' + gs.map(function (g) { return '<option value="' + g + '"' + (g === cat.grupo ? ' selected' : '') + '>' + esc((GRUPOS[g].ico || '') + ' ' + GRUPOS[g].nome) + '</option>'; }).join('') + '</select></label>' +
        '<label class="field"><span>' + esc(tr('Categoria', 'Category')) + '</span><input data-pc="sub" maxlength="60" value="' + esc(cat.sub || '') + '"></label></div>' +
        (it.tipo !== 'pix-rec' ? '<p style="margin:4px 0"><button type="button" class="btn sm" data-acao="pc-dividir">✂️ ' + esc(tr('Dividir', 'Split')) + '</button></p><div class="pc-div" hidden></div>' : '') + '</div>';
    };
    $('#genTitle').textContent = tr('Conferir o print', 'Check the screenshot');
    $('#genBody').innerHTML = Verter.html('<p class="small muted" style="margin:0 0 8px">' + esc(tr('Confira cada item. Num cartão ou conta que o robô traz, ele fica "⏳ aguardando o banco" e vira um só com o lançamento do banco quando chegar; numa conta à mão, já vira lançamento.', 'Check each item. On a card or account the robot brings, it waits as "⏳ waiting for the bank" and merges with the bank entry when it arrives; on a manual account, it becomes an entry right away.')) + '</p>' +
      (typeof recOpcoesPessoa === 'function' ? recOpcoesPessoa('pcPess') : '') +
      '<div id="pcItens">' + itens.map(bloco).join('') + '</div>' +
      '<p><button type="button" class="btn sm" data-acao="pc-mais">+ ' + esc(tr('Item à mão', 'Item by hand')) + '</button></p>' +
      (lido && lido.arquivos && lido.arquivos.length ? '<label class="linha-check"><input type="checkbox" id="pcGuardar"> ' + esc(tr('Guardar o print como comprovante (no cofre, criptografado)', 'Keep the screenshot as a receipt (in the vault, encrypted)')) + '</label>' : '') +
      '<div class="f-actions"><button class="btn" data-acao="pc-cancelar">' + esc(t('ac.cancelar')) + '</button><button class="btn primary" data-acao="pc-lancar">' + esc(tr('Lançar', 'Add')) + '</button></div>');
    delete $('#genBody').dataset.inbox;
    abrir('genModal');
    API._bloco = bloco;
  }
  function lerItem(el) {
    var v = function (k) { var e = el.querySelector('[data-pc="' + k + '"]'); return e ? String(e.value || '').trim() : ''; };
    var it = { tipo: el.dataset.tipo, valor: n2(num(v('valor'))), loja: v('loja'), data: /^\d{4}-\d{2}-\d{2}$/.test(v('data')) ? v('data') : hoje(), hora: v('hora'), onde: v('onde'), quem: v('quem'), grupo: v('grupo'), sub: v('sub') };
    var b = el.querySelector('.pc-div:not([hidden]) [data-dvbloco]');
    if (b && window.Divisao) { var r = Divisao.ler(b.dataset.dvbloco, it.valor); if (r.erro) it.erroDiv = r.erro; else it.partes = r.partes; }
    return it;
  }
  function lancar(it) {
    var o = opcoes().find(function (x) { return x.k === it.onde; }) || { k: 'm:', robo: false, banco: '' }, tipo = o.k.split(':')[0], ref = o.k.slice(tipo.length + 1);
    var entra = it.tipo === 'pix-rec';
    var base = { data: it.data, valor: it.valor, desc: it.loja || (TIPOS[it.tipo] || TIPOS.compra)[pt() ? 0 : 1].replace(/^\S+ /, ''), grupo: it.grupo || 'OUTROS', sub: it.sub || '', quem: it.quem, fluxo: entra ? 'entrada' : 'saida', hora: it.hora,
      obs: tr('do print', 'from screenshot') + (it.hora ? ' ' + it.hora : '') };
    if (window.Pessoas) Pessoas.ligar(base, 'quem', 'quemId');
    if (o.robo) {
      var p = Object.assign({}, base, { id: novoId(), doPrint: true, estado: 'pendente', pendente: true, vistoEm: hoje(), partes: it.partes || null });
      if (tipo === 'c') p.cartaoId = ref; else { var sb = (ST.saldos_banco || []).find(function (x) { return x.id === ref; }); p.contaSaldo = ref; p.conta = sb ? sb.banco : ''; }
      lista().push(p); return { pendente: p };
    }
    var b = tipo === 'm' && ref && typeof Banco !== 'undefined' ? Banco.achar(ref) : null;
    var g = Gasto.add(Object.assign({}, base, tipo === 'mc' ? { cartaoId: ref } : { conta: b ? (b.apelido || b.nome) : '' }, { origem: 'print', forma: tr('manual (print)', 'manual (screenshot)'), editadoPessoa: true }));
    if (it.partes && window.Divisao) Divisao.aplicar(g.id, it.partes);
    return { gasto: g };
  }

  /* ---------- conciliação com o lançamento do robô ---------- */
  function mesmoLugar(p, g) {
    if (p.cartaoId) return g.cartaoId === p.cartaoId;
    var a = N(p.conta).split(' ')[0]; return !!a && !g.cartaoId && N(g.conta).split(' ')[0] === a;
  }
  function candidatos(p) {
    var usados = {}; lista().forEach(function (x) { if (x.gastoId) usados[x.gastoId] = 1; });
    return Gasto.todos().filter(function (g) {
      return (g.origem === 'robo' || g.idRobo) && !usados[g.id] && !g.divisao && (g.fluxo === 'entrada') === (p.fluxo === 'entrada') &&
        Math.abs((Number(g.valor) || 0) - p.valor) < 0.005 && Math.abs(dias(g.data, p.data)) <= JANELA && mesmoLugar(p, g) && !(p.parNao || {})[g.id];
    });
  }
  function unir(p, g) {
    var d = { grupo: p.grupo || g.grupo, sub: p.sub || g.sub, obs: [g.obs, tr('conferido com o print', 'checked against the screenshot')].filter(Boolean).join(' · '), editadoPessoa: true, confirmadoEm: new Date().toISOString(), revisar: false };
    if (p.quem) { d.quem = p.quem; if (p.quemId) d.quemId = p.quemId; }
    Gasto.atualizar(g.id, d);
    var n = Gasto.todos().find(function (x) { return x.id === g.id; }); if (n) delete n.confianca;
    if (p.partes && window.Divisao) Divisao.aplicar(g.id, p.partes);
    p.estado = 'cobrado'; p.gastoId = g.id; p.saiuEm = hoje(); delete p.par;
  }
  function conciliar() {
    var n = 0;
    lista().filter(function (p) { return p.doPrint && p.estado === 'pendente'; }).forEach(function (p) {
      var cs = candidatos(p); if (!cs.length) { delete p.par; return; }
      var igual = cs.find(function (g) { return lojaParecida(p.desc, (g.contraparte && g.contraparte.nome) || g.descRobo || g.desc); });
      if (igual) { unir(p, igual); n++; } else if (p.par !== cs[0].id) { p.par = cs[0].id; n++; }
    });
    return n;
  }
  function pendentes() { return lista().filter(function (p) { return p.doPrint && p.estado === 'pendente'; }); }

  function botoes() {
    return '<button type="button" class="btn sm" data-acao="pc-colar">📋 ' + esc(tr('Colar print', 'Paste screenshot')) + '</button>' +
      '<button type="button" class="btn sm" data-acao="pc-escolher">🖼️ ' + esc(tr('Escolher imagem', 'Pick image')) + '</button>';
  }
  function depois() { Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN(); }

  var API = {
    _hoje: null, _ocr: null,
    itensDoTexto: itensDoTexto, processar: processar, abrirPrevia: abrirPrevia, conciliar: conciliar, pendentes: pendentes, lojaParecida: lojaParecida, opcoes: opcoes,
    /* o saldo previsto: o Pix/pagamento de uma conta do robô ainda não entregue sai amanhã (já aconteceu no banco) */
    eventos: function (conta) {
      return pendentes().filter(function (p) { return p.contaSaldo === conta.id; }).map(function (p) { return { data: mais(hoje(), 1), valor: n2(p.fluxo === 'entrada' ? p.valor : -p.valor), nome: '⏳ ' + p.desc }; });
    }
  };

  MoneyModulos.registrar({
    id: 'print-colar', versao: '1.0.0',
    pontos: {
      'lancamentos.topo': function () {
        if (conciliar()) Store.salvar();
        return '<div class="row pc-topo" style="gap:8px;flex-wrap:wrap;margin:0 0 8px">' + botoes() + '<span class="tiny muted">' + esc(tr('a notificação do banco vira lançamento (lido no aparelho)', 'the bank notification becomes an entry (read on this device)')) + '</span></div>';
      },
      'inbox.topo': function () { return '<div class="row pc-topo" style="gap:8px;flex-wrap:wrap;margin:0 0 10px">' + botoes() + '</div>'; },
      'inbox.grupos': function () {
        if (conciliar()) Store.salvar();
        var h = '', n = 0;
        pendentes().forEach(function (p) {
          var g = p.par && Gasto.todos().find(function (x) { return x.id === p.par; });
          if (g) {
            n++; h += '<li class="inb-item"><div><b>📋 ' + esc(p.desc + ' · ' + fmt(p.valor) + ' (' + I18n.data(p.data) + ')') + '</b><span class="t-sub">' + esc(tr('No banco veio como: ', 'At the bank it came as: ') + ((g.contraparte && g.contraparte.nome) || g.descRobo || g.desc) + ' · ' + I18n.data(g.data)) + '</span></div>' +
              '<span class="inb-acoes"><button class="btn sm primary" data-acao="pc-par" data-id="' + esc(p.id) + '">' + esc(tr('É o mesmo', 'Same one')) + '</button><button class="btn sm" data-acao="pc-parnao" data-id="' + esc(p.id) + '">' + esc(tr('Não é', 'Not it')) + '</button></span></li>';
          } else if (dias(hoje(), p.vistoEm) >= LEMBRAR) {
            n++; h += '<li class="inb-item"><div><b>⏳ ' + esc(p.desc + ' · ' + fmt(p.valor) + tr(': o banco ainda não mandou', ': the bank has not sent it yet')) + '</b><span class="t-sub">' + esc(tr('do print de ', 'from the screenshot of ') + I18n.data(p.data)) + '</span></div>' +
              '<span class="inb-acoes"><button class="btn sm" data-acao="pc-amao" data-id="' + esc(p.id) + '">' + esc(tr('Lançar à mão', 'Enter manually')) + '</button><button class="btn sm" data-acao="pc-desistir" data-id="' + esc(p.id) + '">' + esc(tr('Tirar', 'Remove')) + '</button></span></li>';
          }
        });
        return n ? [{ id: 'confirmar', n: n, html: h }] : [];
      }
    },
    ouvir: { 'gasto.novo': function (g) { if (g && (g.origem === 'robo' || g.idRobo) && pendentes().length) setTimeout(function () { if (conciliar()) Store.salvar(); }, 0); } },
    acoes: {
      'pc-colar': function () { colar(); },
      'pc-escolher': function () { escolher(); },
      'pc-cancelar': function () { lido = null; fechar('genModal'); },
      'pc-tirar': function (el) { el.closest('.pc-item').remove(); },
      'pc-mais': function () { var c = document.getElementById('pcItens'), k = c.children.length; c.insertAdjacentHTML('beforeend', Verter.html(API._bloco({ tipo: 'compra', valor: 0, loja: '', data: hoje(), hora: '', banco: '' }, k + 100))); },
      'pc-dividir': function (el) {
        var it = el.closest('.pc-item'), box = it.querySelector('.pc-div'), v = n2(num(it.querySelector('[data-pc="valor"]').value));
        if (!box.hidden) { box.hidden = true; box.innerHTML = ''; return; }
        if (!(v > 0)) return toast(tr('Diga o valor antes de dividir.', 'Enter the amount before splitting.'), 'warn');
        var loja = it.querySelector('[data-pc="loja"]').value, k = window.Origem && loja ? 'd:' + Origem.chaveDesc(loja) : '';
        box.innerHTML = Verter.html(Divisao.blocoHtml('pcd' + it.dataset.pck, v, [{ valor: v, grupo: it.querySelector('[data-pc="grupo"]').value, sub: it.querySelector('[data-pc="sub"]').value }, { valor: 0 }], k));
        box.hidden = false; Divisao.somarTodos();
      },
      'pc-lancar': async function () {
        var els = [].slice.call(document.querySelectorAll('#pcItens .pc-item')), its = els.map(lerItem).filter(function (x) { return x.valor > 0; });
        if (!its.length) return toast(tr('Nada para lançar: diga ao menos o valor.', 'Nothing to add: enter at least the amount.'), 'warn');
        var ruim = its.find(function (x) { return x.erroDiv; }); if (ruim) return toast(ruim.erroDiv, 'warn');
        var feitos = its.map(lancar), np = feitos.filter(function (f) { return f.pendente; }).length;
        var guardar = document.getElementById('pcGuardar') && document.getElementById('pcGuardar').checked;
        if (guardar && lido && lido.arquivos && window.ArquivosFamilia) {
          var lig = feitos[0].gasto ? feitos[0].gasto.id : feitos[0].pendente.id;
          for (var i = 0; i < lido.arquivos.length; i++) { try { await ArquivosFamilia.guardar({ nome: 'print ' + its[0].data + (i ? ' (' + (i + 1) + ')' : ''), tipo: 'comprovante', ano: +its[0].data.slice(0, 4), ligado: lig, mime: lido.arquivos[i].type }, new Uint8Array(await lido.arquivos[i].arrayBuffer())); } catch (e) { toast(tr('Não deu para guardar o comprovante.', 'Could not keep the receipt.'), 'warn'); } }
        }
        lido = null; conciliar(); fechar('genModal'); depois();
        toast(its.length + tr(' item(ns) do print: ', ' screenshot item(s): ') + (np ? np + tr(' aguardando o banco', ' waiting for the bank') : '') + (np && np < its.length ? ' · ' : '') + (its.length - np ? (its.length - np) + tr(' lançado(s)', ' added') : ''));
      },
      'pc-par': function (el) { var p = lista().find(function (x) { return x.id === el.dataset.id; }), g = p && Gasto.todos().find(function (x) { return x.id === p.par; }); if (p && g) { unir(p, g); depois(); } },
      'pc-parnao': function (el) { var p = lista().find(function (x) { return x.id === el.dataset.id; }); if (!p) return; (p.parNao = p.parNao || {})[p.par] = 1; delete p.par; depois(); },
      'pc-amao': function (el) {
        var p = lista().find(function (x) { return x.id === el.dataset.id; }); if (!p) return;
        var g = Gasto.add({ data: p.data, valor: p.valor, desc: p.desc, grupo: p.grupo, sub: p.sub, quem: p.quem, quemId: p.quemId, fluxo: p.fluxo, cartaoId: p.cartaoId, conta: p.conta, origem: 'print', forma: tr('manual (print)', 'manual (screenshot)'), obs: p.obs, editadoPessoa: true });
        if (p.partes && window.Divisao) Divisao.aplicar(g.id, p.partes);
        p.estado = 'cobrado'; p.gastoId = g.id; depois();
      },
      'pc-desistir': function (el) { var p = lista().find(function (x) { return x.id === el.dataset.id; }); if (p) { p.estado = 'tirado'; depois(); } }
    }
  });
  window.PrintColar = API;
})();
