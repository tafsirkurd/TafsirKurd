// Netlify Function to get client IP address
// This is more reliable than client-side IP detection

exports.handler = async (event, context) => {
    try {
        // Netlify automatically provides the client IP in headers
        const clientIP = event.headers['x-nf-client-connection-ip'] ||
                        event.headers['x-forwarded-for'] ||
                        event.headers['client-ip'] ||
                        context.clientContext?.identity?.claims?.sub ||
                        'Unknown';

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({
                ip: clientIP,
                success: true
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: error.message,
                success: false
            })
        };
    }
};
