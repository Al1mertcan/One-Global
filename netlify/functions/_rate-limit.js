// Hemcan — yarış durumuna dayanıklı hız sınırı / sayaç yardımcıları.
//
// Eski kod "oku -> artır -> yaz" yapıyordu: aynı anda gelen N istek aynı
// değeri okuyup hepsi N+1 yazabildiği için hız sınırı atlatılabiliyordu.
// Burada Netlify Blobs'un koşullu yazma özelliğini (onlyIfNew / onlyIfMatch +
// ETag) kullanarak "karşılaştır ve değiştir" (compare-and-swap) döngüsü
// kuruyoruz: yazma ancak okuduğumuz sürüm hâlâ güncelse başarılı olur,
// değilse tekrar okuyup yeniden deniyoruz.
//
// Notlar:
// - Koşullu yazma bir SDK özelliği. Çok eski bir sürüm seçeneği yok sayarsa
//   sonuç nesnesinde `modified` alanı olmaz; bu durumda eski (yarışlı) davranışa
//   düşüyoruz ama hata vermiyoruz.
// - Bilinen SDK hatası (netlify/primitives#741): 412 dışındaki hatalarda SDK
//   `{ modified: true, etag: '' }` döndürebiliyor. Gerçek başarıda her zaman
//   dolu bir etag gelir, o yüzden boş etag'i başarısızlık sayıyoruz.
// - Hız sınırı deposu sorun çıkarırsa çağıran taraf isteği engellememeli
//   (fail-open); bu yüzden tükenen denemelerde fırlatıyoruz, karar çağıranda.

const MAX_ATTEMPTS = 12;

function conditionalSupported(res) {
  return res && typeof res === 'object' && 'modified' in res;
}

// `fn(current)` -> { next, result } ya da { skip: true, result }.
// current: depodaki mevcut değer (yoksa null). Başarılı olursa result döner.
async function updateJSON(store, key, fn) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const entry = await store.getWithMetadata(key, { type: 'json', consistency: 'strong' });
    const current = entry && entry.data !== undefined ? entry.data : null;
    const etag = entry ? entry.etag : undefined;

    const decision = fn(current);
    if (decision.skip) return decision.result;

    const opts = current === null || current === undefined ? { onlyIfNew: true } : { onlyIfMatch: etag };
    const res = await store.setJSON(key, decision.next, opts);

    if (!conditionalSupported(res)) return decision.result; // eski SDK: koşul yok sayıldı
    if (res.modified && res.etag) return decision.result;
    // modified=false (başkası araya girdi) ya da boş etag -> tekrar dene
    await new Promise((r) => setTimeout(r, Math.random() * 20 * Math.min(attempt + 1, 8)));
  }
  throw new Error('rate-limit: çakışma nedeniyle güncellenemedi');
}

// Pencere tabanlı sayaç. İzin verilirse { allowed: true, count }, sınır
// aşıldıysa { allowed: false } döner.
async function consume(store, key, max, windowMs, now = Date.now()) {
  return updateJSON(store, key, (cur) => {
    let rl = cur && typeof cur.count === 'number' && typeof cur.windowStart === 'number' ? cur : null;
    if (!rl || now - rl.windowStart > windowMs) rl = { count: 0, windowStart: now };
    if (rl.count >= max) return { skip: true, result: { allowed: false } };
    const next = { count: rl.count + 1, windowStart: rl.windowStart };
    return { next, result: { allowed: true, count: next.count } };
  });
}

// Sayacı 1 artırır (üye sayacı gibi). Yeni değeri döner.
async function increment(store, key) {
  return updateJSON(store, key, (cur) => {
    const n = cur && typeof cur.count === 'number' ? cur.count : 0;
    return { next: { count: n + 1 }, result: n + 1 };
  });
}

module.exports = { consume, increment, updateJSON };
