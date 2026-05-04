-- Admin notifications table — cross-admin mention alerts and system events
-- Run this once in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS admin_notifications (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text       NOT NULL,
  type           text        NOT NULL DEFAULT 'mention',
  title          text        NOT NULL,
  body           text,
  source_id      text        UNIQUE,       -- dedup key e.g. 'mention_{audit_log_id}_{recipient_email}'
  data           jsonb       NOT NULL DEFAULT '{}',
  read           boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     text
);

CREATE INDEX IF NOT EXISTS admin_notif_recipient_idx  ON admin_notifications(recipient_email);
CREATE INDEX IF NOT EXISTS admin_notif_created_idx    ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_notif_unread_idx     ON admin_notifications(recipient_email, read) WHERE read = false;

-- RLS — admin system, all admin users can read/write
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_all_notifications" ON admin_notifications;
CREATE POLICY "admins_all_notifications"
  ON admin_notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);
