// Netlify Function to get client IP address
// This is more reliable than client-side IP detection

exports.handler = async (event, context) => {
    try {
        // Priority order for getting real client IP (especially behind Cloudflare)
        let clientIP =
            event.headers['cf-connecting-ip'] ||           // Cloudflare real IP (highest priority)
            event.headers['x-real-ip'] ||                  // Real IP header
            event.headers['x-nf-client-connection-ip'] ||  // Netlify client IP
            event.headers['x-forwarded-for']?.split(',')[0]?.trim() || // First IP in forwarded chain
            event.headers['client-ip'] ||
            'Unknown';

        // Debug: log all headers to help troubleshoot
        console.log('Headers:', {
            'cf-connecting-ip': event.headers['cf-connecting-ip'],
            'x-real-ip': event.headers['x-real-ip'],
            'x-nf-client-connection-ip': event.headers['x-nf-client-connection-ip'],
            'x-forwarded-for': event.headers['x-forwarded-for'],
            'client-ip': event.headers['client-ip']
        });
        console.log('Detected IP:', clientIP);

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
