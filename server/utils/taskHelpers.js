import { PRIORITIES, STATUSES } from '../constants.js';
import {
  canAccessTask,
  canAssignToOthers,
  canMoveToStatus,
  canVerify,
  CREATE_STATUSES,
  isAdmin,
} from './permissions.js';

export function formatTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assigned_user_id: row.assigned_user_id,
    assigned_user_name: row.assigned_user_name,
    priority: row.priority,
    due_date: row.due_date,
    status: row.status,
    position: row.position,
    created_by_id: row.created_by_id,
    created_by_name: row.created_by_name,
    created_at: row.created_at,
    completed_at: row.completed_at,
    file_location: row.file_location || '',
    assignee_ids: row.assignee_ids || [],
    assignees: row.assignees || [],
    unread_count: row.unread_count ?? 0,
  };
}

export function resolveCreateStatus(user, requestedStatus, assignedUserId) {
  const assigneeId = assignedUserId || user.id;

  if (isAdmin(user)) {
    if (assigneeId !== user.id) return 'To Do';
    return CREATE_STATUSES.includes(requestedStatus) ? requestedStatus : 'Backlog';
  }

  if (!CREATE_STATUSES.includes(requestedStatus)) return 'Backlog';
  return requestedStatus;
}

export function validateTaskCreate(user, { assigned_user_id, assignee_ids, status }) {
  const ids = assignee_ids?.length ? assignee_ids : [assigned_user_id || user.id];
  const primaryId = ids[0];

  if (!isAdmin(user) && ids.some((id) => id !== user.id)) {
    if (!canAssignToOthers(user)) {
      return 'You do not have permission to assign tasks to others';
    }
  }

  if (!isAdmin(user) && !CREATE_STATUSES.includes(status)) {
    return 'You can only create tasks in Backlog or To Do';
  }

  if (!isAdmin(user) && status === 'Backlog' && primaryId !== user.id) {
    return 'Backlog tasks can only be created for yourself';
  }

  return null;
}

export function validateTaskUpdate(user, task, { assigned_user_id, assignee_ids, status }) {
  if (!canAccessTask(user, task)) {
    return 'You can only edit your assigned tasks';
  }

  if (assignee_ids !== undefined || assigned_user_id !== undefined) {
    const newIds = assignee_ids?.length ? assignee_ids : (assigned_user_id ? [assigned_user_id] : null);
    if (newIds && !isAdmin(user) && !canAssignToOthers(user)) {
      const currentIds = task.assignee_ids?.length ? task.assignee_ids : [task.assigned_user_id];
      const changed = newIds.length !== currentIds.length || newIds.some((id) => !currentIds.includes(id));
      if (changed) return 'You do not have permission to reassign tasks';
    }
  }

  if (status && status !== task.status && !canMoveToStatus(user, status)) {
    return 'Only admin or verified managers can mark tasks as Completed';
  }

  return null;
}

export function validateTaskMove(user, task, newStatus) {
  if (!canAccessTask(user, task)) {
    return 'You can only move your assigned tasks';
  }

  if (!canMoveToStatus(user, newStatus)) {
    return 'Only admin or verified managers can move tasks to Completed';
  }

  return null;
}

export { PRIORITIES, STATUSES, canVerify, isAdmin, canAssignToOthers, CREATE_STATUSES };
