/* =====================================================================
   modulos/posicoes-texto.js — "Importar posições" sem arquivo: 📋 Colar texto e 📷 Foto ou print   1.2.0 · 27/Nov/2026 (3.134)
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono: "deveria ter um jeito mais conveniente")
     Duas entradas novas no topo da Carteira, que caem na MESMA prévia do "Importar posições (JSON)" (modulos/importar-posicoes.js:
     o que já existe vem desmarcado, nada duplica, nada é trocado):
       · 📋 Colar texto: o que a pessoa copiou da corretora ou o que outro assistente gerou;
       · 📷 Foto ou print da tela: OCR NO APARELHO (o mesmo motor do "📋 Colar print", PrintColar.lerImagem), sem IA, no Fundo;
         a imagem compartilhada com o app ("📈 Posições de investimento") também cai aqui.
     Leitor sem IA (ler):
       a) tabela com | ou tab e cabeçalho (Ticker/Ativo/Código, Nome, Qtd/Quantidade, Preço médio/PM, Preço atual, Valor atual);
       b) blocos de previdência "Plano NNNN / Saldo bruto R$ X / Saldo líquido estimado R$ Y / Modalidade PGBL|VGBL /
          Regime tributário Regressivo|Progressivo".
       Números 1.234,56 e 1234.56; US$ quando o texto diz US$, dólar ou USD ou a corretora é a Avenue; senão R$.
       Tipos: acao-us / etf-us / bond-us (valor aplicado e valor atual) em US$; acao-br / fii em R$; previdencia (pm = valorAtual =
       saldo bruto; o resto na observação). A instituição é perguntada uma vez, com palpite pelo texto.
     Nada reconhecido: mostra o texto lido e "não reconheci este formato; cole o texto ou mande a tela por e-mail".
   API (window.PosicoesTexto)
     num(t) · ler(texto) → {itens, inst} · daTexto(texto) · daImagens(arquivos) · botoes()
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function N(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
  function e$(t) { return typeof esc === 'function' ? esc(t) : String(t == null ? '' : t); }

  var INST = [['Avenue', /\bavenue\b/], ['BTG Pactual', /\bbtg\b/], ['XP', /\bxp\b/], ['Itaú', /\bitau\b/], ['Bradesco', /\bbradesco\b/], ['Nubank', /\bnubank\b|\bnu invest\b/],
    ['Inter', /\binter\b/], ['Rico', /\brico\b/], ['Clear', /\bclear\b/], ['Santander', /\bsantander\b/], ['Caixa', /\bcaixa\b/], ['Banco do Brasil', /banco do brasil/],
    ['Nomad', /\bnomad\b/], ['Interactive Brokers', /interactive brokers|\bibkr\b/], ['Toro', /\btoro\b/], ['Modal', /\bmodal\b/]];
  var ETFS_US = /^(SPY|VOO|IVV|VTI|VT|QQQ|QQQM|VXUS|VEA|VWO|IEFA|IEMG|BND|AGG|BNDX|TLT|IEF|SHY|SGOV|BIL|SCHD|VIG|VYM|VNQ|GLD|IAU|SLV|XLK|XLF|XLE|XLV|ARKK|DIA|IWM|EFA|EEM|VGT|SCHB|SCHX|ITOT|IXUS|JEPI|JEPQ)$/;

  var API = {
    /* "1.234,56" → 1234.56 · "1234.56" → 1234.56 · "1,234.56" → 1234.56 · "1.234" → 1234 */
    num: function (t) {
      var s = String(t == null ? '' : t).replace(/[^\d.,-]/g, ''); if (!/\d/.test(s)) return null;
      var v = s.lastIndexOf(','), p = s.lastIndexOf('.');
      if (v >= 0 && p >= 0) s = v > p ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
      else if (v >= 0) s = s.match(/,/g).length > 1 ? s.replace(/,/g, '') : s.replace(',', '.');
      else if (p >= 0 && (s.match(/\./g).length > 1 || /^-?\d{1,3}\.\d{3}$/.test(s))) s = s.replace(/\./g, '');
      var n = Number(s); return isFinite(n) ? n : null;
    },
    palpiteInst: function (texto) { var n = N(texto); for (var i = 0; i < INST.length; i++) if (INST[i][1].test(n)) return INST[i][0]; return ''; },
    ler: function (texto) {
      var t = String(texto || ''), n = N(t), usd = /us\$|\busd\b|d[oó]lar|\bavenue\b/i.test(t), itens = [];
      /* a) a tabela: a linha do cabeçalho e as de baixo, com | ou tab */
      var linhas = t.split(/\r?\n/), col = null;
      linhas.forEach(function (l) {
        if (!/[|\t]/.test(l)) return;
        var cs = l.split(/\s*[|\t]\s*/).map(function (x) { return x.trim(); }).filter(function (x, i, a) { return !(x === '' && (i === 0 || i === a.length - 1)); });
        if (cs.every(function (x) { return /^[-:\s]*$/.test(x); })) return;   /* a linha |---|---| do markdown */
        var cab = cs.map(N);
        if (cab.some(function (x) { return /^(ticker|ativo|codigo|simbolo|symbol|papel)$/.test(x); }) && cab.some(function (x) { return /^(qtd|quantidade|qtde|quant)\.?$/.test(x); })) {
          col = {};
          cab.forEach(function (x, i) {
            if (/^(ticker|ativo|codigo|simbolo|symbol|papel)$/.test(x)) col.tk = i;
            else if (/^(nome|descricao|name|produto)$/.test(x)) col.nome = i;
            else if (/^(qtd|quantidade|qtde|quant)\.?$/.test(x)) col.qtd = i;
            else if (/preco medio|^pm$|custo medio/.test(x)) col.pm = i;
            else if (/preco atual|cotacao|ultimo/.test(x)) col.atual = i;
            else if (/valor atual|^valor$|saldo|valor de mercado|total/.test(x)) col.valor = i;
            else if (/valor aplicado|aplicado|investido/.test(x)) col.aplicado = i;
          });
          return;
        }
        if (!col || col.tk == null) return;
        var tk = String(cs[col.tk] || '').trim(); if (!tk || !/[A-Za-z0-9]/.test(tk)) return;
        var g = function (k) { return col[k] != null ? API.num(cs[col[k]]) : null; };
        var linhaUsd = usd || /us\$/i.test(l), q = g('qtd'), pm = g('pm'), atual = g('atual'), valor = g('valor'), aplic = g('aplicado');
        var nome = col.nome != null ? String(cs[col.nome] || '').trim() : '', T = tk.toUpperCase(), it;
        if (linhaUsd && (/bond|treasury|t-bill|\bnote\b|corporate|cusip/i.test(nome + ' ' + tk) || /^[0-9A-Z]{9}$/.test(T) && /\d/.test(T) && /[A-Z]/.test(T))) {
          var ap = aplic || (q && pm ? q * pm : pm), va = valor || (q && atual ? q * atual : null);
          it = { ticker: T, nome: nome, tipo: 'bond-us', moeda: 'USD', pm: ap || va, valorAtual: va || ap };
        } else if (q && (pm || atual || valor)) {
          var tipo = linhaUsd ? (ETFS_US.test(T) || /\betf\b/i.test(nome) ? 'etf-us' : 'acao-us') : (/^[A-Z]{4}11$/.test(T) ? 'fii' : (/^[A-Z]{4}\d{1,2}$/.test(T) ? 'acao-br' : null));
          if (!tipo) it = { ticker: T, nome: nome, tipo: 'outro', moeda: linhaUsd ? 'USD' : 'BRL', pm: valor || q * (pm || atual), valorAtual: valor || null };
          else it = { ticker: T, nome: nome, tipo: tipo, moeda: linhaUsd ? 'USD' : 'BRL', qtd: q, pm: pm || atual || (valor ? valor / q : 0) };
        } else if (valor) it = { ticker: T, nome: nome, tipo: 'outro', moeda: linhaUsd ? 'USD' : 'BRL', pm: valor, valorAtual: valor };
        if (it) itens.push(it);
      });
      /* c) 1.1.0 (3.137): o extrato mensal da Avenue (PDF), com as colunas pela ordem: [descrição] SYMBOL "C" QUANTIDADE PREÇO [$] VALOR …;
         a linha sem dígitos logo depois do papel continua o nome; o título do bond ("EXBZ 6.75 28/01/28") vem depois da linha do bond;
         números americanos (1,234.56); sem preço médio (fica o preço do extrato, com o aviso) */
      if (/SYMBOL\/|TOTAL PRICED PORTFOLIO|AVENUE ACCOUNT NUMBER/i.test(t)) {
        var us = function (x) { var v = Number(String(x || '').replace(/[$,\s]/g, '')); return isFinite(v) ? v : null; };
        var MES = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
        var per = t.match(/[A-Za-z]+ \d{1,2}, \d{4}\s*-\s*([A-Za-z]+) (\d{1,2}), (\d{4})/), data = per && MES[per[1].toLowerCase()] ? per[3] + '-' + MES[per[1].toLowerCase()] + '-' + ('0' + per[2]).slice(-2) : '';
        var aviso = tr('Preço médio a informar: o extrato', 'Average price to add: the statement', 'Precio medio por informar: el extracto') + (data ? ' ' + tr('de ', 'of ', 'del ') + data.slice(8) + '/' + data.slice(5, 7) + '/' + data.slice(0, 4) : '') + tr(' não traz.', ' does not have it.', ' no lo trae.');
        var secao = 'acoes', ult = null, av = [];
        linhas.forEach(function (l0) {
          var l = l0.replace(/\s+/g, ' ').trim(); if (!l) return;
          if (/^EQUITIES/i.test(l)) { secao = 'acoes'; ult = null; return; }
          if (/^FIXED INCOME/i.test(l)) { secao = 'bonds'; ult = null; return; }
          var cx = l.match(/^Total Cash\b[^$\d]*\$?\s*([\d,]+\.\d{2})/i);
          if (cx) { var vc = us(cx[1]); if (vc > 0) av.push({ ticker: 'USD', nome: 'Dinheiro em USD', tipo: 'caixa', moeda: 'USD', qtd: vc, pm: 1 }); ult = null; return; }
          if (/^total\b/i.test(l)) { ult = null; return; }
          var m = /^(.*?)\s*\b([A-Z0-9]{1,9})\s+C\s+(-?[\d,]*\.?\d+)\s+(-?[\d,]*\.?\d+)\s+\$?\s*(-?[\d,]*\.?\d+)/.exec(l);
          if (m) {
            var tk = m[2], q = us(m[3]), pr = us(m[4]), vm = us(m[5]), nome = m[1].replace(/\s*-\s*$/, '').trim() || tk;
            /* 1.2.0 (3.139): sem preço médio no extrato: "a informar" (nunca o preço do dia) */
            if (secao === 'bonds') ult = { ticker: tk, nome: nome, tipo: 'bond-us', moeda: 'USD', pm: vm, valorAtual: vm, pmAInformar: true, notas: aviso };
            else ult = { ticker: tk, nome: nome, tipo: ETFS_US.test(tk) || /\betf\b|\bfund\b|\btrust\b/i.test(nome) ? 'etf-us' : 'acao-us', moeda: 'USD', qtd: q, pm: 0, pmAInformar: true, notas: aviso };
            av.push(ult); return;
          }
          var bt = /^([A-Z]{3,})\s+([\d.]+)\s+(\d{2})\/(\d{2})\/(\d{2})$/.exec(l);
          if (bt && ult && ult.tipo === 'bond-us') { ult.nome = l + (ult.nome && ult.nome !== ult.ticker ? ' · ' + ult.nome : ''); ult.vencimento = '20' + bt[5] + '-' + bt[4] + '-' + bt[3]; return; }
          if (ult && !/\d/.test(l) && l.length <= 60) { ult.nome = (ult.nome === ult.ticker ? '' : ult.nome + ' ') + l; return; }
          ult = null;
        });
        if (av.length) { av.forEach(function (x) { itens.push(x); }); return { itens: itens, inst: 'Avenue', data: data }; }
      }
      /* b) a previdência: um bloco por "Plano NNNN" */
      var partes = t.split(/(?=\bplano\s*(?:n[ºo°.]?\s*)?\d{3,})/i);
      partes.forEach(function (b) {
        var m = b.match(/^\s*plano\s*(?:n[ºo°.]?\s*)?(\d{3,})/i); if (!m) return;
        var br = b.match(/saldo\s+bruto[^\d]{0,12}([\d.,]+)/i); if (!br) return;
        var bruto = API.num(br[1]), liq = (b.match(/saldo\s+l[ií]quido(?:\s+estimado)?[^\d]{0,12}([\d.,]+)/i) || [])[1], mod = (b.match(/modalidade\s*:?\s*(PGBL|VGBL)/i) || [])[1], reg = (b.match(/regime\s+tribut[aá]rio\s*:?\s*(regressivo|progressivo)/i) || [])[1];
        if (!(bruto > 0)) return;
        var notas = [liq ? tr('Saldo líquido estimado R$ ', 'Estimated net balance R$ ', 'Saldo neto estimado R$ ') + liq : '', mod ? mod.toUpperCase() : '', reg ? tr('regime ', 'regime ', 'régimen ') + reg.toLowerCase() : ''].filter(Boolean).join(' · ');
        itens.push({ ticker: 'PLANO ' + m[1], nome: tr('Previdência ', 'Pension ', 'Previsión ') + (mod ? mod.toUpperCase() + ' ' : '') + m[1], tipo: 'previdencia', moeda: 'BRL', pm: bruto, valorAtual: bruto, notas: notas });
      });
      return { itens: itens, inst: API.palpiteInst(t) };
    },
    /* o passo comum: a instituição (com o palpite) e então a mesma prévia do JSON */
    daTexto: function (texto) {
      var r = API.ler(texto);
      $('#genTitle').textContent = tr('Importar posições', 'Import positions', 'Importar posiciones');
      if (!r.itens.length) {
        $('#genBody').innerHTML = Verter.html('<p class="imp-erro small pt-nada">' + e$(tr('Não reconheci este formato; cole o texto ou mande a tela por e-mail.', 'I did not recognise this format; paste the text or send the screen by e-mail.', 'No reconocí este formato; pega el texto o envía la pantalla por correo.')) + '</p>' +
          (String(texto || '').trim() ? '<details><summary class="small">' + e$(tr('O texto lido', 'The text read', 'El texto leído')) + '</summary><pre class="pt-lido">' + e$(String(texto).slice(0, 4000)) + '</pre></details>' : '') +
          '<div class="f-actions"><button class="btn" data-close="genModal">OK</button><button class="btn primary" data-acao="pt-colar">📋 ' + e$(tr('Colar texto', 'Paste text', 'Pegar texto')) + '</button></div>');
        abrir('genModal'); return r;
      }
      API._lido = r;
      $('#genBody').innerHTML = Verter.html('<p class="small">' + e$(tr('Achei ' + r.itens.length + ' posição(ões). De qual corretora ou banco?', 'I found ' + r.itens.length + ' position(s). Which broker or bank?', 'Encontré ' + r.itens.length + ' posición(es). ¿De qué bróker o banco?')) + '</p>' +
        (r.data ? '<p class="small pt-data">' + e$(tr('Extrato de ', 'Statement of ', 'Extracto del ') + r.data.slice(8) + '/' + r.data.slice(5, 7) + '/' + r.data.slice(0, 4) + tr(': se você vendeu algum papel depois, desmarque.', ': if you sold anything after that, untick it.', ': si vendiste algo después, desmárcalo.')) + '</p>' : '') +   /* 1.1.0 (3.137) */
        '<label class="f"><span class="lb">' + e$(tr('Corretora ou banco', 'Broker or bank', 'Bróker o banco')) + '</span><input id="ptInst" value="' + e$(r.inst) + '" placeholder="' + e$(tr('ex.: Avenue, BTG, XP', 'e.g. Avenue, BTG, XP', 'ej.: Avenue, BTG, XP')) + '" autocomplete="off"></label>' +
        '<div class="f-actions"><button class="btn" data-close="genModal">' + e$(tr('Cancelar', 'Cancel', 'Cancelar')) + '</button><button class="btn primary" data-acao="pt-previa">' + e$(tr('Ver a prévia', 'See the preview', 'Ver la vista previa')) + '</button></div>');
      abrir('genModal'); return r;
    },
    /* a foto ou o print: OCR no aparelho, no Fundo (nunca morre ao sair da tela); o texto passa pelo mesmo leitor */
    daImagens: async function (arquivos) {
      arquivos = [].slice.call(arquivos || []).filter(function (a) { return a && /^image\//.test(a.type || ''); });
      if (!arquivos.length || !window.PrintColar || !PrintColar.lerImagem) return;
      var id = 'posicoes-foto', temFundo = typeof Fundo !== 'undefined', txt = '';
      if (temFundo) Fundo.comecar({ id: id, titulo: tr('Lendo as posições…', 'Reading the positions…', 'Leyendo las posiciones…') });
      try {
        for (var i = 0; i < arquivos.length; i++) txt += '\n' + await PrintColar.lerImagem(arquivos[i], function (m) { if (temFundo) Fundo.passo(id, m); });
        if (temFundo) { Fundo.terminar(id, tr('Posições lidas', 'Positions read', 'Posiciones leídas')); Fundo.limpar(id); }
      } catch (e) { if (temFundo) Fundo.limpar(id); }
      return API.daTexto(txt);
    },
    botoes: function () {
      return '<button class="btn sm" data-acao="pt-colar">📋 ' + e$(tr('Colar texto', 'Paste text', 'Pegar texto')) + '</button>' +
        '<button class="btn sm" data-acao="pt-foto">📷 ' + e$(tr('Foto ou print', 'Photo or screenshot', 'Foto o captura')) + '</button>';
    },
    _lido: null
  };

  MoneyModulos.registrar({
    id: 'posicoes-texto',
    versao: '1.2.0',
    acoes: {
      'pt-colar': function () {
        $('#genTitle').textContent = tr('Colar posições', 'Paste positions', 'Pegar posiciones');
        $('#genBody').innerHTML = Verter.html('<p class="small muted">' + e$(tr('Cole a tabela que você copiou da corretora (ou que outro assistente gerou), ou a tela da previdência. Nada sai do aparelho.', 'Paste the table you copied from the broker (or another assistant made), or the pension screen. Nothing leaves the device.', 'Pega la tabla que copiaste del bróker (o que generó otro asistente), o la pantalla de la previsión. Nada sale del dispositivo.')) + '</p>' +
          '<textarea id="ptTexto" rows="9" style="width:100%;font-family:monospace;font-size:.85rem" placeholder="Ticker | Nome | Qtd | Preço médio | Valor atual"></textarea>' +
          '<div class="f-actions"><button class="btn" data-close="genModal">' + e$(tr('Cancelar', 'Cancel', 'Cancelar')) + '</button><button class="btn primary" data-acao="pt-ler">' + e$(tr('Ler', 'Read', 'Leer')) + '</button></div>');
        abrir('genModal'); setTimeout(function () { var x = document.getElementById('ptTexto'); if (x) x.focus(); }, 50);
      },
      'pt-ler': function () { API.daTexto((document.getElementById('ptTexto') || {}).value || ''); },
      'pt-foto': function () {
        var i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.multiple = true; i.style.display = 'none';
        i.addEventListener('change', function () { var fs = [].slice.call(i.files || []); if (i.parentNode) i.parentNode.removeChild(i); if (fs.length) API.daImagens(fs); });
        document.body.appendChild(i); i.click();
      },
      'pt-previa': function () {
        var r = API._lido; if (!r) return;
        var inst = String((document.getElementById('ptInst') || {}).value || '').trim();
        var o = ImportarPosicoes.preparar({ tipo: 'moneytrio-posicoes', versao: 1, itens: r.itens.map(function (x) { return Object.assign({}, x, { inst: inst }); }) });
        API._lido = null; if (o.ok) ImportarPosicoes.mostrarPrevia(o.lista);
      }
    }
  });
  window.PosicoesTexto = API;
})();
