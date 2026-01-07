// Netlify Function - Delete Account
// Allows users to delete their account

exports.handler = async (event, context) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
        // Get auth token from header
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Unauthorized' })
            };
        }

        const token = authHeader.substring(7);

        // Initialize Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Verify token and get user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Invalid or expired token' })
            };
        }

        // Delete user's profile data
        await supabase
            .from('profiles')
            .delete()
            .eq('id', user.id);

        // Delete user's reading progress
        await supabase
            .from('reading_progress')
            .delete()
            .eq('user_id', user.id);

        // Delete user's bookmarks
        await supabase
            .from('bookmarks')
            .delete()
            .eq('user_id', user.id);

        // Delete user's goals
        await supabase
            .from('goals')
            .delete()
            .eq('user_id', user.id);

        // Delete auth user (this will cascade delete related data)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

        if (deleteError) {
            throw new Error('Failed to delete user: ' + deleteError.message);
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'Account deleted successfully'
            })
        };

    } catch (error) {
        console.error('Delete account error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message || 'Internal server error' })
        };
    }
};
