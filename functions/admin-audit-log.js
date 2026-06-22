// POST /admin-audit-log
// Logs an admin action to admin_audit_logs table.
// Called by admin-tasks.html and other admin pages for client-side audit events.

import { createClient } from '@supabase/supabase-js';

const CORS = {
    'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
};

export async function onRequest(context) {
    const { request, env } = context;
    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { token, action, details, page_slug, resource_type, severity } = body || {};
    if (!token || !action) return json({ error: 'token and action required' }, 400);

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the admin session token
    const { data: session } = await supabase
        .from('admin_sessions')
        .select('user_id')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (!session) return json({ error: 'Unauthorized' }, 401);

    // Get admin email for the log
    const { data: adminUser } = await supabase
        .from('admin_users')
        .select('email')
        .eq('id', session.user_id)
        .single();

    await supabase.from('admin_audit_logs').insert([{
        email: adminUser?.email || '',
        action: String(action).slice(0, 100),
        details: details || null,
        page_slug: page_slug || 'admin-tasks',
        resource_type: resource_type || 'task',
        severity: severity || 'info',
    }]);

    return json({ success: true });
}

function json(obj, status = 200) {
    return new Response(JSON.stringify(obj), { status, headers: CORS });
}
