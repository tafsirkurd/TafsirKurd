// POST /db-cleanup
// Deletes old rows from high-growth monitoring tables.
// Called daily by notify-cron worker at 02:00 UTC.

const CORS = {
    'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
};

const RULES = [
    // table                  keep_days  reason
    ['prayer_cache_health',   7,         'health monitoring — only recent data is useful'],
    ['widget_health_reports', 7,         'health monitoring — only recent data is useful'],
    ['admin_activity_feed',   60,        'admin UX feed — 2 months history is enough'],
    ['admin_audit_logs',      90,        'audit trail — 3 months retained'],
    ['app_error_logs',        30,        'error logs — 30 days retained'],
];

export async function onRequest(context) {
    const { request, env } = context;
    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

    const auth = request.headers.get('Authorization') || '';
    const secret = env.CRON_SECRET;
    if (!secret || auth !== `Bearer ${secret}`) return json({ error: 'Unauthorized' }, 401);

    const base = (env.SUPABASE_URL || '').replace(/[\n\r\s]/g, '');
    const key  = (env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/[\n\r\s]/g, '');
    if (!base || !key) return json({ error: 'Missing Supabase config' }, 500);

    const headers = {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
    };

    const results = [];

    for (const [table, days] of RULES) {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        try {
            const res = await fetch(
                `${base}/rest/v1/${table}?created_at=lt.${cutoff}`,
                { method: 'DELETE', headers }
            );
            const deleted = parseInt(res.headers.get('content-range')?.split('/')[0]?.split('-')[1] ?? '0') || 0;
            results.push({ table, deleted, ok: res.ok });
        } catch (e) {
            results.push({ table, deleted: 0, ok: false, error: e.message });
        }
    }

    const totalDeleted = results.reduce((s, r) => s + r.deleted, 0);
    console.log('[db-cleanup]', new Date().toISOString(), JSON.stringify(results));

    return json({ ok: true, cleaned: results, totalDeleted });
}

function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), { status, headers: CORS });
}
