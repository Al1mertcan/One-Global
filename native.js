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
    st.textContent += '.is-ios #chat-soon { display: none !important; }';
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
  /*QUOTES_START*/var QUOTES = {"tr": ["Motivasyon gelip gider. Disiplin kalır.", "Bugünün zorluğu, yarının gururudur.", "Hazır olmayı bekleme. Hazırlık yolda gelir.", "Her gün yüzde bir daha iyi ol. Bir yıl sonra kendini tanıyamazsın.", "Konfor alanında hiçbir şey büyümez.", "Yorgunluk geçer, pişmanlık geçmez.", "Seni kimse kurtarmayacak. İyi haber: sen zaten yeterince güçlüsün.", "Düştüğün yer, yükselişinin başladığı yerdir.", "Hayalin seni biraz korkutmuyorsa, yeterince büyük değildir.", "Bahaneler seni bir yere götürmez. Adımlar götürür.", "En zor adım ilk adımdır. Gerisi alışkanlık.", "Bugünkü sen, yarınki sen için çalışıyor. Onu hayal kırıklığına uğratma.", "Sabır, pes etmemenin sessiz adıdır.", "Küçük adımlar sessizce büyük mesafeleri kapatır.", "Kendine verdiğin sözü tutmak, en büyük özgüven kaynağıdır.", "Hayat, hazır olunca değil, cesaret edince başlar.", "Bırakmak istediğinde, neden başladığını hatırla.", "Mükemmel plan yoktur. Uygulanan plan vardır.", "En parlak yıldızlar en karanlık gecede görünür.", "Ertelediğin her şey, bir gün \"keşke\"ye dönüşür.", "Kıyaslama. Tek rakibin dünkü sensin.", "Hiçbir fırtına sonsuza dek sürmez.", "Güçlü olmak hiç düşmemek değil; her seferinde kalkmaktır.", "Başarı, kimsenin görmediği sabahlarda inşa edilir.", "Zihnin pes ettiğinde bile bedenin devam edebilir. Önce zihnini ikna et.", "Kendine nazik ol. Bu yolda en uzun yol arkadaşın sensin.", "Bugün yapabileceğin en cesur şey, denemektir.", "Gün, ilk yaptığın işle şekillenir. Doğru olanla başla.", "Zor günler, güçlü insanları yetiştirir.", "Şükretmek, sahip olduklarını yeterli kılan sihirdir.", "Sevdiklerine bugün söyle. Yarın kelimeler yetişmeyebilir.", "Zaman sahip olduğun en pahalı şeydir, ama kimse fiyatını sormaz.", "Hayat kısa değil; biz onu erteleyerek kısaltıyoruz.", "Sağlık tek bir gün değil, her gün yapılan küçük seçimlerdir.", "Bir bardak su, bir derin nefes, on dakikalık yürüyüş: gün buradan kurtulur.", "Bedenin yaşayacağın tek ev. Ona iyi bak.", "Uyku tembellik değil, yarının gücüdür.", "Mutluluk gelecekte bir yer değil, şu anki dikkattir.", "İyilik yap; karşılığı sen beklemezken gelir.", "Bir gülümseme, birinin bütün gününü değiştirebilir.", "Sana ihtiyacı olan biri var. Bugün onu bul.", "Elindekiyle başla. Bekleyen için hiçbir şey yeterli değildir.", "Başarısızlık son değil, bir dersin başlığıdır.", "Sessizce çalış. Gürültüyü sonuçların çıkarsın.", "Bir kez vazgeçersen, vazgeçmek alışkanlığa dönüşür.", "Bugün zor yolu seç; kolay hayat seni sonra bulur.", "Tek bir iyi gün, bin kötü düşünceyi susturur.", "Önce kendine kanıtla. Dünya sonra inanır.", "Dağlar adım adım aşılır; hiçbir tırmanıcı zirveye tek hamlede çıkmadı.", "Bugün bir şeyi bırak: mazeretini.", "Hayal edenle yapan arasındaki fark, bir sabahtır.", "Başkalarının hayatını izlerken kendininkini kurmaya vakit kalmaz.", "Her uzman bir zamanlar acemiydi.", "Güçlendiren ağırlık değil, tekrardır.", "Bugün yaptığın şey yarın alışkanlık olur. Dikkatle seç.", "Nefes al. Her şeyi şu an çözmek zorunda değilsin.", "Dinlenmek vazgeçmek değildir.", "Çok isteyen yol bulur, az isteyen bahane.", "Bugünün hedefi: dünden bir adım ileride durmak.", "Zorluk seni yıkmak için değil, şekillendirmek için gelir.", "Cesaret korkmamak değil; korkarken yürümektir.", "Gerçek zenginlik, hiçbir şeyin eksik olmadığını fark ettiğin andır.", "Geçmiş bir ders, gelecek bir hayal; hayat ise bugün.", "Yapabileceğin en iyi yatırım, kendine yaptığındır.", "Gerçekten değişmek isteyen, ilk olarak sabahını değiştirir.", "Kalabalıkla yürüyen iz bırakmaz. Kendi yolunu aç.", "Boş bardaktan su veremezsin. Önce kendininkini doldur.", "Gülümse. Bir gün bu günleri özleyeceksin.", "Yürüdüğün her kilometre, geride bıraktığın bir bahanedir.", "Varan, hiç yorulmayan değil; yorulup yürümeye devam edendir.", "Bugün kimseye ihtiyacın olmasa bile birine yardım et. Dünya böyle iyileşir.", "Ekmek bile paylaşılınca bereketlenir.", "Anne babanı ara. Sesin, onların günündeki en iyi haber.", "Gün batmadan bir iyilik yap; gece daha huzurlu geçer.", "Bir gün \"keşke\"yi bırakıp \"iyi ki\"yi seçeceksin. O gün bugün olsun.", "Küçük bir alışkanlık, büyük bir hayatın tohumudur.", "Dün geçti, yarın gelmedi. Elindeki tek şey bugün; say onu.", "Çalışmayan yetenek, hiç uyanmayan bir tohumdur.", "Hareket, motivasyonun annesidir. Önce kalk, sonra hisset.", "Yorgun olduğun günler en güçlü olduğun günlerdir; çünkü hâlâ buradasın.", "Zor bir gün geçirdiysen bile, yarın temiz bir sayfa.", "Ayna bir yüz gösterir; karakter yaptıklarında görünür.", "Bugün atacağın bir adım, bir yıl sonra bir yol olur.", "Gürültüyü kapat. Kendi sesin yeterince güçlü.", "Hayatının en iyi yılı bu yıl olabilir; yeter ki bugün başla.", "Önemli olan ne kadar hızlı gittiğin değil, durmamandır.", "Gerçek güç, sessiz kalıp yine de devam edebilmektir.", "Yıkıldığı yerden kalkan, hiç yıkılmamış olandan güçlüdür.", "Hedefin yoksa her yol uzun gelir.", "Dostluk bir hediye değil, her gün sulanan bir çiçektir.", "Güzel bir söz, ekmekten daha çok doyurabilir.", "Yardım eden eller, en güzel dualardır.", "Hayat bir sınav değil, bir yolculuk. Manzarayı kaçırma.", "Beklentini azalt, çabanı artır.", "Şikâyet yorar; harekete geçmek dinlendirir.", "Sen devam ettikçe \"imkânsız\", \"yapıldı\"ya döner.", "Büyük işler, küçük günlerin tekrarıyla yapılır.", "Bu akşam kendine şunu söyle: \"Bugün elimden geleni yaptım.\" Huzur oradan başlar.", "Yarın seni bekleyen en güzel şey, bugün attığın adımdır.", "Yalnız değilsin; Hemcan ailesi olarak birlikte güçlüyüz."], "en": ["Motivation comes and goes. Discipline stays.", "Today's struggle is tomorrow's pride.", "Don't wait until you're ready. Readiness shows up on the road.", "Get one percent better every day. In a year, you won't recognize yourself.", "Nothing grows inside your comfort zone.", "Tiredness passes. Regret doesn't.", "Nobody is coming to save you. The good news: you're already strong enough.", "Where you fall is where your rise begins.", "If your dream doesn't scare you a little, it isn't big enough.", "Excuses take you nowhere. Steps do.", "The first step is the hardest. The rest is habit.", "Today's you is working for tomorrow's you. Don't let them down.", "Patience is the quiet name for not giving up.", "Small steps quietly close big distances.", "Keeping promises to yourself is the deepest source of confidence.", "Life begins not when you're ready, but when you dare.", "When you want to quit, remember why you started.", "There is no perfect plan. There is only the plan you act on.", "The brightest stars appear in the darkest nights.", "Everything you postpone eventually becomes a \"what if\".", "Stop comparing. Yesterday's you is your only rival.", "No storm lasts forever.", "Being strong isn't never falling; it's rising every single time.", "Success is built in the mornings nobody sees.", "Your body can go on when your mind quits. Convince your mind first.", "Be kind to yourself. You're your longest companion on this road.", "The bravest thing you can do today is to try.", "The day takes shape from the first thing you do. Start with the right one.", "Hard days raise strong people.", "Gratitude is the magic that makes what you have enough.", "Tell your loved ones today. Tomorrow, the words may not arrive in time.", "Time is the most expensive thing you own, yet nobody asks its price.", "Life isn't short; we shorten it by postponing.", "Health isn't one day; it's small choices made every day.", "A glass of water, a deep breath, a ten-minute walk: the day can be saved from here.", "Your body is the only home you'll ever live in. Take care of it.", "Sleep isn't laziness; it's tomorrow's strength.", "Happiness isn't a place in the future; it's attention in the present.", "Do good; the return arrives when you least expect it.", "One smile can change someone's whole day.", "Someone needs you. Find them today.", "Start with what you have. For someone who waits, nothing is ever enough.", "Failure isn't the end; it's the title of a lesson.", "Work in silence. Let your results make the noise.", "Quit once, and quitting becomes a habit.", "Choose the hard path today, and an easy life finds you later.", "One good day silences a thousand bad thoughts.", "Prove it to yourself first. The world will believe later.", "Every mountain is climbed one step at a time; nobody reached a summit in a single leap.", "Let go of one thing today: your excuse.", "The difference between dreamers and doers is one morning.", "Watching other people's lives leaves no time to build your own.", "Every expert was once a beginner.", "It isn't the weight that makes you strong; it's the repetition.", "What you do today becomes tomorrow's habit. Choose carefully.", "Breathe. You don't have to solve everything right now.", "Resting isn't quitting.", "Those who want it find a way; the rest find excuses.", "Today's goal: stand one step ahead of yesterday.", "Hardship doesn't come to break you; it comes to shape you.", "Courage isn't the absence of fear; it's walking while afraid.", "Real wealth is the moment you notice nothing is missing.", "The past is a lesson, the future a dream; life is today.", "The best investment you'll ever make is in yourself.", "When someone truly wants to change, the first thing they change is their morning.", "Those who walk with the crowd leave no footprints. Make your own path.", "You can't pour from an empty cup. Fill yours first.", "Smile. One day you'll miss these days.", "Every kilometer you walk is an excuse you've left behind.", "Those who arrive aren't the ones who never tire, but the ones who keep walking tired.", "Even if you need no one today, help someone. That's how the world heals.", "Even bread multiplies when it is shared.", "Call your parents. Your voice is the best news of their day.", "Do one good deed before sunset; the night passes more peacefully.", "One day you'll trade \"if only\" for \"so glad I did.\" Let it be today.", "A small habit is the seed of a big life.", "Yesterday is gone, tomorrow hasn't come. Today is what you hold; make it count.", "Talent without work is a seed that never wakes.", "Action is motivation's mother. Get up first, feel later.", "Your tired days are your strongest days; you're still here.", "Even after a hard day, tomorrow is a clean page.", "A mirror shows a face; character shows in what you do.", "The step you take today becomes a road in a year.", "Turn off the noise. Your own voice is strong enough.", "This could be the best year of your life, if you start today.", "It's not how fast you go; it's that you don't stop.", "Real strength is staying quiet and still keeping going.", "Someone who rises from the ruins is stronger than someone who never fell.", "Without a goal, every road feels long.", "Friendship isn't a gift; it's a flower you water every day.", "A kind word can feed more than bread.", "Helping hands are the most beautiful prayers.", "Life isn't an exam; it's a journey. Don't miss the view.", "Lower your expectations, raise your effort.", "Complaining tires you out; taking action rests you.", "As long as you keep going, \"impossible\" turns into \"done.\"", "Great things are made from small days, repeated.", "Tonight, tell yourself: \"I did my best today.\" Peace begins there.", "The best thing waiting for you tomorrow is the step you take today.", "You're not alone; as the Hemcan family, we're stronger together."]};/*QUOTES_END*/

  var CONTENT = {
    tr: {
      wake: { title: 'Şükür vakti 🌅', body: "Bugün yine hayattasın — bunun için şükretmeyi unutma. Sevdiklerinle güzel vakit geçir, çünkü yarın sen ya da sevdiğin biri burada olmayabilir. O yüzden sonra değil, şimdi ve bugün. Hatırlatmamı istediğin bir şey var mı? Unutma, ben her gün buradayım." },
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
      alarm: function (n) { return { title: 'Günaydın' + (n ? ', ' + n : '') + ' ☀️', body: 'Yeni bir gün, yeni bir şans. Bugün kendine iyi bak; ben buradayım.' }; },
      quote: { title: 'Günün sözü ✨' },
      waterDone: { title: 'Tebrikler! 💧', body: 'Günlük sağlıklı su içme miktarına ulaştın 🎉' },
      stepsDone: { title: 'Tebrikler! 🚶', body: 'Günlük 10 bin adım hedefine ulaştın 🎉 Harika iş çıkardın!' },
    },
    en: {
      wake: { title: 'Gratitude time 🌅', body: "You're alive again today — don't forget to be grateful for that. Spend real time with the people you love, because tomorrow you or someone you love might not be here. So not later — now, today. Anything you'd like me to remind you of? I'm here every day." },
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
      alarm: function (n) { return { title: 'Good morning' + (n ? ', ' + n : '') + ' ☀️', body: "A new day, a new chance. Take good care of yourself today — I'm here." }; },
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
      if (s.alarmOn !== false) add(1013, wake, c.alarm(nm), false, 'alarm', true);
      var ex = c.exercise(p, sq, si, x);
      add(1001, wake + 15, ex, false, 'exercise');
      var w = c.wake;
      add(1002, wake + 60, w, false, 'wake');
      add(1003, wake + 120, c.water, true, 'water');
      add(1004, wake + 480, c.water, true, 'water');
    }
    if (!hasReminders) add(1005, 12 * 60, c.noonCheck, false, 'noon');
    add(1006, 13 * 60, c.steps, false, 'steps');
    if (home !== null) {
      add(1007, home, c.home, false, 'home');
      add(1008, home + 60, c.wakeEvening, false, 'gratitude');
      add(1009, home + 120, c.reading(s.pages || 5), false, 'reading');
    }
    if (bed !== null) {
      add(1011, bed - 60, c.eveningExercise(p, sq, si, x), false, 'exerciseEvening');
      add(1010, bed - 30, c.teeth, false, 'teeth');
      if (s.notifyBedtime !== false) add(1012, bed, c.bed, false, 'bed');
    }
    return out;
  }

  // Bugünün motivasyon sözü indeksi (yılın günü); her gün farklı.
  function quoteFor(lang, d) {
    var list = (QUOTES[lang] || QUOTES.en);
    // Takvim gününe göre (yıl dönümünde de kesintisiz): liste bitince başa sarar (100 söz ≈ 3,5 ay).
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
      // Güne karşılama: uyanış saatinde "Günaydın, <Ad>" bildirimi (alarm değildir).
      return LN.createChannel({
        id: CHANNEL_ALARM,
        name: tr ? 'Güne karşılama' : 'Morning greeting',
        description: tr ? 'Uyanış saatinde günaydın mesajı' : 'A good-morning message at your wake-up time',
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
    rescheduling = pushSync().catch(function () {}).then(function () { return runSchedule(); }).catch(function () {}).then(function () {
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
      // Sunucu modu (Android + Firebase hazır): rutin, söz ve hatırlatmaları sunucu gönderir; telefonda
      // planlı olanlar silinir ki çift bildirim gelmesin. Hazır değilse aşağıdaki yerel plan çalışır.
      if (serverMode()) {
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


  // ---- 3b. Android: sunucudan bildirim (Firebase Cloud Messaging) ---------------
  // Bazı telefon markaları (Xiaomi, Huawei, Oppo, Vivo, Samsung güç tasarrufu...) telefonda planlanmış
  // bildirimleri siliyor. Bu yüzden Android'de rutin / söz / hatırlatmalar sunucudan, Google'ın bildirim
  // servisi üzerinden gönderilir; bu servis telefon uyurken bile bildirimi iletir.
  // Sunucu ya da Firebase hazır değilse (ayar yok, izin yok, internet yok) yerel bildirimler çalışmaya devam eder.
  var PN = platform === 'android' ? plug('PushNotifications') : null;
  var KEY_FCM_TOKEN = 'one-fcm-token';
  var KEY_FCM_OK = 'one-fcm-ok';       // '1': sunucu bu telefon için kayıtlı ve Firebase hazır
  var KEY_SUB_ID = 'one-sub-id';       // web ile aynı anahtar: sunucudaki kayıt kimliği
  var KEY_FCM_SIG = 'one-fcm-sig', KEY_FCM_AT = 'one-fcm-at'; // son gönderilen içerik özeti / zamanı
  var KEY_FCM_REG = 'one-fcm-reg';     // '1': sunucuda bu telefon için bir kayıt var (kapatınca silinmeli)

  function serverMode() {
    try { return platform === 'android' && !!PN && localStorage.getItem(KEY_FCM_OK) === '1' && localStorage.getItem(KEY_ENABLED) === '1'; } catch (e) { return false; }
  }
  function subId() {
    var id = null;
    try { id = localStorage.getItem(KEY_SUB_ID); } catch (e) {}
    if (!id || id.length < 8) {
      id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (ch) { var r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 3 | 8)).toString(16); });
      try { localStorage.setItem(KEY_SUB_ID, id); } catch (e) {}
    }
    return id;
  }
  function setFcmOk(v) { try { localStorage.setItem(KEY_FCM_OK, v ? '1' : '0'); } catch (e) {} }

  var pushRegistering = null;
  // Telefonun Firebase adresini (token) alır. Yoksa ya da izin verilmediyse null döner.
  function pushReady() {
    var H = plug('HemcanSteps');
    if (!PN || !H || typeof H.pushReady !== 'function') return Promise.resolve(false);
    return Promise.resolve(H.pushReady()).then(function (r) { return !!(r && r.ready); }).catch(function () { return false; });
  }
  function getPushToken() {
    if (!PN) return Promise.resolve(null);
    if (pushRegistering) return pushRegistering;
    pushRegistering = pushReady().then(function (ready) {
      if (!ready) return null; // bu yapıda Firebase yok: yerel bildirimlerle devam
      return registerForToken();
    }).then(function (v) { pushRegistering = null; return v; });
    return pushRegistering;
  }
  function registerForToken() {
    return new Promise(function (resolve) {
      var done = false, handles = [];
      var finish = function (v) {
        if (done) return; done = true;
        handles.forEach(function (h) { try { h && h.remove && h.remove(); } catch (e) {} });
        resolve(v);
      };
      var timer = setTimeout(function () { finish(null); }, 15000);
      Promise.resolve(PN.addListener('registration', function (t) {
        clearTimeout(timer);
        var v = t && t.value ? String(t.value) : null;
        if (v) { try { localStorage.setItem(KEY_FCM_TOKEN, v); } catch (e) {} }
        finish(v);
      })).then(function (h) { handles.push(h); }).catch(function () {});
      Promise.resolve(PN.addListener('registrationError', function () { clearTimeout(timer); finish(null); }))
        .then(function (h) { handles.push(h); }).catch(function () {});
      // Dinleyiciler eklendikten sonra kaydol (ilk çağrıda eklenti Firebase'i başlatır).
      setTimeout(function () {
        ensureChannel(getLang()).then(function () { return PN.register(); }).catch(function () { clearTimeout(timer); finish(null); });
      }, 50);
    });
  }

  var pushSyncing = null, tokenFresh = false;
  // Sunucudaki kaydı güncel tutar: bildirim ayarları, dil, saat dilimi, hatırlatmalar.
  function pushSync() {
    if (!PN || platform !== 'android') return Promise.resolve();
    if (pushSyncing) return pushSyncing;
    pushSyncing = Promise.resolve().then(function () {
      var enabled = false;
      try { enabled = localStorage.getItem(KEY_ENABLED) === '1'; } catch (e) {}
      if (!enabled) return pushOff();
      return permState().then(function (perm) {
        if (perm !== 'granted') { return pushOff(); }
        var token = null;
        try { token = localStorage.getItem(KEY_FCM_TOKEN); } catch (e) {}
        // Adres (token) zamanla değişebilir: uygulama her açılışında bir kez tazelenir; olmazsa kayıtlı olan kullanılır.
        var fresh = tokenFresh ? Promise.resolve(token) : getPushToken().then(function (v) { if (v) tokenFresh = true; return v || token; });
        return (token && tokenFresh ? Promise.resolve(token) : fresh).then(function (t) {
          if (!t) { setFcmOk(false); return; }
          var reminders = readJSON(KEY_REMINDERS, []);
          if (!Array.isArray(reminders)) reminders = [];
          var body = {
            id: subId(),
            subscription: { endpoint: 'fcm:' + t, fcmToken: t },
            timezone: (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } })(),
            lang: getLang(),
            settings: readJSON(KEY_SETTINGS, {}),
            reminders: reminders,
          };
          // Her sayfa açılışında sunucuya gitmemek için: içerik değişmediyse ve son gönderim 12 saatten yeniyse atla.
          var sig = JSON.stringify([t, body.timezone, body.lang, body.settings, body.reminders]);
          try {
            if (localStorage.getItem(KEY_FCM_OK) === '1' && localStorage.getItem(KEY_FCM_SIG) === sig &&
                Date.now() - (parseInt(localStorage.getItem(KEY_FCM_AT), 10) || 0) < 12 * 3600 * 1000) return;
          } catch (e) {}
          return fetch('/api/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (j) {
              setFcmOk(!!(j && j.ok && j.fcm === true));
              if (j && j.ok) {
                try {
                  localStorage.setItem(KEY_FCM_REG, '1');
                  localStorage.setItem(KEY_FCM_SIG, sig);
                  localStorage.setItem(KEY_FCM_AT, String(Date.now()));
                } catch (e) {}
              }
            })
            .catch(function () { /* internet yok: önceki durum korunur */ });
        });
      });
    }).catch(function () {}).then(function () { pushSyncing = null; });
    return pushSyncing;
  }
  // Bildirimler kapatıldı: sunucudaki kaydı sil, sunucu modundan çık.
  function pushOff() {
    var reg = false;
    try { reg = localStorage.getItem(KEY_FCM_REG) === '1'; } catch (e) {}
    setFcmOk(false);
    if (!reg) return Promise.resolve();
    return fetch('/api/unsubscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: subId() }) })
      .then(function (res) { if (res && res.ok) { try { localStorage.setItem(KEY_FCM_REG, '0'); localStorage.removeItem(KEY_FCM_SIG); } catch (e) {} } })
      .catch(function () { /* internet yok: kayıt işareti kalır, sonraki denemede silinir */ });
  }

  if (PN) {
    // Google adresi (token) sonradan değişirse kaydet; bir sonraki senkronda sunucuya gider.
    PN.addListener('registration', function (t) {
      try { if (t && t.value) localStorage.setItem(KEY_FCM_TOKEN, String(t.value)); } catch (e) {}
    });
    // Uygulama açıkken gelen sunucu bildirimi Android'de kendiliğinden görünmez: yerel bildirim olarak göster.
    PN.addListener('pushNotificationReceived', function (n) {
      try {
        if (!LN || !n) return;
        var url = (n.data && n.data.url) || 'asistan.html';
        ensureChannel(getLang()).then(function () {
          return LN.schedule({ notifications: [droid({ id: 3900 + Math.floor(Math.random() * 90), title: n.title || 'Hemcan', body: n.body || '', schedule: { at: new Date(Date.now() + 500) }, extra: { url: url } })] });
        }).catch(function () {});
      } catch (e) {}
    });
    // Arka planda gelen bildirime basılınca ilgili sayfayı aç.
    PN.addListener('pushNotificationActionPerformed', function (ev) {
      try {
        var url = ev && ev.notification && ev.notification.data && ev.notification.data.url;
        if (typeof url === 'string' && /^[a-z-]+\.html(#[a-z]+)?$/i.test(url)) location.href = url;
      } catch (e) {}
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
  N.serverMode = serverMode;
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

  // Android: bildirimler gelmiyorsa ilgili sistem ayarını aç ("notifications" | "battery" | "app").
  N.openAndroidSettings = function (kind) {
    if (!(isNative && platform === 'android' && Hsteps && Hsteps.openSettings)) return Promise.resolve(false);
    return Hsteps.openSettings({ kind: kind }).then(function () { return true; }).catch(function () { return false; });
  };
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
