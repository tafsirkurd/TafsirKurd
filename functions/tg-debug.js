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

    // List available models
    let geminiTest = null;
    if (testMsg && kvGemini) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${kvGemini}`);
            const data = await res.json();
            geminiTest = (data.models || []).map(m => m.name).filter(n => n.includes('flash') || n.includes('pro'));
        } catch(e) { geminiTest = 'Error: ' + e.message; }
    }

    return new Response(JSON.stringify({
        hasKV: !!env.ADMIN_KV,
        kvToken:  kvToken  ? kvToken.slice(0, 15)  + '...' : null,
        kvGemini: kvGemini ? kvGemini.slice(0, 10) + '...' : null,
        geminiTest,
    }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}
