// Admin Errors API — read + manage app_error_logs
import { createClient } from '@supabase/supabase-js';

const CORS = {
    'Access-Control-Allow-Origin':  'https://tafsirkurd.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
};

export async function onRequest(context) {
    const { request, env } = context;
    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
    if (request.method !== 'POST')    return json({ error: 'POST only' }, 405);

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    // Auth
    const token = ((request.headers.get('Authorization') || '').replace('Bearer ', '') || body.token || '').trim();
    if (!token) return json({ error: 'No token' }, 401);

    const { data: session } = await supabase
        .from('admin_sessions')
        .select('user_id, admin_users(role, is_active)')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (!session?.admin_users?.is_active) return json({ error: 'Unauthorized' }, 403);
    const role = session.admin_users.role;

    const { action } = body;

    // ── LIST individual events ─────────────────────────────────────────
    if (action === 'list') {
        let q = supabase
            .from('app_error_logs')
            .select('*')
            .is('resolved_at', null)
            .order('created_at', { ascending: false })
            .limit(body.limit || 200);

        if (body.platform)   q = q.eq('platform',   body.platform);
        if (body.error_type) q = q.eq('error_type',  body.error_type);
        if (body.severity)   q = q.eq('severity',    body.severity);
        if (body.component)  q = q.eq('component',   body.component);
        if (body.since)      q = q.gte('created_at', body.since);
        if (body.search)     q = q.ilike('error_message', '%' + body.search + '%');
        if (body.include_resolved) q = q.not('resolved_at', 'is', null);

        const { data, error } = await q;
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, errors: data || [] });
    }

    // ── GROUPED — one row per unique fingerprint ───────────────────────
    if (action === 'get_grouped') {
        const since = body.since || new Date(Date.now() - 7 * 86400000).toISOString();

        let q = supabase
            .from('app_error_logs')
            .select('fingerprint, error_type, error_message, severity, component, platform, created_at, id')
            .is('resolved_at', null)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(5000);

        if (body.severity)  q = q.eq('severity',  body.severity);
        if (body.component) q = q.eq('component', body.component);
        if (body.platform)  q = q.eq('platform',  body.platform);

        const { data, error } = await q;
        if (error) return json({ error: error.message }, 500);

        // Group by fingerprint client-side (Supabase doesn't do GROUP BY in JS client easily)
        const groups = {};
        for (const r of (data || [])) {
            const fp = r.fingerprint || ('_nofp_' + r.error_type + r.error_message.slice(0, 30));
            if (!groups[fp]) {
                groups[fp] = {
                    fingerprint:   fp,
                    error_type:    r.error_type,
                    error_message: r.error_message,
                    severity:      r.severity,
                    component:     r.component,
                    platform:      r.platform,
                    first_seen:    r.created_at,
                    last_seen:     r.created_at,
                    count:         0,
                    ids:           [],
                };
            }
            const g = groups[fp];
            g.count++;
            g.ids.push(r.id);
            if (r.created_at < g.first_seen) g.first_seen = r.created_at;
            if (r.created_at > g.last_seen)  g.last_seen  = r.created_at;
        }

        const grouped = Object.values(groups).sort((a, b) => b.count - a.count);
        return json({ success: true, groups: grouped });
    }

    // ── STATS ──────────────────────────────────────────────────────────
    if (action === 'get_stats') {
        const ago7d  = new Date(Date.now() -  7 * 86400000).toISOString();
        const ago24h = new Date(Date.now() -      86400000).toISOString();
        const ago30d = new Date(Date.now() - 30 * 86400000).toISOString();

        const [r24h, r7d, rCrit24h, r30d, bySev, byComp, byPlat, byType] = await Promise.all([
            supabase.from('app_error_logs').select('*', { count: 'exact', head: true }).gte('created_at', ago24h).is('resolved_at', null),
            supabase.from('app_error_logs').select('*', { count: 'exact', head: true }).gte('created_at', ago7d).is('resolved_at', null),
            supabase.from('app_error_logs').select('*', { count: 'exact', head: true }).gte('created_at', ago24h).eq('severity', 'critical').is('resolved_at', null),
            supabase.from('app_error_logs').select('severity, component, created_at, platform, error_type, fingerprint').gte('created_at', ago30d).is('resolved_at', null).limit(8000),
            supabase.from('app_error_logs').select('severity').gte('created_at', ago7d).is('resolved_at', null).limit(3000),
            supabase.from('app_error_logs').select('component').gte('created_at', ago7d).is('resolved_at', null).limit(3000),
            supabase.from('app_error_logs').select('platform').gte('created_at', ago7d).is('resolved_at', null).limit(3000),
            supabase.from('app_error_logs').select('error_type').gte('created_at', ago7d).is('resolved_at', null).limit(3000),
        ]);

        // Daily counts (30d)
        const dayMap = {};
        for (let i = 0; i < 30; i++) {
            const dt = new Date(Date.now() - (29 - i) * 86400000);
            dayMap[dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' })] = 0;
        }
        for (const r of (r30d.data || [])) {
            const k = new Date(r.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
            if (k in dayMap) dayMap[k]++;
        }
        const dailyData = Object.keys(dayMap).sort().map(d => ({ date: d, count: dayMap[d] }));

        // Unique fingerprints in 7d
        const fpSet = new Set((r30d.data || []).map(r => r.fingerprint).filter(Boolean));

        function tally(rows, key) {
            const m = {};
            for (const r of (rows || [])) m[r[key] || 'unknown'] = (m[r[key] || 'unknown'] || 0) + 1;
            return Object.entries(m).map(([k, v]) => ({ name: k, count: v })).sort((a,b) => b.count - a.count);
        }

        return json({
            success: true,
            counts: {
                last24h:    r24h.count  || 0,
                last7d:     r7d.count   || 0,
                critical24h: rCrit24h.count || 0,
                uniqueTypes: fpSet.size,
            },
            dailyData,
            bySeverity:  tally(bySev.data,  'severity'),
            byComponent: tally(byComp.data, 'component'),
            byPlatform:  tally(byPlat.data, 'platform'),
            byType:      tally(byType.data, 'error_type'),
        });
    }

    // ── RESOLVE — soft delete (sets resolved_at) ───────────────────────
    if (action === 'resolve') {
        const ids = Array.isArray(body.ids) ? body.ids : (body.id ? [body.id] : []);
        if (!ids.length) return json({ error: 'No ids provided' }, 400);
        const { error } = await supabase
            .from('app_error_logs')
            .update({ resolved_at: new Date().toISOString(), resolved_by: role })
            .in('id', ids)
            .is('resolved_at', null);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
    }

    // ── RESOLVE ALL by fingerprint ─────────────────────────────────────
    if (action === 'resolve_fingerprint') {
        if (!body.fingerprint) return json({ error: 'fingerprint required' }, 400);
        const { error } = await supabase
            .from('app_error_logs')
            .update({ resolved_at: new Date().toISOString(), resolved_by: role })
            .eq('fingerprint', body.fingerprint)
            .is('resolved_at', null);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
    }

    // ── CLEAR OLD — hard delete (super_admin only) ─────────────────────
    if (action === 'clear_old') {
        if (role !== 'super_admin') return json({ error: 'super_admin required' }, 403);
        const cutoff = body.before || new Date(Date.now() - 30 * 86400000).toISOString();
        const { error } = await supabase.from('app_error_logs').delete().lt('created_at', cutoff);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
    }

    return json({ error: 'Unknown action' }, 400);
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: CORS });
}
