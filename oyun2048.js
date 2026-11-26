/* Hemcan — 2048. Çevrimdışı; oyun ve rekor yalnızca bu telefonda ("one-2048") saklanır. */
(function () {
  'use strict';
  var WB = window.WB, $ = WB.$, t = WB.t, KEY = 'one-2048', N = 4;
  var S = WB.load(KEY, null) || {}; S.v = 1; S.best = S.best || 0;
  function save() { WB.save(KEY, S); }
  var PAL = { 2: ['#1b3a5c', '#eff7ff'], 4: ['#1f4a73', '#eff7ff'], 8: ['#f2b66d', '#07111f'], 16: ['#f0955a', '#07111f'], 32: ['#ef7a5f', '#07111f'], 64: ['#ef5f6b', '#fff'], 128: ['#39d7ff', '#03121c'], 256: ['#2fc4e8', '#03121c'], 512: ['#70a7ff', '#07111f'], 1024: ['#a78bfa', '#130d28'], 2048: ['#3ddba5', '#031b14'] };
  var B, score, prev = null, won = false, keepGoing = false, over = false;
  function empty() { var a = []; for (var i = 0; i < N * N; i++) a.push(0); return a; }
  function spawn() { var e = []; B.forEach(function (v, i) { if (!v) e.push(i); }); if (!e.length) return; B[e[Math.floor(Math.random() * e.length)]] = Math.random() < 0.9 ? 2 : 4; }
  function newGame() { B = empty(); score = 0; prev = null; won = false; keepGoing = false; over = false; spawn(); spawn(); persist(); render(); }
  function persist() { S.board = B; S.score = score; S.won = won; S.keep = keepGoing; save(); }
  function line(a) { // sola kaydır: [yeni satır, kazanılan puan, değişti mi]
    var v = a.filter(Boolean), out = [], pts = 0, i;
    for (i = 0; i < v.length; i++) { if (v[i] === v[i + 1]) { out.push(v[i] * 2); pts += v[i] * 2; i++; } else out.push(v[i]); }
    while (out.length < N) out.push(0);
    return [out, pts, out.some(function (x, k) { return x !== a[k]; })];
  }
  function move(dir) { // 0 sol, 1 yukarı, 2 sağ, 3 aşağı
    if (over) return false; var nb = empty(), pts = 0, moved = false, r, c, idx;
    for (r = 0; r < N; r++) {
      var a = [];
      for (c = 0; c < N; c++) a.push(B[cell(dir, r, c)]);
      var res = line(a); pts += res[1]; if (res[2]) moved = true;
      for (c = 0; c < N; c++) nb[cell(dir, r, c)] = res[0][c];
    }
    if (!moved) return false;
    prev = { B: B.slice(), score: score, won: won }; B = nb; score += pts; spawn();
    if (score > S.best) S.best = score;
    if (!won && B.indexOf(2048) >= 0) won = true;
    if (!canMove()) over = true;
    persist(); render(); WB.vibrate(6); return true;
  }
  function cell(dir, r, c) { // dir'e göre r. satırın c. hücresi (kaydırma yönünde sıralı)
    if (dir === 0) return r * N + c; if (dir === 2) return r * N + (N - 1 - c);
    if (dir === 1) return c * N + r; return (N - 1 - c) * N + r;
  }
  function canMove() {
    if (B.indexOf(0) >= 0) return true;
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) { var v = B[r * N + c]; if ((c < N - 1 && v === B[r * N + c + 1]) || (r < N - 1 && v === B[(r + 1) * N + c])) return true; }
    return false;
  }
  function render() {
    var bd = $('tf-board'); bd.innerHTML = '';
    B.forEach(function (v) {
      var d = WB.el('div', 'flex aspect-square items-center justify-center rounded-lg font-heading font-extrabold ' + (v > 512 ? 'text-lg' : v > 64 ? 'text-xl' : 'text-2xl'), v ? String(v) : '');
      d.setAttribute('role', 'gridcell'); d.setAttribute('data-v', v);
      if (v) { var p = PAL[v] || PAL[2048]; d.style.background = p[0]; d.style.color = p[1]; } else d.style.background = 'rgba(255,255,255,0.05)';
      bd.appendChild(d);
    });
    $('tf-score').textContent = String(score); $('tf-best').textContent = String(S.best);
    $('tf-undo').disabled = !prev; $('tf-undo').style.opacity = prev ? '1' : '0.4';
    var ov = $('tf-over'), show = over || (won && !keepGoing);
    ov.classList.toggle('hidden', !show); ov.classList.toggle('flex', show);
    if (show) {
      $('tf-over-text').textContent = over ? t('tfOver') : t('tfWin');
      var b = $('tf-over-btn'); b.textContent = over ? t('tfNew') : t('tfKeep'); b.onclick = function () { if (over) newGame(); else { keepGoing = true; persist(); render(); } };
    }
  }
  $('tf-new').addEventListener('click', newGame);
  $('tf-undo').addEventListener('click', function () { if (prev) { B = prev.B; score = prev.score; won = prev.won; prev = null; over = false; persist(); render(); } });
  document.addEventListener('keydown', function (e) {
    var m = { ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2, ArrowDown: 3 }[e.key]; if (m == null) return; e.preventDefault(); move(m);
  });
  var sx = 0, sy = 0, tracking = false, wrap = $('tf-wrap');
  wrap.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; tracking = true; });
  wrap.addEventListener('pointerup', function (e) {
    if (!tracking) return; tracking = false; var dx = e.clientX - sx, dy = e.clientY - sy, ax = Math.abs(dx), ay = Math.abs(dy); if (Math.max(ax, ay) < 24) return;
    move(ax > ay ? (dx < 0 ? 0 : 2) : (dy < 0 ? 1 : 3));
  });
  wrap.addEventListener('pointercancel', function () { tracking = false; });
  window.addEventListener('one-lang-changed', render);
  window.__tf = { board: function () { return B.slice(); }, set: function (b, s) { B = b.slice(); score = s || 0; over = !canMove(); render(); }, move: move, score: function () { return score; }, state: function () { return S; }, over: function () { return over; } };
  if (S.board && S.board.length === N * N) { B = S.board.slice(); score = S.score || 0; won = !!S.won; keepGoing = !!S.keep; over = !canMove(); render(); } else newGame();
})();
