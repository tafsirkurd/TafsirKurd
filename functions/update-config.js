// Cloudflare Pages Function — Force Update Config
// Returns update enforcement config from Supabase site_settings.
// Public endpoint — no sensitive data exposed.

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300', // 5-min CDN cache
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, '');
    const supabaseKey = env.SUPABASE_ANON_KEY?.replace(/[\n\r\s]/g, '');

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Config error' }), { status: 500, headers: corsHeaders });
    }

    const UPDATE_KEYS = [
      'force_update_enabled',
      'min_ios_version',
      'min_android_version',
      'ios_store_url',
      'android_store_url',
    ];

    const res = await fetch(
      `${supabaseUrl}/rest/v1/site_settings?select=key,value&key=in.(${UPDATE_KEYS.join(',')})`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
    );

    if (!res.ok) throw new Error('DB error ' + res.status);

    const rows = await res.json();
    const config = {};
    for (const row of rows) config[row.key] = row.value;

    return new Response(JSON.stringify(config), { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'fetch_failed' }), { status: 502, headers: corsHeaders });
  }
}
