/* =====================================================================
   modulos/assist-hermes.js — "💬 Perguntar ao assistente" no AssistONE            1.0.2 · 26/Nov/2026 (3.110)
   ---------------------------------------------------------------------
   PILOTO da IA da plataforma no AssistONE (só o MoneyTRIO, só quem está logado na nuvem).
   Como funciona: a pergunta (com o nome da tela onde a pessoa está) vai para a fila assist_perguntas no Supabase
   da plataforma (assist_perguntar); o Hermes, na VPS da SolverONE, busca a fila, responde pelos artigos de ajuda
   (ajuda.json do solverone-dados) e grava a resposta; aqui a gente consulta a resposta a cada 2 s (assist_minha_resposta).
   Nenhuma chave de IA no app. Modelos grátis que não treinam com os dados; mesmo assim o aviso pede para não escrever
   valores, contas, senhas nem dados pessoais. Pergunta e resposta ficam 30 dias no banco e depois são apagadas.
   Liga/desliga: tabela assist_config no Supabase (ligado = false → o item some do menu). Tudo o que muda no app:
   este arquivo, a opção 'perguntar' no AssistOne (index.html) e MoneyNuvem.assist (nuvem.js 1.15.8).
   Desenho completo: solverone-app (ARQUITETURA.md, "Fila do AssistONE para o Hermes").
   ===================================================================== */
(function () {
  'use strict';
  var disponivel = false, conferidoEm = 0, conferindo = null;

  function L() { return (window.I18n && I18n.atual) || 'pt'; }
  function t(pt, en) { return L() === 'pt' ? pt : en; }
  function escH(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nuvem() { return window.MoneyNuvem && MoneyNuvem.assist; }
  function espera(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }

  /* o item só aparece quando a conta está logada e o assist_config deste app está ligado */
  function conferir() {
    var n = nuvem();
    if (!n || !n.logado()) { disponivel = false; return Promise.resolve(false); }
    if (conferindo) return conferindo;
    conferindo = n.disponivel().then(function (v) { disponivel = v === true; }, function () { disponivel = false; })
      .then(function () { conferidoEm = Date.now(); conferindo = null; return disponivel; });
    return conferindo;
  }
  function estaDisponivel() {
    if (Date.now() - conferidoEm > 5 * 60000) conferir();
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
  function html(novo) {
    return '<div class="aone-tela"><b>💬 ' + escH(t('Perguntar ao assistente', 'Ask the assistant')) + '</b>' +
      '<p>' + escH(t('Eu respondo pelas dicas e pelos manuais do MoneyTRIO. Não escreva valores, contas, senhas nem dados pessoais.',
                     'I answer from the MoneyTRIO tips and manuals. Do not type amounts, accounts, passwords or personal data.')) + '</p></div>' +
      '<textarea id="ahPergunta" rows="3" maxlength="2000" style="width:100%; box-sizing:border-box; border-radius:12px; padding:10px; ' +
      'background:var(--card2); color:var(--txt); border:1px solid var(--linha-suave); font:inherit; font-size:.9rem; resize:vertical" ' +
      'aria-label="' + escH(t('Sua pergunta', 'Your question')) + '" placeholder="' +
      escH(t('Ex.: Como eu entro com a digital?', 'E.g.: How do I sign in with my fingerprint?')) + '"></textarea>' +
      '<div style="display:flex; justify-content:flex-end; margin:8px 0"><button type="button" class="btn sm" id="ahEnviar">' +
      escH(t('Perguntar', 'Ask')) + '</button></div>' +
      '<div class="aone-tela" id="ahResposta" hidden aria-live="polite" style="white-space:normal"></div>' +
      (novo ? '' : '<div class="aone-pe"><button type="button" id="ahVoltar">← ' + escH(t('Voltar', 'Back')) + '</button>' +
      '<button type="button" id="ahFechar">' + escH(t('Fechar', 'Close')) + '</button></div>');
  }

  function mostrar(texto, eResposta) {
    var r = document.getElementById('ahResposta');
    if (!r) return;
    r.hidden = false;
    r.innerHTML = (eResposta ? '<b>🤖 ' + escH(t('Resposta', 'Answer')) + '</b>' : '') +
      '<p>' + escH(texto).replace(/\n/g, '<br>') + '</p>';
  }

  function motivo(r) {
    var m = r && r.motivo;
    if (m === 'entrar') return t('Entre na sua conta SolverONE para perguntar.', 'Sign in to your SolverONE account to ask.');
    if (m === 'limite') return t('Você chegou ao limite de ' + r.limite + ' perguntas de hoje. Amanhã tem mais.',
                                 'You reached today\'s limit of ' + r.limite + ' questions. More tomorrow.');
    if (m === 'desligado') return t('O assistente está desligado agora.', 'The assistant is turned off right now.');
    if (m === 'tamanho') return t('Escreva uma pergunta de 2 a 2.000 letras.', 'Write a question between 2 and 2,000 characters.');
    return t('Não consegui enviar a pergunta. Tente de novo.', 'I could not send the question. Try again.');
  }

  async function enviar() {
    var n = nuvem(), campo = document.getElementById('ahPergunta'), bt = document.getElementById('ahEnviar');
    if (!n || !campo || !bt) return;
    var txt = (campo.value || '').trim();
    if (txt.length < 2) { campo.focus(); return; }
    bt.disabled = true;
    mostrar(t('Pensando… (leva alguns segundos)', 'Thinking… (takes a few seconds)'));
    try {
      var r = await n.perguntar(nomeTela(), txt, L());
      if (!r || !r.ok) { mostrar(motivo(r)); bt.disabled = false; return; }
      var fim = Date.now() + 75000;
      while (Date.now() < fim) {
        await espera(2000);
        if (!document.getElementById('ahResposta')) return;          /* o balão foi fechado: para de perguntar */
        var s = await n.resposta(r.id);
        if (s && (s.estado === 'respondida' || s.estado === 'erro')) {
          mostrar(s.resposta || t('Sem resposta.', 'No answer.'), s.estado === 'respondida');
          bt.disabled = false; campo.value = ''; return;
        }
        if (s && (s.estado === 'expirada' || s.estado === 'nao-encontrada')) break;
      }
      mostrar(t('O assistente não respondeu a tempo. Tente de novo em instantes.', 'The assistant did not answer in time. Try again in a moment.'));
    } catch (e) {
      mostrar(t('Não consegui falar com o assistente agora. Confira a internet e tente de novo.',
                'I could not reach the assistant right now. Check your connection and try again.'));
    }
    bt.disabled = false;
  }

  /* abre DEPOIS do clique: o AssistONE fecha o balão quando o alvo do clique sai da tela (troca de conteúdo) */
  function abrir() { setTimeout(abrirAgora, 0); }
  function abrirAgora() {
    var balao = document.getElementById('assistBalao');
    if (!balao || typeof AssistOne === 'undefined') return;
    AssistOne.abrir('tela');
    if (!AssistOne.aberto) return;
    if (AssistOne.vis) AssistOne.vis.conteudo({ titulo: AssistOne.vis.textos().menu.perguntar, sub: nomeTela(), html: html(true) });
    else balao.innerHTML = html();
    document.getElementById('ahEnviar').addEventListener('click', enviar);
    var volta = document.getElementById('ahVoltar'), fecha = document.getElementById('ahFechar');
    if (volta) volta.addEventListener('click', function () { setTimeout(function () { AssistOne.abrir('tela'); }, 0); });
    if (fecha) fecha.addEventListener('click', function () { AssistOne.fechar(); });
    var campo = document.getElementById('ahPergunta');
    campo.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); enviar(); } });
    setTimeout(function () { campo.focus(); }, 50);
  }

  /* 1.0.1 (3.109): na 1ª abertura do balão o item não aparecia. A conferência é assíncrona (pergunta ao banco) e só rodava
     3, 15 e 45 s depois de carregar; se a conta ainda estava entrando, ou o balão abria antes da resposta, o menu saía sem
     o item e só ganhava o item na próxima abertura. Agora: toda abertura do balão confere (sem repetir à toa: com o item
     já liberado, a cada 5 min; sem ele, a cada 30 s) e, quando a resposta chega com o balão ainda aberto no menu, o menu
     se redesenha sozinho com o item. */
  var ultimoModo = 'tela';
  function ganchar() {
    if (typeof AssistOne === 'undefined' || AssistOne.__ah) return;
    var original = AssistOne.abrir.bind(AssistOne);
    AssistOne.abrir = function (modo) {
      ultimoModo = modo || 'tela';
      original(modo);
      var velho = Date.now() - conferidoEm > (disponivel ? 5 * 60000 : 30000);
      if (!AssistOne.aberto || (disponivel && !velho) || (!disponivel && conferidoEm && !velho)) return;
      var antes = disponivel;
      conferir().then(function (v) {
        /* redesenha só se o item passou a valer e o balão continua aberto no menu (não na caixinha da pergunta) */
        if (v && !antes && AssistOne.aberto && !document.getElementById('ahPergunta')) original(ultimoModo);
      });
    };
    AssistOne.__ah = 1;
  }

  window.AssistHermes = { disponivel: estaDisponivel, conferir: conferir, abrir: abrir };
  ganchar();
  /* a nuvem entra depois do carregamento: confere algumas vezes no começo */
  [3000, 15000, 45000].forEach(function (ms) { setTimeout(conferir, ms); });
})();
