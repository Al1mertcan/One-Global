/* Hemcan — Nefes, meditasyon zamanlayıcısı ve uyku sesleri.
 * Tüm sesler telefonda WebAudio ile ÜRETİLİR (ses dosyası, telif veya internet gerekmez). */
(function () {
  'use strict';
  var WB = window.WB, $ = WB.$, t = WB.t;
  var KEY = 'one-calm', KEY_PREF = 'one-calm-pref';
  var pref = WB.load(KEY_PREF, { tab: 'breath', pattern: '478', bdur: 3, sound: false, haptic: true, mdur: 10, mint: 0, mamb: 'none', mix: { rain: 0.6 }, timer: 30 });
  (function () { var ok = { rain: 1, ocean: 1, wind: 1, fire: 1, night: 1 }, m = {}; Object.keys(pref.mix || {}).forEach(function (k) { if (ok[k]) m[k] = pref.mix[k]; }); pref.mix = Object.keys(m).length ? m : { rain: 0.6 }; if (pref.mamb !== 'none' && !ok[pref.mamb]) pref.mamb = 'rain'; })();

  // ---------------------------------------------------------------- kayıt / istatistik
  function log() { var l = WB.load(KEY, null); if (!l || !l.days) l = { days: {} }; return l; }
  function addSeconds(kind, sec) {
    sec = Math.round(sec); if (sec < 20) return;
    var l = log(), k = WB.today(), d = l.days[k] || (l.days[k] = { breath: 0, med: 0, sleep: 0 });
    d[kind] = (d[kind] || 0) + sec;
    var cut = WB.addDays(k, -400); Object.keys(l.days).forEach(function (x) { if (x < cut) delete l.days[x]; });
    WB.save(KEY, l); renderStats();
  }
  function dayTotal(l, k) { var d = l.days[k]; return d ? (d.breath || 0) + (d.med || 0) : 0; }
  function renderStats() {
    var l = log(), today = dayTotal(l, WB.today());
    $('stat-today').textContent = t('calmStatToday', { n: Math.round(today / 60) });
    var st = WB.streak(function (k) { return dayTotal(l, k) >= 60; });
    $('stat-streak').textContent = st >= 2 ? '🔥 ' + t('calmStatStreak', { n: st }) : '';
  }
  function save() { WB.save(KEY_PREF, pref); }

  // ---------------------------------------------------------------- ses motoru
  // Sesler telefonda üretilir. Amaç: tiz/keskin değil, yumuşak ve doğal; hiçbir ses ani "tık" yapmaz.
  var AC = null, master = null, noiseCache = {};
  function ctx() {
    if (!AC) {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      AC = new C(); master = AC.createGain(); master.gain.value = 1;
      // üst üste binen sesler patlamasın diye hafif sınırlayıcı
      var lim = AC.createDynamicsCompressor();
      lim.threshold.value = -10; lim.knee.value = 12; lim.ratio.value = 3; lim.attack.value = 0.03; lim.release.value = 0.4;
      master.connect(lim); lim.connect(AC.destination);
    }
    if (AC.state === 'suspended') { try { AC.resume(); } catch (e) {} }
    return AC;
  }
  var LOOP_SEC = 8;
  function noiseBuf(type) {
    if (noiseCache[type]) return noiseCache[type];
    var ac = ctx(), sr = ac.sampleRate, N = Math.floor(sr * LOOP_SEC), fade = Math.floor(sr * 0.5), len = N + fade;
    var b = ac.createBuffer(1, N, sr), d = new Float32Array(len), i;
    if (type === 'white') { for (i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
    else if (type === 'pink') { // Paul Kellet yaklaşımı
      var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (i = 0; i < len; i++) { var w = Math.random() * 2 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; }
    } else { var last = 0; for (i = 0; i < len; i++) { var x = Math.random() * 2 - 1; last = (last + 0.02 * x) / 1.02; d[i] = last * 3.5; } }
    // kesintisiz döngü: sondaki "fade" kadar fazlalık, başa eşit güçle karıştırılır -> dikiş duyulmaz
    var out = b.getChannelData(0);
    for (i = 0; i < N; i++) out[i] = d[i];
    for (i = 0; i < fade; i++) { var a = (i / fade) * Math.PI / 2; out[i] = d[i] * Math.sin(a) + d[N + i] * Math.cos(a); }
    noiseCache[type] = b; return b;
  }
  function noiseSrc(type) { var ac = ctx(), s = ac.createBufferSource(); s.buffer = noiseBuf(type); s.loop = true; s.loopStart = 0; s.loopEnd = s.buffer.duration; s.start(0, Math.random() * (LOOP_SEC - 0.1)); return s; }
  function filt(type, f, q) { var n = ctx().createBiquadFilter(); n.type = type; n.frequency.value = f; if (q != null) n.Q.value = q; return n; }
  function gainNode(v) { var g = ctx().createGain(); g.gain.value = v; return g; }
  function chain() { for (var i = 0; i < arguments.length - 1; i++) arguments[i].connect(arguments[i + 1]); }
  // Yavaş, tekrarlanmayan hissi veren dalgalanma: rastgele fazlı 3 sinüs (toplam genlik = depth)
  function drift(target, depth, speed) {
    var ac = ctx(), list = [];
    [[0.037, 0.5], [0.061, 0.32], [0.097, 0.18]].forEach(function (p) {
      var o = ac.createOscillator(), g = ac.createGain(), ph = Math.random() * Math.PI * 2;
      try { o.setPeriodicWave(ac.createPeriodicWave(new Float32Array([0, Math.sin(ph)]), new Float32Array([0, Math.cos(ph)]))); } catch (e) { o.type = 'sine'; }
      o.frequency.value = p[0] * (speed || 1) * (0.8 + Math.random() * 0.4); g.gain.value = depth * p[1];
      o.connect(g); g.connect(target); o.start(); list.push(o);
    });
    return list;
  }
  function stopAll(list) { list.forEach(function (n) { try { n.stop(); } catch (e) {} }); }
  // Rastgele zamanlı olaylar (damla, çıtırtı): ses saatine göre önceden planlanır, zamanlayıcı geç kalsa bile yığılma olmaz
  function scatter(rate, fn) {
    var ac = ctx(), alive = true, tm, next = ac.currentTime + 0.05;
    (function tick() {
      if (!alive) return;
      var now = ac.currentTime; if (next < now) next = now;
      while (next < now + 1.5) { fn(next); next += -Math.log(1 - Math.random()) / (typeof rate === 'function' ? rate() : rate); }
      tm = setTimeout(tick, 400);
    })();
    return function () { alive = false; clearTimeout(tm); };
  }
  // Tek bir kısa, yumuşak gürültü darbesi (başı 1-5 ms yükselir: tık sesi yok)
  function grain(out, when, o) {
    var ac = ctx(), s = ac.createBufferSource(); s.buffer = noiseBuf('white');
    var f = filt(o.type || 'bandpass', o.freq, o.q || 1), g = ac.createGain(), atk = o.atk || 0.004, end = when + atk + o.dec * 4;
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(o.vol, when + atk); g.gain.setTargetAtTime(0, when + atk, o.dec);
    chain(s, f, g, out); s.start(when, Math.random() * (LOOP_SEC - 1)); s.stop(end + 0.05);
  }
  // Her ses: out (GainNode) alır; stop() ile durur.
  var BUILD = {
    // Yağmur: ince, sık damlaların yumuşak hışırtısı + uzak gürleme + seyrek iri damlalar
    rain: function (out) {
      var a = noiseSrc('pink'), b = noiseSrc('white'), c = noiseSrc('brown'), nodes = [a, b, c];
      chain(a, filt('highpass', 260, 0.5), filt('lowpass', 3800, 0.5), gainNode(0.42), out);
      var bp = filt('bandpass', 1700, 0.4), g2 = gainNode(0.07); chain(b, bp, g2, out);
      nodes = nodes.concat(drift(g2.gain, 0.035), drift(bp.frequency, 350));
      chain(c, filt('lowpass', 200, 0.5), gainNode(0.2), out);
      var stopDrops = scatter(function () { return 7 + Math.random() * 7; }, function (t) {
        grain(out, t, { freq: 500 * Math.pow(6, Math.random()), q: 1.2 + Math.random() * 1.5, vol: 0.012 + Math.random() * 0.045, atk: 0.003, dec: 0.012 + Math.random() * 0.03 });
      });
      return function () { stopDrops(); stopAll(nodes); };
    },
    // Okyanus: kahverengi gürültü + yaklaşık 8-13 sn'de bir kabarıp sönen dalgalar, tepede köpük hışırtısı
    ocean: function (out) {
      var ac = ctx(), alive = true, tm;
      var a = noiseSrc('brown'), lp = filt('lowpass', 380, 0.4), body = gainNode(0.18); chain(a, lp, body, out);
      var s = noiseSrc('pink'), bp = filt('bandpass', 1100, 0.45), foam = gainNode(0), foamLp = filt('lowpass', 3200, 0.5); chain(s, bp, foamLp, foam, out);
      var nodes = [a, s], next = ac.currentTime + 0.3, N = 128;
      function shape(x, rise) { return x < rise ? Math.pow(Math.sin(x / rise * Math.PI / 2), 2) : Math.pow(Math.cos((x - rise) / (1 - rise) * Math.PI / 2), 2); }
      function plan() {
        if (!alive) return;
        if (next < ac.currentTime) next = ac.currentTime + 0.05;
        while (next < ac.currentTime + 26) {
          var dur = 8.5 + Math.random() * 5, peak = 0.5 + Math.random() * 0.5, rise = 0.36 + Math.random() * 0.1;
          var cb = new Float32Array(N), cl = new Float32Array(N), cf = new Float32Array(N), i;
          for (i = 0; i < N; i++) {
            var x = i / (N - 1), w = shape(x, rise), wf = shape(Math.max(0, Math.min(1, (x - 0.07) / 0.93)), rise);
            cb[i] = 0.12 + 0.7 * peak * w; cl[i] = 300 + 650 * peak * w; cf[i] = 0.1 * peak * Math.pow(wf, 2.2);
          }
          body.gain.setValueCurveAtTime(cb, next, dur); lp.frequency.setValueCurveAtTime(cl, next, dur); foam.gain.setValueCurveAtTime(cf, next, dur);
          next += dur + 0.03;
        }
        tm = setTimeout(plan, 4000);
      }
      plan();
      return function () { alive = false; clearTimeout(tm); stopAll(nodes); };
    },
    // Rüzgâr: ıslık yok; geniş, yumuşak bantlar ve rastgele esen hamleler
    wind: function (out) {
      var a = noiseSrc('pink'), b = noiseSrc('pink');
      var lp = filt('lowpass', 700, 0.3), g = gainNode(0.5); chain(a, filt('highpass', 80, 0.5), lp, g, out);
      var bp = filt('bandpass', 900, 0.45), g2 = gainNode(0.2); chain(b, bp, g2, out);
      var nodes = [a, b].concat(drift(lp.frequency, 300, 1.1), drift(g.gain, 0.24, 1), drift(bp.frequency, 280, 0.8), drift(g2.gain, 0.16, 1.3));
      return function () { stopAll(nodes); };
    },
    // Ateş: sıcak, alçak uğultu + yumuşak, seyrek çıtırtılar (bazen daha belirgin patlama)
    fire: function (out) {
      var a = noiseSrc('brown'), b = noiseSrc('pink');
      var lp = filt('lowpass', 300, 0.4), g = gainNode(0.4); chain(a, lp, g, out);
      var bp = filt('bandpass', 700, 0.5), g2 = gainNode(0.05); chain(b, bp, g2, out);
      var nodes = [a, b].concat(drift(g.gain, 0.12, 1.6), drift(lp.frequency, 90, 1.4), drift(g2.gain, 0.03, 1.8));
      var stopCr = scatter(function () { return 2.5 + Math.random() * Math.random() * 9; }, function (t) {
        var r = Math.random(), big = r > 0.93, v = (big ? 0.6 : 0.12) + Math.pow(Math.random(), 3) * (big ? 0.45 : 0.3);
        grain(out, t, { freq: 800 + Math.random() * 2600, q: 0.9 + Math.random() * 1.2, vol: v, atk: 0.0015, dec: 0.004 + Math.random() * (big ? 0.03 : 0.012) });
        if (big) grain(out, t, { type: 'lowpass', freq: 260, q: 0.5, vol: 0.35, atk: 0.003, dec: 0.05 });
      });
      return function () { stopCr(); stopAll(nodes); };
    },
    // Gece: yumuşak cırcır böceği korosu; sivri bip yok, düşük frekanslı, kısa darbeli ve nazik
    night: function (out) {
      var ac = ctx(), alive = true, tm, nodes = [];
      var bed = noiseSrc('pink'), bedLp = filt('lowpass', 420, 0.4), bedG = gainNode(0.05); chain(bed, bedLp, bedG, out); nodes.push(bed);
      nodes = nodes.concat(drift(bedG.gain, 0.025, 1));
      var bus = filt('lowpass', 3900, 0.5); bus.connect(out);
      var crickets = [], i;
      for (i = 0; i < 4; i++) {
        var o = ac.createOscillator(), env = ac.createGain(), pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
        o.type = 'sine'; o.frequency.value = 2900 + i * 230 + Math.random() * 100; env.gain.value = 0;
        o.connect(env); if (pan) { pan.pan.value = (i - 1.5) * 0.45; env.connect(pan); pan.connect(bus); } else env.connect(bus);
        o.start(); nodes.push(o);
        crickets.push({ env: env, next: ac.currentTime + Math.random() * 3, period: 0.36 + Math.random() * 0.2, pulses: 3 + (i % 2), amp: 0.02 + Math.random() * 0.008 });
      }
      function plan() {
        if (!alive) return;
        var now = ac.currentTime;
        crickets.forEach(function (c) {
          if (c.next < now) c.next = now + Math.random() * 0.5;
          while (c.next < now + 6) {
            var p, t0 = c.next;
            for (p = 0; p < c.pulses; p++) {
              var s = t0 + p * 0.036;
              c.env.gain.setValueAtTime(0, s); c.env.gain.linearRampToValueAtTime(c.amp * (0.8 + 0.2 * (p / c.pulses)), s + 0.011); c.env.gain.linearRampToValueAtTime(0, s + 0.03);
            }
            c.next += c.period * (0.92 + Math.random() * 0.16);
            if (Math.random() < 0.04) c.next += 2.5 + Math.random() * 7; // arada sessizce dinlenir
          }
        });
        tm = setTimeout(plan, 2000);
      }
      plan();
      return function () { alive = false; clearTimeout(tm); stopAll(nodes); };
    },
    // Beyaz: gerçek beyaz gürültünün tiz kısmı yumuşatılmış hâli
    white: function (out) { var a = noiseSrc('white'); chain(a, filt('lowpass', 6500, 0.5), gainNode(0.22), out); return function () { stopAll([a]); }; },
    pink: function (out) { var a = noiseSrc('pink'); chain(a, filt('lowpass', 8000, 0.5), gainNode(0.6), out); return function () { stopAll([a]); }; },
    brown: function (out) { var a = noiseSrc('brown'); chain(a, filt('highpass', 28, 0.5), filt('lowpass', 1600, 0.5), gainNode(0.6), out); return function () { stopAll([a]); }; }
  };
  // ---- Gerçek doğa kayıtları (CC0 / telifsiz). Dosyalar uygulamayla birlikte gelir, internet gerekmez.
  // Kayıt yüklenemezse (nadiren) yukarıdaki sentez ses yedek olarak çalar.
  var SYNTH = {}; Object.keys(BUILD).forEach(function (k) { SYNTH[k] = BUILD[k]; });
  // Her ses 1–2 katmandan oluşur (farklı uzunlukta kayıtlar üst üste döner, bu yüzden aynı döngü kulağa tekrar gibi gelmez).
  // Katman seviyeleri yavaşça kendiliğinden dalgalanır; yağmura çok uzaktan, hafif gök gürültüsü eklenir.
  var SAMPLES = {
    rain: { layers: [{ f: 'sounds/rain-a.mp3', g: 1 }, { f: 'sounds/rain-b.mp3', g: 0.6 }], thunder: true },
    ocean: { layers: [{ f: 'sounds/ocean-a.mp3', g: 1 }, { f: 'sounds/ocean-b.mp3', g: 0.5 }] },
    wind: { layers: [{ f: 'sounds/wind-a.mp3', g: 1 }, { f: 'sounds/wind-b.mp3', g: 0.55 }] },
    fire: { layers: [{ f: 'sounds/fire-a.mp3', g: 1.25 }, { f: 'sounds/fire-b.mp3', g: 0.9 }, { f: 'sounds/fire-c.mp3', g: 0.55 }] },
    night: { layers: [{ f: 'sounds/night-a.mp3', g: 1 }, { f: 'sounds/night-b.mp3', g: 0.5 }] }
  };
  var THUNDER = { f: 'sounds/thunder.mp3', clips: [[0, 20], [21.5, 20], [43, 10], [54.5, 7.7]] };
  var fileCache = {};
  function loadFile(f) {
    if (fileCache[f]) return fileCache[f];
    var ac = ctx(), p = fetch(f).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); }).then(function (ab) {
      return new Promise(function (res, rej) { ac.decodeAudioData(ab, res, rej); });
    });
    fileCache[f] = p; p.catch(function () { delete fileCache[f]; }); return p;
  }
  function filesOf(id) { var d = SAMPLES[id], l = d.layers.map(function (x) { return x.f; }); if (d.thunder) l.push(THUNDER.f); return l; }
  // Kaydı dikişsiz döngüye alır: bir sonraki kopya, öncekinin bitişiyle eşit güçle karışarak başlar.
  function xfadeLoop(buf, out) {
    var ac = ctx(), D = buf.duration, X = Math.min(5, D * 0.12), alive = true, tm, live = [], nextAt = 0, i;
    var inC = new Float32Array(64), outC = new Float32Array(64);
    for (i = 0; i < 64; i++) { var a = i / 63 * Math.PI / 2; inC[i] = Math.sin(a); outC[i] = Math.cos(a); }
    function play(when, off) {
      var s = ac.createBufferSource(), g = ac.createGain(), len = D - off;
      s.buffer = buf; s.connect(g); g.connect(out);
      if (off > 0) { g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(1, when + 0.08); }
      else g.gain.setValueCurveAtTime(inC, when, X);
      g.gain.setValueCurveAtTime(outC, when + len - X, X);
      s.start(when, off); s.stop(when + len + 0.1);
      live.push(s); s.onended = function () { var k = live.indexOf(s); if (k >= 0) live.splice(k, 1); try { g.disconnect(); } catch (e) {} };
      nextAt = when + len - X;
    }
    function tick() {
      if (!alive) return;
      var now = ac.currentTime; if (nextAt < now) nextAt = now + 0.05;
      while (nextAt < now + 8) play(nextAt, 0);
      tm = setTimeout(tick, 1000);
    }
    play(ac.currentTime + 0.05, Math.random() * Math.max(0, D - 2 * X)); tick();
    return function () { alive = false; clearTimeout(tm); live.slice().forEach(function (s) { try { s.stop(); } catch (e) {} }); };
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  Object.keys(SAMPLES).forEach(function (id) {
    BUILD[id] = function (out) {
      var alive = true, stoppers = [], timers = [], fb = null, def = SAMPLES[id];
      function later(fn, ms) { var h = setTimeout(function () { if (alive) fn(); }, ms); timers.push(h); }
      Promise.all(def.layers.map(function (L) { return loadFile(L.f).then(function (b) { return { L: L, b: b }; }, function () { return null; }); })).then(function (got) {
        if (!alive) return;
        got = got.filter(Boolean);
        if (!got.length) { fb = SYNTH[id](out); return; }
        got.forEach(function (x, idx) {
          var ac = ctx(), lg = ac.createGain(); lg.gain.value = x.L.g; lg.connect(out);
          stoppers.push(xfadeLoop(x.b, lg));
          stoppers.push(function () { try { lg.disconnect(); } catch (e) {} });
          (function swell() { // yavaş, doğal seviye değişimi
            var lo = idx ? 0.55 : 0.88;
            try { lg.gain.setTargetAtTime(x.L.g * rnd(lo, 1), ac.currentTime, rnd(4, 9)); } catch (e) {}
            later(swell, rnd(9, 24) * 1000);
          })();
        });
        if (def.thunder) loadFile(THUNDER.f).then(function (tb) {
          function boom() {
            if (!alive) return; var ac = ctx(), c = THUNDER.clips[Math.floor(Math.random() * THUNDER.clips.length)];
            var s = ac.createBufferSource(), g = ac.createGain(), lpf = ac.createBiquadFilter(), pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
            s.buffer = tb; lpf.type = 'lowpass'; lpf.frequency.value = rnd(450, 1100); g.gain.value = rnd(0.12, 0.3);
            s.connect(lpf); lpf.connect(g); if (pan) { pan.pan.value = rnd(-0.6, 0.6); g.connect(pan); pan.connect(out); } else g.connect(out);
            s.onended = function () { try { g.disconnect(); } catch (e) {} };
            s.start(ac.currentTime + 0.05, c[0], c[1]);
            later(boom, rnd(50, 140) * 1000);
          }
          later(boom, rnd(18, 45) * 1000);
        }, function () {});
      });
      return function () {
        alive = false; timers.forEach(clearTimeout); stoppers.forEach(function (f) { try { f(); } catch (e) {} }); if (fb) fb();
        setTimeout(function () { filesOf(id).forEach(function (f) { delete fileCache[f]; }); }, 700); // bellek: kullanılmayan kayıtları bırak
      };
    };
  });
  var SOUND_ICONS = { rain: '🌧️', ocean: '🌊', wind: '🍃', fire: '🔥', night: '🦗' };
  var SOUND_IDS = ['rain', 'ocean', 'wind', 'fire', 'night'];
  var MIXES = [
    { id: 'rainy', mix: { rain: 0.7, night: 0.25 } }, { id: 'coast', mix: { ocean: 0.7, wind: 0.3 } },
    { id: 'cabin', mix: { fire: 0.6, rain: 0.35 } }, { id: 'deep', mix: { ocean: 0.45, rain: 0.25 } }, { id: 'forest', mix: { wind: 0.4, night: 0.45 } }
  ];
  var layers = {}; // id -> { gain, stop }
  function layerSet(id, vol) {
    var ac = ctx(); if (!ac) return;
    if (vol > 0) {
      if (!layers[id]) { var g = ac.createGain(); g.gain.value = 0; g.connect(master); layers[id] = { gain: g, stop: BUILD[id](g) }; }
      layers[id].gain.gain.setTargetAtTime(vol, ac.currentTime, 0.15);
    } else if (layers[id]) {
      var L = layers[id]; delete layers[id]; L.gain.gain.setTargetAtTime(0, ac.currentTime, 0.12);
      setTimeout(function () { try { L.stop(); L.gain.disconnect(); } catch (e) {} }, 600);
    }
  }
  function layersStopAll(fadeSec) {
    if (!AC) return; var ac = AC;
    if (fadeSec) { master.gain.cancelScheduledValues(ac.currentTime); master.gain.setValueAtTime(master.gain.value, ac.currentTime); master.gain.linearRampToValueAtTime(0.0001, ac.currentTime + fadeSec); }
    setTimeout(function () { Object.keys(layers).forEach(function (id) { var L = layers[id]; try { L.stop(); L.gain.disconnect(); } catch (e) {} }); layers = {}; if (master) { master.gain.cancelScheduledValues(0); master.gain.value = 1; } if (AC && AC.state === 'running') { try { AC.suspend(); } catch (e) {} } }, (fadeSec || 0) * 1000 + 50);
  }
  // Tibet çanı benzeri: birkaç sinüs, farklı sönümlerle
  function bowl(vol, base) {
    var ac = ctx(); if (!ac) return; base = base || 196; var now = ac.currentTime;
    [[1, 7, 1], [2.76, 5, 0.5], [5.4, 3, 0.28], [8.93, 1.8, 0.15]].forEach(function (p, i) {
      [0, 1.3].forEach(function (det) { // hafif frekans farkı -> çanın "dalgalanması"
        var o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = base * p[0] + det * (i + 1);
        g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(vol * p[2] * 0.5, now + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, now + p[1]);
        o.connect(g); g.connect(master); o.start(now); o.stop(now + p[1] + 0.1);
      });
    });
  }
  function cue(freq, vol) {
    var ac = ctx(); if (!ac) return; var now = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = freq; g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(vol, now + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    o.connect(g); g.connect(master); o.start(now); o.stop(now + 0.75);
  }

  // ---------------------------------------------------------------- sekmeler
  function showTab(name) {
    pref.tab = name; save();
    ['breath', 'med', 'sleep'].forEach(function (n) {
      $('panel-' + n).classList.toggle('hidden', n !== name);
      var b = $('tab-' + n), on = n === name;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.className = 'h-10 rounded-lg text-xs font-bold ' + (on ? 'bg-primary text-primary-foreground' : 'text-muted-foreground');
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('#tabs [data-tab]'), function (b) { b.addEventListener('click', function () { showTab(b.getAttribute('data-tab')); }); });

  function seg(box, items, cur, onPick, cls) { // basit seçenek düğmeleri
    box.innerHTML = '';
    items.forEach(function (it) {
      var on = it.v === cur;
      var b = WB.el('button', (cls || 'h-10') + ' rounded-theme border text-xs font-bold ' + (on ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-card text-card-foreground'), it.label);
      b.type = 'button'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('data-v', String(it.v));
      b.addEventListener('click', function () { onPick(it.v); }); box.appendChild(b);
    });
  }

  // ---------------------------------------------------------------- NEFES
  var PATTERNS = [
    { id: '478', ph: [['in', 4], ['hold', 7], ['out', 8]] },
    { id: 'box', ph: [['in', 4], ['hold', 4], ['out', 4], ['hold2', 4]] },
    { id: 'calm', ph: [['in', 4], ['out', 6]] },
    { id: 'even', ph: [['in', 5], ['out', 5]] }
  ];
  function pat() { for (var i = 0; i < PATTERNS.length; i++) if (PATTERNS[i].id === pref.pattern) return PATTERNS[i]; return PATTERNS[0]; }
  var B = { run: false, t0: 0, dur: 0, raf: 0, lastPh: '' };
  function renderPatterns() {
    var box = $('pattern-list'); box.innerHTML = '';
    PATTERNS.forEach(function (p) {
      var on = p.id === pref.pattern;
      var b = WB.el('button', 'w-full rounded-theme border px-4 py-3 text-left ' + (on ? 'border-primary bg-primary/10' : 'border-border bg-card'));
      b.type = 'button'; b.setAttribute('data-pattern', p.id); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.disabled = B.run;
      var seq = p.ph.map(function (x) { return x[1]; }).join(' · ');
      var row = WB.el('div', 'flex items-center justify-between gap-3');
      row.appendChild(WB.el('span', 'text-sm font-semibold ' + (on ? 'text-primary' : 'text-card-foreground'), t('calmPat_' + p.id)));
      row.appendChild(WB.el('span', 'text-xs font-bold tabular-nums text-muted-foreground', seq));
      b.appendChild(row); b.appendChild(WB.el('p', 'mt-1 text-[11px] leading-5 text-muted-foreground', t('calmPatDesc_' + p.id)));
      b.addEventListener('click', function () { pref.pattern = p.id; save(); renderPatterns(); });
      box.appendChild(b);
    });
    seg($('breath-dur'), [1, 3, 5, 10].map(function (m) { return { v: m, label: t('calmMin', { n: m }) }; }), pref.bdur, function (v) { if (B.run) return; pref.bdur = v; save(); renderPatterns(); });
    [['opt-sound', 'sound'], ['opt-haptic', 'haptic']].forEach(function (x) {
      var on = !!pref[x[1]], b = $(x[0]);
      b.className = 'flex h-10 items-center justify-center gap-2 rounded-theme border text-xs font-bold ' + (on ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-card text-muted-foreground');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  $('opt-sound').addEventListener('click', function () { pref.sound = !pref.sound; save(); renderPatterns(); });
  $('opt-haptic').addEventListener('click', function () { pref.haptic = !pref.haptic; save(); renderPatterns(); });
  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function setBreathIdle() {
    $('breath-orb').style.transform = 'scale(.55)'; $('breath-phase').textContent = t('calmReady'); $('breath-count').textContent = ''; $('breath-left').textContent = '';
    $('breath-go-label').textContent = t('calmStart'); $('breath-go').querySelector('iconify-icon').setAttribute('icon', 'lucide:play');
  }
  function breathFrame() {
    if (!B.run) return;
    var now = performance.now(), el = (now - B.t0) / 1000, orb = $('breath-orb');
    if (el < 0) { $('breath-phase').textContent = t('calmPrepare'); $('breath-count').textContent = String(Math.ceil(-el)); B.raf = requestAnimationFrame(breathFrame); return; }
    if (el >= B.dur) { finishBreath(true); return; }
    var p = pat(), cyc = p.ph.reduce(function (a, x) { return a + x[1]; }, 0), pos = el % cyc, i = 0, acc = 0;
    while (i < p.ph.length - 1 && pos >= acc + p.ph[i][1]) { acc += p.ph[i][1]; i++; }
    var name = p.ph[i][0], dur = p.ph[i][1], pt = (pos - acc) / dur, s;
    if (name === 'in') s = 0.55 + 0.45 * ease(pt); else if (name === 'out') s = 1 - 0.45 * ease(pt); else s = name === 'hold' ? 1 : 0.55;
    orb.style.transform = 'scale(' + s.toFixed(3) + ')';
    var key = Math.floor(el / cyc) + ':' + i;
    if (key !== B.lastPh) {
      B.lastPh = key;
      if (pref.haptic) WB.vibrate(name === 'in' || name === 'out' ? 35 : 15);
      if (pref.sound) cue(name === 'in' ? 440 : name === 'out' ? 330 : 392, name.indexOf('hold') === 0 ? 0.04 : 0.09);
    }
    $('breath-phase').textContent = t('calmPh_' + name);
    $('breath-count').textContent = String(Math.max(1, Math.ceil(dur - (pos - acc))));
    $('breath-left').textContent = t('calmLeft', { t: WB.fmtDur(B.dur - el) });
    B.raf = requestAnimationFrame(breathFrame);
  }
  function startBreath() {
    if (B.run) return;
    if (pref.sound) ctx();
    B.run = true; B.dur = pref.bdur * 60; B.t0 = performance.now() + 3000; B.lastPh = '';
    WB.wakeOn(); renderPatterns();
    $('breath-go-label').textContent = t('calmStop'); $('breath-go').querySelector('iconify-icon').setAttribute('icon', 'lucide:square');
    B.raf = requestAnimationFrame(breathFrame);
  }
  function finishBreath(done) {
    var spent = Math.max(0, Math.min(B.dur, (performance.now() - B.t0) / 1000));
    B.run = false; cancelAnimationFrame(B.raf); WB.wakeOff();
    addSeconds('breath', spent);
    setBreathIdle(); renderPatterns();
    if (done) { if (pref.sound) bowl(0.35, 220); if (pref.haptic) WB.vibrate([60, 80, 60]); $('breath-phase').textContent = t('calmWellDone'); WB.toast(t('calmWellDone')); }
  }
  $('breath-go').addEventListener('click', function () { if (B.run) finishBreath(false); else startBreath(); });

  // ---------------------------------------------------------------- MEDİTASYON
  var M = { run: false, paused: false, prep: false, total: 0, left: 0, last: 0, timer: 0, bells: 0, spent: 0 };
  var MED_DURS = [5, 10, 15, 20, 30], MED_INT = [0, 3, 5, 10];
  function renderMedOptions() {
    seg($('med-dur'), MED_DURS.map(function (m) { return { v: m, label: String(m) + ' ' + t('calmMinShort') }; }), pref.mdur, function (v) { if (M.run) return; pref.mdur = v; save(); renderMedOptions(); medIdle(); }, 'h-10');
    seg($('med-interval'), MED_INT.map(function (m) { return { v: m, label: m ? m + ' ' + t('calmMinShort') : t('calmOff') }; }), pref.mint, function (v) { pref.mint = v; save(); renderMedOptions(); }, 'h-10');
    var box = $('med-ambient'); box.innerHTML = '';
    [{ v: 'none', label: '🔇 ' + t('calmOff') }].concat(['rain', 'ocean', 'wind', 'fire', 'night'].map(function (id) { return { v: id, label: SOUND_ICONS[id] + ' ' + t('calmSnd_' + id) }; })).forEach(function (it) {
      var on = pref.mamb === it.v;
      var b = WB.el('button', 'rounded-full border px-3 py-1.5 text-xs font-semibold ' + (on ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-card text-card-foreground'), it.label);
      b.type = 'button'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('data-amb', it.v);
      b.addEventListener('click', function () {
        pref.mamb = it.v; save(); renderMedOptions();
        if (M.run && !M.paused) { SOUND_IDS.forEach(function (id) { layerSet(id, 0); }); if (pref.mamb !== 'none') layerSet(pref.mamb, 0.5); }
      });
      box.appendChild(b);
    });
  }
  function medRing(frac) { $('med-ring').setAttribute('stroke-dashoffset', String((339.292 * (1 - frac)).toFixed(2))); }
  function medIdle() {
    $('med-time').textContent = WB.fmtDur(pref.mdur * 60); $('med-state').textContent = ''; medRing(1);
    $('med-go-label').textContent = t('calmStart'); $('med-go').querySelector('iconify-icon').setAttribute('icon', 'lucide:play'); $('med-stop').classList.add('hidden'); $('med-stop').classList.remove('flex');
  }
  function medTick() {
    if (!M.run || M.paused) return;
    var now = Date.now(), dt = (now - M.last) / 1000; M.last = now;
    if (M.prep) {
      M.prepLeft -= dt; $('med-time').textContent = String(Math.max(1, Math.ceil(M.prepLeft))); $('med-state').textContent = t('calmPrepare');
      if (M.prepLeft <= 0) { M.prep = false; bowl(0.3, 196); if (pref.mamb !== 'none') layerSet(pref.mamb, 0.5); }
      return;
    }
    M.left -= dt; M.spent += dt;
    var elapsedMin = Math.floor(M.spent / 60);
    if (pref.mint && elapsedMin > 0 && elapsedMin % pref.mint === 0 && elapsedMin !== M.bells && M.left > 5) { M.bells = elapsedMin; bowl(0.16, 262); }
    $('med-time').textContent = WB.fmtDur(Math.max(0, M.left)); $('med-state').textContent = t('calmBreatheCalm'); medRing(Math.max(0, M.left / M.total));
    if (M.left <= 0) finishMed(true);
  }
  function startMed() {
    ctx(); M.run = true; M.paused = false; M.prep = true; M.prepLeft = 5; M.total = pref.mdur * 60; M.left = M.total; M.spent = 0; M.bells = 0; M.last = Date.now();
    WB.wakeOn(); clearInterval(M.timer); M.timer = setInterval(medTick, 250);
    $('med-go-label').textContent = t('calmPause'); $('med-go').querySelector('iconify-icon').setAttribute('icon', 'lucide:pause'); $('med-stop').classList.remove('hidden'); $('med-stop').classList.add('flex');
    renderMedOptions(); medTick();
  }
  function finishMed(done) {
    clearInterval(M.timer); M.run = false; M.paused = false; WB.wakeOff();
    SOUND_IDS.forEach(function (id) { layerSet(id, 0); });
    addSeconds('med', M.spent);
    if (done) { bowl(0.5, 196); if (pref.haptic) WB.vibrate([80, 100, 80]); WB.toast(t('calmWellDone')); }
    medIdle(); renderMedOptions();
    setTimeout(function () { if (AC && !M.run && !B.run && !Object.keys(layers).length && AC.state === 'running') { try { AC.suspend(); } catch (e) {} } }, done ? 8000 : 800);
    if (done) $('med-state').textContent = t('calmWellDone');
  }
  $('med-go').addEventListener('click', function () {
    if (!M.run) { startMed(); return; }
    M.paused = !M.paused; M.last = Date.now();
    $('med-go-label').textContent = t(M.paused ? 'calmResume' : 'calmPause'); $('med-go').querySelector('iconify-icon').setAttribute('icon', M.paused ? 'lucide:play' : 'lucide:pause');
    if (M.paused) { SOUND_IDS.forEach(function (id) { layerSet(id, 0); }); $('med-state').textContent = t('calmPaused'); }
    else if (!M.prep && pref.mamb !== 'none') layerSet(pref.mamb, 0.5);
  });
  $('med-stop').addEventListener('click', function () { finishMed(false); });

  // ---------------------------------------------------------------- UYKU SESLERİ
  var S = { run: false, endAt: 0, timer: 0, tick: 0, started: 0 };
  var TIMERS = [15, 30, 60, 90, 0];
  function renderSleep() {
    var mixBox = $('mix-list'); mixBox.innerHTML = '';
    MIXES.forEach(function (m) {
      var b = WB.el('button', 'rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-card-foreground', t('calmMix_' + m.id)); b.type = 'button'; b.setAttribute('data-mix', m.id);
      b.addEventListener('click', function () { pref.mix = JSON.parse(JSON.stringify(m.mix)); save(); applyMix(); renderSleep(); if (!S.run) startSleep(); });
      mixBox.appendChild(b);
    });
    var list = $('sound-list'); list.innerHTML = '';
    SOUND_IDS.forEach(function (id) {
      var vol = pref.mix[id] || 0, on = vol > 0;
      var row = WB.el('div', 'flex items-center gap-3 rounded-theme border px-3 py-2 ' + (on ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'));
      var tg = WB.el('button', 'flex min-w-0 flex-1 items-center gap-2 text-left'); tg.type = 'button'; tg.setAttribute('data-sound', id); tg.setAttribute('aria-pressed', on ? 'true' : 'false');
      tg.appendChild(WB.el('span', 'text-xl', SOUND_ICONS[id])); tg.appendChild(WB.el('span', 'truncate text-sm font-semibold ' + (on ? 'text-primary' : 'text-card-foreground'), t('calmSnd_' + id)));
      tg.addEventListener('click', function () { if (on) delete pref.mix[id]; else pref.mix[id] = 0.5; save(); applyMix(); renderSleep(); });
      row.appendChild(tg);
      var rg = WB.el('input', 'h-1.5 w-28 shrink-0 accent-[rgb(57,215,255)]'); rg.type = 'range'; rg.min = '5'; rg.max = '100'; rg.value = String(Math.round((vol || 0.5) * 100)); rg.disabled = !on; rg.setAttribute('aria-label', t('calmVolume') + ' ' + t('calmSnd_' + id));
      rg.addEventListener('input', function () { pref.mix[id] = parseInt(rg.value, 10) / 100; if (S.run) layerSet(id, pref.mix[id]); });
      rg.addEventListener('change', save);
      row.appendChild(rg); list.appendChild(row);
    });
    seg($('sleep-timer'), TIMERS.map(function (m) { return { v: m, label: m ? m + ' ' + t('calmMinShort') : '∞' }; }), pref.timer, function (v) { pref.timer = v; save(); if (S.run) { S.endAt = v ? Date.now() + v * 60000 : 0; } renderSleep(); }, 'h-10');
    $('sleep-go-label').textContent = t(S.run ? 'calmSleepStop' : 'calmSleepStart');
    $('sleep-go').querySelector('iconify-icon').setAttribute('icon', S.run ? 'lucide:square' : 'lucide:moon');
  }
  function applyMix() { if (!S.run) return; SOUND_IDS.forEach(function (id) { layerSet(id, pref.mix[id] || 0); }); }
  function sleepTick() {
    if (!S.run) return;
    if (S.endAt) {
      var left = (S.endAt - Date.now()) / 1000;
      $('sleep-left').textContent = t('calmSleepLeft', { t: WB.fmtDur(left) });
      if (left <= 15 && !S.fading) { S.fading = true; layersStopAll(Math.max(1, left)); }
      if (left <= 0) stopSleep(true);
    } else $('sleep-left').textContent = t('calmSleepPlaying');
    var d = new Date(); $('dim-time').textContent = WB.pad(d.getHours()) + ':' + WB.pad(d.getMinutes());
  }
  function startSleep() {
    if (S.run) return; if (!Object.keys(pref.mix).length) { pref.mix = { rain: 0.6 }; save(); }
    var ac = ctx(); if (!ac) { WB.toast(t('calmNoAudio')); return; }
    master.gain.cancelScheduledValues(ac.currentTime); master.gain.value = 1;
    S.run = true; S.fading = false; S.started = Date.now(); S.endAt = pref.timer ? Date.now() + pref.timer * 60000 : 0;
    WB.wakeOn(); applyMix(); renderSleep(); clearInterval(S.tick); S.tick = setInterval(sleepTick, 500); sleepTick();
  }
  function stopSleep(auto) {
    if (!S.run) return; S.run = false; clearInterval(S.tick); WB.wakeOff();
    var spent = (Date.now() - S.started) / 1000; addSeconds('sleep', spent);
    if (!S.fading) layersStopAll(1.2); S.fading = false;
    $('sleep-left').textContent = auto ? t('calmSleepEnded') : ''; hideDim(); renderSleep();
  }
  $('sleep-go').addEventListener('click', function () { if (S.run) stopSleep(false); else startSleep(); });
  function showDim() { if (!S.run) startSleep(); $('dim').classList.remove('hidden'); $('dim').classList.add('flex'); sleepTick(); }
  function hideDim() { $('dim').classList.add('hidden'); $('dim').classList.remove('flex'); }
  $('sleep-dim').addEventListener('click', showDim);
  $('dim').addEventListener('click', hideDim);
  $('dim').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') hideDim(); });

  // Ekran kilitlenince/gizlenince: zamanlayıcıları bozmadan devam (sesi WebView durdurabilir)
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    if (AC && AC.state === 'suspended' && (S.run || (M.run && !M.paused && !M.prep))) { try { AC.resume(); } catch (e) {} }
    if (S.run || M.run || B.run) WB.wakeOn();
    renderStats();
  });

  function renderAll() { renderPatterns(); renderMedOptions(); renderSleep(); renderStats(); if (!B.run) setBreathIdle(); if (!M.run) medIdle(); }
  window.addEventListener('one-lang-changed', renderAll);
  window.addEventListener('pagehide', function () { if (B.run) finishBreath(false); if (M.run) finishMed(false); if (S.run) stopSleep(false); });
  showTab(['breath', 'med', 'sleep'].indexOf(pref.tab) >= 0 ? pref.tab : 'breath');
  if (/#(sleep|uyku)/.test(location.hash)) showTab('sleep'); else if (/#(med|meditasyon)/.test(location.hash)) showTab('med');
  renderAll();
  // test/diagnostik için
  window.__calm = { add: addSeconds, pref: pref, layers: function () { return Object.keys(layers); }, state: function () { return { b: B.run, m: M.run, s: S.run }; } };
})();
