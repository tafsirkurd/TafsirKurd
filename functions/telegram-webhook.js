export async function onRequest(context) {
    const { request, env } = context;
    if (request.method !== 'POST') return new Response('OK', { status: 200 });

    let body;
    try { body = await request.json(); } catch { return new Response('OK'); }

    const msg = body.message || body.edited_message;
    if (!msg || !msg.text) return new Response('OK');

    const chatId = msg.chat.id;
    const text = msg.text.trim();

    const groqKey   = env.ADMIN_KV ? await env.ADMIN_KV.get('tg_groq_key')   : null;
    const geminiKey = env.ADMIN_KV ? await env.ADMIN_KV.get('tg_gemini_key') : null;

    // /start
    if (text.startsWith('/start')) {
        return tgReply(chatId,
            '👋 سڵاو! من بۆتی TafsirKurd ئەم.\n\n' +
            'فەرمانەکان:\n' +
            '/groq [نووسین] — Groq AI (بەپێشەوەی)\n' +
            '/gemini [نووسین] — Google Gemini\n\n' +
            'یان ڕاستەوخۆ بنووسە، Groq وەڵامت دەداتەوە.'
        );
    }

    const SYSTEM =
        'تۆ یاریدەدەری زیرەک و بەکەڵکی ماڵپەڕی TafsirKurd ئەی. ' +
        'ئەگەر بەکارهێنەر بە کوردی سۆرانی نووسی، بە کوردی سۆرانی وەڵام بدەرەوە. ' +
        'ئەگەر بە ئینگلیزی یان زمانێکی تر نووسی، بە هەمان زمان وەڵام بدەرەوە. ' +
        'وەڵامەکانت کورت و ڕوون و بەسوود بن.';

    let useAI = 'groq';
    let userMsg = text;

    if (text.startsWith('/groq ') || text.startsWith('/groq\n')) {
        userMsg = text.slice(6).trim();
        useAI = 'groq';
    } else if (text === '/groq') {
        return tgReply(chatId, 'بنووسە: /groq [پرسیارەکەت]');
    } else if (text.startsWith('/gemini ') || text.startsWith('/gemini\n')) {
        userMsg = text.slice(8).trim();
        useAI = 'gemini';
    } else if (text === '/gemini') {
        return tgReply(chatId, 'بنووسە: /gemini [پرسیارەکەت]');
    }

    let reply;
    if (useAI === 'gemini' && geminiKey) {
        reply = await callGemini(geminiKey, SYSTEM, userMsg);
    } else if (groqKey) {
        reply = await callGroq(groqKey, SYSTEM, userMsg);
    } else {
        reply = 'API key not configured. Visit /tg-debug to set up.';
    }

    return tgReply(chatId, reply);
}

function tgReply(chatId, text) {
    return new Response(JSON.stringify({ method: 'sendMessage', chat_id: chatId, text }), {
        headers: { 'Content-Type': 'application/json' },
    });
}

async function callGroq(key, system, msg) {
    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                max_tokens: 1000,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: msg },
                ],
            }),
        });
        const data = await res.json();
        return res.ok ? data.choices[0].message.content : 'Groq error: ' + (data.error?.message || JSON.stringify(data));
    } catch (e) { return 'Error: ' + e.message; }
}

async function callGemini(key, system, msg) {
    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: system }] },
                    contents: [{ role: 'user', parts: [{ text: msg }] }],
                }),
            }
        );
        const data = await res.json();
        return res.ok
            ? data.candidates[0].content.parts[0].text
            : 'Gemini error: ' + (data.error?.message || JSON.stringify(data));
    } catch (e) { return 'Error: ' + e.message; }
}
