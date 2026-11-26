/* Hemcan — Yürüyüş / koşu / bisiklet GPS kaydı. Rota yalnızca bu telefonda ("one-walks") saklanır. */
(function () {
  'use strict';
  var WB = window.WB, $ = WB.$, t = WB.t;
  var KEY = 'one-walks', CFG = 'one-walks-cfg', LIVE = 'one-walk-live';
  var TYPES = { walk: { icon: '🚶', max: 4.5, kcal: 0.55 }, run: { icon: '🏃', max: 9, kcal: 1.0 }, bike: { icon: '🚴', max: 18, kcal: 0.3 } };
  var MAX_ACC = 35, MAX_PTS_SAVED = 150;
  var cfg = WB.load(CFG, null) || {}; cfg.kg = cfg.kg >= 30 && cfg.kg <= 250 ? cfg.kg : 70; cfg.type = TYPES[cfg.type] ? cfg.type : 'walk';
  var store = WB.load(KEY, null) || { list: [] }; if (!Array.isArray(store.list)) store.list = [];
  var rec = null, watchId = null, native = false, geo = null, tick = null, lastLiveSave = 0, pendingSummary = null, detailId = null;

  function saveStore() { store.list.sort(function (a, b) { return b.start - a.start; }); store.list = store.list.slice(0, 300); WB.save(KEY, store); }
  function saveCfg() { WB.save(CFG, cfg); }
  function mk(tag, cls, text) { return WB.el(tag, cls, text); }

  // ---------- hesaplar ----------
  function hav(a, b) {
    var R = 6371000, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
  }
  function kcalOf(type, km, kg) { return Math.round(TYPES[type].kcal * kg * km); }
  function fmtTime(sec) { sec = Math.max(0, Math.round(sec)); var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return h ? h + ':' + WB.pad(m) + ':' + WB.pad(s) : m + ':' + WB.pad(s); }
  function fmtKm(m) { var v = m / 1000; try { return v.toLocaleString(WB.lang(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }); } catch (e) { return v.toFixed(2); } }
  function paceFix(type, sec, m) { // bisiklette km/sa, diğerlerinde dk/km
    if (m < 20 || sec < 5) return '—';
    if (type === 'bike') { var v = (m / 1000) / (sec / 3600); try { return v.toLocaleString(WB.lang(), { maximumFractionDigits: 1, minimumFractionDigits: 1 }); } catch (e) { return v.toFixed(1); } }
    var p = Math.round(sec / (m / 1000)); if (p > 3600) return '—';
    return Math.floor(p / 60) + ':' + WB.pad(p % 60);
  }
  function downsample(pts, n) {
    if (pts.length <= n) return pts.slice();
    var out = [], step = (pts.length - 1) / (n - 1);
    for (var i = 0; i < n; i++) out.push(pts[Math.round(i * step)]);
    return out;
  }

  // ---------- rota çizimi (SVG, harita karosu yok) ----------
  function drawTrack(svg, pts) {
    svg.innerHTML = '';
    var W = 300, H = 180, pad = 18;
    if (!pts || pts.length < 2) {
      svg.innerHTML = '<text x="150" y="94" text-anchor="middle" fill="currentColor" opacity=".5" font-size="11" class="text-muted-foreground">' + WB.esc(t('walkNoTrack')) + '</text>'; return;
    }
    var minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    pts.forEach(function (p) { if (p[0] < minLat) minLat = p[0]; if (p[0] > maxLat) maxLat = p[0]; if (p[1] < minLon) minLon = p[1]; if (p[1] > maxLon) maxLon = p[1]; });
    var midLat = (minLat + maxLat) / 2, kx = Math.cos(midLat * Math.PI / 180);
    var w = Math.max((maxLon - minLon) * kx, 1e-6), h = Math.max(maxLat - minLat, 1e-6);
    var sc = Math.min((W - pad * 2) / w, (H - pad * 2) / h), ox = (W - w * sc) / 2, oy = (H - h * sc) / 2;
    function xy(p) { return [(ox + (p[1] - minLon) * kx * sc), (oy + (maxLat - p[0]) * sc)]; }
    var d = pts.map(function (p, i) { var q = xy(p); return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('');
    var a = xy(pts[0]), z = xy(pts[pts.length - 1]);
    svg.innerHTML = '<path d="' + d + '" fill="none" stroke="rgb(57 215 255)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>' +
      '<circle cx="' + a[0].toFixed(1) + '" cy="' + a[1].toFixed(1) + '" r="6" fill="rgb(61 219 165)" stroke="#fff" stroke-width="2"><title>' + WB.esc(t('walkStartPoint')) + '</title></circle>' +
      '<circle cx="' + z[0].toFixed(1) + '" cy="' + z[1].toFixed(1) + '" r="6" fill="rgb(255 101 122)" stroke="#fff" stroke-width="2"><title>' + WB.esc(t('walkEndPoint')) + '</title></circle>';
  }

  // ---------- arayüz ----------
  function status(key) { var el = $('gps-status'); el.textContent = t(key); el.removeAttribute('data-i18n'); el.dataset.k = key; }
  function renderChips() {
    var box = $('type-chips'); box.innerHTML = '';
    Object.keys(TYPES).forEach(function (k) {
      var on = cfg.type === k, b = mk('button', 'flex h-12 flex-col items-center justify-center rounded-theme border text-xs font-bold ' + (on ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-input text-card-foreground') + (rec ? ' opacity-50' : ''), TYPES[k].icon + ' ' + t('walkType' + k.charAt(0).toUpperCase() + k.slice(1)));
      b.type = 'button'; b.setAttribute('data-type', k); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.disabled = !!rec;
      b.addEventListener('click', function () { cfg.type = k; saveCfg(); renderChips(); renderStats(); }); box.appendChild(b);
    });
  }
  function renderStats() {
    var type = rec ? rec.type : cfg.type, m = rec ? rec.dist : 0, sec = rec ? rec.active : 0;
    $('stat-dist').textContent = fmtKm(m); $('stat-time').textContent = fmtTime(sec);
    $('stat-pace').textContent = paceFix(type, sec, m); $('stat-pace-label').textContent = t(type === 'bike' ? 'walkSpeed' : 'walkPace');
    $('stat-kcal').textContent = String(kcalOf(type, m / 1000, cfg.kg));
    drawTrack($('track-svg'), rec ? rec.pts : null);
  }
  function renderControls() {
    $('btn-start').classList.toggle('hidden', !!rec); $('btn-pause').classList.toggle('hidden', !rec); $('btn-stop').classList.toggle('hidden', !rec);
    $('btn-pause').textContent = t(rec && rec.paused ? 'walkResume' : 'walkPause');
  }
  function weekAgg() {
    var now = new Date(), dow = (now.getDay() + 6) % 7, start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow).getTime(), n = 0, m = 0;
    store.list.forEach(function (w) { if (w.start >= start) { n++; m += w.dist; } }); return { n: n, m: m };
  }
  function renderHist() {
    var ul = $('hist-list'); ul.innerHTML = ''; $('hist-empty').classList.toggle('hidden', store.list.length > 0);
    var wk = weekAgg(); $('week-line').textContent = wk.n ? t('walkWeekTitle') + ': ' + t('walkWeekLine', { n: wk.n, km: fmtKm(wk.m) }) : '';
    store.list.slice(0, 30).forEach(function (w) {
      var li = mk('li', ''), b = mk('button', 'flex w-full items-center gap-3 rounded-theme border border-border bg-input p-3 text-left'); b.type = 'button'; b.setAttribute('data-walk', w.id);
      b.appendChild(mk('span', 'text-2xl', TYPES[w.type] ? TYPES[w.type].icon : '🚶'));
      var mid = mk('div', 'min-w-0 flex-1'); mid.appendChild(mk('p', 'text-sm font-semibold', fmtKm(w.dist) + ' km · ' + fmtTime(w.dur)));
      mid.appendChild(mk('p', 'text-[11px] text-muted-foreground', WB.dateLabel(WB.ymd(new Date(w.start))) + ' · ' + w.kcal + ' kcal')); b.appendChild(mid);
      b.addEventListener('click', function () { openDetail(w.id); }); li.appendChild(b); ul.appendChild(li);
    });
  }
  function openDetail(id) {
    var w = store.list.filter(function (x) { return x.id === id; })[0]; if (!w) return; detailId = id;
    $('detail').classList.remove('hidden'); $('detail-del').textContent = t('walkDelete'); $('detail-del').dataset.arm = '';
    $('detail-title').textContent = (TYPES[w.type] ? TYPES[w.type].icon + ' ' : '') + WB.dateLabel(WB.ymd(new Date(w.start)));
    $('detail-stats').textContent = fmtKm(w.dist) + ' km · ' + fmtTime(w.dur) + ' · ' + (w.type === 'bike' ? paceFix('bike', w.dur, w.dist) + ' km/h' : paceFix(w.type, w.dur, w.dist) + ' /km') + ' · ' + w.kcal + ' kcal';
    drawTrack($('detail-svg'), w.pts); $('detail').scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  $('detail-close').addEventListener('click', function () { $('detail').classList.add('hidden'); detailId = null; });
  $('detail-del').addEventListener('click', function () {
    if ($('detail-del').dataset.arm !== '1') { $('detail-del').dataset.arm = '1'; $('detail-del').textContent = t('walkDeleteConfirm'); return; }
    store.list = store.list.filter(function (x) { return x.id !== detailId; }); saveStore(); $('detail').classList.add('hidden'); detailId = null; renderHist();
  });

  // ---------- konum kaynağı ----------
  function detectNative() {
    var C = window.Capacitor; native = !!(C && C.isNativePlatform && C.isNativePlatform());
    if (native) { try { geo = (C.Plugins && C.Plugins.Geolocation) || (C.registerPlugin && C.registerPlugin('Geolocation')); } catch (e) { geo = null; } }
  }
  function onFix(lat, lon, acc, ts) { fix(lat, lon, acc, ts); }
  function startWatch() {
    if (native && geo) {
      return geo.watchPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0, minimumUpdateInterval: 2000 }, function (pos, err) {
        if (err || !pos) { if (rec) status('walkError'); return; }
        onFix(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.timestamp || Date.now());
      }).then(function (id) { watchId = id; });
    }
    if (!navigator.geolocation) return Promise.reject({ code: 'unsupported' });
    return new Promise(function (resolve) {
      watchId = navigator.geolocation.watchPosition(function (pos) { onFix(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.timestamp || Date.now()); },
        function (err) { if (err && err.code === 1) { stopWatch(); abortStart('walkDenied'); } else if (rec) status('walkError'); },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
      resolve();
    });
  }
  function stopWatch() {
    try {
      if (watchId !== null) { if (native && geo) geo.clearWatch({ id: watchId }); else if (navigator.geolocation) navigator.geolocation.clearWatch(watchId); }
    } catch (e) {}
    watchId = null;
  }
  function ensurePermission() {
    if (native && geo) {
      return geo.checkPermissions().then(function (p) {
        var ok = function (r) { return r && (r.location === 'granted' || r.coarseLocation === 'granted'); };
        if (ok(p)) return true;
        return geo.requestPermissions({ permissions: ['location'] }).then(ok);
      }).catch(function () { return false; });
    }
    return Promise.resolve(true);
  }
  function abortStart(key) { rec = null; clearInterval(tick); tick = null; WB.wakeOff(); status(key); renderControls(); renderChips(); renderStats(); }

  // ---------- kayıt ----------
  function newRec() { return { type: cfg.type, startTs: Date.now(), active: 0, dist: 0, pts: [], last: null, paused: false, lastTick: Date.now(), weak: false, gotFix: false }; }
  function fix(lat, lon, acc, ts) {
    if (!rec || rec.paused) return;
    if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) return;
    if (acc != null && acc > MAX_ACC) { status('walkGpsWeak'); rec.weak = true; return; }
    if (!rec.gotFix || rec.weak) { status('walkGpsOk'); rec.gotFix = true; rec.weak = false; }
    ts = ts || Date.now(); var p = { lat: lat, lon: lon, ts: ts };
    if (!rec.last) { rec.last = p; rec.pts.push([lat, lon]); renderStats(); return; }
    var d = hav(rec.last, p), dt = (ts - rec.last.ts) / 1000;
    var minStep = Math.max(3, Math.min(acc || 10, 25) * 0.6);
    if (d < minStep || dt <= 0) return;
    if (d / dt > TYPES[rec.type].max) return; // GPS sıçraması ya da araç
    rec.dist += d; rec.last = p; rec.pts.push([lat, lon]);
    if (rec.pts.length > 3000) rec.pts = rec.pts.filter(function (_, i) { return i % 2 === 0 || i === rec.pts.length - 1; });
    renderStats(); persistLive();
  }
  function tickFn() {
    if (!rec) return; var now = Date.now();
    if (!rec.paused) rec.active += (now - rec.lastTick) / 1000; rec.lastTick = now; renderStats();
  }
  function persistLive(force) {
    if (!rec) return; var now = Date.now(); if (!force && now - lastLiveSave < 5000) return; lastLiveSave = now;
    WB.save(LIVE, { type: rec.type, startTs: rec.startTs, active: rec.active, dist: rec.dist, pts: downsample(rec.pts, 400), saved: now });
  }
  function begin() {
    detectNative(); if (!native && !navigator.geolocation) { status('walkUnsupported'); return; }
    rec = newRec(); status('walkGpsWait'); renderControls(); renderChips(); renderStats(); $('summary').classList.add('hidden');
    ensurePermission().then(function (ok) {
      if (!rec) return;
      if (!ok) { abortStart('walkDenied'); return; }
      return startWatch().then(function () {
        if (!rec) { stopWatch(); return; }
        rec.lastTick = Date.now(); tick = setInterval(tickFn, 1000); WB.wakeOn(); persistLive(true);
      });
    }).catch(function (e) { abortStart(e && e.code === 'unsupported' ? 'walkUnsupported' : 'walkError'); });
  }
  function finish() {
    if (!rec) return; tickFn(); stopWatch(); clearInterval(tick); tick = null; WB.wakeOff();
    var r = rec; rec = null; try { localStorage.removeItem(LIVE); } catch (e) {}
    pendingSummary = { type: r.type, start: r.startTs, dur: Math.round(r.active), dist: Math.round(r.dist), pts: downsample(r.pts, MAX_PTS_SAVED) };
    pendingSummary.kcal = kcalOf(r.type, r.dist / 1000, cfg.kg);
    showSummary(pendingSummary); status('walkIdle'); renderControls(); renderChips(); renderStats();
  }
  function showSummary(s) {
    $('summary').classList.remove('hidden');
    $('sum-stats').textContent = TYPES[s.type].icon + ' ' + fmtKm(s.dist) + ' km · ' + fmtTime(s.dur) + ' · ' + s.kcal + ' kcal';
    $('sum-short').classList.toggle('hidden', s.dist >= 50); $('summary').scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function commitSummary() {
    if (!pendingSummary) return; var s = pendingSummary; s.id = 'w' + s.start.toString(36); store.list.push(s); saveStore(); pendingSummary = null;
    $('summary').classList.add('hidden'); WB.toast(t('walkSaved')); WB.vibrate(25); renderHist();
  }
  $('btn-start').addEventListener('click', begin);
  $('btn-pause').addEventListener('click', function () {
    if (!rec) return; tickFn(); rec.paused = !rec.paused; if (!rec.paused) { rec.last = null; rec.lastTick = Date.now(); }
    status(rec.paused ? 'walkPaused' : (rec.gotFix ? 'walkGpsOk' : 'walkGpsWait')); renderControls(); persistLive(true);
  });
  $('btn-stop').addEventListener('click', finish);
  $('sum-save').addEventListener('click', commitSummary);
  $('sum-discard').addEventListener('click', function () { pendingSummary = null; $('summary').classList.add('hidden'); });

  // ---------- yarım kalan kayıt ----------
  function checkRecover() {
    var live = WB.load(LIVE, null); if (!live || !live.startTs || rec) return;
    if (Date.now() - (live.saved || live.startTs) > 6 * 3600 * 1000) { try { localStorage.removeItem(LIVE); } catch (e) {} return; }
    $('recover').classList.remove('hidden'); $('recover-stats').textContent = (TYPES[live.type] ? TYPES[live.type].icon : '') + ' ' + fmtKm(live.dist) + ' km · ' + fmtTime(live.active);
    $('recover-save').onclick = function () {
      var s = { type: TYPES[live.type] ? live.type : 'walk', start: live.startTs, dur: Math.round(live.active), dist: Math.round(live.dist), pts: downsample(live.pts || [], MAX_PTS_SAVED) };
      s.kcal = kcalOf(s.type, s.dist / 1000, cfg.kg); pendingSummary = s; try { localStorage.removeItem(LIVE); } catch (e) {} $('recover').classList.add('hidden'); showSummary(s);
    };
    $('recover-drop').onclick = function () { try { localStorage.removeItem(LIVE); } catch (e) {} $('recover').classList.add('hidden'); };
  }

  // ---------- kilo ----------
  $('kg-input').value = cfg.kg;
  $('kg-input').addEventListener('change', function () { var v = parseFloat($('kg-input').value); if (v >= 30 && v <= 250) { cfg.kg = Math.round(v * 10) / 10; saveCfg(); renderStats(); } else $('kg-input').value = cfg.kg; });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) persistLive(true); else if (rec && !rec.paused) { WB.wakeOn(); rec.lastTick = Date.now(); }
  });
  window.addEventListener('one-lang-changed', function () { var k = $('gps-status').dataset.k; if (k) status(k); renderChips(); renderStats(); renderControls(); renderHist(); if (detailId) openDetail(detailId); });
  renderChips(); renderStats(); renderControls(); renderHist(); checkRecover();
  // Test kancası (kullanıcıya görünmez)
  window.__walk = { fix: fix, state: function () { return rec; }, setActive: function (s) { if (rec) { rec.active = s; rec.lastTick = Date.now(); renderStats(); } }, hav: hav };
})();
