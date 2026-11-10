/* Hemcan — iOS/Android uygulama kabuğu (Capacitor) köprüsü.
 *
 * Web sitesinde (tarayıcı / PWA) bu dosya hiçbir şey yapmaz: window.ONE_NATIVE
 * yalnızca { isNative: false } olur. Yalnızca Capacitor kabuğu içinde (iOS ve
 * Android uygulaması) çalışır ve şunları yapar:
 *
 *  1. Göreli "/api/..." isteklerini sitenin gerçek adresine yönlendirir
 *     (uygulama dosyaları telefonun içinden açılır: iOS'ta capacitor://localhost, Android'de https://localhost).
 *  2. iyi-haberler.json'u önce sitenin güncel kopyasından çeker (uygulama
 *     güncellemesi gerekmeden yeni haber görünsün), olmazsa uygulamadaki kopyaya düşer.
 *  3. Günlük rutin ve "Hatırlatmalarım" bildirimlerini TELEFONUN KENDİ yerel
 *     bildirimleriyle kurar. Web push bu kabuklarda güvenilir olmadığı için
 *     sunucuya abonelik gönderilmez; bildirimler cihazda planlanır.
 *  4. Dış bağlantıları uygulama içi tarayıcıda açar.
 *  5. Mağaza kurallarına uymayan/anlamsız web-özel kısımları (ücretli plan,
 *     "ana ekrana ekle" bandı, e-posta ile giriş) gizler.
 *
 * Bildirim metinleri netlify/functions/send-notifications.js içindeki
 * metinlerle aynıdır (tr + en; diğer diller İngilizceye düşer, sunucudakiyle aynı).
 */
(function () {
  'use strict';

  var C = window.Capacitor;
  var isNative = !!(C && typeof C.isNativePlatform === 'function' && C.isNativePlatform());
  var API_BASE = 'https://cheery-rolypoly-540555.netlify.app';
  var platform = 'web';
  try { if (isNative && C.getPlatform) platform = C.getPlatform(); } catch (e) {}
  var N = { isNative: isNative, platform: platform, API_BASE: API_BASE };
  window.ONE_NATIVE = N;
  if (!isNative) return;

  var root = document.documentElement;
  root.classList.add('is-native');

  // ---- 5. Web'e özgü kısımları gizle -------------------------------------
  var st = document.createElement('style');
  st.textContent = '.is-native [data-web-only], .is-native #install-banner { display: none !important; }' +
    '.is-native { -webkit-touch-callout: none; }' +
    '.is-native input, .is-native textarea { -webkit-touch-callout: default; -webkit-user-select: text; user-select: text; }';
  (document.head || root).appendChild(st);

  // Ücretli plan sayfası uygulamada yok (ödeme altyapısı yok); açılırsa ana sayfaya dön.
  if (/abonelik\.html$/.test(location.pathname)) location.replace('asistan.html');

  // ---- 6. Hesap kapısı -------------------------------------------------------
  // Uygulama yalnızca giriş yapmış kullanıcıya açılır (hesap + abonelik modeli).
  // AUTH_REQUIRED=false iken hiçbir şey değişmez; giris.html elle açılıp denenebilir.
  // Sunucu ve mağaza ürünleri hazır olunca true yapılır.
  var AUTH_REQUIRED = false;
  var KEY_TOKEN = 'one-session', KEY_SUSER = 'one-session-user';
  var OPEN_PAGES = /(^|\/)(giris|gizlilik|sartlar|yardim)\.html$/;
  N.authRequired = AUTH_REQUIRED;
  N.getToken = function () { try { return localStorage.getItem(KEY_TOKEN) || null; } catch (e) { return null; } };
  N.getUser = function () { try { return JSON.parse(localStorage.getItem(KEY_SUSER) || 'null'); } catch (e) { return null; } };
  N.signOut = function () {
    try { localStorage.removeItem(KEY_TOKEN); localStorage.removeItem(KEY_SUSER); } catch (e) {}
    location.replace('giris.html');
  };
  // Hesabı sunucuda siler (mağaza kuralı: uygulama içinden hesap silme). Yerel veriye dokunmaz.
  N.deleteAccount = function () {
    var t = N.getToken();
    if (!t) return Promise.reject(new Error('no_session'));
    return fetch('/api/account-delete', { method: 'POST', headers: { Authorization: 'Bearer ' + t } })
      .then(function (r) { if (!r.ok && r.status !== 401) throw new Error('delete_failed'); N.signOut(); });
  };
  function authGate() {
    if (!AUTH_REQUIRED || OPEN_PAGES.test(location.pathname)) return;
    if (!N.getToken()) {
      location.replace('giris.html?next=' + encodeURIComponent((location.pathname.split('/').pop() || 'asistan.html') + location.search));
      return;
    }
    // Oturumu arka planda doğrula: 401 ise çıkış; ağ yoksa içeri alınmaya devam edilir.
    if (!window.fetch) return;
    fetch('/api/session-me', { headers: { Authorization: 'Bearer ' + N.getToken() } }).then(function (r) {
      if (r.status === 401) { N.signOut(); return null; }
      return r.ok ? r.json() : null;
    }).then(function (j) {
      if (j && j.user) { try { localStorage.setItem(KEY_SUSER, JSON.stringify(j.user)); } catch (e) {} }
    }).catch(function () {});
  }

  // ---- 1-2. Ağ istekleri ---------------------------------------------------
  var origFetch = window.fetch ? window.fetch.bind(window) : null;
  if (origFetch) {
    window.fetch = function (input, init) {
      try {
        var url = typeof input === 'string' ? input : (input && input.url);
        if (typeof url === 'string') {
          if (url.indexOf('/api/') === 0) return origFetch(API_BASE + url, init);
          if (/^(\.\/)?iyi-haberler\.json(\?.*)?$/.test(url)) {
            return origFetch(API_BASE + '/iyi-haberler.json', init).then(function (res) {
              if (!res || !res.ok) throw new Error('remote news unavailable');
              return res;
            }).catch(function () { return origFetch(input, init); });
          }
        }
      } catch (e) { /* aşağıda normal istek yapılır */ }
      return origFetch(input, init);
    };
  }

  authGate();

  // ---- 4. Dış bağlantılar --------------------------------------------------
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (!/^https?:\/\//i.test(href)) return;
    if (href.indexOf(API_BASE) === 0) return;
    var Browser = C.Plugins && C.Plugins.Browser;
    if (!Browser) return;
    e.preventDefault();
    Browser.open({ url: href }).catch(function () {});
  }, true);

  // ---- 3. Yerel bildirimler ------------------------------------------------
  var LN = C.Plugins && C.Plugins.LocalNotifications;
  var KEY_SETTINGS = 'one-notif-settings';
  var KEY_ENABLED = 'one-notif-enabled';
  var KEY_REMINDERS = 'one-reminders';
  var KEY_PERM = 'one-native-notif-perm';

  var CONTENT = {
    tr: {
      wake: { title: 'Günaydın 🌅', body: "Bugün yine hayattasın — bunun için şükretmeyi unutma. Sevdiklerinle güzel vakit geçir, çünkü yarın sen ya da sevdiğin biri burada olmayabilir. O yüzden sonra değil, şimdi ve bugün. Hatırlatmamı istediğin bir şey var mı? Unutma, ben her gün buradayım." },
      wakeEvening: { title: 'Bugün yine hayattasın 🙏', body: "Bugün yine hayattasın — bunun için şükretmeyi unutma. Sevdiklerinle güzel vakit geçir, çünkü yarın sen ya da sevdiğin biri burada olmayabilir. O yüzden sonra değil, şimdi ve bugün." },
      waterButtons: { glass: '🥛 Bir bardak', ml500: '500 ml', l1: '1 lt' },
      water: { title: 'Su vakti 💧', body: 'Günde 2-3 litre su tüketmen önemli. Ne kadar içtiysen aşağıdan ekle, günlük toplamını uygulamada gör.' },
      exercise: function (p, sq, s, x) { return { title: 'Sabah sporu zamanı 💪', body: 'Hadi başlayalım: ' + p + ' şınav, ' + sq + ' squat, ' + s + ' mekik' + x + '. Kendini nasıl hissettiğini merak ediyorum.' }; },
      home: { title: 'Günü kapatıyoruz 🙏', body: 'Çok şükür, bugünü de bitirdik. Umarım her şey yolundadır. Hatırlatmamı istediğin bir şey var mı?' },
      noonCheck: { title: 'Aklında bir şey var mı? 💭', body: 'Henüz hiç hatırlatma eklemedin. Hatırlatmamı istediğin bir şey var mı? Uygulamadaki Hatırlatmalarım listesine ekleyebilirsin.' },
      steps: { title: 'Günlük 10 bin adım 🚶', body: 'Günde 10 bin adım atmak sağlığın için çok önemli — iş bitimine kadar tamamlayabilecek misin? Değilsen, akşam işten sonra ya da eve varınca biraz yürüyüş yapmayı unutma :)' },
      reading: function (pages) { return { title: 'Kitap vakti 📖', body: 'Bugün en az ' + pages + ' sayfa okudun mu? Birkaç sayfa bile kendine güzel bir ara.' }; },
      teeth: { title: 'Diş sağlığı hatırlatması 🦷', body: 'Dişlerini fırçaladın mı? Diş sağlığı çok önemli.' },
      eveningExercise: function (p, sq, s, x) { return { title: 'Küçük bir akşam hareketi 💪', body: p + ' şınav, ' + sq + ' squat, ' + s + ' mekik çek' + x + ' — sağlıklı ve güzel bir vücut için. Gelecekteki sen, şu anki sana teşekkür edecek.' }; },
      bed: { title: 'İyi geceler 🌙', body: 'Günü kapatma vakti. Telefonu bırak, güzel bir uyku seni bekliyor. Yarın yeniden buradayım.' },
      reminder: { title: 'Hatırlatma ⏰' },
      waterDone: { title: 'Tebrikler! 💧', body: 'Günlük sağlıklı su içme miktarına ulaştın 🎉' },
    },
    en: {
      wake: { title: 'Good morning 🌅', body: "You're alive again today — don't forget to be grateful for that. Spend real time with the people you love, because tomorrow you or someone you love might not be here. So not later — now, today. Anything you'd like me to remind you of? I'm here every day." },
      wakeEvening: { title: "You're alive again today 🙏", body: "You're alive again today — don't forget to be grateful for that. Spend real time with the people you love, because tomorrow you or someone you love might not be here. So not later — now, today." },
      waterButtons: { glass: '🥛 A glass', ml500: '500 ml', l1: '1 L' },
      water: { title: 'Water time 💧', body: "Drinking 2-3 litres of water a day matters. Add what you've had below and see your daily total in the app." },
      exercise: function (p, sq, s, x) { return { title: 'Morning workout time 💪', body: "Let's go: " + p + ' push-ups, ' + sq + ' squats, ' + s + ' sit-ups' + x + ". Curious how you'll feel after." }; },
      home: { title: 'Wrapping up the day 🙏', body: "Thank goodness, we made it through today too. I hope everything's alright. Is there anything you'd like me to remind you of?" },
      noonCheck: { title: 'Anything on your mind? 💭', body: "You haven't added any reminders yet. Is there anything you'd like me to remind you of? You can add it to your Reminders list in the app." },
      steps: { title: '10,000 steps a day 🚶', body: "Walking 10,000 steps a day matters a lot for your health — can you finish by end of work? If not, don't forget a walk this evening after work or once you're home :)" },
      reading: function (pages) { return { title: 'Reading time 📖', body: 'Did you read at least ' + pages + ' pages today? Even a few pages is a nice moment for yourself.' }; },
      teeth: { title: 'Dental health reminder 🦷', body: 'Did you brush your teeth? Dental health matters.' },
      eveningExercise: function (p, sq, s, x) { return { title: 'A little evening movement 💪', body: p + ' push-ups, ' + sq + ' squats, ' + s + ' sit-ups' + x + ' — for a healthy, strong body. Future you will thank present you.' }; },
      bed: { title: 'Good night 🌙', body: "Time to close the day. Put the phone down — good sleep is waiting for you. I'll be here again tomorrow." },
      reminder: { title: 'Reminder ⏰' },
      waterDone: { title: 'Congratulations! 💧', body: "You've reached today's healthy water goal 🎉" },
    },
  };

  function getLang() {
    var l = null;
    try { l = (window.ONE_I18N && window.ONE_I18N.getLang && window.ONE_I18N.getLang()) || localStorage.getItem('one-lang'); } catch (e) {}
    return l === 'tr' ? 'tr' : 'en';
  }
  function readJSON(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function toMin(hhmm) {
    if (typeof hhmm !== 'string' || hhmm.indexOf(':') === -1) return null;
    var p = hhmm.split(':'), h = parseInt(p[0], 10), m = parseInt(p[1], 10);
    return isNaN(h) || isNaN(m) ? null : h * 60 + m;
  }
  function wrap(min) { return ((min % 1440) + 1440) % 1440; }
  function extraSuffix(s) {
    var list = Array.isArray(s && s.customExercises) ? s.customExercises : [];
    var parts = list.filter(function (x) { return x && typeof x.name === 'string' && x.name.trim() && x.count > 0; })
      .map(function (x) { return x.count + ' ' + x.name.trim(); });
    return parts.length ? ', ' + parts.join(', ') : '';
  }
  function parseAt(at) {
    var m = typeof at === 'string' && at.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0, 0);
  }

  // Günlük tekrarlayan bildirimler: { id, min, title, body, water }
  function routine(settings, lang, hasReminders) {
    var c = CONTENT[lang] || CONTENT.en;
    var s = settings || {};
    var p = s.pushups || 10, sq = s.squat || 10, si = s.situps || 20, x = extraSuffix(s);
    var wake = toMin(s.wakeTime || '07:30'), home = toMin(s.homeTime || '18:30'), bed = toMin(s.bedTime || '23:00');
    var out = [];
    function add(id, min, payload, water) { out.push({ id: id, min: wrap(min), title: payload.title, body: payload.body, water: !!water }); }
    if (wake !== null) {
      var ex = c.exercise(p, sq, si, x);
      add(1001, wake + 15, ex);
      add(1002, wake + 60, c.wake);
      add(1003, wake + 120, c.water, true);
      add(1004, wake + 480, c.water, true);
    }
    if (!hasReminders) add(1005, 12 * 60, c.noonCheck);
    add(1006, 13 * 60, c.steps);
    if (home !== null) {
      add(1007, home, c.home);
      add(1008, home + 60, c.wakeEvening);
      add(1009, home + 90, c.reading(s.pages || 5));
    }
    if (bed !== null) {
      add(1010, bed - 60, c.teeth);
      add(1011, bed - 30, c.eveningExercise(p, sq, si, x));
      if (s.notifyBedtime !== false) add(1012, bed, c.bed);
    }
    return out;
  }

  function permState() {
    if (!LN) return Promise.resolve('denied');
    return LN.checkPermissions().then(function (r) {
      var d = r && r.display ? r.display : 'denied';
      try { localStorage.setItem(KEY_PERM, d); } catch (e) {}
      return d;
    }).catch(function () { return 'denied'; });
  }

  // Android 8+: bildirimler bir kanal ister. Kanal bir kez oluşur; tekrar oluşturmak zararsızdır.
  var CHANNEL = 'hemcan-reminders';
  var channelReady = null;
  function ensureChannel(lang) {
    if (platform !== 'android' || !LN || !LN.createChannel) return Promise.resolve();
    if (channelReady) return channelReady;
    var tr = lang === 'tr';
    channelReady = LN.createChannel({
      id: CHANNEL,
      name: tr ? 'Hatırlatmalar' : 'Reminders',
      description: tr ? 'Günlük rutin, su ve hatırlatmalarım' : 'Daily routine, water and my reminders',
      importance: 4, visibility: 1, vibration: true, lights: true,
    }).catch(function () {});
    return channelReady;
  }
  // Android'e özgü alanlar: kanal, küçük simge, kesin alarm istemeden (ayar ekranı açmadan) planla.
  function droid(n) {
    if (platform === 'android') { n.channelId = CHANNEL; n.smallIcon = 'ic_stat_hemcan'; n.isExactNotification = false; }
    return n;
  }

  var actionsReady = false;
  function ensureActionTypes(lang) {
    var c = CONTENT[lang] || CONTENT.en;
    return LN.registerActionTypes({
      types: [{
        id: 'WATER',
        actions: [
          { id: 'water-250', title: c.waterButtons.glass },
          { id: 'water-500', title: c.waterButtons.ml500 },
          { id: 'water-1000', title: c.waterButtons.l1 },
        ],
      }],
    }).then(function () { actionsReady = true; }).catch(function () {});
  }

  var rescheduling = null, again = false;
  // Planlananı sıfırlayıp ayarlara göre yeniden kurar. Çalışırken yeni bir çağrı
  // gelirse, bitince bir kez daha (güncel ayarlarla) çalışır.
  function reschedule() {
    if (!LN) return Promise.resolve();
    if (rescheduling) { again = true; return rescheduling; }
    rescheduling = runSchedule().catch(function () {}).then(function () {
      rescheduling = null;
      if (again) { again = false; return reschedule(); }
    });
    return rescheduling;
  }
  function runSchedule() {
    return permState().then(function (perm) {
      if (perm !== 'granted' || localStorage.getItem(KEY_ENABLED) !== '1') {
        return LN.getPending().then(function (r) { return r.notifications.length ? LN.cancel({ notifications: r.notifications }) : null; });
      }
      var lang = getLang();
      var settings = readJSON(KEY_SETTINGS, {});
      var reminders = readJSON(KEY_REMINDERS, []);
      if (!Array.isArray(reminders)) reminders = [];

      // Zamanı geçmiş tek seferlik hatırlatmalar gönderilmiş sayılır ve listeden düşer
      // (sunucudaki davranışla aynı); zamansız notlar listede kalır.
      var now = Date.now();
      var kept = reminders.filter(function (r) { var d = r && parseAt(r.at); return !(d && d.getTime() <= now); });
      if (kept.length !== reminders.length) { try { localStorage.setItem(KEY_REMINDERS, JSON.stringify(kept)); } catch (e) {} }

      var list = [];
      routine(settings, lang, kept.length > 0).forEach(function (r) {
        var n = {
          id: r.id, title: r.title, body: r.body,
          schedule: { on: { hour: Math.floor(r.min / 60), minute: r.min % 60 }, repeats: true },
          extra: { url: r.water ? 'asistan.html#su' : 'asistan.html' },
        };
        if (r.water) n.actionTypeId = 'WATER';
        list.push(droid(n));
      });
      var c = CONTENT[lang] || CONTENT.en;
      var n2 = 0;
      kept.forEach(function (r, i) {
        var d = r && parseAt(r.at);
        if (!d || !r.text || n2 >= 40) return;
        n2++;
        list.push(droid({ id: 2000 + i, title: c.reminder.title, body: String(r.text).slice(0, 300), schedule: { at: d }, extra: { url: 'otomasyonlar.html' } }));
      });

      return LN.getPending()
        .then(function (r) { return r.notifications.length ? LN.cancel({ notifications: r.notifications }) : null; })
        .then(function () { return ensureChannel(lang); })
        .then(function () { return ensureActionTypes(lang); })
        .then(function () { return LN.schedule({ notifications: list }); });
    });
  }

  N.cachedPerm = function () { try { return localStorage.getItem(KEY_PERM) || 'prompt'; } catch (e) { return 'prompt'; } };
  N.permission = permState;
  N.reschedule = reschedule;

  // Kullanıcı bildirimleri açar: izin ister, başarılıysa planlar.
  N.enableNotifications = function () {
    if (!LN) return Promise.resolve('unsupported');
    return LN.requestPermissions().then(function (r) {
      var d = r && r.display ? r.display : 'denied';
      try { localStorage.setItem(KEY_PERM, d); } catch (e) {}
      if (d !== 'granted') return d;
      try { localStorage.setItem(KEY_ENABLED, '1'); } catch (e) {}
      return reschedule().then(function () { return 'granted'; });
    });
  };
  N.disableNotifications = function () {
    try { localStorage.setItem(KEY_ENABLED, '0'); } catch (e) {}
    return reschedule();
  };
  // Hemen göster (ör. su hedefi tamamlandı). İzin yoksa sessizce vazgeçer.
  N.notifyNow = function (kind) {
    if (!LN) return;
    permState().then(function (perm) {
      if (perm !== 'granted') return;
      var c = CONTENT[getLang()] || CONTENT.en;
      var p = c[kind];
      if (!p) return;
      return ensureChannel(getLang()).then(function () {
        return LN.schedule({ notifications: [droid({ id: 3000 + Math.floor(Math.random() * 900), title: p.title, body: p.body || '', schedule: { at: new Date(Date.now() + 1500) }, extra: { url: 'asistan.html#su' } })] });
      });
    }).catch(function () {});
  };

  if (LN) {
    // Bildirime veya üzerindeki su düğmesine basılınca ilgili yere git.
    LN.addListener('localNotificationActionPerformed', function (ev) {
      try {
        var id = ev && ev.actionId;
        var m = /^water-(\d{2,4})$/.exec(id || '');
        if (m) { location.href = 'asistan.html?su=' + m[1] + '#su'; return; }
        var url = ev && ev.notification && ev.notification.extra && ev.notification.extra.url;
        if (typeof url === 'string' && /^[a-z-]+\.html(#[a-z]+)?$/i.test(url)) location.href = url;
      } catch (e) {}
    });

    // Açılışta ve dil değişince planı güncel tut (dil, ayarlar, hatırlatmalar).
    var start = function () { permState().then(function () { reschedule(); }); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
    window.addEventListener('one-lang-changed', function () { reschedule(); });
  }
})();
