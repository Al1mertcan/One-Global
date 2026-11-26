/* Hemcan — Hafıza kartları. Tamamen çevrimdışı; yalnızca bu telefonda ("one-hafiza") rekor tutar. */
(function () {
  'use strict';
  var WB = window.WB, $ = WB.$, t = WB.t;
  var KEY = 'one-hafiza', LV = ['easy', 'medium', 'hard'], LVKEY = { easy: 'mgEasy', medium: 'mgMedium', hard: 'mgHard' };
  var CFG = { easy: { pairs: 6, cols: 4 }, medium: { pairs: 8, cols: 4 }, hard: { pairs: 10, cols: 5 } };
  var EMOJI = ['🐶', '🐱', '🐼', '🦊', '🐸', '🐵', '🦁', '🐯', '🐰', '🐨', '🐧', '🐢', '🦋', '🐝', '🐬', '🦉', '🍎', '🍓', '🍋', '🍇', '🍉', '🍒', '🥝', '🍑', '🌻', '🌹', '🍄', '🌵', '⭐', '🌙', '☀️', '🌈', '⚽', '🎈', '🎵', '🚲'];

  var S = WB.load(KEY, null) || {}; S.v = 1; S.best = S.best || {}; S.solved = S.solved || {};
  function save() { WB.save(KEY, S); }
  function mk(tag, cls, text) { return WB.el(tag, cls, text); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function clock(sec) { return WB.fmtDur(sec); }

  var view = null, cur = null, timer = null, last = 0, lock = false, open = [];
  function show(v) {
    view = v;
    [['home', 'hf-home'], ['play', 'hf-play'], ['done', 'hf-done']].forEach(function (p) { $(p[1]).classList.toggle('hidden', p[0] !== v); });
    if (v !== 'play') { stopTimer(); WB.wakeOff && WB.wakeOff(); }
  }
  function renderHome() {
    var ul = $('hf-cards'); ul.innerHTML = '';
    LV.forEach(function (lv) {
      var li = mk('li', 'rounded-[20px] border border-border bg-card p-3'), row = mk('div', 'flex items-center justify-between gap-3'), left = mk('div', '');
      left.appendChild(mk('p', 'font-heading text-base font-semibold', t(LVKEY[lv])));
      left.appendChild(mk('p', 'text-[11px] text-muted-foreground', t('hfPairs', { n: CFG[lv].pairs })));
      var b = S.best[lv];
      left.appendChild(mk('p', 'mt-0.5 text-[11px] font-semibold ' + (b ? 'text-chart5' : 'text-muted-foreground'), b ? t('hfBest', { m: b.moves, t: clock(b.secs) }) : t('mgNoBest')));
      row.appendChild(left);
      var btn = mk('button', 'h-11 min-w-[110px] rounded-theme bg-primary px-4 text-sm font-bold text-primary-foreground', t('mgPlay'));
      btn.type = 'button'; btn.setAttribute('data-level', lv); btn.addEventListener('click', function () { start(lv); });
      row.appendChild(btn); li.appendChild(row);
      if (S.solved[lv]) li.appendChild(mk('p', 'mt-2 text-[11px] text-muted-foreground', t('mgPlayed', { n: S.solved[lv] })));
      ul.appendChild(li);
    });
  }

  function start(lv) {
    var cfg = CFG[lv], faces = shuffle(EMOJI.slice()).slice(0, cfg.pairs), deck = shuffle(faces.concat(faces));
    cur = { lv: lv, deck: deck, done: deck.map(function () { return false; }), moves: 0, active: 0, started: false, matched: 0 };
    open = []; lock = false;
    var g = $('hf-grid'); g.innerHTML = ''; g.style.gridTemplateColumns = 'repeat(' + cfg.cols + ', minmax(0, 1fr))';
    deck.forEach(function (f, i) {
      var b = mk('button', 'flex aspect-square items-center justify-center rounded-xl border border-border bg-card text-2xl font-bold text-primary transition-transform', '?');
      b.type = 'button'; b.setAttribute('data-card', i); b.setAttribute('aria-label', t('hfCard', { n: i + 1 }));
      b.addEventListener('click', function () { flip(i); }); g.appendChild(b);
    });
    $('hf-info').textContent = t(LVKEY[lv]) + ' · ' + t('hfMoves', { n: 0 }); $('hf-clock').textContent = '0:00';
    show('play'); WB.wakeOn && WB.wakeOn();
  }
  function cardEl(i) { return $('hf-grid').children[i]; }
  function paint(i, face) {
    var b = cardEl(i);
    b.textContent = face ? cur.deck[i] : '?';
    b.className = 'flex aspect-square items-center justify-center rounded-xl border text-2xl font-bold transition-transform ' +
      (cur.done[i] ? 'border-success/50 bg-success/10' : face ? 'border-primary/60 bg-input' : 'border-border bg-card text-primary');
  }
  function flip(i) {
    if (view !== 'play' || lock || cur.done[i] || open.indexOf(i) >= 0) return;
    if (!cur.started) { cur.started = true; startTimer(); }
    open.push(i); paint(i, true); WB.vibrate(5);
    if (open.length === 2) {
      cur.moves++; $('hf-info').textContent = t(LVKEY[cur.lv]) + ' · ' + t('hfMoves', { n: cur.moves });
      var a = open[0], b = open[1];
      if (cur.deck[a] === cur.deck[b]) {
        cur.done[a] = cur.done[b] = true; cur.matched++; open = []; paint(a, true); paint(b, true); WB.vibrate(15);
        if (cur.matched === CFG[cur.lv].pairs) finish();
      } else {
        lock = true;
        setTimeout(function () { paint(a, false); paint(b, false); open = []; lock = false; }, 750);
      }
    }
  }
  function tick() { var now = Date.now(); if (last) cur.active += (now - last) / 1000; last = now; $('hf-clock').textContent = clock(Math.floor(cur.active)); }
  function startTimer() { stopTimer(); last = Date.now(); timer = setInterval(tick, 500); tick(); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } last = 0; }
  document.addEventListener('visibilitychange', function () { if (view !== 'play' || !cur || !cur.started) return; if (document.hidden) { tick(); stopTimer(); } else startTimer(); });
  function finish() {
    tick(); stopTimer(); WB.wakeOff && WB.wakeOff();
    var secs = Math.max(1, Math.round(cur.active)), lv = cur.lv, prev = S.best[lv];
    var nb = !prev || cur.moves < prev.moves || (cur.moves === prev.moves && secs < prev.secs);
    S.solved[lv] = (S.solved[lv] || 0) + 1; if (nb) S.best[lv] = { moves: cur.moves, secs: secs }; save(); WB.vibrate([40, 60, 40]);
    $('hf-done-time').textContent = t('hfResult', { m: cur.moves, t: clock(secs) });
    var b = S.best[lv]; $('hf-done-best').textContent = nb && prev ? t('mgNewBest') : t('hfBest', { m: b.moves, t: clock(b.secs) });
    setTimeout(function () { if (view === 'play') show('done'); }, 600);
  }

  $('hf-menu').addEventListener('click', function () { show('home'); renderHome(); });
  $('hf-done-menu').addEventListener('click', function () { show('home'); renderHome(); });
  $('hf-new').addEventListener('click', function () { if (cur) start(cur.lv); });
  $('hf-done-again').addEventListener('click', function () { if (cur) start(cur.lv); });
  window.addEventListener('pagehide', save);
  window.addEventListener('one-lang-changed', function () { if (view === 'home') renderHome(); else if (view === 'play') $('hf-info').textContent = t(LVKEY[cur.lv]) + ' · ' + t('hfMoves', { n: cur.moves }); });
  window.__hafiza = { cur: function () { return cur; }, view: function () { return view; }, state: function () { return S; }, flip: flip, solveAll: function () {
    var d = cur.deck, seen = {}; for (var i = 0; i < d.length; i++) { if (seen[d[i]] == null) seen[d[i]] = i; else { flip(seen[d[i]]); flip(i); } } } };
  show('home'); renderHome();
})();
