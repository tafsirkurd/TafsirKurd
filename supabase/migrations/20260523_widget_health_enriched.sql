-- Add enriched snapshot fields to widget_health_reports
-- These are written by prayer.ui.js >= 20260523 when the snapshot includes
-- validUntil, currentPrayer, nextPrayer, and snapshotDate fields.

ALTER TABLE widget_health_reports
    ADD COLUMN IF NOT EXISTS current_prayer  TEXT,
    ADD COLUMN IF NOT EXISTS next_prayer     TEXT,
    ADD COLUMN IF NOT EXISTS snapshot_date   TEXT,
    ADD COLUMN IF NOT EXISTS today_baghdad   TEXT,
    ADD COLUMN IF NOT EXISTS snapshot_stale  BOOLEAN,
    ADD COLUMN IF NOT EXISTS valid_until     BIGINT;  -- Unix ms

-- Index to quickly find devices where snapshot is stale
CREATE INDEX IF NOT EXISTS idx_whr_snapshot_stale
    ON widget_health_reports (snapshot_stale, created_at DESC)
    WHERE snapshot_stale = TRUE;

-- Index to detect prayer mismatches (current_prayer ≠ expected given timestamp)
CREATE INDEX IF NOT EXISTS idx_whr_current_prayer
    ON widget_health_reports (current_prayer, created_at DESC);
