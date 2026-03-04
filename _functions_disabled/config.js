// Cloudflare Pages Function - Config Endpoint
// Returns Supabase configuration for client-side use

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
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

        // Return public Supabase configuration (ONLY anon key, NEVER service_role!)
        const config = {
            supabaseUrl: cleanUrl,
            supabaseKey: cleanKey
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
