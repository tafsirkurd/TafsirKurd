// Cloudflare Pages Function - Config Endpoint
// Returns Supabase configuration for client-side use

export async function onRequest(context) {
    const { request, env } = context;

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Only allow GET
    if (request.method !== 'GET') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: corsHeaders }
        );
    }

    try {
        // Return public Supabase configuration (ONLY anon key, NEVER service_role!)
        const config = {
            supabaseUrl: env.SUPABASE_URL || 'https://nvwgepkhzobgwnzibpvq.supabase.co',
            supabaseKey: env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52d2dlcGtoemJiZ3duemljcHZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzMTY4MDEsImV4cCI6MjA0ODg5MjgwMX0.t6m69JNYhqJsEDjVNvpNwVIlPbxp3HHhx5QL3EqSlOU'
        };

        // Validate environment variables exist
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
