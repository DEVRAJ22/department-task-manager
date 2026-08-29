import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function columnExists(table, column) {
  const { error } = await supabase.from(table).select(column).limit(1);
  return !error;
}

async function run() {
  const hasCompletedAt = await columnExists('tasks', 'completed_at');
  const hasShareToken = await columnExists('task_files', 'share_token');

  if (!hasCompletedAt || !hasShareToken) {
    console.error(
      'Missing columns. Run supabase/migration-retention-and-files.sql in the Supabase SQL Editor first.'
    );
    process.exit(1);
  }

  const { data: completed } = await supabase
    .from('tasks')
    .update({ completed_at: new Date().toISOString() })
    .eq('status', 'Completed')
    .is('completed_at', null)
    .select('id');

  const { data: files } = await supabase
    .from('task_files')
    .select('id')
    .is('share_token', null);

  for (const file of files || []) {
    await supabase.from('task_files').update({ share_token: randomUUID() }).eq('id', file.id);
  }

  console.log(`Backfilled ${completed?.length || 0} completed tasks, ${files?.length || 0} file share tokens.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
