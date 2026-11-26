/* Hemcan — Kaza namazı sayacı. Sayılar yalnızca bu telefonda ("one-kaza") saklanır. Dinî hüküm vermez; sadece sayaçtır. */
(function () {
  'use strict';
  var WB = window.WB, $ = WB.$, t = WB.t;
  var KEY = 'one-kaza', PR = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'], MAXV = 9999999;
  var S = WB.load(KEY, null);
  function valid(s) { return s && s.init && s.left && PR.every(function (p) { return typeof s.left[p] === 'number' && typeof s.init[p] === 'number'; }); }
  if (!valid(S)) S = null;
  if (S) { S.hist = S.hist || {}; S.pace = S.pace || 3; }
  function save() { if (!S) return; var cut = WB.addDays(WB.today(), -400); Object.keys(S.hist).forEach(function (k) { if (k < cut) delete S.hist[k]; }); WB.save(KEY, S); }
  function mk(tag, cls, text) { return WB.el(tag, cls, text); }
  function num(v, max) { v = parseInt(v, 10); return isNaN(v) || v < 0 ? 0 : Math.min(v, max); }
  function fmt(n) { try { return n.toLocaleString(WB.lang()); } catch (e) { return String(n); } }

  // ---------- kurulum ----------
  function setupDays() { return num($('in-y').value, 100) * 365 + num($('in-m').value, 1200) * 30 + num($('in-d').value, 36500); }
  function renderPreview() {
    var d = setupDays(), p = $('preview'); $('setup-err').classList.add('hidden');
    p.textContent = d > 0 ? t('kazaPreview', { d: fmt(d), t: fmt(d * 5) }) : '';
  }
  ['in-y', 'in-m', 'in-d'].forEach(function (id) { $(id).addEventListener('input', renderPreview); });
  $('btn-calc').addEventListener('click', function () {
    var d = setupDays(), err = $('setup-err');
    if (d <= 0) { err.textContent = t('kazaNeedValue'); err.classList.remove('hidden'); return; }
    if (d > 36500) { err.textContent = t('kazaTooBig'); err.classList.remove('hidden'); return; }
    var o = {}, l = {}; PR.forEach(function (p) { o[p] = d; l[p] = d; });
    S = { v: 1, init: o, left: l, hist: {}, pace: 3, created: WB.today(), setup: { y: num($('in-y').value, 100), m: num($('in-m').value, 1200), d: num($('in-d').value, 36500) } };
    save(); WB.vibrate(25); render();
  });

  // ---------- ana görünüm ----------
  function totals() {
    var left = 0, init = 0; PR.forEach(function (p) { left += S.left[p]; init += Math.max(S.init[p], S.left[p]); });
    return { left: left, init: init, done: Math.max(0, init - left) };
  }
  function todayCount() { return S.hist[WB.today()] || 0; }
  function change(p, delta) {
    var cur = S.left[p], nxt = Math.max(0, Math.min(MAXV, cur + delta));
    if (nxt === cur) return;
    S.left[p] = nxt; var k = WB.today(), h = S.hist[k] || 0;
    h = delta < 0 ? h + 1 : Math.max(0, h - 1); if (h) S.hist[k] = h; else delete S.hist[k];
    save(); WB.vibrate(delta < 0 ? 20 : 10); renderRow(p); renderSummary();
  }
  function renderRow(p) {
    var li = document.querySelector('[data-prayer="' + p + '"]'); if (!li) return;
    var cnt = li.querySelector('[data-count]'); if (cnt && cnt.tagName !== 'INPUT') cnt.textContent = fmt(S.left[p]);
    var pct = Math.round(100 * (1 - S.left[p] / Math.max(1, Math.max(S.init[p], S.left[p]))));
    li.querySelector('[data-bar]').style.width = Math.max(0, Math.min(100, pct)) + '%';
    li.querySelector('[data-minus]').disabled = S.left[p] <= 0;
  }
  function editCount(p, btn) {
    var inp = mk('input', 'h-12 w-28 rounded-lg border border-primary bg-input px-2 text-center font-heading text-2xl font-bold outline-none');
    inp.type = 'number'; inp.inputMode = 'numeric'; inp.min = '0'; inp.max = String(MAXV); inp.value = S.left[p]; inp.setAttribute('data-count', p); inp.setAttribute('aria-label', t('k' + 'aza' + cap(p)));
    btn.replaceWith(inp); inp.focus(); inp.select();
    var done = false;
    function fin(apply) {
      if (done) return; done = true;
      if (apply) { var v = num(inp.value, MAXV); S.left[p] = v; if (v > S.init[p]) S.init[p] = v; save(); }
      renderRows(); renderSummary();
    }
    inp.addEventListener('blur', function () { fin(true); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') inp.blur(); else if (e.key === 'Escape') fin(false); });
  }
  function cap(p) { return p.charAt(0).toUpperCase() + p.slice(1); }
  function renderRows() {
    var ul = $('rows'); ul.innerHTML = '';
    PR.forEach(function (p) {
      var li = mk('li', 'rounded-[20px] border border-border bg-card p-3'); li.setAttribute('data-prayer', p);
      var top = mk('div', 'flex items-center justify-between gap-2');
      top.appendChild(mk('p', 'text-sm font-semibold', t('kaza' + cap(p))));
      var c = mk('button', 'min-w-[96px] rounded-lg px-2 py-1 text-right font-heading text-3xl font-bold tracking-tight', fmt(S.left[p])); c.type = 'button'; c.setAttribute('data-count', p);
      c.setAttribute('aria-label', t('kaza' + cap(p)) + ': ' + S.left[p] + ' ' + t('kazaLeft'));
      c.addEventListener('click', function () { editCount(p, c); }); top.appendChild(c); li.appendChild(top);
      var bar = mk('div', 'mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted'); var fill = mk('div', 'h-full rounded-full bg-success transition-[width] duration-300'); fill.setAttribute('data-bar', ''); bar.appendChild(fill); li.appendChild(bar);
      var row = mk('div', 'mt-3 grid grid-cols-[1fr_auto] gap-2');
      var minus = mk('button', 'h-12 rounded-theme bg-success text-sm font-bold text-success-foreground', t('kazaPrayed')); minus.type = 'button'; minus.setAttribute('data-minus', ''); minus.addEventListener('click', function () { change(p, -1); });
      var plus = mk('button', 'flex h-12 w-14 items-center justify-center rounded-theme border border-border bg-input text-xl font-bold text-card-foreground', '+'); plus.type = 'button'; plus.setAttribute('data-plus', ''); plus.setAttribute('aria-label', t('kazaAdd')); plus.addEventListener('click', function () { change(p, 1); });
      row.appendChild(minus); row.appendChild(plus); li.appendChild(row); ul.appendChild(li); renderRow(p);
    });
  }
  function spanText(days) {
    var y = Math.floor(days / 365), r = days - y * 365, m = Math.floor(r / 30), d = r - m * 30, parts = [];
    if (y) parts.push(t('kazaYearsUnit', { n: y })); if (m) parts.push(t('kazaMonthsUnit', { n: m })); if (d || !parts.length) parts.push(t('kazaDaysUnit', { n: d }));
    return parts.join(' ');
  }
  function renderSummary() {
    var tt = totals(); $('total-left').textContent = fmt(tt.left); $('total-done').textContent = fmt(tt.done);
    var pct = tt.init ? Math.round(100 * tt.done / tt.init) : 0; $('bar').style.width = pct + '%'; $('prog-line').textContent = t('kazaProgress', { p: pct });
    $('today-line').textContent = t('kazaToday', { n: todayCount() });
    $('pace').value = String(S.pace); var pace = parseInt($('pace').value, 10) || 1;
    $('eta').textContent = tt.left <= 0 ? t('kazaEtaDone') : t('kazaEta', { t: spanText(Math.ceil(tt.left / pace)) });
  }
  $('pace').addEventListener('change', function () { S.pace = parseInt($('pace').value, 10) || 3; save(); renderSummary(); });
  $('btn-recalc').addEventListener('click', function () {
    var b = $('btn-recalc');
    if (b.dataset.arm !== '1') { b.dataset.arm = '1'; b.textContent = t('kazaRecalcConfirm'); return; }
    b.dataset.arm = ''; b.textContent = t('kazaRecalc'); S = null; try { localStorage.removeItem(KEY); } catch (e) {}
    $('in-y').value = ''; $('in-m').value = ''; $('in-d').value = ''; render();
  });
  function render() {
    $('setup').classList.toggle('hidden', !!S); $('main-view').classList.toggle('hidden', !S);
    if (S) { renderRows(); renderSummary(); } else renderPreview();
  }
  window.addEventListener('one-lang-changed', function () { $('btn-recalc').dataset.arm = ''; $('btn-recalc').textContent = t('kazaRecalc'); render(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S) renderSummary(); });
  render();
  window.__kaza = { state: function () { return S; } };
})();
