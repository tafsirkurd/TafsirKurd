-- Admin Tasks & Goals System
-- Run via: Supabase dashboard SQL editor or MCP

CREATE TABLE IF NOT EXISTS admin_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'todo'
               CHECK (status IN ('todo','in_progress','waiting','done')),
  priority     TEXT NOT NULL DEFAULT 'medium'
               CHECK (priority IN ('low','medium','high','urgent')),
  category     TEXT DEFAULT 'TafsirKurd App'
               CHECK (category IN ('TafsirKurd App','Website','Content','Admin Panel','Bugs','Ideas','Personal')),
  due_at       TIMESTAMPTZ,
  assigned_to  TEXT,
  tags         JSONB DEFAULT '[]',
  links        JSONB DEFAULT '[]',
  created_by   TEXT NOT NULL,
  updated_by   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  archived     BOOLEAN DEFAULT FALSE,
  sort_order   INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS admin_task_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES admin_tasks(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_tasks_all" ON admin_tasks;
DROP POLICY IF EXISTS "admin_task_comments_all" ON admin_task_comments;
CREATE POLICY "admin_tasks_all" ON admin_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "admin_task_comments_all" ON admin_task_comments FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS admin_tasks_status_idx  ON admin_tasks(status)  WHERE NOT archived;
CREATE INDEX IF NOT EXISTS admin_tasks_due_at_idx  ON admin_tasks(due_at)  WHERE NOT archived;
CREATE INDEX IF NOT EXISTS admin_tasks_created_idx ON admin_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS atc_task_id_idx         ON admin_task_comments(task_id);

CREATE OR REPLACE FUNCTION update_admin_tasks_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_admin_tasks_updated_at ON admin_tasks;
CREATE TRIGGER trg_admin_tasks_updated_at
  BEFORE UPDATE ON admin_tasks
  FOR EACH ROW EXECUTE FUNCTION update_admin_tasks_ts();
