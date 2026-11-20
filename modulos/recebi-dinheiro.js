/* =====================================================================
   modulos/recebi-dinheiro.js — ENTRADA RÁPIDA "💵 Recebi em dinheiro" (3.91)        1.0.0 · 20/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 18/Nov/2026; sem IA)
     · Em Lançamentos, "💵 Recebi em dinheiro": valor, data, de onde veio (ex.: saque do FGTS no caixa) e o rótulo do IR
       (isento, tributável ou não entra). Vira uma entrada (Renda) com a forma "Dinheiro" e o rótulo do IR no mesmo
       formato do robô (g.irTexto). O FGTS que cai na conta o robô já classifica; este é o que chega em dinheiro vivo.
     · Visão da casa: a entrada segue a regra dos lançamentos (é de quem lançou).
   PONTOS QUE USA
     lancamentos.topo · ações rd-*
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function val(id) { var e = document.getElementById(id); return e ? String(e.value || '').trim() : ''; }
  var IR = [['isento', 'Isento (ex.: FGTS)', 'Tax-exempt (e.g. FGTS)', 'Exento (p. ej., FGTS)', 'IRPF (rendimento isento)'],
    ['tributavel', 'Tributável', 'Taxable', 'Tributable', 'IRPF (rendimento tributável)'],
    ['nao', 'Não entra no IR', 'Not for income tax', 'No entra en la renta', '']];

  function abrirForm() {
    $('#genTitle').textContent = tr('Recebi em dinheiro', 'I got cash', 'Recibí en efectivo');
    $('#genBody').innerHTML = Verter.html('<div class="grid g2">' +
      '<label class="field"><span>' + esc(tr('Valor (R$)', 'Amount (R$)', 'Importe (R$)')) + '</span><input id="rdValor" inputmode="decimal"></label>' +
      '<label class="field"><span>' + esc(tr('Data', 'Date', 'Fecha')) + '</span><input id="rdData" type="date" value="' + hojeISO() + '"></label></div>' +
      '<label class="field"><span>' + esc(tr('De onde veio', 'Where it came from', 'De dónde vino')) + '</span><input id="rdOrigem" maxlength="60" placeholder="' + esc(tr('ex.: saque do FGTS no caixa', 'e.g. FGTS withdrawal at the bank', 'p. ej., retirada del FGTS en caja')) + '"></label>' +
      '<label class="field"><span>' + esc(tr('No imposto de renda', 'For income tax', 'En la renta')) + '</span><select id="rdIr">' + IR.map(function (x) { return '<option value="' + x[0] + '">' + esc(tr(x[1], x[2], x[3])) + '</option>'; }).join('') + '</select></label>' +
      '<div class="f-actions"><button class="btn" data-close="genModal">' + esc(t('ac.cancelar')) + '</button><button class="btn primary" data-acao="rd-salvar">' + esc(t('ac.salvar')) + '</button></div>');
    delete $('#genBody').dataset.inbox;
    abrir('genModal');
  }

  MoneyModulos.registrar({
    id: 'recebi-dinheiro', versao: '1.0.0',
    pontos: {
      'lancamentos.topo': function () { return '<div class="row" style="margin:0 0 8px"><button type="button" class="btn sm" data-acao="rd-abrir">💵 ' + esc(tr('Recebi em dinheiro', 'I got cash', 'Recibí en efectivo')) + '</button></div>'; }
    },
    acoes: {
      'rd-abrir': function () { abrirForm(); },
      'rd-salvar': function () {
        var v = n2(Number(val('rdValor').replace(/\./g, '').replace(',', '.'))), d = val('rdData'), o = val('rdOrigem'), ir = IR.find(function (x) { return x[0] === val('rdIr'); }) || IR[0];
        if (!(v > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return toast(tr('Diga o valor e a data.', 'Enter the amount and the date.', 'Indica el importe y la fecha.'), 'warn');
        Gasto.add({ data: d, valor: v, fluxo: 'entrada', grupo: 'RENDA', sub: o || tr('Dinheiro', 'Cash', 'Efectivo'), desc: o || tr('Recebido em dinheiro', 'Received in cash', 'Recibido en efectivo'),
          forma: tr('Dinheiro', 'Cash', 'Efectivo'), irTexto: ir[4], irpf: ir[0] !== 'nao', origem: 'manual', editadoPessoa: true });
        fechar('genModal'); Store.salvar(); render();
        toast(tr('Entrada lançada: ', 'Income added: ', 'Ingreso registrado: ') + fmt(v) + (ir[4] ? ' · ' + tr(ir[1], ir[2], ir[3]) : ''));
      }
    }
  });
})();
