// App Error Reporting — anonymous client-side error collection
// Rate-limited to 30 reports per IP per 10 min. No raw IP stored.
import { createClient } from '@supabase/supabase-js';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
};

const VALID_SEVERITIES  = new Set(['critical', 'error', 'warning', 'info']);
const VALID_COMPONENTS  = new Set(['app','prayer','gencine','mushaf','audio','i18n','quran','qibla','books','smart-slides','cache','supabase','promise','network','sw','unknown']);

var _recentIps = new Map();

export async function onRequest(context) {
    const { request, env } = context;
    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
    if (request.method !== 'POST')    return json({ error: 'POST only' }, 405);

    // Rate limit: 30 reports per IP per 10 min
    const ip  = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const now = Date.now();
    const WIN = 10 * 60 * 1000;
    if (_recentIps.has(ip)) {
        const e = _recentIps.get(ip);
        if (now - e.start < WIN && e.count >= 30) return json({ error: 'rate_limit' }, 429);
        if (now - e.start >= WIN) _recentIps.set(ip, { start: now, count: 1 });
        else e.count++;
    } else {
        _recentIps.set(ip, { start: now, count: 1 });
    }

    try {
        const body = await request.json();
        if (!body.error_type) return json({ error: 'error_type required' }, 400);

        function san(v, max) {
            if (v == null) return null;
            return String(v).slice(0, max || 100);
        }

        const ipHash   = await hashIp(ip);
        const severity = VALID_SEVERITIES.has(body.severity) ? body.severity : 'error';
        const component = VALID_COMPONENTS.has(body.component) ? body.component : (san(body.component, 50) || null);
        const rawFp = san(body.fingerprint, 20) || '';
        const fp = (rawFp.replace(/[^a-f0-9]/gi, '') || await serverFingerprint(body.error_type, body.error_message, body.stack_trace));
        const ts = new Date().toISOString();

        const row = {
            // Core (original)
            platform:        san(body.platform, 20),
            app_version:     san(body.app_version, 30),
            error_type:      san(body.error_type, 50),
            error_message:   san(body.error_message, 500),
            stack_trace:     san(body.stack_trace, 2000),
            page_context:    san(body.page_context, 100),
            session_id:      san(body.session_id, 30),
            ip_hash:         ipHash,
            // Extended (new)
            severity,
            component,
            user_agent:      san(body.user_agent, 200),
            connection_type: san(body.connection_type, 20),
            tab_context:     san(body.tab_context, 100),
            breadcrumbs:     san(body.breadcrumbs, 1000),
            fingerprint:     fp,
            url:             san(body.url, 200),
            first_seen:      ts,
        };

        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        const { error } = await supabase.from('app_error_logs').insert(row);
        if (error) {
            console.error('[app-error-report] insert:', error.message);
            return json({ error: 'db_error' }, 500);
        }
        return json({ ok: true });
    } catch(e) {
        return json({ error: 'bad_request' }, 400);
    }
}

async function hashIp(ip) {
    try {
        const data = new TextEncoder().encode(ip + '_tafsirkurd_salt');
        const buf  = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(buf)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch(e) { return null; }
}

async function serverFingerprint(type, msg, stack) {
    try {
        const key  = (type||'') + ':' + (msg||'').slice(0,80) + ':' + ((stack||'').split('\n')[0]||'').slice(0,80);
        const data = new TextEncoder().encode(key);
        const buf  = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(buf)).slice(0, 4).map(b => b.toString(16).padStart(2,'0')).join('');
    } catch(e) { return null; }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: CORS });
}
