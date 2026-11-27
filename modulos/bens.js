/* =====================================================================
   modulos/bens.js — "🏠 Imóveis, carro e outros bens": o cadastro GUIADO (3.140)        1.0.0 · 27/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (feedback do dono: o "+ Item" abria um formulário genérico com "FGTS" já escolhido e parecia não funcionar)
     · Numa janela (sempre visível, nada de rolar até um formulário escondido): primeiro "o que é?" — Imóvel, Carro ou moto, FGTS,
       Previdência bloqueada, Participação em empresa, Outro — e depois só os campos daquele tipo.
     · Imóvel: apelido, uso (moro / alugado / na planta / veraneio), de quem é (as pessoas da família), valor de compra, valor
       estimado hoje; financiamento (banco, saldo devedor, parcela, dia) → vira DÍVIDA (modulos/dividas.js) e COMPROMISSO (conta fixa
       da parcela); aluguel recebido → vira RENDA (conta fixa de entrada, grupo Renda › Aluguel); na planta: valor do contrato, pago até
       agora, a pagar (contrato − pago) e a data das chaves.
     · Carro ou moto: marca, modelo, ano, valor estimado hoje (informado; a tabela FIPE ainda não, sem o "pode" do dono), de quem é,
       financiamento como no imóvel.
     · FGTS, previdência bloqueada, participação em empresa, outro: o de sempre (nome, onde, valor, saldo em, observação).
     · Os dados continuam em ST.patrimonio_iliquido (modulos/patrimonio-iliquido.js): entram no patrimônio total, separados do que é
       líquido. O documento do imóvel (contrato/escritura) que chega pelo "📎 Carregar documento" fica guardado junto do bem.
   API (window.Bens)
     abrir(tipo?, op?) → a janela (op.id = editar; op.arquivos = documentos para guardar junto) · TIPOS · salvar(dados, id) → item
   PONTOS QUE USA
     ações bens-* (chamado por modulos/patrimonio-iliquido.js e modulos/carregar-doc.js)
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function num(v) { var n = Number(String(v == null ? '' : v).replace(',', '.')); return v !== '' && v != null && isFinite(n) ? n : null; }
  function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }
  function marcado(id) { var e = document.getElementById(id); return !!(e && e.checked); }
  function hoje() { return typeof hojeISO === 'function' ? hojeISO() : new Date().toISOString().slice(0, 10); }

  var TIPOS = {
    imovel: { ico: '🏠', nome: function () { return tr('Imóvel', 'Property', 'Inmueble'); } },
    carro: { ico: '🚗', nome: function () { return tr('Carro ou moto', 'Car or motorbike', 'Coche o moto'); } },
    fgts: { ico: '💼', nome: function () { return 'FGTS'; } },
    previdencia: { ico: '🔒', nome: function () { return tr('Previdência bloqueada', 'Locked pension', 'Pensión bloqueada'); } },
    empresa: { ico: '🏢', nome: function () { return tr('Participação em empresa', 'Company stake', 'Participación en empresa'); } },
    outro: { ico: '📦', nome: function () { return tr('Outro', 'Other', 'Otro'); } }
  };
  var USOS = { moro: ['Moro nele', 'I live in it', 'Vivo en él'], alugado: ['Alugado para alguém', 'Rented out', 'Alquilado'], planta: ['Na planta', 'Off-plan', 'Sobre plano'], veraneio: ['Veraneio', 'Holiday home', 'Segunda residencia'] };
  var pendentes = null;   /* documentos que vieram pelo "Carregar documento", para guardar junto do bem */

  function campo(rot, html, cls) { return '<label class="f' + (cls ? ' ' + cls : '') + '"><span class="lb">' + esc(rot) + '</span>' + html + '</label>'; }
  function inp(id, v, extra) { return '<input id="' + id + '" value="' + esc(v == null ? '' : v) + '"' + (extra || '') + '>'; }
  function dinheiro(id, v) { return inp(id, v != null && v !== '' ? v : '', ' type="number" min="0" step="0.01" inputmode="decimal"'); }
  function pessoasCasa() { return window.Pessoas && Pessoas.ativas ? Pessoas.ativas().filter(function (p) { return p.tipo === 'casa' || !p.tipo; }) : []; }

  function css() {
    if (document.getElementById('bensCss')) return;
    var s = document.createElement('style'); s.id = 'bensCss';
    s.textContent = '.bn-bloco{border:1px solid var(--line,#2e3c4f);border-radius:12px;padding:8px 12px 10px;margin:8px 0}.bn-bloco legend{padding:0 6px;font-size:.85rem;color:var(--muted,#9fb0c4)}' +
      '.bn-tipos{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:6px 0 12px}.bn-tipo{justify-content:flex-start;text-align:left}.bn-donos .chips{gap:6px}';
    document.head.appendChild(s);
  }
  function passo1() {
    css();
    $('#genTitle').textContent = tr('🏠 Imóveis, carro e outros bens', '🏠 Property, car and other assets', '🏠 Inmuebles, coche y otros bienes');
    $('#genBody').innerHTML = Verter.html('<p class="small">' + esc(tr('O que é?', 'What is it?', '¿Qué es?')) + '</p><div class="bn-tipos">' +
      Object.keys(TIPOS).map(function (k) { return '<button type="button" class="btn bn-tipo" data-acao="bens-tipo" data-v="' + k + '">' + TIPOS[k].ico + ' ' + esc(TIPOS[k].nome()) + '</button>'; }).join('') + '</div>' +
      '<p class="tiny muted">' + esc(tr('Entra no patrimônio total, separado do que dá para sacar. Não entra na rentabilidade.', 'Counts in total net worth, separate from what you can withdraw. Not in returns.', 'Cuenta en el patrimonio total, aparte de lo que se puede retirar. No entra en la rentabilidad.')) + '</p>');
    abrir('genModal');
  }

  function formulario(tipo, x) {
    css(); x = x || {}; var d = x.detalhe || {}, fin = x.fin || {}, alu = x.aluguel || {}, pl = x.planta || {}, car = x.carro || {};
    var donos = x.donos || (x.donoId ? [x.donoId] : []), ps = pessoasCasa();
    var h = '<input type="hidden" id="bnId" value="' + esc(x.id || '') + '"><input type="hidden" id="bnTipo" value="' + esc(tipo) + '">' +
      '<div class="grid g2">';
    if (tipo === 'carro') {
      h += campo(tr('Marca', 'Make', 'Marca'), inp('bnMarca', car.marca, ' placeholder="' + esc(tr('ex.: Marca Exemplo', 'e.g. Example make', 'ej.: Marca Ejemplo')) + '"')) +
        campo(tr('Modelo', 'Model', 'Modelo'), inp('bnModelo', car.modelo)) +
        campo(tr('Ano', 'Year', 'Año'), inp('bnAno', car.ano, ' type="number" min="1950" max="2100" inputmode="numeric"')) +
        campo(tr('Apelido (opcional)', 'Nickname (optional)', 'Apodo (opcional)'), inp('bnNome', x.nome && !(car.marca && x.nome === [car.marca, car.modelo].join(' ').trim()) ? x.nome : ''));
    } else {
      h += campo(tipo === 'imovel' ? tr('Apelido do imóvel', 'Property nickname', 'Apodo del inmueble') : tr('Nome', 'Name', 'Nombre'),
        inp('bnNome', x.nome, ' placeholder="' + esc(tipo === 'imovel' ? tr('ex.: Apartamento da praia', 'e.g. Beach flat', 'ej.: Piso de la playa') : tipo === 'fgts' ? tr('ex.: FGTS Empresa', 'e.g. FGTS employer', 'ej.: FGTS Empresa') : '') + '"'));
      if (tipo !== 'imovel') h += campo(tr('Onde está (empregador, banco…)', 'Where (employer, bank…)', 'Dónde está (empresa, banco…)'), inp('bnInst', x.inst));
    }
    if (tipo === 'imovel') h += campo(tr('Uso', 'Use', 'Uso'), '<select id="bnUso">' + Object.keys(USOS).map(function (k) { return '<option value="' + k + '"' + ((x.uso || 'moro') === k ? ' selected' : '') + '>' + esc(tr.apply(null, USOS[k])) + '</option>'; }).join('') + '</select>');
    if (tipo === 'imovel' || tipo === 'carro') h += campo(tr('Valor de compra', 'Purchase price', 'Precio de compra'), dinheiro('bnCompra', x.compra));
    h += campo(tipo === 'imovel' || tipo === 'carro' ? tr('Valor estimado hoje', 'Estimated value today', 'Valor estimado hoy') : tr('Valor (R$)', 'Amount (R$)', 'Valor (R$)'), dinheiro('bnValor', x.valor)) +
      campo(tr('Valor de quando', 'Value as of', 'Valor de cuándo'), '<input type="date" id="bnData" value="' + esc(x.data || hoje()) + '">') + '</div>';
    if (tipo === 'imovel') h += '<fieldset class="bn-bloco bn-planta"' + ((x.uso || 'moro') === 'planta' ? '' : ' hidden') + '><legend>' + esc(tr('Na planta', 'Off-plan', 'Sobre plano')) + '</legend><div class="grid g2">' +
      campo(tr('Valor do contrato', 'Contract value', 'Valor del contrato'), dinheiro('bnContrato', pl.contrato)) + campo(tr('Pago até agora', 'Paid so far', 'Pagado hasta ahora'), dinheiro('bnPago', pl.pago)) +
      campo(tr('Data das chaves', 'Handover date', 'Fecha de entrega'), '<input type="date" id="bnChaves" value="' + esc(pl.chaves || '') + '">') +
      '<div class="f"><span class="lb">' + esc(tr('A pagar', 'Still to pay', 'Por pagar')) + '</span><b id="bnAPagar" class="mono">' + (pl.contrato ? fmt(Math.max(0, n2(pl.contrato - (pl.pago || 0)))) : '—') + '</b></div></div></fieldset>' +
      '<fieldset class="bn-bloco bn-aluguel"' + (x.uso === 'alugado' ? '' : ' hidden') + '><legend>' + esc(tr('Aluguel recebido', 'Rent received', 'Alquiler cobrado')) + '</legend><div class="grid g2">' +
      campo(tr('Valor por mês', 'Amount per month', 'Importe al mes'), dinheiro('bnAluguel', alu.valor)) + campo(tr('Dia em que cai', 'Day it lands', 'Día en que entra'), inp('bnAluguelDia', alu.dia || 10, ' type="number" min="1" max="31" inputmode="numeric"')) +
      '</div><p class="tiny muted">' + esc(tr('Entra na Renda como conta fixa de entrada.', 'Goes into Income as a recurring entry.', 'Entra en Ingresos como entrada fija.')) + '</p></fieldset>';
    if (tipo === 'imovel' || tipo === 'carro') h += '<label class="row small bn-fin-ck" style="gap:8px;margin:8px 0"><input type="checkbox" id="bnFinanciado" style="width:auto"' + (fin.saldo || fin.parcela ? ' checked' : '') + '> ' + esc(tr('Tem financiamento', 'It is financed', 'Tiene financiación')) + '</label>' +
      '<fieldset class="bn-bloco bn-fin"' + (fin.saldo || fin.parcela ? '' : ' hidden') + '><legend>' + esc(tr('Financiamento', 'Financing', 'Financiación')) + '</legend><div class="grid g2">' +
      campo(tr('Banco', 'Bank', 'Banco'), inp('bnFinBanco', fin.banco)) + campo(tr('Saldo devedor', 'Outstanding balance', 'Saldo pendiente'), dinheiro('bnFinSaldo', fin.saldo)) +
      campo(tr('Parcela', 'Instalment', 'Cuota'), dinheiro('bnFinParcela', fin.parcela)) + campo(tr('Dia do vencimento', 'Due day', 'Día de vencimiento'), inp('bnFinDia', fin.dia || 10, ' type="number" min="1" max="31" inputmode="numeric"')) +
      '</div><p class="tiny muted">' + esc(tr('Vira uma dívida (o saldo) e um compromisso (a parcela de cada mês).', 'Becomes a debt (the balance) and a commitment (the monthly instalment).', 'Se convierte en una deuda (el saldo) y un compromiso (la cuota de cada mes).')) + '</p></fieldset>';
    if (ps.length) h += '<div class="f bn-donos"><span class="lb">' + esc(tr('De quem é', 'Whose is it', 'De quién es')) + '</span><div class="chips">' + ps.map(function (p) {
      return '<label class="chip"><input type="checkbox" class="bn-dono" value="' + esc(p.id) + '" style="width:auto"' + (donos.indexOf(p.id) >= 0 ? ' checked' : '') + '> ' + esc(Pessoas.rotulo(p)) + '</label>'; }).join('') + '</div></div>';
    h += campo(tr('Observação', 'Note', 'Nota'), inp('bnObs', x.obs));
    if (pendentes && pendentes.length) h += '<p class="small bn-docs">📎 ' + esc(tr('Fica guardado junto: ', 'Kept with it: ', 'Se guarda junto: ') + pendentes.map(function (f) { return f.name; }).join(', ')) + '</p>';
    $('#genTitle').textContent = TIPOS[tipo].ico + ' ' + TIPOS[tipo].nome() + (x.id ? ' — ' + tr('editar', 'edit', 'editar') : '');
    $('#genBody').innerHTML = Verter.html(h + '<div class="f-actions">' + (x.id ? '<button class="btn danger" data-acao="bens-excluir" data-id="' + esc(x.id) + '">' + esc(tr('Excluir', 'Delete', 'Eliminar')) + '</button>' : '<button class="btn" data-acao="bens-voltar">‹ ' + esc(tr('Voltar', 'Back', 'Volver')) + '</button>') +
      '<button class="btn" data-close="genModal">' + esc(tr('Cancelar', 'Cancel', 'Cancelar')) + '</button><button class="btn primary" data-acao="bens-salvar">' + esc(tr('Guardar', 'Save', 'Guardar')) + '</button></div>');
    abrir('genModal');
    var foco = document.getElementById(tipo === 'carro' ? 'bnMarca' : 'bnNome'); if (foco) foco.focus();
  }

  /* o que muda conforme a resposta: na planta, alugado, financiado; o "a pagar" */
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.id) return;
    if (t.id === 'bnUso') { var pl = document.querySelector('.bn-planta'), al = document.querySelector('.bn-aluguel'); if (pl) pl.hidden = t.value !== 'planta'; if (al) al.hidden = t.value !== 'alugado'; }
    if (t.id === 'bnFinanciado') { var f = document.querySelector('.bn-fin'); if (f) f.hidden = !t.checked; }
  });
  document.addEventListener('input', function (e) {
    var t = e.target; if (!t || (t.id !== 'bnContrato' && t.id !== 'bnPago')) return;
    var c = num(val('bnContrato')), p = num(val('bnPago')) || 0, o = document.getElementById('bnAPagar'); if (o) o.textContent = c ? fmt(Math.max(0, n2(c - p))) : '—';
  });

  var API = {
    TIPOS: TIPOS,
    abrir: function (tipo, op) {
      op = op || {}; pendentes = op.arquivos || null;
      var x = op.id && window.PatrimonioIliquido ? PatrimonioIliquido.lista().find(function (y) { return y.id === op.id; }) : null;
      if (x) return formulario(TIPOS[x.tipo] ? x.tipo : 'outro', x);
      if (tipo && TIPOS[tipo]) return formulario(tipo, null);
      passo1();
    },
    /* guarda o bem e o que ele gera: a dívida e a parcela (financiamento) e a renda (aluguel) */
    salvar: function (d, id) {
      var L = PatrimonioIliquido.lista(), x = id ? L.find(function (y) { return y.id === id; }) : null;
      var nome = d.tipo === 'carro' ? (d.nome || [d.carro.marca, d.carro.modelo, d.carro.ano].filter(Boolean).join(' ')) : d.nome;
      var valor = d.valor; if (!(valor > 0) && d.tipo === 'imovel' && d.uso === 'planta' && d.planta && d.planta.pago > 0) valor = d.planta.pago;
      var base = PatrimonioIliquido.arruma({ nome: nome, tipo: d.tipo, inst: d.inst || (d.fin && d.fin.banco) || '', valor: valor, data: d.data, obs: d.obs });
      if (x) Object.assign(x, base); else x = PatrimonioIliquido.adicionar(base);
      ['uso', 'compra', 'planta', 'carro'].forEach(function (k) { if (d[k] != null && d[k] !== '') x[k] = d[k]; else delete x[k]; });
      x.donos = d.donos || [];
      if (window.Pessoas) { x.dono = x.donos.map(function (i) { return Pessoas.rotulo(Pessoas.porId(i)); }).filter(Boolean).join(', '); x.donoId = x.donos[0] || ''; }
      /* financiamento → dívida + compromisso (a parcela) */
      var fin = d.fin, ant = x.fin || {};
      if (fin && (fin.saldo > 0 || fin.parcela > 0)) {
        if (window.Dividas) { var dv = Dividas.salvar({ nome: tr('Financiamento ', 'Financing ', 'Financiación ') + nome, tipo: 'financiamento', instituicao: fin.banco || '', saldo: fin.saldo || 0, parcela: fin.parcela || 0, diaVenc: fin.dia || '', bemRef: x.id }, ant.dividaId || null); fin.dividaId = dv.id; }
        if (typeof Recorrente !== 'undefined' && fin.parcela > 0) {
          var rd = { nome: tr('Parcela · ', 'Instalment · ', 'Cuota · ') + nome, valor: fin.parcela, dia: fin.dia || 10, regra: 'dia', grupo: d.tipo === 'carro' ? 'VEICULO' : 'HABITACAO', sub: tr('Financiamento', 'Financing', 'Financiación'), fluxo: 'saida', estadoPadrao: 'pendente', origem: 'bem', bemRef: x.id };
          if (ant.recId && Recorrente.achar(ant.recId)) { Recorrente.atualizar(ant.recId, rd); fin.recId = ant.recId; } else fin.recId = Recorrente.add(rd).id;
        }
        x.fin = fin;
      } else delete x.fin;
      /* aluguel recebido → renda (conta fixa de entrada) */
      var al = d.uso === 'alugado' && d.aluguel && d.aluguel.valor > 0 ? d.aluguel : null, aant = x.aluguel || {};
      if (al && typeof Recorrente !== 'undefined') {
        var ra = { nome: tr('Aluguel · ', 'Rent · ', 'Alquiler · ') + nome, valor: al.valor, dia: al.dia || 10, regra: 'dia', grupo: 'RENDA', sub: 'Aluguel', fluxo: 'entrada', estadoPadrao: 'pendente', origem: 'bem', bemRef: x.id };
        if (aant.recId && Recorrente.achar(aant.recId)) { Recorrente.atualizar(aant.recId, ra); al.recId = aant.recId; } else al.recId = Recorrente.add(ra).id;
        x.aluguel = al;
      } else delete x.aluguel;
      return x;
    },
    lerForm: function () {
      var tipo = val('bnTipo'), donos = [].map.call(document.querySelectorAll('.bn-dono:checked'), function (c) { return c.value; });
      var d = { tipo: tipo, nome: val('bnNome').trim(), inst: val('bnInst').trim(), valor: num(val('bnValor')), data: val('bnData'), obs: val('bnObs').trim(), donos: donos };
      if (tipo === 'imovel') {
        d.uso = val('bnUso') || 'moro'; d.compra = num(val('bnCompra'));
        if (d.uso === 'planta') { var c = num(val('bnContrato')), pg = num(val('bnPago')) || 0; d.planta = { contrato: c, pago: pg, aPagar: c ? Math.max(0, n2(c - pg)) : null, chaves: val('bnChaves') }; }
        if (d.uso === 'alugado') d.aluguel = { valor: num(val('bnAluguel')), dia: Math.min(31, Math.max(1, parseInt(val('bnAluguelDia'), 10) || 10)) };
      }
      if (tipo === 'carro') { d.compra = num(val('bnCompra')); d.carro = { marca: val('bnMarca').trim(), modelo: val('bnModelo').trim(), ano: parseInt(val('bnAno'), 10) || '' }; }
      if ((tipo === 'imovel' || tipo === 'carro') && marcado('bnFinanciado')) d.fin = { banco: val('bnFinBanco').trim(), saldo: num(val('bnFinSaldo')) || 0, parcela: num(val('bnFinParcela')) || 0, dia: Math.min(31, Math.max(1, parseInt(val('bnFinDia'), 10) || 10)) };
      return d;
    }
  };

  MoneyModulos.registrar({
    id: 'bens',
    versao: '1.0.0',
    acoes: {
      'bens-novo': function () { API.abrir(); },
      'bens-tipo': function (el) { formulario(el.dataset.v, null); },
      'bens-voltar': function () { passo1(); },
      'bens-salvar': async function () {
        var d = API.lerForm(), id = val('bnId'), x;
        if (d.tipo === 'carro' && !d.nome && !d.carro.marca && !d.carro.modelo) { toast(tr('Diga a marca e o modelo (ou um apelido).', 'Enter the make and model (or a nickname).', 'Indica la marca y el modelo (o un apodo).'), 'err'); return; }
        try { x = API.salvar(d, id); } catch (e) { toast(e.message, 'err'); return; }
        var docs = pendentes; pendentes = null;
        if (docs && docs.length && window.ArquivosFamilia) for (var i = 0; i < docs.length; i++) {
          try { await ArquivosFamilia.guardar({ nome: docs[i].name || 'documento', tipo: d.tipo === 'carro' ? 'veiculo' : 'imovel', ano: Number(String(x.data || hoje()).slice(0, 4)), ligado: x.id, mime: docs[i].type || 'application/pdf', soAqui: true }, new Uint8Array(await docs[i].arrayBuffer())); } catch (e) { /* o bem fica guardado mesmo sem o arquivo */ }
        }
        Store.salvar(); fechar('genModal'); render();
        toast(tr('Guardado: ', 'Saved: ', 'Guardado: ') + x.nome + (x.fin ? tr(' (com a dívida e a parcela)', ' (with the debt and instalment)', ' (con la deuda y la cuota)') : '') + (x.aluguel ? tr(' (aluguel na Renda)', ' (rent in Income)', ' (alquiler en Ingresos)') : ''));
      },
      'bens-excluir': function (el) {
        var id = el.dataset.id, x = PatrimonioIliquido.lista().find(function (y) { return y.id === id; }); if (!x) return;
        ST.patrimonio_iliquido = PatrimonioIliquido.lista().filter(function (y) { return y.id !== id; });
        Store.salvar(); fechar('genModal'); render();
        toast(tr('Excluído. A dívida e as contas fixas ligadas continuam (apague lá se quiser).', 'Deleted. The linked debt and recurring items stay (delete them there if you want).', 'Eliminado. La deuda y las cuentas fijas vinculadas siguen (bórralas allí si quieres).'));
      }
    }
  });
  window.Bens = API;
})();
