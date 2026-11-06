/* =====================================================================
   modulos/compromisso-de.js — compromisso a partir de um lançamento ou de um contrato (PDF)   1.1.0 · 06/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     · No formulário de um lançamento: "📌 Virar compromisso" abre o "Novo compromisso" já preenchido
       (nome, valor, grupo, categoria, pessoa, IR, dia do mês, desde a data do lançamento).
     · Em Custos: "📄 Compromisso de um contrato (PDF)" lê o contrato SEM IA, por modelo — escola
       (ex.: Colégio Escola Exemplo) e genérico: nome da escola/empresa, aluno, ano letivo, valor da
       parcela, número de parcelas, dia de vencimento, matrícula — e abre o "Novo compromisso"
       preenchido para a pessoa conferir. O PDF fica guardado fechado (ArquivosFamilia, tipo 'contrato').
     · 1.1.0: contrato da escola por MODELO (pode escolher vários PDFs de uma vez): "Contrato de serviços de
       educação escolar" (linha da tabela da etapa marcada com X, 12 mensais, dia de vencimento), "Contrato do
       período ampliado" (opção marcada com X; sem X o app pergunta; meses sem julho) e o boleto da matrícula
       ("1ª Parcela da Anuidade": bruto, desconto, a pagar, vencimento). Mostra uma prévia e cria os compromissos
       "a confirmar" (meses de fora, IR) e a 1ª parcela como gasto pontual (desmarcado se já parece lançado).
   API (window.CompromissoDe)
     doLancamento(g)        → semente do compromisso
     lerContrato(texto)     → {escola, aluno, ano, parcela, parcelas, dia, matricula, anuidade, primeiroMes, achados:[…]}
     sementeContrato(c)     → semente do compromisso (Escola <aluno> <ano>, Dependentes, IR, meses certos)
     lerModelo(texto)       → null | {tipo:'escolar'|'ampliado'|'boleto', ano, aluno, escola, opcoes:[{nome, anuidade, parcelas, parcela…}],
                              escolhida (-1 = perguntar), meses:[1..12], dia, primeiroVenc | bruto, desconto, pagar, venc}
     planoModelo([docs])    → {ano, aluno, escola, itens:[{chave, rotulo, opcoes, escolhida, semente(i)}], gasto|null}
   PONTOS QUE USA
     lancamento.form · custos.topo · ações cdl-* · genModal (prévia) · Fundo (leitura dos PDFs)
   ===================================================================== */
(function () {
  'use strict';
  var MESES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
  function pt() { return I18n.atual === 'pt'; }
  function sa(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function num(t) { return Number(String(t).replace(/\./g, '').replace(',', '.')) || 0; }
  function titulo(t) { return String(t || '').toLowerCase().replace(/(^|\s)\S/g, function (m) { return m.toUpperCase(); }).replace(/\s+/g, ' ').trim(); }
  function subEscola() { var arv = (Gasto.arvore().DEPENDENTES || []); return arv.find(function (x) { return /escola|colegio|educa/i.test(sa(x)); }) || 'Escola'; }

  var API = {
    doLancamento: function (g) {
      var dia = g.data ? Number(g.data.slice(8, 10)) : 10;
      return { nome: (g.desc && g.desc.length <= 40 ? g.desc : g.sub) || g.sub, valor: g.cheio || g.valor, grupo: g.grupo, sub: g.sub, quem: g.quem || '',
        irpf: !!g.irpf, regra: 'dia', dia: dia, desde: g.data || '', forma: g.forma || '' };
    },
    lerContrato: function (texto) {
      var t = String(texto || ''), s = sa(t), c = { escola: '', aluno: '', ano: 0, parcela: 0, parcelas: 0, dia: 0, matricula: 0, anuidade: 0, primeiroMes: 0, achados: [] };
      var m;
      if ((m = t.match(/(Col[ée]gio[ \t]+[A-ZÀ-Ú][\wÀ-ú]+(?:[ \t]+[A-ZÀ-Ú][\wÀ-ú]+){0,3}|Escola[ \t]+[A-ZÀ-Ú][\wÀ-ú]+(?:[ \t]+[A-ZÀ-Ú][\wÀ-ú]+){0,3}|Instituto[ \t]+[A-ZÀ-Ú][\wÀ-ú]+(?:[ \t]+[A-ZÀ-Ú][\wÀ-ú]+){0,3})/i))) { c.escola = titulo(m[1]); c.achados.push(m[0]); }
      if ((m = t.match(/(?:alun[oa]|estudante|benefici[aá]ri[oa])\s*(?:\(a\))?\s*[:\-]\s*([A-ZÀ-Úa-zà-ú]+(?:[ \t]+[A-ZÀ-Úa-zà-ú]+){0,4})/i))) { c.aluno = titulo(m[1]).split(' ')[0]; c.achados.push(m[0].trim()); }
      if ((m = s.match(/ano letivo\s*(?:de\s*)?(20\d\d)/)) || (m = s.match(/\b(20\d\d)\b/))) { c.ano = Number(m[1]); }
      if ((m = s.match(/anuidade[^\n]*?(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/))) { c.anuidade = num(m[1]); c.achados.push('anuidade ' + m[1]); }
      if ((m = s.match(/(\d{1,2})\s*(?:\(\w+\)\s*)?(?:parcelas|prestacoes|mensalidades)[^\n]*?(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/))) { c.parcelas = Number(m[1]); c.parcela = num(m[2]); c.achados.push(m[0].trim()); }
      else if ((m = s.match(/(?:mensalidade|parcela)[^\n]*?(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/))) { c.parcela = num(m[1]); c.achados.push(m[0].trim()); }
      if (!c.parcelas && (m = s.match(/(\d{1,2})\s*(?:parcelas|prestacoes|mensalidades)/))) c.parcelas = Number(m[1]);
      if (!c.parcela && c.anuidade && c.parcelas) c.parcela = Math.round(c.anuidade / c.parcelas * 100) / 100;
      if ((m = s.match(/(?:vencimento|vencerao|vence)[^\n]*?dia\s*(\d{1,2})/)) || (m = s.match(/todo dia\s*(\d{1,2})/))) { c.dia = Number(m[1]); c.achados.push('dia ' + m[1]); }
      if ((m = s.match(/matricula[^\n]*?(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/))) c.matricula = num(m[1]);
      if ((m = s.match(/(?:primeira (?:parcela|mensalidade)|a partir de)[^\n]*?\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/))) c.primeiroMes = MESES[m[1]];
      return c;
    },
    sementeContrato: function (c) {
      var ano = c.ano || (Number(hojeISO().slice(0, 4)) + (Number(hojeISO().slice(5, 7)) >= 7 ? 1 : 0));
      var n = Math.min(12, c.parcelas || 12), ini = c.primeiroMes || (n >= 12 ? 1 : 13 - n), fim = Math.min(12, ini + n - 1);
      return { nome: ['Escola', c.aluno, ano].filter(Boolean).join(' '), valor: c.parcela || '', grupo: 'DEPENDENTES', sub: subEscola(), quem: c.aluno || '',
        irpf: true, regra: 'dia', dia: c.dia || 10, desde: ano + '-' + ('0' + ini).slice(-2) + '-01',
        ate: ano + '-' + ('0' + fim).slice(-2) + '-' + new Date(ano, fim, 0).getDate(),
        obs: [c.escola, c.matricula ? (pt() ? 'matrícula ' : 'enrolment ') + fmt(c.matricula) : '', c.anuidade ? (pt() ? 'anuidade ' : 'yearly ') + fmt(c.anuidade) : ''].filter(Boolean).join(' · ') };
    }
  };

  /* ---------- 1.1.0: contrato da escola por MODELO (contrato escolar, período ampliado, boleto da matrícula) ---------- */
  var MESES_LONGOS = { janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };
  var NOMES_MES = '(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)';
  var DIN = '(\\d{1,3}(?:\\.\\d{3})*,\\d{2})';
  var RX_LINHA_ESC = new RegExp('r\\$ ?' + DIN + ' r\\$ ?' + DIN + ' r\\$ ?' + DIN + ' (\\d{1,2}) r\\$ ?' + DIN + '\\s*$');
  var RX_LINHA_AMP = new RegExp('r\\$ ?' + DIN + ' (\\d{1,2}) r\\$ ?' + DIN + '\\s*$');
  var RX_CABECALHO = /valor|anuidade|antecipada|restante|parcela|modalidade|curso ?\/ ?etapa|numero|n[ºo°] de|horario|^clausula/;
  var MARCA = /\(\s*x\s*\)/;
  function linhasDe(t) { return String(t || '').split(/\r?\n/).map(function (l) { return l.replace(/[ \t]+/g, ' ').trim(); }).filter(Boolean); }
  function iso2(a, m, d) { return a + '-' + ('0' + m).slice(-2) + '-' + ('0' + d).slice(-2); }
  function br2iso(t) { var m = String(t || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
  function faixas(frase) {          /* "fevereiro a junho e de agosto a dezembro" → [2..6, 8..12] */
    var out = [], rx = new RegExp(NOMES_MES + '\\s+a\\s+(?:de\\s+)?' + NOMES_MES, 'g'), m;
    while ((m = rx.exec(frase))) { for (var k = MESES_LONGOS[m[1]]; k <= MESES_LONGOS[m[2]]; k++) if (out.indexOf(k) < 0) out.push(k); }
    return out.sort(function (a, b) { return a - b; });
  }
  /* linhas da tabela: o valor fica no fim da linha; o nome da etapa pode ter quebrado na(s) linha(s) de cima */
  function linhasTabela(ls, rx) {
    var out = [];
    ls.forEach(function (l, i) {
      var m = sa(l).match(rx); if (!m) return;
      var nome = l.slice(0, m.index).trim(), j = i - 1, voltas = 0;
      while (j >= 0 && voltas < 2 && !/r\$/i.test(ls[j]) && !RX_CABECALHO.test(sa(ls[j])) && !/:/.test(ls[j])) { nome = ls[j] + ' ' + nome; j--; voltas++; }
      out.push({ nome: nome.replace(/\s+/g, ' ').trim(), m: m, marcada: MARCA.test(sa(l.slice(0, m.index))) || (voltas && MARCA.test(sa(ls[i - 1]))) });
    });
    return out;
  }
  function tipoDoTexto(s) {
    if (/parcela da anuidade[^\n]*\d,\d{2}[^\n]*\d,\d{2}/.test(s)) return 'boleto';
    if (/periodo ampliado/.test(s) && /contrato/.test(s)) return 'ampliado';
    if (/educacao escolar/.test(s) || /curso ?\/ ?etapa/.test(s)) return 'escolar';
    return '';
  }

  API.lerModelo = function (texto) {
    var t = String(texto || ''), s = sa(t), ls = linhasDe(t), tipo = tipoDoTexto(s), m;
    if (!tipo) return null;
    var o = { tipo: tipo, ano: 0, aluno: '', escola: API.lerContrato(t).escola };
    if ((m = s.match(/contrato de serv[a-z ]*?-\s*(20\d\d)/)) || (m = s.match(/ano letivo de [a-z]+ a [a-z]+ de (20\d\d)/)) || (m = s.match(/ano letivo[^\n]*?(20\d\d)/))) o.ano = Number(m[1]);
    if ((m = t.match(/nome completo\s*:\s*([A-Za-zÀ-ú]+(?:[ \t]+[A-Za-zÀ-ú]+){0,5})/i))) o.aluno = titulo(m[1]).split(' ')[0];
    else o.aluno = API.lerContrato(t).aluno;
    if (tipo === 'boleto') {
      var lb = ls.find(function (l) { return /parcela da anuidade/.test(sa(l)); }) || '', vs = lb.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) || [];
      o.bruto = vs.length >= 3 ? num(vs[vs.length - 3]) : vs.length ? num(vs[0]) : 0;
      o.desconto = vs.length >= 3 ? num(vs[vs.length - 2]) : 0;
      o.pagar = vs.length ? num(vs[vs.length - 1]) : 0;
      o.venc = (m = s.match(/vencimento\s*:?\s*(\d{2}\/\d{2}\/\d{4})/)) ? br2iso(m[1]) : '';
      if (!o.ano && o.venc) o.ano = Number(o.venc.slice(0, 4)) + 1;
      return o;
    }
    if (tipo === 'escolar') {
      var marcados = [], rxm = /\(\s*x\s*\)\s*([a-z][a-z .]*?)(?=\s*\(|\s*ano\/serie|\s*turno|\s*\/|\n|$)/g;
      while ((m = rxm.exec(s))) marcados.push(m[1].trim());
      o.curso = (marcados.join(' ').match(/infantil|fundamental|medio/) || [''])[0];
      o.turno = (marcados.join(' ').match(/manha|tarde|integral/) || [''])[0];
      o.serie = (m = s.match(/ano\/serie\s*:?\s*(\d{1,2})/)) ? Number(m[1]) : 0;
      o.opcoes = linhasTabela(ls, RX_LINHA_ESC).map(function (x) {
        return { nome: x.nome, anuidade: num(x.m[1]), antecipada: num(x.m[2]), restante: num(x.m[3]), parcelas: Number(x.m[4]), parcela: num(x.m[5]) };
      });
      var cand = o.opcoes.map(function (x, i) { return i; }).filter(function (i) { return !o.curso || sa(o.opcoes[i].nome).indexOf(o.curso) >= 0; });
      if (cand.length > 1 && o.serie) cand = cand.filter(function (i) { var r = sa(o.opcoes[i].nome).match(/(\d{1,2})\D{0,3} ao (\d{1,2})/); return r && o.serie >= Number(r[1]) && o.serie <= Number(r[2]); });
      o.escolhida = cand.length === 1 && (o.curso || o.opcoes.length === 1) ? cand[0] : -1;
      var mm = s.match(new RegExp('(\\d{1,2})\\s+mensais[^.]*?' + NOMES_MES + '\\s+a\\s+' + NOMES_MES));
      o.meses = mm ? faixas(mm[2] + ' a ' + mm[3]) : [];
      o.dia = (m = s.match(/vencive(?:is|l)[^.]{0,80}?dia (\d{1,2})/)) || (m = s.match(/vencimento[^.]{0,80}?dia (\d{1,2})/)) ? Number(m[1]) : 0;
      o.primeiroVenc = (m = s.match(/primeir[oa]\s+ocorrera\s+em\s+(\d{2}\/\d{2}\/\d{4})/)) ? br2iso(m[1]) : '';
      o.antecipadaNoAto = /ato da contratacao/.test(s);
      return o;
    }
    /* ampliado */
    o.opcoes = linhasTabela(ls, RX_LINHA_AMP).filter(function (x) { return !RX_LINHA_ESC.test(sa(x.nome + ' ' + x.m[0])); }).map(function (x) {
      return { nome: x.nome, anuidade: num(x.m[1]), parcelas: Number(x.m[2]), parcela: num(x.m[3]), marcada: !!x.marcada };
    });
    var mk = o.opcoes.map(function (x, i) { return x.marcada ? i : -1; }).filter(function (i) { return i >= 0; });
    o.escolhida = mk.length === 1 ? mk[0] : -1;           /* sem X (ou com mais de um): o app pergunta */
    var fr = s.match(/vencimento nos meses de ([^.]*)/);
    o.meses = fr ? faixas(fr[1]) : [];
    o.dia = (m = s.match(/vencimento[^.]{0,80}?dia (\d{1,2})/)) ? Number(m[1]) : 0;
    return o;
  };

  /* docs = [lerModelo(...)] → {itens: [{chave, rotulo, opcoes, escolhida, semente(i)}], gasto: {...}|null} */
  API.planoModelo = function (docs) {
    docs = (docs || []).filter(Boolean);
    var esc1 = docs.find(function (d) { return d.tipo === 'escolar'; }), amp = docs.find(function (d) { return d.tipo === 'ampliado'; }), bol = docs.find(function (d) { return d.tipo === 'boleto'; });
    var base = esc1 || amp || bol || {};
    var ano = base.ano || (amp && amp.ano) || (bol && bol.ano) || Number(hojeISO().slice(0, 4)) + 1;
    var aluno = (esc1 && esc1.aluno) || (amp && amp.aluno) || (bol && bol.aluno) || '';
    var escola = (esc1 && esc1.escola) || (amp && amp.escola) || (bol && bol.escola) || '';
    var sub = subEscola(), itens = [];
    function semente(nome, op, meses, dia, obs) {
      meses = meses.length ? meses : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      var ini = meses[0], fim = meses[meses.length - 1], fora = [];
      for (var k = ini; k <= fim; k++) if (meses.indexOf(k) < 0) fora.push(k);
      return { nome: [nome, aluno, ano].filter(Boolean).join(' '), valor: op ? op.parcela : 0, grupo: 'DEPENDENTES', sub: sub, quem: aluno, irpf: true,
        regra: 'dia', dia: dia || 10, desde: iso2(ano, ini, 1), ate: iso2(ano, fim, new Date(ano, fim, 0).getDate()), fora: fora,
        aConfirmar: true, origem: 'contrato', obs: obs.filter(Boolean).join(' · ') };
    }
    if (esc1) itens.push({ chave: 'escolar', rotulo: pt() ? 'Anuidade escolar' : 'School fees', opcoes: esc1.opcoes, escolhida: esc1.escolhida, diaInformado: !!esc1.dia,
      semente: function (i) { var op = esc1.opcoes[i]; return semente('Escola', op, esc1.meses, esc1.dia, [escola, op && op.nome, op ? (pt() ? 'anuidade ' : 'yearly ') + fmt(op.anuidade) : '',
        op && op.antecipada ? (pt() ? '1ª parcela antecipada ' : '1st instalment in advance ') + fmt(op.antecipada) : '',
        esc1.primeiroVenc ? (pt() ? '1º vencimento ' : '1st due ') + I18n.data(esc1.primeiroVenc) : '']); } });
    if (amp) itens.push({ chave: 'ampliado', rotulo: pt() ? 'Período ampliado' : 'Extended day', opcoes: amp.opcoes, escolhida: amp.escolhida, diaInformado: !!amp.dia,
      semente: function (i) { var op = amp.opcoes[i]; return semente(pt() ? 'Período ampliado' : 'Extended day', op, amp.meses, amp.dia || (esc1 && esc1.dia), [escola, op && op.nome,
        op ? (pt() ? 'anuidade ' : 'yearly ') + fmt(op.anuidade) : '', amp.dia ? '' : (pt() ? 'dia de vencimento não informado no contrato' : 'due day not in the contract')]); } });
    var gasto = null, opE = esc1 && esc1.escolhida >= 0 ? esc1.opcoes[esc1.escolhida] : null;
    if (bol || (esc1 && esc1.antecipadaNoAto && opE && opE.antecipada)) {
      var valor = bol ? bol.pagar : opE.antecipada, data = (bol && bol.venc) || hojeISO();
      gasto = { data: data, valor: valor, grupo: 'DEPENDENTES', sub: sub, quem: aluno, irpf: true, per: 'Pontual', origem: 'contrato',
        desc: (pt() ? '1ª parcela anuidade ' : '1st instalment ') + ano + (bol && bol.desconto ? (pt() ? ' (desconto ' : ' (discount ') + fmt(bol.desconto) + ')' : '') };
      gasto.jaLancado = Gasto.todos().some(function (g) { return g.fluxo === 'saida' && Math.abs(g.valor - valor) < 0.01 && Math.abs(new Date(g.data + 'T12:00:00') - new Date(data + 'T12:00:00')) <= 15 * 86400000; });
    }
    return { ano: ano, aluno: aluno, escola: escola, itens: itens, gasto: gasto };
  };

  /* ---------- prévia: confere e cria (compromissos "a confirmar" + 1ª parcela como gasto pontual) ---------- */
  var plano = null, guardar = [];
  function mostrarPlano() {
    if (!plano) return;
    var h = '<p class="small muted">' + esc(pt() ? 'O app leu o contrato pelo modelo, sem IA. Confira: os compromissos entram marcados "a confirmar", com os meses certos e "Entra no imposto de renda".'
      : 'Read by template, no AI. Check: commitments are created marked "to confirm", with the right months and the tax flag.') + '</p>';
    plano.itens.forEach(function (it, k) {
      var s0 = it.semente(it.escolhida >= 0 ? it.escolhida : 0);
      h += '<div class="cdl-item card" data-k="' + k + '"><label class="linha-check"><input type="checkbox" class="cdl-criar" checked> <b>' + esc(it.rotulo) + '</b></label>';
      if (it.opcoes.length > 1 || it.escolhida < 0) {
        h += campo(it.escolhida < 0 ? (pt() ? 'Qual opção vocês contrataram? (o contrato não marcou)' : 'Which option did you sign up for? (not marked)') : (pt() ? 'Opção' : 'Option'),
          '<select class="cdl-op"><option value="">' + (pt() ? '— escolha —' : '— choose —') + '</option>' + it.opcoes.map(function (o, i) {
            return '<option value="' + i + '"' + (i === it.escolhida ? ' selected' : '') + '>' + esc(o.nome + ' · ' + o.parcelas + ' × ' + fmt(o.parcela)) + '</option>'; }).join('') +
          '<option value="nao">' + (pt() ? 'Não contratamos' : 'We did not sign up') + '</option></select>');
      } else h += '<div class="small">' + esc(it.opcoes[0] ? it.opcoes[0].nome + ' · ' + it.opcoes[0].parcelas + ' × ' + fmt(it.opcoes[0].parcela) : '') + '</div>';
      var mesesTxt = s0.fora.length ? (pt() ? 'sem parcela em ' : 'no instalment in ') + s0.fora.map(function (m) { return I18n.mesCurto(m); }).join(', ') : '';
      h += '<div class="small muted">' + esc([s0.nome, I18n.data(s0.desde) + (pt() ? ' a ' : ' to ') + I18n.data(s0.ate), mesesTxt].filter(Boolean).join(' · ')) + '</div>' +
        '<div class="grid g2">' + campo(pt() ? 'Vence todo dia' : 'Due every', '<input type="number" class="cdl-dia" min="1" max="31" value="' + s0.dia + '">' +
          (it.diaInformado ? '' : '<div class="tiny muted">' + (pt() ? 'o contrato não diz o dia: confira' : 'not in the contract: check') + '</div>')) +
        '<label class="linha-check"><input type="checkbox" class="cdl-ir" checked> ' + (pt() ? 'Entra no imposto de renda' : 'Tax deductible') + '</label></div></div>';
    });
    if (plano.gasto) {
      var g = plano.gasto;
      h += '<div class="cdl-gasto card"><label class="linha-check"><input type="checkbox" id="cdlGasto"' + (g.jaLancado ? '' : ' checked') + '> <b>' + esc(pt() ? 'Lançar a 1ª parcela (gasto pontual)' : 'Add the 1st instalment (one-off)') + '</b></label>' +
        (g.jaLancado ? '<div class="tiny muted">' + esc(pt() ? 'Parece que já foi lançado (mesmo valor perto dessa data).' : 'Looks already entered (same amount near that date).') + '</div>' : '') +
        '<div class="grid g2">' + campo(pt() ? 'Data' : 'Date', Cal.campo('cdlGData', g.data, {})) +
        campo(pt() ? 'Valor (R$)' : 'Amount (R$)', '<input type="number" id="cdlGValor" min="0" step="0.01" value="' + g.valor + '">') + '</div>' +
        '<div class="small muted">' + esc(g.desc) + '</div></div>';
    }
    h += '<div class="f-actions"><button class="btn" data-close="genModal">' + esc(t('ac.cancelar')) + '</button><button class="btn primary" data-acao="cdl-criar">' + (pt() ? 'Criar' : 'Create') + '</button></div>';
    $('#genTitle').textContent = pt() ? 'Conferir o contrato' : 'Check the contract';
    $('#genBody').innerHTML = Verter.html(h);
    abrir('genModal');
  }
  async function criarPlano() {
    if (!plano) return;
    var criados = [], falta = '';
    document.querySelectorAll('#genBody .cdl-item').forEach(function (el) {
      var it = plano.itens[Number(el.dataset.k)]; if (!el.querySelector('.cdl-criar').checked) return;
      var sel = el.querySelector('.cdl-op'), i = sel ? sel.value : String(it.escolhida >= 0 ? it.escolhida : 0);
      if (i === 'nao') return;
      if (i === '') { falta = it.rotulo; return; }
      var s = it.semente(Number(i));
      s.dia = Math.min(31, Math.max(1, Number(el.querySelector('.cdl-dia').value) || s.dia));
      s.irpf = el.querySelector('.cdl-ir').checked;
      criados.push(s);
    });
    if (falta) { toast((pt() ? 'Escolha a opção de "' : 'Choose the option for "') + falta + (pt() ? '" (ou "Não contratamos").' : '" (or "We did not sign up").'), 'warn'); return; }
    var ids = criados.map(function (s) { return Recorrente.add(s).id; });
    var ck = document.getElementById('cdlGasto'), ng = 0;
    if (plano.gasto && ck && ck.checked) {
      var g = Object.assign({}, plano.gasto); delete g.jaLancado;
      g.data = (document.getElementById('cdlGData') || {}).value || g.data; g.valor = Number((document.getElementById('cdlGValor') || {}).value) || g.valor;
      if (g.valor > 0) { Gasto.add(g); ng = 1; }
    }
    for (var k = 0; k < guardar.length; k++) {
      try { await ArquivosFamilia.guardar({ nome: guardar[k].nome, tipo: guardar[k].tipo, ano: plano.ano, ligado: ids[0] || '' }, guardar[k].bytes); } catch (e) {}
    }
    plano = null; guardar = []; Store.salvar(); fechar('genModal'); render();
    toast(pt() ? ids.length + (ids.length === 1 ? ' compromisso criado' : ' compromissos criados') + ', marcados "a confirmar"' + (ng ? ' · 1ª parcela lançada' : '') + '.'
               : ids.length + ' commitment(s) created, marked "to confirm"' + (ng ? ' · 1st instalment added' : '') + '.');
  }
  async function lerArquivos(arqs) {
    var tarefa = 'cdl-ler-' + Date.now(), temFundo = typeof Fundo !== 'undefined', docs = [], generico = null;
    guardar = [];
    if (temFundo) Fundo.comecar({ id: tarefa, titulo: pt() ? 'Lendo o contrato…' : 'Reading the contract…', aoAbrir: mostrarPlano });
    for (var k = 0; k < arqs.length; k++) {
      var a = arqs[k]; if (temFundo) Fundo.passo(tarefa, (pt() ? 'Lendo ' : 'Reading ') + a.name, k / arqs.length);
      var txt = ''; try { txt = await PdfTexto.extrair(a, { linhas: true, aceitaVazio: true }); } catch (e) { txt = ''; }
      var bytes = new Uint8Array(await a.arrayBuffer()), d = API.lerModelo(txt);
      if (d) docs.push(d); else if (!generico) generico = { a: a, txt: txt, bytes: bytes };
      guardar.push({ nome: hojeISO() + ' ' + (d && d.tipo === 'boleto' ? 'Boleto ' : 'Contrato ') + a.name.replace(/\.pdf$/i, '') + '.pdf', tipo: d && d.tipo === 'boleto' ? 'boleto' : 'contrato', bytes: bytes });
    }
    if (temFundo) Fundo.terminar(tarefa, (pt() ? 'Contrato lido' : 'Contract read'));
    if (docs.length) { plano = API.planoModelo(docs); return mostrarPlano(); }
    /* nenhum modelo conhecido: o leitor genérico de antes */
    var g0 = generico; if (!g0) return;
    var c = API.lerContrato(g0.txt), sem = API.sementeContrato(c);
    try { await ArquivosFamilia.guardar({ nome: hojeISO() + ' Contrato ' + (c.escola || g0.a.name.replace(/\.pdf$/i, '')) + '.pdf', tipo: 'contrato', ano: Number(sem.desde.slice(0, 4)) }, g0.bytes); } catch (e) {}
    guardar = [];
    abrirRecorrente(null, sem, { abrirMais: true });
    toast(g0.txt ? (pt() ? 'Contrato lido: confira os campos e salve.' : 'Contract read: check and save.') : (pt() ? 'Este PDF não tem texto (é imagem): preencha à mão.' : 'This PDF has no text: fill in by hand.'), g0.txt ? '' : 'warn');
  }

  MoneyModulos.registrar({
    id: 'compromisso-de',
    versao: '1.1.0',
    pontos: {
      'lancamento.form': function (ctx) {
        if (!ctx.g || ctx.g.fluxo === 'entrada' && ctx.g.grupo !== 'RENDA') return '';
        return '<div class="row" style="margin:4px 0 10px"><button type="button" class="btn sm" data-acao="cdl-lanc" data-id="' + esc(ctx.g.id) + '">📌 ' + (pt() ? 'Virar compromisso' : 'Make it a commitment') + '</button></div>';
      },
      'custos.topo': function () {
        return '<div class="row" style="gap:8px;margin:0 0 12px;flex-wrap:wrap"><button class="btn sm" data-acao="cdl-contrato">📄 ' + (pt() ? 'Compromisso de um contrato (PDF)' : 'Commitment from a contract (PDF)') + '</button></div>';
      }
    },
    acoes: {
      'cdl-lanc': function (el) {
        var g = Gasto.todos().find(function (x) { return x.id === el.dataset.id; }); if (!g) return;
        fechar('assetModal'); abrirRecorrente(null, API.doLancamento(g), { abrirMais: true });
      },
      'cdl-contrato': function () {
        var i = document.createElement('input'); i.type = 'file'; i.accept = 'application/pdf,.pdf'; i.multiple = true; i.style.display = 'none';
        i.addEventListener('change', function () {
          var l = Array.from(i.files || []); if (i.parentNode) i.parentNode.removeChild(i);
          if (l.length) lerArquivos(l).catch(function (e) { toast(e.message, 'err'); });
        });
        document.body.appendChild(i); i.click();
      },
      'cdl-criar': function () { criarPlano().catch(function (e) { toast(e.message, 'err'); }); }
    }
  });
  window.CompromissoDe = API;
})();
