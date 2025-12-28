/**
 * Secure Auth Configuration Endpoint
 * Serves Supabase credentials from environment variables
 * Only allows same-origin requests
 */

exports.handler = async (event, context) => {
    // Security: Only allow same-origin requests
    const allowedOrigins = [
        'https://tafsirkurd.com',
        'https://www.tafsirkurd.com',
        'http://localhost:8000',
        'http://localhost:8888'
    ];

    const origin = event.headers.origin || event.headers.referer;
    const isAllowedOrigin = allowedOrigins.some(allowed => origin && origin.includes(allowed));

    if (!isAllowedOrigin) {
        return {
            statusCode: 403,
            body: JSON.stringify({ error: 'Forbidden' })
        };
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Get credentials from environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    // Validate credentials exist
    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing Supabase credentials in environment variables');
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error' })
        };
    }

    // Return credentials with CORS headers
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin || '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        },
        body: JSON.stringify({
            supabaseUrl,
            supabaseAnonKey
        })
    };
};
