/* =====================================================================
   modulos/pj-oportunidades.js — FiscalONE, gestor de CNPJ: Oportunidades (regras sem IA), DRE com plano de contas,
   pacote do contador, troca de empresas, glossário fiscal e o contexto do ✨ (3.83)        1.0.1 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedidos do dono, 13/Nov/2026; os TEXTOS ficam em textos/pj-textos.js, num arquivo só)
     · Oportunidades: cada regra é uma função pequena (API.regras.<nome>(e, mes) → cartão | null) com frase, "por quê", o valor
       estimado COM A CONTA e o link da fonte oficial. Nenhuma afirma economia sem mostrar a conta.
       - fatorR: Simples de serviço; abaixo de 28% (Anexo V) mostra o pró-labore a mais que leva a 28%, quanto o DAS cai (Anexo V
         → III, tabelas da LC 123) e o que sobra depois do INSS (11%) e do IR do pró-labore a mais (pior caso, 27,5%); no limite
         (28–31%) pede para acompanhar; acima, "está bem".
       - exportacao: receita do exterior nos 12 meses; compara o DAS pago com a estimativa com e sem a exportação separada
         (sem ISS/PIS/COFINS na parte exportada) e avisa se parece não ter separado.
       - despesasCasa: no Simples e no Presumido, passar a despesa para a PJ NÃO reduz o DAS (e o porquê); só no Lucro Real reduz.
       - mistura: contas da empresa pagas no CPF (DAS, DARF, TFE, contador) e contas pessoais pagas pela conta da PJ.
       - reforma: o cartão "o que muda e quando" (EC 132/2023, LC 214/2025) e uma data de "revisar" no 📥.
     · DRE simples do mês e do ano pelo plano de contas (impostos, contador e taxas, software e IA, internet e telefone,
       equipamentos, bancos e câmbio, outros; pró-labore e lucros abaixo, "foi para a PF").
     · Pacote do contador do mês: o resumo (DRE, contas a receber e a pagar, custos do negócio pagos no CPF, documentos guardados)
       e os lançamentos da PJ em CSV, para baixar; e o e-mail pronto (mailto:), sem nada sair do app sozinho.
     · Troca de empresas: com uma empresa "a encerrar" ou "a reativar", a checklist (clientes e contratos, dados de recebimento,
       assinaturas para o CNPJ ativo, encerrar com o contador), guardada na empresa.
     · Glossário fiscal: os verbetes de textos/pj-textos.js (categoria FiscalONE) e um cartão com os atalhos na tela PJ.
     · ✨ Pergunte à IA: o botão que já existe, com o contexto da empresa (regime, anexo, Fator R, receita, custos, margem) pelo
       ponto ia.contexto — NUNCA CPF, CNPJ, razão social nem dados bancários. Sem chave, tudo funciona igual, só com as regras.
     · Visão da casa: nada.
   API (window.PJOport)
     regras.{fatorR, exportacao, despesasCasa, mistura, reforma}(e, mes) · cartoes(e, mes) · simples(anexo, rbt12) → {efetiva, das}
     plano(g) → chave do plano de contas · dre(e, de, ate) · pacote(e, mes) → {texto, csv, assunto} · contextoIA(e)
   DADOS
     ST.empresas[i].troca = {passo: 'AAAA-MM-DD'} · ST.empresas[i].reformaRevisar = 'AAAA-MM-DD'
   PONTOS QUE USA
     pj.empresa · ia.contexto · inbox.grupos ('pj') · ações pjo-*
   ===================================================================== */
(function () {
  'use strict';
  var T = typeof PJ_TEXTOS !== 'undefined' ? PJ_TEXTOS : null;
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function L() { return pt() ? 'pt' : 'en'; }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function hoje() { return API._hoje || hojeISO(); }
  function somaMes(mes, k) { var a = +mes.slice(0, 4), m = +mes.slice(5, 7) - 1 + k; a += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return a + '-' + ('0' + (m + 1)).slice(-2); }
  function encher(s, v) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return v[k] != null ? v[k] : ''; }); }
  function cartao(k, nivel, v, fonte, valor) { var x = T.regras[k][L()]; return { k: k, nivel: nivel, titulo: encher(x.t, v), frase: encher(x.f, v), porque: encher(x.p, v), fonte: fonte, valor: valor || 0 }; }
  function doze(e, mes) { return { de: somaMes(mes, -11) + '-01', ate: mes + '-31' }; }
  function regimeNome(r) { return { simples: 'Simples Nacional', 'fator-r': 'Simples Nacional', mei: 'MEI', presumido: tr('Lucro Presumido', 'Lucro Presumido'), real: tr('Lucro Real', 'Lucro Real') }[r] || 'Simples Nacional'; }
  function ehSimples(e) { return !e.regime || e.regime === 'simples' || e.regime === 'fator-r'; }

  var API = {
    _hoje: null,
    /* LC 123: alíquota efetiva e o DAS de 12 meses */
    simples: function (anexo, rbt12) {
      var f = (T.anexos[anexo] || T.anexos.III).find(function (x) { return rbt12 <= x[0]; }) || T.anexos[anexo][T.anexos[anexo].length - 1];
      var ef = rbt12 > 0 ? Math.max(0, (rbt12 * f[1] - f[2]) / rbt12) : 0;
      return { efetiva: ef, das: n2(rbt12 * ef) };
    },
    regras: {
      fatorR: function (e, mes) {
        if (!ehSimples(e)) return null;
        var fr = PJ.fatorR(e, mes); if (fr.fator == null) return null;
        var F = T.fatorR, fat = fr.faturamento, f = fr.folha / fat;
        if (f >= F.folga) return cartao('fatorROk', 'ok', { fator: String(fr.fator).replace('.', ',') }, T.fontes.lc123);
        if (f >= F.limite) return cartao('fatorRNoLimite', 'atencao', { fator: String(fr.fator).replace('.', ',') }, T.fontes.lc123);
        var extraAno = n2(F.limite * fat - fr.folha), V = API.simples('V', fat), III = API.simples('III', fat), economia = n2(V.das - III.das);
        var inss = n2(extraAno * F.inss), irrf = n2((extraAno - inss) * F.irrfMarginal), liquida = n2(economia - inss - irrf);
        return cartao('fatorRAbaixo', liquida > 0 ? 'oportunidade' : 'atencao', { extraMes: fmt(extraAno / 12), extraAno: fmt(extraAno), dasV: fmt(V.das), dasIII: fmt(III.das), economiaDas: fmt(economia), inss: fmt(inss), irrf: fmt(irrf), liquida: fmt(liquida) },
          T.fontes.lc123, liquida);
      },
      exportacao: function (e, mes) {
        if (!ehSimples(e)) return null;
        var j = doze(e, mes), tot = 0, ext = 0, pago = 0;
        PJ.lancamentos(e, j.de, j.ate).forEach(function (g) {
          var c = PJ.categoria(g), v = Math.abs(Number(g.valor) || 0);
          if (c === 'faturamento' || c === 'entrada' && String(g.id || '').indexOf('tf_') !== 0) { tot += v; if (g.moeda && g.moeda !== 'BRL' || /internacional/i.test(g.conta || '')) ext += v; }
          if (c === 'das') pago += v;
        });
        if (!(ext > 0) || !(tot > 0)) return null;
        var fr = PJ.fatorR(e, mes), anexo = e.anexo === 'V' || e.anexo === 'III' ? e.anexo : (fr.fator != null && fr.fator < 28 ? 'V' : 'III'), s = API.simples(anexo, tot);
        var semExp = n2(s.das), comExp = n2(s.das - ext * s.efetiva * T.partesExportacao[anexo]), dif = n2(pago - comExp);
        var v = { parte: Math.round(ext / tot * 100), exterior: fmt(ext), comExp: fmt(comExp), semExp: fmt(semExp), pago: fmt(pago), diferenca: fmt(dif) };
        if (pago > 0 && pago >= (comExp + semExp) / 2) return cartao('exportacao', 'oportunidade', v, T.fontes.lc123, dif);
        return pago > 0 ? cartao('exportacaoOk', 'ok', v, T.fontes.lc123) : null;
      },
      despesasCasa: function (e) {
        if (e.regime === 'real') return null;
        return cartao('despesasCasa', 'info', { regime: regimeNome(e.regime) }, e.regime === 'presumido' ? T.fontes.lucroReal : T.fontes.lc123);
      },
      mistura: function (e, mes) {
        var j = doze(e, mes), l = [];
        (typeof Gasto !== 'undefined' ? Gasto.todos() : []).forEach(function (g) {
          if (g.data < j.de || g.data > j.ate || g.fluxo === 'entrada' || g.estorno) return;
          var dela = PJ.empresaDe(g), c = PJ.categoria(g);
          if (!dela && /^(das|darf|tfe|contador)$/.test(c)) l.push({ g: g, tipo: 'pjNoCpf' });   /* conta da empresa paga no CPF */
          else if (dela && dela.id === e.id && c === 'outra' && !/^(OUTROS|BANCARIOS|INVESTIMENTO)$/.test(g.grupo) && !/^pj\b/i.test(String(g.irTexto || ''))) l.push({ g: g, tipo: 'pfNaPj' });   /* conta pessoal paga pela PJ */
        });
        if (!l.length) return null;
        var tot = n2(l.reduce(function (s, x) { return s + Math.abs(x.g.valor); }, 0));
        return cartao('mistura', 'atencao', { n: l.length, total: fmt(tot), exemplos: l.slice(0, 3).map(function (x) { return String(x.g.desc || x.g.sub).slice(0, 30) + ' ' + I18n.data(x.g.data); }).join('; ') }, T.fontes.civil, tot);
      },
      reforma: function (e) { return cartao('reforma', 'info', { revisar: I18n.data(API.revisarEm(e)) }, T.fontes.simplesIbsCbs); }
    },
    /* sem data na lei confirmada aqui: hoje + 30 dias, gravada na empresa na primeira vez (depois, "Revisei" empurra 6 meses) */
    /* 1.0.1 (3.85): 15/02/2027, antes da janela de março (o aviso oficial do Simples). A data gravada mais cedo continua; uma mais
       tarde cai para 15/02/2027 enquanto ela não chega (ninguém perde a janela); depois dela, vale a gravada ("Revisei" + 6 meses) */
    revisarEm: function (e) { var a = T.reformaRevisar, d = e.reformaRevisar; if (!d) return a; return hoje() < a && d > a ? a : d; },
    cartoes: function (e, mes) {
      if (casa() || !T) return [];
      mes = mes || hoje().slice(0, 7);
      return ['fatorR', 'exportacao', 'despesasCasa', 'mistura', 'reforma'].map(function (k) { try { return API.regras[k](e, mes); } catch (x) { return null; } }).filter(Boolean);
    },
    /* ---------- o plano de contas e a DRE ---------- */
    plano: function (g) {
      var c = PJ.categoria(g), t = [g.desc, g.descRobo, g.sub].join(' ');
      if (c === 'das' || c === 'darf') return 'impostos';
      if (c === 'contador' || c === 'tfe') return 'contador';
      if (c === 'tarifas') return 'bancos';
      if (c === 'prolabore' || c === 'lucros') return c;
      if (c === 'faturamento' || c === 'entrada') return 'receita';
      if (/^(conversao|conversaoSaida|pfpj)$/.test(c)) return '';
      if (window.PJGestao && PJGestao.REGRAS_CPF.some(function (r) { return r[0] !== 'internet' && r[0] !== 'dominio' && r[1].test(t); }) || /software|licen[cç]a|saas|assinatura/i.test(t)) return 'software';
      if (/internet|telefon|celular|fibra|dominio|domínio|registro\.br/i.test(t)) return 'internet';
      if (/notebook|computador|monitor|equipament|teclado|mouse|kabum|apple store|dell/i.test(t)) return 'equipamentos';
      return 'outros';
    },
    dre: function (e, de, ate) {
      var r = { receita: 0, impostos: 0, contador: 0, software: 0, internet: 0, equipamentos: 0, bancos: 0, outros: 0, prolabore: 0, lucros: 0 };
      PJ.lancamentos(e, de, ate).forEach(function (g) { var k = API.plano(g); if (k && r[k] != null) r[k] += Math.abs(Number(g.valor) || 0); });
      Object.keys(r).forEach(function (k) { r[k] = n2(r[k]); });
      r.custos = n2(r.contador + r.software + r.internet + r.equipamentos + r.bancos + r.outros);
      r.resultado = n2(r.receita - r.impostos - r.custos); r.pf = n2(r.prolabore + r.lucros); r.sobra = n2(r.resultado - r.pf);
      return r;
    },
    /* ---------- o pacote do contador ---------- */
    pacote: function (e, mes) {
      var d = API.dre(e, mes + '-01', mes + '-31'), nome = e.fantasia || e.razao || '', P = T.plano;
      var linhas = [tr('Pacote do contador — ', 'Accountant pack — ') + nome + ' — ' + mes, '',
        tr('DRE do mês', 'Monthly P&L'), tr('Receita: ', 'Revenue: ') + fmt(d.receita), tr('Impostos: ', 'Taxes: ') + fmt(d.impostos)];
      P.slice(1, 7).forEach(function (p) { linhas.push((pt() ? p[1] : p[2]) + ': ' + fmt(d[p[0]])); });
      linhas.push(tr('Resultado: ', 'Result: ') + fmt(d.resultado), tr('Pró-labore: ', 'Pro-labore: ') + fmt(d.prolabore), tr('Distribuição de lucros: ', 'Profit distribution: ') + fmt(d.lucros), '');
      if (window.PJGestao) {
        var cs = PJGestao.contas(e).filter(function (x) { return String(x.data).slice(0, 7) === mes || !x.feitoEm; });
        if (cs.length) { linhas.push(tr('Contas a receber e a pagar', 'Receivables and payables')); cs.forEach(function (x) { linhas.push((x.tipo === 'receber' ? '+ ' : '− ') + [x.quem || x.desc, x.nota && 'NF ' + x.nota, (x.moeda || 'BRL') + ' ' + x.valor, x.data, x.feitoEm ? tr('feito ', 'done ') + x.feitoEm : tr('em aberto', 'open')].filter(Boolean).join(' · ')); }); linhas.push(''); }
        var cpf = PJGestao.cpfDoMes(mes);
        if (cpf.itens.length) { linhas.push(tr('Custos do negócio pagos no CPF: ', 'Business costs paid personally: ') + fmt(cpf.negocio)); cpf.itens.forEach(function (x) { linhas.push('· ' + x.nome + ' ' + x.g.data + ' ' + fmt(x.v)); }); linhas.push(''); }
      }
      var docs = (e.docs || []).map(function (x) { return x.nome || x.tipo; });
      if (docs.length) linhas.push(tr('Documentos guardados no Cofre: ', 'Documents in the vault: ') + docs.join(', '));
      var csv = ['data;descricao;conta;categoria;plano;valor'].concat(PJ.lancamentos(e, mes + '-01', mes + '-31').sort(function (a, b) { return a.data < b.data ? -1 : 1; }).map(function (g) {
        return [g.data, String(g.desc || '').replace(/;/g, ','), g.conta || g.banco || '', g.sub || '', API.plano(g), String(n2(g.valor)).replace('.', ',')].join(';');
      })).join('\n');
      return { texto: linhas.join('\n'), csv: csv, assunto: tr('Pacote do contador — ', 'Accountant pack — ') + nome + ' — ' + mes };
    },
    /* ---------- o contexto do ✨ (sem CPF, CNPJ, razão social nem dados bancários) ---------- */
    contextoIA: function (e) {
      var mes = hoje().slice(0, 7), fr = PJ.fatorR(e, mes), d = API.dre(e, somaMes(mes, -11) + '-01', mes + '-31');
      return [tr('Empresa (PJ): ', 'Company: ') + regimeNome(e.regime) + (e.anexo ? ', ' + tr('anexo ', 'annex ') + e.anexo : '') + (e.situacao && e.situacao !== 'ativa' ? ', ' + e.situacao : ''),
        tr('12 meses: receita ', '12 months: revenue ') + fmt(d.receita) + tr(', impostos ', ', taxes ') + fmt(d.impostos) + tr(', custos ', ', costs ') + fmt(d.custos) + tr(', resultado ', ', result ') + fmt(d.resultado) + tr(', para a PF ', ', to the owner ') + fmt(d.pf),
        'Fator R: ' + (fr.fator == null ? '—' : String(fr.fator).replace('.', ',') + '%')].join('\n');
    },
    trocaAtiva: function () { var es = Array.isArray(ST.empresas) ? ST.empresas : []; return es.length >= 2 && es.some(function (e) { return e.situacao === 'a-encerrar' || e.situacao === 'a-reativar'; }); }
  };

  /* ---------- a tela ---------- */
  var COR = { oportunidade: 'up', atencao: 'warn', ok: 'muted', info: 'muted' };
  function blocoOport(e, mes) {
    var cs = API.cartoes(e, mes); if (!cs.length) return '';
    return '<div class="card pjo-card"><div class="card-head"><h3>💡 ' + esc(tr('Oportunidades', 'Opportunities')) + '</h3><button class="btn sm" data-acao="ia-abrir">✨ ' + esc(tr('Pergunte à IA', 'Ask the AI')) + '</button></div>' +
      cs.map(function (c) {
        return '<div class="pjo-item pjo-' + c.nivel + '" data-regra="' + c.k + '"><b class="' + COR[c.nivel] + '">' + esc(c.titulo) + '</b><p class="small" style="margin:4px 0">' + esc(c.frase) + '</p>' +
          '<p class="tiny muted" style="margin:0">' + esc(tr('Por quê: ', 'Why: ') + c.porque) + ' <a href="' + esc(c.fonte) + '" target="_blank" rel="noopener">' + esc(tr('fonte oficial', 'official source')) + '</a> · ' + esc(T.regras.contador[L()]) + '</p>' +
          (c.k === 'reforma' ? ' <button class="linkinho" data-acao="pjo-revisei" data-id="' + esc(e.id) + '">' + esc(tr('Revisei: lembrar daqui a 6 meses', 'Reviewed: remind me in 6 months')) + '</button>' : '') + '</div>';
      }).join('') +
      '<p class="tiny muted">' + esc(tr('As regras usam as tabelas da lei e os seus números; o ✨ só funciona com a sua chave de IA e não recebe CPF, CNPJ nem dados bancários.', 'The rules use the law\'s tables and your numbers; ✨ only works with your AI key and never receives CPF, CNPJ or bank details.')) + '</p></div>';
  }
  function blocoDre(e, mes) {
    var dm = API.dre(e, mes + '-01', mes + '-31'), da = API.dre(e, mes.slice(0, 4) + '-01-01', mes + '-31'), P = T.plano;
    var lin = function (rot, a, b, cls) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + esc(rot) + '</td><td class="num">' + fmt(a) + '</td><td class="num">' + fmt(b) + '</td></tr>'; };
    return '<div class="card pjo-dre"><div class="card-head"><h3>' + esc(tr('DRE simples', 'Simple P&L')) + '</h3><button class="btn sm" data-acao="pjo-pacote" data-id="' + esc(e.id) + '">📦 ' + esc(tr('Pacote do contador', 'Accountant pack')) + '</button></div>' +
      '<table class="tbl"><thead><tr><th></th><th class="num">' + esc(tr('Mês', 'Month')) + '</th><th class="num">' + esc(tr('Ano', 'Year')) + '</th></tr></thead><tbody>' +
      lin(tr('Receita', 'Revenue'), dm.receita, da.receita, 'pjo-rec') + lin(tr('(−) Impostos', '(−) Taxes'), dm.impostos, da.impostos) +
      P.slice(1, 7).map(function (p) { return lin('(−) ' + (pt() ? p[1] : p[2]), dm[p[0]], da[p[0]]); }).join('') +
      lin(tr('= Resultado', '= Result'), dm.resultado, da.resultado, 'pjo-res') + lin(tr('Foi para a PF: pró-labore', 'To you: pro-labore'), dm.prolabore, da.prolabore) + lin(tr('Foi para a PF: lucros', 'To you: profits'), dm.lucros, da.lucros) +
      lin(tr('Ficou na PJ', 'Stayed in the company'), dm.sobra, da.sobra, 'pjo-res') + '</tbody></table></div>';
  }
  function blocoTroca(e) {
    if (!API.trocaAtiva()) return '';
    var feito = e.troca || {};
    return '<div class="card pjo-troca"><div class="card-head"><h3>🔁 ' + esc(tr('Troca de empresas', 'Switching companies')) + '</h3></div>' +
      '<p class="small">' + esc(tr('Uma das empresas está "a encerrar" ou "a reativar". Os passos, com o contador:', 'One company is "to close" or "to reactivate". The steps, with your accountant:')) + '</p><ul class="pa-lista">' +
      T.troca.map(function (p) { return '<li><label class="linha-check"><input type="checkbox" data-acao="pjo-troca" data-id="' + esc(e.id) + '" data-p="' + p[0] + '"' + (feito[p[0]] ? ' checked' : '') + '> ' + esc(pt() ? p[1] : p[2]) + (feito[p[0]] ? ' <span class="tiny muted">(' + esc(I18n.data(feito[p[0]])) + ')</span>' : '') + '</label></li>'; }).join('') + '</ul></div>';
  }
  function blocoGlossario() {
    var ks = [['simples-nacional', 'Simples'], ['anexos-simples', tr('Anexos', 'Annexes')], ['fator-r', 'Fator R'], ['das', 'DAS'], ['darf-pj', 'DARF'], ['pro-labore', tr('Pró-labore', 'Pro-labore')], ['distribuicao-lucros', tr('Lucros', 'Profits')], ['exportacao-servicos', tr('Exportação', 'Exports')], ['ibs-cbs', 'IBS/CBS'], ['regime-hibrido', tr('Regime híbrido', 'Hybrid regime')], ['tfe', 'TFE']];
    return '<div class="card pjo-glos"><div class="card-head"><h3>📖 ' + esc(tr('Glossário fiscal', 'Tax glossary')) + '</h3></div><p class="small">' + ks.map(function (k) { return '<button class="linkinho" data-info="' + k[0] + '">' + esc(k[1]) + '</button>'; }).join(' · ') + '</p></div>';
  }

  MoneyModulos.registrar({
    id: 'pj-oportunidades', versao: '1.0.1',
    pontos: {
      'pj.empresa': function (ctx) { if (casa() || !ctx || !ctx.e || !T) return ''; var mes = ctx.mes || hoje().slice(0, 7); return blocoTroca(ctx.e) + blocoOport(ctx.e, mes) + blocoDre(ctx.e, mes) + blocoGlossario(); },
      'ia.contexto': function (ctx) {
        if (casa() || !ctx || ctx.tela !== 't-pj' || !Array.isArray(ST.empresas) || !ST.empresas.length) return [];
        var e = (window.CofreEmpresa && CofreEmpresa.ordenadas ? CofreEmpresa.ordenadas() : ST.empresas)[0];
        return [API.contextoIA(e)];   /* MoneyModulos.itens junta listas */
      },
      'inbox.grupos': function () {
        if (casa() || !Array.isArray(ST.empresas)) return [];
        var h = hoje(), l = ST.empresas.filter(function (e) { return (e.situacao || 'ativa') === 'ativa' && API.revisarEm(e) <= h; });
        return l.length ? [{ id: 'pj', n: l.length, html: l.map(function (e) { return '<li class="inb-item"><div><b>📅 ' + esc(tr('Revisar a reforma tributária com o contador (', 'Review the tax reform with your accountant (') + (e.fantasia || e.razao || '') + ')') + '</b><span class="t-sub">' + esc(tr('2027: a escolha entre o DAS e o regime híbrido.', '2027: the choice between the DAS and the hybrid regime.')) + '</span></div><span class="inb-acoes"><button class="btn sm" data-acao="pjo-revisei" data-id="' + esc(e.id) + '">' + esc(tr('Revisei', 'Reviewed')) + '</button></span></li>'; }).join('') }] : [];
      }
    },
    acoes: {
      'pjo-revisei': function (el) {
        var e = (ST.empresas || []).find(function (x) { return x.id === el.dataset.id; }); if (!e) return;
        var d = new Date(hoje() + 'T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + 6); e.reformaRevisar = d.toISOString().slice(0, 10);
        Store.salvar(); render(); if (typeof renderInboxN === 'function') renderInboxN();
      },
      'pjo-troca': function (el) {
        var e = (ST.empresas || []).find(function (x) { return x.id === el.dataset.id; }); if (!e) return;
        e.troca = e.troca || {}; if (el.checked) e.troca[el.dataset.p] = hoje(); else delete e.troca[el.dataset.p];
        Store.salvar(); render();
      },
      'pjo-pacote': function (el) {
        var e = (ST.empresas || []).find(function (x) { return x.id === el.dataset.id; }); if (!e) return;
        var mes = (document.getElementById('pjMes') || {}).value; mes = /^\d{4}-\d{2}/.test(mes || '') ? mes.slice(0, 7) : hoje().slice(0, 7);
        var p = API.pacote(e, mes); API._ultimo = p; API._ultimoE = e;
        $('#genTitle').textContent = p.assunto;
        $('#genBody').innerHTML = Verter.html('<pre class="pjo-pre">' + esc(p.texto) + '</pre>' +
          '<p class="tiny muted">' + esc(tr('Os extratos e as notas guardados no Cofre vão pelo seu e-mail como anexo (o app não manda nada sozinho).', 'Statements and invoices stored in the vault go as attachments from your e-mail (the app sends nothing on its own).')) + '</p>' +
          '<div class="f-actions" style="flex-wrap:wrap"><button class="btn sm" data-acao="pjo-baixar">⬇️ ' + esc(tr('Baixar o resumo e os lançamentos (CSV)', 'Download the summary and the entries (CSV)')) + '</button>' +
          '<button class="btn sm primary" data-acao="pjo-email">✉ ' + esc(tr('E-mail para o contador', 'E-mail the accountant')) + '</button></div>');
        abrir('genModal');
      },
      'pjo-baixar': function () {
        var p = API._ultimo; if (!p) return;
        [[p.assunto + '.txt', p.texto, 'text/plain'], [p.assunto + ' - lancamentos.csv', '﻿' + p.csv, 'text/csv']].forEach(function (f, i) {
          setTimeout(function () { var u = URL.createObjectURL(new Blob([f[1]], { type: f[2] + ';charset=utf-8' })), a = document.createElement('a'); a.href = u; a.download = f[0].replace(/[\\/:*?"<>|]/g, '-'); document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 4000); }, i * 300);
        });
      },
      'pjo-email': function () {
        var p = API._ultimo; if (!p) return;
        var e = API._ultimoE, para = (e && e.contador && /^[^\s@]+@[^\s@]+$/.test(String(e.contador.contato || '').trim())) ? String(e.contador.contato).trim() : '';
        API._ultimoMailto = 'mailto:' + para + '?subject=' + encodeURIComponent(p.assunto) + '&body=' + encodeURIComponent(p.texto);
        location.href = API._ultimoMailto;
      }
    }
  });
  window.PJOport = API;
})();
