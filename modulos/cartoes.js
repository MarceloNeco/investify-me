/* =====================================================================
   modulos/cartoes.js — cartões por conta, com vários finais (3.65)        1.0.0 · 11/Nov/2026
   ---------------------------------------------------------------------
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
  var TIPOS = { fisico: ['físico', 'physical'], virtual: ['virtual', 'virtual'], adicional: ['adicional', 'additional'], naosei: ['não sei', 'not sure'] };
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
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

  var API = {
    TIPOS: TIPOS,
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
      if (f && f.tipo === 'adicional' && (f.titular || f.titularId)) return rotuloPessoa(f.titular, f.titularId);
      return rotuloPessoa(c.usa, c.usaId) || rotuloPessoa(c.titular, c.titularId);
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
      var grupos = {};
      ((typeof ST !== 'undefined' && ST && ST.gastos) || []).forEach(function (g) {
        if (g.cartaoId || !g.finalCartao) return;
        if (API.doFinal(g.finalCartao) || (g.contaCartao && API.daConta(g.contaCartao.id))) return;
        var k = g.contaCartao && g.contaCartao.id ? 'c:' + g.contaCartao.id : 'f:' + g.finalCartao;
        var x = grupos[k] || (grupos[k] = { chave: k, contaId: g.contaCartao && g.contaCartao.id || '', nome: g.contaCartao && g.contaCartao.nome || '', bandeira: '', banco: '', finais: [], n: 0, ultima: '' });
        if (x.finais.indexOf(g.finalCartao) < 0) x.finais.push(g.finalCartao);
        x.n++; if ((g.data || '') > x.ultima) x.ultima = g.data || '';
        if (!x.bandeira && g.cartaoNome) x.bandeira = bandeiraDe(g.cartaoNome);
        if (!x.banco && g.conta) x.banco = g.conta;
      });
      return Object.keys(grupos).map(function (k) { return grupos[k]; }).sort(function (a, b) { return b.n - a.n; });
    },
    /* "Este final é de qual cartão?": só quando já há cartão cadastrado e o final veio SEM a conta do cartão */
    perguntas: function () {
      if (!cartoes().length) return [];
      var resp = cfg().cartoesPergunta || {};
      return API.encontrados().filter(function (x) { return !x.contaId; }).map(function (x) { return { fim: x.finais[0], n: x.n, ultima: x.ultima }; })
        .filter(function (x) { return !resp[x.fim]; });
    },
    responder: function (fim, alvo) {
      (cfg().cartoesPergunta = cfg().cartoesPergunta || {})[fim] = alvo;
      if (alvo && alvo !== 'nao' && alvo !== 'novo') {
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
        finais: x.finais.map(function (f, i) { return { fim: f, tipo: x.contaId ? (x.finais.length > 1 ? 'virtual' : 'naosei') : 'naosei' }; }) };
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
        var f = { fim: fim, tipo: TIPOS[tipo] ? tipo : 'naosei' };
        if (f.tipo === 'adicional' && tit) { f.titular = tit; if (window.Pessoas) Pessoas.ligar(f, 'titular', 'titularId'); }
        fins.push(f);
      });
      if (c.fim && !fins.some(function (f) { return f.fim === c.fim; })) fins.unshift({ fim: c.fim, tipo: 'naosei' });
      c.finais = fins; if (!c.fim && fins[0]) c.fim = fins[0].fim;
      return API.ligarRetro(c);
    }
  };

  function linhaFinal(f, i) {
    var op = Object.keys(TIPOS).map(function (k) { return '<option value="' + k + '"' + (f.tipo === k ? ' selected' : '') + '>' + esc(TIPOS[k][pt() ? 0 : 1]) + (f.novo && k === f.tipo ? ' ' + tr('(novo)', '(new)') : '') + '</option>'; }).join('');
    return '<li class="ct-final"><input class="ct-f-fim" inputmode="numeric" maxlength="4" value="' + esc(f.fim || '') + '" placeholder="1234" aria-label="' + esc(tr('Final', 'Ending')) + '">' +
      '<select class="ct-f-tipo" aria-label="' + esc(tr('Tipo', 'Type')) + '">' + op + '</select>' +
      '<input class="ct-f-tit" data-pessoa list="ctPessoas" value="' + esc(rotuloPessoa(f.titular, f.titularId)) + '" placeholder="' + esc(tr('titular do adicional', 'additional holder')) + '"' + (f.tipo === 'adicional' ? '' : ' hidden') + '>' +
      '<button type="button" class="linkinho" data-acao="ct-final-tirar" aria-label="' + esc(tr('Tirar este final', 'Remove this ending')) + '">✕</button></li>';
  }

  function blocoConfig() {
    var enc = API.encontrados(), q = API.perguntas(), novos = [];
    cartoes().forEach(function (c) { API.finais(c).forEach(function (f) { if (f.novo) novos.push({ c: c, f: f }); }); });
    var h = '';
    var comConta = enc.filter(function (x) { return x.contaId || !cartoes().length; });
    if (comConta.length) {
      h += '<div class="callout ct-encontrados"><b>💳 ' + esc(tr('Encontrei ' + comConta.length + ' cartão(ões) nas suas compras', 'I found ' + comConta.length + ' card(s) in your purchases')) + '</b>' +
        '<ul class="small" style="margin:6px 0 0;padding-left:18px">' + comConta.map(function (x) {
          var nome = x.nome || ((BANDEIRA_POR_ID[x.bandeira] || {}).nome || tr('Cartão', 'Card'));
          return '<li>' + esc(nome + (x.banco ? ' · ' + x.banco : '') + ' (' + tr(x.finais.length > 1 ? 'finais ' : 'final ', x.finais.length > 1 ? 'endings ' : 'ending ') + x.finais.join(', ') + ') · ' + x.n + tr(' compra(s)', ' purchase(s)')) +
            ' <button type="button" class="linkinho" data-acao="ct-encontrado" data-chave="' + esc(x.chave) + '">' + esc(tr('Dar nome', 'Name it')) + '</button></li>';
        }).join('') + '</ul></div>';
    }
    if (q.length) {
      var ops = cartoes().map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(typeof Banco !== 'undefined' ? Banco.rotuloCartao(c.id) : (c.apelido || c.fim)) + '</option>'; }).join('');
      h += '<div class="ct-perguntas">' + q.map(function (x) {
        return '<div class="ps-q"><span>' + esc(tr('Este final ', 'This ending ') + x.fim + tr(' é de qual cartão?', ' belongs to which card?')) + ' <span class="muted small">(' + x.n + tr(' compra(s)', ' purchase(s)') + ')</span></span>' +
          '<select class="ct-q-sel" data-fim="' + esc(x.fim) + '">' + ops + '<option value="novo">' + esc(tr('novo cartão', 'new card')) + '</option></select>' +
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
    versao: '1.0.0',
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
          '<ul class="ct-finais">' + fins.map(linhaFinal).join('') + '</ul>' +
          '<button type="button" class="btn sm" data-acao="ct-final-mais">' + esc(tr('+ outro final', '+ another ending')) + '</button>' +
          '<span class="hint">' + esc(tr('Cartão virtual: cada compra pode ter um final diferente, mas é a mesma fatura. Adicional: o cartão de outra pessoa na mesma conta.',
            'Virtual card: each purchase may have a different ending, but it is the same bill. Additional: another person\'s card on the same account.')) + '</span></div>' +
          '<label class="f"><span class="lb">' + esc(tr('Validade (opcional)', 'Expiry (optional)')) + '</span><input id="ctValidade" inputmode="numeric" maxlength="5" placeholder="MM/AA" value="' + esc(c.validade || '') + '" style="max-width:110px"></label>' +
          '<input type="hidden" id="ctContaId" value="' + esc(c.contaId || '') + '"><input type="hidden" id="ctContaNome" value="' + esc(c.contaNome || '') + '">';
      },
      'cartoes.config': blocoConfig,
      'budget.painel': function () {
        var enc = API.encontrados().filter(function (x) { return x.contaId || !cartoes().length; });
        if (!enc.length) return '';
        var nomes = enc.slice(0, 4).map(function (x) { return (x.nome || (BANDEIRA_POR_ID[x.bandeira] || {}).nome || tr('Cartão', 'Card')) + ' (' + tr(x.finais.length > 1 ? 'finais ' : 'final ', x.finais.length > 1 ? 'endings ' : 'ending ') + x.finais.join(', ') + ')'; });
        return '<div class="callout ct-dica">💳 ' + esc(tr('Encontrei ' + enc.length + ' cartão(ões) nas suas compras: ', 'I found ' + enc.length + ' card(s) in your purchases: ') + nomes.join(tr(' e ', ' and '))) +
          '. <button type="button" class="linkinho" data-acao="ct-encontrado" data-chave="' + esc(enc[0].chave) + '">' + esc(tr('Dar nome?', 'Name them?')) + '</button></div>';
      }
    },
    acoes: {
      'ct-encontrado': function (el) { var s = API.semente(el.dataset.chave); if (s && typeof abrirCartao === 'function') abrirCartao(null, s); },
      'ct-final-mais': function () { var ul = document.querySelector('.ct-finais'); if (ul) { ul.insertAdjacentHTML('beforeend', linhaFinal({ fim: '', tipo: 'virtual' })); ul.lastElementChild.querySelector('input').focus(); } },
      'ct-final-tirar': function (el) { var li = el.closest('.ct-final'); if (li) li.parentNode.removeChild(li); },
      'ct-final-de': function (el) {
        var sel = document.querySelector('.ct-q-sel[data-fim="' + el.dataset.fim + '"]'), v = sel ? sel.value : '';
        if (v === 'novo') { API.responder(el.dataset.fim, 'novo'); abrirCartao(null, { fim: el.dataset.fim, finais: [{ fim: el.dataset.fim, tipo: 'naosei' }] }); return; }
        var n = API.responder(el.dataset.fim, v); Store.salvar(); render(); toast(n + tr(' compra(s) ligada(s) ao cartão.', ' purchase(s) linked to the card.'));
      },
      'ct-final-nao': function (el) { API.responder(el.dataset.fim, 'nao'); Store.salvar(); render(); },
      'ct-novo-ok': function (el) { var c = cartoes().find(function (x) { return x.id === el.dataset.id; }); if (c) { (c.finais || []).forEach(function (f) { if (f.fim === el.dataset.fim) delete f.novo; }); Store.salvar(); render(); } }
    }
  });
  document.addEventListener('change', function (e) {
    var s = e.target; if (!s || !s.matches || !s.matches('.ct-f-tipo')) return;
    var t = s.parentNode.querySelector('.ct-f-tit'); if (t) t.hidden = s.value !== 'adicional';
  });
  window.Cartoes = API;
})();
