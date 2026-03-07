// Admin Books API — CRUD for gencine_books using service role key
// Browser cannot INSERT/UPDATE/DELETE as anon; this endpoint proxies with service role.

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
    }

    const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, '');
    const serviceKey  = env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[\n\r\s]/g, '');
    if (!supabaseUrl || !serviceKey) {
        return new Response(JSON.stringify({ error: 'Server config error' }), { status: 500, headers: corsHeaders });
    }

    let body;
    try { body = await request.json(); } catch(e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders });
    }

    const { action, token } = body;
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    // Verify admin token
    const sessionRes = await fetch(
        `${supabaseUrl}/rest/v1/admin_sessions?token=eq.${encodeURIComponent(token)}&select=id,expires_at`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    if (!sessionRes.ok) return new Response(JSON.stringify({ error: 'Auth check failed' }), { status: 401, headers: corsHeaders });
    const sessions = await sessionRes.json();
    if (!sessions.length || new Date(sessions[0].expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401, headers: corsHeaders });
    }

    const base = `${supabaseUrl}/rest/v1/gencine_books`;
    const hdrs = {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
    };

    try {
        if (action === 'list') {
            const r = await fetch(`${base}?select=*&order=sort_order`, { headers: hdrs });
            const data = await r.json();
            return new Response(JSON.stringify({ data }), { headers: corsHeaders });
        }

        if (action === 'insert') {
            const { payload } = body;
            const r = await fetch(base, { method: 'POST', headers: hdrs, body: JSON.stringify(payload) });
            const data = await r.json();
            if (!r.ok) return new Response(JSON.stringify({ error: data }), { status: r.status, headers: corsHeaders });
            return new Response(JSON.stringify({ data }), { headers: corsHeaders });
        }

        if (action === 'update') {
            const { id, payload } = body;
            const r = await fetch(`${base}?id=eq.${id}`, { method: 'PATCH', headers: hdrs, body: JSON.stringify(payload) });
            const data = await r.json();
            if (!r.ok) return new Response(JSON.stringify({ error: data }), { status: r.status, headers: corsHeaders });
            return new Response(JSON.stringify({ data }), { headers: corsHeaders });
        }

        if (action === 'delete') {
            const { id } = body;
            const r = await fetch(`${base}?id=eq.${id}`, { method: 'DELETE', headers: { ...hdrs, Prefer: 'return=minimal' } });
            if (!r.ok) { const e = await r.text(); return new Response(JSON.stringify({ error: e }), { status: r.status, headers: corsHeaders }); }
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
    } catch(e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
}
