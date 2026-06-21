// POST /register-push-token
// Stores a device push token in push_tokens using the service role key,
// bypassing any RLS policies on the table.
// No auth required — any installed app can register its token.

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
};

export async function onRequest(context) {
    const { request, env } = context;
    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { token, platform, user_id, install_id } = body || {};
    if (!token || typeof token !== 'string' || token.length < 32)
        return json({ error: 'Invalid token' }, 400);
    if (!platform || !['ios', 'android'].includes(platform))
        return json({ error: 'platform must be ios or android' }, 400);

    const headers = {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
    };

    // For logged-in users: remove their other tokens on the same platform so they
    // don't receive duplicate notifications after reinstalls / token refreshes.
    if (user_id) {
        await fetch(
            `${env.SUPABASE_URL}/rest/v1/push_tokens?user_id=eq.${encodeURIComponent(user_id)}&platform=eq.${platform}&token=neq.${encodeURIComponent(token)}`,
            { method: 'DELETE', headers: { ...headers, Prefer: 'return=minimal' } }
        ).catch(() => {});
    }

    // Upsert by install_id (within-install token refresh) if provided, else fall back to token.
    const conflictCol = install_id ? 'install_id' : 'token';
    const url = `${env.SUPABASE_URL}/rest/v1/push_tokens?on_conflict=${conflictCol}`;
    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            token,
            platform,
            user_id: user_id || null,
            install_id: install_id || null,
            updated_at: new Date().toISOString(),
        }),
    });

    if (!res.ok) {
        const err = await res.text().catch(() => '');
        return json({ error: 'DB error: ' + err }, 500);
    }
    return json({ success: true });
}

function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), { status, headers: CORS });
}
