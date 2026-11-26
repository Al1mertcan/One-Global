/* Hemcan — Nefes, meditasyon zamanlayıcısı ve uyku sesleri.
 * Tüm sesler telefonda WebAudio ile ÜRETİLİR (ses dosyası, telif veya internet gerekmez). */
(function () {
  'use strict';
  var WB = window.WB, $ = WB.$, t = WB.t;
  var KEY = 'one-calm', KEY_PREF = 'one-calm-pref';
  var pref = WB.load(KEY_PREF, { tab: 'breath', pattern: '478', bdur: 3, sound: false, haptic: true, mdur: 10, mint: 0, mamb: 'none', mix: { rain: 0.6 }, timer: 30 });

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
  var AC = null, master = null, noiseCache = {};
  function ctx() {
    if (!AC) {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      AC = new C(); master = AC.createGain(); master.gain.value = 1; master.connect(AC.destination);
    }
    if (AC.state === 'suspended') { try { AC.resume(); } catch (e) {} }
    return AC;
  }
  function noiseBuf(type) {
    if (noiseCache[type]) return noiseCache[type];
    var ac = ctx(), len = Math.floor(ac.sampleRate * 8), b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0), i;
    if (type === 'white') { for (i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
    else if (type === 'pink') { // Paul Kellet yaklaşımı
      var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (i = 0; i < len; i++) { var w = Math.random() * 2 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; }
    } else { var last = 0; for (i = 0; i < len; i++) { var x = Math.random() * 2 - 1; last = (last + 0.02 * x) / 1.02; d[i] = last * 3.5; } }
    // döngü dikişini yumuşat (son 2048 örnek başa karışır)
    var fade = 2048; for (i = 0; i < fade; i++) { var a = i / fade; d[len - fade + i] = d[len - fade + i] * (1 - a) + d[i] * a; }
    noiseCache[type] = b; return b;
  }
  function noiseSrc(type) { var ac = ctx(), s = ac.createBufferSource(); s.buffer = noiseBuf(type); s.loop = true; s.loopStart = 0; s.loopEnd = s.buffer.duration - 2048 / ac.sampleRate; s.start(0, Math.random() * 4); return s; }
  function lfo(freq, depth, target) { var ac = ctx(), o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = freq; g.gain.value = depth; o.connect(g); g.connect(target); o.start(); return o; }
  function burst(out, kind) { // kısa gürültü patlaması (yağmur damlası / ateş çıtırtısı)
    var ac = ctx(), s = ac.createBufferSource(); s.buffer = noiseBuf('white');
    var f = ac.createBiquadFilter(), g = ac.createGain(), now = ac.currentTime;
    if (kind === 'drop') { f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 4200; f.Q.value = 1.2; var v = 0.05 + Math.random() * 0.12; g.gain.setValueAtTime(v, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.03 + Math.random() * 0.04); }
    else { f.type = 'highpass'; f.frequency.value = 1200 + Math.random() * 2500; var v2 = 0.1 + Math.random() * 0.35; g.gain.setValueAtTime(v2, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.01 + Math.random() * 0.05); }
    s.connect(f); f.connect(g); g.connect(out); s.start(now, Math.random() * 6, 0.12); s.stop(now + 0.14);
  }
  // Her ses: out (GainNode) döndürür; stop() ile durur.
  var BUILD = {
    rain: function (out) {
      var timers = [], a = noiseSrc('pink'), hp = ctx().createBiquadFilter(), lp = ctx().createBiquadFilter(), g = ctx().createGain();
      hp.type = 'highpass'; hp.frequency.value = 450; lp.type = 'lowpass'; lp.frequency.value = 9000; g.gain.value = 0.55;
      a.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out);
      var alive = true; (function drop() { if (!alive) return; burst(out, 'drop'); timers[0] = setTimeout(drop, 25 + Math.random() * 90); })();
      return function () { alive = false; clearTimeout(timers[0]); try { a.stop(); } catch (e) {} };
    },
    ocean: function (out) {
      var a = noiseSrc('brown'), lp = ctx().createBiquadFilter(), g = ctx().createGain();
      lp.type = 'lowpass'; lp.frequency.value = 650; g.gain.value = 0.5;
      a.connect(lp); lp.connect(g); g.connect(out);
      var l1 = lfo(0.11, 0.38, g.gain), l2 = lfo(0.07, 260, lp.frequency);
      return function () { try { a.stop(); l1.stop(); l2.stop(); } catch (e) {} };
    },
    wind: function (out) {
      var a = noiseSrc('pink'), bp = ctx().createBiquadFilter(), g = ctx().createGain();
      bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.9; g.gain.value = 0.7;
      a.connect(bp); bp.connect(g); g.connect(out);
      var l1 = lfo(0.06, 220, bp.frequency), l2 = lfo(0.045, 0.3, g.gain);
      return function () { try { a.stop(); l1.stop(); l2.stop(); } catch (e) {} };
    },
    fire: function (out) {
      var a = noiseSrc('brown'), lp = ctx().createBiquadFilter(), g = ctx().createGain(), alive = true, tm;
      lp.type = 'lowpass'; lp.frequency.value = 380; g.gain.value = 0.55; a.connect(lp); lp.connect(g); g.connect(out);
      (function crackle() { if (!alive) return; burst(out, 'crack'); if (Math.random() < 0.35) burst(out, 'crack'); tm = setTimeout(crackle, 30 + Math.random() * 360); })();
      return function () { alive = false; clearTimeout(tm); try { a.stop(); } catch (e) {} };
    },
    night: function (out) {
      var ac = ctx(), alive = true, tm, oscs = [], gains = [];
      var bed = noiseSrc('pink'), bp = ac.createBiquadFilter(), bg = ac.createGain(); bp.type = 'lowpass'; bp.frequency.value = 500; bg.gain.value = 0.12; bed.connect(bp); bp.connect(bg); bg.connect(out);
      for (var i = 0; i < 3; i++) { var o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = 4100 + i * 260 + Math.random() * 80; g.gain.value = 0; o.connect(g); g.connect(out); o.start(); oscs.push(o); gains.push(g); }
      (function chirp() {
        if (!alive) return; var now = ac.currentTime, c = Math.floor(Math.random() * 3), g = gains[c], p;
        for (p = 0; p < 3; p++) { var s = now + p * 0.07; g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.05, s + 0.012); g.gain.linearRampToValueAtTime(0, s + 0.05); }
        tm = setTimeout(chirp, 250 + Math.random() * 900);
      })();
      return function () { alive = false; clearTimeout(tm); try { bed.stop(); oscs.forEach(function (o) { o.stop(); }); } catch (e) {} };
    },
    white: function (out) { var a = noiseSrc('white'), lp = ctx().createBiquadFilter(), g = ctx().createGain(); lp.type = 'lowpass'; lp.frequency.value = 11000; g.gain.value = 0.28; a.connect(lp); lp.connect(g); g.connect(out); return function () { try { a.stop(); } catch (e) {} }; },
    pink: function (out) { var a = noiseSrc('pink'), g = ctx().createGain(); g.gain.value = 0.85; a.connect(g); g.connect(out); return function () { try { a.stop(); } catch (e) {} }; },
    brown: function (out) { var a = noiseSrc('brown'), g = ctx().createGain(); g.gain.value = 0.7; a.connect(g); g.connect(out); return function () { try { a.stop(); } catch (e) {} }; }
  };
  var SOUND_ICONS = { rain: '🌧️', ocean: '🌊', wind: '🍃', fire: '🔥', night: '🦗', white: '☁️', pink: '🌫️', brown: '🌑' };
  var SOUND_IDS = ['rain', 'ocean', 'wind', 'fire', 'night', 'white', 'pink', 'brown'];
  var MIXES = [
    { id: 'rainy', mix: { rain: 0.7, night: 0.25 } }, { id: 'coast', mix: { ocean: 0.7, wind: 0.3 } },
    { id: 'cabin', mix: { fire: 0.6, rain: 0.35 } }, { id: 'deep', mix: { brown: 0.7 } }, { id: 'forest', mix: { wind: 0.4, night: 0.45 } }
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
    [{ v: 'none', label: '🔇 ' + t('calmOff') }].concat(['rain', 'ocean', 'wind', 'fire', 'night', 'brown'].map(function (id) { return { v: id, label: SOUND_ICONS[id] + ' ' + t('calmSnd_' + id) }; })).forEach(function (it) {
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
