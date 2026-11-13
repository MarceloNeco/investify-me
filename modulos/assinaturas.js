/* =====================================================================
   modulos/assinaturas.js — assinaturas: anual × mensal e renovação (N29 b)   1.1.1 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     Compromisso que é assinatura (streaming, app, clube…) ganha: plano mensal ou anual pré-pago, data
     de renovação, aviso antes de renovar (7 dias no mensal, 30 no anual) e a comparação "anual × mensal"
     quando os dois preços são conhecidos (ex.: YouTube anual R$ 269 × mensal R$ 26,90 = R$ 322,80/ano).
     Depois da data, a renovação seguinte é calculada sozinha (mais 1 mês ou 1 ano).
     · 1.1.0 (3.65): "Não vou renovar": o compromisso termina na data marcada (campo "até"); depois dela, nada de vencimento,
       de "Futuro" nem de "atrasado"; aviso "termina em …" um mês antes. Assinatura "já paga até" (sem cobrança mensal: ex.
       um hub de IA pago até maio). Cobrança que chega DEPOIS do fim de uma assinatura marcada "não renovar": aviso
       "<nome> cobrou de novo depois do fim que você marcou — cancelou mesmo?".
   API (window.Assinaturas)
     de(rid) · gravar(rid, dados) · proxima(reg, hoje?) → 'AAAA-MM-DD'
     comparar(precoMensal, precoAnual) → {anoMensal, anual, economia, pct, melhor: 'anual'|'mensal'|''}
     pareceAssinatura(r) → true/false (categoria ou nome conhecido)
     vencendo(hoje?) → [{reg, r, data, dias}]
   DADOS
     Store.estado.assinaturas = [{id: <id do compromisso>, plano: 'mensal'|'anual', renova, precoMensal, precoAnual, naoRenovar, fim}
       | {id: 'pp…', prepago: true, nome, grupo, sub, pagoAte, valorPago, naoRenovar: true}]   (+ alertas: [{gid, data, valor, visto}])
   PONTOS QUE USA
     compromisso.detalhes · evento compromisso.salvo · custos.topo · fita.budget · recorrente.linha
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'assinaturas';
  var RX = /assinatura|streaming|netflix|spotify|youtube|disney|prime|\bmax\b|hbo|globoplay|deezer|apple|icloud|google one|paramount|chatgpt|claude|microsoft 365|office 365|dropbox|kindle|audible|clube/i;
  function pt() { return I18n.atual === 'pt'; }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function soma(iso, plano) { return plano === 'anual' ? (Number(iso.slice(0, 4)) + 1) + iso.slice(4).replace('-02-29', '-02-28')
      : (window.Agendamentos ? Agendamentos.maisMeses(iso, 1) : iso); }

  var API = {
    de: function (rid) { return lista().find(function (x) { return x.id === rid; }) || null; },
    pareceAssinatura: function (r) { return !!r && RX.test([r.sub, r.nome].join(' ')); },
    gravar: function (rid, d) {
      var x = API.de(rid);
      if (!d) { ST[COL] = lista().filter(function (y) { return y.id !== rid; }); return null; }
      if (!x) { x = { id: rid }; lista().push(x); }
      x.plano = d.plano === 'anual' ? 'anual' : 'mensal';
      x.renova = /^\d{4}-\d{2}-\d{2}$/.test(String(d.renova || '')) ? d.renova : '';
      x.precoMensal = n2(d.precoMensal); x.precoAnual = n2(d.precoAnual);
      x.naoRenovar = !!d.naoRenovar; x.fim = x.naoRenovar && /^\d{4}-\d{2}-\d{2}$/.test(String(d.fim || '')) ? d.fim : '';
      if (!x.naoRenovar) { delete x.naoRenovar; delete x.fim; }
      return x;
    },
    /* "já paga até": sem cobrança mensal, só o aviso de que termina */
    prepaga: function (d) {
      var nome = String(d.nome || '').trim(), ate = String(d.pagoAte || '');
      if (!nome || !/^\d{4}-\d{2}-\d{2}$/.test(ate)) throw new Error(pt() ? 'Diga o nome e até quando está paga.' : 'Give the name and the paid-until date.');
      var x = { id: 'pp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), prepago: true, nome: nome.slice(0, 60), grupo: d.grupo || 'PESSOAL', sub: String(d.sub || 'IA e software').slice(0, 60),
        pagoAte: ate, valorPago: n2(d.valorPago), naoRenovar: true };
      lista().push(x); return x;
    },
    nomeDe: function (reg) { var r = reg.prepago ? null : Recorrente.achar(reg.id); return reg.prepago ? reg.nome : (r ? r.nome : ''); },
    fimDe: function (reg) { if (reg.prepago) return reg.pagoAte; var r = Recorrente.achar(reg.id); return reg.fim || (reg.naoRenovar && r && r.ate) || ''; },
    /* uma cobrança depois do fim de uma assinatura "não renovar" */
    conferirCobranca: function (g) {
      if (!g || g.fluxo === 'entrada' || !g.data || !g.desc) return null;
      var w = window.Profissionais ? Profissionais.norm(g.desc) : String(g.desc).toLowerCase().split(/\W+/);
      var achou = lista().find(function (reg) {
        if (!reg.naoRenovar) return false;
        var fim = API.fimDe(reg); if (!fim || g.data <= fim) return false;
        var nome = API.nomeDe(reg); if (!nome) return false;
        var n = window.Profissionais ? Profissionais.parecido(w, Profissionais.norm(nome)) : 0;
        return n >= 0.5 || (window.Origem && Origem.chaveDesc(g.desc).indexOf(Origem.chaveDesc(nome)) >= 0);
      });
      if (!achou) return null;
      achou.alertas = achou.alertas || [];
      if (!achou.alertas.some(function (a) { return a.gid === g.id; })) achou.alertas.push({ gid: g.id, data: g.data, valor: g.valor });
      return achou;
    },
    alertas: function () {
      var out = [];
      lista().forEach(function (reg) { (reg.alertas || []).forEach(function (a) { if (!a.visto) out.push({ reg: reg, a: a }); }); });
      return out;
    },
    proxima: function (reg, hoje) {
      hoje = String(hoje || hojeISO()).slice(0, 10);
      var d = reg.renova; if (!d) return '';
      for (var i = 0; i < 600 && d < hoje; i++) d = soma(d, reg.plano);
      return d;
    },
    comparar: function (m, a) {
      m = Number(m) || 0; a = Number(a) || 0;
      if (!(m > 0 && a > 0)) return null;
      var anoM = n2(m * 12), eco = n2(Math.abs(anoM - a));
      return { anoMensal: anoM, anual: a, economia: eco, pct: Math.round(eco / Math.max(anoM, a) * 100), melhor: anoM > a ? 'anual' : anoM < a ? 'mensal' : '' };
    },
    vencendo: function (hoje) {
      hoje = String(hoje || hojeISO()).slice(0, 10);
      return lista().map(function (reg) {
        if (reg.naoRenovar) {   /* 1.1.0: não renova → só "termina em …", um mês antes */
          var fim = API.fimDe(reg); if (!fim || fim < hoje) return null;
          var df = Math.round((new Date(fim + 'T12:00:00') - new Date(hoje + 'T12:00:00')) / 86400000);
          return df <= 31 ? { reg: reg, r: { nome: API.nomeDe(reg) }, data: fim, dias: df, termina: true } : null;
        }
        var r = Recorrente.achar(reg.id); if (!r || r.ativo === false) return null;
        var d = API.proxima(reg, hoje); if (!d) return null;
        var dias = Math.round((new Date(d + 'T12:00:00') - new Date(hoje + 'T12:00:00')) / 86400000);
        return dias <= (reg.plano === 'anual' ? 30 : 7) ? { reg: reg, r: r, data: d, dias: dias } : null;
      }).filter(Boolean).sort(function (a, b) { return a.data.localeCompare(b.data); });
    }
  };
  function textoComparacao(c) {
    if (!c) return '';
    return pt() ? 'Anual ' + fmt(c.anual) + ' × mensal ' + fmt(c.anoMensal / 12) + ' = ' + fmt(c.anoMensal) + '/ano' + (c.melhor ? ': o ' + c.melhor + ' sai ' + fmt(c.economia) + ' (' + c.pct + '%) mais barato.' : ': dá no mesmo.')
                : 'Yearly ' + fmt(c.anual) + ' × monthly ' + fmt(c.anoMensal / 12) + ' = ' + fmt(c.anoMensal) + '/yr' + (c.melhor ? ': ' + c.melhor + ' is ' + fmt(c.economia) + ' (' + c.pct + '%) cheaper.' : ': the same.');
  }
  function frase(v) {
    if (v.termina) return v.r.nome + (pt() ? ' termina em ' : ' ends on ') + I18n.data(v.data) + (pt() ? ' (você marcou que não vai renovar)' : ' (you marked it will not renew)');
    return (pt() ? 'Assinatura renova: ' : 'Subscription renews: ') + v.r.nome + ' (' + (v.reg.plano === 'anual' ? (pt() ? 'anual' : 'yearly') : (pt() ? 'mensal' : 'monthly')) + ') ' +
      (v.dias === 0 ? (pt() ? 'hoje' : 'today') : (pt() ? 'em ' : 'on ') + I18n.data(v.data));
  }

  MoneyModulos.registrar({
    id: 'assinaturas',
    versao: '1.1.1',
    colecoes: [COL],
    pontos: {
      'compromisso.detalhes': function (ctx) {
        var r = ctx.r || {}, x = r.id ? API.de(r.id) : null, liga = !!x || API.pareceAssinatura(r);
        x = x || { plano: 'mensal', renova: '', precoMensal: '', precoAnual: '' };
        return '<div class="bloco-regra as-box"><label class="linha-check"><input type="checkbox" id="asLiga"' + (liga ? ' checked' : '') + '> <b>' + (pt() ? 'É uma assinatura' : 'It is a subscription') + '</b></label>' +
          '<div id="asCampos"' + (liga ? '' : ' class="hidden"') + '><div class="grid g2">' +
            campo(pt() ? 'Plano' : 'Plan', '<select id="asPlano"><option value="mensal"' + (x.plano !== 'anual' ? ' selected' : '') + '>' + (pt() ? 'Mensal' : 'Monthly') + '</option><option value="anual"' + (x.plano === 'anual' ? ' selected' : '') + '>' + (pt() ? 'Anual (pago adiantado)' : 'Yearly (prepaid)') + '</option></select>') +
            campo(pt() ? 'Renova em' : 'Renews on', Cal.campo('asRenova', x.renova || '', { vazio: pt() ? 'não sei' : 'not sure' })) +
            campo(pt() ? 'Preço mensal (R$)' : 'Monthly price', '<input type="number" id="asMensal" min="0" step="0.01" inputmode="decimal" value="' + (x.precoMensal || '') + '">') +
            campo(pt() ? 'Preço anual (R$)' : 'Yearly price', '<input type="number" id="asAnual" min="0" step="0.01" inputmode="decimal" value="' + (x.precoAnual || '') + '">') +
          '</div><p class="small as-comp" id="asComp">' + esc(textoComparacao(API.comparar(x.precoMensal, x.precoAnual))) + '</p>' +
          '<label class="linha-check"><input type="checkbox" id="asNaoRenovar"' + (x.naoRenovar ? ' checked' : '') + '> ' + (pt() ? '<b>Não vou renovar</b>: termina em' : '<b>Will not renew</b>: ends on') + '</label>' +
          campo('', Cal.campo('asFim', x.fim || r.ate || '', { vazio: pt() ? 'escolha a data' : 'pick the date' })) + '</div></div>';
      },
      'custos.topo': function () {
        var v = API.vencendo(), al = API.alertas(), pp = lista().filter(function (x) { return x.prepago; });
        var h = '';
        al.forEach(function (x) {
          h += '<div class="aviso-box as-alerta"><b>⚠ ' + esc(API.nomeDe(x.reg) + (pt() ? ' cobrou de novo depois do fim que você marcou — cancelou mesmo?' : ' charged again after the end you set — did you really cancel?')) + '</b>' +
            '<div class="small">' + esc(I18n.data(x.a.data) + ' · ' + fmt(x.a.valor)) + ' <button class="linkinho" data-acao="as-alerta-ok" data-id="' + esc(x.reg.id) + '" data-gid="' + esc(x.a.gid) + '">' + (pt() ? 'ok, vi' : 'ok, seen') + '</button></div></div>';
        });
        if (v.length) h += '<div class="aviso-box as-aviso">' + v.map(function (x) { return '<div class="small">📺 ' + esc(frase(x)) + '</div>'; }).join('') + '</div>';
        if (pp.length) h += '<div class="row as-pp" style="gap:6px;flex-wrap:wrap;margin:0 0 12px">' + pp.map(function (x) {
          return '<span class="chip">📺 ' + esc(x.nome + (pt() ? ' · paga até ' : ' · paid until ') + I18n.data(x.pagoAte)) + ' <button class="linkinho" data-acao="as-pp-tirar" data-id="' + esc(x.id) + '" aria-label="' + (pt() ? 'tirar' : 'remove') + '">✕</button></span>';
        }).join('') + '</div>';   /* 1.1.1 (3.76): "+ Assinatura já paga" foi para o "+ Adicionar" de Contas fixas */
        return h;
      },
      'custos.adicionar': function () {
        return [{ ico: '📺', pt: 'Assinatura já paga', en: 'Prepaid subscription', dpt: 'Uma assinatura paga por um período inteiro (ex.: o ano): o app não cobra de novo até o fim.', den: 'A subscription paid for a whole period (e.g. the year): no new charge until it ends.', acao: 'as-pp-nova' }];
      },
      'fita.budget': function () {
        return API.alertas().map(function (x) { return { ico: '⚠', texto: API.nomeDe(x.reg) + (pt() ? ' cobrou de novo depois do fim que você marcou' : ' charged again after the end you set'), tom: 'down' }; })
          .concat(API.vencendo().map(function (x) { return { ico: '📺', texto: frase(x), tom: 'warn' }; }));
      },
      'recorrente.linha': function (ctx) {
        var x = ctx.r && ctx.r.id ? API.de(ctx.r.id) : null; if (!x) return '';
        var d = API.proxima(x);
        return '<div class="t-sub">📺 ' + esc((x.plano === 'anual' ? (pt() ? 'anual' : 'yearly') : (pt() ? 'mensal' : 'monthly')) + (d ? (pt() ? ' · renova ' : ' · renews ') + I18n.data(d) : '')) + '</div>';
      }
    },
    ouvir: {
      'compromisso.form': function () {
        var ck = document.getElementById('asLiga'); if (!ck) return;
        var cx = document.getElementById('asCampos');
        ck.addEventListener('change', function () { cx.classList.toggle('hidden', !ck.checked); });
        var at = function () { var c = API.comparar(document.getElementById('asMensal').value, document.getElementById('asAnual').value); document.getElementById('asComp').textContent = textoComparacao(c); };
        ['asMensal', 'asAnual'].forEach(function (id) { document.getElementById(id).addEventListener('input', at); });
      },
      'compromisso.salvo': function (d) {
        var ck = document.getElementById('asLiga'); if (!ck || !d || !d.id) return;
        var v = function (id) { return (document.getElementById(id) || {}).value || ''; };
        var nr = !!(document.getElementById('asNaoRenovar') || {}).checked, fim = v('asFim');
        API.gravar(d.id, ck.checked ? { plano: v('asPlano'), renova: v('asRenova'), precoMensal: v('asMensal'), precoAnual: v('asAnual'), naoRenovar: nr, fim: fim } : null);
        /* não renova: o compromisso termina na data (sem vencimento futuro, sem "Futuro", sem "atrasado" depois dela) */
        if (ck.checked && nr && /^\d{4}-\d{2}-\d{2}$/.test(fim)) { var r = Recorrente.achar(d.id); if (r) { r.ate = fim; Store.salvar(); } }
      },
      'gasto.novo': function (g) { if (API.conferirCobranca(g)) { try { toast(API.nomeDe(API.conferirCobranca(g)) + (pt() ? ' cobrou de novo depois do fim que você marcou — cancelou mesmo?' : ' charged again after the end you set — did you really cancel?'), 'warn'); } catch (e) {} } }
    },
    acoes: {
      'as-alerta-ok': function (el) { var x = API.de(el.dataset.id); (x && x.alertas || []).forEach(function (a) { if (a.gid === el.dataset.gid) a.visto = true; }); Store.salvar(); render(); },
      'as-pp-tirar': function (el) { ST[COL] = lista().filter(function (x) { return x.id !== el.dataset.id; }); Store.salvar(); render(); },
      'as-pp-nova': function () {
        document.getElementById('genTitle').textContent = pt() ? 'Assinatura já paga' : 'Prepaid subscription';
        document.getElementById('genBody').innerHTML = Verter.html('<p class="small muted">' + (pt() ? 'Pagou de uma vez e não vai renovar: sem cobrança mensal; o app avisa um mês antes de terminar e se cobrarem depois.' : 'Paid upfront and will not renew: no monthly charge; the app warns a month before it ends and if they charge again.') + '</p>' +
          '<div class="grid g2">' + campo(pt() ? 'Nome' : 'Name', '<input id="ppNome" placeholder="' + (pt() ? 'ex.: hub de IA' : 'e.g. AI hub') + '">') + campo(pt() ? 'Paga até' : 'Paid until', '<input type="date" id="ppAte">') +
          campo(pt() ? 'Categoria' : 'Category', '<input id="ppSub" value="IA e software">') + campo(pt() ? 'Valor pago (opcional)' : 'Amount paid (optional)', '<input type="number" id="ppValor" min="0" step="0.01" inputmode="decimal">') + '</div>' +
          '<div class="f-actions"><button class="btn" data-close="genModal">' + (pt() ? 'Cancelar' : 'Cancel') + '</button><button class="btn primary" data-acao="as-pp-salvar">' + (pt() ? 'Salvar' : 'Save') + '</button></div>');
        abrir('genModal');
      },
      'as-pp-salvar': function () {
        var v = function (id) { return (document.getElementById(id) || {}).value || ''; };
        try { API.prepaga({ nome: v('ppNome'), pagoAte: v('ppAte'), sub: v('ppSub'), valorPago: v('ppValor') }); Store.salvar(); fechar('genModal'); render(); }
        catch (e) { toast(e.message, 'warn'); }
      }
    }
  });
  window.Assinaturas = API;
})();
