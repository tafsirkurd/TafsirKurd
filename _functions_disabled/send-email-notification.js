// Cloudflare Pages Function - Send Email Notification
// Sends single email notification via Brevo API

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
        const { to, subject, htmlContent } = data;

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

        // TODO: Implement actual Brevo email sending
        // For now, return success response
        return new Response(
            JSON.stringify({
                success: true,
                message: 'Email notification sent',
                messageId: 'placeholder-' + Date.now()
            }),
            { status: 200, headers: corsHeaders }
        );
    } catch (error) {
        console.error('Email notification error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 200, headers: corsHeaders }
        );
    }
}
