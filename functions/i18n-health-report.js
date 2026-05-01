// i18n Cache Health Reporting endpoint
// Accepts anonymous POST reports about translation cache state.
// No personal data — platform, layer, key count, version only.
import { createClient } from '@supabase/supabase-js';

var _recentIps = new Map();

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
    if (request.method !== 'POST') return new Response('{"error":"POST only"}', { status: 405, headers: corsHeaders });

    // Rate limit: max 20 reports per IP per 10 minutes
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    if (_recentIps.has(ip)) {
        const entry = _recentIps.get(ip);
        if (now - entry.start < windowMs && entry.count >= 20)
            return new Response('{"error":"rate_limit"}', { status: 429, headers: corsHeaders });
        if (now - entry.start >= windowMs) _recentIps.set(ip, { start: now, count: 1 });
        else entry.count++;
    } else {
        _recentIps.set(ip, { start: now, count: 1 });
    }

    try {
        const body = await request.json();

        if (!body.status || !body.layer_used)
            return new Response('{"error":"missing required fields"}', { status: 400, headers: corsHeaders });

        function san(v, maxLen) {
            if (v === null || v === undefined) return null;
            return String(v).slice(0, maxLen || 100);
        }

        const row = {
            platform:       san(body.platform),
            app_version:    san(body.app_version),
            layer_used:     san(body.layer_used),
            cache_version:  san(body.cache_version),
            key_count:      typeof body.key_count === 'number' ? Math.min(body.key_count, 9999) : null,
            status:         san(body.status),
            error_msg:      san(body.error_msg, 200),
            session_id:     san(body.session_id),
            bundled_loaded: body.bundled_loaded === true || body.bundled_loaded === false ? body.bundled_loaded : null,
            rejected_count: typeof body.rejected_count === 'number' ? Math.min(body.rejected_count, 999) : null,
            swap_count:     typeof body.swap_count === 'number' ? Math.min(body.swap_count, 999) : null,
            fetch_time_ms:  typeof body.fetch_time_ms === 'number' ? Math.min(body.fetch_time_ms, 99999) : null
        };

        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const { error } = await supabase.from('i18n_cache_health').insert(row);
        if (error) {
            console.error('[i18n-health-report] insert error:', error.message);
            return new Response('{"error":"db_error"}', { status: 500, headers: corsHeaders });
        }

        return new Response('{"ok":true}', { status: 200, headers: corsHeaders });

    } catch(e) {
        console.error('[i18n-health-report] error:', e);
        return new Response('{"error":"bad_request"}', { status: 400, headers: corsHeaders });
    }
}
