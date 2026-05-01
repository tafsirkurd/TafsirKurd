// Admin Dashboard Statistics — service role key bypasses RLS on user_data
import { createClient } from '@supabase/supabase-js';

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
    if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        let body;
        try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders); }
        const { token } = body;

        if (!token) return jsonResponse({ error: 'No token' }, 401, corsHeaders);

        const { data: session } = await supabase
            .from('admin_sessions')
            .select('user_id, admin_users(role, is_active)')
            .eq('token', token)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (!session?.admin_users?.is_active) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);

        const now = new Date();
        const today     = new Date(now); today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today.getTime() - 86400000);
        const ago7      = new Date(now.getTime() - 7  * 86400000);
        const ago30     = new Date(now.getTime() - 30 * 86400000);

        // All queries in parallel — service role bypasses user_data RLS
        const [
            activeToday, activeYesterday, active7d, active30d,
            signupRows, activeRows,
            recentUserRows
        ] = await Promise.all([
            // Active counts
            supabase.from('user_data').select('*', { count: 'exact', head: true })
                .gte('updated_at', today.toISOString()),
            supabase.from('user_data').select('*', { count: 'exact', head: true })
                .gte('updated_at', yesterday.toISOString()).lt('updated_at', today.toISOString()),
            supabase.from('user_data').select('*', { count: 'exact', head: true })
                .gte('updated_at', ago7.toISOString()),
            supabase.from('user_data').select('*', { count: 'exact', head: true })
                .gte('updated_at', ago30.toISOString()),

            // Chart: daily signups last 30 days
            supabase.from('user_data').select('created_at')
                .gte('created_at', ago30.toISOString())
                .order('created_at', { ascending: true })
                .limit(5000),

            // Chart: daily active last 7 days
            supabase.from('user_data').select('updated_at')
                .gte('updated_at', ago7.toISOString())
                .limit(5000),

            // Recent users for the panel
            supabase.from('user_data').select('user_id, created_at')
                .order('created_at', { ascending: false }).limit(5)
        ]);

        // Group signups by Baghdad date
        const growthMap = {};
        for (let d = 0; d < 30; d++) {
            const dt = new Date(ago30.getTime() + d * 86400000);
            growthMap[dt.toISOString().slice(0, 10)] = 0;
        }
        (signupRows.data || []).forEach(r => {
            const k = new Date(r.created_at)
                .toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
            if (growthMap.hasOwnProperty(k)) growthMap[k]++;
        });
        const growthData = Object.keys(growthMap).sort()
            .map(date => ({ date, count: growthMap[date] }));

        // Group active by Baghdad date
        const activeMap = {};
        for (let d = 0; d < 7; d++) {
            const dt = new Date(ago7.getTime() + d * 86400000);
            activeMap[dt.toISOString().slice(0, 10)] = 0;
        }
        (activeRows.data || []).forEach(r => {
            const k = new Date(r.updated_at)
                .toLocaleDateString('en-CA', { timeZone: 'Asia/Baghdad' });
            if (activeMap.hasOwnProperty(k)) activeMap[k]++;
        });
        const activeData = Object.keys(activeMap).sort()
            .map(date => ({ date, count: activeMap[date] }));

        return jsonResponse({
            success: true,
            activeToday:     activeToday.count     || 0,
            activeYesterday: activeYesterday.count  || 0,
            active7d:        active7d.count         || 0,
            active30d:       active30d.count        || 0,
            growthData,
            activeData,
            recentUsers: recentUserRows.data || []
        }, 200, corsHeaders);

    } catch(e) {
        console.error('admin-stats error:', e);
        return jsonResponse({ error: 'Internal server error' }, 500, corsHeaders);
    }
}

function jsonResponse(data, status, headers) {
    return new Response(JSON.stringify(data), { status, headers });
}
