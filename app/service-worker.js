// Notificación push: la mostramos SIEMPRE nosotros mismos con un listener
// 'push' crudo, en vez de depender de firebase.messaging().onBackgroundMessage().
// Ese método de Firebase decide solo si te avisa por aquí o por la página según
// si detecta la ventana "enfocada" — esa detección falla en PWAs de iOS y hacía
// que, con la app abierta, no saltara nada. Así se muestra siempre, sin adivinar.
//
// DEBUG TEMPORAL: probamos varias formas posibles de leer el payload (por si
// el formato real que llega no es el que esperamos) y, si no se reconoce
// ninguna, mostramos igualmente una notificación genérica con el payload en
// crudo. Así sabemos seguro si este código se está ejecutando o no.
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) {}

  const titulo =
    (payload.data && payload.data.title) ||
    payload.title ||
    (payload.notification && payload.notification.title) ||
    'DEBUG: push recibido';
  const cuerpo =
    (payload.data && payload.data.body) ||
    payload.body ||
    (payload.notification && payload.notification.body) ||
    ('payload crudo: ' + JSON.stringify(payload).slice(0, 150));

  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: cuerpo,
      icon: './icon-192.png',
      badge: './icon-192.png'
    })
  );
});
// Al tocar la notificación, abre/enfoca la app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const c of clientList) {
        if ('focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});
const CACHE_NAME = 'jc-training-v3-debug';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.url.includes('supabase.co')) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
