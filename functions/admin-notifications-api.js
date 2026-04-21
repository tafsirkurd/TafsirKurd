// Admin Notifications API — full CRUD + FCM send
// Actions: list, get, create, update, send, cancel, delete, duplicate, get_stats, get_token_count
import { createClient } from '@supabase/supabase-js';

const CORS = {
    'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
};

export async function onRequest(context) {
    const { request, env } = context;
    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    // ── PROCESS SCHEDULED (cron — no admin auth, CRON_SECRET only) ──
    if (body.action === 'process_scheduled') {
        const cronSecret = env.NOTIF_CRON_SECRET;
        const authHeader = request.headers.get('Authorization') || '';
        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`)
            return json({ error: 'Unauthorized' }, 401);

        const { data: due } = await supabase
            .from('admin_notifications')
            .select('*')
            .eq('status', 'scheduled')
            .eq('is_template', false)
            .lte('scheduled_at', new Date().toISOString())
            .limit(20);

        if (!due?.length) return json({ success: true, processed: 0 });

        const results = [];
        for (const notif of due) {
            try {
                // Atomically claim the notification (prevent double-send)
                const { data: claimed } = await supabase
                    .from('admin_notifications')
                    .update({ status: 'sending' })
                    .eq('id', notif.id)
                    .eq('status', 'scheduled')
                    .select()
                    .single();
                if (!claimed) continue; // already claimed by another run

                const r = await doSend(supabase, env, notif, notif.id, 'cron');
                results.push({ id: notif.id, ...r });
            } catch (e) {
                await supabase.from('admin_notifications')
                    .update({ status: 'failed', error_message: 'Cron error: ' + e.message })
                    .eq('id', notif.id).catch(() => {});
                results.push({ id: notif.id, error: e.message });
            }
        }
        return json({ success: true, processed: results.length, results });
    }

    const token = ((request.headers.get('Authorization') || '').replace('Bearer ', '') || body.token || '').trim();
    if (!token) return json({ error: 'No token' }, 401);

    const { data: session } = await supabase
        .from('admin_sessions')
        .select('user_id, admin_users(role, email)')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (!session?.admin_users) return json({ error: 'Unauthorized' }, 403);
    const role = session.admin_users.role;
    const adminEmail = session.admin_users.email;

    const isWriter = role === 'super_admin' || role === 'editor';
    const isSuperAdmin = role === 'super_admin';

    const { action } = body;

    // ── LIST ──────────────────────────────────────────────────────
    if (action === 'list') {
        let q = supabase
            .from('admin_notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);

        q = q.neq('deep_link_type', 'prayer_reminder_config');
        if (body.status) q = q.eq('status', body.status);
        if (body.platform && body.platform !== 'all') q = q.eq('platform', body.platform);
        if (body.search) q = q.or(`title.ilike.%${body.search}%,body.ilike.%${body.search}%`);

        const { data, error } = await q;
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, notifications: data || [] });
    }

    // ── GET ───────────────────────────────────────────────────────
    if (action === 'get') {
        if (!body.id) return json({ error: 'id required' }, 400);
        const { data, error } = await supabase
            .from('admin_notifications')
            .select('*')
            .eq('id', body.id)
            .single();
        if (error) return json({ error: error.message }, 500);
        if (!data) return json({ error: 'Not found' }, 404);
        return json({ success: true, notification: data });
    }

    // ── GET STATS ─────────────────────────────────────────────────
    if (action === 'get_stats') {
        const [{ data: allNotifs }, { data: tokenCount }] = await Promise.all([
            supabase.from('admin_notifications').select('status, tokens_targeted, tokens_sent, tokens_failed'),
            supabase.from('push_tokens').select('id', { count: 'exact', head: true })
        ]);

        const sent = (allNotifs || []).filter(n => n.status === 'sent');
        const scheduled = (allNotifs || []).filter(n => n.status === 'scheduled').length;
        const totalSent = sent.length;
        const totalTargeted = sent.reduce((s, n) => s + (n.tokens_targeted || 0), 0);
        const totalDelivered = sent.reduce((s, n) => s + (n.tokens_sent || 0), 0);
        const deliveryRate = totalTargeted > 0 ? Math.round((totalDelivered / totalTargeted) * 100) : 0;

        return json({
            success: true,
            stats: {
                totalSent,
                totalScheduled: scheduled,
                totalNotifications: (allNotifs || []).length,
                activeTokens: tokenCount || 0,
                deliveryRate,
                totalDelivered,
                totalTargeted,
            }
        });
    }

    // ── GET TOKEN COUNT (preview) ─────────────────────────────────
    if (action === 'get_token_count') {
        const audience = body.audience || 'all';
        const platform = body.platform || 'all';

        let q = supabase.from('push_tokens').select('id', { count: 'exact', head: true });
        if (platform !== 'all') q = q.eq('platform', platform);
        if (audience === 'authenticated') q = q.not('user_id', 'is', null);
        else if (audience === 'unauthenticated') q = q.is('user_id', null);
        else if (audience === 'android') q = q.eq('platform', 'android');
        else if (audience === 'ios') q = q.eq('platform', 'ios');

        const { count, error } = await q;
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, count: count || 0 });
    }

    // ── WRITE OPERATIONS — require editor or super_admin ──────────
    if (!isWriter) return json({ error: 'Insufficient permissions' }, 403);

    // ── CREATE ────────────────────────────────────────────────────
    if (action === 'create') {
        const { title, body: msgBody, image_url, platform, audience, deep_link_type, deep_link_id,
                scheduled_at, recurrence, recurrence_day, notes, is_template } = body;

        if (!title || !msgBody) return json({ error: 'title and body required' }, 400);

        const status = scheduled_at ? 'scheduled' : 'draft';
        const { data, error } = await supabase
            .from('admin_notifications')
            .insert({
                title, body: msgBody, image_url: image_url || null,
                platform: platform || 'all',
                audience: audience || 'all',
                deep_link_type: deep_link_type || 'none',
                deep_link_id: deep_link_id || null,
                status,
                scheduled_at: scheduled_at || null,
                recurrence: recurrence || 'none',
                recurrence_day: recurrence_day != null ? recurrence_day : null,
                notes: notes || null,
                is_template: is_template === true,
                created_by: adminEmail,
            })
            .select()
            .single();

        if (error) return json({ error: error.message }, 500);
        return json({ success: true, notification: data });
    }

    // ── UPDATE ────────────────────────────────────────────────────
    if (action === 'update') {
        if (!body.id) return json({ error: 'id required' }, 400);

        const { data: existing } = await supabase
            .from('admin_notifications')
            .select('status')
            .eq('id', body.id)
            .single();

        if (!existing) return json({ error: 'Not found' }, 404);
        if (!['draft', 'scheduled'].includes(existing.status))
            return json({ error: 'Can only edit draft or scheduled notifications' }, 400);

        const { title, body: msgBody, image_url, platform, audience, deep_link_type, deep_link_id,
                scheduled_at, recurrence, recurrence_day, notes, is_template } = body;

        const status = scheduled_at ? 'scheduled' : 'draft';
        const { data, error } = await supabase
            .from('admin_notifications')
            .update({
                title, body: msgBody, image_url: image_url || null,
                platform: platform || 'all',
                audience: audience || 'all',
                deep_link_type: deep_link_type || 'none',
                deep_link_id: deep_link_id || null,
                status,
                scheduled_at: scheduled_at || null,
                recurrence: recurrence || 'none',
                recurrence_day: recurrence_day != null ? recurrence_day : null,
                notes: notes || null,
                is_template: is_template === true,
            })
            .eq('id', body.id)
            .select()
            .single();

        if (error) return json({ error: error.message }, 500);
        return json({ success: true, notification: data });
    }

    // ── SEND ──────────────────────────────────────────────────────
    if (action === 'send') {
        if (!body.id) return json({ error: 'id required' }, 400);

        const { data: notif } = await supabase.from('admin_notifications').select('*').eq('id', body.id).single();
        if (!notif) return json({ error: 'Not found' }, 404);
        if (notif.status === 'sending') return json({ error: 'Already sending' }, 400);
        if (notif.status === 'cancelled') return json({ error: 'Cannot send cancelled notification' }, 400);
        if (!env.FCM_SERVICE_ACCOUNT || !env.FCM_PROJECT_ID) return json({ error: 'FCM not configured' }, 503);

        let trackingId = body.id;
        if (notif.is_template) {
            const { data: copy } = await supabase.from('admin_notifications').insert({
                title: notif.title, body: notif.body, image_url: notif.image_url,
                platform: notif.platform, audience: notif.audience,
                deep_link_type: notif.deep_link_type, deep_link_id: notif.deep_link_id,
                recurrence: notif.recurrence, recurrence_day: notif.recurrence_day,
                notes: notif.notes, created_by: adminEmail,
                status: 'sending', is_template: false,
            }).select().single();
            if (!copy) return json({ error: 'Failed to create send record' }, 500);
            trackingId = copy.id;
        } else {
            await supabase.from('admin_notifications').update({ status: 'sending' }).eq('id', body.id);
        }

        const r = await doSend(supabase, env, notif, trackingId, adminEmail);
        if (r.error) return json({ error: r.error }, 500);
        return json({ success: true, sent: r.sent, failed: r.failed, total: r.total,
                      stale_removed: r.stale_removed, next_scheduled: notif.recurrence !== 'none' });
    }

    // ── CANCEL ────────────────────────────────────────────────────
    if (action === 'cancel') {
        if (!body.id) return json({ error: 'id required' }, 400);
        const { error } = await supabase
            .from('admin_notifications')
            .update({ status: 'cancelled' })
            .eq('id', body.id)
            .in('status', ['draft', 'scheduled']);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
    }

    // ── DELETE ────────────────────────────────────────────────────
    if (action === 'delete') {
        if (!isSuperAdmin) return json({ error: 'Super Admin only' }, 403);
        if (!body.id) return json({ error: 'id required' }, 400);
        const { error } = await supabase.from('admin_notifications').delete().eq('id', body.id);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
    }

    // ── DUPLICATE ─────────────────────────────────────────────────
    if (action === 'duplicate') {
        if (!body.id) return json({ error: 'id required' }, 400);
        const { data: src } = await supabase
            .from('admin_notifications')
            .select('*')
            .eq('id', body.id)
            .single();
        if (!src) return json({ error: 'Not found' }, 404);

        const { data, error } = await supabase
            .from('admin_notifications')
            .insert({
                title: src.title + ' (Copy)',
                body: src.body,
                image_url: src.image_url,
                platform: src.platform,
                audience: src.audience,
                deep_link_type: src.deep_link_type,
                deep_link_id: src.deep_link_id,
                status: 'draft',
                notes: src.notes,
                created_by: adminEmail,
            })
            .select()
            .single();

        if (error) return json({ error: error.message }, 500);
        return json({ success: true, notification: data });
    }

    return json({ error: 'Unknown action' }, 400);
}

// ── Helpers ─────────────────────────────────────────────────────────

function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), { status, headers: CORS });
}

async function doSend(supabase, env, notif, trackingId, sentBy) {
    // Get tokens
    let tokens;
    try { tokens = await getTokensForAudience(env, notif.audience, notif.platform); }
    catch (e) {
        await supabase.from('admin_notifications')
            .update({ status: 'failed', error_message: 'Token fetch: ' + e.message })
            .eq('id', trackingId);
        return { error: 'Token fetch failed: ' + e.message };
    }

    if (!tokens.length) {
        await supabase.from('admin_notifications')
            .update({ status: 'sent', sent_at: new Date().toISOString(),
                      tokens_targeted: 0, tokens_sent: 0, tokens_failed: 0, stale_removed: 0 })
            .eq('id', trackingId);
        return { sent: 0, failed: 0, total: 0, stale_removed: 0 };
    }

    const apnsTokens = tokens.filter(t => isApnsToken(t.token));
    const fcmTokens  = tokens.filter(t => !isApnsToken(t.token));

    let accessToken = null;
    if (fcmTokens.length && env.FCM_SERVICE_ACCOUNT) {
        try { accessToken = await getFCMAccessToken(env.FCM_SERVICE_ACCOUNT); }
        catch (e) {
            if (!apnsTokens.length) {
                await supabase.from('admin_notifications')
                    .update({ status: 'failed', error_message: 'FCM auth: ' + e.message })
                    .eq('id', trackingId);
                return { error: 'FCM auth error: ' + e.message };
            }
        }
    }

    let apnsJwt = null, apnsJwtError = null;
    if (apnsTokens.length && env.APNS_KEY_P8) {
        try { apnsJwt = await getAPNsJWT(env.APNS_KEY_P8, env.APNS_KEY_ID || 'KLG2RRCRNR', env.APNS_TEAM_ID || '8KA7UDSC9D'); }
        catch (e) { apnsJwtError = 'APNs JWT: ' + e.message; }
    }

    const deepLinkData = buildDeepLinkData(notif.deep_link_type, notif.deep_link_id);
    const FCM_URL = `https://fcm.googleapis.com/v1/projects/${env.FCM_PROJECT_ID}/messages:send`;
    const staleTokens = [], apnsErrors = [];
    let successCount = 0, failCount = 0;

    await Promise.allSettled([
        ...fcmTokens.map(async ({ token, platform }) => {
            if (!accessToken) { failCount++; return; }
            const res = await fetch(FCM_URL, {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: buildFCMMessage(token, platform, notif.title, notif.body, notif.image_url, deepLinkData) }),
            });
            if (res.ok) { successCount++; }
            else {
                const err = await res.json().catch(() => ({}));
                if (err?.error?.status === 'NOT_FOUND' || err?.error?.status === 'UNREGISTERED') staleTokens.push(token);
                failCount++;
            }
        }),
        ...apnsTokens.map(async ({ token }) => {
            if (!apnsJwt) { apnsErrors.push(apnsJwtError || 'JWT missing'); failCount++; return; }
            const res = await sendApns(token, notif.title, notif.body, deepLinkData, apnsJwt, 'com.tafsirkurd.app');
            if (res.ok) { successCount++; }
            else {
                const errText = await res.text().catch(() => '');
                const err = JSON.parse(errText || '{}');
                apnsErrors.push(`APNs ${res.status}: ${err?.reason || errText}`);
                if (res.status === 410 || err?.reason === 'BadDeviceToken' || err?.reason === 'Unregistered') staleTokens.push(token);
                failCount++;
            }
        }),
    ]);

    if (staleTokens.length) await removeStaleTokens(env, staleTokens).catch(() => {});

    await supabase.from('admin_notifications').update({
        status: 'sent', sent_at: new Date().toISOString(),
        tokens_targeted: tokens.length, tokens_sent: successCount,
        tokens_failed: failCount, stale_removed: staleTokens.length,
        error_message: apnsErrors.length ? apnsErrors[0] : null,
    }).eq('id', trackingId);

    // Auto-schedule next occurrence for recurring notifications
    if (notif.recurrence && notif.recurrence !== 'none') {
        try {
            const nextAt = nextOccurrence(notif.recurrence, notif.recurrence_day, notif.scheduled_at);
            if (nextAt) {
                const { error: insErr } = await supabase.from('admin_notifications').insert({
                    title: notif.title, body: notif.body, image_url: notif.image_url || null,
                    platform: notif.platform || 'all', audience: notif.audience || 'all',
                    deep_link_type: notif.deep_link_type || 'none', deep_link_id: notif.deep_link_id || null,
                    recurrence: notif.recurrence, recurrence_day: notif.recurrence_day || null,
                    notes: notif.notes || null, created_by: sentBy || 'cron',
                    status: 'scheduled', scheduled_at: nextAt, is_template: false,
                });
                if (insErr) console.error('Next occurrence insert failed:', insErr.message);
            }
        } catch (e) { console.error('nextOccurrence error:', e.message); }
    }

    return { sent: successCount, failed: failCount, total: tokens.length, stale_removed: staleTokens.length };
}

async function getTokensForAudience(env, audience, platform) {
    let url = `${env.SUPABASE_URL}/rest/v1/push_tokens?select=token,platform`;

    // Platform filter (from notification's platform field)
    if (platform === 'android') url += '&platform=eq.android';
    else if (platform === 'ios') url += '&platform=eq.ios';

    // Audience filter
    if (audience === 'authenticated') url += '&user_id=not.is.null';
    else if (audience === 'unauthenticated') url += '&user_id=is.null';
    else if (audience === 'android') url += '&platform=eq.android';
    else if (audience === 'ios') url += '&platform=eq.ios';

    // Max 10k tokens
    url += '&limit=10000';

    const res = await fetch(url, {
        headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    return await res.json();
}

async function removeStaleTokens(env, tokens) {
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

function buildDeepLinkData(type, id) {
    if (!type || type === 'none') return {};
    const d = { type };
    if (id) d.id = String(id);
    return d;
}

function buildFCMMessage(token, platform, title, body, imageUrl, data) {
    const msg = {
        token,
        notification: { title, body },
        data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    };
    if (imageUrl) {
        if (platform === 'android') {
            msg.android = {
                priority: 'high',
                notification: {
                    icon: 'ic_notification',
                    color: '#1f5f4a',
                    image_url: imageUrl,
                },
            };
        } else if (platform === 'ios') {
            msg.apns = {
                payload: { aps: { badge: 1, sound: 'default' } },
                fcm_options: { image: imageUrl },
            };
        }
    } else {
        if (platform === 'android') {
            msg.android = {
                priority: 'high',
                notification: { icon: 'ic_notification', color: '#1f5f4a' },
            };
        } else if (platform === 'ios') {
            msg.apns = { payload: { aps: { badge: 1, sound: 'default' } } };
        }
    }
    return msg;
}

// ── FCM OAuth2 (Cloudflare-compatible, no googleapis) ────────────────

async function getFCMAccessToken(serviceAccountJson) {
    const sa = JSON.parse(serviceAccountJson);
    const now = Math.floor(Date.now() / 1000);
    const headerB64 = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claimB64 = b64url(JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now, exp: now + 3600,
    }));
    const sigInput = `${headerB64}.${claimB64}`;
    const key = await importRSAKey(sa.private_key);
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(sigInput));
    const jwt = `${sigInput}.${b64urlRaw(sig)}`;
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });
    const d = await res.json();
    if (!d.access_token) throw new Error(JSON.stringify(d));
    return d.access_token;
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
// Returns the next ISO timestamp for a recurring notification
function nextOccurrence(recurrence, recurrenceDay, scheduledAt) {
    const now = new Date();
    // Preserve the original HH:MM from the notification's scheduled_at
    const refTime = scheduledAt ? new Date(scheduledAt) : null;
    const h = refTime ? refTime.getUTCHours() : 9;
    const m = refTime ? refTime.getUTCMinutes() : 0;
    if (recurrence === 'daily') {
        const next = new Date(now);
        next.setUTCDate(next.getUTCDate() + 1);
        next.setUTCHours(h, m, 0, 0);
        return next.toISOString();
    }
    if (recurrence === 'weekly' && recurrenceDay != null) {
        const next = new Date(now);
        const currentDay = next.getUTCDay();
        let daysUntil = (recurrenceDay - currentDay + 7) % 7;
        if (daysUntil === 0) daysUntil = 7;
        next.setUTCDate(next.getUTCDate() + daysUntil);
        next.setUTCHours(h, m, 0, 0);
        return next.toISOString();
    }
    return null;
}

async function importRSAKey(pem) {
    return crypto.subtle.importKey('pkcs8', pemToDer(pem),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

// ── APNs direct delivery (for raw iOS device tokens) ────────────────

function isApnsToken(token) {
    // Raw APNs device tokens are exactly 64 lowercase hex characters
    return /^[0-9a-f]{64}$/i.test(token);
}

async function importECKey(pem) {
    return crypto.subtle.importKey('pkcs8', pemToDer(pem),
        { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

async function getAPNsJWT(keyP8, keyId, teamId) {
    const key = await importECKey(keyP8);
    const now = Math.floor(Date.now() / 1000);
    const header  = b64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
    const payload = b64url(JSON.stringify({ iss: teamId, iat: now }));
    const sigInput = `${header}.${payload}`;
    const sig = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        key,
        new TextEncoder().encode(sigInput)
    );
    return `${sigInput}.${b64urlRaw(sig)}`;
}

async function sendApns(deviceToken, title, body, extraData, jwt, bundleId) {
    const apsPayload = {
        aps: { alert: { title, body }, badge: 1, sound: 'default' },
        ...extraData,
    };
    return fetch(`https://api.push.apple.com/3/device/${deviceToken}`, {
        method: 'POST',
        headers: {
            authorization: `Bearer ${jwt}`,
            'apns-topic': bundleId,
            'apns-push-type': 'alert',
            'apns-priority': '10',
            'content-type': 'application/json',
        },
        body: JSON.stringify(apsPayload),
    });
}
