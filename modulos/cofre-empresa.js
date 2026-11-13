/* =====================================================================
   modulos/cofre-empresa.js — FiscalONE: o "Cofre da empresa" (3.77)        1.1.0 · 13/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ (pedido do dono, 13/Nov/2026)
     Por empresa (PJ), num lugar só: o cartão CNPJ (PDF ou foto), CNPJ, razão social, regime (Simples, Simples com
     Fator R, MEI, Lucro Presumido…), o contador (nome e contato), as contas bancárias da PJ (banco, agência, conta),
     as chaves Pix e os documentos (contrato social, alvará…), cada um com validade e lembrete no 📥 quando vence
     (60 dias antes e depois de vencido). SEM SENHAS: o app não pede nem guarda senha de banco ou de portal.
     Onde fica: a coleção "empresas" está no cofre RESERVADO (a visão da casa não vê); os arquivos vão para o cofre de
     arquivos (modulos/arquivos.js), fechados, com a descrição também no reservado.
     · 1.1.0 (3.81): por conta, os dados completos para receber (BRL: banco e código, agência, conta e dígito, tipo, titular,
       CNPJ, chaves Pix com o tipo; internacional: beneficiário e endereço, conta/IBAN, banco e endereço, SWIFT/BIC, ABA, banco
       intermediário com SWIFT e conta, moeda, finalidade, instruções) e "como o robô chama esta conta" (rotuloRobo, para a PJ);
       o painel "Dados para receber": 📋 por campo, "Copiar tudo" PT/EN (wire instructions), e-mail pelo mailto: do aparelho e
       Compartilhar (Web Share), com confirmação antes. Na empresa: o nome do sócio no extrato, pró-labore bruto/IRRF/líquido e
       o CNPJ do contador (as regras do importador do BS2 usam).
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
        e.contas.map(function (c, i) { return '<li>' + esc([c.internacional ? '🌎' : '', c.banco || c.bancoNome, c.agencia && tr('ag. ', 'branch ') + c.agencia, c.conta && tr('conta ', 'acct ') + c.conta + (c.digito ? '-' + c.digito : ''), c.iban, c.moeda, c.rotuloRobo && '(' + c.rotuloRobo + ')'].filter(Boolean).join(' · ')) +
          ' <button class="linkinho" data-acao="em-conta" data-id="' + esc(e.id) + '" data-i="' + i + '">' + esc(tr('dados completos', 'full details')) + '</button> · <button class="linkinho" data-acao="em-receber" data-id="' + esc(e.id) + '" data-i="' + i + '">📋 ' + esc(tr('Dados para receber', 'Payment details')) + '</button></li>'; }).join('') + '</ul></div>' : '') +
      '<p class="small" style="margin:4px 0"><button class="linkinho" data-acao="em-conta" data-id="' + esc(e.id) + '" data-i="novo-int">+ ' + esc(tr('conta internacional (para receber do exterior)', 'international account (to receive from abroad)')) + '</button></p>' +
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
      campo(tr('Contador: contato (telefone ou e-mail)', 'Accountant: contact (phone or e-mail)'), '<input id="emContContato" maxlength="120" value="' + esc(ct.contato || '') + '">') +
      campo(tr('Contador: CNPJ (para reconhecer o boleto)', 'Accountant: CNPJ (to recognise the bill)'), '<input id="emContCnpj" inputmode="numeric" maxlength="18" value="' + esc(fmtCnpj(ct.cnpj)) + '">') +
      campo(tr('Seu nome como aparece no extrato da PJ', 'Your name as it shows on the company statement'), '<input id="emSocio" maxlength="80" value="' + esc(e.socio || '') + '">') +
      campo(tr('Pró-labore: bruto / IRRF / líquido (R$)', 'Pro-labore: gross / withholding / net (R$)'), '<div class="row" style="gap:6px"><input id="emPlBruto" type="number" step="0.01" value="' + esc((e.prolabore || {}).bruto || '') + '" style="max-width:110px"><input id="emPlIrrf" type="number" step="0.01" value="' + esc((e.prolabore || {}).irrf || '') + '" style="max-width:110px"><input id="emPlLiq" type="number" step="0.01" value="' + esc((e.prolabore || {}).liquido || '') + '" style="max-width:110px"></div>') + '</div>' +
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

  /* ---------- 1.1.0 (3.81): os dados completos de cada conta e o painel "Dados para receber" ---------- */
  var ROTULOS = ['BS2 PJ', 'BS2 Internacional', 'BS2 PJ antiga', 'BS2 PF (US$)'];
  /* [campo, rótulo PT, rótulo EN (o padrão das instruções de transferência)] */
  var C_BRL = [['bancoCod', 'Código do banco', 'Bank code'], ['banco', 'Banco', 'Bank'], ['agencia', 'Agência', 'Branch'], ['conta', 'Conta', 'Account number'],
    ['digito', 'Dígito', 'Check digit'], ['tipo', 'Tipo de conta', 'Account type'], ['titular', 'Titular', 'Account holder'], ['cnpj', 'CNPJ', 'Tax ID (CNPJ)']];
  var C_INT = [['beneficiario', 'Beneficiário (nome exato)', 'Beneficiary'], ['endereco', 'Endereço do beneficiário', 'Beneficiary address'], ['iban', 'Conta / IBAN', 'Account / IBAN'],
    ['bancoNome', 'Banco do beneficiário', 'Beneficiary Bank'], ['bancoEndereco', 'Endereço do banco', 'Bank address'], ['swift', 'SWIFT/BIC', 'SWIFT/BIC'], ['aba', 'ABA / routing', 'ABA / Routing number'],
    ['intNome', 'Banco intermediário', 'Intermediary Bank'], ['intSwift', 'SWIFT/BIC do intermediário', 'Intermediary SWIFT/BIC'], ['intConta', 'Conta do banco no intermediário', 'Account at intermediary'],
    ['moeda', 'Moeda', 'Currency'], ['finalidade', 'Finalidade / observação para o pagador', 'Payment reference'], ['instrucoes', 'Instruções extras', 'Additional instructions']];
  function camposDe(c) { return c.internacional ? C_INT : C_BRL; }
  function pixDe(c) { return (c.pixes || []).filter(function (x) { return x && x.chave; }); }
  function linhasReceber(e, c, lg) {
    var en = lg === 'en', l = camposDe(c).filter(function (f) { return c[f[0]]; }).map(function (f) { return [en ? f[2] : f[1], String(c[f[0]])]; });
    pixDe(c).forEach(function (x) { l.push([(en ? 'Pix key' : 'Chave Pix') + (x.tipo ? ' (' + x.tipo + ')' : ''), x.chave]); });
    return l;
  }
  function textoReceber(e, c, lg) {
    var en = lg === 'en', tit = en ? (c.internacional ? 'Bank wire instructions' : 'Bank details') + ' — ' + (e.razao || '') : 'Dados para receber — ' + (e.razao || '');
    return tit + '\n' + linhasReceber(e, c, lg).map(function (x) { return x[0] + ': ' + x[1]; }).join('\n');
  }
  function mailto(e, c, lg) {
    var en = lg === 'en', ass = en ? 'Payment details — ' + (e.razao || '') : 'Dados para pagamento — ' + (e.razao || '');
    return 'mailto:?subject=' + encodeURIComponent(ass) + '&body=' + encodeURIComponent(textoReceber(e, c, lg));
  }
  function abrirConta(e, i) {
    var nova = i === 'novo-int', c = nova ? { internacional: true } : (e.contas || [])[+i] || {};
    $('#genTitle').textContent = tr('Dados completos da conta', 'Full account details');
    var cs = camposDe(c).map(function (f) { return campo(tr(f[1], f[2]), '<input data-ccampo="' + f[0] + '" maxlength="140" value="' + esc(c[f[0]] || '') + '">'); }).join('');
    $('#genBody').innerHTML = Verter.html('<div class="grid g2">' +
      campo(tr('Como o robô chama esta conta', 'What the robot calls this account'), '<select id="ecRotulo"><option value="">—</option>' + ROTULOS.map(function (r) { return '<option' + (c.rotuloRobo === r ? ' selected' : '') + '>' + esc(r) + '</option>'; }).join('') + '</select>') +
      cs + '</div>' + (c.internacional ? '' : campo(tr('Chaves Pix (uma por linha: tipo; chave)', 'Pix keys (one per line: type; key)'), '<textarea id="ecPix" rows="3">' + esc(pixDe(c).map(function (x) { return (x.tipo ? x.tipo + '; ' : '') + x.chave; }).join('\n')) + '</textarea>')) +
      '<p class="tiny muted">' + esc(tr('Tudo é opcional e fica fechado no cofre reservado. Não escreva senhas.', 'Everything is optional and stays encrypted in the private vault. Do not write passwords.')) + '</p>' +
      '<div class="f-actions"><button class="btn" data-close="genModal">' + esc(t('ac.cancelar')) + '</button><button class="btn primary" data-acao="em-conta-salvar" data-id="' + esc(e.id) + '" data-i="' + esc(String(i)) + '">' + esc(t('ac.salvar')) + '</button></div>');
    abrir('genModal');
  }
  function abrirReceber(e, i) {
    var c = (e.contas || [])[+i] || {}, l = linhasReceber(e, c, pt() ? 'pt' : 'en');
    $('#genTitle').textContent = tr('Dados para receber', 'Payment details') + ' — ' + (e.razao || '');
    $('#genBody').innerHTML = Verter.html((l.length ? '<table class="tbl em-receber"><tbody>' + l.map(function (x, k) { return '<tr><td class="small muted">' + esc(x[0]) + '</td><td><b>' + esc(x[1]) + '</b></td><td><button class="btn sm" data-acao="em-copiar" data-id="' + esc(e.id) + '" data-i="' + esc(String(i)) + '" data-k="' + k + '" aria-label="' + esc(tr('Copiar ', 'Copy ') + x[0]) + '">📋</button></td></tr>'; }).join('') + '</tbody></table>'
      : '<p class="small muted">' + esc(tr('Preencha os dados completos da conta primeiro.', 'Fill in the full account details first.')) + '</p>') +
      '<div class="f-actions" style="flex-wrap:wrap">' +
      '<button class="btn sm" data-acao="em-copiar-tudo" data-lg="pt" data-id="' + esc(e.id) + '" data-i="' + esc(String(i)) + '">📋 ' + esc(tr('Copiar tudo (PT)', 'Copy all (PT)')) + '</button>' +
      '<button class="btn sm" data-acao="em-copiar-tudo" data-lg="en" data-id="' + esc(e.id) + '" data-i="' + esc(String(i)) + '">📋 ' + esc(tr('Copiar tudo (EN)', 'Copy all (EN)')) + '</button>' +
      '<button class="btn sm" data-acao="em-email" data-lg="pt" data-id="' + esc(e.id) + '" data-i="' + esc(String(i)) + '">✉ ' + esc(tr('E-mail (PT)', 'E-mail (PT)')) + '</button>' +
      '<button class="btn sm" data-acao="em-email" data-lg="en" data-id="' + esc(e.id) + '" data-i="' + esc(String(i)) + '">✉ ' + esc(tr('E-mail (EN)', 'E-mail (EN)')) + '</button>' +
      (navigator.share ? '<button class="btn sm" data-acao="em-compartilhar" data-id="' + esc(e.id) + '" data-i="' + esc(String(i)) + '">' + esc(tr('Compartilhar', 'Share')) + '</button>' : '') + '</div>');
    abrir('genModal');
  }
  function copiar(txt) {
    var ok = function () { toast(tr('Copiado.', 'Copied.')); };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).then(ok, function () { toast(tr('Não deu para copiar.', 'Could not copy.'), 'warn'); });
    toast(tr('Não deu para copiar.', 'Could not copy.'), 'warn');
  }
  function contaDe(el) { var e = API.achar(el.dataset.id); return e ? { e: e, c: (e.contas || [])[+el.dataset.i] || {} } : null; }
  API.textoReceber = textoReceber; API.mailto = mailto; API.linhasReceber = linhasReceber;

  MoneyModulos.registrar({
    id: 'cofre-empresa', versao: '1.1.0', colecoes: [COL],
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
        var antes = (API.achar(el.dataset.id) || {}).contas || [];
        var contas = Array.prototype.map.call(document.querySelectorAll('#emContas .em-conta'), function (r, i) {   /* 1.1.0: os dados completos da conta continuam */
          return Object.assign({}, antes[i] || {}, { banco: r.querySelector('.em-banco').value.trim(), agencia: r.querySelector('.em-ag').value.trim(), conta: r.querySelector('.em-cc').value.trim() });
        }).filter(function (c) { return c.banco || c.agencia || c.conta || c.iban || c.swift; });
        var dados = { cnpj: cnpj, razao: razao, regime: val('emRegime'), contador: { nome: val('emContNome'), contato: val('emContContato'), cnpj: dig(val('emContCnpj')) }, contas: contas,
          pix: val('emPix').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean),
          socio: val('emSocio'), prolabore: { bruto: Number(val('emPlBruto')) || 0, irrf: Number(val('emPlIrrf')) || 0, liquido: Number(val('emPlLiq')) || 0 } };
        var e = API.achar(el.dataset.id);
        if (e) Object.assign(e, dados); else lista().push(Object.assign({ id: novoId('em'), docs: [], criadoEm: hojeISO() }, dados));
        Store.salvar(); fechar('genModal'); render(); toast(tr('Empresa guardada no cofre.', 'Company saved in the vault.'));
      },
      'em-apagar': function (el) {
        var e = API.achar(el.dataset.id); if (!e || !confirm(tr('Apagar ' + (e.razao || 'esta empresa') + ' do cofre?', 'Delete ' + (e.razao || 'this company') + ' from the vault?'))) return;
        ST[COL] = lista().filter(function (x) { return x.id !== e.id; }); Store.salvar(); fechar('genModal'); render();
      },
      'em-conta': function (el) { var e = API.achar(el.dataset.id); if (e) abrirConta(e, el.dataset.i); },
      'em-conta-salvar': function (el) {
        var e = API.achar(el.dataset.id); if (!e) return; e.contas = e.contas || [];
        var nova = el.dataset.i === 'novo-int', c = nova ? { internacional: true } : e.contas[+el.dataset.i];
        document.querySelectorAll('#genBody [data-ccampo]').forEach(function (x) { var v = x.value.trim(); if (v) c[x.dataset.ccampo] = v; else delete c[x.dataset.ccampo]; });
        c.rotuloRobo = val('ecRotulo');
        var px = document.getElementById('ecPix');
        if (px) c.pixes = px.value.split(/\n+/).map(function (l) { var p = l.split(';'); return p.length > 1 ? { tipo: p[0].trim(), chave: p.slice(1).join(';').trim() } : { tipo: '', chave: l.trim() }; }).filter(function (x) { return x.chave; });
        if (nova) e.contas.push(c);
        Store.salvar(); fechar('genModal'); render(); toast(tr('Conta guardada no cofre.', 'Account saved in the vault.'));
      },
      'em-receber': function (el) { var e = API.achar(el.dataset.id); if (e) abrirReceber(e, el.dataset.i); },
      'em-copiar': function (el) { var x = contaDe(el); if (!x) return; var l = linhasReceber(x.e, x.c, pt() ? 'pt' : 'en')[+el.dataset.k]; if (l) copiar(l[1]); },
      'em-copiar-tudo': function (el) {
        var x = contaDe(el); if (!x || !confirm(tr('Copiar todos os dados desta conta? Eles são sensíveis: cole só para quem vai pagar.', 'Copy all the details of this account? They are sensitive: paste only for whoever is paying.'))) return;
        copiar(textoReceber(x.e, x.c, el.dataset.lg));
      },
      'em-email': function (el) {
        var x = contaDe(el); if (!x || !confirm(tr('Abrir o e-mail do aparelho com os dados desta conta? Nada sai do app sozinho: você escolhe para quem manda.', 'Open your e-mail app with these account details? Nothing leaves the app on its own: you choose the recipient.'))) return;
        API._ultimoMailto = mailto(x.e, x.c, el.dataset.lg); location.href = API._ultimoMailto;
      },
      'em-compartilhar': function (el) {
        var x = contaDe(el); if (!x || !navigator.share || !confirm(tr('Compartilhar os dados desta conta?', 'Share these account details?'))) return;
        navigator.share({ title: tr('Dados para receber', 'Payment details'), text: textoReceber(x.e, x.c, pt() ? 'pt' : 'en') }).catch(function () {});
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
