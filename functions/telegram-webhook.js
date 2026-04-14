export async function onRequest(context) {
    const { request, env } = context;

    // Log every call to KV
    if (env.ADMIN_KV) {
        await env.ADMIN_KV.put('tg_last_call', request.method + ' ' + new Date().toISOString());
    }

    if (request.method !== 'POST') return new Response('OK', { status: 200 });

    let body = '';
    try { body = await request.text(); } catch {}

    if (env.ADMIN_KV) {
        await env.ADMIN_KV.put('tg_last_body', body.slice(0, 500));
    }

    let update;
    try { update = JSON.parse(body); } catch { return new Response('OK', { status: 200 }); }

    const msg = update.message || update.edited_message;
    if (!msg || !msg.text) return new Response('OK', { status: 200 });

    const chatId = msg.chat.id;
    const text = msg.text.trim();

    return new Response(JSON.stringify({
        method: 'sendMessage',
        chat_id: chatId,
        text: 'Echo: ' + text,
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
