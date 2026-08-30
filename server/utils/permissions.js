export const USER_MOVABLE_STATUSES = ['Backlog', 'To Do', 'In Progress', 'Submit for Approval'];
export const CREATE_STATUSES = ['Backlog', 'To Do'];

export function formatUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    employee_id: user.employee_id,
    department: user.department,
    role: user.role,
    disabled: !!user.disabled,
    can_assign: !!user.can_assign,
    can_verify: !!user.can_verify,
    avatar_id: user.avatar_id ?? 1,
    created_at: user.created_at,
  };
}

export function isAdmin(user) {
  return user?.role === 'admin';
}

export function canVerify(user) {
  return isAdmin(user) || !!user.can_verify;
}

export function canAssignToOthers(user) {
  return isAdmin(user) || !!user.can_assign;
}

export function canMoveToStatus(user, status) {
  if (status === 'Completed') return canVerify(user);
  return true;
}

export function canAccessTask(user, task) {
  if (isAdmin(user)) return true;
  if (task.assigned_user_id === user.id) return true;
  if (task.assignee_ids?.includes(user.id)) return true;
  return false;
}
