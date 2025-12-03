// Check if IP is owner (server-side only)
exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // Owner IPs stored securely on server
        const OWNER_IPS = [
            '185.136.148.162',
            '185.84.71.147',
            '185.136.148.130'
        ];

        // Get client IP from various headers (prioritize Cloudflare)
        const clientIP = event.headers['cf-connecting-ip'] ||           // Cloudflare real IP (highest priority)
                        event.headers['x-real-ip'] ||                  // Real IP header
                        event.headers['x-nf-client-connection-ip'] ||  // Netlify client IP
                        event.headers['x-forwarded-for']?.split(',')[0]?.trim() || // First IP in chain
                        event.headers['client-ip'];

        console.log('Check owner - Detected IP:', clientIP);

        const isOwner = OWNER_IPS.includes(clientIP);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                isOwner,
                // Don't send IP back for security
            })
        };
    } catch (error) {
        console.error('Check owner error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                isOwner: false,
                error: 'Server error'
            })
        };
    }
};
