export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const groq  = url.searchParams.get('groq');
    const testMsg = url.searchParams.get('test');
    const checkWebhook = url.searchParams.get('webhook');

    if (env.ADMIN_KV) {
        if (token) await env.ADMIN_KV.put('tg_bot_token', token);
        if (groq)  await env.ADMIN_KV.put('tg_groq_key',  groq);
    }

    const kvToken = env.ADMIN_KV ? await env.ADMIN_KV.get('tg_bot_token') : null;
    const kvGroq  = env.ADMIN_KV ? await env.ADMIN_KV.get('tg_groq_key')  : null;

    // Check or set webhook
    let webhookInfo = null;
    if (checkWebhook && kvToken) {
        const res = await fetch(`https://api.telegram.org/bot${kvToken}/getWebhookInfo`);
        webhookInfo = await res.json();
    }

    // Simulate a Telegram message to our own webhook
    let webhookTest = null;
    if (testMsg && kvToken) {
        const fakeUpdate = {
            update_id: 1,
            message: { message_id: 1, chat: { id: 5737599664, type: 'private' }, from: { id: 5737599664 }, text: testMsg, date: Date.now() }
        };
        const res = await fetch('https://tafsirkurd.com/telegram-webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fakeUpdate),
        });
        webhookTest = 'webhook status: ' + res.status + ' ' + await res.text();
    }

    // Test Groq
    let groqTest = null;
    if (testMsg && kvGroq) {
        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + kvGroq },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    max_tokens: 100,
                    messages: [{ role: 'user', content: testMsg }],
                }),
            });
            const data = await res.json();
            groqTest = res.ok ? data.choices[0].message.content : JSON.stringify(data);
        } catch(e) { groqTest = 'Error: ' + e.message; }
    }

    return new Response(JSON.stringify({
        hasKV: !!env.ADMIN_KV,
        kvToken: kvToken ? kvToken.slice(0, 15) + '...' : null,
        kvGroq:  kvGroq  ? kvGroq.slice(0, 10)  + '...' : null,
        webhookInfo,
        webhookTest,
        groqTest,
    }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}
