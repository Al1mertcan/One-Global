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

const CACHE_TTL_HOURS = 20; // aynı gün içinde tekrar üretmemek için

const LANG_NAMES = {
  tr: 'Turkish', en: 'English', es: 'Spanish', fr: 'French', de: 'German',
  pt: 'Portuguese', it: 'Italian', ru: 'Russian', ar: 'Arabic', hi: 'Hindi',
  bn: 'Bengali', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', id: 'Indonesian',
  vi: 'Vietnamese', th: 'Thai', ur: 'Urdu', sw: 'Swahili', pl: 'Polish', nl: 'Dutch',
};

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
  const langName = LANG_NAMES[lang];

  const { getStore } = require('@netlify/blobs');
  const store = getStore('one-good-news');
  const today = new Date().toISOString().slice(0, 10);
  const cacheKey = today + '_' + lang;

  try {
    const cached = await store.get(cacheKey, { type: 'json' });
    if (cached && cached.generatedAt) {
      const ageHours = (Date.now() - new Date(cached.generatedAt).getTime()) / 3600000;
      if (ageHours < CACHE_TTL_HOURS) {
        return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(cached) };
      }
    }
  } catch (e) {
    // önbellek okunamazsa sorun değil, yeniden üretmeye devam et
  }

  const prompt = `Search the web for genuinely uplifting, verified good-news stories and positive developments from around the world from today and yesterday (${today} and the day before). Prioritize real, specific, dated stories from credible outlets — not vague or generic statements. Cover a mix of regions/topics if possible (science, health, environment, human kindness, community, technology for good, etc.). Pick the 5 best.

After searching, respond with ONLY a JSON array (no other text, no markdown fences) of exactly 5 objects, each with:
- "headline": a short, warm headline (max 12 words) written in ${langName}
- "summary": one or two friendly sentences in ${langName} explaining the good news
- "source": the name of the publication/outlet
- "url": the source URL

Respond in ${langName} for "headline" and "summary". Output ONLY the JSON array, nothing else.`;

  try {
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
      return {
        statusCode: anthropicRes.status, headers: corsHeaders,
        body: JSON.stringify({ error: (data.error && data.error.message) || 'Yapay zeka servisine ulaşılamadı.' }),
      };
    }

    // Metin bloklarını birleştir (web_search kullanıldığında birden fazla
    // içerik bloğu — arama sonuçları + nihai metin — dönebilir).
    const textBlocks = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text);
    const fullText = textBlocks.join('\n').trim();

    let items;
    try {
      const jsonMatch = fullText.match(/\[[\s\S]*\]/);
      items = JSON.parse(jsonMatch ? jsonMatch[0] : fullText);
    } catch (e) {
      return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: 'Haberler ayrıştırılamadı.' }) };
    }

    const result = { lang, generatedAt: new Date().toISOString(), items };
    try { await store.setJSON(cacheKey, result); } catch (e) {}

    return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 502, headers: corsHeaders, body: JSON.stringify({ error: 'Ağ hatası: ' + err.message }) };
  }
};
