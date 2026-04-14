// Telegram relay: webhook receiver + inbox + Groq AI fallback
// When Claude Code is active → saves to inbox for Claude to handle
// When Claude Code is away  → Groq AI replies immediately

const SECRET = 'TK-relay-2026';
const HEARTBEAT_TTL = 120; // seconds — if no heartbeat, Claude Code is away

const SYSTEM =
    'You are a helpful AI assistant for TafsirKurd website. ' +
    'Always reply in English only, regardless of what language the user writes in. ' +
    'Keep your answers short, clear, and helpful.';

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    // --- WEBHOOK: Telegram → decides: inbox or Groq ---
    if (request.method === 'POST' && !action) {
        let body;
        try { body = await request.json(); } catch { return new Response('OK'); }

        const msg = body.message || body.edited_message;
        if (!msg || !msg.text) return new Response('OK');

        const chatId = msg.chat.id;
        const text = msg.text.trim();
        const token = await env.ADMIN_KV?.get('tg_bot_token');

        // If /groq command — reply with Groq immediately, don't queue
        if (text.startsWith('/groq')) {
            const userMsg = text.slice(5).trim();
            if (!userMsg) return sendTg(token, chatId, 'Usage: /groq <your message>');
            const groqKey = await env.ADMIN_KV?.get('tg_groq_key');
            if (!groqKey) return new Response('OK');
            const reply = await callGroq(groqKey, userMsg);
            return sendTg(token, chatId, reply);
        }

        // Otherwise save to inbox for Claude Code to handle
        const existing = await env.ADMIN_KV?.get('tg_inbox', 'json') || [];
        existing.push({
            id: msg.message_id,
            chatId,
            user: msg.from?.username || msg.from?.first_name || 'unknown',
            text,
            ts: msg.date,
        });
        await env.ADMIN_KV?.put('tg_inbox', JSON.stringify(existing.slice(-50)));

        // Check if Claude Code is away — fallback to Groq
        const heartbeat = parseInt(await env.ADMIN_KV?.get('tg_heartbeat') || '0');
        const now = Math.floor(Date.now() / 1000);
        const claudeAway = (now - heartbeat) > HEARTBEAT_TTL;

        if (claudeAway) {
            const groqKey = await env.ADMIN_KV?.get('tg_groq_key');
            if (!groqKey || !token) return new Response('OK');
            const reply = await callGroq(groqKey, text);
            return sendTg(token, chatId, reply);
        }

        return new Response('OK');
    }

    // --- HEARTBEAT (Claude Code pings this to say "I'm alive") ---
    if (action === 'ping') {
        const now = Math.floor(Date.now() / 1000);
        await env.ADMIN_KV?.put('tg_heartbeat', String(now));
        return new Response('OK');
    }

    // --- READ inbox ---
    if (action === 'read') {
        // Also write heartbeat when Claude Code reads
        const now = Math.floor(Date.now() / 1000);
        await env.ADMIN_KV?.put('tg_heartbeat', String(now));

        const inbox = await env.ADMIN_KV?.get('tg_inbox', 'json') || [];
        const lastRead = parseInt(await env.ADMIN_KV?.get('tg_last_read') || '0');
        const newMsgs = inbox.filter(m => m.ts > lastRead);

        if (newMsgs.length > 0) {
            await env.ADMIN_KV?.put('tg_last_read', String(newMsgs[newMsgs.length - 1].ts));
        }

        return new Response(JSON.stringify(newMsgs), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // --- SEND reply ---
    if (action === 'send') {
        if (url.searchParams.get('secret') !== SECRET)
            return new Response('Forbidden', { status: 403 });

        const chatId = url.searchParams.get('to');
        const text = url.searchParams.get('text');
        if (!chatId || !text) return new Response('Missing params', { status: 400 });

        const token = await env.ADMIN_KV?.get('tg_bot_token');
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text }),
        });
        return new Response(JSON.stringify(await res.json()), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // --- SETUP webhook ---
    if (action === 'setup') {
        const token = await env.ADMIN_KV?.get('tg_bot_token');
        const webhookUrl = new URL(request.url);
        webhookUrl.search = '';
        const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: webhookUrl.toString(), drop_pending_updates: true }),
        });
        return new Response(JSON.stringify(await res.json()), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response('Telegram relay OK', { status: 200 });
}

function sendTg(token, chatId, text) {
    return new Response(JSON.stringify({ method: 'sendMessage', chat_id: chatId, text }), {
        headers: { 'Content-Type': 'application/json' },
    });
}

async function callGroq(key, msg) {
    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                max_tokens: 1000,
                messages: [
                    { role: 'system', content: SYSTEM },
                    { role: 'user', content: msg },
                ],
            }),
        });
        const data = await res.json();
        return res.ok ? data.choices[0].message.content : 'Error: ' + data.error?.message;
    } catch (e) { return 'Error: ' + e.message; }
}
