// Cloudflare Pages Function — serves popup image URL for app-promo.js
// Public endpoint, no auth required. Reads app_popup_image_url from site_settings.

export async function onRequest(context) {
  const { env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    'Access-Control-Allow-Origin': '*',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    const url = (env.SUPABASE_URL || '').replace(/[\n\r\s]/g, '')
      + '/rest/v1/site_settings?key=eq.app_popup_image_url&select=value&limit=1';

    const res = await fetch(url, {
      headers: {
        'apikey': (env.SUPABASE_ANON_KEY || '').replace(/[\n\r\s]/g, ''),
        'Authorization': 'Bearer ' + (env.SUPABASE_ANON_KEY || '').replace(/[\n\r\s]/g, ''),
      },
    });

    if (!res.ok) throw new Error('DB ' + res.status);

    const data = await res.json();
    const imageUrl = (data && data[0] && data[0].value) ? data[0].value : null;

    return new Response(JSON.stringify({ imageUrl }), { status: 200, headers });
  } catch (e) {
    // Always return a valid response — popup degrades gracefully without image
    return new Response(JSON.stringify({ imageUrl: null }), { status: 200, headers });
  }
}
