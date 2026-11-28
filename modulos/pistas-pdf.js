/* =====================================================================
   modulos/pistas-pdf.js — 🔑 DADOS PARA ABRIR PDFs COM SENHA (cofre de pistas da família) (3.141)        1.0.0 · 27/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, decisão B, 27/Nov/2026)
     · Contas e faturas chegam em PDF com senha feita de pedaços de CPF, CNPJ, CEP ou nascimento (ex.: os 5 primeiros dígitos do CNPJ
       do titular). Quem vê tudo na família (o chefe; o cônjuge só se o chefe liberar) cadastra UMA vez aqui e vale para a família
       inteira, em qualquer aparelho: o robô da família usa para abrir os PDFs.
     · O número inteiro NÃO fica no app: vai só no pacote fechado para a chave do robô, pelo mesmo canal das contas de outras pessoas
       (modulos/terceiros.js → nuvem.js, Espelho, money_espelho_saida):
         {v:1, acao:'pistas', id:'pistas-<timestamp>', em, quem_editou:'app', versao_app, adicionar:[{id, rotulo, tipo, valor}], apagar:[id]}
       tipo: 'cpf' | 'cnpj' | 'cep' | 'nasc'. Cada pacote só adiciona ou apaga por id (o robô junta; guarda só os dígitos).
     · O app guarda só {id, rotulo, tipo, final2} (coleção pistas_pdf, reservada: quem vê "Só a casa" nem recebe) para mostrar a
       lista com o número mascarado (só os 2 últimos dígitos). Editar = apagar + adicionar.
     · Validação: CPF e CNPJ com dígito verificador; CEP com 8 dígitos; nascimento DD/MM/AAAA (data que existe, no passado).
     · Sem a nuvem da família aberta (ou sem poder ver tudo), não cadastra: o número não teria como chegar ao robô.
     · Interruptor do RootifyONE: data-recurso="pistas-pdf" (recursos-do-app.json). Lugar no mapa do AssistONE: "pistas-pdf".
   API (window.PistasPdf)
     lista() · adicionar({rotulo, tipo, valor}) → Promise<item|erro> · apagar(id) → Promise<bool> · valido(tipo, valor) · mascara(item)
   PONTOS QUE USA
     config.todos · ações pp-*
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'pistas_pdf', TIPOS = ['cpf', 'cnpj', 'cep', 'nasc'];
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function lista() { if (!ST) return []; return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function ligado() { return !(window.SolverRecursos && SolverRecursos.ligado('pistas-pdf', true) === false); }
  function casaVisao() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function dig(v) { return String(v == null ? '' : v).replace(/\D+/g, ''); }
  function nomeTipo(t) { return { cpf: 'CPF', cnpj: 'CNPJ', cep: 'CEP', nasc: tr('Nascimento', 'Date of birth', 'Nacimiento') }[t] || t; }

  function cpfOk(d) {
    if (!/^\d{11}$/.test(d) || /^(\d)\1+$/.test(d)) return false;
    for (var t = 9; t < 11; t++) { var s = 0; for (var i = 0; i < t; i++) s += Number(d[i]) * (t + 1 - i); if (Number(d[t]) !== ((s * 10) % 11) % 10) return false; }
    return true;
  }
  function cnpjOk(d) {
    if (!/^\d{14}$/.test(d) || /^(\d)\1+$/.test(d)) return false;
    var pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    for (var t = 12; t < 14; t++) { var s = 0, p = pesos.slice(13 - t); for (var i = 0; i < t; i++) s += Number(d[i]) * p[i]; var r = s % 11; if (Number(d[t]) !== (r < 2 ? 0 : 11 - r)) return false; }
    return true;
  }
  function nascOk(v) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(v || '').trim()); if (!m) return false;
    var d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
    return d.getUTCDate() === +m[1] && d.getUTCMonth() === +m[2] - 1 && +m[3] >= 1900 && d.getTime() <= Date.now();
  }
  function valido(tipo, valor) {
    var d = dig(valor);
    if (tipo === 'cpf') return cpfOk(d);
    if (tipo === 'cnpj') return cnpjOk(d);
    if (tipo === 'cep') return /^\d{8}$/.test(d);
    if (tipo === 'nasc') return nascOk(valor);
    return false;
  }
  /* o número mascarado: só os 2 últimos dígitos aparecem */
  function mascara(it) {
    var f = String(it.final2 || '').slice(-2), m = { cpf: '•••.•••.•••-', cnpj: '••.•••.•••/••••-', cep: '•••••-•', nasc: '••/••/••' }[it.tipo] || '•••';
    return m + f;
  }
  function pacote(adicionar, apagar) {
    var em = new Date().toISOString();
    return { v: 1, acao: 'pistas', id: 'pistas-' + Date.now(), em: em, quem_editou: 'app', versao_app: typeof VERSAO !== 'undefined' ? String(VERSAO) : '',
      adicionar: adicionar || [], apagar: apagar || [] };
  }
  /* manda ao robô; só depois de entrar na fila do espelho é que a lista do app muda */
  async function mandar(p) {
    var n = window.MoneyNuvem && MoneyNuvem.espelho; if (!n) return false;
    try { return (await n.enfileirar(p)) === true; } catch (e) { console.warn('pistas-pdf: espelho', e); return false; }
  }
  async function adicionar(d) {
    if (!ligado() || casaVisao()) return { erro: 'sem-acesso' };
    var tipo = TIPOS.indexOf(d.tipo) >= 0 ? d.tipo : '', rotulo = String(d.rotulo || '').trim().slice(0, 60);
    if (!rotulo) return { erro: 'rotulo' };
    if (!tipo || !valido(tipo, d.valor)) return { erro: 'valor' };
    var it = { id: 'pp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), rotulo: rotulo, tipo: tipo, final2: dig(d.valor).slice(-2), criadoEm: new Date().toISOString() };
    if (!(await mandar(pacote([{ id: it.id, rotulo: rotulo, tipo: tipo, valor: String(d.valor).trim() }], [])))) return { erro: 'nuvem' };
    lista().push(it);
    return it;
  }
  async function apagar(id) {
    if (!ligado() || casaVisao() || !lista().some(function (x) { return x.id === id; })) return false;
    if (!(await mandar(pacote([], [id])))) return false;
    ST[COL] = lista().filter(function (x) { return x.id !== id; });
    return true;
  }

  /* ---------- tela (Configurações, ao lado das "Contas de outras pessoas") ---------- */
  function botao(acao, rot, extra, cls) { return '<button type="button" class="btn sm' + (cls ? ' ' + cls : '') + '" data-recurso="pistas-pdf" data-acao="' + acao + '"' + (extra || '') + '>' + esc(rot) + '</button>'; }
  function cartao() {
    if (!ligado() || casaVisao()) return '';
    var l = lista();
    return '<div class="card cfg-sec pp-cfg" data-sec="todos" data-recurso="pistas-pdf" data-ajuda="pistas-pdf"><div class="card-head"><h3>🔑 ' + esc(tr('Dados para abrir PDFs com senha', 'Details to open password-protected PDFs', 'Datos para abrir PDF con contraseña')) + '</h3></div>' +
      '<details class="pp-info small" style="margin:0 0 6px"><summary>ⓘ ' + esc(tr('Para que serve', 'What it is for', 'Para qué sirve')) + '</summary><p class="small muted" style="margin:4px 0 0">' +
      esc(tr('Muitas contas chegam em PDF com senha feita de pedaços do CPF, CNPJ ou CEP. Cadastre uma vez aqui; o robô da família usa para abrir. Fica cifrado, só o robô abre; nem o app mostra de novo o número inteiro.',
        'Many bills arrive as PDFs with a password made from parts of a CPF, CNPJ or postcode (CEP). Add them once here; the family robot uses them to open the files. They are encrypted and only the robot can read them; not even the app shows the full number again.',
        'Muchas facturas llegan en PDF con una contraseña hecha con partes del CPF, CNPJ o código postal (CEP). Regístralos una vez aquí; el robot de la familia los usa para abrirlos. Quedan cifrados y solo el robot los lee; ni la app vuelve a mostrar el número entero.')) + '</p></details>' +
      (l.length ? '<ul class="pp-lista" style="margin:0;padding-left:16px">' + l.map(function (it) {
        return '<li class="small" data-id="' + esc(it.id) + '"><b>' + esc(it.rotulo) + '</b> · ' + esc(nomeTipo(it.tipo)) + ' <span class="mono pp-mask">' + esc(mascara(it)) + '</span> ' +
          botao('pp-apagar', tr('Apagar', 'Delete', 'Borrar'), ' data-id="' + esc(it.id) + '"') + '</li>';
      }).join('') + '</ul>' : '<p class="small muted">' + esc(tr('Nenhum ainda.', 'None yet.', 'Ninguno todavía.')) + '</p>') +
      '<div class="row" style="margin-top:6px">' + botao('pp-novo', '+ ' + tr('Adicionar', 'Add', 'Añadir'), '', 'primary') + '</div></div>';
  }
  function form() {
    var f = function (rot, campo) { return '<label class="field"><span>' + esc(rot) + '</span>' + campo + '</label>'; };
    $('#genTitle').textContent = '🔑 ' + tr('Dado para abrir PDFs', 'Detail to open PDFs', 'Dato para abrir PDF');
    $('#genBody').innerHTML = Verter.html('<div class="pp-form">' +
      f(tr('De quem é (um nome para você reconhecer)', 'Whose is it (a name you will recognize)', 'De quién es (un nombre que reconozcas)'), '<input id="ppRotulo" maxlength="60" placeholder="' + esc(tr('ex.: Empresa do meu pai', 'e.g. My father’s company', 'ej.: Empresa de mi padre')) + '">') +
      f(tr('Tipo', 'Type', 'Tipo'), '<select id="ppTipo">' + TIPOS.map(function (t) { return '<option value="' + t + '">' + esc(nomeTipo(t)) + '</option>'; }).join('') + '</select>') +
      f(tr('Número', 'Number', 'Número'), '<input id="ppValor" maxlength="20" inputmode="numeric" autocomplete="off" placeholder="' + esc(tr('com ou sem pontos', 'with or without dots', 'con o sin puntos')) + '">') +
      '<p class="tiny muted pp-dica">' + esc(tr('Nascimento: DD/MM/AAAA. Depois de salvar, o app mostra só os 2 últimos dígitos.', 'Date of birth: DD/MM/YYYY. After saving, the app shows only the last 2 digits.', 'Nacimiento: DD/MM/AAAA. Después de guardar, la app solo muestra los 2 últimos dígitos.')) + '</p>' +
      '<div class="f-actions"><button class="btn" data-close="genModal">' + esc(tr('Cancelar', 'Cancel', 'Cancelar')) + '</button>' + botao('pp-salvar', tr('Salvar', 'Save', 'Guardar'), '', 'primary') + '</div></div>');
    abrir('genModal');
  }
  function depois() { if (typeof Store !== 'undefined') Store.salvar(); if (typeof render === 'function') render(); }
  var ERROS = {
    rotulo: function () { return tr('Dê um nome para reconhecer (ex.: Empresa do meu pai).', 'Give it a name you will recognize (e.g. My father’s company).', 'Ponle un nombre para reconocerlo (ej.: Empresa de mi padre).'); },
    valor: function () { return tr('Esse número não confere. Veja se digitou certo (CPF 11 dígitos, CNPJ 14, CEP 8, nascimento DD/MM/AAAA).', 'That number does not check out. Make sure it is right (CPF 11 digits, CNPJ 14, CEP 8, birth date DD/MM/YYYY).', 'Ese número no cuadra. Revisa que esté bien (CPF 11 dígitos, CNPJ 14, CEP 8, nacimiento DD/MM/AAAA).'); },
    nuvem: function () { return tr('Para cadastrar, entre na nuvem da família neste aparelho (o número só vai, cifrado, para o robô).', 'To add it, sign in to the family cloud on this device (the number only goes, encrypted, to the robot).', 'Para registrarlo, entra en la nube de la familia en este dispositivo (el número solo va, cifrado, al robot).'); },
    'sem-acesso': function () { return tr('Só quem vê tudo na família cadastra estes dados.', 'Only someone who sees everything in the family can add these.', 'Solo quien ve todo en la familia registra estos datos.'); }
  };

  var API = { lista: lista, adicionar: adicionar, apagar: apagar, valido: valido, mascara: mascara };
  MoneyModulos.registrar({
    id: 'pistas-pdf', versao: '1.0.0', colecoes: [COL],
    pontos: { 'config.todos': cartao },
    acoes: {
      'pp-novo': function () { if (ligado() && !casaVisao()) form(); },
      'pp-salvar': async function () {
        var v = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
        var r = await adicionar({ rotulo: v('ppRotulo'), tipo: v('ppTipo'), valor: v('ppValor') });
        if (r.erro) return toast(ERROS[r.erro](), 'warn');
        fechar('genModal'); depois();
        toast('🔑 ' + tr('Guardado. O robô da família passa a usar para abrir os PDFs.', 'Saved. The family robot will use it to open the PDFs.', 'Guardado. El robot de la familia lo usará para abrir los PDF.'));
      },
      'pp-apagar': async function (el) {
        var it = lista().find(function (x) { return x.id === el.dataset.id; }); if (!it) return;
        if (!confirm(tr('Apagar "' + it.rotulo + '"? O robô deixa de usar esse dado.', 'Delete "' + it.rotulo + '"? The robot will stop using it.', '¿Borrar "' + it.rotulo + '"? El robot deja de usar ese dato.'))) return;
        if (!(await apagar(it.id))) return toast(ERROS.nuvem(), 'warn');
        depois();
      }
    }
  });
  window.PistasPdf = API;
})();
