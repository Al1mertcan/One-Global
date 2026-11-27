/* Hemcan — Tesbih sayacı. Sayılar yalnızca bu telefonda ("one-tesbih") saklanır. Dinî hüküm vermez; sadece sayaçtır. */
(function () {
  'use strict';
  var WB = window.WB, $ = WB.$, t = WB.t, KEY = 'one-tesbih';
  var PRESETS = [
    { id: 'sub', key: 'tesSub', ar: 'سُبْحَانَ اللّٰهِ', target: 33 },
    { id: 'hamd', key: 'tesHamd', ar: 'اَلْحَمْدُ لِلّٰهِ', target: 33 },
    { id: 'ekber', key: 'tesEkber', ar: 'اَللّٰهُ أَكْبَرُ', target: 33 },
    { id: 'tevhid', key: 'tesTevhid', ar: 'لَا إِلٰهَ إِلَّا اللّٰهُ', target: 100 },
    { id: 'istigfar', key: 'tesIstigfar', ar: 'أَسْتَغْفِرُ اللّٰهَ', target: 100 },
    { id: 'salavat', key: 'tesSalavat', ar: 'اَللّٰهُمَّ صَلِّ عَلٰى سَيِّدِنَا مُحَمَّدٍ', target: 100 },
    { id: 'free', key: 'tesFree', ar: '', target: 0 }
  ];
  var TARGETS = [33, 99, 100, 500, 1000, 0];
  var S = WB.load(KEY, null);
  if (!S || typeof S.count !== 'number') S = { v: 1, preset: 'sub', target: 33, count: 0, rounds: 0, vib: true, day: {} };
  S.day = S.day || {}; if (S.vib === undefined) S.vib = true;
  function save() { var cut = WB.addDays(WB.today(), -60); Object.keys(S.day).forEach(function (k) { if (k < cut) delete S.day[k]; }); WB.save(KEY, S); }
  function preset() { return PRESETS.filter(function (p) { return p.id === S.preset; })[0] || PRESETS[0]; }
  function vib(p) { if (S.vib) WB.vibrate(p); }
  function fmt(n) { try { return n.toLocaleString(WB.lang()); } catch (e) { return String(n); } }

  function renderChips() {
    var box = $('chips'); box.innerHTML = '';
    PRESETS.forEach(function (p) {
      var b = WB.el('button', 'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ' + (p.id === S.preset ? 'border-chart2 bg-chart2/20 text-chart2' : 'border-border bg-input text-card-foreground'), t(p.key));
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', p.id === S.preset ? 'true' : 'false');
      b.addEventListener('click', function () {
        if (p.id === S.preset) return;
        S.preset = p.id; S.target = p.target; S.count = 0; S.rounds = 0; save(); render();
      });
      box.appendChild(b);
    });
  }
  function renderTargets() {
    var sel = $('target'); sel.innerHTML = '';
    TARGETS.forEach(function (n) { var o = WB.el('option', '', n ? String(n) : t('tesNoTarget')); o.value = String(n); if (n === S.target) o.selected = true; sel.appendChild(o); });
  }
  function renderWeek() {
    var box = $('week'), lab = $('week-days'); box.innerHTML = ''; lab.innerHTML = '';
    var keys = [], max = 1, i;
    for (i = 6; i >= 0; i--) { var k = WB.addDays(WB.today(), -i); keys.push(k); max = Math.max(max, S.day[k] || 0); }
    keys.forEach(function (k) {
      var n = S.day[k] || 0;
      var col = WB.el('div', 'flex h-full flex-1 flex-col items-center justify-end');
      var bar = WB.el('div', 'w-full rounded-t-md ' + (n ? 'bg-chart2/70' : 'bg-muted'));
      bar.style.height = Math.max(4, Math.round(100 * n / max)) + '%'; col.appendChild(bar); box.appendChild(col);
      var d = WB.el('div', 'flex-1', ''); try { d.textContent = WB.parse(k).toLocaleDateString(WB.lang(), { weekday: 'narrow' }); } catch (e) { d.textContent = k.slice(8); } lab.appendChild(d);
    });
  }
  function renderCounter() {
    var tg = S.target;
    $('count').textContent = fmt(S.count);
    $('of').textContent = tg ? '/ ' + fmt(tg) : '';
    var pct = tg ? Math.min(1, S.count / tg) : 0;
    $('ring').style.strokeDashoffset = String(565.5 * (1 - pct));
    $('rounds').textContent = fmt(S.rounds);
    $('today').textContent = fmt(S.day[WB.today()] || 0);
  }
  function render() {
    var p = preset();
    $('dhikr-name').textContent = t(p.key); $('dhikr-ar').textContent = p.ar; $('vib').checked = !!S.vib;
    renderChips(); renderTargets(); renderCounter(); renderWeek();
  }
  var msgTimer = null;
  function flash(text) { var m = $('round-msg'); m.textContent = text; clearTimeout(msgTimer); msgTimer = setTimeout(function () { m.textContent = ''; }, 2200); }

  $('tap').addEventListener('click', function () {
    S.count++; var k = WB.today(); S.day[k] = (S.day[k] || 0) + 1;
    if (S.target && S.count >= S.target) { S.rounds++; S.count = 0; vib([70, 50, 70]); flash(t('tesRoundDone')); } else { vib(12); }
    save(); renderCounter(); renderWeek();
  });
  $('btn-undo').addEventListener('click', function () {
    if (S.count <= 0) return; S.count--; var k = WB.today(); if (S.day[k]) { S.day[k]--; if (!S.day[k]) delete S.day[k]; }
    save(); vib(8); renderCounter(); renderWeek();
  });
  $('btn-reset').addEventListener('click', function () {
    if (!S.count && !S.rounds) return;
    if (!window.confirm(t('tesResetAsk'))) return;
    S.count = 0; S.rounds = 0; save(); renderCounter();
  });
  $('target').addEventListener('change', function () { S.target = parseInt($('target').value, 10) || 0; S.count = Math.min(S.count, S.target || S.count); save(); renderCounter(); });
  $('vib').addEventListener('change', function () { S.vib = $('vib').checked; save(); });
  window.addEventListener('one-lang-changed', render);
  render();
})();
