/* =====================================================================
   modulos/declaracao-escolhas.js — importar a declaração do IR COM ESCOLHAS (3.65)        1.1.0 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (leitura por texto, como já era; nada de IA)
     Ao importar a declaração (FiscalONE → Declarações), antes de salvar, uma lista de escolhas, cada uma com uma frase:
     [x] Patrimônio com os Bens e Direitos de 31/12: imóveis, veículos, consórcio e previdência entram como patrimônio
         SEM LIQUIDEZ (modulos/patrimonio-iliquido.js), com "de quem é" e a dívida do financiamento ao lado (se a
         declaração trouxer). Os que já existem são atualizados; os novos vêm desmarcados, para confirmar um a um.
         Contas e investimentos aparecem para conferir no InvestifyONE (não viram posição sozinhos).
     [ ] Restituição como renda prevista (DESMARCADO: pode cair na malha, atrasar ou vir errada). Marcando, vira um
         compromisso de renda numa data só (a do lote), "a confirmar" quando cair.
     [ ] Imposto a pagar → compromissos (cota única ou até 8 quotas, no último dia útil de cada mês, a partir de maio).
     [x] Conferir as deduções (saúde e educação) da declaração com os lançamentos marcados para IR no app: o que falta
         de um lado ou do outro.
     1.1.0 (3.70, pedido do dono): a declaração preenche também o InvestifyONE e o BudgetONE, sempre como ESCOLHA:
     [x] InvestifyONE: "Montar ou atualizar a carteira com os investimentos de 31/12/<ano>": os bens líquidos viram
         posições no formato do modulos/importar-posicoes.js (ImportarPosicoes.preparar/importar): 03.01 com ticker e
         QTDE → ação (no exterior: USD); 07.99 ETF → ETF; 04.02 → bond ou renda fixa (conta de investimento → caixa);
         07.01 → fundo; 04.01 → poupança; 06.xx → caixa. Bem com 31/12 = 0 (vendido) não entra. O que já existe (o
         mesmo bem da declaração, o mesmo ticker, o nome ou o CNPJ) vem desmarcado. Preço médio de ativo em dólar: o
         R$ declarado ÷ qtd ÷ o dólar de 31/12 do campo "Dólar de 31/12/<ano> (PTAX)" (vem com o dólar de hoje; a carteira
         guarda o preço médio na moeda do ativo); o valor em R$ da declaração fica na nota. Sem dólar (sem internet), o
         campo vem vazio e o que é em moeda estrangeira fica desmarcado com "falta o dólar" (nunca pm = 0).
         Sem liquidez: grupo 01 sempre imóvel; 02 (veículo) e 99.05 (consórcio) = outro; 99.xx com VGBL/PGBL/PREVID =
         previdência; 03.99 (SCP) = participação. O nome curto (nomeCurto) corta em " - ", "R$", "VALOR" ou vírgula com
         espaço, nunca no ponto de um número ("RENEGADE 1.8"), até 50 caracteres na palavra inteira.
     "De quem é": a descrição com "CONJUGE" ou o nome de alguém do cadastro já vem com essa pessoa escolhida. Pessoa do
     cadastro = pelo nome, pelo apelido ou pelo primeiro nome, sem acento (achaPessoa): nunca uma segunda pessoa igual.
     [x] Dependentes → Pessoas (só os que faltam; da casa; "dependente no IR").
     [x] Fontes pagadoras → Rendas (desmarcada se já existir).
     [ ] Pagamentos que parecem conta fixa (escola, plano de saúde) → compromisso em Custos, com o valor anual ÷ 12.
     A linha "A declaração de <ano+1> já começa com N bens, N dependentes e N fontes desta" (Tax: baseProxima).
     Tudo o que nasce daqui fica no cofre RESERVADO (escopo 'reservado'); a visão da casa não vê nada disso.
   API (window.DeclEscolhas)
     html(d) · ler() · aplicar(d, escolhas) → resumo · conferir(d) → {saude:{dec, app, so*}, educacao:{…}}
     posicoes(d) → {lista (a do ImportarPosicoes, com bem e dono), conferir: [bens sem tipo]} · budget(d) · baseProxima(d)
   PONTOS QUE USA
     declaracao.escolhas (abrirDeclaracao, só quando é nova) · salvarDeclaracaoTela chama ler() e aplicar()
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  var SEM_LIQUIDEZ = { '01': 'imovel', '02': 'outro', '99': 'outro' };
  /* 3.70 (dados reais): imóvel é sempre imóvel ("QUITADO VIA CONSORCIO" na descrição não muda isso); consórcio só no 99.05;
     previdência só com VGBL/PGBL/PREVID na descrição; 03.99 (SCP) = participação; veículo = 'outro' (não há tipo veículo) */
  function tipoIliq(b) {
    var cod = b.grupo + '.' + b.codigo, desc = String(b.desc || '');
    if (b.grupo === '01') return 'imovel';
    if (b.grupo === '02') return 'outro';
    if (cod === '03.99') return 'empresa';
    if (b.grupo === '99') return /\b(VGBL|PGBL)\b|PREVID/i.test(desc) ? 'previdencia' : 'outro';
    return SEM_LIQUIDEZ[b.grupo] || '';
  }
  function fora(b) { return /estados unidos|exterior|united states/i.test(b.local || '') || /\b(AVENUE|NOMAD|INTERACTIVE|SCHWAB|INTER US|WISE)\b/i.test(b.desc || ''); }
  function num(t) { return Number(String(t).replace(/\./g, '').replace(',', '.')); }
  function qtdDe(desc) { var m = /QTDE?\s*E?\s*:?\s*(\d+(?:\.\d{3})*(?:,\d+)?)/i.exec(String(desc).replace(/QTD\s+E\b/i, 'QTDE')); return m ? num(m[1]) : 0; }
  /* o campo "Dólar de 31/12/<ano> (PTAX)"; sem o campo na tela, o dólar de hoje */
  function lerDolar() { var f = document.getElementById('deDolar'); if (!f) return dolar(); return Number(String(f.value || '').replace(',', '.')) || 0; }
  function dolar() { return typeof Mercado !== 'undefined' && Mercado.cambio && Mercado.cambio.USD ? Number(Mercado.cambio.USD.p) || 0 : 0; }
  function decRef(b) { return b.grupo + '.' + b.codigo + '|' + N(b.desc).slice(0, 40); }
  /* o bem líquido da declaração no formato do importar-posicoes (null = não sabe o tipo: fica para conferir) */
  function posicaoDe(b, d, usd) {
    var desc = String(b.desc || '').replace(/\s+/g, ' ').trim(), ex = fora(b), cod = b.grupo + '.' + b.codigo, v = b.depois;
    var exe = d.exercicio || (d.anoCalendario + 1), data = (d.anoCalendario || exe - 1) + '-12-31';
    var nota = tr('da declaração ', 'from the return ') + exe, emUsd = function (x) { return usd ? Math.round(x / usd * 100) / 100 : 0; };
    var notaUsd = nota + tr(' · custo em R$ da declaração: ', ' · cost in R$ on the return: ') + fmt(v) + (usd ? tr(' (dólar de 31/12: ', ' (dollar on 31/12: ') + String(usd).replace('.', ',') + ')' : '');
    var primeira = desc.split(' ')[0] || '', q = qtdDe(desc);
    if (cod === '03.01' || cod === '07.99') {
      var m = cod === '07.99' ? (/\(ETF\s+([A-Z0-9.]{1,8})\)/i.exec(desc) || /\bETF\s+([A-Z][A-Z0-9.]{1,7})\b/.exec(desc)) : /^\S+\s+([A-Z][A-Z0-9.]{0,7})\s+-\s+/.exec(desc);
      if (!m || !(q > 0)) return null;
      var nome = desc.replace(/^\S+\s+/, '').replace(/\s*-?\s*QTDE?\s*E?\s*:?\s*[\d.,]+.*$/i, '').replace(/^[A-Z0-9.]+\s+-\s+/, '').replace(/^ETF\s*\([^)]*\)\s*-?\s*/i, '').trim();
      if (ex) return { ticker: m[1], nome: nome, tipo: cod === '07.99' ? 'etf-us' : 'acao-us', inst: primeira, qtd: q, pm: emUsd(v / q), moeda: 'USD', data: data, notas: notaUsd };
      return { ticker: m[1], nome: nome, tipo: cod === '07.99' ? 'etf-br' : 'acao-br', inst: primeira, qtd: q, pm: Math.round(v / q * 100) / 100, data: data, notas: nota };
    }
    var nomeLivre = nomeCurto(desc);
    if (b.grupo === '06' || (cod === '04.02' && /CONTA DE INVEST/i.test(desc)))
      return ex ? { tipo: 'caixa', nome: nomeLivre, inst: primeira, moeda: 'USD', qtd: emUsd(v), pm: usd ? Math.round(usd * 10000) / 10000 : 0, data: data, notas: notaUsd }
                : { tipo: 'caixa', nome: nomeLivre, inst: primeira, moeda: 'BRL', qtd: v, pm: 1, data: data, notas: nota };
    if (cod === '04.02') return ex ? { tipo: 'bond-us', ticker: nomeLivre, nome: nomeLivre, inst: primeira, pm: emUsd(v), valorAtual: emUsd(v), data: data, notas: notaUsd }
                                   : { tipo: 'renda-fixa', ticker: nomeLivre, nome: nomeLivre, inst: primeira, pm: v, ix: 'CDI', data: data, notas: nota };
    if (cod === '04.01') return { tipo: 'renda-fixa', ticker: nomeLivre, nome: nomeLivre, inst: primeira, pm: v, ix: 'POUP', taxa: 0, data: data, notas: nota };
    if (cod === '07.01') return { tipo: 'fundo', ticker: nomeLivre, nome: nomeLivre, inst: primeira, pm: v, valorAtual: v, data: data, notas: nota };
    return null;
  }
  /* 3.70: alguém do cadastro pelo nome, pelo apelido ou pelo primeiro nome (sem acento, sem maiúscula): a declaração traz o nome
     completo; o cadastro pode ter "Beta" com o apelido, ou só o primeiro nome. Nunca cria uma segunda pessoa igual */
  function nomesDe(p) {
    var l = [Pessoas.nomeCompleto(p), p.nome, p.apelido, Pessoas.rotulo(p)].concat(p.aliases || []).map(N).filter(Boolean);
    l.slice().forEach(function (x) { var w = x.split(' ')[0]; if (w.length >= 3 && l.indexOf(w) < 0) l.push(w); });
    return l;
  }
  function achaPessoa(nome) {
    if (!window.Pessoas || !N(nome)) return null;
    var p = Pessoas.achar(nome); if (p) return p;
    var k = N(nome), w = k.split(' ')[0];
    return Pessoas.ativas().find(function (x) { var l = nomesDe(x); return l.indexOf(k) >= 0 || (w.length >= 3 && l.indexOf(w) >= 0); }) || null;
  }
  /* de quem é: o nome de alguém do cadastro na descrição; senão "CONJUGE" = a outra pessoa responsável da casa */
  function donoDe(desc, d) {
    if (!window.Pessoas) return '';
    var t = ' ' + N(desc) + ' ', casa = Pessoas.ativas().filter(function (p) { return p.tipo === 'casa'; });
    var achou = casa.find(function (p) { return nomesDe(p).concat((p.banco || []).map(N)).some(function (n) { return n.length >= 3 && t.indexOf(' ' + n + ' ') >= 0; }); });
    if (achou) return achou.id;
    if (/CONJUGE|CONJUGUE|ESPOSA|MARIDO/i.test(N(desc).toUpperCase())) {
      var tit = N(d.titular || ''), resp = casa.filter(function (p) { return p.papel === 'responsavel' && N(p.nome).split(' ')[0] !== tit; });
      if (resp.length === 1) return resp[0].id;
    }
    return '';
  }
  function jaNaCarteira(it, b) {
    var ref = decRef(b);
    return (ST.posicoes || []).find(function (p) {
      if (p.decRef && p.decRef === ref) return true;
      if (b.cnpj && p.cnpj && p.cnpj === b.cnpj) return true;
      if (it.tipo !== 'caixa' && it.ticker && N(p.ticker) === N(it.ticker) && p.tipo === it.tipo) return true;
      return !!it.nome && N(p.nome) === N(it.nome) && N(p.inst) === N(it.inst);
    }) || null;
  }
  /* 3.70: o nome curto do bem — corta em " - ", em "R$", em "VALOR" ou numa vírgula/ponto e vírgula seguido de espaço (nunca
     no ponto ou na vírgula de um número: "RENEGADE 1.8"), e no máximo 50 caracteres, na palavra inteira */
  function nomeCurto(t) {
    var x = String(t || '').replace(/\s+/g, ' ').trim();
    x = x.split(/\s+-\s+|\s*R\$|\s+VALOR\b|[,;]\s|\.\s(?=[A-Za-zÀ-ú])/i)[0].trim();
    if (x.length > 50) { x = x.slice(0, 51); x = x.slice(0, x.lastIndexOf(' ') > 20 ? x.lastIndexOf(' ') : 50); }
    return x.replace(/[\s,;.:/-]+$/, '');
  }
  function nomeBem(b) { return nomeCurto(b.desc) || (tr('Bem ', 'Asset ') + b.grupo + '.' + b.codigo); }
  /* pagamentos da declaração: códigos de saúde (09–26) e educação (01–02) */
  function classe(cod) { var c = Number(cod); return c >= 1 && c <= 2 ? 'educacao' : (c >= 9 && c <= 26 ? 'saude' : ''); }
  function casaOpcoes() { return window.Pessoas ? Pessoas.ativas().filter(function (p) { return p.tipo === 'casa'; }) : []; }

  /* a lista das posições (redesenhada quando o dólar de 31/12 muda) */
  function listaPos(ps, casa) {
    return '<ul class="dec-bens dec-pos">' + ps.lista.map(function (x, k) {
            var it = x.item || {}, nome = it.tipo !== 'caixa' && it.ticker && it.nome && it.ticker !== it.nome ? it.ticker + ' · ' + it.nome : (it.nome || it.ticker || '');
            var qt = it.qtd && it.tipo !== 'caixa' && it.qtd !== 1 ? ' · ' + String(it.qtd).replace('.', ',') + tr(' un.', ' units') : '';
            var aviso = x.problema ? ' <span style="color:var(--down)">' + esc(x.problema) + '</span>' : x.jaExiste ? ' <span style="color:var(--warn)">' + esc(tr('já existe: ', 'already there: ') + x.jaExiste + tr(' — atualizar?', ' — update?')) + '</span>' : '';
            var donos = '<select class="de-pos-dono" data-k="' + k + '" aria-label="' + esc(tr('De quem é', 'Whose')) + '"><option value="">' + esc(tr('de quem é: titular', 'whose: holder')) + '</option>' + casa.map(function (p) { return '<option value="' + esc(p.id) + '"' + (x.dono === p.id ? ' selected' : '') + '>' + esc(tr('de quem é: ', 'whose: ') + Pessoas.rotulo(p)) + '</option>'; }).join('') + '</select>';
            return '<li><label class="linha-check small"><input type="checkbox" class="de-pos" data-k="' + k + '"' + (x.marcado ? ' checked' : '') + (x.problema ? ' disabled' : '') + '> <span>' + esc(nome) +
              ' <span class="muted">' + esc(((TIPOS[it.tipo] || {}).curto || it.tipo || '') + qt) + '</span> · <b>' + fmt(x.bem.depois) + '</b>' + aviso + '</span></label>' + donos + '</li>';
          }).join('') + '</ul>';
  }
  var API = {
    bens: function (d) {
      return (d.itensBens || []).map(function (b, i) {
        var tp = tipoIliq(b); if (!tp || !(b.depois > 0)) return null;
        var ja = window.PatrimonioIliquido ? PatrimonioIliquido.lista().find(function (x) { return N(x.nome) === N(nomeBem(b)) || (x.decRef && x.decRef === b.grupo + '.' + b.codigo + '|' + N(b.desc).slice(0, 40)); }) : null;
        return { i: i, b: b, tipo: tp, nome: nomeBem(b), ja: ja };
      }).filter(Boolean);
    },
    liquidos: function (d) { return (d.itensBens || []).filter(function (b) { return !tipoIliq(b) && b.depois > 0; }); },
    /* 3.70: os bens líquidos → posições (prévia do ImportarPosicoes), com o bem e o dono ao lado */
    /* usd: o dólar de 31/12 (o campo da tela); sem ele, o que está em moeda estrangeira fica com problema e desmarcado */
    posicoes: function (d, usd) {
      if (usd === undefined) usd = lerDolar();
      var liq = API.liquidos(d), itens = [], bensDe = [], conferir = [];
      liq.forEach(function (b) { var it = posicaoDe(b, d, usd); if (it) { itens.push(it); bensDe.push(b); } else conferir.push(b); });
      if (!window.ImportarPosicoes || !itens.length) return { lista: [], conferir: conferir };
      var r = ImportarPosicoes.preparar({ tipo: 'moneytrio-posicoes', versao: 1, itens: itens });
      var lista = (r.lista || []).map(function (x, k) {
        var b = bensDe[k];
        if (fora(b) && !(usd > 0)) x.problema = tr('falta o dólar de 31/12 (o campo acima)', 'the 31/12 dollar rate is missing (field above)');
        var ja = x.item && !x.problema ? jaNaCarteira(x.item, b) : null;
        if (ja && !x.jaExiste) x.jaExiste = (ja.ticker || ja.nome) + (ja.inst ? ' · ' + ja.inst : '');
        x.marcado = !x.problema && !x.jaExiste;
        if (x.item && !x.problema) { x.item.decRef = decRef(b); if (b.cnpj) x.item.cnpj = b.cnpj; x.item.escopo = 'reservado'; }
        x.bem = b; x.dono = donoDe(b.desc, d);
        return x;
      });
      return { lista: lista, conferir: conferir };
    },
    /* 3.70: o BudgetONE — dependentes, fontes pagadoras e pagamentos que parecem conta fixa */
    budget: function (d) {
      var deps = (d.dependentesNomes || []).map(function (n) { return { nome: n, ja: !!achaPessoa(n) }; });
      var rendas = typeof Recorrente !== 'undefined' ? Recorrente.todos().filter(function (r) { return r.grupo === 'RENDA'; }) : [];
      var parecido = function (a, b) { var x = N(a).split(' ').filter(function (w) { return w.length > 2; }); var y = ' ' + N(b) + ' '; return x.length && x.filter(function (w) { return y.indexOf(' ' + w + ' ') >= 0; }).length >= Math.min(2, x.length); };
      var fontes = (d.fontes || []).map(function (f) { return { nome: String(f.nome || '').trim(), valor: f.rendimentos || 0, ja: rendas.some(function (r) { return parecido(f.nome, r.nome) || parecido(f.nome, (r.sal || {}).fonte || ''); }) }; });
      var porNome = {};
      (d.pagamentos || []).forEach(function (p) {
        var k = classe(p.codigo), plano = Number(p.codigo) === 26;
        if (k !== 'educacao' && !plano) return;
        var c = N(p.nome); porNome[c] = porNome[c] || { nome: p.nome, valor: 0, educacao: k === 'educacao', para: p.para };
        porNome[c].valor += Number(p.valor) || 0;
      });
      var compromissos = Object.keys(porNome).map(function (c) { var x = porNome[c]; x.mes = Math.round(x.valor / 12 * 100) / 100;
        x.ja = typeof Recorrente !== 'undefined' && Recorrente.todos().some(function (r) { return parecido(x.nome, r.nome); }); return x; });
      return { deps: deps, fontes: fontes, compromissos: compromissos };
    },
    /* 3.70: a declaração salva é a base da próxima (bens pela situação de 31/12, dependentes e fontes) */
    baseProxima: function (d) {
      return { ano: (d.exercicio || (d.anoCalendario + 1)) + 1, bens: (d.itensBens || []).filter(function (b) { return b.depois > 0; }).length,
        dependentes: (d.dependentesNomes || []).length || d.dependentesN || 0, fontes: (d.fontes || []).length };
    },
    html: function (d) {
      if (!d) return '';
      var bens = API.bens(d), liq = API.liquidos(d), div = d.dividas || [], casa = casaOpcoes();
      var exe = d.exercicio || (d.anoCalendario ? d.anoCalendario + 1 : new Date().getFullYear());
      var h = '<div class="card dec-esc"><div class="card-head"><h3>' + esc(tr('O que fazer com esta declaração', 'What to do with this return')) + '</h3></div>';
      h += '<label class="linha-check"><input type="checkbox" id="deBens"' + (bens.length ? ' checked' : ' disabled') + '> <span><b>' + esc(tr('Atualizar o patrimônio com os Bens e Direitos de 31/12', 'Update net worth with the assets at 31/12')) + '</b><br><span class="small muted">' +
        esc(tr('Imóvel e veículo entram como patrimônio sem liquidez. Os que já existem são atualizados; os novos, você confirma um a um.', 'Property and vehicles go in as non-liquid assets. Existing ones are updated; you confirm each new one.')) + '</span></span></label>';
      if (bens.length) {
        h += '<ul class="dec-bens">' + bens.map(function (x) {
          var donos = '<select class="de-dono" data-i="' + x.i + '"><option value="">' + esc(tr('de quem é', 'whose')) + '</option>' + casa.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(Pessoas.rotulo(p)) + '</option>'; }).join('') + '</select>';
          var dv = div.length && x.tipo === 'imovel' ? '<select class="de-div" data-i="' + x.i + '"><option value="">' + esc(tr('sem dívida', 'no debt')) + '</option>' + div.map(function (v, k) {
            var auto = /financ|caixa|habita/i.test(v.desc) && /financ|caixa|habita|minha casa/i.test(x.b.desc);
            return '<option value="' + k + '"' + (auto ? ' selected' : '') + '>' + esc(String(v.desc).slice(0, 40) + ' · ' + fmt(v.depois)) + '</option>'; }).join('') + '</select>' : '';
          return '<li><label class="linha-check small"><input type="checkbox" class="de-bem" data-i="' + x.i + '"' + (x.ja ? ' checked' : '') + '> ' + esc(x.nome) + ' · <b>' + fmt(x.b.depois) + '</b> ' +
            '<span class="muted">' + esc(x.ja ? tr('(já existe: atualizar)', '(exists: update)') : tr('(novo: confirme)', '(new: confirm)')) + '</span></label>' + donos + dv + '</li>';
        }).join('') + '</ul>';
      }
      /* 3.70: InvestifyONE — a carteira com os investimentos de 31/12 */
      var ps = API.posicoes(d, dolar()), ano = d.anoCalendario || (exe - 1);
      if (ps.lista.length) {
        var nPos = ps.lista.filter(function (x) { return x.marcado; }).length;
        h += '<label class="linha-check"><input type="checkbox" id="dePos"' + (nPos ? ' checked' : '') + '> <span><b>' + esc(tr('Montar ou atualizar a carteira com os investimentos de 31/12/', 'Build or update the portfolio with the investments of 31/12/') + ano) + '</b><br><span class="small muted">' +
          esc(tr('No InvestifyONE. O que já existe vem desmarcado. Ação e ETF no exterior: o preço médio vai em dólar (o R$ da declaração fica na nota).', 'In InvestifyONE. What already exists comes unticked. Foreign shares and ETFs: the average price goes in dollars (the R$ on the return stays in the note).')) + '</span></span></label>';
        var temFora = ps.lista.some(function (x) { return fora(x.bem); }), hoje = dolar();
        if (temFora) h += '<div class="dec-sub"><label class="small"><b>' + esc(tr('Dólar de 31/12/' + ano + ' (PTAX)', 'Dollar on 31/12/' + ano + ' (PTAX)')) + '</b> ' +
          '<input id="deDolar" type="text" inputmode="decimal" required style="max-width:120px" value="' + (hoje ? String(Math.round(hoje * 10000) / 10000).replace('.', ',') : '') + '"></label>' +
          '<span class="tiny muted">' + esc(tr('Use a PTAX de 31/12; o custo em R$ da declaração fica na nota.' + (hoje ? ' Veio preenchido com o dólar de hoje.' : ' Sem internet o app não sabe o dólar: preencha para liberar as posições em moeda estrangeira.'),
            'Use the PTAX rate of 31/12; the R$ cost on the return stays in the note.')) + '</span></div>';
        h += '<div id="dePosLista">' + listaPos(ps, casa) + '</div>';
      }
      if (ps.conferir.length) h += '<p class="tiny muted" style="margin:2px 0 8px">' + esc(tr('Para conferir à mão (' + ps.conferir.length + '): ', 'To check by hand (' + ps.conferir.length + '): ') +
        ps.conferir.slice(0, 6).map(function (b) { return nomeBem(b) + ' ' + fmt(b.depois); }).join(' · ')) + '</p>';
      /* 3.70: BudgetONE — dependentes, fontes e contas fixas */
      var bg = API.budget(d), dNovos = bg.deps.filter(function (x) { return !x.ja; });
      if (bg.deps.length) h += '<label class="linha-check"><input type="checkbox" id="deDeps"' + (dNovos.length ? ' checked' : ' disabled') + '> <span><b>' + esc(tr('Dependentes → Pessoas', 'Dependants → People')) + '</b> <span class="small muted">' +
        esc(dNovos.length ? tr('cadastrar ' + dNovos.map(function (x) { return x.nome; }).join(', ') + ' (da casa, dependente no IR)', 'add ' + dNovos.map(function (x) { return x.nome; }).join(', ')) : tr('todos já estão no cadastro', 'all already registered')) + '</span></span></label>';
      if (bg.fontes.length) h += '<div class="dec-sub"><b class="small">' + esc(tr('Fontes pagadoras → Rendas', 'Paying sources → Income')) + '</b>' + bg.fontes.map(function (f, k) {
        return '<label class="linha-check small"><input type="checkbox" class="de-fonte" data-k="' + k + '"' + (f.ja ? '' : ' checked') + '> ' + esc(f.nome) + ' · ' + fmt(f.valor) + tr(' no ano', ' in the year') +
          (f.ja ? ' <span class="muted">' + esc(tr('(já existe)', '(already there)')) + '</span>' : '') + '</label>'; }).join('') + '</div>';
      if (bg.compromissos.length) h += '<div class="dec-sub"><b class="small">' + esc(tr('Contas fixas → Custos (sugestão)', 'Fixed bills → Costs (suggestion)')) + '</b>' + bg.compromissos.map(function (c, k) {
        return '<label class="linha-check small"><input type="checkbox" class="de-comp" data-k="' + k + '"> ' + esc(c.nome) + ' · ' + fmt(c.mes) + tr('/mês (o ano ÷ 12)', '/month (year ÷ 12)') +
          (c.ja ? ' <span class="muted">' + esc(tr('(parece já existir)', '(seems to exist)')) + '</span>' : '') + '</label>'; }).join('') + '</div>';
      var bp = API.baseProxima(d);
      h += '<p class="tiny muted dec-base">' + esc(tr('A declaração de ' + bp.ano + ' já começa com ' + bp.bens + ' bens, ' + bp.dependentes + ' dependentes e ' + bp.fontes + ' fontes desta.',
        'The ' + bp.ano + ' return already starts with ' + bp.bens + ' assets, ' + bp.dependentes + ' dependants and ' + bp.fontes + ' sources from this one.')) + '</p>';
      h += '<label class="linha-check"><input type="checkbox" id="deRest"' + (d.restituir > 0 ? '' : ' disabled') + '> <span><b>' + esc(tr('Lançar a restituição como renda prevista', 'Add the refund as expected income')) + (d.restituir > 0 ? ' · ' + fmt(d.restituir) : '') + '</b><br><span class="small muted">' +
        esc(tr('Desmarcado de propósito: pode cair na malha, atrasar ou vir diferente. Marcando, entra na data do lote, a confirmar quando cair.', 'Off on purpose: it may be held, delayed or differ. If ticked, it goes in on the batch date, to confirm when it lands.')) + '</span>' +
        ' <input type="date" id="deRestData" value="' + exe + '-07-31" aria-label="' + esc(tr('data do lote', 'batch date')) + '"></span></label>';
      h += '<label class="linha-check"><input type="checkbox" id="dePagar"' + (d.pagar > 0 ? '' : ' disabled') + '> <span><b>' + esc(tr('Imposto a pagar / quotas → compromissos', 'Tax due / instalments → commitments')) + (d.pagar > 0 ? ' · ' + fmt(d.pagar) : '') + '</b><br><span class="small muted">' +
        esc(tr('No último dia útil de cada mês, a partir de maio.', 'On the last business day of each month, from May.')) + '</span> <select id="deQuotas">' +
        [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return '<option value="' + n + '">' + (n === 1 ? tr('cota única', 'single payment') : n + tr(' quotas', ' instalments')) + '</option>'; }).join('') + '</select></span></label>';
      h += '<label class="linha-check"><input type="checkbox" id="deConf" checked> <span><b>' + esc(tr('Conferir as deduções com o app', 'Check deductions against the app')) + '</b><br><span class="small muted">' +
        esc(tr('Saúde e educação da declaração × os lançamentos marcados para IR: o que falta de um lado ou do outro.', 'Health and education in the return × entries marked for tax: what is missing on either side.')) + '</span></span></label>';
      return h + '</div>';
    },
    ler: function () {
      var q = function (s) { return document.querySelector(s); };
      if (!q('.dec-esc')) return null;
      var bens = [];
      document.querySelectorAll('.de-bem').forEach(function (c) {
        if (!c.checked) return;
        var i = c.dataset.i, dn = q('.de-dono[data-i="' + i + '"]'), dv = q('.de-div[data-i="' + i + '"]');
        bens.push({ i: Number(i), dono: dn ? dn.value : '', divida: dv && dv.value !== '' ? Number(dv.value) : null });
      });
      return { bens: q('#deBens') && q('#deBens').checked ? bens : [], rest: !!(q('#deRest') && q('#deRest').checked), restData: (q('#deRestData') || {}).value || '',
        pagar: !!(q('#dePagar') && q('#dePagar').checked), quotas: Number((q('#deQuotas') || {}).value) || 1, conf: !!(q('#deConf') && q('#deConf').checked),
        /* 3.70 */
        usd: lerDolar(),
        pos: q('#dePos') && q('#dePos').checked ? Array.prototype.map.call(document.querySelectorAll('.de-pos'), function (c) { var dn = q('.de-pos-dono[data-k="' + c.dataset.k + '"]'); return { k: Number(c.dataset.k), ok: c.checked, dono: dn ? dn.value : '' }; }) : null,
        deps: !!(q('#deDeps') && q('#deDeps').checked),
        fontes: Array.prototype.filter.call(document.querySelectorAll('.de-fonte'), function (c) { return c.checked; }).map(function (c) { return Number(c.dataset.k); }),
        comps: Array.prototype.filter.call(document.querySelectorAll('.de-comp'), function (c) { return c.checked; }).map(function (c) { return Number(c.dataset.k); }) };
    },
    aplicar: function (d, e) {
      if (!e) return null;
      var r = { bens: 0, novos: 0, rest: false, quotas: 0, conf: null }, todos = API.bens(d);
      e.bens.forEach(function (sel) {
        var x = todos.find(function (t) { return t.i === sel.i; }); if (!x || !window.PatrimonioIliquido) return;
        var p = sel.dono && window.Pessoas ? Pessoas.porId(sel.dono) : null, dv = sel.divida != null ? (d.dividas || [])[sel.divida] : null;
        var obs = [p ? tr('De ', 'Owner: ') + Pessoas.rotulo(p) : '', dv ? tr('Dívida: ', 'Debt: ') + String(dv.desc).slice(0, 60) + ' · ' + fmt(dv.depois) : ''].filter(Boolean).join(' · ');
        var data = (d.anoCalendario || (d.exercicio - 1)) + '-12-31', o = x.ja;
        if (o) { o.valor = Math.round(x.b.depois * 100) / 100; o.data = data; if (obs) o.obs = obs; r.bens++; }
        else { o = PatrimonioIliquido.adicionar({ nome: x.nome, tipo: x.tipo, inst: '', valor: x.b.depois, data: data, obs: obs }); r.novos++; }
        o.decRef = x.b.grupo + '.' + x.b.codigo + '|' + N(x.b.desc).slice(0, 40);
        if (p) { o.dono = Pessoas.rotulo(p); o.donoId = p.id; }
        if (dv) o.divida = { desc: String(dv.desc).slice(0, 80), valor: dv.depois };
      });
      var exe = d.exercicio || (d.anoCalendario + 1);
      if (e.rest && d.restituir > 0 && typeof Recorrente !== 'undefined') {
        var dt = /^\d{4}-\d{2}-\d{2}$/.test(e.restData) ? e.restData : exe + '-07-31';
        Recorrente.add({ nome: tr('Restituição do IR ', 'Tax refund ') + exe, valor: d.restituir, grupo: 'RENDA', sub: tr('Restituição IR', 'Tax refund'), regra: 'dia', dia: Number(dt.slice(8, 10)),
          desde: dt.slice(0, 8) + '01', ate: dt, estadoPadrao: 'pendente', obs: tr('a confirmar quando cair (malha, atraso)', 'to confirm when it lands') });
        r.rest = true;
      }
      if (e.pagar && d.pagar > 0 && typeof Recorrente !== 'undefined') {
        var n = Math.max(1, Math.min(8, e.quotas)), ate = new Date(Date.UTC(exe, 4 + n - 1, 28)).toISOString().slice(0, 10);
        Recorrente.add({ nome: tr('IR ', 'Income tax ') + exe + (n > 1 ? tr(' — quotas', ' — instalments') : tr(' — cota única', ' — single payment')), valor: Math.round(d.pagar / n * 100) / 100, grupo: 'BANCARIOS', sub: tr('Imposto de renda', 'Income tax'),
          regra: 'dia', dia: -1, desde: exe + '-05-01', ate: ate, estadoPadrao: 'pendente' });
        r.quotas = n;
      }
      if (e.conf) r.conf = API.conferir(d);
      /* 3.70: a carteira, as pessoas, as rendas e os compromissos (tudo reservado) */
      r.pos = 0; r.deps = 0; r.fontes = 0; r.comps = 0;
      if (e.pos && window.ImportarPosicoes) {
        var ps = API.posicoes(d, e.usd).lista;
        e.pos.forEach(function (s) { var x = ps[s.k]; if (!x) return; x.marcado = s.ok && !x.problema; if (x.marcado && x.item) {
          var p = s.dono && window.Pessoas ? Pessoas.porId(s.dono) : null; if (p) { x.item.dono = Pessoas.rotulo(p); x.item.donoId = p.id; } } });
        /* "já existe: atualizar?" marcado: atualiza a posição que existe (valor de 31/12), não cria outra */
        ps.forEach(function (x) { if (!x.marcado || !x.jaExiste || !x.item) return; var ja = jaNaCarteira(x.item, x.bem); if (!ja) return;
          ['qtd', 'pm', 'data', 'notas', 'decRef', 'cnpj', 'dono', 'donoId'].forEach(function (k) { if (x.item[k] != null) ja[k] = x.item[k]; });
          if (x.item.valorManual) { ja.valorManual = x.item.valorManual; ja.valorManualData = x.item.valorManualData; }
          x.marcado = false; r.pos++; });
        r.pos += ImportarPosicoes.importar(ps).liquidas;
      }
      var bg = API.budget(d), ano = d.anoCalendario || (exe - 1);
      if (e.deps && window.Pessoas) bg.deps.forEach(function (x) { if (x.ja || achaPessoa(x.nome)) return; Pessoas.salvar({ tipo: 'casa', papel: 'dependente', nome: x.nome }).irDependente = true; r.deps++; });
      if (typeof Recorrente !== 'undefined') {
        (e.fontes || []).forEach(function (k) { var f = bg.fontes[k]; if (!f || !(f.valor > 0)) return;
          Recorrente.add({ nome: f.nome, valor: Math.round(f.valor / 12 * 100) / 100, grupo: 'RENDA', sub: tr('Renda', 'Income'), regra: 'dia', dia: 5, desde: exe + '-01-01',
            renda: { tipo: 'outro' }, escopo: 'reservado', obs: tr('da declaração ', 'from the return ') + exe + tr(': ', ': ') + fmt(f.valor) + tr(' em ', ' in ') + ano });
          r.fontes++; });
        (e.comps || []).forEach(function (k) { var c = bg.compromissos[k]; if (!c) return;
          Recorrente.add({ nome: c.nome, valor: c.mes, grupo: c.educacao ? 'DEPENDENTES' : 'SAUDE', sub: c.educacao ? tr('Escola', 'School') : tr('Plano de saúde', 'Health plan'), regra: 'dia', dia: 10,
            desde: exe + '-01-01', irpf: true, varia: true, escopo: 'reservado', obs: tr('valor de referência: o ano de ', 'reference: ') + ano + tr(' na declaração ÷ 12', ' on the return ÷ 12') });
          r.comps++; });
      }
      return r;
    },
    conferir: function (d) {
      var ano = String(d.anoCalendario || (d.exercicio - 1)), out = {};
      ['saude', 'educacao'].forEach(function (k) {
        var dec = (d.pagamentos || []).filter(function (p) { return classe(p.codigo) === k; }).map(function (p) { return { nome: p.nome, valor: (p.valor || 0) - (p.naoDedutivel || 0) }; });
        var app = (typeof Gasto !== 'undefined' ? Gasto.todos() : []).filter(function (g) {
          return g.irpf && String(g.data || '').slice(0, 4) === ano && (k === 'saude' ? g.grupo === 'SAUDE' : (g.grupo === 'DEPENDENTES' && /escola|col[eé]gio|faculd|educa|curso/i.test(g.sub)));
        });
        var parecido = function (a, b) { return window.Profissionais ? Profissionais.parecido(Profissionais.norm(a), Profissionais.norm(b)) >= 0.5 : N(a) === N(b); };
        var soDec = dec.filter(function (x) { return !app.some(function (g) { return parecido(x.nome, g.desc) || parecido(x.nome, g.sub); }); });
        var soApp = app.filter(function (g) { return !dec.some(function (x) { return parecido(x.nome, g.desc) || parecido(x.nome, g.sub); }); });
        out[k] = { dec: dec.reduce(function (s, x) { return s + x.valor; }, 0), app: app.reduce(function (s, g) { return s + (Number(g.valor) || 0); }, 0),
          soDec: soDec, soApp: soApp.map(function (g) { return { desc: g.desc, valor: g.valor, data: g.data }; }) };
      });
      return out;
    },
    /* o resultado da conferência, numa janela depois de salvar */
    mostrarConferencia: function (c) {
      if (!c) return;
      var bloco = function (k, rot) {
        var x = c[k], dif = Math.round((x.dec - x.app) * 100) / 100;
        return '<h4 class="bl-sub">' + esc(rot) + '</h4><p class="small">' + esc(tr('Declaração ', 'Return ') + fmt(x.dec) + tr(' · app (marcados IR) ', ' · app (marked for tax) ') + fmt(x.app)) +
          (Math.abs(dif) > 1 ? ' · <b class="down">' + esc(tr('diferença ', 'difference ') + fmt(dif)) + '</b>' : ' · <b class="up">✓</b>') + '</p>' +
          (x.soDec.length ? '<p class="tiny muted" style="margin:0">' + esc(tr('Só na declaração: ', 'Only in the return: ') + x.soDec.slice(0, 8).map(function (y) { return y.nome + ' ' + fmt(y.valor); }).join(' · ')) + '</p>' : '') +
          (x.soApp.length ? '<p class="tiny muted" style="margin:0">' + esc(tr('Só no app: ', 'Only in the app: ') + x.soApp.slice(0, 8).map(function (y) { return y.desc + ' ' + fmt(y.valor); }).join(' · ')) + '</p>' : '');
      };
      document.getElementById('genTitle').textContent = tr('Deduções: declaração × app', 'Deductions: return × app');
      document.getElementById('genBody').innerHTML = Verter.html(bloco('saude', tr('Saúde', 'Health')) + bloco('educacao', tr('Educação', 'Education')) +
        '<div class="f-actions"><button class="btn primary" data-close="genModal">' + esc(tr('Fechar', 'Close')) + '</button></div>');
      abrir('genModal');
    }
  };

  /* o dólar de 31/12 mudou: refaz a lista das posições (o que estava sem dólar fica liberado) */
  document.addEventListener('input', function (ev) {
    if (!ev.target || ev.target.id !== 'deDolar' || typeof txDec === 'undefined' || !txDec) return;
    var box = document.getElementById('dePosLista'); if (!box) return;
    var ps = API.posicoes(txDec, lerDolar()); box.innerHTML = listaPos(ps, casaOpcoes());
    var c = document.getElementById('dePos'); if (c && ps.lista.some(function (x) { return x.marcado; })) c.checked = true;
  });

  MoneyModulos.registrar({ id: 'declaracao-escolhas', versao: '1.1.0', pontos: { 'declaracao.escolhas': function (ctx) { return API.html(ctx.d); } } });
  window.DeclEscolhas = API;
})();
