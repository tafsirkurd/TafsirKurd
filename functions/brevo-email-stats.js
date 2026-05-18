// Cloudflare Pages Function - Brevo Email Statistics
// Requires valid admin session token
export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
    if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });

    // Require admin session token
    const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, '');
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[\n\r\s]/g, '');
    if (!supabaseUrl || !supabaseServiceKey)
        return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 503, headers: corsHeaders });

    const sessionRes = await fetch(
        `${supabaseUrl}/rest/v1/admin_sessions?token=eq.${encodeURIComponent(token)}&expires_at=gt.${new Date().toISOString()}&select=user_id`,
        { headers: { 'apikey': supabaseServiceKey, 'Authorization': `Bearer ${supabaseServiceKey}` } }
    );
    const sessions = sessionRes.ok ? await sessionRes.json() : [];
    if (!sessions || sessions.length === 0)
        return new Response(JSON.stringify({ error: 'Invalid or expired session' }), { status: 401, headers: corsHeaders });

    // Brevo integration not yet implemented
    return new Response(JSON.stringify({
        success: false,
        message: 'Brevo integration not configured',
        data: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 }
    }), { status: 501, headers: corsHeaders });
}
