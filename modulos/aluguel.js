/* =====================================================================
   modulos/aluguel.js — o aluguel que a família RECEBE pela imobiliária (QuintoAndar) (3.126)        1.0.0 · 26/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 26/Nov/2026; sem integração nova)
     O robô lê o demonstrativo do e-mail e manda um comprovante com a ficha {aluguel, iptu, taxa_administracao, valor (o líquido),
     competencia, previsto_ate, imovel} (modulos/comprovantes.js 1.3.0). É informação: não pede nada no 📥.
     · Liga ao crédito do banco (a descrição com GRPQA ou QUINTO ANDAR, o mesmo líquido até 1%, de 10 dias antes a 45 dias depois do fim
       da competência). No detalhe do crédito: "Aluguel R$ X · IPTU R$ Y · taxa de administração −R$ Z = líquido R$ L · competência MM/AAAA ·
       imóvel".
     · Vira RENDA PREVISTA recorrente no dia 12 (uma conta fixa de entrada por imóvel, id 'alug-<imóvel>'): grupo Renda › Aluguel, o líquido
       do último demonstrativo, até previsto_ate. Cada demonstrativo novo atualiza o valor. Se a pessoa apagar a conta fixa, o app não a cria
       de novo para o mesmo imóvel (ST.config.aluguelCriadas guarda as que o app já criou).
   API (window.Aluguel)  fichas() · doGasto(g) · garantirRenda() → n contas fixas criadas/atualizadas
   PONTOS QUE USA  lancamento.form · evento gasto.novo
   ===================================================================== */
(function () {
  'use strict';
  var DIA = 12;
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function num(v) { if (v == null || v === '') return null; if (typeof v === 'number') return isFinite(v) ? v : null; var t = String(v).trim(); if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); var n = Number(t); return isFinite(n) ? n : null; }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function mes(v) { var s = String(v || ''), a = /^(\d{4})-(\d{2})/.exec(s), b = /^(\d{1,2})\/(\d{4})$/.exec(s); return a ? a[1] + '-' + a[2] : b ? b[2] + '-' + ('0' + b[1]).slice(-2) : ''; }
  function iso(v) { var s = String(v || ''), m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s); return m ? m[3] + '-' + m[2] + '-' + m[1] : /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : (mes(s) ? mes(s) + '-28' : ''); }
  function somaMes(m, k) { var y = +m.slice(0, 4), mm = +m.slice(5, 7) + k; while (mm > 12) { mm -= 12; y++; } while (mm < 1) { mm += 12; y--; } return y + '-' + ('0' + mm).slice(-2); }
  function dias(a, b) { return Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000); }
  function cfg() { return (ST.config = ST.config || {}); }

  var API = {
    fichas: function () {
      return (window.Comprovantes ? Comprovantes.lista() : []).filter(function (x) { var f = x.ficha; return f && f.aluguel != null && f.valor != null && x.estado !== 'dispensado'; }).map(function (x) {
        var f = x.ficha;
        return { id: x.id, aluguel: num(f.aluguel), iptu: num(f.iptu), taxa: num(f.taxa_administracao), liquido: num(f.valor), competencia: mes(f.competencia), ate: iso(f.previsto_ate), imovel: String(f.imovel || '').slice(0, 80), x: x };
      }).sort(function (a, b) { return a.competencia < b.competencia ? -1 : 1; });
    },
    /* o crédito do banco que é este aluguel */
    doGasto: function (g) {
      if (!g || !(g.fluxo === 'entrada' || g.grupo === 'RENDA')) return null;
      var t = N([g.desc, g.descRobo, g.contraparte && g.contraparte.nome].join(' '));
      if (!/grpqa|quinto ?andar|quintoandar/.test(t)) return null;
      var v = Math.abs(Number(g.valor) || 0);
      return API.fichas().filter(function (a) {
        if (!(a.liquido > 0) || Math.abs(a.liquido - v) > Math.max(0.5, a.liquido * 0.01)) return false;
        if (!a.competencia || !g.data) return true;
        var fim = a.competencia + '-28', d = dias(g.data, fim); return d >= -10 && d <= 45;
      }).pop() || null;
    },
    garantirRenda: function () {
      if (typeof Recorrente === 'undefined') return 0;
      var por = {}, n = 0, criadas = (cfg().aluguelCriadas = cfg().aluguelCriadas || {});
      API.fichas().forEach(function (a) { var k = 'alug-' + (N(a.imovel).replace(/ /g, '-').slice(0, 40) || 'imovel'); por[k] = a; });
      Object.keys(por).forEach(function (id) {
        var a = por[id], r = Recorrente.achar(id); if (!(a.liquido > 0) || (!r && criadas[id])) return;   /* a pessoa apagou: não cria de novo */
        var desde = a.competencia ? somaMes(a.competencia, 1) + '-' + ('0' + DIA).slice(-2) : '';
        var dados = { nome: tr('Aluguel', 'Rent', 'Alquiler') + (a.imovel ? ' · ' + a.imovel : ''), valor: a.liquido, dia: DIA, regra: 'dia', grupo: 'RENDA', sub: 'Aluguel', fluxo: 'entrada', estadoPadrao: 'pendente', origem: 'aluguel' };
        if (a.ate) dados.ate = a.ate;
        if (!r) { Recorrente.add(Object.assign({ id: id, desde: desde }, dados)); criadas[id] = 1; n++; }
        else if (r.origem === 'aluguel' && (r.valor !== a.liquido || (a.ate && r.ate !== a.ate))) { Recorrente.atualizar(id, { valor: a.liquido, ate: a.ate || r.ate }); n++; }
      });
      return n;
    },
    texto: function (a) {
      return [a.aluguel != null ? tr('Aluguel ', 'Rent ', 'Alquiler ') + fmt(a.aluguel) : '', a.iptu ? 'IPTU ' + fmt(a.iptu) : '', a.taxa ? tr('taxa de administração −', 'management fee −', 'comisión de administración −') + fmt(a.taxa) : '']
        .filter(Boolean).join(' · ') + ' = ' + tr('líquido ', 'net ', 'neto ') + fmt(a.liquido) + (a.competencia ? ' · ' + tr('competência ', 'period ', 'periodo ') + a.competencia.slice(5) + '/' + a.competencia.slice(0, 4) : '') + (a.imovel ? ' · ' + a.imovel : '');
    }
  };

  MoneyModulos.registrar({
    id: 'aluguel', versao: '1.0.0', colecoes: [], telas: {}, acoes: {},
    pontos: { 'lancamento.form': function (ctx) { var a = API.doGasto(ctx && ctx.g); return a ? '<div class="bloco-regra al-bloco"><span class="bf-tit">🏠 ' + esc(tr('Aluguel recebido', 'Rent received', 'Alquiler recibido')) + '</span><div class="small">' + esc(API.texto(a)) + '</div></div>' : ''; } },
    ouvir: {},
    iniciar: function () { setTimeout(function () { try { if (API.garantirRenda()) { Store.salvar(); if (typeof render === 'function') render(); } } catch (e) { /* sem dados ainda */ } }, 0); }
  });
  window.Aluguel = API;
})();
