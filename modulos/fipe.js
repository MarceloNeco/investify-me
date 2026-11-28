/* =====================================================================
   modulos/fipe.js — 🚗 o valor do carro ou da moto pela TABELA FIPE (3.141)        1.0.0 · 27/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, "PODE" em 27/Nov/2026)
     · No cadastro guiado de bens (modulos/bens.js), tipo "Carro ou moto": marca → modelo → ano, das listas da FIPE. Mostra
       "Valor FIPE de <mês/ano>: R$ X", guarda o código FIPE e o valor do bem passa a ser o da FIPE.
     · Uma vez por mês, ao abrir o app, busca o valor do mês (1 consulta por veículo; sem internet, fica o último).
     · "Usar o valor que eu acho": a pessoa troca pelo valor dela e aí o app não atualiza sozinho. Mexer no valor à mão marca isso.
     · Se a fonte falhar ou bater o limite: fica o último valor, com a data dele; nunca zera.
   FONTE (escolhida em 27/Nov/2026)
     API FIPE da Parallelum, v2 (https://fipe.parallelum.com.br/api/v2): gratuita, sem chave, CORS aberto (funciona do navegador),
     500 consultas por dia por endereço de internet. Dados da Tabela FIPE oficial, mês de referência na resposta.
     Só saem do app o tipo (carro/moto), a marca, o modelo e o ano (códigos da FIPE). Nada de placa, nome nem dono.
   DADOS (no bem, ST.patrimonio_iliquido)
     x.carro.fipe = {tipo: 'cars'|'motorcycles', marca, modelo, ano (códigos), codigo (código FIPE), valor, ref ("novembro de 2026"),
       mes ('AAAA-MM' em que já veio o valor do mês; no começo do mês, enquanto a FIPE do mês não sai, tenta de novo a cada abertura), em (ISO), falhou? (data da última tentativa que não deu)}
     x.valorManual = true → "o valor que eu acho" (não atualiza)
   API (window.Fipe)
     BASE · marcas(tipo) · modelos(tipo, marca) · anos(tipo, marca, modelo) · valor(tipo, marca, modelo, ano) · porCodigo(tipo, codigo, ano)
     preco("R$ 23.817,00") → 23817 · refMes("novembro de 2026") → '2026-11' · bloco(bem) → html para o formulário · atualizarTodos() → quantos mudaram
   PONTOS QUE USA
     iliquido.valor (a nota "Tabela FIPE de …" na lista dos bens) · chamado por modulos/bens.js
   ===================================================================== */
(function () {
  'use strict';
  var BASE = 'https://fipe.parallelum.com.br/api/v2';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function hoje() { return typeof hojeISO === 'function' ? hojeISO() : new Date().toISOString().slice(0, 10); }
  function mesDe(iso) { return String(iso || '').slice(0, 7); }
  var cache = {};

  async function get(caminho) {
    if (cache[caminho]) return cache[caminho];
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = ctl ? setTimeout(function () { ctl.abort(); }, 15000) : null;
    try {
      var r = await fetch(BASE + caminho, { signal: ctl ? ctl.signal : undefined });
      if (!r.ok) { var e = new Error('FIPE ' + r.status); e.status = r.status; throw e; }
      var j = await r.json();
      if (!/\/years\/[^/]+$/.test(caminho)) cache[caminho] = j;   /* as listas ficam na memória; o valor, não */
      return j;
    } finally { if (t) clearTimeout(t); }
  }
  function preco(s) { var n = Number(String(s || '').replace(/[^\d,]/g, '').replace(',', '.')); return isFinite(n) && n > 0 ? n : null; }
  function deResposta(tipo, marca, modelo, ano, j) {
    var v = preco(j && j.price); if (!v) throw new Error('FIPE sem preço');
    return { tipo: tipo, marca: String(marca), modelo: String(modelo), ano: String(ano), codigo: String(j.codeFipe || ''), valor: v, ref: String(j.referenceMonth || ''),
      nomeMarca: j.brand || '', nomeModelo: j.model || '', anoModelo: j.modelYear || '', mes: mesDe(hoje()), em: new Date().toISOString() };
  }

  var API = {
    BASE: BASE, preco: preco,
    marcas: function (tipo) { return get('/' + tipo + '/brands'); },
    modelos: function (tipo, marca) { return get('/' + tipo + '/brands/' + encodeURIComponent(marca) + '/models'); },
    anos: function (tipo, marca, modelo) { return get('/' + tipo + '/brands/' + encodeURIComponent(marca) + '/models/' + encodeURIComponent(modelo) + '/years'); },
    valor: async function (tipo, marca, modelo, ano) { return deResposta(tipo, marca, modelo, ano, await get('/' + tipo + '/brands/' + encodeURIComponent(marca) + '/models/' + encodeURIComponent(modelo) + '/years/' + encodeURIComponent(ano))); },
    porCodigo: async function (tipo, codigo, ano) { return get('/' + tipo + '/' + encodeURIComponent(codigo) + '/years/' + encodeURIComponent(ano)); },

    /* o bloco do formulário do carro: escolha da FIPE + "o valor que eu acho" */
    bloco: function (x) {
      x = x || {}; var f = (x.carro && x.carro.fipe) || null;
      var sel = function (id, rot, opt) { return '<label class="f"><span class="lb">' + esc(rot) + '</span><select id="' + id + '"' + (opt ? '' : ' disabled') + '>' + (opt || '<option value="">—</option>') + '</select></label>'; };
      return '<fieldset class="bn-bloco bn-fipe"><legend>' + esc(tr('Tabela FIPE', 'FIPE table (Brazil’s official used-car price list)', 'Tabla FIPE (precios oficiales de usados en Brasil)')) + '</legend>' +
        '<input type="hidden" id="bnFipe" value="' + esc(f ? JSON.stringify(f) : '') + '"><div class="grid g2">' +
        sel('bnFipeTipo', tr('Tipo', 'Type', 'Tipo'), '<option value="cars"' + (!f || f.tipo === 'cars' ? ' selected' : '') + '>' + esc(tr('Carro', 'Car', 'Coche')) + '</option><option value="motorcycles"' + (f && f.tipo === 'motorcycles' ? ' selected' : '') + '>' + esc(tr('Moto', 'Motorbike', 'Moto')) + '</option>') +
        sel('bnFipeMarca', tr('Marca', 'Make', 'Marca')) + sel('bnFipeModelo', tr('Modelo', 'Model', 'Modelo')) + sel('bnFipeAno', tr('Ano', 'Year', 'Año')) + '</div>' +
        '<p class="small bn-fipe-info">' + esc(f ? API.texto(f) : tr('Escolha a marca, o modelo e o ano: o app busca o valor e atualiza todo mês.', 'Choose the make, model and year: the app fetches the value and updates it every month.', 'Elige la marca, el modelo y el año: la app busca el valor y lo actualiza cada mes.')) + '</p>' +
        '<label class="row small" style="gap:8px"><input type="checkbox" id="bnManual" style="width:auto"' + (x.valorManual ? ' checked' : '') + '> ' + esc(tr('Usar o valor que eu acho (não atualiza sozinho)', 'Use my own value (no automatic updates)', 'Usar el valor que yo creo (no se actualiza solo)')) + '</label>' +
        '<p class="tiny muted">' + esc(tr('Só a marca, o modelo e o ano vão à FIPE (fipe.parallelum.com.br). Nada de placa nem nome.', 'Only the make, model and year go to FIPE (fipe.parallelum.com.br). No plate or name.', 'Solo la marca, el modelo y el año van a la FIPE (fipe.parallelum.com.br). Nada de matrícula ni nombre.')) + '</p></fieldset>';
    },
    texto: function (f) {
      return tr('Valor FIPE de ', 'FIPE value for ', 'Valor FIPE de ') + (f.ref || '') + ': ' + (typeof fmt === 'function' ? fmt(f.valor) : 'R$ ' + f.valor) +
        (f.falhou ? tr(' (a FIPE não respondeu em ', ' (FIPE did not answer on ', ' (la FIPE no respondió el ') + I18n.data(f.falhou) + tr('; fica este)', '; this one stays)', '; queda este)') : '');
    },
    /* o formulário abriu: carrega as marcas (e, se o bem já tem FIPE, deixa a escolha dele marcada) */
    preparar: async function () {
      var info = document.querySelector('.bn-fipe-info'); if (!document.getElementById('bnFipeMarca')) return;
      try { await encher('bnFipeMarca', await API.marcas(val('bnFipeTipo'))); }
      catch (e) { if (info && !val('bnFipe')) info.textContent = tr('A tabela FIPE não respondeu agora; preencha a marca, o modelo e o valor à mão.', 'The FIPE table did not answer now; fill in the make, model and value by hand.', 'La tabla FIPE no respondió ahora; rellena la marca, el modelo y el valor a mano.'); }
    },
    /* uma vez por mês, ao abrir o app: o valor do mês de cada veículo com FIPE (sem "o valor que eu acho") */
    atualizarTodos: async function () {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return 0;
      var L = window.PatrimonioIliquido ? PatrimonioIliquido.lista() : [], n = 0, m = mesDe(hoje());
      for (var i = 0; i < L.length; i++) {
        var x = L[i], f = x.tipo === 'carro' && x.carro && x.carro.fipe;
        if (!f || x.valorManual || f.mes === m || !f.codigo || !f.ano) continue;
        try {
          var j = await API.porCodigo(f.tipo || 'cars', f.codigo, f.ano), v = preco(j && j.price);
          if (!v) throw new Error('sem preço');
          f.valor = v; f.ref = String(j.referenceMonth || f.ref || ''); f.em = new Date().toISOString(); delete f.falhou;
          var rm = refMes(f.ref); if (!rm || rm >= m) f.mes = m;   /* a FIPE do mês ainda não saiu (começo do mês): tenta de novo na próxima vez */
          x.valor = v; x.data = hoje(); n++;
        } catch (e) { f.falhou = hoje(); n++; }   /* fica o último valor (e a data dele); tenta de novo na próxima vez que abrir */
      }
      if (n) { if (typeof Store !== 'undefined') Store.salvar(); if (typeof render === 'function') render(); }
      return n;
    }
  };
  var MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  /* "novembro de 2026" → '2026-11' (vazio se não entender) */
  function refMes(ref) {
    var m = /([a-zç]+)\s+de\s+(\d{4})/i.exec(String(ref || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()), i = m ? MESES.indexOf(m[1]) : -1;
    return i >= 0 ? m[2] + '-' + String(i + 1).padStart(2, '0') : '';
  }
  API.refMes = refMes;
  function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }
  async function encher(id, l, marcar) {
    var s = document.getElementById(id); if (!s) return;
    s.innerHTML = '<option value="">' + esc(tr('escolha…', 'choose…', 'elige…')) + '</option>' + (l || []).map(function (o) { return '<option value="' + esc(o.code) + '"' + (String(o.code) === String(marcar || '') ? ' selected' : '') + '>' + esc(o.name) + '</option>'; }).join('');
    s.disabled = false;
  }
  function limpar(ids) { ids.forEach(function (id) { var s = document.getElementById(id); if (s) { s.innerHTML = '<option value="">—</option>'; s.disabled = true; } }); }
  function info(t) { var e = document.querySelector('.bn-fipe-info'); if (e) e.textContent = t; }
  function falhou() { info(tr('A tabela FIPE não respondeu agora. Tente de novo daqui a pouco ou preencha o valor à mão.', 'The FIPE table did not answer now. Try again shortly or fill in the value by hand.', 'La tabla FIPE no respondió ahora. Inténtalo de nuevo en un rato o rellena el valor a mano.')); }

  /* a escolha em cascata: tipo → marca → modelo → ano → valor */
  document.addEventListener('change', async function (e) {
    var t = e.target; if (!t || !t.id) return;
    try {
      if (t.id === 'bnFipeTipo') { limpar(['bnFipeMarca', 'bnFipeModelo', 'bnFipeAno']); await encher('bnFipeMarca', await API.marcas(t.value)); }
      else if (t.id === 'bnFipeMarca') { limpar(['bnFipeModelo', 'bnFipeAno']); if (t.value) await encher('bnFipeModelo', await API.modelos(val('bnFipeTipo'), t.value)); }
      else if (t.id === 'bnFipeModelo') { limpar(['bnFipeAno']); if (t.value) await encher('bnFipeAno', await API.anos(val('bnFipeTipo'), val('bnFipeMarca'), t.value)); }
      else if (t.id === 'bnFipeAno' && t.value) {
        info(tr('Buscando o valor…', 'Fetching the value…', 'Buscando el valor…'));
        var f = await API.valor(val('bnFipeTipo'), val('bnFipeMarca'), val('bnFipeModelo'), t.value);
        var nome = function (id) { var s = document.getElementById(id); return s && s.selectedIndex > 0 ? s.options[s.selectedIndex].textContent : ''; };
        f.nomeMarca = f.nomeMarca || nome('bnFipeMarca'); f.nomeModelo = f.nomeModelo || nome('bnFipeModelo');
        document.getElementById('bnFipe').value = JSON.stringify(f);
        var put = function (id, v) { var el = document.getElementById(id); if (el && v != null && v !== '') el.value = v; };
        put('bnMarca', f.nomeMarca); put('bnModelo', f.nomeModelo); put('bnAno', f.anoModelo || parseInt(t.value, 10) || '');
        var man = document.getElementById('bnManual');
        if (!(man && man.checked)) { put('bnValor', f.valor); put('bnData', hoje()); }
        info(API.texto(f));
      }
      else if (t.id === 'bnManual' && !t.checked && val('bnFipe')) {   /* voltou para a FIPE: o valor volta a ser o dela */
        var g = JSON.parse(val('bnFipe')); var v = document.getElementById('bnValor'); if (v) v.value = g.valor; var d = document.getElementById('bnData'); if (d) d.value = hoje();
      }
    } catch (er) { falhou(); }
  });
  /* mexeu no valor à mão com a FIPE escolhida: é "o valor que eu acho" */
  document.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'bnValor' || !val('bnFipe')) return;
    var m = document.getElementById('bnManual'); if (m && !m.checked) m.checked = true;
  });

  MoneyModulos.registrar({
    id: 'fipe',
    versao: '1.0.0',
    pontos: {
      'iliquido.valor': function (c) {
        var x = c && c.item, f = x && x.tipo === 'carro' && x.carro && x.carro.fipe;
        if (!f || x.valorManual) return [];
        return [{ valor: Number(x.valor) || 0, nota: tr('Tabela FIPE de ', 'FIPE table, ', 'Tabla FIPE de ') + (f.ref || '') + (f.falhou ? tr(' · não atualizou em ', ' · could not update on ', ' · no se actualizó el ') + I18n.data(f.falhou) : '') }];
      }
    },
    iniciar: function () { setTimeout(function () { API.atualizarTodos().catch(function () { /* fica o último */ }); }, 3000); }
  });
  window.Fipe = API;
})();
