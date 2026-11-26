/* Hemcan — günlük oyunlar için ağ yardımcısı (sudoku + genel kültür). Sunucuya yalnızca rastgele teknik kimlik + skor gider. */
(function (g) {
  'use strict';
  var SUB_ID_KEY = 'one-sub-id';
  function subId() {
    var id = null;
    try { id = localStorage.getItem(SUB_ID_KEY); } catch (e) {}
    if (!id) {
      id = (g.crypto && crypto.randomUUID ? crypto.randomUUID() : 'one-' + Date.now() + '-' + Math.random().toString(36).slice(2));
      try { localStorage.setItem(SUB_ID_KEY, id); } catch (e) {}
    }
    return id;
  }
  // { net:false } ağ yok/zaman aşımı; { net:true, status, data } sunucu yanıtı
  function post(url, body, ms) {
    return new Promise(function (resolve) {
      var done = false, ctl = g.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (!done) { done = true; try { ctl && ctl.abort(); } catch (e) {} resolve({ net: false }); } }, ms || 9000);
      try {
        fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctl ? ctl.signal : undefined })
          .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { net: true, status: r.status, data: d || {} }; }); })
          .then(function (res) { if (!done) { done = true; clearTimeout(timer); resolve(res); } })
          .catch(function () { if (!done) { done = true; clearTimeout(timer); resolve({ net: false }); } });
      } catch (e) { if (!done) { done = true; clearTimeout(timer); resolve({ net: false }); } }
    });
  }
  function register() { return post('/api/member-count', { id: subId() }, 9000).then(function (r) { return r.net && r.status === 200; }); }
  // Üye değilse (eski kurulum / kayıt sırasında internet yoktu) bir kez kaydedip yeniden dener.
  function call(action, game, day, extra) {
    var body = { action: action, id: subId(), game: game, day: day };
    if (extra) Object.keys(extra).forEach(function (k) { body[k] = extra[k]; });
    return post('/api/daily', body).then(function (r) {
      if (r.net && r.status === 403 && r.data && r.data.error === 'not_member') {
        return register().then(function (ok) { return ok ? post('/api/daily', body) : r; });
      }
      return r;
    });
  }
  g.DailyNet = { subId: subId, call: call, today: function () { return g.DailyCore.trDay(); } };
})(window);
