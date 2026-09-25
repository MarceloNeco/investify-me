/* MoneyTRIO — service worker
   Faz o site abrir sem internet e permite instalar como app.
   AO PUBLICAR UMA VERSÃO NOVA, troque o número abaixo (v1 -> v2).
   É o que avisa os celulares de que existe conteúdo novo. */
var VERSAO = 'v14';
var CACHE = 'moneytrio-' + VERSAO;

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(['./', './index.html', './manifest.json']).catch(function () {});
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (nomes) {
    /* Só apaga caches ANTIGOS DO MONEYTRIO. Todos os apps de
       marceloneco.github.io moram no mesmo endereço e dividem a lista
       de caches: apagar "tudo que não é meu" tirava o modo sem internet
       dos outros apps (RiseONE, Cifras, Histórias…). */
    return Promise.all(nomes.map(function (n) {
      return (n.indexOf('moneytrio-') === 0 && n !== CACHE) ? caches.delete(n) : null;
    }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   /* não encosta em cotação nem notícia */

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
