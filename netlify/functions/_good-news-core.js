// ONE Global — "Bugünün iyi haberleri" ortak üretim mantığı.
// good-news.js (kullanıcı isteğiyle, anlık) ve send-notifications.js
// (zamanlanmış, arka planda önbelleği tazeleyen) tarafından paylaşılır.
//
// Neden ayrı bir dosya: good-news.js tek başına canlı üretim yaptığında
// (önbellek boşken) Claude'un web_search aracıyla arama + özet üretmesi
// bazen Netlify'ın senkron fonksiyon süre sınırını (bu sitede ~30sn)
// aşabiliyor ve "Task timed out" hatası dönüyordu. Çözüm: send-notifications.js
// zaten her 15 dakikada bir çalışıyor — aynı üretim kodunu oradan da
// çağırarak önbelleği kullanıcı hiç istemeden, sırayla dil dil tazeliyoruz.
// Böylece good-news.js neredeyse her zaman hazır önbellekten anında cevap
// verir; canlı üretim sadece gerçekten hiç önbelleklenmemiş bir dil için
// (örn. ilk kullanım) yedek (fallback) olarak kalır.

const CACHE_TTL_HOURS = 20; // aynı gün içinde tekrar üretmemek için

const LANG_NAMES = {
  tr: 'Turkish', en: 'English', es: 'Spanish', fr: 'French', de: 'German',
  pt: 'Portuguese', it: 'Italian', ru: 'Russian', ar: 'Arabic', hi: 'Hindi',
  bn: 'Bengali', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', id: 'Indonesian',
  vi: 'Vietnamese', th: 'Thai', ur: 'Urdu', sw: 'Swahili', pl: 'Polish', nl: 'Dutch',
};

function cacheKeyFor(lang) {
  const today = new Date().toISOString().slice(0, 10);
  return today + '_' + lang;
}

async function getCached(store, lang) {
  try {
    const cached = await store.get(cacheKeyFor(lang), { type: 'json' });
    if (cached && cached.generatedAt) {
      const ageHours = (Date.now() - new Date(cached.generatedAt).getTime()) / 3600000;
      if (ageHours < CACHE_TTL_HOURS) return cached;
      return { stale: cached, ageHours };
    }
  } catch (e) {
    // önbellek okunamazsa sorun değil — çağıran taraf üretime devam eder
  }
  return null;
}

// Claude'u web_search aracıyla çağırıp o dil için 5 haberlik bir dizi üretir
// ve önbelleğe yazar. Hata durumunda fırlatır (throw) — çağıran taraf
// (good-news.js ya da send-notifications.js) kendi bağlamına göre yönetir.
async function generateAndCache(store, apiKey, lang) {
  const langName = LANG_NAMES[lang] || LANG_NAMES.en;
  const today = new Date().toISOString().slice(0, 10);

  const prompt = `Search the web for genuinely uplifting, verified good-news stories and positive developments from around the world from today and yesterday (${today} and the day before). Prioritize real, specific, dated stories from credible outlets — not vague or generic statements. Cover a mix of regions/topics if possible (science, health, environment, human kindness, community, technology for good, etc.). Pick the 5 best.

After searching, respond with ONLY a JSON array (no other text, no markdown fences) of exactly 5 objects, each with:
- "headline": a short, warm headline (max 12 words) written in ${langName}
- "summary": one or two friendly sentences in ${langName} explaining the good news
- "source": the name of the publication/outlet
- "url": the source URL

Respond in ${langName} for "headline" and "summary". Output ONLY the JSON array, nothing else.`;

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20260318', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await anthropicRes.json();
  if (!anthropicRes.ok) {
    const err = new Error((data && data.error && data.error.message) || 'Yapay zeka servisine ulaşılamadı.');
    err.statusCode = anthropicRes.status;
    throw err;
  }

  const textBlocks = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text);
  const fullText = textBlocks.join('\n').trim();

  let items;
  try {
    const jsonMatch = fullText.match(/\[[\s\S]*\]/);
    items = JSON.parse(jsonMatch ? jsonMatch[0] : fullText);
  } catch (e) {
    const err = new Error('Haberler ayrıştırılamadı.');
    err.statusCode = 502;
    throw err;
  }

  const result = { lang, generatedAt: new Date().toISOString(), items };
  await store.setJSON(cacheKeyFor(lang), result);
  return result;
}

module.exports = { LANG_NAMES, CACHE_TTL_HOURS, cacheKeyFor, getCached, generateAndCache };
