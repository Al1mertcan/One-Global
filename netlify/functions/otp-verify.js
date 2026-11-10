// Hemcan — giriş kodunu doğrular, hesabı açar/bulur ve oturum belirteci verir.
//
// POST /api/otp-verify  { email, code }  ->  { token, user: { id, email, trialEndsAt, entitlement } }
//
// İlk girişte hesap oluşur ve 1 haftalık ücretsiz deneme o an başlar (sunucuda tutulur,
// uygulamayı silip yüklemek denemeyi sıfırlamaz). Yanlış kodda 5 denemeden sonra kod geçersiz olur.
const { consume } = require('./_rate-limit');
const S = require('./_session');

const MAX_ATTEMPTS = 5;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: S.CORS, body: '' };
  if (event.httpMethod !== 'POST') return S.reply(405, { error: 'Sadece POST desteklenir.' });
  const sec = S.secret();
  if (!sec) return S.notConfigured('AUTH_SECRET');

  let body;
  try { body = JSON.parse(event.body || '{}'); if (!body || typeof body !== 'object') throw 0; }
  catch (e) { return S.reply(400, { error: 'Geçersiz istek gövdesi.' }); }
  const email = S.normalizeEmail(body.email);
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!S.validEmail(email) || !/^\d{6}$/.test(code)) return S.reply(400, { error: 'E-posta ya da kod geçersiz.' });
  const bad = () => S.reply(400, { error: 'Kod geçersiz veya süresi dolmuş.' });

  try {
    const { getStore, connectLambda } = require('@netlify/blobs');
    connectLambda(event);
    const codes = getStore('one-auth-codes'), users = getStore('one-users'), subs = getStore('one-subscriptions');
    const rl = getStore('one-auth-ratelimit');
    const key = S.emailKey(email, sec);
    const now = Date.now();

    const ipOk = await consume(rl, 'verify_ip_' + S.getClientIp(event), 60, 10 * 60 * 1000, now);
    if (!ipOk.allowed) return S.reply(429, { error: 'Çok fazla istek — biraz sonra tekrar dene.' });

    const reviewEmail = S.normalizeEmail(process.env.REVIEW_EMAIL || '');
    const reviewCode = process.env.REVIEW_CODE || '';
    let ok = false;
    if (reviewEmail && reviewCode && email === reviewEmail) {
      ok = S.safeEqual(code, reviewCode);
    } else {
      const rec = await codes.get(key, { type: 'json' });
      if (!rec || now > rec.expiresAt) return bad();
      if (rec.attempts >= MAX_ATTEMPTS) { await codes.delete(key); return bad(); }
      ok = S.safeEqual(S.codeHash(email, code, sec), rec.hash);
      if (!ok) { await codes.setJSON(key, { ...rec, attempts: rec.attempts + 1 }); return bad(); }
      await codes.delete(key); // tek kullanımlık
    }
    if (!ok) return bad();

    let user = await S.findUserByEmail(users, key);
    if (!user) user = await S.createUser(users, key, email, now);
    const sub = await subs.get(user.id, { type: 'json' });
    return S.reply(200, {
      token: S.signSession(user.id, sec, now),
      user: { id: user.id, email: user.email, trialEndsAt: user.trialStartedAt + S.TRIAL_MS, entitlement: S.entitlement(user, sub, now) },
    });
  } catch (err) {
    return S.reply(500, { error: 'Doğrulanamadı.' });
  }
};
