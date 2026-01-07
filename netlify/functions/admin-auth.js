// Netlify Function - Admin Authentication
// Handles admin login authentication

exports.handler = async (event, context) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { action, email, password, turnstileToken } = JSON.parse(event.body);

        // Handle logout
        if (action === 'logout') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ success: true, message: 'Logged out successfully' })
            };
        }

        if (!password) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Password is required' })
            };
        }

        // Verify Turnstile token if provided
        if (turnstileToken && process.env.CLOUDFLARE_TURNSTILE_SECRET) {
            const turnstileResponse = await fetch(
                'https://challenges.cloudflare.com/turnstile/v0/siteverify',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        secret: process.env.CLOUDFLARE_TURNSTILE_SECRET,
                        response: turnstileToken
                    })
                }
            );

            const turnstileResult = await turnstileResponse.json();
            if (!turnstileResult.success) {
                return {
                    statusCode: 403,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'Captcha verification failed' })
                };
            }
        }

        // Hash the password using Web Crypto API (works everywhere)
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Compare with stored hash
        const storedHash = process.env.ADMIN_PASSWORD_HASH;

        if (!storedHash) {
            console.error('ADMIN_PASSWORD_HASH not configured');
            return {
                statusCode: 500,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Server configuration error' })
            };
        }

        if (hash !== storedHash) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid password' })
            };
        }

        // Generate session token using Web Crypto API
        const tokenArray = new Uint8Array(32);
        crypto.getRandomValues(tokenArray);
        const sessionToken = Array.from(tokenArray)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Store session in Supabase if available
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            const clientIP = event.headers['x-forwarded-for'] ||
                           event.headers['client-ip'] ||
                           'unknown';

            await supabase.from('admin_login_sessions').insert({
                session_token: sessionToken,
                ip_address: clientIP,
                user_agent: event.headers['user-agent'] || '',
                expires_at: expiresAt.toISOString()
            });
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                token: sessionToken,
                expiresAt: expiresAt.toISOString()
            })
        };

    } catch (error) {
        console.error('Admin auth error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message || 'Internal server error' })
        };
    }
};
