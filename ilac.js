/* Hemcan — İlaç & randevu hatırlatıcısı. İlaç ve randevu bilgileri yalnızca bu telefonda saklanır; hatırlatmalar
 * uygulamanın mevcut bildirim sistemine ("one-reminders") yazılır. Tıbbi tavsiye vermez. */
(function () {
  'use strict';
  var WB = window.WB, $ = WB.$, t = WB.t;
  var K_MEDS = 'one-meds', K_LOG = 'one-meds-log', K_APPT = 'one-appts', K_REM = 'one-reminders';
  var meds = (WB.load(K_MEDS, { v: 1, list: [] }) || {}).list || [];
  var appts = (WB.load(K_APPT, { v: 1, list: [] }) || {}).list || [];
  var log = WB.load(K_LOG, {}) || {};
  if (Array.isArray(log)) log = {};
  function persistMeds() { WB.save(K_MEDS, { v: 1, list: meds }); }
  function persistAppts() { WB.save(K_APPT, { v: 1, list: appts }); }
  function persistLog() { var cut = WB.addDays(WB.today(), -60); Object.keys(log).forEach(function (k) { if (k < cut) delete log[k]; }); WB.save(K_LOG, log); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function localStr(d) { return d.getFullYear() + '-' + WB.pad(d.getMonth() + 1) + '-' + WB.pad(d.getDate()) + 'T' + WB.pad(d.getHours()) + ':' + WB.pad(d.getMinutes()); }
  function parseLocal(s) { var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0, 0) : null; }

  // ---------- hatırlatma deposu (ayarlar / otomasyon sayfalarıyla ortak) ----------
  function loadRem() { var r = WB.load(K_REM, []); return Array.isArray(r) ? r : []; }
  function saveRem(list) {
    try { localStorage.setItem(K_REM, JSON.stringify(list)); localStorage.setItem(K_REM + '-bak', JSON.stringify(list)); } catch (e) {}
    syncRem(list);
  }
  function notifOn() {
    try {
      if (window.ONE_NATIVE && window.ONE_NATIVE.isNative) return window.ONE_NATIVE.cachedPerm() === 'granted' && localStorage.getItem('one-notif-enabled') === '1';
      return localStorage.getItem('one-notif-enabled') === '1';
    } catch (e) { return false; }
  }
  function syncRem(list) {
    if (window.ONE_NATIVE && window.ONE_NATIVE.isNative) { try { window.ONE_NATIVE.reschedule(); } catch (e) {} return; }
    if (!notifOn() || !navigator.serviceWorker) return;
    var settings = {}; try { settings = JSON.parse(localStorage.getItem('one-notif-settings') || '{}') || {}; } catch (e) {}
    var id = localStorage.getItem('one-sub-id'); if (!id) return;
    navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
      if (!sub) return;
      return fetch('/api/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: id, subscription: sub.toJSON(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', lang: WB.lang(), settings: settings, reminders: (window.ONE_NTF_SAFE ? window.ONE_NTF_SAFE(list, WB.lang()) : list) }) });
    }).catch(function () {});
  }
  function nextDaily(tm) {
    var p = tm.split(':'), d = new Date(); d.setHours(+p[0], +p[1], 0, 0);
    if (d.getTime() <= Date.now() + 60000) d.setDate(d.getDate() + 1);
    return localStr(d);
  }
  function medText(m) { return '💊 ' + t('rxNtfMed', { x: m.name + (m.note ? ' — ' + m.note : '') }); }
  // her ilaç saati için günlük hatırlatma var mı? Yoksa kur (kullanıcı başka sayfadan sildiyse kendini onarır)
  function ensureMedReminders() {
    var list = loadRem(), changed = false;
    meds.forEach(function (m) {
      m.times.forEach(function (tm) {
        var has = list.some(function (r) { return r && r.src === 'med' && r.gid === m.id && r.tm === tm; });
        if (!has) { list.push({ text: medText(m), createdAt: Date.now(), at: nextDaily(tm), repeat: 'daily', src: 'med', gid: m.id, tm: tm }); changed = true; }
      });
    });
    if (changed) saveRem(list);
  }
  function removeByGid(gid) { var list = loadRem().filter(function (r) { return !(r && r.gid === gid); }); saveRem(list); }

  // ---------- sekmeler ----------
  var tab = 'meds';
  function setTab(x) {
    tab = x;
    $('view-meds').classList.toggle('hidden', x !== 'meds'); $('view-appts').classList.toggle('hidden', x !== 'appts');
    [['tab-meds', 'meds'], ['tab-appts', 'appts']].forEach(function (p) {
      var on = p[1] === x, b = $(p[0]); b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.className = 'h-11 rounded-[14px] text-sm font-bold ' + (on ? 'bg-primary text-primary-foreground' : 'text-muted-foreground');
    });
    try { history.replaceState(null, '', '#' + x); } catch (e) {}
  }
  $('tab-meds').addEventListener('click', function () { setTab('meds'); });
  $('tab-appts').addEventListener('click', function () { setTab('appts'); });

  // ---------- ilaçlar ----------
  var formTimes = ['09:00'];
  function renderFormTimes() {
    var box = $('med-times'); box.innerHTML = '';
    formTimes.forEach(function (tm, i) {
      var w = WB.el('div', 'flex items-center gap-1');
      var inp = WB.el('input', 'h-11 rounded-lg border border-border bg-input px-2 text-base text-foreground outline-none'); inp.type = 'time'; inp.value = tm;
      inp.addEventListener('change', function () { formTimes[i] = inp.value || tm; });
      w.appendChild(inp);
      if (formTimes.length > 1) { var x = WB.el('button', 'h-11 w-9 text-lg text-muted-foreground', '×'); x.type = 'button'; x.setAttribute('aria-label', t('rxDelete')); x.addEventListener('click', function () { formTimes.splice(i, 1); renderFormTimes(); }); w.appendChild(x); }
      box.appendChild(w);
    });
    $('med-add-time').classList.toggle('hidden', formTimes.length >= 6);
  }
  $('med-add-time').addEventListener('click', function () { if (formTimes.length < 6) { formTimes.push('20:00'); renderFormTimes(); } });
  $('med-save').addEventListener('click', function () {
    var name = ($('med-name').value || '').trim(), err = $('med-err'); err.classList.add('hidden');
    if (!name) { err.textContent = t('rxMedNeedName'); err.classList.remove('hidden'); return; }
    var times = formTimes.filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort();
    var m = { id: uid(), name: name.slice(0, 60), note: ($('med-note').value || '').trim().slice(0, 80), times: times, created: Date.now() };
    meds.push(m); persistMeds(); ensureMedReminders();
    $('med-name').value = ''; $('med-note').value = ''; formTimes = ['09:00']; renderFormTimes(); WB.vibrate(20); render();
  });
  function renderDoses() {
    var k = WB.today(), taken = log[k] || {}, rows = [];
    meds.forEach(function (m) { m.times.forEach(function (tm) { rows.push({ m: m, tm: tm, key: m.id + '|' + tm }); }); });
    rows.sort(function (a, b) { return a.tm < b.tm ? -1 : a.tm > b.tm ? 1 : 0; });
    var ul = $('dose-list'); ul.innerHTML = '';
    var done = rows.filter(function (r) { return taken[r.key]; }).length;
    $('dose-sum').textContent = rows.length ? t('rxTodaySum', { a: done, b: rows.length }) : '';
    var em = $('dose-empty'); em.classList.toggle('hidden', rows.length > 0); em.textContent = meds.length ? t('rxNoDoses') : t('rxNoMeds');
    var nowHM = WB.pad(new Date().getHours()) + ':' + WB.pad(new Date().getMinutes());
    rows.forEach(function (r) {
      var isTaken = !!taken[r.key], late = !isTaken && r.tm < nowHM;
      var b = WB.el('button', 'flex w-full items-center gap-3 rounded-[16px] border px-3 py-2.5 text-left ' + (isTaken ? 'border-success/40 bg-success/10' : late ? 'border-chart5/40 bg-chart5/5' : 'border-border bg-card'));
      b.type = 'button'; b.setAttribute('aria-pressed', isTaken ? 'true' : 'false');
      b.appendChild(WB.el('span', 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-bold ' + (isTaken ? 'border-success bg-success text-success-foreground' : 'border-border text-transparent'), '✓'));
      var mid = WB.el('span', 'min-w-0 flex-1'); mid.appendChild(WB.el('span', 'block truncate text-sm font-semibold ' + (isTaken ? 'text-muted-foreground line-through' : 'text-foreground'), r.m.name));
      var sub = (r.m.note ? r.m.note + ' · ' : '') + (isTaken ? t('rxTaken') : late ? t('rxNotYet') : ''); if (sub) mid.appendChild(WB.el('span', 'block truncate text-[11px] text-muted-foreground', sub));
      b.appendChild(mid); b.appendChild(WB.el('span', 'shrink-0 font-heading text-sm font-bold tabular-nums text-primary', r.tm));
      b.addEventListener('click', function () { var d = log[k] = log[k] || {}; if (d[r.key]) delete d[r.key]; else d[r.key] = 1; if (!Object.keys(d).length) delete log[k]; persistLog(); WB.vibrate(12); renderDoses(); });
      var li = WB.el('li'); li.appendChild(b); ul.appendChild(li);
    });
  }
  function renderMedList() {
    var ul = $('med-list'); ul.innerHTML = ''; $('med-empty').classList.toggle('hidden', meds.length > 0);
    meds.forEach(function (m) {
      var li = WB.el('li', 'flex items-center justify-between gap-2 rounded-[16px] border border-border bg-card px-3.5 py-2.5');
      var w = WB.el('div', 'min-w-0 flex-1'); w.appendChild(WB.el('p', 'truncate text-sm font-semibold', '💊 ' + m.name));
      w.appendChild(WB.el('p', 'truncate text-[11px] text-muted-foreground', (m.note ? m.note + ' · ' : '') + m.times.join(', ')));
      var x = WB.el('button', 'shrink-0 px-2 text-lg text-muted-foreground', '×'); x.type = 'button'; x.setAttribute('aria-label', t('rxDelete'));
      x.addEventListener('click', function () { if (!window.confirm(t('rxDeleteMedAsk'))) return; meds = meds.filter(function (q) { return q.id !== m.id; }); persistMeds(); removeByGid(m.id); render(); });
      li.appendChild(w); li.appendChild(x); ul.appendChild(li);
    });
  }

  // ---------- randevular ----------
  function leadText(lead, a) {
    var tm = WB.pad(new Date(a.at).getHours()) + ':' + WB.pad(new Date(a.at).getMinutes());
    var x = a.title + ' (' + tm + ')' + (a.note ? ' — ' + a.note : '');
    return '📅 ' + (lead === 1440 ? t('rxNtfDay', { x: x }) : lead === 120 ? t('rxNtfHours', { x: x }) : t('rxNtfNow', { x: x }));
  }
  $('ap-save').addEventListener('click', function () {
    var title = ($('ap-title').value || '').trim(), date = $('ap-date').value, time = $('ap-time').value, err = $('ap-err'); err.classList.add('hidden');
    if (!title || !date || !time) { err.textContent = t('rxApptNeed'); err.classList.remove('hidden'); return; }
    var when = parseLocal(date + 'T' + time); if (!when || when.getTime() <= Date.now()) { err.textContent = t('rxApptPast'); err.classList.remove('hidden'); return; }
    var leads = []; if ($('lead-1d').checked) leads.push(1440); if ($('lead-2h').checked) leads.push(120); if ($('lead-0').checked) leads.push(0);
    var a = { id: uid(), title: title.slice(0, 80), note: ($('ap-note').value || '').trim().slice(0, 80), at: date + 'T' + time, leads: leads };
    appts.push(a); persistAppts();
    var list = loadRem();
    leads.forEach(function (lead) {
      var d = new Date(when.getTime() - lead * 60000); if (d.getTime() <= Date.now() + 30000) return;
      list.push({ text: leadText(lead, a), createdAt: Date.now(), at: localStr(d), src: 'appt', gid: a.id });
    });
    saveRem(list);
    $('ap-title').value = ''; $('ap-note').value = ''; WB.vibrate(20); render();
  });
  function apRow(a, past) {
    var d = parseLocal(a.at), li = WB.el('li', 'flex items-center justify-between gap-2 rounded-[16px] border border-border bg-card px-3.5 py-2.5');
    var w = WB.el('div', 'min-w-0 flex-1'); w.appendChild(WB.el('p', 'truncate text-sm font-semibold', '📅 ' + a.title));
    var when = d ? d.toLocaleString(WB.lang(), { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : a.at;
    w.appendChild(WB.el('p', 'truncate text-[11px] font-semibold ' + (past ? 'text-muted-foreground' : 'text-primary'), when + (a.note ? ' · ' + a.note : '')));
    var x = WB.el('button', 'shrink-0 px-2 text-lg text-muted-foreground', '×'); x.type = 'button'; x.setAttribute('aria-label', t('rxDelete'));
    x.addEventListener('click', function () { appts = appts.filter(function (q) { return q.id !== a.id; }); persistAppts(); removeByGid(a.id); render(); });
    li.appendChild(w); li.appendChild(x); return li;
  }
  function renderAppts() {
    var now = Date.now(), up = [], past = [];
    appts.forEach(function (a) { var d = parseLocal(a.at); (d && d.getTime() > now ? up : past).push(a); });
    up.sort(function (a, b) { return a.at < b.at ? -1 : 1; }); past.sort(function (a, b) { return a.at < b.at ? 1 : -1; });
    var ul = $('ap-list'); ul.innerHTML = ''; up.forEach(function (a) { ul.appendChild(apRow(a, false)); });
    $('ap-empty').classList.toggle('hidden', up.length > 0);
    var pl = $('ap-past'); pl.innerHTML = ''; past.slice(0, 8).forEach(function (a) { pl.appendChild(apRow(a, true)); });
    $('ap-past-sec').classList.toggle('hidden', past.length === 0);
  }

  function render() { renderDoses(); renderMedList(); renderAppts(); $('notif-warn').classList.toggle('hidden', notifOn() || (!meds.length && !appts.length)); }
  window.addEventListener('one-lang-changed', function () { renderFormTimes(); render(); });
  var d0 = new Date(); d0.setDate(d0.getDate() + 1); $('ap-date').value = d0.getFullYear() + '-' + WB.pad(d0.getMonth() + 1) + '-' + WB.pad(d0.getDate());
  renderFormTimes(); ensureMedReminders(); render();
  setTab(location.hash === '#appts' ? 'appts' : 'meds');
  setInterval(renderDoses, 60000);
})();
