export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const token  = url.searchParams.get('token');
    const gemini = url.searchParams.get('gemini');

    if (token && gemini && env.ADMIN_KV) {
        await env.ADMIN_KV.put('tg_bot_token',  token);
        await env.ADMIN_KV.put('tg_gemini_key', gemini);
    }

    const kvTgToken = env.ADMIN_KV ? await env.ADMIN_KV.get('tg_bot_token')  : null;
    const kvGemini  = env.ADMIN_KV ? await env.ADMIN_KV.get('tg_gemini_key') : null;

    return new Response(JSON.stringify({
        hasKV: !!env.ADMIN_KV,
        kvTgToken:  kvTgToken  ? kvTgToken.slice(0, 15) + '...' : null,
        kvGemini:   kvGemini   ? kvGemini.slice(0, 10)  + '...' : null,
    }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}
