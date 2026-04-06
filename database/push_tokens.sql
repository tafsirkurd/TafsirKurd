-- Push Tokens — remote push notification infrastructure
-- Run once. All triggers and functions are idempotent (CREATE OR REPLACE / ON CONFLICT DO NOTHING).

-- ── 1. Token storage ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_tokens (
  id         bigint generated always as identity primary key,
  token      text unique not null,
  platform   text not null check (platform in ('android', 'ios')),
  user_id    uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_upsert_tokens" ON push_tokens FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS push_tokens_platform_idx ON push_tokens(platform);
COMMENT ON TABLE push_tokens IS 'FCM push notification device tokens for Android and iOS';

-- ── 2. Dispatch config in site_settings ─────────────────────────────────────
-- push_dispatch_url: your Cloudflare Pages URL, e.g. https://tafsirkurd.com/push-notifications
-- push_secret:       random secret, must match PUSH_SECRET Cloudflare env secret
INSERT INTO site_settings (key, value) VALUES
  ('push_dispatch_url', 'https://tafsirkurd.com/push-notifications'),
  ('push_secret', '')
ON CONFLICT (key) DO NOTHING;

-- ── 3. Core dispatch function (calls Cloudflare via pg_net) ─────────────────
CREATE OR REPLACE FUNCTION dispatch_push_notification(p_title text, p_body text, p_type text, p_id text)
RETURNS void AS $$
DECLARE
  v_url    text;
  v_secret text;
BEGIN
  SELECT value INTO v_url    FROM site_settings WHERE key = 'push_dispatch_url';
  SELECT value INTO v_secret FROM site_settings WHERE key = 'push_secret';
  IF v_url IS NULL OR v_url = '' OR v_secret IS NULL OR v_secret = '' THEN
    RAISE NOTICE 'push_dispatch_url or push_secret not configured — skipping push';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'X-Push-Secret', v_secret
    ),
    body := jsonb_build_object(
      'title', p_title,
      'body',  p_body,
      'data',  jsonb_build_object('type', p_type, 'id', p_id)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. Trigger: new book ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_push_new_book()
RETURNS trigger AS $$
BEGIN
  IF NEW.active = true THEN
    PERFORM dispatch_push_notification(
      COALESCE(NEW.title_ku, NEW.title_ar, 'کتێبێکی نوێ 📖'),
      'بردەست بووە — دەست بکە بخواندنێ',
      'gencine_books',
      NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS push_new_book ON gencine_books;
CREATE TRIGGER push_new_book
  AFTER INSERT ON gencine_books
  FOR EACH ROW EXECUTE FUNCTION trigger_push_new_book();

-- ── 5. Trigger: new episode ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_push_new_episode()
RETURNS trigger AS $$
BEGIN
  PERFORM dispatch_push_notification(
    COALESCE(NEW.title_ku, NEW.title, 'ڤیدیۆیەکی نوێ 🎬'),
    'ڤیدیۆیەکی نوێ زیاد بوو — تەماشا بکە',
    'islamvoice_episodes',
    NEW.id::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS push_new_episode ON islamvoice_episodes;
CREATE TRIGGER push_new_episode
  AFTER INSERT ON islamvoice_episodes
  FOR EACH ROW EXECUTE FUNCTION trigger_push_new_episode();
