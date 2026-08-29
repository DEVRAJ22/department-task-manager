import { supabase } from '../supabase.js';
import { STORAGE_BUCKET } from '../constants.js';
import { randomUUID } from 'crypto';
import { deleteTaskFully } from '../utils/taskCleanup.js';

function formatFile(row) {
  return {
    id: row.id,
    task_id: row.task_id,
    comment_id: row.comment_id,
    original_name: row.original_name,
    mime_type: row.mime_type,
    size: row.size,
    uploaded_by: row.uploaded_by,
    uploader_name: row.uploader_name || row.uploader?.name || null,
    share_token: row.share_token,
    share_url: row.share_token ? `/api/files/share/${row.share_token}` : null,
    created_at: row.created_at,
  };
}

export async function getTaskFiles(taskId) {
  const { data, error } = await supabase
    .from('task_files')
    .select('*')
    .eq('task_id', taskId)
    .is('comment_id', null)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const uploaderIds = [...new Set((data || []).map((f) => f.uploaded_by).filter(Boolean))];
  let uploaderMap = {};
  if (uploaderIds.length) {
    const { data: uploaders } = await supabase.from('users').select('id, name').in('id', uploaderIds);
    uploaderMap = Object.fromEntries((uploaders || []).map((u) => [u.id, u.name]));
  }

  return (data || []).map((f) => formatFile({ ...f, uploader_name: uploaderMap[f.uploaded_by] }));
}

export async function getFileByShareToken(token) {
  const { data, error } = await supabase.from('task_files').select('*').eq('share_token', token).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getFileById(id) {
  const { data, error } = await supabase.from('task_files').select('*').eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function uploadFile({ taskId, commentId, file, uploadedBy }) {
  const ext = file.originalname.includes('.') ? file.originalname.split('.').pop() : 'bin';
  const storagePath = `${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('task_files')
    .insert({
      task_id: taskId,
      comment_id: commentId || null,
      original_name: file.originalname,
      storage_path: storagePath,
      mime_type: file.mimetype,
      size: file.size,
      uploaded_by: uploadedBy,
      share_token: randomUUID(),
    })
    .select('*')
    .single();
  if (error) throw error;

  let uploader_name = null;
  if (uploadedBy) {
    const { data: uploader } = await supabase.from('users').select('name').eq('id', uploadedBy).single();
    uploader_name = uploader?.name || null;
  }

  return formatFile({ ...data, uploader_name });
}

export async function downloadFile(storagePath) {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(storagePath);
  if (error) throw error;
  return data;
}

export async function deleteFileRecord(file) {
  await supabase.storage.from(STORAGE_BUCKET).remove([file.storage_path]);
  const { error } = await supabase.from('task_files').delete().eq('id', file.id);
  if (error) throw error;
}
