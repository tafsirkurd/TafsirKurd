// Enhanced config.js with better security
const {
    checkRateLimit,
    getClientIP,
    getSecureHeaders,
    logSecurityEvent
} = require('./utils/security');

exports.handler = async (event, context) => {
    // Set CORS headers with origin validation
    const requestOrigin = event.headers.origin || event.headers.referer;
    const headers = getSecureHeaders(requestOrigin);

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Rate limiting - 50 requests per minute per IP
    const clientIP = getClientIP(event);
    if (checkRateLimit(clientIP, 50, 60000)) {
        logSecurityEvent(event, 'Config rate limit exceeded', 'warning');
        return {
            statusCode: 429,
            headers,
            body: JSON.stringify({
                error: 'Too many requests. Please try again later.'
            })
        };
    }

    try {
        // Return public Supabase configuration
        const config = {
            supabaseUrl: process.env.SUPABASE_URL,
            supabaseKey: process.env.SUPABASE_ANON_KEY
        };

        // Validate that required environment variables exist
        if (!config.supabaseUrl || !config.supabaseKey) {
            console.error('Missing required environment variables');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Server configuration error' })
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(config)
        };
    } catch (error) {
        // Log error without exposing sensitive details
        console.error('Config function error:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};