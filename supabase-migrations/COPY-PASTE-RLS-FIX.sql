-- 🔥 COPY-PASTE THIS - Fix admin_login_sessions RLS policies

-- Enable RLS
ALTER TABLE public.admin_login_sessions ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role can manage admin sessions"
ON public.admin_login_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Block regular authenticated users
CREATE POLICY "Regular users cannot access admin sessions"
ON public.admin_login_sessions
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Block public access
CREATE POLICY "Public cannot access admin sessions"
ON public.admin_login_sessions
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- ✅ Done! Check Database Linter - RLS warning should be gone
