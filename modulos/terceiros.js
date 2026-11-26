/* =====================================================================
   modulos/terceiros.js — 📋 CONTAS DE OUTRAS PESSOAS que chegam no e-mail da família (3.105)        1.1.0 · 26/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 24/Nov/2026, aprovado; sem IA)
     · Caso: a conta de outra pessoa chega no e-mail da família (ex.: a conta de telefone que alguém da família assinou para um
       parente, que é quem paga). Antes a exceção estava fixa no código do robô; agora fica no app.
     · No comprovante (modulos/comprovantes.js): "Não é meu (conta de outra pessoa)". O app pergunta de quem é (nome livre) e o que
       fazer: ❌ Ignorar (não entra nas finanças) ou 👤 Processar para a pessoa (entra com "para quem" = a pessoa, ex.: uma conta que
       a família paga para alguém e acompanha). Os marcadores saem do próprio comprovante (o nome do titular e o código do cliente
       que aparecem no e-mail) e a pessoa confirma ou corrige.
     · Configurações → "Contas de outras pessoas que chegam no meu e-mail": a lista, para ver, editar, trocar entre ignorar e
       processar, e apagar.
     · Para o robô: a cada mudança, a LISTA INTEIRA vai pelo espelho (nuvem.js, money_espelho_saida, cifrada para a chave do robô):
       {v:1, acao:'terceiros', id:'terceiros', em, quem_editou:'app', versao_app, lista:[{nome, marcadores, acao, para_quem}]}. A fila do
       espelho guarda um por id: vale sempre a última lista. A lista do app substitui a fixa do código do robô.
     · Comprovante já recebido (ou que chegar) que bate com um item "ignorar": some do 📥 sozinho (dispensado, com a marca).
       "processar": ganha o "para quem" (e o lançamento ligado a ele também, se a pessoa não mexeu).
     · Privacidade (diretrizes, 24/Nov/2026; LGPD): os nomes e os marcadores ficam SÓ no aparelho (dados da família, cifrados) e no
       pacote cifrado para o robô. A plataforma (RootifyONE) só verá contagens, quando existir a tabela de resumo (pendência #152).
     · Interruptor do RootifyONE: data-recurso="terceiros" (recursos-do-app.json).
   API (window.Terceiros)
     lista() · salvar(d, id?) → item · tirar(id) · casa(x) → item | null · aplicar(x) → true se ignorou · marcadoresDe(x) · pacote()
     botao(x) → html para o comprovante
   DADOS
     ST.terceiros = [{id, nome, marcadores: [texto], acao: 'ignorar'|'processar', paraQuem, paraQuemId, criadoEm}]
     comprovante: x.terceiro = id (e x.paraQuem quando "processar")
   PONTOS QUE USA
     config.todos · ações tc-* · modulos/comprovantes.js chama aplicar() e botao()
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'terceiros';
  function pt() { return typeof I18n === 'undefined' || I18n.atual === 'pt'; }
  function tr(a, b, c) { return pt() ? a : (c != null && I18n.atual === 'es' ? c : b); }
  function lista() { if (!ST) return []; return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function ligado() { return !(window.SolverRecursos && SolverRecursos.ligado('terceiros', true) === false); }
  function casaVisao() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function N(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function texto(x) { return N([x.loja, x.remetente, x.assunto, x.descricao, x.produto, x.referencia, x.numero, x.descritor_fatura].filter(Boolean).join(' ')); }
  function botao(acao, rot, extra, cls) { return '<button type="button" class="btn sm' + (cls ? ' ' + cls : '') + '" data-recurso="terceiros" data-acao="' + acao + '"' + (extra || '') + '>' + esc(rot) + '</button>'; }

  /* os marcadores que o comprovante mostra: o nome do titular e o código do cliente (a pessoa confirma) */
  function marcadoresDe(x) {
    var t = [x.assunto, x.descricao, x.produto, x.referencia].filter(Boolean).join(' \n '), out = [], m;
    var rxNome = /(?:titular|nome do cliente|cliente|destinat[aá]rio)\s*[:\-]\s*([A-ZÀ-Úa-zà-ú][A-Za-zÀ-ú.' ]{3,50}?)(?=\s*(?:[,;|\n]|c[oó]d|cpf|n[ºo°]|conta|$))/gi;
    var rxCod = /(?:c[oó]digo do cliente|c[oó]d\.? cliente|n[ºo°]\.? do cliente|conta contrato|n[ºo°]\.? da conta|instala[cç][aã]o|matr[ií]cula|unidade consumidora)\s*[:\-]?\s*([0-9][0-9.\-\/]{3,24})/gi;
    while ((m = rxNome.exec(t))) { var n = m[1].trim(); if (out.indexOf(n) < 0) out.push(n); }
    while ((m = rxCod.exec(t))) { var c = m[1].replace(/[.\-\/]+$/, ''); if (out.indexOf(c) < 0) out.push(c); }
    if (x.referencia && /^\d{4,}$/.test(String(x.referencia)) && out.indexOf(String(x.referencia)) < 0) out.push(String(x.referencia));
    return out.slice(0, 6);
  }
  /* o item da lista que bate com o comprovante: algum marcador (sem acento, maiúsculas) aparece no texto dele */
  function casa(x) {
    if (!x) return null;
    var t = ' ' + texto(x) + ' ';
    /* 1.1.0 (3.126): "A + B" = as duas partes precisam aparecer (o robô entende igual) */
    var tem = function (m) { var ps = String(m).split('+').map(N).filter(function (k) { return k.length >= 3; }); if (!ps.length) return false;
      if (ps.length === 1) return ps[0].length >= 4 && t.indexOf(' ' + ps[0] + ' ') >= 0;
      return ps.every(function (k) { return t.indexOf(' ' + k + ' ') >= 0; }); };
    return lista().find(function (it) { return (it.marcadores || []).some(tem); }) || null;
  }
  function aplicar(x) {
    if (!ligado()) return false;
    var it = casa(x); if (!it) return false;
    x.terceiro = it.id;
    if (it.acao === 'ignorar') { if (x.estado !== 'dispensado') x.estado = 'dispensado'; return true; }
    x.paraQuem = it.paraQuem || it.nome;
    var g = Gasto.todos().find(function (y) { return y.id === (x.gastoId || x.pagoId); });
    if (g && !g.editadoPessoa && g.paraQuem !== x.paraQuem) { var d = { paraQuem: x.paraQuem }; if (it.paraQuemId) d.paraQuemId = it.paraQuemId; Gasto.atualizar(g.id, d); }
    return false;
  }
  /* o pacote para o robô: a lista inteira (vale sempre a última) */
  function pacote() {
    return { v: 1, acao: 'terceiros', id: 'terceiros', em: new Date().toISOString(), quem_editou: 'app', versao_app: typeof VERSAO !== 'undefined' ? String(VERSAO) : '',
      lista: lista().map(function (it) { var o = { nome: it.nome, marcadores: (it.marcadores || []).slice(), acao: it.acao }; if (it.acao === 'processar') o.para_quem = it.paraQuem || it.nome; return o; }) };
  }
  function avisarRobo() {
    var n = window.MoneyNuvem && MoneyNuvem.espelho; if (!n) return false;
    n.enfileirar(pacote()).catch(function (e) { console.warn('terceiros: espelho', e); });
    return true;
  }
  function limpos(ms) { return (ms || []).map(function (m) { return String(m || '').trim().slice(0, 60); }).filter(function (m, i, a) { return N(m).length >= 4 && a.indexOf(m) === i; }).slice(0, 10); }
  function salvar(d, id) {
    var nome = String(d.nome || '').trim().slice(0, 60), ms = limpos(d.marcadores);
    if (!nome || !ms.length) return null;
    var it = id ? lista().find(function (x) { return x.id === id; }) : null;
    var dados = { nome: nome, marcadores: ms, acao: d.acao === 'processar' ? 'processar' : 'ignorar', paraQuem: d.acao === 'processar' ? String(d.paraQuem || nome).trim().slice(0, 60) : '' };
    if (it) Object.assign(it, dados); else { it = Object.assign({ id: 'tc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), criadoEm: new Date().toISOString() }, dados); lista().push(it); }
    delete it.paraQuemId; if (it.paraQuem && window.Pessoas) Pessoas.ligar(it, 'paraQuem', 'paraQuemId');
    (ST.comprovantes || []).forEach(function (x) {
      if (x.terceiro === it.id && x.estado === 'dispensado' && it.acao !== 'ignorar') { x.estado = 'novo'; delete x.terceiro; }
      aplicar(x);
    });
    avisarRobo();
    return it;
  }
  function tirar(id) {
    ST[COL] = lista().filter(function (x) { return x.id !== id; });
    (ST.comprovantes || []).forEach(function (x) { if (x.terceiro === id) { if (x.estado === 'dispensado') x.estado = 'novo'; delete x.terceiro; delete x.paraQuem; } });
    avisarRobo();
  }

  /* ---------- telas ---------- */
  function botaoComprovante(x) {
    if (!ligado() || casaVisao() || !x || x.terceiro) return '';
    return botao('tc-nao-meu', tr('Não é meu (conta de outra pessoa)', 'Not mine (someone else’s bill)', 'No es mío (factura de otra persona)'), ' data-id="' + esc(x.id) + '"');
  }
  function form(it, x) {
    var ms = it ? it.marcadores : marcadoresDe(x || {});
    var f = function (rot, campo) { return '<label class="field"><span>' + esc(rot) + '</span>' + campo + '</label>'; };
    $('#genTitle').textContent = '📋 ' + tr('Conta de outra pessoa', 'Someone else’s bill', 'Factura de otra persona');
    $('#genBody').innerHTML = Verter.html('<div class="tc-form" data-id="' + esc(it ? it.id : '') + '" data-cp="' + esc(x ? x.id : '') + '">' +
      (x ? '<p class="small muted">' + esc(tr('Chegou no seu e-mail: ', 'Arrived in your e-mail: ', 'Llegó a tu correo: ') + [x.loja || x.remetente, x.assunto].filter(Boolean).join(' — ')) + '</p>' : '') +
      f(tr('De quem é', 'Whose is it', 'De quién es'), '<input id="tcNome" maxlength="60" value="' + esc(it ? it.nome : '') + '" placeholder="' + esc(tr('ex.: Tia Exemplo', 'e.g.: Aunt Example', 'ej.: Tía Ejemplo')) + '">') +
      '<p class="small" style="margin:8px 0 2px"><b>' + esc(tr('Como reconhecer (o titular ou o código do cliente que aparecem no e-mail)', 'How to recognize it (the holder or the customer code shown in the e-mail)', 'Cómo reconocerla (el titular o el código de cliente que aparecen en el correo)')) + '</b></p>' +
      '<div id="tcMarc">' + ms.map(function (m) { return '<label class="chk" style="display:inline-flex;gap:4px;margin:2px 8px 2px 0"><input type="checkbox" value="' + esc(m) + '" checked> ' + esc(m) + '</label>'; }).join('') + '</div>' +
      f(tr('Outro (opcional)', 'Another one (optional)', 'Otro (opcional)'), '<input id="tcOutro" maxlength="60" placeholder="' + esc(tr('outro nome ou código', 'another name or code', 'otro nombre o código')) + '">') +
      /* 1.1.0 (3.126): o marcador composto, que o robô já entende */
      '<p class="small muted tc-composto" style="margin:2px 0 6px">' + esc(tr('Dica: junte duas palavras com "+" quando uma só não basta. Ex.: "FORNECEDOR + ENDEREÇO" só reconhece quando o e-mail tem as duas (o mesmo fornecedor de luz da sua casa e da casa da sua tia, separados pela rua).',
        'Tip: join two words with "+" when one is not enough. E.g. "SUPPLIER + ADDRESS" only matches when the e-mail has both (the same power company for your home and your aunt\'s, told apart by the street).',
        'Consejo: une dos palabras con "+" cuando una sola no basta. Ej.: "PROVEEDOR + DIRECCIÓN" solo reconoce cuando el correo tiene las dos (la misma compañía de luz de tu casa y la de tu tía, separadas por la calle).')) + '</p>' +
      '<p class="small" style="margin:8px 0 2px"><b>' + esc(tr('O que fazer', 'What to do', 'Qué hacer')) + '</b></p>' +
      '<label class="chk" style="display:block"><input type="radio" name="tcAcao" value="ignorar"' + (!it || it.acao === 'ignorar' ? ' checked' : '') + '> ❌ ' + esc(tr('Ignorar: não entra nas minhas finanças', 'Ignore: it stays out of my finances', 'Ignorar: no entra en mis finanzas')) + '</label>' +
      '<label class="chk" style="display:block"><input type="radio" name="tcAcao" value="processar"' + (it && it.acao === 'processar' ? ' checked' : '') + '> 👤 ' + esc(tr('Processar para a pessoa (eu pago para ela e acompanho)', 'Process for that person (I pay it for them and keep track)', 'Procesar para la persona (la pago por ella y la sigo)')) + '</label>' +
      f(tr('Para quem (se processar)', 'For whom (if processing)', 'Para quién (si se procesa)'), '<input id="tcPara" maxlength="60" value="' + esc(it ? it.paraQuem : '') + '" placeholder="' + esc(tr('vazio = o mesmo nome', 'blank = the same name', 'vacío = el mismo nombre')) + '">') +
      '<p class="tiny muted">' + esc(tr('Os nomes ficam só no seu aparelho e no pacote cifrado para o robô.', 'Names stay only on your device and in the encrypted package for the robot.', 'Los nombres quedan solo en tu dispositivo y en el paquete cifrado para el robot.')) + '</p>' +
      '<div class="f-actions">' + (it ? botao('tc-tirar', tr('Apagar', 'Delete', 'Borrar'), ' data-id="' + esc(it.id) + '"') : '') + botao('tc-salvar', tr('Salvar', 'Save', 'Guardar'), '', 'primary') + '</div></div>');
    abrir('genModal');
  }
  function cartao() {
    if (!ligado() || casaVisao()) return '';
    var l = lista();
    return '<div class="card cfg-sec tc-cfg" data-sec="todos" data-recurso="terceiros"><div class="card-head"><h3>📋 ' + esc(tr('Contas de outras pessoas que chegam no meu e-mail', 'Other people’s bills that arrive in my e-mail', 'Facturas de otras personas que llegan a mi correo')) + '</h3></div>' +
      '<p class="small muted" style="margin:0 0 6px">' + esc(tr('Contas de outra pessoa que chegam no seu e-mail (ex.: uma assinatura que você fez para um parente). Ignorar: não entram nas suas finanças. Processar: entram com "para quem". Marque no comprovante: "Não é meu".', 'Someone else’s bills that arrive in your e-mail (e.g. a subscription you set up for a relative). Ignore: they stay out of your finances. Process: they come in with "for whom". Mark it on the receipt: "Not mine".', 'Facturas de otra persona que llegan a tu correo (ej.: una suscripción que hiciste para un familiar). Ignorar: no entran en tus finanzas. Procesar: entran con "para quién". Márcalo en el comprobante: "No es mío".')) + '</p>' +
      (l.length ? '<ul class="tc-lista" style="margin:0;padding-left:16px">' + l.map(function (it) {
        return '<li class="small" data-id="' + esc(it.id) + '"><b>' + esc(it.nome) + '</b> · ' + esc((it.acao === 'ignorar' ? '❌ ' + tr('ignorar', 'ignore', 'ignorar') : '👤 ' + tr('processar para ', 'process for ', 'procesar para ') + (it.paraQuem || it.nome)) + ' · ' + (it.marcadores || []).join(', ')) + ' ' +
          botao('tc-editar', tr('Editar', 'Edit', 'Editar'), ' data-id="' + esc(it.id) + '"') + botao('tc-trocar', it.acao === 'ignorar' ? tr('Processar', 'Process', 'Procesar') : tr('Ignorar', 'Ignore', 'Ignorar'), ' data-id="' + esc(it.id) + '"') + botao('tc-tirar', tr('Apagar', 'Delete', 'Borrar'), ' data-id="' + esc(it.id) + '"') + '</li>';
      }).join('') + '</ul>' : '<p class="small muted">' + esc(tr('Nenhuma ainda.', 'None yet.', 'Ninguna todavía.')) + '</p>') + '</div>';
  }
  function depois() { if (typeof Store !== 'undefined') Store.salvar(); if (typeof render === 'function') render(); if (typeof renderInboxN === 'function') renderInboxN(); }

  var API = { lista: lista, salvar: salvar, tirar: tirar, casa: casa, aplicar: aplicar, marcadoresDe: marcadoresDe, pacote: pacote, botao: botaoComprovante };
  MoneyModulos.registrar({
    id: 'terceiros', versao: '1.1.0', colecoes: [COL],
    pontos: { 'config.todos': cartao },
    acoes: {
      'tc-nao-meu': function (el) { var x = (ST.comprovantes || []).find(function (y) { return y.id === el.dataset.id; }); if (x) form(null, x); },
      'tc-editar': function (el) { var it = lista().find(function (y) { return y.id === el.dataset.id; }); if (it) form(it, null); },
      'tc-salvar': function () {
        var box = document.querySelector('.tc-form'); if (!box) return;
        var v = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
        var ms = [].slice.call(document.querySelectorAll('#tcMarc input:checked')).map(function (i) { return i.value; }); if (v('tcOutro').trim()) ms.push(v('tcOutro'));
        var ac = (document.querySelector('input[name="tcAcao"]:checked') || {}).value || 'ignorar';
        var it = salvar({ nome: v('tcNome'), marcadores: ms, acao: ac, paraQuem: v('tcPara') }, box.dataset.id || null);
        if (!it) return toast(tr('Diga de quem é e marque ao menos um jeito de reconhecer (o titular ou o código).', 'Say whose it is and tick at least one way to recognize it (the holder or the code).', 'Indica de quién es y marca al menos una forma de reconocerla (el titular o el código).'), 'warn');
        var x = box.dataset.cp && (ST.comprovantes || []).find(function (y) { return y.id === box.dataset.cp; });
        if (x && !x.terceiro) { x.terceiro = it.id; if (it.acao === 'ignorar') x.estado = 'dispensado'; else x.paraQuem = it.paraQuem || it.nome; }
        fechar('genModal'); depois();
        toast('📋 ' + (it.acao === 'ignorar' ? tr('Ignorada: a conta de ', 'Ignored: the bill of ', 'Ignorada: la factura de ') + it.nome + tr(' não entra mais.', ' stays out from now on.', ' ya no entra.') : tr('Processada para ', 'Processed for ', 'Procesada para ') + (it.paraQuem || it.nome) + '.'));
      },
      'tc-trocar': function (el) { var it = lista().find(function (y) { return y.id === el.dataset.id; }); if (!it) return; salvar({ nome: it.nome, marcadores: it.marcadores, acao: it.acao === 'ignorar' ? 'processar' : 'ignorar', paraQuem: it.paraQuem }, it.id); depois(); },
      'tc-tirar': function (el) { tirar(el.dataset.id); fechar('genModal'); depois(); }
    }
  });
  window.Terceiros = API;
})();
