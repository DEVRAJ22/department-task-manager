import { supabase } from '../supabase.js';
import { STATUSES } from '../constants.js';
import { formatTask } from '../utils/taskHelpers.js';

async function attachUserNames(tasks) {
  if (!tasks.length) return tasks;

  const userIds = [...new Set(
    tasks.flatMap((t) => [t.assigned_user_id, t.created_by_id]).filter(Boolean)
  )];

  const { data: users } = await supabase.from('users').select('id, name').in('id', userIds);
  const nameMap = Object.fromEntries((users || []).map((u) => [u.id, u.name]));

  return tasks.map((t) => ({
    ...t,
    assigned_user_name: nameMap[t.assigned_user_id] || null,
    created_by_name: nameMap[t.created_by_id] || null,
  }));
}

export async function getTaskById(id) {
  const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;
  const [withNames] = await attachUserNames([data]);
  return withNames;
}

export async function getTasks({ assignedUserId, status } = {}) {
  let q = supabase
    .from('tasks')
    .select('*, assigned_user:users!assigned_user_id(name), creator:users!created_by_id(name)')
    .order('status')
    .order('position')
    .order('id');
  if (assignedUserId) q = q.eq('assigned_user_id', assignedUserId);
  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) {
    let fallback = supabase.from('tasks').select('*').order('status').order('position').order('id');
    if (assignedUserId) fallback = fallback.eq('assigned_user_id', assignedUserId);
    if (status) fallback = fallback.eq('status', status);
    const { data: rows, error: fallbackError } = await fallback;
    if (fallbackError) throw fallbackError;
    return attachUserNames(rows || []);
  }

  return (data || []).map((t) => ({
    ...t,
    assigned_user_name: t.assigned_user?.name || null,
    created_by_name: t.creator?.name || null,
    assigned_user: undefined,
    creator: undefined,
  }));
}

export async function createTask(fields) {
  const { data, error } = await supabase.from('tasks').insert(fields).select('*').single();
  if (error) throw error;
  const [withNames] = await attachUserNames([data]);
  return withNames;
}

export async function updateTask(id, fields) {
  const { data, error } = await supabase.from('tasks').update(fields).eq('id', id).select('*').single();
  if (error) throw error;
  const [withNames] = await attachUserNames([data]);
  return withNames;
}

export async function deleteTask(id) {
  await deleteTaskFully(id);
}

export async function setCompletedAt(id, status) {
  const completed_at = status === 'Completed' ? new Date().toISOString() : null;
  const { error } = await supabase.from('tasks').update({ completed_at }).eq('id', id);
  if (error) throw error;
}

export async function getMaxPosition(status) {
  const { data, error } = await supabase
    .from('tasks')
    .select('position')
    .eq('status', status)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.position ?? -1;
}

export async function getTaskIdsByStatus(status, excludeId = null) {
  let q = supabase.from('tasks').select('id').eq('status', status).order('position').order('id');
  if (excludeId) q = q.neq('id', excludeId);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map((t) => t.id);
}

export async function reorderTasks(status, orderedIds) {
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase.from('tasks').update({ position: i, status }).eq('id', orderedIds[i]);
    if (error) throw error;
  }
}

export async function moveTask(task, newStatus, newPosition) {
  const id = task.id;
  const oldStatus = task.status;

  if (oldStatus === newStatus) {
    const ids = await getTaskIdsByStatus(oldStatus);
    const filtered = ids.filter((tid) => tid !== id);
    filtered.splice(newPosition, 0, id);
    await reorderTasks(oldStatus, filtered);
  } else {
    const oldIds = await getTaskIdsByStatus(oldStatus, id);
    await reorderTasks(oldStatus, oldIds);

    const newIds = await getTaskIdsByStatus(newStatus);
    newIds.splice(newPosition, 0, id);
    await reorderTasks(newStatus, newIds);
  }
}

export async function logStatusChange(taskId, status, userId, note = null) {
  const { error } = await supabase.from('task_status_history').insert({
    task_id: taskId,
    status,
    changed_by_id: userId,
    note,
  });
  if (error) throw error;
}

export async function getTaskHistory(taskId) {
  const { data: history, error } = await supabase
    .from('task_status_history')
    .select('*')
    .eq('task_id', taskId)
    .order('changed_at', { ascending: true });
  if (error) throw error;

  const userIds = [...new Set((history || []).map((h) => h.changed_by_id).filter(Boolean))];
  let nameMap = {};
  if (userIds.length) {
    const { data: users } = await supabase.from('users').select('id, name').in('id', userIds);
    nameMap = Object.fromEntries((users || []).map((u) => [u.id, u.name]));
  }

  return (history || []).map((h) => ({ ...h, changed_by_name: nameMap[h.changed_by_id] || null }));
}

export async function getReminder(taskId) {
  const { data, error } = await supabase.from('task_reminders').select('*').eq('task_id', taskId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertReminder(taskId, { reminder_type, days, active }) {
  if (active === false) {
    await supabase.from('task_reminders').update({ active: false }).eq('task_id', taskId);
    return { active: false };
  }

  const { data, error } = await supabase
    .from('task_reminders')
    .upsert({
      task_id: taskId,
      reminder_type,
      days,
      active: true,
    }, { onConflict: 'task_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function markTaskViewed(userId, taskId) {
  const { error } = await supabase.from('task_views').upsert({
    user_id: userId,
    task_id: taskId,
    last_viewed_at: new Date().toISOString(),
  }, { onConflict: 'user_id,task_id' });
  if (error) throw error;
}

export async function attachUnreadCounts(userId, tasks) {
  if (!tasks.length) return [];

  const taskIds = tasks.map((t) => t.id);

  const [{ data: views }, { data: comments, error }] = await Promise.all([
    supabase
      .from('task_views')
      .select('task_id, last_viewed_at')
      .eq('user_id', userId)
      .in('task_id', taskIds),
    supabase
      .from('comments')
      .select('task_id, created_at')
      .in('task_id', taskIds)
      .neq('user_id', userId),
  ]);

  if (error) throw error;

  const viewMap = Object.fromEntries((views || []).map((v) => [v.task_id, v.last_viewed_at]));
  const counts = {};

  for (const comment of comments || []) {
    const since = viewMap[comment.task_id] || '1970-01-01T00:00:00Z';
    if (comment.created_at > since) {
      counts[comment.task_id] = (counts[comment.task_id] || 0) + 1;
    }
  }

  return tasks.map((t) => formatTask({ ...t, unread_count: counts[t.id] || 0 }));
}

export async function getActiveReminders() {
  const { data: reminders, error } = await supabase
    .from('task_reminders')
    .select('*')
    .eq('active', true);
  if (error) throw error;

  const results = [];
  for (const r of reminders || []) {
    const { data: task } = await supabase.from('tasks').select('status, title').eq('id', r.task_id).single();
    if (task && task.status !== 'Completed') {
      results.push({ ...r, status: task.status, title: task.title });
    }
  }
  return results;
}

export async function updateReminderLastRun(id) {
  await supabase.from('task_reminders').update({ last_run: new Date().toISOString() }).eq('id', id);
}

export { STATUSES };
