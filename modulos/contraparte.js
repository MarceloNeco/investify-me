/* =====================================================================
   modulos/contraparte.js — a outra parte de cada lançamento (3.65)        1.0.0 · 11/Nov/2026
   ---------------------------------------------------------------------
   O QUE FAZ
     O robô manda, fora da impressão, em cada lançamento: contraparte {cnpj?, id_pessoa?, nome?, meio?, mcc?}.
     (id_pessoa = o CPF virou HMAC no robô; o CPF nunca chega ao app e o id_pessoa nunca aparece na tela.)
     · Contatos (modulos/pessoas.js) e Profissionais guardam os identificadores aprendidos (cnpjs[], idps[]).
       Quando a pessoa confirma (profissional, "é a mesma pessoa?", cadastrar), o identificador entra no contato.
     · Reconhece nesta ordem: CNPJ → id_pessoa → nome. Com CNPJ ou id_pessoa já confirmado, é a mesma parte mesmo
       que o nome no banco mude.
     · MCC (compras no cartão): só DICA de categoria (palpite, para confirmar), nunca confirmada.
   API (window.Contraparte)
     aplicar(g)            → reconhece profissional/contato e o palpite do MCC (no Caixa.converter)
     aprender(g, alvo)     → põe os identificadores do lançamento no contato ou profissional
     aprenderTodos()       → depois de ligar textos a pessoas: cada lançamento com contato aprende
     MCC                   → {mcc: [grupo, sub]} (a tabela pequena)
   DADOS
     lançamento: contraparte {cnpj, idp, nome, meio, mcc}, contato/contatoId (a outra parte, quando é pessoa/empresa)
     pessoa/profissional: cnpjs [], idps [] (o idp nunca aparece na tela)
   ===================================================================== */
(function () {
  'use strict';
  /* MCC → grupo e categoria do app (só palpite) */
  var MCC = {
    '5912': ['SAUDE', 'Farmácia'], '5122': ['SAUDE', 'Farmácia'],
    '5541': ['VEICULO', 'Combustível'], '5542': ['VEICULO', 'Combustível'],
    '5411': ['HABITACAO', 'Supermercado'], '5422': ['HABITACAO', 'Supermercado'], '5499': ['HABITACAO', 'Supermercado'],
    '5812': ['LAZER', 'Restaurante'], '5813': ['LAZER', 'Bar'], '5814': ['LAZER', 'Restaurante'],
    '4121': ['TRANSPORTE', 'Aplicativo'], '4111': ['TRANSPORTE', 'Ônibus e metrô'], '4131': ['TRANSPORTE', 'Ônibus e metrô'], '7523': ['VEICULO', 'Estacionamento']
  };
  function temId(o, cp) {
    if (!o || !cp) return '';
    if (cp.cnpj && ((o.cnpjs || []).indexOf(cp.cnpj) >= 0 || String(o.cnpj || '').replace(/\D/g, '') === cp.cnpj)) return 'cnpj';
    if (cp.idp && (o.idps || []).indexOf(cp.idp) >= 0) return 'idp';
    return '';
  }
  function porId(lista, cp, tipo) { return (lista || []).find(function (o) { return !o.ignorar && temId(o, cp) === tipo; }) || null; }

  var API = {
    MCC: MCC,
    aplicar: function (g) {
      var cp = g && g.contraparte; if (!cp) return g;
      var profs = (typeof ST !== 'undefined' && ST && ST.profissionais) || [], pessoas = window.Pessoas ? Pessoas.todas() : [];
      /* 1. CNPJ → 2. id_pessoa: profissional primeiro (classifica), depois contato */
      var prof = porId(profs, cp, 'cnpj') || porId(profs, cp, 'idp');
      if (prof && window.Profissionais && !g.editadoPessoa) { Profissionais.aplicar(g, prof); g.reconhecidoPor = temId(prof, cp); }
      var ct = porId(pessoas, cp, 'cnpj') || porId(pessoas, cp, 'idp');
      if (!ct && cp.nome && window.Pessoas) ct = Pessoas.achar(cp.nome);          /* 3. o nome (só quando bate certinho) */
      if (ct) { g.contato = Pessoas.rotulo(ct); g.contatoId = ct.id; if (!g.reconhecidoPor) g.reconhecidoPor = temId(ct, cp) || 'nome'; }
      else if (cp.nome && /^(PIX|TED|TEF|BOLETO)$/.test(cp.meio || '')) { g.contato = cp.nome; delete g.contatoId; }   /* fica "A identificar" */
      /* MCC: só palpite, quando o robô não deu categoria (e nenhum profissional classificou) */
      var m = cp.mcc && MCC[cp.mcc];
      if (m && !prof && (g.grupo === 'OUTROS' || !g.sub || g.sub === 'Sem categoria')) { g.grupo = m[0]; g.sub = m[1]; g.confianca = g.confianca || 'palpite'; g.palpiteMcc = cp.mcc; }
      return g;
    },
    aprender: function (g, alvo) {
      var cp = g && g.contraparte; if (!cp || !alvo) return false;
      var mudou = false;
      if (cp.cnpj) { alvo.cnpjs = alvo.cnpjs || []; if (alvo.cnpjs.indexOf(cp.cnpj) < 0) { alvo.cnpjs.push(cp.cnpj); mudou = true; } }
      if (cp.idp) { alvo.idps = alvo.idps || []; if (alvo.idps.indexOf(cp.idp) < 0) { alvo.idps.push(cp.idp); mudou = true; } }
      if (cp.cnpj && alvo.tipo === 'empresa' && !alvo.cnpj) alvo.cnpj = cp.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
      return mudou;
    },
    aprenderTodos: function () {
      if (!window.Pessoas || typeof ST === 'undefined' || !ST) return 0;
      var n = 0;
      (ST.gastos || []).forEach(function (g) { if (g.contatoId && g.contraparte) { var p = Pessoas.porId(g.contatoId); if (p && API.aprender(g, p)) n++; } });
      return n;
    }
  };
  MoneyModulos.registrar({ id: 'contraparte', versao: '1.0.0' });
  window.Contraparte = API;
})();
