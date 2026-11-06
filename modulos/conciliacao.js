/* =====================================================================
   modulos/conciliacao.js — vencimentos passados conferidos sozinhos com os lançamentos   1.0.0 · 06/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     Compromisso importado (ou cadastrado) hoje, mas que já vinha sendo pago, aparecia com dezenas de
     "vencimentos passaram sem você marcar nada" — os pagamentos estavam lá, trazidos pelo robô ou pelo extrato.
     Agora, ao abrir o app e sempre que chega lançamento novo, cada vencimento dos últimos 12 meses ainda em aberto
     procura o lançamento que é ele: mesmo valor (±10%; ±30% se o valor varia), a mesma categoria OU o nome do
     compromisso no lançamento, até 7 dias de diferença. Achou: fica "pagamento confirmado", ligado ao lançamento.
     O que não bate e venceu ANTES do cadastro do compromisso fica "sem conferência" (não é atraso: index.html,
     Recorrente.ocorrencia). O que venceu depois do cadastro e não bate continua "atrasado", como antes.
   API (window.Conciliacao)
     rodar() → {casados, olhadas}   (Pagamento.conciliarAutomatico com {dias: 7, tol: 0.10, meses: 12, porNome: true})
   DADOS
     Não tem coleção própria: grava em Store.estado.pagamentos (o caderninho de "isto foi pago").
   PONTOS QUE USA
     iniciar · evento gasto.novo (espera 2 s depois do último, para o lote do robô entrar inteiro)
   ===================================================================== */
(function () {
  'use strict';
  var espera = null;
  function pt() { return I18n.atual === 'pt'; }
  var API = {
    rodar: function () {
      if (typeof Pagamento === 'undefined' || !Pagamento.conciliarAutomatico) return { casados: 0, olhadas: 0 };
      var r = Pagamento.conciliarAutomatico({ dias: 7, tol: 0.10, meses: 12, porNome: true });
      if (r.casados) {
        Store.salvar(); if (typeof render === 'function') render();
        toast(pt() ? '✓ ' + r.casados + (r.casados === 1 ? ' vencimento passado bateu' : ' vencimentos passados bateram') + ' com lançamentos: marcados como pagos.'
                   : '✓ ' + r.casados + ' past due date(s) matched entries: marked as paid.');
      }
      return r;
    }
  };
  function depois() { clearTimeout(espera); espera = setTimeout(function () { try { API.rodar(); } catch (e) { console.warn('conciliacao', e); } }, 2000); }

  MoneyModulos.registrar({
    id: 'conciliacao',
    versao: '1.0.0',
    iniciar: function () { setTimeout(function () { try { API.rodar(); } catch (e) { console.warn('conciliacao', e); } }, 1200); },
    ouvir: { 'gasto.novo': depois }
  });
  window.Conciliacao = API;
})();
