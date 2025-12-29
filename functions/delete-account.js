// Cloudflare Pages Function - Delete Account
// Allows users to delete their account

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
        // Get auth token from header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: corsHeaders }
            );
        }

        const token = authHeader.substring(7);

        // Initialize Supabase client
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            env.SUPABASE_URL,
            env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Verify token and get user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid or expired token' }),
                { status: 401, headers: corsHeaders }
            );
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

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Account deleted successfully'
            }),
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        console.error('Delete account error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: corsHeaders }
        );
    }
}
