// Hemcan — üye sayacı uç noktası.
// Ana ekranın en üstünde gösterilen "Hemcan ailesi" üye sayısını besler.
// Sayı GERÇEKtir: her yeni kişi onboarding ekranında "Ücretsiz Başla"ya
// bastığında bir kez artırılır (aynı cihaz/tarayıcı ikinci kez saymaz —
// benzersiz kimlik localStorage'da tutulur). Sahte/rastgele artan bir sayı
// DEĞİLDİR.
//
// GET    /api/member-count            -> { count, goal, nextGoal, bigGoal, donationActive }
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

const GOAL = 10000; // 10 bin: bu sayıya ulaşınca bağış mekanizması "aktif" gösterilir
const NEXT_GOAL = 1000000; // küçük hedef: 1 milyon abone (bağış aktifken ilerleme çubuğu buna göre dolar)
const BIG_GOAL = 2000000000; // büyük hedef: 2 milyar abone

// Bir id'nin gerçekten client tarafında (hosgeldin.html'deki getSubId())
// üretilmiş gibi görünmesini zorunlu kılan iki kabul edilebilir kalıp:
// standart UUID (crypto.randomUUID) veya 'one-<timestamp>-<random>' yedek
// biçimi (crypto.randomUUID mevcut değilse kullanılır).
const ID_PATTERN = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|one-\d{10,}-[0-9a-z]{4,})$/i;

// Aynı IP'den bir zaman penceresi içinde izin verilen en fazla yeni kayıt.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 saat
const RATE_LIMIT_MAX = 30; // mobil operatör ağlarında (CGNAT) birçok kişi aynı IP'yi paylaşır; çok düşük sınır gerçek kişileri engelliyordu

function getClientIp(event) {
  const headers = event.headers || {};
  return (
    headers['x-nf-client-connection-ip'] ||
    headers['client-ip'] ||
    (headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    'unknown'
  );
}

const { consume } = require('./_rate-limit');
const M = require('./_member-counter');

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };

  let counterStore, membersStore, rateLimitStore;
  try {
    const { getStore, connectLambda } = require('@netlify/blobs');
    connectLambda(event);
    counterStore = getStore('one-member-counter');
    membersStore = getStore('one-members');
    rateLimitStore = getStore('one-member-ratelimit');
  } catch (err) {
    // Depo başlatılamadı (ör. Netlify Blobs kapalı/ayarsız): ham hata yerine okunur bir kod döndür.
    return { statusCode: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'store-unavailable' }) };
  }

  function shape(count) {
    return {
      count,
      goal: GOAL,
      nextGoal: NEXT_GOAL,
      bigGoal: BIG_GOAL,
      donationActive: count >= GOAL,
    };
  }

  const ACCOUNTS_MODE = process.env.MEMBER_COUNT_MODE === 'accounts';
  const PREFIX = ACCOUNTS_MODE ? 'acct' : 'dev';
  const LEGACY = ACCOUNTS_MODE ? null : 'total'; // eski tek kayıtlı sayaç yalnızca cihaz sayacına ait

  async function readCount(force) {
    return M.readTotal(counterStore, PREFIX, LEGACY, force);
  }

  // Gerçek kaynak: kayıtlı üyelerin kendisi (one-members deposundaki 'm_<id>' kayıtları).
  // Sayaç geride kalırsa (ör. artırma hatası) düzeltilir. Listeleme üye sayısıyla orantılı pahalıdır;
  // bu yüzden en fazla 6 saatte bir ve yalnızca üye sayısı makul büyüklükteyken (RECONCILE_MAX) yapılır.
  // Artırma hata verirse (force) hemen çalışır. Hesap modunda uygulanmaz (kaynak hesaplardır).
  const RECONCILE_EVERY_MS = 6 * 60 * 60 * 1000;
  const RECONCILE_MAX = 20000;
  async function reconcile(current, force) {
    if (ACCOUNTS_MODE) return current;
    try {
      const meta = await counterStore.get('reconcile', { type: 'json' });
      if (!force && meta && typeof meta.at === 'number' && Date.now() - meta.at < RECONCILE_EVERY_MS) return current;
      if (!force && current > RECONCILE_MAX) return current;
      const listed = await membersStore.list({ prefix: 'm_' });
      const n = listed && Array.isArray(listed.blobs) ? listed.blobs.length : 0;
      await counterStore.setJSON('reconcile', { at: Date.now(), listed: n });
      // Önbellekli değer eski olabilir; farkı mutlaka güncel toplamla hesapla (aksi hâlde çift sayılır).
      const fresh = await readCount(true);
      if (n > fresh) {
        await M.addToLegacy(counterStore, 'total', n - fresh);
        return await readCount(true);
      }
      return fresh;
    } catch (e) { /* düzeltme başarısız olsa da sayı gösterilmeye devam eder */ }
    return current;
  }

  if (event.httpMethod === 'GET') {
    try {
      const count = await reconcile(await readCount(false), false);
      return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(shape(count)) };
    } catch (err) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Sayı okunamadı.' }) };
    }
  }

  if (event.httpMethod === 'POST') {
    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
      if (!payload || typeof payload !== 'object') throw new Error('payload not an object');
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
      let count = await readCount(false);

      if (!already) {
        // Sadece GERÇEKTEN yeni bir üye eklerken hız sınırı uygula — aynı
        // kişinin tekrar tekrar isteği (already=true durumu) bu sınıra
        // takılıp gereksiz yere 429 almamalı.
        const ip = getClientIp(event);
        const rlKey = 'ip_' + ip;
        let rl = { allowed: true };
        try {
          rl = await consume(rateLimitStore, rlKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
        } catch (e) {
          rl = { allowed: true }; // hız sınırı deposu sorun çıkarırsa kaydı engelleme (fail-open)
        }
        if (!rl.allowed) {
          return {
            statusCode: 429,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Çok fazla istek — biraz sonra tekrar dene.' }),
          };
        }

        // onlyIfNew: aynı kişi aynı anda iki istek gönderse bile yalnızca biri
        // "yeni üye" sayılır, sayaç iki kez artmaz. (Çok eski bir SDK koşulu yok
        // sayarsa `modified` alanı gelmez; o durumda eskisi gibi yeni sayıyoruz.)
        let reg;
        try {
          reg = await membersStore.set(memberKey, new Date().toISOString(), { onlyIfNew: true });
        } catch (e) {
          // koşullu yazma desteklenmiyorsa düz yazmaya düş (üstte zaten 'already' kontrolü yapıldı)
          await membersStore.set(memberKey, new Date().toISOString());
          reg = { modified: true };
        }
        const isNew = !(reg && typeof reg === 'object' && 'modified' in reg) || reg.modified;
        if (isNew) {
          if (ACCOUNTS_MODE) {
            // Hesap modunda sayı hesaplardan gelir (bkz. otp-verify.js); cihaz kaydı sayıyı değiştirmez.
          } else {
            try {
              await M.bump(counterStore, PREFIX, id);
              count += 1; // önbellekli toplam en fazla 20 sn eski olabilir; yeni üyeyi hemen göster
            } catch (e) {
              // Sayaç çok yoğun bir çakışma yüzünden güncellenemedi. Üye kaydı yapıldı; kullanıcıya hata
              // göstermeyelim ve sayıyı üye kayıtlarıyla eşitleyelim.
              count = await reconcile(await readCount(true), true);
            }
          }
        } else {
          count = await reconcile(count, false);
        }
      } else {
        count = await reconcile(count, false);
      }

      return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(shape(count)) };
    } catch (err) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Kaydedilemedi.' }) };
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
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Silinemedi.' }) };
    }
  }

  return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Sadece GET/POST/DELETE desteklenir.' }) };
};
