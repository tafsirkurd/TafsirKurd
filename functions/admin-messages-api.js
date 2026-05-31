// Cloudflare Pages Function - Admin Messages API
// Uses SERVICE_ROLE key to bypass RLS for delete/update operations

import { createClient } from '@supabase/supabase-js';

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Only allow POST
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
        // Parse request body with error handling
        let body;
        try {
            const text = await request.text();
            if (!text || text.trim() === '') {
                return jsonResponse({ error: 'Empty request body' }, 400, corsHeaders);
            }
            body = JSON.parse(text);
        } catch (parseError) {
            return jsonResponse({ error: 'Invalid JSON in request body', details: parseError.message }, 400, corsHeaders);
        }
        const { action, token, messageId, data } = body;

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

        // Handle different actions
        switch (action) {
            case 'delete':
                if (!messageId) {
                    return jsonResponse({ error: 'Message ID required' }, 400, corsHeaders);
                }

                const { error: deleteError } = await supabase
                    .from('contact_messages')
                    .delete()
                    .eq('id', messageId);

                if (deleteError) {
                    console.error('Delete error:', deleteError);
                    return jsonResponse({ error: 'Failed to delete message', details: deleteError.message }, 500, corsHeaders);
                }

                return jsonResponse({ success: true, message: 'Message deleted' }, 200, corsHeaders);

            case 'update':
                if (!messageId || !data) {
                    return jsonResponse({ error: 'Message ID and data required' }, 400, corsHeaders);
                }

                // Whitelist allowed fields to prevent arbitrary column updates
                const allowedUpdateFields = {};
                if (data.is_read !== undefined) allowedUpdateFields.is_read = !!data.is_read;
                if (data.is_featured !== undefined) allowedUpdateFields.is_featured = !!data.is_featured;
                if (data.notes !== undefined) allowedUpdateFields.notes = String(data.notes).slice(0, 2000);
                const VALID_STATUSES = ['new', 'read', 'replied', 'archived', 'spam'];
                if (data.status !== undefined && VALID_STATUSES.includes(data.status)) allowedUpdateFields.status = data.status;

                if (Object.keys(allowedUpdateFields).length === 0) {
                    return jsonResponse({ error: 'No valid fields to update' }, 400, corsHeaders);
                }

                const { error: updateError } = await supabase
                    .from('contact_messages')
                    .update(allowedUpdateFields)
                    .eq('id', messageId);

                if (updateError) {
                    console.error('Update error:', updateError);
                    return jsonResponse({ error: 'Failed to update message', details: updateError.message }, 500, corsHeaders);
                }

                return jsonResponse({ success: true, message: 'Message updated' }, 200, corsHeaders);

            case 'list':
                const { data: messages, error: listError } = await supabase
                    .from('contact_messages')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (listError) {
                    return jsonResponse({ error: 'Failed to fetch messages' }, 500, corsHeaders);
                }

                return jsonResponse({ success: true, messages }, 200, corsHeaders);

            default:
                return jsonResponse({ error: 'Invalid action' }, 400, corsHeaders);
        }

    } catch (error) {
        console.error('Admin messages API error:', error);
        return jsonResponse({ error: 'Internal server error' }, 500, corsHeaders);
    }
}

function jsonResponse(data, status, headers) {
    return new Response(JSON.stringify(data), { status, headers });
}
// Redeployed Sat, Feb  7, 2026 10:22:26 AM
