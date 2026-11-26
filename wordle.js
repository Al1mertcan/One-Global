/* Hemcan — Günün kelimesi (Wordle benzeri). Tamamen çevrimdışı; sonuçlar yalnızca bu telefonda ("one-wordle") tutulur. */
(function () {
  'use strict';
  var WB = window.WB, $ = WB.$, t = WB.t, KEY = 'one-wordle';
  var ROWS = 6, COLS = 5;
  var KB = { tr: ['ertyuıopğü', 'asdfghjklşi', 'zcvbnmöç'], en: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'] };
  var S = WB.load(KEY, null) || {}; S.v = 1; S.daily = S.daily || {}; S.stats = S.stats || { played: 0, won: 0, streak: 0, best: 0, lastWin: '' };
  function save() { WB.save(KEY, S); }
  function lang() { return WB.lang() === 'tr' ? 'tr' : 'en'; }
  function words() { return (window.WB_WORDS && window.WB_WORDS[lang()]) || []; }
  function up(s) { return s.toLocaleUpperCase(lang() === 'tr' ? 'tr' : 'en'); }
  function low(s) { return s.toLocaleLowerCase(lang() === 'tr' ? 'tr' : 'en'); }
  function dailyWord(day, l) { var w = window.WB_WORDS[l], n = WB.dayNum(day); return w[((n * 2654435761) >>> 0) % w.length]; }

  var G = null; // { mode, lang, target, guesses:[], cur:'', status:'play'|'won'|'lost', day }
  function evaluate(g, target) {
    var res = [], used = [], i, j;
    for (i = 0; i < COLS; i++) { res[i] = 'a'; used[i] = false; }
    for (i = 0; i < COLS; i++) if (g[i] === target[i]) { res[i] = 'c'; used[i] = true; }
    for (i = 0; i < COLS; i++) {
      if (res[i] === 'c') continue;
      for (j = 0; j < COLS; j++) if (!used[j] && g[i] === target[j] && res[j] !== 'c') { res[i] = 'p'; used[j] = true; break; }
    }
    return res;
  }
  var CLS = { c: 'border-success bg-success text-success-foreground', p: 'border-chart5 bg-chart5 text-background', a: 'border-border bg-secondary text-secondary-foreground' };
  var CELL = 'flex aspect-square items-center justify-center rounded-lg border-2 text-2xl font-extrabold ';

  function build() {
    var b = $('wd-board'); b.innerHTML = ''; b.setAttribute('aria-label', t('wdHeader'));
    for (var r = 0; r < ROWS; r++) {
      var row = WB.el('div', 'grid grid-cols-5 gap-1.5'); row.setAttribute('role', 'row');
      for (var c = 0; c < COLS; c++) { var cell = WB.el('div', CELL + 'border-border bg-card', ''); cell.setAttribute('role', 'gridcell'); row.appendChild(cell); }
      b.appendChild(row);
    }
    var kb = $('wd-kb'); kb.innerHTML = '';
    KB[lang()].forEach(function (rowKeys, ri) {
      var row = WB.el('div', 'flex justify-center gap-1');
      if (ri === 2) row.appendChild(mkKey('ENTER', t('wdEnter'), true));
      rowKeys.split('').forEach(function (ch) { row.appendChild(mkKey(ch, up(ch), false)); });
      if (ri === 2) row.appendChild(mkKey('DEL', '⌫', true));
      kb.appendChild(row);
    });
  }
  function mkKey(k, label, wide) {
    var b = WB.el('button', 'h-12 ' + (wide ? 'min-w-[52px] px-2 text-[11px]' : 'min-w-0 flex-1 text-sm') + ' rounded-md border border-border bg-card font-bold text-card-foreground', label);
    b.type = 'button'; b.setAttribute('data-key', k); if (k === 'DEL') b.setAttribute('aria-label', t('wdDel'));
    b.addEventListener('click', function () { press(k); }); return b;
  }
  function paint() {
    var rows = $('wd-board').children, r, c;
    for (r = 0; r < ROWS; r++) {
      var g = G.guesses[r], isCur = r === G.guesses.length && G.status === 'play', ev = g ? evaluate(g, G.target) : null;
      for (c = 0; c < COLS; c++) {
        var cell = rows[r].children[c], ch = g ? g[c] : (isCur ? G.cur[c] : '');
        cell.textContent = ch ? up(ch) : '';
        cell.className = CELL + (g ? CLS[ev[c]] : (ch ? 'border-primary/70 bg-input' : 'border-border bg-card'));
      }
    }
    var best = {}; G.guesses.forEach(function (g) { var ev = evaluate(g, G.target); for (var i = 0; i < COLS; i++) { var o = best[g[i]], n = ev[i]; if (!o || (o === 'a') || (o === 'p' && n === 'c')) best[g[i]] = n; } });
    Array.prototype.forEach.call($('wd-kb').querySelectorAll('[data-key]'), function (b) {
      var k = b.getAttribute('data-key'), st = best[k];
      if (k.length > 1) return;
      b.className = 'h-12 min-w-0 flex-1 rounded-md border text-sm font-bold ' + (st ? CLS[st] : 'border-border bg-card text-card-foreground');
    });
  }
  function say(m) { $('wd-msg').textContent = m || ''; }
  function persist() { if (G.mode === 'daily') { S.daily[G.lang] = { day: G.day, guesses: G.guesses, status: G.status }; save(); } }

  function press(k) {
    if (!G || G.status !== 'play') return;
    if (k === 'ENTER') return enter();
    if (k === 'DEL') { G.cur = G.cur.slice(0, -1); say(''); paint(); return; }
    if (G.cur.length < COLS) { G.cur += k; WB.vibrate(5); paint(); }
  }
  function enter() {
    if (G.cur.length < COLS) { say(t('wdShort')); WB.vibrate([20, 30, 20]); return; }
    G.guesses.push(G.cur); var won = G.cur === G.target; G.cur = ''; say('');
    if (won) G.status = 'won'; else if (G.guesses.length >= ROWS) G.status = 'lost';
    paint(); persist(); if (G.status !== 'play') finish();
  }
  function finish() {
    if (G.mode === 'daily' && !G.counted) {
      G.counted = true; var st = S.stats; st.played++;
      if (G.status === 'won') { st.won++; st.streak = (st.lastWin && WB.dayNum(st.lastWin) === WB.dayNum(G.day) - 1) ? st.streak + 1 : 1; st.best = Math.max(st.best, st.streak); st.lastWin = G.day; }
      else st.streak = 0;
      S.daily[G.lang].counted = true; save();
    }
    var won = G.status === 'won'; WB.vibrate(won ? [40, 60, 40] : 60);
    $('wd-done-emoji').textContent = won ? '🎉' : '🌙'; $('wd-done-title').textContent = won ? t('wdWin') : t('wdLose');
    $('wd-done-word').textContent = won ? '' : t('wdWordWas', { w: up(G.target) });
    $('wd-share-grid').textContent = G.guesses.map(function (g) { return evaluate(g, G.target).map(function (x) { return x === 'c' ? '🟩' : x === 'p' ? '🟨' : '⬛'; }).join(''); }).join('\n');
    var st = S.stats; $('wd-stats').textContent = t('wdStats', { p: st.played, w: st.won, s: st.streak });
    $('wd-done').classList.remove('hidden');
  }
  function start(mode) {
    var l = lang(), W = words(); if (!W.length) return;
    $('wd-done').classList.add('hidden'); say('');
    if (mode === 'daily') {
      var day = WB.today(), sv = S.daily[l];
      G = { mode: 'daily', lang: l, day: day, target: dailyWord(day, l), guesses: [], cur: '', status: 'play' };
      if (sv && sv.day === day) { G.guesses = sv.guesses.slice(); G.status = sv.status; G.counted = !!sv.counted; }
      $('wd-date').textContent = t('wdDaily', { d: day });
    } else {
      G = { mode: 'extra', lang: l, day: WB.today(), target: W[Math.floor(Math.random() * W.length)], guesses: [], cur: '', status: 'play' };
      $('wd-date').textContent = t('wdBonus');
    }
    build(); paint(); if (G.status !== 'play') finish();
  }
  $('wd-extra').addEventListener('click', function () { start('extra'); window.scrollTo(0, 0); });
  $('wd-share').addEventListener('click', function () {
    var head = 'Hemcan · ' + t('wdHeader') + ' ' + (G.status === 'won' ? G.guesses.length : 'X') + '/' + ROWS, txt = head + '\n\n' + $('wd-share-grid').textContent;
    if (navigator.share) { navigator.share({ text: txt }).catch(function () {}); return; }
    try { navigator.clipboard.writeText(txt).then(function () { say(t('wdCopied')); }, function () {}); } catch (e) {}
  });
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || !G) return;
    if (e.key === 'Enter') { e.preventDefault(); press('ENTER'); }
    else if (e.key === 'Backspace') { press('DEL'); }
    else if (e.key.length === 1) { var ch = low(e.key); if (KB[lang()].join('').indexOf(ch) >= 0) press(ch); }
  });
  window.addEventListener('one-lang-changed', function () { start(G && G.mode === 'extra' ? 'extra' : 'daily'); });
  window.__wordle = { state: function () { return G; }, stats: function () { return S; }, press: press, type: function (w) { w.split('').forEach(press); }, enter: enter, eval: evaluate, start: start, dailyWord: dailyWord };
  start('daily');
})();
