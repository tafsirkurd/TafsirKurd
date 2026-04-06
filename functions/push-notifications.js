/**
 * Cloudflare Pages Function — POST /push-notifications
 *
 * Sends FCM push notifications to all registered device tokens.
 * Uses FCM HTTP v1 API with a Google service account JWT.
 *
 * Required Cloudflare secrets:
 *   FCM_SERVICE_ACCOUNT  — full JSON string of Firebase service account key
 *   FCM_PROJECT_ID       — Firebase project ID (e.g. "tafsirkurd-app")
 *   SUPABASE_URL         — e.g. https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY
 *   PUSH_SECRET          — shared secret callers must send in X-Push-Secret header
 *                          (set same value in Supabase site_settings key "push_secret")
 *
 * Request body (JSON):
 *   { title, body, data?, platform? }
 *   platform: "android" | "ios" | omit for all
 */

const CORS = {
    'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Push-Secret',
    'Content-Type': 'application/json',
};

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    // Auth: require shared secret
    const secret = request.headers.get('X-Push-Secret') || '';
    if (!env.PUSH_SECRET || secret !== env.PUSH_SECRET) {
        return json({ error: 'Unauthorized' }, 401);
    }

    const { title, body, data = {}, platform } = await request.json().catch(() => ({}));
    if (!title || !body) return json({ error: 'title and body are required' }, 400);

    if (!env.FCM_SERVICE_ACCOUNT || !env.FCM_PROJECT_ID) {
        return json({ error: 'FCM not configured — set FCM_SERVICE_ACCOUNT and FCM_PROJECT_ID secrets' }, 503);
    }

    // Fetch tokens from Supabase
    let tokens;
    try {
        tokens = await getTokens(env, platform);
    } catch (e) {
        return json({ error: 'DB error: ' + e.message }, 500);
    }
    if (!tokens.length) return json({ sent: 0, message: 'No registered tokens' });

    // Get FCM OAuth2 access token
    let accessToken;
    try {
        accessToken = await getFCMAccessToken(env.FCM_SERVICE_ACCOUNT);
    } catch (e) {
        return json({ error: 'FCM auth error: ' + e.message }, 500);
    }

    // Send to each token; collect stale tokens for removal
    const staleTokens = [];
    let successCount = 0;
    const FCM_URL = `https://fcm.googleapis.com/v1/projects/${env.FCM_PROJECT_ID}/messages:send`;

    await Promise.allSettled(tokens.map(async ({ token, row_platform }) => {
        const message = buildMessage(token, row_platform, title, body, data);
        const res = await fetch(FCM_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
        });
        if (res.ok) {
            successCount++;
        } else {
            const err = await res.json().catch(() => ({}));
            // UNREGISTERED or INVALID_ARGUMENT means token is stale — remove it
            if (err?.error?.status === 'NOT_FOUND' || err?.error?.status === 'UNREGISTERED') {
                staleTokens.push(token);
            }
        }
    }));

    // Clean up stale tokens
    if (staleTokens.length) {
        await removeStaleTokens(env, staleTokens).catch(() => {});
    }

    return json({ sent: successCount, total: tokens.length, stale_removed: staleTokens.length }, 200);
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), { status, headers: CORS });
}

async function getTokens(env, platform) {
    let url = `${env.SUPABASE_URL}/rest/v1/push_tokens?select=token,platform`;
    if (platform === 'android' || platform === 'ios') url += `&platform=eq.${platform}`;
    const res = await fetch(url, {
        headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    const rows = await res.json();
    return rows.map(r => ({ token: r.token, row_platform: r.platform }));
}

async function removeStaleTokens(env, tokens) {
    // Delete tokens by value using Supabase REST IN filter
    const inList = tokens.map(t => `"${t}"`).join(',');
    await fetch(`${env.SUPABASE_URL}/rest/v1/push_tokens?token=in.(${inList})`, {
        method: 'DELETE',
        headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            Prefer: 'return=minimal',
        },
    });
}

function buildMessage(token, platform, title, body, data) {
    const base = {
        token,
        notification: { title, body },
        data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    };
    if (platform === 'android') {
        base.android = {
            priority: 'high',
            notification: { icon: 'ic_notification', color: '#1f5f4a' },
        };
    } else if (platform === 'ios') {
        base.apns = {
            payload: { aps: { badge: 1, sound: 'default' } },
        };
    }
    return base;
}

// ─────────────────────────────────────────────────────────
// FCM HTTP v1 OAuth2 via service account JWT
// Works in Cloudflare Workers (crypto.subtle, no googleapis)
// ─────────────────────────────────────────────────────────

async function getFCMAccessToken(serviceAccountJson) {
    const sa = JSON.parse(serviceAccountJson);
    const now = Math.floor(Date.now() / 1000);

    const headerB64 = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claimB64 = b64url(JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    }));

    const sigInput = `${headerB64}.${claimB64}`;
    const privateKey = await importRSAKey(sa.private_key);
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(sigInput));
    const jwt = `${sigInput}.${b64urlRaw(sig)}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error(JSON.stringify(tokenData));
    return tokenData.access_token;
}

function b64url(str) {
    return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64urlRaw(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function pemToDer(pem) {
    const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
}

async function importRSAKey(pemKey) {
    return crypto.subtle.importKey(
        'pkcs8',
        pemToDer(pemKey),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );
}
