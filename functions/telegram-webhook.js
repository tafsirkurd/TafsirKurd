// Cloudflare Pages Function — Telegram ↔ Groq AI webhook
// Receives messages from Telegram, sends to Groq (free), replies back.
//
// Keys stored in ADMIN_KV:
//   tg_bot_token  — Telegram bot token
//   tg_groq_key   — Groq API key (free at console.groq.com)

const GROQ_MODEL = 'llama-3.1-8b-instant';

const SYSTEM_PROMPT = `You are a helpful assistant for TafsirKurd — a Kurdish Islamic app featuring the Holy Quran with Kurdish Tafsir (interpretation), Islamic voice content, and prayer times. Answer questions about the Quran, Islam, Kurdish culture, and the app. Be respectful, concise, and friendly. If asked in Kurdish (Sorani or Kurmanji), reply in the same language.`;

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method !== 'POST') {
        return new Response('OK', { status: 200 });
    }

    let update;
    try { update = await request.json(); } catch { return new Response('OK', { status: 200 }); }

    const token = env.TELEGRAM_BOT_TOKEN || (env.ADMIN_KV && await env.ADMIN_KV.get('tg_bot_token')) || '';
    const groq  = env.GROQ_API_KEY       || (env.ADMIN_KV && await env.ADMIN_KV.get('tg_groq_key'))  || '';

    if (!token || !groq) return new Response('OK', { status: 200 });

    const msg = update.message || update.edited_message;
    if (!msg || !msg.text) return new Response('OK', { status: 200 });

    const chatId = msg.chat.id;
    const text   = msg.text.trim();

    if (text === '/start') {
        await sendMessage(token, chatId, 'سڵاو! 👋 من یاریدەدەری تەفسیر کوردم. پرسیارەکەت بنووسە.\n\nHello! I am the TafsirKurd assistant. Ask me anything!');
        return new Response('OK', { status: 200 });
    }
    if (text.startsWith('/')) return new Response('OK', { status: 200 });

    await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    });

    let reply;
    try {
        reply = await askGroq(groq, text);
    } catch (e) {
        reply = 'Sorry, I could not process your message right now. Please try again.';
        console.error('Groq error:', e);
    }

    await sendMessage(token, chatId, reply);
    return new Response('OK', { status: 200 });
}

async function askGroq(apiKey, userMessage) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            max_tokens: 1024,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user',   content: userMessage },
            ],
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error('Groq API ' + res.status + ': ' + err);
    }

    const data = await res.json();
    return data.choices[0].message.content;
}

async function sendMessage(token, chatId, text) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4096) }),
    });
}
