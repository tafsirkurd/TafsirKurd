// Cloudflare Pages Function - Brevo Email Statistics
// Returns email campaign statistics

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
        // TODO: Integrate with Brevo API
        // For now, return placeholder data
        return new Response(
            JSON.stringify({
                success: true,
                data: {
                    sent: 0,
                    delivered: 0,
                    opened: 0,
                    clicked: 0,
                    bounced: 0,
                    unsubscribed: 0
                },
                message: 'Brevo integration not configured'
            }),
            { status: 200, headers: corsHeaders }
        );
    } catch (error) {
        console.error('Brevo stats error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
                data: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 }
            }),
            { status: 200, headers: corsHeaders }
        );
    }
}
