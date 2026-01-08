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
        const { action, email, password, turnstileToken } = await request.json();

        // Handle logout
        if (action === 'logout') {
            return new Response(
                JSON.stringify({ success: true, message: 'Logged out successfully' }),
                { status: 200, headers: corsHeaders }
            );
        }

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

        // Hash the password using Web Crypto API
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

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

        // Generate session token using Web Crypto API
        const tokenArray = new Uint8Array(32);
        crypto.getRandomValues(tokenArray);
        const sessionToken = Array.from(tokenArray)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Note: Session storage removed to avoid Supabase SDK dependency in Cloudflare Pages
        // Sessions are managed client-side with sessionStorage
        console.log('Admin login successful:', {
            timestamp: new Date().toISOString(),
            ip: request.headers.get('CF-Connecting-IP') || 'unknown'
        });

        return new Response(
            JSON.stringify({
                success: true,
                token: sessionToken,
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
