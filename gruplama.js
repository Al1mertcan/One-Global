/* Hemcan — Gruplama (16 kelime → 4 grup). Çevrimdışı; yalnızca bu telefonda ("one-grup") sayaç tutar. */
(function () {
  'use strict';
  var WB = window.WB, $ = WB.$, t = WB.t, KEY = 'one-grup', MAXERR = 4;
  var COLORS = ['bg-chart5 text-background', 'bg-success text-success-foreground', 'bg-chart4 text-background', 'bg-accent text-accent-foreground'];
  var S = WB.load(KEY, null) || {}; S.v = 1; S.played = S.played || 0; S.won = S.won || 0;
  function save() { WB.save(KEY, S); }
  function mk(tag, cls, text) { return WB.el(tag, cls, text); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function lang() { return WB.lang() === 'tr' ? 'tr' : 'en'; }
  function up(s) { return s.toLocaleUpperCase(lang()); }
  var G = null;
  function puzzle() {
    var cats = shuffle(window.WB_GROUPS[lang()].slice()).slice(0, 4), used = {};
    return cats.map(function (c) {
      var ws = shuffle(c.w.filter(function (w) { return w.indexOf(' ') < 0 && w.length <= 9; })).slice(0, 4); ws.forEach(function (w) { used[w] = 1; });
      return { n: c.n, w: ws };
    });
  }
  function start() {
    var groups = puzzle(), all = []; groups.forEach(function (g, i) { g.w.forEach(function (w) { all.push({ w: w, g: i }); }); });
    G = { lang: lang(), groups: groups, tiles: shuffle(all), sel: [], solved: [], err: 0, status: 'play', counted: false };
    $('gr-done').classList.add('hidden'); $('gr-msg').textContent = ''; render();
  }
  function render() {
    var sv = $('gr-solved'); sv.innerHTML = '';
    G.solved.forEach(function (gi, k) {
      var g = G.groups[gi], d = mk('div', 'rounded-[16px] px-3 py-2 text-center ' + COLORS[k % 4]);
      d.appendChild(mk('p', 'text-[11px] font-extrabold uppercase tracking-[0.1em]', g.n)); d.appendChild(mk('p', 'text-xs font-semibold', g.w.map(up).join(' · '))); sv.appendChild(d);
    });
    var grid = $('gr-grid'); grid.innerHTML = '';
    G.tiles.forEach(function (tl, idx) {
      if (G.solved.indexOf(tl.g) >= 0) return;
      var on = G.sel.indexOf(idx) >= 0, b = mk('button', 'flex min-h-[56px] items-center justify-center rounded-xl border-2 px-1 text-center text-[11px] font-bold leading-4 break-words ' + (on ? 'border-primary bg-primary/20 text-primary' : 'border-border bg-card text-card-foreground'), up(tl.w));
      b.type = 'button'; b.setAttribute('data-tile', idx); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.addEventListener('click', function () { toggle(idx); }); grid.appendChild(b);
    });
    $('gr-left').textContent = t('grMistakes', { n: MAXERR - G.err }); $('gr-submit').disabled = G.sel.length !== 4 || G.status !== 'play';
  }
  function toggle(idx) {
    if (G.status !== 'play') return; var k = G.sel.indexOf(idx);
    if (k >= 0) G.sel.splice(k, 1); else if (G.sel.length < 4) G.sel.push(idx); WB.vibrate(5); $('gr-msg').textContent = ''; render();
  }
  function submit() {
    if (G.status !== 'play' || G.sel.length !== 4) return;
    var counts = {}; G.sel.forEach(function (i) { counts[G.tiles[i].g] = (counts[G.tiles[i].g] || 0) + 1; });
    var best = 0, gi = -1; Object.keys(counts).forEach(function (k) { if (counts[k] > best) { best = counts[k]; gi = +k; } });
    if (best === 4) { G.solved.push(gi); G.sel = []; $('gr-msg').textContent = ''; WB.vibrate(20); if (G.solved.length === 4) end('won'); }
    else { G.err++; $('gr-msg').textContent = best === 3 ? t('grOneAway') : t('grNope'); WB.vibrate([30, 40, 30]); G.sel = []; if (G.err >= MAXERR) end('lost'); }
    render();
  }
  function end(res) {
    G.status = res; if (!G.counted) { G.counted = true; S.played++; if (res === 'won') S.won++; save(); }
    if (res === 'lost') G.solved = G.solved.concat([0, 1, 2, 3].filter(function (i) { return G.solved.indexOf(i) < 0; }));
    $('gr-done-emoji').textContent = res === 'won' ? '🎉' : '🌙'; $('gr-done-title').textContent = res === 'won' ? t('grWin') : t('grLose');
    $('gr-stats').textContent = t('grStats', { p: S.played, w: S.won }); $('gr-done').classList.remove('hidden'); WB.vibrate(res === 'won' ? [40, 60, 40] : 60);
  }
  $('gr-submit').addEventListener('click', submit);
  $('gr-shuffle').addEventListener('click', function () { if (G.status === 'play') { G.tiles = shuffle(G.tiles); G.sel = []; render(); } });
  $('gr-clear').addEventListener('click', function () { G.sel = []; render(); });
  $('gr-new').addEventListener('click', function () { start(); window.scrollTo(0, 0); });
  window.addEventListener('one-lang-changed', function () { start(); });
  window.__grup = { state: function () { return G; }, stats: function () { return S; }, toggle: toggle, submit: submit, start: start };
  start();
})();
