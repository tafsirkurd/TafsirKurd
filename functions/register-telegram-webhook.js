// One-time use: registers the Telegram webhook + sets runtime config
// Usage: /register-telegram-webhook?token=BOT_TOKEN&gemini=GEMINI_KEY

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const token  = url.searchParams.get('token')  || env.TELEGRAM_BOT_TOKEN;
    const gemini = url.searchParams.get('gemini') || env.GEMINI_API_KEY;

    if (!token) {
        return new Response('Pass ?token=YOUR_BOT_TOKEN', { status: 400 });
    }

    const webhookUrl = 'https://tafsirkurd.com/telegram-webhook';

    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
    });

    const data = await res.json();

    // Store keys in KV so telegram-webhook.js can read them
    if (env.ADMIN_KV && token)  await env.ADMIN_KV.put('tg_bot_token',  token);
    if (env.ADMIN_KV && gemini) await env.ADMIN_KV.put('tg_gemini_key', gemini);

    return new Response(JSON.stringify({ webhook: data, kv: 'saved' }, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
