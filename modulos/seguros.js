/* =====================================================================
   modulos/seguros.js — seguro: a apólice vira compromisso, com lembrete de renovação (3.73)        1.0.1 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 13/Nov/2026)
     · "🛡️ Seguro (apólice)" em Custos: lê a apólice (PDF com texto; foto ou PDF-imagem pelo OCR deste aparelho) ou
       preenche à mão: seguradora, nº da apólice, tipo, vigência, prêmio total e número de parcelas.
     · Ao guardar, vira um compromisso (as parcelas do prêmio, a partir do início da vigência) e fica a lista de seguros.
     · 30 dias antes do fim da vigência entra o lembrete "Renovar o seguro" no 📥 (e no cartão), até o dia do fim.
     · A leitura roda no Fundo (pílula, tela acesa, aviso antes de fechar). Nada sai do aparelho.
   API (window.Seguros)
     lista() · lerApolice(texto) → {seguradora, apolice, tipo, inicio, fim, premio, parcelas}
     salvar(dados, id) → s (cria ou atualiza o compromisso ligado) · renovar() → [s] (os que vencem em até 30 dias)
   DADOS
     Store.estado.seguros = [{id, nome, tipo: 'auto'|'residencial'|'vida'|'outro', seguradora, apolice, inicio, fim, premio,
       parcelas, recId}]   (cofre reservado: a coleção não é da casa)
   PONTOS QUE USA
     custos.topo · inbox.itens
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'seguros';
  var TIPOS = { auto: ['Auto', 'Car', 'VEICULO', 'Seguro Auto'], residencial: ['Residencial', 'Home', 'HABITACAO', 'Seguro residencial'],
    vida: ['Vida', 'Life', 'PESSOAL', 'Seguro de vida'], outro: ['Outro', 'Other', 'OUTROS', 'Seguro'] };
  var SEGURADORAS = [['Porto Seguro', /porto seguro/], ['Azul Seguros', /azul seguros/], ['Itaú Seguros', /itau seguros/], ['Bradesco Seguros', /bradesco seguros/],
    ['SulAmérica', /sul ?america/], ['Allianz', /allianz/], ['Tokio Marine', /tokio marine/], ['HDI', /\bhdi\b/], ['Yelum', /yelum|liberty/], ['Mapfre', /mapfre/],
    ['Zurich', /zurich/], ['Suhai', /suhai/], ['Youse', /youse/], ['Caixa Seguradora', /caixa seguradora/], ['MAG Seguros', /mongeral|\bmag seguros/]];
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function hoje() { return API._hoje || hojeISO(); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function br2iso(t) { var m = String(t || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
  function num(t) { var n = parseFloat(String(t || '').replace(/\./g, '').replace(',', '.')); return isNaN(n) ? 0 : n; }
  function dias(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5); }
  function mesMais(iso, n) { var d = new Date(iso.slice(0, 7) + '-01T12:00:00'); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 7); }

  var API = {
    _hoje: null,
    TIPOS: TIPOS,
    lista: lista,
    lerApolice: function (texto) {
      var t = String(texto || '').replace(/[ \t]+/g, ' '), x = N(t), r = { seguradora: '', apolice: '', tipo: 'outro', inicio: '', fim: '', premio: 0, parcelas: 1 };
      var s = SEGURADORAS.filter(function (p) { return p[1].test(x); })[0]; if (s) r.seguradora = s[0];
      var ap = t.match(/ap[oó]lice\s*(?:n[º°o.]*\s*)?:?\s*([\d][\d.\-\/]{4,})/i); if (ap) r.apolice = ap[1].replace(/[.\-\/]$/, '');
      var vg = t.match(/vig[eê]ncia[\s\S]{0,80}?(\d{2}\/\d{2}\/\d{4})[\s\S]{0,40}?(\d{2}\/\d{2}\/\d{4})/i);
      if (vg) { r.inicio = br2iso(vg[1]); r.fim = br2iso(vg[2]); }
      var pr = t.match(/pr[eê]mio\s+total[^0-9]{0,30}([\d.]+,\d{2})/i) || t.match(/pre[cç]o\s+total\s+do\s+seguro[^0-9]{0,30}([\d.]+,\d{2})/i) || t.match(/pr[eê]mio[^0-9]{0,30}([\d.]+,\d{2})/i);
      if (pr) r.premio = num(pr[1]);
      var pc = t.match(/(\d{1,2})\s*(?:x|parcelas?)\b/i); if (pc && Number(pc[1]) >= 1 && Number(pc[1]) <= 12) r.parcelas = Number(pc[1]);
      if (/autom[oó]v|ve[ií]culo|\bplaca\b|chassi/i.test(t)) r.tipo = 'auto';
      else if (/resid[eê]ncia|residencial|im[oó]vel segurado/i.test(t)) r.tipo = 'residencial';
      else if (/seguro de vida|\bvida\b/i.test(t)) r.tipo = 'vida';
      return r;
    },
    arruma: function (x) {
      var o = { tipo: TIPOS[x.tipo] ? x.tipo : 'outro', seguradora: String(x.seguradora || '').trim().slice(0, 60), apolice: String(x.apolice || '').trim().slice(0, 40),
        inicio: /^\d{4}-\d{2}-\d{2}$/.test(x.inicio || '') ? x.inicio : '', fim: /^\d{4}-\d{2}-\d{2}$/.test(x.fim || '') ? x.fim : '',
        premio: Math.round(Math.abs(num(String(x.premio).indexOf(',') >= 0 ? x.premio : String(x.premio || '').replace('.', ','))) * 100) / 100,
        parcelas: Math.min(12, Math.max(1, parseInt(x.parcelas, 10) || 1)) };
      o.nome = String(x.nome || '').trim().slice(0, 80) || [tr('Seguro', 'Insurance'), TIPOS[o.tipo][pt() ? 0 : 1], o.seguradora].filter(Boolean).join(' ');
      if (!o.inicio || !o.fim) throw new Error(tr('falta a vigência (início e fim)', 'missing the policy period (start and end)'));
      if (o.fim <= o.inicio) throw new Error(tr('o fim da vigência tem de ser depois do início', 'the end must be after the start'));
      if (!(o.premio > 0)) throw new Error(tr('falta o prêmio', 'missing the premium'));
      return o;
    },
    /* guarda o seguro e o compromisso das parcelas */
    salvar: function (dados, id) {
      var o = API.arruma(dados), s = id ? lista().filter(function (x) { return x.id === id; })[0] : null;
      if (!s) { s = { id: 'sg' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }; lista().push(s); }
      Object.assign(s, o);
      var ultimo = mesMais(o.inicio, o.parcelas - 1), dFim = new Date(Number(ultimo.slice(0, 4)), Number(ultimo.slice(5, 7)), 0).getDate();
      var rec = { nome: o.nome, valor: Math.round(o.premio / o.parcelas * 100) / 100, grupo: TIPOS[o.tipo][2], sub: TIPOS[o.tipo][3], regra: 'dia',
        dia: Number(o.inicio.slice(8, 10)), desde: o.inicio.slice(0, 7) + '-01', ate: ultimo + '-' + dFim,
        obs: [o.apolice ? tr('apólice ', 'policy ') + o.apolice : '', tr('vigência ', 'period ') + I18n.data(o.inicio) + ' – ' + I18n.data(o.fim),
          tr('prêmio ', 'premium ') + fmt(o.premio) + (o.parcelas > 1 ? ' (' + o.parcelas + 'x)' : '')].filter(Boolean).join(' · ') };
      var r = s.recId && Recorrente.achar(s.recId);
      if (r) Recorrente.atualizar(r.id, Object.assign({}, r, rec)); else s.recId = Recorrente.add(rec).id;
      return s;
    },
    renovar: function () {
      if (casa()) return [];
      return lista().filter(function (s) { var d = dias(hoje(), s.fim); return d >= 0 && d <= 30; });
    }
  };

  /* ---------- a tela (em Custos) ---------- */
  var editando = null, lido = null;
  function cx(rot, id, v, extra) { return campo(rot, '<input id="' + id + '" value="' + esc(v == null ? '' : v) + '"' + (extra || '') + '>'); }
  function form(s) {
    s = s || lido || { tipo: 'auto', parcelas: 1 };
    return '<div class="card sg-form" id="sgForm"><div class="card-head"><h3>🛡️ ' + esc(s.id ? tr('Editar seguro', 'Edit insurance') : tr('Novo seguro', 'New insurance')) + '</h3></div>' +
      (lido && !s.id ? '<p class="small">' + esc(tr('Lido da apólice: confira os campos e guarde.', 'Read from the policy: check the fields and save.')) + '</p>' : '') +
      '<input type="hidden" id="sgId" value="' + esc(s.id || '') + '">' +
      '<div class="grid g2">' + campo(tr('Tipo', 'Type'), '<select id="sgTipo">' + Object.keys(TIPOS).map(function (k) { return '<option value="' + k + '"' + (s.tipo === k ? ' selected' : '') + '>' + esc(TIPOS[k][pt() ? 0 : 1]) + '</option>'; }).join('') + '</select>') +
        cx(tr('Seguradora', 'Insurer'), 'sgSeg', s.seguradora) + cx(tr('Nº da apólice', 'Policy number'), 'sgApolice', s.apolice) + cx(tr('Nome', 'Name'), 'sgNome', s.id ? s.nome : '', ' placeholder="' + esc(tr('Seguro Auto', 'Car insurance')) + '"') +
        campo(tr('Início da vigência', 'Starts'), Cal.campo('sgIni', s.inicio || hoje(), {})) + campo(tr('Fim da vigência', 'Ends'), Cal.campo('sgFim', s.fim || '', {})) +
        cx(tr('Prêmio total (R$)', 'Total premium (R$)'), 'sgPremio', s.premio ? String(s.premio).replace('.', ',') : '', ' inputmode="decimal"') +
        cx(tr('Em quantas parcelas', 'Instalments'), 'sgParc', s.parcelas || 1, ' inputmode="numeric"') + '</div>' +
      '<p class="tiny muted">' + esc(tr('Vira um compromisso com as parcelas do prêmio. 30 dias antes do fim, o app lembra de renovar.', 'Becomes a commitment with the premium instalments. 30 days before the end, the app reminds you to renew.')) + '</p>' +
      '<div class="f-actions">' + (s.id ? '<button class="btn danger" data-acao="sg-excluir" data-id="' + esc(s.id) + '">' + esc(t('ac.excluir')) + '</button>' : '') +
      '<button class="btn" data-acao="sg-fechar">' + esc(t('ac.cancelar')) + '</button><button class="btn primary" data-acao="sg-salvar">' + esc(t('ac.salvar')) + '</button></div></div>';
  }
  function cartao() {
    if (casa()) return '';
    var l = lista(), ren = API.renovar();
    /* 1.0.1 (3.76): os botões foram para o "+ Adicionar" de Contas fixas; o arquivo continua aqui */
    var h = '<input type="file" id="sgArq" accept=".pdf,image/*" hidden>';
    if (ren.length) h += ren.map(function (s) { return '<div class="aviso-box sg-renovar"><b>🛡️ ' + esc(tr('Renovar o seguro: ', 'Renew the insurance: ') + s.nome) + '</b> <span class="small">' +
      esc(tr('a vigência acaba em ', 'it ends on ') + I18n.data(s.fim) + ' (' + dias(hoje(), s.fim) + tr(' dias)', ' days)')) + '</span></div>'; }).join('');
    if (l.length) h += '<div class="card sg-card"><div class="card-head"><h3>🛡️ ' + esc(tr('Seguros', 'Insurance')) + '</h3></div><table class="tbl"><tbody>' + l.map(function (s) {
      return '<tr class="linha-click" data-acao="sg-editar" data-id="' + esc(s.id) + '"><td><span class="t-main">' + esc(s.nome) + '</span><div class="t-sub">' +
        esc([s.apolice ? tr('apólice ', 'policy ') + s.apolice : '', I18n.data(s.inicio) + ' – ' + I18n.data(s.fim)].filter(Boolean).join(' · ')) + '</div></td>' +
        '<td class="num">' + fmt(s.premio) + '<div class="t-sub">' + esc(s.parcelas > 1 ? s.parcelas + 'x ' + fmt(s.premio / s.parcelas) : tr('à vista', 'single payment')) + '</div></td></tr>';
    }).join('') + '</tbody></table></div>';
    if (editando !== null) h += form(editando ? l.filter(function (x) { return x.id === editando; })[0] : null);
    return h;
  }
  async function ler(inp) {
    var a = inp.files && inp.files[0]; inp.value = ''; if (!a) return;
    var id = 'seguro-ler', temFundo = typeof Fundo !== 'undefined';
    if (temFundo) Fundo.comecar({ id: id, titulo: tr('Lendo a apólice…', 'Reading the policy…'), aoAbrir: function () { if (typeof abrirApp === 'function') abrirApp('budget'); if (typeof irPara === 'function') irPara('b-custos'); } });
    try {
      if (temFundo) Fundo.passo(id, tr('Lendo ', 'Reading ') + a.name + '…', 0.2);
      var txt = '';
      if (/^image\//.test(a.type)) { if (typeof Ocr !== 'undefined') txt = await Ocr.texto(a, function () {}); }
      else {
        txt = await PdfTexto.extrair(a, { linhas: true, aceitaVazio: true });
      }
      lido = API.lerApolice(txt);
      if (temFundo) { Fundo.terminar(id, tr('Apólice lida', 'Policy read')); Fundo.limpar(id); }
      if (!txt) toast(tr('Não deu para ler o texto da apólice: preencha à mão.', 'Could not read the policy text: fill in by hand.'), 'warn');
    } catch (e) {
      if (temFundo) Fundo.limpar(id); lido = null;
      toast(tr('Não consegui ler: preencha à mão.', 'Could not read it: fill in by hand.'), 'warn');
    }
    editando = ''; if (typeof render === 'function') render();
    setTimeout(function () { var f = document.getElementById('sgForm'); if (f) f.scrollIntoView({ block: 'center' }); }, 60);
  }
  document.addEventListener('change', function (e) { if (e.target && e.target.id === 'sgArq') ler(e.target); });

  MoneyModulos.registrar({
    id: 'seguros',
    versao: '1.0.1',
    colecoes: [COL],
    pontos: {
      'custos.topo': function () { return cartao(); },
      'custos.adicionar': function () {
        if (casa()) return [];
        return [{ ico: '🛡️', pt: 'Seguro (apólice)', en: 'Insurance (policy)', dpt: 'Leia a apólice (PDF ou foto) ou preencha: vira conta fixa e o app lembra de renovar.', den: 'Read the policy (PDF or photo) or fill it in: it becomes a fixed bill and the app reminds you to renew.', label: 'sgArq' },
          { ico: '🛡️', pt: 'Seguro, preencher à mão', en: 'Insurance, fill in by hand', dpt: 'Seguradora, vigência, prêmio e parcelas, sem arquivo.', den: 'Insurer, period, premium and instalments, no file.', acao: 'sg-novo' }];
      },
      'inbox.grupos': function () {   /* 1.0.1 (3.76): o aviso de renovar, em "Avisos do app" */
        var vis = (ST.config && ST.config.inboxVistos) || {}, l = API.renovar().filter(function (s) { return !vis['seguro|' + s.id + '|' + s.fim]; });
        return l.length ? [{ id: 'avisos', n: l.length, html: l.map(function (s) { return '<li class="inb-item"><div><b>🛡️ ' + esc(tr('Renovar o seguro: ', 'Renew the insurance: ') + s.nome) + '</b><span class="t-sub">' +
          esc(tr('a vigência acaba em ', 'it ends on ') + I18n.data(s.fim)) + '</span></div><span class="inb-acoes"><button class="btn sm" data-acao="inb-visto" data-k="' + esc('seguro|' + s.id + '|' + s.fim) + '">' + esc(tr('ok, entendi', 'ok, got it')) + '</button></span></li>'; }).join('') }] : [];
      },
      'inbox.itens': function () {
        return API.renovar().map(function (s) {
          return { tipo: 'atencao', ico: '🛡️', nome: tr('Renovar o seguro', 'Renew the insurance'), valor: s.premio, data: s.fim,
            sub: s.nome + tr(' — a vigência acaba em ', ' — it ends on ') + I18n.data(s.fim) };
        });
      }
    },
    acoes: {
      'sg-novo': function () { lido = null; editando = ''; render(); setTimeout(function () { var f = document.getElementById('sgForm'); if (f) f.scrollIntoView({ block: 'center' }); }, 60); },
      'sg-editar': function (el) { lido = null; editando = el.dataset.id; render(); },
      'sg-fechar': function () { lido = null; editando = null; render(); },
      'sg-salvar': function () {
        var v = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
        try {
          API.salvar({ tipo: v('sgTipo'), seguradora: v('sgSeg'), apolice: v('sgApolice'), nome: v('sgNome'), inicio: v('sgIni'), fim: v('sgFim'), premio: v('sgPremio'), parcelas: v('sgParc') }, v('sgId'));
        } catch (e) { toast(e.message, 'err'); return; }
        lido = null; editando = null; Store.salvar(); render(); toast(tr('Seguro guardado e compromisso criado.', 'Insurance saved and commitment created.'));
      },
      'sg-excluir': function (el) {
        var s = lista().filter(function (x) { return x.id === el.dataset.id; })[0];
        ST[COL] = lista().filter(function (x) { return x.id !== el.dataset.id; });
        if (s && s.recId) ST.recorrentes = Recorrente.todos().filter(function (r) { return r.id !== s.recId; });
        editando = null; Store.salvar(); render();
      }
    }
  });
  window.Seguros = API;
})();
