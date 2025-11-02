// netlify/functions/user-data.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // Verify Supabase config
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
            throw new Error('Supabase configuration missing');
        }

        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        const body = JSON.parse(event.body || '{}');
        const { userId, action, data } = body;

        // Validate userId
        if (!userId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'User ID required' })
            };
        }

        // SAVE user data
        if (action === 'save' && event.httpMethod === 'POST') {
            const { error } = await supabase
                .from('user_data')
                .upsert({
                    user_id: userId,
                    data: data,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) {
                console.error('Save error:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ success: false, error: error.message })
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'Data saved successfully' })
            };
        }

        // LOAD user data
        if (action === 'load' && event.httpMethod === 'POST') {
            const { data: userData, error } = await supabase
                .from('user_data')
                .select('data')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = not found
                console.error('Load error:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ success: false, error: error.message })
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    data: userData ? userData.data : null
                })
            };
        }

        // DELETE user data (for account deletion)
        if (action === 'delete' && event.httpMethod === 'POST') {
            const { error } = await supabase
                .from('user_data')
                .delete()
                .eq('user_id', userId);

            if (error) {
                console.error('Delete error:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ success: false, error: error.message })
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'Data deleted successfully' })
            };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ success: false, error: 'Invalid action' })
        };

    } catch (error) {
        console.error('User data function error:', error);
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
