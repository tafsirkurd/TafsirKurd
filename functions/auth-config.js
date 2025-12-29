// Migrated from Netlify to Cloudflare Pages
// Original: netlify/functions/auth-config.js

/**
 * Secure Auth Configuration Endpoint
 * Serves Supabase credentials from environment variables
 * Only allows same-origin requests
 */

export async function onRequest(context) {
    const { request, env } = context;
    // Security: Only allow same-origin requests
    const allowedOrigins = [
        'https://tafsirkurd.com',
        'https://www.tafsirkurd.com',
        'http://localhost:8000',
        'http://localhost:8888'
    ];

    const origin = Object.fromEntries(request.headers).origin || Object.fromEntries(request.headers).referer;
    const isAllowedOrigin = allowedOrigins.some(allowed => origin && origin.includes(allowed));

    if (!isAllowedOrigin) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { "Content-Type": "application/json" } });
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { "Content-Type": "application/json" } });
    }

    // Get credentials from environment variables
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseAnonKey = env.SUPABASE_ANON_KEY;

    // Validate credentials exist
    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing Supabase credentials in environment variables');
        return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    // Return credentials with CORS headers
    return new Response(JSON.stringify({
        supabaseUrl,
        supabaseAnonKey
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin || '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    });
}
