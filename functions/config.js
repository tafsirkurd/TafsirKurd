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
        // Return public Supabase configuration (ONLY anon key, NEVER service_role!)
        const config = {
            supabaseUrl: env.SUPABASE_URL,
            supabaseKey: env.SUPABASE_ANON_KEY
        };

        console.log('Environment check:', {
            hasUrl: !!env.SUPABASE_URL,
            hasKey: !!env.SUPABASE_ANON_KEY,
            keyPrefix: env.SUPABASE_ANON_KEY?.substring(0, 50) + '...'
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
