export async function onRequest(context) {
    const { env } = context;
    const hasKV = !!env.ADMIN_KV;
    const hasTgEnv = !!env.TELEGRAM_BOT_TOKEN;
    const hasGeminiEnv = !!env.GEMINI_API_KEY;

    let kvTgToken = null;
    let kvGemini = null;
    if (hasKV) {
        kvTgToken = await env.ADMIN_KV.get('tg_bot_token');
        kvGemini  = await env.ADMIN_KV.get('tg_gemini_key');
    }

    return new Response(JSON.stringify({
        hasKV,
        hasTgEnv,
        hasGeminiEnv,
        kvTgToken:  kvTgToken  ? kvTgToken.slice(0, 15) + '...' : null,
        kvGemini:   kvGemini   ? kvGemini.slice(0, 10)  + '...' : null,
    }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}
