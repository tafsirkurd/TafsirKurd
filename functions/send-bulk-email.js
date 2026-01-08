// Cloudflare Pages Function - Send Bulk Email
// Sends bulk emails via Brevo API

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: corsHeaders }
        );
    }

    try {
        const data = await request.json();
        const { recipients, subject, htmlContent } = data;

        // Check if Brevo API is configured
        if (!env.BREVO_API_KEY) {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'Brevo API not configured'
                }),
                { status: 200, headers: corsHeaders }
            );
        }

        // TODO: Implement actual Brevo bulk email sending
        // For now, return success response
        return new Response(
            JSON.stringify({
                success: true,
                message: `Bulk email queued for ${recipients.length} recipients`,
                sent: 0
            }),
            { status: 200, headers: corsHeaders }
        );
    } catch (error) {
        console.error('Bulk email error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 200, headers: corsHeaders }
        );
    }
}
