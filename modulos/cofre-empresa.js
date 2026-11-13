/* =====================================================================
   modulos/cofre-empresa.js — FiscalONE: o "Cofre da empresa" (3.77)        1.0.0 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 13/Nov/2026)
     Por empresa (PJ), num lugar só: o cartão CNPJ (PDF ou foto), CNPJ, razão social, regime (Simples, Simples com
     Fator R, MEI, Lucro Presumido…), o contador (nome e contato), as contas bancárias da PJ (banco, agência, conta),
     as chaves Pix e os documentos (contrato social, alvará…), cada um com validade e lembrete no 📥 quando vence
     (60 dias antes e depois de vencido). SEM SENHAS: o app não pede nem guarda senha de banco ou de portal.
     Onde fica: a coleção "empresas" está no cofre RESERVADO (a visão da casa não vê); os arquivos vão para o cofre de
     arquivos (modulos/arquivos.js), fechados, com a descrição também no reservado.
   API (window.CofreEmpresa)
     lista() · achar(id) · vencendo(hoje?) → [{e, d, dias}] · REGIMES
   DADOS
     ST.empresas = [{id, cnpj, razao, regime, contador: {nome, contato}, contas: [{banco, agencia, conta}], pix: [chave],
                     docs: [{id, tipo, nome, arquivoId, validade}], criadoEm}]
   PONTOS QUE USA
     tela t-empresa (FiscalONE) · inbox.grupos ('avisos') · ações em-*
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'empresas', AVISO = 60;
  function pt() { return typeof I18n === 'undefined' || I18n.atual !== 'en'; }
  function tr(a, b) { return pt() ? a : b; }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function casa() { return !!(window.Escopo && Escopo.soCasa && Escopo.soCasa()); }
  function dig(t) { return String(t || '').replace(/\D/g, ''); }
  function fmtCnpj(c) { c = dig(c); return c.length === 14 ? c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : c; }
  function cnpjOk(c) { c = dig(c); return c.length === 14 && (typeof CupomTexto === 'undefined' || CupomTexto.cnpjValido(c)); }
  function novoId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function dias(iso, h) { return Math.round((new Date(iso + 'T12:00:00Z') - new Date(h + 'T12:00:00Z')) / 86400000); }
  var REGIMES = [['simples', 'Simples Nacional', 'Simples Nacional'], ['fator-r', 'Simples com Fator R', 'Simples with "Fator R"'], ['mei', 'MEI', 'MEI'],
    ['presumido', 'Lucro Presumido', 'Presumed profit'], ['real', 'Lucro Real', 'Actual profit'], ['outro', 'Outro', 'Other']];
  var TIPOS = [['cartao-cnpj', 'Cartão CNPJ', 'CNPJ card'], ['contrato-social', 'Contrato social', 'Articles of association'], ['alvara', 'Alvará', 'Business licence'], ['outro', 'Outro documento', 'Other document']];
  function rot(l, id) { var x = l.find(function (r) { return r[0] === id; }) || l[l.length - 1]; return pt() ? x[1] : x[2]; }

  var API = {
    REGIMES: REGIMES, lista: lista,
    achar: function (id) { return lista().find(function (e) { return e.id === id; }) || null; },
    vencendo: function (h) {
      h = h || API._hoje || hojeISO(); var out = [];
      if (casa()) return out;
      lista().forEach(function (e) { (e.docs || []).forEach(function (d) { if (!d.validade) return; var n = dias(d.validade, h); if (n <= AVISO) out.push({ e: e, d: d, dias: n }); }); });
      return out.sort(function (a, b) { return a.dias - b.dias; });
    },
    _hoje: null
  };

  /* ---------- a tela ---------- */
  function linha(rotulo, valor) { return valor ? '<div class="em-lin"><span class="muted small">' + esc(rotulo) + '</span> <b>' + esc(valor) + '</b></div>' : ''; }
  function cartaoEmpresa(e) {
    var h = API._hoje || hojeISO();
    return '<div class="card em-card" data-emp="' + esc(e.id) + '"><div class="card-head"><h3>🏢 ' + esc(e.razao || tr('Empresa sem nome', 'Unnamed company')) + '</h3>' +
      '<button class="btn sm" data-acao="em-editar" data-id="' + esc(e.id) + '">' + esc(tr('Editar', 'Edit')) + '</button></div>' +
      linha('CNPJ', fmtCnpj(e.cnpj) + (e.cnpj && !cnpjOk(e.cnpj) ? tr(' (não confere)', ' (invalid)') : '')) + linha(tr('Regime', 'Tax regime'), e.regime ? rot(REGIMES, e.regime) : '') +
      linha(tr('Contador', 'Accountant'), [e.contador && e.contador.nome, e.contador && e.contador.contato].filter(Boolean).join(' · ')) +
      ((e.contas || []).length ? '<div class="em-lin"><span class="muted small">' + esc(tr('Contas da PJ', 'Company accounts')) + '</span><ul class="em-ul">' +
        e.contas.map(function (c) { return '<li>' + esc([c.banco, c.agencia && tr('ag. ', 'branch ') + c.agencia, c.conta && tr('conta ', 'acct ') + c.conta].filter(Boolean).join(' · ')) + '</li>'; }).join('') + '</ul></div>' : '') +
      ((e.pix || []).length ? '<div class="em-lin"><span class="muted small">Pix</span><ul class="em-ul">' + e.pix.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul></div>' : '') +
      '<div class="em-lin"><span class="muted small">' + esc(tr('Documentos', 'Documents')) + '</span><ul class="em-ul em-docs">' +
        ((e.docs || []).map(function (d) {
          var n = d.validade ? dias(d.validade, h) : null;
          var val = d.validade ? ' · ' + (n < 0 ? '<span class="down">' + esc(tr('venceu em ', 'expired on ') + I18n.data(d.validade)) + '</span>' : n <= AVISO ? '<span class="warn">' + esc(tr('vence em ', 'expires on ') + I18n.data(d.validade)) + '</span>' : esc(tr('vale até ', 'valid until ') + I18n.data(d.validade))) : '';
          return '<li><button class="linkinho" data-acao="em-doc-baixar" data-id="' + esc(e.id) + '" data-doc="' + esc(d.id) + '">📄 ' + esc(rot(TIPOS, d.tipo) + (d.nome ? ' — ' + d.nome : '')) + '</button>' + val +
            ' <button class="linkinho muted" data-acao="em-doc-tirar" data-id="' + esc(e.id) + '" data-doc="' + esc(d.id) + '" aria-label="' + esc(tr('Tirar', 'Remove')) + '">✕</button></li>';
        }).join('') || '<li class="muted small">' + esc(tr('Nenhum ainda. Comece pelo cartão CNPJ.', 'None yet. Start with the CNPJ card.')) + '</li>') + '</ul>' +
      '<button class="btn sm" data-acao="em-doc" data-id="' + esc(e.id) + '">📎 ' + esc(tr('Anexar documento', 'Attach document')) + '</button></div></div>';
  }
  function tela() {
    var h = '<div class="card-head"><h1>🏢 ' + esc(tr('Cofre da empresa', 'Company vault')) + '</h1></div>';
    if (casa()) return h + '<div class="card"><p class="small">' + esc(tr('Só o responsável vê o cofre da empresa.', 'Only the account holder sees the company vault.')) + '</p></div>';
    h += '<p class="small muted">' + esc(tr('Os dados da sua empresa num lugar só, fechados no cofre reservado. Sem senhas: o app não pede nem guarda senha de banco ou de portal.',
      'Your company data in one place, encrypted in the private vault. No passwords: the app never asks for or keeps bank or portal passwords.')) + '</p>';
    h += lista().map(cartaoEmpresa).join('');
    h += '<button class="btn primary" data-acao="em-editar">+ ' + esc(tr('Cadastrar empresa', 'Add company')) + '</button>';
    return h;
  }

  /* ---------- o formulário ---------- */
  function linhaConta(c) {
    c = c || {};
    return '<div class="row em-conta" style="gap:6px;flex-wrap:wrap;margin-bottom:6px"><input class="em-banco" placeholder="' + esc(tr('Banco', 'Bank')) + '" value="' + esc(c.banco || '') + '">' +
      '<input class="em-ag" inputmode="numeric" placeholder="' + esc(tr('Agência', 'Branch')) + '" value="' + esc(c.agencia || '') + '" style="max-width:110px">' +
      '<input class="em-cc" placeholder="' + esc(tr('Conta', 'Account')) + '" value="' + esc(c.conta || '') + '" style="max-width:150px"></div>';
  }
  function abrirForm(e) {
    e = e || {};
    var ct = e.contador || {};
    $('#genTitle').textContent = e.id ? tr('Editar empresa', 'Edit company') : tr('Cadastrar empresa', 'Add company');
    $('#genBody').innerHTML = Verter.html('<div class="grid g2">' +
      campo('CNPJ', '<input id="emCnpj" inputmode="numeric" maxlength="18" value="' + esc(fmtCnpj(e.cnpj)) + '">') +
      campo(tr('Razão social', 'Legal name'), '<input id="emRazao" maxlength="120" value="' + esc(e.razao || '') + '">') +
      campo(tr('Regime', 'Tax regime'), '<select id="emRegime"><option value="">—</option>' + REGIMES.map(function (r) { return '<option value="' + r[0] + '"' + (e.regime === r[0] ? ' selected' : '') + '>' + esc(pt() ? r[1] : r[2]) + '</option>'; }).join('') + '</select>') +
      campo(tr('Contador: nome', 'Accountant: name'), '<input id="emContNome" maxlength="80" value="' + esc(ct.nome || '') + '">') +
      campo(tr('Contador: contato (telefone ou e-mail)', 'Accountant: contact (phone or e-mail)'), '<input id="emContContato" maxlength="120" value="' + esc(ct.contato || '') + '">') + '</div>' +
      '<p class="small" style="margin:10px 0 4px"><b>' + esc(tr('Contas bancárias da PJ', 'Company bank accounts')) + '</b></p><div id="emContas">' + ((e.contas || []).concat([{}]).map(linhaConta).join('')) + '</div>' +
      '<button class="linkinho" data-acao="em-mais-conta">+ ' + esc(tr('outra conta', 'another account')) + '</button>' +
      campo(tr('Chaves Pix (uma por linha)', 'Pix keys (one per line)'), '<textarea id="emPix" rows="2">' + esc((e.pix || []).join('\n')) + '</textarea>') +
      '<p class="tiny muted">' + esc(tr('Não escreva senhas aqui.', 'Do not write passwords here.')) + '</p>' +
      '<div class="f-actions">' + (e.id ? '<button class="btn" data-acao="em-apagar" data-id="' + esc(e.id) + '">' + esc(tr('Apagar', 'Delete')) + '</button>' : '') +
      '<button class="btn" data-close="genModal">' + esc(t('ac.cancelar')) + '</button><button class="btn primary" data-acao="em-salvar" data-id="' + esc(e.id || '') + '">' + esc(t('ac.salvar')) + '</button></div>');
    abrir('genModal');
  }
  function abrirDoc(e) {
    $('#genTitle').textContent = tr('Anexar documento', 'Attach document');
    $('#genBody').innerHTML = Verter.html('<div class="grid g2">' +
      campo(tr('Qual documento', 'Which document'), '<select id="emDocTipo">' + TIPOS.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === 'cartao-cnpj' && !(e.docs || []).some(function (d) { return d.tipo === 'cartao-cnpj'; }) ? ' selected' : '') + '>' + esc(pt() ? x[1] : x[2]) + '</option>'; }).join('') + '</select>') +
      campo(tr('Nome (opcional)', 'Name (optional)'), '<input id="emDocNome" maxlength="80">') +
      campo(tr('Validade (se tiver)', 'Valid until (if any)'), Cal.campo('emDocVal', '', {})) +
      campo(tr('Arquivo (PDF ou foto)', 'File (PDF or photo)'), '<input type="file" id="emDocArq" accept="application/pdf,.pdf,image/*">') + '</div>' +
      '<p class="tiny muted">' + esc(tr('O arquivo é guardado fechado. Com validade, o app lembra no 📥 60 dias antes.', 'The file is stored encrypted. With a date, the app reminds you in 📥 60 days before.')) + '</p>' +
      '<div class="f-actions"><button class="btn" data-close="genModal">' + esc(t('ac.cancelar')) + '</button><button class="btn primary" data-acao="em-doc-salvar" data-id="' + esc(e.id) + '">' + esc(t('ac.salvar')) + '</button></div>');
    abrir('genModal');
  }
  function val(id) { var x = document.getElementById(id); return x ? String(x.value || '').trim() : ''; }

  MoneyModulos.registrar({
    id: 'cofre-empresa', versao: '1.0.0', colecoes: [COL],
    pontos: {
      'inbox.grupos': function () {
        var vistos = (ST.config && ST.config.inboxVistos) || {}, l = API.vencendo().filter(function (x) { return !vistos['emp|' + x.d.id + '|' + x.d.validade]; });
        if (!l.length) return [];
        return [{ id: 'avisos', n: l.length, html: l.map(function (x) {
          var k = 'emp|' + x.d.id + '|' + x.d.validade;
          return '<li class="inb-item"><div><b>🏢 ' + esc(rot(TIPOS, x.d.tipo) + ' · ' + (x.e.razao || fmtCnpj(x.e.cnpj))) + '</b><span class="t-sub">' +
            esc(x.dias < 0 ? tr('venceu em ', 'expired on ') + I18n.data(x.d.validade) : tr('vence em ', 'expires on ') + I18n.data(x.d.validade) + tr(' (faltam ', ' (') + x.dias + tr(' dias)', ' days left)')) + '</span></div>' +
            '<span class="inb-acoes"><button class="btn sm" data-close="genModal" data-irpara="t-empresa">' + esc(tr('Abrir', 'Open')) + '</button><button class="btn sm" data-acao="inb-visto" data-k="' + esc(k) + '">' + esc(tr('ok, entendi', 'ok, got it')) + '</button></span></li>';
        }).join('') }];
      }
    },
    telas: {
      't-empresa': { app: 'tax', render: tela,
        ajuda: { pt: { t: 'Cofre da empresa', o: 'CNPJ, regime, contador, contas da PJ, Pix e documentos com validade, fechados no cofre reservado.', f: ['Comece pelo cartão CNPJ.', 'Com validade, o app lembra no 📥.', 'Sem senhas.'] },
                 en: { t: 'Company vault', o: 'CNPJ, tax regime, accountant, company accounts, Pix and dated documents, encrypted in the private vault.', f: ['Start with the CNPJ card.', 'With a date, the app reminds you in 📥.', 'No passwords.'] } } }
    },
    acoes: {
      'em-editar': function (el) { abrirForm(API.achar(el.dataset.id) || null); },
      'em-mais-conta': function () { var b = document.getElementById('emContas'); if (b) b.insertAdjacentHTML('beforeend', linhaConta()); },
      'em-salvar': function (el) {
        var cnpj = dig(val('emCnpj')), razao = val('emRazao');
        if (!cnpj && !razao) return toast(tr('Diga o CNPJ ou a razão social.', 'Enter the CNPJ or the legal name.'), 'warn');
        if (cnpj && !cnpjOk(cnpj)) return toast(tr('Esse CNPJ não confere: confira os números.', 'That CNPJ is not valid: check the digits.'), 'warn');
        var contas = Array.prototype.map.call(document.querySelectorAll('#emContas .em-conta'), function (r) {
          return { banco: r.querySelector('.em-banco').value.trim(), agencia: r.querySelector('.em-ag').value.trim(), conta: r.querySelector('.em-cc').value.trim() };
        }).filter(function (c) { return c.banco || c.agencia || c.conta; });
        var dados = { cnpj: cnpj, razao: razao, regime: val('emRegime'), contador: { nome: val('emContNome'), contato: val('emContContato') }, contas: contas,
          pix: val('emPix').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean) };
        var e = API.achar(el.dataset.id);
        if (e) Object.assign(e, dados); else lista().push(Object.assign({ id: novoId('em'), docs: [], criadoEm: hojeISO() }, dados));
        Store.salvar(); fechar('genModal'); render(); toast(tr('Empresa guardada no cofre.', 'Company saved in the vault.'));
      },
      'em-apagar': function (el) {
        var e = API.achar(el.dataset.id); if (!e || !confirm(tr('Apagar ' + (e.razao || 'esta empresa') + ' do cofre?', 'Delete ' + (e.razao || 'this company') + ' from the vault?'))) return;
        ST[COL] = lista().filter(function (x) { return x.id !== e.id; }); Store.salvar(); fechar('genModal'); render();
      },
      'em-doc': function (el) { var e = API.achar(el.dataset.id); if (e) abrirDoc(e); },
      'em-doc-salvar': async function (el) {
        var e = API.achar(el.dataset.id), f = (document.getElementById('emDocArq') || {}).files, a = f && f[0]; if (!e) return;
        if (!a) return toast(tr('Escolha o arquivo.', 'Choose the file.'), 'warn');
        var tipo = val('emDocTipo') || 'outro', nome = val('emDocNome'), validade = val('emDocVal'), arqId = '';
        try {
          var bytes = new Uint8Array(await a.arrayBuffer()), ext = (a.name.match(/\.[a-z0-9]{2,5}$/i) || [''])[0];
          var m = await ArquivosFamilia.guardar({ nome: ArquivosFamilia.nomeLimpo((e.razao || fmtCnpj(e.cnpj)) + ' ' + rot(TIPOS, tipo) + (nome ? ' ' + nome : '')) + ext, tipo: 'empresa', ano: Number(hojeISO().slice(0, 4)), ligado: e.id, mime: a.type || '' }, bytes);
          arqId = m.id;
        } catch (er) { return toast(tr('Não deu para guardar o arquivo: ', 'Could not store the file: ') + (er && er.message || er), 'warn'); }
        e.docs = e.docs || []; e.docs.push({ id: novoId('ed'), tipo: tipo, nome: nome, arquivoId: arqId, validade: /^\d{4}-\d{2}-\d{2}$/.test(validade) ? validade : '' });
        Store.salvar(); fechar('genModal'); render(); toast(tr('Documento guardado.', 'Document saved.'));
      },
      'em-doc-baixar': function (el) { var e = API.achar(el.dataset.id), d = e && (e.docs || []).find(function (x) { return x.id === el.dataset.doc; }); if (d && d.arquivoId) ArquivosFamilia.baixar(d.arquivoId); },
      'em-doc-tirar': function (el) {
        var e = API.achar(el.dataset.id); if (!e || !confirm(tr('Tirar este documento do cofre?', 'Remove this document from the vault?'))) return;
        e.docs = (e.docs || []).filter(function (x) { return x.id !== el.dataset.doc; }); Store.salvar(); render();
      }
    }
  });
  window.CofreEmpresa = API;
})();
