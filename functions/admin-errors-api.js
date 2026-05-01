// Admin Errors API — read + manage app_error_logs (service role)
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

    // ── LIST recent errors ────────────────────────────────────────
    if (action === 'list') {
        let q = supabase
            .from('app_error_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(body.limit || 100);

        if (body.platform) q = q.eq('platform', body.platform);
        if (body.error_type) q = q.eq('error_type', body.error_type);
        if (body.since) q = q.gte('created_at', body.since);

        const { data, error } = await q;
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, errors: data || [] });
    }

    // ── STATS — counts by type + platform last 7d ─────────────────
    if (action === 'get_stats') {
        const ago7d  = new Date(Date.now() -  7 * 86400000).toISOString();
        const ago24h = new Date(Date.now() -      86400000).toISOString();
        const ago30d = new Date(Date.now() - 30 * 86400000).toISOString();

        const [r7d, r24h, r30d, byType, byPlatform] = await Promise.all([
            supabase.from('app_error_logs').select('*', { count: 'exact', head: true }).gte('created_at', ago7d),
            supabase.from('app_error_logs').select('*', { count: 'exact', head: true }).gte('created_at', ago24h),
            supabase.from('app_error_logs').select('error_type, platform, created_at').gte('created_at', ago30d).limit(5000),
            supabase.from('app_error_logs').select('error_type').gte('created_at', ago7d).limit(2000),
            supabase.from('app_error_logs').select('platform').gte('created_at', ago7d).limit(2000),
        ]);

        // Group by day (last 30d)
        const dayMap = {};
        for (let d = 0; d < 30; d++) {
            const dt = new Date(Date.now() - (29 - d) * 86400000);
            dayMap[dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' })] = 0;
        }
        for (const r of (r30d.data || [])) {
            const k = new Date(r.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
            if (k in dayMap) dayMap[k]++;
        }
        const dailyData = Object.keys(dayMap).sort().map(date => ({ date, count: dayMap[date] }));

        // Type breakdown
        const typeMap = {};
        for (const r of (byType.data || []))
            typeMap[r.error_type] = (typeMap[r.error_type] || 0) + 1;

        // Platform breakdown
        const platMap = {};
        for (const r of (byPlatform.data || []))
            platMap[r.platform || 'unknown'] = (platMap[r.platform || 'unknown'] || 0) + 1;

        return json({
            success: true,
            counts: { last24h: r24h.count || 0, last7d: r7d.count || 0 },
            dailyData,
            byType: Object.entries(typeMap).map(([type, count]) => ({ type, count })).sort((a,b) => b.count - a.count),
            byPlatform: Object.entries(platMap).map(([platform, count]) => ({ platform, count })),
        });
    }

    // ── DELETE old errors (super_admin only) ──────────────────────
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
