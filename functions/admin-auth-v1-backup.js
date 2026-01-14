// Cloudflare Pages Function - Secure Admin Authentication with Database
// Implements bcrypt hashing, 3-attempt lockout, session management, audit logging

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

    // Initialize Supabase client with service role key (backend only)
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
        const { action, email, password, token } = await request.json();
        const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
        const userAgent = request.headers.get('User-Agent') || 'unknown';

        // ===== VERIFY SESSION TOKEN =====
        if (action === 'verify') {
            if (!token) {
                return jsonResponse({ success: false, error: 'No token provided' }, 401, corsHeaders);
            }

            // Check if session exists and is valid
            const { data: session } = await supabase
                .from('admin_sessions')
                .select('*, admin_users(*)')
                .eq('token', token)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (!session || !session.admin_users || !session.admin_users.is_active) {
                return jsonResponse({ success: false, error: 'Invalid or expired session' }, 401, corsHeaders);
            }

            // Update last activity
            await supabase
                .from('admin_sessions')
                .update({ last_activity: new Date().toISOString() })
                .eq('id', session.id);

            return jsonResponse({
                success: true,
                email: session.admin_users.email,
                role: session.admin_users.role,
                fullName: session.admin_users.full_name
            }, 200, corsHeaders);
        }

        // ===== LOGOUT =====
        if (action === 'logout') {
            if (token) {
                // Get user info before deleting session
                const { data: session } = await supabase
                    .from('admin_sessions')
                    .select('user_id, admin_users(email)')
                    .eq('token', token)
                    .single();

                // Delete session
                await supabase
                    .from('admin_sessions')
                    .delete()
                    .eq('token', token);

                // Log logout
                if (session) {
                    await logAudit(supabase, session.user_id, session.admin_users?.email, 'logout', {}, clientIP, userAgent);
                }
            }

            return jsonResponse({ success: true, message: 'Logged out successfully' }, 200, corsHeaders);
        }

        // ===== LOGIN =====
        if (!email || !password) {
            return jsonResponse({ error: 'Email and password are required' }, 400, corsHeaders);
        }

        // 1. Check if user exists
        const { data: user } = await supabase
            .from('admin_users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (!user) {
            // Log failed attempt (no user found)
            await logLoginAttempt(supabase, email, clientIP, false);
            await logAudit(supabase, null, email, 'login_failed', { reason: 'User not found' }, clientIP, userAgent);
            return jsonResponse({ error: 'Invalid credentials' }, 401, corsHeaders);
        }

        // 2. Check if account is active
        if (!user.is_active) {
            await logLoginAttempt(supabase, email, clientIP, false);
            await logAudit(supabase, user.id, email, 'login_failed', { reason: 'Account disabled' }, clientIP, userAgent);
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

        // 4. If lock expired, clear it
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

        // 5. Verify password with bcrypt
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            // Increment failed attempts
            const newFailedAttempts = (user.failed_attempts || 0) + 1;
            const attemptsRemaining = 3 - newFailedAttempts;

            // Lock account after 3 failed attempts
            if (newFailedAttempts >= 3) {
                const lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
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
                }, clientIP, userAgent);

                return jsonResponse({
                    error: 'Account locked due to multiple failed attempts. Try again in 24 hours.',
                    locked: true,
                    attemptsRemaining: 0
                }, 429, corsHeaders);
            }

            // Update failed attempts count
            await supabase
                .from('admin_users')
                .update({ failed_attempts: newFailedAttempts })
                .eq('id', user.id);

            await logLoginAttempt(supabase, email, clientIP, false);
            await logAudit(supabase, user.id, email, 'login_failed', {
                reason: 'Invalid password',
                attempts_remaining: attemptsRemaining
            }, clientIP, userAgent);

            return jsonResponse({
                error: 'Invalid credentials',
                attemptsRemaining
            }, 401, corsHeaders);
        }

        // 6. Successful login - clear failed attempts
        await supabase
            .from('admin_users')
            .update({
                failed_attempts: 0,
                last_login: new Date().toISOString()
            })
            .eq('id', user.id);

        // 7. Generate secure session token
        const sessionToken = generateSecureToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // 8. Create session in database
        const { data: session } = await supabase
            .from('admin_sessions')
            .insert({
                user_id: user.id,
                token: sessionToken,
                ip_address: clientIP,
                user_agent: userAgent,
                expires_at: expiresAt.toISOString()
            })
            .select()
            .single();

        // 9. Log successful login
        await logLoginAttempt(supabase, email, clientIP, true);
        await logAudit(supabase, user.id, email, 'login_success', {}, clientIP, userAgent);

        // 10. Clean up old sessions for this user (keep last 5)
        await cleanupOldSessions(supabase, user.id);

        return jsonResponse({
            success: true,
            token: sessionToken,
            expiresAt: expiresAt.toISOString(),
            user: {
                email: user.email,
                fullName: user.full_name,
                role: user.role
            }
        }, 200, corsHeaders);

    } catch (error) {
        console.error('Admin auth error:', error);
        return jsonResponse({ error: 'Internal server error' }, 500, corsHeaders);
    }
}

// ===== HELPER FUNCTIONS =====

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

async function logAudit(supabase, userId, email, action, details, ipAddress, userAgent) {
    try {
        await supabase
            .from('admin_audit_logs')
            .insert({
                user_id: userId,
                email,
                action,
                details: details || {},
                ip_address: ipAddress,
                user_agent: userAgent
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
        // Get all sessions for this user, sorted by last_activity
        const { data: sessions } = await supabase
            .from('admin_sessions')
            .select('id')
            .eq('user_id', userId)
            .order('last_activity', { ascending: false });

        if (sessions && sessions.length > 5) {
            // Delete all but the 5 most recent
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
