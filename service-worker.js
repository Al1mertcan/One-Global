const CACHE_NAME = 'one-shell-v10';
const APP_SHELL = [
  './',
  './hosgeldin.html',
  './asistan.html',
  './otomasyonlar.html',
  './bellek.html',
  './cihazlar.html',
  './hedefler.html',
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
  let data = { title: 'Hemcan', body: '' };
  try { data = event.data ? event.data.json() : data; } catch (e) {}
  const title = data.title || 'Hemcan';
  const options = {
    body: data.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [80, 40, 80],
    // Bildirime dokunulunca açılacak adres (ör. su hatırlatması -> su kartı).
    data: { url: typeof data.url === 'string' ? data.url : './asistan.html' },
  };
  // Eylem düğmeleri (ör. su: bir bardak / 500 ml / 1 lt). Desteklemeyen
  // tarayıcılar bunları sessizce yok sayar; bildirime dokunmak yine çalışır.
  if (Array.isArray(data.actions) && data.actions.length) {
    options.actions = data.actions.slice(0, 3).map((a) => ({ action: String(a.action), title: String(a.title) }));
  }
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const baseUrl = (event.notification.data && event.notification.data.url) || './asistan.html';
  // "water-250" gibi bir eylem düğmesine basıldıysa miktarı (ml) çıkar.
  const m = /^water-(\d{2,4})$/.exec(event.action || '');
  const waterMl = m ? parseInt(m[1], 10) : 0;
  const targetUrl = waterMl ? './asistan.html?su=' + waterMl + '#su' : baseUrl;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.indexOf('asistan.html') !== -1 && 'focus' in client) {
          // Açık uygulama varsa sayfayı yeniden yüklemeden miktarı ona ilet.
          if (waterMl) client.postMessage({ type: 'water-add', ml: waterMl });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});
