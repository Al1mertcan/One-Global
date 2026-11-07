// Hemcan — Cüzdan (gider / gelir ve bütçe takibi)
// Tüm veri yalnızca bu cihazda (localStorage 'one-wallet') tutulur; sunucuya
// hiçbir şey gönderilmez, yapay zeka kullanılmaz (kullanıcı başına maliyet 0).
//
// Veri biçimi: { v:1, cur:'TRY', budget:<kuruş, 0=kapalı>, tx:[{id,t,a,c,n,d,ts}] }
//   t: 'e' (gider) | 'i' (gelir)   a: tutar KURUŞ cinsinden tam sayı
//   c: kategori anahtarı           n: not           d: 'YYYY-AA-GG'   ts: ekleme zamanı
(function () {
  'use strict';

  var KEY = 'one-wallet';
  var MAX_TX = 20000;

  // Kategori: anahtar -> [i18n anahtarı, ikon, renk]. Renkler grafikte kullanılır;
  // ayrıca her kategori yanında adıyla yazıldığı için yalnızca renge bağlı değil.
  var CATS = {
    e: [
      ['market', 'walletCatMarket', 'lucide:shopping-cart', '#3DDBA5'],
      ['food', 'walletCatFood', 'lucide:utensils', '#F2B66D'],
      ['transport', 'walletCatTransport', 'lucide:bus', '#70A7FF'],
      ['bills', 'walletCatBills', 'lucide:receipt', '#39D7FF'],
      ['rent', 'walletCatRent', 'lucide:house', '#A78BFA'],
      ['health', 'walletCatHealth', 'lucide:heart-pulse', '#FF657A'],
      ['fun', 'walletCatFun', 'lucide:gamepad-2', '#F472B6'],
      ['clothes', 'walletCatClothes', 'lucide:shirt', '#FB923C'],
      ['education', 'walletCatEducation', 'lucide:graduation-cap', '#A3E635'],
      ['other', 'walletCatOther', 'lucide:tag', '#94A3B8']
    ],
    i: [
      ['salary', 'walletCatSalary', 'lucide:banknote', '#3DDBA5'],
      ['extra', 'walletCatExtra', 'lucide:coins', '#39D7FF'],
      ['otherin', 'walletCatOtherIncome', 'lucide:circle-plus', '#94A3B8']
    ]
  };
  var CAT_BY_KEY = {};
  ['e', 'i'].forEach(function (t) {
    CATS[t].forEach(function (c) { CAT_BY_KEY[t + ':' + c[0]] = c; });
  });

  function $(id) { return document.getElementById(id); }
  function tr(key, vars) {
    return (window.ONE_I18N && window.ONE_I18N.t) ? window.ONE_I18N.t(key, vars) : key;
  }
  function lang() { return (window.ONE_I18N && window.ONE_I18N.getLang) ? window.ONE_I18N.getLang() : 'tr'; }

  // ---------- durum ----------
  function defaultCurrency() {
    try { if (window.ONE_CURRENCIES) return window.ONE_CURRENCIES.guess(); } catch (e) {}
    return 'TRY';
  }
  function fresh() { return { v: 1, cur: defaultCurrency(), budget: 0, tx: [] }; }
  function sanitize(raw) {
    var st = fresh();
    if (!raw || typeof raw !== 'object') return st;
    if (typeof raw.cur === 'string' && /^[A-Z]{3}$/.test(raw.cur)) st.cur = raw.cur;
    if (typeof raw.budget === 'number' && isFinite(raw.budget) && raw.budget > 0 && raw.budget < 1e14) st.budget = Math.round(raw.budget);
    if (Array.isArray(raw.tx)) {
      for (var i = 0; i < raw.tx.length && st.tx.length < MAX_TX; i++) {
        var x = raw.tx[i];
        if (!x || (x.t !== 'e' && x.t !== 'i')) continue;
        if (typeof x.a !== 'number' || !isFinite(x.a) || x.a <= 0 || x.a >= 1e14) continue;
        if (typeof x.d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x.d)) continue;
        var c = typeof x.c === 'string' && CAT_BY_KEY[x.t + ':' + x.c] ? x.c : (x.t === 'e' ? 'other' : 'otherin');
        st.tx.push({
          id: typeof x.id === 'string' && x.id ? x.id.slice(0, 40) : uid(),
          t: x.t, a: Math.round(x.a), c: c,
          n: typeof x.n === 'string' ? x.n.slice(0, 80) : '',
          d: x.d, ts: typeof x.ts === 'number' ? x.ts : 0
        });
      }
    }
    return st;
  }
  var state = (function () {
    var raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    return sanitize(raw);
  })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  // ---------- tarih / biçim ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayStr() { return ymd(new Date()); }
  function monthKeyOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  var viewMonth = monthKeyOf(new Date()); // 'YYYY-AA'
  function shiftMonth(key, delta) {
    var p = key.split('-');
    var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1 + delta, 1);
    return monthKeyOf(d);
  }
  function parseYmd(s) { var p = s.split('-'); return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)); }

  var nfCache = {};
  function fmt(cents, opts) {
    var cur = state.cur;
    var k = lang() + '|' + cur + '|' + (opts && opts.plain ? 'p' : 'c');
    var nf = nfCache[k];
    if (!nf) {
      try {
        nf = new Intl.NumberFormat(lang(), opts && opts.plain
          ? { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false }
          : { style: 'currency', currency: cur });
      } catch (e) {
        nf = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      nfCache[k] = nf;
    }
    return nf.format(cents / 100);
  }
  function curSymbol() {
    try {
      var parts = new Intl.NumberFormat(lang(), { style: 'currency', currency: state.cur, currencyDisplay: 'narrowSymbol' }).formatToParts(0);
      for (var i = 0; i < parts.length; i++) if (parts[i].type === 'currency') return parts[i].value;
    } catch (e) {}
    return state.cur;
  }

  // Tutar girişi: "1.250,50", "1,250.50", "12,5", "٣٠٠" gibi biçimleri tanır.
  function parseAmount(s) {
    s = String(s == null ? '' : s)
      .replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x0660); })
      .replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 0x06F0); })
      .replace(/[\s '’]/g, '')
      .replace(/[^\d.,]/g, '');
    if (!/\d/.test(s)) return NaN;
    var lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
    var dec = -1;
    if (lc > -1 && ld > -1) {
      dec = Math.max(lc, ld);
    } else if (lc > -1 || ld > -1) {
      var sep = lc > -1 ? ',' : '.';
      var idx = Math.max(lc, ld);
      var count = s.split(sep).length - 1;
      var after = s.length - idx - 1;
      var head = s.slice(0, idx).replace(/\D/g, '');
      // "1.500" -> bin beş yüz (binlik); "0,500" ve "12,5" -> ondalık.
      if (count === 1 && (after !== 3 || head === '0' || head === '')) dec = idx;
    }
    var intPart = (dec > -1 ? s.slice(0, dec) : s).replace(/\D/g, '');
    var frac = dec > -1 ? s.slice(dec + 1).replace(/\D/g, '') : '';
    if (!intPart && !frac) return NaN;
    var n = Number((intPart || '0') + '.' + (frac || '0'));
    if (!isFinite(n)) return NaN;
    return Math.round(n * 100);
  }

  // ---------- hesaplar ----------
  function monthTx(key) {
    return state.tx.filter(function (x) { return x.d.slice(0, 7) === key; });
  }
  function sumBy(list, t, maxDay) {
    var s = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].t !== t) continue;
      if (maxDay && parseInt(list[i].d.slice(8, 10), 10) > maxDay) continue;
      s += list[i].a;
    }
    return s;
  }
  function catName(t, key) {
    var c = CAT_BY_KEY[t + ':' + key];
    return c ? tr(c[1]) : key;
  }

  // ---------- çizim ----------
  var els = {};
  function colorOfBar(pct) {
    if (pct >= 100) return 'bg-destructive';
    if (pct >= 80) return 'bg-amber-400';
    return 'bg-success';
  }

  function renderSummary(list) {
    var inc = sumBy(list, 'i'), exp = sumBy(list, 'e');
    var bal = inc - exp;
    els.balance.textContent = fmt(bal);
    els.balance.classList.toggle('text-destructive', bal < 0);
    els.balance.classList.toggle('text-foreground', bal >= 0);
    els.income.textContent = fmt(inc);
    els.expense.textContent = fmt(exp);

    // Geçen aya göre: bu ay sürüyorsa geçen ayın aynı gününe kadarki harcamayla kıyasla.
    var now = new Date();
    var isCurrent = viewMonth === monthKeyOf(now);
    var prev = monthTx(shiftMonth(viewMonth, -1));
    var prevExp = sumBy(prev, 'e', isCurrent ? now.getDate() : 0);
    if (prevExp > 0 && exp > 0) {
      var p = Math.round(Math.abs(exp - prevExp) / prevExp * 100);
      if (p >= 1) {
        els.vs.textContent = tr(exp > prevExp ? 'walletVsMore' : 'walletVsLess', { p: p });
        els.vs.classList.remove('hidden');
      } else { els.vs.classList.add('hidden'); }
    } else {
      els.vs.classList.add('hidden');
    }
    return exp;
  }

  function renderBudget(exp) {
    var b = state.budget;
    els.budgetNone.classList.toggle('hidden', b > 0);
    els.budgetOn.classList.toggle('hidden', !(b > 0));
    els.budgetEdit.classList.toggle('hidden', !(b > 0));
    if (!(b > 0)) return;
    var pct = exp / b * 100;
    els.budgetUsed.textContent = fmt(exp);
    els.budgetTotal.textContent = '/ ' + fmt(b);
    els.budgetBar.style.width = Math.min(100, pct) + '%';
    els.budgetBar.className = 'h-full rounded-full transition-[width] duration-500 ' + colorOfBar(pct);
    var left = b - exp;
    if (left >= 0) {
      els.budgetMsg.textContent = tr('walletBudgetLeft', { amount: fmt(left) });
      els.budgetMsg.className = 'mt-3 text-xs font-semibold leading-5 ' + (pct >= 80 ? 'text-amber-400' : 'text-success');
    } else {
      els.budgetMsg.textContent = tr('walletBudgetOver', { amount: fmt(-left) });
      els.budgetMsg.className = 'mt-3 text-xs font-semibold leading-5 text-destructive';
    }
    // Günlük pay: yalnızca içinde bulunulan ay için anlamlı.
    var now = new Date();
    if (viewMonth === monthKeyOf(now) && left > 0) {
      var dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      var daysLeft = dim - now.getDate() + 1;
      els.budgetDaily.textContent = tr('walletDailyLeft', { n: daysLeft, amount: fmt(Math.floor(left / daysLeft)) });
      els.budgetDaily.classList.remove('hidden');
    } else {
      els.budgetDaily.classList.add('hidden');
    }
  }

  function svgEl(name, attrs) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function renderCategories(list, exp) {
    var totals = {};
    list.forEach(function (x) { if (x.t === 'e') totals[x.c] = (totals[x.c] || 0) + x.a; });
    var rows = Object.keys(totals).map(function (k) { return { key: k, a: totals[k] }; })
      .sort(function (a, b) { return b.a - a.a; });
    els.catEmpty.classList.toggle('hidden', rows.length > 0);
    els.catWrap.classList.toggle('hidden', rows.length === 0);
    if (!rows.length) return;

    // Halka grafik: r=15.9155 -> çevre 100, böylece dilim uzunluğu doğrudan yüzde.
    var svg = els.donut;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.appendChild(svgEl('circle', { cx: 21, cy: 21, r: 15.9155, fill: 'none', stroke: '#10213A', 'stroke-width': 6 }));
    var offset = 0;
    rows.forEach(function (r) {
      var c = CAT_BY_KEY['e:' + r.key];
      var share = r.a / exp * 100;
      var gap = rows.length > 1 && share > 1.5 ? 0.6 : 0;
      svg.appendChild(svgEl('circle', {
        cx: 21, cy: 21, r: 15.9155, fill: 'none', stroke: c ? c[3] : '#94A3B8', 'stroke-width': 6,
        'stroke-dasharray': Math.max(share - gap, 0.01) + ' ' + (100 - Math.max(share - gap, 0.01)),
        'stroke-dashoffset': -offset
      }));
      offset += share;
    });

    var ul = els.catList;
    ul.textContent = '';
    rows.forEach(function (r) {
      var c = CAT_BY_KEY['e:' + r.key] || CAT_BY_KEY['e:other'];
      var share = r.a / exp * 100;
      var li = document.createElement('li');
      var top = document.createElement('div');
      top.className = 'flex items-center justify-between gap-2 text-xs';
      var left = document.createElement('div');
      left.className = 'flex min-w-0 items-center gap-2';
      var dot = document.createElement('span');
      dot.className = 'h-2.5 w-2.5 shrink-0 rounded-full';
      dot.style.background = c[3];
      var name = document.createElement('span');
      name.className = 'truncate font-semibold';
      name.textContent = tr(c[1]);
      left.appendChild(dot); left.appendChild(name);
      var right = document.createElement('div');
      right.className = 'shrink-0 text-right';
      var amt = document.createElement('span');
      amt.className = 'font-bold';
      amt.textContent = fmt(r.a);
      var pc = document.createElement('span');
      pc.className = 'ml-2 text-muted-foreground';
      pc.textContent = (share < 1 ? '<1' : Math.round(share)) + '%';
      right.appendChild(amt); right.appendChild(pc);
      top.appendChild(left); top.appendChild(right);
      var bar = document.createElement('div');
      bar.className = 'mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted';
      var fill = document.createElement('div');
      fill.className = 'h-full rounded-full';
      fill.style.width = Math.max(share, 2) + '%';
      fill.style.background = c[3];
      bar.appendChild(fill);
      li.appendChild(top); li.appendChild(bar);
      ul.appendChild(li);
    });
    svg.setAttribute('aria-label', tr('walletByCategory'));
  }

  function dayLabel(dstr) {
    var today = todayStr();
    var y = new Date(); y.setDate(y.getDate() - 1);
    if (dstr === today) return tr('walletToday');
    if (dstr === ymd(y)) return tr('walletYesterday');
    try {
      return parseYmd(dstr).toLocaleDateString(lang(), { weekday: 'short', day: 'numeric', month: 'long' });
    } catch (e) { return dstr; }
  }

  function renderList(list) {
    els.empty.classList.toggle('hidden', list.length > 0);
    els.list.textContent = '';
    if (!list.length) return;
    var sorted = list.slice().sort(function (a, b) {
      if (a.d !== b.d) return a.d < b.d ? 1 : -1;
      return (b.ts || 0) - (a.ts || 0);
    });
    var groups = [], map = {};
    sorted.forEach(function (x) {
      if (!map[x.d]) { map[x.d] = { d: x.d, items: [], exp: 0 }; groups.push(map[x.d]); }
      map[x.d].items.push(x);
      if (x.t === 'e') map[x.d].exp += x.a;
    });
    groups.forEach(function (g) {
      var sec = document.createElement('div');
      var head = document.createElement('div');
      head.className = 'mb-1.5 flex items-center justify-between px-1 text-[11px] font-semibold text-muted-foreground';
      var hl = document.createElement('span');
      hl.textContent = dayLabel(g.d);
      var hr = document.createElement('span');
      hr.textContent = g.exp > 0 ? '−' + fmt(g.exp) : '';
      head.appendChild(hl); head.appendChild(hr);
      sec.appendChild(head);
      var box = document.createElement('div');
      box.className = 'overflow-hidden rounded-[20px] border border-border bg-card';
      g.items.forEach(function (x, idx) {
        var c = CAT_BY_KEY[x.t + ':' + x.c] || CAT_BY_KEY[x.t === 'e' ? 'e:other' : 'i:otherin'];
        var row = document.createElement('button');
        row.type = 'button';
        row.className = 'flex w-full items-center gap-3 px-3.5 py-3 text-left' + (idx ? ' border-t border-border' : '');
        row.setAttribute('data-id', x.id);
        var ic = document.createElement('span');
        ic.className = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full';
        ic.style.background = c[3] + '26';
        ic.style.color = c[3];
        var icon = document.createElement('iconify-icon');
        icon.setAttribute('icon', c[2]);
        icon.className = 'text-lg';
        ic.appendChild(icon);
        if (window.__healIcon) window.__healIcon(icon);
        var mid = document.createElement('span');
        mid.className = 'min-w-0 flex-1';
        var t1 = document.createElement('span');
        t1.className = 'block truncate text-sm font-semibold';
        t1.textContent = tr(c[1]);
        mid.appendChild(t1);
        if (x.n) {
          var t2 = document.createElement('span');
          t2.className = 'mt-0.5 block truncate text-[11px] text-muted-foreground';
          t2.textContent = x.n;
          mid.appendChild(t2);
        }
        var am = document.createElement('span');
        am.className = 'shrink-0 font-heading text-sm font-bold ' + (x.t === 'i' ? 'text-success' : 'text-foreground');
        am.textContent = (x.t === 'i' ? '+' : '−') + fmt(x.a);
        row.appendChild(ic); row.appendChild(mid); row.appendChild(am);
        row.addEventListener('click', function () { openSheet(x.id); });
        box.appendChild(row);
      });
      sec.appendChild(box);
      els.list.appendChild(sec);
    });
  }

  function render() {
    var d = parseYmd(viewMonth + '-01');
    var label;
    try { label = d.toLocaleDateString(lang(), { month: 'long', year: 'numeric' }); } catch (e) { label = viewMonth; }
    els.month.textContent = label;
    els.next.disabled = viewMonth >= monthKeyOf(new Date());
    var list = monthTx(viewMonth);
    var exp = renderSummary(list);
    renderBudget(exp);
    renderCategories(list, exp);
    renderList(list);
    // data-i18n-aria: i18n.js yalnızca metin/placeholder dolduruyor, aria-label'ı biz çeviriyoruz.
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-aria]'), function (el) {
      el.setAttribute('aria-label', tr(el.getAttribute('data-i18n-aria')));
    });
  }

  // ---------- toast ----------
  var toastTimer = null, undoFn = null;
  function toast(text, undo) {
    els.toastText.textContent = text;
    undoFn = undo || null;
    els.toastUndo.classList.toggle('hidden', !undo);
    els.toast.classList.remove('hidden');
    els.toast.classList.add('flex');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.classList.add('hidden');
      els.toast.classList.remove('flex');
      undoFn = null;
    }, undo ? 5000 : 2200);
  }

  // ---------- kayıt ekle / düzenle ----------
  var sheet = { type: 'e', cat: 'market', editing: null };
  function lockScroll(on) { document.body.style.overflow = on ? 'hidden' : ''; }

  function buildCatChips() {
    var box = els.cats;
    box.textContent = '';
    CATS[sheet.type].forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      var active = sheet.cat === c[0];
      b.className = 'flex h-10 items-center gap-1.5 rounded-full border px-3 text-xs font-bold ' +
        (active ? 'border-primary bg-primary/15 text-primary' : 'border-border bg-card text-muted-foreground');
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
      var icon = document.createElement('iconify-icon');
      icon.setAttribute('icon', c[2]);
      icon.className = 'text-base';
      icon.style.color = active ? '' : c[3];
      if (window.__healIcon) window.__healIcon(icon);
      var sp = document.createElement('span');
      sp.textContent = tr(c[1]);
      b.appendChild(icon); b.appendChild(sp);
      b.addEventListener('click', function () { sheet.cat = c[0]; buildCatChips(); });
      box.appendChild(b);
    });
  }
  function setType(t) {
    sheet.type = t;
    if (!CAT_BY_KEY[t + ':' + sheet.cat]) sheet.cat = CATS[t][0][0];
    var e = els.typeE, i = els.typeI;
    e.className = 'h-11 rounded-[12px] text-sm font-bold ' + (t === 'e' ? 'bg-destructive text-white' : 'text-muted-foreground');
    i.className = 'h-11 rounded-[12px] text-sm font-bold ' + (t === 'i' ? 'bg-success text-black' : 'text-muted-foreground');
    e.setAttribute('aria-selected', t === 'e' ? 'true' : 'false');
    i.setAttribute('aria-selected', t === 'i' ? 'true' : 'false');
    buildCatChips();
  }
  function openSheet(id) {
    var x = null;
    if (id) for (var i = 0; i < state.tx.length; i++) if (state.tx[i].id === id) { x = state.tx[i]; break; }
    sheet.editing = x ? x.id : null;
    sheet.cat = x ? x.c : 'market';
    els.sheetTitle.textContent = tr(x ? 'walletEditTitle' : 'walletAddTitle');
    els.del.classList.toggle('hidden', !x);
    els.del.classList.toggle('flex', !!x);
    els.amount.value = x ? fmt(x.a, { plain: true }) : '';
    els.amountCur.textContent = curSymbol();
    els.note.value = x ? x.n : '';
    els.date.max = todayStr();
    els.date.value = x ? x.d : todayStr();
    els.error.classList.add('hidden');
    setType(x ? x.t : 'e');
    els.sheet.classList.remove('hidden');
    lockScroll(true);
    if (!x) setTimeout(function () { try { els.amount.focus(); } catch (e) {} }, 60);
  }
  function closeSheet() { els.sheet.classList.add('hidden'); lockScroll(false); }

  function saveSheet() {
    var cents = parseAmount(els.amount.value);
    if (!(cents > 0) || cents >= 1e14) { els.error.classList.remove('hidden'); els.amount.focus(); return; }
    var d = /^\d{4}-\d{2}-\d{2}$/.test(els.date.value) ? els.date.value : todayStr();
    var note = els.note.value.trim().slice(0, 80);
    if (sheet.editing) {
      for (var i = 0; i < state.tx.length; i++) {
        if (state.tx[i].id === sheet.editing) {
          state.tx[i].t = sheet.type; state.tx[i].a = cents; state.tx[i].c = sheet.cat;
          state.tx[i].n = note; state.tx[i].d = d;
        }
      }
    } else {
      state.tx.push({ id: uid(), t: sheet.type, a: cents, c: sheet.cat, n: note, d: d, ts: Date.now() });
    }
    save();
    viewMonth = d.slice(0, 7);
    closeSheet();
    render();
    toast(tr('walletSaved'));
  }
  function deleteCurrent() {
    var id = sheet.editing;
    if (!id) return;
    var removed = null, idx = -1;
    for (var i = 0; i < state.tx.length; i++) if (state.tx[i].id === id) { removed = state.tx[i]; idx = i; break; }
    if (!removed) return;
    state.tx.splice(idx, 1);
    save();
    closeSheet();
    render();
    toast(tr('walletDeleted'), function () {
      state.tx.push(removed);
      save();
      render();
    });
  }

  // ---------- ayarlar / yedek ----------
  var clearArmed = false;
  function openSettings() {
    els.budgetInput.value = state.budget > 0 ? fmt(state.budget, { plain: true }) : '';
    els.cur.value = state.cur;
    clearArmed = false;
    els.clearText.textContent = tr('walletClearAll');
    els.set.classList.remove('hidden');
    lockScroll(true);
  }
  function closeSettings() { els.set.classList.add('hidden'); lockScroll(false); }
  function fillCurrencies() {
    var list = (window.ONE_CURRENCIES && window.ONE_CURRENCIES.list) || [{ code: 'TRY', symbol: '₺', name: 'Turkish Lira' }];
    var sel = els.cur;
    sel.textContent = '';
    var have = false;
    list.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c.code;
      o.textContent = c.code + ' ' + c.symbol + ' — ' + c.name;
      sel.appendChild(o);
      if (c.code === state.cur) have = true;
    });
    if (!have) {
      var o = document.createElement('option');
      o.value = state.cur; o.textContent = state.cur;
      sel.appendChild(o);
    }
  }
  function saveSettings() {
    var raw = els.budgetInput.value.trim();
    if (raw === '') {
      state.budget = 0;
    } else {
      var c = parseAmount(raw);
      if (!(c > 0) || c >= 1e14) { els.budgetInput.focus(); toast(tr('walletInvalid')); return; }
      state.budget = c;
    }
    state.cur = els.cur.value || state.cur;
    save();
    closeSettings();
    render();
    toast(tr('walletSaved'));
  }

  function download(name, mime, text, bom) {
    try {
      var blob = new Blob([bom ? '﻿' + text : text], { type: mime });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    } catch (e) { toast(tr('walletRestoreFail')); }
  }
  function exportCsv() {
    function q(s) { return '"' + String(s).replace(/"/g, '""') + '"'; }
    // Metin hücrelerinde formül enjeksiyonunu önle (=, +, -, @ ile başlayanlar).
    function safe(s) { s = String(s); return /^[=+\-@\t\r]/.test(s) ? "'" + s : s; }
    var rows = [[tr('walletDate'), tr('walletExpense') + ' / ' + tr('walletIncome'),tr('walletCategory'), tr('walletAmount') + ' (' + state.cur + ')', tr('walletNote').replace(/\s*[(（][^)）]*[)）]/g, '')].map(q).join(';')];
    state.tx.slice().sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : (a.ts || 0) - (b.ts || 0); })
      .forEach(function (x) {
        rows.push([x.d, tr(x.t === 'e' ? 'walletExpense' : 'walletIncome'), catName(x.t, x.c), (x.t === 'e' ? '-' : '') + fmt(x.a, { plain: true }), safe(x.n)].map(q).join(';'));
      });
    download('hemcan-cuzdan-' + todayStr() + '.csv', 'text/csv;charset=utf-8', rows.join('\r\n'), true);
  }
  function backup() {
    download('hemcan-cuzdan-yedek-' + todayStr() + '.json', 'application/json', JSON.stringify(state), false);
  }
  function restore(file) {
    if (!file) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var data = JSON.parse(String(fr.result));
        if (!data || !Array.isArray(data.tx)) throw new Error('bad');
        state = sanitize(data);
        save();
        viewMonth = monthKeyOf(new Date());
        fillCurrencies();
        closeSettings();
        render();
        toast(tr('walletRestoreOk'));
      } catch (e) { toast(tr('walletRestoreFail')); }
    };
    fr.onerror = function () { toast(tr('walletRestoreFail')); };
    fr.readAsText(file);
  }
  function clearAll() {
    if (!clearArmed) {
      clearArmed = true;
      els.clearText.textContent = tr('walletClearConfirm');
      return;
    }
    state = fresh();
    save();
    closeSettings();
    render();
    toast(tr('walletDeleted'));
  }

  // ---------- başlat ----------
  function init() {
    var ids = {
      balance: 'w-balance', income: 'w-income', expense: 'w-expense', vs: 'w-vs', month: 'w-month', prev: 'w-prev', next: 'w-next',
      budgetNone: 'w-budget-none', budgetOn: 'w-budget-on', budgetEdit: 'w-budget-edit', budgetSet: 'w-budget-set',
      budgetUsed: 'w-budget-used', budgetTotal: 'w-budget-total', budgetBar: 'w-budget-bar', budgetMsg: 'w-budget-msg', budgetDaily: 'w-budget-daily',
      catEmpty: 'w-cat-empty', catWrap: 'w-cat-wrap', donut: 'w-donut', catList: 'w-cat-list', empty: 'w-empty', list: 'w-list',
      fab: 'w-fab', toast: 'w-toast', toastText: 'w-toast-text', toastUndo: 'w-toast-undo',
      sheet: 'w-sheet', sheetBg: 'w-sheet-bg', sheetTitle: 'w-sheet-title', sheetClose: 'w-sheet-close', typeE: 'w-type-e', typeI: 'w-type-i',
      amount: 'w-amount', amountCur: 'w-amount-cur', error: 'w-error', cats: 'w-cats', note: 'w-note', date: 'w-date', save: 'w-save', del: 'w-delete',
      set: 'w-set', setBg: 'w-set-bg', setClose: 'w-set-close', openSet: 'w-open-settings', budgetInput: 'w-budget-input', cur: 'w-cur', setSave: 'w-set-save',
      backup: 'w-backup', restore: 'w-restore', restoreFile: 'w-restore-file', csv: 'w-csv', clear: 'w-clear', clearText: 'w-clear-text'
    };
    for (var k in ids) els[k] = $(ids[k]);

    fillCurrencies();
    els.prev.addEventListener('click', function () { viewMonth = shiftMonth(viewMonth, -1); render(); });
    els.next.addEventListener('click', function () {
      if (viewMonth < monthKeyOf(new Date())) { viewMonth = shiftMonth(viewMonth, 1); render(); }
    });
    els.fab.addEventListener('click', function () { openSheet(null); });
    els.sheetBg.addEventListener('click', closeSheet);
    els.sheetClose.addEventListener('click', closeSheet);
    els.typeE.addEventListener('click', function () { setType('e'); });
    els.typeI.addEventListener('click', function () { setType('i'); });
    els.save.addEventListener('click', saveSheet);
    els.del.addEventListener('click', deleteCurrent);
    els.amount.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); saveSheet(); } });
    els.amount.addEventListener('input', function () { els.error.classList.add('hidden'); });
    els.note.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); saveSheet(); } });

    els.openSet.addEventListener('click', openSettings);
    els.budgetEdit.addEventListener('click', openSettings);
    els.budgetSet.addEventListener('click', function () { openSettings(); setTimeout(function () { try { els.budgetInput.focus(); } catch (e) {} }, 60); });
    els.setBg.addEventListener('click', closeSettings);
    els.setClose.addEventListener('click', closeSettings);
    els.setSave.addEventListener('click', saveSettings);
    els.backup.addEventListener('click', backup);
    els.csv.addEventListener('click', exportCsv);
    els.restore.addEventListener('click', function () { els.restoreFile.value = ''; els.restoreFile.click(); });
    els.restoreFile.addEventListener('change', function () { restore(els.restoreFile.files && els.restoreFile.files[0]); });
    els.clear.addEventListener('click', clearAll);
    els.toastUndo.addEventListener('click', function () {
      var fn = undoFn; undoFn = null;
      els.toast.classList.add('hidden'); els.toast.classList.remove('flex');
      if (fn) fn();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeSheet(); closeSettings(); }
    });

    window.addEventListener('one-lang-changed', function () {
      els.amountCur.textContent = curSymbol();
      if (!els.sheet.classList.contains('hidden')) {
        buildCatChips();
        els.sheetTitle.textContent = tr(sheet.editing ? 'walletEditTitle' : 'walletAddTitle');
      }
      render();
    });
    // Gün değişirse ("Bugün/Dün", günlük pay) yenilensin.
    document.addEventListener('visibilitychange', function () { if (!document.hidden) render(); });
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
