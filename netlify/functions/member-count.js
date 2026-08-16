// ONE Global — üye sayacı uç noktası.
// Ana ekranın en üstünde gösterilen "ONE Global ailesi" üye sayısını besler.
// Sayı GERÇEKtir: her yeni kişi onboarding ekranında "Ücretsiz Başla"ya
// bastığında bir kez artırılır (aynı cihaz/tarayıcı ikinci kez saymaz —
// benzersiz kimlik localStorage'da tutulur). Sahte/rastgele artan bir sayı
// DEĞİLDİR.
//
// GET    /api/member-count            -> { count, goal, nextGoal, donationActive }
// POST   /api/member-count {id}       -> aynı şekli döner; id daha önce
//                                         kaydedilmediyse sayaç 1 artar.
// DELETE /api/member-count?id=xxx     -> kişinin "üye" kaydını (sadece
//                                         kendi kimlik bağlantısını) siler —
//                                         ayarlar.html'deki "verilerimi sil"
//                                         akışı için. TOPLAM SAYIYI GERİYE
//                                         ALMAZ (bkz. gizlilik.html: sayaç,
//                                         geçmişte gerçekleşmiş katılımların
//                                         toplamıdır, bir kişi ayrılınca
//                                         geçmiş katılım gerçeği değişmez).
//
// Dürüstlük notu (ölçeklenebilirlik): Sayaç, Netlify Blobs üzerinde tek bir
// JSON kaydını oku-artır-yaz şeklinde günceller. Bu, çok düşük/orta
// eşzamanlı trafik için tamamen yeterli ve basit bir çözüm. Aynı anda
// binlerce kişi tam olarak aynı milisaniyede "Ücretsiz Başla"ya basarsa
// birkaç kayıt teorik olarak çakışıp sayılmayabilir (bu rakam motivasyonel/
// şeffaflık amaçlı, finansal kayıt değil, o yüzden bu risk kabul edilebilir).
// Gerçekten milyonlarca eşzamanlı kullanıcıya ulaşıldığında (tam da
// hedeflediğimiz nokta) bunun yerine gerçek bir sayaç servisi (ör. Redis
// INCR) kullanılması gerekir — o ölçeğe geldiğimizde bunu birlikte
// yapacağız.
//
// Kötüye kullanım koruması (dürüstlük notu): id'nin gerçekten client'ın
// ürettiği formatta olmasını zorunlu kılıyoruz VE aynı IP adresinden kısa
// sürede çok fazla yeni kayıt gelirse reddediyoruz (aşağıya bakınız). Bu,
// basit bir script ile sayacı şişirmeye çalışan birini durdurur ama
// %100 sağlam bir bot koruması DEĞİLDİR — kararlı bir saldırgan çok
// sayıda farklı IP kullanarak (ör. bir proxy/botnet ile) bunu yine de aşabilir.
// Gerçek bir captcha/insan doğrulaması (ör. Cloudflare Turnstile) çok daha
// güçlü bir sonraki adım olur ama bu, senin ücretsiz bir hesap açıp bana bir
// site anahtarı vermeni gerektirir — istersen onu da birlikte kuralım. Ayrıca
// bu IP bazlı sınır, aynı ofis/okul/ev ağını (aynı IP'yi) paylaşan gerçek
// farklı kişileri de nadiren yanlışlıkla geçici olarak engelleyebilir —
// bu bilinen ve kabul edilen bir ödünleşim.

const GOAL = 1000000; // bu sayıya ulaşınca bağış mekanizması "aktif" gösterilir
const NEXT_GOAL = 1000000000; // sıradaki hedef

// Bir id'nin gerçekten client tarafında (hosgeldin.html'deki getSubId())
// üretilmiş gibi görünmesini zorunlu kılan iki kabul edilebilir kalıp:
// standart UUID (crypto.randomUUID) veya 'one-<timestamp>-<random>' yedek
// biçimi (crypto.randomUUID mevcut değilse kullanılır).
const ID_PATTERN = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|one-\d{10,}-[0-9a-z]{4,})$/i;

// Aynı IP'den bir zaman penceresi içinde izin verilen en fazla yeni kayıt.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 saat
const RATE_LIMIT_MAX = 5;

function getClientIp(event) {
  const headers = event.headers || {};
  return (
    headers['x-nf-client-connection-ip'] ||
    headers['client-ip'] ||
    (headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    'unknown'
  );
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };

  const { getStore } = require('@netlify/blobs');
  const counterStore = getStore('one-member-counter');
  const membersStore = getStore('one-members');
  const rateLimitStore = getStore('one-member-ratelimit');

  function shape(count) {
    return {
      count,
      goal: GOAL,
      nextGoal: NEXT_GOAL,
      donationActive: count >= GOAL,
    };
  }

  async function readCount() {
    const rec = await counterStore.get('total', { type: 'json' });
    return rec && typeof rec.count === 'number' ? rec.count : 0;
  }

  if (event.httpMethod === 'GET') {
    try {
      const count = await readCount();
      return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(shape(count)) };
    } catch (err) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Sayı okunamadı: ' + err.message }) };
    }
  }

  if (event.httpMethod === 'POST') {
    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Geçersiz istek gövdesi.' }) };
    }
    const { id } = payload;
    if (!id || typeof id !== 'string' || !ID_PATTERN.test(id)) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Geçersiz id.' }) };
    }

    try {
      const memberKey = 'm_' + id;
      const already = await membersStore.get(memberKey);
      let count = await readCount();

      if (!already) {
        // Sadece GERÇEKTEN yeni bir üye eklerken hız sınırı uygula — aynı
        // kişinin tekrar tekrar isteği (already=true durumu) bu sınıra
        // takılıp gereksiz yere 429 almamalı.
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
            body: JSON.stringify({ error: 'Çok fazla istek — biraz sonra tekrar dene.' }),
          };
        }
        rl.count += 1;
        await rateLimitStore.setJSON(rlKey, rl);

        await membersStore.set(memberKey, new Date().toISOString());
        count += 1;
        await counterStore.setJSON('total', { count });
      }

      return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(shape(count)) };
    } catch (err) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Kaydedilemedi: ' + err.message }) };
    }
  }

  if (event.httpMethod === 'DELETE') {
    const id = (event.queryStringParameters || {}).id;
    if (!id) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'id zorunludur.' }) };
    }
    try {
      await membersStore.delete('m_' + id);
      return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Silinemedi: ' + err.message }) };
    }
  }

  return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Sadece GET/POST/DELETE desteklenir.' }) };
};
