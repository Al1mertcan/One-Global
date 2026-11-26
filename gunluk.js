/* Hemcan — Ruh hali günlüğü. Veriler yalnızca bu telefonda (localStorage "one-mood"). */
(function () {
  'use strict';
  var WB = window.WB, $ = WB.$, t = WB.t;
  var KEY = 'one-mood';
  var MOODS = [
    { v: 5, e: '😄', k: 'moodGreat', c: '#3DDBA5' },
    { v: 4, e: '🙂', k: 'moodGood', c: '#8FD98A' },
    { v: 3, e: '😐', k: 'moodOkay', c: '#F2D26D' },
    { v: 2, e: '😕', k: 'moodBad', c: '#F29A6D' },
    { v: 1, e: '😢', k: 'moodAwful', c: '#FF657A' }
  ];
  var ACTS = [
    { id: 'work', e: '💼' }, { id: 'study', e: '📚' }, { id: 'family', e: '👨‍👩‍👧' }, { id: 'friends', e: '🧑‍🤝‍🧑' },
    { id: 'partner', e: '❤️' }, { id: 'sport', e: '🏃' }, { id: 'sleep', e: '😴' }, { id: 'food', e: '🍽️' },
    { id: 'nature', e: '🌿' }, { id: 'reading', e: '📖' }, { id: 'rest', e: '🛋️' }, { id: 'hobby', e: '🎨' },
    { id: 'music', e: '🎵' }, { id: 'stress', e: '⚡' }
  ];
  var PROMPTS = 10;
  var KEEP_DAYS = 730;

  var state = load();
  var selMood = 0, selActs = {}, selDay = WB.today();
  var viewY = new Date().getFullYear(), viewM = new Date().getMonth();
  var pendingDelete = '';

  function load() {
    var s = WB.load(KEY, null);
    if (!s || !Array.isArray(s.entries)) s = { entries: [] };
    return s;
  }
  function save() {
    var cut = WB.addDays(WB.today(), -KEEP_DAYS);
    state.entries = state.entries.filter(function (e) { return e.day >= cut; });
    WB.save(KEY, state);
  }
  function moodOf(v) { for (var i = 0; i < MOODS.length; i++) if (MOODS[i].v === v) return MOODS[i]; return MOODS[2]; }
  function byDay(day) { return state.entries.filter(function (e) { return e.day === day; }).sort(function (a, b) { return a.ts - b.ts; }); }
  function dayAvg(day) {
    var es = byDay(day); if (!es.length) return 0;
    return es.reduce(function (a, e) { return a + e.mood; }, 0) / es.length;
  }
  function num(n, d) { try { return n.toLocaleString(WB.lang(), { maximumFractionDigits: d == null ? 1 : d, minimumFractionDigits: d == null ? 1 : d }); } catch (e) { return n.toFixed(1); } }

  // ---------- giriş formu ----------
  function renderForm() {
    var box = $('mood-btns'); box.innerHTML = '';
    MOODS.forEach(function (m) {
      var b = WB.el('button', 'flex flex-col items-center justify-center gap-1 rounded-theme border py-2.5 text-2xl transition-transform');
      b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', selMood === m.v ? 'true' : 'false');
      b.setAttribute('data-mood', m.v); b.setAttribute('aria-label', t(m.k));
      b.style.borderColor = selMood === m.v ? m.c : 'rgb(40 65 95)';
      b.style.background = selMood === m.v ? m.c + '26' : 'rgb(16 37 64)';
      if (selMood === m.v) b.style.transform = 'scale(1.06)';
      b.appendChild(WB.el('span', '', m.e));
      b.addEventListener('click', function () { selMood = m.v; WB.vibrate(10); renderForm(); });
      box.appendChild(b);
    });
    $('mood-label').textContent = selMood ? t(moodOf(selMood).k) : '';
    var chips = $('act-chips'); chips.innerHTML = '';
    ACTS.forEach(function (a) {
      var on = !!selActs[a.id];
      var c = WB.el('button', 'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ' + (on ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-input text-card-foreground'));
      c.type = 'button'; c.setAttribute('aria-pressed', on ? 'true' : 'false'); c.setAttribute('data-act', a.id);
      c.appendChild(WB.el('span', '', a.e)); c.appendChild(WB.el('span', '', t('moodAct_' + a.id)));
      c.addEventListener('click', function () { if (selActs[a.id]) delete selActs[a.id]; else selActs[a.id] = 1; renderForm(); });
      chips.appendChild(c);
    });
    $('mood-prompt').textContent = t('moodPrompt' + (((WB.dayNum(WB.today()) % PROMPTS) + PROMPTS) % PROMPTS));
    $('mood-save').disabled = !selMood;
    $('note-count').textContent = String(($('mood-note').value || '').length);
  }

  function saveEntry() {
    if (!selMood) return;
    var now = new Date();
    var note = ($('mood-note').value || '').trim().slice(0, 300);
    state.entries.push({
      id: now.getTime().toString(36) + Math.random().toString(36).slice(2, 6),
      ts: now.getTime(), day: WB.ymd(now), mood: selMood, acts: Object.keys(selActs), note: note
    });
    save();
    var low = selMood <= 2;
    selMood = 0; selActs = {}; $('mood-note').value = ''; selDay = WB.today();
    $('support').classList.toggle('hidden', !low);
    WB.toast(t('moodSaved'));
    renderAll();
  }

  // ---------- son 7 gün ----------
  function renderWeek() {
    var box = $('week-bars'); box.innerHTML = '';
    var today = WB.today(), sum = 0, cnt = 0, prevSum = 0, prevCnt = 0;
    for (var i = 6; i >= 0; i--) {
      var day = WB.addDays(today, -i), avg = dayAvg(day);
      if (avg) { sum += avg; cnt++; }
      var col = WB.el('button', 'flex h-full flex-1 flex-col items-center justify-end gap-1');
      col.type = 'button'; col.setAttribute('data-day', day);
      col.setAttribute('aria-label', WB.dateLabel(day) + (avg ? ': ' + num(avg) : ''));
      var bar = WB.el('div', 'w-full rounded-md');
      if (avg) { bar.style.height = (14 + (avg - 1) * 21) + '%'; bar.style.background = moodOf(Math.round(avg)).c; }
      else { bar.style.height = '8px'; bar.style.background = 'rgb(40 65 95)'; bar.style.opacity = '0.6'; }
      if (day === selDay) bar.style.outline = '2px solid rgb(57 215 255)';
      col.appendChild(bar);
      var d = WB.parse(day), lbl;
      try { lbl = d.toLocaleDateString(WB.lang(), { weekday: 'narrow' }); } catch (e) { lbl = String(d.getDate()); }
      col.appendChild(WB.el('span', 'text-[10px] text-muted-foreground', lbl));
      col.addEventListener('click', function () { selDay = this.getAttribute('data-day'); var dd = WB.parse(selDay); viewY = dd.getFullYear(); viewM = dd.getMonth(); renderAll(); });
      box.appendChild(col);
    }
    for (var j = 13; j >= 7; j--) { var a = dayAvg(WB.addDays(today, -j)); if (a) { prevSum += a; prevCnt++; } }
    var line = '';
    if (cnt) {
      line = t('moodWeekAvg', { n: num(sum / cnt) });
      if (prevCnt) {
        var diff = sum / cnt - prevSum / prevCnt;
        if (Math.abs(diff) >= 0.2) line += ' · ' + t(diff > 0 ? 'moodWeekUp' : 'moodWeekDown');
      }
    } else line = t('moodWeekNone');
    $('week-avg').textContent = line;
    var st = WB.streak(function (k) { return byDay(k).length > 0; });
    $('mood-streak').textContent = st >= 2 ? '🔥 ' + t('moodStreak', { n: st }) : '';
  }

  // ---------- ay görünümü ----------
  function renderMonth() {
    var now = new Date();
    if (viewY > now.getFullYear() || (viewY === now.getFullYear() && viewM > now.getMonth())) { viewY = now.getFullYear(); viewM = now.getMonth(); }
    var first = new Date(viewY, viewM, 1, 12);
    try { $('mon-label').textContent = first.toLocaleDateString(WB.lang(), { month: 'long', year: 'numeric' }); } catch (e) { $('mon-label').textContent = (viewM + 1) + '/' + viewY; }
    var isCur = viewY === now.getFullYear() && viewM === now.getMonth();
    $('mon-next').style.visibility = isCur ? 'hidden' : 'visible';
    var head = $('mon-head'); head.innerHTML = '';
    for (var w = 0; w < 7; w++) {
      var dd = new Date(2024, 0, 1 + w, 12); // 1 Ocak 2024 = Pazartesi
      var lbl; try { lbl = dd.toLocaleDateString(WB.lang(), { weekday: 'narrow' }); } catch (e) { lbl = ''; }
      head.appendChild(WB.el('span', '', lbl));
    }
    var grid = $('mon-grid'); grid.innerHTML = '';
    var lead = (first.getDay() + 6) % 7; // Pazartesi başlangıç
    for (var i = 0; i < lead; i++) grid.appendChild(WB.el('span', ''));
    var days = new Date(viewY, viewM + 1, 0).getDate(), today = WB.today();
    for (var d = 1; d <= days; d++) {
      var key = viewY + '-' + WB.pad(viewM + 1) + '-' + WB.pad(d), avg = dayAvg(key), future = key > today;
      var cell = WB.el('button', 'flex aspect-square items-center justify-center rounded-lg text-[11px] font-semibold ' + (future ? 'opacity-30' : ''), String(d));
      cell.type = 'button'; cell.setAttribute('data-day', key); cell.disabled = future;
      if (avg) { cell.style.background = moodOf(Math.round(avg)).c; cell.style.color = '#07111F'; }
      else { cell.style.background = 'rgb(16 37 64)'; cell.style.color = 'rgb(168 188 211)'; }
      if (key === selDay) cell.style.outline = '2px solid rgb(57 215 255)';
      else if (key === today) cell.style.outline = '1px dashed rgb(168 188 211)';
      cell.addEventListener('click', function () { selDay = this.getAttribute('data-day'); renderAll(); });
      grid.appendChild(cell);
    }
  }

  // ---------- seçili günün kayıtları ----------
  function renderDay() {
    $('day-title').textContent = selDay === WB.today() ? t('moodToday') : WB.dateLabel(selDay);
    var es = byDay(selDay), ul = $('day-list'); ul.innerHTML = '';
    $('day-empty').classList.toggle('hidden', es.length > 0);
    es.forEach(function (e) {
      var m = moodOf(e.mood);
      var li = WB.el('li', 'rounded-lg border border-border bg-input px-3 py-2.5');
      var row = WB.el('div', 'flex items-center gap-2');
      var face = WB.el('span', 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl', m.e); face.style.background = m.c + '33';
      row.appendChild(face);
      var mid = WB.el('div', 'min-w-0 flex-1');
      var tm = new Date(e.ts), hh = WB.pad(tm.getHours()) + ':' + WB.pad(tm.getMinutes());
      mid.appendChild(WB.el('p', 'text-xs font-semibold text-card-foreground', t(m.k) + ' · ' + hh));
      if (e.acts && e.acts.length) {
        var names = e.acts.map(function (id) { var a = ACTS.filter(function (x) { return x.id === id; })[0]; return a ? a.e + ' ' + t('moodAct_' + id) : ''; }).filter(Boolean).join('  ');
        mid.appendChild(WB.el('p', 'mt-0.5 text-[11px] text-muted-foreground', names));
      }
      row.appendChild(mid);
      var del = WB.el('button', 'shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ' + (pendingDelete === e.id ? 'bg-destructive/15 text-destructive' : 'text-muted-foreground'));
      del.type = 'button'; del.setAttribute('aria-label', t('moodDelete'));
      del.textContent = pendingDelete === e.id ? t('moodDeleteConfirm') : '✕';
      del.addEventListener('click', function () {
        if (pendingDelete === e.id) { state.entries = state.entries.filter(function (x) { return x.id !== e.id; }); pendingDelete = ''; save(); renderAll(); }
        else { pendingDelete = e.id; renderDay(); setTimeout(function () { if (pendingDelete === e.id) { pendingDelete = ''; renderDay(); } }, 3500); }
      });
      row.appendChild(del);
      li.appendChild(row);
      if (e.note) li.appendChild(WB.el('p', 'mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-card-foreground', e.note));
      ul.appendChild(li);
    });
  }

  // ---------- içgörüler ----------
  function renderInsights() {
    var ul = $('insights'); ul.innerHTML = '';
    var es = state.entries, total = es.length;
    var overall = total ? es.reduce(function (a, e) { return a + e.mood; }, 0) / total : 0;
    var stats = ACTS.map(function (a) {
      var m = es.filter(function (e) { return e.acts && e.acts.indexOf(a.id) >= 0; });
      return { a: a, n: m.length, avg: m.length ? m.reduce(function (s, e) { return s + e.mood; }, 0) / m.length : 0 };
    }).filter(function (s) { return s.n >= 3; });
    var shown = 0;
    if (total >= 8 && stats.length) {
      stats.sort(function (x, y) { return y.avg - x.avg; });
      var best = stats[0], worst = stats[stats.length - 1];
      if (best.avg - overall >= 0.3) {
        ul.appendChild(WB.el('li', 'rounded-lg border border-success/30 bg-success/5 px-3 py-2', '😊 ' + t('moodInsightBest', { act: best.a.e + ' ' + t('moodAct_' + best.a.id), n: num(best.avg), all: num(overall) }))); shown++;
      }
      if (worst !== best && overall - worst.avg >= 0.3) {
        ul.appendChild(WB.el('li', 'rounded-lg border border-chart5/30 bg-chart5/5 px-3 py-2', '🫶 ' + t('moodInsightWorst', { act: worst.a.e + ' ' + t('moodAct_' + worst.a.id), n: num(worst.avg), all: num(overall) }))); shown++;
      }
    }
    $('insight-empty').classList.toggle('hidden', shown > 0);
  }

  // ---------- dışa aktar ----------
  function exportText() {
    var from = WB.addDays(WB.today(), -29), lines = [];
    state.entries.filter(function (e) { return e.day >= from; }).sort(function (a, b) { return a.ts - b.ts; }).forEach(function (e) {
      var tm = new Date(e.ts), m = moodOf(e.mood);
      var acts = (e.acts || []).map(function (id) { return t('moodAct_' + id); }).join(', ');
      lines.push(e.day + ' ' + WB.pad(tm.getHours()) + ':' + WB.pad(tm.getMinutes()) + ' ' + m.e + ' ' + t(m.k) + (acts ? ' — ' + acts : '') + (e.note ? ' — ' + e.note : ''));
    });
    return lines.join('\n');
  }
  function copyText(txt) {
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt).then(function () { return true; }, function () { return fallback(); });
    return Promise.resolve(fallback());
  }

  function renderAll() { renderForm(); renderWeek(); renderMonth(); renderDay(); renderInsights(); }

  $('mood-save').addEventListener('click', saveEntry);
  $('mood-note').addEventListener('input', function () { $('note-count').textContent = String(this.value.length); });
  $('mon-prev').addEventListener('click', function () { viewM--; if (viewM < 0) { viewM = 11; viewY--; } renderMonth(); });
  $('mon-next').addEventListener('click', function () { viewM++; if (viewM > 11) { viewM = 0; viewY++; } renderMonth(); });
  $('mood-export').addEventListener('click', function () {
    var txt = exportText();
    if (!txt) { WB.toast(t('moodExportNone')); return; }
    copyText(txt).then(function (ok) { WB.toast(t(ok ? 'moodExportDone' : 'moodExportFail')); });
  });
  window.addEventListener('one-lang-changed', renderAll);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { state = load(); renderAll(); } });
  renderAll();
})();
