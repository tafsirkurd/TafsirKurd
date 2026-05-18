// App Version Reporting — anonymous build/version tracking
// Called on app startup to track version distribution across devices
import { createClient } from '@supabase/supabase-js';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
};

var _recentIps = new Map();

export async function onRequest(context) {
    const { request, env } = context;
    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
    if (request.method !== 'POST') return new Response('{"error":"POST only"}', { status: 405, headers: CORS });

    // Rate limit: 5 reports per IP per hour (startup only)
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 60 * 1000;
    if (_recentIps.has(ip)) {
        const entry = _recentIps.get(ip);
        if (now - entry.start < windowMs && entry.count >= 5)
            return new Response('{"ok":true}', { status: 200, headers: CORS }); // silently accept
        if (now - entry.start >= windowMs) _recentIps.set(ip, { start: now, count: 1 });
        else entry.count++;
    } else {
        _recentIps.set(ip, { start: now, count: 1 });
    }

    try {
        const body = await request.json();

        if (!body.platform || !body.build_number)
            return new Response('{"error":"platform and build_number required"}', { status: 400, headers: CORS });

        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Upsert: increment device_count when first seen, always update last_seen
        const key = String(body.platform).slice(0, 20) + '_' + String(body.build_number).slice(0, 20);
        const { error } = await supabase
            .from('app_version_stats')
            .upsert({
                platform: String(body.platform).slice(0, 20),
                build_number: String(body.build_number).slice(0, 20),
                app_version: body.app_version ? String(body.app_version).slice(0, 30) : null,
                last_seen: new Date().toISOString(),
            }, { onConflict: 'platform,build_number' });

        if (error) {
            console.error('[app-version-report] db error:', error.message);
            return new Response('{"error":"db_error"}', { status: 500, headers: CORS });
        }

        return new Response('{"ok":true}', { status: 200, headers: CORS });
    } catch(e) {
        console.error('[app-version-report] exception:', e?.message || e);
        return new Response('{"error":"bad_request"}', { status: 400, headers: CORS });
    }
}
