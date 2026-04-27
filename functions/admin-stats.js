// Cloudflare Pages Function - Admin Dashboard Statistics
// Securely fetches stats using SERVICE_ROLE key
// v1.0 - Initial implementation

import { createClient } from '@supabase/supabase-js';

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: corsHeaders }
        );
    }

    // Create Supabase client with SERVICE_ROLE key for admin access
    const supabase = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );

    try {
        let body;
        try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders); }
        const { token } = body;

        // Verify admin session
        if (!token) {
            return jsonResponse({ error: 'No token provided' }, 401, corsHeaders);
        }

        const { data: session } = await supabase
            .from('admin_sessions')
            .select('user_id, admin_users(role, is_active)')
            .eq('token', token)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (!session || !session.admin_users || !session.admin_users.is_active) {
            return jsonResponse({ error: 'Invalid or expired session' }, 401, corsHeaders);
        }

        // Fetch all statistics using SERVICE_ROLE key (bypasses RLS)
        const [userCount, videoCount, messageCount, recentUsers, recentVideos, recentMessages] = await Promise.all([
            // Total users
            supabase
                .from('user_data')
                .select('*', { count: 'exact', head: true }),

            // Total videos
            supabase
                .from('islamvoice_episodes')
                .select('*', { count: 'exact', head: true }),

            // Total messages
            supabase
                .from('contact_messages')
                .select('*', { count: 'exact', head: true }),

            // Recent users (last 7 days)
            supabase
                .from('user_data')
                .select('id, email, full_name, created_at')
                .order('created_at', { ascending: false })
                .limit(10),

            // Recent videos
            supabase
                .from('islamvoice_episodes')
                .select('id, title, thumbnail_url, created_at')
                .order('created_at', { ascending: false })
                .limit(10),

            // Unread messages
            supabase
                .from('contact_messages')
                .select('*')
                .eq('is_read', false)
                .order('created_at', { ascending: false })
        ]);

        // Calculate additional stats
        const stats = {
            users: {
                total: userCount.count || 0,
                recent: recentUsers.data || []
            },
            videos: {
                total: videoCount.count || 0,
                recent: recentVideos.data || []
            },
            messages: {
                total: messageCount.count || 0,
                unread: (recentMessages.data || []).length,
                recent: recentMessages.data || []
            },
            timestamp: new Date().toISOString()
        };

        return jsonResponse({
            success: true,
            stats
        }, 200, corsHeaders);

    } catch (error) {
        console.error('Admin stats error:', error);
        return jsonResponse({ error: 'Internal server error' }, 500, corsHeaders);
    }
}

// Helper function
function jsonResponse(data, status, headers) {
    return new Response(JSON.stringify(data), { status, headers });
}
