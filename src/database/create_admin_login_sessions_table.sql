-- Create admin_login_sessions table for tracking admin panel logins
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.admin_login_sessions (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address TEXT,
    location TEXT,
    login_time TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    is_online BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for security
ALTER TABLE public.admin_login_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin-only access

-- Service role can manage all admin sessions
CREATE POLICY "Service role can manage admin sessions"
ON public.admin_login_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Block authenticated users (admin-only data)
CREATE POLICY "Regular users cannot access admin sessions"
ON public.admin_login_sessions
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Block public/anonymous access
CREATE POLICY "Public cannot access admin sessions"
ON public.admin_login_sessions
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_sessions_email ON public.admin_login_sessions(email);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_login_time ON public.admin_login_sessions(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_is_online ON public.admin_login_sessions(is_online);
