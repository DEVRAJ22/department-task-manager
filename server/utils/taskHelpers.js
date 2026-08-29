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

export function validateTaskCreate(user, { assigned_user_id, status }) {
  const assigneeId = assigned_user_id || user.id;

  if (!isAdmin(user) && assigneeId !== user.id) {
    return 'You can only create tasks for yourself';
  }

  if (!isAdmin(user) && !canAssignToOthers(user) && assigneeId !== user.id) {
    return 'You do not have permission to assign tasks to others';
  }

  if (!isAdmin(user) && !CREATE_STATUSES.includes(status)) {
    return 'You can only create tasks in Backlog or To Do';
  }

  if (!isAdmin(user) && status === 'Backlog' && assigneeId !== user.id) {
    return 'Backlog tasks can only be created for yourself';
  }

  return null;
}

export function validateTaskUpdate(user, task, { assigned_user_id, status }) {
  if (!canAccessTask(user, task)) {
    return 'You can only edit your assigned tasks';
  }

  if (assigned_user_id !== undefined && assigned_user_id !== task.assigned_user_id) {
    if (!isAdmin(user) && !canAssignToOthers(user)) {
      return 'You do not have permission to reassign tasks';
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
