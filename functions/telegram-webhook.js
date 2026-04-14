export async function onRequest(context) {
    const { request } = context;

    if (request.method !== 'POST') return new Response('OK', { status: 200 });

    let update;
    try { update = await request.json(); } catch { return new Response('OK', { status: 200 }); }

    const msg = update.message || update.edited_message;
    if (!msg) return new Response('OK', { status: 200 });

    const chatId = msg.chat.id;
    const text = msg.text || '(no text)';

    return new Response(JSON.stringify({
        method: 'sendMessage',
        chat_id: chatId,
        text: 'Echo: ' + text,
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
