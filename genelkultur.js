/* Hemcan — Günlük genel kültür (10 soru, soru başına 30 sn). Cevaplar yalnızca bu telefonda ("one-genelkultur"); sıralama için sunucuya rastgele kimlik + cevaplar gider. */
(function () {
  'use strict';
  var WB = window.WB, $ = WB.$, t = WB.t, Core = window.DailyCore, Net = window.DailyNet;
  var KEY = 'one-genelkultur', GAME = 'trivia', NQ = 10, PER_Q = 30000, FEEDBACK_MS = 1300;
  var S = WB.load(KEY, null) || {}; S.v = 1; S.days = S.days || {};
  function save() { var cut = WB.addDays(WB.today(), -12); Object.keys(S.days).forEach(function (k) { if (k < cut) delete S.days[k]; }); WB.save(KEY, S); }
  function mk(tag, cls, text) { return WB.el(tag, cls, text); }
  function bank(lang) { var d = window.MOLA_DATA || {}; return ((d[lang || WB.lang()] || d.en || {}).trivia) || []; }
  function poolSize() { return ((window.MOLA_DATA || {}).tr || { trivia: [] }).trivia.length; }
  function questionIdx(day) { return Core.pickQuestions(day, poolSize()); }
  function rec(day) { return S.days[day] || null; }

  function rankText(res) {
    if (!res) return t('dlRankLoading');
    if (res.status === 'ready') return res.rank === 1 ? t('dlRankFirst', { t: res.total }) : t('dlRankReady', { n: res.rank, t: res.total });
    if (res.status === 'pending') return t('dlRankPending');
    if (res.status === 'invalid') return t('dlRankInvalid');
    return t('dlRankNone');
  }
  function submitText(r, day) {
    if (!r.ranked) return t('dlUnranked');
    if (r.submit === 'sending') return t('dlSending');
    if (r.submit === 'pending') return t('dlSendFail');
    if (r.submit === 'invalid') return t('gkInvalid');
    if (r.submit === 'closed' || r.submit === 'lost') return t('dlClosed');
    return rankText(r.res || (Date.now() < Core.publishAt(day) ? { status: 'pending' } : null));
  }

  var view = null, cur = null, timer = null, advance = null, connectToken = null, pendingOpen = null;
  function show(v) {
    view = v;
    [['home', 'gk-home'], ['connect', 'gk-connect'], ['play', 'gk-play'], ['end', 'gk-end']].forEach(function (p) { $(p[1]).classList.toggle('hidden', p[0] !== v); });
    if (v !== 'play') { stopTimer(); WB.wakeOff && WB.wakeOff(); }
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } if (advance) { clearTimeout(advance); advance = null; } }

  // ---------- ana ekran ----------
  function renderHome() {
    var day = Net.today(), r = rec(day);
    $('gk-date').textContent = WB.dateLabel(day, { day: 'numeric', month: 'long', weekday: 'long' });
    var done = r && r.status === 'done';
    $('gk-start').classList.toggle('hidden', !!done); $('gk-start').textContent = t(r && r.status === 'play' ? 'sdResume' : 'gkStart');
    $('gk-today').classList.toggle('hidden', !done);
    if (done) { $('gk-today-score').textContent = t('gkScore', { c: r.correct, n: NQ }); $('gk-today-rank').textContent = submitText(r, day); }
    renderPast();
  }
  function renderPast() {
    var ul = $('gk-past'); ul.innerHTML = ''; var today = Net.today(), items = [];
    Object.keys(S.days).sort().reverse().forEach(function (d) { var r = rec(d); if (d !== today && r && r.status === 'done') items.push({ d: d, r: r }); });
    if (!items.length) { ul.appendChild(mk('li', 'text-xs text-muted-foreground', t('dlNoPast'))); return; }
    items.forEach(function (it) {
      var li = mk('li', 'rounded-[16px] border border-border bg-card/70 px-3 py-2');
      li.appendChild(mk('p', 'text-xs font-semibold', WB.dateLabel(it.d, { day: 'numeric', month: 'short' }) + ' · ' + t('gkScore', { c: it.r.correct, n: NQ })));
      var p = mk('p', 'mt-0.5 text-[11px] leading-5 text-muted-foreground', submitText(it.r, it.d)); p.setAttribute('data-past-rank', it.d); li.appendChild(p); ul.appendChild(li);
    });
  }
  function sync() {
    var now = Date.now();
    Object.keys(S.days).forEach(function (d) {
      var r = rec(d); if (!r || r.status !== 'done' || !r.ranked) return;
      if ((r.submit === 'pending' || r.submit === 'sending') && now < Core.publishAt(d)) { sendResult(d, r); return; }
      if (r.submit === 'sent' && now >= Core.publishAt(d) && !(r.res && r.res.status === 'ready')) {
        Net.call('result', GAME, d).then(function (x) {
          if (x.net && x.status === 200 && x.data && x.data.status) { r.res = x.data; save(); if (view === 'home') renderHome(); if (view === 'end' && cur && cur.day === d) renderEnd(); }
        });
      }
    });
  }
  function sendResult(day, r) {
    return Net.call('submit', GAME, day, { answers: r.answers }).then(function (x) {
      if (!x.net) r.submit = 'pending';
      else if (x.status === 200 && x.data.ok) r.submit = x.data.status === 'invalid' ? 'invalid' : 'sent';
      else if (x.data && x.data.error === 'closed') r.submit = 'closed';
      else if (x.data && x.data.error === 'not_started') r.submit = 'lost';
      else r.submit = 'pending';
      save(); if (view === 'home') renderHome(); if (view === 'end' && cur && cur.day === day) renderEnd();
    });
  }

  // ---------- başlatma ----------
  $('gk-start').addEventListener('click', function () { openToday(); });
  function openToday() {
    var day = Net.today(), r = rec(day);
    if (r && r.status === 'play') { begin(day); return; }
    if (r && r.status === 'done') return;
    show('connect'); $('gk-connect-btns').classList.add('hidden'); $('gk-connect-btns').classList.remove('grid'); $('gk-connect-msg').textContent = t('dlConnecting');
    var token = {}; connectToken = token;
    Net.call('start', GAME, day).then(function (x) {
      if (connectToken !== token) return;
      if (x.net && x.status === 200 && x.data.ok) { newRecord(day, true); begin(day); return; }
      if (x.net && x.status === 200 && x.data.error === 'already_done') { S.days[day] = { status: 'done', ranked: true, answers: [], correct: 0, submit: 'sent', res: null }; save(); renderHome(); show('home'); return; }
      $('gk-connect-msg').textContent = t('dlOffline'); $('gk-connect-btns').classList.remove('hidden'); $('gk-connect-btns').classList.add('grid'); pendingOpen = day;
    });
  }
  function newRecord(day, ranked) { S.days[day] = { status: 'play', ranked: !!ranked, answers: [], i: 0, qStart: Date.now(), correct: 0, submit: ranked ? 'none' : 'unranked', res: null }; save(); }
  $('gk-retry').addEventListener('click', function () { openToday(); });
  $('gk-unranked').addEventListener('click', function () { if (pendingOpen) { newRecord(pendingOpen, false); begin(pendingOpen); } });
  $('gk-connect-back').addEventListener('click', function () { connectToken = null; renderHome(); show('home'); });

  // ---------- oyun ----------
  function begin(day) {
    var r = rec(day); if (!r) return;
    cur = { day: day, r: r, idx: questionIdx(day), locked: false };
    // uygulama kapalıyken süresi dolan / cevaplanmış soruları kapat
    if (r.answers.length > r.i) { r.i = r.answers.length; r.qStart = Date.now(); }
    if (r.i < NQ && Date.now() - r.qStart > PER_Q) { r.answers[r.i] = -1; r.i++; r.qStart = Date.now(); }
    save();
    if (r.i >= NQ) { finishGame(); return; }
    show('play'); WB.wakeOn && WB.wakeOn(); renderQuestion();
  }
  function curQ() { var q = bank()[cur.idx[cur.r.i]]; return q; }
  function renderQuestion() {
    var r = cur.r; if (r.i >= NQ) { finishGame(); return; }
    var q = curQ(); cur.locked = false; $('gk-fb').textContent = ''; $('gk-fb').className = 'mt-3 min-h-[1.25rem] text-sm font-bold';
    $('gk-num').textContent = t('gkQ', { i: r.i + 1, n: NQ }); $('gk-score-live').textContent = '⭐ ' + liveScore(); $('gk-q').textContent = q.q;
    var box = $('gk-opts'); box.innerHTML = '';
    q.o.forEach(function (txt, k) {
      var b = mk('button', 'min-h-[48px] rounded-theme border border-border bg-input px-3 py-2 text-left text-sm font-semibold text-card-foreground', txt); b.type = 'button'; b.setAttribute('data-opt', k);
      b.addEventListener('click', function () { answer(k); }); box.appendChild(b);
    });
    stopTimer(); tickTime(); timer = setInterval(tickTime, 200);
  }
  function liveScore() { var s = 0, q = window.MOLA_DATA.tr.trivia; cur.r.answers.forEach(function (a, i) { if (a === q[cur.idx[i]].c) s++; }); return s; }
  function tickTime() {
    if (!cur || cur.locked) return;
    var left = PER_Q - (Date.now() - cur.r.qStart);
    if (left <= 0) { answer(-1); return; }
    $('gk-secs').textContent = t('gkSecs', { s: Math.ceil(left / 1000) }); $('gk-timebar').style.width = Math.max(0, left / PER_Q * 100) + '%';
    $('gk-timebar').className = 'h-full rounded-full ' + (left < 8000 ? 'bg-destructive' : 'bg-primary');
  }
  function answer(k) {
    if (!cur || cur.locked) return; cur.locked = true; clearInterval(timer); timer = null;
    var r = cur.r, q = curQ(), right = k === q.c;
    r.answers[r.i] = k; save(); WB.vibrate(k < 0 ? [30, 40, 30] : right ? 25 : 60);
    Array.prototype.forEach.call($('gk-opts').children, function (b, j) {
      b.disabled = true;
      b.className = 'min-h-[48px] rounded-theme border px-3 py-2 text-left text-sm font-semibold ' + (j === q.c ? 'border-success bg-success/15 text-success' : (j === k ? 'border-destructive/60 bg-destructive/10 text-destructive' : 'border-border bg-input text-muted-foreground'));
    });
    $('gk-fb').textContent = k < 0 ? t('gkTimeUp') : (right ? t('gkCorrect') : t('gkWrong')); $('gk-fb').className = 'mt-3 min-h-[1.25rem] text-sm font-bold ' + (right ? 'text-success' : 'text-destructive');
    $('gk-score-live').textContent = '⭐ ' + liveScore(); $('gk-secs').textContent = k < 0 ? t('gkSecs', { s: 0 }) : $('gk-secs').textContent;
    advance = setTimeout(function () { advance = null; r.i++; r.qStart = Date.now(); save(); if (r.i >= NQ) finishGame(); else renderQuestion(); }, FEEDBACK_MS);
  }
  function finishGame() {
    stopTimer(); var r = cur.r; r.status = 'done'; r.correct = liveScore(); r.submit = r.ranked ? 'sending' : 'unranked'; save(); WB.vibrate([40, 60, 40]);
    renderEnd(); show('end'); if (r.ranked) sendResult(cur.day, r);
  }
  function renderEnd() {
    if (!cur) return; var r = cur.r;
    $('gk-end-score').textContent = t('gkScore', { c: r.correct, n: NQ });
    $('gk-end-praise').textContent = t(r.correct >= 10 ? 'gkPraise10' : r.correct >= 7 ? 'gkPraise7' : r.correct >= 4 ? 'gkPraise4' : 'gkPraise0');
    $('gk-end-rank').textContent = submitText(r, cur.day);
  }
  $('gk-end-menu').addEventListener('click', function () { renderHome(); show('home'); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { if (view === 'play') tickTime(); else if (view === 'home') renderHome(); sync(); } });
  window.addEventListener('one-lang-changed', function () { if (view === 'home') renderHome(); else if (view === 'end') renderEnd(); else if (view === 'play' && !cur.locked) renderQuestion(); });

  // Uygulama kapanıp açıldıysa süren oyunu doğrudan sürdür (süre zaten işliyor)
  var tr = rec(Net.today());
  renderHome(); show('home'); sync();
  if (tr && tr.status === 'play') { begin(Net.today()); }
  window.__gk = { state: function () { return S; }, cur: function () { return cur; }, view: function () { return view; }, speed: function () { FEEDBACK_MS = 80; } };
})();
