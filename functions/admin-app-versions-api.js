// Admin App Versions API — read version distribution stats
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

    const { action } = body;

    if (action === 'get_stats') {
        const [versionRows, activeUsers] = await Promise.all([
            supabase.from('app_version_stats')
                .select('platform, build_number, app_version, device_count, last_seen, first_seen')
                .order('last_seen', { ascending: false })
                .limit(100),
            // Active users last 7 days from user_data
            supabase.from('user_data')
                .select('*', { count: 'exact', head: true })
                .gte('updated_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        ]);

        const rows = versionRows.data || [];

        // Group by platform
        const byPlatform = {};
        let totalDevices = 0;
        for (const r of rows) {
            const p = r.platform || 'unknown';
            if (!byPlatform[p]) byPlatform[p] = [];
            byPlatform[p].push(r);
            totalDevices += r.device_count || 0;
        }

        // Find latest build per platform
        const latestBuilds = {};
        for (const [p, items] of Object.entries(byPlatform)) {
            const sorted = items.slice().sort((a, b) =>
                parseInt(b.build_number) - parseInt(a.build_number) || new Date(b.last_seen) - new Date(a.last_seen)
            );
            latestBuilds[p] = sorted[0]?.build_number || '—';
        }

        return json({
            success: true,
            rows,
            byPlatform,
            latestBuilds,
            totalDevices,
            activeUsers7d: activeUsers.count || 0,
        });
    }

    return json({ error: 'Unknown action' }, 400);
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: CORS });
}
