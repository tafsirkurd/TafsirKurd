// Cloudflare Pages Function — serves all site_settings for app-promo.js
// Public endpoint, no auth required.

const KEYS = [
  'app_popup_image_url',
  'app_popup_image_mobile_url',
  'footer_app_visible',
  'footer_app_name',
  'footer_app_desc',
  'popup_enabled',
  'popup_headline',
  'popup_subtitle',
  'app_store_url',
  'play_store_url',
];

export async function onRequest(context) {
  const { env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    'Access-Control-Allow-Origin': '*',
  };

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  const fallback = { imageUrl: null };

  try {
    const base = (env.SUPABASE_URL || '').replace(/[\n\r\s]/g, '');
    const anonKey = (env.SUPABASE_ANON_KEY || '').replace(/[\n\r\s]/g, '');
    const url = base + '/rest/v1/site_settings?select=key,value&key=in.(' + KEYS.join(',') + ')';

    const res = await fetch(url, {
      headers: {
        'apikey': anonKey,
        'Authorization': 'Bearer ' + anonKey,
      },
    });

    if (!res.ok) throw new Error('DB ' + res.status);

    const data = await res.json();
    const map = {};
    if (Array.isArray(data)) data.forEach(function(r) { map[r.key] = r.value; });

    const payload = {
      imageUrl:      map['app_popup_image_url']        || null,
      imageMobileUrl: map['app_popup_image_mobile_url'] || null,
      footerVisible: map['footer_app_visible'] !== 'false',
      footerName:    map['footer_app_name']    || null,
      footerDesc:    map['footer_app_desc']    || null,
      popupEnabled:  map['popup_enabled']      !== 'false',
      popupHeadline: map['popup_headline']     || null,
      popupSubtitle: map['popup_subtitle']     || null,
      iosUrl:        map['app_store_url']      || null,
      playUrl:       map['play_store_url']     || null,
    };

    return new Response(JSON.stringify(payload), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify(fallback), { status: 200, headers });
  }
}
