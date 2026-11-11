/* MoneyTRIO — service worker
   Faz o site abrir sem internet e permite instalar como app.
   AO PUBLICAR UMA VERSÃO NOVA, troque o número abaixo (v1 -> v2).
   É o que avisa os celulares de que existe conteúdo novo. */
var VERSAO = 'v66';
var CACHE = 'moneytrio-' + VERSAO;
/* O que fica guardado para abrir sem internet. Cada <script src> do index.html entra aqui com o MESMO ?v=
   (teste/teste-modulos.js confere). Módulo novo = uma linha aqui + uma no index.html. */
var ARQUIVOS = ['./', './index.html', './manifest.json', './recursos.js', './ajuda-botao.png', './icone-192.png',
  './estilo.css?v=3.65.2', './textos/frases-en.js?v=3.66', './textos/mudancas.js?v=3.66',
  './textos/glossario.js?v=3.51', './textos/coach.js?v=3.51',
  './modulos/base.js?v=1.1.0',
  './modulos/arquivos.js?v=1.0.0',
  './modulos/agendamentos.js?v=1.0.0',
  './modulos/nf-ir.js?v=1.0.1',
  './modulos/profissionais.js?v=1.2.0',
  './modulos/saude.js?v=1.1.0',
  './modulos/ponte-omnilife.js?v=1.0.0',
  './modulos/patrimonio-iliquido.js?v=1.1.1',
  './modulos/fgts.js?v=1.0.0',
  './modulos/importar-posicoes.js?v=1.0.0',
  './modulos/assinaturas.js?v=1.1.0',
  './modulos/compromisso-de.js?v=1.7.0',
  './modulos/previsto.js?v=1.0.0',
  './modulos/conciliacao.js?v=1.0.0', './modulos/calendario-menu.js?v=1.1.0',
  './modulos/pessoas.js?v=1.1.0', './modulos/indicadores.js?v=1.0.0', './modulos/saldo-banco.js?v=2.1.0', './modulos/espelho.js?v=1.1.2', './modulos/tour.js?v=1.0.0', './modulos/cartoes.js?v=1.0.0', './modulos/cartao-foto.js?v=1.0.0',
  /* 3.65: o motor do Leitor OCR para o cartão por foto (cópia do leitor-ocr; leitor/tesseract/ é guardado no 1º uso) */
  './leitor/leitura.js', './leitor/leitura/catalogo.js', './leitor/leitura/texto.js', './leitor/leitura/foto.js', './leitor/leitores/cartao-plastico.js', './modulos/contraparte.js?v=1.0.0', './modulos/declaracao-escolhas.js?v=1.0.0', './modulos/origem.js?v=1.0.1', './modulos/lancamento-form.js?v=1.0.0', './modulos/categorias.js?v=1.0.0', './modulos/visao-casa.js?v=1.0.0',
  './nuvem.js?v=1.14.0'];
/* O motor de leitura de fotos (leitor/tesseract: Tesseract e português, uns 9 MB, a MESMA pasta do motor do
   Leitor OCR; assets/ocr: ZXing e jsQR) tem cache próprio, que NÃO muda a cada versão do app:
   baixa na primeira leitura e fica. Para trocar o motor, troque o número.
   3.65: ocr-2 — o Tesseract saiu de assets/ocr (era uma 2ª cópia); a ativação apaga o ocr-1. */
var CACHE_OCR = 'moneytrio-ocr-2';

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(ARQUIVOS).catch(function () {});
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (nomes) {
    /* Só apaga caches ANTIGOS DO MONEYTRIO. Todos os apps de
       marceloneco.github.io moram no mesmo endereço e dividem a lista
       de caches: apagar "tudo que não é meu" tirava o modo sem internet
       dos outros apps (RiseONE, Cifras, Histórias…). */
    return Promise.all(nomes.map(function (n) {
      return (n.indexOf('moneytrio-') === 0 && n !== CACHE && n !== CACHE_OCR) ? caches.delete(n) : null;
    }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   /* não encosta em cotação nem notícia */
  /* os interruptores do RootifyONE vão sempre à rede; a reserva sem internet é do próprio recursos.js */
  if (url.pathname.indexOf('/solverone-dados/') >= 0) return;

  /* o motor de leitura: cache primeiro e para sempre; só busca na rede o que ainda não tem */
  if (url.pathname.indexOf('/assets/ocr/') >= 0 || url.pathname.indexOf('/leitor/tesseract/') >= 0) {
    e.respondWith(
      caches.open(CACHE_OCR).then(function (c) {
        return c.match(req).then(function (r) {
          return r || fetch(req).then(function (resp) {
            if (resp && resp.status === 200) c.put(req, resp.clone());
            return resp;
          });
        });
      })
    );
    return;
  }

  /* a página: rede primeiro, para o conteúdo estar sempre atual;
     o cache é a reserva de quando não há internet */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (r) {
        var copia = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copia); });
        return r;
      }).catch(function () {
        return caches.match(req).then(function (r) { return r || caches.match('./index.html'); });
      })
    );
    return;
  }

  /* o resto: cache primeiro, atualizando por baixo */
  e.respondWith(
    caches.match(req).then(function (cacheado) {
      var rede = fetch(req).then(function (r) {
        if (r && r.status === 200) {
          var copia = r.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copia); });
        }
        return r;
      }).catch(function () { return cacheado; });
      return cacheado || rede;
    })
  );
});

/* Avisos vindos de um servidor de push. Hoje o MoneyTRIO não tem
   servidor, então esta parte fica parada — mas já sabe receber,
   mostrar e tratar o clique quando houver. */
self.addEventListener('push', function (e) {
  var dados = {};
  try { dados = e.data ? e.data.json() : {}; }
  catch (err) { dados = { titulo: 'MoneyTRIO', texto: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(dados.titulo || 'MoneyTRIO', {
    body: dados.texto || '',
    icon: 'icone-192.png',
    badge: 'icone-192.png',
    tag: dados.tag || dados.tipo || 'moneytrio',
    data: { url: dados.url || './', tipo: dados.tipo || null }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var destino = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var c = lista[i];
        if (c.url.indexOf(self.location.origin) === 0 && 'focus' in c) {
          c.postMessage({ mt: 'notificacao-clicada', url: destino });
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(destino);
    })
  );
});
