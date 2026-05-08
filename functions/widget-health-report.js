// Widget Health Reporting endpoint
// Accepts anonymous POST reports about iOS widget sync state.
// No personal data — device_id is a random session token, not a user ID.
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

    // Rate limit: max 6 reports per IP per 10 minutes
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    if (_recentIps.has(ip)) {
        const entry = _recentIps.get(ip);
        if (now - entry.start < windowMs && entry.count >= 6)
            return new Response('{"error":"rate_limit"}', { status: 429, headers: corsHeaders });
        if (now - entry.start >= windowMs) _recentIps.set(ip, { start: now, count: 1 });
        else entry.count++;
    } else {
        _recentIps.set(ip, { start: now, count: 1 });
    }

    try {
        const body = await request.json();

        if (!body.status)
            return new Response('{"error":"missing required fields"}', { status: 400, headers: corsHeaders });

        function san(v, maxLen) {
            if (v === null || v === undefined) return null;
            return String(v).slice(0, maxLen || 100);
        }
        function sanNum(v, max) {
            return typeof v === 'number' && isFinite(v) ? Math.min(v, max || 999999) : null;
        }

        const row = {
            device_id:      san(body.device_id, 64),
            city:           san(body.city, 80),
            status:         san(body.status, 40),
            age_min:        sanNum(body.age_min, 99999),
            payload_len:    sanNum(body.payload_len, 9999999),
            source:         san(body.source, 60),
            write_status:   san(body.write_status, 20),
            ext_age_h:      sanNum(body.ext_age_h, 9999),
            diagnostics:    body.diagnostics && typeof body.diagnostics === 'object' ? body.diagnostics : null,
            app_version:    san(body.app_version, 20),
            ios_ver:        san(body.ios_ver, 20),
            platform:       san(body.platform, 20) || 'ios',
            // Enriched snapshot fields (prayer.ui.js >= 20260523)
            current_prayer: san(body.current_prayer, 20),
            next_prayer:    san(body.next_prayer, 20),
            snapshot_date:  san(body.snapshot_date, 12),
            today_baghdad:  san(body.today_baghdad, 12),
            snapshot_stale: body.snapshot_stale === true ? true : (body.snapshot_stale === false ? false : null),
            valid_until:    sanNum(body.valid_until, 9999999999999)
        };

        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const { error } = await supabase.from('widget_health_reports').insert(row);
        if (error) {
            console.error('[widget-health-report] insert error:', error.message);
            return new Response('{"error":"db_error"}', { status: 500, headers: corsHeaders });
        }

        return new Response('{"ok":true}', { status: 200, headers: corsHeaders });

    } catch(e) {
        console.error('[widget-health-report] error:', e);
        return new Response('{"error":"bad_request"}', { status: 400, headers: corsHeaders });
    }
}
