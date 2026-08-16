// ONE Global — Stripe webhook uç noktası.
//
// DÜRÜSTLÜK NOTU: create-checkout-session.js gibi bu da bir iskelettir.
// Devreye girmesi için Netlify'da şu ortam değişkenlerinin tanımlanması,
// ayrıca Stripe panelinde bu URL'nin (https://<siten>/.netlify/functions/stripe-webhook
// ya da /api/stripe-webhook yönlendirmesi kuruluysa o) bir webhook uç
// noktası olarak eklenmesi gerekir:
//   STRIPE_SECRET_KEY     -> aynı gizli anahtar
//   STRIPE_WEBHOOK_SECRET -> Stripe panelindeki webhook imza gizli anahtarı (whsec_...)
//
// Bu fonksiyon, Stripe'tan gelen abonelik olaylarını dinler ve
// `one-subscriptions` Blobs deposuna GERÇEK abonelik durumunu yazar
// (id -> { status, customerId, subscriptionId, currency, updatedAt }).
// Henüz uygulamanın geri kalanı bu durumu okuyup bir "paywall" (ücretsiz
// deneme bitince özellik kısıtlama) uygulamıyor — bu, birlikte ayrıca
// tasarlanması gereken bir sonraki adım.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Sadece POST desteklenir.' }) };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return {
      statusCode: 501,
      body: JSON.stringify({
        error: 'not_configured',
        message: 'STRIPE_SECRET_KEY ve/veya STRIPE_WEBHOOK_SECRET tanımlı değil.',
      }),
    };
  }

  const Stripe = require('stripe');
  const stripe = Stripe(secretKey);

  let stripeEvent;
  try {
    const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
    // Netlify Functions body'yi bazı durumlarda base64 ile iletir; imza
    // doğrulaması ham (raw) gövde üzerinde yapılmalıdır.
    const rawBody = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Webhook imzası doğrulanamadı: ' + err.message }) };
  }

  try {
    const { getStore, connectLambda } = require('@netlify/blobs');
    connectLambda(event);
    const subsStore = getStore('one-subscriptions');

    async function upsert(subId, patch) {
      if (!subId) return;
      const existing = (await subsStore.get(subId, { type: 'json' })) || {};
      await subsStore.setJSON(subId, { ...existing, ...patch, updatedAt: new Date().toISOString() });
    }

    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object;
        const oneId = session.client_reference_id;
        await upsert(oneId, {
          status: 'trialing_or_active',
          customerId: session.customer,
          subscriptionId: session.subscription,
          currency: session.currency,
        });
        break;
      }
      case 'customer.subscription.updated': {
        const sub = stripeEvent.data.object;
        const oneId = sub.metadata && sub.metadata.one_sub_id;
        await upsert(oneId, { status: sub.status, subscriptionId: sub.id });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = stripeEvent.data.object;
        const oneId = sub.metadata && sub.metadata.one_sub_id;
        await upsert(oneId, { status: 'canceled', subscriptionId: sub.id });
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object;
        const subId = invoice.subscription;
        // Bu olayda doğrudan one_sub_id metadata'sı gelmeyebilir; abonelik
        // nesnesinden ayrıca çekmek gerekebilir. Basit tutmak için burada
        // sadece logluyoruz — geliştirme sırasında ihtiyaç olursa
        // subsStore'a stripe subscriptionId üzerinden ikinci bir indeks
        // eklenebilir.
        console.log('Ödeme başarısız, subscriptionId:', subId);
        break;
      }
      default:
        break;
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Webhook işlenemedi: ' + err.message }) };
  }
};
