/**
 * Delete User Account
 * Deletes user from both auth.users and profiles table
 */

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Get auth token from request header
        const authHeader = event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Unauthorized - No auth token' })
            };
        }

        const token = authHeader.replace('Bearer ', '');

        // Initialize Supabase with service role key (has admin privileges)
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase configuration');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Verify the user's token and get their ID
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Invalid auth token' })
            };
        }

        const userId = user.id;
        console.log('Deleting account for user:', userId, user.email);

        // 1. Delete from profiles table (will cascade delete related data)
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (profileError) {
            console.error('Error deleting profile:', profileError);
            // Continue anyway to try deleting auth user
        }

        // 2. Delete from auth.users (requires service role)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

        if (deleteError) {
            console.error('Error deleting auth user:', deleteError);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'Failed to delete auth account',
                    details: deleteError.message
                })
            };
        }

        console.log('✅ Account deleted successfully:', userId);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: 'Account deleted successfully'
            })
        };

    } catch (error) {
        console.error('Delete account error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Internal server error',
                details: error.message
            })
        };
    }
};
