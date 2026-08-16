// ONE Global — e-posta ile giriş bağlantısını doğrular ve cihazlar arası senkronu
// sağlar.
//
// GET /api/auth-verify?token=xxx -> { id, email }
//
// Çalışma mantığı:
//  - token, auth-request.js tarafından üretilmiş ve `one-auth-tokens`
//    deposunda bekliyor olmalı; süresi geçmişse ya da zaten kullanıldıysa
//    400 döner.
//  - `one-accounts` deposunda bu e-postaya ait bir kayıt varsa (kullanıcı
//    daha önce başka bir cihazda hesap oluşturmuş), o kaydın kalıcı
//    kimliği (id) döndürülür.
//  - Kayıt yoksa (bu, e-postanın ONE Global'da ilk kullanımı demektir), tokeni
//    isteyen cihazın O ANKİ yerel kimliği (deviceId) kalıcı hesap kimliği
//    olarak kaydedilir — yani o cihazdaki mevcut sohbet geçmişi ve
//    ayarlar "hesabın" verisi haline gelir, kaybolmaz.
//  - İstemci (ayarlar.html), dönen id kendi localStorage'daki
//    'one-sub-id' değerinden farklıysa, kendi değerini bu id ile
//    değiştirir — böylece o cihaz artık aynı hesabın (ve sohbet
//    geçmişinin) verilerini görür.
//
// Bu, tam bir "şifreyle giriş" sistemi değildir — parola yoktur, sadece
// e-postana gelen tek kullanımlık bağlantı kimliğini doğrular
// (yaygın ve güvenli bir yöntem olan "magic link" / passwordless girişi).

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Sadece GET desteklenir.' }) };
  }

  const token = (event.queryStringParameters || {}).token;
  if (!token) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'token zorunludur.' }) };
  }

  try {
    const { getStore, connectLambda } = require('@netlify/blobs');
    connectLambda(event);
    const tokenStore = getStore('one-auth-tokens');
    const accountsStore = getStore('one-accounts');

    const rec = await tokenStore.get(token, { type: 'json' });
    if (!rec) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Bağlantı geçersiz veya süresi dolmuş.' }) };
    }
    // Tek kullanımlık: hemen sil, tekrar kullanılamasın.
    await tokenStore.delete(token);

    if (Date.now() > rec.expiresAt) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Bağlantının süresi dolmuş, yeniden iste.' }) };
    }

    const accountKey = 'acct_' + rec.email;
    let account = await accountsStore.get(accountKey, { type: 'json' });
    if (!account) {
      account = { email: rec.email, id: rec.deviceId, createdAt: new Date().toISOString() };
      await accountsStore.setJSON(accountKey, account);
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: account.id, email: account.email }),
    };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Doğrulanamadı: ' + err.message }) };
  }
};
