// One-time use: registers the Telegram webhook from Cloudflare's servers
// Usage: /register-telegram-webhook?token=YOUR_BOT_TOKEN

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const token = url.searchParams.get('token') || env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        return new Response('Pass ?token=YOUR_BOT_TOKEN in the URL', { status: 400 });
    }

    const webhookUrl = 'https://tafsirkurd.com/telegram-webhook';

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
