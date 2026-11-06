/* =====================================================================
   modulos/previsto.js — valor que varia: época do ano e boleto que chegou (N28)   1.0.0 · 06/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     · Época do ano (sazonalidade): com 12 meses ou mais de histórico de um compromisso "o valor varia",
       a pessoa pode ligar "usar a época do ano". O previsto de cada mês passa a ser o previsto normal ×
       o peso daquele mês (ex.: a luz de janeiro costuma vir 15% acima da média).
     · Boleto que chegou (PDF): o app lê o boleto SEM IA — valor e vencimento (pelo texto ou pela linha
       digitável de 47 números), beneficiário — e propõe de qual vencimento ele é. Confirmado, o valor do
       boleto vira o previsto daquele mês ("boleto que chegou"); o pagamento de verdade ainda ganha dele.
   API (window.Previsto)
     pesos(r, hoje?)          → {n: meses de histórico, pesos: {1..12: fator}} (null se < 12 meses)
     lerBoleto(texto)         → {valor, venc, beneficiario, linha}
     linhaDigitavel(digitos)  → {valor, venc} | null
     candidatos(boleto)       → [{r, data, nota}] (vencimentos de compromissos perto do boleto)
   DADOS
     Store.estado.previsto_cfg = [{id: <compromisso>, sazonal: true}]
     Store.estado.boletos = [{id: '<compromisso>|AAAA-MM-DD', rid, data, valor, venc, arquivo}]
   PONTOS QUE USA
     compromisso.varia · evento compromisso.salvo · itens recorrente.previsto · custos.topo · ações prev-*
   ===================================================================== */
(function () {
  'use strict';
  var CFG = 'previsto_cfg', BOL = 'boletos';
  function pt() { return I18n.atual === 'pt'; }
  function lista(c) { return (ST[c] = Array.isArray(ST[c]) ? ST[c] : []); }
  function sa(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function num(t) { return Number(String(t).replace(/\./g, '').replace(',', '.')) || 0; }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function isoDe(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  var cache = {};

  var API = {
    cfg: function (rid) { return lista(CFG).find(function (x) { return x.id === rid; }) || null; },
    pesos: function (r, hoje) {
      hoje = String(hoje || hojeISO()).slice(0, 10);
      var k = (r.id || '') + '|' + r.grupo + '|' + r.sub + '|' + hoje + '|' + Gasto.todos().length, c = cache[r.id || k];
      if (c && c.k === k && Date.now() - c.em < 10000) return c.v;
      var de = (Number(hoje.slice(0, 4)) - 2) + hoje.slice(4), N = function (x) { return String(x || '').trim().toLowerCase(); };
      var l = Gasto.todos().filter(function (g) { return g.data && g.data <= hoje && g.data >= de && r.id && g.recorrenteId === r.id; });
      if (l.length < 12) l = Gasto.todos().filter(function (g) { return g.data && g.data <= hoje && g.data >= de && g.grupo === r.grupo && N(g.sub) === N(r.sub) && N(r.sub); });
      var porMes = {}; l.forEach(function (g) { var m = g.data.slice(0, 7); porMes[m] = (porMes[m] || 0) + g.valor; });
      var meses = Object.keys(porMes), v = null;
      if (meses.length >= 12) {
        var media = meses.reduce(function (s, m) { return s + porMes[m]; }, 0) / meses.length, soma = {}, qtd = {};
        meses.forEach(function (m) { var i = Number(m.slice(5, 7)); soma[i] = (soma[i] || 0) + porMes[m]; qtd[i] = (qtd[i] || 0) + 1; });
        var pesos = {}; for (var i = 1; i <= 12; i++) pesos[i] = qtd[i] ? Math.round(soma[i] / qtd[i] / media * 1000) / 1000 : 1;
        v = { n: meses.length, pesos: pesos };
      }
      cache[r.id || k] = { k: k, em: Date.now(), v: v };
      return v;
    },
    /* linha digitável de boleto bancário (47 números): valor nos 10 últimos, vencimento pelo "fator" */
    linhaDigitavel: function (d) {
      d = String(d || '').replace(/\D/g, ''); if (d.length !== 47) return null;
      var fator = Number(d.slice(33, 37)), valor = Number(d.slice(37)) / 100;
      var venc = '';
      if (fator > 0) {
        var base = new Date(1997, 9, 7), dt = new Date(base); dt.setDate(dt.getDate() + fator);
        /* o fator recomeçou em 1000 em 22/02/2025: se ficou velho demais, conta da base nova */
        if (dt < new Date(2020, 0, 1)) { dt = new Date(2025, 1, 22); dt.setDate(dt.getDate() + fator - 1000); }
        venc = isoDe(dt);
      }
      return { valor: n2(valor), venc: venc };
    },
    lerBoleto: function (texto) {
      var t = String(texto || ''), s = sa(t), out = { valor: 0, venc: '', beneficiario: '', linha: '' }, m;
      var lin = t.match(/\d{5}[.\s]?\d{5}\s+\d{5}[.\s]?\d{6}\s+\d{5}[.\s]?\d{6}\s+\d\s+\d{14}/);
      if (lin) { out.linha = lin[0]; var ld = API.linhaDigitavel(lin[0]); if (ld) { out.valor = ld.valor; out.venc = ld.venc; } }
      if ((m = s.match(/(?:valor do documento|valor cobrado|valor a pagar|total a pagar|valor total|valor)[^\n\d]*?(\d{1,3}(?:\.\d{3})*,\d{2})/))) out.valor = num(m[1]) || out.valor;
      if ((m = s.match(/vencimento[^\n\d]*?(\d{2})\/(\d{2})\/(\d{4})/))) out.venc = m[3] + '-' + m[2] + '-' + m[1];
      if (!out.venc && (m = t.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/))) out.venc = m[3] + '-' + m[2] + '-' + m[1];
      if ((m = t.match(/benefici[aá]rio\s*:?\s*([^\n]{3,80})/i)) || (m = t.match(/cedente\s*:?\s*([^\n]{3,80})/i))) out.beneficiario = m[1].replace(/\s*(cnpj|cpf).*/i, '').trim();
      return out;
    },
    candidatos: function (b) {
      if (!b.venc) return [];
      var d0 = new Date(b.venc + 'T12:00:00'), de = new Date(d0), ate = new Date(d0); de.setDate(de.getDate() - 20); ate.setDate(ate.getDate() + 20);
      var ws = sa(b.beneficiario).split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 4; });
      return Recorrente.ocorrencias(isoDe(de), isoDe(ate)).map(function (o) {
        var nota = 0, alvo = sa([o.r.nome, o.r.sub].join(' '));
        ws.forEach(function (w) { if (alvo.indexOf(w) >= 0) nota += 2; });
        if (o.previsto > 0 && b.valor > 0) { var dif = Math.abs(b.valor - o.previsto) / o.previsto; nota += dif <= 0.1 ? 3 : dif <= 0.4 ? 2 : 0; }
        nota += Math.max(0, 2 - Math.abs((new Date(o.data + 'T12:00:00') - d0) / 86400000) / 5);
        if (o.r.varia) nota += 1;
        return { r: o.r, data: o.data, previsto: o.previsto, nota: nota };
      }).filter(function (x) { return x.r.fluxo !== 'entrada'; }).sort(function (a, b2) { return b2.nota - a.nota; });
    }
  };

  var achado = null;
  function dialogoBoleto(b, arquivoId) {
    var cs = API.candidatos(b).slice(0, 12);
    achado = { b: b, arquivo: arquivoId, cs: cs };
    $('#genTitle').textContent = pt() ? 'Boleto que chegou' : 'Bill received';
    $('#genBody').innerHTML = Verter.html('<p class="small">' + (pt() ? 'O app leu: ' : 'Read: ') + '<b>' + fmt(b.valor) + '</b>' + (b.venc ? (pt() ? ', vence ' : ', due ') + esc(I18n.data(b.venc)) : '') + (b.beneficiario ? ' · ' + esc(b.beneficiario) : '') + '</p>' +
      '<div class="grid g2">' + campo(pt() ? 'Valor (R$)' : 'Amount', '<input type="number" id="pvValor" step="0.01" min="0" value="' + (b.valor || '') + '">') +
        campo(pt() ? 'É de qual vencimento' : 'Which due date', '<select id="pvOc">' + (cs.length ? cs.map(function (c, i) {
          return '<option value="' + i + '"' + (i === 0 ? ' selected' : '') + '>' + esc(c.r.nome + ' · ' + I18n.data(c.data) + ' · ' + (pt() ? 'previsto ' : 'forecast ') + fmt(c.previsto)) + '</option>'; }).join('')
          : '<option value="">' + (pt() ? '— nenhum compromisso perto dessa data —' : '— no commitment near that date —') + '</option>') + '</select>') + '</div>' +
      '<p class="tiny muted">' + (pt() ? 'O valor do boleto vira o previsto daquele mês. Quando o pagamento de verdade chegar, ele ainda ganha.' : 'The bill amount becomes that month\'s forecast. The real payment still wins.') + '</p>' +
      '<div class="f-actions"><button class="btn" data-close="genModal">' + esc(t('ac.cancelar')) + '</button><button class="btn primary" data-acao="prev-boleto-ok"' + (cs.length ? '' : ' disabled') + '>' + esc(t('ac.salvar')) + '</button></div>');
    abrir('genModal');
  }

  MoneyModulos.registrar({
    id: 'previsto',
    versao: '1.0.0',
    colecoes: [CFG, BOL],
    pontos: {
      'compromisso.varia': function (ctx) {
        var r = ctx.r || {}, p = API.pesos(r);
        if (!p) return '<p class="tiny muted" style="margin:-4px 0 10px">' + (pt() ? 'Com 12 meses de histórico, dá para usar a época do ano (ex.: luz mais cara no verão).' : 'With 12 months of history you can use seasonality.') + '</p>';
        var c = r.id ? API.cfg(r.id) : null;
        var MS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (m) { var d = Math.round((p.pesos[m] - 1) * 100); return I18n.mesCurto(m) + ' ' + (d > 0 ? '+' : '') + d + '%'; }).join(' · ');
        return '<label class="linha-check"><input type="checkbox" id="pvSaz"' + (c && c.sazonal ? ' checked' : '') + '> ' + (pt() ? 'Usar a época do ano (' + p.n + ' meses de histórico)' : 'Use seasonality (' + p.n + ' months of history)') + '</label>' +
          '<p class="tiny muted" style="margin:-4px 0 10px">' + esc(MS) + '</p>';
      },
      'recorrente.previsto': function (ctx) {
        var r = ctx.r; if (!r || !r.id) return [];
        var b = lista(BOL).find(function (x) { return x.id === r.id + '|' + ctx.iso; });
        if (b) return [{ valor: b.valor, fonte: 'boleto' }];
        var c = API.cfg(r.id); if (!r.varia || !c || !c.sazonal) return [];
        var p = API.pesos(r); if (!p) return [];
        return [{ valor: n2(ctx.valor * (p.pesos[Number(ctx.iso.slice(5, 7))] || 1)), fonte: 'sazonal' }];
      },
      'custos.topo': function () {
        if (!Recorrente.todos().some(function (r) { return r.ativo !== false; })) return '';
        return '<div class="row" style="gap:8px;margin:0 0 12px;flex-wrap:wrap"><button class="btn sm" data-acao="prev-boleto">🧾 ' + (pt() ? 'Chegou um boleto (PDF)' : 'A bill arrived (PDF)') + '</button></div>';
      }
    },
    ouvir: {
      'compromisso.salvo': function (d) {
        var ck = document.getElementById('pvSaz'); if (!ck || !d || !d.id) return;
        var c = API.cfg(d.id);
        if (ck.checked) { if (!c) lista(CFG).push({ id: d.id, sazonal: true }); else c.sazonal = true; }
        else if (c) c.sazonal = false;
        cache = {};
      }
    },
    acoes: {
      'prev-boleto': function () {
        var i = document.createElement('input'); i.type = 'file'; i.accept = 'application/pdf,.pdf'; i.style.display = 'none';
        i.addEventListener('change', async function () {
          var a = i.files && i.files[0]; if (i.parentNode) i.parentNode.removeChild(i); if (!a) return;
          var txt = ''; try { txt = await PdfTexto.extrair(a, { linhas: true, aceitaVazio: true }); } catch (e) { txt = ''; }
          var b = API.lerBoleto(txt), id = '';
          try { id = (await ArquivosFamilia.guardar({ nome: (b.venc || hojeISO()) + ' Boleto ' + (b.beneficiario || a.name.replace(/\.pdf$/i, '')) + '.pdf', tipo: 'boleto', ano: Number((b.venc || hojeISO()).slice(0, 4)) }, new Uint8Array(await a.arrayBuffer()))).id; } catch (e) {}
          dialogoBoleto(b, id);
        });
        document.body.appendChild(i); i.click();
      },
      'prev-boleto-ok': function () {
        if (!achado) return;
        var c = achado.cs[Number(($('#pvOc') || {}).value)], v = Number(($('#pvValor') || {}).value) || 0;
        if (!c || !(v > 0)) return;
        var id = c.r.id + '|' + c.data, l = lista(BOL), x = l.find(function (y) { return y.id === id; });
        if (!x) { x = { id: id }; l.push(x); }
        Object.assign(x, { rid: c.r.id, data: c.data, valor: n2(v), venc: achado.b.venc || '', arquivo: achado.arquivo || '' });
        achado = null; Store.salvar(); fechar('genModal'); render(); renderFita();
        toast((pt() ? 'Boleto guardado: ' : 'Bill saved: ') + c.r.nome + ' · ' + fmt(v));
      }
    }
  });
  window.Previsto = API;
})();
