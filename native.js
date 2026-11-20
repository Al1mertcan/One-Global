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

  // Yerel eklentiler (bildirim, tarayıcı, uygulama) paketleyicisiz sayfada kendiliğinden
  // C.Plugins altında görünmez: Capacitor eklentiyi ancak registerPlugin() çağrılınca
  // JS tarafına bağlar. Bu yüzden önce hazır olana bakar, yoksa kaydeder.
  function plug(name) {
    try {
      if (C.Plugins && C.Plugins[name]) return C.Plugins[name];
      if (typeof C.registerPlugin === 'function') return C.registerPlugin(name);
    } catch (e) {}
    return null;
  }

  // ---- 5. Web'e özgü kısımları gizle -------------------------------------
  var st = document.createElement('style');
  st.textContent = '.is-native [data-web-only], .is-native #install-banner { display: none !important; }' +
    '.is-native { -webkit-touch-callout: none; }' +
    '.is-native input, .is-native textarea { -webkit-touch-callout: default; -webkit-user-select: text; user-select: text; }';
  (document.head || root).appendChild(st);

  // ---- iPhone'a özel: bitmemiş görünen içerik gizlenir ----------------------
  // Apple "yakında / tamamlanmamış" içeriği (App Review 2.1) sık reddeder. iPhone uygulamasında
  // "Hemcan Yapay Zekâ — Yakında" kartı ile "Cihazlar" sekmesi (kartı ve sayfası) görünmez.
  // Web ve Android aynı kalır. Yapay zekâ gerçekten açıldığında bu satırlar kaldırılır.
  if (platform === 'ios') {
    root.classList.add('is-ios');
    st.textContent += '.is-ios #chat-soon, .is-ios a[href="cihazlar.html"] { display: none !important; }';
    if (/cihazlar\.html$/.test(location.pathname)) location.replace('asistan.html');
  }

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
    var Browser = plug('Browser');
    if (!Browser) return;
    e.preventDefault();
    Browser.open({ url: href }).catch(function () {});
  }, true);

  // ---- 7. Android: seçim listeleri ve geri tuşu --------------------------------
  // WebView'in kendi açılır listesi (select) Android temasıyla uyumsuz görünüyordu (koyu zemin üstünde
  // siyah yazı, dev satırlar). Android'de listeyi sayfa içinde, uygulamanın renkleriyle açıyoruz.
  var sheetEl = null;
  function closeSheet() { if (sheetEl && sheetEl.parentNode) sheetEl.parentNode.removeChild(sheetEl); sheetEl = null; }
  N.closeSheet = closeSheet;
  function openSheet(sel) {
    closeSheet();
    var back = document.createElement('div');
    back.setAttribute('role', 'dialog');
    back.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(3,10,20,.62);display:flex;align-items:flex-end;justify-content:center;';
    var panel = document.createElement('div');
    panel.style.cssText = 'width:100%;max-width:520px;max-height:72vh;overflow-y:auto;background:#0C1B30;border:1px solid #28415F;border-bottom:0;border-radius:22px 22px 0 0;padding:8px 0 calc(12px + env(safe-area-inset-bottom));box-shadow:0 -12px 40px rgba(0,0,0,.45);';
    var title = sel.getAttribute('aria-label');
    if (title) {
      var h = document.createElement('div');
      h.textContent = title.split('/')[0].trim();
      h.style.cssText = 'padding:12px 20px 8px;font:600 13px system-ui,sans-serif;color:#A8BCD3;';
      panel.appendChild(h);
    }
    Array.prototype.forEach.call(sel.options, function (o) {
      if (o.disabled || o.hidden) return;
      var on = o.value === sel.value;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = o.textContent;
      btn.style.cssText = 'display:block;width:100%;text-align:start;padding:14px 20px;border:0;background:' + (on ? 'rgba(57,215,255,.12)' : 'transparent') +
        ';color:' + (on ? '#39D7FF' : '#EFF7FF') + ';font:' + (on ? '700' : '500') + ' 16px system-ui,sans-serif;';
      btn.addEventListener('click', function () {
        sel.value = o.value;
        sel.dispatchEvent(new Event('input', { bubbles: true }));
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        closeSheet();
      });
      panel.appendChild(btn);
    });
    back.addEventListener('click', function (e) { if (e.target === back) closeSheet(); });
    back.appendChild(panel);
    document.body.appendChild(back);
    sheetEl = back;
    var cur = panel.querySelector('button[style*="rgba(57,215,255,.12)"]');
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'center' });
  }
  // Tarih / saat seçici: WebView'in kendi penceresi de koyu zeminde siyah yazı gösteriyordu. Aynı yaklaşımla
  // (time, date, datetime-local) için sayfa içinde, uygulamanın renkleriyle kaydırmalı sütunlar açıyoruz.
  var PICK_TYPES = { 'time': 1, 'date': 1, 'datetime-local': 1 };
  function pickLang() {
    var l = '';
    try { l = (window.ONE_I18N && window.ONE_I18N.getLang && window.ONE_I18N.getLang()) || localStorage.getItem('one-lang') || ''; } catch (e) {}
    return l || navigator.language || 'tr';
  }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function openPicker(inp) {
    closeSheet();
    var type = inp.type;
    var lang = pickLang();
    var isTr = /^tr/i.test(lang), isEn = /^en/i.test(lang);
    var now = new Date();
    var cur = inp.value || '';
    var datePart = '', timePart = '';
    if (type === 'datetime-local') { var sp = cur.split('T'); datePart = sp[0] || ''; timePart = sp[1] || ''; }
    else if (type === 'date') datePart = cur;
    else timePart = cur;
    var st = {};
    var dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
    var tm = /^(\d{1,2}):(\d{2})/.exec(timePart);
    if (type === 'datetime-local' && !dm && !tm) {
      var nx = new Date(now.getTime() + 3600000);
      st.date = ymd(nx); st.h = nx.getHours(); st.mi = 0;
    } else {
      st.date = dm ? datePart : ymd(now);
      st.h = tm ? +tm[1] : 9; st.mi = tm ? +tm[2] : 0;
    }
    var dy = +st.date.slice(0, 4), dmo = +st.date.slice(5, 7) - 1, dd = +st.date.slice(8, 10);
    function loc(opts, d) { try { return d.toLocaleDateString(lang, opts); } catch (e) { return d.toLocaleDateString(undefined, opts); } }

    var cols = [];
    if (type === 'datetime-local') {
      var items = [], start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      var cd = new Date(dy, dmo, dd);
      if (cd < start) start = cd;
      for (var i = 0; i < 400; i++) {
        var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        var lab = loc({ weekday: 'short', day: 'numeric', month: 'short' }, d);
        if (ymd(d) === ymd(now) && (isTr || isEn)) lab = (isTr ? 'Bugün · ' : 'Today · ') + lab;
        items.push({ l: lab, v: ymd(d) });
      }
      cols.push({ key: 'date', items: items, flex: 3 });
    }
    if (type === 'date') {
      var dItems = [], mItems = [], yItems = [];
      for (var a = 1; a <= 31; a++) dItems.push({ l: String(a), v: a });
      for (var b = 0; b < 12; b++) mItems.push({ l: loc({ month: 'short' }, new Date(2000, b, 1)), v: b });
      var y0 = Math.min(now.getFullYear() - 10, dy), y1 = Math.max(now.getFullYear() + 3, dy);
      for (var c = y0; c <= y1; c++) yItems.push({ l: String(c), v: c });
      cols.push({ key: 'day', items: dItems, flex: 1 }, { key: 'mon', items: mItems, flex: 1.3 }, { key: 'year', items: yItems, flex: 1.3 });
    } else {
      var hItems = [], miItems = [];
      for (var h = 0; h < 24; h++) hItems.push({ l: p2(h), v: h });
      for (var m = 0; m < 60; m++) miItems.push({ l: p2(m), v: m });
      cols.push({ key: 'h', items: hItems, flex: 1 }, { key: 'mi', items: miItems, flex: 1 });
    }

    var back = document.createElement('div');
    back.setAttribute('role', 'dialog');
    back.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(3,10,20,.62);display:flex;align-items:flex-end;justify-content:center;';
    var panel = document.createElement('div');
    panel.style.cssText = 'width:100%;max-width:520px;background:#0C1B30;border:1px solid #28415F;border-bottom:0;border-radius:22px 22px 0 0;padding:8px 14px calc(14px + env(safe-area-inset-bottom));box-shadow:0 -12px 40px rgba(0,0,0,.45);';
    var title = inp.getAttribute('aria-label') || '';
    var h1 = document.createElement('div');
    h1.textContent = title ? title.split('/')[0].trim() : (type === 'time' ? (isTr ? 'Saat seç' : 'Select time') : (isTr ? 'Tarih seç' : 'Select date'));
    h1.style.cssText = 'padding:12px 6px 8px;font:600 13px system-ui,sans-serif;color:#A8BCD3;';
    panel.appendChild(h1);
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;';
    var btnsByCol = {};
    function curVal(key) {
      if (key === 'date') return st.date;
      if (key === 'h') return st.h;
      if (key === 'mi') return st.mi;
      if (key === 'day') return dd;
      if (key === 'mon') return dmo;
      if (key === 'year') return dy;
    }
    function setVal(key, v) {
      if (key === 'date') st.date = v;
      else if (key === 'h') st.h = v;
      else if (key === 'mi') st.mi = v;
      else if (key === 'day') dd = v;
      else if (key === 'mon') dmo = v;
      else if (key === 'year') dy = v;
    }
    function paint(key) {
      var cv = curVal(key);
      btnsByCol[key].forEach(function (x) {
        var on = x.v === cv;
        x.el.style.background = on ? 'rgba(57,215,255,.16)' : 'transparent';
        x.el.style.color = on ? '#39D7FF' : '#EFF7FF';
        x.el.style.fontWeight = on ? '700' : '500';
      });
    }
    cols.forEach(function (col) {
      var wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;flex:' + col.flex + ';height:228px;overflow-y:auto;border:1px solid #28415F;border-radius:14px;background:#08162A;-webkit-overflow-scrolling:touch;';
      btnsByCol[col.key] = [];
      col.items.forEach(function (it) {
        var bt = document.createElement('button');
        bt.type = 'button';
        bt.textContent = it.l;
        bt.style.cssText = 'display:block;width:100%;height:44px;border:0;text-align:center;font:500 16px system-ui,sans-serif;white-space:nowrap;';
        bt.addEventListener('click', function () { setVal(col.key, it.v); paint(col.key); });
        wrap.appendChild(bt);
        btnsByCol[col.key].push({ v: it.v, el: bt });
      });
      row.appendChild(wrap);
      col._wrap = wrap;
    });
    panel.appendChild(row);
    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:10px;margin-top:12px;';
    function mk(txt, primary) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = txt;
      b.style.cssText = 'flex:1;height:46px;border-radius:14px;font:700 15px system-ui,sans-serif;' +
        (primary ? 'border:0;background:#39D7FF;color:#04101F;' : 'border:1px solid #28415F;background:transparent;color:#EFF7FF;');
      return b;
    }
    var cancel = mk(isTr ? 'İptal' : 'Cancel', false), ok = mk(isTr ? 'Tamam' : 'OK', true);
    cancel.addEventListener('click', closeSheet);
    ok.addEventListener('click', function () {
      var val;
      if (type === 'time') val = p2(st.h) + ':' + p2(st.mi);
      else if (type === 'datetime-local') val = st.date + 'T' + p2(st.h) + ':' + p2(st.mi);
      else {
        var dim = new Date(dy, dmo + 1, 0).getDate();
        val = dy + '-' + p2(dmo + 1) + '-' + p2(Math.min(dd, dim));
      }
      inp.value = val;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      closeSheet();
    });
    actions.appendChild(cancel); actions.appendChild(ok);
    panel.appendChild(actions);
    back.addEventListener('click', function (e) { if (e.target === back) closeSheet(); });
    back.appendChild(panel);
    document.body.appendChild(back);
    sheetEl = back;
    cols.forEach(function (col) {
      paint(col.key);
      var cv = curVal(col.key), sel = btnsByCol[col.key].filter(function (x) { return x.v === cv; })[0];
      if (sel) col._wrap.scrollTop = Math.max(0, sel.el.offsetTop - 92);
    });
  }
  function isPick(t) { return t && t.tagName === 'INPUT' && PICK_TYPES[t.type] && !t.disabled; }
  if (platform === 'android') {
    var intercept = function (e) {
      var t = e.target;
      if (t && t.tagName === 'SELECT' && !t.disabled && !t.multiple) { e.preventDefault(); e.stopPropagation(); if (t.blur) t.blur(); if (e.type === 'click') openSheet(t); return; }
      if (isPick(t)) {
        // readOnly: WebView'in kendi tarih/saat penceresini hiç açmasın
        t.readOnly = true;
        e.preventDefault(); e.stopPropagation(); if (t.blur) t.blur();
        if (e.type === 'click') openPicker(t);
      }
    };
    document.addEventListener('mousedown', intercept, true);
    document.addEventListener('click', intercept, true);
    var lockPick = function () {
      Array.prototype.forEach.call(document.querySelectorAll('input[type=time],input[type=date],input[type=datetime-local]'), function (x) { x.readOnly = true; });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lockPick); else lockPick();
  }

  // Geri tuşu: açık liste varsa onu kapatır; ana ekranda uygulamayı kapatır; başka sayfadaysa bir önceki sayfaya
  // (geçmiş yoksa ana ekrana) döner.
  var AppPlugin = plug('App');
  if (AppPlugin && AppPlugin.addListener) {
    AppPlugin.addListener('backButton', function () {
      if (sheetEl) { closeSheet(); return; }
      var page = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
      var isHome = page === '' || page === 'index' || page === 'asistan' || page === 'hosgeldin' || page === 'giris';
      if (isHome) { if (AppPlugin.exitApp) AppPlugin.exitApp(); return; }
      if (window.history.length > 1) window.history.back(); else location.href = 'asistan.html';
    });
  }

  // ---- 3. Yerel bildirimler ------------------------------------------------
  var LN = plug('LocalNotifications');
  var KEY_SETTINGS = 'one-notif-settings';
  var KEY_ENABLED = 'one-notif-enabled';
  var KEY_REMINDERS = 'one-reminders';
  var KEY_PERM = 'one-native-notif-perm';

  // Kullanıcının adı (ilk açılış formundan, yalnızca cihazda)
  function firstName() {
    try { return (window.ONE_PROFILE && window.ONE_PROFILE.firstName && window.ONE_PROFILE.firstName()) || ''; } catch (e) { return ''; }
  }
  // Günlük motivasyon sözleri (her gün farklı; tr + en)
  /*QUOTES_START*/var QUOTES = {"tr": ["Bugün küçük bir adım at; yarın o adım yol olur.", "Mükemmel anı bekleme. Başla, an kendiliğinden mükemmelleşir.", "Kendine gösterdiğin nezaket, günün en güçlü enerjisidir.", "Her sabah yeni bir sayfa. Kalemi tutan sensin.", "Zor günler geçer; onlarda gösterdiğin cesaret kalır.", "Bugünkü emeğin, yarınki sensin.", "Vazgeçmek kolaydır, devam etmek karakter ister.", "Düşmek kaybetmek değildir; kalkmamak kaybetmektir.", "Mükemmel olmak zorunda değilsin, sadece dünden biraz daha iyi ol.", "Bir kez daha dene. Kapı belki tam bu denemede aralanır.", "Küçük alışkanlıklar, büyük hayatların sessiz mimarıdır.", "Kendini başkalarıyla değil, dünkü seninle kıyasla.", "Yavaş ilerlemek, durmaktan her zaman iyidir.", "İyi hissetmek bir lüks değil, bir ihtiyaçtır. Kendine zaman ayır.", "Bugün yapabildiğin kadarı, yeterince değerlidir.", "Şükretmek, sahip olduklarını fark etmenin en güzel yoludur.", "Güzel bir gün beklemeyin; güzel bir günü kendiniz başlatın.", "Yorgunluk geçer, pişmanlık geçmez. Bugün kendin için bir şey yap.", "Cesaret, korkunun yokluğu değil, korkuya rağmen atılan adımdır.", "Gülümsemek bedava ama değeri çok yüksek bir yatırımdır.", "Sabır, acele eden herkesten daha uzağa gider.", "Hayallerin seni korkutuyorsa, doğru yoldasın demektir.", "Bir gün diyenler değil, bugün başlayanlar yol alır.", "Sağlığın en güzel yatırımın. Bugün ona bir şey ekle.", "Sevdiklerine ayırdığın vakit, hayatın en değerli birikimidir.", "Kendine inan; en zor adımı zaten attın: başlamak.", "Her gün biraz daha iyi, bir yılın sonunda koca bir fark yaratır.", "Bugün dinlenmek de ilerlemektir. Kendine nazik ol.", "Güçlü olmak hiç düşmemek değil, her düştüğünde yeniden kalkmaktır.", "Mutluluk büyük anlarda değil, küçük farkındalıklarda saklıdır.", "Bir bardak su, birkaç adım, bir derin nefes: bazen iyi bir gün bu kadar basittir.", "Zihnine ne verirsen, o büyür. Bugün ona iyi şeyler ver.", "Başkalarına iyi gelmek, kendine de iyi gelir.", "Disiplin, motivasyonun bittiği yerde devreye girer.", "Bugünün işini yarına bırakma; yarının kendi işleri var.", "Kendini affet, öğren, devam et.", "İlerleme, mükemmellikten daha önemlidir.", "İyi bir söz, bir gününü değiştirebilir; belki bugün birine sen söylersin.", "Hedefin kadar yolun da güzel olsun. Yolculuğun tadını çıkar.", "Bugün attığın her adım, geleceğindeki seni şekillendiriyor.", "Nefes al. Her şeyi aynı anda çözmek zorunda değilsin.", "Yaptığın küçük iyilik, bir başkasının koca gününü aydınlatabilir.", "Güne bir gülümsemeyle başla; gerisi kendiliğinden gelir.", "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.", "Kendine verdiğin sözleri tut; en büyük güveni kendinde kur.", "Dün geride kaldı, yarın henüz gelmedi. Elinde bugün var.", "Beden alışır, zihin alışır. Önemli olan başlamak ve sürdürmektir.", "Her şey birdenbire değişmez, ama her gün biraz değişir.", "Sen düşündüğünden daha güçlü, hissettiğinden daha yetkinsin.", "Hemcan ailesinde yalnız değilsin. Birlikte güçlüyüz.", "Bugün bedenine bir teşekkür et; seni her gün taşıyor.", "Bir bardak su, günün en sessiz ama en etkili iyiliğidir.", "Kısa bir yürüyüş, kafandaki en büyük düğümü bile gevşetebilir.", "Dinlenmek tembellik değil, yarın için yapılan akıllı bir yatırımdır.", "Bugün kendine sorduğun nazik bir soru: Ne yapsam iyi gelir?", "Küçük bir ilerleme bile hareketsizlikten bin kat değerlidir.", "Sabah attığın ilk adım, günün tonunu belirler.", "Derin bir nefes al; şu an yapman gereken tek şey bu.", "Bugün birine içten bir teşekkür et; ikinizin de günü güzelleşir.", "Zor olan başlamaktır; devamı çoğu zaman kendiliğinden gelir.", "Kendine sabırlı ol; ağaçlar bile bir gecede büyümez.", "Her gün biraz daha güçlenmek, bir gün çok güçlü olmaktır.", "Mutlu olmak için büyük bir sebep bekleme; küçük olanlar yeter.", "Bugün yapacağın küçük bir iyilik, bir hafta sonra hâlâ hatırlanır.", "Hızlı gitmek zorunda değilsin; yeter ki yolda kal.", "İyi bir uyku, ertesi günün sessiz süper gücüdür.", "Bugün kendini başkasının gözüyle değil, kendi gözünle değerlendir.", "Sağlıklı bir öğün, kendine verdiğin küçük bir söz gibidir.", "Yarın bugünden daha iyi olacaksa, bugün bir şey yapmalısın.", "Gülümse; çünkü hem seni hem karşındakini rahatlatır.", "Bazen en iyi plan, sadece bir sonraki küçük adımı atmaktır.", "Bugün tamamlayamadığın şeyler seni tanımlamaz; devam etmen tanımlar.", "Zihnin yorulunca bedenini hareket ettir, bedenin yorulunca zihnini dinlendir.", "Sevdiğin birine bugün bir mesaj at; belki tam da ihtiyacı olan şeydir.", "Alışkanlıklar bir kez değil, her gün seçilir.", "Kendine duyduğun saygı, attığın her sağlıklı adımda büyür.", "Bugün bir şeyi bırakmak da güçtür; her şeyi taşımak zorunda değilsin.", "Ne kadar yavaş gittiğin değil, durmadığın önemlidir.", "Dünün hatası, bugünün öğretmenidir.", "Güzel bir sabah için akşamdan küçük bir hazırlık yeter.", "Bugün kendine bir kahkaha borçlusun; onu öde.", "Şikâyet etmek yorar, çözüm aramak güçlendirir.", "Bir sayfa okumak, bir kapı aralamaktır.", "Sağlık, her gün tekrarlanan sıradan seçimlerin toplamıdır.", "Bugün telefonu bir süre bırak; gerçek dünya seni bekliyor.", "Sahip olduklarını saymaya başlayınca, eksiklerin sesi kısılır.", "Kendine yapılan en güzel yatırım, düzenli bir alışkanlıktır.", "Yorgunsan bırakma, sadece nefes al ve devam et.", "Her şeyi mükemmel yapmaya çalışırken, hiçbir şeye başlayamazsın.", "Bugün bir hedefini bir adım yaklaştır; ne kadar küçük olduğu önemli değil.", "Yürüyen yolu bulur, bekleyen yalnızca beklemeyi.", "Başkalarının başarısı senin yolunu kapatmaz; sadece yolun var olduğunu gösterir.", "Güne şükürle başlayan, gün boyu daha fazla güzellik görür.", "Bedenin sesine kulak ver; çoğu zaman ne istediğini bilir.", "Bugün sevdiklerine sarıl; bu, en eski ve en etkili ilaçtır.", "Bir hata, bir son değil; yeni bir deneme için sebeptir.", "Küçük zaferleri kutla; büyükler onların üzerine kurulur.", "Kendine verdiğin zaman, başkalarına verebileceğin sevginin kaynağıdır.", "Bugün bir şeyi ilk kez dene; hayat küçük cesaretlerle genişler.", "Su iç, yürü, güneş gör; bazen reçete bu kadar basittir.", "Beklentiyi azalt, minneti artır; huzur oradadır.", "Ne zaman başlarsan başla, hiç başlamamaktan iyidir.", "Yeni bir gün, yeni bir deneme hakkıdır.", "Bir adımın sana ulaşmak için yüz adıma ihtiyacı yok; sen sadece bir adım at.", "Kendine karşı sert değil, adil ol.", "Hayat bazen yavaşlamanı ister; kulak ver.", "Bugünün sakinliğini yarına taşıyacak olan senin seçimlerindir.", "Bir fincan çay, birkaç dakika sessizlik; kendine verilebilecek küçük bir hediye.", "Sevgiyle yapılan her iş, daha hafif ve daha güzeldir.", "Bugün bir arkadaşını ara; zaman ayırmak en değerli armağandır.", "Sonuca değil sürece âşık ol; sonuç ona uyar.", "Pes etmeyi düşündüğün an, çoğu zaman başarıya en yakın andır.", "Dinç bir zihin için hareketli bir beden gerekir.", "Bugün kendine bir hedef koy ve akşam onu hatırla.", "Yıldızlara bakmak için gece olmasını bekleme; içindeki ışığı bugün de bulabilirsin.", "Kendine nazik davranan, başkalarına da nazik davranır.", "Küçük bir plan, büyük bir kaostan iyidir.", "Sabah bir bardak su, güne nazik bir merhabadır.", "Yapabileceğin en iyi şey, bugün elinden geleni yapmaktır.", "Zamanın en güzel kullanımı, sevdiklerinle geçirilen zamandır.", "İlerlemek için bazen geri çekilmek gerekir; bu da yolun bir parçasıdır.", "Kendini toparlamak için asla geç değildir.", "Bugün bir kötü alışkanlığı bırakmak için küçük bir adım at.", "Bir güzel söz bırak; birinin günü aydınlansın.", "Öğrenmeyi bırakmayan, genç kalır.", "Düşüncelerin gürültülüyse, yürüyüşe çık; adımlar onları sessizleştirir.", "Bugün için yeterince çabaladın; kendine bir iyi akşamlar de.", "Her şeyin bir zamanı var; senin zamanın da geliyor.", "Kendini ifade etmek, kalbinin nefes almasıdır.", "Güvenmek, her şeyi bilmek değil, bilmesen de denemektir.", "Bugünün işini bugün yap ki akşam huzurla uyuyabilesin.", "Büyük değişimler, sessiz tekrarlarla başlar.", "Meyve ye, su iç, biraz güneş al; bedenin teşekkür edecek.", "Gerçek zenginlik, huzurlu bir zihin ve sağlıklı bir bedendir.", "Düştüğün yer bitiş değil, öğrenme yeridir.", "Bugün kimseyi yargılama; herkesin görmediğin bir yükü var.", "İyi bir kitap, iyi bir sohbet, iyi bir uyku; bazen yeter.", "Bir gülümseme paylaş; çoğalarak geri döner.", "Korkularının üzerine yürü; çoğu, yaklaşınca küçülür.", "Her yeni gün, geçmişin yükünü bırakma fırsatıdır.", "Beden kasları gibi zihnin de egzersize ihtiyacı var; bugün ona bir şey öğret.", "Kendine yatırım yapan asla kaybetmez.", "Bugün hayır de; çünkü kendine evet demen gerekiyor.", "Küçük bir teşekkür, büyük bir kapıyı açabilir.", "Dengeli olmak, her şeyi eşit yapmak değil, her şeye zaman bulmaktır.", "Dün yapamadığın şeyi bugün denemekten çekinme.", "Hayatı ağırlaştıran şeylerden biri, her şeyi aynı anda istemektir.", "Yürürken düşünmek, oturup düşünmekten daha berrak sonuç verir.", "Bugün sağlığın için küçük bir adım at; yarın büyük bir adım olacak.", "Sen kendine ne söylersen, zihnin ona inanır. Güzel söyle.", "Bir işi bitirmek, o işe başlamak kadar değerlidir.", "Şükretmek, mutluluğa giden en kısa yoldur.", "Bugün biriyle gözlerinin içine bakarak konuş.", "Yavaş yavaş, ama her gün; işte sırrı bu.", "Her şeyin hızlandığı bir dünyada yavaşlayabilmek bir ustalıktır.", "Beklemek yerine hazırlan; fırsat hazır olanı bulur.", "Bugün biraz daha az ekran, biraz daha çok gökyüzü.", "Kendine dürüst olmak, huzurun ilk şartıdır.", "Tekrar tekrar denemek, ustalığın bedelidir.", "Sevgi, küçük ilgilerle büyür.", "Bugün bir işi ertelemeden bitir; sonra nasıl hafiflediğini gör.", "Başkasına yardım etmek, kendine yardım etmenin sessiz bir yoludur.", "Zihnin sakinse, en zor gün bile yönetilebilir olur.", "Bir hedefe giden yol, yüzlerce küçük \"bugün\"den oluşur.", "Bedenin bir tapınak değil, bir yol arkadaşıdır; ona iyi bak.", "Kendini başkalarına ispatlamak zorunda değilsin; yalnızca dünkü sana.", "İyi bir gün için önce iyi bir niyet gerekir.", "Bugün çok şey yapmasan da, vazgeçmediysen kazandın.", "Bir bardak su ve bir derin nefes; yeniden başlamak için yeterli.", "Kendini sevmek bencillik değil, sağlıklı bir başlangıçtır.", "Küçük adımlar, büyük yürüyüşlerin sessiz kahramanlarıdır.", "Bugün sevdiğin bir şarkıyı aç, bir dakikalığına dans et.", "Dinlemek, en değerli ilgidir.", "Mutlu olmak için mükemmel bir hayat gerekmez; farkında olmak yeter.", "Yarın için yapabileceğin en iyi şey, bugünü iyi yaşamaktır.", "Bir günü güzel yapan çoğu zaman bir karedir: bir çay, bir selam, bir gülümseme.", "Tembel bir günün ardından bile yeniden başlayabilirsin.", "Bugün yürüdüğün her adım, geleceğine bırakılmış bir armağandır.", "Sağlıklı beslenmek bir ceza değil, kendine gösterilen özendir.", "Hayat, sevdiklerinle paylaştığında daha lezzetli olur.", "Zaman geçecek; geçerken ne yaptığın önemli.", "Bugün bir şeyi sadece keyfi için yap.", "Kendine ayırdığın on dakika, günün geri kalanını değiştirebilir.", "Endişen bir şey değiştirmiyorsa, sadece yoruyordur; bırak.", "Cesaret, \"bir deneyeyim\" demektir.", "Güzel bir hayat, güzel bir günle başlar; bugünü güzelleştir.", "İyi insanlarla yürümek, yolu kısaltır.", "Her sabah, kendine ikinci bir şans verirsin; kullan.", "Bugün bir şeyi öğrenmeden uyuma.", "Dalgalar gelir ve geçer; sen kıyı gibi sakin kal.", "Yeterince su, yeterince uyku, yeterince sevgi: sade bir reçete.", "Hâlâ buradaysan, yeniden başlamak için sebebin var.", "Mutluluk, kapısı içeriden açılan bir evdir.", "Bugün birine \"iyi ki varsın\" de.", "Küçük rutinler, büyük huzurlar getirir.", "Yapabildiğin kadarını yap; geri kalanı yarının işi.", "Güçlü olmak, her zaman gülmek değildir; bazen dinlenmeyi bilmektir.", "Gün batarken bugünü teşekkürle uğurla.", "Sen iyileştikçe, çevrendekiler de iyileşir.", "Bugün ayağa kalk, gerin, bir derin nefes al; vücudun sana minnettar olur.", "Bir tohum gibi sabırlı ol; filiz vermek zaman ister.", "Doğru zaman, genellikle şimdidir.", "Hemcan ailesiyle her gün bir adım daha iyiye.", "Birbirimize iyi gelmek, en güzel ortak hedefimiz.", "Bugün bir hemcanına iyi bir söz söyle; zincir böyle büyür.", "Yalnız yürüyen hızlı gider, birlikte yürüyen uzağa; Hemcan'da birlikteyiz.", "Küçük iyilikler çoğalınca büyük bir aile olur.", "Bugün hem kendine hem bir başkasına iyi gel.", "Kendi iyiliğin, başkalarının iyiliğine kapı aralar.", "Sabırla ilerleyen, ilerledikçe güçlenir.", "Her gün biraz daha iyi bir sen; Hemcan'ın sözü bu."], "en": ["Take one small step today; tomorrow it becomes a path.", "Don't wait for the perfect moment. Start, and the moment becomes perfect.", "The kindness you show yourself is the strongest energy of the day.", "Every morning is a fresh page, and you hold the pen.", "Hard days pass; the courage you showed in them stays.", "Today's effort is tomorrow's you.", "Quitting is easy. Continuing takes character.", "Falling isn't losing. Not getting up is.", "You don't have to be perfect, just a little better than yesterday.", "Try one more time. The door may open on exactly this attempt.", "Small habits are the quiet architects of big lives.", "Compare yourself not with others, but with who you were yesterday.", "Moving slowly beats standing still, every time.", "Feeling good isn't a luxury, it's a need. Make time for it.", "What you manage today is valuable enough.", "Gratitude is the most beautiful way to notice what you already have.", "Don't wait for a good day; start one yourself.", "Tiredness passes, regret doesn't. Do something for yourself today.", "Courage isn't the absence of fear, it's taking the step anyway.", "A smile costs nothing and pays back a lot.", "Patience goes further than everyone who rushes.", "If your dreams scare you, you're on the right road.", "Those who start today get further than those who say 'someday'.", "Your health is your best investment. Add something to it today.", "Time spent with the people you love is life's most valuable savings.", "Believe in yourself; you've already taken the hardest step: starting.", "A little better every day makes a huge difference at the end of a year.", "Resting today is progress too. Be kind to yourself.", "Being strong isn't never falling, it's getting up every time you do.", "Happiness hides not in big moments but in small noticing.", "A glass of water, a few steps, one deep breath: sometimes a good day is that simple.", "What you feed your mind grows. Feed it good things today.", "Being good to others is good for you too.", "Discipline steps in where motivation runs out.", "Don't leave today's work for tomorrow; tomorrow has its own.", "Forgive yourself, learn, keep going.", "Progress matters more than perfection.", "A kind word can change someone's day; maybe today you'll be the one to say it.", "Make the road as good as the goal. Enjoy the journey.", "Every step you take today shapes the you of the future.", "Breathe. You don't have to solve everything at once.", "A small kindness from you can light up someone's whole day.", "Start the day with a smile and the rest will follow.", "Success is the sum of small efforts repeated every day.", "Keep the promises you make to yourself; build your deepest trust there.", "Yesterday is gone and tomorrow hasn't come. You have today.", "Bodies adapt, minds adapt. What matters is to begin and to keep going.", "Nothing changes all at once, but everything changes a little each day.", "You are stronger than you think and more capable than you feel.", "You're not alone in the Hemcan family. Together we are strong.", "Thank your body today; it carries you every single day.", "A glass of water is the quietest and most effective kindness of the day.", "A short walk can loosen even the biggest knot in your mind.", "Resting isn't laziness; it's a smart investment in tomorrow.", "Ask yourself one kind question today: what would feel good right now?", "Even tiny progress is worth a thousand times more than standing still.", "The first step you take in the morning sets the tone of the day.", "Take a deep breath; that's the only thing you need to do right now.", "Sincerely thank someone today; it brightens both your days.", "The hard part is starting; the rest often follows by itself.", "Be patient with yourself; even trees don't grow overnight.", "Getting a little stronger each day means being very strong one day.", "Don't wait for a big reason to be happy; small ones are enough.", "A small kindness you do today may still be remembered a week from now.", "You don't have to go fast; just stay on the road.", "Good sleep is the quiet superpower of the next day.", "Judge yourself today through your own eyes, not someone else's.", "A healthy meal is like a small promise you keep to yourself.", "If tomorrow is to be better than today, you have to do something today.", "Smile; it eases both you and the person in front of you.", "Sometimes the best plan is simply taking the next small step.", "What you didn't finish today doesn't define you; your continuing does.", "When your mind is tired, move your body; when your body is tired, rest your mind.", "Message someone you love today; it may be exactly what they needed.", "Habits aren't chosen once; they're chosen every day.", "Your self-respect grows with every healthy step you take.", "Letting go of something today is strength too; you don't have to carry everything.", "It doesn't matter how slowly you go, only that you don't stop.", "Yesterday's mistake is today's teacher.", "A little preparation the evening before makes for a lovely morning.", "You owe yourself a good laugh today; pay it.", "Complaining tires you; looking for solutions strengthens you.", "Reading one page is opening a door.", "Health is the sum of ordinary choices repeated every day.", "Put the phone down for a while today; the real world is waiting for you.", "When you start counting what you have, the voice of what's missing gets quieter.", "The best investment in yourself is a steady habit.", "If you're tired, don't quit; just breathe and carry on.", "If you try to do everything perfectly, you'll never begin anything.", "Move one goal one step closer today; it doesn't matter how small.", "Those who walk find the road; those who wait find only waiting.", "Others' success doesn't block your path; it shows that paths exist.", "Those who start the day with gratitude see more beauty all day long.", "Listen to your body; it often knows what it needs.", "Hug the people you love today; it's the oldest and most effective medicine.", "A mistake isn't an ending; it's a reason to try again.", "Celebrate small victories; the big ones are built on them.", "The time you give yourself is the source of the love you can give others.", "Try something for the first time today; life widens with small acts of courage.", "Drink water, walk, see the sun; sometimes the prescription is that simple.", "Lower expectations, raise gratitude; peace lives there.", "Whenever you start, it's better than never starting.", "A new day is a new chance to try.", "One step doesn't need a hundred more to count; just take one step.", "Be fair to yourself, not harsh.", "Life sometimes asks you to slow down; listen.", "It's your choices that will carry today's calm into tomorrow.", "A cup of tea and a few minutes of silence: a small gift you can give yourself.", "Anything done with love feels lighter and turns out lovelier.", "Call a friend today; giving your time is the most valuable gift.", "Fall in love with the process, not the result; the result will follow.", "The moment you think of giving up is often the one closest to success.", "A fresh mind needs a body that moves.", "Set yourself one goal this morning and remember it tonight.", "Don't wait for night to look at the stars; you can find your inner light today too.", "Those who are kind to themselves are kind to others.", "A small plan beats a big chaos.", "A glass of water in the morning is a gentle hello to the day.", "The best you can do is whatever you can do today.", "The best use of time is time spent with the people you love.", "Sometimes you must step back to move forward; that's part of the road too.", "It's never too late to pull yourself together.", "Take one small step today toward leaving a bad habit.", "Leave a kind word behind; someone's day will light up.", "Those who never stop learning stay young.", "If your thoughts are loud, go for a walk; steps quiet them.", "You've tried enough for today; say a kind good evening to yourself.", "Everything has its time; yours is coming too.", "Expressing yourself is your heart taking a breath.", "Trust isn't knowing everything; it's trying even when you don't.", "Do today's work today so you can sleep in peace tonight.", "Big changes begin with quiet repetitions.", "Eat some fruit, drink water, get a little sun; your body will thank you.", "True wealth is a peaceful mind and a healthy body.", "The place where you fell isn't an ending; it's a place of learning.", "Don't judge anyone today; everyone carries a load you can't see.", "A good book, a good chat, a good sleep: sometimes that's enough.", "Share a smile; it comes back multiplied.", "Walk toward your fears; most of them shrink as you get closer.", "Every new day is a chance to put down the burden of the past.", "Like muscles, your mind needs exercise; teach it something today.", "Those who invest in themselves never lose.", "Say no today, because you need to say yes to yourself.", "A small thank-you can open a big door.", "Balance isn't doing everything equally; it's finding time for everything that matters.", "Don't hesitate to try today what you couldn't do yesterday.", "One thing that makes life heavy is wanting everything at once.", "Thinking while walking often brings clearer results than thinking while sitting.", "Take a small step for your health today; tomorrow it becomes a big one.", "Whatever you tell yourself, your mind believes. Say it kindly.", "Finishing a task is as valuable as starting it.", "Gratitude is the shortest road to happiness.", "Talk to someone today while looking them in the eyes.", "Slowly, but every day; that's the secret.", "In a world where everything speeds up, being able to slow down is a skill.", "Prepare instead of waiting; opportunity finds the ready.", "A little less screen today, a little more sky.", "Being honest with yourself is the first condition of peace.", "Trying again and again is the price of mastery.", "Love grows through small attentions.", "Finish one task today without postponing it, and notice how light you feel.", "Helping someone else is a quiet way of helping yourself.", "When your mind is calm, even the hardest day becomes manageable.", "The road to a goal is made of hundreds of small \"todays\".", "Your body isn't a temple but a travel companion; take good care of it.", "You don't need to prove yourself to others, only to yesterday's you.", "A good day first needs a good intention.", "Even if you didn't do much today, if you didn't give up, you won.", "A glass of water and a deep breath: enough to start again.", "Loving yourself isn't selfishness; it's a healthy beginning.", "Small steps are the quiet heroes of long journeys.", "Play a song you love today and dance for one minute.", "Listening is the most valuable kind of attention.", "You don't need a perfect life to be happy; awareness is enough.", "The best thing you can do for tomorrow is to live today well.", "What makes a day lovely is often a small frame: a tea, a hello, a smile.", "You can begin again even after a lazy day.", "Every step you walk today is a gift left for your future.", "Eating well isn't a punishment; it's care for yourself.", "Life tastes better when you share it with those you love.", "Time will pass; what matters is what you do while it does.", "Do one thing today purely for the joy of it.", "Ten minutes you give yourself can change the rest of the day.", "If worry changes nothing, it only tires you; let it go.", "Courage is saying \"let me give it a try.\"", "A good life begins with a good day; make today a good one.", "Walking with good people shortens the road.", "Every morning gives you a second chance; use it.", "Don't go to sleep today without learning something.", "Waves come and go; stay calm like the shore.", "Enough water, enough sleep, enough love: a simple recipe.", "If you're still here, you have a reason to begin again.", "Happiness is a house whose door opens from the inside.", "Tell someone today, \"I'm glad you exist.\"", "Small routines bring great calm.", "Do what you can; the rest is tomorrow's job.", "Being strong isn't always smiling; sometimes it's knowing how to rest.", "As the sun sets, send today off with thanks.", "As you get better, those around you get better too.", "Stand up, stretch, take a deep breath; your body will be grateful.", "Be patient like a seed; sprouting takes time.", "The right time is usually now.", "One step closer to better every day, with the Hemcan family.", "Being good for one another is our most beautiful shared goal.", "Say a kind word to a fellow Hemcan today; that's how the chain grows.", "Walk alone and you go fast; walk together and you go far. In Hemcan we walk together.", "When small kindnesses multiply, they become a big family.", "Be good to yourself and to someone else today.", "Your own well-being opens a door to the well-being of others.", "Those who advance with patience grow stronger as they go.", "A slightly better you every day: that's Hemcan's promise."]};/*QUOTES_END*/

  var CONTENT = {
    tr: {
      wake: { title: 'Günaydın 🌅', body: "Bugün yine hayattasın — bunun için şükretmeyi unutma. Sevdiklerinle güzel vakit geçir, çünkü yarın sen ya da sevdiğin biri burada olmayabilir. O yüzden sonra değil, şimdi ve bugün. Hatırlatmamı istediğin bir şey var mı? Unutma, ben her gün buradayım." },
      wakeEvening: { title: 'Bugün yine hayattasın 🙏', body: "Bugün yine hayattasın — bunun için şükretmeyi unutma. Sevdiklerinle güzel vakit geçir, çünkü yarın sen ya da sevdiğin biri burada olmayabilir. O yüzden sonra değil, şimdi ve bugün." },
      waterButtons: { glass: '🥛 Bir bardak', ml500: '500 ml', l1: '1 lt' },
      water: { title: 'Su vakti 💧', body: 'Günde 2-3 litre su tüketmen önemli. Ne kadar içtiysen aşağıdan ekle, günlük toplamını uygulamada gör.' },
      exercise: function (p, sq, s, x) { return { title: 'Sabah sporu zamanı 💪', body: 'Hadi başlayalım: ' + p + ' şınav, ' + sq + ' squat, ' + s + ' mekik' + x + '. Kendini nasıl hissettiğini merak ediyorum. Unutma: günde ' + p + ' şınav, ayda ' + (p * 30) + ', yılda ' + (p * 360) + ' şınav demek!' }; },
      home: { title: 'Günü kapatıyoruz 🙏', body: 'Çok şükür, bugünü de bitirdik. Umarım her şey yolundadır. Hatırlatmamı istediğin bir şey var mı?' },
      noonCheck: { title: 'Aklında bir şey var mı? 💭', body: 'Henüz hiç hatırlatma eklemedin. Hatırlatmamı istediğin bir şey var mı? Uygulamadaki Hatırlatmalarım listesine ekleyebilirsin.' },
      steps: { title: 'Günlük 10 bin adım 🚶', body: 'Günde 10 bin adım atmak sağlığın için çok önemli — iş bitimine kadar tamamlayabilecek misin? Değilsen, akşam işten sonra ya da eve varınca biraz yürüyüş yapmayı unutma :)' },
      reading: function (pages) { return { title: 'Kitap vakti 📖', body: 'Bugün en az ' + pages + ' sayfa okudun mu? Günde ' + pages + ' sayfa kitap, ayda ' + (pages * 30) + ', senede ' + (pages * 360) + ' sayfa demek! Birkaç sayfa bile kendine güzel bir ara.' }; },
      teeth: { title: 'Diş sağlığı hatırlatması 🦷', body: 'Dişlerini fırçaladın mı?' },
      eveningExercise: function (p, sq, s, x) { return { title: 'Küçük bir akşam hareketi 💪', body: p + ' şınav, ' + sq + ' squat, ' + s + ' mekik çek' + x + ' — sağlıklı ve güzel bir vücut için. Günde ' + p + ' şınav, ayda ' + (p * 30) + ', yılda ' + (p * 360) + ' şınav demek. Gelecekteki sen, şu anki sana teşekkür edecek.' }; },
      bed: { title: 'İyi geceler 🌙', body: 'Günü kapatma vakti. Telefonu bırak, güzel bir uyku seni bekliyor. Yarın yeniden buradayım.' },
      reminder: { title: 'Hatırlatma ⏰' },
      alarm: function (n) { return { title: 'Günaydın' + (n ? ', ' + n : '') + ' ☀️', body: 'Yeni güne nazikçe uyanma vakti. Önce bir derin nefes al, sonra yavaşça kalk.' }; },
      quote: { title: 'Günün sözü ✨' },
      waterDone: { title: 'Tebrikler! 💧', body: 'Günlük sağlıklı su içme miktarına ulaştın 🎉' },
      stepsDone: { title: 'Tebrikler! 🚶', body: 'Günlük 10 bin adım hedefine ulaştın 🎉 Harika iş çıkardın!' },
    },
    en: {
      wake: { title: 'Good morning 🌅', body: "You're alive again today — don't forget to be grateful for that. Spend real time with the people you love, because tomorrow you or someone you love might not be here. So not later — now, today. Anything you'd like me to remind you of? I'm here every day." },
      wakeEvening: { title: "You're alive again today 🙏", body: "You're alive again today — don't forget to be grateful for that. Spend real time with the people you love, because tomorrow you or someone you love might not be here. So not later — now, today." },
      waterButtons: { glass: '🥛 A glass', ml500: '500 ml', l1: '1 L' },
      water: { title: 'Water time 💧', body: "Drinking 2-3 litres of water a day matters. Add what you've had below and see your daily total in the app." },
      exercise: function (p, sq, s, x) { return { title: 'Morning workout time 💪', body: "Let's go: " + p + ' push-ups, ' + sq + ' squats, ' + s + ' sit-ups' + x + ". Curious how you'll feel after. Remember: " + p + ' push-ups a day is ' + (p * 30) + ' a month and ' + (p * 360) + ' a year!' }; },
      home: { title: 'Wrapping up the day 🙏', body: "Thank goodness, we made it through today too. I hope everything's alright. Is there anything you'd like me to remind you of?" },
      noonCheck: { title: 'Anything on your mind? 💭', body: "You haven't added any reminders yet. Is there anything you'd like me to remind you of? You can add it to your Reminders list in the app." },
      steps: { title: '10,000 steps a day 🚶', body: "Walking 10,000 steps a day matters a lot for your health — can you finish by end of work? If not, don't forget a walk this evening after work or once you're home :)" },
      reading: function (pages) { return { title: 'Reading time 📖', body: 'Did you read at least ' + pages + ' pages today? ' + pages + ' pages a day is ' + (pages * 30) + ' a month and ' + (pages * 360) + ' a year! Even a few pages is a nice moment for yourself.' }; },
      teeth: { title: 'Dental health reminder 🦷', body: 'Did you brush your teeth?' },
      eveningExercise: function (p, sq, s, x) { return { title: 'A little evening movement 💪', body: p + ' push-ups, ' + sq + ' squats, ' + s + ' sit-ups' + x + ' — for a healthy, strong body. ' + p + ' push-ups a day is ' + (p * 30) + ' a month and ' + (p * 360) + ' a year. Future you will thank present you.' }; },
      bed: { title: 'Good night 🌙', body: "Time to close the day. Put the phone down — good sleep is waiting for you. I'll be here again tomorrow." },
      reminder: { title: 'Reminder ⏰' },
      alarm: function (n) { return { title: 'Good morning' + (n ? ', ' + n : '') + ' ☀️', body: 'Time to wake up gently. Take one deep breath first, then rise slowly.' }; },
      quote: { title: 'Quote of the day ✨' },
      waterDone: { title: 'Congratulations! 💧', body: "You've reached today's healthy water goal 🎉" },
      stepsDone: { title: 'Congratulations! 🚶', body: "You've reached your daily goal of 10,000 steps 🎉 Great job!" },
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

  // Günlük tekrarlayan bildirimler: { id, min, title, body, water, alarm }
  // settings.off: kullanıcının kapattığı bildirim anahtarları (ör. ['steps','exerciseEvening']).
  function routine(settings, lang, hasReminders) {
    var c = CONTENT[lang] || CONTENT.en;
    var s = settings || {};
    var off = Array.isArray(s.off) ? s.off : [];
    var p = s.pushups || 10, sq = s.squat || 10, si = s.situps || 20, x = extraSuffix(s);
    var wake = toMin(s.wakeTime || '07:30'), home = toMin(s.homeTime || '18:30'), bed = toMin(s.bedTime || '23:00');
    var nm = firstName();
    var out = [];
    function add(id, min, payload, water, key, alarm) {
      if (key && off.indexOf(key) !== -1) return;
      out.push({ id: id, min: wrap(min), title: payload.title, body: payload.body, water: !!water, alarm: !!alarm });
    }
    if (wake !== null) {
      if (s.alarmOn === true) add(1013, wake, c.alarm(nm), false, 'alarm', true);
      var ex = c.exercise(p, sq, si, x);
      add(1001, wake + 15, ex, false, 'exercise');
      var w = c.wake;
      add(1002, wake + 60, nm ? { title: w.title.replace(/^(Günaydın|Good morning)/, function (m) { return m + ', ' + nm; }), body: w.body } : w, false, 'wake');
      add(1003, wake + 120, c.water, true, 'water');
      add(1004, wake + 480, c.water, true, 'water');
    }
    if (!hasReminders) add(1005, 12 * 60, c.noonCheck, false, 'noon');
    add(1006, 13 * 60, c.steps, false, 'steps');
    if (home !== null) {
      add(1007, home, c.home, false, 'home');
      add(1008, home + 60, c.wakeEvening, false, 'gratitude');
      add(1009, home + 90, c.reading(s.pages || 5), false, 'reading');
    }
    if (bed !== null) {
      add(1010, bed - 60, c.teeth, false, 'teeth');
      add(1011, bed - 30, c.eveningExercise(p, sq, si, x), false, 'exerciseEvening');
      if (s.notifyBedtime !== false) add(1012, bed, c.bed, false, 'bed');
    }
    return out;
  }

  // Bugünün motivasyon sözü indeksi (yılın günü); her gün farklı.
  function quoteFor(lang, d) {
    var list = (QUOTES[lang] || QUOTES.en);
    // Takvim gününe göre (yıl dönümünde de kesintisiz): liste bitince başa sarar (211 söz ≈ 7 ay).
    var day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    return list[day % list.length];
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
  var CHANNEL_ALARM = 'hemcan-alarm';
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
    }).catch(function () {}).then(function () {
      // Uyanış "alarmı": nazik, tek seferlik bildirim sesi (sürekli çalan alarm değildir).
      return LN.createChannel({
        id: CHANNEL_ALARM,
        name: tr ? 'Uyanış alarmı' : 'Wake-up alarm',
        description: tr ? 'Uyanış saatinde nazik bir uyarı' : 'A gentle nudge at your wake-up time',
        importance: 4, visibility: 1, vibration: true, lights: false,
      }).catch(function () {});
    });
    return channelReady;
  }
  // Android'e özgü alanlar: kanal, küçük simge, kesin alarm istemeden (ayar ekranı açmadan) planla.
  function droid(n) {
    if (platform === 'android') {
      n.channelId = n.channelId || CHANNEL; n.smallIcon = 'ic_stat_hemcan'; n.isExactNotification = false;
      // Uzun metin Android'de tek satıra kesiliyordu ("...yolunda.."). largeBody ile bildirim açılınca metnin tamamı görünür.
      if (n.body && !n.largeBody) n.largeBody = n.body;
    }
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
      if (!reminders.length) {
        var bak = readJSON(KEY_REMINDERS + '-bak', []);
        if (Array.isArray(bak) && bak.length) { reminders = bak; try { localStorage.setItem(KEY_REMINDERS, JSON.stringify(bak)); } catch (e) {} }
      }

      // Zamanı geçmiş tek seferlik hatırlatmalar SİLİNMEZ: "gönderildi" (done) olarak işaretlenir ve
      // listede görünmeye devam eder (kullanıcı kendisi siler / temizler). Zamansız notlar da kalır.
      var now = Date.now();
      var changed = false;
      reminders.forEach(function (r) {
        var d = r && parseAt(r.at);
        if (d && !r.repeat && d.getTime() <= now && !r.done) { r.done = true; changed = true; }
      });
      if (changed) { try { localStorage.setItem(KEY_REMINDERS, JSON.stringify(reminders)); localStorage.setItem(KEY_REMINDERS + '-bak', JSON.stringify(reminders)); } catch (e) {} }
      var kept = reminders.filter(function (r) { return r && !r.done; });

      var list = [];
      routine(settings, lang, kept.length > 0).forEach(function (r) {
        var n = {
          id: r.id, title: r.title, body: r.body,
          schedule: { on: { hour: Math.floor(r.min / 60), minute: r.min % 60 }, repeats: true },
          extra: { url: r.water ? 'asistan.html#su' : 'asistan.html' },
        };
        if (r.water) n.actionTypeId = 'WATER';
        if (r.alarm) { n.channelId = CHANNEL_ALARM; n.schedule.allowWhileIdle = true; }
        list.push(droid(n));
      });
      var c = CONTENT[lang] || CONTENT.en;
      var off = Array.isArray(settings.off) ? settings.off : [];

      // Günün sözü: her gün saat 10:00, her gün farklı söz. iOS en çok 64 bekleyen bildirime izin verdiği için
      // sınırlı sayıda gün önceden kurulur; uygulama her açıldığında yeniden kurulur.
      if (off.indexOf('quote') === -1) {
        var days = platform === 'ios' ? 7 : 14;
        var base = new Date();
        for (var qd = 0; qd < days; qd++) {
          var when = new Date(base.getFullYear(), base.getMonth(), base.getDate() + qd, 10, 0, 0, 0);
          if (when.getTime() <= now + 30000) continue;
          list.push(droid({ id: 4000 + qd, title: c.quote.title, body: quoteFor(lang, when), schedule: { at: when }, extra: { url: 'asistan.html' } }));
        }
      }

      // Kullanıcı hatırlatmaları: tek sefer, her gün, haftada bir, ayda bir (işletim sistemi tekrarlar) ve
      // "N saatte bir" (önümüzdeki saatler tek tek kurulur; uygulama açıldıkça yenilenir, 23:00-07:00 arası susturulur).
      var budget = platform === 'ios' ? Math.max(0, 62 - list.length) : 500;
      var n2 = 0;
      kept.forEach(function (r, i) {
        var d = r && parseAt(r.at);
        if (!d || !r.text || n2 >= 30) return;
        n2++;
        var body = String(r.text).slice(0, 300);
        var base = { title: c.reminder.title, body: body, extra: { url: 'otomasyonlar.html' } };
        var rep = r.repeat;
        var on = { hour: d.getHours(), minute: d.getMinutes() };
        var soon = function (ms) { return d.getTime() <= now + ms; };
        var item = null;
        if (rep === 'daily' && soon(86400000)) {
          item = droid(Object.assign({ id: 2000 + i }, base, { schedule: { on: on, repeats: true } }));
        } else if (rep === 'weekly' && soon(7 * 86400000)) {
          on.weekday = d.getDay() + 1;
          item = droid(Object.assign({ id: 2000 + i }, base, { schedule: { on: on, repeats: true } }));
        } else if (rep === 'monthly' && soon(31 * 86400000)) {
          on.day = d.getDate();
          item = droid(Object.assign({ id: 2000 + i }, base, { schedule: { on: on, repeats: true } }));
        } else if (rep === 'hours') {
          var stepMs = Math.max(1, parseInt(r.every, 10) || 3) * 3600000;
          var perReminder = platform === 'ios' ? 6 : 24;
          var t0 = d.getTime(), k = 0;
          if (t0 < now + 30000) k = Math.ceil((now + 30000 - t0) / stepMs);
          var made = 0, guard = 0;
          while (made < perReminder && budget > 0 && guard++ < 200) {
            var at = new Date(t0 + k * stepMs); k++;
            var h = at.getHours();
            if (h < 7 || h >= 23) continue;
            var hn = droid(Object.assign({ id: 10000 + i * 100 + made }, base, { schedule: { at: at } }));
            if (platform === 'android') hn.schedule.allowWhileIdle = true;
            list.push(hn); made++; budget--;
          }
          return;
        }
        if (!item) item = droid(Object.assign({ id: 2000 + i }, base, { schedule: { at: d } }));
        if (platform === 'android') item.schedule.allowWhileIdle = true;
        list.push(item);
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
  N.notifyNow = function (kind, url) {
    if (!LN) return;
    permState().then(function (perm) {
      if (perm !== 'granted') return;
      var c = CONTENT[getLang()] || CONTENT.en;
      var p = c[kind];
      if (!p) return;
      return ensureChannel(getLang()).then(function () {
        return LN.schedule({ notifications: [droid({ id: 3000 + Math.floor(Math.random() * 900), title: p.title, body: p.body || '', schedule: { at: new Date(Date.now() + 1500) }, extra: { url: url || 'asistan.html#su' } })] });
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

  // ---- 4. Adım sayar (otomatik) -------------------------------------------
  // iPhone: Core Motion (günün başından bugüne tam adım sayısı).
  // Android: telefonun donanım adım sayacı; uygulama kapalıyken de sayar, uygulama açılınca günlere dağıtılır.
  var Pedo = plug('CapacitorPedometer');
  var Hsteps = plug('HemcanSteps');
  var KEY_STEPS = 'one-steps';
  var KEY_STEPSTATE = 'one-steps-state';
  function dkey(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  // Okumalar arasındaki adımları, aradaki günlere "uyanık saatler"e (06:00-24:00) göre dağıtır.
  function distributeSteps(days, t0, t1, delta) {
    if (!(delta > 0)) return;
    var d0 = new Date(t0), d1 = new Date(t1);
    var cur = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate());
    var slots = [], totalW = 0;
    while (cur.getTime() <= t1 && slots.length < 62) {
      var a = Math.max(t0, cur.getTime() + 6 * 3600000);
      var b = Math.min(t1, cur.getTime() + 24 * 3600000);
      var w = Math.max(0, b - a);
      slots.push({ key: dkey(cur), w: w }); totalW += w;
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1);
    }
    var last = slots[slots.length - 1];
    if (!totalW) { days[last.key] = (days[last.key] || 0) + Math.round(delta); return; }
    var given = 0;
    slots.forEach(function (sl, i) {
      var part = i === slots.length - 1 ? Math.round(delta) - given : Math.round(delta * sl.w / totalW);
      given += part;
      if (part > 0) days[sl.key] = (days[sl.key] || 0) + part;
    });
  }
  // Saf fonksiyon (test edilebilir): yeni okumayı duruma işler.
  function mergeSteps(state, days, total, boot, now) {
    var today = dkey(new Date(now));
    if (!state || typeof state.total !== 'number') {
      var startOfToday = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), new Date(now).getDate()).getTime();
      days[today] = boot >= startOfToday ? Math.round(total) : (days[today] || 0);
    } else {
      var rebooted = Math.abs(boot - state.boot) > 120000 || total < state.total;
      var delta = rebooted ? total : total - state.total;
      distributeSteps(days, state.ts, now, Math.max(0, delta));
    }
    var cut = dkey(new Date(now - 62 * 86400000));
    Object.keys(days).forEach(function (k) { if (k < cut) delete days[k]; });
    return { state: { boot: boot, total: total, ts: now }, days: days };
  }
  N._mergeSteps = mergeSteps; // testler için

  // 10.000 adım hedefi bildirimi: kullanıcı kapatmadıysa günde bir kez.
  var STEP_GOAL = 10000;
  function stepsGoalOn() {
    var st = readJSON(KEY_SETTINGS, {});
    var off = Array.isArray(st && st.off) ? st.off : [];
    return off.indexOf('stepsGoal') === -1;
  }
  function stepsGoalAfter(steps) {
    if (platform === 'ios' && steps >= STEP_GOAL && stepsGoalOn()) {
      var tk = dkey(new Date());
      var last = null; try { last = localStorage.getItem('one-steps-goal-day'); } catch (e) {}
      if (last !== tk) {
        try { localStorage.setItem('one-steps-goal-day', tk); } catch (e) {}
        N.notifyNow('stepsDone', 'asistan.html');
      }
    }
  }

  N.stepsSupported = function () { return !!(isNative && Pedo && (platform === 'ios' || Hsteps)); };
  N.stepsPermission = function () {
    if (!N.stepsSupported()) return Promise.resolve('unsupported');
    return Pedo.checkPermissions().then(function (r) { return (r && r.activityRecognition) || 'prompt'; }).catch(function () { return 'prompt'; });
  };
  N.stepsRequest = function () {
    if (!N.stepsSupported()) return Promise.resolve('unsupported');
    return Pedo.requestPermissions().then(function (r) { return (r && r.activityRecognition) || 'denied'; }).catch(function () { return 'denied'; });
  };
  // Bugünkü adım sayısı. Dönüş: { ok, steps, perm } (ok=false: izin yok / sensör yok).
  N.stepsToday = function () {
    if (!N.stepsSupported()) return Promise.resolve({ ok: false, steps: 0, perm: 'unsupported' });
    return N.stepsPermission().then(function (perm) {
      if (perm !== 'granted') return { ok: false, steps: 0, perm: perm };
      var now = Date.now();
      var days = readJSON(KEY_STEPS, {}); if (!days || typeof days !== 'object') days = {};
      var today = dkey(new Date(now));
      if (platform === 'ios') {
        var d = new Date(now); var start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        return Pedo.getMeasurement({ start: start, end: now }).then(function (m) {
          days[today] = Math.max(0, Math.round((m && m.numberOfSteps) || 0));
          try { localStorage.setItem(KEY_STEPS, JSON.stringify(days)); } catch (e) {}
          stepsGoalAfter(days[today]);
          return { ok: true, steps: days[today], perm: perm };
        }).catch(function () { return { ok: false, steps: days[today] || 0, perm: perm }; });
      }
      var gc = CONTENT[getLang()] || CONTENT.en;
      var cfg = Hsteps.setGoalNotify ? Hsteps.setGoalNotify({ enabled: stepsGoalOn(), title: gc.stepsDone.title, body: gc.stepsDone.body, goal: STEP_GOAL }).catch(function () {}) : Promise.resolve();
      return cfg.then(function () { return Hsteps.today(); }).then(function (r) {
        var nd = {};
        try { nd = JSON.parse((r && r.days) || '{}') || {}; } catch (e) { nd = {}; }
        var steps = Math.max(0, Math.round((r && r.steps) || nd[today] || 0));
        nd[today] = steps;
        try { localStorage.setItem(KEY_STEPS, JSON.stringify(nd)); } catch (e) {}
        return { ok: !!(r && r.ok !== false), steps: steps, perm: perm };
      }).catch(function () { return { ok: false, steps: days[today] || 0, perm: perm }; });
    });
  };
})();
