/* =====================================================================
   modulos/compromisso-de.js — compromisso a partir de um lançamento ou de um contrato (PDF)   1.4.0 · 06/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     · No formulário de um lançamento: "📌 Virar compromisso" abre o "Novo compromisso" já preenchido
       (nome, valor, grupo, categoria, pessoa, IR, dia do mês, desde a data do lançamento).
     · Em Custos: "📄 Compromisso de um contrato (PDF)" lê o contrato SEM IA, por modelo — escola
       e genérico: nome da escola/empresa, aluno, ano letivo, valor da
       parcela, número de parcelas, dia de vencimento, matrícula — e abre o "Novo compromisso"
       preenchido para a pessoa conferir. O PDF fica guardado fechado (ArquivosFamilia, tipo 'contrato').
     · 1.1.0: contrato da escola por MODELO (pode escolher vários PDFs de uma vez): "Contrato de serviços de
       educação escolar" (linha da tabela da etapa marcada com X, 12 mensais, dia de vencimento), "Contrato do
       período ampliado" (opção marcada com X; sem X o app pergunta; meses sem julho) e o boleto da matrícula
       ("1ª Parcela da Anuidade": bruto, desconto, a pagar, vencimento). Mostra uma prévia e cria os compromissos
       "a confirmar" (meses de fora, IR) e a 1ª parcela como gasto pontual (desmarcado se já parece lançado).
     · 1.2.0 (texto real, pdftotext -layout): o complemento "(1º ao 5º ano)" / "(5x na semana)" vem na linha DE BAIXO
       dos valores e completa o nome DESSA linha; linha de valores sem nome herda a etapa de cima; o horário sai do nome.
       Aluno = "Nome do Aluno:" ou o 1º "Nome Completo:" depois de "Informações do(a) educando(a)" (nunca pai/mãe).
       Etapa marcada com X: só as linhas dela; a série ("Ano/Série" ou "3º Ano" no outro contrato) pré-seleciona.
     · 1.3.0: a tabela é lida em BLOCOS (layout exato do texto real): o nome vem nas linhas ACIMA dos valores, com horários e
       "Opcional" no meio, e o complemento "(…)" na linha de baixo. Fixture literal em teste/teste-contrato-fgts.js.
     · 1.3.1: linha só com palavras de cabeçalho ("Anuidade   Parcelas   Parcela") não entra no nome.
     · 1.4.0: boleto de banco (rótulos em colunas: "Valor do documento", "Desconto", "Valor cobrado/a pagar",
       vencimento na linha de baixo); com boleto no lote vale o valor a pagar e o vencimento dele; o gasto se chama
       "Matrícula AAAA (1ª parcela da anuidade)" e o nome é editável. "Já está no livro" (jaLancado): mesmo valor
       e até 15 dias, ou nome da escola/beneficiário parecido e até 45 dias → vem desmarcado e mostra o lançamento.
       "Já existe" (jaExistem): compromisso do mesmo aluno e nome parecido no mesmo período → vem desmarcado, com
       "manter como está", "atualizar <o existente>" (valor, dia informado, IR, a confirmar) ou "criar mesmo assim".
       Depois de Criar, "↩ Desfazer" por 5 minutos.
   API (window.CompromissoDe)
     doLancamento(g)        → semente do compromisso
     lerContrato(texto)     → {escola, aluno, ano, parcela, parcelas, dia, matricula, anuidade, primeiroMes, achados:[…]}
     sementeContrato(c)     → semente do compromisso (Escola <aluno> <ano>, Dependentes, IR, meses certos)
     lerModelo(texto)       → null | {tipo:'escolar'|'ampliado'|'boleto', ano, aluno, escola, opcoes:[{nome, anuidade, parcelas, parcela…}],
                              escolhida (-1 = perguntar), meses:[1..12], dia, primeiroVenc | bruto, desconto, pagar, venc}
     planoModelo([docs])    → {ano, aluno, escola, itens:[{chave, rotulo, opcoes, escolhida, semente(i)}], gasto|null}
     jaLancado(valor, data, nomes) → lançamento | null · jaExistem(semente) → [compromisso] · desfazer({recorrentes, antes, gastos})
     mostrarPlano(plano)    → abre a prévia de um plano já lido
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
  var RX_CABECALHO = /valor da|valor de cada|valor restante|curso ?\/ ?etapa|modalidade|n[ºo°] de parcelas|numero de parcela|^clausula/;   /* "Horário Estendido" é nome, não cabeçalho */
  var MARCA = /\(\s*x\s*\)/;
  function linhasDe(t) { return String(t || '').split(/\r?\n/).map(function (l) { return l.replace(/[ \t]+/g, ' ').trim(); }).filter(Boolean); }
  function iso2(a, m, d) { return a + '-' + ('0' + m).slice(-2) + '-' + ('0' + d).slice(-2); }
  function br2iso(t) { var m = String(t || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
  function faixas(frase) {          /* "fevereiro a junho e de agosto a dezembro" → [2..6, 8..12] */
    var out = [], rx = new RegExp(NOMES_MES + '\\s+a\\s+(?:de\\s+)?' + NOMES_MES, 'g'), m;
    while ((m = rx.exec(frase))) { for (var k = MESES_LONGOS[m[1]]; k <= MESES_LONGOS[m[2]]; k++) if (out.indexOf(k) < 0) out.push(k); }
    return out.sort(function (a, b) { return a - b; });
  }
  /* linhas da tabela (texto do pdftotext -layout), em BLOCOS: o bloco começa nas linhas de nome (sem "R$") acima dos
     valores, junta "Opcional" e os horários, passa pela linha dos valores e termina na linha "(…)" logo depois deles.
     Nome = nome-base + (complemento): "Ens. Fundamental" + "(1º ao 5º ano)"; "Horário Estendido – Opcional" + "(5x na semana)"
     → "Horário Estendido (5x na semana)". Os horários (8h30 às 13h…) saem do nome e ficam em `horario`. Linha de valores sem
     nome nenhum herda o nome-base de cima. Linha com "R$" que não é de valores completos (ex.: "Diária Avulsa - - R$ 110") é ignorada. */
  var RX_HORA = /\b\d{1,2}h\d{0,2}\s*(?:às|as|a)\s*\d{1,2}h\d{0,2}\b/gi;
  /* linha que só tem palavras de cabeçalho ("Valor da   Nº de   Valor da", "Anuidade   Parcelas   Parcela"): não é nome */
  var PALAVRAS_CAB = { valor: 1, da: 1, de: 1, do: 1, anuidade: 1, 'nº': 1, 'n°': 1, no: 1, n: 1, numero: 1, parcelas: 1, parcela: 1, modalidade: 1, horario: 1,
    curso: 1, etapa: 1, antecipada: 1, restante: 1, cada: 1, '1ª': 1, '1a': 1, '/': 1, '|': 1 };
  function soCabecalho(sl) { var w = sl.replace(/[|]/g, ' ').trim().split(/\s+/); return !!w[0] && w.every(function (x) { return PALAVRAS_CAB[x]; }); }
  function semHoras(t) { return String(t || '').replace(RX_HORA, ' ').replace(/\s+/g, ' ').trim(); }
  function horasDe(t) { return (String(t || '').match(RX_HORA) || []); }
  function limparBase(t) { return semHoras(t).replace(/\(\s*[xX]?\s*\)/g, ' ').replace(/\s*[–—-]?\s*\bopcional\b/gi, ' ').replace(/\s*[–—-]\s*$/, '').replace(/\s+/g, ' ').trim(); }
  function linhasTabela(ls, rx) {
    var out = [], base = '', pend = [], marcPend = false;
    for (var i = 0; i < ls.length; i++) {
      var l = ls[i], sl = sa(l), m = sl.match(rx);
      if (!m) {
        if (/r\$/i.test(l) || /:/.test(l) || RX_CABECALHO.test(sl) || soCabecalho(sl) || l.length > 60) { pend = []; marcPend = false; continue; }
        if (/^\(/.test(l) && !MARCA.test(sl.slice(0, 5))) { pend = []; marcPend = false; continue; }   /* "(…)" solto: não é começo de bloco */
        pend.push(l); if (pend.length > 4) pend.shift(); marcPend = marcPend || MARCA.test(sl);
        continue;
      }
      var pre = l.slice(0, m.index).trim(), partes = pend.concat(pre ? [pre] : []), horas = [];
      partes.forEach(function (x) { horas = horas.concat(horasDe(x)); });
      var marc = marcPend || MARCA.test(sa(pre)), nomeBase = limparBase(partes.join(' ')), comp = '';
      if (nomeBase && nomeBase.charAt(0) !== '(') base = nomeBase;
      else if (nomeBase) { comp = nomeBase; }                      /* "(3x na semana) R$ …" na mesma linha */
      /* depois dos valores: horários soltos e o complemento "(…)" */
      for (var j = i + 1; j < ls.length && j <= i + 3; j++) {
        var n = ls[j];
        if (!semHoras(n)) { horas = horas.concat(horasDe(n)); i = j; continue; }
        if (/^\(/.test(n) && !/r\$/i.test(n)) {
          var pm = n.match(/^\([^)]*\)/); comp = (comp + ' ' + pm[0]).trim(); horas = horas.concat(horasDe(n.slice(pm[0].length)));
          marc = marc || MARCA.test(sa(n)); i = j;
        }
        break;
      }
      out.push({ nome: (base + ' ' + comp).replace(/\(\s*[xX]\s*\)/g, ' ').replace(/\s+/g, ' ').trim(), horario: horas.join(' / '), m: m, marcada: marc });
      pend = []; marcPend = false;
    }
    return out;
  }
  /* a etapa marcada com X: só as linhas dela; a série (deste ou de outro documento do lote) pré-seleciona */
  function escolherEtapa(opcoes, curso, serie) {
    var lista = opcoes.map(function (x, i) { return i; }).filter(function (i) { return !curso || sa(opcoes[i].nome).indexOf(curso) >= 0; });
    if (!lista.length) lista = opcoes.map(function (x, i) { return i; });
    var idx = lista.length === 1 ? 0 : -1;
    if (lista.length > 1 && serie) lista.forEach(function (i, k) { var r = sa(opcoes[i].nome).match(/(\d{1,2})\D{0,3} ao (\d{1,2})/); if (r && serie >= Number(r[1]) && serie <= Number(r[2])) idx = k; });
    return { lista: lista, idx: idx };
  }
  /* o aluno: na parte "Informações do(a) educando(a)", o "Nome do Aluno:" ou o PRIMEIRO "Nome Completo:" (os outros são dos responsáveis) */
  function acharAluno(t) {
    var i = t.search(/informa[çc][õo]es\s+d[oa]\s*\(?a?\)?\s*educand[oa]/i), parte = i >= 0 ? t.slice(i) : t, m;
    m = parte.match(/nome\s+do\s*\(?a?\)?\s*alun[oa]\s*(?:\(a\))?\s*:[ \t]*([A-Za-zÀ-ÿ]+)/i) || parte.match(/nome\s+completo\s*:[ \t]*([A-Za-zÀ-ÿ]+)/i);
    return m ? titulo(m[1]) : '';
  }
  function tipoDoTexto(s) {
    if (/parcela da anuidade[^\n]*\d,\d{2}[^\n]*\d,\d{2}/.test(s)) return 'boleto';
    if (/periodo ampliado/.test(s) && /contrato/.test(s)) return 'ampliado';
    if (/educacao escolar/.test(s) || /curso ?\/ ?etapa/.test(s)) return 'escolar';
    /* 1.4.0: boleto de banco (rótulos em colunas): linha digitável ou "valor do documento/cobrado/a pagar" + vencimento */
    if (/vencimento/.test(s) && (/valor (?:do documento|cobrado|a pagar|total a pagar)/.test(s) || /\d{5}\.?\d{5} ?\d{5}\.?\d{6} ?\d{5}\.?\d{6} ?\d ?\d{14}/.test(s))) return 'boleto';
    return '';
  }
  /* o primeiro valor "1.413,00" depois do rótulo (na mesma linha ou nas de baixo, como no -layout) */
  function valorDepois(s, rx) { var m = s.match(new RegExp(rx.source + '[^\\d]{0,80}?(\\d{1,3}(?:\\.\\d{3})*,\\d{2})')); return m ? num(m[1]) : 0; }

  API.lerModelo = function (texto) {
    var t = String(texto || ''), s = sa(t).replace(/[ \t]+/g, ' '), ls = linhasDe(t), tipo = tipoDoTexto(s), m;
    if (!tipo) return null;
    var o = { tipo: tipo, ano: 0, aluno: '', escola: API.lerContrato(t).escola };
    if ((m = s.match(/contrato de serv[a-z ]*?-\s*(20\d\d)/)) || (m = s.match(/ano letivo de [a-z]+ a [a-z]+ de (20\d\d)/)) || (m = s.match(/ano letivo[^\n]*?(20\d\d)/))) o.ano = Number(m[1]);
    o.aluno = acharAluno(t) || API.lerContrato(t).aluno;
    if (tipo === 'boleto') {
      var lb = ls.find(function (l) { return /parcela da anuidade/.test(sa(l)) && /\d,\d{2}/.test(l); }) || '', vs = lb.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) || [];
      o.bruto = vs.length >= 3 ? num(vs[vs.length - 3]) : vs.length ? num(vs[0]) : 0;
      o.desconto = vs.length >= 3 ? num(vs[vs.length - 2]) : 0;
      o.pagar = vs.length ? num(vs[vs.length - 1]) : 0;
      /* a linha da tabela ("1ª Parcela da Anuidade … bruto  descontos  a pagar") é a fonte mais segura e ganha.
         Sem ela, os rótulos do boleto de banco: "Valor do Documento" aparece mais de uma vez (no boleto real, com o
         valor a pagar E com o bruto), então "a pagar" = "Valor a pagar/cobrado" se tiver número, senão documento − desconto. */
      if (vs.length < 3) {
        var vPagar = valorDepois(s, /valor (?:total )?(?:a pagar|cobrado)/), vDoc = valorDepois(s, /valor do documento/), vDesc = valorDepois(s, /desconto/);
        if (vDoc) o.bruto = vDoc;
        if (vDesc && vDesc < (o.bruto || Infinity)) o.desconto = vDesc;
        if (vPagar) o.pagar = vPagar;
        else if (o.bruto) o.pagar = Math.round((o.bruto - (o.desconto || 0)) * 100) / 100;
      }
      /* vencimento: a data logo abaixo do rótulo "Vencimento" (coluna do boleto), nunca a "Data do Documento";
         "após o vencimento" (instrução de multa) não é rótulo */
      o.venc = '';
      for (var iv = 0; iv < ls.length && !o.venc; iv++) {
        var sl = sa(ls[iv]);
        if (!/\bvencimento\b/.test(sl) || /apos o vencimento|ate o vencimento|vencimento[^a-z]*cobrar/.test(sl)) continue;
        var naMesma = sl.match(/vencimento\D{0,20}(\d{2}\/\d{2}\/\d{4})/);
        if (naMesma) { o.venc = br2iso(naMesma[1]); break; }
        for (var jv = iv + 1; jv <= iv + 2 && jv < ls.length; jv++) { var d = ls[jv].match(/(\d{2}\/\d{2}\/\d{4})/); if (d) { o.venc = br2iso(d[1]); break; } }
      }
      if (!o.venc) o.venc = (m = s.match(/vencimento\s*:?\s*(\d{2}\/\d{2}\/\d{4})/)) ? br2iso(m[1]) : '';
      o.serie = (m = s.match(/\b(\d{1,2})\s?[ºo°]\s?ano\b/)) ? Number(m[1]) : 0;     /* "Série / Turma 3º Ano" também ajuda a escolher a etapa */
      o.benef = (m = t.match(/benefici[aá]rio\s*:?[ \t]*([^\n]{3,80})/i)) ? m[1].replace(/\b(?:cnpj|cpf)\b.*$/i, '').replace(/[\d.\/-]{11,}.*$/, '').trim() : '';
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
      var ee = escolherEtapa(o.opcoes, o.curso, o.serie);
      o.escolhida = ee.idx >= 0 ? ee.lista[ee.idx] : -1;
      var mm = s.match(new RegExp('(\\d{1,2})\\s+mensais[\\s\\S]{0,160}?' + NOMES_MES + '\\s+a\\s+' + NOMES_MES));
      o.meses = mm ? faixas(mm[2] + ' a ' + mm[3]) : [];
      o.dia = (m = s.match(/vencive(?:is|l)\D{0,60}?dia\s+(\d{1,2})/)) || (m = s.match(/vencimento\D{0,60}?dia\s+(\d{1,2})/)) ? Number(m[1]) : 0;
      o.primeiroVenc = (m = s.match(/primeir[oa]\s+ocorrera\s+em\s+(\d{2}\/\d{2}\/\d{4})/)) ? br2iso(m[1]) : '';
      o.antecipadaNoAto = /ato da contratacao/.test(s);
      return o;
    }
    /* ampliado */
    o.opcoes = linhasTabela(ls, RX_LINHA_AMP).filter(function (x) { return !RX_LINHA_ESC.test(sa(x.nome + ' ' + x.m[0])); }).map(function (x) {
      return { nome: x.nome, horario: x.horario, anuidade: num(x.m[1]), parcelas: Number(x.m[2]), parcela: num(x.m[3]), marcada: !!x.marcada };
    });
    var mk = o.opcoes.map(function (x, i) { return x.marcada ? i : -1; }).filter(function (i) { return i >= 0; });
    o.escolhida = mk.length === 1 ? mk[0] : -1;           /* sem X (ou com mais de um): o app pergunta */
    var fr = s.match(/vencimento nos meses de ([^.]*)/);
    o.meses = fr ? faixas(fr[1]) : [];
    o.dia = (m = s.match(/vencimento\D{0,60}?dia\s+(\d{1,2})/)) ? Number(m[1]) : 0;
    o.serie = (m = s.match(/\b(\d{1,2})\s?[ºo°]\s?ano\b/)) ? Number(m[1]) : 0;     /* "3º Ano": ajuda a escolher a etapa do contrato escolar */
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
    var etapa = esc1 ? escolherEtapa(esc1.opcoes, esc1.curso, esc1.serie || (amp && amp.serie) || (bol && bol.serie) || 0) : null;
    var opsE = etapa ? etapa.lista.map(function (i) { return esc1.opcoes[i]; }) : [];
    if (esc1) itens.push({ chave: 'escolar', rotulo: pt() ? 'Anuidade escolar' : 'School fees', opcoes: opsE, escolhida: etapa.idx, diaInformado: !!esc1.dia,
      semente: function (i) { var op = opsE[i]; return semente('Escola', op, esc1.meses, esc1.dia, [escola, op && op.nome, op ? (pt() ? 'anuidade ' : 'yearly ') + fmt(op.anuidade) : '',
        op && op.antecipada ? (pt() ? '1ª parcela antecipada ' : '1st instalment in advance ') + fmt(op.antecipada) : '',
        esc1.primeiroVenc ? (pt() ? '1º vencimento ' : '1st due ') + I18n.data(esc1.primeiroVenc) : '']); } });
    if (amp) itens.push({ chave: 'ampliado', rotulo: pt() ? 'Período ampliado' : 'Extended day', opcoes: amp.opcoes, escolhida: amp.escolhida, diaInformado: !!amp.dia,
      semente: function (i) { var op = amp.opcoes[i]; return semente(pt() ? 'Período ampliado' : 'Extended day', op, amp.meses, amp.dia || (esc1 && esc1.dia), [escola, op && op.nome, op && op.horario,
        op ? (pt() ? 'anuidade ' : 'yearly ') + fmt(op.anuidade) : '', amp.dia ? '' : (pt() ? 'dia de vencimento não informado no contrato' : 'due day not in the contract')]); } });
    var gasto = null, opE = etapa && etapa.idx >= 0 ? opsE[etapa.idx] : null;
    if (bol || (esc1 && esc1.antecipadaNoAto && opE && opE.antecipada)) {
      /* 1.4.0: com boleto no lote, vale o que o boleto diz: valor a pagar (com o desconto) e o vencimento dele */
      var valor = bol && bol.pagar ? bol.pagar : (opE ? opE.antecipada : 0), data = (bol && bol.venc) || hojeISO();
      gasto = { data: data, valor: valor, grupo: 'DEPENDENTES', sub: sub, quem: aluno, irpf: true, per: 'Pontual', origem: 'contrato',
        desc: (pt() ? 'Matrícula ' + ano + ' (1ª parcela da anuidade)' : 'Enrolment ' + ano + ' (1st instalment)'),
        obs: bol && bol.desconto ? (pt() ? 'valor do documento ' : 'document amount ') + fmt(bol.bruto) + (pt() ? ', desconto ' : ', discount ') + fmt(bol.desconto) : '' };
      gasto.jaLancado = API.jaLancado(valor, data, [escola, bol && bol.benef].filter(Boolean).join(' '));
    }
    return { ano: ano, aluno: aluno, escola: escola, itens: itens, gasto: gasto };
  };
  /* palavras que contam de um nome (4+ letras, sem acento, sem palavras de banco e de empresa) */
  var NAO_CONTA = { ltda: 1, pagamento: 1, boleto: 1, enviado: 1, compra: 1, debito: 1, credito: 1, transferencia: 1, para: 1, servicos: 1, educacionais: 1 };
  function palavrasNome(t) { return sa(t).replace(/[^a-z ]/g, ' ').split(/\s+/).filter(function (w) { return w.length >= 4 && !NAO_CONTA[w]; }); }
  /* o pagamento já está no livro (o robô ou o extrato trouxe)? mesmo valor e até 15 dias; ou mesmo valor, nome da escola
     parecido e até 45 dias. Devolve o lançamento (para mostrar) ou null. */
  API.jaLancado = function (valor, data, nomes) {
    var alvo = palavrasNome(nomes), d0 = new Date(data + 'T12:00:00');
    return Gasto.todos().find(function (g) {
      if (g.fluxo !== 'saida' || Math.abs(g.valor - valor) >= 0.01 || !g.data) return false;
      var dd = Math.abs(new Date(g.data + 'T12:00:00') - d0) / 86400000;
      if (dd <= 15) return true;
      var w = palavrasNome([g.desc, g.sub].join(' '));
      return dd <= 45 && alvo.some(function (x) { return w.indexOf(x) >= 0; });
    }) || null;
  };
  /* o compromisso já existe? mesmo grupo, período que se cruza e nome parecido (uma palavra de 4+ letras em comum,
     sem contar o ano e o nome do aluno) com o mesmo aluno no nome ou em "para quem é" */
  API.jaExistem = function (sem) {
    var alunoW = palavrasNome(sem.quem), w0 = palavrasNome(sem.nome).filter(function (x) { return alunoW.indexOf(x) < 0; });
    return Recorrente.todos().filter(function (r) {
      if (r.ativo === false || r.grupo !== sem.grupo) return false;
      if ((r.desde && r.desde > sem.ate) || (r.ate && r.ate < sem.desde)) return false;
      var w = palavrasNome(r.nome), mesmoAluno = !alunoW.length || alunoW.some(function (x) { return w.indexOf(x) >= 0; }) || sa(r.quem).trim() === sa(sem.quem).trim();
      return mesmoAluno && w0.some(function (x) { return w.indexOf(x) >= 0; });
    });
  };

  /* ---------- prévia: confere e cria (compromissos "a confirmar" + 1ª parcela como gasto pontual) ---------- */
  var plano = null, guardar = [];
  function mostrarPlano() {
    if (!plano) return;
    var h = '<p class="small muted">' + esc(pt() ? 'O app leu o contrato pelo modelo, sem IA. Confira: os compromissos entram marcados "a confirmar", com os meses certos e "Entra no imposto de renda".'
      : 'Read by template, no AI. Check: commitments are created marked "to confirm", with the right months and the tax flag.') + '</p>';
    plano.itens.forEach(function (it, k) {
      var s0 = it.semente(it.escolhida >= 0 ? it.escolhida : 0), ja = API.jaExistem(s0);
      h += '<div class="cdl-item card" data-k="' + k + '"><label class="linha-check"><input type="checkbox" class="cdl-criar"' + (ja.length ? '' : ' checked') + '> <b>' + esc(it.rotulo) + '</b></label>';
      if (ja.length) h += '<div class="aviso-box small cdl-ja"><b>' + esc(pt() ? 'Já existe: ' : 'Already exists: ') + esc(ja.map(function (r) { return r.nome + ' (' + fmt(r.valor) + ', ' + (pt() ? 'dia ' : 'day ') + r.dia + ')'; }).join(' · ')) + '</b>' +
        '<div class="row" style="gap:12px;flex-wrap:wrap;margin-top:6px">' +
        '<label class="linha-check"><input type="radio" name="cdlJa' + k + '" value="" checked> ' + (pt() ? 'manter como está' : 'keep as is') + '</label>' +
        ja.map(function (r) { return '<label class="linha-check"><input type="radio" name="cdlJa' + k + '" value="' + esc(r.id) + '"> ' + esc((pt() ? 'atualizar "' : 'update "') + r.nome + '"') + '</label>'; }).join('') +
        '<label class="linha-check"><input type="radio" name="cdlJa' + k + '" value="criar"> ' + (pt() ? 'criar mesmo assim' : 'create anyway') + '</label></div></div>';
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
      var jl = g.jaLancado;
      h += '<div class="cdl-gasto card"><label class="linha-check"><input type="checkbox" id="cdlGasto"' + (jl ? '' : ' checked') + '> <b>' + esc(pt() ? 'Lançar a 1ª parcela (gasto pontual)' : 'Add the 1st instalment (one-off)') + '</b></label>' +
        (jl ? '<div class="aviso-box small cdl-jalancado">' + esc((pt() ? 'Já está no livro: ' : 'Already in your book: ') + I18n.data(jl.data) + ' · ' + (jl.desc || jl.sub) + ' · ' + fmt(jl.valor) + (pt() ? '. Por isso veio desmarcado.' : '. That is why it is unticked.')) + '</div>' : '') +
        campo(pt() ? 'Nome do lançamento' : 'Entry name', '<input id="cdlGDesc" maxlength="80" value="' + esc(g.desc) + '">') +
        '<div class="grid g2">' + campo(pt() ? 'Data' : 'Date', Cal.campo('cdlGData', g.data, {})) +
        campo(pt() ? 'Valor (R$)' : 'Amount (R$)', '<input type="number" id="cdlGValor" min="0" step="0.01" value="' + g.valor + '">') + '</div>' +
        (g.obs ? '<div class="small muted">' + esc(g.obs) + '</div>' : '') + '</div>';
    }
    h += '<div class="f-actions"><button class="btn" data-close="genModal">' + esc(t('ac.cancelar')) + '</button><button class="btn primary" data-acao="cdl-criar">' + (pt() ? 'Criar' : 'Create') + '</button></div>';
    $('#genTitle').textContent = pt() ? 'Conferir o contrato' : 'Check the contract';
    $('#genBody').innerHTML = Verter.html(h);
    abrir('genModal');
  }
  async function criarPlano() {
    if (!plano) return;
    var criados = [], atualizar = [], falta = '';
    document.querySelectorAll('#genBody .cdl-item').forEach(function (el) {
      var it = plano.itens[Number(el.dataset.k)], ja = el.querySelector('input[name="cdlJa' + el.dataset.k + '"]:checked'), modo = ja ? ja.value : '';
      if (!el.querySelector('.cdl-criar').checked && !(ja && modo)) return;
      var sel = el.querySelector('.cdl-op'), i = sel ? sel.value : String(it.escolhida >= 0 ? it.escolhida : 0);
      if (i === 'nao') return;
      if (i === '') { falta = it.rotulo; return; }
      var s = it.semente(Number(i));
      s.dia = Math.min(31, Math.max(1, Number(el.querySelector('.cdl-dia').value) || s.dia));
      s.irpf = el.querySelector('.cdl-ir').checked;
      if (ja && modo && modo !== 'criar') atualizar.push({ id: modo, s: s, diaInformado: it.diaInformado });
      else criados.push(s);
    });
    if (falta) { toast((pt() ? 'Escolha a opção de "' : 'Choose the option for "') + falta + (pt() ? '" (ou "Não contratamos").' : '" (or "We did not sign up").'), 'warn'); return; }
    /* para "Desfazer": o que existia antes de mexer e o que nasceu agora */
    var desfazer = { recorrentes: [], antes: [], gastos: [] };
    atualizar.forEach(function (u) {
      var r = Recorrente.achar(u.id); if (!r) return;
      desfazer.antes.push(JSON.parse(JSON.stringify(r)));
      var mud = { valor: u.s.valor, irpf: u.s.irpf, aConfirmar: true, obs: [r.obs, u.s.obs].filter(Boolean).join(' · ').slice(0, 300) };
      if (u.diaInformado) mud.dia = u.s.dia;
      Recorrente.atualizar(u.id, mud);
    });
    var ids = criados.map(function (s) { return Recorrente.add(s).id; });
    desfazer.recorrentes = ids.slice();
    var ck = document.getElementById('cdlGasto'), ng = 0;
    if (plano.gasto && ck && ck.checked) {
      var g = Object.assign({}, plano.gasto); delete g.jaLancado;
      g.data = (document.getElementById('cdlGData') || {}).value || g.data; g.valor = Number((document.getElementById('cdlGValor') || {}).value) || g.valor;
      g.desc = String((document.getElementById('cdlGDesc') || {}).value || g.desc).trim() || g.desc;
      if (g.valor > 0) { desfazer.gastos.push(Gasto.add(g).id); ng = 1; }
    }
    var ligar = ids[0] || (atualizar[0] && atualizar[0].id) || '';
    for (var k = 0; k < guardar.length; k++) {
      try { await ArquivosFamilia.guardar({ nome: guardar[k].nome, tipo: guardar[k].tipo, ano: plano.ano, ligado: ligar }, guardar[k].bytes); } catch (e) {}
    }
    plano = null; guardar = []; Store.salvar(); fechar('genModal'); render();
    avisoDesfazer((pt() ? ids.length + (ids.length === 1 ? ' compromisso criado' : ' compromissos criados') + (atualizar.length ? ', ' + atualizar.length + ' atualizado(s)' : '') + ', marcados "a confirmar"' + (ng ? ' · 1ª parcela lançada' : '') + '.'
               : ids.length + ' commitment(s) created' + (atualizar.length ? ', ' + atualizar.length + ' updated' : '') + ', marked "to confirm"' + (ng ? ' · 1st instalment added' : '') + '.'), desfazer);
  }
  /* "Desfazer" por 5 minutos: tira exatamente o que acabou de nascer (compromissos e lançamento) e devolve o que foi
     atualizado como estava. O PDF guardado fica (o cofre de arquivos não apaga). */
  /* abre a prévia de um plano já lido (o caminho da tela é lerArquivos → planoModelo → esta prévia) */
  API.mostrarPlano = function (p) { plano = p; guardar = []; mostrarPlano(); };
  var DESFAZER_MS = 5 * 60 * 1000;
  API.desfazer = function (d) {
    var rs = d.recorrentes || [], gs = d.gastos || [];
    ST.recorrentes = Recorrente.todos().filter(function (r) { return rs.indexOf(r.id) < 0; });
    (d.antes || []).forEach(function (velho) { var i = Recorrente.todos().findIndex(function (r) { return r.id === velho.id; }); if (i >= 0) ST.recorrentes[i] = velho; });
    ST.gastos = Gasto.todos().filter(function (g) { return gs.indexOf(g.id) < 0; });
    Store.salvar(); if (typeof render === 'function') render();
  };
  function avisoDesfazer(msg, d) {
    var caixa = document.getElementById('toasts'); if (!caixa) { toast(msg); return; }
    var el = document.createElement('div'); el.className = 'toast cdl-desfazer';
    var txt = document.createElement('span'); txt.textContent = msg + ' ';
    var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'btn sm'; bt.textContent = pt() ? '↩ Desfazer' : '↩ Undo';
    var acabou = setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, DESFAZER_MS);
    bt.addEventListener('click', function (ev) {
      ev.stopPropagation(); clearTimeout(acabou); if (el.parentNode) el.parentNode.removeChild(el);
      API.desfazer(d); toast(pt() ? 'Desfeito: os compromissos e o lançamento saíram (o PDF continua guardado).' : 'Undone: commitments and entry removed (the PDF stays saved).');
    });
    el.appendChild(txt); el.appendChild(bt); caixa.appendChild(el);
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
    versao: '1.4.0',
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
