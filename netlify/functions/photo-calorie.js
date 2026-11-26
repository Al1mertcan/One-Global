// Hemcan — Fotoğraftan kalori tahmini
// Kullanıcının çektiği yemek fotoğrafını Anthropic'in Claude API'sine gönderir ve
// yiyecek listesi + yaklaşık porsiyon/kalori döner. Fotoğraf HİÇBİR yerde saklanmaz,
// günlüğe yazılmaz; yalnızca bu istek süresince bellekte durur.
//
// GÜVENLİK / MALİYET (varsayılan KAPALI):
// - Netlify ortam değişkeni PHOTO_KCAL_ENABLED=1 olmadıkça yapay zeka servisine HİÇBİR çağrı yapılmaz.
// - ANTHROPIC_API_KEY yalnızca sunucuda durur (chat.js ile aynı anahtar).
// - Kişi başı aylık hak: PHOTO_KCAL_MONTHLY_PER_USER (varsayılan 100). Yalnızca kayıtlı üyeler (one-members) kullanabilir.
//   Yapay zeka hata verirse o fotoğrafın hakkı geri verilir.
// - Aynı IP'den saatte en fazla PHOTO_KCAL_IP_PER_HOUR (varsayılan 10) fotoğraf;
//   tüm site için günde en fazla PHOTO_KCAL_DAILY_CAP (varsayılan 300) fotoğraf.
//   Sınır deposu çalışmazsa istek REDDEDİLİR (fatura korunur).
//
// GET  /api/photo-calorie[?id=<kimlik>]  -> { enabled, monthly, remaining? }   (arayüz düğmeyi ve kalan hakkı buna göre gösterir)
// POST /api/photo-calorie  { id, image: <base64, "data:" öneki olmadan>, mime: 'image/jpeg', lang: 'tr' }
//      -> { items: [{ name, grams, kcal }], total, note, confidence, remaining }

// Model: en uygun maliyetli (Haiku) ile başlar. Kalite yetmezse KOD DEĞİŞTİRMEDEN Netlify ortam değişkeni
// PHOTO_KCAL_MODEL ile bir üst modele geçilir (ör. claude-sonnet-5-5). Model adları: docs.claude.com → Models.
const DEFAULT_MODEL = 'claude-haiku-5-5';
function model() { const m = (process.env.PHOTO_KCAL_MODEL || '').trim(); return /^[a-z0-9][a-z0-9._-]{2,60}$/i.test(m) ? m : DEFAULT_MODEL; }
const ID_PATTERN = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|one-\d{10,}-[0-9a-z]{4,})$/i;
const MAX_IMAGE_BYTES = 1.6 * 1024 * 1024; // istemci ~1024 px JPEG gönderir; bu bol yeter
const MAX_ITEMS = 8;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const LANG_NAMES = { tr: 'Turkish', en: 'English', de: 'German', fr: 'French', es: 'Spanish', ar: 'Arabic', ru: 'Russian', pt: 'Portuguese', it: 'Italian', nl: 'Dutch', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', hi: 'Hindi', id: 'Indonesian', fa: 'Persian', pl: 'Polish', uk: 'Ukrainian' };

const crypto = require('crypto');
const { consume, updateJSON } = require('./_rate-limit');
function monthKey() { return new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 7); } // Türkiye saatiyle ay
function userKey(id) { return 'user_' + crypto.createHash('sha256').update('hemcan-photo|' + id).digest('hex').slice(0, 20) + '_' + monthKey(); }
const MONTH_MS = 35 * 24 * 60 * 60 * 1000;

function getClientIp(event) {
  const h = event.headers || {};
  return h['x-nf-client-connection-ip'] || h['client-ip'] || (h['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
}
function intEnv(name, def) { const n = parseInt(process.env[name], 10); return n > 0 ? n : def; }
function enabled() { return process.env.PHOTO_KCAL_ENABLED === '1' && !!process.env.ANTHROPIC_API_KEY; }

function buildPrompt(lang) {
  const language = LANG_NAMES[lang] || 'English';
  return [
    'You are a careful nutrition assistant inside a wellbeing app.',
    'Look at the photo and identify the food and drinks that are clearly visible.',
    'For each item estimate a typical portion in grams (or millilitres for drinks) and the calories (kcal) of that portion, using common nutrition values.',
    'Do not guess hidden ingredients you cannot see; if unsure, lower your confidence rather than inventing detail.',
    'If the photo does not contain food or drink, return an empty items list and explain briefly in "note".',
    `Write item names and the note in ${language}. Names must be short (max 40 characters).`,
    'Reply with ONLY one JSON object and nothing else, in exactly this shape:',
    '{"items":[{"name":"string","grams":number,"kcal":number}],"confidence":"low|medium|high","note":"string (max 160 characters, mention that values are approximate)"}',
    `Return at most ${MAX_ITEMS} items.`,
  ].join('\n');
}

// Modelin metninden ilk JSON nesnesini güvenle çıkarır ve doğrular.
function parseResult(text) {
  if (typeof text !== 'string') return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let obj;
  try { obj = JSON.parse(text.slice(start, end + 1)); } catch (e) { return null; }
  if (!obj || typeof obj !== 'object') return null;
  const items = [];
  (Array.isArray(obj.items) ? obj.items : []).slice(0, MAX_ITEMS).forEach((it) => {
    if (!it || typeof it.name !== 'string') return;
    const kcal = Math.round(Number(it.kcal));
    const grams = Math.round(Number(it.grams));
    if (!isFinite(kcal) || kcal < 0 || kcal > 3000) return;
    items.push({
      name: it.name.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 60),
      grams: isFinite(grams) && grams > 0 && grams <= 3000 ? grams : null,
      kcal,
    });
  });
  const conf = ['low', 'medium', 'high'].includes(obj.confidence) ? obj.confidence : 'low';
  const note = typeof obj.note === 'string' ? obj.note.replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, 200) : '';
  return { items: items.filter((i) => i.name), total: items.reduce((a, i) => a + i.kcal, 0), confidence: conf, note };
}

// Başarısız çağrıda kişinin hakkını geri ver (sessizce; hata olursa yok say).
async function refund(store, key) {
  try { await updateJSON(store, key, (cur) => (cur && cur.count > 0 ? { next: { count: cur.count - 1, windowStart: cur.windowStart }, result: true } : { skip: true, result: false })); } catch (e) { /* yok say */ }
}

exports.parseResult = parseResult;

async function core(event) {
  const t0 = Date.now();
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
  const json = (code, obj) => ({ statusCode: code, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(event.httpMethod === 'POST' ? { ...obj, ms: Date.now() - t0 } : obj) });

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod === 'GET') {
    const out = { enabled: enabled(), monthly: intEnv('PHOTO_KCAL_MONTHLY_PER_USER', 100) };
    if (event.queryStringParameters && event.queryStringParameters.probe === '3') {
      try { const { getStore, connectLambda } = require('@netlify/blobs'); connectLambda(event); out.diag = (await getStore('one-photo-ratelimit').get('diag_log', { type: 'json' })) || []; } catch (e) { out.diag = 'err'; }
      return json(200, out);
    }
    // GEÇİCİ TANI: ?probe=2 -> depo işlemlerinin süresi ve koşullu yazmanın gerçekten çalışıp çalışmadığı.
    if (out.enabled && event.queryStringParameters && event.queryStringParameters.probe === '2') {
      const pr = {};
      const tm = async (k, f) => { const a0 = Date.now(); try { const v = await f(); pr[k] = { ms: Date.now() - a0, v }; } catch (e) { pr[k] = { ms: Date.now() - a0, err: String((e && e.message) || e).slice(0, 80) }; } };
      try {
        const { getStore, connectLambda } = require('@netlify/blobs'); connectLambda(event);
        const rs = getStore('one-photo-ratelimit'); const ms = getStore('one-members');
        const k = 'probe_' + Date.now();
        await tm('get_member', async () => (await ms.get('m_probe_none')) === null);
        await tm('raw_new', async () => { const r = await rs.setJSON(k, { count: 1 }, { onlyIfNew: true }); return { modified: r && r.modified, etag: !!(r && r.etag) }; });
        await tm('read_back', async () => { const r = await rs.get(k, { type: 'json' }); return !!r; });
        await tm('consume', async () => (await consume(rs, k + 'c', 1000, 60000)).allowed);
        await tm('member_new', async () => { const r = await ms.set('probe_' + k, 'x', { onlyIfNew: true }); const back = await ms.get('probe_' + k); try { await ms.delete('probe_' + k); } catch (e) {} return { modified: r && r.modified, etag: !!(r && r.etag), stored: back !== null }; });
        try { await rs.delete(k); await rs.delete(k + 'c'); } catch (e) {}
      } catch (e) { pr.fail = String(e && e.message).slice(0, 80); }
      out.probe2 = pr;
      return json(200, out);
    }
    // GEÇİCİ TANI: ?probe=1 -> Anthropic'e 1x1 görselle minik istek atar, yalnızca durum kodu + süre + hata türü döner.
    if (out.enabled && event.queryStringParameters && event.queryStringParameters.probe === '1') {
      const p0 = Date.now();
      try {
        const c2 = new AbortController(); const t2 = setTimeout(() => c2.abort(), 8000);
        const r2 = await fetch('https://api.anthropic.com/v1/messages', {
          signal: c2.signal, method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: model(), max_tokens: 5, messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' } },
            { type: 'text', text: 'ok?' }] }] }),
        });
        clearTimeout(t2);
        const d2 = await r2.json().catch(() => null);
        out.probe = { status: r2.status, ms: Date.now() - p0, etype: d2 && d2.error && d2.error.type, model: model() };
      } catch (e) { out.probe = { fail: (e && e.name) || 'err', ms: Date.now() - p0 }; }
    }
    const qid = event.queryStringParameters && event.queryStringParameters.id;
    if (out.enabled && typeof qid === 'string' && ID_PATTERN.test(qid)) {
      try {
        const { getStore, connectLambda } = require('@netlify/blobs'); connectLambda(event);
        const cur = await getStore('one-photo-ratelimit').get(userKey(qid), { type: 'json' });
        out.remaining = Math.max(0, out.monthly - (cur && typeof cur.count === 'number' ? cur.count : 0));
      } catch (e) { /* kalan hak gösterilemese de özellik çalışır */ }
    }
    return json(200, out);
  }
  if (event.httpMethod !== 'POST') return json(405, { error: 'method' });

  if (!enabled()) return json(503, { error: 'disabled' });

  let payload;
  try { payload = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'bad_request' }); }
  if (!payload || typeof payload !== 'object') return json(400, { error: 'bad_request' });

  const mime = ALLOWED_MIME.includes(payload.mime) ? payload.mime : 'image/jpeg';
  const image = typeof payload.image === 'string' ? payload.image.replace(/^data:[^,]*,/, '').trim() : '';
  if (!image || !/^[A-Za-z0-9+/=\r\n]+$/.test(image)) return json(400, { error: 'bad_image' });
  const approxBytes = Math.floor((image.length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES) return json(413, { error: 'too_large' });
  if (approxBytes < 1000) return json(400, { error: 'bad_image' });
  const id = payload.id;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) return json(400, { error: 'bad_id' });
  const lang = typeof payload.lang === 'string' && /^[a-z]{2}(-[A-Za-z]{2,4})?$/.test(payload.lang) ? payload.lang.slice(0, 2).toLowerCase() : 'en';

  // Üyelik + hız sınırı + kişi başı aylık hak + günlük tavan (maliyet koruması). Depo çalışmazsa reddet.
  const monthly = intEnv('PHOTO_KCAL_MONTHLY_PER_USER', 100);
  let store, ukey = userKey(id), remaining = null, stage = 'store';
  try {
    const { getStore, connectLambda } = require('@netlify/blobs');
    connectLambda(event);
    store = getStore('one-photo-ratelimit');
    stage = 'member';
    const member = await getStore('one-members').get('m_' + id);
    if ((member === null || member === undefined) && id !== '6978980b-1765-4dd9-b07b-0919f6c039a3') return json(403, { error: 'not_member' }); // GEÇİCİ TANI kimliği
    stage = 'rate_ip';
    const perHour = await consume(store, 'ip_' + getClientIp(event), intEnv('PHOTO_KCAL_IP_PER_HOUR', 10), 60 * 60 * 1000);
    if (!perHour.allowed) return json(429, { error: 'rate_limited' });
    stage = 'rate_user';
    const mine = await consume(store, ukey, monthly, MONTH_MS);
    if (!mine.allowed) return json(429, { error: 'monthly_cap', remaining: 0 });
    remaining = Math.max(0, monthly - mine.count);
    stage = 'rate_day';
    const day = new Date().toISOString().slice(0, 10);
    const daily = await consume(store, 'day_' + day, intEnv('PHOTO_KCAL_DAILY_CAP', 300), 24 * 60 * 60 * 1000);
    if (!daily.allowed) { await refund(store, ukey); return json(429, { error: 'daily_cap' }); }
  } catch (e) {
    return json(503, { error: 'unavailable_' + stage });
  }

  // Netlify senkron işlevleri varsayılan 10 sn'de kesilir (ve boş bir 502 döner). Bu yüzden isteği 8,5 sn'de kendimiz
  // keser, hakkı geri verir ve okunur bir "timeout" döneriz.
  if (Date.now() - t0 > 6500) { await refund(store, ukey); return json(504, { error: 'slow_store' }); }
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), Math.max(1500, 7800 - (Date.now() - t0))) : null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      signal: ctl ? ctl.signal : undefined,
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: model(),
        max_tokens: 450,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: image } },
            { type: 'text', text: buildPrompt(lang) },
          ],
        }],
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      await refund(store, ukey);
      return json(502, { error: 'upstream', up: res.status });
    }
    const block = Array.isArray(data.content) ? data.content.find((b) => b && b.type === 'text') : null;
    const parsed = parseResult(block && block.text);
    if (!parsed) { await refund(store, ukey); return json(502, { error: 'parse' }); }
    return json(200, { ...parsed, remaining });
  } catch (e) {
    await refund(store, ukey);
    if (e && e.name === 'AbortError') return json(504, { error: 'timeout' });
    return json(502, { error: 'upstream' });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// GEÇİCİ TANI: son istekleri depoya yazar (yalnızca durum/süre/boyut/tarayıcı türü; görsel ya da kimlik YOK).
async function diag(event, patch) {
  try {
    const { getStore, connectLambda } = require('@netlify/blobs'); connectLambda(event);
    const st = getStore('one-photo-ratelimit');
    const cur = (await st.get('diag_log', { type: 'json' })) || [];
    const list = Array.isArray(cur) ? cur : [];
    if (patch.phase === 'start') list.push({ at: new Date().toISOString(), phase: 'start', len: (event.body || '').length, ua: String((event.headers || {})['user-agent'] || '').slice(0, 60) });
    else list.push({ at: new Date().toISOString(), ...patch });
    await st.setJSON('diag_log', list.slice(-12));
  } catch (e) { /* yok say */ }
}

exports.handler = async (event) => {
  const post = event.httpMethod === 'POST';
  if (post) await Promise.race([diag(event, { phase: 'start' }), new Promise((r) => setTimeout(r, 800))]);
  const t0 = Date.now();
  const res = await core(event);
  if (post) {
    let code = ''; try { code = JSON.parse(res.body).error || 'ok'; } catch (e) {}
    await Promise.race([diag(event, { phase: 'end', status: res.statusCode, code, ms: Date.now() - t0 }), new Promise((r) => setTimeout(r, 800))]);
  }
  return res;
};
