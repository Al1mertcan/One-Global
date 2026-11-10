// Hemcan — oturumu doğrular ve erişim durumunu (deneme / abonelik / süresi bitti) döner.
//
// GET /api/session-me   Authorization: Bearer <token>
//   -> { user: { id, email, trialEndsAt, entitlement: { active, reason, trialEndsAt } } }
// Oturum geçersizse 401 döner (istemci giriş ekranına yönlendirir).
const S = require('./_session');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: S.CORS, body: '' };
  if (event.httpMethod !== 'GET') return S.reply(405, { error: 'Sadece GET desteklenir.' });
  const sec = S.secret();
  if (!sec) return S.notConfigured('AUTH_SECRET');

  const p = S.verifySession(S.bearer(event), sec);
  if (!p) return S.reply(401, { error: 'Oturum geçersiz.' });
  try {
    const { getStore, connectLambda } = require('@netlify/blobs');
    connectLambda(event);
    const user = await getStore('one-users').get('id_' + p.sub, { type: 'json' });
    if (!user) return S.reply(401, { error: 'Hesap bulunamadı.' });
    const sub = await getStore('one-subscriptions').get(user.id, { type: 'json' });
    return S.reply(200, { user: { id: user.id, email: user.email, trialEndsAt: user.trialStartedAt + S.TRIAL_MS, entitlement: S.entitlement(user, sub) } });
  } catch (err) {
    return S.reply(500, { error: 'Oturum doğrulanamadı.' });
  }
};
