/* Hemcan — günlük oyunların ortak çekirdeği. HEM tarayıcıda HEM sunucuda (netlify/functions/_daily-core.js kopyası) çalışır;
 * iki taraf aynı tarihten aynı sudoku bulmacasını ve aynı 10 soruyu üretmek zorundadır. Math.random KULLANMAZ (tohumlu üreteç).
 * Bu dosyayı değiştirirsen netlify/functions/_daily-core.js dosyasını da aynı içerikle güncelle (test bunu kontrol eder). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.DailyCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- Tarih: oyun günü Türkiye saatine (UTC+3) göre değişir ----
  var TR_OFFSET = 3 * 3600 * 1000;
  function trDay(ts) { return new Date((ts === undefined ? Date.now() : ts) + TR_OFFSET).toISOString().slice(0, 10); }
  function dayStartUtc(day) { return Date.parse(day + 'T00:00:00Z') - TR_OFFSET; } // o günün TSİ 00:00'ı
  function dayIndex(day) { return Math.floor(Date.parse(day + 'T00:00:00Z') / 86400000); }
  var PUBLISH_DELAY = 3600 * 1000; // sonuçlar gün bittikten 1 saat sonra açıklanır
  function publishAt(day) { return dayStartUtc(day) + 86400000 + PUBLISH_DELAY; }

  // ---- Tohumlu rastgele ----
  function hash32(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffle(arr, rng) { for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), x = arr[i]; arr[i] = arr[j]; arr[j] = x; } return arr; }

  // ---- Sudoku ----
  var ROW = [], COL = [], BOX = [], PEERS = [];
  (function () {
    for (var i = 0; i < 81; i++) { ROW[i] = Math.floor(i / 9); COL[i] = i % 9; BOX[i] = Math.floor(ROW[i] / 3) * 3 + Math.floor(COL[i] / 3); }
    for (var a = 0; a < 81; a++) { var s = []; for (var b = 0; b < 81; b++) if (a !== b && (ROW[a] === ROW[b] || COL[a] === COL[b] || BOX[a] === BOX[b])) s.push(b); PEERS[a] = s; }
  })();
  function popcnt(m) { var c = 0; while (m) { m &= m - 1; c++; } return c; }

  // Bit maskeleriyle çözücü: en az adaylı hücre (MRV). limit kadar çözüm sayar. fill verilirse ilk çözümü yazar.
  function solveCount(grid, limit, rng) {
    var g = grid.slice(), rows = new Array(9).fill(0), cols = new Array(9).fill(0), boxes = new Array(9).fill(0), count = 0, found = null;
    for (var i = 0; i < 81; i++) if (g[i]) { var bit = 1 << g[i]; if ((rows[ROW[i]] & bit) || (cols[COL[i]] & bit) || (boxes[BOX[i]] & bit)) return { count: 0, solution: null }; rows[ROW[i]] |= bit; cols[COL[i]] |= bit; boxes[BOX[i]] |= bit; }
    function rec() {
      var best = -1, bestMask = 0, bestN = 10;
      for (var i = 0; i < 81; i++) if (!g[i]) {
        var m = ~(rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]) & 0x3FE, n = popcnt(m);
        if (n < bestN) { bestN = n; best = i; bestMask = m; if (n <= 1) break; }
      }
      if (best < 0) { count++; if (!found) found = g.slice(); return count >= limit; }
      if (bestN === 0) return false;
      var cands = []; for (var d = 1; d <= 9; d++) if (bestMask & (1 << d)) cands.push(d);
      if (rng) shuffle(cands, rng);
      for (var k = 0; k < cands.length; k++) {
        var dd = cands[k], bit = 1 << dd; g[best] = dd; rows[ROW[best]] |= bit; cols[COL[best]] |= bit; boxes[BOX[best]] |= bit;
        var stop = rec();
        g[best] = 0; rows[ROW[best]] &= ~bit; cols[COL[best]] &= ~bit; boxes[BOX[best]] &= ~bit;
        if (stop) return true;
      }
      return false;
    }
    rec();
    return { count: count, solution: found };
  }

  // Yalnızca "tek aday" ve "tek yer" teknikleriyle çözülebiliyor mu? (kolay seviye için)
  function singlesSolvable(grid) {
    var g = grid.slice(), progress = true;
    function cand(i) { var m = 0x3FE; for (var k = 0; k < PEERS[i].length; k++) { var v = g[PEERS[i][k]]; if (v) m &= ~(1 << v); } return m; }
    while (progress) {
      progress = false;
      for (var i = 0; i < 81; i++) if (!g[i]) { var m = cand(i); if (popcnt(m) === 1) { g[i] = Math.log2(m) | 0; progress = true; } }
      if (progress) continue;
      var units = [];
      for (var u = 0; u < 9; u++) { var r = [], c = [], b = []; for (var j = 0; j < 81; j++) { if (ROW[j] === u) r.push(j); if (COL[j] === u) c.push(j); if (BOX[j] === u) b.push(j); } units.push(r, c, b); }
      for (var x = 0; x < units.length && !progress; x++) {
        for (var d = 1; d <= 9 && !progress; d++) {
          var spots = [], has = false;
          for (var y = 0; y < 9; y++) { var cell = units[x][y]; if (g[cell] === d) { has = true; break; } if (!g[cell] && (cand(cell) & (1 << d))) spots.push(cell); }
          if (!has && spots.length === 1) { g[spots[0]] = d; progress = true; }
        }
      }
    }
    return g.every(function (v) { return v; });
  }

  var LEVELS = { easy: { givens: 40, singles: true }, medium: { givens: 33, singles: false }, hard: { givens: 27, singles: false } };
  var cache = {};
  function makeSudoku(day, level) {
    var key = day + '|' + level; if (cache[key]) return cache[key];
    var cfg = LEVELS[level]; if (!cfg) throw new Error('level');
    var rng = mulberry32(hash32('hemcan-sudoku|' + day + '|' + level));
    var full = solveCount(new Array(81).fill(0), 1, rng).solution;
    var puzzle = full.slice(), order = shuffle(Array.from({ length: 81 }, function (_, i) { return i; }), rng), givens = 81;
    for (var k = 0; k < order.length && givens > cfg.givens; k++) {
      var i = order[k], keep = puzzle[i]; puzzle[i] = 0;
      var ok = solveCount(puzzle, 2).count === 1 && (!cfg.singles || singlesSolvable(puzzle));
      if (ok) givens--; else puzzle[i] = keep;
    }
    return (cache[key] = { puzzle: puzzle, solution: full, givens: givens });
  }

  // Tamamlanmış bir ızgara bu günün çözümü mü? (tek çözümlü olduğu için çözümle birebir eşit olmalı)
  function checkSudoku(day, level, grid) {
    if (!Array.isArray(grid) || grid.length !== 81) return false;
    var sol = makeSudoku(day, level).solution;
    for (var i = 0; i < 81; i++) if (grid[i] !== sol[i]) return false;
    return true;
  }

  // ---- Genel kültür: tarihten 10 soru (havuz boyutu N, döngü başına tekrarsız) ----
  var Q_PER_DAY = 10;
  function pickQuestions(day, N) {
    var perEpoch = Math.max(1, Math.floor(N / Q_PER_DAY)), di = dayIndex(day), epoch = Math.floor(di / perEpoch), slot = ((di % perEpoch) + perEpoch) % perEpoch;
    var perm = shuffle(Array.from({ length: N }, function (_, i) { return i; }), mulberry32(hash32('hemcan-trivia|' + epoch)));
    var out = []; for (var i = 0; i < Q_PER_DAY; i++) out.push(perm[(slot * Q_PER_DAY + i) % N]);
    return out;
  }

  return { trDay: trDay, dayStartUtc: dayStartUtc, dayIndex: dayIndex, publishAt: publishAt, PUBLISH_DELAY: PUBLISH_DELAY, hash32: hash32, mulberry32: mulberry32,
    makeSudoku: makeSudoku, checkSudoku: checkSudoku, solveCount: solveCount, singlesSolvable: singlesSolvable, LEVELS: LEVELS, pickQuestions: pickQuestions, Q_PER_DAY: Q_PER_DAY };
});
