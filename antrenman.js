/* Hemcan — Antrenman takibi. Veriler yalnızca bu telefonda ("one-workout") saklanır. Tıbbi/antrenman tavsiyesi değildir. */
(function () {
  'use strict';
  var WB = window.WB, $ = WB.$, t = WB.t, KEY = 'one-workout';
  var BUILTIN = [
    { id: 'pullup', key: 'wkExPullup', mode: 'reps' }, { id: 'pushup', key: 'wkExPushup', mode: 'reps' },
    { id: 'situp', key: 'wkExSitup', mode: 'reps' }, { id: 'squat', key: 'wkExSquat', mode: 'reps' },
    { id: 'dips', key: 'wkExDips', mode: 'reps' }, { id: 'lunge', key: 'wkExLunge', mode: 'reps' },
    { id: 'plank', key: 'wkExPlank', mode: 'time' },
    { id: 'bench', key: 'wkExBench', mode: 'weight' }, { id: 'ohp', key: 'wkExOhp', mode: 'weight' },
    { id: 'dead', key: 'wkExDead', mode: 'weight' }, { id: 'row', key: 'wkExRow', mode: 'weight' }, { id: 'curl', key: 'wkExCurl', mode: 'weight' }
  ];
  var S = WB.load(KEY, null);
  if (!S || typeof S !== 'object' || Array.isArray(S) || !S.log) S = { v: 1, goal: 3, log: {}, custom: [], sel: 'pullup', rest: 60 };
  S.log = S.log || {}; S.custom = Array.isArray(S.custom) ? S.custom : []; S.goal = S.goal || 3; if (S.rest === undefined) S.rest = 60;
  function save() { var cut = WB.addDays(WB.today(), -800); Object.keys(S.log).forEach(function (k) { if (k < cut) delete S.log[k]; }); WB.save(KEY, S); }
  function all() { return BUILTIN.concat(S.custom.map(function (c) { return { id: c.id, name: c.name, mode: c.mode }; })); }
  function exById(id) { return all().filter(function (e) { return e.id === id; })[0]; }
  function exName(e) { return e ? (e.name || t(e.key)) : '?'; }
  function fmt(n) { try { return n.toLocaleString(WB.lang(), { maximumFractionDigits: 1 }); } catch (e) { return String(n); } }
  function num(v, max) { v = parseFloat(String(v).replace(',', '.')); return isNaN(v) || v < 0 ? 0 : Math.min(v, max); }
  function metric(e, s) { return e.mode === 'time' ? (s.s || 0) : e.mode === 'weight' ? (s.w || 0) : (s.r || 0); }
  function setText(e, s) { return e.mode === 'time' ? t('wkTotalSec', { n: fmt(s.s || 0) }) : e.mode === 'weight' ? fmt(s.w || 0) + ' kg × ' + (s.r || 0) : String(s.r || 0); }
  function bestOf(eid, exceptTs) {
    var e = exById(eid), best = 0; if (!e) return 0;
    Object.keys(S.log).forEach(function (d) { S.log[d].forEach(function (s) { if (s.e === eid && s.ts !== exceptTs) best = Math.max(best, metric(e, s)); }); });
    return best;
  }
  function bestText(e, v) { return e.mode === 'time' ? t('wkTotalSec', { n: fmt(v) }) : e.mode === 'weight' ? fmt(v) + ' kg' : String(v); }

  // ---- form ----
  function fillSelects() {
    var ex = $('ex'); ex.innerHTML = '';
    all().forEach(function (e) { var o = WB.el('option', '', exName(e)); o.value = e.id; if (e.id === S.sel) o.selected = true; ex.appendChild(o); });
    var g = $('goal'); g.innerHTML = '';
    for (var n = 1; n <= 7; n++) { var o2 = WB.el('option', '', t('wkGoalDays', { n: n })); o2.value = String(n); if (n === S.goal) o2.selected = true; g.appendChild(o2); }
    var r = $('rest'); r.innerHTML = '';
    [0, 30, 60, 90, 120].forEach(function (n) { var o3 = WB.el('option', '', n ? t('wkRestSec', { n: n }) : t('wkRestOff')); o3.value = String(n); if (n === S.rest) o3.selected = true; r.appendChild(o3); });
    var m = $('cx-mode'); if (!m.options.length) { [['reps', 'wkModeReps'], ['weight', 'wkModeWeight'], ['time', 'wkModeTime']].forEach(function (x) { var o4 = WB.el('option', '', t(x[1])); o4.value = x[0]; m.appendChild(o4); }); }
  }
  function syncMode() {
    var e = exById(S.sel) || BUILTIN[0];
    $('f-kg').classList.toggle('hidden', e.mode !== 'weight');
    $('f-sec').classList.toggle('hidden', e.mode !== 'time');
    $('f-reps').classList.toggle('hidden', e.mode === 'time');
    var b = bestOf(e.id); $('best-line').textContent = b ? t('wkBest', { v: bestText(e, b) }) : '';
  }
  $('ex').addEventListener('change', function () { S.sel = $('ex').value; save(); syncMode(); });
  $('reps-minus').addEventListener('click', function () { $('in-reps').value = Math.max(0, (parseInt($('in-reps').value, 10) || 0) - 1); });
  $('reps-plus').addEventListener('click', function () { $('in-reps').value = Math.min(9999, (parseInt($('in-reps').value, 10) || 0) + 1); });
  $('goal').addEventListener('change', function () { S.goal = parseInt($('goal').value, 10) || 3; save(); renderWeek(); });
  $('rest').addEventListener('change', function () { S.rest = parseInt($('rest').value, 10) || 0; save(); });

  // ---- dinlenme sayacı ----
  var restTimer = null, restEnd = 0;
  function stopRest() { clearInterval(restTimer); restTimer = null; $('rest-left').textContent = ''; }
  function startRest() {
    stopRest(); if (!S.rest) return;
    restEnd = Date.now() + S.rest * 1000;
    function tick() {
      var left = Math.ceil((restEnd - Date.now()) / 1000);
      if (left <= 0) { stopRest(); $('rest-left').textContent = t('wkRestEnd'); WB.vibrate([120, 60, 120]); setTimeout(function () { if (!restTimer) $('rest-left').textContent = ''; }, 3500); return; }
      $('rest-left').textContent = t('wkRestLeft', { n: left });
    }
    tick(); restTimer = setInterval(tick, 500);
  }

  $('btn-add').addEventListener('click', function () {
    var e = exById(S.sel) || BUILTIN[0], err = $('log-err'); err.classList.add('hidden');
    var s = { e: e.id, ts: Date.now() };
    if (e.mode === 'time') { s.s = Math.round(num($('in-sec').value, 36000)); if (!s.s) { err.textContent = t('wkNeedValue'); err.classList.remove('hidden'); return; } }
    else { s.r = Math.round(num($('in-reps').value, 9999)); if (!s.r) { err.textContent = t('wkNeedValue'); err.classList.remove('hidden'); return; }
      if (e.mode === 'weight') { s.w = Math.round(num($('in-kg').value, 999) * 10) / 10; } }
    var prev = bestOf(e.id), now = metric(e, s);
    var k = WB.today(); (S.log[k] = S.log[k] || []).push(s); save();
    var rm = $('record-msg'); rm.textContent = (prev > 0 && now > prev) ? t('wkRecord') : '';
    WB.vibrate(prev > 0 && now > prev ? [40, 30, 40] : 15);
    render(); startRest();
  });

  $('cx-save').addEventListener('click', function () {
    var name = ($('cx-name').value || '').trim().slice(0, 40); if (!name) return;
    var id = 'c' + Date.now().toString(36); S.custom.push({ id: id, name: name, mode: $('cx-mode').value || 'reps' });
    S.sel = id; $('cx-name').value = ''; save(); fillSelects(); syncMode();
  });

  // ---- hafta ----
  function mondayOf(key) { var d = WB.parse(key); var wd = (d.getDay() + 6) % 7; return WB.addDays(key, -wd); }
  function renderWeek() {
    var mon = mondayOf(WB.today()), box = $('week-cells'); box.innerHTML = '';
    var names = t('wkDays').split(','), cnt = 0;
    for (var i = 0; i < 7; i++) {
      var k = WB.addDays(mon, i), has = (S.log[k] || []).length > 0; if (has) cnt++;
      var isToday = k === WB.today();
      var c = WB.el('div', 'rounded-lg border py-1.5 ' + (has ? 'border-destructive bg-destructive/20 text-destructive' : (isToday ? 'border-primary text-primary' : 'border-border text-muted-foreground')));
      c.appendChild(WB.el('div', 'text-[10px] font-semibold', names[i] || ''));
      c.appendChild(WB.el('div', 'text-sm font-bold', has ? '✓' : '·'));
      box.appendChild(c);
    }
    $('week-prog').textContent = t('wkWeekProg', { a: cnt, b: S.goal });
    $('goal-done').classList.toggle('hidden', cnt < S.goal);
  }

  // ---- bugün + geçmiş ----
  function group(list) {
    var order = [], map = {};
    list.forEach(function (s, idx) { if (!map[s.e]) { map[s.e] = []; order.push(s.e); } map[s.e].push({ s: s, idx: idx }); });
    return order.map(function (id) { return { id: id, sets: map[id] }; });
  }
  function totalText(e, sets) {
    var parts = [t('wkTotalSets', { n: sets.length })];
    if (e.mode === 'reps') parts.push(t('wkTotalReps', { n: fmt(sets.reduce(function (a, x) { return a + (x.s.r || 0); }, 0)) }));
    else if (e.mode === 'weight') parts.push(t('wkTotalKg', { n: fmt(sets.reduce(function (a, x) { return a + (x.s.r || 0) * (x.s.w || 0); }, 0)) }));
    else parts.push(t('wkTotalSec', { n: fmt(sets.reduce(function (a, x) { return a + (x.s.s || 0); }, 0)) }));
    return parts.join(' · ');
  }
  function renderToday() {
    var list = S.log[WB.today()] || [], ul = $('today-list'); ul.innerHTML = '';
    $('today-empty').classList.toggle('hidden', list.length > 0);
    group(list).forEach(function (g) {
      var e = exById(g.id) || { id: g.id, name: '?', mode: 'reps' };
      var li = WB.el('li', 'rounded-[20px] border border-destructive/25 bg-card p-3.5');
      var head = WB.el('div', 'flex items-baseline justify-between gap-2');
      head.appendChild(WB.el('p', 'text-sm font-semibold text-destructive', exName(e)));
      head.appendChild(WB.el('p', 'text-[11px] font-semibold text-muted-foreground', totalText(e, g.sets)));
      li.appendChild(head);
      var row = WB.el('div', 'mt-2 flex flex-wrap gap-1.5');
      g.sets.forEach(function (x) {
        var b = WB.el('button', 'flex items-center gap-1 rounded-full border border-border bg-input px-2.5 py-1 text-xs font-semibold text-card-foreground', setText(e, x.s) + ' ');
        b.type = 'button'; b.setAttribute('aria-label', t('wkDelSet')); b.appendChild(WB.el('span', 'text-muted-foreground', '×'));
        b.addEventListener('click', function () { var arr = S.log[WB.today()] || []; arr.splice(arr.indexOf(x.s), 1); if (!arr.length) delete S.log[WB.today()]; save(); render(); });
        row.appendChild(b);
      });
      li.appendChild(row); ul.appendChild(li);
    });
  }
  function renderHistory() {
    var ul = $('hist-list'); ul.innerHTML = '';
    var days = Object.keys(S.log).filter(function (k) { return k !== WB.today() && S.log[k].length; }).sort().reverse().slice(0, 10);
    $('hist-empty').classList.toggle('hidden', days.length > 0);
    days.forEach(function (k) {
      var li = WB.el('li', 'rounded-[16px] border border-border bg-card/70 px-3.5 py-2.5');
      li.appendChild(WB.el('p', 'text-[11px] font-semibold text-muted-foreground', WB.dateLabel(k)));
      var txt = group(S.log[k]).map(function (g) { var e = exById(g.id) || { name: '?' }; return exName(e) + ' ' + g.sets.length + '×'; }).join(' · ');
      li.appendChild(WB.el('p', 'mt-0.5 text-xs text-card-foreground', txt));
      ul.appendChild(li);
    });
  }
  function render() { syncMode(); renderWeek(); renderToday(); renderHistory(); }
  window.addEventListener('one-lang-changed', function () { fillSelects(); render(); });
  fillSelects(); render();
})();
