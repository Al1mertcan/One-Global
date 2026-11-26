/* Hemcan — Kelime avı (harf tablosunda kelime bulma). Tamamen çevrimdışı; yalnızca bu telefonda ("one-kelime") rekor tutar. */
(function () {
  'use strict';
  var WB = window.WB, $ = WB.$, t = WB.t;
  var KEY = 'one-kelime', LV = ['easy', 'medium', 'hard'], LVKEY = { easy: 'mgEasy', medium: 'mgMedium', hard: 'mgHard' };
  var CFG = { easy: { n: 8, words: 6, maxLen: 6, dirs: [[0, 1], [1, 0]] },
              medium: { n: 10, words: 8, maxLen: 8, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1]] },
              hard: { n: 12, words: 10, maxLen: 10, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]] } };
  var COLORS = ['#39D7FF', '#A78BFA', '#3DDBA5', '#F2B66D', '#70A7FF', '#FF8FB1', '#B7E36B', '#FFD166', '#FF9F6B', '#7DE3D2'];
  var ALPHA = { tr: 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ', en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' };

  var WORDS = {
    tr: {
      animals: 'kedi köpek aslan kaplan zürafa tavşan koyun ördek kartal yunus penguen maymun geyik tilki kurbağa karınca kuzu horoz',
      fruits: 'elma armut çilek kiraz üzüm portakal mandalina karpuz kavun şeftali kayısı incir limon ayva erik vişne ahududu',
      nature: 'ağaç çiçek deniz orman bulut yağmur rüzgar güneş yıldız nehir çimen vadi şelale okyanus kumsal gökyüzü mağara çöl',
      food: 'ekmek peynir zeytin çorba pilav makarna börek baklava kebap simit yoğurt salata mantı lahmacun pide tatlı köfte domates patates biber',
      home: 'masa sandalye koltuk yatak dolap halı perde lamba kitaplık ayna saat bardak tabak kaşık çatal buzdolabı pencere kapı',
      jobs: 'doktor öğretmen mühendis avukat pilot aşçı ressam şoför çiftçi hemşire berber terzi marangoz itfaiyeci polis garson gazeteci'
    },
    en: {
      animals: 'lion tiger zebra rabbit horse sheep eagle dolphin penguin monkey turtle giraffe elephant wolf bear deer fox duck panda koala',
      fruits: 'apple pear cherry grape orange lemon melon peach banana mango plum berry apricot coconut papaya lime fig kiwi',
      nature: 'tree flower ocean forest cloud rain wind sun star river grass valley waterfall beach desert cave meadow island lake',
      food: 'bread cheese olive soup rice pasta pizza salad butter honey cake cookie tomato potato pepper burger noodle',
      home: 'table chair sofa bed closet carpet curtain lamp mirror clock glass plate spoon fork window door kitchen shelf',
      jobs: 'doctor teacher engineer lawyer pilot cook painter driver farmer nurse barber tailor police waiter baker singer'
    }
  };
  var THEMES = ['animals', 'fruits', 'nature', 'food', 'home', 'jobs'];

  var S = WB.load(KEY, null) || {}; S.v = 1; S.best = S.best || {}; S.solved = S.solved || {};
  function save() { WB.save(KEY, S); }
  function mk(tag, cls, text) { return WB.el(tag, cls, text); }
  function lang() { return WB.lang() === 'tr' ? 'tr' : 'en'; }
  function up(s) { return lang() === 'tr' ? s.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase() : s.toUpperCase(); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function clock(sec) { return WB.fmtDur(sec); }

  // ---------- bulmaca üretimi ----------
  function build(lv) {
    var cfg = CFG[lv], n = cfg.n, L = lang();
    for (var tries = 0; tries < 60; tries++) {
      var theme = THEMES[rnd(THEMES.length)];
      var pool = WORDS[L][theme].split(' ').filter(function (w) { return up(w).length <= cfg.maxLen && up(w).length >= 4; });
      if (pool.length < cfg.words) continue;
      var picks = shuffle(pool).slice(0, cfg.words).map(up).sort(function (a, b) { return b.length - a.length; });
      var grid = []; for (var i = 0; i < n * n; i++) grid.push('');
      var placed = [], ok = true;
      for (var wi = 0; wi < picks.length && ok; wi++) {
        var w = picks[wi], done = false;
        for (var at = 0; at < 300 && !done; at++) {
          var d = cfg.dirs[rnd(cfg.dirs.length)], r0 = rnd(n), c0 = rnd(n);
          var r1 = r0 + d[0] * (w.length - 1), c1 = c0 + d[1] * (w.length - 1);
          if (r1 < 0 || r1 >= n || c1 < 0 || c1 >= n) continue;
          var fit = true, cells = [];
          for (var k = 0; k < w.length; k++) {
            var idx = (r0 + d[0] * k) * n + (c0 + d[1] * k);
            if (grid[idx] && grid[idx] !== w.charAt(k)) { fit = false; break; }
            cells.push(idx);
          }
          if (!fit) continue;
          // aynı doğrultuda tamamen üst üste binmesin (aynı kelime iki kez bulunmasın)
          cells.forEach(function (idx2, k2) { grid[idx2] = w.charAt(k2); });
          placed.push({ word: w, cells: cells, found: false, color: -1 }); done = true;
        }
        if (!done) ok = false;
      }
      if (!ok) continue;
      var al = ALPHA[L];
      for (var g = 0; g < grid.length; g++) if (!grid[g]) grid[g] = al.charAt(rnd(al.length));
      return { lv: lv, n: n, theme: theme, grid: grid, words: placed, hints: 3 };
    }
    return null;
  }

  // ---------- görünüm ----------
  var view = null, cur = null, timer = null, last = 0, active = 0, cellEls = [], sel = [], anchor = null, dragging = false, hintCell = -1;
  function show(v) {
    view = v;
    [['home', 'kw-home'], ['play', 'kw-play'], ['done', 'kw-done']].forEach(function (p) { $(p[1]).classList.toggle('hidden', p[0] !== v); });
    if (v !== 'play') { stopTimer(); WB.wakeOff && WB.wakeOff(); }
  }
  function renderHome() {
    var ul = $('kw-cards'); ul.innerHTML = '';
    LV.forEach(function (lv) {
      var li = mk('li', 'rounded-[20px] border border-border bg-card p-3'), row = mk('div', 'flex items-center justify-between gap-3'), left = mk('div', '');
      left.appendChild(mk('p', 'font-heading text-base font-semibold', t(LVKEY[lv])));
      left.appendChild(mk('p', 'text-[11px] text-muted-foreground', t('kwWords', { n: CFG[lv].words, g: CFG[lv].n })));
      var b = S.best[lv];
      left.appendChild(mk('p', 'mt-0.5 text-[11px] font-semibold ' + (b ? 'text-chart5' : 'text-muted-foreground'), b ? t('mgBest', { t: clock(b) }) : t('mgNoBest')));
      row.appendChild(left);
      var btn = mk('button', 'h-11 min-w-[110px] rounded-theme bg-primary px-4 text-sm font-bold text-primary-foreground', t('mgPlay'));
      btn.type = 'button'; btn.setAttribute('data-level', lv); btn.addEventListener('click', function () { start(lv); });
      row.appendChild(btn); li.appendChild(row);
      if (S.solved[lv]) li.appendChild(mk('p', 'mt-2 text-[11px] text-muted-foreground', t('mgPlayed', { n: S.solved[lv] })));
      ul.appendChild(li);
    });
  }

  function start(lv) {
    var p = build(lv); if (!p) return;
    cur = p; cur.active = 0; sel = []; anchor = null; hintCell = -1;
    buildGrid(); buildWords(); paint(); updateProgress(); show('play'); startTimer(); WB.wakeOn && WB.wakeOn();
  }
  function buildGrid() {
    var g = $('kw-grid'); g.innerHTML = ''; g.style.gridTemplateColumns = 'repeat(' + cur.n + ', minmax(0, 1fr))'; cellEls = [];
    var fs = cur.n <= 8 ? 'text-lg' : cur.n <= 10 ? 'text-base' : 'text-sm';
    cur.grid.forEach(function (ch, i) {
      var c = mk('div', 'flex aspect-square items-center justify-center font-heading font-bold ' + fs, ch);
      c.setAttribute('role', 'gridcell'); g.appendChild(c); cellEls.push(c);
    });
    $('kw-theme').textContent = t('kwTheme', { name: t('kwT_' + cur.theme) }) + ' · ' + t(LVKEY[cur.lv]);
  }
  function buildWords() {
    var ul = $('kw-words'); ul.innerHTML = '';
    cur.words.slice().sort(function (a, b) { return a.word < b.word ? -1 : 1; }).forEach(function (w) {
      var li = mk('li', 'rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wide', w.word); li.setAttribute('data-word', w.word); w.li = li; ul.appendChild(li);
    });
  }
  function paint() {
    var found = {};
    cur.words.forEach(function (w) { if (w.found) w.cells.forEach(function (i) { found[i] = w.color; }); });
    var inSel = {}; sel.forEach(function (i) { inSel[i] = true; });
    cellEls.forEach(function (c, i) {
      var f = found[i], s = !!inSel[i], a = anchor === i, h = hintCell === i;
      c.style.background = s ? 'rgba(255,255,255,0.28)' : (f != null ? COLORS[f % COLORS.length] + '55' : '');
      c.style.color = f != null && !s ? '#fff' : '';
      c.style.boxShadow = a ? 'inset 0 0 0 2px #39D7FF' : h ? 'inset 0 0 0 3px #F2B66D' : '';
      c.style.transition = 'background .15s';
    });
    cur.words.forEach(function (w) {
      w.li.className = 'rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wide ' + (w.found ? 'border-success/50 bg-success/10 text-success line-through' : 'border-border bg-card text-card-foreground');
    });
    $('kw-hint').textContent = t('kwHint', { n: cur.hints }); $('kw-hint').disabled = cur.hints <= 0;
    $('kw-hint').classList.toggle('opacity-50', cur.hints <= 0);
  }
  function updateProgress() {
    var a = cur.words.filter(function (w) { return w.found; }).length;
    $('kw-progress').textContent = t('kwFoundOf', { a: a, b: cur.words.length });
  }

  // ---------- zaman ----------
  function tick() { var now = Date.now(); if (last) cur.active += (now - last) / 1000; last = now; $('kw-clock').textContent = clock(Math.floor(cur.active)); }
  function startTimer() { stopTimer(); last = Date.now(); timer = setInterval(tick, 500); tick(); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } last = 0; }
  document.addEventListener('visibilitychange', function () { if (view !== 'play') return; if (document.hidden) { tick(); stopTimer(); } else startTimer(); });

  // ---------- seçim ----------
  function cellAt(ev) {
    var r = $('kw-grid').getBoundingClientRect(), n = cur.n;
    var x = (ev.clientX - r.left) / r.width * n, y = (ev.clientY - r.top) / r.height * n;
    if (x < 0 || y < 0 || x >= n || y >= n) return null;
    return { r: Math.floor(y), c: Math.floor(x) };
  }
  function line(a, b) { // a'dan b'ye en yakın 8 yönlü doğru üzerindeki hücreler
    var n = cur.n, dr = b.r - a.r, dc = b.c - a.c;
    if (!dr && !dc) return [a.r * n + a.c];
    var step = Math.round(Math.atan2(dr, dc) / (Math.PI / 4)), ang = step * Math.PI / 4;
    var sr = Math.round(Math.sin(ang)), sc = Math.round(Math.cos(ang));
    var len = Math.max(Math.abs(dr), Math.abs(dc)), out = [];
    for (var k = 0; k <= len; k++) {
      var r = a.r + sr * k, c = a.c + sc * k;
      if (r < 0 || r >= n || c < 0 || c >= n) break;
      out.push(r * n + c);
    }
    return out;
  }
  function aligned(a, b) { var dr = Math.abs(b.r - a.r), dc = Math.abs(b.c - a.c); return dr === 0 || dc === 0 || dr === dc; }
  var startCell = null;
  function onDown(ev) {
    if (view !== 'play') return;
    var c = cellAt(ev); if (!c) return;
    ev.preventDefault(); try { $('kw-grid').setPointerCapture(ev.pointerId); } catch (e) {}
    dragging = true; startCell = c; hintCell = -1; sel = [c.r * cur.n + c.c]; paint();
  }
  function onMove(ev) {
    if (!dragging) return;
    var c = cellAt(ev); if (!c) return;
    sel = line(startCell, c); paint();
  }
  function onUp(ev) {
    if (!dragging) return; dragging = false;
    var c = cellAt(ev) || startCell;
    if (sel.length <= 1) { // dokun-dokun kipi
      var idx = startCell.r * cur.n + startCell.c;
      if (anchor != null && anchor !== idx) {
        var a = { r: Math.floor(anchor / cur.n), c: anchor % cur.n };
        if (aligned(a, startCell)) { sel = line(a, startCell); anchor = null; evaluate(); return; }
      }
      anchor = idx; sel = []; paint(); return;
    }
    anchor = null; evaluate();
  }
  function evaluate() {
    var s = sel.map(function (i) { return cur.grid[i]; }).join(''), rev = s.split('').reverse().join(''), hit = null;
    cur.words.forEach(function (w) { if (!w.found && (w.word === s || w.word === rev) && w.cells.length === sel.length) hit = w; });
    if (hit) {
      hit.found = true; hit.color = cur.words.filter(function (w) { return w.found; }).length - 1; WB.vibrate(15); sel = []; paint(); updateProgress();
      if (cur.words.every(function (w) { return w.found; })) finish();
    } else {
      var bad = sel.slice(); WB.vibrate(6);
      bad.forEach(function (i) { cellEls[i].style.background = 'rgba(255,101,122,0.35)'; });
      setTimeout(function () { sel = []; paint(); }, 220);
    }
  }
  function hint() {
    if (view !== 'play' || cur.hints <= 0) return;
    var left = cur.words.filter(function (w) { return !w.found; }); if (!left.length) return;
    var w = left[rnd(left.length)]; cur.hints--; hintCell = w.cells[0]; paint();
    setTimeout(function () { if (hintCell === w.cells[0]) { hintCell = -1; paint(); } }, 3500);
  }
  function finish() {
    tick(); stopTimer(); WB.wakeOff && WB.wakeOff();
    var secs = Math.max(1, Math.round(cur.active)), lv = cur.lv, prev = S.best[lv], nb = !prev || secs < prev;
    S.solved[lv] = (S.solved[lv] || 0) + 1; if (nb) S.best[lv] = secs; save(); WB.vibrate([40, 60, 40]);
    $('kw-done-time').textContent = t('mgTime', { t: clock(secs) });
    $('kw-done-best').textContent = nb && prev ? t('mgNewBest') : (S.best[lv] ? t('mgBest', { t: clock(S.best[lv]) }) : '');
    show('done');
  }

  // ---------- olaylar ----------
  var g = $('kw-grid');
  g.addEventListener('pointerdown', onDown); g.addEventListener('pointermove', onMove);
  g.addEventListener('pointerup', onUp); g.addEventListener('pointercancel', function () { dragging = false; sel = []; paint(); });
  $('kw-menu').addEventListener('click', function () { show('home'); renderHome(); });
  $('kw-done-menu').addEventListener('click', function () { show('home'); renderHome(); });
  $('kw-new').addEventListener('click', function () { if (cur) start(cur.lv); });
  $('kw-done-again').addEventListener('click', function () { if (cur) start(cur.lv); });
  $('kw-hint').addEventListener('click', hint);
  window.addEventListener('pagehide', function () { save(); });
  window.addEventListener('one-lang-changed', function () {
    if (view === 'home') renderHome();
    else if (view === 'play') { cur = null; show('home'); renderHome(); } // dil değişince kelimeler de değişir
    else if (view === 'done') { show('home'); renderHome(); }
  });

  window.__kelime = { cur: function () { return cur; }, view: function () { return view; }, state: function () { return S; },
    solveAll: function () { cur.words.forEach(function (w) { w.found = true; w.color = 0; }); paint(); updateProgress(); finish(); } };
  show('home'); renderHome();
})();
