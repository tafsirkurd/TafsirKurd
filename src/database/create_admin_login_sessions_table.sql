-- Create admin_login_sessions table for tracking admin panel logins
CREATE TABLE IF NOT EXISTS admin_login_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    ip_address TEXT,
    location TEXT,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_online BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_sessions_email ON admin_login_sessions(email);

-- Create index on login_time for sorting
CREATE INDEX IF NOT EXISTS idx_admin_sessions_login_time ON admin_login_sessions(login_time DESC);

-- Create index on is_online for filtering active sessions
CREATE INDEX IF NOT EXISTS idx_admin_sessions_is_online ON admin_login_sessions(is_online);

-- Enable Row Level Security
ALTER TABLE admin_login_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (admin table, not user-facing)
CREATE POLICY "Allow all operations on admin_login_sessions"
ON admin_login_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE admin_login_sessions IS 'Tracks admin panel login sessions with IP addresses and online status';
