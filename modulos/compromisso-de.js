/* =====================================================================
   modulos/compromisso-de.js — compromisso a partir de um lançamento ou de um contrato (PDF)   1.0.0 · 06/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     · No formulário de um lançamento: "📌 Virar compromisso" abre o "Novo compromisso" já preenchido
       (nome, valor, grupo, categoria, pessoa, IR, dia do mês, desde a data do lançamento).
     · Em Custos: "📄 Compromisso de um contrato (PDF)" lê o contrato SEM IA, por modelo — escola
       (ex.: Colégio Escola Exemplo) e genérico: nome da escola/empresa, aluno, ano letivo, valor da
       parcela, número de parcelas, dia de vencimento, matrícula — e abre o "Novo compromisso"
       preenchido para a pessoa conferir. O PDF fica guardado fechado (ArquivosFamilia, tipo 'contrato').
   API (window.CompromissoDe)
     doLancamento(g)        → semente do compromisso
     lerContrato(texto)     → {escola, aluno, ano, parcela, parcelas, dia, matricula, anuidade, primeiroMes, achados:[…]}
     sementeContrato(c)     → semente do compromisso (Escola <aluno> <ano>, Dependentes, IR, meses certos)
   PONTOS QUE USA
     lancamento.form · custos.topo · ações cdl-*
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

  MoneyModulos.registrar({
    id: 'compromisso-de',
    versao: '1.0.0',
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
        var i = document.createElement('input'); i.type = 'file'; i.accept = 'application/pdf,.pdf'; i.style.display = 'none';
        i.addEventListener('change', async function () {
          var a = i.files && i.files[0]; if (i.parentNode) i.parentNode.removeChild(i); if (!a) return;
          var txt = ''; try { txt = await PdfTexto.extrair(a, { linhas: true, aceitaVazio: true }); } catch (e) { txt = ''; }
          var c = API.lerContrato(txt), sem = API.sementeContrato(c);
          try { await ArquivosFamilia.guardar({ nome: hojeISO() + ' Contrato ' + (c.escola || a.name.replace(/\.pdf$/i, '')) + '.pdf', tipo: 'contrato', ano: Number(sem.desde.slice(0, 4)) }, new Uint8Array(await a.arrayBuffer())); } catch (e) {}
          abrirRecorrente(null, sem, { abrirMais: true });
          toast(txt ? (pt() ? 'Contrato lido: confira os campos e salve.' : 'Contract read: check and save.') : (pt() ? 'Este PDF não tem texto (é imagem): preencha à mão.' : 'This PDF has no text: fill in by hand.'), txt ? '' : 'warn');
        });
        document.body.appendChild(i); i.click();
      }
    }
  });
  window.CompromissoDe = API;
})();
