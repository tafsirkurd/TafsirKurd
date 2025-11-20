// Netlify function to log bot attempts
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        const botData = JSON.parse(event.body || '{}');

        // Get client IP from headers
        const clientIP = event.headers['x-forwarded-for']?.split(',')[0] ||
                        event.headers['x-real-ip'] ||
                        event.headers['client-ip'] ||
                        'unknown';

        // Get country from Netlify headers
        const country = event.headers['x-country'] || 'unknown';
        const city = event.headers['x-city'] || 'unknown';

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
