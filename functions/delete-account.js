// Migrated from Netlify to Cloudflare Pages
// Original: netlify/functions/delete-account.js

/**
 * Delete User Account
 * Deletes user from both auth.users and profiles table
 */

const { createClient } = require('@supabase/supabase-js');

export async function onRequest(context) {
    const { request, env } = context;
    // Only allow POST requests
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { "Content-Type": "application/json" } });
    }

    try {
        // Get auth token from request header
        const authHeader = Object.fromEntries(request.headers).authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Unauthorized - No auth token' }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        const token = authHeader.replace('Bearer ', '');

        // Initialize Supabase with service role key (has admin privileges)
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase configuration');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Verify the user's token and get their ID
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid auth token' }), { status: 401, headers: { "Content-Type": "application/json" } });
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
            return new Response(JSON.stringify({
                    error: 'Failed to delete auth account',
                    details: deleteError.message
                }), { status: 500, headers: { "Content-Type": "application/json" } });
        }

        console.log('✅ Account deleted successfully:', userId);

        return new Response(JSON.stringify({
                success: true,
                message: 'Account deleted successfully'
            }), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (error) {
        console.error('Delete account error:', error);
        return new Response(JSON.stringify({
                error: 'Internal server error',
                details: error.message
            }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
};
