/* Hemcan — Farkı bul. Resimler kodla (SVG) çizilir: internet gerekmez, her oyun yeni bir resim çifti üretir.
   Yalnızca bu telefonda ("one-fark") rekor tutar. */
(function () {
  'use strict';
  var WB = window.WB, $ = WB.$, t = WB.t;
  var KEY = 'one-fark', LV = ['easy', 'medium', 'hard'], LVKEY = { easy: 'mgEasy', medium: 'mgMedium', hard: 'mgHard' };
  var CFG = { easy: { diffs: 4, hue: 130, size: 1.45 }, medium: { diffs: 5, hue: 100, size: 1.38 }, hard: { diffs: 7, hue: 70, size: 1.3 } };
  var W = 320, H = 220, SEP = 42;

  var S = WB.load(KEY, null) || {}; S.v = 1; S.best = S.best || {}; S.solved = S.solved || {};
  function save() { WB.save(KEY, S); }
  function mk(tag, cls, text) { return WB.el(tag, cls, text); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function rr(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function clock(sec) { return WB.fmtDur(sec); }
  function f1(n) { return Math.round(n * 10) / 10; }

  // ---------- renk yardımcıları ----------
  function hexToHsl(h) {
    var r = parseInt(h.substr(1, 2), 16) / 255, g = parseInt(h.substr(3, 2), 16) / 255, b = parseInt(h.substr(5, 2), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, s = 0, hh = 0, d = mx - mn;
    if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; }
    return [hh, s, l];
  }
  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    function p(v) { var n = Math.round((v + m) * 255).toString(16); return n.length < 2 ? '0' + n : n; }
    return '#' + p(r) + p(g) + p(b);
  }
  function shiftColor(c, deg) {
    var hsl = hexToHsl(c);
    if (hsl[1] < 0.18) return hsl[2] > 0.5 ? '#ffc2d9' : '#8fb8ff'; // beyaz/gri tonlar için sabit ikinci renk
    return hslToHex(hsl[0] + (Math.random() < 0.5 ? -deg : deg), Math.max(hsl[1], 0.55), hsl[2]);
  }

  // ---------- çizim parçaları (orijin = parçanın görsel merkezi) ----------
  var NOM = { sun: 15, moon: 13, cloud: 20, house: 24, tree: 20, flower: 8, bird: 10, balloon: 15, mushroom: 9, butterfly: 9, star: 7, boat: 22, fish: 11, lighthouse: 22 };
  var STAR = '0,-6 1.8,-1.8 6,-1.5 2.8,1.3 3.7,5.5 0,3.2 -3.7,5.5 -2.8,1.3 -6,-1.5 -1.8,-1.8';
  function draw(e, pal) {
    var c = e.c, c2 = e.c2, o = '';
    switch (e.k) {
      case 'sun':
        o += '<g stroke="' + c2 + '" stroke-width="2.4" stroke-linecap="round">';
        for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; o += '<line x1="' + f1(Math.cos(a) * 15) + '" y1="' + f1(Math.sin(a) * 15) + '" x2="' + f1(Math.cos(a) * 21) + '" y2="' + f1(Math.sin(a) * 21) + '"/>'; }
        o += '</g><circle r="11.5" fill="' + c + '"/>'; break;
      case 'moon': o += '<path d="M4 -12 A12.5 12.5 0 1 0 12 6 A10 10 0 1 1 4 -12Z" fill="' + c + '"/>'; break;
      case 'cloud': o += '<g fill="' + c + '"><ellipse cx="0" cy="4" rx="19" ry="7"/><circle cx="-8" cy="-1" r="8"/><circle cx="3" cy="-5" r="10"/><circle cx="12" cy="0" r="6.5"/></g>'; break;
      case 'house':
        o += '<rect x="-16" y="-12" width="32" height="24" fill="' + c + '"/><polygon points="-20,-12 0,-31 20,-12" fill="' + c2 + '"/><rect x="-4" y="1" width="8" height="11" fill="#7a4a2b"/>' +
          '<rect x="6" y="-7" width="7" height="7" fill="' + pal.win + '"/><rect x="-13" y="-7" width="7" height="7" fill="' + pal.win + '"/>'; break;
      case 'tree': o += '<rect x="-3" y="4" width="6" height="17" fill="#8b5a2b"/><g fill="' + c + '"><circle cx="0" cy="-6" r="13"/><circle cx="-9" cy="2" r="9"/><circle cx="9" cy="2" r="9"/></g>'; break;
      case 'flower':
        o += '<line x1="0" y1="0" x2="0" y2="12" stroke="#3a9d4a" stroke-width="2"/><g fill="' + c + '">';
        for (var j = 0; j < 5; j++) { var b = j * 2 * Math.PI / 5 - Math.PI / 2; o += '<circle cx="' + f1(Math.cos(b) * 4.3) + '" cy="' + f1(Math.sin(b) * 4.3) + '" r="3.3"/>'; }
        o += '</g><circle r="2.7" fill="#ffb703"/>'; break;
      case 'bird': o += '<path d="M-9 1 Q-4.5 -6 0 0 Q4.5 -6 9 1" fill="none" stroke="' + c + '" stroke-width="2.2" stroke-linecap="round"/>'; break;
      case 'balloon': o += '<ellipse cx="0" cy="-4" rx="8.5" ry="10.5" fill="' + c + '"/><path d="M0 6 L-3 10 L3 10Z" fill="' + c + '"/><line x1="0" y1="10" x2="0" y2="17" stroke="#666" stroke-width="1"/><rect x="-3" y="17" width="6" height="4" fill="#8b5a2b"/>'; break;
      case 'mushroom': o += '<rect x="-2.5" y="0" width="5" height="8" fill="#f3e9d2"/><path d="M-8.5 1 A8.5 7.5 0 0 1 8.5 1Z" fill="' + c + '"/><circle cx="-3.2" cy="-2.3" r="1.3" fill="#fff"/><circle cx="3.2" cy="-3.2" r="1.3" fill="#fff"/>'; break;
      case 'butterfly':
        o += '<g fill="' + c + '"><ellipse cx="-4.2" cy="-2" rx="4.6" ry="3.6" transform="rotate(-20 -4.2 -2)"/><ellipse cx="4.2" cy="-2" rx="4.6" ry="3.6" transform="rotate(20 4.2 -2)"/><ellipse cx="-3" cy="3" rx="3" ry="2.6"/><ellipse cx="3" cy="3" rx="3" ry="2.6"/></g><line x1="0" y1="-4" x2="0" y2="5" stroke="#333" stroke-width="1.3"/>'; break;
      case 'star': o += '<polygon points="' + STAR + '" fill="' + c + '"/>'; break;
      case 'boat': o += '<path d="M-17 0 L17 0 L12 9 L-12 9Z" fill="' + c + '"/><line x1="0" y1="0" x2="0" y2="-25" stroke="#5a4632" stroke-width="1.8"/><path d="M2 -24 L2 -3 L17 -3Z" fill="' + c2 + '"/><path d="M-2 -19 L-2 -3 L-13 -3Z" fill="#fff"/>'; break;
      case 'fish': o += '<ellipse cx="0" cy="0" rx="9.5" ry="5.3" fill="' + c + '"/><path d="M8 0 L15.5 -5.5 L15.5 5.5Z" fill="' + c + '"/><circle cx="-4.2" cy="-1.5" r="1.3" fill="#fff"/><circle cx="-4.2" cy="-1.5" r=".55" fill="#222"/>'; break;
      case 'lighthouse':
        o += '<ellipse cx="0" cy="13" rx="21" ry="6" fill="' + pal.sand + '"/><path d="M-8 13 L8 13 L5.5 -14 L-5.5 -14Z" fill="#f7f7f7"/><path d="M-6.8 3 L6.8 3 L6.2 -3 L-6.2 -3Z" fill="' + c + '"/><rect x="-6" y="-21" width="12" height="7" fill="#ffd95a"/><polygon points="-8,-21 0,-29 8,-21" fill="' + c + '"/>'; break;
    }
    return o;
  }
  function elSvg(e, pal) {
    return '<g transform="translate(' + f1(e.x) + ' ' + f1(e.y) + ') scale(' + e.s + ')">' + draw(e, pal) + '</g>';
  }

  // ---------- sahneler ----------
  var PAL = {
    day: { sky: ['#8fd6ff', '#e8f8ff'], hill1: '#9bdc90', hill2: '#7ccb7f', win: '#fff6c9', sand: '#f1d9a0', cloud: '#ffffff' },
    night: { sky: ['#0b1533', '#2b3b78'], hill1: '#24504f', hill2: '#1c3f40', win: '#ffd95a', sand: '#c9b27c', cloud: '#4a5a9c' },
    sea: { sky: ['#8fd6ff', '#e8f8ff'], sea: ['#43b0e0', '#2a87bf'], win: '#fff6c9', sand: '#f1d9a0', cloud: '#ffffff' }
  };
  var COL = {
    house: ['#f2a65a', '#e56b6f', '#f4d35e', '#9ad1d4', '#b8a1e3'], roof: ['#c0392b', '#6d597a', '#355070', '#bc4749'],
    tree: ['#3fae5a', '#2e8f4e', '#5bc26b'], flower: ['#ff6b9d', '#ffd23f', '#ff8c42', '#b388eb', '#ff5964'], balloon: ['#ff5964', '#35a7ff', '#ffd23f', '#7bd389'],
    mushroom: ['#e63946', '#f4a261'], butterfly: ['#ff8fb1', '#7ec8ff', '#ffd166'], bird: ['#3b3b4f', '#5c5c7a'], boat: ['#e76f51', '#2a9d8f', '#e9c46a'],
    fish: ['#ff9f1c', '#ff6b6b', '#9b5de5', '#2ec4b6'], light: ['#e63946', '#ef476f']
  };
  // [tür, adet, xmin, xmax, ymin, ymax]
  var SPEC = {
    day: [['sun', 1, 40, 280, 28, 44], ['cloud', 3, 30, 290, 22, 70], ['balloon', 1, 40, 280, 62, 100], ['bird', 2, 30, 290, 40, 90], ['house', 2, 45, 275, 146, 154], ['tree', 4, 25, 295, 160, 186],
      ['flower', 6, 20, 300, 188, 208], ['mushroom', 2, 25, 295, 192, 210], ['butterfly', 1, 40, 280, 118, 170]],
    night: [['moon', 1, 40, 280, 28, 46], ['star', 9, 15, 305, 12, 100], ['cloud', 2, 30, 290, 40, 80], ['house', 2, 45, 275, 146, 154], ['tree', 4, 25, 295, 160, 186],
      ['flower', 5, 20, 300, 188, 208], ['mushroom', 2, 25, 295, 192, 210]],
    sea: [['sun', 1, 40, 200, 26, 44], ['cloud', 3, 30, 290, 20, 70], ['bird', 3, 30, 290, 40, 95], ['boat', 2, 40, 200, 134, 150], ['lighthouse', 1, 250, 290, 100, 106],
      ['fish', 4, 25, 295, 165, 208]]
  };
  var ADDS = { day: ['flower', 'butterfly', 'bird', 'mushroom'], night: ['star', 'flower', 'mushroom'], sea: ['fish', 'bird'] };
  var KMUT = { // izinli değişiklikler
    sun: ['color', 'size'], moon: ['color', 'size'], cloud: ['color', 'remove', 'move', 'size'], house: ['color', 'size'], tree: ['color', 'size', 'remove'],
    flower: ['color', 'remove', 'size'], bird: ['remove', 'move', 'color'], balloon: ['color', 'remove', 'move'], mushroom: ['color', 'remove'], butterfly: ['color', 'remove', 'move'],
    star: ['remove', 'size', 'color'], boat: ['color', 'move', 'size'], fish: ['color', 'remove', 'move'], lighthouse: ['color']
  };
  function colorsFor(k, theme) {
    var pal = PAL[theme];
    switch (k) {
      case 'sun': return ['#ffd23f', '#ffb703']; case 'moon': return ['#fff3b0', '']; case 'cloud': return [pal.cloud, ''];
      case 'house': return [pick(COL.house), pick(COL.roof)]; case 'tree': return [pick(COL.tree), ''];
      case 'flower': return [pick(COL.flower), '']; case 'bird': return [theme === 'night' ? '#dbe4ff' : pick(COL.bird), ''];
      case 'balloon': return [pick(COL.balloon), '']; case 'mushroom': return [pick(COL.mushroom), '']; case 'butterfly': return [pick(COL.butterfly), ''];
      case 'star': return ['#fff3b0', '']; case 'boat': return [pick(COL.boat), pick(COL.boat)]; case 'fish': return [pick(COL.fish), '']; case 'lighthouse': return [pick(COL.light), ''];
    }
    return ['#fff', ''];
  }
  function free(els, x, y, nom) {
    for (var i = 0; i < els.length; i++) {
      var o = els[i], d = Math.sqrt((o.x - x) * (o.x - x) + (o.y - y) * (o.y - y));
      if (d < (NOM[o.k] + nom) * 0.85 + 6) return false;
    }
    return true;
  }
  function layout(theme) {
    var els = [], id = 0;
    SPEC[theme].forEach(function (sp) {
      for (var n = 0; n < sp[1]; n++) {
        for (var at = 0; at < 80; at++) {
          var x = rr(sp[2], sp[3]), y = rr(sp[4], sp[5]);
          if (free(els, x, y, NOM[sp[0]]) || at === 79) {
            var cc = colorsFor(sp[0], theme);
            if (sp[0] === 'sun') cc[1] = '#ffb703';
            els.push({ id: id++, k: sp[0], x: x, y: y, s: 1, c: cc[0], c2: cc[1] }); break;
          }
        }
      }
    });
    return els;
  }

  // ---------- farkları seç ----------
  function makePuzzle(lv) {
    var cfg = CFG[lv];
    for (var tries = 0; tries < 80; tries++) {
      var theme = pick(['day', 'night', 'sea']), els = layout(theme), diffs = [], over = {}, extra = [], cnt = {}, hits = [];
      function far(x, y) { return hits.every(function (h) { return Math.sqrt((h.x - x) * (h.x - x) + (h.y - y) * (h.y - y)) >= SEP; }); }
      // 1 adet "eklenen" parça (yalnızca 2. resimde)
      var wantAdd = cfg.diffs >= 5 ? 1 : 0;
      for (var a = 0; a < wantAdd; a++) {
        for (var at = 0; at < 60; at++) {
          var k = pick(ADDS[theme]), sp = SPEC[theme].filter(function (q) { return q[0] === k; })[0] || SPEC[theme][0];
          var x = rr(sp[2], sp[3]), y = rr(sp[4], sp[5]);
          if (free(els, x, y, NOM[k] + 6) && free(extra, x, y, NOM[k]) && far(x, y)) {
            var cc = colorsFor(k, theme); extra.push({ id: 900 + a, k: k, x: x, y: y, s: 1, c: cc[0], c2: cc[1] });
            hits.push({ x: x, y: y, r: NOM[k] + 4, type: 'add' }); break;
          }
        }
      }
      var order = shuffle(els.slice());
      for (var i = 0; i < order.length && hits.length < cfg.diffs; i++) {
        var e = order[i], types = shuffle(KMUT[e.k].slice()), done = false;
        for (var ti = 0; ti < types.length && !done; ti++) {
          var ty = types[ti]; if ((cnt[ty] || 0) >= 2 && cfg.diffs < 7) continue; if ((cnt[ty] || 0) >= 3) continue;
          var o = { remove: false, dx: 0, s: e.s, c: e.c, c2: e.c2 }, hx = e.x, hy = e.y, hr = NOM[e.k];
          if (ty === 'remove') { o.remove = true; }
          else if (ty === 'color') {
            if (e.k === 'house' || e.k === 'boat') { if (Math.random() < 0.5) o.c = shiftColor(e.c, cfg.hue); else o.c2 = shiftColor(e.c2, cfg.hue); } else if (e.k === 'sun') { o.c = shiftColor(e.c, cfg.hue); o.c2 = o.c; } else o.c = shiftColor(e.c, cfg.hue);
          } else if (ty === 'size') { o.s = Math.random() < 0.5 ? cfg.size : 1 / cfg.size; hr = NOM[e.k] * Math.max(1, o.s); }
          else if (ty === 'move') { var dx = (Math.random() < 0.5 ? -1 : 1) * rr(16, 26); o.dx = dx; hx = e.x + dx / 2; hr = NOM[e.k] + Math.abs(dx) / 2; if (e.x + dx < 12 || e.x + dx > W - 12) { o.dx = -dx; hx = e.x - dx / 2; } }
          if (!far(hx, hy)) continue;
          over[e.id] = o; cnt[ty] = (cnt[ty] || 0) + 1; hits.push({ x: hx, y: hy, r: Math.min(hr, 36), type: ty, id: e.id }); done = true;
        }
      }
      if (hits.length < cfg.diffs) continue;
      hits.forEach(function (h, n) { h.n = n; h.found = false; });
      return { lv: lv, theme: theme, els: els, over: over, extra: extra, diffs: hits, hints: 3, mistakes: 0, active: 0 };
    }
    return null;
  }

  // ---------- SVG oluşturma ----------
  function backdrop(theme, tag) {
    var p = PAL[theme], g = 'g' + tag, o = '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.sky[0] + '"/><stop offset="1" stop-color="' + p.sky[1] + '"/></linearGradient>';
    if (theme === 'sea') o += '<linearGradient id="' + g + 's" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + p.sea[0] + '"/><stop offset="1" stop-color="' + p.sea[1] + '"/></linearGradient>';
    o += '</defs><rect width="' + W + '" height="' + H + '" fill="url(#' + g + ')"/>';
    return o;
  }
  function scene(pz, side) {
    var pal = PAL[pz.theme], list = [], tag = side;
    pz.els.forEach(function (e) {
      var o = side === 'b' ? pz.over[e.id] : null;
      if (o && o.remove) return;
      var c = { id: e.id, k: e.k, x: e.x, y: e.y, s: e.s, c: e.c, c2: e.c2 };
      if (o) { c.x += o.dx; c.s = o.s; c.c = o.c; c.c2 = o.c2; }
      list.push(c);
    });
    if (side === 'b') pz.extra.forEach(function (e) { list.push(e); });
    var SKY = { sun: 1, moon: 1, star: 1, cloud: 1, balloon: 1, bird: 1 };
    var sky = list.filter(function (e) { return SKY[e.k] && !(pz.theme === 'sea' && e.k === 'fish'); });
    var rest = list.filter(function (e) { return !SKY[e.k]; }).sort(function (a, b) { return a.y - b.y; });
    var o = backdrop(pz.theme, tag);
    sky.forEach(function (e) { o += elSvg(e, pal); });
    if (pz.theme === 'sea') {
      o += '<rect y="118" width="' + W + '" height="' + (H - 118) + '" fill="url(#g' + tag + 's)"/>';
      o += '<g stroke="#ffffff" stroke-opacity=".35" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M20 130 q6 -4 12 0 q6 4 12 0"/><path d="M150 126 q6 -4 12 0 q6 4 12 0"/><path d="M230 150 q6 -4 12 0 q6 4 12 0"/><path d="M60 175 q6 -4 12 0 q6 4 12 0"/><path d="M180 195 q6 -4 12 0 q6 4 12 0"/></g>';
    } else {
      o += '<path d="M0 150 Q60 100 130 138 T250 128 T320 142 V220 H0Z" fill="' + pal.hill1 + '"/><path d="M0 172 Q80 138 170 166 T320 160 V220 H0Z" fill="' + pal.hill2 + '"/>';
    }
    rest.forEach(function (e) { o += elSvg(e, pal); });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="block h-auto w-full" role="img" data-i18n-aria="fbPicLabel" aria-label="' + t('fbPicLabel') + '"><g class="scn">' + o + '</g><g class="mk"></g></svg>';
  }

  // ---------- oyun akışı ----------
  var view = null, cur = null, timer = null, last = 0, svgs = {};
  function show(v) {
    view = v;
    [['home', 'fb-home'], ['play', 'fb-play'], ['done', 'fb-done']].forEach(function (p) { $(p[1]).classList.toggle('hidden', p[0] !== v); });
    if (v !== 'play') { stopTimer(); WB.wakeOff && WB.wakeOff(); }
  }
  function renderHome() {
    var ul = $('fb-cards'); ul.innerHTML = '';
    LV.forEach(function (lv) {
      var li = mk('li', 'rounded-[20px] border border-border bg-card p-3'), row = mk('div', 'flex items-center justify-between gap-3'), left = mk('div', '');
      left.appendChild(mk('p', 'font-heading text-base font-semibold', t(LVKEY[lv])));
      left.appendChild(mk('p', 'text-[11px] text-muted-foreground', t('fbDiffs', { n: CFG[lv].diffs })));
      var b = S.best[lv];
      left.appendChild(mk('p', 'mt-0.5 text-[11px] font-semibold ' + (b ? 'text-chart5' : 'text-muted-foreground'), b ? t('mgBest', { t: clock(b) }) : t('mgNoBest')));
      row.appendChild(left);
      var btn = mk('button', 'h-11 min-w-[110px] rounded-theme bg-primary px-4 text-sm font-bold text-primary-foreground', t('mgPlay'));
      btn.type = 'button'; btn.setAttribute('data-level', lv); btn.addEventListener('click', function () { start(lv); });
      row.appendChild(btn); li.appendChild(row);
      if (S.solved[lv]) li.appendChild(mk('p', 'mt-2 text-[11px] text-muted-foreground', t('mgPlayed', { n: S.solved[lv] })));
      ul.appendChild(li);
    });
  }
  function start(lv) {
    var pz = makePuzzle(lv); if (!pz) return;
    cur = pz; $('fb-a').innerHTML = scene(pz, 'a'); $('fb-b').innerHTML = scene(pz, 'b');
    svgs = { a: $('fb-a').querySelector('svg'), b: $('fb-b').querySelector('svg') };
    $('fb-a').setAttribute('aria-label', t('fbPicA')); $('fb-b').setAttribute('aria-label', t('fbPicB'));
    refresh(); show('play'); startTimer(); WB.wakeOn && WB.wakeOn();
  }
  function refresh() {
    var f = cur.diffs.filter(function (d) { return d.found; }).length;
    $('fb-progress').textContent = t('fbFoundOf', { a: f, b: cur.diffs.length });
    $('fb-miss').textContent = cur.mistakes ? t('fbMistakes', { n: cur.mistakes }) : '';
    $('fb-hint').textContent = t('fbHint', { n: cur.hints }); $('fb-hint').disabled = cur.hints <= 0; $('fb-hint').classList.toggle('opacity-50', cur.hints <= 0);
  }
  function ring(svg, d, stroke, dash) {
    var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', f1(d.x)); c.setAttribute('cy', f1(d.y)); c.setAttribute('r', f1(Math.max(d.r, 16) + 2)); c.setAttribute('fill', 'none');
    c.setAttribute('stroke', stroke); c.setAttribute('stroke-width', '3'); if (dash) c.setAttribute('stroke-dasharray', '5 4');
    svg.querySelector('.mk').appendChild(c); return c;
  }
  function onTap(side, ev) {
    if (view !== 'play') return;
    var svg = svgs[side], r = svg.getBoundingClientRect();
    var x = (ev.clientX - r.left) * W / r.width, y = (ev.clientY - r.top) * H / r.height, hit = null;
    cur.diffs.forEach(function (d) {
      if (d.found) return; var dd = Math.sqrt((d.x - x) * (d.x - x) + (d.y - y) * (d.y - y));
      if (dd <= Math.max(d.r, 18) && (!hit || dd < hit.dd)) hit = { d: d, dd: dd };
    });
    if (hit) {
      hit.d.found = true; ring(svgs.a, hit.d, '#3DDBA5'); ring(svgs.b, hit.d, '#3DDBA5'); WB.vibrate(15); refresh();
      if (cur.diffs.every(function (q) { return q.found; })) finish();
    } else {
      cur.mistakes++; WB.vibrate(6); refresh();
      var m = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      m.setAttribute('x', f1(x)); m.setAttribute('y', f1(y + 6)); m.setAttribute('text-anchor', 'middle'); m.setAttribute('font-size', '20'); m.setAttribute('font-weight', '800'); m.setAttribute('fill', '#FF657A'); m.textContent = '✕';
      svg.querySelector('.mk').appendChild(m); setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 500);
    }
  }
  function hint() {
    if (view !== 'play' || cur.hints <= 0) return;
    var left = cur.diffs.filter(function (d) { return !d.found; }); if (!left.length) return;
    var d = pick(left); cur.hints--; refresh();
    var ra = ring(svgs.a, d, '#F2B66D', true), rb = ring(svgs.b, d, '#F2B66D', true);
    setTimeout(function () { [ra, rb].forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c); }); }, 2200);
  }
  function tick() { var now = Date.now(); if (last) cur.active += (now - last) / 1000; last = now; $('fb-clock').textContent = clock(Math.floor(cur.active)); }
  function startTimer() { stopTimer(); last = Date.now(); timer = setInterval(tick, 500); tick(); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } last = 0; }
  document.addEventListener('visibilitychange', function () { if (view !== 'play') return; if (document.hidden) { tick(); stopTimer(); } else startTimer(); });
  function finish() {
    tick(); stopTimer(); WB.wakeOff && WB.wakeOff();
    var secs = Math.max(1, Math.round(cur.active)), lv = cur.lv, prev = S.best[lv], nb = !prev || secs < prev;
    S.solved[lv] = (S.solved[lv] || 0) + 1; if (nb) S.best[lv] = secs; save(); WB.vibrate([40, 60, 40]);
    $('fb-done-time').textContent = t('mgTime', { t: clock(secs) });
    $('fb-done-best').textContent = nb && prev ? t('mgNewBest') : (S.best[lv] ? t('mgBest', { t: clock(S.best[lv]) }) : '');
    setTimeout(function () { if (view === 'play') show('done'); }, 700);
  }

  $('fb-a').addEventListener('pointerdown', function (e) { onTap('a', e); });
  $('fb-b').addEventListener('pointerdown', function (e) { onTap('b', e); });
  $('fb-menu').addEventListener('click', function () { show('home'); renderHome(); });
  $('fb-done-menu').addEventListener('click', function () { show('home'); renderHome(); });
  $('fb-new').addEventListener('click', function () { if (cur) start(cur.lv); });
  $('fb-done-again').addEventListener('click', function () { if (cur) start(cur.lv); });
  $('fb-hint').addEventListener('click', hint);
  window.addEventListener('pagehide', function () { save(); });
  window.addEventListener('one-lang-changed', function () { if (view === 'home') renderHome(); else if (view === 'play') { refresh(); $('fb-a').setAttribute('aria-label', t('fbPicA')); $('fb-b').setAttribute('aria-label', t('fbPicB')); } });

  window.__fark = { cur: function () { return cur; }, view: function () { return view; }, state: function () { return S; },
    tapDiff: function (n, side) { var d = cur.diffs[n], svg = svgs[side || 'a'], r = svg.getBoundingClientRect(); onTap(side || 'a', { clientX: r.left + d.x / W * r.width, clientY: r.top + d.y / H * r.height }); } };
  show('home'); renderHome();
})();
