// Cloudflare Pages Function - Delete Account
// Verifies user token, then uses service role to fully delete the account from Supabase Auth

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

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: corsHeaders });
    }

    // Verify the caller's user token
    const authHeader = request.headers.get('Authorization') || '';
    const userToken = authHeader.replace('Bearer ', '').trim();
    if (!userToken) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: corsHeaders });
    }

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${userToken}`
        }
    });

    if (!userRes.ok) {
        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401, headers: corsHeaders });
    }

    const user = await userRes.json();
    if (!user || !user.id) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders });
    }

    const userId = user.id;

    try {
        // Delete app data rows (best-effort; failures are logged but don't block auth deletion)
        await Promise.allSettled([
            fetch(`${supabaseUrl}/rest/v1/user_data?user_id=eq.${encodeURIComponent(userId)}`, {
                method: 'DELETE',
                headers: { 'apikey': supabaseServiceKey, 'Authorization': `Bearer ${supabaseServiceKey}` }
            }),
            fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
                method: 'DELETE',
                headers: { 'apikey': supabaseServiceKey, 'Authorization': `Bearer ${supabaseServiceKey}` }
            })
        ]);

        // Delete the Supabase Auth user (requires service role)
        const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
            method: 'DELETE',
            headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`
            }
        });

        if (!deleteRes.ok) {
            const errBody = await deleteRes.json().catch(() => ({}));
            throw new Error(errBody.message || `Auth deletion failed: ${deleteRes.status}`);
        }

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
    } catch (e) {
        console.error('Delete account error:', e);
        return new Response(JSON.stringify({ error: e.message || 'Account deletion failed' }), { status: 500, headers: corsHeaders });
    }
}
