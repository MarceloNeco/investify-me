/* =====================================================================
   modulos/cartoes.js — cartões por conta, com vários finais (3.65)        1.4.2 · 28/Nov/2026
   ---------------------------------------------------------------------
     · 1.4.2 (3.144): 3.144: Quem pagou grava o código da pessoa (não o Nome da tela)
     · 1.4.1 (3.144): "quem usa" sugerido pelo nome atual da pessoa; sem ficha, nada (nunca o rótulo cru do robô).
   O QUE FAZ
     CARTÃO = a conta do cartão (a fatura): apelido, titular, "Quem usa", bandeira, banco, fechamento, vencimento.
     Cada cartão tem uma lista de FINAIS, cada um com um tipo: físico | virtual | adicional (com o titular dele) | não sei.
     Cartão virtual: cada compra pode ter um final diferente, mas é o mesmo cartão, a mesma fatura.
     · O robô manda, em cada compra no cartão, final, bandeira, banco e conta_cartao {id, nome} (a conta na Pluggy).
       Final novo com o mesmo conta_cartao.id → entra SOZINHO no cartão, como "virtual (novo)", com um aviso discreto
       para confirmar ou mudar o tipo uma vez. Final novo sem conta_cartao (dado antigo, planilha) → pergunta uma vez
       "Este final 3303 é de qual cartão?" (os cartões + "novo cartão").
     · "Cartões encontrados": os finais que vieram do robô e ainda não são de nenhum cartão, agrupados por
       conta_cartao ("Black (finais 1101, 2202, 3303)"); um toque abre o cadastro já preenchido. Ao cadastrar, os
       lançamentos daqueles finais ganham o cartão (para trás também). Fatura e relatórios por CARTÃO (todos os finais).
     · "Quem pagou" das compras: o titular do final (adicional) → "Quem usa" do cartão → o titular do cartão.
     · Nunca o número inteiro, o CVV nem a senha: só os 4 últimos dígitos (a validade, opcional, vai cifrada com o resto).
   1.1.0 (3.102), cartões virtuais sem bagunça (pedido do dono, 24/Nov/2026: 3 finais no Visa e 13 no Mastercard na mesma fatura):
     · Um cartão por fatura na lista e nos filtros: com mais de um final, o rótulo (Banco.rotuloCartao) é só o nome do cartão; os
       finais ficam no detalhe (o cadastro do cartão).
     · Tipos novos do final: virtual de uso único ('unico') e virtual permanente ('permanente'); cada final pode ter "quem usa"
       (f.usa/usaId; o virtual permanente pode ser de outra pessoa).
     · Final novo da mesma conta continua entrando sozinho, com UMA pergunta discreta no 📥 por cartão ("Final •• novo no Visa:
       virtual de uso único, virtual permanente ou adicional? Quem usa?"), que dá para responder depois. A resposta vale para as
       compras daquele final que a pessoa não mexeu ("Quem pagou").
     · "Quem pagou": o "quem usa" do final → o titular do adicional → o "quem usa" do cartão → o titular do cartão.
     · Finais virtuais sem compra há mais de 6 meses vão para "antigos" no detalhe (escondidos, nunca apagados; o histórico continua
       ligado) e não são perguntados.
   1.2.0 (3.106): o "+ Novo cartão" mostra no topo "Detectados nas suas compras" ("Mastercard (Itaú) · finais ••9458, ••6514 e mais 11
     virtuais · última compra 23/Nov"); um toque preenche bandeira, banco, conta e finais com os tipos. Painel: "Achamos 3 cartões nas suas
     faturas: cadastrar".
   1.3.0 (3.131): "Cartões encontrados" por CONTA do cartão: o final sem conta_cartao vai para a conta que outra compra dele trouxe;
     sem conta nenhuma, o mesmo banco e a mesma bandeira formam um cartão provável; "Cadastrar" com um toque, com os finais dentro.
   1.4.0 (3.132): sem a conta, o final vai para a única conta EM USO do mesmo banco e bandeira; um card por conta com os finais marcados
     (físico, virtual, virtual de uso único), "Cadastrar este cartão" com o nome e o "quem usa" sugeridos; sem compra há 90 dias: recolhido.
   API (window.Cartoes)
     finais(c) · doFinal(fim) · daConta(id) · doRobo(l, g) · quemPagou(c, fim) · encontrados() · perguntas()
     ligarRetro(c) → n · semente(chave) → dados para o cadastro · responder(fim, cartaoId|'novo'|'nao')
   DADOS
     Store.estado.cartoes[i] ganha: contaId, contaNome, titular/titularId, usa/usaId, validade (opcional),
       finais: [{fim, tipo: 'fisico'|'virtual'|'adicional'|'naosei', titular, novo}]   (c.fim continua: o primeiro final)
     ST.config.cartoesPergunta {fim: 'nao' | cartaoId} (as respostas de "de qual cartão?")
     no lançamento: finalCartao, contaCartao {id, nome}, cartaoId
   PONTOS QUE USA / OFERECE
     cartao.form (campos novos no cadastro) · cartoes.config (Configurações → Bancos e cartões) · budget.painel (dica)
   ===================================================================== */
(function () {
  'use strict';
  var TIPOS = { fisico: ['físico', 'physical', 'físico'], virtual: ['virtual', 'virtual', 'virtual'], unico: ['virtual de uso único', 'single-use virtual', 'virtual de un solo uso'],
    permanente: ['virtual permanente', 'permanent virtual', 'virtual permanente'], adicional: ['adicional', 'additional', 'adicional'], naosei: ['não sei', 'not sure', 'no sé'] };
  var VIRTUAIS = { virtual: 1, unico: 1, permanente: 1 }, ANTIGO_DIAS = 183, SEM_USO_DIAS = 90;
  function rotTipo(k) { var t = TIPOS[k] || TIPOS.naosei; return pt() ? t[0] : (I18n.atual === 'es' ? t[2] : t[1]); }
  function hojeX() { return API._hoje || hojeISO(); }
  function maisDias(d, n) { var x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function so4(f) { return String(f || '').replace(/\D/g, '').slice(-4); }
  function cartoes() { return (typeof ST !== 'undefined' && ST && ST.cartoes) || []; }
  function cfg() { return typeof ST !== 'undefined' && ST ? (ST.config = ST.config || {}) : {}; }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function bandeiraDe(t) {
    var x = N(t);
    if (/master/.test(x)) return 'master'; if (/visa/.test(x)) return 'visa'; if (/\belo\b/.test(x)) return 'elo';
    if (/amex|american/.test(x)) return 'amex'; if (/hiper/.test(x)) return 'hiper'; if (/diners/.test(x)) return 'diners';
    return 'outra';
  }
  function rotuloPessoa(txt, id) { var p = id && window.Pessoas && Pessoas.porId(id); return p ? Pessoas.rotulo(p) : (txt || ''); }
  /* 1.4.2 (3.144): o que vai gravado no registro (g.quem) é o código de sempre, não o Nome da tela */
  function codigoPessoa(txt, id) { var p = id && window.Pessoas && Pessoas.porId(id); return p ? (Pessoas.codigoDe ? Pessoas.codigoDe(p) : Pessoas.rotulo(p)) : (txt || ''); }

  var API = {
    TIPOS: TIPOS, _hoje: null,
    finais: function (c) {
      var l = Array.isArray(c.finais) ? c.finais.slice() : [];
      if (c.fim && !l.some(function (f) { return f.fim === c.fim; })) l.unshift({ fim: c.fim, tipo: 'naosei' });
      return l;
    },
    doFinal: function (fim) { fim = so4(fim); if (!fim) return null; return cartoes().find(function (c) { return API.finais(c).some(function (f) { return f.fim === fim; }); }) || null; },
    daConta: function (id) { return id ? cartoes().find(function (c) { return c.contaId === String(id); }) || null : null; },
    quemPagou: function (c, fim) {
      if (!c) return '';
      var f = API.finais(c).find(function (x) { return x.fim === so4(fim); });
      if (f && (f.usa || f.usaId)) return codigoPessoa(f.usa, f.usaId);   /* 1.1.0: o "quem usa" do final */
      if (f && f.tipo === 'adicional' && (f.titular || f.titularId)) return codigoPessoa(f.titular, f.titularId);
      return codigoPessoa(c.usa, c.usaId) || codigoPessoa(c.titular, c.titularId);
    },
    /* no Caixa.converter: liga a compra ao cartão (e aprende o final novo da mesma conta) */
    doRobo: function (l, g) {
      var fim = so4(l.final), conta = l.conta_cartao && l.conta_cartao.id ? { id: String(l.conta_cartao.id).slice(0, 80), nome: String(l.conta_cartao.nome || '').slice(0, 80) } : null;
      if (fim) g.finalCartao = fim;
      if (conta) g.contaCartao = conta;
      var c = conta ? API.daConta(conta.id) : null;
      if (c && fim && !API.finais(c).some(function (f) { return f.fim === fim; })) {
        c.finais = API.finais(c); c.finais.push({ fim: fim, tipo: 'virtual', novo: true });   /* entra sozinho; aviso para confirmar o tipo */
      }
      if (!c && fim) c = API.doFinal(fim);
      if (!c && fim) { var r = (cfg().cartoesPergunta || {})[fim]; if (r && r !== 'nao') c = cartoes().find(function (x) { return x.id === r; }) || null; }
      if (c) {
        g.cartaoId = c.id;
        var q = API.quemPagou(c, fim); if (q) g.quem = q;
      }
      return c;
    },
    /* os finais do robô que ainda não são de nenhum cartão, agrupados pela conta do cartão */
    encontrados: function () {
      var gs = ((typeof ST !== 'undefined' && ST && ST.gastos) || []), contas = {}, contaDoFinal = {}, resp = cfg().cartoesPergunta || {};
      var b1 = function (t) { return N(t).split(' ')[0] || ''; }, limite = maisDias(hojeX(), -SEM_USO_DIAS);
      /* 1.4.0 (3.132): as contas de cartão conhecidas — pelas compras que trazem conta_cartao e pelos cartões cadastrados */
      gs.forEach(function (g) {
        if (!g.contaCartao || !g.contaCartao.id) return;
        var k = g.contaCartao.id, x = contas[k] || (contas[k] = { id: k, nome: g.contaCartao.nome || '', banco: g.conta || '', bandeira: '', ultima: '' });
        if (!x.bandeira && g.cartaoNome) x.bandeira = bandeiraDe(g.cartaoNome);
        if ((g.data || '') > x.ultima) x.ultima = g.data || '';
        if (g.finalCartao && !contaDoFinal[g.finalCartao]) contaDoFinal[g.finalCartao] = k;
      });
      cartoes().forEach(function (c) { if (c.contaId && !contas[c.contaId]) contas[c.contaId] = { id: c.contaId, nome: c.contaNome || c.apelido || '', banco: typeof Banco !== 'undefined' && c.bancoId ? Banco.curto(c.bancoId) : '', bandeira: c.bandeira || '', ultima: '' }; });
      /* sem a conta: o final vai para a ÚNICA conta em uso (compra nos últimos 90 dias) do mesmo banco e da mesma bandeira
         (o virtual Mastercard do banco vai para o Mastercard dele; o Visa, para o Visa em uso) */
      function inferir(g) {
        var r = resp[g.finalCartao]; if (r && r.indexOf('c:') === 0) return r.slice(2);
        var band = g.cartaoNome ? bandeiraDe(g.cartaoNome) : '', bk = b1(g.conta); if (!bk || !band || band === 'outra') return '';
        var cs = Object.keys(contas).map(function (k) { return contas[k]; }).filter(function (c) { return b1(c.banco) === bk && c.bandeira === band && (!c.ultima || c.ultima >= limite); });
        return cs.length === 1 ? cs[0].id : '';
      }
      var grupos = {};
      gs.forEach(function (g) {
        if (g.cartaoId || !g.finalCartao) return;
        var cid = (g.contaCartao && g.contaCartao.id) || contaDoFinal[g.finalCartao] || inferir(g);
        if (API.doFinal(g.finalCartao) || (cid && API.daConta(cid))) return;
        var band = g.cartaoNome ? bandeiraDe(g.cartaoNome) : '', k = cid ? 'c:' + cid : 'f:' + g.finalCartao;
        var cc = cid ? contas[cid] : null;
        var x = grupos[k] || (grupos[k] = { chave: k, contaId: cid || '', nome: cc ? cc.nome || '' : '', bandeira: '', banco: '', finais: [], porFinal: {}, ultFinal: {}, n: 0, ultima: '' });
        if (x.finais.indexOf(g.finalCartao) < 0) x.finais.push(g.finalCartao);
        x.porFinal[g.finalCartao] = (x.porFinal[g.finalCartao] || 0) + 1;
        if ((g.data || '') > (x.ultFinal[g.finalCartao] || '')) x.ultFinal[g.finalCartao] = g.data || '';
        x.n++; if ((g.data || '') > x.ultima) x.ultima = g.data || '';
        if (!x.bandeira && band) x.bandeira = band;
        if (!x.banco && g.conta) x.banco = g.conta;
      });
      return Object.keys(grupos).map(function (k) {
        var x = grupos[k];
        /* o físico = o final com mais compras; virtual de uso único = poucas compras (até 2) e sumiu (nada no último mês) */
        x.finais.sort(function (a, b) { return x.porFinal[b] - x.porFinal[a]; });
        x.tipos = {}; x.finais.forEach(function (f, i) { x.tipos[f] = i === 0 ? 'fisico' : (x.porFinal[f] <= 2 && (x.ultFinal[f] || '') < maisDias(hojeX(), -30) ? 'unico' : 'virtual'); });
        x.semUso = !!x.ultima && x.ultima < limite;
        return x;
      }).sort(function (a, b) { return b.n - a.n; });
    },
    /* 1.4.0 (3.132): o nome sugerido ("Black Itaú"): o nome da conta na Pluggy, sem o nome do banco repetido; senão a bandeira + o banco */
    nomeSugerido: function (x) {
      var b = String(x.banco || '').split(/\s+/)[0] || '', nome = String(x.nome || '').trim();
      if (nome) { nome = nome.toLowerCase().replace(/(^|\s)\S/g, function (m) { return m.toUpperCase(); }); if (b && N(nome).indexOf(N(b)) < 0) nome += ' ' + b; return nome.slice(0, 40); }
      return (((BANDEIRA_POR_ID[x.bandeira] || {}).nome || tr('Cartão', 'Card', 'Tarjeta')) + (b ? ' ' + b : '')).slice(0, 40);
    },
    /* "quem usa" sugerido: o dono que o banco manda para essa conta de cartão (Conferência com o banco) */
    quemUsaSugerido: function (x) {
      var r = x.contaId && window.SaldoBanco ? SaldoBanco.contas().find(function (s) { return s.tipo === 'cartao' && s.contaId === x.contaId; }) : null;
      return r && r.dono && window.Pessoas && Pessoas.titularVer ? Pessoas.titularVer(r.dono).nome : '';   /* 1.4.1 (3.144): o nome atual; sem ficha, nada (nunca o rótulo cru) */
    },
    /* um toque: cadastra a conta do cartão com todos os finais (os tipos já marcados) e liga as compras deles */
    cadastrarEncontrado: function (chave, apelido, usa) {
      var x = API.encontrados().find(function (e) { return e.chave === chave; }); if (!x || typeof Banco === 'undefined') return null;
      var s = API.semente(chave), c = Banco.salvarCartao({ apelido: String(apelido || '').trim() || API.nomeSugerido(x), bandeira: s.bandeira, fim: s.fim, bancoId: s.bancoId });
      if (!c) return null;
      if (x.contaId) { c.contaId = x.contaId; c.contaNome = x.nome || ''; }
      c.finais = x.finais.map(function (f) { return { fim: f, tipo: x.tipos[f] || 'naosei' }; });
      if (String(usa || '').trim()) { c.usa = String(usa).trim().slice(0, 60); if (window.Pessoas) Pessoas.ligar(c, 'usa', 'usaId'); }
      API.ligarRetro(c);
      return c;
    },
    /* "Este final é de qual cartão?": só quando já há cartão cadastrado e o final veio SEM a conta do cartão */
    perguntas: function () {
      if (!cartoes().length && !API.encontrados().some(function (x) { return x.contaId; })) return [];
      var resp = cfg().cartoesPergunta || {};
      var out = [];   /* 1.3.0: um por final (o grupo sem conta pode ter vários) */
      API.encontrados().filter(function (x) { return !x.contaId; }).forEach(function (x) { x.finais.forEach(function (f) { out.push({ fim: f, n: x.porFinal[f] || x.n, ultima: x.ultima }); }); });
      return out.filter(function (x) { return !resp[x.fim]; });
    },
    responder: function (fim, alvo) {
      (cfg().cartoesPergunta = cfg().cartoesPergunta || {})[fim] = alvo;
      if (alvo && alvo !== 'nao' && alvo !== 'novo' && alvo.indexOf('c:') !== 0) {
        var c = cartoes().find(function (x) { return x.id === alvo; });
        if (c) { c.finais = API.finais(c); if (!c.finais.some(function (f) { return f.fim === fim; })) c.finais.push({ fim: fim, tipo: 'naosei' }); return API.ligarRetro(c); }
      }
      return 0;
    },
    /* para trás: os lançamentos daqueles finais (ou da conta do cartão) ganham o cartão e o "quem pagou" */
    ligarRetro: function (c) {
      var fins = API.finais(c).map(function (f) { return f.fim; }), n = 0;
      (ST.gastos || []).forEach(function (g) {
        var meu = (c.contaId && g.contaCartao && g.contaCartao.id === c.contaId) || (g.finalCartao && fins.indexOf(g.finalCartao) >= 0);
        if (!meu || g.cartaoId === c.id) return;
        g.cartaoId = c.id; n++;
        if (!g.editadoPessoa) { var q = API.quemPagou(c, g.finalCartao); if (q) { g.quem = q; if (window.Pessoas) Pessoas.ligar(g, 'quem', 'quemId'); } }
      });
      if (n && typeof Gasto !== 'undefined') Gasto._idx = null;
      return n;
    },
    semente: function (chave) {
      var x = API.encontrados().find(function (e) { return e.chave === chave; }); if (!x) return null;
      var banco = (typeof Banco !== 'undefined' && x.banco) ? Banco.todos().find(function (b) { return N(b.apelido || b.nome).indexOf(N(x.banco)) >= 0 || N(x.banco).indexOf(N(b.nome)) >= 0; }) : null;
      return { apelido: x.nome || '', fim: x.finais[0], bandeira: x.bandeira || 'outra', bancoId: banco ? banco.id : '', contaId: x.contaId, contaNome: x.nome,
        finais: x.finais.map(function (f) { return { fim: f, tipo: (x.tipos && x.tipos[f]) || 'naosei' }; }), usa: API.quemUsaSugerido(x) };
    },
    /* 1.1.0: a última compra de cada final e os virtuais antigos (sem compra há mais de 6 meses; nunca apagados) */
    ultimaCompra: function (c, fim) {
      var u = '';
      ((typeof ST !== 'undefined' && ST && ST.gastos) || []).forEach(function (g) { if (g.finalCartao === fim && (g.cartaoId === c.id || !g.cartaoId) && (g.data || '') > u) u = g.data || ''; });
      return u;
    },
    antigo: function (c, f) { if (!VIRTUAIS[f.tipo]) return false; var u = API.ultimaCompra(c, f.fim); return !!u && u < maisDias(hojeX(), -ANTIGO_DIAS); },
    /* os finais novos que ainda esperam a resposta (tipo e quem usa), por cartão */
    novos: function () {
      return cartoes().map(function (c) { return { c: c, fs: API.finais(c).filter(function (f) { return f.novo && !API.antigo(c, f); }) }; }).filter(function (x) { return x.fs.length; });
    },
    /* a resposta: o tipo e quem usa; "Quem pagou" das compras daquele final que a pessoa não mexeu */
    responderFinal: function (cid, fim, tipo, usa) {
      var c = cartoes().find(function (x) { return x.id === cid; }); if (!c) return 0;
      c.finais = API.finais(c);
      var f = c.finais.find(function (x) { return x.fim === so4(fim); }); if (!f) return 0;
      if (TIPOS[tipo]) f.tipo = tipo;
      delete f.usa; delete f.usaId;
      if (String(usa || '').trim()) { f.usa = String(usa).trim().slice(0, 60); if (window.Pessoas) Pessoas.ligar(f, 'usa', 'usaId'); }
      delete f.novo;
      var q = API.quemPagou(c, f.fim), n = 0;
      (ST.gastos || []).forEach(function (g) {
        if (g.finalCartao !== f.fim || (g.cartaoId && g.cartaoId !== c.id) || g.editadoPessoa || !q || g.quem === q) return;
        g.quem = q; delete g.quemId; if (window.Pessoas) Pessoas.ligar(g, 'quem', 'quemId'); n++;
      });
      return n;
    },
    /* depois do formulário de cadastro (index.html salvarCartao) */
    lerForm: function (c) {
      var v = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
      if (!c) return;
      c.titular = v('ctTitular').trim(); c.usa = v('ctUsa').trim();
      if (window.Pessoas) { Pessoas.ligar(c, 'titular', 'titularId'); Pessoas.ligar(c, 'usa', 'usaId'); }
      var val = v('ctValidade').trim(); if (/^\d{2}\/\d{2}$/.test(val)) c.validade = val; else delete c.validade;
      var conta = v('ctContaId'); if (conta) { c.contaId = conta; c.contaNome = v('ctContaNome'); }
      var fins = [];
      document.querySelectorAll('.ct-final').forEach(function (li) {
        var fim = so4(li.querySelector('.ct-f-fim').value); if (!fim) return;
        var tipo = li.querySelector('.ct-f-tipo').value, tit = li.querySelector('.ct-f-tit') ? li.querySelector('.ct-f-tit').value.trim() : '';
        var f = { fim: fim, tipo: TIPOS[tipo] ? tipo : 'naosei' }, usa = li.querySelector('.ct-f-usa') ? li.querySelector('.ct-f-usa').value.trim() : '';
        if (f.tipo === 'adicional' && tit) { f.titular = tit; if (window.Pessoas) Pessoas.ligar(f, 'titular', 'titularId'); }
        if (usa) { f.usa = usa; if (window.Pessoas) Pessoas.ligar(f, 'usa', 'usaId'); }   /* 1.1.0 */
        fins.push(f);
      });
      if (c.fim && !fins.some(function (f) { return f.fim === c.fim; })) fins.unshift({ fim: c.fim, tipo: 'naosei' });
      c.finais = fins; if (!c.fim && fins[0]) c.fim = fins[0].fim;
      return API.ligarRetro(c);
    }
  };

  function linhaFinal(f, i) {
    var op = Object.keys(TIPOS).map(function (k) { return '<option value="' + k + '"' + (f.tipo === k ? ' selected' : '') + '>' + esc(rotTipo(k)) + (f.novo && k === f.tipo ? ' ' + tr('(novo)', '(new)', '(nuevo)') : '') + '</option>'; }).join('');
    return '<li class="ct-final"><input class="ct-f-fim" inputmode="numeric" maxlength="4" value="' + esc(f.fim || '') + '" placeholder="1234" aria-label="' + esc(tr('Final', 'Ending')) + '">' +
      '<select class="ct-f-tipo" aria-label="' + esc(tr('Tipo', 'Type')) + '">' + op + '</select>' +
      '<input class="ct-f-tit" data-pessoa list="ctPessoas" value="' + esc(rotuloPessoa(f.titular, f.titularId)) + '" placeholder="' + esc(tr('titular do adicional', 'additional holder')) + '"' + (f.tipo === 'adicional' ? '' : ' hidden') + '>' +
      '<input class="ct-f-usa" data-pessoa list="ctPessoas" value="' + esc(rotuloPessoa(f.usa, f.usaId)) + '" placeholder="' + esc(tr('quem usa', 'who uses it', 'quién la usa')) + '" style="max-width:9em">' +
      '<button type="button" class="linkinho" data-acao="ct-final-tirar" aria-label="' + esc(tr('Tirar este final', 'Remove this ending')) + '">✕</button></li>';
  }

  /* 1.2.0 (3.106): "Mastercard (Itaú) · finais ••9458, ••6514 e mais 11 virtuais · última compra 23/Nov" */
  function rotuloEnc(x) {
    var nome = (BANDEIRA_POR_ID[x.bandeira] || {}).nome || x.nome || tr('Cartão', 'Card', 'Tarjeta');
    var f = x.finais.slice(0, 2).map(function (y) { return '••' + y; }).join(', '), mais = x.finais.length - 2;
    return nome + (x.banco ? ' (' + x.banco + ')' : '') + ' · ' + tr(x.finais.length > 1 ? 'finais ' : 'final ', x.finais.length > 1 ? 'endings ' : 'ending ', x.finais.length > 1 ? 'finales ' : 'final ') + f +
      (mais > 0 ? tr(' e mais ' + mais + (mais > 1 ? ' virtuais' : ' virtual'), ' and ' + mais + ' more virtual', ' y ' + mais + (mais > 1 ? ' virtuales' : ' virtual') + ' más') : '') +
      (x.ultima ? ' · ' + tr('última compra ', 'last purchase ', 'última compra ') + String(I18n.data(x.ultima)).replace(/\/\d{4}$/, '') : '');
  }
  function blocoConfig() {
    var enc = API.encontrados(), q = API.perguntas(), novos = [];
    cartoes().forEach(function (c) { API.finais(c).forEach(function (f) { if (f.novo) novos.push({ c: c, f: f }); }); });
    var h = '';
    /* 1.4.0 (3.132): um card por CONTA de cartão, com os finais dentro (físico, virtual, virtual de uso único); "Cadastrar este cartão"
       com o nome sugerido e quem usa (dá para trocar); conta sem compra há 90 dias fica recolhida e não conta */
    var comConta = enc.filter(function (x) { return x.contaId || (!cartoes().length && x.finais.length > 1); });
    var ativos = comConta.filter(function (x) { return !x.semUso; }), parados = comConta.filter(function (x) { return x.semUso; });
    var card = function (x) {
      return '<div class="ct-enc" data-chave="' + esc(x.chave) + '"><div class="ct-enc-t"><b>' + esc(API.nomeSugerido(x)) + '</b> <span class="tiny muted">' +
        esc(x.n + tr(' compra(s)', ' purchase(s)', ' compra(s)') + (x.ultima ? ' · ' + tr('última ', 'last ', 'última ') + String(I18n.data(x.ultima)).replace(/\/\d{4}$/, '') : '')) + '</span></div>' +
        '<div class="ct-enc-fins">' + x.finais.map(function (f) { return '<span class="ct-chip">••' + esc(f) + ' · ' + esc(rotTipo(x.tipos[f])) + '</span>'; }).join(' ') + '</div>' +
        '<div class="ct-enc-acoes"><input class="ct-enc-nome" value="' + esc(API.nomeSugerido(x)) + '" aria-label="' + esc(tr('Nome do cartão', 'Card name', 'Nombre de la tarjeta')) + '">' +
        '<input class="ct-enc-usa" data-pessoa list="ctPessoasEnc" value="' + esc(API.quemUsaSugerido(x)) + '" placeholder="' + esc(tr('quem usa', 'who uses it', 'quién la usa')) + '" aria-label="' + esc(tr('Quem usa', 'Who uses it', 'Quién la usa')) + '">' +
        '<button type="button" class="btn sm primary" data-acao="ct-cadastrar-enc" data-chave="' + esc(x.chave) + '">' + esc(tr('Cadastrar este cartão', 'Add this card', 'Registrar esta tarjeta')) + '</button></div></div>';
    };
    if (comConta.length) {
      h += '<div class="callout ct-encontrados"><b>💳 ' + esc(ativos.length === 1 ? tr('Encontrei 1 cartão nas suas compras', 'I found 1 card in your purchases', 'Encontré 1 tarjeta en tus compras') :
          tr('Encontrei ' + ativos.length + ' cartões nas suas compras', 'I found ' + ativos.length + ' cards in your purchases', 'Encontré ' + ativos.length + ' tarjetas en tus compras')) + '</b>' +
        '<p class="tiny muted" style="margin:2px 0 6px">' + esc(tr('Um por fatura: o físico e os virtuais ficam juntos.', 'One per bill: the physical and virtual cards stay together.', 'Una por factura: la física y las virtuales quedan juntas.')) + '</p>' +
        ativos.map(card).join('') + (window.Pessoas ? Pessoas.opcoes('ctPessoasEnc') : '') +
        (parados.length ? '<details class="ct-sem-uso"><summary class="small">' + esc(parados.length + tr(' sem uso (nenhuma compra há 90 dias)', ' unused (no purchase in 90 days)', ' sin uso (ninguna compra en 90 días)')) + '</summary>' + parados.map(card).join('') + '</details>' : '') +
        '</div>';
    }
    if (q.length) {
      var ops = cartoes().map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(typeof Banco !== 'undefined' ? Banco.rotuloCartao(c.id) : (c.apelido || c.fim)) + '</option>'; }).join('') +
        comConta.map(function (x) { return '<option value="c:' + esc(x.contaId) + '">' + esc(API.nomeSugerido(x)) + '</option>'; }).join('');   /* 1.4.0: as contas encontradas */
      h += '<div class="ct-perguntas">' + q.map(function (x) {
        return '<div class="ps-q"><span>' + esc(tr('Este final ', 'This ending ') + x.fim + tr(' é de qual cartão?', ' belongs to which card?')) + ' <span class="muted small">(' + x.n + tr(' compra(s)', ' purchase(s)') + ')</span></span>' +
          '<select class="ct-q-sel" data-fim="' + esc(x.fim) + '">' + ops + '<option value="novo">' + esc(tr('outro', 'other', 'otro')) + '</option></select>' +
          '<button type="button" class="btn sm primary" data-acao="ct-final-de" data-fim="' + esc(x.fim) + '">OK</button>' +
          '<button type="button" class="btn sm" data-acao="ct-final-nao" data-fim="' + esc(x.fim) + '">' + esc(tr('Não sei', 'Not sure')) + '</button></div>';
      }).join('') + '</div>';
    }
    if (novos.length) {
      h += '<div class="ct-novos small">' + novos.map(function (x) {
        return '<div class="ps-q"><span>' + esc(tr('Final ', 'Ending ') + x.f.fim + tr(' entrou no ', ' joined ') + (typeof Banco !== 'undefined' ? Banco.rotuloCartao(x.c.id) : x.c.apelido) + tr(' como virtual (novo).', ' as virtual (new).')) + '</span>' +
          '<button type="button" class="btn sm" data-acao="ct-novo-ok" data-id="' + esc(x.c.id) + '" data-fim="' + esc(x.f.fim) + '">' + esc(tr('Está certo', 'That\'s right')) + '</button>' +
          '<button type="button" class="btn sm" data-ctedit="' + esc(x.c.id) + '">' + esc(tr('Mudar o tipo', 'Change type')) + '</button></div>';
      }).join('') + '</div>';
    }
    return h;
  }

  MoneyModulos.registrar({
    id: 'cartoes',
    versao: '1.4.2',
    pontos: {
      'cartao.form': function (ctx) {
        var c = ctx.c || ctx.semente || {};
        var fins = c.id ? API.finais(c) : (c.finais || (c.fim ? [{ fim: c.fim, tipo: 'naosei' }] : []));
        return '<div class="grid g2">' +
          '<label class="f"><span class="lb">' + esc(tr('Titular da conta', 'Account holder')) + '</span><input id="ctTitular" data-pessoa list="ctPessoas" autocomplete="off" value="' + esc(rotuloPessoa(c.titular, c.titularId)) + '"></label>' +
          '<label class="f"><span class="lb">' + esc(tr('Quem usa', 'Who uses it')) + '</span><input id="ctUsa" data-pessoa list="ctPessoas" autocomplete="off" value="' + esc(rotuloPessoa(c.usa, c.usaId)) + '" placeholder="' + esc(tr('vazio = o titular', 'blank = the holder')) + '">' +
          '<span class="hint">' + esc(tr('As compras entram com "Quem pagou" = quem usa (ex.: o cartão fica com a esposa).', 'Purchases get "Who paid" = who uses it.')) + '</span></label></div>' +
          (window.Pessoas ? Pessoas.opcoes('ctPessoas') : '') +
          '<div class="f"><span class="lb">' + esc(tr('Finais deste cartão', 'Endings of this card')) + '</span>' +
          '<ul class="ct-finais">' + fins.filter(function (f) { return !(c.id && API.antigo(c, f)); }).map(linhaFinal).join('') + '</ul>' +
          (c.id && fins.some(function (f) { return API.antigo(c, f); }) ? '<details class="ct-antigos"><summary class="small">' + esc(tr('Antigos (virtuais sem compra há mais de 6 meses): ', 'Old (virtual, no purchase for over 6 months): ', 'Antiguos (virtuales sin compras hace más de 6 meses): ') + fins.filter(function (f) { return API.antigo(c, f); }).length) + '</summary>' +
            '<ul class="ct-finais ct-finais-antigos">' + fins.filter(function (f) { return API.antigo(c, f); }).map(linhaFinal).join('') + '</ul></details>' : '') +
          '<button type="button" class="btn sm" data-acao="ct-final-mais">' + esc(tr('+ outro final', '+ another ending')) + '</button>' +
          '<span class="hint">' + esc(tr('Cartão virtual: cada compra pode ter um final diferente, mas é a mesma fatura. Adicional: o cartão de outra pessoa na mesma conta.',
            'Virtual card: each purchase may have a different ending, but it is the same bill. Additional: another person\'s card on the same account.')) + '</span></div>' +
          '<label class="f"><span class="lb">' + esc(tr('Validade (opcional)', 'Expiry (optional)')) + '</span><input id="ctValidade" inputmode="numeric" maxlength="5" placeholder="MM/AA" value="' + esc(c.validade || '') + '" style="max-width:110px"></label>' +
          '<input type="hidden" id="ctContaId" value="' + esc(c.contaId || '') + '"><input type="hidden" id="ctContaNome" value="' + esc(c.contaNome || '') + '">';
      },
      'cartoes.config': blocoConfig,
      /* 1.2.0 (3.106): no "+ Novo cartão", os cartões que o robô já trouxe; um toque preenche (bandeira, banco, conta, finais e tipos) */
      'cartao.topo': function (ctx) {
        if (ctx.semente) return '';
        var enc = API.encontrados(); if (!enc.length) return '';
        return '<div class="callout ct-detectados"><b>💳 ' + esc(tr('Detectados nas suas compras', 'Found in your purchases', 'Detectadas en tus compras')) + '</b>' +
          '<span class="hint" style="display:block">' + esc(tr('Um toque preenche o cadastro.', 'One tap fills in the form.', 'Un toque rellena el registro.')) + '</span>' +
          enc.slice(0, 6).map(function (x) {
            return '<button type="button" class="btn sm ct-det" data-acao="ct-encontrado" data-chave="' + esc(x.chave) + '" style="display:block;width:100%;text-align:left;margin-top:6px">' + esc(rotuloEnc(x)) + '</button>';
          }).join('') + '</div>';
      },
      /* 1.1.0: uma pergunta discreta por cartão com os finais novos (dá para responder depois) */
      'inbox.grupos': function () {
        if (window.Escopo && Escopo.soCasa && Escopo.soCasa()) return [];
        var l = API.novos(); if (!l.length) return [];
        var ops = function (sel) { return ['unico', 'permanente', 'adicional', 'fisico'].map(function (k) { return '<option value="' + k + '"' + (sel === k ? ' selected' : '') + '>' + esc(rotTipo(k)) + '</option>'; }).join(''); };
        var h = (window.Pessoas ? Pessoas.opcoes('ctInbPessoas') : '') + l.map(function (x) {
          var nome = typeof Banco !== 'undefined' ? Banco.rotuloCartao(x.c.id) : (x.c.apelido || '');
          return '<li class="inb-item ct-inb" data-c="' + esc(x.c.id) + '"><div><b>💳 ' + esc(x.fs.length > 1 ? x.fs.length + tr(' finais novos no ', ' new endings on ', ' finales nuevos en la ') + nome : tr('Final ••', 'Ending ••', 'Final ••') + x.fs[0].fim + tr(' novo no ', ' new on ', ' nuevo en la ') + nome) + '</b>' +
            '<span class="t-sub">' + esc(tr('Virtual de uso único, virtual permanente ou adicional? Quem usa? Pode responder depois.', 'Single-use virtual, permanent virtual or additional? Who uses it? You can answer later.', '¿Virtual de un solo uso, virtual permanente o adicional? ¿Quién la usa? Puedes responder después.')) + '</span>' +
            x.fs.map(function (f) {
              return '<div class="ct-inb-f row" data-fim="' + esc(f.fim) + '" style="gap:6px;flex-wrap:wrap;margin:4px 0"><span>••' + esc(f.fim) + '</span><select class="ct-inb-tipo">' + ops(f.tipo === 'virtual' ? 'unico' : f.tipo) + '</select>' +
                '<input class="ct-inb-usa" data-pessoa list="ctInbPessoas" placeholder="' + esc(tr('quem usa', 'who uses it', 'quién la usa')) + '" value="' + esc(rotuloPessoa(f.usa, f.usaId)) + '" style="max-width:9em">' +
                '<button type="button" class="btn sm primary" data-acao="ct-inb-ok" data-c="' + esc(x.c.id) + '" data-fim="' + esc(f.fim) + '">OK</button></div>';
            }).join('') + '</div></li>';
        }).join('');
        return [{ id: 'confirmar', n: l.length, html: h }];
      },
      'budget.painel': function () {
        var enc = API.encontrados().filter(function (x) { return x.contaId || !cartoes().length; });
        if (!enc.length) return '';
        var nomes = enc.slice(0, 4).map(function (x) { return (x.nome || (BANDEIRA_POR_ID[x.bandeira] || {}).nome || tr('Cartão', 'Card')) + ' (' + tr(x.finais.length > 1 ? 'finais ' : 'final ', x.finais.length > 1 ? 'endings ' : 'ending ') + x.finais.join(', ') + ')'; });
        /* 1.2.0 (3.106): "Achamos 3 cartões nas suas faturas: cadastrar" → um só abre preenchido; vários, o "+ Novo cartão" com a lista */
        return '<div class="callout ct-dica">💳 ' + esc(enc.length === 1 ? tr('Achamos 1 cartão nas suas faturas', 'We found 1 card in your bills', 'Encontramos 1 tarjeta en tus facturas') : tr('Achamos ' + enc.length + ' cartões nas suas faturas', 'We found ' + enc.length + ' cards in your bills', 'Encontramos ' + enc.length + ' tarjetas en tus facturas')) +
          ' <span class="muted small">(' + esc(nomes.join(tr(' e ', ' and ', ' y '))) + ')</span>: ' +
          (enc.length === 1 ? '<button type="button" class="linkinho" data-acao="ct-encontrado" data-chave="' + esc(enc[0].chave) + '">' : '<button type="button" class="linkinho" data-acao="ct-cadastrar">') + esc(tr('cadastrar', 'add them', 'registrar')) + '</button></div>';
      }
    },
    acoes: {
      'ct-cadastrar': function () { if (typeof abrirCartao === 'function') abrirCartao(null); },
      'ct-encontrado': function (el) { var s = API.semente(el.dataset.chave); if (s && typeof abrirCartao === 'function') abrirCartao(null, s); },
      'ct-cadastrar-enc': function (el) {   /* 1.4.0 (3.132): um toque cadastra a conta com todos os finais */
        var box = el.closest('.ct-enc'), nome = box ? box.querySelector('.ct-enc-nome').value : '', usa = box ? box.querySelector('.ct-enc-usa').value : '';
        var c = API.cadastrarEncontrado(el.dataset.chave, nome, usa); if (!c) return;
        Store.salvar(); render(); toast(tr('Cadastrado: ', 'Added: ', 'Registrada: ') + (c.apelido || c.fim));
      },
      'ct-final-mais': function () { var ul = document.querySelector('.ct-finais'); if (ul) { ul.insertAdjacentHTML('beforeend', linhaFinal({ fim: '', tipo: 'virtual' })); ul.lastElementChild.querySelector('input').focus(); } },
      'ct-final-tirar': function (el) { var li = el.closest('.ct-final'); if (li) li.parentNode.removeChild(li); },
      'ct-final-de': function (el) {
        var sel = document.querySelector('.ct-q-sel[data-fim="' + el.dataset.fim + '"]'), v = sel ? sel.value : '';
        if (v === 'novo') { API.responder(el.dataset.fim, 'novo'); abrirCartao(null, { fim: el.dataset.fim, finais: [{ fim: el.dataset.fim, tipo: 'naosei' }] }); return; }
        var n = API.responder(el.dataset.fim, v); Store.salvar(); render(); if (v.indexOf('c:') !== 0) toast(n + tr(' compra(s) ligada(s) ao cartão.', ' purchase(s) linked to the card.'));
      },
      'ct-final-nao': function (el) { API.responder(el.dataset.fim, 'nao'); Store.salvar(); render(); },
      'ct-inb-ok': function (el) {
        var row = el.closest('.ct-inb-f'); if (!row) return;
        API.responderFinal(el.dataset.c, el.dataset.fim, row.querySelector('.ct-inb-tipo').value, row.querySelector('.ct-inb-usa').value);
        Store.salvar(); if (typeof render === 'function') render(); if (typeof renderInboxN === 'function') renderInboxN();
      },
      'ct-novo-ok': function (el) { var c = cartoes().find(function (x) { return x.id === el.dataset.id; }); if (c) { (c.finais || []).forEach(function (f) { if (f.fim === el.dataset.fim) delete f.novo; }); Store.salvar(); render(); } }
    }
  });
  document.addEventListener('change', function (e) {
    var s = e.target; if (!s || !s.matches || !s.matches('.ct-f-tipo')) return;
    var t = s.parentNode.querySelector('.ct-f-tit'); if (t) t.hidden = s.value !== 'adicional';
  });
  window.Cartoes = API;
})();
