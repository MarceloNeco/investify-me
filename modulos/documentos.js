/* =====================================================================
   modulos/documentos.js — "Documentos que o app pede" (3.74)        1.1.0 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 13/Nov/2026)
     Uma lista de pedidos periódicos de documento. Cada pedido: nome, para que serve, de quanto em quanto tempo
     (mensal no dia D / anual no mês M), passo a passo simples, o importador que abre o arquivo e o último recebido.
     Quando o ciclo vence, entra em "Precisa da sua atenção" (Painel) e no 📥; abre um passo a passo com o botão de
     subir o arquivo, que vai direto para o importador certo. Some quando o arquivo chega (o app vê o dado importado).
     Pode adiar 7 dias. O botão "Copiar o pedido para o Claude in Chrome" copia um prompt GENÉRICO, sem números pessoais.
     Os pedidos nascem só quando existe um cartão Porto ou uma dívida de consórcio Porto (e, 1.1.0, o extrato do BS2 quando há conta BS2 da PJ no Cofre). Visão da casa não vê.
   API (window.DocsPedidos)
     pedidos() → [{id, nome, para, periodo, passos, importador, cicloAtual, venceEm, recebido, adiadoAte}]
     atencao() → os que estão vencidos, não recebidos e não adiados · PROMPT (o texto genérico do Claude in Chrome)
   DADOS
     ST.config.docsAdiados = {idCiclo: 'AAAA-MM-DD'} (adiar) · ST.config.docsFeitos = {idCiclo: 'AAAA-MM-DD'} (sem importador)
   PONTOS QUE USA
     budget.atencao · inbox.itens · ações doc-*
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function hoje() { return API._hoje || hojeISO(); }
  function cfg() { return (ST.config = ST.config || {}); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function ehPorto(t) { return /porto/.test(N(t)); }
  function temCartaoPorto() { return (ST.cartoes || []).some(function (c) { return ehPorto(c.apelido) || ehPorto(c.banco) || ehPorto(c.titular); }); }
  function consorciosPorto() { return (ST.dividas || []).filter(function (d) { return d.tipo === 'consorcio' && ehPorto(d.instituicao + ' ' + d.nome); }); }
  function cicloMes() { return hoje().slice(0, 7); }
  function diaNoMes(mes, d) { var ult = new Date(+mes.slice(0, 4), +mes.slice(5, 7), 0).getDate(); return mes + '-' + ('0' + Math.min(d, ult)).slice(-2); }

  var PROMPT = 'Estou logado na área do cliente da Porto. Só leitura: não pague, não contrate, não altere nada; se pedir senha ou código, pare e me chame. ' +
    '1) Cartão: abra Faturas, baixe a última fatura fechada em XLS. ' +
    '2) Consórcio: em Meus Consórcios, abra o Extrato de cotas de cada cota e monte um CSV com as colunas grupo/cota, tipo, situacao, pct_pago, pct_falta, saldo, parcela (decimal com ponto), e salve como \'Porto - cotas - AAAA-MM-DD.csv\'. ' +
    '3) Diga os nomes dos arquivos salvos.';

  /* os pedidos que valem hoje (nascem com cartão ou consórcio Porto) */
  function defs() {
    var out = [];
    if (temCartaoPorto()) out.push({
      id: 'porto-fatura', nome: tr('Fatura do cartão Porto (XLSX)', 'Porto card bill (XLSX)'), para: tr('conferir e baixar o saldo', 'check and record the balance'),
      periodo: { tipo: 'mensal', dia: 1 }, importador: 'fatura',
      passos: [tr('Entre em Minha Porto (cliente.portoseguro.com.br).', 'Open Minha Porto (cliente.portoseguro.com.br).'), tr('Abra o cartão → Faturas → o mês.', 'Open the card → Bills → the month.'), tr('Baixe em XLS.', 'Download as XLS.')],
      recebido: function (mes) { return (ST.faturas_cartao || []).some(function (f) { return String(f.venc || '').slice(0, 7) === mes; }); }
    });
    if (consorciosPorto().length) out.push({
      id: 'porto-cotas', nome: tr('Saldo das cotas do consórcio', 'Consortium quota balances'), para: tr('atualizar o % pago e o saldo', 'update the % paid and the balance'),
      periodo: { tipo: 'mensal', dia: 23 }, importador: 'cotas',
      passos: [tr('Minha Porto → Meus Consórcios → Mais detalhes.', 'Minha Porto → My Consortiums → More details.'), tr('Em cada cota, Extrato de cotas: anote o % pago e o saldo.', 'In each quota, Quota statement: note the % paid and the balance.'), tr('Ou use o Claude in Chrome (botão abaixo).', 'Or use Claude in Chrome (button below).')],
      recebido: function (mes) { return consorciosPorto().some(function (d) { return (d.historico || []).some(function (h) { return h.fonte === 'csv' && String(h.data).slice(0, 7) === mes; }); }); }
    });
    if (temCartaoPorto() || consorciosPorto().length) out.push({
      id: 'porto-ir', nome: tr('Informe de IR da Porto (consórcio)', 'Porto tax statement (consortium)'), para: tr('guardar para a declaração', 'keep for the tax return'),
      periodo: { tipo: 'anual', mes: 2 }, importador: '',
      passos: [tr('Só no App Porto (celular): Documentos → Informe de IR.', 'Only in the Porto app (phone): Documents → Tax statement.'), tr('Guarde o PDF. Quando for declarar, suba no FiscalONE.', 'Keep the PDF. Upload it in FiscalONE at tax time.')],
      recebido: function () { return false; }
    });
    /* 1.1.0 (3.81): o extrato mensal das contas BS2 da PJ (modulos/bs2-extrato.js) */
    if (contasBs2().length) out.push({
      id: 'bs2-extrato', nome: tr('Extrato do BS2 das contas da PJ (CSV e OFX)', 'BS2 statement of the company accounts (CSV and OFX)'), para: tr('conferir o que o robô trouxe e completar o que faltou', 'check what the robot brought and fill the gaps'),
      periodo: { tipo: 'mensal', dia: 5 }, importador: 'bs2',
      passos: [tr('Entre no internet banking do BS2 Empresas (bs2.com) com o seu acesso.', 'Log in to BS2 Empresas internet banking (bs2.com).'),
        tr('Conta em reais: Extrato → escolha o mês anterior → Exportar → CSV.', 'Account in reais: Statement → pick last month → Export → CSV.'),
        tr('Conta internacional (US$): Conta global → Extrato → mês anterior → Exportar → OFX.', 'International account (US$): Global account → Statement → last month → Export → OFX.'),
        tr('Volte aqui e toque em "Subir o arquivo" (pode escolher os dois de uma vez).', 'Come back and tap "Upload the file" (you can pick both at once).')],
      recebido: function (mes) { var ant = mesAnterior(mes); return (ST.gastos || []).some(function (g) { return String(g.id || '').indexOf('rb_bs2') === 0 && String(g.data).slice(0, 7) === ant; }); }
    });
    return out;
  }
  function contasBs2() { return (Array.isArray(ST.empresas) ? ST.empresas : []).filter(function (e) { return (e.contas || []).some(function (c) { return /bs2/i.test((c.rotuloRobo || '') + ' ' + (c.banco || '') + ' ' + (c.bancoNome || '')); }) || (e.contasRobo || []).some(function (c) { return /bs2/i.test(c); }); }); }
  function mesAnterior(mes) { var a = +mes.slice(0, 4), m = +mes.slice(5, 7) - 1; if (m < 1) { m = 12; a--; } return a + '-' + ('0' + m).slice(-2); }

  var API = {
    _hoje: null, PROMPT: PROMPT,
    pedidos: function () {
      if (casa()) return [];
      var h = hoje();
      return defs().map(function (p) {
        var ciclo, vence;
        if (p.periodo.tipo === 'anual') { var ano = h.slice(0, 4); ciclo = ano; vence = diaNoMes(ano + '-' + ('0' + p.periodo.mes).slice(-2), 1); if (vence > h) { ano = String(+ano - 1); ciclo = ano; vence = diaNoMes(ano + '-' + ('0' + p.periodo.mes).slice(-2), 1); } }
        else { ciclo = cicloMes(); vence = diaNoMes(ciclo, p.periodo.dia); }
        var idc = p.id + '|' + ciclo, recebido = p.recebido(ciclo);
        return { id: p.id, idCiclo: idc, nome: p.nome, para: p.para, periodo: p.periodo, passos: p.passos, importador: p.importador,
          cicloAtual: ciclo, venceEm: vence, recebido: recebido, adiadoAte: (cfg().docsAdiados || {})[idc] || '',
          feito: !!(cfg().docsFeitos || {})[idc] };
      });
    },
    atencao: function () {
      var h = hoje();
      return API.pedidos().filter(function (p) {
        if (p.recebido || p.feito || p.venceEm > h || (p.adiadoAte && p.adiadoAte > h)) return false;
        if (p.periodo.tipo === 'anual') { var fim = new Date(p.venceEm + 'T12:00:00'); fim.setDate(fim.getDate() + 60); if (h > fim.toISOString().slice(0, 10)) return false; }   /* anual: só na janela do mês */
        return true;
      });
    }
  };

  function passoHtml(p) {
    var h = '<div class="doc-passos"><b class="small">' + esc(p.nome) + '</b><p class="tiny muted">' + esc(p.para) + '</p><ol class="small">' +
      p.passos.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap">';
    if (p.importador) h += '<button type="button" class="btn sm primary" data-acao="doc-subir" data-imp="' + esc(p.importador) + '" data-id="' + esc(p.idCiclo) + '">⬆️ ' + esc(tr('Subir o arquivo', 'Upload the file')) + '</button>';
    else h += '<button type="button" class="btn sm primary" data-acao="doc-feito" data-id="' + esc(p.idCiclo) + '">✓ ' + esc(tr('Já guardei', 'Got it')) + '</button>';
    if (p.id === 'porto-cotas' || p.id === 'porto-fatura') h += '<button type="button" class="btn sm" data-acao="doc-copiar">📋 ' + esc(tr('Copiar o pedido para o Claude in Chrome', 'Copy the request for Claude in Chrome')) + '</button>';
    h += '<button type="button" class="btn sm" data-acao="doc-adiar" data-id="' + esc(p.idCiclo) + '">' + esc(tr('Lembrar em 7 dias', 'Remind in 7 days')) + '</button></div></div>';
    return h;
  }
  function cartaoAtencao() {
    var a = API.atencao(); if (!a.length) return '';
    return '<div class="card doc-atencao"><div class="card-head"><h3>' + esc(tr('Precisa da sua atenção', 'Needs your attention')) + '</h3></div>' + a.map(function (p) {
      return '<div class="doc-ped"><p class="small" style="margin:0 0 6px">📄 ' + esc(tr('Suba a ', 'Upload the ') + p.nome + tr(' de ', ' for ') + mesNome(p)) + '</p>' + passoHtml(p) + '</div>';
    }).join('') + '</div>';
  }
  function mesNome(p) { return p.periodo.tipo === 'anual' ? p.cicloAtual : new Date(p.cicloAtual + '-15T12:00:00').toLocaleDateString(pt() ? 'pt-BR' : 'en-US', { month: 'long', year: 'numeric' }); }
  function adiar(idc) { var c = cfg(); c.docsAdiados = c.docsAdiados || {}; var x = new Date(hoje() + 'T12:00:00'); x.setDate(x.getDate() + 7); c.docsAdiados[idc] = x.toISOString().slice(0, 10); }

  MoneyModulos.registrar({
    id: 'documentos', versao: '1.1.0',
    pontos: {
      'budget.atencao': cartaoAtencao,
      'inbox.grupos': function () {   /* 1.0.1 (3.76): no 📥, com o passo a passo e o botão de subir */
        var a = API.atencao(); if (!a.length) return [];
        return [{ id: 'docs', n: a.length, html: a.map(function (p) { return '<li class="inb-item doc-ped"><p class="small" style="margin:0 0 6px">📄 ' + esc(tr('Suba a ', 'Upload the ') + p.nome + tr(' de ', ' for ') + mesNome(p)) + '</p>' + passoHtml(p) + '</li>'; }).join('') }];
      },
      'inbox.itens': function () {
        return API.atencao().map(function (p) {
          return { tipo: 'atencao', ico: '📄', nome: tr('Documento a subir', 'Document to upload'), valor: 0, data: p.venceEm,
            sub: p.nome + tr(' de ', ' for ') + mesNome(p) + tr(' — no Painel', ' — on the Panel') };
        });
      }
    },
    acoes: {
      'doc-subir': function (el) {
        var imp = el.dataset.imp;
        if (typeof fechar === 'function') fechar('genModal');
        if (imp === 'bs2') { if (typeof abrirApp === 'function') abrirApp('tax'); if (typeof irPara === 'function') irPara('t-pj'); if (typeof render === 'function') render(); if (window.MoneyModulos) setTimeout(function () { var b = document.querySelector('[data-acao="bs2-importar"]'); if (b) b.click(); }, 120); return; }   /* 1.1.0 (3.81) */
        if (imp === 'apolice') { if (typeof abrirApp === 'function') abrirApp('budget'); if (typeof irPara === 'function') irPara('b-custos'); }
        else { if (typeof abrirApp === 'function') abrirApp('budget'); if (typeof irPara === 'function') irPara('b-painel'); }
        if (typeof render === 'function') render();
        setTimeout(function () { var id = imp === 'cotas' ? 'dvCsvArq' : imp === 'apolice' ? 'sgArq' : 'dvFatArq'; var inp = document.getElementById(id); if (inp) inp.click(); }, 120);
      },
      'doc-copiar': function () {
        var ok = function () { toast(tr('Pedido copiado. Cole no Claude in Chrome, logado na Porto.', 'Request copied. Paste it into Claude in Chrome, logged in to Porto.')); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(PROMPT).then(ok, ok); else ok();
      },
      'doc-adiar': function (el) { adiar(el.dataset.id); Store.salvar(); render(); toast(tr('Lembro de novo em 7 dias.', 'I will remind you again in 7 days.')); },
      'doc-feito': function (el) { var c = cfg(); c.docsFeitos = c.docsFeitos || {}; c.docsFeitos[el.dataset.id] = hoje(); Store.salvar(); render(); toast(tr('Guardado.', 'Done.')); }
    }
  });
  window.DocsPedidos = API;
})();
