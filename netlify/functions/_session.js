// Hemcan — oturum ve hesap yardımcıları (otp-request / otp-verify / session-me / account-delete ortak kullanır).
//
// Oturum bir "imzalı belirteç"tir (JWT benzeri): base64url(yük).base64url(HMAC-SHA256).
// İmza AUTH_SECRET ortam değişkeniyle atılır; belirteci sunucu dışında kimse üretemez.
// Parola yoktur: kimlik, e-postaya gelen tek kullanımlık kodla kanıtlanır.
const crypto = require('crypto');

const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 gün
const TRIAL_MS = 7 * 24 * 60 * 60 * 1000;        // 1 hafta ücretsiz deneme
const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

function b64u(buf) { return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_'); }
function fromB64u(s) { return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64'); }

function secret() {
  const s = process.env.AUTH_SECRET;
  return typeof s === 'string' && s.length >= 32 ? s : null;
}
function hmac(key, data) { return crypto.createHmac('sha256', key).update(data).digest(); }
function safeEqual(a, b) {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function normalizeEmail(e) { return typeof e === 'string' ? e.trim().toLowerCase() : ''; }
function validEmail(e) { return !!e && e.length <= 254 && EMAIL_PATTERN.test(e); }
// E-postayı depoda düz yazı olarak anahtar yapmamak için HMAC'lenmiş özet.
function emailKey(email, sec) { return b64u(hmac(sec, 'email:' + email)); }
function codeHash(email, code, sec) { return b64u(hmac(sec, 'code:' + email + ':' + code)); }

function signSession(userId, sec, now = Date.now()) {
  const payload = b64u(JSON.stringify({ sub: userId, iat: now, exp: now + SESSION_TTL_MS }));
  return payload + '.' + b64u(hmac(sec, 'session:' + payload));
}
function verifySession(token, sec, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 600) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const expect = b64u(hmac(sec, 'session:' + parts[0]));
  if (!safeEqual(expect, parts[1])) return null;
  let p;
  try { p = JSON.parse(fromB64u(parts[0]).toString('utf8')); } catch (e) { return null; }
  if (!p || typeof p.sub !== 'string' || typeof p.exp !== 'number' || now > p.exp) return null;
  return p;
}
function bearer(event) {
  const h = (event.headers || {});
  const v = h.authorization || h.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(v);
  return m ? m[1].trim() : null;
}

function getClientIp(event) {
  const h = event.headers || {};
  return h['x-nf-client-connection-ip'] || h['client-ip'] || (h['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
function reply(statusCode, obj) {
  return { statusCode, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) };
}
function notConfigured(what) {
  return reply(501, { error: 'not_configured', message: 'Hesap sistemi henüz kurulmadı: ' + what + ' tanımlı değil.' });
}

// Kullanıcı kaydı iki anahtarla tutulur: e-posta özetinden kimliğe ve kimlikten kayda.
async function findUserByEmail(store, key) {
  const idRec = await store.get('email_' + key, { type: 'json' });
  if (!idRec || !idRec.id) return null;
  return store.get('id_' + idRec.id, { type: 'json' });
}
async function createUser(store, key, email, now = Date.now()) {
  const user = { id: crypto.randomUUID(), email, createdAt: new Date(now).toISOString(), trialStartedAt: now };
  await store.setJSON('id_' + user.id, user);
  await store.setJSON('email_' + key, { id: user.id });
  return user;
}

// Erişim durumu: deneme süresi içinde ya da mağaza aboneliği etkinse açık.
// (`one-subscriptions` kaydını ileride mağaza bildirimleri — RevenueCat web kancası — yazacak.)
function entitlement(user, sub, now = Date.now()) {
  const trialEndsAt = user.trialStartedAt + TRIAL_MS;
  if (sub && sub.status === 'active' && (!sub.expiresAt || now < sub.expiresAt)) {
    return { active: true, reason: 'subscription', trialEndsAt };
  }
  if (now < trialEndsAt) return { active: true, reason: 'trial', trialEndsAt };
  return { active: false, reason: 'expired', trialEndsAt };
}

module.exports = {
  SESSION_TTL_MS, TRIAL_MS, CORS, reply, notConfigured, secret, normalizeEmail, validEmail, emailKey, codeHash,
  signSession, verifySession, bearer, getClientIp, findUserByEmail, createUser, entitlement, safeEqual,
};
