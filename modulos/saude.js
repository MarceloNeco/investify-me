/* =====================================================================
   modulos/saude.js — plano de saúde, reembolso estimado e IR (N38)   1.1.0 · 06/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     · Cadastro do plano de saúde: operadora, titular PF ou PJ, quem o plano cobre, coparticipação,
       com ou sem reembolso e a tabela de reembolso estimado por tipo (consulta, exame, terapia,
       dentista) e por especialidade (pediatra, psicólogo…).
     · Para cada gasto de Saúde de quem o plano cobre, prevê sozinho "quanto volta" (o menor entre o
       gasto e o valor da tabela) e "quanto fica para o IR" (gasto − reembolso). É ESTIMATIVA: o app
       escreve "estimado" em todo lugar.
     · Lê a apólice ou a política do plano (PDF) sem IA, por modelo: nome da operadora, se tem
       reembolso e coparticipação, e as linhas "consulta … R$ 180,00". A pessoa confere antes de salvar;
       o PDF fica guardado fechado (ArquivosFamilia, tipo 'apolice').
   API (window.Saude)
     planos() · planoDe(quem)          → o plano que cobre a pessoa (ou o único, se cobre todos)
     tipoDe(g)                         → {tipo: 'consulta'|'exame'|'terapia'|'odonto'|'outro', esp: 'pediatra'|…|''}
     estimar(g)                        → {volta, ir, tipo, esp, plano} | null (só gasto de Saúde)
     doAno(ano)                        → {gasto, volta, ir, n}
     lerApolice(texto)                 → {operadora, reembolso, copart, tabela, esp, linhas}
     juntarDaPonte([{operadora, membros}]) → {novos, juntados}  (1.1.0: o que vem do OmniLifeONE; só acrescenta
                                         operadora e quem o plano cobre, nunca mexe em reembolso, tabela ou PF/PJ;
                                         plano sem membros = cobre todos, e continua assim)
   DADOS
     Store.estado.saude_planos = [{id, operadora, titular: 'PF'|'PJ', membros: [quem], copart, reembolso,
                                   tabela: {consulta, exame, terapia, odonto}, esp: {pediatra: 200, …}, apolice, ativo}]
   PONTOS QUE USA
     lancamento.linha · tax.deducoes.topo · custos.topo · tela b-saude · ações saude-*
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'saude_planos';
  var TIPOS = ['consulta', 'exame', 'terapia', 'odonto'];
  var ROT = { consulta: ['Consulta', 'Doctor visit'], exame: ['Exame', 'Test'], terapia: ['Terapia', 'Therapy'], odonto: ['Dentista', 'Dentist'], outro: ['Outro', 'Other'] };
  var ESPEC = [['pediatra', /pediatr/], ['psicologo', /psicolog|psicoterap/], ['psiquiatra', /psiquiatr/], ['dermatologista', /dermato/],
    ['ginecologista', /ginecolog|obstetr/], ['oftalmologista', /oftalmo/], ['ortopedista', /ortoped/], ['cardiologista', /cardiolog/],
    ['endocrinologista', /endocrin/], ['otorrino', /otorrino/], ['neurologista', /neurolog/], ['fonoaudiologo', /fonoaud|\bfono\b/],
    ['fisioterapeuta', /fisioterap|\bfisio\b/], ['nutricionista', /nutricion|\bnutri\b/]];
  var REGRAS = [['odonto', /dent|odont|ortodont/], ['terapia', /psicolog|psicoterap|terapia|fonoaud|\bfono\b|fisioterap|\bfisio\b|nutricion/],
    ['exame', /exame|laborat|imagem|ultrass|ultra-som|raio[ -]?x|tomograf|resson|hemograma|fleury|dasa|delboni|lavoisier|sabin|hermes pardini/],
    ['consulta', /consult|medic|pediatr|dermat|ginecolog|oftalmo|cardiolog|ortoped|neurolog|otorrino|endocrin|urolog|psiquiatr|clinic|\bdra?\b/]];
  var OPERADORAS = [['Alice', /\balice\b/], ['Porto Saúde', /porto (seguro )?sa[uú]de|\bporto\b/], ['Bradesco Saúde', /bradesco sa[uú]de/], ['SulAmérica', /sul ?am[eé]rica/],
    ['Amil', /\bamil\b/], ['Unimed', /unimed/], ['NotreDame Intermédica', /notre ?dame|interm[eé]dica/], ['Hapvida', /hapvida/], ['Prevent Senior', /prevent senior/],
    ['Omint', /\bomint\b/], ['Care Plus', /care ?plus/], ['Allianz Saúde', /allianz/]];
  function pt() { return I18n.atual === 'pt'; }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function sa(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function n2(v) { return Math.round((Number(v) || 0) * 100) / 100; }
  function num(t) { return Number(String(t).replace(/\./g, '').replace(',', '.')) || 0; }

  var API = {
    planos: function () { return lista().filter(function (p) { return p.ativo !== false; }); },
    planoDe: function (quem) {
      var q = sa(quem).trim(), ps = API.planos();
      return ps.find(function (p) { return (p.membros || []).some(function (m) { return sa(m).trim() === q && q; }); }) ||
             ps.find(function (p) { return !(p.membros || []).length; }) || null;
    },
    juntarDaPonte: function (lst) {
      var nov = 0, jun = 0;
      (lst || []).forEach(function (x) {
        var op = String(x && x.operadora || '').trim().slice(0, 60); if (!op) return;
        var canon = (OPERADORAS.find(function (o) { return o[1].test(sa(op)); }) || [op])[0];
        var p = lista().find(function (y) { return sa(y.operadora).trim() === sa(canon).trim() || sa(y.operadora).trim() === sa(op).trim(); });
        if (!p) {
          p = { id: 'sp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ativo: true, operadora: canon, titular: 'PF', membros: [],
                copart: false, reembolso: false, tabela: {}, esp: {}, origem: 'omnilife' };
          lista().push(p); nov++;
          (x.membros || []).forEach(function (m) { m = String(m || '').trim(); if (m && p.membros.indexOf(m) < 0) p.membros.push(m); });
          return;
        }
        if (!(p.membros || []).length) return;                     /* "cobre todos": não estreita */
        var antes = p.membros.length;
        (x.membros || []).forEach(function (m) { m = String(m || '').trim(); if (m && !p.membros.some(function (z) { return sa(z).trim() === sa(m).trim(); })) p.membros.push(m); });
        if (p.membros.length > antes) jun++;
      });
      return { novos: nov, juntados: jun };
    },
    tipoDe: function (g) {
      var t = sa([g.sub, g.desc].join(' '));
      var tipo = (REGRAS.find(function (r) { return r[1].test(t); }) || ['outro'])[0];
      var esp = (ESPEC.find(function (e) { return e[1].test(t); }) || [''])[0];
      return { tipo: tipo, esp: esp };
    },
    estimar: function (g) {
      if (!g || g.grupo !== 'SAUDE' || g.fluxo === 'entrada' || !(g.valor > 0)) return null;
      var p = API.planoDe(g.quem); if (!p) return null;
      var td = API.tipoDe(g);
      var teto = p.reembolso ? (Number((p.esp || {})[td.esp]) || Number((p.tabela || {})[td.tipo]) || 0) : 0;
      var volta = n2(Math.min(g.valor, teto));
      return { volta: volta, ir: g.irpf ? n2(g.valor - volta) : 0, tipo: td.tipo, esp: td.esp, plano: p };
    },
    doAno: function (ano) {
      var r = { gasto: 0, volta: 0, ir: 0, n: 0 };
      Gasto.todos().forEach(function (g) {
        if (g.grupo !== 'SAUDE' || g.fluxo === 'entrada' || String(g.data || '').slice(0, 4) !== String(ano)) return;
        var e = API.estimar(g);
        r.gasto += g.valor; r.n++;
        if (e) { r.volta += e.volta; r.ir += e.ir; } else if (g.irpf) r.ir += g.valor;
      });
      r.gasto = n2(r.gasto); r.volta = n2(r.volta); r.ir = n2(r.ir);
      return r;
    },
    /* "por modelo": o que dá para achar numa apólice ou política, sem IA */
    lerApolice: function (texto) {
      var t = String(texto || ''), s = sa(t), out = { operadora: '', reembolso: null, copart: null, tabela: {}, esp: {}, linhas: [] };
      var op = OPERADORAS.find(function (o) { return o[1].test(s); }); if (op) out.operadora = op[0];
      if (/sem (direito a )?reembolso|nao (ha|possui|oferece|tem) reembolso|reembolso: ?nao/.test(s)) out.reembolso = false;
      else if (/reembolso/.test(s)) out.reembolso = true;
      if (/sem coparticipa|coparticipacao: ?nao|nao (ha|possui|tem) coparticipa/.test(s)) out.copart = false;
      else if (/coparticipa/.test(s)) out.copart = true;
      t.split(/\r?\n/).forEach(function (linha) {
        var l = sa(linha), m = linha.match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/); if (!m) return;
        var v = num(m[1]); if (!(v > 0)) return;
        var e = ESPEC.find(function (x) { return x[1].test(l); });
        if (e && out.esp[e[0]] == null) { out.esp[e[0]] = v; out.linhas.push(linha.trim()); return; }
        var r = REGRAS.find(function (x) { return x[1].test(l) && /reembols|consulta|exame|sess|terapia|odont|limite|valor/.test(l); });
        if (r && out.tabela[r[0]] == null) { out.tabela[r[0]] = v; out.linhas.push(linha.trim()); }
      });
      return out;
    }
  };

  /* ---------- tela: o plano ---------- */
  var rascunho = null;    /* o que a leitura da apólice achou, para preencher o formulário */
  function campoN(id, rot, v) { return campo(rot, '<input type="number" id="' + id + '" min="0" step="0.01" inputmode="decimal" value="' + (v != null && v !== '' ? v : '') + '" placeholder="0,00">'); }
  function formPlano(p) {
    p = Object.assign({ operadora: '', titular: 'PF', membros: [], copart: false, reembolso: false, tabela: {}, esp: {} }, p || {}, rascunho || {});
    var esp = Object.keys(p.esp || {}).map(function (k) { return k + ' = ' + p.esp[k]; }).join('\n');
    return '<div class="card" id="sdForm"><div class="card-head"><h3>' + (p.id ? (pt() ? 'Editar plano' : 'Edit plan') : (pt() ? 'Novo plano' : 'New plan')) + '</h3>' +
      '<button class="btn sm" data-acao="saude-apolice">📄 ' + (pt() ? 'Ler a apólice (PDF)' : 'Read the policy (PDF)') + '</button></div>' +
      (rascunho ? '<p class="small" style="color:var(--accent2)">' + (pt() ? '✓ Preenchido pela apólice. Confira e salve.' : '✓ Filled from the policy. Check and save.') + (rascunho.linhas && rascunho.linhas.length ? '<br><span class="tiny muted">' + esc(rascunho.linhas.slice(0, 6).join(' · ')) + '</span>' : '') + '</p>' : '') +
      '<input type="hidden" id="sdId" value="' + esc(p.id || '') + '">' +
      '<div class="grid g2">' + campo(pt() ? 'Operadora' : 'Insurer', '<input id="sdOp" value="' + esc(p.operadora) + '" placeholder="Alice, Porto…">') +
        campo(pt() ? 'Titular' : 'Holder', '<select id="sdTit"><option value="PF"' + (p.titular !== 'PJ' ? ' selected' : '') + '>' + (pt() ? 'Pessoa física' : 'Individual') + '</option><option value="PJ"' + (p.titular === 'PJ' ? ' selected' : '') + '>' + (pt() ? 'Empresa (PJ)' : 'Company') + '</option></select>') + '</div>' +
      campo(pt() ? 'Quem o plano cobre (separe por vírgula; vazio = todos)' : 'Who the plan covers (comma-separated; blank = everyone)', '<input id="sdMem" value="' + esc((p.membros || []).join(', ')) + '">') +
      '<label class="linha-check"><input type="checkbox" id="sdCop"' + (p.copart ? ' checked' : '') + '> ' + (pt() ? 'Tem coparticipação' : 'Has co-payment') + '</label>' +
      '<label class="linha-check"><input type="checkbox" id="sdRee"' + (p.reembolso ? ' checked' : '') + '> ' + (pt() ? 'Tem reembolso (consulta fora da rede devolve parte)' : 'Has reimbursement') + '</label>' +
      '<div class="bf-tit" style="margin-top:8px">' + (pt() ? 'Reembolso estimado por vez (R$)' : 'Estimated refund each time') + '</div>' +
      '<div class="grid g2">' + TIPOS.map(function (k) { return campoN('sdT_' + k, ROT[k][pt() ? 0 : 1], (p.tabela || {})[k]); }).join('') + '</div>' +
      campo(pt() ? 'Por especialidade (uma por linha: pediatra = 200)' : 'By specialty (one per line: pediatra = 200)', '<textarea id="sdEsp" rows="3">' + esc(esp) + '</textarea>') +
      '<div class="f-actions">' + (p.id ? '<button class="btn danger" data-acao="saude-desligar" data-id="' + esc(p.id) + '">' + (pt() ? 'Desligar' : 'Turn off') + '</button>' : '') +
      '<button class="btn primary" data-acao="saude-salvar">' + esc(t('ac.salvar')) + '</button></div></div>';
  }
  var editando = null;
  function tela() {
    var A = new Date().getFullYear(), r = API.doAno(A), ps = API.planos();
    var h = '<div class="card-head"><h1>🩺 ' + (pt() ? 'Plano de saúde' : 'Health plan') + '</h1>' +
      '<div class="head-acoes"><button class="btn sm primary" data-acao="saude-novo">+ ' + (pt() ? 'Plano' : 'Plan') + '</button></div></div>' +
      '<p class="small muted aba-explica">' + (pt()
        ? 'Com o plano cadastrado, cada gasto de Saúde mostra quanto deve voltar de reembolso e quanto fica para o imposto de renda. São estimativas: o valor de verdade é o que o plano devolver.'
        : 'With the plan set up, each health expense shows the expected refund and what is left for income tax. These are estimates.') + '</p>' +
      '<div class="kpis kpis-3">' + kpiB(pt() ? 'Saúde em ' + A : 'Health in ' + A, fmt(r.gasto), null, r.n + (pt() ? ' gastos' : ' expenses'), 'down') +
        kpiB(pt() ? 'Volta (estimado)' : 'Refund (estimate)', fmt(r.volta), null, null, 'up') +
        kpiB(pt() ? 'Fica para o IR (estimado)' : 'Left for tax (estimate)', fmt(r.ir)) + '</div>';
    ps.forEach(function (p) {
      h += '<div class="card"><div class="card-head"><h3>' + esc(p.operadora || '—') + ' <span class="small muted">' + esc(p.titular === 'PJ' ? 'PJ' : 'PF') + '</span></h3>' +
        '<button class="btn sm" data-acao="saude-editar" data-id="' + esc(p.id) + '">' + esc(t('ac.editar')) + '</button></div>' +
        '<p class="small" style="margin:0">' + esc([(p.membros || []).length ? (pt() ? 'Cobre: ' : 'Covers: ') + p.membros.join(', ') : (pt() ? 'Cobre: todos' : 'Covers: everyone'),
          p.copart ? (pt() ? 'com coparticipação' : 'with co-payment') : (pt() ? 'sem coparticipação' : 'no co-payment'),
          p.reembolso ? (pt() ? 'com reembolso' : 'with refund') : (pt() ? 'sem reembolso' : 'no refund')].join(' · ')) + '</p>' +
        (p.reembolso ? '<p class="tiny muted" style="margin:6px 0 0">' + esc(TIPOS.filter(function (k) { return (p.tabela || {})[k]; }).map(function (k) { return ROT[k][pt() ? 0 : 1] + ' ' + fmt(p.tabela[k]); })
          .concat(Object.keys(p.esp || {}).map(function (k) { return k + ' ' + fmt(p.esp[k]); })).join(' · ')) + '</p>' : '') +
        (p.apolice ? '<button class="linkinho" data-acao="ir-baixar" data-id="' + esc(p.apolice) + '">📄 ' + (pt() ? 'apólice' : 'policy') + '</button>' : '') + '</div>';
    });
    if (editando !== null) h += formPlano(editando === '' ? null : lista().find(function (p) { return p.id === editando; }));
    else if (!ps.length) h += '<div class="card"><p class="small muted" style="margin:0">' + (pt() ? 'Nenhum plano ainda. Toque em "+ Plano" ou leia a apólice em PDF.' : 'No plan yet.') + '</p></div>';
    return h;
  }
  function lerForm() {
    var v = function (id) { var e = document.getElementById(id); return e ? (e.type === 'checkbox' ? e.checked : e.value) : ''; };
    var tab = {}; TIPOS.forEach(function (k) { var x = Number(v('sdT_' + k)); if (x > 0) tab[k] = n2(x); });
    var esp = {}; String(v('sdEsp')).split(/\n/).forEach(function (l) { var m = l.match(/^\s*([^=:]+?)\s*[=:]\s*([\d.,]+)\s*$/); if (m) { var k = sa(m[1]).replace(/[^a-z]/g, ''); var e2 = ESPEC.find(function (e) { return e[1].test(k) || e[0] === k; }); var x = num(m[2].indexOf(',') >= 0 ? m[2] : m[2].replace('.', ',')); if (x > 0) esp[e2 ? e2[0] : k] = n2(x); } });
    return { id: v('sdId'), operadora: String(v('sdOp')).trim().slice(0, 60), titular: v('sdTit') === 'PJ' ? 'PJ' : 'PF',
      membros: String(v('sdMem')).split(',').map(function (x) { return x.trim(); }).filter(Boolean), copart: !!v('sdCop'), reembolso: !!v('sdRee'), tabela: tab, esp: esp };
  }

  MoneyModulos.registrar({
    id: 'saude',
    versao: '1.1.0',
    colecoes: [COL],
    pontos: {
      'lancamento.linha': function (ctx) {
        var e = ctx.g ? API.estimar(ctx.g) : null; if (!e || !e.plano.reembolso) return '';
        return '<div class="t-sub sd-est">↩ ' + esc((pt() ? 'volta ~' : 'refund ~') + fmt(e.volta) + (ctx.g.irpf ? ' · IR ' + fmt(e.ir) : '') + (pt() ? ' (estimado)' : ' (estimate)')) + '</div>';
      },
      'tax.deducoes.topo': function () {
        var A = typeof anoTax === 'function' ? anoTax() : new Date().getFullYear(), r = API.doAno(A);
        if (!r.n) return '';
        return '<button class="card card-link" data-irpara="b-saude"><span>🩺 ' + (pt()
          ? 'Saúde ' + A + ': ' + fmt(r.gasto) + ' · volta ~' + fmt(r.volta) + ' · fica para o IR ~' + fmt(r.ir)
          : 'Health ' + A + ': ' + fmt(r.gasto) + ' · refund ~' + fmt(r.volta) + ' · for tax ~' + fmt(r.ir)) + '</span><span class="small muted">›</span></button>';
      },
      'custos.topo': function () {
        if (API.planos().length || !Gasto.todos().some(function (g) { return g.grupo === 'SAUDE'; })) return '';
        return '<button class="card card-link" data-irpara="b-saude"><span>🩺 ' + (pt() ? 'Cadastre o plano de saúde para prever o reembolso e o IR' : 'Set up your health plan to estimate refunds and tax') + '</span><span class="small muted">›</span></button>';
      }
    },
    telas: { 'b-saude': { app: 'budget', render: tela,
      ajuda: { pt: { t: 'Plano de saúde', o: 'O plano, a tabela de reembolso e quanto de cada gasto volta e fica para o IR (estimado).' },
               en: { t: 'Health plan', o: 'The plan, its refund table and how much of each expense comes back (estimate).' } } } },
    acoes: {
      'saude-novo': function () { editando = ''; rascunho = null; render(); },
      'saude-editar': function (el) { editando = el.dataset.id; rascunho = null; render(); },
      'saude-salvar': function () {
        var d = lerForm(), p = d.id ? lista().find(function (x) { return x.id === d.id; }) : null;
        if (!p) { p = { id: 'sp' + Date.now().toString(36), ativo: true }; lista().push(p); }
        Object.assign(p, d, { id: p.id }); if (rascunho && rascunho.apolice) p.apolice = rascunho.apolice;
        editando = null; rascunho = null; Store.salvar(); render();
        toast(pt() ? 'Plano salvo.' : 'Plan saved.');
      },
      'saude-desligar': function (el) { var p = lista().find(function (x) { return x.id === el.dataset.id; }); if (p) p.ativo = false; editando = null; Store.salvar(); render(); },
      'saude-apolice': function () {
        var i = document.createElement('input'); i.type = 'file'; i.accept = 'application/pdf,.pdf'; i.style.display = 'none';
        i.addEventListener('change', async function () {
          var a = i.files && i.files[0]; if (i.parentNode) i.parentNode.removeChild(i); if (!a) return;
          var txt = ''; try { txt = await PdfTexto.extrair(a, { linhas: true, aceitaVazio: true }); } catch (e) { txt = ''; }
          var r = API.lerApolice(txt), atual = editando ? lista().find(function (p) { return p.id === editando; }) : null;
          rascunho = Object.assign({}, atual || {}, lerForm());
          if (r.operadora) rascunho.operadora = r.operadora;
          if (r.reembolso != null) rascunho.reembolso = r.reembolso;
          if (r.copart != null) rascunho.copart = r.copart;
          rascunho.tabela = Object.assign({}, rascunho.tabela, r.tabela); rascunho.esp = Object.assign({}, rascunho.esp, r.esp); rascunho.linhas = r.linhas;
          try { var m = await ArquivosFamilia.guardar({ nome: hojeISO() + ' Apólice ' + (r.operadora || a.name.replace(/\.pdf$/i, '')) + '.pdf', tipo: 'apolice', ano: new Date().getFullYear() }, new Uint8Array(await a.arrayBuffer())); rascunho.apolice = m.id; } catch (e) { toast(e.message, 'err'); }
          if (editando === null) editando = '';
          render();
          if (!txt) toast(pt() ? 'Este PDF não tem texto (é imagem): preencha à mão.' : 'This PDF has no text (image): fill it in by hand.', 'warn');
        });
        document.body.appendChild(i); i.click();
      }
    }
  });
  window.Saude = API;
})();
