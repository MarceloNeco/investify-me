/* =====================================================================
   modulos/ponte-omnilife.js — o que chega do OmniLifeONE pela ponte da plataforma   1.0.0 · 06/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     O OmniLifeONE manda, pela ponte (contrato C5, sol_ponte), um RESUMO da saúde da família, fechado com a
     chave da família que só chefe e responsável têm (o mesmo formato do cofre). O MoneyTRIO nunca lê a tabela
     do OmniLife (C3). Ao chegar, sem perguntar:
     · o plano de saúde ganha a operadora e quem ele cobre (Saude.juntarDaPonte; reembolso, tabela e PF/PJ
       continuam sendo daqui, e nada que você escreveu é trocado);
     · o "médico(a) de referência" vira profissional conhecido (Profissionais.confirmar): o PIX para ele
       já entra como Saúde, da pessoa certa, com IR, desde o primeiro.
     Só a mensagem mais nova vale; as mais velhas são marcadas como lidas sem aplicar.
   MENSAGEM (de_app 'omnilife-one', para_app 'moneytrio', tipo 'saude-resumo', grupo_id = a família)
     dados = {"v": 1, "cif": "<{c:1, kv, fk, iv, ct}: AES-GCM 256 com a CF>"}
     aberto = {v: 1, enviado_em, pessoas: [{perfil_id, apelido, operadora, validade, medico}]}
     (sem carteirinha, sem SUS, sem alergia, sem remédio: só o que serve para as finanças)
   API (window.PonteOmni)
     aplicarSaude(resumo)   → {planos: {novos, juntados}, medicos: [nome]}
     lerMedico(texto)       → {nome, chave} | null   ("Dra. Ana Lima (pediatra) 11 9…" → "Dra. Ana Lima")
   DADOS
     Store.estado.ponte_omnilife = [{id: 'saude-resumo', msg, criado_em, aplicado_em, pessoas, medicos}]  (o último aplicado)
   PONTOS QUE USA
     evento ponte.recebida (nuvem.js 1.8.0) · MoneyNuvem.ponte.marcarLido
   ===================================================================== */
(function () {
  'use strict';
  var COL = 'ponte_omnilife';
  function pt() { return I18n.atual === 'pt'; }
  function lista() { return (ST[COL] = Array.isArray(ST[COL]) ? ST[COL] : []); }
  function subConsulta() { var arv = (Gasto.arvore().SAUDE || []); return arv.find(function (x) { return /consult|medic/i.test(x); }) || arv[0] || 'Consultas'; }

  var API = {
    lerMedico: function (texto) {
      var t = String(texto || '').replace(/\s+/g, ' ').trim(); if (!t) return null;
      var nome = t.split(/[(\-–—|,;\/]|\d{2,}/)[0].trim().slice(0, 80);
      if (!window.Profissionais) return null;
      var w = Profissionais.norm(nome); if (!w.length) return null;
      return { nome: nome, chave: w.join(' ') };
    },
    aplicarSaude: function (r) {
      var pessoas = (r && Array.isArray(r.pessoas)) ? r.pessoas : [];
      var porOp = {};
      pessoas.forEach(function (p) { var op = String(p.operadora || '').trim(); if (!op) return; (porOp[op] = porOp[op] || []).push(String(p.apelido || '').trim()); });
      var planos = window.Saude ? Saude.juntarDaPonte(Object.keys(porOp).map(function (op) { return { operadora: op, membros: porOp[op].filter(Boolean) }; })) : { novos: 0, juntados: 0 };
      var meds = {}, nomes = [];
      pessoas.forEach(function (p) { var m = API.lerMedico(p.medico); if (!m) return; (meds[m.chave] = meds[m.chave] || { m: m, quem: [] }).quem.push(String(p.apelido || '').trim()); });
      Object.keys(meds).forEach(function (ch) {
        var x = meds[ch], achou = Profissionais.achar(x.m.nome);
        if (achou && !achou.p.ignorar && achou.nota >= 0.8) { Profissionais.confirmar(ch, { id: achou.p.id }); return; }
        if (achou && achou.p.ignorar && achou.nota >= 0.8) return;      /* você disse "não é profissional": fica assim */
        Profissionais.confirmar(ch, { nome: x.m.nome, grupo: 'SAUDE', sub: subConsulta(), quem: x.quem.length === 1 ? x.quem[0] : '', irpf: true });
        nomes.push(x.m.nome);
      });
      return { planos: planos, medicos: nomes };
    }
  };

  async function receber(msgs) {
    var minhas = (msgs || []).filter(function (m) { return m.de_app === 'omnilife-one' && m.tipo === 'saude-resumo' && m.conteudo; });
    if (!minhas.length) return;
    minhas.sort(function (a, b) { return String(a.criado_em).localeCompare(String(b.criado_em)); });
    var nova = minhas[minhas.length - 1], reg = lista().find(function (x) { return x.id === 'saude-resumo'; });
    var res = null;
    if (!reg || String(nova.criado_em) > String(reg.criado_em || '')) {
      res = API.aplicarSaude(nova.conteudo);
      if (!reg) { reg = { id: 'saude-resumo' }; lista().push(reg); }
      Object.assign(reg, { msg: nova.id, criado_em: nova.criado_em, aplicado_em: new Date().toISOString(), pessoas: (nova.conteudo.pessoas || []).length, medicos: res.medicos });
      Store.salvar(); if (typeof render === 'function') render();
      var partes = [];
      if (res.planos.novos || res.planos.juntados) partes.push(pt() ? 'plano de saúde' : 'health plan');
      if (res.medicos.length) partes.push((pt() ? 'médico de referência: ' : 'main doctor: ') + res.medicos.join(', '));
      if (partes.length) toast((pt() ? '🔗 Do OmniLifeONE: ' : '🔗 From OmniLifeONE: ') + partes.join(' · '));
    }
    for (var i = 0; i < minhas.length; i++) { try { await MoneyNuvem.ponte.marcarLido(minhas[i].id); } catch (e) {} }
  }

  MoneyModulos.registrar({
    id: 'ponte-omnilife',
    versao: '1.0.0',
    colecoes: [COL],
    ouvir: { 'ponte.recebida': function (msgs) { receber(msgs).catch(function (e) { console.warn('ponte-omnilife', e); }); } }
  });
  window.PonteOmni = API;
})();
