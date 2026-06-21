// POST /register-push-token
// Stores a device push token in push_tokens using the service role key.
// user_id is derived ONLY from a verified Supabase JWT in the Authorization header —
// never from the request body — to prevent spoofed user_id deleting other users' tokens.

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
};

export async function onRequest(context) {
    const { request, env } = context;
    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { token, platform, install_id } = body || {};
    if (!token || typeof token !== 'string' || token.length < 32)
        return json({ error: 'Invalid token' }, 400);
    if (!platform || !['ios', 'android'].includes(platform))
        return json({ error: 'platform must be ios or android' }, 400);

    // Verify the Supabase JWT (if supplied) to get the authenticated user_id.
    // user_id from the body is intentionally ignored — only the verified JWT sub is used.
    let verified_user_id = null;
    const authHeader = request.headers.get('Authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
        const jwt = authHeader.slice(7);
        try {
            const authRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
                headers: {
                    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                    Authorization: `Bearer ${jwt}`,
                },
            });
            if (authRes.ok) {
                const authData = await authRes.json();
                verified_user_id = authData?.id || null;
            }
        } catch (_) {}
    }

    const serviceHeaders = {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
    };

    // For verified logged-in users: delete their other tokens on the same platform so
    // reinstalls / token refreshes don't cause duplicate notification delivery.
    if (verified_user_id) {
        await fetch(
            `${env.SUPABASE_URL}/rest/v1/push_tokens?user_id=eq.${encodeURIComponent(verified_user_id)}&platform=eq.${platform}&token=neq.${encodeURIComponent(token)}`,
            { method: 'DELETE', headers: { ...serviceHeaders, Prefer: 'return=minimal' } }
        ).catch(() => {});
    }

    // Upsert: conflict on install_id (same device, refreshed token) or fall back to token string.
    const conflictCol = install_id ? 'install_id' : 'token';
    const url = `${env.SUPABASE_URL}/rest/v1/push_tokens?on_conflict=${conflictCol}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: serviceHeaders,
        body: JSON.stringify({
            token,
            platform,
            user_id: verified_user_id,
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
