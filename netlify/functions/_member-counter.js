// Hemcan — üye sayacı yardımcıları (parçalı sayaç).
//
// Tek bir kayda "oku-artır-yaz" yapmak, aynı anda çok kişi katılınca çakışır. Bu yüzden sayaç
// SHARDS parçaya bölünür: her yeni üye kimliğinin özetine göre bir parçayı artırır (parçalar arasında
// çakışma olmaz). Toplam = eski tek kayıt ('total') + tüm parçaların toplamı. Toplam, sık okunduğu için
// kısa süreli bir "rollup" kaydında önbelleğe alınır (en fazla ROLLUP_TTL_MS eski).
//
// Aynı depoda iki sayaç tutulur: 'dev' (cihaz kimliğiyle kayıt) ve 'acct' (doğrulanmış e-posta hesabı).
// Hangisinin gösterileceği MEMBER_COUNT_MODE ortam değişkeniyle seçilir ('accounts' → hesap sayısı).
const { increment, updateJSON } = require('./_rate-limit');

const SHARDS = 16;
const ROLLUP_TTL_MS = 20 * 1000;

function shardOf(id) {
  let h = 5381;
  const s = String(id);
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h % SHARDS;
}

function shardKey(prefix, n) { return prefix + '_s' + n; }

// Bir üyeyi sayar (id'ye göre parça seçilir).
async function bump(store, prefix, id) {
  return increment(store, shardKey(prefix, shardOf(id)));
}

// Tüm parçaları (ve varsa eski tek kaydı) okuyup toplar.
async function sumAll(store, prefix, legacyKey) {
  const keys = [];
  for (let i = 0; i < SHARDS; i++) keys.push(shardKey(prefix, i));
  if (legacyKey) keys.push(legacyKey);
  const vals = await Promise.all(keys.map(async (k) => {
    try { const r = await store.get(k, { type: 'json' }); return r && typeof r.count === 'number' ? r.count : 0; }
    catch (e) { return 0; }
  }));
  return vals.reduce((a, b) => a + b, 0);
}

// Önbellekli toplam. force=true ise önbelleği yok sayar.
async function readTotal(store, prefix, legacyKey, force) {
  const rk = 'rollup_' + prefix;
  if (!force) {
    try {
      const r = await store.get(rk, { type: 'json' });
      if (r && typeof r.count === 'number' && Date.now() - r.at < ROLLUP_TTL_MS) return r.count;
    } catch (e) { /* önbellek okunamazsa hesapla */ }
  }
  const n = await sumAll(store, prefix, legacyKey);
  try { await store.setJSON(rk, { count: n, at: Date.now() }); } catch (e) { /* önbellek yazılamazsa sorun değil */ }
  return n;
}

// Eski tek kayda fark ekler (gerçek üye sayısı sayaçtan fazlaysa düzeltme için).
async function addToLegacy(store, legacyKey, diff) {
  return updateJSON(store, legacyKey, (cur) => {
    const n = cur && typeof cur.count === 'number' ? cur.count : 0;
    return { next: { count: n + diff }, result: n + diff };
  });
}

module.exports = { SHARDS, shardOf, bump, sumAll, readTotal, addToLegacy };
