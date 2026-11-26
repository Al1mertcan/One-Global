/* Hemcan — Alışkanlık serisi ve küçük dost. Veriler yalnızca bu telefonda ("one-habits"). */
(function () {
  'use strict';
  var WB = window.WB, $ = WB.$, t = WB.t;
  var KEY = 'one-habits';
  var STAGES = [0, 15, 60, 150, 350];
  var COLORS = { mint: ['#5EE2B4', '#C4F7E3', '#2E9F7C'], sky: ['#6CC8FF', '#CDEEFF', '#3A8CBF'], lilac: ['#B79CFF', '#E4DAFF', '#7C62C9'], peach: ['#FFA88A', '#FFDCCF', '#CC6F4F'], gold: ['#F6C65B', '#FFEBB0', '#BE922D'] };
  var COLOR_IDS = ['mint', 'sky', 'lilac', 'peach', 'gold'];
  var ACC_IDS = ['none', 'bow', 'glasses', 'scarf', 'crown'];
  var ICONS = ['💧', '🚶', '🏃', '🧘', '📖', '✍️', '🥗', '🍎', '💊', '😴', '🙏', '🧹', '🎸', '🧠', '☀️', '🦷', '📵', '🐕', '🌱', '💪', '🎨', '📞', '🛏️', '☕'];
  var SUGGEST = [
    { key: 'habS_water', icon: '💧', auto: 'water' }, { key: 'habS_mood', icon: '📝', auto: 'mood' }, { key: 'habS_calm', icon: '🌬️', auto: 'calm' },
    { key: 'habS_walk', icon: '🚶' }, { key: 'habS_read', icon: '📖' }, { key: 'habS_sleep', icon: '🌙' },
    { key: 'habS_stretch', icon: '🧘' }, { key: 'habS_gratitude', icon: '🙏' }, { key: 'habS_teeth', icon: '🦷' }
  ];

  var S = load(), editing = null, src = null; // editing: { id|null, ... }

  function load() {
    var s = WB.load(KEY, null);
    if (!s || !Array.isArray(s.habits)) s = { habits: [], log: {}, pet: {}, seen: 0 };
    s.log = s.log || {}; s.pet = s.pet || {}; s.seen = s.seen || 0;
    return s;
  }
  function save() {
    var cut = WB.addDays(WB.today(), -800); Object.keys(S.log).forEach(function (k) { if (k < cut) delete S.log[k]; });
    WB.save(KEY, S);
  }
  function dow(day) { return (WB.parse(day).getDay() + 6) % 7; } // Pzt = 0
  function hName(h) { return h.key ? t(h.key) : h.name; }
  function newId() { return 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

  // ---------- otomatik alışkanlıklar (diğer sayfaların verisinden) ----------
  function loadSources() {
    var water = WB.load('one-water', null), cfg = WB.load('one-water-cfg', null), hist = WB.load('one-water-hist', {}), mood = WB.load('one-mood', { entries: [] }), calm = WB.load('one-calm', { days: {} });
    var moodDays = {}; (mood.entries || []).forEach(function (e) { moodDays[e.day] = 1; });
    src = { goal: (cfg && cfg.goal) || 2000, hist: hist, today: water && Array.isArray(water.log) ? { date: water.date, ml: water.log.reduce(function (a, b) { return a + b; }, 0) } : null, moodDays: moodDays, calm: calm.days || {} };
  }
  function autoDone(kind, day) {
    if (!kind || !src) return false;
    if (kind === 'water') { var ml = src.hist[day] || 0; if (src.today && src.today.date === day) ml = Math.max(ml, src.today.ml); return ml >= src.goal; }
    if (kind === 'mood') return !!src.moodDays[day];
    if (kind === 'calm') { var d = src.calm[day]; return !!d && ((d.breath || 0) + (d.med || 0)) >= 60; }
    return false;
  }
  function scheduled(h, day) { return day >= h.created && (!h.days || !h.days.length || h.days.indexOf(dow(day)) >= 0); }
  function manual(h, day) { return (S.log[day] || []).indexOf(h.id) >= 0; }
  function done(h, day) { return manual(h, day) || autoDone(h.auto, day); }

  function streakOf(h) {
    var today = WB.today(), k = today, n = 0, guard = 0;
    while (k >= h.created && guard++ < 1500) {
      if (scheduled(h, k)) { if (done(h, k)) n++; else if (k !== today) break; }
      k = WB.addDays(k, -1);
    }
    return n;
  }
  function bestOf(h) {
    var k = h.created, today = WB.today(), best = 0, cur = 0, guard = 0;
    while (k <= today && guard++ < 1500) { if (scheduled(h, k)) { if (done(h, k)) { cur++; if (cur > best) best = cur; } else if (k !== today) cur = 0; } k = WB.addDays(k, 1); }
    return best;
  }
  function totalStars() {
    if (!S.habits.length) return 0;
    var first = S.habits.reduce(function (a, h) { return h.created < a ? h.created : a; }, WB.today()), today = WB.today(), k = first, stars = 0, guard = 0;
    while (k <= today && guard++ < 1500) {
      var sch = S.habits.filter(function (h) { return scheduled(h, k); }), dn = sch.filter(function (h) { return done(h, k); }).length;
      stars += dn; if (sch.length >= 2 && dn === sch.length) stars += 2;
      k = WB.addDays(k, 1);
    }
    return stars;
  }
  function stageOf(stars) { var s = 0; for (var i = 0; i < STAGES.length; i++) if (stars >= STAGES[i]) s = i; return s; }

  // ---------- küçük dost (SVG) ----------
  function leaf(x, y, rot, fill) { return '<path d="M0 0 C-6 -12 -2 -24 8 -26 C12 -16 8 -6 0 0Z" fill="' + fill + '" transform="translate(' + x + ' ' + y + ') rotate(' + rot + ')"/>'; }
  function petSVG(o) {
    var c = COLORS[o.color] || COLORS.mint, sc = [0, 0.8, 0.9, 1, 1.08][o.stage], out = '', id = 'pg' + Math.floor(Math.random() * 1e6);
    out += '<svg id="pet-svg" viewBox="0 0 120 120" class="' + (o.stage === 0 ? 'egg' : '') + '" role="img" aria-label="' + WB.esc(o.name) + '"><defs><radialGradient id="' + id + '" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#F6C65B" stop-opacity=".45"/><stop offset="1" stop-color="#F6C65B" stop-opacity="0"/></radialGradient></defs>';
    if (o.stage === 4) out += '<circle cx="60" cy="68" r="56" fill="url(#' + id + ')"/>';
    out += '<ellipse cx="60" cy="110" rx="' + (o.stage === 0 ? 24 : 30 * sc) + '" ry="5" fill="#000" opacity=".28"/>';
    if (o.stage === 0) {
      out += '<path d="M60 20 C86 20 98 62 98 82 C98 101 82 110 60 110 C38 110 22 101 22 82 C22 62 34 20 60 20Z" fill="' + c[1] + '" stroke="' + c[2] + '" stroke-width="2"/>';
      out += '<circle cx="46" cy="56" r="5" fill="' + c[0] + '"/><circle cx="72" cy="70" r="6.5" fill="' + c[0] + '"/><circle cx="54" cy="90" r="4.5" fill="' + c[0] + '"/><circle cx="76" cy="44" r="3.5" fill="' + c[0] + '"/>';
      if (o.progress > 0.5) out += '<path d="M40 70 l9 9 l9 -9 l9 9 l9 -9 l9 9" fill="none" stroke="' + c[2] + '" stroke-width="2" stroke-linecap="round"/>';
      return out + '</svg>';
    }
    out += '<g transform="translate(60 72) scale(' + sc + ')">';
    var green = '#3FCB94';
    if (o.acc !== 'crown') {
      if (o.stage === 1) out += leaf(0, -32, 0, green);
      else if (o.stage === 2) out += leaf(-3, -33, -28, green) + leaf(3, -33, 28, green);
      else if (o.stage === 3) out += leaf(-6, -32, -40, green) + leaf(0, -34, 0, green) + leaf(6, -32, 40, green);
      else out += leaf(-10, -31, -55, green) + leaf(-5, -33, -25, green) + leaf(0, -35, 0, green) + leaf(5, -33, 25, green) + leaf(10, -31, 55, green);
    }
    if (o.stage >= 2) out += '<ellipse cx="-17" cy="32" rx="9" ry="5" fill="' + c[2] + '"/><ellipse cx="17" cy="32" rx="9" ry="5" fill="' + c[2] + '"/>';
    if (o.stage >= 3) out += '<ellipse cx="-38" cy="6" rx="7" ry="11" fill="' + c[0] + '" transform="rotate(20 -38 6)"/><ellipse cx="38" cy="6" rx="7" ry="11" fill="' + c[0] + '" transform="rotate(-20 38 6)"/>';
    out += '<ellipse cx="0" cy="0" rx="38" ry="34" fill="' + c[0] + '"/><ellipse cx="0" cy="12" rx="25" ry="19" fill="' + c[1] + '" opacity=".75"/>';
    if (o.acc === 'crown') out += '<path d="M-17 -30 L-20 -48 L-9 -39 L0 -52 L9 -39 L20 -48 L17 -30Z" fill="#F6C65B" stroke="#BE922D" stroke-width="1.5" stroke-linejoin="round"/><circle cx="0" cy="-52" r="2.5" fill="#FF657A"/>';
    // yüz
    var eye = function (x) { return o.sleepy ? '<path d="M' + (x - 5) + ' -3 Q' + x + ' 3 ' + (x + 5) + ' -3" fill="none" stroke="#0E2238" stroke-width="2.4" stroke-linecap="round"/>' : '<ellipse cx="' + x + '" cy="-3" rx="4.4" ry="5.6" fill="#0E2238"/><circle cx="' + (x + 1.4) + '" cy="-5.2" r="1.6" fill="#fff"/>'; };
    out += eye(-13) + eye(13) + '<ellipse cx="-24" cy="7" rx="5" ry="3" fill="#FF8FA3" opacity=".55"/><ellipse cx="24" cy="7" rx="5" ry="3" fill="#FF8FA3" opacity=".55"/>';
    if (o.mood === 'happy') out += '<path d="M-8 7 Q0 19 8 7Z" fill="#0E2238"/><path d="M-4 12 Q0 15 4 12" fill="none" stroke="#FF8FA3" stroke-width="2" stroke-linecap="round"/>';
    else if (o.mood === 'wait') out += '<path d="M-5 11 Q0 13 5 11" fill="none" stroke="#0E2238" stroke-width="2.2" stroke-linecap="round"/>';
    else out += '<path d="M-7 8 Q0 15 7 8" fill="none" stroke="#0E2238" stroke-width="2.4" stroke-linecap="round"/>';
    if (o.acc === 'bow') out += '<g transform="translate(24 -24) rotate(20)"><path d="M0 0 L-12 -8 L-12 8Z M0 0 L12 -8 L12 8Z" fill="#FF657A"/><circle r="3.5" fill="#FF8FA3"/></g>';
    if (o.acc === 'glasses') out += '<circle cx="-13" cy="-3" r="9.5" fill="rgba(255,255,255,.12)" stroke="#0E2238" stroke-width="2"/><circle cx="13" cy="-3" r="9.5" fill="rgba(255,255,255,.12)" stroke="#0E2238" stroke-width="2"/><path d="M-3.5 -3 L3.5 -3" stroke="#0E2238" stroke-width="2"/>';
    if (o.acc === 'scarf') out += '<path d="M-30 20 Q0 38 30 20 L28 31 Q0 46 -28 31Z" fill="#FF657A"/><path d="M14 34 L22 52 L12 50 L8 36Z" fill="#E04560"/>';
    out += '</g>';
    if (o.stage === 4) out += '<g fill="#F6C65B"><path d="M14 30 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"/><path d="M104 24 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5z"/></g>';
    return out + '</svg>';
  }
  function say(state) {
    var n = { all: 3, some: 3, none: 3, night: 2, egg: 2 }[state] || 1, i = (WB.dayNum(WB.today()) + (say.bump || 0)) % n;
    return t('habMsg_' + state + i);
  }

  // ---------- çizim ----------
  function dueToday() { return S.habits.filter(function (h) { return scheduled(h, WB.today()); }); }
  function renderPet() {
    var stars = totalStars(), stage = stageOf(stars), name = S.pet.name || t('habPetDefault');
    var due = dueToday(), dn = due.filter(function (h) { return done(h, WB.today()); }).length, hr = new Date().getHours();
    var sleepy = hr >= 22 || hr < 6, mood = due.length && dn === due.length ? 'happy' : (dn > 0 ? 'smile' : 'wait');
    var next = STAGES[stage + 1], prev = STAGES[stage], progress = next ? (stars - prev) / (next - prev) : 1;
    var color = COLOR_IDS.indexOf(S.pet.color) >= 0 && COLOR_IDS.indexOf(S.pet.color) <= stage ? S.pet.color : 'mint';
    var acc = ACC_IDS.indexOf(S.pet.acc) >= 0 && ACC_IDS.indexOf(S.pet.acc) <= stage ? S.pet.acc : 'none';
    $('pet-holder').innerHTML = petSVG({ stage: stage, color: color, acc: acc, name: name, sleepy: sleepy && stage > 0, mood: mood, progress: progress });
    $('pet-name').textContent = name;
    $('pet-stage').textContent = t('habStage' + stage);
    var st = stage === 0 ? 'egg' : (sleepy ? 'night' : (due.length && dn === due.length ? 'all' : (dn > 0 ? 'some' : 'none')));
    $('pet-bubble').textContent = say(st);
    $('stars-line').textContent = '⭐ ' + stars;
    $('next-line').textContent = next ? t('habNext', { n: next - stars, stage: t('habStage' + (stage + 1)) }) : t('habMaxStage');
    $('stage-bar').style.width = Math.round(progress * 100) + '%';
    // süsleme
    var cl = $('color-list'); cl.innerHTML = '';
    COLOR_IDS.forEach(function (id, i) {
      var locked = i > stage, on = id === color, b = WB.el('button', 'relative h-9 w-9 rounded-full border-2 ' + (on ? 'border-foreground' : 'border-transparent') + (locked ? ' opacity-40' : ''));
      b.type = 'button'; b.style.background = COLORS[id][0]; b.disabled = locked; b.setAttribute('data-color', id); b.setAttribute('aria-label', t('habColor_' + id) + (locked ? ' (' + t('habStage' + i) + ')' : ''));
      if (locked) b.textContent = '🔒';
      b.addEventListener('click', function () { S.pet.color = id; save(); renderPet(); });
      cl.appendChild(b);
    });
    var al = $('acc-list'); al.innerHTML = '';
    ACC_IDS.forEach(function (id, i) {
      var locked = i > stage, on = id === acc, b = WB.el('button', 'rounded-full border px-3 py-1.5 text-xs font-semibold ' + (on ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-input text-card-foreground') + (locked ? ' opacity-40' : ''), (locked ? '🔒 ' : '') + t('habAcc_' + id));
      b.type = 'button'; b.disabled = locked; b.setAttribute('data-acc', id); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.addEventListener('click', function () { S.pet.acc = id; save(); renderPet(); });
      al.appendChild(b);
    });
    // seviye atlama
    if (stage > S.seen) {
      if (S.habits.length && stage >= 1) { $('levelup').classList.remove('hidden'); $('levelup-text').textContent = stage === 1 ? t('habHatched', { name: name }) : t('habGrew', { name: name, stage: t('habStage' + stage) }); }
      else { S.seen = stage; save(); }
    } else $('levelup').classList.add('hidden');
  }
  function dots(h) {
    var wrap = WB.el('div', 'mt-1.5 flex items-center gap-1.5'), today = WB.today();
    for (var i = 6; i >= 0; i--) {
      (function (day) {
        var sch = scheduled(h, day), dn = sch && done(h, day);
        var d = WB.el('button', 'h-3.5 w-3.5 rounded-full ' + (dn ? 'bg-success' : (sch ? 'bg-muted' : 'border border-border')));
        d.type = 'button'; d.setAttribute('data-day', day); d.disabled = !sch; if (day === today) d.style.outline = '1.5px solid rgb(57 215 255)';
        d.setAttribute('aria-label', WB.dateLabel(day) + ': ' + (dn ? t('habDone') : t('habNotDone')));
        d.addEventListener('click', function () { toggle(h, day); });
        wrap.appendChild(d);
      })(WB.addDays(today, -i));
    }
    return wrap;
  }
  function renderList() {
    var ul = $('hab-list'); ul.innerHTML = ''; var today = WB.today();
    $('hab-empty').classList.toggle('hidden', S.habits.length > 0);
    var due = dueToday(), dn = due.filter(function (h) { return done(h, today); }).length;
    $('today-count').textContent = due.length ? dn + ' / ' + due.length : '—';
    S.habits.forEach(function (h) {
      var sch = scheduled(h, today), dne = done(h, today), st = streakOf(h);
      var li = WB.el('li', 'flex items-center gap-3 rounded-theme border p-3 ' + (dne ? 'border-success/40 bg-success/5' : 'border-border bg-input') + (sch ? '' : ' opacity-60'));
      li.setAttribute('data-habit', h.id);
      var ck = WB.el('button', 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-xl ' + (dne ? 'border-success bg-success text-success-foreground' : 'border-border bg-card'));
      ck.type = 'button'; ck.setAttribute('role', 'checkbox'); ck.setAttribute('aria-checked', dne ? 'true' : 'false'); ck.setAttribute('aria-label', hName(h)); ck.disabled = !sch;
      ck.textContent = dne ? '✓' : h.icon; ck.addEventListener('click', function () { toggle(h, today); });
      li.appendChild(ck);
      var mid = WB.el('div', 'min-w-0 flex-1');
      var top = WB.el('div', 'flex items-center gap-2');
      top.appendChild(WB.el('p', 'truncate text-sm font-semibold ' + (dne ? 'text-success' : 'text-card-foreground'), hName(h)));
      if (st >= 2) top.appendChild(WB.el('span', 'shrink-0 rounded-full bg-chart5/15 px-2 py-0.5 text-[10px] font-bold text-chart5', '🔥 ' + st));
      mid.appendChild(top);
      var sub = [];
      if (h.auto) sub.push(t('habAutoTag'));
      if (!sch) sub.push(t('habNotToday'));
      else if (h.days && h.days.length) sub.push(h.days.map(function (d) { return t('habDay' + d); }).join(' '));
      if (sub.length) mid.appendChild(WB.el('p', 'mt-0.5 text-[10px] text-muted-foreground', sub.join(' · ')));
      mid.appendChild(dots(h));
      li.appendChild(mid);
      var ed = WB.el('button', 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground'); ed.type = 'button'; ed.setAttribute('aria-label', t('habEdit')); ed.setAttribute('data-edit', h.id);
      ed.innerHTML = '<iconify-icon icon="lucide:pencil" class="text-base"></iconify-icon>'; ed.addEventListener('click', function () { openEditor(h); });
      li.appendChild(ed); ul.appendChild(li);
    });
    // öneriler
    var used = {}; S.habits.forEach(function (h) { if (h.key) used[h.key] = 1; });
    var rest = SUGGEST.filter(function (s) { return !used[s.key]; });
    $('suggest-box').classList.toggle('hidden', !rest.length || S.habits.length >= 8);
    var sl = $('suggest-list'); sl.innerHTML = '';
    rest.forEach(function (s) {
      var b = WB.el('button', 'rounded-full border border-border bg-input px-3 py-1.5 text-xs font-semibold text-card-foreground', s.icon + ' ' + t(s.key)); b.type = 'button'; b.setAttribute('data-suggest', s.key);
      b.addEventListener('click', function () { S.habits.push({ id: newId(), key: s.key, icon: s.icon, auto: s.auto || null, days: [], created: WB.today() }); save(); renderAll(); WB.toast(t('habAdded')); });
      sl.appendChild(b);
    });
  }
  function renderAll() { loadSources(); renderList(); renderPet(); }

  // ---------- işaretleme ----------
  function toggle(h, day) {
    if (!scheduled(h, day)) return;
    if (autoDone(h.auto, day) && !manual(h, day)) { WB.toast(t('habAutoNote')); return; }
    var before = totalStars(), stageBefore = stageOf(before), dueBefore = dueToday().filter(function (x) { return done(x, WB.today()); }).length;
    var l = S.log[day] || [], i = l.indexOf(h.id);
    if (i >= 0) l.splice(i, 1); else l.push(h.id);
    S.log[day] = l; if (!l.length) delete S.log[day]; save(); loadSources();
    var after = totalStars(), due = dueToday(), dnow = due.filter(function (x) { return done(x, WB.today()); }).length;
    if (i < 0) {
      WB.vibrate(20); jump();
      if (day === WB.today() && due.length >= 2 && dnow === due.length && dueBefore < dnow) WB.toast(t('habAllDone'));
      else if (after > before) WB.toast('+' + (after - before) + ' ⭐');
    }
    renderList(); renderPet();
    if (stageOf(after) < stageBefore) { S.seen = Math.min(S.seen, stageOf(after)); save(); }
  }
  function jump() { var s = $('pet-svg'); if (!s) return; s.classList.remove('jump'); void s.getBoundingClientRect(); s.classList.add('jump'); setTimeout(function () { s.classList.remove('jump'); }, 800); }

  // ---------- ekleme / düzenleme ----------
  function openEditor(h) {
    editing = h ? { id: h.id, key: h.key, auto: h.auto, name: h.key ? '' : h.name, icon: h.icon, days: (h.days || []).slice() } : { id: null, name: '', icon: ICONS[0], days: [] };
    $('editor').classList.remove('hidden'); $('editor-title').textContent = h ? t('habEditTitle') : t('habNewTitle');
    $('name-wrap').classList.toggle('hidden', !!(h && h.key)); $('ed-name').value = editing.name;
    var au = $('ed-auto'); if (h && h.auto) { au.classList.remove('hidden'); au.textContent = t('habAuto_' + h.auto); } else au.classList.add('hidden');
    $('ed-delete').classList.toggle('hidden', !h); $('ed-delete').textContent = t('habDelete');
    renderEditor(); $('editor').scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function renderEditor() {
    var ic = $('ed-icons'); ic.innerHTML = '';
    ICONS.forEach(function (e) { var on = editing.icon === e, b = WB.el('button', 'flex aspect-square items-center justify-center rounded-lg border text-lg ' + (on ? 'border-primary bg-primary/15' : 'border-border bg-input'), e); b.type = 'button'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.addEventListener('click', function () { editing.icon = e; renderEditor(); }); ic.appendChild(b); });
    var dl = $('ed-days'); dl.innerHTML = '';
    for (var d = 0; d < 7; d++) (function (d) {
      var on = !editing.days.length || editing.days.indexOf(d) >= 0, b = WB.el('button', 'h-10 rounded-lg border text-[11px] font-bold ' + (on ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-input text-muted-foreground'), t('habDay' + d)); b.type = 'button'; b.setAttribute('data-d', d); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.addEventListener('click', function () {
        var cur = editing.days.length ? editing.days.slice() : [0, 1, 2, 3, 4, 5, 6], i = cur.indexOf(d);
        if (i >= 0) { if (cur.length > 1) cur.splice(i, 1); } else cur.push(d);
        cur.sort(); editing.days = cur.length === 7 ? [] : cur; renderEditor();
      }); dl.appendChild(b);
    })(d);
  }
  function saveEditor() {
    var nm = ($('ed-name').value || '').trim();
    if (!editing.key && !nm) { $('ed-name').focus(); return; }
    if (editing.id) {
      var h = S.habits.filter(function (x) { return x.id === editing.id; })[0]; if (!h) return;
      if (!h.key) { h.name = nm; h.icon = editing.icon; } h.days = editing.days;
    } else S.habits.push({ id: newId(), name: nm, icon: editing.icon, auto: null, days: editing.days, created: WB.today() });
    save(); closeEditor(); renderAll(); WB.toast(t('habSaved'));
  }
  function closeEditor() { editing = null; $('editor').classList.add('hidden'); $('ed-delete').dataset.arm = ''; }
  $('hab-add').addEventListener('click', function () { if (S.habits.length >= 15) { WB.toast(t('habMax')); return; } openEditor(null); });
  $('ed-cancel').addEventListener('click', closeEditor);
  $('ed-save').addEventListener('click', saveEditor);
  $('ed-name').addEventListener('keydown', function (e) { if (e.key === 'Enter') saveEditor(); });
  $('ed-delete').addEventListener('click', function () {
    if (!editing || !editing.id) return;
    if ($('ed-delete').dataset.arm !== '1') { $('ed-delete').dataset.arm = '1'; $('ed-delete').textContent = t('habDeleteConfirm'); return; }
    S.habits = S.habits.filter(function (h) { return h.id !== editing.id; }); Object.keys(S.log).forEach(function (d) { S.log[d] = S.log[d].filter(function (x) { return x !== editing.id; }); if (!S.log[d].length) delete S.log[d]; });
    save(); closeEditor(); renderAll();
  });

  // ---------- dost: ad, dokunma, süsleme ----------
  $('pet-btn').addEventListener('click', function () { say.bump = (say.bump || 0) + 1; jump(); WB.vibrate(15); renderPet(); });
  $('dress-toggle').addEventListener('click', function () { $('dress').classList.toggle('hidden'); });
  $('levelup-ok').addEventListener('click', function () { S.seen = stageOf(totalStars()); save(); renderPet(); });
  $('pet-rename').addEventListener('click', function () {
    var cur = S.pet.name || t('habPetDefault'), box = $('pet-name'), inp = WB.el('input', 'h-9 w-full min-w-0 rounded-lg border border-border bg-input px-2 text-base font-bold outline-none');
    inp.id = 'pet-name-in'; inp.value = cur; inp.maxLength = 16; inp.setAttribute('aria-label', t('habRename')); box.replaceWith(inp); inp.focus(); inp.select();
    var fin = function () { var v = inp.value.trim().slice(0, 16); if (v) S.pet.name = v; save(); var p = WB.el('p', 'truncate font-heading text-lg font-bold'); p.id = 'pet-name'; inp.replaceWith(p); renderPet(); };
    inp.addEventListener('blur', fin); inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') inp.blur(); });
  });

  window.addEventListener('one-lang-changed', renderAll);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { S = load(); renderAll(); } });
  renderAll();
  window.__hab = { state: function () { return S; }, stars: totalStars, stageOf: stageOf };
})();
