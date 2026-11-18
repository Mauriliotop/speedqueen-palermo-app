/* Speed Queen Palermo — Service Worker
   Rende l'app installabile e utilizzabile anche offline (guscio dell'app in cache). */
const CACHE = 'speedqueen-v6';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './data.js',
  './app.js',
  './chatbot.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Network-first per i dati Supabase (quando collegato); cache-first per il resto.
  if (req.url.includes('supabase.co')) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  e.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});

/* Notifiche push (predisposto): quando collegherete un backend con VAPID,
   qui arriveranno gli avvisi "bucato pronto" e le conferme prenotazione. */
self.addEventListener('push', (e) => {
  let data = { title: 'Speed Queen Palermo', body: 'Novità per te.' };
  try { if (e.data) data = e.data.json(); } catch (_) {}
  e.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png'
  }));
});
