// Cloudflare Pages Function - Enhanced Admin Authentication
// Device locking, heartbeat tracking, permission checks

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export async function onRequest(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
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
        const { action, email, password, token, deviceFingerprint } = await request.json();
        const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
        const userAgent = request.headers.get('User-Agent') || 'unknown';

        // ===== HEARTBEAT =====
        if (action === 'heartbeat') {
            if (!token) {
                return jsonResponse({ success: false }, 401, corsHeaders);
            }

            const { data: session } = await supabase
                .from('admin_sessions')
                .select('user_id')
                .eq('token', token)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (!session) {
                return jsonResponse({ success: false }, 401, corsHeaders);
            }

            // Update heartbeat
            await supabase
                .from('admin_users')
                .update({
                    last_heartbeat: new Date().toISOString(),
                    status: 'online'
                })
                .eq('id', session.user_id);

            // Update session last activity
            await supabase
                .from('admin_sessions')
                .update({ last_activity: new Date().toISOString() })
                .eq('token', token);

            return jsonResponse({ success: true }, 200, corsHeaders);
        }

        // ===== VERIFY SESSION =====
        if (action === 'verify') {
            if (!token) {
                return jsonResponse({ success: false, error: 'No token provided' }, 401, corsHeaders);
            }

            const { data: session } = await supabase
                .from('admin_sessions')
                .select('*, admin_users(*)')
                .eq('token', token)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (!session || !session.admin_users || !session.admin_users.is_active) {
                return jsonResponse({ success: false, error: 'Invalid or expired session' }, 401, corsHeaders);
            }

            // Check device lock
            if (deviceFingerprint && session.admin_users.device_fingerprint) {
                if (session.admin_users.device_fingerprint !== deviceFingerprint) {
                    await logAudit(supabase, session.user_id, session.admin_users.email, 'device_mismatch', {
                        expected: session.admin_users.device_fingerprint,
                        received: deviceFingerprint
                    }, clientIP, userAgent, null, null, null, 'warning');

                    return jsonResponse({
                        success: false,
                        error: 'Device not authorized. Contact Super Admin to reset your device.'
                    }, 403, corsHeaders);
                }
            }

            // Update heartbeat
            await supabase
                .from('admin_users')
                .update({
                    last_heartbeat: new Date().toISOString(),
                    status: 'online'
                })
                .eq('id', session.user_id);

            // Update session activity
            await supabase
                .from('admin_sessions')
                .update({ last_activity: new Date().toISOString() })
                .eq('id', session.id);

            // Get permissions
            const { data: permissions } = await supabase
                .from('admin_permissions')
                .select('page_slug, can_view, can_edit, can_delete')
                .eq('user_id', session.user_id);

            return jsonResponse({
                success: true,
                email: session.admin_users.email,
                role: session.admin_users.role,
                fullName: session.admin_users.full_name,
                permissions: permissions || [],
                deviceLocked: !!session.admin_users.device_fingerprint
            }, 200, corsHeaders);
        }

        // ===== LOGOUT =====
        if (action === 'logout') {
            if (token) {
                const { data: session } = await supabase
                    .from('admin_sessions')
                    .select('user_id, admin_users(email)')
                    .eq('token', token)
                    .single();

                await supabase
                    .from('admin_sessions')
                    .delete()
                    .eq('token', token);

                if (session) {
                    await supabase
                        .from('admin_users')
                        .update({ status: 'offline', last_heartbeat: null })
                        .eq('id', session.user_id);

                    await logAudit(supabase, session.user_id, session.admin_users?.email, 'logout', {}, clientIP, userAgent);
                }
            }

            return jsonResponse({ success: true, message: 'Logged out successfully' }, 200, corsHeaders);
        }

        // ===== CHECK PERMISSION =====
        if (action === 'check_permission') {
            const { page_slug, permission_type } = await request.json();

            if (!token) {
                return jsonResponse({ success: false }, 401, corsHeaders);
            }

            const { data: session } = await supabase
                .from('admin_sessions')
                .select('user_id, admin_users(role)')
                .eq('token', token)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (!session) {
                return jsonResponse({ success: false }, 401, corsHeaders);
            }

            // Super admin has all permissions
            if (session.admin_users.role === 'super_admin') {
                return jsonResponse({ success: true, allowed: true }, 200, corsHeaders);
            }

            // Check permission in database
            const { data: perm } = await supabase
                .from('admin_permissions')
                .select('*')
                .eq('user_id', session.user_id)
                .eq('page_slug', page_slug)
                .single();

            let allowed = false;
            if (perm) {
                if (permission_type === 'view') allowed = perm.can_view;
                else if (permission_type === 'edit') allowed = perm.can_edit;
                else if (permission_type === 'delete') allowed = perm.can_delete;
            }

            return jsonResponse({ success: true, allowed }, 200, corsHeaders);
        }

        // ===== LOGIN =====
        if (!email || !password) {
            return jsonResponse({ error: 'Email and password are required' }, 400, corsHeaders);
        }

        // 1. Get user
        const { data: user } = await supabase
            .from('admin_users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (!user) {
            await logLoginAttempt(supabase, email, clientIP, false);
            await logAudit(supabase, null, email, 'login_failed', { reason: 'User not found' }, clientIP, userAgent);
            return jsonResponse({ error: 'Invalid credentials' }, 401, corsHeaders);
        }

        // 2. Check if account is active
        if (!user.is_active) {
            await logLoginAttempt(supabase, email, clientIP, false);
            await logAudit(supabase, user.id, email, 'login_failed', { reason: 'Account disabled' }, clientIP, userAgent, null, null, deviceFingerprint, 'warning');
            return jsonResponse({ error: 'Account is disabled' }, 403, corsHeaders);
        }

        // 3. Check if account is locked
        if (user.is_locked && user.locked_until && new Date(user.locked_until) > new Date()) {
            const hoursRemaining = Math.ceil((new Date(user.locked_until) - new Date()) / (1000 * 60 * 60));
            return jsonResponse({
                error: `Account locked. Try again in ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}.`,
                locked: true,
                attemptsRemaining: 0
            }, 429, corsHeaders);
        }

        // 4. Clear lock if expired
        if (user.is_locked && user.locked_until && new Date(user.locked_until) <= new Date()) {
            await supabase
                .from('admin_users')
                .update({
                    is_locked: false,
                    locked_until: null,
                    failed_attempts: 0
                })
                .eq('id', user.id);
            user.is_locked = false;
            user.failed_attempts = 0;
        }

        // 5. Check device lock
        if (user.device_fingerprint && deviceFingerprint) {
            if (user.device_fingerprint !== deviceFingerprint) {
                await logAudit(supabase, user.id, email, 'device_blocked', {
                    reason: 'Login attempted from unauthorized device',
                    expected: user.device_fingerprint,
                    received: deviceFingerprint
                }, clientIP, userAgent, null, null, deviceFingerprint, 'critical');

                return jsonResponse({
                    error: 'This account is locked to a different device. Contact Super Admin to reset.',
                    deviceBlocked: true
                }, 403, corsHeaders);
            }
        }

        // 6. Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            const newFailedAttempts = (user.failed_attempts || 0) + 1;
            const attemptsRemaining = 3 - newFailedAttempts;

            if (newFailedAttempts >= 3) {
                const lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
                await supabase
                    .from('admin_users')
                    .update({
                        failed_attempts: newFailedAttempts,
                        is_locked: true,
                        locked_until: lockedUntil.toISOString()
                    })
                    .eq('id', user.id);

                await logLoginAttempt(supabase, email, clientIP, false);
                await logAudit(supabase, user.id, email, 'account_locked', {
                    reason: '3 failed login attempts',
                    locked_until: lockedUntil.toISOString()
                }, clientIP, userAgent, null, null, deviceFingerprint, 'critical');

                return jsonResponse({
                    error: 'Account locked due to multiple failed attempts. Try again in 24 hours.',
                    locked: true,
                    attemptsRemaining: 0
                }, 429, corsHeaders);
            }

            await supabase
                .from('admin_users')
                .update({ failed_attempts: newFailedAttempts })
                .eq('id', user.id);

            await logLoginAttempt(supabase, email, clientIP, false);
            await logAudit(supabase, user.id, email, 'login_failed', {
                reason: 'Invalid password',
                attempts_remaining: attemptsRemaining
            }, clientIP, userAgent, null, null, deviceFingerprint, 'warning');

            return jsonResponse({
                error: 'Invalid credentials',
                attemptsRemaining
            }, 401, corsHeaders);
        }

        // 7. Successful login - lock device if not already locked
        if (!user.device_fingerprint && deviceFingerprint) {
            await supabase
                .from('admin_users')
                .update({
                    device_fingerprint: deviceFingerprint,
                    device_user_agent: userAgent,
                    device_ip: clientIP,
                    device_locked_at: new Date().toISOString()
                })
                .eq('id', user.id);

            await logAudit(supabase, user.id, email, 'device_locked', {
                fingerprint: deviceFingerprint,
                user_agent: userAgent,
                ip: clientIP
            }, clientIP, userAgent, null, null, deviceFingerprint, 'info');
        }

        // 8. Clear failed attempts and update status
        await supabase
            .from('admin_users')
            .update({
                failed_attempts: 0,
                last_login: new Date().toISOString(),
                last_heartbeat: new Date().toISOString(),
                status: 'online'
            })
            .eq('id', user.id);

        // 9. Generate session token
        const sessionToken = generateSecureToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // 10. Create session
        await supabase
            .from('admin_sessions')
            .insert({
                user_id: user.id,
                token: sessionToken,
                ip_address: clientIP,
                user_agent: userAgent,
                device_fingerprint: deviceFingerprint,
                expires_at: expiresAt.toISOString()
            });

        // 11. Log successful login
        await logLoginAttempt(supabase, email, clientIP, true);
        await logAudit(supabase, user.id, email, 'login_success', {
            device_fingerprint: deviceFingerprint
        }, clientIP, userAgent, null, null, deviceFingerprint, 'info');

        // 12. Clean up old sessions
        await cleanupOldSessions(supabase, user.id);

        // 13. Get permissions
        const { data: permissions } = await supabase
            .from('admin_permissions')
            .select('page_slug, can_view, can_edit, can_delete')
            .eq('user_id', user.id);

        return jsonResponse({
            success: true,
            token: sessionToken,
            expiresAt: expiresAt.toISOString(),
            user: {
                email: user.email,
                fullName: user.full_name,
                role: user.role
            },
            permissions: permissions || [],
            deviceLocked: !!user.device_fingerprint
        }, 200, corsHeaders);

    } catch (error) {
        console.error('Admin auth error:', error);
        return jsonResponse({ error: 'Internal server error' }, 500, corsHeaders);
    }
}

// Helper functions
function jsonResponse(data, status, headers) {
    return new Response(JSON.stringify(data), { status, headers });
}

function generateSecureToken() {
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    return Array.from(tokenArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function logAudit(supabase, userId, email, action, details, ipAddress, userAgent, pageSlug = null, resourceType = null, deviceFingerprint = null, severity = 'info') {
    try {
        await supabase
            .from('admin_audit_logs')
            .insert({
                user_id: userId,
                email,
                action,
                details: details || {},
                ip_address: ipAddress,
                user_agent: userAgent,
                page_slug: pageSlug,
                resource_type: resourceType,
                device_fingerprint: deviceFingerprint,
                severity
            });
    } catch (error) {
        console.error('Audit log error:', error);
    }
}

async function logLoginAttempt(supabase, email, ipAddress, success) {
    try {
        await supabase
            .from('admin_login_attempts')
            .insert({
                email,
                ip_address: ipAddress,
                success
            });
    } catch (error) {
        console.error('Login attempt log error:', error);
    }
}

async function cleanupOldSessions(supabase, userId) {
    try {
        const { data: sessions } = await supabase
            .from('admin_sessions')
            .select('id')
            .eq('user_id', userId)
            .order('last_activity', { ascending: false });

        if (sessions && sessions.length > 5) {
            const sessionIdsToDelete = sessions.slice(5).map(s => s.id);
            await supabase
                .from('admin_sessions')
                .delete()
                .in('id', sessionIdsToDelete);
        }
    } catch (error) {
        console.error('Session cleanup error:', error);
    }
}
