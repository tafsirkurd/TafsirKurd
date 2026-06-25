// POST /register-push-token
// Stores a device push token in push_tokens using the service role key.
// user_id is derived ONLY from a verified Supabase JWT in the Authorization header —
// never from the request body — to prevent spoofed user_id deleting other users' tokens.
//
// Two-step upsert handles all device states:
//   Step 1 (install_id patch): if this install already has a row with a different token
//           (FCM/APNs token rotation), update that row's token in-place.
//   Step 2 (token upsert): insert or update by token string — always safe since token is unique.
//   Together these ensure exactly one row per device installation at all times.

const ALLOWED_ORIGINS = new Set([
    'https://tafsirkurd.com',
    'capacitor://localhost',  // iOS Capacitor WebView
    'http://localhost',       // Android Capacitor WebView
]);

function getCORS(origin) {
    const allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://tafsirkurd.com';
    return {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json',
        'Vary': 'Origin',
    };
}

export async function onRequest(context) {
    const { request, env } = context;
    const origin = request.headers.get('Origin') || '';
    const CORS = getCORS(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
    const j = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: CORS });

    if (request.method !== 'POST') return j({ error: 'POST only' }, 405);

    let body;
    try { body = await request.json(); } catch { return j({ error: 'Invalid JSON' }, 400); }

    const { token, platform, install_id } = body || {};
    if (!token || typeof token !== 'string' || token.length < 32)
        return j({ error: 'Invalid token' }, 400);
    if (!platform || !['ios', 'android'].includes(platform))
        return j({ error: 'platform must be ios or android' }, 400);

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

    const now = new Date().toISOString();
    const serviceHeaders = {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
    };

    // For verified logged-in users: remove their other tokens on this platform so
    // reinstalls don't leave stale rows that cause duplicate notification delivery.
    if (verified_user_id) {
        await fetch(
            `${env.SUPABASE_URL}/rest/v1/push_tokens?user_id=eq.${encodeURIComponent(verified_user_id)}&platform=eq.${platform}&token=neq.${encodeURIComponent(token)}`,
            { method: 'DELETE', headers: serviceHeaders }
        ).catch(() => {});
    }

    // Step 1: If this install already has a row with a DIFFERENT token (token rotation),
    // update that row's token in-place so we don't accumulate a second row.
    // Only done for verified logged-in users (user_id scopes the filter) — unauthenticated
    // callers skip this to prevent install_id spoofing from hijacking another user's row.
    if (install_id && verified_user_id) {
        await fetch(
            `${env.SUPABASE_URL}/rest/v1/push_tokens?install_id=eq.${encodeURIComponent(install_id)}&user_id=eq.${encodeURIComponent(verified_user_id)}&token=neq.${encodeURIComponent(token)}`,
            {
                method: 'PATCH',
                headers: serviceHeaders,
                body: JSON.stringify({ token, user_id: verified_user_id, updated_at: now }),
            }
        ).catch(() => {});
    }

    // Step 2: Upsert by token — always safe since token has a unique constraint.
    // Covers: new device, re-registration of existing token, first launch after Step 1 patched nothing.
    const res = await fetch(
        `${env.SUPABASE_URL}/rest/v1/push_tokens?on_conflict=token`,
        {
            method: 'POST',
            headers: { ...serviceHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify(Object.assign(
                { token, platform, install_id: install_id || null, updated_at: now },
                // Only include user_id when verified — omitting it lets merge-duplicates
                // keep an existing user_id intact (avoids nulling it out on guest re-reg).
                verified_user_id ? { user_id: verified_user_id } : {}
            )),
        }
    );

    if (!res.ok) {
        const err = await res.text().catch(() => '');
        return j({ error: 'DB error: ' + err }, 500);
    }
    return j({ success: true });
}
