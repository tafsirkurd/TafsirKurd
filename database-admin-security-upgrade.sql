-- ========================================
-- Admin Security System Upgrade
-- Device locking, live status, enhanced audit logging
-- ========================================

-- 1. Add device locking and status fields to admin_users
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS device_user_agent TEXT,
ADD COLUMN IF NOT EXISTS device_ip TEXT,
ADD COLUMN IF NOT EXISTS device_locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'idle', 'offline'));

-- 2. Add device tracking to admin_sessions
ALTER TABLE admin_sessions
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create index for device lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_device_fingerprint ON admin_users(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status);
CREATE INDEX IF NOT EXISTS idx_admin_users_last_heartbeat ON admin_users(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_device ON admin_sessions(device_fingerprint);

-- 3. Page-level permissions table
CREATE TABLE IF NOT EXISTS admin_permissions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    page_slug TEXT NOT NULL, -- 'dashboard', 'messages', 'videos', 'users', etc.
    can_view BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, page_slug)
);

CREATE INDEX IF NOT EXISTS idx_admin_permissions_user ON admin_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_page ON admin_permissions(page_slug);

-- 4. Enhanced audit logs with more details
ALTER TABLE admin_audit_logs
ADD COLUMN IF NOT EXISTS page_slug TEXT,
ADD COLUMN IF NOT EXISTS resource_type TEXT,
ADD COLUMN IF NOT EXISTS resource_id TEXT,
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical'));

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_page ON admin_audit_logs(page_slug);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_severity ON admin_audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_device ON admin_audit_logs(device_fingerprint);

-- 5. Admin activity sessions (for detailed tracking)
CREATE TABLE IF NOT EXISTS admin_activity_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    session_id BIGINT REFERENCES admin_sessions(id) ON DELETE CASCADE,
    page_slug TEXT NOT NULL,
    action TEXT NOT NULL, -- 'view', 'edit', 'delete', 'create'
    duration_seconds INTEGER, -- how long they spent on the page
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_user ON admin_activity_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_session ON admin_activity_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON admin_activity_sessions(created_at DESC);

-- 6. Default permissions for roles
INSERT INTO admin_permissions (user_id, page_slug, can_view, can_edit, can_delete)
SELECT
    u.id,
    pages.slug,
    CASE
        WHEN u.role = 'super_admin' THEN true
        WHEN u.role = 'editor' AND pages.slug IN ('dashboard', 'analytics', 'messages', 'videos', 'tv-management', 'backgrounds', 'reading-stats', 'features', 'schedule', 'social-stats') THEN true
        WHEN u.role = 'analyst' AND pages.slug IN ('dashboard', 'analytics', 'reading-stats') THEN true
        ELSE false
    END as can_view,
    CASE
        WHEN u.role = 'super_admin' THEN true
        WHEN u.role = 'editor' AND pages.slug IN ('messages', 'videos', 'tv-management', 'backgrounds', 'features', 'schedule', 'social-stats') THEN true
        ELSE false
    END as can_edit,
    CASE
        WHEN u.role = 'super_admin' THEN true
        WHEN u.role = 'editor' AND pages.slug IN ('messages', 'videos', 'tv-management', 'backgrounds') THEN true
        ELSE false
    END as can_delete
FROM admin_users u
CROSS JOIN (
    VALUES
        ('dashboard'),
        ('analytics'),
        ('messages'),
        ('videos'),
        ('tv-management'),
        ('backgrounds'),
        ('users'),
        ('reading-stats'),
        ('features'),
        ('schedule'),
        ('social-stats'),
        ('bot-protection'),
        ('database'),
        ('account-management'),
        ('auth-monitor')
) AS pages(slug)
ON CONFLICT (user_id, page_slug) DO NOTHING;

-- 7. Function to update user status based on heartbeat
CREATE OR REPLACE FUNCTION update_admin_status()
RETURNS void AS $$
BEGIN
    -- Mark users as offline if no heartbeat in 5 minutes
    UPDATE admin_users
    SET status = 'offline'
    WHERE last_heartbeat < NOW() - INTERVAL '5 minutes'
    AND status != 'offline';

    -- Mark users as idle if no heartbeat in 2 minutes but less than 5
    UPDATE admin_users
    SET status = 'idle'
    WHERE last_heartbeat < NOW() - INTERVAL '2 minutes'
    AND last_heartbeat >= NOW() - INTERVAL '5 minutes'
    AND status != 'idle';
END;
$$ LANGUAGE plpgsql;

-- 8. Function to check device lock
CREATE OR REPLACE FUNCTION check_device_lock(
    p_user_id BIGINT,
    p_device_fingerprint TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_locked_fingerprint TEXT;
    v_is_locked BOOLEAN;
BEGIN
    SELECT device_fingerprint, device_locked_at IS NOT NULL
    INTO v_locked_fingerprint, v_is_locked
    FROM admin_users
    WHERE id = p_user_id;

    -- If no device locked yet, allow
    IF NOT v_is_locked OR v_locked_fingerprint IS NULL THEN
        RETURN TRUE;
    END IF;

    -- If device matches, allow
    IF v_locked_fingerprint = p_device_fingerprint THEN
        RETURN TRUE;
    END IF;

    -- Otherwise, deny
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 9. Function to lock device
CREATE OR REPLACE FUNCTION lock_device_to_user(
    p_user_id BIGINT,
    p_device_fingerprint TEXT,
    p_user_agent TEXT,
    p_ip TEXT
)
RETURNS void AS $$
BEGIN
    UPDATE admin_users
    SET
        device_fingerprint = p_device_fingerprint,
        device_user_agent = p_user_agent,
        device_ip = p_ip,
        device_locked_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Function to force logout (kill switch)
CREATE OR REPLACE FUNCTION force_logout_user(p_user_id BIGINT)
RETURNS void AS $$
BEGIN
    -- Delete all sessions for this user
    DELETE FROM admin_sessions WHERE user_id = p_user_id;

    -- Set status to offline
    UPDATE admin_users
    SET status = 'offline', last_heartbeat = NULL
    WHERE id = p_user_id;

    -- Log the force logout
    INSERT INTO admin_audit_logs (user_id, action, details, created_at)
    VALUES (p_user_id, 'force_logout', '{"reason": "Admin initiated force logout"}', NOW());
END;
$$ LANGUAGE plpgsql;

-- 11. Function to reset device lock
CREATE OR REPLACE FUNCTION reset_device_lock(p_user_id BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE admin_users
    SET
        device_fingerprint = NULL,
        device_user_agent = NULL,
        device_ip = NULL,
        device_locked_at = NULL
    WHERE id = p_user_id;

    -- Log the device reset
    INSERT INTO admin_audit_logs (user_id, action, details, created_at)
    VALUES (p_user_id, 'device_reset', '{"reason": "Admin initiated device reset"}', NOW());
END;
$$ LANGUAGE plpgsql;

-- 12. Enhanced views for monitoring

-- View: Online admins with device info
CREATE OR REPLACE VIEW online_admins AS
SELECT
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.status,
    u.last_heartbeat,
    u.device_user_agent,
    u.device_ip,
    COUNT(DISTINCT s.id) as active_sessions
FROM admin_users u
LEFT JOIN admin_sessions s ON u.id = s.user_id AND s.expires_at > NOW()
WHERE u.status IN ('online', 'idle')
GROUP BY u.id, u.email, u.full_name, u.role, u.status, u.last_heartbeat, u.device_user_agent, u.device_ip
ORDER BY u.last_heartbeat DESC;

-- View: Recent admin activity
CREATE OR REPLACE VIEW recent_admin_activity AS
SELECT
    a.id,
    a.user_id,
    u.email,
    u.full_name,
    a.action,
    a.page_slug,
    a.resource_type,
    a.resource_id,
    a.severity,
    a.ip_address,
    a.device_fingerprint,
    a.created_at
FROM admin_audit_logs a
JOIN admin_users u ON a.user_id = u.id
ORDER BY a.created_at DESC
LIMIT 100;

-- View: Admin permissions matrix
CREATE OR REPLACE VIEW admin_permissions_matrix AS
SELECT
    u.id as user_id,
    u.email,
    u.full_name,
    u.role,
    p.page_slug,
    p.can_view,
    p.can_edit,
    p.can_delete
FROM admin_users u
LEFT JOIN admin_permissions p ON u.id = p.user_id
ORDER BY u.email, p.page_slug;

-- 13. Trigger to auto-update permissions when role changes
CREATE OR REPLACE FUNCTION update_permissions_on_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role != NEW.role THEN
        -- Delete old permissions
        DELETE FROM admin_permissions WHERE user_id = NEW.id;

        -- Insert new permissions based on new role
        INSERT INTO admin_permissions (user_id, page_slug, can_view, can_edit, can_delete)
        SELECT
            NEW.id,
            pages.slug,
            CASE
                WHEN NEW.role = 'super_admin' THEN true
                WHEN NEW.role = 'editor' AND pages.slug IN ('dashboard', 'analytics', 'messages', 'videos', 'tv-management', 'backgrounds', 'reading-stats', 'features', 'schedule', 'social-stats') THEN true
                WHEN NEW.role = 'analyst' AND pages.slug IN ('dashboard', 'analytics', 'reading-stats') THEN true
                ELSE false
            END as can_view,
            CASE
                WHEN NEW.role = 'super_admin' THEN true
                WHEN NEW.role = 'editor' AND pages.slug IN ('messages', 'videos', 'tv-management', 'backgrounds', 'features', 'schedule', 'social-stats') THEN true
                ELSE false
            END as can_edit,
            CASE
                WHEN NEW.role = 'super_admin' THEN true
                WHEN NEW.role = 'editor' AND pages.slug IN ('messages', 'videos', 'tv-management', 'backgrounds') THEN true
                ELSE false
            END as can_delete
        FROM (
            VALUES
                ('dashboard'), ('analytics'), ('messages'), ('videos'), ('tv-management'),
                ('backgrounds'), ('users'), ('reading-stats'), ('features'), ('schedule'),
                ('social-stats'), ('bot-protection'), ('database'), ('account-management'), ('auth-monitor')
        ) AS pages(slug);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_permissions_on_role_change
    AFTER UPDATE OF role ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_permissions_on_role_change();

-- ========================================
-- Setup Complete
-- ========================================

-- Run status update function (can be scheduled via cron or called periodically)
SELECT update_admin_status();

-- Display summary
SELECT
    'Admin Users' as table_name,
    COUNT(*) as total_records
FROM admin_users
UNION ALL
SELECT
    'Admin Sessions',
    COUNT(*)
FROM admin_sessions
UNION ALL
SELECT
    'Admin Permissions',
    COUNT(*)
FROM admin_permissions
UNION ALL
SELECT
    'Admin Audit Logs',
    COUNT(*)
FROM admin_audit_logs
UNION ALL
SELECT
    'Online Admins',
    COUNT(*)
FROM online_admins;
