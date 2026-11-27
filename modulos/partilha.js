/* =====================================================================
   modulos/partilha.js — COMPARTILHAR PDF, CSV, XML ou OFX com o app (3.137)        1.0.0 · 27/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono: o MoneyTRIO não aparecia no "Compartilhar" do Android para um PDF, ex.: o extrato da corretora)
     · manifest.json: o share_target aceita, além de imagem, PDF, CSV, texto, XML (NF-e) e OFX/QFX (campo "arquivos"); o sw.js
       guarda no cache de passagem com o nome do arquivo e abre ./?print=1 (modulos/print-colar.js lê; só imagem → a pergunta
       de antes; com arquivo → a pergunta daqui).
     · "O que é isto?", com o palpite pelo nome e pelo texto (Stmt_/statement/Avenue/posições → posições; NF-e/XML/DANFE → nota;
       .ofx/.csv/OFXHEADER → extrato):
         📈 Posições de investimento → texto (PDF pelo leitor de PDF do app; CSV com ; ou , vira colunas) → o leitor da 3.134
            (modulos/posicoes-texto.js) e a mesma prévia;
         🧾 Nota, recibo ou conta → o 📷 Foto de nota ou recibo (modulos/canhotos.js; PDF com texto ou OCR; o XML vira texto);
         🏦 Extrato do banco → o "Importar arquivo" que já existe (OFX, CSV, PDF…).
     · Tudo no aparelho, no Fundo (pílula de andamento), sem IA; nada sobe para o servidor.
   API (window.Partilha)
     palpite(arquivos, texto?) → 'posicoes'|'nota'|'extrato'|'' · perguntar(arquivos) · ir(destino, arquivos) · textoDe(arquivo)
   PONTOS QUE USA
     ações pa-* (chamado por modulos/print-colar.js)
   ===================================================================== */
(function () {
  'use strict';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function ext(f) { return ((f && f.name || '').toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || ''; }
  function ePdf(f) { return ext(f) === 'pdf' || f.type === 'application/pdf'; }
  function eImg(f) { return /^image\//.test(f.type || ''); }
  function eXml(f) { return ext(f) === 'xml' || /xml/.test(f.type || ''); }
  var ROT = {
    posicoes: function () { return '📈 ' + tr('Posições de investimento', 'Investment positions', 'Posiciones de inversión'); },
    nota: function () { return '🧾 ' + tr('Nota, recibo ou conta', 'Invoice, receipt or bill', 'Factura, recibo o cuenta'); },
    extrato: function () { return '🏦 ' + tr('Extrato do banco', 'Bank statement', 'Extracto del banco'); }
  };
  var pendentes = null;

  var API = {
    palpite: function (arquivos, texto) {
      var nomes = [].map.call(arquivos || [], function (f) { return f.name || ''; }).join(' '), t = String(texto || '').slice(0, 6000);
      if ([].some.call(arquivos || [], function (f) { return /^(ofx|qfx|ofc)$/.test(ext(f)) || /ofx/.test(f.type || ''); }) || /OFXHEADER|<OFX>/i.test(t)) return 'extrato';
      if ([].some.call(arquivos || [], eXml) || /<infNFe|nfeProc|\bNF-?e\b|DANFE|nota fiscal/i.test(nomes + ' ' + t)) return 'nota';
      if (/stmt_|statement|avenue|posi[cç](ao|oes|ões)|carteira|portfolio|cust[oó]dia|holdings/i.test(nomes + ' ' + t)) return 'posicoes';
      if ([].some.call(arquivos || [], function (f) { return /^(csv|tsv)$/.test(ext(f)) || /csv/.test(f.type || ''); }) || /\bextrato\b|saldo anterior/i.test(nomes + ' ' + t)) return 'extrato';
      if (/recibo|cupom|fatura|boleto|conta de/i.test(nomes + ' ' + t)) return 'nota';
      return '';
    },
    /* o texto do arquivo, no aparelho: PDF pelo leitor de PDF do app; XML sem as marcações; o resto como texto */
    textoDe: async function (f) {
      if (ePdf(f)) return typeof PdfTexto !== 'undefined' && PdfTexto.disponivel() ? await PdfTexto.extrair(f, { linhas: true }) : '';
      if (eImg(f)) return window.PrintColar && PrintColar.lerImagem ? await PrintColar.lerImagem(f) : '';
      var t = await f.text();
      return eXml(f) ? t.replace(/<\?[^>]*\?>|<!--[\s\S]*?-->/g, '').replace(/<\/?[A-Za-z0-9_:.-]+[^>]*>/g, '\n').replace(/\n\s*\n+/g, '\n').trim() : t;
    },
    perguntar: async function (arquivos) {
      pendentes = [].slice.call(arquivos || []);
      if (!pendentes.length) return;
      var p = API.palpite(pendentes);
      if (!p) {   /* sem palpite pelo nome: olha o começo do texto (no aparelho) */
        var t = ''; for (var i = 0; i < pendentes.length && !p; i++) { if (eImg(pendentes[i])) continue; try { t = await API.textoDe(pendentes[i]); } catch (e) { t = ''; } p = API.palpite([pendentes[i]], t); }
      }
      var ordem = ['posicoes', 'nota', 'extrato']; if (p) ordem = [p].concat(ordem.filter(function (k) { return k !== p; }));
      $('#genTitle').textContent = tr('O que é isto?', 'What is this?', '¿Qué es esto?');
      $('#genBody').innerHTML = Verter.html('<p class="small muted pa-nomes">' + esc(pendentes.map(function (f) { return f.name || tr('arquivo', 'file', 'archivo'); }).join(' · ')) + '</p>' +
        (p ? '<p class="small pa-palpite">' + esc(tr('Parece: ', 'Looks like: ', 'Parece: ') + ROT[p]()) + '</p>' : '') +
        '<div class="f-actions" style="flex-wrap:wrap;gap:6px">' + ordem.map(function (k) { return '<button class="btn' + (k === p ? ' primary' : '') + '" data-acao="pa-dest" data-v="' + k + '">' + esc(ROT[k]()) + '</button>'; }).join('') + '</div>' +
        '<p class="tiny muted">' + esc(tr('Lido aqui no aparelho, sem IA: nada sobe para o servidor.', 'Read here on the device, no AI: nothing goes to the server.', 'Se lee aquí en el dispositivo, sin IA: nada se sube al servidor.')) + '</p>');
      abrir('genModal');
      return p;
    },
    ir: async function (dest, arquivos) {
      arquivos = [].slice.call(arquivos || []); if (!arquivos.length) return;
      var temFundo = typeof Fundo !== 'undefined', id = 'partilha-' + dest;
      if (dest === 'nota') {   /* o 📷 Foto de nota ou recibo (que já roda no Fundo); o XML entra como texto */
        var fs = [];
        for (var i = 0; i < arquivos.length; i++) fs.push(eXml(arquivos[i]) ? new File([await API.textoDe(arquivos[i])], (arquivos[i].name || 'nota').replace(/\.xml$/i, '') + '.txt', { type: 'text/plain' }) : arquivos[i]);
        if (window.Canhotos && Canhotos.processar) return Canhotos.processar(fs);
        return;
      }
      if (dest === 'extrato') {   /* o "Importar arquivo" de sempre (OFX, CSV, PDF…) */
        if (typeof abrirImportarPlanilha !== 'function' || typeof lerPlanilhas !== 'function') return;
        abrirImportarPlanilha();
        if (temFundo) Fundo.comecar({ id: id, titulo: tr('Lendo o extrato…', 'Reading the statement…', 'Leyendo el extracto…'), aoAbrir: function () { abrir('assetModal'); } });
        try { await lerPlanilhas(arquivos); if (temFundo) { Fundo.terminar(id, tr('Extrato lido', 'Statement read', 'Extracto leído')); Fundo.limpar(id); } }
        catch (e) { if (temFundo) Fundo.limpar(id); }
        return;
      }
      /* posições: o texto de todos os arquivos → o leitor da 3.134 → a mesma prévia */
      if (!window.PosicoesTexto) return;
      if (temFundo) Fundo.comecar({ id: id, titulo: tr('Lendo as posições…', 'Reading the positions…', 'Leyendo las posiciones…') });
      var txt = '';
      try {
        for (var k = 0; k < arquivos.length; k++) {
          var t = await API.textoDe(arquivos[k]);
          if (/^(csv|tsv)$/.test(ext(arquivos[k])) || /csv/.test(arquivos[k].type || '')) t = t.split(/\r?\n/).map(function (l) { return l.indexOf(';') >= 0 ? l.split(';').join('\t') : l.split(',').join('\t'); }).join('\n');
          txt += '\n' + t;
        }
        if (temFundo) { Fundo.terminar(id, tr('Posições lidas', 'Positions read', 'Posiciones leídas')); Fundo.limpar(id); }
      } catch (e) { if (temFundo) Fundo.limpar(id); }
      return PosicoesTexto.daTexto(txt);
    }
  };

  MoneyModulos.registrar({
    id: 'partilha',
    versao: '1.0.0',
    acoes: { 'pa-dest': function (el) { var fs = pendentes; pendentes = null; fechar('genModal'); if (fs) API.ir(el.dataset.v, fs); } }
  });
  window.Partilha = API;
})();
