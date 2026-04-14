// Cloudflare Pages Function — Telegram ↔ Groq AI webhook
// Uses webhook reply method (returns JSON response) instead of outbound API calls

const GROQ_MODEL = 'llama-3.1-8b-instant';

const SYSTEM_PROMPT = `You are a helpful assistant for TafsirKurd — a Kurdish Islamic app featuring the Holy Quran with Kurdish Tafsir (interpretation), Islamic voice content, and prayer times. Answer questions about the Quran, Islam, Kurdish culture, and the app. Be respectful, concise, and friendly. If asked in Kurdish (Sorani or Kurmanji), reply in the same language.`;

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method !== 'POST') return new Response('OK', { status: 200 });

    let update;
    try { update = await request.json(); } catch { return new Response('OK', { status: 200 }); }

    const msg = update.message || update.edited_message;
    if (!msg || !msg.text) return new Response('OK', { status: 200 });

    const chatId = msg.chat.id;
    const text   = msg.text.trim();

    const groq = env.GROQ_API_KEY || (env.ADMIN_KV && await env.ADMIN_KV.get('tg_groq_key')) || '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';

    if (text === '/start') {
        return tgReply(chatId, 'سڵاو! 👋 من یاریدەدەری تەفسیر کوردم. پرسیارەکەت بنووسە.\n\nHello! I am the TafsirKurd assistant. Ask me anything!');
    }
    if (text.startsWith('/')) return new Response('OK', { status: 200 });

    let reply;
    try {
        reply = await askGroq(groq, text);
    } catch (e) {
        reply = 'Sorry, could not process your message. Please try again.';
    }

    return tgReply(chatId, reply);
}

// Returns reply directly in response body — no outbound fetch needed
function tgReply(chatId, text) {
    return new Response(JSON.stringify({
        method: 'sendMessage',
        chat_id: chatId,
        text: text.slice(0, 4096),
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
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
    if (!res.ok) throw new Error('Groq ' + res.status);
    const data = await res.json();
    return data.choices[0].message.content;
}
