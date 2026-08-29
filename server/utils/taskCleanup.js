import { supabase } from '../supabase.js';
import { STORAGE_BUCKET } from '../constants.js';

const RETENTION_MS = 24 * 60 * 60 * 1000;

export async function deleteTaskStorageFiles(taskId) {
  const { data: fileRows, error } = await supabase
    .from('task_files')
    .select('storage_path')
    .eq('task_id', taskId);

  if (error) throw error;

  const paths = (fileRows || []).map((f) => f.storage_path).filter(Boolean);
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove(paths);
    if (storageError) throw storageError;
  }
}

export async function deleteTaskFully(taskId) {
  await deleteTaskStorageFiles(taskId);
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

export async function purgeExpiredCompletedTasks() {
  const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();

  const { data: expired, error } = await supabase
    .from('tasks')
    .select('id')
    .eq('status', 'Completed')
    .not('completed_at', 'is', null)
    .lt('completed_at', cutoff);

  if (error) throw error;
  if (!expired?.length) return 0;

  for (const task of expired) {
    await deleteTaskFully(task.id);
  }

  return expired.length;
}

export function completedAtForStatus(status) {
  return status === 'Completed' ? new Date().toISOString() : null;
}
