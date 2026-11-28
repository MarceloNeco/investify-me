/* =====================================================================
   modulos/contas-auto.js — CONTA FIXA AUTOMÁTICA: o pagamento que se repete entra sozinho em Contas fixas (3.142)        1.0.0 · 28/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 28/Nov/2026: "o negócio tem que ser intuitivo; ficar cadastrando cria fricção"; o padrão é o app já fazer
   e a pessoa só corrige se estiver errado)
     · O mesmo recebedor com valor e dia parecidos em 2 meses seguidos (o detector de "Parece conta fixa" de modulos/contas-mes.js,
       com min: 2) vira conta fixa SOZINHO, sem pedir confirmação: valor = a média, dia = o de sempre, os pagamentos que já existem
       ficam ligados (recorrenteId) e aparecem como pagos nos meses deles (criadoEm = o 1º pagamento).
     · Dois pagamentos do mesmo recebedor com faixas de valor e dia diferentes viram DUAS contas (ex.: a mensalidade da escola por volta
       do dia 10 e o período ampliado no dia 25), com o dia no nome ("… · dia 25") para distinguir.
     · Fica de fora o que o detector já deixa de fora: gasto do dia a dia (mercado, posto, transporte…), quem aparece mais de 2× por mês,
       conta anual, imposto e custo da empresa (esses continuam como sugestão em "Precisa da sua atenção"), e quem vê só a casa (o
       aparelho dela não cria nada).
     · Na lista, o selinho "✨ detectada automaticamente"; ao tocar: [Não é conta fixa] (tira a conta, desliga os pagamentos e não
       sugere de novo: ST.config.cfRecusadas) e [Editar] (o cadastro de sempre). O aviso antes do vencimento (📥) vale para ela como
       para qualquer conta fixa.
     · Quando roda: ao abrir o app e quando chega lançamento novo (evento gasto.novo, junta numa só passada).
   API (window.ContasAuto)
     detectar() → contas criadas · abrir(id) · naoE(id)
   DADOS
     recorrente: auto: true, autoChave (a chave do detector), autoEm
     ST.config.contasAuto === false → não cria sozinho (volta só a sugestão "Parece conta fixa"); sem botão: o padrão é criar. Os testes do
     fluxo de sugestão (teste-contas-mes, teste-conta-fixa-*, teste-inbox…) usam para testar aquele fluxo isolado.
   PONTOS QUE USA
     ouvir gasto.novo · ações ca-*
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function cfg() { return (ST.config = ST.config || {}); }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  var espera = null;
  /* o pagamento de cada mês fica ligado: no lançamento (recorrenteId) e no registro do mês (Pagamento.conciliar), para a conta aparecer
     paga em todo o app (Contas fixas, "vencimentos sem marcação", previsto) */
  function ocMes(r, data) { var m = String(data).slice(0, 7); return (Recorrente.ocorrencias(m + '-01', m + '-31') || []).filter(function (o) { return o.r.id === r.id; })[0] || null; }
  function ligar(r, id) {
    var g = Gasto.todos().filter(function (x) { return x.id === id; })[0]; if (!g) return;
    if (Gasto.atualizar) Gasto.atualizar(id, { recorrenteId: r.id });
    var o = ocMes(r, g.data); if (o && typeof Pagamento !== 'undefined') Pagamento.conciliar(r.id, o.data, id, Number(g.valor) || 0);
  }

  var API = {
    detectar: function () {
      if (typeof ST === 'undefined' || !ST || casa() || !window.ContasMes || typeof Recorrente === 'undefined' || cfg().contasAuto === false) return [];
      var novas = [];
      var lista = ContasMes.sugestoes({ min: 2 }).filter(function (x) { return x.tipo === 'mensal' && !x.pj && (x.ids || []).length >= 2; });
      /* o mesmo recebedor em mais de uma conta (ex.: mensalidade e período ampliado): o dia no nome, para distinguir */
      var mesmo = function (x) { return lista.filter(function (y) { return y.nome === x.nome; }).length + Recorrente.todos().filter(function (r) { return r.auto && String(r.nome).indexOf(x.nome) === 0; }).length > 1; };
      lista.forEach(function (x) {
        var r = Recorrente.add({ nome: mesmo(x) ? x.nome + ' · ' + tr('dia ', 'day ', 'día ') + x.dia : x.nome, valor: x.valor, grupo: x.grupo, sub: x.sub, dia: x.dia, regra: 'dia', pagador: x.quem || '',
          varia: Math.abs((x.ultimo || x.valor) - x.valor) > x.valor * 0.02, auto: true, autoChave: x.chave, autoEm: new Date().toISOString(),
          criadoEm: String(x.de || '').slice(0, 10) + 'T00:00:00',
          obs: tr('Detectada automaticamente: o mesmo recebedor se repete todo mês.', 'Detected automatically: the same payee repeats every month.', 'Detectada automáticamente: el mismo destinatario se repite cada mes.') });
        (x.ids || []).forEach(function (id) { ligar(r, id); });
        novas.push(r);
      });
      if (novas.length) { if (typeof Store !== 'undefined') Store.salvar(); }
      return novas;
    },
    /* tocar na conta detectada: "Não é conta fixa" e "Editar" */
    abrir: function (id) {
      var r = Recorrente.achar(id); if (!r) return;
      var n = Gasto.todos().filter(function (g) { return g.recorrenteId === id; }).length;
      $('#genTitle').textContent = '✨ ' + r.nome;
      $('#genBody').innerHTML = Verter.html('<p class="small">' + esc(tr('Detectada automaticamente: o mesmo recebedor se repete todo mês (', 'Detected automatically: the same payee repeats every month (', 'Detectada automáticamente: el mismo destinatario se repite cada mes (') +
          fmt(r.valor) + tr(', dia ~', ', day ~', ', día ~') + r.dia + (n ? tr(', ' + n + ' pagamentos ligados', ', ' + n + ' linked payments', ', ' + n + ' pagos vinculados') : '') + ').') + '</p>' +
        '<div class="f-actions ca-acoes"><button class="btn" data-acao="ca-nao" data-id="' + esc(id) + '">' + esc(tr('Não é conta fixa', 'Not a fixed bill', 'No es una cuenta fija')) + '</button>' +
        '<button class="btn primary" data-acao="ca-editar" data-id="' + esc(id) + '">' + esc(tr('Editar', 'Edit', 'Editar')) + '</button></div>');
      abrir('genModal');
    },
    /* tira a conta, desliga os pagamentos e não sugere de novo */
    naoE: function (id) {
      var r = Recorrente.achar(id); if (!r) return false;
      Gasto.todos().forEach(function (g) { if (g.recorrenteId === id && Gasto.atualizar) Gasto.atualizar(g.id, { recorrenteId: undefined }); });
      if (typeof Pagamento !== 'undefined') ST.pagamentos = Pagamento.todos().filter(function (pg) { return pg.rid !== id; });
      ST.recorrentes = Recorrente.todos().filter(function (x) { return x.id !== id; });
      if (r.autoChave) { var c = cfg(); (c.cfRecusadas = c.cfRecusadas || {})[r.autoChave] = 1; }
      return true;
    }
  };
  function rodar() { try { if (API.detectar().length && typeof render === 'function') render(); } catch (e) { console.warn('contas-auto', e); } }

  MoneyModulos.registrar({
    id: 'contas-auto', versao: '1.0.0',
    iniciar: function () { setTimeout(rodar, 0); },
    ouvir: { 'gasto.novo': function () { clearTimeout(espera); espera = setTimeout(rodar, 400); } },
    acoes: {
      'ca-abrir': function (el) { API.abrir(el.dataset.id); },
      'ca-editar': function (el) { fechar('genModal'); if (typeof abrirRecorrente === 'function') abrirRecorrente(el.dataset.id); },
      'ca-nao': function (el) {
        var r = Recorrente.achar(el.dataset.id); if (!r || !API.naoE(el.dataset.id)) return;
        Store.salvar(); fechar('genModal'); render();
        toast(r.nome + tr(' não é mais conta fixa e não será sugerida de novo.', ' is no longer a fixed bill and will not be suggested again.', ' ya no es una cuenta fija y no se sugerirá de nuevo.'));
      }
    }
  });
  window.ContasAuto = API;
})();
