-- ===== USER SESSIONS TABLE =====
-- Tracks active devices per user.
-- Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.user_sessions (
    id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id    TEXT        NOT NULL,
    platform     TEXT        NOT NULL DEFAULT 'web',   -- 'android' | 'ios' | 'web'
    device_label TEXT,                                  -- human-readable: 'Android', 'iPhone', 'Web'
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_device UNIQUE (user_id, device_id)
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
    ON public.user_sessions (user_id, last_active_at DESC);

-- Enable Row Level Security
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users view own sessions"
    ON public.user_sessions FOR SELECT
    USING (auth.uid() = user_id);

-- Users can register / update their own session
CREATE POLICY "Users upsert own sessions"
    ON public.user_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own sessions"
    ON public.user_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can remove any of their own sessions (remove other device or sign out self)
CREATE POLICY "Users delete own sessions"
    ON public.user_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- Grant to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO authenticated;

-- Realtime: enable replication so devices receive revocation events
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;
