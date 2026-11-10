// Hemcan — hesabı ve sunucudaki tüm verisini kalıcı siler (Apple ve Google bunu zorunlu kılar).
//
// POST /api/account-delete   Authorization: Bearer <token>   -> { ok: true }
// Silinenler: kullanıcı kaydı, e-posta eşlemesi, abonelik durumu kaydı, hesaba bağlı sohbet geçmişi.
// Not: Mağazadaki (Google Play / App Store) abonelik bundan bağımsızdır; kullanıcı onu mağazadan iptal eder.
const S = require('./_session');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: S.CORS, body: '' };
  if (event.httpMethod !== 'POST') return S.reply(405, { error: 'Sadece POST desteklenir.' });
  const sec = S.secret();
  if (!sec) return S.notConfigured('AUTH_SECRET');
  const p = S.verifySession(S.bearer(event), sec);
  if (!p) return S.reply(401, { error: 'Oturum geçersiz.' });
  try {
    const { getStore, connectLambda } = require('@netlify/blobs');
    connectLambda(event);
    const users = getStore('one-users');
    const user = await users.get('id_' + p.sub, { type: 'json' });
    if (user) {
      await users.delete('email_' + S.emailKey(user.email, sec));
      await users.delete('id_' + user.id);
    }
    await getStore('one-subscriptions').delete(p.sub);
    await getStore('one-chat-history').delete(p.sub);
    return S.reply(200, { ok: true });
  } catch (err) {
    return S.reply(500, { error: 'Hesap silinemedi.' });
  }
};
