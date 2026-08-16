const CACHE_NAME = 'one-shell-v7';
const APP_SHELL = [
  './',
  './hosgeldin.html',
  './asistan.html',
  './otomasyonlar.html',
  './bellek.html',
  './cihazlar.html',
  './abonelik.html',
  './ayarlar.html',
  './gizlilik.html',
  './sartlar.html',
  './yardim.html',
  './i18n.js',
  './currencies.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isAppShell = APP_SHELL.some((path) => req.url.endsWith(path.replace('./', '/')) || req.url.endsWith(path));

  if (isAppShell) {
    // Önce ağdan dene, başarılıysa önbelleği güncelle. Böylece yeni bir
    // deploy yapıldığında (metin/kaydırma/logo düzeltmeleri gibi) kullanıcı
    // CACHE_NAME sürümünü elle artırmayı beklemeden en güncel sürümü görür.
    // Ağ başarısız olursa (çevrimdışı) önbellekteki son bilinen sürüme düş —
    // PWA'nın çevrimdışı çalışma özelliği böylece korunuyor.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req)),
  );
});

// --- Push bildirimleri (bkz. netlify/functions/send-notifications.js) ---
self.addEventListener('push', (event) => {
  let data = { title: 'ONE Global', body: '' };
  try { data = event.data ? event.data.json() : data; } catch (e) {}
  const title = data.title || 'ONE Global';
  const options = {
    body: data.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [80, 40, 80],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.indexOf('asistan.html') !== -1 && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./asistan.html');
    }),
  );
});
