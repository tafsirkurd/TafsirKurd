// Cloudflare Pages Function - Config Endpoint
// Returns Supabase configuration for client-side use

export async function onRequest(context) {
    const { request, env } = context;

    // Only allow requests from tafsirkurd.com
    const origin = request.headers.get('Origin') || '';
    const referer = request.headers.get('Referer') || '';
    const allowedDomains = ['tafsirkurd.com', 'localhost', '127.0.0.1'];

    // Check Origin first; fall back to Referer when Origin is absent (common on mobile browsers
    // for same-site fetches). The anon key is public-facing so this is a soft guard only.
    const isAllowed = allowedDomains.some(domain => origin.includes(domain) || referer.includes(domain));

    // Allow Capacitor mobile app (origin: capacitor://localhost or https://localhost)
    const isCapacitor = origin === 'capacitor://localhost' || origin === 'https://localhost';

    // Anon key is public-facing — allow all browser requests.
    // Only block obvious non-browser direct access (no headers at all).
    const isDirectAccess = !origin && !referer && !request.headers.get('User-Agent')?.includes('Mozilla');

    if (isDirectAccess) {
        return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const corsHeaders = {
        'Access-Control-Allow-Origin': origin || 'https://tafsirkurd.com',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method !== 'GET') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: corsHeaders }
        );
    }

    try {
        // Clean environment variables - remove any newlines/whitespace that break HTTP headers
        const cleanUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, '');
        const cleanKey = env.SUPABASE_ANON_KEY?.replace(/[\n\r\s]/g, '');

        // Return public configuration (ONLY anon key, NEVER service_role!)
        // YouTube API key is NOT exposed here — proxy YouTube API calls server-side
        const config = {
            supabaseUrl: cleanUrl,
            supabaseKey: cleanKey
        };

        // Prayer cache version — if admin bumps this in site_settings,
        // all app clients will purge their prayer caches on next startup.
        try {
            const supabase = (await import('@supabase/supabase-js'))
                .createClient(cleanUrl, env.SUPABASE_SERVICE_ROLE_KEY,
                    { auth: { autoRefreshToken: false, persistSession: false } });
            const { data: verRow } = await supabase
                .from('site_settings').select('value').eq('key', 'prayer_cache_version').single();
            if (verRow && verRow.value) config.prayerCacheVersion = verRow.value;
        } catch(e) {
            // Non-critical — app uses its own default if missing
        }

        if (!config.supabaseUrl || !config.supabaseKey) {
            console.error('Missing Supabase environment variables');
            return new Response(
                JSON.stringify({ error: 'Server configuration error' }),
                { status: 500, headers: corsHeaders }
            );
        }

        return new Response(
            JSON.stringify(config),
            { status: 200, headers: corsHeaders }
        );
    } catch (error) {
        console.error('Config error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: corsHeaders }
        );
    }
}
