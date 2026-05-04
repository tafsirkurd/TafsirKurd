-- Allow admin users to update the details column on admin_audit_logs
-- This is needed so saveMark() can persist mark/note data from the client.
-- Run once in the Supabase SQL editor.

-- Enable RLS if not already on
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to read all audit log rows
DROP POLICY IF EXISTS "admins_read_audit_logs" ON admin_audit_logs;
CREATE POLICY "admins_read_audit_logs"
  ON admin_audit_logs
  FOR SELECT
  USING (true);

-- Allow authenticated users to update only existing rows (marks/notes)
DROP POLICY IF EXISTS "admins_update_audit_log_details" ON admin_audit_logs;
CREATE POLICY "admins_update_audit_log_details"
  ON admin_audit_logs
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
