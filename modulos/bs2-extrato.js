/* =====================================================================
   modulos/bs2-extrato.js — importar o extrato do BS2 (PJ) no app (3.81)        1.0.0 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 13/Nov/2026: "para não depender do principal")
     · CSV nacional ("Extrato Bancário - Empresas"; UTF-8 com BOM; ';'; colunas DataContabil; Data Operação; Tipo; Detalhe;
       Banco; Agencia; Conta; Identificador da transação; Identificador da movimentação; Valor "R$ -1.234,56"; Observação).
       A conta vem na 2ª linha do cabeçalho ("…; Conta; NNNN"). Fora: as linhas "Saldo…", cabeçalho e rodapé.
     · OFX (um STMTRS por moeda; só os que têm STMTTRN): BRL (a conta antiga) e moeda estrangeira (US$…), que vira R$ pela
       PTAX de COMPRA do dia (Banco Central, a mesma fonte do IPCA, série 10813; sem cotação no dia, volta até 7 dias).
     · As MESMAS regras do robô (resumo do principal, 13/Nov/2026), na ordem, e a MESMA conversão (MoneyNuvem.converterRobo /
       Transferencia.receber): ids "bs2-<movimentação|transação>", "bs2-<FITID>" (OFX BRL), "bs2usd-[pf-]<FITID>-c|d[-tarifa]",
       "cambio-AAAA-MM-DD" (custo de câmbio). O que o robô já mandou não entra de novo. Prévia antes de gravar.
     · Sem número de conta no código: a conta → o rótulo do robô ('BS2 PJ', 'BS2 Internacional', 'BS2 PJ antiga', 'BS2 PF (US$)')
       → a empresa vêm do Cofre da empresa (contas[].rotuloRobo; o número da conta, para reconhecer o arquivo). Sem cadastro, o
       rótulo padrão (CSV → 'BS2 PJ'; OFX em R$ → 'BS2 PJ antiga'; OFX em moeda estrangeira → 'BS2 Internacional').
     · O nome do sócio, o pró-labore (bruto/IRRF/líquido) e o contador (nome/CNPJ) também vêm do Cofre.
   API (window.BS2Extrato)
     lerCsv(texto) → {conta, linhas} · lerOfx(texto) → [{conta, moeda, linhas}] · ptax(datas) → Promise<{data: cotação}>
     regraBRL(x, ctx) · regraMoeda(x, ctx) → l (o lançamento como o robô manda) · preparar(arquivos) · gravar(prep) → n
   DADOS
     nenhum próprio: lançamentos em ST.gastos e transferências em ST.transferencias, com o id que o robô usaria; cache da PTAX
     em localStorage 'moneytrio.ptax.compra' (cotação pública)
   PONTOS QUE USA
     ações bs2-importar · bs2-gravar
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function dig(t) { return String(t || '').replace(/\D/g, ''); }
  function num(t) { var s = String(t || '').replace(/[R$\s]/g, ''), neg = /-/.test(s); s = s.replace(/[()-]/g, ''); var v = Number(s.replace(/\./g, '').replace(',', '.')) || 0; return neg ? -v : v; }
  function dataBR(t) { var m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(String(t || '')); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
  function N(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function mais(iso, d) { var x = new Date(iso + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); }
  function usd(v) { return Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function brl(v) { return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  /* a conta do arquivo → {rotulo, empresa} pelo Cofre (número da conta, sem dígito, ou IBAN) */
  function doCofre(numero, padrao) {
    var d = dig(numero), out = { rotulo: padrao, e: null };
    (Array.isArray(ST.empresas) ? ST.empresas : []).forEach(function (e) {
      (e.contas || []).forEach(function (c) {
        var cs = [dig(c.conta), dig(c.conta) + dig(c.digito), dig(c.iban), dig(c.numero)].filter(function (x) { return x.length >= 4; });
        if (d && cs.some(function (x) { return x === d || x.slice(-d.length) === d || d.slice(-x.length) === x; })) { out.rotulo = c.rotuloRobo || padrao; out.e = e; }
      });
    });
    if (!out.e) out.e = (ST.empresas || []).find(function (e) { return (e.contasRobo || []).concat((e.contas || []).map(function (c) { return c.rotuloRobo; })).indexOf(out.rotulo) >= 0; }) || null;
    return out;
  }
  function socioDe(e) {
    if (e && e.socio) return e.socio;
    var d = (typeof Tax !== 'undefined' && Tax.estado) ? (Tax.estado().declaracoes || []).filter(function (x) { return x.titular; })[0] : null;
    return d ? d.titular : '';
  }
  function temSocio(texto, socio) { var ws = N(socio).split(' ').filter(function (w) { return w.length >= 3; }); return ws.length > 0 && ws.every(function (w) { return N(texto).indexOf(w) >= 0; }); }

  var API = {
    lerCsv: function (texto) {
      var ls = String(texto || '').replace(/﻿/g, '').split(/\r?\n/), cab = -1, conta = '';
      ls.slice(0, 10).forEach(function (l) { var m = /;\s*conta\s*;\s*([\d.-]+)/i.exec(l); if (m && !conta) conta = m[1]; });
      for (var i = 0; i < ls.length; i++) if (/identificador da movimentacao/.test(N(ls[i]))) { cab = i; break; }
      if (cab < 0) return { conta: conta, linhas: [] };
      var nomes = ls[cab].split(';').map(function (c) { return N(c).replace(/[^a-z ]/g, '').trim(); }), col = function (n) { return nomes.indexOf(n); };
      var K = { dc: col('datacontabil'), dop: col('data operacao'), tipo: col('tipo'), det: col('detalhe'), ag: col('agencia'), conta: col('conta'), idt: col('identificador da transacao'), idm: col('identificador da movimentacao'), val: col('valor'), obs: col('observacao') };
      var out = [];
      for (var j = cab + 1; j < ls.length; j++) {
        if (!ls[j].trim()) continue;
        var cs = ls[j].split(';'), g = function (k) { return K[k] >= 0 ? String(cs[K[k]] || '').trim() : ''; };
        if (/^saldo/.test(N(g('tipo'))) || /^saldo/.test(N(g('dop'))) || /^saldo/.test(N(g('det')))) continue;
        var data = dataBR(g('dop')) || dataBR(g('dc')), v = num(g('val')), id = g('idm') || g('idt');
        if (!data || !v || !id) continue;   /* rodapé, cabeçalho repetido */
        out.push({ fonte: 'csv', id: id, data: data, tipo: g('tipo'), detalhe: g('det'), obs: g('obs'), valor: n2(v), moeda: 'BRL', conta: g('conta') || conta });
      }
      return { conta: conta, linhas: out };
    },
    lerOfx: function (texto) {
      var s = String(texto || ''), out = [], tag = function (b, t) { var m = new RegExp('<' + t + '>([^<\\r\\n]*)', 'i').exec(b); return m ? m[1].trim() : ''; };
      s.split(/<STMTRS>/i).slice(1).forEach(function (bl) {
        if (!/<STMTTRN>/i.test(bl)) return;
        var moeda = (tag(bl, 'CURDEF') || 'BRL').toUpperCase(), conta = tag(bl, 'ACCTID'), l = [];
        bl.split(/<STMTTRN>/i).slice(1).forEach(function (t) {
          var v = Number(String(tag(t, 'TRNAMT')).replace(',', '.')) || 0, d = tag(t, 'DTPOSTED');
          if (v) l.push({ fonte: 'ofx', id: tag(t, 'FITID'), data: d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8), tipo: tag(t, 'TRNTYPE'), detalhe: tag(t, 'NAME') || tag(t, 'MEMO'), obs: tag(t, 'NAME') ? tag(t, 'MEMO') : '', valor: n2(v), moeda: moeda, conta: conta });
        });
        out.push({ conta: conta, moeda: moeda, linhas: l });
      });
      return out;
    },
    /* PTAX de compra (Banco Central, SGS 10813); sem cotação no dia, volta até 7 dias */
    ptax: async function (datas) {
      var K = 'moneytrio.ptax.compra', cache = {}; try { cache = JSON.parse(localStorage.getItem(K) || '{}'); } catch (e) {}
      var falta = datas.filter(function (d) { return cache[d] == null; }).sort();
      if (falta.length) {
        var br = function (iso) { return iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4); };
        var r = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.10813/dados?formato=json&dataInicial=' + br(mais(falta[0], -7)) + '&dataFinal=' + br(falta[falta.length - 1]));
        if (!r.ok) throw new Error('PTAX HTTP ' + r.status);
        var serie = {}; (await r.json()).forEach(function (x) { serie[dataBR(x.data)] = Number(String(x.valor).replace(',', '.')); });
        falta.forEach(function (d) { for (var k = 0; k <= 7; k++) { var dd = mais(d, -k); if (serie[dd]) { cache[d] = serie[dd]; break; } } });
        try { localStorage.setItem(K, JSON.stringify(cache)); } catch (e) {}
      }
      var o = {}; datas.forEach(function (d) { o[d] = cache[d]; }); return o;
    },
    /* as regras do robô para R$, na ordem (a primeira que casa vale) */
    regraBRL: function (x, ctx) {
      var e = ctx.e || {}, det = x.detalhe || '', obs = x.obs || '', sai = x.valor < 0, v = Math.abs(x.valor), soc = ctx.socio, tit = soc && temSocio(det, soc);
      var pl = e.prolabore || {}, ct = e.contador || {}, D = N(det), T = N(det + ' ' + obs);
      var base = { id: x.idRobo, data: x.data, valor: v, descricao: (det + (obs ? ' [' + obs + ']' : '')).slice(0, 160), banco: ctx.rotulo, conta: dig(x.conta) || x.conta, forma: 'Debito', cartao: 'BS2 PJ', quem: soc, ir: 'PJ', origem: 'bs2-app' };
      var r = function (tipo, grupo, cat, extra) { return Object.assign({}, base, { tipo: tipo, grupo: grupo, categoria: cat }, extra || {}); };
      if (sai && tit && pl.liquido && Math.abs(v - pl.liquido) < 0.005) return r('transferencia', 'TRANSFERENCIA', 'Pró-labore PJ → PF', { ir: 'IRPF (pró-labore tributável: bruto ' + brl(pl.bruto || 0) + ', IRRF ' + brl(pl.irrf || 0) + ')' });
      if (!sai && tit) return r('transferencia', 'TRANSFERENCIA', 'PF → PJ (dinheiro para impostos/pró-labore)');
      if (/recebim da conta-intern/.test(D)) return r('transferencia', 'TRANSFERENCIA', 'Conversão US$ → R$ (chegada na PJ)', { freq: 'Mensal' });
      if (/das-simples/.test(D)) return r('despesa', 'BANCARIOS', 'IRPF / DARF', { rotulo: 'DAS Simples Nacional (PJ)', freq: 'Mensal' });
      if (/receita fed-darf/.test(D)) return r('despesa', 'BANCARIOS', 'IRPF / DARF', { rotulo: 'DARF (PJ)', freq: 'Mensal' });
      if (/pref mun sao paulo/.test(D)) return r('despesa', 'BANCARIOS', 'Outros (Bancarios)', { rotulo: 'TFE Prefeitura SP (PJ)', freq: 'Anual' });
      if ((ct.nome && D.indexOf(N(ct.nome)) >= 0) || (ct.cnpj && dig(det).indexOf(dig(ct.cnpj)) >= 0)) return r('despesa', 'BANCARIOS', 'Mensalidades / Anuidades', { rotulo: 'Contador (PJ)', freq: 'Mensal' });
      if (tit && /pro ?-?labore/.test(N(obs))) return r('transferencia', 'TRANSFERENCIA', 'Pró-labore PJ → PF', { ir: 'IRPF (pró-labore, tributável)' });
      if (tit && /lucro/.test(N(obs))) return r('transferencia', 'TRANSFERENCIA', 'Distribuição de lucros PJ → PF', { ir: 'IRPF (lucro isento, cód. 13)', freq: 'Pontual' });
      if (tit) return r('transferencia', 'TRANSFERENCIA', 'Entre PJ e PF', { freq: 'Pontual' });
      return r(sai ? 'despesa' : 'receita', '?', 'A identificar');
    },
    /* moeda estrangeira: a conta da empresa (ou a PF em US$) */
    regraMoeda: function (x, ctx, cot) {
      var pf = ctx.rotulo === 'BS2 PF (US$)', nome = x.detalhe || x.obs || '', tarifa = /tarifa/i.test(nome + ' ' + x.obs), c = x.valor > 0;
      var id = 'bs2usd-' + (pf ? 'pf-' : '') + x.id + (c ? '-c' : '-d') + (tarifa ? '-tarifa' : '');
      var base = { id: id, data: x.data, valor: n2(Math.abs(x.valor) * cot), descricao: (nome + ' (' + (x.moeda === 'USD' ? 'US$' : x.moeda) + ' ' + usd(x.valor) + ')').slice(0, 160),
        banco: ctx.rotulo, conta: x.moeda, forma: 'Debito', cartao: pf ? 'BS2 PF' : 'BS2 PJ', quem: ctx.socio, ir: 'PJ', origem: 'bs2-app', valor_moeda: Math.abs(x.valor), moeda: x.moeda, ptax: cot };
      var r = function (tipo, grupo, cat, extra) { return Object.assign({}, base, { tipo: tipo, grupo: grupo, categoria: cat }, extra || {}); };
      if (pf) return c ? r('transferencia', 'TRANSFERENCIA', 'PJ → PF em US$ (distribuição de lucros)', { ir: 'IRPF (lucro isento, cód. 13)' }) : r('despesa', 'INVESTIMENTO', 'Envio para corretora no exterior', { ir: '' });
      if (c) return r('receita', 'RENDA', 'Faturamento PJ (' + nome.slice(0, 50) + ')', { freq: 'Mensal' });
      if (/convers/i.test(nome)) return r('transferencia', 'TRANSFERENCIA', 'Conversão US$ → R$ (saída da conta internacional)');
      if (tarifa) return r('despesa', 'BANCARIOS', 'Outros (Bancarios)');
      return r('transferencia', 'TRANSFERENCIA', 'PJ → PF em US$', { ir: 'IRPF (lucro isento, cód. 13?)' });
    },
    preparar: async function (arquivos) {
      var blocos = [];
      for (var i = 0; i < arquivos.length; i++) {
        var a = arquivos[i], txt = typeof a === 'string' ? a : await a.text();
        if (/<OFX>|<STMTRS>/i.test(txt)) API.lerOfx(txt).forEach(function (b) { blocos.push(Object.assign(b, { ctx: doCofre(b.conta, b.moeda === 'BRL' ? 'BS2 PJ antiga' : 'BS2 Internacional') })); });
        else { var cv = API.lerCsv(txt); blocos.push({ conta: cv.conta, moeda: 'BRL', linhas: cv.linhas, ctx: doCofre(cv.conta, 'BS2 PJ') }); }
      }
      var datasM = []; blocos.forEach(function (b) { if (b.moeda !== 'BRL') b.linhas.forEach(function (x) { if (datasM.indexOf(x.data) < 0) datasM.push(x.data); }); });
      var cot = datasM.length ? await API.ptax(datasM) : {};
      var ids = {}; (typeof Gasto !== 'undefined' ? Gasto.todos() : []).forEach(function (g) { ids[g.id] = 1; if (g.idRobo) ids['rb_' + g.idRobo] = 1; });
      (typeof Transferencia !== 'undefined' ? Transferencia.todas() : []).forEach(function (t) { ids[t.id] = 1; });
      var out = { novos: [], ja: [], ignorados: [] }, ls = [];
      blocos.forEach(function (b) {
        var ctx = { rotulo: b.ctx.rotulo, e: b.ctx.e, socio: socioDe(b.ctx.e) };
        b.linhas.forEach(function (x) {
          if (b.moeda !== 'BRL' && !cot[x.data]) { out.ignorados.push({ x: x, por: tr('sem PTAX do dia', 'no PTAX rate for the day') }); return; }
          if (b.moeda === 'BRL') x.idRobo = 'bs2-' + x.id;
          ls.push(b.moeda === 'BRL' ? API.regraBRL(x, ctx) : API.regraMoeda(x, ctx, cot[x.data]));
        });
      });
      /* custo de câmbio: no dia em que sai da conta internacional (US$ × PTAX) e chega na PJ (R$), a diferença */
      var dias = {};
      ls.forEach(function (l) { if (/sa[ií]da da conta internacional/.test(l.categoria)) (dias[l.data] = dias[l.data] || { s: 0, c: 0 }).s += l.valor; if (/chegada na PJ/.test(l.categoria)) (dias[l.data] = dias[l.data] || { s: 0, c: 0 }).c += l.valor; });
      Object.keys(dias).forEach(function (d) { var x = dias[d], dif = n2(x.s - x.c); if (x.s && x.c && dif > 0) ls.push({ id: 'cambio-' + d, data: d, valor: dif, tipo: 'despesa', grupo: 'BANCARIOS', categoria: 'IOF / TED / DOC', descricao: tr('Custo de câmbio (US$ × PTAX − chegada na PJ)', 'FX cost (US$ × PTAX − arrival in the company)'), banco: 'BS2 PJ', forma: 'Debito', ir: 'PJ', origem: 'bs2-app' }); });
      ls.forEach(function (l) {
        if (l.tipo === 'transferencia') {
          var tid = 'tf_' + String(l.id).replace(/[^A-Za-z0-9_.:@-]/g, '_').slice(0, 70), t = { id: tid, data: l.data, valor: l.valor, banco: l.banco, desc: l.descricao, sub: l.categoria, irTexto: l.ir, l: l, transf: true };
          if (ids[tid]) out.ja.push(t); else { ids[tid] = 1; out.novos.push(t); }
          return;
        }
        var g = window.MoneyNuvem && MoneyNuvem.converterRobo ? MoneyNuvem.converterRobo(l) : null;
        if (!g) { out.ignorados.push({ x: l, por: tr('não vira lançamento', 'not an entry') }); return; }
        if (l.rotulo) g.rotulo = l.rotulo;
        if (l.valor_moeda != null) { g.valorMoeda = l.valor_moeda; g.moeda = l.moeda; g.ptax = l.ptax; }
        if (ids[g.id]) out.ja.push(g); else { ids[g.id] = 1; out.novos.push(g); }
      });
      return out;
    },
    gravar: function (prep) {
      prep.novos.forEach(function (g) { if (g.transf) Transferencia.receber(g.l, true); else Gasto.add(g); });
      if (prep.novos.some(function (g) { return g.transf; })) Transferencia.ligarTudo();
      return prep.novos.length;
    }
  };

  /* ---------- a prévia ---------- */
  var ultimo = null;
  function previa(p) {
    ultimo = p;
    $('#genTitle').textContent = tr('Extrato do BS2: prévia', 'BS2 statement: preview');
    var lin = function (g, ja) { return '<tr' + (ja ? ' class="muted"' : '') + '><td>' + esc(I18n.data(g.data)) + '</td><td>' + esc(g.desc) + '<span class="t-sub">' + esc((g.transf ? g.banco : g.conta) + ' · ' + (g.rotulo || g.sub)) + '</span></td><td class="num">' + fmt(g.valor) + '</td><td>' + esc(ja ? tr('já existe', 'already there') : tr('novo', 'new')) + '</td></tr>'; };
    $('#genBody').innerHTML = Verter.html('<p class="small bs2-conta">' + esc(tr(p.novos.length + ' novo(s); ' + p.ja.length + ' já estavam no app (o robô mandou); ' + p.ignorados.length + ' de fora.', p.novos.length + ' new; ' + p.ja.length + ' already in the app; ' + p.ignorados.length + ' left out.')) + '</p>' +
      '<div class="tbl-wrap" style="max-height:50vh;overflow:auto"><table class="tbl bs2-previa"><tbody>' + p.novos.map(function (g) { return lin(g, false); }).join('') + p.ja.map(function (g) { return lin(g, true); }).join('') + '</tbody></table></div>' +
      '<div class="f-actions"><button class="btn" data-close="genModal">' + esc(t('ac.cancelar')) + '</button><button class="btn primary" data-acao="bs2-gravar"' + (p.novos.length ? '' : ' disabled') + '>' + esc(tr('Importar ', 'Import ') + p.novos.length) + '</button></div>');
    abrir('genModal');
  }
  API._previa = previa;

  MoneyModulos.registrar({
    id: 'bs2-extrato', versao: '1.0.0',
    acoes: {
      'bs2-importar': function () {
        var i = document.createElement('input'); i.type = 'file'; i.accept = '.csv,.ofx,text/csv,application/x-ofx'; i.multiple = true; i.style.display = 'none'; i.id = 'bs2Arq';
        i.addEventListener('change', async function () {
          var l = Array.from(i.files || []); if (i.parentNode) i.parentNode.removeChild(i); if (!l.length) return;
          var tarefa = 'bs2-' + Date.now();
          try { if (typeof Fundo !== 'undefined' && Fundo.mostrar) Fundo.mostrar(tarefa, 0.3, tr('Lendo o extrato do BS2…', 'Reading the BS2 statement…')); previa(await API.preparar(l)); }
          catch (e) { toast(tr('Não deu para ler o extrato: ', 'Could not read the statement: ') + (e && e.message || e), 'warn'); }
          finally { if (typeof Fundo !== 'undefined' && Fundo.esconder) Fundo.esconder(tarefa); }
        });
        document.body.appendChild(i); i.click();
      },
      'bs2-gravar': function () {
        if (!ultimo) return; var n = API.gravar(ultimo); ultimo = null;
        Store.salvar(); fechar('genModal'); render(); toast(tr(n + ' lançamento(s) do BS2 importado(s).', n + ' BS2 entr(ies) imported.'));
      }
    }
  });
  window.BS2Extrato = API;
})();
