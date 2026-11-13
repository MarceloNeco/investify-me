/* =====================================================================
   modulos/profissionais.js — profissionais conhecidos (N39)        1.2.1 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     Reconhece o mesmo médico, dentista, pediatra, escola… no extrato pelo nome, SEM IA:
     tira acentos, palavras de banco (PIX, TED, PAGAMENTO…), sufixos de empresa (LTDA, ME, S/A…),
     números, e compara palavra por palavra, aceitando 1 letra trocada nas palavras de 5 letras ou mais.
     · Nome que já foi confirmado → o lançamento é classificado sozinho (grupo, categoria, para quem é,
       IR). Nunca mais pergunta.
     · Nome novo de saúde/educação, ou parecido mas sem certeza → aparece em Custos → Revisar, em
       "Profissionais para confirmar", uma vez por nome (não por lançamento).
     · 1.1.0 (3.64): "para quem é" é o BENEFICIÁRIO (paraQuem + paraQuemId, a pessoa do cadastro); quem pagou continua
       vindo da conta. Outra pessoa da casa pagar o mesmo profissional muda só o "quem pagou"; categoria e beneficiário seguem.
       Os classificados antes (o "quem" tinha virado o beneficiário) passam o nome para "Para quem" uma vez.
     · 1.2.0 (3.65): ao confirmar, o profissional aprende o CNPJ / id da outra parte dos lançamentos (cnpjs, idps);
       daí em diante é reconhecido por eles mesmo que o nome no banco mude (modulos/contraparte.js).
   API (window.Profissionais)
     norm(texto)               → palavras que contam do nome (array)
     parecido(a, b)            → 0..1 (palavras iguais ou com 1 letra de diferença, sobre a maior)
     achar(texto)              → {p, nota} do profissional mais parecido, ou null
     classificar(g)            → 'aplicado' | 'pergunta' | ''   (e aplica no lançamento, se for o caso)
     confirmar(chave, dados)   → cria ou junta o profissional e classifica todos os lançamentos com esse nome
     ignorar(chave)            → "não é profissional": não pergunta mais
     perguntas()               → [{chave, exemplo, n, total, sugestao}] (um por nome)
   DADOS
     Store.estado.profissionais = [{id, nome, apelidos: [chave], grupo, sub, paraQuem, paraQuemId, irpf}  |  {id, ignorar: true, apelidos}]
     (quem = o nome antigo do campo, lido como paraQuem)
     (chave = as palavras normalizadas do nome no extrato, juntas por espaço)
   PONTOS QUE USA
     evento gasto.novo · custos.revisar (cartão das perguntas) · tela b-profissionais · ações prof-*
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'profissionais';
  var SURE = 0.8, TALVEZ = 0.5;
  var LIXO = { pix: 1, ted: 1, doc: 1, tef: 1, enviado: 1, enviada: 1, recebido: 1, pagamento: 1, pagto: 1, pgto: 1, pag: 1, compra: 1, cartao: 1, debito: 1, credito: 1,
    transferencia: 1, transf: 1, boleto: 1, para: 1, de: 1, da: 1, do: 1, dos: 1, das: 1, e: 1, em: 1, ltda: 1, me: 1, mei: 1, eireli: 1, sa: 1, cia: 1, epp: 1, ss: 1,
    servicos: 1, servico: 1, cpf: 1, cnpj: 1, conta: 1, ag: 1, banco: 1, nu: 1, pagamentos: 1, ip: 1, inst: 1 };
  var TITULOS = { dr: 1, dra: 1, doutor: 1, doutora: 1, prof: 1, profa: 1, sr: 1, sra: 1 };
  var DICAS = /\b(dr|dra|doutor|doutora|clinica|consultorio|odonto|dentista|psicolog|psiquiatr|fisio|fono|pediatr|nutri|terapia|laborator|hospital|medic|ortodont|oftalmo|dermato|escola|colegio|faculdade|curso)/;
  function pt() { return I18n.atual === 'pt'; }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function semAcento(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  function lev(a, b) {          /* distância de edição, só até 2 (o que interessa) */
    if (Math.abs(a.length - b.length) > 1) return 2;
    var m = a.length, n = b.length, ant = [], cur = [], i, j;
    for (j = 0; j <= n; j++) ant[j] = j;
    for (i = 1; i <= m; i++) {
      cur = [i];
      for (j = 1; j <= n; j++) cur[j] = Math.min(ant[j] + 1, cur[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      ant = cur;
    }
    return ant[n];
  }
  function igual(a, b) { return a === b || (a.length >= 5 && b.length >= 5 && lev(a, b) <= 1); }

  var API = {
    norm: function (t) {
      return semAcento(t).replace(/s\/a\b/g, ' sa ').split(/[^a-z0-9]+/)
        .filter(function (w) { return w.length >= 2 && !LIXO[w] && !TITULOS[w] && !/\d/.test(w); });
    },
    chave: function (t) { return API.norm(t).join(' '); },
    parecido: function (a, b) {
      var A = Array.isArray(a) ? a : API.norm(a), B = Array.isArray(b) ? b : API.norm(b);
      if (!A.length || !B.length) return 0;
      var usados = {}, n = 0;
      A.forEach(function (w) { for (var i = 0; i < B.length; i++) if (!usados[i] && igual(w, B[i])) { usados[i] = 1; n++; return; } });
      return n / Math.max(A.length, B.length);
    },
    textoDe: function (g) { return String(g.desc || '').trim() || g.sub || ''; },
    achar: function (texto) {
      var w = API.norm(texto); if (!w.length) return null;
      var melhor = null;
      lista().forEach(function (p) {
        (p.apelidos || []).forEach(function (ap) {
          var n = API.parecido(w, ap.split(' '));
          if (!melhor || n > melhor.nota) melhor = { p: p, nota: n };
        });
      });
      return melhor && melhor.nota > 0 ? melhor : null;
    },
    pareceProfissional: function (g) {
      return g.fluxo !== 'entrada' && (g.grupo === 'SAUDE' || g.grupo === 'DEPENDENTES' || DICAS.test(semAcento(g.desc + ' ' + g.sub)));
    },
    aplicar: function (g, p) {
      var muda = {};
      ['grupo', 'sub'].forEach(function (k) { if (p[k] && g[k] !== p[k]) muda[k] = p[k]; });
      var benef = p.paraQuem || p.quem || '';
      if (benef && g.paraQuem !== benef) { muda.paraQuem = benef; if (p.paraQuemId) muda.paraQuemId = p.paraQuemId; }
      if (p.irpf != null && !!g.irpf !== !!p.irpf) muda.irpf = !!p.irpf;
      if (!Object.keys(muda).length) return false;
      muda.profissional = p.id;
      /* no próprio objeto (quem acabou de criar o lançamento continua com a referência certa) */
      Object.assign(g, muda); g.fluxo = (GRUPOS[g.grupo] || GRUPOS.OUTROS).fluxo; Gasto._idx = null;
      if (window.Pessoas) Pessoas.ligar(g, 'paraQuem', 'paraQuemId');
      return true;
    },
    classificar: function (g) {
      if (!g || !g.desc || g.fluxo === 'entrada' || g.editadoPessoa) return '';
      var a = API.achar(API.textoDe(g));
      if (a && a.nota >= SURE) {
        if (a.p.ignorar) return '';
        return API.aplicar(g, a.p) ? 'aplicado' : '';
      }
      return (a && a.nota >= TALVEZ) || API.pareceProfissional(g) ? 'pergunta' : '';
    },
    /* um por nome, dos últimos 12 meses */
    perguntas: function (hoje) {
      hoje = String(hoje || hojeISO());
      var de = (Number(hoje.slice(0, 4)) - 1) + hoje.slice(4), por = {};
      Gasto.todos().forEach(function (g) {
        if (!g.data || g.data < de || g.fluxo === 'entrada' || !g.desc) return;
        var c = API.chave(API.textoDe(g)); if (!c) return;
        var a = por[c] ? por[c].achado : API.achar(c);
        if (a && a.nota >= SURE) return;                                   /* já conhecido (ou ignorado) */
        var x = por[c] || (por[c] = { chave: c, exemplo: g, n: 0, total: 0, achado: a, vale: false, sugestao: a && a.nota >= TALVEZ && !a.p.ignorar ? a.p : null });
        x.n++; x.total += g.valor;
        /* o nome inteiro conta: basta UM lançamento dele parecer de profissional (ex.: um tem "DRA", outro não) */
        if ((a && a.nota >= TALVEZ) || API.pareceProfissional(g)) x.vale = true;
        if ((g.data || '') > (x.exemplo.data || '')) x.exemplo = g;
      });
      return Object.keys(por).map(function (k) { return por[k]; }).filter(function (x) { return x.vale; })
        .sort(function (a, b) { return b.total - a.total; });
    },
    confirmar: function (chave, d) {
      var p = d.id ? lista().find(function (x) { return x.id === d.id; }) : null;
      if (!p) {
        p = { id: 'pr' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), nome: String(d.nome || chave).trim().slice(0, 80),
              apelidos: [], grupo: d.grupo || 'SAUDE', sub: String(d.sub || '').trim(), irpf: !!d.irpf };
        lista().push(p);
      }
      var benef = String(d.paraQuem != null ? d.paraQuem : (d.quem || '')).trim();
      if (benef || !p.paraQuem) { p.paraQuem = benef; delete p.quem; if (window.Pessoas) Pessoas.ligar(p, 'paraQuem', 'paraQuemId'); }
      if (p.apelidos.indexOf(chave) < 0) p.apelidos.push(chave);
      var n = 0;
      Gasto.todos().slice().forEach(function (g) {
        if (API.parecido(API.norm(API.textoDe(g)), chave.split(' ')) < SURE) return;
        if (window.Contraparte) Contraparte.aprender(g, p);   /* 1.2.0: o CNPJ / id da outra parte entra no profissional */
        if (!g.editadoPessoa && API.aplicar(g, p)) n++;
      });
      return { p: p, n: n };
    },
    ignorar: function (chave) {
      var p = lista().find(function (x) { return x.ignorar; });
      if (!p) { p = { id: 'prign', ignorar: true, apelidos: [] }; lista().push(p); }
      if (p.apelidos.indexOf(chave) < 0) p.apelidos.push(chave);
    }
  };

  function cartaoPerguntas() {
    var q = API.perguntas();
    var conhecidos = lista().filter(function (p) { return !p.ignorar; });
    if (!q.length && !conhecidos.length) return '';
    var opcoes = function (sel) {
      return '<option value="">' + (pt() ? '— novo profissional —' : '— new professional —') + '</option>' + conhecidos.map(function (p) {
        return '<option value="' + esc(p.id) + '"' + (sel && sel.id === p.id ? ' selected' : '') + '>' + esc(p.nome + ' (' + [p.sub, p.paraQuem || p.quem].filter(Boolean).join(' · ') + ')') + '</option>';
      }).join('');
    };
    var h = '<div class="card prof-card"><div class="card-head"><h3>🩺 ' + (pt() ? 'Profissionais para confirmar' : 'Professionals to confirm') + (q.length ? ' <b>' + q.length + '</b>' : '') + '</h3>' +
      '<button class="linkinho" data-irpara="b-profissionais">' + (pt() ? 'conhecidos (' + conhecidos.length + ') ›' : 'known (' + conhecidos.length + ') ›') + '</button></div>';
    if (!q.length) return h + '<p class="small muted" style="margin:0">' + (pt() ? 'Nenhum nome novo. Os conhecidos são classificados sozinhos.' : 'No new names. Known ones are classified automatically.') + '</p></div>';
    h += '<p class="small muted" style="margin:0 0 8px">' + (pt()
      ? 'Nomes de saúde ou educação que o app ainda não conhece. Confirme uma vez: daqui em diante, todo lançamento com esse nome já entra com a categoria, a pessoa e o IR certos.'
      : 'Health or education names the app does not know yet. Confirm once: from then on every entry with that name is classified automatically.') + '</p>';
    if (window.Pessoas) h += Pessoas.opcoes('profQuemLista');
    q.slice(0, 12).forEach(function (x, i) {
      var g = x.exemplo, s = x.sugestao;
      h += '<div class="prof-q" data-i="' + i + '"><div class="t-main">' + esc(g.desc.slice(0, 60)) + '</div>' +
        '<div class="t-sub">' + x.n + (pt() ? ' lançamento(s) · ' : ' entr(ies) · ') + fmt(x.total) + (s ? ' · ' + (pt() ? 'parece ' : 'looks like ') + '<b>' + esc(s.nome) + '</b>' : '') + '</div>' +
        '<div class="grid g2 prof-campos">' +
          '<label class="f"><span class="lb">' + (pt() ? 'É' : 'Is') + '</span><select class="prof-sel">' + opcoes(s) + '</select></label>' +
          '<label class="f"><span class="lb">' + (pt() ? 'Nome' : 'Name') + '</span><input class="prof-nome" value="' + esc(s ? s.nome : API.norm(g.desc).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ')) + '"></label>' +
          '<label class="f"><span class="lb">' + esc(t('fin.categoria')) + '</span><input class="prof-sub" value="' + esc(s ? s.sub : (g.sub || '')) + '"></label>' +
          '<label class="f"><span class="lb">' + (pt() ? 'Para quem é' : 'Who it is for') + '</span><input class="prof-quem" data-pessoa list="profQuemLista" autocomplete="off" value="' + esc(s ? (s.paraQuem || s.quem || '') : (g.paraQuem || '')) + '"></label>' +
        '</div>' +
        '<label class="linha-check"><input type="checkbox" class="prof-ir"' + ((s ? s.irpf : (g.irpf || g.grupo === 'SAUDE')) ? ' checked' : '') + '> ' + (pt() ? 'Entra no imposto de renda' : 'Counts for income tax') + '</label>' +
        '<div class="row" style="gap:6px"><button class="btn sm primary" data-acao="prof-confirmar" data-chave="' + esc(x.chave) + '" data-grupo="' + esc(s ? s.grupo : (g.grupo === 'OUTROS' ? 'SAUDE' : g.grupo)) + '">' + (pt() ? 'Confirmar' : 'Confirm') + '</button>' +
        '<button class="btn sm" data-acao="prof-ignorar" data-chave="' + esc(x.chave) + '">' + (pt() ? 'Não é profissional' : 'Not a professional') + '</button></div></div>';
    });
    return h + '</div>';
  }
  function telaProfissionais() {
    var l = lista().filter(function (p) { return !p.ignorar; }).sort(function (a, b) { return a.nome.localeCompare(b.nome); });
    var h = '<div class="card-head"><h1>🩺 ' + (pt() ? 'Profissionais conhecidos' : 'Known professionals') + '</h1></div>' +
      '<p class="small muted aba-explica">' + (pt() ? 'Quem o app reconhece no extrato e como classifica. Para mudar, confirme de novo em Custos → Revisar.' : 'Who the app recognises in statements and how it classifies them.') + '</p>';
    if (!l.length) return h + '<div class="card"><p class="muted small" style="margin:0">' + (pt() ? 'Nenhum ainda. Eles aparecem para confirmar em Custos → Revisar.' : 'None yet.') + '</p></div>';
    return h + '<div class="card sem-pad"><table class="tbl"><tbody>' + l.map(function (p) {
      var n = Gasto.todos().filter(function (g) { return g.profissional === p.id; }).length;
      return '<tr><td><span class="t-main">' + esc(p.nome) + '</span><div class="t-sub">' + esc([(GRUPOS[p.grupo] || {}).nome, p.sub, p.paraQuem || p.quem, p.irpf ? 'IR' : ''].filter(Boolean).join(' · ')) + '</div>' +
        '<div class="t-sub">' + esc(p.apelidos.join(' | ')) + '</div></td><td class="num">' + n + '</td>' +
        '<td class="num"><button class="btn sm" data-acao="prof-esquecer" data-id="' + esc(p.id) + '">' + (pt() ? 'esquecer' : 'forget') + '</button></td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  MoneyModulos.registrar({
    id: 'profissionais',
    versao: '1.2.1',
    colecoes: [COL],
    /* 1.1.0: uma vez, o nome que o profissional tinha posto no "quem" passa para "Para quem" */
    iniciar: function () {
      try {
        var cfg = (ST.config = ST.config || {}); if (cfg.profParaQuem) return;
        var n = 0, por = {}; lista().forEach(function (p) { por[p.id] = p; if (p.quem && !p.paraQuem) { p.paraQuem = p.quem; delete p.quem; } });
        Gasto.todos().forEach(function (g) {
          var p = por[g.profissional]; if (!p || !p.paraQuem || g.paraQuem) return;
          if (g.quem === p.paraQuem) { g.paraQuem = g.quem; g.quem = ''; delete g.quemId; if (window.Pessoas) Pessoas.ligar(g, 'paraQuem', 'paraQuemId'); n++; }
        });
        cfg.profParaQuem = 1; if (n || lista().length) Store.salvar();
      } catch (e) { console.warn('profissionais', e); }
    },
    ouvir: {
      'gasto.novo': function (g) { API.classificar(g); }
    },
    /* 1.2.1 (3.76): a aba Revisar saiu de Contas fixas; as perguntas vão para o 📥 (Confirmar classificação) */
    pontos: { 'custos.revisar': cartaoPerguntas,
      'inbox.grupos': function () { var q = API.perguntas(); return q.length ? [{ id: 'confirmar', n: q.length, html: '<li class="inb-item inb-oc">' + cartaoPerguntas() + '</li>' }] : []; } },
    telas: { 'b-profissionais': { app: 'budget', render: telaProfissionais,
      ajuda: { pt: { t: 'Profissionais conhecidos', o: 'Quem o app reconhece no extrato e como classifica, sem perguntar de novo.' },
               en: { t: 'Known professionals', o: 'Who the app recognises in statements and how it classifies them.' } } } },
    acoes: {
      'prof-confirmar': function (el) {
        var cx = el.closest('.prof-q'); if (!cx) return;
        var q = function (c) { var e = cx.querySelector(c); return e ? (e.type === 'checkbox' ? e.checked : e.value) : ''; };
        var r = API.confirmar(el.dataset.chave, { id: q('.prof-sel'), nome: q('.prof-nome'), sub: q('.prof-sub'), paraQuem: q('.prof-quem'), irpf: q('.prof-ir'), grupo: el.dataset.grupo });
        if (window.Espelho) Espelho.regraProfissional(r.p, el.dataset.chave);
        Store.salvar(); render();
        toast((pt() ? 'Confirmado: ' : 'Confirmed: ') + r.p.nome + (r.n ? ' · ' + r.n + (pt() ? ' lançamento(s) classificado(s).' : ' entr(ies) classified.') : '.'));
      },
      'prof-ignorar': function (el) { API.ignorar(el.dataset.chave); Store.salvar(); render(); },
      'prof-esquecer': function (el) {
        ST[COL] = lista().filter(function (p) { return p.id !== el.dataset.id; });
        Store.salvar(); render();
      }
    }
  });
  window.Profissionais = API;
})();
