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
        const { action, email, password, token, turnstileToken } = await request.json();

        // Handle token verification
        if (action === 'verify') {
            if (!token) {
                return new Response(
                    JSON.stringify({ success: false, error: 'No token provided' }),
                    { status: 401, headers: corsHeaders }
                );
            }

            // Token verification - in production, verify against stored sessions
            // For now, just check if token exists (client-side session)
            return new Response(
                JSON.stringify({
                    success: true,
                    email: env.ADMIN_EMAIL || 'tefsirkurd@gmail.com'
                }),
                { status: 200, headers: corsHeaders }
            );
        }

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

        // Get client IP for rate limiting
        const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
        const attemptKey = `login_attempt_${clientIP}`;

        // Check if account is locked
        const attempts = await env.ADMIN_KV?.get(attemptKey) || '0';
        const attemptCount = parseInt(attempts);

        if (attemptCount >= 5) {
            return new Response(
                JSON.stringify({
                    error: 'Too many failed attempts. Account locked for 24 hours.',
                    locked: true,
                    attemptsRemaining: 0
                }),
                { status: 429, headers: corsHeaders }
            );
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
            // Track failed attempt
            const newAttemptCount = attemptCount + 1;
            const lockoutTime = 24 * 60 * 60; // 24 hours in seconds

            await env.ADMIN_KV?.put(attemptKey, newAttemptCount.toString(), {
                expirationTtl: lockoutTime
            });

            return new Response(
                JSON.stringify({
                    error: 'Invalid password',
                    attemptsRemaining: 5 - newAttemptCount
                }),
                { status: 401, headers: corsHeaders }
            );
        }

        // Successful login - clear failed attempts
        await env.ADMIN_KV?.delete(attemptKey);

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
