// Hemcan — e-posta ile giriş: 6 haneli tek kullanımlık kod gönderir.
//
// POST /api/otp-request  { email, lang? }  ->  { ok: true }
//
// Ortam değişkenleri (Netlify):
//   AUTH_SECRET     -> en az 32 karakterlik rastgele gizli anahtar (oturumları ve kodları imzalar)
//   RESEND_API_KEY  -> e-posta gönderim servisi (resend.com) API anahtarı
//   AUTH_FROM_EMAIL -> gönderen adres, ör. "Hemcan <giris@alanadin.com>" (alan adı serviste doğrulanmış olmalı)
//   REVIEW_EMAIL / REVIEW_CODE (isteğe bağlı) -> mağaza incelemecisi için sabit demo hesabı
//
// Güvenlik: e-postanın kayıtlı olup olmadığını sızdırmaz (hep aynı cevap), IP ve e-posta başına hız sınırı
// vardır, kod 10 dakika geçerlidir ve yalnızca özeti (HMAC) saklanır.
const crypto = require('crypto');
const { consume } = require('./_rate-limit');
const S = require('./_session');

const CODE_TTL_MS = 10 * 60 * 1000;
const WINDOW_MS = 10 * 60 * 1000;

function mailContent(code, lang) {
  if (lang === 'tr') {
    return {
      subject: 'Hemcan giriş kodun: ' + code,
      html: '<p>Merhaba,</p><p>Hemcan giriş kodun:</p>' +
        '<p style="font-size:28px;font-weight:700;letter-spacing:6px">' + code + '</p>' +
        '<p>Kod 10 dakika geçerlidir. Bu isteği sen yapmadıysan bu e-postayı görmezden gelebilirsin.</p>',
    };
  }
  return {
    subject: 'Your Hemcan sign-in code: ' + code,
    html: '<p>Hello,</p><p>Your Hemcan sign-in code:</p>' +
      '<p style="font-size:28px;font-weight:700;letter-spacing:6px">' + code + '</p>' +
      '<p>The code is valid for 10 minutes. If you did not request it, you can ignore this email.</p>',
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: S.CORS, body: '' };
  if (event.httpMethod !== 'POST') return S.reply(405, { error: 'Sadece POST desteklenir.' });

  const sec = S.secret();
  if (!sec) return S.notConfigured('AUTH_SECRET');
  const apiKey = process.env.RESEND_API_KEY, from = process.env.AUTH_FROM_EMAIL;
  const reviewEmail = S.normalizeEmail(process.env.REVIEW_EMAIL || '');

  let body;
  try { body = JSON.parse(event.body || '{}'); if (!body || typeof body !== 'object') throw 0; }
  catch (e) { return S.reply(400, { error: 'Geçersiz istek gövdesi.' }); }
  const email = S.normalizeEmail(body.email);
  if (!S.validEmail(email)) return S.reply(400, { error: 'Geçersiz e-posta adresi.' });
  const lang = body.lang === 'tr' ? 'tr' : 'en';
  const isReview = !!reviewEmail && email === reviewEmail && !!process.env.REVIEW_CODE;
  if (!isReview && (!apiKey || !from)) return S.notConfigured('RESEND_API_KEY / AUTH_FROM_EMAIL');

  try {
    const { getStore, connectLambda } = require('@netlify/blobs');
    connectLambda(event);
    const codes = getStore('one-auth-codes');
    const rl = getStore('one-auth-ratelimit');
    const key = S.emailKey(email, sec);
    const now = Date.now();

    const ipOk = await consume(rl, 'otp_ip_' + S.getClientIp(event), 20, WINDOW_MS, now);
    const mailOk = await consume(rl, 'otp_mail_' + key, 4, WINDOW_MS, now);
    if (!ipOk.allowed || !mailOk.allowed) return S.reply(429, { error: 'Çok fazla istek — biraz sonra tekrar dene.' });

    if (isReview) return S.reply(200, { ok: true }); // demo hesabı: sabit kod, e-posta gönderilmez

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await codes.setJSON(key, { hash: S.codeHash(email, code, sec), expiresAt: now + CODE_TTL_MS, attempts: 0 });

    const mail = mailContent(code, lang);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: email, subject: mail.subject, html: mail.html }),
    });
    if (!res.ok) return S.reply(502, { error: 'E-posta gönderilemedi — az sonra tekrar dene.' });
    return S.reply(200, { ok: true });
  } catch (err) {
    return S.reply(500, { error: 'İstek işlenemedi.' });
  }
};
