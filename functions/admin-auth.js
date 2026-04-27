// Cloudflare Pages Function - Enhanced Admin Authentication
// Device locking, heartbeat tracking, permission checks
// v1.2 - Using bcrypt-ts for Cloudflare Workers compatibility

import { createClient } from '@supabase/supabase-js';
import { compare, hash } from 'bcrypt-ts';

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
        const { action, email, password, token, deviceFingerprint, page_slug, permission_type, turnstileToken, trustDevice, trustToken, deviceId, currentPassword, newPassword } = await request.json();
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

            const NO_TIMEOUT_EMAIL = 'tafsirkurd@gmail.com';
            return jsonResponse({
                success: true,
                email: session.admin_users.email,
                role: session.admin_users.role,
                fullName: session.admin_users.full_name,
                permissions: permissions || [],
                totpEnabled: !!session.admin_users.totp_enabled,
                deviceLocked: !!session.admin_users.device_fingerprint,
                noTimeout: session.admin_users.email === NO_TIMEOUT_EMAIL
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
                        .update({
                            status: 'offline',
                            last_heartbeat: null,
                            device_fingerprint: null,
                            device_user_agent: null,
                            device_ip: null,
                            device_locked_at: null
                        })
                        .eq('id', session.user_id);

                    await logAudit(supabase, session.user_id, session.admin_users?.email, 'logout', { device_unlocked: true }, clientIP, userAgent);
                }
            }

            return jsonResponse({ success: true, message: 'Logged out successfully' }, 200, corsHeaders);
        }

        // ===== CHECK PERMISSION =====
        if (action === 'check_permission') {
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

        // ===== VERIFY-TOTP (login step 2) =====
        if (action === 'verify-totp') {
            const pendingRaw = env.ADMIN_KV ? await env.ADMIN_KV.get(`totp_pending:${token}`, 'json') : null;
            if (!pendingRaw) return jsonResponse({ error: 'Session expired. Please log in again.' }, 401, corsHeaders);

            const { data: user2 } = await supabase.from('admin_users').select('*').eq('id', pendingRaw.userId).single();
            if (!user2 || !user2.totp_enabled) return jsonResponse({ error: 'Invalid session.' }, 401, corsHeaders);

            // Check backup code first
            let usedBackup = false;
            const codeInput = String(email).trim(); // 'email' field reused for totpCode from client
            if (user2.totp_backup_codes && Array.isArray(user2.totp_backup_codes)) {
                const codeHash = await sha256Hex(codeInput.toUpperCase());
                const idx = user2.totp_backup_codes.indexOf(codeHash);
                if (idx !== -1) {
                    const remaining = user2.totp_backup_codes.filter((_, i) => i !== idx);
                    await supabase.from('admin_users').update({ totp_backup_codes: remaining }).eq('id', user2.id);
                    usedBackup = true;
                }
            }
            if (!usedBackup) {
                let valid = false;
                try { valid = await verifyTOTP(user2.totp_secret, codeInput); }
                catch(totpErr) { console.error('TOTP verify error:', totpErr); return jsonResponse({ error: 'Invalid code. Try again.' }, 401, corsHeaders); }
                if (!valid) {
                    // Track TOTP failures separately in KV (max 5 per temp token)
                    const failKey = `totp_fail:${token}`;
                    const fails = env.ADMIN_KV ? ((await env.ADMIN_KV.get(failKey, 'json')) || 0) + 1 : 1;
                    if (fails >= 5) {
                        if (env.ADMIN_KV) await env.ADMIN_KV.delete(`totp_pending:${token}`);
                        await logAudit(supabase, user2.id, user2.email, 'totp_brute_force', {}, clientIP, userAgent, null, null, null, 'critical');
                        await sendSecurityAlert(env, { type: 'totp_brute_force', email: user2.email, ip: clientIP, detail: '5 wrong 2FA codes in a row' });
                        return jsonResponse({ error: 'Too many failed attempts. Please log in again.', expired: true }, 401, corsHeaders);
                    }
                    if (env.ADMIN_KV) await env.ADMIN_KV.put(failKey, JSON.stringify(fails), { expirationTtl: 300 });
                    await logAudit(supabase, user2.id, user2.email, 'totp_failed', { attempt: fails }, clientIP, userAgent, null, null, null, 'warning');
                    return jsonResponse({ error: 'Invalid code. Try again. (' + (5 - fails) + ' attempts left)' }, 401, corsHeaders);
                }
            }

            try {
                if (env.ADMIN_KV) await env.ADMIN_KV.delete(`totp_pending:${token}`);
                if (env.ADMIN_KV) await env.ADMIN_KV.delete(`ip_attempts:${clientIP}`);

                await supabase.from('admin_users').update({ failed_attempts: 0, last_login: new Date().toISOString(), status: 'online', last_heartbeat: new Date().toISOString() }).eq('id', user2.id);
                const sessionToken = generateSecureToken();
                const NO_TIMEOUT_EMAIL = 'tafsirkurd@gmail.com';
                const expiresAt = user2.email === NO_TIMEOUT_EMAIL
                    ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) // never expires
                    : new Date(Date.now() + 24 * 60 * 60 * 1000);
                const { error: sessionErr } = await supabase.from('admin_sessions').insert({ user_id: user2.id, token: sessionToken, ip_address: clientIP, user_agent: userAgent, device_fingerprint: deviceFingerprint, expires_at: expiresAt.toISOString() });
                if (sessionErr) throw new Error(sessionErr.message);
                // Trust device for 30 days if requested
                let newTrustToken = null;
                if (trustDevice) {
                    const trustedExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    newTrustToken = generateSecureToken();
                    try {
                        await supabase.from('admin_trusted_devices').insert({
                            user_id: user2.id,
                            device_fingerprint: deviceFingerprint || newTrustToken,
                            trust_token: newTrustToken,
                            device_name: userAgent ? userAgent.substring(0, 120) : 'Unknown device',
                            ip_address: clientIP,
                            expires_at: trustedExpiry.toISOString()
                        });
                    } catch(e) { console.error('Trust device insert error:', e); newTrustToken = null; }
                }
                await logAudit(supabase, user2.id, user2.email, 'login_success_2fa', { usedBackup, trustedDevice: !!(trustDevice && deviceFingerprint) }, clientIP, userAgent, null, null, null, 'info');
                await sendSecurityAlert(env, { type: 'login_success', email: user2.email, ip: clientIP, detail: usedBackup ? 'Signed in with backup code' : 'Signed in with 2FA' });
                await cleanupOldSessions(supabase, user2.id);
                const { data: perms2 } = await supabase.from('admin_permissions').select('page_slug,can_view,can_edit,can_delete').eq('user_id', user2.id);
                return jsonResponse({ success: true, token: sessionToken, expiresAt: expiresAt.toISOString(), noTimeout: user2.email === NO_TIMEOUT_EMAIL, user: { email: user2.email, fullName: user2.full_name, role: user2.role }, permissions: perms2 || [], trustToken: newTrustToken }, 200, corsHeaders);
            } catch(sessionCreationErr) {
                console.error('TOTP session creation error:', sessionCreationErr);
                return jsonResponse({ error: 'Login error. Please try again.' }, 500, corsHeaders);
            }
        }

        // ===== SETUP-TOTP (step 1: generate secret + QR) =====
        if (action === 'setup-totp') {
            if (!token) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            const { data: sess } = await supabase.from('admin_sessions').select('user_id').eq('token', token).gt('expires_at', new Date().toISOString()).single();
            if (!sess) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            const { data: u } = await supabase.from('admin_users').select('email,totp_enabled').eq('id', sess.user_id).single();
            if (!u) return jsonResponse({ error: 'User not found' }, 404, corsHeaders);
            if (u.totp_enabled) return jsonResponse({ error: '2FA is already enabled.' }, 400, corsHeaders);

            const secretBytes = crypto.getRandomValues(new Uint8Array(20));
            const secret = base32Encode(secretBytes);
            if (env.ADMIN_KV) await env.ADMIN_KV.put(`totp_setup:${sess.user_id}`, secret, { expirationTtl: 600 });
            const otpauthUrl = `otpauth://totp/TafsirKurd%20Admin:${encodeURIComponent(u.email)}?secret=${secret}&issuer=TafsirKurd&algorithm=SHA1&digits=6&period=30`;
            return jsonResponse({ secret, otpauthUrl }, 200, corsHeaders);
        }

        // ===== CONFIRM-TOTP (step 2: verify then save) =====
        if (action === 'confirm-totp') {
            if (!token) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            const { data: sess } = await supabase.from('admin_sessions').select('user_id').eq('token', token).gt('expires_at', new Date().toISOString()).single();
            if (!sess) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            const secret = env.ADMIN_KV ? await env.ADMIN_KV.get(`totp_setup:${sess.user_id}`) : null;
            if (!secret) return jsonResponse({ error: 'Setup session expired. Please start again.' }, 400, corsHeaders);
            const valid = await verifyTOTP(secret, password); // 'password' field reused for code
            if (!valid) return jsonResponse({ error: 'Invalid code. Check your authenticator and try again.' }, 400, corsHeaders);

            const plainCodes = generateBackupCodes(8);
            const hashedCodes = await Promise.all(plainCodes.map(c => sha256Hex(c)));
            await supabase.from('admin_users').update({ totp_secret: secret, totp_enabled: true, totp_backup_codes: hashedCodes }).eq('id', sess.user_id);
            if (env.ADMIN_KV) await env.ADMIN_KV.delete(`totp_setup:${sess.user_id}`);
            const { data: u2 } = await supabase.from('admin_users').select('email').eq('id', sess.user_id).single();
            await logAudit(supabase, sess.user_id, u2?.email, 'totp_enabled', {}, clientIP, userAgent, null, null, null, 'info');
            return jsonResponse({ success: true, backupCodes: plainCodes }, 200, corsHeaders);
        }

        // ===== DISABLE-TOTP =====
        if (action === 'disable-totp') {
            if (!token) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            const { data: sess } = await supabase.from('admin_sessions').select('user_id').eq('token', token).gt('expires_at', new Date().toISOString()).single();
            if (!sess) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            const { data: u } = await supabase.from('admin_users').select('*').eq('id', sess.user_id).single();
            if (!u || !u.totp_enabled) return jsonResponse({ error: '2FA is not enabled.' }, 400, corsHeaders);
            const valid = await verifyTOTP(u.totp_secret, password);
            if (!valid) return jsonResponse({ error: 'Invalid code.' }, 400, corsHeaders);
            await supabase.from('admin_users').update({ totp_secret: null, totp_enabled: false, totp_backup_codes: null }).eq('id', sess.user_id);
            await logAudit(supabase, u.id, u.email, 'totp_disabled', {}, clientIP, userAgent, null, null, null, 'warning');
            await sendSecurityAlert(env, { type: 'totp_disabled', email: u.email, ip: clientIP });
            return jsonResponse({ success: true }, 200, corsHeaders);
        }

        // ===== RESET-TOTP (super admin resets another user's 2FA) =====
        if (action === 'reset-totp') {
            if (!token) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            const { data: sess } = await supabase.from('admin_sessions').select('user_id').eq('token', token).gt('expires_at', new Date().toISOString()).single();
            if (!sess) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            const { data: caller } = await supabase.from('admin_users').select('role,email').eq('id', sess.user_id).single();
            if (!caller || caller.role !== 'super_admin') return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders);
            const targetId = email; // 'email' field reused for targetUserId
            await supabase.from('admin_users').update({ totp_secret: null, totp_enabled: false, totp_backup_codes: null }).eq('id', targetId);
            await logAudit(supabase, sess.user_id, caller.email, 'totp_reset_by_admin', { target: targetId }, clientIP, userAgent, null, null, null, 'warning');
            return jsonResponse({ success: true }, 200, corsHeaders);
        }

        // ===== GET-MY-SESSIONS =====
        if (action === 'get-my-sessions') {
            if (!token) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            const { data: sess } = await supabase.from('admin_sessions').select('user_id').eq('token', token).gt('expires_at', new Date().toISOString()).single();
            if (!sess) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            const { data: sessions } = await supabase.from('admin_sessions').select('id,ip_address,user_agent,created_at,last_activity,expires_at,token').eq('user_id', sess.user_id).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false });
            // Mark which one is current
            const result = (sessions || []).map(s => ({ ...s, isCurrent: s.token === token, token: undefined }));
            return jsonResponse({ sessions: result }, 200, corsHeaders);
        }

        // ===== REVOKE-SESSION =====
        if (action === 'revoke-session') {
            if (!token) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            const { data: sess } = await supabase.from('admin_sessions').select('user_id').eq('token', token).gt('expires_at', new Date().toISOString()).single();
            if (!sess) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            const { sessionId } = body;
            if (!sessionId) return jsonResponse({ error: 'sessionId required' }, 400, corsHeaders);
            await supabase.from('admin_sessions').delete().eq('id', sessionId).eq('user_id', sess.user_id);
            await logAudit(supabase, sess.user_id, null, 'session_revoked', { sessionId }, clientIP, userAgent, null, null, null, 'info');
            return jsonResponse({ success: true }, 200, corsHeaders);
        }

        // ===== REVOKE-ALL-OTHER-SESSIONS =====
        if (action === 'revoke-all-other-sessions') {
            if (!token) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            const { data: sess } = await supabase.from('admin_sessions').select('user_id').eq('token', token).gt('expires_at', new Date().toISOString()).single();
            if (!sess) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            await supabase.from('admin_sessions').delete().eq('user_id', sess.user_id).neq('token', token);
            await logAudit(supabase, sess.user_id, null, 'all_other_sessions_revoked', {}, clientIP, userAgent, null, null, null, 'warning');
            return jsonResponse({ success: true }, 200, corsHeaders);
        }

        // ===== GET-AUDIT-LOGS =====
        if (action === 'get-audit-logs') {
            if (!token) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            const { data: sess } = await supabase.from('admin_sessions').select('user_id').eq('token', token).gt('expires_at', new Date().toISOString()).single();
            if (!sess) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            const { data: caller } = await supabase.from('admin_users').select('role').eq('id', sess.user_id).single();
            if (!caller || !['super_admin', 'editor'].includes(caller.role)) return jsonResponse({ error: 'Forbidden' }, 403, corsHeaders);
            const { data: logs } = await supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(2000);
            return jsonResponse({ logs: logs || [] }, 200, corsHeaders);
        }

        // ===== GET-TRUSTED-DEVICES =====
        if (action === 'get-trusted-devices') {
            if (!token) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            const { data: sess } = await supabase.from('admin_sessions').select('user_id').eq('token', token).gt('expires_at', new Date().toISOString()).single();
            if (!sess) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            const { data: devices } = await supabase.from('admin_trusted_devices').select('id,device_name,ip_address,created_at,expires_at,device_fingerprint').eq('user_id', sess.user_id).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false });
            return jsonResponse({ devices: devices || [] }, 200, corsHeaders);
        }

        // ===== REVOKE-TRUSTED-DEVICE =====
        if (action === 'revoke-trusted-device') {
            if (!token) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            const { data: sess } = await supabase.from('admin_sessions').select('user_id').eq('token', token).gt('expires_at', new Date().toISOString()).single();
            if (!sess) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            await supabase.from('admin_trusted_devices').delete().eq('id', deviceId).eq('user_id', sess.user_id);
            await logAudit(supabase, sess.user_id, null, 'trusted_device_revoked', { deviceId }, clientIP, userAgent, null, null, null, 'info');
            return jsonResponse({ success: true }, 200, corsHeaders);
        }

        // ===== CHANGE-PASSWORD (self) =====
        if (action === 'change-password') {
            if (!token) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            const { data: sess } = await supabase.from('admin_sessions').select('user_id').eq('token', token).gt('expires_at', new Date().toISOString()).single();
            if (!sess) return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
            if (!currentPassword || !newPassword) return jsonResponse({ error: 'Missing fields' }, 400, corsHeaders);
            if (newPassword.length < 8) return jsonResponse({ error: 'Password must be at least 8 characters' }, 400, corsHeaders);
            const { data: u } = await supabase.from('admin_users').select('email,password_hash').eq('id', sess.user_id).single();
            if (!u) return jsonResponse({ error: 'User not found' }, 404, corsHeaders);
            const match = await compare(currentPassword, u.password_hash);
            if (!match) return jsonResponse({ error: 'Current password is incorrect' }, 401, corsHeaders);
            const newHash = await hash(newPassword, 10);
            await supabase.from('admin_users').update({ password_hash: newHash }).eq('id', sess.user_id);
            // Invalidate all OTHER sessions (keep current)
            await supabase.from('admin_sessions').delete().eq('user_id', sess.user_id).neq('token', token);
            await sendSecurityAlert(env, { type: 'password_changed', email: u.email, ip: clientIP, detail: 'All other sessions have been logged out' });
            await logAudit(supabase, sess.user_id, u.email, 'password_changed', {}, clientIP, userAgent, null, null, null, 'warning');
            return jsonResponse({ success: true }, 200, corsHeaders);
        }

        // ===== LOGIN =====
        if (!email || !password) {
            return jsonResponse({ error: 'Email and password are required' }, 400, corsHeaders);
        }

        // 0a. IP rate limit — max 10 failed attempts per IP per hour
        const ipRateKey = `ip_attempts:${clientIP}`;
        const ipStored = env.ADMIN_KV ? await env.ADMIN_KV.get(ipRateKey, 'json') : null;
        if (ipStored) {
            const now = Date.now();
            const recent = (ipStored.attempts || []).filter(t => now - t < 3600000);
            if (recent.length >= 10) {
                await logAudit(supabase, null, email, 'ip_blocked', { ip: clientIP, attempts: recent.length }, clientIP, userAgent, null, null, null, 'critical');
                await sendSecurityAlert(env, { type: 'ip_blocked', email, ip: clientIP, detail: `${recent.length} attempts in the last hour` });
                return jsonResponse({ error: 'Too many failed attempts from your location. Try again in 1 hour.', ipBlocked: true }, 429, corsHeaders);
            }
        }

        // 0b. Turnstile verification
        if (env.TURNSTILE_SECRET_KEY) {
            if (!turnstileToken) {
                return jsonResponse({ error: 'Human verification required.' }, 400, corsHeaders);
            }
            const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: turnstileToken, remoteip: clientIP })
            });
            const tsData = await tsRes.json();
            if (!tsData.success) {
                return jsonResponse({ error: 'Human verification failed. Please try again.', turnstileFailed: true }, 400, corsHeaders);
            }
        }

        // 1. Get user
        const { data: user } = await supabase
            .from('admin_users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (!user) {
            await recordIPAttempt(env, clientIP);
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
                lockedUntil: user.locked_until,
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

        // 5. Check device lock (skip if user has disabled it)
        if (!user.disable_device_lock && user.device_fingerprint && deviceFingerprint) {
            if (user.device_fingerprint !== deviceFingerprint) {
                await logAudit(supabase, user.id, email, 'device_blocked', {
                    reason: 'Login attempted from unauthorized device',
                    expected: user.device_fingerprint,
                    received: deviceFingerprint
                }, clientIP, userAgent, null, null, deviceFingerprint, 'critical');

                await sendSecurityAlert(env, { type: 'device_blocked', email: user.email, ip: clientIP, detail: 'Login attempted from unrecognized device' });
                return jsonResponse({
                    error: 'This account is locked to a different device. Contact Super Admin to reset.',
                    deviceBlocked: true
                }, 403, corsHeaders);
            }
        }

        // 6. Verify password using bcrypt-ts (compatible with Cloudflare Workers)
        const passwordMatch = await compare(password, user.password_hash);

        if (!passwordMatch) {
            await recordIPAttempt(env, clientIP);
            const newFailedAttempts = (user.failed_attempts || 0) + 1;
            const attemptsRemaining = 10 - newFailedAttempts;

            if (newFailedAttempts >= 10) {
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
                    reason: '10 failed login attempts',
                    locked_until: lockedUntil.toISOString()
                }, clientIP, userAgent, null, null, deviceFingerprint, 'critical');

                await sendSecurityAlert(env, { type: 'account_locked', email: user.email, ip: clientIP, detail: '10 consecutive wrong passwords' });
                return jsonResponse({
                    error: 'Account locked due to multiple failed attempts. Try again in 24 hours.',
                    locked: true,
                    lockedUntil: lockedUntil.toISOString(),
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

        // 7. Successful login - lock device if not already locked and device lock not disabled
        if (!user.disable_device_lock && !user.device_fingerprint && deviceFingerprint) {
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
        } else if (user.disable_device_lock) {
            await logAudit(supabase, user.id, email, 'login_device_lock_disabled', {
                note: 'Device locking disabled for this user',
                user_agent: userAgent,
                ip: clientIP
            }, clientIP, userAgent, null, null, deviceFingerprint, 'info');
        }

        // 8. If 2FA enabled — check trusted device first, then issue temp token
        if (user.totp_enabled) {
            let skipTOTP = false;
            // Check trust token (localStorage-based, reliable across sessions)
            if (trustToken) {
                const { data: trusted } = await supabase
                    .from('admin_trusted_devices')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('trust_token', trustToken)
                    .gt('expires_at', new Date().toISOString())
                    .single();
                if (trusted) skipTOTP = true;
            }
            // Fallback: check device fingerprint
            if (!skipTOTP && deviceFingerprint) {
                const { data: trusted } = await supabase
                    .from('admin_trusted_devices')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('device_fingerprint', deviceFingerprint)
                    .gt('expires_at', new Date().toISOString())
                    .single();
                if (trusted) skipTOTP = true;
            }
            if (!skipTOTP) {
                const tempToken = generateSecureToken();
                if (env.ADMIN_KV) {
                    await env.ADMIN_KV.put(
                        `totp_pending:${tempToken}`,
                        JSON.stringify({ userId: user.id, email: user.email }),
                        { expirationTtl: 300 } // 5 minutes
                    );
                }
                return jsonResponse({ requiresTOTP: true, tempToken }, 200, corsHeaders);
            }
            // Trusted device — fall through to session creation
        }

        // 8b. Clear IP rate limit on success
        if (env.ADMIN_KV) await env.ADMIN_KV.delete(`ip_attempts:${clientIP}`);

        // Clear failed attempts and update status
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
        const NO_TIMEOUT_EMAIL = 'tafsirkurd@gmail.com';
        const expiresAt = email === NO_TIMEOUT_EMAIL
            ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) // never expires
            : new Date(Date.now() + 24 * 60 * 60 * 1000);

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
        const isNewDevice = !user.device_fingerprint && deviceFingerprint;
        await sendSecurityAlert(env, { type: isNewDevice ? 'new_device' : 'login_success', email, ip: clientIP, detail: isNewDevice ? 'First login from this device' : '' });
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
            noTimeout: email === NO_TIMEOUT_EMAIL,
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

async function sendSecurityAlert(env, { type, email, ip, detail = '' }) {
    if (!env.RESEND_API_KEY) return;
    const ALERT_TO = 'tefsirkurd@gmail.com';
    const icons = {
        login_success:    '✅',
        login_failed:     '⚠️',
        account_locked:   '🔒',
        device_blocked:   '🚫',
        ip_blocked:       '🛑',
        totp_failed:      '🔐',
        totp_brute_force: '🚨',
        totp_disabled:    '⚠️',
        new_device:       '📱',
        password_changed: '🔑',
    };
    const labels = {
        login_success:    'Successful Login',
        login_failed:     'Failed Login Attempt',
        account_locked:   'Account Locked',
        device_blocked:   'Blocked: Unrecognized Device',
        ip_blocked:       'Blocked: Too Many Attempts (IP)',
        totp_failed:      '2FA Code Failed',
        totp_brute_force: '2FA Brute Force Detected',
        totp_disabled:    '2FA Disabled',
        new_device:       'New Device Logged In',
        password_changed: 'Password Changed',
    };
    const icon  = icons[type]  || '🔔';
    const label = labels[type] || type;
    const time  = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Baghdad', hour12: false });
    const html  = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
      <div style="background:#0f172a;padding:20px 24px;color:#fff">
        <div style="font-size:22px;margin-bottom:4px">${icon} ${label}</div>
        <div style="font-size:12px;opacity:.6">TafsirKurd Admin Security Alert</div>
      </div>
      <div style="padding:20px 24px;background:#fff">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#6b7280;width:80px">Account</td><td style="padding:6px 0;font-weight:600">${email || '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">IP</td><td style="padding:6px 0">${ip || '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Time</td><td style="padding:6px 0">${time} (Baghdad)</td></tr>
          ${detail ? `<tr><td style="padding:6px 0;color:#6b7280">Detail</td><td style="padding:6px 0">${detail}</td></tr>` : ''}
        </table>
        <div style="margin-top:16px;font-size:12px;color:#9ca3af">If this was not you, change your password immediately.</div>
      </div>
    </div>`;
    try {
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: 'TafsirKurd Security <security@tafsirkurd.com>', to: ALERT_TO, subject: `${icon} ${label} — TafsirKurd Admin`, html })
        });
    } catch(e) { console.error('Alert email failed:', e); }
}

async function recordIPAttempt(env, ip) {
    if (!env.ADMIN_KV) return;
    const key = `ip_attempts:${ip}`;
    const stored = await env.ADMIN_KV.get(key, 'json') || { attempts: [] };
    const now = Date.now();
    const recent = (stored.attempts || []).filter(t => now - t < 3600000);
    recent.push(now);
    await env.ADMIN_KV.put(key, JSON.stringify({ attempts: recent }), { expirationTtl: 3600 });
}

/* ══════════════════════════════════════════
   TOTP / 2FA helpers
══════════════════════════════════════════ */
function base32Decode(input) {
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    input = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
    let bits = 0, value = 0;
    const out = [];
    for (const ch of input) {
        const idx = alpha.indexOf(ch);
        if (idx < 0) continue;
        value = (value << 5) | idx; bits += 5;
        if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
    }
    return new Uint8Array(out);
}
function base32Encode(bytes) {
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0, value = 0, out = '';
    for (const b of bytes) { value = (value << 8) | b; bits += 8; while (bits >= 5) { out += alpha[(value >>> (bits - 5)) & 31]; bits -= 5; } }
    if (bits > 0) out += alpha[(value << (5 - bits)) & 31];
    return out;
}
async function verifyTOTP(secret, token, window = 1) {
    const key = base32Decode(secret);
    const ck = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const now = Math.floor(Date.now() / 30000);
    for (let i = -window; i <= window; i++) {
        const buf = new ArrayBuffer(8);
        new DataView(buf).setUint32(4, now + i, false);
        const sig = new Uint8Array(await crypto.subtle.sign('HMAC', ck, buf));
        const off = sig[19] & 0xf;
        const code = (((sig[off] & 0x7f) << 24) | (sig[off+1] << 16) | (sig[off+2] << 8) | sig[off+3]) % 1000000;
        if (String(code).padStart(6, '0') === String(token).trim()) return true;
    }
    return false;
}
async function sha256Hex(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function generateBackupCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const bytes = crypto.getRandomValues(new Uint8Array(5));
        codes.push(Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase());
    }
    return codes; // e.g. ['A3F2B1C4D5', ...]
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
