// Hemcan — günlük oyunlar (sudoku + genel kültür) ve gün sonu sıralaması.
//
// Tek uç nokta: POST /api/daily  { action: 'start'|'submit'|'result', id, game, day, ... }
//   game: 'sudoku-easy' | 'sudoku-medium' | 'sudoku-hard' | 'trivia'
//   day : oyun günü (YYYY-MM-DD, Türkiye saatine göre). Herkes aynı gün aynı bulmacayı/soruları görür.
//
// Gizlilik: sıralamada İSİM YOKTUR. Sunucu yalnızca rastgele teknik kimliğin özetini (sha256), oyun, gün ve skoru tutar.
// Sonuçlar gün bittikten 1 saat sonra (ertesi gün 01:00 TSİ) açıklanır; kişi "X kişiden N. sırada" bilgisini görür.
//
// Dürüstlük notu (hile koruması): kimlik doğrulaması yoktur, soru bankası herkese açıktır. Sunucu yine de
//  - yalnızca kayıtlı üyelerin (one-members) katılmasına izin verir,
//  - bir gün/oyun için tek hak verir (ilk "start" anı sunucuda kaydedilir, yeniden başlatılamaz),
//  - sudoku çözümünü kendisi üretip doğrular, süreyi sunucunun geçen süresiyle sınırlar ve "insanüstü hız" tabanı uygular,
//  - genel kültürde cevapları sunucu değerlendirir, süreyi KENDİ ölçer, 7 dakikadan uzun süren denemeyi sıralamaya almaz.
// Kararlı bir saldırgan yine de hile yapabilir; sıralama eğlence amaçlıdır ve katılımcı sayısı arttıkça anlam kazanır.

const crypto = require('crypto');
const Core = require('./_daily-core');
const BANK = require('./_trivia-bank');
const { consume, updateJSON } = require('./_rate-limit');

const ID_PATTERN = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|one-\d{10,}-[0-9a-z]{4,})$/i;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const GAMES = ['sudoku-easy', 'sudoku-medium', 'sudoku-hard', 'trivia'];
const FLOOR_SEC = { 'sudoku-easy': 45, 'sudoku-medium': 70, 'sudoku-hard': 100 }; // bundan hızlı çözüm insan için gerçekçi değil
const TRIVIA_MIN_MS = 25000;   // 10 soru için en az 25 sn
const TRIVIA_MAX_MS = 7 * 60 * 1000;
const PER_HOUR = 120;          // CGNAT ortak IP'leri için bol tutuldu

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (code, obj) => ({ statusCode: code, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) });

function getClientIp(event) {
  const h = event.headers || {};
  return h['x-nf-client-connection-ip'] || h['client-ip'] || (h['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
}
function hid(id) { return crypto.createHash('sha256').update('hemcan-daily|' + id).digest('hex').slice(0, 20); }
const pad = (n) => String(Math.max(0, Math.round(n))).padStart(10, '0');

// Hesaplanabilir sınıf: now parametresi testler için.
async function run(event, deps) {
  const now = deps.now();
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'method' });
  if ((event.body || '').length > 4000) return json(413, { error: 'too_large' });
  let p; try { p = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'bad_request' }); }
  if (!p || typeof p !== 'object') return json(400, { error: 'bad_request' });

  const action = p.action, id = p.id, game = p.game, day = p.day;
  if (!['start', 'submit', 'result'].includes(action)) return json(400, { error: 'bad_action' });
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) return json(400, { error: 'bad_id' });
  if (!GAMES.includes(game)) return json(400, { error: 'bad_game' });
  if (typeof day !== 'string' || !DAY_PATTERN.test(day) || isNaN(Date.parse(day + 'T00:00:00Z'))) return json(400, { error: 'bad_day' });

  const { members, store, rl } = deps.stores();
  try {
    const r = await consume(rl, 'ip_' + getClientIp(event), PER_HOUR, 60 * 60 * 1000, now);
    if (!r.allowed) return json(429, { error: 'rate_limited' });
  } catch (e) { return json(503, { error: 'unavailable' }); }

  try {
    const member = await members.get('m_' + id);
    if (member === null || member === undefined) return json(403, { error: 'not_member' });
  } catch (e) { return json(503, { error: 'unavailable' }); }

  const h = hid(id), userKey = 'u_' + game + '_' + day + '_' + h;
  const today = Core.trDay(now), publishAt = Core.publishAt(day);

  try {
    // ---------- start ----------
    if (action === 'start') {
      if (day !== today) return json(409, { error: 'wrong_day', today });
      const rec = await updateJSON(store, userKey, (cur) => {
        if (cur) return { skip: true, result: cur };
        const created = { startedAt: now };
        return { next: created, result: created };
      });
      if (rec.done) return json(200, { ok: false, error: 'already_done' });
      return json(200, { ok: true, startedAt: rec.startedAt, serverNow: now, resumed: rec.startedAt !== now });
    }

    // ---------- submit ----------
    if (action === 'submit') {
      if (now >= publishAt) return json(409, { error: 'closed' });
      if (day > today) return json(409, { error: 'wrong_day', today });
      let score = null, valid = true, detail = {};
      const cur0 = await store.get(userKey, { type: 'json' });
      if (!cur0 || !cur0.startedAt) return json(409, { error: 'not_started' });
      if (cur0.done) return json(200, { ok: true, already: true, status: cur0.valid === false ? 'invalid' : 'recorded' });
      const elapsedMs = now - cur0.startedAt;

      if (game === 'trivia') {
        const a = p.answers;
        if (!Array.isArray(a) || a.length !== Core.Q_PER_DAY || !a.every((x) => Number.isInteger(x) && x >= -1 && x <= 3)) return json(400, { error: 'bad_answers' });
        const idx = Core.pickQuestions(day, BANK.length);
        let correct = 0; idx.forEach((qi, i) => { if (a[i] === BANK[qi]) correct++; });
        if (elapsedMs > TRIVIA_MAX_MS) { valid = false; } else {
          const ms = Math.max(elapsedMs, TRIVIA_MIN_MS);
          score = (Core.Q_PER_DAY - correct) * 1e6 + ms;
        }
        detail = { correct };
      } else {
        const g = p.grid, secs = Number(p.secs);
        if (!Array.isArray(g) || g.length !== 81 || !g.every((x) => Number.isInteger(x) && x >= 1 && x <= 9) || !isFinite(secs) || secs < 0) return json(400, { error: 'bad_grid' });
        if (!Core.checkSudoku(day, game.slice(7), g)) return json(200, { ok: false, error: 'wrong' });
        const floor = FLOOR_SEC[game], serverSec = elapsedMs / 1000;
        if (serverSec < floor - 2) return json(200, { ok: false, error: 'too_fast' });
        score = Math.max(floor, Math.min(Math.round(secs), Math.round(serverSec) + 3));
      }

      const fin = await updateJSON(store, userKey, (cur) => {
        if (!cur || cur.done) return { skip: true, result: cur };
        const next = { startedAt: cur.startedAt, done: true, valid, score: valid ? score : null, finishedAt: now };
        return { next, result: next };
      });
      if (fin && fin.done && fin.finishedAt === now && valid) {
        // Sıralama dizini: anahtarın kendisi skoru taşır, böylece sıralama için kayıtları tek tek okumak gerekmez.
        await store.set('r_' + game + '_' + day + '_' + pad(score) + '_' + h, '1');
      }
      return json(200, { ok: true, status: valid ? 'recorded' : 'invalid', ...detail });
    }

    // ---------- result ----------
    const mine = await store.get(userKey, { type: 'json' });
    if (!mine || !mine.done) return json(200, { status: now < publishAt ? 'none_open' : 'none', publishAt });
    if (mine.valid === false) return json(200, { status: 'invalid' });
    if (now < publishAt) return json(200, { status: 'pending', publishAt });
    // Yayınlandı: gün özeti bir kez hesaplanıp saklanır (gönderimler kapandığı için değişmez).
    const sumKey = 'sum_' + game + '_' + day;
    let sum = await store.get(sumKey, { type: 'json' });
    if (!sum || !Array.isArray(sum.scores)) {
      const listed = await store.list({ prefix: 'r_' + game + '_' + day + '_' });
      const scores = (listed && listed.blobs ? listed.blobs : []).map((b) => parseInt(b.key.split('_')[3], 10)).filter((n) => isFinite(n)).sort((x, y) => x - y);
      sum = { n: scores.length, scores };
      await store.setJSON(sumKey, sum);
    }
    const better = sum.scores.filter((s) => s < mine.score).length;
    const out = { status: 'ready', rank: better + 1, total: Math.max(sum.n, better + 1), score: mine.score };
    if (game === 'trivia') { out.correct = Core.Q_PER_DAY - Math.floor(mine.score / 1e6); }
    return json(200, out);
  } catch (e) {
    return json(503, { error: 'unavailable' });
  }
}

exports.run = run;
exports.handler = async (event) => {
  const { getStore, connectLambda } = require('@netlify/blobs');
  try { connectLambda(event); } catch (e) { /* yerel/yeni ortamlarda gerekmeyebilir */ }
  return run(event, {
    now: () => Date.now(),
    stores: () => ({ members: getStore('one-members'), store: getStore('one-daily'), rl: getStore('one-daily-ratelimit') }),
  });
};
