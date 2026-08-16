// ONE Global — e-posta ile giriş (magic link) isteği.
//
// DÜRÜSTLÜK NOTU: create-checkout-session.js ile aynı iskelet mantığı.
// Kod gerçek ve çalışır durumdadır, ama devreye girmesi için Netlify'da
// bir e-posta gönderim servisinin (Resend — resend.com, ücretsiz planı
// var) hesabının açılıp şu ortam değişkenlerinin tanımlanması gerekir:
//   RESEND_API_KEY  -> Resend panelinden alınan API anahtarı
//   AUTH_FROM_EMAIL -> gönderen adres (Resend'de doğrulanmış bir alan adı gerekir,
//                       örn. "ONE Global <giris@onlarınalanadın.com>")
// Bu değişkenler tanımlı değilse fonksiyon 501 döner; ayarlar.html bunu
// yakalayıp "e-posta ile giriş henüz aktif değil" notunu gösterir —
// hiçbir zaman "bağlantı gönderildi" gibi sahte bir onay verilmez.
//
// Nasıl çalışır (kurulduğunda):
//  1) Kullanıcı ayarlar.html'de e-postasını yazar, bu uç nokta çağrılır.
//  2) Rastgele, tek kullanımlık, 15 dakika geçerli bir token üretilir ve
//     `one-auth-tokens` Blobs deposuna { email, deviceId, expiresAt }
//     olarak yazılır (deviceId = isteği yapan cihazın MEVCUT yerel
//     localStorage kimliği — hesap ilk kez oluşturulduğunda bu cihazın
//     geçmiş verileri "hesabın" verisi haline gelir).
//  3) Kullanıcıya bağlantıyı içeren bir e-posta gönderilir:
//     https://<site>/ayarlar.html?authToken=<token>
//  4) Kullanıcı (aynı ya da başka bir cihazda) bu bağlantıya tıklayınca
//     auth-verify.js tokeni doğrular ve o cihazın localStorage kimliğini
//     hesabın kalıcı kimliğiyle değiştirir — bu şekilde cihazlar arası
//     senkron sağlanır (bkz. auth-verify.js).
//
// Güvenlik notu: Bir e-postanın gerçekten var olup olmadığını
// (enumeration) sızdırmamak için bu uç nokta her zaman aynı genel "ok"
// cevabını döner; e-posta hiç kayıtlı değilse ilk giriş anında hesap
// oluşturulur (bkz. auth-verify.js).

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 dakika
const RATE_LIMIT_MAX = 5;
const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 dakika

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_PATTERN = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|one-\d{10,}-[0-9a-z]{4,})$/i;

function getClientIp(event) {
  const headers = event.headers || {};
  return (
    headers['x-nf-client-connection-ip'] ||
    headers['client-ip'] ||
    (headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    'unknown'
  );
}

function randomToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(24).toString('hex');
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Sadece POST desteklenir.' }) };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.AUTH_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    return {
      statusCode: 501,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'not_configured',
        message: 'E-posta ile giriş henüz kurulmadı: RESEND_API_KEY ve/veya AUTH_FROM_EMAIL tanımlı değil.',
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Geçersiz istek gövdesi.' }) };
  }

  const email = (payload.email || '').trim().toLowerCase();
  const deviceId = payload.deviceId;
  if (!email || !EMAIL_PATTERN.test(email)) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Geçersiz e-posta adresi.' }) };
  }
  if (!deviceId || typeof deviceId !== 'string' || !ID_PATTERN.test(deviceId)) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Geçersiz cihaz kimliği.' }) };
  }

  try {
    const { getStore } = require('@netlify/blobs');
    const tokenStore = getStore('one-auth-tokens');
    const rateLimitStore = getStore('one-auth-ratelimit');

    // IP bazlı hız sınırı (bir kişinin çok sayıda e-postaya spam bağlantı
    // göndermesini engellemek için).
    const ip = getClientIp(event);
    const rlKey = 'ip_' + ip;
    const rl = (await rateLimitStore.get(rlKey, { type: 'json' })) || { count: 0, windowStart: Date.now() };
    const now = Date.now();
    if (now - rl.windowStart > RATE_LIMIT_WINDOW_MS) {
      rl.count = 0;
      rl.windowStart = now;
    }
    if (rl.count >= RATE_LIMIT_MAX) {
      return { statusCode: 429, headers: corsHeaders, body: JSON.stringify({ error: 'Çok fazla istek — biraz sonra tekrar dene.' }) };
    }
    rl.count += 1;
    await rateLimitStore.setJSON(rlKey, rl);

    const token = randomToken();
    await tokenStore.setJSON(token, { email, deviceId, expiresAt: now + TOKEN_TTL_MS });

    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://example.com';
    const magicLink = siteUrl + '/ayarlar.html?authToken=' + encodeURIComponent(token);

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: 'ONE Global — Giriş bağlantın',
        html:
          '<p>Merhaba,</p>' +
          '<p>ONE Global\'a giriş yapmak ve verilerini bu cihaza bağlamak için aşağıdaki bağlantıya tıkla (15 dakika geçerlidir):</p>' +
          '<p><a href="' + magicLink + '">' + magicLink + '</a></p>' +
          '<p>Bu isteği sen yapmadıysan, bu e-postayı görmezden gelebilirsin.</p>',
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text().catch(() => '');
      return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: 'E-posta gönderilemedi: ' + errText }) };
    }

    return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'İstek işlenemedi: ' + err.message }) };
  }
};
