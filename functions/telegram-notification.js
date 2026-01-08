// Cloudflare Pages Function - Telegram Notifications
// Sends notifications to Telegram bot

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
        const { message } = data;

        // Check if Telegram bot is configured
        if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'Telegram bot not configured'
                }),
                { status: 200, headers: corsHeaders }
            );
        }

        // Send to Telegram
        const telegramResponse = await fetch(
            `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: env.TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'HTML'
                })
            }
        );

        if (!telegramResponse.ok) {
            throw new Error('Telegram API failed');
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Telegram notification sent'
            }),
            { status: 200, headers: corsHeaders }
        );
    } catch (error) {
        console.error('Telegram notify error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 200, headers: corsHeaders }
        );
    }
}
