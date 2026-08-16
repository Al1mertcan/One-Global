// ONE Global — bildirimleri kapatma uç noktası: kaydı Netlify Blobs'tan siler.
const { getStore, connectLambda } = require('@netlify/blobs');

exports.handler = async (event) => {
  connectLambda(event);
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Sadece POST desteklenir.' }) };
  }
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Geçersiz istek gövdesi.' }) };
  }
  if (!payload.id) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'id zorunludur.' }) };
  }
  try {
    const store = getStore('one-subscribers');
    await store.delete(payload.id);
    return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Silinemedi: ' + err.message }) };
  }
};
