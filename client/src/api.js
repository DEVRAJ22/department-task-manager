const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

async function uploadFile(path, file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}

export const api = {
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  getMe: () => request('/auth/me'),

  getUsers: () => request('/users'),
  getUserList: () => request('/users/list'),
  getUserPasswordInfo: (id) => request(`/users/${id}/password`),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  resetPassword: (id, password) =>
    request(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password }) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  deleteUserPermanent: (id) => request(`/users/${id}?permanent=true`, { method: 'DELETE' }),
  updateAvatar: (avatar_id) =>
    request('/users/profile/avatar', { method: 'PUT', body: JSON.stringify({ avatar_id }) }),
  changePassword: (currentPassword, newPassword) =>
    request('/users/profile/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),

  getTasks: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/tasks${query ? `?${query}` : ''}`);
  },
  getTask: (id) => request(`/tasks/${id}`),
  getTaskHistory: (id) => request(`/tasks/${id}/history`),
  getTaskReminder: (id) => request(`/tasks/${id}/reminder`),
  setTaskReminder: (id, data) =>
    request(`/tasks/${id}/reminder`, { method: 'PUT', body: JSON.stringify(data) }),
  createTask: (data) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id, data) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  moveTask: (id, status, position) =>
    request(`/tasks/${id}/move`, { method: 'PUT', body: JSON.stringify({ status, position }) }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  markTaskViewed: (id) => request(`/tasks/${id}/view`, { method: 'POST' }),
  importTasks: (tasks) => request('/tasks/bulk', { method: 'POST', body: JSON.stringify({ tasks }) }),
  purgeCompletedTasks: () => request('/tasks/purge-completed', { method: 'POST' }),

  getComments: (taskId) => request(`/comments/task/${taskId}`),
  addComment: (taskId, content) =>
    request(`/comments/task/${taskId}`, { method: 'POST', body: JSON.stringify({ content }) }),

  getTaskFiles: (taskId) => request(`/files/task/${taskId}`),
  uploadTaskFile: (taskId, file) => uploadFile(`/files/task/${taskId}`, file),
  uploadCommentFile: (commentId, file) => uploadFile(`/files/comment/${commentId}`, file),
  fileShareUrl: (shareToken) => `${API_BASE}/files/share/${shareToken}`,
  downloadFile: (fileId) => `${API_BASE}/files/${fileId}/download`,
  deleteFile: (fileId) => request(`/files/${fileId}`, { method: 'DELETE' }),
};

export const STATUSES = ['Backlog', 'To Do', 'In Progress', 'Submit for Approval', 'Completed'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Daily Task'];
export const CREATE_STATUSES = ['Backlog', 'To Do'];
export const USER_MOVABLE_STATUSES = ['Backlog', 'To Do', 'In Progress', 'Submit for Approval'];
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
