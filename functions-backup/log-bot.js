// Migrated from Netlify to Cloudflare Pages
// Original: netlify/functions/log-bot.js

// Netlify function to log bot attempts
const { createClient } = require('@supabase/supabase-js');

export async function onRequest(context) {
    const { request, env } = context;
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only allow POST
    if (request.method !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const supabase = createClient(
            env.SUPABASE_URL,
            env.SUPABASE_ANON_KEY
        );

        const botData = JSON.parse(await request.text() || '{}');

        // Get client IP from headers
        const clientIP = Object.fromEntries(request.headers)['x-forwarded-for']?.split(',')[0] ||
                        Object.fromEntries(request.headers)['x-real-ip'] ||
                        Object.fromEntries(request.headers)['client-ip'] ||
                        'unknown';

        // Get country from Netlify headers
        const country = Object.fromEntries(request.headers)['x-country'] || 'unknown';
        const city = Object.fromEntries(request.headers)['x-city'] || 'unknown';

        // Prepare bot log entry
        const botLog = {
            user_agent: botData.userAgent,
            is_bot: botData.isBot,
            bot_type: botData.botType,
            is_allowed: botData.isAllowed,
            ip_address: clientIP,
            country: country,
            city: city,
            page: botData.page,
            referrer: botData.referrer,
            bot_score: botData.botScore || 0,
            checks: botData.checks || {},
            blocked: !botData.isAllowed,
            created_at: new Date().toISOString()
        };

        // Insert into database
        const { data, error } = await supabase
            .from('bot_logs')
            .insert([botLog]);

        if (error) {
            console.error('Error logging bot:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to log bot'
                })
            };
        }

        console.log(`🤖 Bot logged: ${botData.botType} from ${clientIP} - ${botData.isAllowed ? 'Allowed' : 'Blocked'}`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Bot logged successfully',
                blocked: !botData.isAllowed
            })
        };

    } catch (error) {
        console.error('Error in log-bot function:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};
