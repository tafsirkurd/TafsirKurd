export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const token  = url.searchParams.get('token');
    const gemini = url.searchParams.get('gemini');
    const testMsg = url.searchParams.get('test');

    if (token && gemini && env.ADMIN_KV) {
        await env.ADMIN_KV.put('tg_bot_token',  token);
        await env.ADMIN_KV.put('tg_gemini_key', gemini);
    }

    const kvToken  = env.ADMIN_KV ? await env.ADMIN_KV.get('tg_bot_token')  : null;
    const kvGemini = env.ADMIN_KV ? await env.ADMIN_KV.get('tg_gemini_key') : null;

    // Test Gemini
    let geminiTest = null;
    if (testMsg && kvGemini) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${kvGemini}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: testMsg }] }] }),
            });
            const data = await res.json();
            geminiTest = res.ok ? data.candidates[0].content.parts[0].text : JSON.stringify(data);
        } catch(e) { geminiTest = 'Error: ' + e.message; }
    }

    return new Response(JSON.stringify({
        hasKV: !!env.ADMIN_KV,
        kvToken:  kvToken  ? kvToken.slice(0, 15)  + '...' : null,
        kvGemini: kvGemini ? kvGemini.slice(0, 10) + '...' : null,
        geminiTest,
    }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}
