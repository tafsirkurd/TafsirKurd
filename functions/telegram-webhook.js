// Cloudflare Pages Function — Telegram ↔ Claude AI webhook
// Receives messages from Telegram, sends to Claude, replies back.
//
// Required env secrets:
//   TELEGRAM_BOT_TOKEN  — from BotFather
//   TELEGRAM_WEBHOOK_SECRET — random string you set when registering webhook
//   ANTHROPIC_API_KEY   — from console.anthropic.com

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'; // fast + cheap for chat

const SYSTEM_PROMPT = `You are a helpful assistant for TafsirKurd — a Kurdish Islamic app featuring the Holy Quran with Kurdish Tafsir (interpretation), Islamic voice content, and prayer times. Answer questions about the Quran, Islam, Kurdish culture, and the app. Be respectful, concise, and friendly. If asked in Kurdish (Sorani or Kurmanji), reply in the same language.`;

export async function onRequest(context) {
    const { request, env } = context;

    // Telegram sends POST only
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

    // Only handle text messages
    const msg = update.message || update.edited_message;
    if (!msg || !msg.text) {
        return new Response('OK', { status: 200 });
    }

    const chatId = msg.chat.id;
    const text   = msg.text.trim();

    // Ignore bot commands except /start
    if (text.startsWith('/') && text !== '/start') {
        return new Response('OK', { status: 200 });
    }

    // /start greeting
    if (text === '/start') {
        await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId,
            'سڵاو! 👋 Ez alîkarê TafsirKurd im. Ji min bipirse.\n\nبە خێرهاتیت! من یاریدەدەری تەفسیر کوردم. پرسیارەکەت بنووسە.'
        );
        return new Response('OK', { status: 200 });
    }

    // Send typing indicator
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    });

    // Call Claude
    let reply;
    try {
        reply = await askClaude(env.ANTHROPIC_API_KEY, text);
    } catch (e) {
        reply = 'Sorry, I could not process your message right now. Please try again.';
        console.error('Claude error:', e);
    }

    // Send reply back to Telegram
    await sendMessage(env.TELEGRAM_BOT_TOKEN, chatId, reply);

    return new Response('OK', { status: 200 });
}

async function askClaude(apiKey, userMessage) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: CLAUDE_MODEL,
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userMessage }],
        }),
    });

    if (!res.ok) {
        throw new Error('Anthropic API ' + res.status);
    }

    const data = await res.json();
    return data.content[0].text;
}

async function sendMessage(token, chatId, text) {
    // Telegram message limit is 4096 chars
    const chunk = text.slice(0, 4096);
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: chunk,
            parse_mode: 'Markdown',
        }),
    });
}
