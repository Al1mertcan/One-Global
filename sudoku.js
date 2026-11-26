/* Hemcan — Günlük sudoku. İlerleme yalnızca bu telefonda ("one-sudoku"); sıralama için sunucuya rastgele kimlik + süre gider. */
(function () {
  'use strict';
  var WB = window.WB, $ = WB.$, t = WB.t, Core = window.DailyCore, Net = window.DailyNet;
  var KEY = 'one-sudoku', LV = ['easy', 'medium', 'hard'], LVKEY = { easy: 'sdEasy', medium: 'sdMedium', hard: 'sdHard' };
  var S = WB.load(KEY, null) || {}; S.v = 1; S.days = S.days || {};
  function save() {
    var cut = WB.addDays(WB.today(), -12); Object.keys(S.days).forEach(function (k) { if (k < cut) delete S.days[k]; });
    WB.save(KEY, S);
  }
  function mk(tag, cls, text) { return WB.el(tag, cls, text); }
  function rec(day, lv) { return (S.days[day] || {})[lv] || null; }
  function setRec(day, lv, r) { (S.days[day] = S.days[day] || {})[lv] = r; }
  function clock(sec) { return WB.fmtDur(sec); }
  function game(lv) { return 'sudoku-' + lv; }

  // ---------- ortak: sıralama metni ----------
  function rankText(res) {
    if (!res) return t('dlRankLoading');
    if (res.status === 'ready') return res.rank === 1 ? t('dlRankFirst', { t: res.total }) : t('dlRankReady', { n: res.rank, t: res.total });
    if (res.status === 'pending') return t('dlRankPending');
    if (res.status === 'invalid') return t('dlRankInvalid');
    return t('dlRankNone');
  }
  function submitText(r, day) {
    if (!r.ranked) return t('dlUnranked');
    if (r.submit === 'pending') return t('dlSendFail');
    if (r.submit === 'toofast') return t('dlTooFast');
    if (r.submit === 'closed' || r.submit === 'lost' || r.submit === 'wrong') return t('dlClosed');
    return rankText(r.res || (Date.now() < Core.publishAt(day) ? { status: 'pending' } : null));
  }

  // ---------- ana ekran ----------
  var view = null; // 'home' | 'connect' | 'play' | 'done'
  function show(v) {
    view = v;
    [['home', 'sd-home'], ['connect', 'sd-connect'], ['play', 'sd-play'], ['done', 'sd-done']].forEach(function (p) { $(p[1]).classList.toggle('hidden', p[0] !== v); });
    if (v !== 'play') { stopTimer(); WB.wakeOff && WB.wakeOff(); }
  }
  function gameDay() { return Net.today(); }
  function renderHome() {
    var day = gameDay();
    $('sd-date').textContent = WB.dateLabel(day, { day: 'numeric', month: 'long', weekday: 'long' });
    var ul = $('sd-cards'); ul.innerHTML = '';
    LV.forEach(function (lv) {
      var r = rec(day, lv), pz = Core.makeSudoku(day, lv);
      var li = mk('li', 'rounded-[20px] border border-border bg-card p-3');
      var row = mk('div', 'flex items-center justify-between gap-3');
      var left = mk('div', '');
      left.appendChild(mk('p', 'font-heading text-base font-semibold', t(LVKEY[lv])));
      left.appendChild(mk('p', 'text-[11px] text-muted-foreground', t('sdClues', { n: pz.givens })));
      row.appendChild(left);
      var done = r && r.status === 'done';
      var b = mk('button', 'h-11 min-w-[120px] rounded-theme px-4 text-sm font-bold ' + (done ? 'border border-success/40 bg-success/10 text-success' : 'bg-primary text-primary-foreground'),
        done ? t('sdDoneIn', { t: clock(r.secs) }) : t(r && r.status === 'play' ? 'sdResume' : 'sdStart'));
      b.type = 'button'; b.setAttribute('data-level', lv); b.disabled = !!done;
      b.addEventListener('click', function () { openLevel(day, lv); });
      row.appendChild(b); li.appendChild(row);
      if (done) { var m = mk('p', 'mt-2 text-[11px] font-semibold leading-5 text-card-foreground', submitText(r, day)); m.setAttribute('data-rank', lv); li.appendChild(m); }
      ul.appendChild(li);
    });
    renderPast();
  }
  function renderPast() {
    var ul = $('sd-past'); ul.innerHTML = ''; var items = [];
    Object.keys(S.days).sort().reverse().forEach(function (d) {
      LV.forEach(function (lv) { var r = rec(d, lv); if (r && r.status === 'done' && d !== gameDay()) items.push({ d: d, lv: lv, r: r }); });
    });
    if (!items.length) { ul.appendChild(mk('li', 'text-xs text-muted-foreground', t('dlNoPast'))); return; }
    items.forEach(function (it) {
      var li = mk('li', 'rounded-[16px] border border-border bg-card/70 px-3 py-2');
      li.appendChild(mk('p', 'text-xs font-semibold', WB.dateLabel(it.d, { day: 'numeric', month: 'short' }) + ' · ' + t(LVKEY[it.lv]) + ' · ' + clock(it.r.secs)));
      var p = mk('p', 'mt-0.5 text-[11px] leading-5 text-muted-foreground', submitText(it.r, it.d)); p.setAttribute('data-past-rank', it.d + '|' + it.lv); li.appendChild(p); ul.appendChild(li);
    });
  }
  // Açıklanmış günlerin sıralamasını (yoksa) sunucudan alır; bekleyen gönderimleri yeniden dener.
  function sync() {
    var now = Date.now();
    Object.keys(S.days).forEach(function (d) {
      LV.forEach(function (lv) {
        var r = rec(d, lv); if (!r || r.status !== 'done' || !r.ranked) return;
        if ((r.submit === 'pending' || r.submit === 'sending') && now < Core.publishAt(d)) { sendResult(d, lv, r); return; }
        if (r.submit === 'sent' && now >= Core.publishAt(d) && !(r.res && r.res.status === 'ready')) {
          Net.call('result', game(lv), d).then(function (x) {
            if (x.net && x.status === 200 && x.data && x.data.status) { r.res = x.data; save(); if (view === 'home') renderHome(); if (view === 'done' && cur && cur.day === d && cur.lv === lv) renderDone(); }
          });
        }
      });
    });
  }
  function sendResult(day, lv, r) {
    return Net.call('submit', game(lv), day, { grid: r.cells.map(function (v, i) { return v || Core.makeSudoku(day, lv).puzzle[i]; }), secs: r.secs }).then(function (x) {
      if (!x.net) r.submit = 'pending';
      else if (x.status === 200 && x.data.ok) r.submit = 'sent';
      else if (x.data && x.data.error === 'too_fast') r.submit = 'toofast';
      else if (x.data && x.data.error === 'closed') r.submit = 'closed';
      else if (x.data && x.data.error === 'not_started') r.submit = 'lost';
      else if (x.data && x.data.error === 'wrong') r.submit = 'wrong';
      else r.submit = 'pending';
      save(); if (view === 'home') renderHome(); if (view === 'done' && cur && cur.day === day && cur.lv === lv) renderDone();
    });
  }

  // ---------- oyun ----------
  var cur = null, cells = [], timer = null;
  function openLevel(day, lv) {
    var r = rec(day, lv);
    if (r && r.status === 'play') { beginPlay(day, lv); return; }
    if (r && r.status === 'done') return;
    // yeni deneme: önce sunucuya "start" (ilk başlangıç anı sunucuda kalır)
    show('connect'); $('sd-connect-btns').classList.add('hidden'); $('sd-connect-btns').classList.remove('grid'); $('sd-connect-msg').textContent = t('dlConnecting');
    var token = {}; connectToken = token;
    Net.call('start', game(lv), day).then(function (x) {
      if (connectToken !== token) return;
      if (x.net && x.status === 200 && x.data.ok) { newRecord(day, lv, true); beginPlay(day, lv); return; }
      if (x.net && x.status === 200 && x.data.error === 'already_done') { newRecord(day, lv, true); var rr = rec(day, lv); rr.status = 'done'; rr.secs = 0; rr.submit = 'sent'; rr.cells = []; save(); renderHome(); show('home'); return; }
      // ulaşılamadı: sıralamasız oyna ya da tekrar dene
      $('sd-connect-msg').textContent = t('dlOffline'); $('sd-connect-btns').classList.remove('hidden'); $('sd-connect-btns').classList.add('grid');
      pendingOpen = { day: day, lv: lv };
    });
  }
  var connectToken = null, pendingOpen = null;
  function newRecord(day, lv, ranked) {
    setRec(day, lv, { status: 'play', cells: new Array(81).fill(0), notes: {}, active: 0, ranked: !!ranked, secs: 0, submit: ranked ? 'none' : 'unranked', res: null });
    save();
  }
  $('sd-retry').addEventListener('click', function () { if (pendingOpen) openLevel(pendingOpen.day, pendingOpen.lv); });
  $('sd-unranked').addEventListener('click', function () { if (pendingOpen) { newRecord(pendingOpen.day, pendingOpen.lv, false); beginPlay(pendingOpen.day, pendingOpen.lv); } });
  $('sd-connect-back').addEventListener('click', function () { connectToken = null; renderHome(); show('home'); });

  function puzzleOf() { return Core.makeSudoku(cur.day, cur.lv).puzzle; }
  function valAt(i) { return cur.puz[i] || cur.r.cells[i] || 0; }
  function beginPlay(day, lv) {
    var r = rec(day, lv); if (!r) return;
    cur = { day: day, lv: lv, r: r, puz: Core.makeSudoku(day, lv).puzzle, sel: -1, notesMode: false, undo: [] };
    $('sd-level').textContent = t(LVKEY[lv]); $('sd-msg').textContent = '';
    buildGrid(); buildPad(); paintAll(); show('play'); startTimer(); WB.wakeOn && WB.wakeOn();
    $('sd-notes').setAttribute('aria-pressed', 'false'); $('sd-notes').classList.remove('border-primary', 'bg-primary/15', 'text-primary');
  }
  function buildGrid() {
    var g = $('sd-grid'); g.innerHTML = ''; cells = [];
    for (var i = 0; i < 81; i++) (function (i) {
      var row = Math.floor(i / 9), col = i % 9;
      var b = mk('button', 'relative flex aspect-square items-center justify-center border-border text-lg font-semibold ' + (col % 3 === 2 && col < 8 ? 'border-r-2 border-r-foreground/50 ' : (col < 8 ? 'border-r ' : '')) + (row % 3 === 2 && row < 8 ? 'border-b-2 border-b-foreground/50' : (row < 8 ? 'border-b' : '')));
      b.type = 'button'; b.setAttribute('data-cell', i); b.setAttribute('role', 'gridcell'); b.setAttribute('aria-label', t('sdCellAria', { r: row + 1, c: col + 1 }));
      b.addEventListener('click', function () { cur.sel = i; paintAll(); });
      g.appendChild(b); cells.push(b);
    })(i);
  }
  function buildPad() {
    var p = $('sd-pad'); p.innerHTML = '';
    for (var d = 1; d <= 9; d++) (function (d) {
      var b = mk('button', 'flex h-14 flex-col items-center justify-center rounded-lg border border-border bg-card font-heading text-xl font-bold text-card-foreground disabled:opacity-30');
      b.type = 'button'; b.setAttribute('data-digit', d); b.setAttribute('aria-label', t('sdDigitAria', { d: d }));
      b.appendChild(mk('span', '', String(d))); b.appendChild(mk('span', 'text-[9px] font-semibold text-muted-foreground', '')); b.addEventListener('click', function () { enter(d); }); p.appendChild(b);
    })(d);
  }
  function conflicts() {
    var bad = {}, units = [];
    for (var u = 0; u < 9; u++) { var a = [], b = [], c = []; for (var k = 0; k < 9; k++) { a.push(u * 9 + k); b.push(k * 9 + u); c.push((Math.floor(u / 3) * 3 + Math.floor(k / 3)) * 9 + (u % 3) * 3 + (k % 3)); } units.push(a, b, c); }
    units.forEach(function (un) { var seen = {}; un.forEach(function (i) { var v = valAt(i); if (!v) return; (seen[v] = seen[v] || []).push(i); }); Object.keys(seen).forEach(function (v) { if (seen[v].length > 1) seen[v].forEach(function (i) { bad[i] = 1; }); }); });
    return bad;
  }
  function peerOf(a, b) { return a !== b && (Math.floor(a / 9) === Math.floor(b / 9) || a % 9 === b % 9 || (Math.floor(a / 27) === Math.floor(b / 27) && Math.floor((a % 9) / 3) === Math.floor((b % 9) / 3))); }
  function paintAll() {
    var bad = conflicts(), sel = cur.sel, sv = sel >= 0 ? valAt(sel) : 0, counts = new Array(10).fill(0);
    for (var i = 0; i < 81; i++) {
      var v = valAt(i), el = cells[i], given = !!cur.puz[i]; if (v) counts[v]++;
      var cls = 'relative flex aspect-square items-center justify-center text-lg font-semibold ' + el.className.split(' ').filter(function (c) { return /^border/.test(c); }).join(' ') + ' ';
      if (i === sel) cls += 'bg-primary/25 '; else if (sel >= 0 && peerOf(sel, i)) cls += 'bg-muted '; else if (sv && v === sv) cls += 'bg-primary/10 ';
      cls += bad[i] ? 'text-destructive' : (given ? 'text-foreground' : 'text-primary');
      el.className = cls; el.innerHTML = '';
      if (v) { el.textContent = String(v); if (given) el.classList.add('font-bold'); }
      else {
        var nm = cur.r.notes[i] || 0;
        if (nm) { var gr = mk('div', 'grid h-full w-full grid-cols-3 p-px text-[9px] font-semibold leading-none text-muted-foreground'); for (var d = 1; d <= 9; d++) gr.appendChild(mk('span', 'flex items-center justify-center', nm & (1 << d) ? String(d) : '')); el.appendChild(gr); }
      }
      el.setAttribute('aria-selected', i === sel ? 'true' : 'false');
    }
    Array.prototype.forEach.call($('sd-pad').children, function (b, k) {
      var left = 9 - counts[k + 1]; b.disabled = left <= 0; b.lastChild.textContent = left > 0 ? String(left) : '';
    });
    $('sd-notes').setAttribute('aria-pressed', cur.notesMode ? 'true' : 'false');
    ['border-primary', 'bg-primary/15', 'text-primary'].forEach(function (c) { $('sd-notes').classList.toggle(c, cur.notesMode); });
    return bad;
  }
  function snapshot() { cur.undo.push({ cells: cur.r.cells.slice(), notes: JSON.parse(JSON.stringify(cur.r.notes)) }); if (cur.undo.length > 80) cur.undo.shift(); }
  function enter(d) {
    var i = cur.sel; if (i < 0 || cur.puz[i]) return;
    $('sd-msg').textContent = '';
    if (cur.notesMode) { if (cur.r.cells[i]) return; snapshot(); cur.r.notes[i] = (cur.r.notes[i] || 0) ^ (1 << d); if (!cur.r.notes[i]) delete cur.r.notes[i]; }
    else {
      snapshot();
      if (cur.r.cells[i] === d) cur.r.cells[i] = 0;
      else {
        cur.r.cells[i] = d; delete cur.r.notes[i];
        for (var k = 0; k < 81; k++) if (peerOf(i, k) && cur.r.notes[k]) { cur.r.notes[k] &= ~(1 << d); if (!cur.r.notes[k]) delete cur.r.notes[k]; }
      }
    }
    WB.vibrate(8); persist(); var bad = paintAll(); checkDone(bad);
  }
  $('sd-erase').addEventListener('click', function () {
    var i = cur && cur.sel; if (i == null || i < 0 || cur.puz[i]) return; if (!cur.r.cells[i] && !cur.r.notes[i]) return;
    snapshot(); cur.r.cells[i] = 0; delete cur.r.notes[i]; $('sd-msg').textContent = ''; persist(); paintAll();
  });
  $('sd-undo').addEventListener('click', function () { if (!cur || !cur.undo.length) return; var s = cur.undo.pop(); cur.r.cells = s.cells; cur.r.notes = s.notes; $('sd-msg').textContent = ''; persist(); paintAll(); });
  $('sd-notes').addEventListener('click', function () { if (!cur) return; cur.notesMode = !cur.notesMode; paintAll(); });
  document.addEventListener('keydown', function (e) {
    if (view !== 'play' || !cur) return;
    if (e.key >= '1' && e.key <= '9') enter(+e.key); else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') $('sd-erase').click();
    else if (/^Arrow/.test(e.key) && cur.sel >= 0) { var d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[e.key], n = cur.sel + d; if (n >= 0 && n < 81 && !(Math.abs(d) === 1 && Math.floor(n / 9) !== Math.floor(cur.sel / 9))) { cur.sel = n; paintAll(); e.preventDefault(); } }
  });
  function persist() { save(); }
  function checkDone(bad) {
    for (var i = 0; i < 81; i++) if (!valAt(i)) return;
    if (Object.keys(bad).length) { $('sd-msg').textContent = t('sdFullConflict'); return; }
    finish();
  }

  // ---------- zamanlayıcı (yalnızca uygulama görünürken işler) ----------
  var last = null;
  function tick() {
    if (!cur || document.hidden) { last = null; return; }
    var now = Date.now(); if (last !== null) cur.r.active += Math.min(now - last, 1500) / 1000; last = now;
    $('sd-clock').textContent = clock(cur.r.active);
  }
  function startTimer() { stopTimer(); last = Date.now(); $('sd-clock').textContent = clock(cur.r.active); timer = setInterval(function () { tick(); if (Math.floor(Date.now() / 1000) % 5 === 0) save(); }, 500); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } last = null; }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (view === 'play') { tick(); save(); } last = null; }
    else { last = Date.now(); if (view === 'home') renderHome(); sync(); }
  });
  window.addEventListener('pagehide', function () { if (view === 'play') { tick(); } save(); });

  function finish() {
    tick(); stopTimer(); var r = cur.r; r.status = 'done'; r.secs = Math.max(1, Math.round(r.active)); r.cells = r.cells.slice(); save(); WB.vibrate([40, 60, 40]);
    renderDone(); show('done');
    if (r.ranked) { r.submit = 'sending'; sendResult(cur.day, cur.lv, r); }
  }
  function renderDone() {
    if (!cur) return; var r = cur.r;
    $('sd-done-time').textContent = t('sdYourTime', { t: clock(r.secs) }) + ' · ' + t(LVKEY[cur.lv]);
    $('sd-done-rank').textContent = r.submit === 'sending' ? t('dlSending') : submitText(r, cur.day);
  }
  $('sd-menu').addEventListener('click', function () { tick(); save(); renderHome(); show('home'); });
  $('sd-done-menu').addEventListener('click', function () { renderHome(); show('home'); });
  window.addEventListener('one-lang-changed', function () { if (view === 'home') renderHome(); else if (view === 'done') renderDone(); else if (view === 'play') { $('sd-level').textContent = t(LVKEY[cur.lv]); buildPad(); paintAll(); } });

  renderHome(); show('home'); sync();
  window.__sudoku = { state: function () { return S; }, cur: function () { return cur; }, view: function () { return view; }, forceSolve: function () { var sol = Core.makeSudoku(cur.day, cur.lv).solution; for (var i = 0; i < 81; i++) if (!cur.puz[i]) cur.r.cells[i] = sol[i]; var b = paintAll(); checkDone(b); } };
})();
