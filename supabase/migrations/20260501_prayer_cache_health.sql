-- Prayer Cache Health monitoring table
-- Run this in Supabase SQL editor: https://supabase.com/dashboard/project/gijupzejtbpifjzwadee/sql

CREATE TABLE IF NOT EXISTS prayer_cache_health (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id text,
  platform text,            -- 'ios' | 'android' | 'web'
  city text NOT NULL,
  baghdad_date text NOT NULL,  -- YYYY-MM-DD Baghdad date
  cache_status text NOT NULL,  -- see values below
  stale_reason text,
  cache_age_hours numeric,
  cache_version text,
  fajr_shown text,
  dhuhr_shown text,
  maghrib_shown text,
  isha_shown text,
  notifications_rescheduled boolean DEFAULT false,
  changed_from text,        -- e.g. 'fajr:3:37→3:42' if times changed after refresh
  error_msg text
);

-- cache_status values:
--   fresh_fetch              — no cache, fetched from network
--   valid_cache              — cache was fresh, used as-is
--   stale_then_refresh       — showed cache, then refreshed (may have changed times)
--   fetch_failed_using_cache — network failed, fell back to old cache
--   fetch_failed_no_cache    — network failed, no cache available

ALTER TABLE prayer_cache_health ENABLE ROW LEVEL SECURITY;

-- App can insert anonymously (no user identity involved)
CREATE POLICY "allow_anon_insert" ON prayer_cache_health
  FOR INSERT TO anon WITH CHECK (true);

-- Admin dashboard reads via service role only
CREATE POLICY "allow_service_select" ON prayer_cache_health
  FOR SELECT TO service_role USING (true);

CREATE INDEX IF NOT EXISTS idx_prayer_health_created ON prayer_cache_health(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_health_city_date ON prayer_cache_health(city, baghdad_date);
CREATE INDEX IF NOT EXISTS idx_prayer_health_status ON prayer_cache_health(cache_status, created_at DESC);
