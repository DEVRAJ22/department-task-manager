import { supabase } from '../supabase.js';
import { formatUser } from '../utils/permissions.js';

const USER_FIELDS = 'id, username, name, employee_id, department, role, disabled, can_assign, can_verify, avatar_id, created_at';

export async function getUserById(id) {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getUserByUsername(username) {
  const { data, error } = await supabase.from('users').select('*').eq('username', username).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getAllUsers() {
  const { data, error } = await supabase.from('users').select(USER_FIELDS).order('name');
  if (error) throw error;
  return data.map(formatUser);
}

export async function getActiveUserList() {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, username, department, avatar_id')
    .eq('disabled', false)
    .order('name');
  if (error) throw error;
  return data;
}

export async function createUser({ username, password_hash, name, employee_id, department, role, can_assign, can_verify, avatar_id }) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      username,
      password_hash,
      name,
      employee_id: employee_id || null,
      department: department || null,
      role: role === 'admin' ? 'admin' : 'user',
      can_assign: !!can_assign,
      can_verify: !!can_verify,
      avatar_id: avatar_id && avatar_id >= 1 && avatar_id <= 10 ? avatar_id : 1,
    })
    .select(USER_FIELDS)
    .single();
  if (error) throw error;
  return formatUser(data);
}

export async function updateUser(id, fields) {
  const update = {};
  if (fields.username !== undefined) update.username = fields.username;
  if (fields.name !== undefined) update.name = fields.name;
  if (fields.employee_id !== undefined) update.employee_id = fields.employee_id || null;
  if (fields.department !== undefined) update.department = fields.department || null;
  if (fields.role !== undefined) update.role = fields.role;
  if (fields.disabled !== undefined) update.disabled = !!fields.disabled;
  if (fields.can_assign !== undefined) update.can_assign = !!fields.can_assign;
  if (fields.can_verify !== undefined) update.can_verify = !!fields.can_verify;
  if (fields.password_hash !== undefined) update.password_hash = fields.password_hash;
  if (fields.avatar_id !== undefined) {
    const aid = Number(fields.avatar_id);
    update.avatar_id = aid >= 1 && aid <= 10 ? aid : 1;
  }

  const { data, error } = await supabase.from('users').update(update).eq('id', id).select(USER_FIELDS).single();
  if (error) throw error;
  return formatUser(data);
}

export async function disableUser(id) {
  const { error } = await supabase.from('users').update({ disabled: true }).eq('id', id);
  if (error) throw error;
}

export async function hardDeleteUser(id) {
  await supabase.from('task_assignees').delete().eq('user_id', id);
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw error;
}

export async function getUserCount() {
  const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count;
}

export async function usernameExists(username, excludeId = null) {
  let q = supabase.from('users').select('id').eq('username', username);
  if (excludeId) q = q.neq('id', excludeId);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return !!data;
}
