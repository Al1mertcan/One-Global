// ONE Global — "Bugünün iyi haberleri" uç noktası.
// Claude'un web_search aracını kullanarak dünyadan gerçek, güncel, olumlu
// haberleri toplar ve kısa bir özet olarak döner. Günde bir kez (dil başına)
// üretilip Netlify Blobs'ta önbelleğe alınır — her sayfa yüklemesinde yeni
// bir arama yapılmaz (hem hız hem maliyet için).
//
// Maliyet notu: web_search aracı her kullanımda küçük bir ücrete tabidir
// (bu yazının yazıldığı tarihte 1000 aramada 10 dolar civarı — güncel fiyat
// için Anthropic'in fiyatlandırma sayfasına bak). Günlük önbellekleme
// sayesinde bu, kullanıcı sayısından bağımsız olarak dil başına günde
// sadece 1 arama demek.
//
// Önbellek tazeleme notu: Üretim mantığının kendisi artık _good-news-core.js
// içinde — send-notifications.js (zamanlanmış fonksiyon) her 15 dakikada
// bir sırayla bir dilin önbelleğini arka planda tazeliyor, böylece bu uç
// nokta neredeyse her zaman hazır önbellekten anında cevap verir. Önbellek
// gerçekten boşsa (ör. bir dilin ilk kullanımı) burada canlı üretime
// düşüyoruz — bu nadir durumda, arama uzun sürerse zaman aşımı riski
// (Netlify'ın senkron fonksiyon süre sınırı) hâlâ teorik olarak mevcut,
// ama artık istisna, kural değil.

const { LANG_NAMES, getCached, generateAndCache } = require('./_good-news-core');

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500, headers: corsHeaders,
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY ayarlanmamış.' }),
    };
  }

  const params = event.queryStringParameters || {};
  const lang = LANG_NAMES[params.lang] ? params.lang : 'en';

  const { getStore, connectLambda } = require('@netlify/blobs');
  connectLambda(event);
  const store = getStore('one-good-news');

  const cached = await getCached(store, lang);
  if (cached && !cached.stale) {
    return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(cached) };
  }

  try {
    const result = await generateAndCache(store, apiKey, lang);
    return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(result) };
  } catch (err) {
    // Canlı üretim başarısız oldu (hata ya da zaman aşımı). Elimizde bayat
    // da olsa bir önbellek varsa boş dönmektense onu döndürelim — kullanıcı
    // hiç haber görmemektense dünkü haberleri görsün.
    if (cached && cached.stale) {
      return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(cached.stale) };
    }
    const statusCode = (err && err.statusCode) || 502;
    return { statusCode, headers: corsHeaders, body: JSON.stringify({ error: (err && err.message) || 'Ağ hatası.' }) };
  }
};
