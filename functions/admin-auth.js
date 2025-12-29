// Cloudflare Pages Function - Admin Authentication
// Handles admin login authentication

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
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

    try {
        const { password, turnstileToken } = await request.json();

        if (!password) {
            return new Response(
                JSON.stringify({ error: 'Password is required' }),
                { status: 400, headers: corsHeaders }
            );
        }

        // Verify Turnstile token if provided
        if (turnstileToken && env.CLOUDFLARE_TURNSTILE_SECRET) {
            const turnstileResponse = await fetch(
                'https://challenges.cloudflare.com/turnstile/v0/siteverify',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        secret: env.CLOUDFLARE_TURNSTILE_SECRET,
                        response: turnstileToken
                    })
                }
            );

            const turnstileResult = await turnstileResponse.json();
            if (!turnstileResult.success) {
                return new Response(
                    JSON.stringify({ error: 'Captcha verification failed' }),
                    { status: 403, headers: corsHeaders }
                );
            }
        }

        // Hash the provided password
        const crypto = await import('crypto');
        const hash = crypto.createHash('sha256').update(password).digest('hex');

        // Compare with stored hash
        const storedHash = env.ADMIN_PASSWORD_HASH;

        if (!storedHash) {
            console.error('ADMIN_PASSWORD_HASH not configured');
            return new Response(
                JSON.stringify({ error: 'Server configuration error' }),
                { status: 500, headers: corsHeaders }
            );
        }

        if (hash !== storedHash) {
            return new Response(
                JSON.stringify({ error: 'Invalid password' }),
                { status: 401, headers: corsHeaders }
            );
        }

        // Generate session token (simple implementation)
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Store session in Supabase if available
        if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
                env.SUPABASE_URL,
                env.SUPABASE_SERVICE_ROLE_KEY
            );

            const clientIP = request.headers.get('CF-Connecting-IP') ||
                           request.headers.get('X-Forwarded-For') ||
                           'unknown';

            await supabase.from('admin_login_sessions').insert({
                session_token: sessionToken,
                ip_address: clientIP,
                user_agent: request.headers.get('User-Agent') || '',
                expires_at: expiresAt.toISOString()
            });
        }

        return new Response(
            JSON.stringify({
                success: true,
                sessionToken: sessionToken,
                expiresAt: expiresAt.toISOString()
            }),
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        console.error('Admin auth error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: corsHeaders }
        );
    }
}
