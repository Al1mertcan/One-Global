// Hemcan — Firebase Cloud Messaging (FCM) HTTP v1 göndericisi. Ek paket gerektirmez.
//
// Android uygulaması, telefonun kapalı/arka planda olduğu durumlarda da bildirim alabilsin diye
// bildirimleri sunucudan (Google'ın bildirim servisi üzerinden) gönderiyoruz; bazı telefon
// markaları telefonda planlanmış bildirimleri pil tasarrufu için siliyor.
//
// Gerekli tek ayar: Netlify → Site configuration → Environment variables →
//   FIREBASE_SERVICE_ACCOUNT = Firebase "hizmet hesabı" (service account) JSON dosyasının TÜM içeriği
//   (ham JSON ya da base64 olarak). Ayar yoksa bu dosya "kapalı" davranır ve hiçbir şey göndermez.
//
// sendFcm(token, { title, body, url }) -> true | 'expired' | false
//   true      gönderildi
//   'expired' token artık geçersiz (uygulama silinmiş vb.) — kayıt silinmeli
//   false     geçici hata — sonraki çalıştırmada yeniden denenir

const crypto = require('crypto');

function loadAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    let text = String(raw).trim();
    if (text[0] !== '{') text = Buffer.from(text, 'base64').toString('utf8');
    const acc = JSON.parse(text);
    if (!acc || !acc.client_email || !acc.private_key || !acc.project_id) return null;
    acc.private_key = String(acc.private_key).replace(/\\n/g, '\n');
    return acc;
  } catch (e) {
    return null;
  }
}

function enabled() {
  return !!loadAccount();
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

let tokenCache = { value: null, exp: 0 };

async function accessToken(acc, fetchImpl) {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.value && tokenCache.exp - 60 > now) return tokenCache.value;
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: acc.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(header + '.' + claims);
  const sig = b64url(signer.sign(acc.private_key));
  const res = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + header + '.' + claims + '.' + sig,
  });
  if (!res.ok) throw new Error('token http ' + res.status);
  const data = await res.json();
  if (!data || !data.access_token) throw new Error('no access_token');
  tokenCache = { value: data.access_token, exp: now + (data.expires_in || 3600) };
  return tokenCache.value;
}

async function sendFcm(token, payload, fetchImpl) {
  const f = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  const acc = loadAccount();
  if (!acc || !f || !token) return false;
  try {
    const at = await accessToken(acc, f);
    const message = {
      token: String(token),
      notification: { title: String((payload && payload.title) || ''), body: String((payload && payload.body) || '') },
      data: { url: String((payload && payload.url) || 'asistan.html') },
      android: {
        priority: 'HIGH',
        ttl: '3600s',
        notification: { channel_id: 'hemcan-reminders', icon: 'ic_stat_hemcan', default_sound: true },
      },
    };
    const res = await f('https://fcm.googleapis.com/v1/projects/' + encodeURIComponent(acc.project_id) + '/messages:send', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + at },
      body: JSON.stringify({ message }),
    });
    if (res.ok) return true;
    let text = '';
    try { text = await res.text(); } catch (e) {}
    if (res.status === 401) tokenCache = { value: null, exp: 0 };
    if (res.status === 404 || /UNREGISTERED|NOT_FOUND/.test(text)) return 'expired';
    if (res.status === 400 && /registration token|not a valid FCM/i.test(text)) return 'expired';
    return false;
  } catch (e) {
    return false;
  }
}

module.exports = { enabled, sendFcm };
