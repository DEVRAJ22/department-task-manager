import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { canAccessTask } from '../utils/permissions.js';
import * as tasks from '../services/tasksService.js';
import * as comments from '../services/commentsService.js';

const router = Router();

router.get('/task/:taskId', authRequired, asyncHandler(async (req, res) => {
  const taskId = Number(req.params.taskId);
  const task = await tasks.getTaskById(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!canAccessTask(req.user, task)) return res.status(403).json({ error: 'Access denied' });

  res.json(await comments.getCommentsByTask(taskId));
}));

router.post('/task/:taskId', authRequired, asyncHandler(async (req, res) => {
  const taskId = Number(req.params.taskId);
  const { content } = req.body;

  if (!content?.trim()) {
    return res.status(400).json({ error: 'Comment content is required' });
  }

  const task = await tasks.getTaskById(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!canAccessTask(req.user, task)) return res.status(403).json({ error: 'Access denied' });

  const comment = await comments.createComment(taskId, req.user.id, content.trim());
  res.status(201).json(comment);
}));

export default router;
