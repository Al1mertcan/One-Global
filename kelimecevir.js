/* Hemcan — Kelime çevirmece. Çevrimdışı; yalnızca bu telefonda ("one-cevir") rekor tutar. */
(function () {
  'use strict';
  var WB = window.WB, $ = WB.$, t = WB.t, KEY = 'one-cevir', LV = ['easy', 'medium', 'hard'], LVKEY = { easy: 'mgEasy', medium: 'mgMedium', hard: 'mgHard' };
  var LEN = { easy: 5, medium: 6, hard: 7 }, ROUNDS = 8, PENALTY = 10;
  var S = WB.load(KEY, null) || {}; S.v = 1; S.best = S.best || {}; S.solved = S.solved || {};
  function save() { WB.save(KEY, S); }
  function mk(tag, cls, text) { return WB.el(tag, cls, text); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function lang() { return WB.lang() === 'tr' ? 'tr' : 'en'; }
  function up(s) { return s.toLocaleUpperCase(lang()); }
  function pool(l, n) { // tüm listelerdeki kelimeleri gerçek uzunluğa göre ayır
    var src = window.WB_SCR[l], seen = {}, out = [];
    Object.keys(src).forEach(function (k) { src[k].split(/\s+/).forEach(function (w) { if (w && !seen[w] && Array.from(w).length === n) { seen[w] = 1; out.push(w); } }); });
    return out;
  }
  var view = null, cur = null, timer = null, last = 0;
  function show(v) {
    view = v;
    [['home', 'sc-home'], ['play', 'sc-play'], ['done', 'sc-done']].forEach(function (p) { $(p[1]).classList.toggle('hidden', p[0] !== v); });
    if (v !== 'play') { stopTimer(); WB.wakeOff && WB.wakeOff(); }
  }
  function renderHome() {
    var ul = $('sc-cards'); ul.innerHTML = '';
    LV.forEach(function (lv) {
      var li = mk('li', 'rounded-[20px] border border-border bg-card p-3'), row = mk('div', 'flex items-center justify-between gap-3'), left = mk('div', '');
      left.appendChild(mk('p', 'font-heading text-base font-semibold', t(LVKEY[lv])));
      left.appendChild(mk('p', 'text-[11px] text-muted-foreground', t('scLen', { n: LEN[lv] })));
      var b = S.best[lv]; left.appendChild(mk('p', 'mt-0.5 text-[11px] font-semibold ' + (b ? 'text-chart5' : 'text-muted-foreground'), b ? t('mgBest', { t: WB.fmtDur(b) }) : t('mgNoBest')));
      row.appendChild(left);
      var btn = mk('button', 'h-11 min-w-[110px] rounded-theme bg-primary px-4 text-sm font-bold text-primary-foreground', t('mgPlay'));
      btn.type = 'button'; btn.setAttribute('data-level', lv); btn.addEventListener('click', function () { start(lv); });
      row.appendChild(btn); li.appendChild(row);
      if (S.solved[lv]) li.appendChild(mk('p', 'mt-2 text-[11px] text-muted-foreground', t('mgPlayed', { n: S.solved[lv] })));
      ul.appendChild(li);
    });
  }
  function start(lv) {
    var l = lang(), words = shuffle(pool(l, LEN[lv])).slice(0, ROUNDS);
    cur = { lv: lv, lang: l, words: words, round: 0, hints: 0, active: 0, started: false, words_all: pool(l, LEN[lv]) };
    show('play'); WB.wakeOn && WB.wakeOn(); nextRound(); $('sc-clock').textContent = '0:00';
  }
  function scramble(w) { var a = Array.from(w), s, tries = 0; do { s = shuffle(a.slice()); tries++; } while (s.join('') === w && tries < 20); return s; }
  function nextRound() {
    var w = cur.words[cur.round]; cur.target = w; cur.letters = scramble(w); cur.used = []; cur.hintN = 0; // used: sıra ile seçilen karo indeksleri
    $('sc-msg').textContent = ''; paint();
  }
  function info() { $('sc-info').textContent = t(LVKEY[cur.lv]) + ' · ' + t('scRound', { a: cur.round + 1, b: ROUNDS }); }
  function paint() {
    info(); var n = cur.letters.length, slots = $('sc-slots'), tiles = $('sc-tiles'); slots.innerHTML = ''; tiles.innerHTML = '';
    for (var i = 0; i < n; i++) {
      var li = cur.used[i], s = mk('button', 'flex h-12 w-11 items-center justify-center rounded-lg border-2 text-xl font-extrabold ' + (li != null ? 'border-primary/70 bg-input' : 'border-border bg-card'), li != null ? up(cur.letters[li]) : '');
      s.type = 'button'; s.setAttribute('data-slot', i); s.setAttribute('aria-label', t('scSlot', { n: i + 1 }));
      (function (k) { s.addEventListener('click', function () { removeAt(k); }); })(i); slots.appendChild(s);
    }
    cur.letters.forEach(function (ch, idx) {
      var used = cur.used.indexOf(idx) >= 0, b = mk('button', 'flex h-12 w-12 items-center justify-center rounded-xl border-2 text-xl font-extrabold ' + (used ? 'border-border bg-card text-muted-foreground opacity-30' : 'border-primary/60 bg-secondary text-primary'), up(ch));
      b.type = 'button'; b.setAttribute('data-tile', idx); b.disabled = used; b.setAttribute('aria-label', t('scLetter', { n: idx + 1 }) + ' ' + up(ch));
      b.addEventListener('click', function () { pick(idx); }); tiles.appendChild(b);
    });
  }
  function startClock() { if (!cur.started) { cur.started = true; startTimer(); } }
  function pick(idx) {
    if (view !== 'play' || cur.used.indexOf(idx) >= 0 || cur.used.length >= cur.letters.length) return;
    startClock(); cur.used.push(idx); WB.vibrate(5); paint(); if (cur.used.length === cur.letters.length) check();
  }
  function removeAt(slot) { if (view !== 'play' || slot >= cur.used.length) return; cur.used.splice(slot, 1); $('sc-msg').textContent = ''; paint(); }
  function formed() { return cur.used.map(function (i) { return cur.letters[i]; }).join(''); }
  function check() {
    var w = formed();
    if (w === cur.target || cur.words_all.indexOf(w) >= 0 && Array.from(w).sort().join('') === Array.from(cur.target).sort().join('')) {
      WB.vibrate(20); cur.round++;
      if (cur.round >= ROUNDS) finish(); else nextRound();
    } else { $('sc-msg').textContent = t('scWrong'); WB.vibrate([30, 40, 30]); cur.used = []; setTimeout(paint, 450); }
  }
  $('sc-hint').addEventListener('click', function () {
    if (view !== 'play') return; startClock();
    // doğru öneki koru, yanlış harfleri geri al, sonraki doğru harfi yerleştir
    var tgt = Array.from(cur.target), keep = 0;
    while (keep < cur.used.length && cur.letters[cur.used[keep]] === tgt[keep]) keep++;
    cur.used = cur.used.slice(0, keep); if (keep >= tgt.length) return;
    for (var i = 0; i < cur.letters.length; i++) if (cur.used.indexOf(i) < 0 && cur.letters[i] === tgt[keep]) { cur.used.push(i); break; }
    cur.hints++; paint(); if (cur.used.length === cur.letters.length) check();
  });
  $('sc-shuffle').addEventListener('click', function () { if (view !== 'play') return; cur.used = []; cur.letters = scramble(cur.target); $('sc-msg').textContent = ''; paint(); });
  $('sc-back').addEventListener('click', function () { if (view === 'play' && cur.used.length) { cur.used.pop(); $('sc-msg').textContent = ''; paint(); } });
  function tick() { var now = Date.now(); if (last) cur.active += (now - last) / 1000; last = now; $('sc-clock').textContent = WB.fmtDur(Math.floor(cur.active + cur.hints * PENALTY)); }
  function startTimer() { stopTimer(); last = Date.now(); timer = setInterval(tick, 500); tick(); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } last = 0; }
  document.addEventListener('visibilitychange', function () { if (view !== 'play' || !cur || !cur.started) return; if (document.hidden) { tick(); stopTimer(); } else startTimer(); });
  function finish() {
    tick(); stopTimer(); WB.wakeOff && WB.wakeOff();
    var secs = Math.max(1, Math.round(cur.active + cur.hints * PENALTY)), lv = cur.lv, prev = S.best[lv], nb = !prev || secs < prev;
    S.solved[lv] = (S.solved[lv] || 0) + 1; if (nb) S.best[lv] = secs; save(); WB.vibrate([40, 60, 40]);
    $('sc-done-time').textContent = t('scResult', { t: WB.fmtDur(secs), h: cur.hints });
    $('sc-done-best').textContent = nb && prev ? t('mgNewBest') : t('mgBest', { t: WB.fmtDur(S.best[lv]) });
    setTimeout(function () { if (view === 'play') show('done'); }, 400);
  }
  $('sc-menu').addEventListener('click', function () { show('home'); renderHome(); });
  $('sc-done-menu').addEventListener('click', function () { show('home'); renderHome(); });
  $('sc-done-again').addEventListener('click', function () { if (cur) start(cur.lv); });
  window.addEventListener('pagehide', save);
  window.addEventListener('one-lang-changed', function () { if (view === 'home') renderHome(); else if (view === 'play') info(); });
  window.__cevir = { cur: function () { return cur; }, view: function () { return view; }, state: function () { return S; }, solve: function () { cur.used = []; var l = cur.letters.slice(); Array.from(cur.target).forEach(function (ch) { for (var i = 0; i < l.length; i++) if (cur.used.indexOf(i) < 0 && l[i] === ch) { pick(i); break; } }); } };
  show('home'); renderHome();
})();
