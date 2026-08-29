import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { canAccessTask, isAdmin } from '../utils/permissions.js';
import { processReminders } from '../utils/reminders.js';
import {
  formatTask,
  resolveCreateStatus,
  validateTaskCreate,
  validateTaskMove,
  validateTaskUpdate,
  PRIORITIES,
  STATUSES,
} from '../utils/taskHelpers.js';
import * as tasks from '../services/tasksService.js';

const router = Router();

router.get('/', authRequired, asyncHandler(async (req, res) => {
  await processReminders();

  const filters = {};
  if (!isAdmin(req.user)) filters.assignedUserId = req.user.id;
  if (req.query.status) filters.status = req.query.status;

  const list = await tasks.getTasks(filters);
  const withUnread = await tasks.attachUnreadCounts(req.user.id, list);
  res.json(withUnread);
}));

router.post('/:id/view', authRequired, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const task = await tasks.getTaskById(id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!canAccessTask(req.user, task)) return res.status(403).json({ error: 'Access denied' });

  await tasks.markTaskViewed(req.user.id, id);
  res.json({ ok: true });
}));

router.get('/:id/history', authRequired, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const task = await tasks.getTaskById(id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!canAccessTask(req.user, task)) return res.status(403).json({ error: 'Access denied' });

  res.json(await tasks.getTaskHistory(id));
}));

router.get('/:id/reminder', authRequired, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const task = await tasks.getTaskById(id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!canAccessTask(req.user, task)) return res.status(403).json({ error: 'Access denied' });

  const reminder = await tasks.getReminder(id);
  res.json(reminder || null);
}));

router.put('/:id/reminder', authRequired, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const task = await tasks.getTaskById(id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!canAccessTask(req.user, task)) return res.status(403).json({ error: 'Access denied' });

  const { reminder_type, days, active } = req.body;
  const type = reminder_type === 'specific' ? 'specific' : 'daily';
  const daysData = Array.isArray(days) ? days : [];

  const reminder = await tasks.upsertReminder(id, {
    reminder_type: type,
    days: daysData,
    active,
  });

  res.json(reminder);
}));

router.get('/:id', authRequired, asyncHandler(async (req, res) => {
  const task = await tasks.getTaskById(Number(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!canAccessTask(req.user, task)) return res.status(403).json({ error: 'Access denied' });
  res.json(formatTask(task));
}));

router.post('/', authRequired, asyncHandler(async (req, res) => {
  const { title, description, assigned_user_id, priority, due_date, status } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const requestedStatus = STATUSES.includes(status) ? status : 'Backlog';
  const createError = validateTaskCreate(req.user, { assigned_user_id, status: requestedStatus });
  if (createError) return res.status(403).json({ error: createError });

  const taskStatus = resolveCreateStatus(req.user, requestedStatus, assigned_user_id);
  const taskPriority = PRIORITIES.includes(priority) ? priority : 'Medium';
  const assignee = assigned_user_id || req.user.id;
  const today = new Date().toISOString().split('T')[0];
  const maxPos = await tasks.getMaxPosition(taskStatus);

  const created = await tasks.createTask({
    title: title.trim(),
    description: description?.trim() || '',
    assigned_user_id: assignee,
    priority: taskPriority,
    due_date: due_date || today,
    status: taskStatus,
    position: maxPos + 1,
    created_by_id: req.user.id,
  });

  await tasks.logStatusChange(created.id, taskStatus, req.user.id, 'Task created');
  res.status(201).json(formatTask(created));
}));

router.put('/:id/move', authRequired, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { status, position } = req.body;

  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const task = await tasks.getTaskById(id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const moveError = validateTaskMove(req.user, task, status);
  if (moveError) return res.status(403).json({ error: moveError });

  const newPosition = position ?? 0;
  const statusChanged = task.status !== status;

  await tasks.moveTask(task, status, newPosition);

  if (statusChanged) {
    await tasks.logStatusChange(id, status, req.user.id);
  }

  const updated = await tasks.getTaskById(id);
  res.json(formatTask(updated));
}));

router.put('/:id', authRequired, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const task = await tasks.getTaskById(id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { title, description, assigned_user_id, priority, due_date, status } = req.body;
  const newStatus = STATUSES.includes(status) ? status : task.status;

  const updateError = validateTaskUpdate(req.user, task, { assigned_user_id, status: newStatus });
  if (updateError) return res.status(403).json({ error: updateError });

  const statusChanged = newStatus !== task.status;
  const updates = {};

  if (title?.trim()) updates.title = title.trim();
  if (description !== undefined) updates.description = description;
  if (priority && PRIORITIES.includes(priority)) updates.priority = priority;
  if (due_date !== undefined) updates.due_date = due_date || null;
  updates.status = newStatus;
  updates.assigned_user_id = assigned_user_id !== undefined ? (assigned_user_id || req.user.id) : task.assigned_user_id;

  if (statusChanged) {
    const maxPos = await tasks.getMaxPosition(newStatus);
    updates.position = maxPos + 1;

    const oldIds = await tasks.getTaskIdsByStatus(task.status, id);
    await tasks.reorderTasks(task.status, oldIds);
    await tasks.logStatusChange(id, newStatus, req.user.id);
  }

  const updated = await tasks.updateTask(id, updates);
  res.json(formatTask(updated));
}));

router.delete('/:id', authRequired, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const task = await tasks.getTaskById(id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!canAccessTask(req.user, task) && !isAdmin(req.user)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  await tasks.deleteTask(id);

  const remaining = await tasks.getTaskIdsByStatus(task.status);
  await tasks.reorderTasks(task.status, remaining);

  res.json({ ok: true });
}));

export default router;
