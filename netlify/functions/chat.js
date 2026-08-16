// ONE Global — Asistan sohbet uç noktası
// Bu fonksiyon, tarayıcıdan gelen mesajları Anthropic'in Claude API'sine iletir
// ve cevabı geri döner. API anahtarı yalnızca sunucu tarafında (Netlify ortam
// değişkeni) tutulur; tarayıcıya asla gönderilmez.
//
// Kurulum: Netlify site ayarlarından (Site configuration -> Environment
// variables) ANTHROPIC_API_KEY adında bir değişken eklenmesi gerekir.
// Anahtar https://console.anthropic.com/settings/keys adresinden alınabilir.
//
// Kalıcı sohbet geçmişi (Bellek sekmesi için): İstek bir `id` (kullanıcının
// tarayıcıda saklanan benzersiz kimliği) içeriyorsa, konuşma Netlify Blobs'a
// kaydedilir ve bir sonraki ziyarette GET ile geri yüklenebilir. `id`
// gönderilmezse (ör. eski istemci) davranış eskisi gibi durum bilgisiz kalır.
//
// GET    /api/chat?id=xxx   -> { messages: [...] } (kayıtlı geçmiş, yoksa [])
// POST   /api/chat {id, messages} -> { text } ve (id varsa) güncellenmiş
//                                     geçmişi Blobs'a kaydeder.
// DELETE /api/chat?id=xxx   -> geçmişi tamamen siler (ayarlar.html'deki
//                               "verilerimi sil" akışı için).

const MODEL = 'claude-sonnet-5';
const MAX_HISTORY_MESSAGES = 40; // ~20 karşılıklı tur — hem maliyeti hem prompt boyutunu sınırlar

// Hız sınırı (dürüstlük payı — bkz. "uygulama dünyaya açılmaya hazır mı?"
// konuşması): Her Claude API çağrısı gerçek para tutuyor (Anthropic
// faturası). Bu limit olmadan biri basit bir script ile bu uç noktayı
// saniyede onlarca kez çağırıp faturayı ciddi şekilde şişirebilirdi — bu,
// üye sayacına eklediğimiz korumanın burada UNUTULMUŞ hâliydi, şimdi
// ekleniyor. Aynı IP'den 10 dakikada en fazla 20 mesaj kabul edilir; bu,
// gerçek bir sohbet temposu için bolca yeterli ama otomatik kötüye
// kullanımı büyük ölçüde engeller. %100 sağlam değildir (çok sayıda farklı
// IP kullanan kararlı bir saldırgan yine de aşabilir) — gerçek ölçekte
// Cloudflare gibi bir katman veya kullanıcı başına aylık mesaj kotası
// eklemek daha güçlü bir sonraki adım olur.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 dakika
const RATE_LIMIT_MAX = 20;

function getClientIp(event) {
  const headers = event.headers || {};
  return (
    headers['x-nf-client-connection-ip'] ||
    headers['client-ip'] ||
    (headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    'unknown'
  );
}

const SYSTEM_PROMPT = `Sen ONE Global adlı, dünyanın her yerinden kullanıcılara hizmet veren kişisel yapay
zeka asistanı uygulamasının konuşma çekirdeğisin. Kullanıcının yazdığı dilde (Türkçe, İngilizce
veya başka bir dil) sıcak, kısa ve net cevaplar ver. Görevleri, hatırlatmaları ve planları
organize etmesine yardımcı ol. Gerçekte cihazlara bağlı olmadığını veya bir eylemi gerçekten
gerçekleştiremeyeceğini biliyorsan bunu dürüstçe belirt; yapamayacağın bir şeyi yapabiliyormuş
gibi davranma.`;

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  const { getStore } = require('@netlify/blobs');
  const historyStore = getStore('one-chat-history');

  if (event.httpMethod === 'GET') {
    const id = (event.queryStringParameters || {}).id;
    if (!id) {
      return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [] }) };
    }
    try {
      const rec = await historyStore.get(id, { type: 'json' });
      const messages = rec && Array.isArray(rec.messages) ? rec.messages : [];
      return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) };
    } catch (err) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Geçmiş okunamadı: ' + err.message }) };
    }
  }

  if (event.httpMethod === 'DELETE') {
    const id = (event.queryStringParameters || {}).id;
    if (!id) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'id zorunludur.' }) };
    }
    try {
      await historyStore.delete(id);
      return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Silinemedi: ' + err.message }) };
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Sadece GET/POST istekleri desteklenir.' }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error:
          'Sunucuda ANTHROPIC_API_KEY ayarlanmamış. Netlify > Site configuration > Environment variables bölümünden ekleyip yeniden deploy edin.',
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Geçersiz istek gövdesi.' }),
    };
  }

  const id = typeof payload.id === 'string' ? payload.id : null;
  let messages = Array.isArray(payload.messages) ? payload.messages : [];
  if (messages.length === 0) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Mesaj bulunamadı.' }),
    };
  }
  // Prompt boyutunu ve maliyeti sınırla — sadece son N mesajı Claude'a
  // gönder (tam geçmiş yine de Blobs'ta saklanmaya devam eder).
  if (messages.length > MAX_HISTORY_MESSAGES) {
    messages = messages.slice(messages.length - MAX_HISTORY_MESSAGES);
  }

  try {
    const rateLimitStore = getStore('one-chat-ratelimit');
    const ip = getClientIp(event);
    const rlKey = 'ip_' + ip;
    const rl = (await rateLimitStore.get(rlKey, { type: 'json' })) || { count: 0, windowStart: Date.now() };
    const now = Date.now();
    if (now - rl.windowStart > RATE_LIMIT_WINDOW_MS) {
      rl.count = 0;
      rl.windowStart = now;
    }
    if (rl.count >= RATE_LIMIT_MAX) {
      return {
        statusCode: 429,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Çok fazla mesaj gönderildi — birkaç dakika sonra tekrar dene.' }),
      };
    }
    rl.count += 1;
    await rateLimitStore.setJSON(rlKey, rl);
  } catch (e) {
    // Hız sınırı deposu okunamazsa sohbeti tamamen bloklamayalım —
    // sessizce yut, isteğe izin ver.
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      return {
        statusCode: anthropicRes.status,
        headers: corsHeaders,
        body: JSON.stringify({
          error: (data && data.error && data.error.message) || 'Yapay zeka servisine ulaşılamadı.',
        }),
      };
    }

    const text = (data.content && data.content[0] && data.content[0].text) || '';

    // Kalıcı geçmişi güncelle (id gönderildiyse). Bu adım başarısız olsa
    // bile kullanıcı cevabı yine de almalı — o yüzden hatayı yutuyoruz,
    // sadece Bellek sekmesindeki kayıt eksik kalır.
    if (id) {
      try {
        const updated = messages.concat([{ role: 'assistant', content: text }]);
        const trimmed = updated.length > MAX_HISTORY_MESSAGES ? updated.slice(updated.length - MAX_HISTORY_MESSAGES) : updated;
        await historyStore.setJSON(id, { messages: trimmed, updatedAt: new Date().toISOString() });
      } catch (e) {
        // sessizce yut — geçmiş kaydı ana sohbet akışını bozmamalı
      }
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Ağ hatası: ' + err.message }),
    };
  }
};
