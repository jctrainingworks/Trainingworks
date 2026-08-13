importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: "AIzaSyAbFdeexfL0znUQ24sPE0Ws-O-ra4viJPY",
  authDomain: "jc-training-works.firebaseapp.com",
  projectId: "jc-training-works",
  storageBucket: "jc-training-works.firebasestorage.app",
  messagingSenderId: "537191502447",
  appId: "1:537191502447:web:d1425b3d3861d544bcf39a"
});
const messaging = firebase.messaging();
// Notificación cuando la app está cerrada o en segundo plano
// IMPORTANTE: leemos payload.data (no payload.notification). Si el mensaje llevara
// un campo "notification", el propio navegador la mostraría solo, duplicando el aviso
// junto con este showNotification manual.
messaging.onBackgroundMessage(payload => {
  const titulo = (payload.data && payload.data.title) || '';
  const cuerpo = (payload.data && payload.data.body) || '';
  self.registration.showNotification(titulo, {
    body: cuerpo,
    icon: './icon-192.png',
    badge: './icon-192.png'
  });
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
const CACHE_NAME = 'jc-training-v2';
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
