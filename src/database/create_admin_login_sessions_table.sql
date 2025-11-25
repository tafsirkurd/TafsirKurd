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

-- Disable RLS to avoid policy errors
ALTER TABLE public.admin_login_sessions DISABLE ROW LEVEL SECURITY;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_sessions_email ON public.admin_login_sessions(email);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_login_time ON public.admin_login_sessions(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_is_online ON public.admin_login_sessions(is_online);
