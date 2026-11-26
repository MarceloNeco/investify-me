/* =====================================================================
   modulos/assist-hermes.js — "💬 Perguntar ao assistente" no AssistONE            1.1.1 · 26/Nov/2026 (3.113)
   ---------------------------------------------------------------------
   PILOTO da IA da plataforma no AssistONE (só o MoneyTRIO, só quem está logado na nuvem).
   Como funciona: a pergunta (com o nome da tela onde a pessoa está) vai para a fila assist_perguntas no Supabase
   da plataforma (assist_perguntar); o Hermes, na VPS da SolverONE, busca a fila, responde pelos artigos de ajuda
   (ajuda.json do solverone-dados) e grava a resposta; aqui a gente consulta a resposta a cada 2 s (assist_minha_resposta).
   Nenhuma chave de IA no app. Modelos grátis que não treinam com os dados; o aviso fixo do desenho pede para não escrever
   senha, PIN nem dados de cartão. Pergunta e resposta ficam 30 dias no banco e depois são apagadas; a pessoa vê as dos
   últimos 7 dias na conversa (assist_minhas_conversas) e o "Isso responde?" fica guardado (assist_avaliar).
   Liga/desliga: tabela assist_config no Supabase (ligado = false → o item some do menu). Tudo o que muda no app:
   este arquivo, a opção 'perguntar' no AssistOne (index.html) e MoneyNuvem.assist (nuvem.js 1.15.9).
   A tela da conversa é do master do AssistONE (assistone/assistone-visual.js, AssistOneVisual.conversa).
   Desenho completo: solverone-app (ARQUITETURA.md, "Fila do AssistONE para o Hermes").
   ===================================================================== */
(function () {
  'use strict';
  var disponivel = false, conferidoEm = 0, conferindo = null;

  function L() { return (window.I18n && I18n.atual) || 'pt'; }
  function t(pt, en) { return L() === 'pt' ? pt : en; }
  function nuvem() { return window.MoneyNuvem && MoneyNuvem.assist; }
  function espera(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }

  /* o item só aparece quando a conta está logada e o assist_config deste app está ligado */
  function conferir() {
    var n = nuvem();
    if (!n || !n.logado()) { disponivel = false; conferidoEm = 0; return Promise.resolve(false); }   /* sem login: confere assim que entrar */
    if (conferindo) return conferindo;
    var antes = disponivel;
    conferindo = n.disponivel().then(function (v) { disponivel = v === true; }, function () { disponivel = false; })
      .then(function () {
        conferidoEm = Date.now(); conferindo = null;
        /* 1.1.1 (3.113): a resposta mudou com o menu aberto → o menu se redesenha, venha de onde vier a abertura
           (desde a 3.110 o toque no personagem abre o menu sem passar por AssistOne.abrir, e o item não aparecia) */
        if (disponivel !== antes && typeof AssistOne !== 'undefined' && AssistOne.aberto && AssistOne.vis && AssistOne.vis.vista() === 'menu') AssistOne.vis.menu();
        return disponivel;
      });
    return conferindo;
  }
  /* o menu pergunta isto a cada desenho: com o item liberado, confere de novo a cada 5 min; sem ele, a cada 30 s */
  function estaDisponivel() {
    if (Date.now() - conferidoEm > (disponivel ? 5 * 60000 : 30000)) conferir();
    return disponivel && !!(nuvem() && nuvem().logado());
  }

  function nomeTela() {
    try {
      var v = Assist.telaAtual();
      var a = (AJUDA_TELAS[v] || (window.MoneyModulos && (MoneyModulos.infoTela(v) || {}).ajuda) || {})[L() === 'pt' ? 'pt' : 'en'];
      return a ? a.t : String(v || '');
    } catch (e) { return ''; }
  }

  /* 1.0.2 (3.110): no painel novo do AssistONE o "Voltar ao menu" e o "Fechar" ficam no cabeçalho do próprio painel */
  function motivo(r) {
    var m = r && r.motivo;
    if (m === 'entrar') return t('Entre na sua conta SolverONE para perguntar.', 'Sign in to your SolverONE account to ask.');
    if (m === 'limite') return t('Você chegou ao limite de ' + r.limite + ' perguntas de hoje. Amanhã tem mais.',
                                 'You reached today\'s limit of ' + r.limite + ' questions. More tomorrow.');
    if (m === 'desligado') return t('O assistente está desligado agora.', 'The assistant is turned off right now.');
    if (m === 'tamanho') return t('Escreva uma pergunta de 2 a 2.000 letras.', 'Write a question between 2 and 2,000 characters.');
    return t('Não consegui enviar a pergunta. Tente de novo.', 'I could not send the question. Try again.');
  }

  /* 1.1.0 (3.111): manda a pergunta e espera a resposta (a cada 2 s, até 75 s). Continua esperando mesmo com o painel
     fechado: a resposta fica na conversa para quando a pessoa abrir de novo. */
  async function perguntar(txt) {
    var n = nuvem();
    if (!n) return { erro: motivo({ motivo: 'entrar' }) };
    try {
      var r = await n.perguntar(nomeTela(), txt, L());
      if (!r || !r.ok) return { erro: motivo(r) };
      var fim = Date.now() + 75000;
      while (Date.now() < fim) {
        await espera(2000);
        var s = await n.resposta(r.id);
        if (s && s.estado === 'respondida') return { id: r.id, resposta: s.resposta || t('Sem resposta.', 'No answer.') };
        if (s && s.estado === 'erro') return { erro: s.resposta || t('Sem resposta.', 'No answer.') };
        if (s && (s.estado === 'expirada' || s.estado === 'nao-encontrada')) break;
      }
      return { erro: t('O assistente não respondeu a tempo. Tente de novo em instantes.', 'The assistant did not answer in time. Try again in a moment.') };
    } catch (e) {
      return { erro: t('Não consegui falar com o assistente agora. Confira a internet e tente de novo.',
                       'I could not reach the assistant right now. Check your connection and try again.') };
    }
  }

  /* abre DEPOIS do clique; 1.1.0 (3.111): a conversa do desenho novo (master assist-one, AssistOneVisual.conversa):
     fases escrevendo / três pontinhos / resposta com "Isso responde?" (Sim e Não, guardados), e as conversas dos últimos 7 dias */
  function abrir() { setTimeout(abrirAgora, 0); }
  function abrirAgora() {
    if (typeof AssistOne === 'undefined' || !AssistOne.vis) return;
    AssistOne.abrir('tela');
    if (!AssistOne.aberto) return;
    var n = nuvem();
    AssistOne.vis.conversa({
      sub: nomeTela(),
      exemplo: t('Ex.: Como eu entro com a digital?', 'E.g.: How do I sign in with my fingerprint?'),
      enviar: perguntar,
      avaliar: function (id, util) { return n && n.avaliar ? n.avaliar(id, util) : null; },
      carregar: function () { return n && n.conversas ? n.conversas() : []; }
    });
  }

  /* 1.0.1 (3.109) embrulhava AssistOne.abrir para conferir e redesenhar; 1.1.1 (3.113): isso mora no conferir() e no
     estaDisponivel() acima, que o menu chama a cada desenho, seja qual for o jeito de abrir. */
  window.AssistHermes = { disponivel: estaDisponivel, conferir: conferir, abrir: abrir };
  /* a nuvem entra depois do carregamento: confere algumas vezes no começo */
  [3000, 15000, 45000].forEach(function (ms) { setTimeout(conferir, ms); });
})();
