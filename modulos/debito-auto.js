/* =====================================================================
   modulos/debito-auto.js — "NÃO PAGUE: ESTÁ EM DÉBITO AUTOMÁTICO" (3.77)        1.0.0 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 13/Nov/2026)
     Quando a pessoa cadastra ou importa um boleto (PDF em "Chegou um boleto", o boleto que vem no contrato, uma conta
     fixa cadastrada como boleto ou agendada) de um recebedor (CNPJ ou nome) que já tem uma conta fixa em DÉBITO
     AUTOMÁTICO, o app mostra um aviso VERMELHO: "Esta conta já é paga por débito automático em <banco> no dia D.
     Pagar o boleto também = pagar em dobro." Ao salvar uma conta fixa assim, o app pergunta antes de criar.
     Ex.: a fatura de um cartão aparece no DDA como boleto e também é debitada todo mês na conta corrente.
   COMO ACHA
     Contas fixas ativas com "Débito automático" (estado padrão ou forma). Mesmo CNPJ (só os números), ou uma palavra
     do nome que não é genérica (≥ 4 letras; "PORTOSEG" casa com "Porto", uma começa com a outra).
   API (window.DebitoAuto)
     conflito({nome, cnpj, texto}, ignorarId?) → {r, banco, dia} | null · aviso(b, ignorarId?) → html (vazio se não há)
   PONTOS QUE USA
     ação da-salvar (o "salvar mesmo assim" da conta fixa)
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function dig(t) { return String(t || '').replace(/\D/g, ''); }
  var GEN = ('ltda sa eireli mei cia companhia financ financeira invest investimento credito debito cartao fatura conta contas pagamento boleto ' +
    'banco servicos servico brasil comercio administradora adm seguros mensal mensalidade automatico parcela').split(' ');
  function palavras(t) { return N(t).split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 4 && GEN.indexOf(w) < 0 && !/^\d+$/.test(w); }); }
  function casa(a, b) { return a === b || (a.length >= 4 && b.length >= 4 && (a.indexOf(b) === 0 || b.indexOf(a) === 0)); }
  function emDebito(r) { return r.estadoPadrao === 'automatico' || r.forma === 'debaut' || /d[eé]bito autom/i.test(r.forma || ''); }
  function cnpjsDe(t) { return (String(t || '').match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g) || []).map(dig); }
  function bancoDe(r) {
    var b = r.bancoId && typeof Banco !== 'undefined' && Banco.achar(r.bancoId);
    return (b && (b.apelido || b.nome)) || r.conta || '';
  }

  var API = {
    conflito: function (b, ignorarId) {
      if (typeof Recorrente === 'undefined') return null;
      var cn = [dig(b.cnpj)].concat(cnpjsDe(b.texto)).filter(function (x) { return x.length === 14; });
      var ws = palavras([b.nome, b.beneficiario].join(' '));
      var r = Recorrente.ativos().filter(function (x) { return x.id !== ignorarId && x.fluxo !== 'entrada' && emDebito(x); }).find(function (x) {
        var cx = [dig(x.cnpj), dig(x.contraparte && x.contraparte.cnpj)].concat(cnpjsDe([x.nome, x.obs].join(' ')));
        if (cn.some(function (c) { return cx.indexOf(c) >= 0; })) return true;
        var wx = palavras([x.nome, x.recebedor, x.contraparte && x.contraparte.nome].join(' '));
        return ws.some(function (w) { return wx.some(function (y) { return casa(w, y); }); });
      });
      return r ? { r: r, banco: bancoDe(r), dia: r.dia || '' } : null;
    },
    frase: function (c) {
      return pt() ? 'NÃO PAGUE: ESTÁ EM DÉBITO AUTOMÁTICO. Esta conta já é paga por débito automático' + (c.banco ? ' em ' + c.banco : '') + (c.dia ? ' no dia ' + c.dia : '') + ' (' + c.r.nome + '). Pagar o boleto também = pagar em dobro.'
        : 'DO NOT PAY: IT IS ON AUTO-DEBIT. This bill is already paid by auto-debit' + (c.banco ? ' at ' + c.banco : '') + (c.dia ? ' on day ' + c.dia : '') + ' (' + c.r.nome + '). Paying the slip too = paying twice.';
    },
    aviso: function (b, ignorarId) {
      var c = API.conflito(b, ignorarId); if (!c) return '';
      return '<div class="aviso-vermelho da-aviso" role="alert"><b>⛔ ' + esc(API.frase(c)) + '</b></div>';
    },
    /* a conta fixa que vai ser salva como boleto/agendada: pergunta antes */
    perguntar: function (dados, ignorarId, op) {
      if (op && op.debitoOk) return false;
      if (dados.estadoPadrao === 'automatico' || dados.fluxo === 'entrada' || dados.forma === 'debaut') return false;
      var c = API.conflito({ nome: dados.nome, cnpj: dados.cnpj }, ignorarId); if (!c) return false;
      pendente = op || {};
      $('#genTitle').textContent = pt() ? 'Já está em débito automático' : 'Already on auto-debit';
      $('#genBody').innerHTML = Verter.html('<div class="aviso-vermelho da-aviso" role="alert"><b>⛔ ' + esc(API.frase(c)) + '</b></div>' +
        '<div class="f-actions"><button class="btn" data-close="genModal">' + esc(t('ac.cancelar')) + '</button>' +
        '<button class="btn" data-acao="da-salvar">' + esc(pt() ? 'Salvar mesmo assim' : 'Save anyway') + '</button></div>');
      abrir('genModal');
      return true;
    }
  };
  var pendente = null;

  MoneyModulos.registrar({
    id: 'debito-auto', versao: '1.0.0',
    acoes: {
      'da-salvar': function () { var op = Object.assign({}, pendente || {}, { debitoOk: true }); pendente = null; fechar('genModal'); salvarRecorrente(op); }
    }
  });
  window.DebitoAuto = API;
})();
