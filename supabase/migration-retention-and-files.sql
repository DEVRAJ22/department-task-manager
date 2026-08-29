-- Run in Supabase SQL Editor if upgrading an existing database

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE task_files ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(status, completed_at);

-- Backfill completed_at for tasks already marked Completed
UPDATE tasks
SET completed_at = COALESCE(completed_at, now())
WHERE status = 'Completed' AND completed_at IS NULL;

-- Backfill share tokens for existing files (run once)
UPDATE task_files
SET share_token = gen_random_uuid()::text
WHERE share_token IS NULL;
