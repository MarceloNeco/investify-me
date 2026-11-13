/* =====================================================================
   modulos/pessoas.js — pessoas da família, outras pessoas e empresas (3.64)        1.3.0 · 13/Nov/2026
   ---------------------------------------------------------------------
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
  var TIPOS = { casa: ['Da casa', 'Household'], outra: ['Outras pessoas', 'Other people'], empresa: ['Empresas e instituições', 'Companies and institutions'] };
  var PAPEIS = { responsavel: ['Responsável', 'Guardian'], dependente: ['Dependente', 'Dependant'], '': ['papel a definir', 'role not set'] };
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function temST() { return typeof ST !== 'undefined' && !!ST; }
  function lista() { if (!temST()) return []; return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function cfg() { return temST() ? (ST.config = ST.config || {}) : {}; }
  function novoId() { return 'ps' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function titulo(t) { return String(t || '').toLowerCase().replace(/(^|\s)\S/g, function (m) { return m.toUpperCase(); }).trim(); }
  function casaToda(t) { return /^(casa|home)\b/i.test(String(t || '').trim()); }

  /* as chaves que reconhecem a pessoa: nome mostrado, primeiro nome, nome completo e os apelidos do banco */
  function chaves(p) {
    var k = {}, add = function (x) { x = N(x); if (x) k[x] = 1; };
    add(API.rotulo(p)); add(p.nome); add([p.nome, p.sobrenome].join(' ')); add(API.nomeCompleto(p)); add(p.apelido);
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
      if (p.tipo === 'empresa') return String(p.nome || '').trim();
      return String(p.nome || '').trim().split(/\s+/)[0] || '';
    },
    /* como o banco costuma escrever o nome de quem é da casa (sem o apelido) */
    nomesDoBanco: function (p) {
      var ws = [p.nome, p.meio, p.sobrenome].join(' ').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(Boolean);
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
    nomeCompleto: function (p) { return p ? [p.nome, p.meio, p.sobrenome].map(function (x) { return String(x || '').trim(); }).filter(Boolean).join(' ') : ''; },
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
      if (p) { o[campoId] = p.id; o[campo] = API.rotulo(p); }
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
      var nome = API.rotulo(p), n = 0;
      cadaRegistro(function (o) { PARES.forEach(function (x) { if (o[x[1]] === id && o[x[0]] !== nome) { o[x[0]] = nome; n++; } }); });
      if (typeof Gasto !== 'undefined') Gasto._idx = null;
      return n;
    },
    salvar: function (d) {
      var p = d.id ? API.porId(d.id) : null;
      var limpo = {
        tipo: TIPOS[d.tipo] ? d.tipo : 'casa',
        papel: d.tipo === 'casa' || !d.tipo ? (d.papel === 'dependente' ? 'dependente' : (d.papel === 'responsavel' ? 'responsavel' : '')) : '',
        nome: String(d.nome || '').trim().slice(0, 80), meio: String(d.meio || '').trim().slice(0, 80),
        sobrenome: String(d.sobrenome || '').trim().slice(0, 120), apelido: String(d.apelido || '').trim().slice(0, 40),
        banco: (Array.isArray(d.banco) ? d.banco : String(d.banco || '').split(/[,;\n]/)).map(function (x) { return String(x).trim().slice(0, 60); }).filter(Boolean)
          .filter(function (x, i, a) { return a.map(N).indexOf(N(x)) === i; }),
        cnpj: d.tipo === 'empresa' ? String(d.cnpj || '').replace(/[^\d./-]/g, '').slice(0, 18) : ''
      };
      if (d.aliases != null) limpo.aliases = (Array.isArray(d.aliases) ? d.aliases : String(d.aliases).split(/[,;\n]/)).map(function (x) { return String(x).trim().slice(0, 40); }).filter(Boolean);
      if (!limpo.nome) throw new Error(tr('Escreva o nome.', 'Type the name.'));
      if (d.uid) limpo.uid = String(d.uid); if (d.perfil) limpo.perfil = String(d.perfil);
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
      if (API.usos(id)) throw new Error(tr('Tem lançamento com esta pessoa: use Arquivar.', 'There are entries with this person: use Archive.'));
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
      cadaRegistro(function (o) {
        PARES.forEach(function (x) {
          if (typeof o[x[0]] !== 'string') return;   /* ex.: "quem vai" dos trajetos é uma lista */
          var t = o[x[0]].trim();
          if (!t || o[x[1]] || casaToda(t)) return;
          var k = N(t); (c[k] = c[k] || { texto: t, n: 0 }).n++;
        });
      });
      return Object.keys(c).map(function (k) { return c[k]; }).sort(function (a, b) { return b.n - a.n; });
    },
    perguntas: function () {
      return API.soltos().map(function (s) { var q = API.parecida(s.texto); return q ? { texto: s.texto, n: s.n, sugestao: q.p } : null; }).filter(Boolean);
    },
    aIdentificar: function () {
      return API.soltos().filter(function (s) { return !API.parecida(s.texto) && !(cfg().pessoasNao || {})[N(s.texto)]; });
    },
    confirmarParecida: function (texto, id) {
      var p = API.porId(id); if (!p) return 0;
      var t = String(texto).trim().slice(0, 60), doBanco = /^[A-Z0-9 .'-]{4,}$/.test(t) && /\s/.test(t);   /* "MARIA S LIMA" é do extrato; "Neco" é apelido */
      var l = doBanco ? (p.banco = p.banco || []) : (p.aliases = p.aliases || []);
      if (l.map(N).indexOf(N(t)) < 0) l.push(t);
      return API.religar();
    },
    naoEhParecida: function (texto) { (cfg().pessoasNao = cfg().pessoasNao || {})[N(texto)] = 1; },
    /* "Neco", "Beta", "PJ"… viram pessoas; o texto de hoje fica como apelido do banco (o extrato continua batendo) */
    migrar: function () {
      if (cfg().pessoasV >= 1) return 0;   /* (1 = migrou na 3.64; 2 = aliases separados na 3.65) */
      var criadas = 0;
      API.soltos().forEach(function (s) {
        if (API.achar(s.texto) || API.parecida(s.texto)) return;   /* parecido com quem já entrou: pergunta depois ("é a mesma pessoa?") */
        var empresa = /^pj$/i.test(s.texto.trim()), varias = /\s/.test(s.texto.trim());
        lista().push({ id: novoId(), tipo: empresa ? 'empresa' : 'casa', papel: '', nome: empresa ? 'PJ' : titulo(s.texto), meio: '', sobrenome: '', apelido: empresa ? 'PJ' : (varias ? s.texto.trim() : ''),
          banco: [], aliases: [s.texto.trim()], cnpj: '', revisar: true, criadoEm: new Date().toISOString() });
        criadas++;
      });
      API.religar();
      cfg().pessoasV = 2;
      if (criadas) cfg().pessoasRevisar = true;
      return criadas;
    },
    /* membros da plataforma: [{id, user_id, perfil_id, apelido, papel}] · OmniLife: [{perfil_id, apelido}] */
    prepreencher: function (membros, omni) {
      var n = 0;
      (membros || []).forEach(function (m) {
        var ap = String(m.apelido || '').trim(); if (!ap) return;
        var p = lista().find(function (x) { return (m.user_id && x.uid === m.user_id) || (m.perfil_id && x.perfil === m.perfil_id); }) || API.achar(ap);
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
      return (q ? '<span class="ps-dica-p">' + esc(tr('parece ', 'looks like ') + API.rotulo(q.p)) + ' · </span>' : '') +
        '<button type="button" class="linkinho ps-cad" data-acao="ps-cadastrar-texto">' + esc(tr('+ cadastrar esta pessoa', '+ add this person')) + '</button>';
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
  var editando = null;   /* id ou 'novo' */
  function formPessoa(p) {
    p = p || { tipo: 'casa', papel: 'responsavel' };
    var sel = function (id, op, v) { return '<select id="' + id + '">' + Object.keys(op).map(function (k) { return '<option value="' + k + '"' + (k === (v || '') ? ' selected' : '') + '>' + esc(op[k][pt() ? 0 : 1]) + '</option>'; }).join('') + '</select>'; };
    var cp = function (rot, html, dica) { return '<label class="f"><span class="lb">' + esc(rot) + '</span>' + html + (dica ? '<span class="hint">' + esc(dica) + '</span>' : '') + '</label>'; };
    var inp = function (id, v, ph) { return '<input id="' + id + '" value="' + esc(v || '') + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + ' autocomplete="off">'; };
    return '<div class="card ps-form" data-id="' + esc(p.id || '') + '"><div class="card-head"><h3>' + esc(p.id ? tr('Editar', 'Edit') + ' · ' + API.rotulo(p) : tr('Nova pessoa', 'New person')) + '</h3></div>' +
      '<div class="grid g2">' +
        cp(tr('Tipo', 'Type'), sel('psTipo', TIPOS, p.tipo)) +
        '<div class="ps-so-casa">' + cp(tr('Papel na casa', 'Role at home'), sel('psPapel', { responsavel: PAPEIS.responsavel, dependente: PAPEIS.dependente }, p.papel || 'responsavel')) + '</div>' +
        cp(tr('Nome', 'First name'), inp('psNome', p.nome)) +
        '<div class="ps-nao-empresa">' + cp(tr('Nome do meio (opcional)', 'Middle name (optional)'), inp('psMeio', p.meio)) + '</div>' +
        '<div class="ps-nao-empresa">' + cp(tr('Sobrenome', 'Last name'), inp('psSobrenome', p.sobrenome), tr('O nome completo ajuda o leitor de documentos a saber de quem é um contrato ou exame.', 'The full name helps the document reader know whose contract or exam it is.')) + '</div>' +
        cp(tr('Apelido (como aparece no app)', 'Nickname (how it shows in the app)'), inp('psApelido', p.apelido, tr('vazio = o primeiro nome', 'blank = first name'))) +
        cp(tr('Nomes no banco (como aparece no extrato)', 'Names at the bank (as on the statement)'), inp('psBanco', (p.banco || []).join(', '), tr('ex.: MARIA S LIMA — separe por vírgula', 'e.g. MARIA S LIMA — comma separated')),
          p.tipo === 'casa' && API.nomesDoBanco(p).length ? tr('Já reconhecidos pelo nome completo: ', 'Already recognised from the full name: ') + API.nomesDoBanco(p).join(' · ') : '') +
        cp(tr('Também chamado no app', 'Also called in the app'), inp('psAliases', (p.aliases || []).join(', '), tr('nomes antigos, apelidos do robô', 'old names, robot nicknames'))) +
        '<div class="ps-so-empresa">' + cp(tr('CNPJ (opcional)', 'Company tax ID (optional)'), inp('psCnpj', p.cnpj, '00.000.000/0000-00'), tr('Dado público. CPF o app não pede.', 'Public data. The app never asks for personal tax IDs.')) + '</div>' +
      '</div>' +
      '<div class="f-actions"><button class="btn" data-acao="ps-cancelar">' + esc(tr('Cancelar', 'Cancel')) + '</button>' +
      '<button class="btn primary" data-acao="ps-salvar">' + esc(tr('Salvar', 'Save')) + '</button></div></div>';
  }
  function linhaPessoa(p) {
    var usos = API.usos(p.id);
    var sub = [p.tipo === 'casa' ? (PAPEIS[p.papel || ''] || PAPEIS[''])[pt() ? 0 : 1] : TIPOS[p.tipo][pt() ? 0 : 1],
      API.nomeCompleto(p) !== API.rotulo(p) ? API.nomeCompleto(p) : '', (p.banco || []).length ? tr('extrato: ', 'statement: ') + p.banco.join(', ') : '',
      p.cnpj ? 'CNPJ ' + p.cnpj : ((p.cnpjs || [])[0] ? 'CNPJ ' + p.cnpjs[0].replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : '')].filter(Boolean).join(' · ');   /* o idp nunca aparece */
    return '<tr' + (p.arquivada ? ' class="muted"' : '') + '><td><span class="t-main">' + esc(API.rotulo(p)) + (p.revisar ? ' <span class="ps-novo">' + esc(tr('revisar', 'review')) + '</span>' : '') +
      (p.arquivada ? ' <span class="small">(' + esc(tr('arquivada', 'archived')) + ')</span>' : '') + '</span><div class="t-sub">' + esc(sub) + '</div></td>' +
      '<td class="num small muted">' + usos + '</td><td class="num"><div class="row" style="gap:4px;justify-content:flex-end">' +
      '<button class="btn sm" data-acao="ps-editar" data-id="' + esc(p.id) + '">' + esc(tr('editar', 'edit')) + '</button>' +
      (p.arquivada ? '<button class="btn sm" data-acao="ps-desarquivar" data-id="' + esc(p.id) + '">' + esc(tr('voltar', 'restore')) + '</button>'
        : (usos ? '<button class="btn sm" data-acao="ps-arquivar" data-id="' + esc(p.id) + '">' + esc(tr('arquivar', 'archive')) + '</button>'
          : '<button class="btn sm" data-acao="ps-apagar" data-id="' + esc(p.id) + '">' + esc(tr('apagar', 'delete')) + '</button>')) +
      '</div></td></tr>';
  }
  function tela() {
    if (!cfg().pessoasV) API.migrar();
    API.solverone();
    var h = '<div class="card-head"><h1>👥 ' + esc(tr('Pessoas da família', 'Family people')) + '</h1>' +
      '<div class="row" style="gap:6px">' + (window.MoneyNuvem && MoneyNuvem.iniciado ? '<button class="btn sm" data-acao="ps-familia">' + esc(tr('Trazer da família', 'Bring from the family')) + '</button>' : '') +
      '<button class="btn sm primary" data-acao="ps-novo">' + esc(tr('+ Adicionar', '+ Add')) + '</button></div></div>' +
      '<p class="small muted aba-explica">' + esc(tr('Quem aparece nos lançamentos, compromissos e rendas. Mudou o nome aqui, muda em tudo na hora. CPF o app não pede.',
        'Who shows up in entries, commitments and income. Rename here and it changes everywhere at once. The app never asks for personal tax IDs.')) + '</p>';
    if (cfg().pessoasRevisar) h += '<div class="callout ps-revise"><b>' + esc(tr('Revise a lista uma vez', 'Review the list once')) + '</b> — ' +
      esc(tr('o app montou esta lista com os nomes que já estavam nos lançamentos e com a família da plataforma. Ajuste nomes, apelidos e quem é dependente.',
        'the app built this list from the names already in your entries and from the family on the platform. Fix names, nicknames and who is a dependant.')) +
      ' <button class="btn sm" data-acao="ps-revisado">' + esc(tr('Está certo', 'Looks right')) + '</button></div>';
    if (editando) h += formPessoa(editando === 'novo' ? null : API.porId(editando));
    var q = API.perguntas();
    if (q.length) {
      h += '<div class="card"><div class="card-head"><h3>' + esc(tr('É a mesma pessoa?', 'Is it the same person?')) + ' <b>' + q.length + '</b></h3></div>' +
        '<p class="small muted" style="margin:0 0 8px">' + esc(tr('Nomes parecidos, mas sem certeza. Responda uma vez por nome.', 'Similar names, but not certain. Answer once per name.')) + '</p>';
      q.slice(0, 20).forEach(function (x) {
        h += '<div class="ps-q"><span>“' + esc(x.texto) + '” (' + x.n + ') — ' + esc(tr('é ', 'is it ')) + '<b>' + esc(API.rotulo(x.sugestao)) + '</b>?</span>' +
          '<button class="btn sm primary" data-acao="ps-e-sim" data-texto="' + esc(x.texto) + '" data-id="' + esc(x.sugestao.id) + '">' + esc(tr('Sim', 'Yes')) + '</button>' +
          '<button class="btn sm" data-acao="ps-e-nao" data-texto="' + esc(x.texto) + '">' + esc(tr('Não', 'No')) + '</button></div>';
      });
      h += '</div>';
    }
    var ai = API.aIdentificar();
    if (ai.length) {
      h += '<div class="card"><div class="card-head"><h3>' + esc(tr('A identificar', 'To identify')) + ' <b>' + ai.length + '</b></h3></div>' +
        '<p class="small muted" style="margin:0 0 8px">' + esc(tr('Textos soltos que não batem com ninguém. Podem ficar assim (vizinho, pagamento pontual) ou virar pessoa.',
          'Loose names that match nobody. They can stay as they are (neighbour, one-off payment) or become a person.')) + '</p>';
      ai.slice(0, 30).forEach(function (x) {
        h += '<div class="ps-q"><span>“' + esc(x.texto) + '” (' + x.n + ')</span>' +
          '<button class="btn sm" data-acao="ps-cadastrar-texto" data-texto="' + esc(x.texto) + '">' + esc(tr('+ cadastrar', '+ add')) + '</button></div>';
      });
      h += '</div>';
    }
    ['casa', 'outra', 'empresa'].forEach(function (tp) {
      var l = lista().filter(function (p) { return p.tipo === tp; }).sort(function (a, b) { return (a.arquivada ? 1 : 0) - (b.arquivada ? 1 : 0) || API.rotulo(a).localeCompare(API.rotulo(b)); });
      h += '<div class="card sem-pad ps-grupo"><div class="card-head" style="padding:12px 16px 0"><h3>' + esc(TIPOS[tp][pt() ? 0 : 1]) + '</h3></div>' +
        (l.length ? '<table class="tbl"><thead><tr><th>' + esc(tr('Nome', 'Name')) + '</th><th class="num">' + esc(tr('usos', 'uses')) + '</th><th></th></tr></thead><tbody>' + l.map(linhaPessoa).join('') + '</tbody></table>'
          : '<p class="small muted" style="padding:0 16px 12px;margin:0">' + esc(tr('Ninguém ainda.', 'Nobody yet.')) + '</p>') + '</div>';
    });
    return h;
  }
  function lerForm() {
    var v = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
    var f = document.querySelector('.ps-form');
    return { id: f ? f.dataset.id : '', tipo: v('psTipo'), papel: v('psPapel'), nome: v('psNome'), meio: v('psMeio'), sobrenome: v('psSobrenome'),
      apelido: v('psApelido'), banco: v('psBanco'), aliases: v('psAliases'), cnpj: v('psCnpj') };
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
  }

  MoneyModulos.registrar({
    id: 'pessoas',
    versao: '1.3.0',
    colecoes: [COL],
    iniciar: function () {
      try { if (ST && !cfg().pessoasV && (ST.gastos || []).length + (ST.recorrentes || []).length) { API.migrar(); Store.salvar(); } } catch (e) { console.warn('pessoas', e); }
      try {   /* 1.1.0: apelido da casa que tinha ido para "nome no banco" (migração da 3.64) passa para aliases */
        if (temST() && cfg().pessoasV === 1) {
          lista().forEach(function (p) { var fica = [], vai = p.aliases || []; (p.banco || []).forEach(function (b) { (/\s/.test(String(b).trim()) ? fica : vai).push(b); }); p.banco = fica; if (vai.length) p.aliases = vai; });
          cfg().pessoasV = 2; Store.salvar();
        }
      } catch (e) {}
      trazerUmaVez();
      API.solverone();
    },
    pontos: {
      'config.todos': function () {
        var n = API.ativas().length, q = API.perguntas().length + API.aIdentificar().length;
        return '<div class="card cfg-sec" data-sec="todos"><div class="card-head"><h3>👥 ' + esc(tr('Pessoas da família', 'Family people')) + '</h3>' +
          '<button class="btn sm" data-irpara="cfg-pessoas">' + esc(tr('Abrir', 'Open')) + ' ›</button></div>' +
          '<p class="small muted" style="margin:0">' + esc(n + tr(' cadastrada(s)', ' registered')) + (q ? ' · ' + esc(q + tr(' nome(s) para conferir', ' name(s) to check')) : '') +
          (cfg().pessoasRevisar ? ' · <b>' + esc(tr('revise a lista uma vez', 'review the list once')) + '</b>' : '') + '</p></div>';
      }
    },
    telas: { 'cfg-pessoas': { app: 'budget', render: function () { var h = tela(); setTimeout(mostrarCampos, 0); return h; },
      ajuda: { pt: { t: 'Pessoas da família', o: 'Quem aparece nos lançamentos; renomear muda em tudo.' }, en: { t: 'Family people', o: 'Who shows up in entries; renaming changes everywhere.' } } } },
    acoes: {
      'ps-novo': function () { editando = 'novo'; render(); },
      'ps-familia': function () { API.trazerDaFamilia().then(function (n) { salvarERender(n ? n + tr(' pessoa(s) trazida(s) da família.', ' person(s) brought from the family.') : tr('Ninguém novo na família.', 'Nobody new in the family.')); }); },
      'ps-editar': function (el) { editando = el.dataset.id; render(); },
      'ps-cancelar': function () { editando = null; render(); },
      'ps-salvar': function () {
        try { var p = API.salvar(lerForm()); editando = null; salvarERender(tr('Salvo: ', 'Saved: ') + API.rotulo(p)); }
        catch (e) { toast(e.message, 'warn'); }
      },
      'ps-arquivar': function (el) { API.arquivar(el.dataset.id); salvarERender(); },
      'ps-desarquivar': function (el) { API.desarquivar(el.dataset.id); salvarERender(); },
      'ps-apagar': function (el) { try { API.apagar(el.dataset.id); salvarERender(); } catch (e) { toast(e.message, 'warn'); } },
      'ps-revisado': function () { delete cfg().pessoasRevisar; lista().forEach(function (p) { delete p.revisar; }); salvarERender(); },
      'ps-e-sim': function (el) { var n = API.confirmarParecida(el.dataset.texto, el.dataset.id); salvarERender(n + tr(' registro(s) ligado(s).', ' record(s) linked.')); },
      'ps-e-nao': function (el) { API.naoEhParecida(el.dataset.texto); salvarERender(); },
      'ps-cadastrar-texto': function (el) {
        var dica = el.closest('.ps-dica'), inp = dica && dica.dataset.para ? document.getElementById(dica.dataset.para) : null;
        var texto = el.dataset.texto || (inp ? inp.value : '');
        if (!String(texto).trim()) return;
        var doBanco = /^[A-Z0-9 .'-]{4,}$/.test(String(texto).trim());
        var p = API.salvar({ tipo: /\b(LTDA|S\.?A|ME|EIRELI|EPP)\b/i.test(texto) ? 'empresa' : 'outra', nome: titulo(texto), apelido: doBanco ? titulo(texto) : String(texto).trim(), banco: doBanco ? [texto] : [], aliases: doBanco ? [] : [texto] });
        Store.salvar();
        if (inp) { inp.value = API.rotulo(p); atualizarDica(inp); toast(tr('Cadastrado: ', 'Added: ') + API.rotulo(p)); }
        else { editando = p.id; render(); }
      }
    }
  });
  window.Pessoas = API;
})();
