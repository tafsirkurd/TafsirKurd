// Cloudflare Pages Function - Discord Notifications
// Sends notifications to Discord webhook

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
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
        let body;
        try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders }); }
        const { message, type = 'info' } = body;
        if (!message || typeof message !== 'string') {
            return new Response(JSON.stringify({ error: 'message is required' }), { status: 400, headers: corsHeaders });
        }

        // Enforce allowed types and message length to limit abuse
        const ALLOWED_TYPES = ['new_user', 'new_message', 'info', 'success', 'error'];
        const safeType = ALLOWED_TYPES.includes(type) ? type : 'info';
        const safeMessage = String(message).slice(0, 500);

        // Check if Discord webhook is configured
        if (!env.DISCORD_WEBHOOK_URL) {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'Discord webhook not configured'
                }),
                { status: 200, headers: corsHeaders }
            );
        }

        // Send to Discord
        const webhookResponse = await fetch(env.DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: safeMessage,
                embeds: [{
                    description: safeMessage,
                    color: safeType === 'error' ? 15158332 : safeType === 'success' ? 3066993 : 3447003,
                    timestamp: new Date().toISOString()
                }]
            })
        });

        if (!webhookResponse.ok) {
            throw new Error('Discord webhook failed');
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Discord notification sent'
            }),
            { status: 200, headers: corsHeaders }
        );
    } catch (error) {
        console.error('Discord notify error:', error);
        return new Response(
            JSON.stringify({ success: false, error: 'Internal server error' }),
            { status: 500, headers: corsHeaders }
        );
    }
}
