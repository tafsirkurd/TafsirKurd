export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const kvToken = env.ADMIN_KV ? await env.ADMIN_KV.get('tg_bot_token') : null;

    if (!kvToken) return new Response('No token in KV', { status: 400 });

    let result = {};

    if (action === 'del') {
        const res = await fetch(`https://api.telegram.org/bot${kvToken}/deleteWebhook?drop_pending_updates=true`);
        result = await res.json();
    } else {
        const res = await fetch(`https://api.telegram.org/bot${kvToken}/getWebhookInfo`);
        result = await res.json();
    }

    return new Response(JSON.stringify(result, null, 2), {
        headers: { 'Content-Type': 'application/json' },
    });
}
