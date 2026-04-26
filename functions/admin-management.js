// Admin Management API - Force Logout, Device Reset, Permissions
import { createClient } from '@supabase/supabase-js';
import { hash } from 'bcrypt-ts';

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': 'https://tafsirkurd.com',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
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
        const body = await request.json();
        const { action, token, targetUserId } = body;
        const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
        const userAgent = request.headers.get('User-Agent') || 'unknown';

        if (!token) {
            return jsonResponse({ error: 'No token provided' }, 401, corsHeaders);
        }

        // Verify the requesting user is a super admin
        const { data: session } = await supabase
            .from('admin_sessions')
            .select('user_id, admin_users(role, email, is_active)')
            .eq('token', token)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (!session || !session.admin_users || session.admin_users.role !== 'super_admin' || !session.admin_users.is_active) {
            return jsonResponse({ error: 'Unauthorized. Super Admin access required.' }, 403, corsHeaders);
        }

        const adminEmail = session.admin_users.email;

        // ===== LIST ACCOUNTS =====
        if (action === 'list_accounts') {
            const { data, error } = await supabase
                .from('admin_users')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) return jsonResponse({ error: error.message }, 500, corsHeaders);
            return jsonResponse({ data }, 200, corsHeaders);
        }

        if (action === 'list_sessions') {
            const { data, error } = await supabase
                .from('admin_sessions')
                .select('id, ip_address, last_activity, expires_at, user_id, user_agent')
                .gt('expires_at', new Date().toISOString())
                .order('last_activity', { ascending: false })
                .limit(20);
            if (error) return jsonResponse({ error: error.message }, 500, corsHeaders);
            return jsonResponse({ data }, 200, corsHeaders);
        }

        // ===== RESET DEVICE BY EMAIL =====
        if (action === 'reset_device_by_email') {
            const { email } = body;
            if (!email) return jsonResponse({ error: 'Email required' }, 400, corsHeaders);
            const { data: target, error: fe } = await supabase
                .from('admin_users').select('id, email').eq('email', email).single();
            if (fe || !target) return jsonResponse({ error: 'User not found' }, 404, corsHeaders);
            await supabase.from('admin_users').update({ device_fingerprint: null }).eq('id', target.id);
            return jsonResponse({ success: true, message: 'Device lock cleared for ' + email }, 200, corsHeaders);
        }

        // ===== CREATE ACCOUNT =====
        if (action === 'create_account') {
            const { email, password, full_name, role } = body;

            if (!email || !password) {
                return jsonResponse({ error: 'Email and password are required' }, 400, corsHeaders);
            }

            // Check if email already exists
            const { data: existingUser } = await supabase
                .from('admin_users')
                .select('id')
                .eq('email', email.toLowerCase())
                .single();

            if (existingUser) {
                return jsonResponse({ error: 'Email already exists' }, 400, corsHeaders);
            }

            // Hash password using bcrypt (same as admin-auth.js)
            const password_hash = await hash(password, 10);

            // Create new admin user
            const { data: newUser, error: insertError } = await supabase
                .from('admin_users')
                .insert({
                    email: email.toLowerCase(),
                    password_hash,
                    full_name: full_name || null,
                    role: role || 'editor',
                    is_active: true
                })
                .select()
                .single();

            if (insertError) {
                return jsonResponse({ error: 'Failed to create account' }, 500, corsHeaders);
            }

            // Log action
            await supabase
                .from('admin_audit_logs')
                .insert({
                    user_id: session.user_id,
                    email: adminEmail,
                    action: 'create_admin_account',
                    details: {
                        new_user_id: newUser.id,
                        new_user_email: email.toLowerCase(),
                        new_user_role: role || 'editor'
                    },
                    ip_address: clientIP,
                    user_agent: userAgent,
                    severity: 'info'
                });

            return jsonResponse({
                success: true,
                message: `Admin account created for ${email}`,
                user: {
                    id: newUser.id,
                    email: newUser.email,
                    full_name: newUser.full_name,
                    role: newUser.role
                }
            }, 200, corsHeaders);
        }

        // ===== UPDATE ACCOUNT =====
        if (action === 'update_account') {
            const { email, password, full_name, role, is_active } = body;

            if (!targetUserId) {
                return jsonResponse({ error: 'Target user ID required' }, 400, corsHeaders);
            }

            if (!email) {
                return jsonResponse({ error: 'Email is required' }, 400, corsHeaders);
            }

            // Get target user info
            const { data: targetUser } = await supabase
                .from('admin_users')
                .select('email')
                .eq('id', targetUserId)
                .single();

            const updateData = {
                email: email.toLowerCase(),
                full_name: full_name || null,
                role: role || 'editor',
                is_active: is_active !== undefined ? is_active : true
            };

            // If password is provided, hash it with bcrypt
            if (password) {
                updateData.password_hash = await hash(password, 10);
            }

            // Update admin user
            const { error: updateError } = await supabase
                .from('admin_users')
                .update(updateData)
                .eq('id', targetUserId);

            if (updateError) {
                return jsonResponse({ error: 'Failed to update account' }, 500, corsHeaders);
            }

            // Invalidate ALL sessions for target user when password is changed
            if (password) {
                await supabase.from('admin_sessions').delete().eq('user_id', targetUserId);
            }

            // Log action
            await supabase
                .from('admin_audit_logs')
                .insert({
                    user_id: session.user_id,
                    email: adminEmail,
                    action: 'update_admin_account',
                    details: {
                        target_user_id: targetUserId,
                        target_email: targetUser?.email,
                        new_email: email.toLowerCase(),
                        password_changed: !!password
                    },
                    ip_address: clientIP,
                    user_agent: userAgent,
                    severity: 'info'
                });

            return jsonResponse({
                success: true,
                message: `Admin account updated for ${email}`
            }, 200, corsHeaders);
        }

        // ===== FORCE LOGOUT =====
        if (action === 'force_logout') {
            if (!targetUserId) {
                return jsonResponse({ error: 'Target user ID required' }, 400, corsHeaders);
            }

            // Get target user info
            const { data: targetUser } = await supabase
                .from('admin_users')
                .select('email')
                .eq('id', targetUserId)
                .single();

            // Delete all sessions for target user
            await supabase
                .from('admin_sessions')
                .delete()
                .eq('user_id', targetUserId);

            // Update status to offline
            await supabase
                .from('admin_users')
                .update({ status: 'offline', last_heartbeat: null })
                .eq('id', targetUserId);

            // Log action
            await supabase
                .from('admin_audit_logs')
                .insert({
                    user_id: session.user_id,
                    email: adminEmail,
                    action: 'force_logout_admin',
                    details: {
                        target_user_id: targetUserId,
                        target_email: targetUser?.email,
                        reason: 'Super Admin initiated force logout'
                    },
                    ip_address: clientIP,
                    user_agent: userAgent,
                    severity: 'warning'
                });

            return jsonResponse({
                success: true,
                message: `Successfully logged out ${targetUser?.email}`
            }, 200, corsHeaders);
        }

        // ===== RESET DEVICE LOCK =====
        if (action === 'reset_device') {
            if (!targetUserId) {
                return jsonResponse({ error: 'Target user ID required' }, 400, corsHeaders);
            }

            // Get target user info
            const { data: targetUser } = await supabase
                .from('admin_users')
                .select('email, device_fingerprint')
                .eq('id', targetUserId)
                .single();

            // Reset device lock
            await supabase
                .from('admin_users')
                .update({
                    device_fingerprint: null,
                    device_user_agent: null,
                    device_ip: null,
                    device_locked_at: null
                })
                .eq('id', targetUserId);

            // Log action
            await supabase
                .from('admin_audit_logs')
                .insert({
                    user_id: session.user_id,
                    email: adminEmail,
                    action: 'reset_device_lock',
                    details: {
                        target_user_id: targetUserId,
                        target_email: targetUser?.email,
                        previous_fingerprint: targetUser?.device_fingerprint,
                        reason: 'Super Admin initiated device reset'
                    },
                    ip_address: clientIP,
                    user_agent: userAgent,
                    severity: 'info'
                });

            return jsonResponse({
                success: true,
                message: `Device lock reset for ${targetUser?.email}`
            }, 200, corsHeaders);
        }

        // ===== UPDATE PERMISSIONS =====
        if (action === 'update_permissions') {
            const { permissions } = body;

            if (!targetUserId || !permissions) {
                return jsonResponse({ error: 'Target user ID and permissions required' }, 400, corsHeaders);
            }

            // Get target user info
            const { data: targetUser } = await supabase
                .from('admin_users')
                .select('email')
                .eq('id', targetUserId)
                .single();

            // Delete existing permissions
            const { error: delError } = await supabase
                .from('admin_permissions')
                .delete()
                .eq('user_id', targetUserId);

            if (delError) {
                console.error('Delete permissions error:', delError);
                return jsonResponse({ error: 'Failed to delete old permissions: ' + delError.message }, 500, corsHeaders);
            }

            // Only insert rows where at least one permission is granted
            const permissionRecords = permissions
                .filter(p => p.can_view || p.can_edit || p.can_delete)
                .map(p => ({
                    user_id: targetUserId,
                    page_slug: p.page_slug,
                    can_view: !!p.can_view,
                    can_edit: !!p.can_edit,
                    can_delete: !!p.can_delete
                }));

            if (permissionRecords.length > 0) {
                const { error: insError } = await supabase
                    .from('admin_permissions')
                    .insert(permissionRecords);

                if (insError) {
                    console.error('Insert permissions error:', insError);
                    return jsonResponse({ error: 'Failed to save permissions: ' + insError.message }, 500, corsHeaders);
                }
            }

            // Log action
            await supabase
                .from('admin_audit_logs')
                .insert({
                    user_id: session.user_id,
                    email: adminEmail,
                    action: 'update_permissions',
                    details: {
                        target_user_id: targetUserId,
                        target_email: targetUser?.email,
                        permissions_count: permissionRecords.length
                    },
                    ip_address: clientIP,
                    user_agent: userAgent,
                    severity: 'info'
                });

            return jsonResponse({
                success: true,
                message: `Permissions updated for ${targetUser?.email}`
            }, 200, corsHeaders);
        }

        // ===== DISABLE ACCOUNT =====
        if (action === 'disable_account') {
            if (!targetUserId) {
                return jsonResponse({ error: 'Target user ID required' }, 400, corsHeaders);
            }

            // Prevent disabling yourself
            if (targetUserId === session.user_id) {
                return jsonResponse({ error: 'Cannot disable your own account' }, 400, corsHeaders);
            }

            // Get target user info
            const { data: targetUser } = await supabase
                .from('admin_users')
                .select('email')
                .eq('id', targetUserId)
                .single();

            // Disable account
            await supabase
                .from('admin_users')
                .update({ is_active: false })
                .eq('id', targetUserId);

            // Force logout
            await supabase
                .from('admin_sessions')
                .delete()
                .eq('user_id', targetUserId);

            // Log action
            await supabase
                .from('admin_audit_logs')
                .insert({
                    user_id: session.user_id,
                    email: adminEmail,
                    action: 'disable_account',
                    details: {
                        target_user_id: targetUserId,
                        target_email: targetUser?.email
                    },
                    ip_address: clientIP,
                    user_agent: userAgent,
                    severity: 'warning'
                });

            return jsonResponse({
                success: true,
                message: `Account disabled for ${targetUser?.email}`
            }, 200, corsHeaders);
        }

        // ===== ENABLE ACCOUNT =====
        if (action === 'enable_account') {
            if (!targetUserId) {
                return jsonResponse({ error: 'Target user ID required' }, 400, corsHeaders);
            }

            // Get target user info
            const { data: targetUser } = await supabase
                .from('admin_users')
                .select('email')
                .eq('id', targetUserId)
                .single();

            // Enable account
            await supabase
                .from('admin_users')
                .update({ is_active: true })
                .eq('id', targetUserId);

            // Log action
            await supabase
                .from('admin_audit_logs')
                .insert({
                    user_id: session.user_id,
                    email: adminEmail,
                    action: 'enable_account',
                    details: {
                        target_user_id: targetUserId,
                        target_email: targetUser?.email
                    },
                    ip_address: clientIP,
                    user_agent: userAgent,
                    severity: 'info'
                });

            return jsonResponse({
                success: true,
                message: `Account enabled for ${targetUser?.email}`
            }, 200, corsHeaders);
        }

        return jsonResponse({ error: 'Unknown action' }, 400, corsHeaders);

    } catch (error) {
        console.error('Admin management error:', error);
        return jsonResponse({ error: 'Internal server error' }, 500, corsHeaders);
    }
}

function jsonResponse(data, status, headers) {
    return new Response(JSON.stringify(data), { status, headers });
}
