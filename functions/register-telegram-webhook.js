// One-time use: registers the Telegram webhook from Cloudflare's servers
// Visit /register-telegram-webhook once, then this file can be deleted

export async function onRequest(context) {
    const { env } = context;

    const webhookUrl = 'https://tafsirkurd.com/telegram-webhook';
    const token = env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        return new Response('TELEGRAM_BOT_TOKEN not set', { status: 500 });
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
