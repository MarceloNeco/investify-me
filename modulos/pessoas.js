/* =====================================================================
   modulos/pessoas.js — pessoas da família, outras pessoas e empresas (3.64)        1.9.1 · 28/Nov/2026 (3.142: o chefe primeiro e travado, "Não é da família" no papel, inquilino para Outras pessoas, formulário com o Tipo no topo; 3.138: data-ajuda; 3.132: família primeiro, Juntar, papéis, Desfazer, editar na ficha, sem CPF no nome)
   ---------------------------------------------------------------------
     · 1.9.1 (3.144): 3.144: papel e tipo em espanhol na lista (Responsable, Dependiente, Familia)
     · 1.9.0 (3.144): o titular que o robô manda pelo nome atual (titularVer) e "É a X?"; editar e "+ Adicionar" na folha de edição (modulos/folha-editar.js); campos: Nome (o que aparece no app), "Como aparece no extrato/Pix" em chips com sugestões dos lançamentos, "Mais detalhes" com o nome completo, o e-mail atrás de "Convidar para o MoneyTRIO", nomes antigos guardados sozinhos; migração uma vez sem perder nada (antes3144).
       Desenho novo: um cartão "👥 Pessoas" com Família (mora com você; toda ela na parte da casa), Pessoas próximas (não moram com você;
       nunca na parte da casa) e Empresas, cada uma com "+ Adicionar"; o papel como texto, deduzido (papelDe), sem "Confirme"; a relação
       de quem é próximo em 1 toque (diarista, sogra, inquilino…) e o que costuma acontecer, só no app (regraDe/aplicarRegra: o Pix sem
       categoria para a diarista vira Habitação › Diarista); as contas no nome dela que chegam no e-mail dentro da ficha; "é Ana (sogra)?".
       Os registros continuam gravando o código de sempre (codigoDe; 3.68); a tela mostra o Nome.
   O QUE FAZ
     Um cadastro só de "quem": Da casa (responsáveis e dependentes), Outras pessoas (pai, amigo, sócio) e
     Empresas/instituições (CNPJ opcional, dado público). NUNCA CPF (LGPD: o ganho é pequeno, o risco é alto).
     · Cada registro guarda o ID da pessoa (quemId, paraQuemId, pagadorId) ao lado do texto (quem, paraQuem,
       pagador). O texto é só o nome mostrado: renomear reescreve o texto em todo lugar na hora (propagar).
     · O campo continua aceitando texto livre (vizinho, pagamento pontual): texto que bate num nome ou apelido
       vira a pessoa; texto que não bate fica texto, com um "+ cadastrar esta pessoa" discreto.
     · Nome parecido, mas sem certeza ("NECO M" × Neco): NUNCA entra como certo. Pergunta uma vez por nome
       ("É a mesma pessoa?"), como os Profissionais. Nome que não parece com ninguém: "A identificar".
     · Migração (uma vez): os "quem" que já existem viram pessoas pelos apelidos; "PJ" vira empresa. O dono
       revisa a lista uma vez (aviso na tela das pessoas).
     · Pré-preenche com os membros da família na plataforma (sol_grupo_membros) e com as pessoas que a ponte
       do OmniLife trouxe (saude-resumo).
     · 1.1.0 (3.65): "nomes no banco" de quem é da casa saem do nome completo (MARIA DE SOUZA LIMA → "MARIA DE SOUZA",
       "MARIA L", "M S LIMA"); o dono pode acrescentar outros. Apelido da casa NUNCA vira nome de banco: os nomes de
       antes (migração, renomear) ficam em "aliases" (também chamado no app). Contatos guardam cnpjs/idps
       (modulos/contraparte.js; o idp nunca aparece). Pares novos: contato, titular e "quem usa" do cartão.
   API (window.Pessoas)
     todas() · ativas() · porId(id) · rotulo(p) · nomeCompleto(p) · nomeVer(texto) (3.68: o nome mostrado do "quem")
     achar(texto)                → pessoa (nome, apelido, nome completo ou apelido do banco, sem acento) | null
     parecida(texto)             → {p, nota} quando parece mas não é certo (0,5 ≤ nota < 1) | null
     ligar(obj, campo, campoId)  → acha a pessoa do texto e grava o ID (e o nome do cadastro); sem pessoa, tira o ID
     ligarTudo(obj)              → ligar nos três pares (quem, paraQuem, pagador)
     ehDependente(idOuTexto)     → true se for dependente da casa
     mesma(a, b)                 → mesmo ID, ou a mesma pessoa pelos apelidos
     salvar(dados)               → cria ou edita (e propaga o nome)
     arquivar(id) / desarquivar(id)  (nunca apaga quem tem lançamento)
     juntar(ficaId, saiId)       → 1.3.0: duas fichas da mesma pessoa viram uma (os registros passam, nada se perde)
     propagar(id)                → reescreve o nome mostrado em todos os registros com aquele ID
     migrar()                    → uma vez: os "quem" de hoje viram pessoas
     prepreencher(membros, omni) → junta os membros da plataforma e as pessoas do OmniLife (sem duplicar)
     perguntas()                 → [{texto, n, sugestao}] (parecidos sem certeza) · aIdentificar() → [{texto, n}]
     confirmarParecida(texto, id) / naoEhParecida(texto)
     opcoes(idLista)             → <datalist> com as pessoas (o campo continua aceitando texto livre)
   DADOS
     Store.estado.pessoas = [{id, tipo: 'casa'|'outra'|'empresa', papel: 'responsavel'|'dependente'|'', nome, meio,
       sobrenome, apelido, banco: [como aparece no extrato], cnpj, uid, perfil, arquivada, revisar, criadoEm}]
     ST.config.pessoasV (migração feita), ST.config.pessoasNao {texto normalizado: 1} (não é a pessoa sugerida)
   PONTOS QUE USA
     config.todos (cartão em Configurações) · tela cfg-pessoas · ações ps-* · input [data-pessoa] (o "+ cadastrar")
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'pessoas';
  var PARES = [['quem', 'quemId'], ['paraQuem', 'paraQuemId'], ['pagador', 'pagadorId'], ['contato', 'contatoId'], ['titular', 'titularId'], ['usa', 'usaId']];
  var PARTICULAS = { de: 1, da: 1, do: 1, das: 1, dos: 1, e: 1 };
  var TIPOS = { casa: ['Família', 'Family', 'Familia'], outra: ['Pessoa próxima', 'Close person', 'Persona cercana'], empresa: ['Empresas e instituições', 'Companies and institutions', 'Empresas e instituciones'] };   /* 1.9.0 (3.144) */
  /* 1.8.0 (3.142): os rótulos do Tipo no formulário (o dono não achava o Tipo) */
  var TIPOS_FORM = { casa: ['Família (mora com você)', 'Family (lives with you)', 'Familia (vive contigo)'], outra: ['Pessoa próxima (não mora com você)', 'Close person (does not live with you)', 'Persona cercana (no vive contigo)'],
    empresa: ['Empresas e instituições', 'Companies and institutions', 'Empresas e instituciones'] };
  /* 1.9.0 (3.144): a relação de quem é próximo (não mora junto), escolhida em 1 toque, e o que costuma acontecer com ela (só no app) */
  var RELACOES = {
    diarista: ['Diarista', 'Cleaner', 'Asistenta'], empregada: ['Empregada doméstica', 'Housekeeper', 'Empleada del hogar'], baba: ['Babá', 'Nanny', 'Niñera'],
    motorista: ['Motorista', 'Driver', 'Chófer'], pai: ['Pai', 'Father', 'Padre'], mae: ['Mãe', 'Mother', 'Madre'], sogro: ['Sogro', 'Father-in-law', 'Suegro'],
    sogra: ['Sogra', 'Mother-in-law', 'Suegra'], avos: ['Avô ou avó', 'Grandparent', 'Abuelo o abuela'], tios: ['Tio ou tia', 'Uncle or aunt', 'Tío o tía'],
    irmaos: ['Irmão ou irmã', 'Sibling', 'Hermano o hermana'], inquilino: ['Inquilino(a)', 'Tenant', 'Inquilino(a)'], prestador: ['Prestador(a) de serviço', 'Service provider', 'Proveedor(a)'],
    outro: ['Outra relação', 'Other', 'Otra relación'] };
  var PARENTE = { grupo: 'PESSOAL', sub: 'Ajuda a parentes', fluxo: 'saida' };
  var REGRAS_REL = { diarista: { grupo: 'HABITACAO', sub: 'Diarista', fluxo: 'saida' }, empregada: { grupo: 'HABITACAO', sub: 'Empregada', fluxo: 'saida' },
    baba: { grupo: 'HABITACAO', sub: 'Babá', fluxo: 'saida' }, motorista: { grupo: 'TRANSPORTE', sub: 'Motorista', fluxo: 'saida' },
    pai: PARENTE, mae: PARENTE, sogro: PARENTE, sogra: PARENTE, avos: PARENTE, tios: PARENTE, irmaos: PARENTE,
    inquilino: { grupo: 'RENDA', sub: 'Aluguel recebido', fluxo: 'entrada' } };
  var PAPEIS = { responsavel: ['Responsável', 'Guardian', 'Responsable'], dependente: ['Dependente', 'Dependant', 'Dependiente'], '': ['papel a definir', 'role not set', 'papel por definir'] };
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function temST() { return typeof ST !== 'undefined' && !!ST; }
  function lista() { if (!temST()) return []; return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  /* 1.7.0 (3.132): CPF/CNPJ grudado no nome ("FULANO 12345678901"): some do que se guarda; na tela fica só o final ("···901") */
  var DOC = /(\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b)/g;
  function semDoc(t) { return String(t == null ? '' : t).replace(DOC, '').replace(/\s{2,}/g, ' ').trim(); }
  function docMascara(t) { return String(t == null ? '' : t).replace(DOC, function (m) { return '···' + m.replace(/\D/g, '').slice(-3); }); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function cfg() { return temST() ? (ST.config = ST.config || {}) : {}; }
  function novoId() { return 'ps' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function titulo(t) { return String(t || '').toLowerCase().replace(/(^|\s)\S/g, function (m) { return m.toUpperCase(); }).trim(); }
  function casaToda(t) { return /^(casa|home)\b/i.test(String(t || '').trim()); }

  /* as chaves que reconhecem a pessoa: nome mostrado, primeiro nome, nome completo e os apelidos do banco */
  function chaves(p) {
    var k = {}, add = function (x) { x = N(x); if (x) k[x] = 1; };
    add(API.rotulo(p)); add(p.nome); add([p.nome, p.sobrenome].join(' ')); add(API.nomeCompleto(p)); add(p.apelido);
    var nc = API.nomeCompleto(p).split(/\s+/).filter(Boolean); if (nc.length > 1) { add(nc[0]); add(nc[0] + ' ' + nc[nc.length - 1]); }   /* 1.9.0 (3.144): o primeiro nome e o primeiro + último do nome completo */
    (p.banco || []).forEach(add); (p.aliases || []).forEach(add);
    if (p.tipo === 'casa') API.nomesDoBanco(p).forEach(add);
    return Object.keys(k);
  }
  function semelhanca(a, b) {
    if (window.Profissionais && Profissionais.parecido) return Profissionais.parecido(a.split(' '), b.split(' '));
    var A = a.split(' '), B = b.split(' '), n = 0;
    A.forEach(function (w) { if (B.indexOf(w) >= 0) n++; });
    return n / Math.max(A.length, B.length);
  }
  /* todos os registros que guardam "quem" (qualquer lista do Store com objetos) */
  function cadaRegistro(fn) {
    if (!temST()) return;
    Object.keys(ST).forEach(function (col) {
      if (col === COL || !Array.isArray(ST[col])) return;
      ST[col].forEach(function (o) { if (o && typeof o === 'object' && !Array.isArray(o)) fn(o, col); });
    });
  }

  var API = {
    PARES: PARES,
    todas: lista,
    ativas: function () { return lista().filter(function (p) { return !p.arquivada; }); },
    porId: function (id) { return id ? lista().find(function (p) { return p.id === id; }) || null : null; },
    rotulo: function (p) {
      if (!p) return '';
      if (String(p.apelido || '').trim()) return String(p.apelido).trim();
      if (p.tipo === 'empresa' || p.completo != null) return String(p.nome || '').trim();   /* 1.9.0 (3.144): "Nome" é o que aparece no app, inteiro */
      return String(p.nome || '').trim().split(/\s+/)[0] || '';
    },
    /* como o banco costuma escrever o nome de quem é da casa (sem o apelido) */
    nomesDoBanco: function (p) {
      var ws = API.nomeCompleto(p).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(Boolean);
      if (ws.length < 2) return [];
      var ult = ws[ws.length - 1], meio = ws.slice(1, -1), ini = ws.slice(0, -1).filter(function (w) { return !PARTICULAS[w.toLowerCase()]; }).map(function (w) { return w[0]; });
      var out = [];
      if (meio.length) out.push([ws[0]].concat(meio).join(' '));
      out.push(ws[0] + ' ' + ult[0]);
      if (ini.length >= 2) out.push(ini.join(' ') + ' ' + ult);
      return out.filter(function (x, i, a) { return a.indexOf(x) === i; });
    },
    /* 1.2.0 (3.68): o nome que a tela mostra para o "quem" gravado. O código gravado (o apelido da casa, que o robô usa)
       NÃO muda; quem é da casa aparece pelo primeiro nome do cadastro, igual em PT e EN. Texto sem pessoa fica como está. */
    nomeVer: function (texto) {
      var t = String(texto || '').trim(); if (!t) return '';
      var p = API.achar(t), nome = p && p.tipo === 'casa' ? String(p.nome || '').trim() : '';
      return nome || t;
    },
    /* 1.9.0 (3.144): o titular que o robô manda (o rótulo da conta no robô, que pode ser antigo: "Zeca", "Gama"…) vira o nome ATUAL da pessoa,
       pela ficha (nome, apelidos, nomes no banco e os antigos guardados). Sem ficha: nunca o texto cru; se parece alguém, sug = essa pessoa
       (a tela pergunta "É a X?"); senão, nome vazio. */
    titularVer: function (texto) {
      var t = String(texto || '').trim(); if (!t) return { nome: '', p: null, sug: null };
      var p = API.achar(t);
      if (p) return { nome: p.tipo === 'casa' ? API.nomeVer(t) : API.rotulo(p), p: p, sug: null };
      var s = API.parecida(t);
      return { nome: '', p: null, sug: s && s.p.tipo === 'casa' ? s.p : null };
    },
    /* 1.9.0 (3.144): o papel de quem é da Família, deduzido (sem "Confirme"): o que está na ficha; senão você, quem tem conta ou e-mail
       = responsável; quem está como dependente numa declaração do IR = dependente; senão, nada */
    papelDe: function (p) {
      if (!p || p.tipo !== 'casa') return '';
      if (p.papel) return p.papel;
      if (p === API.minhaFicha() || p.uid || p.email) return 'responsavel';
      try { if (typeof Tax !== 'undefined' && (Tax.estado().declaracoes || []).some(function (d) { return (d.dependentesNomes || []).some(function (n) { return API.achar(n) === p; }); })) return 'dependente'; } catch (e) { /* sem IR */ }
      return '';
    },
    relacaoTxt: function (p) { var r = p && RELACOES[p.relacao]; return r ? tr.apply(null, r) : ''; },
    /* o que costuma acontecer com a pessoa próxima (pela relação): o Pix para ela (ou dela, o inquilino) vira esta categoria — só no app */
    regraDe: function (p) { return p && p.tipo === 'outra' && !p.regraDesligada && REGRAS_REL[p.relacao] ? REGRAS_REL[p.relacao] : null; },
    regraTxt: function (r) { if (!r) return ''; var G = (typeof GRUPOS !== 'undefined' && GRUPOS[r.grupo]) || {}; return (G.nome || r.grupo) + ' › ' + r.sub; },
    /* aplica a regra num lançamento novo ligado à pessoa, se ele veio sem categoria; devolve true se mudou */
    aplicarRegra: function (g) {
      if (!g || g.editadoPessoa || g.regraPessoa) return false;
      var semCat = g.grupo === 'OUTROS' || !g.sub || /^(sem categoria|a identificar|pix|transfer[eê]ncia|extrato banc[aá]rio)$/i.test(String(g.sub || '').trim());
      if (!semCat) return false;
      var p = null; PARES.some(function (x) { var q = g[x[1]] && API.porId(g[x[1]]); if (q && API.regraDe(q)) { p = q; return true; } return false; });
      var r = API.regraDe(p); if (!r) return false;
      var entra = g.fluxo === 'entrada' || g.grupo === 'RENDA';
      if ((r.fluxo === 'entrada') !== entra) return false;
      g.grupo = r.grupo; g.sub = r.sub; g.regraPessoa = p.id; if (typeof GRUPOS !== 'undefined' && GRUPOS[r.grupo]) g.fluxo = GRUPOS[r.grupo].fluxo;
      return true;
    },
    /* as contas no nome da pessoa que chegam no e-mail (modulos/terceiros.js): ignorar ou processar */
    contasNoNome: function (p) {
      if (!p || !window.Terceiros || !Terceiros.lista) return [];
      return Terceiros.lista().filter(function (t) { return t && t.nome && API.achar(t.nome) === p; });
    },
    /* a pergunta "É a X?" para um titular sem ficha (botão; ação ps-titular-sim) */
    titularPergunta: function (texto, sug) {
      if (!sug) return '';
      var art = sug.genero === 'f' ? 'a ' : sug.genero === 'm' ? 'o ' : '';   /* sem saber o gênero, sem artigo ("É Beatriz?") */
      return '<button type="button" class="linkinho ps-titular-sim" data-acao="ps-titular-sim" data-texto="' + esc(texto) + '" data-id="' + esc(sug.id) + '">' +
        esc(tr('É ' + art, 'Is it ', '¿Es ') + API.rotulo(sug) + '?') + '</button>';
    },
    /* 1.9.0 (3.144): o texto que os registros guardam no "quem" (3.68: o código da casa que o robô usa, ex. "Zeca"); a tela mostra o Nome */
    codigoDe: function (p) { return p ? String(p.codigo || '').trim() || API.rotulo(p) : ''; },
    nomeCompleto: function (p) { return !p ? '' : String(p.completo || '').trim() || [p.nome, p.meio, p.sobrenome].map(function (x) { return String(x || '').trim(); }).filter(Boolean).join(' '); },   /* 1.9.0 (3.144): o "Nome completo (opcional)" */
    /* 1.9.0 (3.144), uma vez, sem perder nada: "Nome" = o nome que o app já mostra — da família, o nome do cadastro (nomeVer, 3.68: o
       apelido era o código do robô, como "Zeca"); dos outros, o rótulo (apelido ou primeiro nome). O apelido que sai vai para os nomes
       antigos (aliases: o robô e os registros velhos continuam achando); nome + do meio + sobrenome vão para "Mais detalhes" (completo);
       o que havia antes fica guardado na ficha (antes3144). */
    migrar3144: function () {
      if (!temST() || cfg().pessoasV3144) return 0;
      var n = 0;
      lista().forEach(function (p) {
        if (p.completo != null) return;
        var mostra = p.tipo === 'casa' && String(p.nome || '').trim() ? String(p.nome).trim() : API.rotulo(p), cheio = [p.nome, p.meio, p.sobrenome].map(function (x) { return String(x || '').trim(); }).filter(Boolean).join(' ');
        p.antes3144 = { nome: p.nome || '', meio: p.meio || '', sobrenome: p.sobrenome || '', apelido: p.apelido || '' };
        var ap = String(p.apelido || '').trim(); if (ap && N(ap) !== N(mostra)) { if ((p.aliases || []).map(N).indexOf(N(ap)) < 0) (p.aliases = p.aliases || []).push(ap); p.codigo = ap; }
        p.nome = mostra || p.nome || ''; p.completo = N(cheio) !== N(p.nome) ? cheio : ''; p.meio = ''; p.sobrenome = ''; p.apelido = '';
        n++;
      });
      cfg().pessoasV3144 = 1;
      return n;
    },
    /* 1.9.0 (3.144): sugestões para "Como aparece no extrato/Pix": os nomes de quem mandou/recebeu Pix nos lançamentos com o primeiro nome
       dela (2 palavras ou mais), menos os que já estão na ficha e os que o nome completo já reconhece sozinho (nomesDoBanco) */
    sugestoesBanco: function (p) {
      if (!p || p.tipo !== 'casa') return [];
      var ja = (p.banco || []).map(N), out = [], add = function (t) { t = String(t || '').trim().toUpperCase(); if (t && /\s/.test(t) && ja.indexOf(N(t)) < 0 && out.map(N).indexOf(N(t)) < 0) out.push(t); };
      API.nomesDoBanco(p).forEach(function (t) { ja.push(N(t)); });
      var pri = N(API.nomeCompleto(p)).split(' ')[0];
      if (pri && pri.length >= 3 && typeof Gasto !== 'undefined') Gasto.todos().forEach(function (g) {
        var c = g.contraparte && g.contraparte.nome; if (c && N(c).split(' ')[0] === pri && !API.pareceEmpresa(c)) add(semDoc(c));
      });
      return out.slice(0, 6);
    },
    achar: function (texto) {
      var k = N(texto); if (!k) return null;
      var achou = null;
      lista().forEach(function (p) { if (!achou && chaves(p).indexOf(k) >= 0) achou = p; });
      return achou;
    },
    parecida: function (texto) {
      var k = N(texto); if (!k || API.achar(texto) || (cfg().pessoasNao || {})[k]) return null;
      var melhor = null;
      API.ativas().forEach(function (p) {
        chaves(p).forEach(function (c) {
          var n = semelhanca(k, c);
          /* "NECO M" × "neco": uma palavra igual e o resto é sobra — parece, mas não é certo */
          if (n < 1 && (k.indexOf(c + ' ') === 0 || c.indexOf(k + ' ') === 0)) n = Math.max(n, 0.6);
          if (n >= 0.5 && n < 1 && (!melhor || n > melhor.nota)) melhor = { p: p, nota: n };
        });
      });
      return melhor;
    },
    ligar: function (o, campo, campoId) {
      if (!o) return o;
      var txt = String(o[campo] || '').trim();
      var p = txt ? API.achar(txt) : null;
      if (!p && o[campoId] && !txt) p = API.porId(o[campoId]);
      if (p) { o[campoId] = p.id; o[campo] = API.codigoDe(p); }   /* 1.9.0 (3.144): o registro guarda o código de sempre (o do robô) */
      else delete o[campoId];
      return o;
    },
    ligarTudo: function (o) { PARES.forEach(function (x) { if (x[0] in o || x[1] in o) API.ligar(o, x[0], x[1]); }); return o; },
    pessoaDe: function (x) { return typeof x === 'object' && x ? x : (API.porId(x) || API.achar(x)); },
    ehDependente: function (x) { var p = API.pessoaDe(x); return !!(p && p.tipo === 'casa' && p.papel === 'dependente'); },
    mesma: function (a, b) {
      if (!String(a || '').trim() || !String(b || '').trim()) return false;
      if (N(a) === N(b)) return true;
      var pa = API.pessoaDe(a), pb = API.pessoaDe(b);
      return !!(pa && pb && pa.id === pb.id);
    },
    /* quantos registros usam a pessoa (para nunca apagar quem tem lançamento) */
    usos: function (id) {
      var n = 0; cadaRegistro(function (o) { PARES.forEach(function (x) { if (o[x[1]] === id) n++; }); });
      return n;
    },
    propagar: function (id) {
      var p = API.porId(id); if (!p) return 0;
      var nome = API.codigoDe(p), n = 0;   /* 1.9.0 (3.144): o código de sempre; a tela mostra o Nome (nomeVer) */
      cadaRegistro(function (o) { PARES.forEach(function (x) { if (o[x[1]] === id && o[x[0]] !== nome) { o[x[0]] = nome; n++; } }); });
      if (typeof Gasto !== 'undefined') Gasto._idx = null;
      return n;
    },
    salvar: function (d) {
      var p = d.id ? API.porId(d.id) : null;
      var limpo = {
        tipo: TIPOS[d.tipo] ? d.tipo : 'casa',
        papel: d.tipo === 'casa' || !d.tipo ? (d.papel === 'dependente' ? 'dependente' : (d.papel === 'responsavel' ? 'responsavel' : '')) : '',
        nome: semDoc(d.nome).slice(0, 80), meio: semDoc(d.meio).slice(0, 80),
        completo: d.completo != null ? semDoc(d.completo).slice(0, 160) : (p ? (p.completo != null ? p.completo : undefined) : ''),   /* ficha nova: já no jeito da 3.144 (o Nome inteiro aparece) */
        sobrenome: semDoc(d.sobrenome).slice(0, 120), apelido: semDoc(d.apelido).slice(0, 40),
        banco: (Array.isArray(d.banco) ? d.banco : String(d.banco || '').split(/[,;\n]/)).map(function (x) { return semDoc(x).slice(0, 60); }).filter(Boolean)
          .filter(function (x, i, a) { return a.map(N).indexOf(N(x)) === i; }),
        cnpj: d.tipo === 'empresa' ? String(d.cnpj || '').replace(/[^\d./-]/g, '').slice(0, 18) : ''
      };
      /* 1.9.0 (3.144): a relação de quem é próximo e se a regra dela vale */
      if (d.relacao !== undefined) { limpo.relacao = d.tipo === 'outra' && RELACOES[d.relacao] ? d.relacao : ''; limpo.regraDesligada = d.tipo === 'outra' && !!d.regraDesligada; }
      if (d.aliases != null) limpo.aliases = (Array.isArray(d.aliases) ? d.aliases : String(d.aliases).split(/[,;\n]/)).map(function (x) { return semDoc(x).slice(0, 40); }).filter(Boolean);
      if (!limpo.nome) throw new Error(tr('Escreva o nome.', 'Type the name.', 'Escribe el nombre.'));
      if (limpo.completo === undefined) delete limpo.completo;
      if (d.uid) limpo.uid = String(d.uid); if (d.perfil) limpo.perfil = String(d.perfil);
      /* 1.5.0 (3.125): o e-mail (opcional) de quem entra no app; só da família (tipo casa) */
      var em = String(d.email || '').trim().toLowerCase().slice(0, 120);
      if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) throw new Error(tr('Esse e-mail não parece certo.', 'That e-mail does not look right.', 'Ese correo no parece correcto.'));
      limpo.email = d.tipo === 'casa' ? em : '';
      if (p) {
        var velho = API.rotulo(p);
        Object.assign(p, limpo); delete p.revisar;
        /* o nome de antes continua achando a pessoa (registro que chega de outro aparelho com o nome velho) */
        if (velho && N(velho) !== N(API.rotulo(p)) && chaves(p).indexOf(N(velho)) < 0) (p.aliases = p.aliases || []).push(velho);
      }
      else { p = Object.assign({ id: novoId(), criadoEm: new Date().toISOString() }, limpo); lista().push(p); }
      API.religar(); API.propagar(p.id);
      return p;
    },
    /* 1.3.0 (3.75): duas fichas da MESMA pessoa (ex.: o cadastro com o apelido e a ficha que veio da conta, com o nome da conta) viram uma
       só: os registros da que sai passam para a que fica (nenhum lançamento se perde), os nomes dela viram apelidos conhecidos
       (aliases) e o uid/perfil da conta passam para a que fica. Devolve quantos registros mudaram. */
    juntar: function (ficaId, saiId) {
      var fica = API.porId(ficaId), sai = API.porId(saiId); if (!fica || !sai || fica === sai) return 0;
      var n = 0;
      cadaRegistro(function (o) { PARES.forEach(function (x) { if (o[x[1]] === saiId) { o[x[1]] = ficaId; n++; } }); });
      if (sai.uid && !fica.uid) fica.uid = sai.uid;
      if (sai.perfil && !fica.perfil) fica.perfil = sai.perfil;
      fica.banco = (fica.banco || []).concat((sai.banco || []).filter(function (b) { return (fica.banco || []).indexOf(b) < 0; }));
      fica.aliases = (fica.aliases || []).concat([API.nomeCompleto(sai), sai.apelido].concat(sai.aliases || []).filter(function (a) { return a && (fica.aliases || []).indexOf(a) < 0; }));
      ST[COL] = lista().filter(function (p) { return p.id !== saiId; });
      API.propagar(ficaId);
      return n;
    },
    arquivar: function (id) { var p = API.porId(id); if (p) p.arquivada = true; return p; },
    desarquivar: function (id) { var p = API.porId(id); if (p) delete p.arquivada; return p; },
    /* sem lançamento nenhum, pode sair de vez */
    apagar: function (id) {
      if (API.usos(id)) throw new Error(tr('Tem lançamento com esta pessoa: use Arquivar.', 'There are entries with this person: use Archive.', 'Hay movimientos con esta persona: usa Archivar.'));
      ST[COL] = lista().filter(function (p) { return p.id !== id; });
    },
    /* liga de novo os textos soltos que agora batem em alguém (depois de cadastrar ou de um apelido novo) */
    religar: function () {
      var n = 0;
      cadaRegistro(function (o) {
        PARES.forEach(function (x) {
          if (o[x[1]] || typeof o[x[0]] !== 'string' || !o[x[0]].trim() || casaToda(o[x[0]])) return;
          var p = API.achar(o[x[0]]); if (p) { o[x[1]] = p.id; o[x[0]] = API.rotulo(p); n++; }
        });
      });
      if (window.Contraparte) Contraparte.aprenderTodos();   /* 3.65: o contato confirmado aprende o CNPJ / id da outra parte */
      return n;
    },
    /* os textos soltos (sem ID) de todos os registros, contados */
    soltos: function () {
      var c = {};
      cadaRegistro(function (o, col) {
        PARES.forEach(function (x) {
          if (typeof o[x[0]] !== 'string') return;   /* ex.: "quem vai" dos trajetos é uma lista */
          var t = o[x[0]].trim();
          if (!t || o[x[1]] || casaToda(t)) return;
          var k = N(t), s = (c[k] = c[k] || { texto: t, n: 0, fora: true }); s.n++;
          /* 1.6.0 (3.131): o texto que só aparece como "para quem" das contas de terceiros ou dos comprovantes (o robô) é de fora */
          if (!(x[0] === 'paraQuem' && (col === 'terceiros' || col === 'comprovantes'))) s.fora = false;
        });
      });
      return Object.keys(c).map(function (k) { return c[k]; }).sort(function (a, b) { return b.n - a.n; });
    },
    perguntas: function () {
      return API.soltos().map(function (s) { var q = API.parecida(s.texto); return q ? { texto: s.texto, n: s.n, sugestao: q.p } : null; }).filter(Boolean);
    },
    aIdentificar: function () {
      return API.soltos().filter(function (s) { return !API.parecida(s.texto) && !(cfg().pessoasNao || {})[N(s.texto)] && !API.pareceEmpresa(s.texto); });
    },
    /* 1.7.0 (3.132): nome de empresa, banco ou instituição (ou com CNPJ) não é pessoa: não entra em "A identificar" */
    pareceEmpresa: function (texto) {
      var s = String(texto || ''), n = N(s);
      if (/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/.test(s)) return true;
      if (/\b(ltda|s ?a|eireli|me|epp|mei|instituicao|pagamentos?|banco|caixa economica|associacao|cooperativa|seguros?|seguradora|comercio|servicos|eletropaulo|enel|sabesp|condominio|mercado|supermercados?|farmacias?|drogarias?|shpp|shopee|amazon|ifood|uber)\b/.test(n)) return true;
      return /^(itau|bradesco|santander|nubank|inter|btg|c6|caixa|bb|banco do brasil|picpay|mercado pago|pagbank|pagseguro|stone|sicoob|sicredi|original|safra|xp|neon|next|will|avenue|bs2)\b/.test(n);
    },
    confirmarParecida: function (texto, id) {
      var p = API.porId(id); if (!p) return 0;
      var t = semDoc(texto).slice(0, 60), doBanco = /^[A-Z0-9 .'-]{4,}$/.test(t) && /\s/.test(t);   /* "MARIA S LIMA" é do extrato; "Neco" é apelido */
      var l = doBanco ? (p.banco = p.banco || []) : (p.aliases = p.aliases || []);
      if (l.map(N).indexOf(N(t)) < 0) l.push(t);
      return API.religar();
    },
    /* 1.6.0 (3.131): nome que parece de quem é de fora da família (o aviso "Esta pessoa é da família?" em Quem é da casa) */
    pareceDeFora: function (x) {
      var p = typeof x === 'object' && x ? x : null, t = N(p ? [p.nome, p.apelido, p.sobrenome].join(' ') : x);
      return /\b(inquilin[oa]s?|locatari[oa]s?|locador[a]?|prestador[a]?|propriet[a]ri[oa]|imobiliaria|sindic[oa]|condominio|porteir[oa]|zelador[a]?|fornecedor[a]?)\b/.test(t);
    },
    /* 1.8.0 (3.142), uma vez: ficha da casa que parece de fora (inquilino…), que ninguém confirmou como família e sem lançamento que a pessoa
       marcou à mão como da casa, passa para "Outras pessoas", com um aviso só ("X passou para Outras pessoas — Desfazer") */
    foraParaOutras: function () {
      try {
        if (!temST() || cfg().pessoasFora3142) return [];
        var casaManual = {}; Object.keys(ST).forEach(function (c) { if (Array.isArray(ST[c])) ST[c].forEach(function (x) { if (x && x.escopo === 'casa') PARES.forEach(function (pr) { if (x[pr[1]]) casaManual[x[pr[1]]] = 1; }); }); });
        var eu = API.minhaFicha(), mudou = lista().filter(function (p) { return p.tipo === 'casa' && !p.arquivada && p !== eu && !p.familiaConfirmada && !p.uid && API.pareceDeFora(p) && !casaManual[p.id]; });
        var antes = mudou.map(function (p) { return { p: p, tipo: p.tipo, papel: p.papel, casa: !!(ST.visaoCasa && (ST.visaoCasa.pessoas || []).indexOf(p.id) >= 0) }; });
        mudou.forEach(function (p) { p.tipo = 'outra'; p.papel = ''; });
        if (mudou.length && ST.visaoCasa && Array.isArray(ST.visaoCasa.pessoas)) ST.visaoCasa.pessoas = ST.visaoCasa.pessoas.filter(function (id) { return !mudou.some(function (p) { return p.id === id; }); });
        cfg().pessoasFora3142 = 1; if (typeof Store !== 'undefined') Store.salvar();
        if (mudou.length && typeof toast === 'function') setTimeout(function () {
          comDesfazer(mudou.map(API.rotulo).join(', ') + (mudou.length === 1 ? tr(' passou para Outras pessoas.', ' moved to Other people.', ' pasó a Otras personas.') : tr(' passaram para Outras pessoas.', ' moved to Other people.', ' pasaron a Otras personas.')), function () {
            antes.forEach(function (a) { a.p.tipo = a.tipo; a.p.papel = a.papel; if (a.casa) { var v = ST.visaoCasa = Object.assign({ pessoas: [] }, ST.visaoCasa); if (v.pessoas.indexOf(a.p.id) < 0) v.pessoas.push(a.p.id); } }); });
        }, 1500);
        return mudou;
      } catch (e) { console.warn('pessoas: fora', e); return []; }
    },
    /* 1.7.0 (3.132): "Neco e Marcelo são a mesma pessoa?": a ficha da conta (minhaFicha) e a ficha da casa, sem conta nem e-mail, cujo nome é
       o "dono" que o robô manda em mais itens do banco (o dono da conta não aparece com o nome dela). Responder "Não são" guarda. */
    mesmaPessoa: function () {
      var eu = API.minhaFicha(); if (!eu) return null;
      var donos = {}, nao = cfg().psJuntarNao || {};
      ((typeof ST !== 'undefined' && ST.saldos_banco) || []).forEach(function (r) { if (r && r.dono) { var k = N(r.dono); donos[k] = (donos[k] || 0) + 1; } });
      if (chaves(eu).some(function (k) { return donos[k]; })) return null;
      var cs = lista().filter(function (p) { return p !== eu && p.tipo === 'casa' && !p.arquivada && !p.uid && !p.email && !nao[p.id + '|' + eu.id] && chaves(p).some(function (k) { return donos[k]; }); })
        .map(function (p) { return { p: p, n: Math.max.apply(null, chaves(p).map(function (k) { return donos[k] || 0; })) }; }).sort(function (a, b) { return b.n - a.n; });
      return cs.length ? { fica: eu, sai: cs[0].p } : null;
    },
    naoEhParecida: function (texto) { (cfg().pessoasNao = cfg().pessoasNao || {})[N(texto)] = 1; },
    /* "Neco", "Beta", "PJ"… viram pessoas; o texto de hoje fica como apelido do banco (o extrato continua batendo) */
    migrar: function () {
      if (cfg().pessoasV >= 1) return 0;   /* (1 = migrou na 3.64; 2 = aliases separados na 3.65) */
      var criadas = 0;
      API.soltos().forEach(function (s) {
        if (API.achar(s.texto) || API.parecida(s.texto)) return;   /* parecido com quem já entrou: pergunta depois ("é a mesma pessoa?") */
        var empresa = /^pj$/i.test(s.texto.trim()), varias = /\s/.test(s.texto.trim());
        /* 1.6.0 (3.131): ficha que nasce de terceiro (ou com nome de quem é de fora: inquilino, prestador…) nasce "outra", nunca "casa" */
        var fora = !empresa && (s.fora || API.pareceDeFora(s.texto));
        lista().push({ id: novoId(), tipo: empresa ? 'empresa' : (fora ? 'outra' : 'casa'), papel: '', nome: empresa ? 'PJ' : titulo(s.texto), meio: '', sobrenome: '', apelido: empresa ? 'PJ' : (varias ? s.texto.trim() : ''),
          banco: [], aliases: [s.texto.trim()], cnpj: '', revisar: true, criadoEm: new Date().toISOString() });
        criadas++;
      });
      API.religar();
      cfg().pessoasV = 2;
      if (criadas) cfg().pessoasRevisar = true;
      return criadas;
    },
    /* 1.5.0 (3.125): a ficha da conta logada, sem perguntar: a que tem o uid; senão a do e-mail da conta; senão a ÚNICA da casa com o
       nome da conta. Mais de uma candidata sem uid/e-mail: null (a tela "Família no MoneyTRIO" oferece "Juntar") */
    minhaFicha: function () {
      var eu = euUid(), email = N(contaEmail()), nome = N(contaNome()), casa = lista().filter(function (p) { return p.tipo === 'casa' && !p.arquivada; });
      var porUid = eu && casa.find(function (p) { return p.uid === eu; }); if (porUid) return porUid;
      var porEmail = email && casa.filter(function (p) { return p.email && N(p.email) === email; }); if (porEmail && porEmail.length === 1) return porEmail[0];
      var porNome = nome ? casa.filter(function (p) { return N(API.nomeCompleto ? API.nomeCompleto(p) : p.nome) === nome || N(p.nome) === nome || chaves(p).indexOf(nome) >= 0; }) : [];
      return porNome.length === 1 ? porNome[0] : null;
    },
    /* membros da plataforma: [{id, user_id, perfil_id, apelido, papel, email?}] · OmniLife: [{perfil_id, apelido}] */
    prepreencher: function (membros, omni) {
      var n = 0;
      (membros || []).forEach(function (m) {
        var ap = String(m.apelido || '').trim(); if (!ap) return;
        /* 1.5.0 (3.125): também pelo e-mail do convite; e a conta logada acha a ficha do dono (API.minhaFicha) — nunca uma ficha repetida */
        var p = lista().find(function (x) { return (m.user_id && x.uid === m.user_id) || (m.perfil_id && x.perfil === m.perfil_id) || (m.email && x.email && N(x.email) === N(m.email)); }) ||
          (m.user_id && m.user_id === euUid() ? API.minhaFicha() : null) || API.achar(ap);
        var papel = m.papel === 'crianca' ? 'dependente' : (m.papel === 'chefe' || m.papel === 'responsavel' ? 'responsavel' : '');
        if (p) { if (m.user_id && !p.uid) p.uid = m.user_id; if (m.perfil_id && !p.perfil) p.perfil = m.perfil_id; if (!p.papel && p.tipo === 'casa') p.papel = papel; return; }
        lista().push({ id: novoId(), tipo: 'casa', papel: papel, nome: titulo(ap), meio: '', sobrenome: '', apelido: '', banco: [], cnpj: '',
          uid: m.user_id || undefined, perfil: m.perfil_id || undefined, revisar: true, criadoEm: new Date().toISOString() });
        n++;
      });
      (omni || []).forEach(function (o) {
        var ap = String(o.apelido || '').trim(); if (!ap) return;
        var p = lista().find(function (x) { return o.perfil_id && x.perfil === o.perfil_id; }) || API.achar(ap);
        if (p) { if (o.perfil_id && !p.perfil) p.perfil = o.perfil_id; return; }
        lista().push({ id: novoId(), tipo: 'casa', papel: '', nome: titulo(ap), meio: '', sobrenome: '', apelido: '', banco: [], cnpj: '',
          perfil: o.perfil_id || undefined, revisar: true, criadoEm: new Date().toISOString() });
        n++;
      });
      if (n) { cfg().pessoasRevisar = true; API.religar(); }
      return n;
    },
    /* quem paga pela conta ou cartão: a pessoa que mais aparece nos lançamentos dela (≥ 3 e ≥ 80%) */
    donoDe: function (bancoId, cartaoId) {
      if (!bancoId && !cartaoId || typeof Gasto === 'undefined') return null;
      var c = {}, tot = 0;
      Gasto.todos().forEach(function (g) {
        if (!g.quemId || (cartaoId ? g.cartaoId !== cartaoId : g.bancoId !== bancoId)) return;
        c[g.quemId] = (c[g.quemId] || 0) + 1; tot++;
      });
      var melhor = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; })[0];
      return melhor && tot >= 3 && c[melhor] / tot >= 0.8 ? API.porId(melhor) : null;
    },
    opcoes: function (idLista) {
      return '<datalist id="' + esc(idLista) + '">' + API.ativas().slice().sort(function (a, b) { return API.rotulo(a).localeCompare(API.rotulo(b)); })
        .map(function (p) { return '<option value="' + esc(API.rotulo(p)) + '">' + esc(API.nomeCompleto(p) !== API.rotulo(p) ? API.nomeCompleto(p) : '') + '</option>'; }).join('') + '</datalist>';
    },
    /* o pedacinho debaixo do campo: "+ cadastrar esta pessoa" quando o texto não bate em ninguém */
    dica: function (texto) {
      var t = String(texto || '').trim();
      if (!t || casaToda(t) || API.achar(t)) return '';
      var q = API.parecida(t);
      return (q ? '<span class="ps-dica-p">' + esc(tr('parece ', 'looks like ', 'parece ') + API.rotulo(q.p)) + ' · </span>' : '') +
        '<button type="button" class="linkinho ps-cad" data-acao="ps-cadastrar-texto">' + esc(tr('+ cadastrar esta pessoa', '+ add this person', '+ registrar a esta persona')) + '</button>';
    }
  };

  /* os membros da família na plataforma (com a nuvem) e as pessoas do último resumo do OmniLife */
  API.trazerDaFamilia = async function () {
    var membros = window.MoneyNuvem && MoneyNuvem.membros ? await MoneyNuvem.membros() : [];
    var omni = ((ST.ponte_omnilife || [])[0] || {}).pessoas || [];
    var n = API.prepreencher(membros, omni);
    cfg().pessoasPre = 1;
    return n;
  };
  function trazerUmaVez() {
    var tent = 0;
    (function olhar() {
      if (cfg().pessoasPre) return;
      if (window.MoneyNuvem && MoneyNuvem.iniciado) { API.trazerDaFamilia().then(function (n) { if (n) { Store.salvar(); if (typeof viewAtual !== 'undefined' && viewAtual === 'cfg-pessoas') render(); } }).catch(function () {}); return; }
      if (++tent < 40) setTimeout(olhar, 15000);
    })();
  }

  /* 3.65: quem tem assinatura de IA e software ganha a SolverONE como empresa (uma vez), para o "para quem" (usufruto) */
  API.solverone = function () {
    try {
      if (!temST() || cfg().pessoasSolverone || typeof Gasto === 'undefined' || !Gasto.todos().some(function (g) { return g.sub === 'IA e software'; })) return false;
      if (!API.achar('SolverONE')) lista().push({ id: novoId(), tipo: 'empresa', papel: '', nome: 'SolverONE', meio: '', sobrenome: '', apelido: '', banco: [], cnpj: '', criadoEm: new Date().toISOString() });
      cfg().pessoasSolverone = 1; return true;
    } catch (e) { return false; }
  };

  /* ---------------- tela: Configurações → Pessoas da família ---------------- */
  function euUid() { try { return (window.MoneyNuvem && MoneyNuvem.escopos && MoneyNuvem.escopos.eu && MoneyNuvem.escopos.eu()) || ''; } catch (e) { return ''; } }
  function contaEmail() { try { return (window.MoneyNuvem && MoneyNuvem.email && MoneyNuvem.email()) || ''; } catch (e) { return ''; } }
  function contaNome() { try { return (window.MoneyNuvem && MoneyNuvem.nomePessoa && MoneyNuvem.nomePessoa()) || ''; } catch (e) { return ''; } }
  function formPessoa(p) {
    p = p || { tipo: 'casa', papel: 'responsavel' }; if (!p.id) p = Object.assign({}, p);   /* 1.9.0 (3.144): abre na folha de edição (modulos/folha-editar.js): o título e os botões são dela */
    var chefe = !!p.id && p === API.minhaFicha();   /* 1.8.0 (3.142): o chefe é sempre da casa e responsável (travado) */
    var sel = function (id, op, v, trava) { return '<select id="' + id + '"' + (trava ? ' disabled' : '') + '>' + Object.keys(op).map(function (k) { return '<option value="' + k + '"' + (k === (v || '') ? ' selected' : '') + '>' + esc(tr.apply(null, op[k])) + '</option>'; }).join('') + '</select>'; };
    var cp = function (rot, html, dica) { return '<label class="f"><span class="lb">' + esc(rot) + '</span>' + html + (dica ? '<span class="hint">' + esc(dica) + '</span>' : '') + '</label>'; };
    var inp = function (id, v, ph) { return '<input id="' + id + '" value="' + esc(v || '') + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + ' autocomplete="off">'; };
    return '<div class="card ps-form" data-id="' + esc(p.id || '') + '">' +
      '<div class="grid g2">' +
        '<div class="ps-tipo-destaque">' + cp(tr('Tipo', 'Type', 'Tipo'), sel('psTipo', TIPOS_FORM, p.tipo, chefe)) +
          (p.tipo === 'casa' && API.pareceDeFora(p) && !p.familiaConfirmada ? '<p class="small ps-fora-aviso">⚠ ' + esc(tr('Parece alguém de fora da família. É isso?', 'Looks like someone outside the family. Is that right?', 'Parece alguien de fuera de la familia. ¿Es así?')) + '</p>' : '') + '</div>' +
        '<div class="ps-so-casa">' + cp(tr('Papel na casa', 'Role at home', 'Papel en la casa'), sel('psPapel', { responsavel: PAPEIS.responsavel, dependente: PAPEIS.dependente }, chefe ? 'responsavel' : (API.papelDe(p) || 'responsavel'), chefe)) + '</div>' +
        /* 1.9.0 (3.144): quem é próximo: a relação em 1 toque e o que costuma acontecer (só no app); as contas no nome dela que chegam no e-mail */
        '<div class="ps-so-outra"><div class="f"><span class="lb">' + esc(tr('Quem é para você', 'Who they are to you', 'Quién es para ti')) + '</span><div class="ps-rel" role="radiogroup">' +
          Object.keys(RELACOES).map(function (k) { return '<label class="chip ps-rel-op"><input type="radio" name="psRelacao" value="' + k + '"' + (p.relacao === k ? ' checked' : '') + '> ' + esc(tr.apply(null, RELACOES[k])) + '</label>'; }).join('') + '</div></div>' +
          '<label class="linha-check ps-regra"' + (REGRAS_REL[p.relacao] ? '' : ' hidden') + '><input type="checkbox" id="psRegraUsar"' + (p.regraDesligada ? '' : ' checked') + '> <span id="psRegraTxt">' + esc(regraFrase(p.relacao)) + '</span></label>' +
          contasHtml(p) + '</div>' +
        /* 1.9.0 (3.144, dono: "muitos campos de nome"): Nome (o que aparece no app) e "Como aparece no extrato/Pix"; o nome completo em
           "Mais detalhes"; os nomes antigos ficam guardados sozinhos (aliases); o e-mail virou "Convidar para o MoneyTRIO" */
        cp(tr('Nome', 'Name', 'Nombre'), inp('psNome', p.id ? API.rotulo(p) : ''), tr('É como aparece no app.', 'It is how it shows in the app.', 'Es como aparece en la app.')) +
        '<div class="ps-nao-empresa"><div class="f ps-banco-f"><span class="lb">' + esc(tr('Como aparece no extrato/Pix', 'How it shows on the statement/Pix', 'Cómo aparece en el extracto/Pix')) + '</span>' + chipsBanco(p) +   /* div, não label: o toque no rótulo não pode cair no ✕ de um chip */
          '<span class="hint">' + esc(tr('O app usa para reconhecer a pessoa nos lançamentos do banco.', 'The app uses it to recognise the person in bank entries.', 'La app lo usa para reconocer a la persona en los movimientos del banco.')) + '</span></div></div>' +
        '<div class="ps-so-casa ps-convite">' + (p.email ? '' : '<button type="button" class="btn sm" data-ps-convidar="1">✉️ ' + esc(tr('Convidar para o MoneyTRIO', 'Invite to MoneyTRIO', 'Invitar a MoneyTRIO')) + '</button>') +
          '<div class="ps-email"' + (p.email ? '' : ' hidden') + '>' + cp(tr('E-mail de quem vai entrar', 'E-mail of who will sign in', 'Correo de quien va a entrar'), '<input id="psEmail" type="email" inputmode="email" value="' + esc(p.email || '') + '" autocomplete="off">',
            tr('Liga esta ficha ao convite da família (e à conta da pessoa). Fica no cofre da família.', 'Links this card to the family invite (and to the person\'s account). Kept in the family vault.', 'Vincula esta ficha a la invitación de la familia (y a la cuenta de la persona). Queda en la caja fuerte de la familia.')) + '</div></div>' +
        '<details class="ps-mais ps-nao-empresa"><summary>' + esc(tr('Mais detalhes', 'More details', 'Más detalles')) + '</summary>' +
          cp(tr('Nome completo (opcional)', 'Full name (optional)', 'Nombre completo (opcional)'), inp('psCompleto', p.id ? API.nomeCompleto(p) : ''),
            tr('Ajuda o leitor de documentos a saber de quem é um contrato ou exame.', 'Helps the document reader know whose contract or exam it is.', 'Ayuda al lector de documentos a saber de quién es un contrato o examen.')) + '</details>' +
        '<div class="ps-so-empresa">' + cp(tr('CNPJ (opcional)', 'Company tax ID (optional)', 'CNPJ (opcional)'), inp('psCnpj', p.cnpj, '00.000.000/0000-00'), tr('Dado público. CPF o app não pede.', 'Public data. The app never asks for personal tax IDs.', 'Dato público. La app nunca pide el CPF.')) + '</div>' +
      '</div></div>';
  }
  function regraFrase(rel) {
    var r = REGRAS_REL[rel]; if (!r) return '';
    return (r.fluxo === 'entrada' ? tr('Pix que vem desta pessoa vira ', 'Pix from this person becomes ', 'El Pix de esta persona pasa a ') : tr('Pix para esta pessoa vira ', 'Pix to this person becomes ', 'El Pix a esta persona pasa a ')) +
      API.regraTxt(r) + tr(' (quando chega sem categoria)', ' (when it arrives without a category)', ' (cuando llega sin categoría)');
  }
  function contasHtml(p) {
    var l = p && p.id ? API.contasNoNome(p) : []; if (!l.length) return '';
    return '<div class="f ps-contas"><span class="lb">' + esc(tr('Contas no nome desta pessoa que chegam no seu e-mail', 'Bills in this person\'s name that reach your e-mail', 'Facturas a nombre de esta persona que llegan a tu correo')) + '</span><ul class="small">' +
      l.map(function (t) { return '<li>' + esc((t.marcadores || []).slice(0, 2).join(' · ') || t.nome) + ' — ' + esc(t.acao === 'processar' ? tr('processar', 'process', 'procesar') : tr('ignorar', 'ignore', 'ignorar')) + '</li>'; }).join('') + '</ul></div>';
  }
  document.addEventListener('change', function (ev) {
    var t = ev.target; if (!t || t.name !== 'psRelacao') return;
    var lb = document.querySelector('.ps-regra'), tx = document.getElementById('psRegraTxt'); if (!lb || !tx) return;
    tx.textContent = regraFrase(t.value); lb.hidden = !REGRAS_REL[t.value];
  });
  /* 1.9.0 (3.144): os nomes do extrato/Pix como chips (✕ tira; "+ NOME" das sugestões põe; escrever e Enter põe); o valor vai no psBanco */
  function chipsBanco(p) {
    var l = (p.banco || []).slice(), sg = p.id ? API.sugestoesBanco(p) : [];
    return '<div class="ps-chips" id="psChips">' + l.map(chip).join('') + '</div><input type="hidden" id="psBanco" value="' + esc(l.join(', ')) + '">' +
      '<input id="psBancoNovo" placeholder="' + esc(tr('ex.: MARIA S LIMA — escreva e toque Enter', 'e.g. MARIA S LIMA — type and press Enter', 'ej.: MARIA S LIMA — escribe y pulsa Intro')) + '" autocomplete="off">' +
      (sg.length ? '<div class="ps-sug"><span class="hint">' + esc(tr('Achei nos lançamentos:', 'Found in your entries:', 'Encontrado en los movimientos:')) + '</span> ' +
        sg.map(function (t) { return '<button type="button" class="chip ps-chip-sug" data-pschip-por="' + esc(t) + '">+ ' + esc(t) + '</button>'; }).join(' ') + '</div>' : '');
  }
  function chip(t) { return '<span class="chip ps-chip">' + esc(t) + ' <button type="button" class="ps-chip-x" data-pschip-tirar="' + esc(t) + '" aria-label="' + esc(tr('Tirar ', 'Remove ', 'Quitar ') + t) + '">✕</button></span>'; }
  function chipsLer() { var e = document.getElementById('psBanco'); return e && e.value ? e.value.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : []; }
  function chipsPor(l) {
    var e = document.getElementById('psBanco'), c = document.getElementById('psChips'); if (!e || !c) return;
    e.value = l.join(', '); c.innerHTML = l.map(chip).join('');
    e.dispatchEvent(new Event('change', { bubbles: true }));
  }
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest && ev.target.closest('[data-pschip-tirar], [data-pschip-por], [data-ps-convidar]'); if (!t) return;
    if (t.dataset.psConvidar) { var b = t.closest('.ps-convite'), em = b && b.querySelector('.ps-email'); if (em) { em.hidden = false; t.remove(); var i = em.querySelector('input'); if (i) i.focus(); } return; }
    var l = chipsLer();
    if (t.dataset.pschipTirar != null) chipsPor(l.filter(function (x) { return N(x) !== N(t.dataset.pschipTirar); }));
    else { if (l.map(N).indexOf(N(t.dataset.pschipPor)) < 0) l.push(t.dataset.pschipPor); chipsPor(l); t.remove(); }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' || !ev.target || ev.target.id !== 'psBancoNovo') return;
    ev.preventDefault(); var v = semDoc(ev.target.value).slice(0, 60).trim(); if (!v) return;
    var l = chipsLer(); if (l.map(N).indexOf(N(v)) < 0) l.push(v); chipsPor(l); ev.target.value = '';
  });
  function linhaPessoa(p) {
    var usos = API.usos(p.id);
    var eu = p === API.minhaFicha(), fora = p.tipo === 'casa' && API.pareceDeFora(p) && !p.familiaConfirmada;
    /* 1.9.0 (3.144): o papel (Família) ou a relação (próxima) como texto, sem seletor; o nome completo e os nomes do extrato embaixo */
    var papel = API.papelDe(p), rg = API.regraDe(p);
    var sub = [p.tipo === 'casa' ? (papel ? tr(PAPEIS[papel][0], PAPEIS[papel][1], PAPEIS[papel][2]) + (eu ? ' 🔒' : '') : '') : p.tipo === 'outra' ? API.relacaoTxt(p) : tr(TIPOS[p.tipo][0], TIPOS[p.tipo][1], TIPOS[p.tipo][2]),
      API.nomeCompleto(p) !== API.rotulo(p) ? API.nomeCompleto(p) : '', (p.banco || []).length ? tr('extrato: ', 'statement: ', 'extracto: ') + p.banco.join(', ') : '',
      rg ? tr('Pix → ', 'Pix → ', 'Pix → ') + API.regraTxt(rg) : '',
      p.cnpj ? 'CNPJ ' + p.cnpj : ((p.cnpjs || [])[0] ? 'CNPJ ' + p.cnpjs[0].replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : '')].filter(Boolean).join(' · ');   /* o idp nunca aparece */
    return '<tr data-ps="' + esc(p.id) + '"' + (p.arquivada ? ' class="muted"' : '') + '><td><span class="t-main">' + esc(docMascara(API.rotulo(p))) +
      (eu ? ' <span class="small muted ps-voce">(' + esc(tr('você · chefe', 'you · head', 'tú · jefe')) + ')</span>' : '') +
      (p.arquivada ? ' <span class="small">(' + esc(tr('arquivada', 'archived', 'archivada')) + ')</span>' : '') + '</span><div class="t-sub">' + esc(docMascara(sub)) + '</div>' +
      (fora ? '<div class="small ps-fora-linha">⚠ ' + esc(tr('Parece alguém que não mora com você.', 'Looks like someone who does not live with you.', 'Parece alguien que no vive contigo.')) +
        ' <button type="button" class="btn sm" data-acao="ps-mora" data-id="' + esc(p.id) + '">' + esc(tr('Mora comigo', 'Lives with me', 'Vive conmigo')) + '</button>' +
        ' <button type="button" class="btn sm" data-acao="ps-fora" data-id="' + esc(p.id) + '">' + esc(tr('Mover para Pessoas próximas', 'Move to Close people', 'Mover a Personas cercanas')) + '</button></div>' : '') + '</td>' +
      '<td class="num small muted">' + usos + '</td><td class="num"><div class="row" style="gap:4px;justify-content:flex-end">' +
      '<button class="btn sm" data-acao="ps-editar" data-id="' + esc(p.id) + '">' + esc(tr('editar', 'edit', 'editar')) + '</button>' +
      (p.arquivada ? '<button class="btn sm" data-acao="ps-desarquivar" data-id="' + esc(p.id) + '">' + esc(tr('voltar', 'restore', 'restaurar')) + '</button>'
        : (usos ? '<button class="btn sm" data-acao="ps-arquivar" data-id="' + esc(p.id) + '">' + esc(tr('arquivar', 'archive', 'archivar')) + '</button>'
          : '<button class="btn sm" data-acao="ps-apagar" data-id="' + esc(p.id) + '">' + esc(tr('apagar', 'delete', 'borrar')) + '</button>')) +
      '</div></td></tr>';
  }
  /* 1.9.0 (3.144): editar e "+ Adicionar" abrem numa folha própria (modulos/folha-editar.js): tela inteira no celular, painel no computador,
     a lista atrás bloqueada, [Cancelar] [Salvar] fixos embaixo, o Voltar do celular = Cancelar. Ao fechar, a lista volta para o mesmo ponto.
     foco: o Tipo ao editar; o Nome quando se abre a pessoa para renomear (tocar no nome no saldo do banco). */
  function abrirFolha(p, foco, tipo) {
    var salvo = '';
    var novo = { tipo: TIPOS[tipo] ? tipo : 'casa', papel: tipo === 'outra' || tipo === 'empresa' ? '' : 'responsavel' };
    Folha.abrir({ titulo: p ? tr('Editar', 'Edit', 'Editar') + ' · ' + API.rotulo(p) : tr('Nova pessoa', 'New person', 'Nueva persona'), html: formPessoa(p || novo), foco: '#' + (foco || (p ? 'psTipo' : 'psNome')),
      salvar: function () { var q = API.salvar(lerForm()); salvo = q.id; Store.salvar(); render(); toast(tr('Salvo: ', 'Saved: ', 'Guardado: ') + API.rotulo(q)); return true; },
      /* a lista volta ao mesmo ponto; se a ficha salva mudou de lugar (outro nome, outra parte), vai até ela */
      depois: function () { setTimeout(function () { var e = salvo && document.querySelector('[data-ps="' + salvo + '"]'), r = e && e.getBoundingClientRect(); if (r && (r.top < 0 || r.bottom > innerHeight)) e.scrollIntoView({ block: 'center' }); }, 80); } });   /* depois do render (que repõe a rolagem) */
    mostrarCampos();
  }
  /* apagar e arquivar sem confirm(): faz na hora e mostra "Apagado: X · Desfazer" por 8 s */
  function comDesfazer(msg, desfaz) {
    toast(msg, { tempo: 8000, acao: { rotulo: tr('Desfazer', 'Undo', 'Deshacer'), fn: function () { desfaz(); Store.salvar(); render(); } } });
  }
  /* 1.8.0 (3.142): vai para "Outras pessoas" na hora, com "Desfazer" (o papel "Não é da família" e o "Sim" do "é isso?") */
  function paraFora(p) {
    var antes = { tipo: p.tipo, papel: p.papel, casa: !!(ST.visaoCasa && (ST.visaoCasa.pessoas || []).indexOf(p.id) >= 0) };
    p.tipo = 'outra'; p.papel = ''; delete p.revisar;
    if (ST.visaoCasa && Array.isArray(ST.visaoCasa.pessoas)) ST.visaoCasa.pessoas = ST.visaoCasa.pessoas.filter(function (id) { return id !== p.id; });
    if (!lista().some(function (x) { return x.tipo === 'casa' && !x.arquivada && !x.papel && x !== API.minhaFicha(); })) delete cfg().pessoasRevisar;
    Store.salvar(); render();
    comDesfazer(API.rotulo(p) + tr(' agora está em Outras pessoas.', ' is now in Other people.', ' ahora está en Otras personas.'), function () {
      p.tipo = antes.tipo; p.papel = antes.papel;
      if (antes.casa) { var v = ST.visaoCasa = Object.assign({ pessoas: [] }, ST.visaoCasa); if (v.pessoas.indexOf(p.id) < 0) v.pessoas.push(p.id); } });
  }
  function tela() {
    if (!cfg().pessoasV) API.migrar();
    API.solverone();
    /* 1.9.0 (3.144): um cartão "👥 Pessoas" com três partes, cada uma com o seu "+ Adicionar": Família (mora com você — toda ela conta na parte
       da casa), Pessoas próximas (não moram com você — nunca entram nos gastos da casa; servem para reconhecer Pix e as contas no nome delas)
       e Empresas */
    var h = '<div class="card-head"><h1>👥 ' + esc(tr('Pessoas', 'People', 'Personas')) + '</h1>' +
      (window.MoneyNuvem && MoneyNuvem.iniciado ? '<div class="row" style="gap:6px"><button class="btn sm" data-acao="ps-familia">' + esc(tr('Trazer da família', 'Bring from the family', 'Traer de la familia')) + '</button></div>' : '') + '</div>' +
      '<p class="small muted aba-explica">' + esc(tr('Quem aparece nos lançamentos, compromissos e rendas. Mudou o nome aqui, muda em tudo na hora. CPF o app não pede.',
        'Who shows up in entries, commitments and income. Rename here and it changes everywhere at once. The app never asks for personal tax IDs.',
        'Quién aparece en los movimientos, compromisos e ingresos. Si cambias el nombre aquí, cambia en todo al momento. La app no pide el CPF.')) + '</p>';
    /* 1.7.0 (3.132): a ordem — "a mesma pessoa?" no topo, a família, as outras pessoas, as empresas; os nomes soltos no fim, recolhidos */
    var mp = API.mesmaPessoa();
    if (mp) h += '<div class="callout ps-juntar"><b>' + esc(tr(API.rotulo(mp.sai) + ' e ' + API.rotulo(mp.fica) + ' são a mesma pessoa?', 'Are ' + API.rotulo(mp.sai) + ' and ' + API.rotulo(mp.fica) + ' the same person?', '¿' + API.rotulo(mp.sai) + ' y ' + API.rotulo(mp.fica) + ' son la misma persona?')) + '</b> ' +
      esc(tr('Juntar: os lançamentos das duas ficam numa só, e "' + API.rotulo(mp.sai) + '" vai para "Também chamado".', 'Merge: the entries of both stay in one, and "' + API.rotulo(mp.sai) + '" goes to "Also called".', 'Juntar: los movimientos de las dos quedan en una sola, y "' + API.rotulo(mp.sai) + '" pasa a "También llamado".')) +
      ' <button class="btn sm primary" data-acao="ps-juntar" data-fica="' + esc(mp.fica.id) + '" data-sai="' + esc(mp.sai.id) + '">' + esc(tr('Juntar', 'Merge', 'Juntar')) + '</button>' +
      ' <button class="btn sm" data-acao="ps-juntar-nao" data-par="' + esc(mp.sai.id + '|' + mp.fica.id) + '">' + esc(tr('Não são', 'They are not', 'No lo son')) + '</button></div>';
    var titulos = { casa: [tr('Família', 'Family', 'Familia'), tr('Moram com você. Todos entram na parte da casa.', 'They live with you. All of them go into the household part.', 'Viven contigo. Todos entran en la parte de la casa.')],
      outra: [tr('Pessoas próximas', 'Close people', 'Personas cercanas'), tr('Não moram com você (pais, sogros, diarista, inquilino…). Não entram nos gastos da casa: servem para reconhecer Pix e as contas no nome delas.', 'They do not live with you (parents, in-laws, cleaner, tenant…). They never go into household spending: they help recognise Pix and bills in their name.', 'No viven contigo (padres, suegros, asistenta, inquilino…). No entran en los gastos de la casa: sirven para reconocer Pix y las facturas a su nombre.')],
      empresa: [tr.apply(null, TIPOS_FORM.empresa), ''] };
    ['casa', 'outra', 'empresa'].forEach(function (tp) {
      var eu = API.minhaFicha();   /* 1.8.0 (3.142): o chefe (você) sempre primeiro */
      var l = lista().filter(function (p) { return p.tipo === tp; }).sort(function (a, b) { return (b === eu ? 1 : 0) - (a === eu ? 1 : 0) || (a.arquivada ? 1 : 0) - (b.arquivada ? 1 : 0) || API.rotulo(a).localeCompare(API.rotulo(b)); });
      h += '<div class="card sem-pad ps-grupo" data-grupo="' + tp + '"><div class="card-head" style="padding:12px 16px 0"><h3>' + esc(titulos[tp][0]) + '</h3>' +
        '<button class="btn sm primary" data-acao="ps-novo" data-tipo="' + tp + '">' + esc(tr('+ Adicionar', '+ Add', '+ Añadir')) + '</button></div>' +
        (titulos[tp][1] ? '<p class="small muted" style="padding:0 16px;margin:4px 0 8px">' + esc(titulos[tp][1]) + '</p>' : '') +
        (l.length ? '<table class="tbl"><thead><tr><th>' + esc(tr('Nome', 'Name', 'Nombre')) + '</th><th class="num">' + esc(tr('usos', 'uses', 'usos')) + '</th><th></th></tr></thead><tbody>' + l.map(linhaPessoa).join('') + '</tbody></table>'
          : '<p class="small muted" style="padding:0 16px 12px;margin:0">' + esc(tr('Ninguém ainda.', 'Nobody yet.', 'Nadie todavía.')) + '</p>') + '</div>';
    });
    var q = API.perguntas();
    if (q.length) {
      h += '<div class="card"><div class="card-head"><h3>' + esc(tr('É a mesma pessoa?', 'Is it the same person?', '¿Es la misma persona?')) + ' <b>' + q.length + '</b></h3></div>' +
        '<p class="small muted" style="margin:0 0 8px">' + esc(tr('Nomes parecidos, mas sem certeza. Responda uma vez por nome.', 'Similar names, but not certain. Answer once per name.', 'Nombres parecidos, pero sin certeza. Responde una vez por nombre.')) + '</p>';
      q.slice(0, 20).forEach(function (x) {
        /* 1.9.0 (3.144): "É a Ana (sogra)? [Sim, é Ana]" — com a relação de quem é próximo */
        var rel = API.relacaoTxt(x.sugestao), nm = API.rotulo(x.sugestao);
        h += '<div class="ps-q"><span>“' + esc(docMascara(x.texto)) + '” (' + x.n + ') — ' + esc(tr('é ', 'is it ', '¿es ')) + '<b>' + esc(nm + (rel ? ' (' + rel.toLowerCase() + ')' : '')) + '</b>?</span>' +
          '<button class="btn sm primary" data-acao="ps-e-sim" data-texto="' + esc(x.texto) + '" data-id="' + esc(x.sugestao.id) + '">' + esc(tr('Sim, é ', 'Yes, it is ', 'Sí, es ') + nm) + '</button>' +
          '<button class="btn sm" data-acao="ps-e-nao" data-texto="' + esc(x.texto) + '">' + esc(tr('Não', 'No', 'No')) + '</button></div>';
      });
      h += '</div>';
    }
    var ai = API.aIdentificar();
    if (ai.length) {
      h += '<details class="card ps-soltos"><summary class="small">' + esc(ai.length + (ai.length === 1 ? tr(' nome solto nos lançamentos · ver', ' loose name in your entries · see', ' nombre suelto en los movimientos · ver') : tr(' nomes soltos nos lançamentos · ver', ' loose names in your entries · see', ' nombres sueltos en los movimientos · ver'))) + '</summary>' +
        '<p class="small muted" style="margin:8px 0">' + esc(tr('Textos que não batem com ninguém. Podem ficar assim (vizinho, pagamento pontual) ou virar pessoa.',
          'Loose names that match nobody. They can stay as they are (neighbour, one-off payment) or become a person.')) + '</p>';
      ai.slice(0, 30).forEach(function (x) {
        h += '<div class="ps-q"><span>“' + esc(docMascara(x.texto)) + '” (' + x.n + ')</span>' +
          '<button class="btn sm" data-acao="ps-cadastrar-texto" data-texto="' + esc(x.texto) + '">' + esc(tr('+ cadastrar', '+ add', '+ registrar')) + '</button></div>';
      });
      h += '</details>';
    }
    return h;
  }
  function lerForm() {
    var v = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
    var f = document.querySelector('.ps-form');
    var novo = semDoc(v('psBancoNovo')).trim(), banco = v('psBanco') + (novo ? ', ' + novo : '');   /* o que ficou escrito sem Enter também entra */
    var rel = document.querySelector('input[name="psRelacao"]:checked'), ru = document.getElementById('psRegraUsar');
    return { id: f ? f.dataset.id : '', tipo: v('psTipo'), papel: v('psPapel'), nome: v('psNome'), completo: v('psCompleto'), banco: banco, cnpj: v('psCnpj'), email: v('psEmail'),
      relacao: rel ? rel.value : '', regraDesligada: !!(ru && !ru.checked) };   /* 1.9.0 (3.144) */
  }
  function salvarERender(msg) { Store.salvar(); render(); if (msg) toast(msg); }

  /* "+ cadastrar esta pessoa" debaixo de qualquer campo marcado com data-pessoa */
  function atualizarDica(inp) {
    var alvo = inp.parentNode && inp.parentNode.querySelector('.ps-dica');
    if (!alvo) { alvo = document.createElement('span'); alvo.className = 'ps-dica hint'; inp.insertAdjacentElement('afterend', alvo); }
    alvo.innerHTML = API.dica(inp.value);
    alvo.dataset.para = inp.id || '';
  }
  document.addEventListener('input', function (e) { var t = e.target; if (t && t.matches && t.matches('input[data-pessoa]')) atualizarDica(t); });
  document.addEventListener('change', function (e) { var t = e.target; if (t && t.matches && t.matches('#psTipo')) mostrarCampos(); });
  function mostrarCampos() {
    var tp = (document.getElementById('psTipo') || {}).value || 'casa';
    document.querySelectorAll('.ps-so-casa').forEach(function (x) { x.hidden = tp !== 'casa'; });
    document.querySelectorAll('.ps-nao-empresa').forEach(function (x) { x.hidden = tp === 'empresa'; });
    document.querySelectorAll('.ps-so-empresa').forEach(function (x) { x.hidden = tp !== 'empresa'; });
    document.querySelectorAll('.ps-so-outra').forEach(function (x) { x.hidden = tp !== 'outra'; });   /* 1.9.0 (3.144) */
  }

  MoneyModulos.registrar({
    id: 'pessoas',
    versao: '1.9.1',
    colecoes: [COL],
    ouvir: { 'gasto.novo': function (g) { API.aplicarRegra(g); } },   /* 1.9.0 (3.144): o que costuma acontecer com quem é próximo (só no app) */
    iniciar: function () {
      try { if (ST && !cfg().pessoasV && (ST.gastos || []).length + (ST.recorrentes || []).length) { API.migrar(); Store.salvar(); } } catch (e) { console.warn('pessoas', e); }
      try { if (API.migrar3144()) Store.salvar(); } catch (e) { console.warn('pessoas 3144', e); }   /* 1.9.0 (3.144): Nome + nome completo */
      try {   /* 1.1.0: apelido da casa que tinha ido para "nome no banco" (migração da 3.64) passa para aliases */
        if (temST() && cfg().pessoasV === 1) {
          lista().forEach(function (p) { var fica = [], vai = p.aliases || []; (p.banco || []).forEach(function (b) { (/\s/.test(String(b).trim()) ? fica : vai).push(b); }); p.banco = fica; if (vai.length) p.aliases = vai; });
          cfg().pessoasV = 2; Store.salvar();
        }
      } catch (e) {}
      trazerUmaVez();
      API.solverone();
      API.foraParaOutras();
    },
    pontos: {
      'config.todos': function () {
        var n = API.ativas().length, q = API.perguntas().length + API.aIdentificar().length;
        return '<div class="card cfg-sec" data-sec="todos" data-ajuda="pessoas-familia"><div class="card-head"><h3>👥 ' + esc(tr('Pessoas da família', 'Family people', 'Personas de la familia')) + '</h3>' +   /* 3.138: o mapa do AssistONE */
          '<button class="btn sm" data-irpara="cfg-pessoas">' + esc(tr('Abrir', 'Open', 'Abrir')) + ' ›</button></div>' +
          '<p class="small muted" style="margin:0">' + esc(n + tr(' cadastrada(s)', ' registered', ' registrada(s)')) + (q ? ' · ' + esc(q + tr(' nome(s) para conferir', ' name(s) to check', ' nombre(s) para revisar')) : '') +
          '</p></div>';
      }
    },
    telas: { 'cfg-pessoas': { app: 'budget', render: function () { var h = tela(); setTimeout(mostrarCampos, 0); return h; },
      ajuda: { pt: { t: 'Pessoas da família', o: 'Quem aparece nos lançamentos; renomear muda em tudo.' }, en: { t: 'Family people', o: 'Who shows up in entries; renaming changes everywhere.' } } } },
    acoes: {
      'ps-novo': function (el) { abrirFolha(null, null, el && el.dataset.tipo); },
      'ps-titular-sim': function (el) { API.confirmarParecida(el.dataset.texto, el.dataset.id); salvarERender(tr('Guardado: esse nome do banco é dessa pessoa.', 'Saved: that bank name belongs to this person.', 'Guardado: ese nombre del banco es de esta persona.')); },
      'ps-familia': function () { API.trazerDaFamilia().then(function (n) { salvarERender(n ? n + tr(' pessoa(s) trazida(s) da família.', ' person(s) brought from the family.', ' persona(s) traída(s) de la familia.') : tr('Ninguém novo na família.', 'Nobody new in the family.', 'Nadie nuevo en la familia.')); }); },
      'ps-editar': function (el) { abrirFolha(API.porId(el.dataset.id)); },
      /* 3.116: de um aviso (ex.: o saldo previsto), tocar no nome da pessoa abre a ficha dela aqui */
      'ps-abrir': function (el) { var p = API.porId(el.dataset.id); if (el.closest('#genModal') && typeof fechar === 'function') fechar('genModal'); if (typeof irPara === 'function') irPara('cfg-pessoas'); else render(); if (p) abrirFolha(p, 'psNome'); },   /* 3.144: renomear = o Nome */
      'ps-lista': function (el) { if (el.closest('#genModal') && typeof fechar === 'function') fechar('genModal'); if (typeof irPara === 'function') irPara('cfg-pessoas'); else render(); },   /* 1.5.0 (3.125): os atalhos abrem Pessoas da família */
      'ps-arquivar': function (el) {
        var id = el.dataset.id, p = API.arquivar(id); salvarERender();
        if (p) comDesfazer(tr('Arquivado: ', 'Archived: ', 'Archivado: ') + API.rotulo(p), function () { API.desarquivar(id); });
      },
      'ps-desarquivar': function (el) { API.desarquivar(el.dataset.id); salvarERender(); },
      'ps-apagar': function (el) {
        var id = el.dataset.id, i = lista().findIndex(function (x) { return x.id === id; }), copia = i >= 0 ? JSON.parse(JSON.stringify(lista()[i])) : null;
        try { API.apagar(id); salvarERender(); } catch (e) { return toast(e.message, 'warn'); }
        if (copia) comDesfazer(tr('Apagado: ', 'Deleted: ', 'Borrado: ') + API.rotulo(copia), function () { if (!API.porId(copia.id)) lista().splice(Math.min(i, lista().length), 0, copia); });
      },
      'ps-juntar': function (el) { var n = API.juntar(el.dataset.fica, el.dataset.sai); salvarERender(tr('Juntadas: ', 'Merged: ', 'Juntadas: ') + n + tr(' registro(s).', ' record(s).', ' registro(s).')); },
      'ps-juntar-nao': function (el) { (cfg().psJuntarNao = cfg().psJuntarNao || {})[el.dataset.par] = 1; salvarERender(); },
      'ps-fora': function (el) { var p = API.porId(el.dataset.id); if (p) paraFora(p); },
      'ps-mora': function (el) { var p = API.porId(el.dataset.id); if (p) { p.familiaConfirmada = true; salvarERender(); } },   /* 1.9.0 (3.144) */
      'ps-e-sim': function (el) { var n = API.confirmarParecida(el.dataset.texto, el.dataset.id); salvarERender(n + tr(' registro(s) ligado(s).', ' record(s) linked.', ' registro(s) vinculado(s).')); },
      'ps-e-nao': function (el) { API.naoEhParecida(el.dataset.texto); salvarERender(); },
      'ps-cadastrar-texto': function (el) {
        var dica = el.closest('.ps-dica'), inp = dica && dica.dataset.para ? document.getElementById(dica.dataset.para) : null;
        var texto = el.dataset.texto || (inp ? inp.value : '');
        if (!String(texto).trim()) return;
        texto = semDoc(texto); var doBanco = /^[A-Z0-9 .'-]{4,}$/.test(String(texto).trim());
        var p = API.salvar({ tipo: /\b(LTDA|S\.?A|ME|EIRELI|EPP)\b/i.test(texto) ? 'empresa' : 'outra', nome: titulo(texto), apelido: doBanco ? titulo(texto) : String(texto).trim(), banco: doBanco ? [texto] : [], aliases: doBanco ? [] : [texto] });
        Store.salvar();
        if (inp) { inp.value = API.rotulo(p); atualizarDica(inp); toast(tr('Cadastrado: ', 'Added: ', 'Registrado: ') + API.rotulo(p)); }
        else { render(); abrirFolha(p); }
      }
    }
  });
  window.Pessoas = API;
})();
