// Cloudflare Pages Function - Config Endpoint
// Returns Supabase configuration for client-side use

export async function onRequest(context) {
    const { request, env } = context;

    // Only allow requests from tafsirkurd.com
    const origin = request.headers.get('Origin') || '';
    const referer = request.headers.get('Referer') || '';
    const allowedDomains = ['tafsirkurd.com', 'localhost', '127.0.0.1'];

    const isAllowed = allowedDomains.some(domain =>
        origin.includes(domain) || referer.includes(domain)
    );

    // Block direct browser access (no origin/referer = someone typing URL directly)
    const isDirectAccess = !origin && !referer;

    if (!isAllowed || isDirectAccess) {
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
        const youtubeKey = env.YOUTUBE_API_KEY?.replace(/[\n\r\s]/g, '');

        // Return public configuration (ONLY anon key, NEVER service_role!)
        const config = {
            supabaseUrl: cleanUrl,
            supabaseKey: cleanKey,
            youtubeApiKey: youtubeKey || null
        };

        console.log('Environment check:', {
            hasUrl: !!cleanUrl,
            hasKey: !!cleanKey,
            keyPrefix: cleanKey?.substring(0, 50) + '...',
            hadNewlines: env.SUPABASE_ANON_KEY?.includes('\n')
        });

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
