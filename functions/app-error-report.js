// App Error Reporting — anonymous client-side error collection
// Rate-limited, no personal data stored
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

    // Rate limit: 30 reports per IP per 10 minutes
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    if (_recentIps.has(ip)) {
        const entry = _recentIps.get(ip);
        if (now - entry.start < windowMs && entry.count >= 30)
            return new Response('{"error":"rate_limit"}', { status: 429, headers: CORS });
        if (now - entry.start >= windowMs) _recentIps.set(ip, { start: now, count: 1 });
        else entry.count++;
    } else {
        _recentIps.set(ip, { start: now, count: 1 });
    }

    try {
        const body = await request.json();

        if (!body.error_type) return new Response('{"error":"error_type required"}', { status: 400, headers: CORS });

        function san(v, max) {
            if (v === null || v === undefined) return null;
            return String(v).slice(0, max || 100);
        }

        // Hash IP for correlation without storing raw IP
        const ipHash = await hashIp(ip);

        const row = {
            platform:     san(body.platform),
            app_version:  san(body.app_version),
            error_type:   san(body.error_type),
            error_message: san(body.error_message, 500),
            stack_trace:  san(body.stack_trace, 2000),
            page_context: san(body.page_context),
            session_id:   san(body.session_id),
            ip_hash:      ipHash,
        };

        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const { error } = await supabase.from('app_error_logs').insert(row);
        if (error) {
            console.error('[app-error-report] insert error:', error.message);
            return new Response('{"error":"db_error"}', { status: 500, headers: CORS });
        }

        return new Response('{"ok":true}', { status: 200, headers: CORS });
    } catch(e) {
        return new Response('{"error":"bad_request"}', { status: 400, headers: CORS });
    }
}

async function hashIp(ip) {
    try {
        const data = new TextEncoder().encode(ip + '_tafsirkurd_salt');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch(e) {
        return null;
    }
}
