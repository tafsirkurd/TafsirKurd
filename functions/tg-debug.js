export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const token   = url.searchParams.get('token');
    const groq    = url.searchParams.get('groq');
    const gemini  = url.searchParams.get('gemini');
    const webhook = url.searchParams.get('webhook'); // 'set' or 'del'
    const testMsg = url.searchParams.get('test');

    if (env.ADMIN_KV) {
        if (token)  await env.ADMIN_KV.put('tg_bot_token',  token);
        if (groq)   await env.ADMIN_KV.put('tg_groq_key',   groq);
        if (gemini) await env.ADMIN_KV.put('tg_gemini_key', gemini);
    }

    const kvToken  = env.ADMIN_KV ? await env.ADMIN_KV.get('tg_bot_token')  : null;
    const kvGroq   = env.ADMIN_KV ? await env.ADMIN_KV.get('tg_groq_key')   : null;
    const kvGemini = env.ADMIN_KV ? await env.ADMIN_KV.get('tg_gemini_key') : null;

    let webhookInfo = null;
    if (webhook === 'set' && kvToken) {
        const setRes = await fetch(`https://api.telegram.org/bot${kvToken}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'https://tafsirkurd.com/telegram-webhook', drop_pending_updates: true }),
        });
        const infoRes = await fetch(`https://api.telegram.org/bot${kvToken}/getWebhookInfo`);
        webhookInfo = { action: 'set', result: await setRes.json(), info: await infoRes.json() };
    } else if (webhook === 'del' && kvToken) {
        const delRes = await fetch(`https://api.telegram.org/bot${kvToken}/deleteWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ drop_pending_updates: false }),
        });
        webhookInfo = { action: 'deleted', result: await delRes.json() };
    } else if (webhook === 'info' && kvToken) {
        const infoRes = await fetch(`https://api.telegram.org/bot${kvToken}/getWebhookInfo`);
        webhookInfo = { action: 'info', info: await infoRes.json() };
    }

    let groqTest = null;
    if (testMsg && kvGroq) {
        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + kvGroq },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    max_tokens: 200,
                    messages: [{ role: 'user', content: testMsg }],
                }),
            });
            const data = await res.json();
            groqTest = res.ok ? data.choices[0].message.content : JSON.stringify(data);
        } catch (e) { groqTest = 'Error: ' + e.message; }
    }

    const lastCall = env.ADMIN_KV ? await env.ADMIN_KV.get('tg_last_call') : null;
    const lastBody = env.ADMIN_KV ? await env.ADMIN_KV.get('tg_last_body') : null;

    return new Response(JSON.stringify({
        keys: {
            token:  kvToken  ? kvToken.slice(0, 15)  + '...' : null,
            groq:   kvGroq   ? kvGroq.slice(0, 10)   + '...' : null,
            gemini: kvGemini ? kvGemini.slice(0, 10) + '...' : null,
        },
        webhookInfo,
        groqTest,
        lastCall,
        lastBody,
        actions: {
            setWebhook:  '?webhook=set   → activate 24/7 Groq/Gemini mode',
            delWebhook:  '?webhook=del   → clear webhook (plugin mode)',
            checkInfo:   '?webhook=info  → check current webhook status',
            testGroq:    '?test=hello    → test Groq response',
        },
    }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}
