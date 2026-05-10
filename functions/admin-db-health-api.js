// Admin DB Health — row counts + sizes for known app tables (service role)
import { createClient } from '@supabase/supabase-js';

const CORS = {
    'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
};

const KNOWN_TABLES = [
    'user_data', 'push_tokens', 'admin_notifications', 'admin_users',
    'admin_sessions', 'admin_activity_log', 'kurdish_translations',
    'deleted_translation_keys', 'site_settings', 'islamvoice_episodes',
    'gencine_hadiths', 'gencine_duas', 'gencine_adhkar', 'gencine_books',
    'gencine_sections', 'prayer_cache_health', 'i18n_cache_health',
];

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
        // Parallel row count queries for all known tables
        const counts = await Promise.all(
            KNOWN_TABLES.map(name =>
                supabase.from(name).select('*', { count: 'exact', head: true })
                    .then(r => ({ name, count: r.count || 0, error: r.error?.message || null }))
                    .catch(e => ({ name, count: null, error: e.message }))
            )
        );

        // Recent writes (last 24h) for tables that have created_at/updated_at
        const ago24h = new Date(Date.now() - 86400000).toISOString();
        const recentWrites = await Promise.all([
            supabase.from('user_data').select('*', { count: 'exact', head: true }).gte('updated_at', ago24h).then(r => ({ name: 'user_data', recent: r.count || 0 })),
            supabase.from('admin_notifications').select('*', { count: 'exact', head: true }).gte('created_at', ago24h).then(r => ({ name: 'admin_notifications', recent: r.count || 0 })),
            supabase.from('admin_activity_log').select('*', { count: 'exact', head: true }).gte('created_at', ago24h).then(r => ({ name: 'admin_activity_log', recent: r.count || 0 })),
            supabase.from('push_tokens').select('*', { count: 'exact', head: true }).gte('created_at', ago24h).then(r => ({ name: 'push_tokens', recent: r.count || 0 })).catch(() => ({ name: 'push_tokens', recent: null })),
            supabase.from('kurdish_translations').select('*', { count: 'exact', head: true }).gte('created_at', ago24h).then(r => ({ name: 'kurdish_translations', recent: r.count || 0 })).catch(() => ({ name: 'kurdish_translations', recent: null })),
            supabase.from('i18n_cache_health').select('*', { count: 'exact', head: true }).gte('created_at', ago24h).then(r => ({ name: 'i18n_cache_health', recent: r.count || 0 })).catch(() => ({ name: 'i18n_cache_health', recent: null })),
        ]);

        const recentMap = {};
        recentWrites.forEach(r => { recentMap[r.name] = r.recent; });

        const tables = counts.map(c => ({ ...c, recent24h: recentMap[c.name] ?? null }));
        const totalRows = tables.reduce((s, r) => s + (r.count || 0), 0);

        return json({ success: true, tables, totalRows, checkedAt: new Date().toISOString() });
    }

    // Recent activity log entries
    if (action === 'get_recent_activity') {
        const { data, error } = await supabase
            .from('admin_activity_log')
            .select('admin_name, action_type, description, created_at')
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true, activity: data || [] });
    }

    return json({ error: 'Unknown action' }, 400);
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: CORS });
}
