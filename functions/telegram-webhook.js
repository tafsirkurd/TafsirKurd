// Cloudflare Pages Function — Telegram ↔ Gemini AI webhook
// Receives messages from Telegram, sends to Gemini, replies back.
//
// Required env secrets:
//   TELEGRAM_BOT_TOKEN        — from BotFather
//   GEMINI_API_KEY            — from aistudio.google.com (free tier)
//   TELEGRAM_WEBHOOK_SECRET   — optional, set when registering webhook

const GEMINI_MODEL = 'gemini-2.0-flash';

const SYSTEM_PROMPT = `You are a helpful assistant for TafsirKurd — a Kurdish Islamic app featuring the Holy Quran with Kurdish Tafsir (interpretation), Islamic voice content, and prayer times. Answer questions about the Quran, Islam, Kurdish culture, and the app. Be respectful, concise, and friendly. If asked in Kurdish (Sorani or Kurmanji), reply in the same language.`;

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method !== 'POST') {
        return new Response('OK', { status: 200 });
    }

    // Verify Telegram webhook secret header
    const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token') || '';
    if (env.TELEGRAM_WEBHOOK_SECRET && secret !== env.TELEGRAM_WEBHOOK_SECRET) {
        return new Response('Unauthorized', { status: 401 });
    }

    let update;
    try {
        update = await request.json();
    } catch {
        return new Response('Bad Request', { status: 400 });
    }

    // Read keys from env or KV fallback
    const token  = env.TELEGRAM_BOT_TOKEN  || (env.ADMIN_KV && await env.ADMIN_KV.get('tg_bot_token'))  || '';
    const gemini = env.GEMINI_API_KEY      || (env.ADMIN_KV && await env.ADMIN_KV.get('tg_gemini_key')) || '';

    if (!token || !gemini) {
        return new Response('OK', { status: 200 });
    }

    const msg = update.message || update.edited_message;
    if (!msg || !msg.text) {
        return new Response('OK', { status: 200 });
    }

    const chatId = msg.chat.id;
    const text   = msg.text.trim();

    if (text === '/start') {
        await sendMessage(token, chatId,
            'سڵاو! 👋 من یاریدەدەری تەفسیر کوردم. پرسیارەکەت بنووسە.\n\nHello! I am the TafsirKurd assistant. Ask me anything!'
        );
        return new Response('OK', { status: 200 });
    }

    if (text.startsWith('/')) {
        return new Response('OK', { status: 200 });
    }

    // Typing indicator
    await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    });

    let reply;
    try {
        reply = await askGemini(gemini, text);
    } catch (e) {
        reply = 'Sorry, I could not process your message right now. Please try again.';
        console.error('Gemini error:', e);
    }

    await sendMessage(token, chatId, reply);

    return new Response('OK', { status: 200 });
}

async function askGemini(apiKey, userMessage) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            generationConfig: { maxOutputTokens: 1024 },
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error('Gemini API ' + res.status + ': ' + err);
    }

    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
}

async function sendMessage(token, chatId, text) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text.slice(0, 4096),
        }),
    });
}
