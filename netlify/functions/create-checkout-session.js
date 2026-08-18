// ONE Global — gerçek ödeme altyapısı: Stripe Checkout oturumu oluşturur.
//
// DÜRÜSTLÜK NOTU: Bu fonksiyon bir "iskelet"tir — kodun kendisi gerçek ve
// çalışır durumdadır, ama devreye girmesi için Netlify'da şu ortam
// değişkenlerinin senin GERÇEK Stripe hesabınla tanımlanması gerekir:
//   STRIPE_SECRET_KEY   -> Stripe panelinden alınan gizli anahtar (sk_live_... / sk_test_...)
// Bu değişken tanımlı değilse fonksiyon 501 döner ve abonelik.html bunu
// yakalayıp mevcut dürüst "tasarım önizlemesi, henüz ödeme alınmıyor"
// notunu göstermeye devam eder — yani anahtar eklenene kadar hiçbir şey
// bozulmaz, kullanıcı yanıltılmaz.
//
// POST /api/create-checkout-session { id, currency }
//   -> { url }               (Stripe Checkout sayfasına yönlendirme adresi)
//
// "Ayda sadece 1 birim" fiyatlandırma modeli, Stripe'ın `price_data` ile
// dinamik olarak her para biriminde "1 birim/ay" fiyatı kurulmasıyla
// uygulanır (önceden sabit bir Price ID oluşturmaya gerek kalmadan). İlk
// hafta ücretsiz deneme, Stripe'ın `trial_period_days: 7` alanıyla
// sağlanır — yani deneme süresi sonunda GERÇEKTEN otomatik tahsilat
// başlar (Kullanım Şartları'nda bu netleştirilmelidir, bkz. sartlar.html —
// bu fonksiyon aktive edildiğinde o metnin de güncellenmesi gerekir).
//
// Kurulum gerektiği için henüz açık uçlar:
//  - Webhook (stripe-webhook.js) apaydan gelen abonelik durumunu
//    (aktif/iptal/ödeme başarısız) `one-subscriptions` Blobs deposuna
//    yazıyor ama uygulamanın geri kalanı (asistan.html, ayarlar.html)
//    henüz bu durumu okuyup özellik kilitleme/açma yapmıyor — bu ayrı
//    bir "gerçek paywall" işi, birlikte konuşup karar vermemiz gerekir.
//  - success_url / cancel_url basitçe ayarlar.html'e dönüyor; istersen
//    özel bir "teşekkürler" ekranı ekleyebiliriz.

// Stripe'ın "sıfır ondalıklı" para birimleri: bu para birimlerinde en
// küçük birim zaten "1"dir (kuruş/cent kavramı yok), bu yüzden Stripe'a
// unit_amount olarak 1 gönderilir. Diğer (iki ondalıklı) para
// birimlerinde ise 1.00 birim = 100 (en küçük birim, örn. cent) gönderilir.
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF',
  'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

// Ülkeye göre fiyat istisnaları: varsayılan "her yerde ayda 1 birim" modeli
// üzerine, yıllık enflasyonu ~%15 ve üzerinde olan ülkelerde (IMF'in 2026
// tahminlerine göre) aylık ücret bilinçli olarak 10 birim olacak şekilde
// ayarlandı: Türkiye (TRY), Venezuela (VES), Sudan (SDG), İran (IRR),
// Arjantin (ARS), Yemen (YER), Malavi (MWK), Haiti (HTG), Bolivya (BOB),
// Myanmar (MMK), Nijerya (NGN). Burada listelenmeyen tüm para birimleri
// 1 birim/ay olmaya devam eder. Bu, GERÇEK tahsilat tutarını belirleyen
// taraftır — currencies.js'teki eşleme sadece istemcide önizleme göstermek
// içindir ve bununla senkron tutulmalıdır.
const PRICE_OVERRIDES = {
  TRY: 10, VES: 10, SDG: 10, IRR: 10, ARS: 10, YER: 10,
  MWK: 10, HTG: 10, BOB: 10, MMK: 10, NGN: 10,
};

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

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return {
      statusCode: 501,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'not_configured',
        message: 'Gerçek ödeme henüz kurulmadı: STRIPE_SECRET_KEY ortam değişkeni tanımlı değil.',
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
    if (!payload || typeof payload !== 'object') throw new Error('payload not an object');
  } catch (e) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Geçersiz istek gövdesi.' }) };
  }

  const { id, currency } = payload;
  if (!id || typeof id !== 'string') {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'id zorunludur.' }) };
  }
  const cur = (typeof currency === 'string' && currency.trim() ? currency.trim() : 'USD').toUpperCase();
  if (!/^[A-Z]{3}$/.test(cur)) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Geçersiz para birimi kodu.' }) };
  }

  try {
    const Stripe = require('stripe');
    const stripe = Stripe(secretKey);

    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://example.com';
    const baseUnits = PRICE_OVERRIDES.hasOwnProperty(cur) ? PRICE_OVERRIDES[cur] : 1;
    const unitAmount = ZERO_DECIMAL_CURRENCIES.has(cur) ? baseUnits : baseUnits * 100;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      client_reference_id: id,
      line_items: [
        {
          price_data: {
            currency: cur.toLowerCase(),
            unit_amount: unitAmount,
            recurring: { interval: 'month' },
            product_data: {
              name: 'ONE Global — Aylık Abonelik',
              description: PRICE_OVERRIDES.hasOwnProperty(cur)
                ? 'Aylık abonelik — ' + baseUnits + ' ' + cur + '.'
                : 'Dünyanın her yerinde, ayda sadece 1 birim.',
            },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7,
        metadata: { one_sub_id: id },
      },
      success_url: siteUrl + '/ayarlar.html?sub=success',
      cancel_url: siteUrl + '/abonelik.html?sub=cancelled',
    });

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Ödeme oturumu oluşturulamadı.' }),
    };
  }
};
