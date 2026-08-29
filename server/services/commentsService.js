import { supabase } from '../supabase.js';

export async function getCommentsByTask(taskId) {
  const { data: comments, error } = await supabase
    .from('comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const userIds = [...new Set((comments || []).map((c) => c.user_id))];
  let nameMap = {};
  if (userIds.length) {
    const { data: users } = await supabase.from('users').select('id, name').in('id', userIds);
    nameMap = Object.fromEntries((users || []).map((u) => [u.id, u.name]));
  }

  const { data: commentFiles } = await supabase
    .from('task_files')
    .select('*')
    .eq('task_id', taskId)
    .not('comment_id', 'is', null);

  const uploaderIds = [...new Set((commentFiles || []).map((f) => f.uploaded_by).filter(Boolean))];
  let uploaderMap = {};
  if (uploaderIds.length) {
    const { data: uploaders } = await supabase.from('users').select('id, name').in('id', uploaderIds);
    uploaderMap = Object.fromEntries((uploaders || []).map((u) => [u.id, u.name]));
  }

  const filesByComment = {};
  for (const f of commentFiles || []) {
    if (!filesByComment[f.comment_id]) filesByComment[f.comment_id] = [];
    filesByComment[f.comment_id].push({
      ...f,
      uploader_name: uploaderMap[f.uploaded_by] || null,
      share_url: f.share_token ? `/api/files/share/${f.share_token}` : null,
    });
  }

  return (comments || []).map((c) => ({
    ...c,
    user_name: nameMap[c.user_id],
    files: filesByComment[c.id] || [],
  }));
}

export async function createComment(taskId, userId, content) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ task_id: taskId, user_id: userId, content })
    .select('*')
    .single();
  if (error) throw error;

  const { data: user } = await supabase.from('users').select('name').eq('id', userId).single();
  return { ...data, user_name: user?.name, files: [] };
}

export async function getCommentById(id) {
  const { data, error } = await supabase.from('comments').select('*').eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
