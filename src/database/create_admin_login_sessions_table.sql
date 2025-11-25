-- Create admin_login_sessions table for tracking admin panel logins
CREATE TABLE admin_login_sessions (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address TEXT,
    location TEXT,
    login_time TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    is_online BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX idx_admin_sessions_email ON admin_login_sessions(email);
CREATE INDEX idx_admin_sessions_login_time ON admin_login_sessions(login_time DESC);
CREATE INDEX idx_admin_sessions_is_online ON admin_login_sessions(is_online);

-- Add comment to table
COMMENT ON TABLE admin_login_sessions IS 'Tracks admin panel login sessions with IP addresses and online status';
