// Cloudflare Pages Function - Test Brevo Email
// Sends test email via Brevo API

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
        const { email } = data;

        // Check if Brevo API is configured
        if (!env.BREVO_API_KEY) {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'Brevo API key not configured in environment variables'
                }),
                { status: 200, headers: corsHeaders }
            );
        }

        // TODO: Implement actual Brevo test email sending
        // For now, return success response
        return new Response(
            JSON.stringify({
                success: true,
                message: `Test email would be sent to ${email}`,
                note: 'Brevo API integration pending'
            }),
            { status: 200, headers: corsHeaders }
        );
    } catch (error) {
        console.error('Test email error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 200, headers: corsHeaders }
        );
    }
}
