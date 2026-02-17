// Cloudflare Pages Function - App Translations Endpoint
// Returns translations for Android/iOS apps as flat JSON { "key": "value" }

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const platform = url.searchParams.get('platform') || 'android';

    const origin = request.headers.get('Origin') || '';
    const referer = request.headers.get('Referer') || '';
    const allowedDomains = ['tafsirkurd.com', 'localhost', '127.0.0.1'];
    const isAllowed = allowedDomains.some(d => origin.includes(d) || referer.includes(d));
    const isCapacitor = origin === 'capacitor://localhost' || origin === 'https://localhost';

    if (!isAllowed && !isCapacitor) {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const corsHeaders = {
        'Access-Control-Allow-Origin': origin || 'https://tafsirkurd.com',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, '');
        const supabaseKey = env.SUPABASE_ANON_KEY?.replace(/[\n\r\s]/g, '');

        if (!supabaseUrl || !supabaseKey) {
            return new Response(JSON.stringify({ error: 'Config error' }), {
                status: 500, headers: corsHeaders
            });
        }

        // Fetch all translations for this platform
        const res = await fetch(
            `${supabaseUrl}/rest/v1/kurdish_translations?page=eq.${platform}&select=key_id,kurdish_text`,
            {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            }
        );

        if (!res.ok) {
            return new Response(JSON.stringify({ error: 'DB error' }), {
                status: 502, headers: corsHeaders
            });
        }

        const rows = await res.json();

        // Convert to flat { "key": "value" } format for i18n.js
        const translations = {};
        for (const row of rows) {
            translations[row.key_id] = row.kurdish_text;
        }

        return new Response(JSON.stringify(translations), {
            status: 200, headers: corsHeaders
        });
    } catch (error) {
        console.error('app-translations error:', error);
        return new Response(JSON.stringify({ error: 'Internal error' }), {
            status: 500, headers: corsHeaders
        });
    }
}
