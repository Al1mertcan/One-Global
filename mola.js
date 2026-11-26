/* Hemcan — Ekrandan mola: göz molası, günün sorusu, bilmece, mini yarışma. Veriler yalnızca bu telefonda ("one-mola"). */
(function () {
  'use strict';
  var WB = window.WB, $ = WB.$, t = WB.t;
  var KEY = 'one-mola', QUIZ_N = 5;
  var S = WB.load(KEY, null) || {};
  S.days = S.days || {}; S.quiz = S.quiz || { best: 0, played: 0 }; S.ridx = S.ridx || 0; S.daily = S.daily || null;
  function save() { var cut = WB.addDays(WB.today(), -400); Object.keys(S.days).forEach(function (k) { if (k < cut) delete S.days[k]; }); WB.save(KEY, S); }
  function data() { var d = window.MOLA_DATA || {}; return d[WB.lang()] || d.en || { trivia: [], riddles: [] }; }
  function mk(tag, cls, text) { return WB.el(tag, cls, text); }

  // ---------- 20-20-20 göz molası ----------
  var eye = { timer: null, end: 0 }, CIRC = 213.6;
  function eyeStop(done) {
    clearInterval(eye.timer); eye.timer = null; WB.wakeOff && WB.wakeOff();
    $('eye-btn').textContent = t(done ? 'molaEyeAgain' : 'molaEyeStart'); $('eye-btn').classList.remove('bg-card', 'text-card-foreground');
    $('eye-msg').textContent = done ? t('molaEyeDone') : ''; $('eye-left').textContent = '20'; $('eye-ring').setAttribute('stroke-dashoffset', done ? '0' : String(CIRC));
    if (done) WB.vibrate([60, 80, 60]);
  }
  function eyeTick() {
    var left = Math.max(0, Math.ceil((eye.end - Date.now()) / 1000));
    $('eye-left').textContent = String(left);
    $('eye-ring').setAttribute('stroke-dashoffset', String(CIRC * (left / 20)));
    if (left <= 0) eyeStop(true);
  }
  $('eye-btn').addEventListener('click', function () {
    if (eye.timer) { eyeStop(false); return; }
    eye.end = Date.now() + 20000; $('eye-msg').textContent = t('molaEyeRunning'); $('eye-btn').textContent = t('molaEyeCancel');
    WB.wakeOn && WB.wakeOn(); eyeTick(); eye.timer = setInterval(eyeTick, 250);
  });

  // ---------- günün sorusu ----------
  function dailyIndex() { var n = data().trivia.length; return n ? WB.dayNum(WB.today()) % n : 0; }
  function dailyStreak() { return WB.streak(function (k) { return !!S.days[k]; }); }
  function renderDaily() {
    var d = data(), q = d.trivia[dailyIndex()]; if (!q) return;
    var today = WB.today(), ans = S.daily && S.daily.day === today ? S.daily : null;
    $('daily-q').textContent = q.q;
    var box = $('daily-opts'); box.innerHTML = '';
    q.o.forEach(function (txt, i) {
      var cls = 'min-h-[44px] rounded-theme border px-3 py-2 text-left text-sm font-semibold ';
      if (ans) cls += i === q.c ? 'border-success bg-success/15 text-success' : (i === ans.pick ? 'border-destructive/60 bg-destructive/10 text-destructive' : 'border-border bg-input text-muted-foreground');
      else cls += 'border-border bg-input text-card-foreground';
      var b = mk('button', cls, txt); b.type = 'button'; b.setAttribute('data-opt', i); b.disabled = !!ans;
      b.addEventListener('click', function () {
        S.daily = { day: today, pick: i, ok: i === q.c }; S.days[today] = 1; save(); WB.vibrate(i === q.c ? 25 : 60); renderDaily();
      });
      box.appendChild(b);
    });
    var res = $('daily-result'), why = $('daily-why');
    res.classList.toggle('hidden', !ans); why.classList.toggle('hidden', !ans); $('daily-done').classList.toggle('hidden', !ans);
    if (ans) {
      res.textContent = ans.ok ? t('molaCorrect') : t('molaWrong', { a: q.o[q.c] });
      res.className = 'mt-3 text-xs font-semibold leading-5 ' + (ans.ok ? 'text-success' : 'text-card-foreground'); why.textContent = q.x;
    }
    var st = dailyStreak(); $('daily-streak').textContent = st >= 2 ? '🔥 ' + t('molaDailyStreak', { n: st }) : '';
  }

  // ---------- bilmece ----------
  var rShow = { hint: false, ans: false }, rStart = null;
  function riddles() { return data().riddles; }
  function rIdx() { var n = riddles().length; if (!n) return 0; if (rStart === null) rStart = (WB.dayNum(WB.today()) * 3) % n; return (rStart + S.ridx) % n; }
  function renderRiddle() {
    var list = riddles(); if (!list.length) return; var r = list[rIdx()];
    $('riddle-q').textContent = r.q; $('riddle-hint').textContent = '💡 ' + r.h; $('riddle-a').textContent = t('molaAnswerIs', { a: r.a });
    $('riddle-hint').classList.toggle('hidden', !rShow.hint); $('riddle-a').classList.toggle('hidden', !rShow.ans);
    $('riddle-count').textContent = t('molaRiddleCount', { i: rIdx() + 1, n: list.length });
  }
  $('riddle-hint-btn').addEventListener('click', function () { rShow.hint = true; renderRiddle(); });
  $('riddle-show-btn').addEventListener('click', function () { rShow.ans = true; renderRiddle(); });
  $('riddle-next').addEventListener('click', function () { S.ridx = (S.ridx + 1) % Math.max(1, riddles().length); rShow = { hint: false, ans: false }; save(); renderRiddle(); });

  // ---------- mini yarışma ----------
  var Q = null;
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function show(id) { ['quiz-intro', 'quiz-play', 'quiz-end'].forEach(function (x) { $(x).classList.toggle('hidden', x !== id); }); }
  function renderStats() {
    $('quiz-stats').textContent = S.quiz.played ? t('molaQuizBest', { b: S.quiz.best, n: QUIZ_N }) + ' · ' + t('molaQuizPlayed', { p: S.quiz.played }) : '';
  }
  function startQuiz() {
    var pool = data().trivia; if (pool.length < QUIZ_N) return;
    var idx = shuffle(pool.map(function (_, i) { return i; })).slice(0, QUIZ_N);
    Q = { idx: idx, i: 0, score: 0, lang: WB.lang(), locked: false }; show('quiz-play'); renderQ();
  }
  function renderQ() {
    var pool = data().trivia, q = pool[Q.idx[Q.i]]; Q.locked = false;
    $('quiz-num').textContent = t('molaQuizQ', { i: Q.i + 1, n: QUIZ_N }); $('quiz-score-live').textContent = '⭐ ' + Q.score;
    $('quiz-bar').style.width = Math.round(Q.i / QUIZ_N * 100) + '%'; $('quiz-q').textContent = q.q;
    var box = $('quiz-opts'); box.innerHTML = '';
    q.o.forEach(function (txt, i) {
      var b = mk('button', 'min-h-[44px] rounded-theme border border-border bg-input px-3 py-2 text-left text-sm font-semibold text-card-foreground', txt); b.type = 'button'; b.setAttribute('data-opt', i);
      b.addEventListener('click', function () { answer(i); }); box.appendChild(b);
    });
    $('quiz-why').classList.add('hidden'); $('quiz-next').classList.add('hidden');
  }
  function answer(i) {
    if (Q.locked) return; Q.locked = true;
    var q = data().trivia[Q.idx[Q.i]], right = i === q.c; if (right) Q.score++;
    WB.vibrate(right ? 25 : 60);
    Array.prototype.forEach.call($('quiz-opts').children, function (b, k) {
      b.disabled = true;
      b.className = 'min-h-[44px] rounded-theme border px-3 py-2 text-left text-sm font-semibold ' + (k === q.c ? 'border-success bg-success/15 text-success' : (k === i ? 'border-destructive/60 bg-destructive/10 text-destructive' : 'border-border bg-input text-muted-foreground'));
    });
    $('quiz-score-live').textContent = '⭐ ' + Q.score; $('quiz-why').textContent = q.x; $('quiz-why').classList.remove('hidden');
    $('quiz-next').textContent = t(Q.i === QUIZ_N - 1 ? 'molaQuizFinish' : 'molaQuizNext'); $('quiz-next').classList.remove('hidden');
  }
  $('quiz-next').addEventListener('click', function () {
    if (Q.i < QUIZ_N - 1) { Q.i++; renderQ(); return; }
    S.quiz.played++; if (Q.score > S.quiz.best) S.quiz.best = Q.score; save();
    $('quiz-bar').style.width = '100%'; $('quiz-final').textContent = t('molaQuizScore', { s: Q.score, n: QUIZ_N });
    var p = Q.score === 5 ? 'molaPraise5' : (Q.score === 4 ? 'molaPraise4' : (Q.score === 3 ? 'molaPraise3' : (Q.score >= 1 ? 'molaPraise2' : 'molaPraise0')));
    $('quiz-praise').textContent = t(p); $('quiz-best').textContent = t('molaQuizBest', { b: S.quiz.best, n: QUIZ_N }); show('quiz-end'); WB.vibrate(Q.score >= 4 ? [30, 60, 30] : 30); renderStats();
  });
  $('quiz-start').addEventListener('click', startQuiz);
  $('quiz-again').addEventListener('click', startQuiz);

  function renderAll() { renderDaily(); renderRiddle(); renderStats(); if (Q && Q.lang !== WB.lang()) { Q = null; show('quiz-intro'); } else if (Q && !$('quiz-play').classList.contains('hidden')) { /* soru sürerken dil değişmedi */ } }
  window.addEventListener('one-lang-changed', function () { rShow = { hint: false, ans: false }; renderAll(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { renderDaily(); } });
  renderAll();
  window.__mola = { state: function () { return S; }, quiz: function () { return Q; } };
})();
