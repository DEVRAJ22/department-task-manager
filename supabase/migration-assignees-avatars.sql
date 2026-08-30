-- Co-assignees and user avatars
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_id INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS task_assignees (
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);

INSERT INTO task_assignees (task_id, user_id)
SELECT id, assigned_user_id FROM tasks WHERE assigned_user_id IS NOT NULL
ON CONFLICT DO NOTHING;
