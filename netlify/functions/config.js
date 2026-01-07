// Netlify Function - Config Endpoint
// Returns Supabase configuration for client-side use

exports.handler = async (event, context) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    // Only allow GET
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Return public Supabase configuration (ONLY anon key, NEVER service_role!)
        const config = {
            supabaseUrl: process.env.SUPABASE_URL,
            supabaseKey: process.env.SUPABASE_ANON_KEY
        };

        // Log what we're getting from env (for debugging)
        console.log('Environment check:', {
            hasUrl: !!process.env.SUPABASE_URL,
            hasKey: !!process.env.SUPABASE_ANON_KEY,
            keyPrefix: process.env.SUPABASE_ANON_KEY?.substring(0, 50) + '...'
        });

        // Validate environment variables exist
        if (!config.supabaseUrl || !config.supabaseKey) {
            console.error('Missing Supabase environment variables');
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Server configuration error' })
            };
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(config)
        };

    } catch (error) {
        console.error('Config error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
