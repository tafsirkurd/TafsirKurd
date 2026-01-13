-- ========================================
-- Admin Authentication & User Management Schema
-- Secure multi-admin system with roles and audit logging
-- ========================================

-- 1. Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,  -- bcrypt hash
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'editor',  -- 'super_admin', 'editor', 'analyst'
    is_active BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_until TIMESTAMPTZ,
    failed_attempts INTEGER DEFAULT 0,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by BIGINT REFERENCES admin_users(id),
    CONSTRAINT valid_role CHECK (role IN ('super_admin', 'editor', 'analyst'))
);

-- 2. Admin Sessions Table
CREATE TABLE IF NOT EXISTS admin_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Audit Logs Table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
    email TEXT,
    action TEXT NOT NULL,  -- 'login_success', 'login_failed', 'logout', 'account_locked', 'account_created', 'account_deleted', 'role_changed', 'password_reset'
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Login Attempts Table (for rate limiting)
CREATE TABLE IF NOT EXISTS admin_login_attempts (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    success BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- Indexes for Performance
-- ========================================

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_user ON admin_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_email ON admin_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip ON admin_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_created ON admin_login_attempts(created_at DESC);

-- ========================================
-- Row Level Security (RLS)
-- ========================================

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for backend operations)
CREATE POLICY "Service role full access - admin_users" ON admin_users FOR ALL USING (true);
CREATE POLICY "Service role full access - admin_sessions" ON admin_sessions FOR ALL USING (true);
CREATE POLICY "Service role full access - admin_audit_logs" ON admin_audit_logs FOR ALL USING (true);
CREATE POLICY "Service role full access - admin_login_attempts" ON admin_login_attempts FOR ALL USING (true);

-- ========================================
-- Functions & Triggers
-- ========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_users_updated_at();

-- Clean up expired sessions automatically
CREATE OR REPLACE FUNCTION cleanup_expired_admin_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM admin_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Clean up old login attempts (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
    DELETE FROM admin_login_attempts WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Initial Super Admin Account
-- ========================================
-- NOTE: Password must be hashed with bcrypt before inserting
-- Use a tool like: https://bcrypt-generator.com/
-- Or run: node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('YOUR_PASSWORD', 10));"

-- Example (replace with your actual bcrypt hash):
-- INSERT INTO admin_users (email, password_hash, full_name, role, is_active)
-- VALUES (
--     'tefsirkurd@gmail.com',
--     '$2b$10$YourBcryptHashGoesHere',
--     'Super Admin',
--     'super_admin',
--     true
-- );

-- ========================================
-- Maintenance Views
-- ========================================

-- View: Active Admin Sessions
CREATE OR REPLACE VIEW active_admin_sessions AS
SELECT
    s.id,
    s.user_id,
    u.email,
    u.full_name,
    u.role,
    s.ip_address,
    s.created_at,
    s.last_activity,
    s.expires_at
FROM admin_sessions s
JOIN admin_users u ON s.user_id = u.id
WHERE s.expires_at > NOW()
ORDER BY s.last_activity DESC;

-- View: Recent Login Activity
CREATE OR REPLACE VIEW recent_login_activity AS
SELECT
    email,
    action,
    ip_address,
    created_at,
    details
FROM admin_audit_logs
WHERE action IN ('login_success', 'login_failed', 'account_locked')
ORDER BY created_at DESC
LIMIT 100;

-- View: Failed Login Attempts (Last 24h)
CREATE OR REPLACE VIEW recent_failed_attempts AS
SELECT
    email,
    ip_address,
    COUNT(*) as attempt_count,
    MAX(created_at) as last_attempt
FROM admin_login_attempts
WHERE success = FALSE
AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY email, ip_address
ORDER BY attempt_count DESC, last_attempt DESC;
