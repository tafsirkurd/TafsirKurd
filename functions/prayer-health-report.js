// Prayer Cache Health Reporting endpoint
// Accepts anonymous POST reports from app clients about prayer cache status.
// No auth required — data is non-sensitive (no user identity, no personal data).
// Inserts into prayer_cache_health table via service role key.
import { createClient } from '@supabase/supabase-js';

// Simple in-memory rate limit: max 10 inserts per second across all requests.
// Cloudflare Workers are stateless per-request so this is a soft guard only.
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

    // Basic rate-limit by IP: max 20 reports per IP per 10 minutes
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    if (_recentIps.has(ip)) {
        const entry = _recentIps.get(ip);
        if (now - entry.start < windowMs && entry.count >= 20) {
            return new Response('{"error":"rate_limit"}', { status: 429, headers: corsHeaders });
        }
        if (now - entry.start >= windowMs) {
            _recentIps.set(ip, { start: now, count: 1 });
        } else {
            entry.count++;
        }
    } else {
        _recentIps.set(ip, { start: now, count: 1 });
    }

    try {
        const body = await request.json();

        // Validate required fields
        if (!body.city || !body.baghdad_date || !body.cache_status) {
            return new Response('{"error":"missing required fields"}', { status: 400, headers: corsHeaders });
        }

        // Sanitize all string fields (max 100 chars each)
        function san(v) {
            if (v === null || v === undefined) return null;
            return String(v).slice(0, 100);
        }

        const row = {
            session_id:   san(body.session_id),
            platform:     san(body.platform),
            city:         san(body.city),
            baghdad_date: san(body.baghdad_date),
            cache_status: san(body.cache_status),
            stale_reason: san(body.stale_reason),
            cache_age_hours: typeof body.cache_age_hours === 'number' ? body.cache_age_hours : null,
            cache_version: san(body.cache_version),
            fajr_shown:   san(body.fajr_shown),
            dhuhr_shown:  san(body.dhuhr_shown),
            maghrib_shown: san(body.maghrib_shown),
            isha_shown:   san(body.isha_shown),
            notifications_rescheduled: body.notifications_rescheduled === true,
            changed_from: san(body.changed_from),
            error_msg:    san(body.error_msg)
        };

        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const { error } = await supabase.from('prayer_cache_health').insert(row);
        if (error) {
            console.error('[prayer-health-report] insert error:', error.message);
            return new Response('{"error":"db_error"}', { status: 500, headers: corsHeaders });
        }

        return new Response('{"ok":true}', { status: 200, headers: corsHeaders });

    } catch(e) {
        console.error('[prayer-health-report] error:', e);
        return new Response('{"error":"bad_request"}', { status: 400, headers: corsHeaders });
    }
}
