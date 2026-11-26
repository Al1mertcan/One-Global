/* Hemcan — iyi oluş sayfaları için ortak yardımcılar (günlük, nefes, alışkanlık, mola, yürüyüş).
 * Tüm veriler yalnızca bu telefonda (localStorage, "one-" ile başlayan anahtarlar) tutulur. */
(function (g) {
  'use strict';
  var WB = {};
  WB.$ = function (id) { return document.getElementById(id); };
  WB.t = function (k, v) { return (g.ONE_I18N && g.ONE_I18N.t) ? g.ONE_I18N.t(k, v) : k; };
  WB.lang = function () { return (g.ONE_I18N && g.ONE_I18N.getLang) ? g.ONE_I18N.getLang() : 'tr'; };
  WB.pad = function (n) { return (n < 10 ? '0' : '') + n; };
  WB.ymd = function (d) { return d.getFullYear() + '-' + WB.pad(d.getMonth() + 1) + '-' + WB.pad(d.getDate()); };
  WB.today = function () { return WB.ymd(new Date()); };
  // 'YYYY-MM-DD' -> yerel öğlen 12:00 (yaz/kış saati kaymasından etkilenmesin)
  WB.parse = function (key) { var p = String(key).split('-'); return new Date(+p[0], (+p[1]) - 1, +p[2], 12, 0, 0); };
  WB.addDays = function (key, n) { var d = WB.parse(key); d.setDate(d.getDate() + n); return WB.ymd(d); };
  WB.dayNum = function (key) { return Math.floor(WB.parse(key).getTime() / 86400000); };
  WB.load = function (key, def) {
    try { var v = JSON.parse(localStorage.getItem(key) || 'null'); if (v && typeof v === 'object') return v; } catch (e) {}
    return def;
  };
  WB.save = function (key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } };
  WB.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  WB.el = function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  WB.fmtDur = function (sec) {
    sec = Math.max(0, Math.round(sec)); var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    return (h ? h + ':' + WB.pad(m) : m) + ':' + WB.pad(s);
  };
  WB.dateLabel = function (key, opts) {
    try { return WB.parse(key).toLocaleDateString(WB.lang(), opts || { day: 'numeric', month: 'long', weekday: 'short' }); } catch (e) { return key; }
  };
  WB.vibrate = function (ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
  // Ekranı açık tut (zamanlayıcı / kayıt sırasında). Desteklenmiyorsa sessizce geçer.
  var wake = null;
  WB.wakeOn = function () {
    try {
      if (navigator.wakeLock && navigator.wakeLock.request) {
        navigator.wakeLock.request('screen').then(function (l) { wake = l; l.addEventListener && l.addEventListener('release', function () { if (wake === l) wake = null; }); }).catch(function () {});
      }
    } catch (e) {}
  };
  WB.wakeOff = function () { try { if (wake && wake.release) wake.release(); } catch (e) {} wake = null; };
  // Basit bildirim kutusu (toast)
  WB.toast = function (msg) {
    var t = document.getElementById('wb-toast');
    if (!t) {
      t = WB.el('div', 'fixed left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-card-foreground shadow-2xl');
      t.id = 'wb-toast'; t.style.bottom = '96px'; t.setAttribute('role', 'status'); document.body.appendChild(t);
    }
    t.textContent = msg; t.style.display = 'block';
    clearTimeout(WB._tt); WB._tt = setTimeout(function () { t.style.display = 'none'; }, 2200);
  };
  // iconify simgesi yüklenemezse (çevrimdışı) yedek daire göster
  WB.iconFallback = function () {
    var els = document.querySelectorAll('iconify-icon');
    for (var i = 0; i < els.length; i++) (function (el) {
      var tries = 0;
      (function check() {
        var s = el.status;
        if (s === 'failed') el.setAttribute('icon', 'lucide:circle');
        else if (s !== 'rendered' && tries++ < 40) setTimeout(check, 250);
      })();
    })(els[i]);
  };
  // Seri (art arda gün) hesabı: dayHas(key) -> boolean. Bugün henüz yoksa dünden başlar (seri bozulmaz).
  WB.streak = function (dayHas, fromKey) {
    var k = fromKey || WB.today(), n = 0;
    if (!dayHas(k)) k = WB.addDays(k, -1);
    while (n < 3660 && dayHas(k)) { n++; k = WB.addDays(k, -1); }
    return n;
  };
  if ('serviceWorker' in navigator) {
    g.addEventListener('load', function () { navigator.serviceWorker.register('./service-worker.js').catch(function () {}); });
  }
  // data-i18n-aria="anahtar" -> aria-label
  WB.applyAria = function () {
    var els = document.querySelectorAll('[data-i18n-aria]');
    for (var i = 0; i < els.length; i++) { var v = WB.t(els[i].getAttribute('data-i18n-aria')); if (v) els[i].setAttribute('aria-label', v); }
  };
  g.addEventListener('one-lang-changed', WB.applyAria);
  g.addEventListener('load', WB.applyAria);
  g.addEventListener('load', WB.iconFallback);
  g.WB = WB;
})(window);
