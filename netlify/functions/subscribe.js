// ONE Global — bildirim aboneliği kaydetme uç noktası.
// Tarayıcıdan gelen push subscription'ı ve kullanıcının rutin ayarlarını
// (uyanma/eve geliş/yatma saatleri, spor/okuma hedefleri) Netlify Blobs'a
// kaydeder. send-notifications.js (zamanlanmış fonksiyon) bu kayıtları
// okuyup uygun saatlerde bildirim gönderir.

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Sadece POST desteklenir.' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Geçersiz istek gövdesi.' }) };
  }

  const { id, subscription, timezone, lang, settings, reminders } = payload;
  if (!id || !subscription || !subscription.endpoint) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'id ve subscription zorunludur.' }) };
  }

  try {
    const store = getStore('one-subscribers');
    const existingRaw = await store.get(id, { type: 'json' });
    const existing = existingRaw || {};

    const record = {
      id,
      subscription,
      timezone: timezone || existing.timezone || 'UTC',
      lang: lang || existing.lang || 'en',
      settings: Object.assign(
        { wakeTime: '07:30', homeTime: '18:30', bedTime: '23:00', pushups: 10, situps: 20, pages: 5, notifyBedtime: true },
        existing.settings || {},
        settings || {}
      ),
      // reminders: kısa metin hatırlatmalar listesi. Gönderilmediyse (undefined)
      // mevcut liste korunur; boş dizi [] gönderilirse tamamen temizlenir.
      reminders: Array.isArray(reminders) ? reminders : (existing.reminders || []),
      state: existing.state || { date: '' },
      updatedAt: new Date().toISOString(),
    };

    await store.setJSON(id, record);

    return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Kaydedilemedi: ' + err.message }) };
  }
};
