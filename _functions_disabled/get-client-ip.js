// Cloudflare Pages Function - Get Client IP
// Returns the client's IP address

export async function onRequest(context) {
    const { request } = context;

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
        // Get client IP from Cloudflare headers
        const clientIP = request.headers.get('CF-Connecting-IP') ||
                        request.headers.get('X-Forwarded-For') ||
                        request.headers.get('X-Real-IP') ||
                        '0.0.0.0';

        return new Response(
            JSON.stringify({
                ip: clientIP,
                timestamp: new Date().toISOString()
            }),
            { status: 200, headers: corsHeaders }
        );
    } catch (error) {
        console.error('Get client IP error:', error);
        return new Response(
            JSON.stringify({
                ip: '0.0.0.0',
                error: error.message
            }),
            { status: 200, headers: corsHeaders }
        );
    }
}
