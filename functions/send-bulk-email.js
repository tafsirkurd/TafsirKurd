// Cloudflare Pages Function - Send Bulk Email
// Sends bulk emails via Brevo API

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: corsHeaders }
        );
    }

    // Require admin session token
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = env.SUPABASE_URL?.replace(/[\n\r\s]/g, '');
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[\n\r\s]/g, '');

    if (!supabaseUrl || !supabaseServiceKey) {
        return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 503, headers: corsHeaders });
    }

    const sessionRes = await fetch(
        `${supabaseUrl}/rest/v1/admin_sessions?token=eq.${encodeURIComponent(token)}&expires_at=gt.${new Date().toISOString()}&select=user_id`,
        { headers: { 'apikey': supabaseServiceKey, 'Authorization': `Bearer ${supabaseServiceKey}` } }
    );
    const sessions = sessionRes.ok ? await sessionRes.json() : [];
    if (!sessions || sessions.length === 0) {
        return new Response(JSON.stringify({ error: 'Invalid or expired session' }), { status: 401, headers: corsHeaders });
    }

    try {
        let data;
        try { data = await request.json(); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders }); }
        const { recipients, subject, htmlContent } = data;
        if (!Array.isArray(recipients) || !subject || !htmlContent) {
            return new Response(JSON.stringify({ error: 'recipients (array), subject, and htmlContent are required' }), { status: 400, headers: corsHeaders });
        }

        // Check if Brevo API is configured
        if (!env.BREVO_API_KEY) {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'Brevo API not configured'
                }),
                { status: 200, headers: corsHeaders }
            );
        }

        // TODO: Implement actual Brevo bulk email sending
        return new Response(
            JSON.stringify({ success: false, message: 'Bulk email sending not yet implemented' }),
            { status: 501, headers: corsHeaders }
        );
    } catch (error) {
        console.error('Bulk email error:', error);
        return new Response(
            JSON.stringify({ success: false, error: 'Internal server error' }),
            { status: 500, headers: corsHeaders }
        );
    }
}
