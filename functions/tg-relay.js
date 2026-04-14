// Telegram relay: webhook receiver + inbox reader + reply sender
// All Telegram API calls happen on Cloudflare edge (bypasses local firewall)

const SECRET = 'TK-relay-2026';

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    // --- WEBHOOK: Telegram → KV inbox ---
    if (request.method === 'POST' && !action) {
        let body;
        try { body = await request.json(); } catch { return new Response('OK'); }

        const msg = body.message || body.edited_message;
        if (!msg || !msg.text) return new Response('OK');

        // Append to inbox queue
        const existing = await env.ADMIN_KV?.get('tg_inbox', 'json') || [];
        existing.push({
            id: msg.message_id,
            chatId: msg.chat.id,
            user: msg.from?.username || msg.from?.first_name || 'unknown',
            text: msg.text,
            ts: msg.date,
        });
        // Keep last 50 messages only
        const trimmed = existing.slice(-50);
        await env.ADMIN_KV?.put('tg_inbox', JSON.stringify(trimmed));

        return new Response('OK');
    }

    // --- READ inbox (Claude Code polls this) ---
    if (action === 'read') {
        const inbox = await env.ADMIN_KV?.get('tg_inbox', 'json') || [];
        const lastRead = parseInt(await env.ADMIN_KV?.get('tg_last_read') || '0');
        const newMsgs = inbox.filter(m => m.ts > lastRead);

        if (newMsgs.length > 0) {
            const latest = newMsgs[newMsgs.length - 1].ts;
            await env.ADMIN_KV?.put('tg_last_read', String(latest));
        }

        return new Response(JSON.stringify(newMsgs), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // --- SEND reply (Claude Code → Cloudflare → Telegram) ---
    if (action === 'send') {
        const secret = url.searchParams.get('secret');
        if (secret !== SECRET) return new Response('Forbidden', { status: 403 });

        const chatId = url.searchParams.get('to');
        const text = url.searchParams.get('text');
        if (!chatId || !text) return new Response('Missing to/text', { status: 400 });

        const token = await env.ADMIN_KV?.get('tg_bot_token');
        if (!token) return new Response('No token', { status: 500 });

        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text }),
        });
        const data = await res.json();
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // --- REGISTER webhook ---
    if (action === 'setup') {
        const token = await env.ADMIN_KV?.get('tg_bot_token');
        const webhookUrl = new URL(request.url);
        webhookUrl.search = '';
        const setRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: webhookUrl.toString(), drop_pending_updates: true }),
        });
        return new Response(JSON.stringify(await setRes.json()), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response('Telegram relay OK', { status: 200 });
}
