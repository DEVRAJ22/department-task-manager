import { Router } from 'express';
import multer from 'multer';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { canAccessTask } from '../utils/permissions.js';
import * as tasks from '../services/tasksService.js';
import * as comments from '../services/commentsService.js';
import * as files from '../services/filesService.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.get('/share/:token', asyncHandler(async (req, res) => {
  const file = await files.getFileByShareToken(req.params.token);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const blob = await files.downloadFile(file.storage_path);
  const buffer = Buffer.from(await blob.arrayBuffer());
  const mime = file.mime_type || 'application/octet-stream';
  const inline = mime.startsWith('image/') || mime === 'application/pdf';

  res.setHeader('Content-Type', mime);
  res.setHeader(
    'Content-Disposition',
    `${inline ? 'inline' : 'attachment'}; filename="${file.original_name}"`
  );
  res.send(buffer);
}));

router.get('/task/:taskId', authRequired, asyncHandler(async (req, res) => {
  const taskId = Number(req.params.taskId);
  const task = await tasks.getTaskById(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!canAccessTask(req.user, task)) return res.status(403).json({ error: 'Access denied' });

  res.json(await files.getTaskFiles(taskId));
}));

router.post('/task/:taskId', authRequired, upload.single('file'), asyncHandler(async (req, res) => {
  const taskId = Number(req.params.taskId);
  const task = await tasks.getTaskById(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!canAccessTask(req.user, task)) return res.status(403).json({ error: 'Access denied' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const file = await files.uploadFile({
    taskId,
    file: req.file,
    uploadedBy: req.user.id,
  });

  res.status(201).json(file);
}));

router.post('/comment/:commentId', authRequired, upload.single('file'), asyncHandler(async (req, res) => {
  const commentId = Number(req.params.commentId);
  const comment = await comments.getCommentById(commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });

  const task = await tasks.getTaskById(comment.task_id);
  if (!canAccessTask(req.user, task)) return res.status(403).json({ error: 'Access denied' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const file = await files.uploadFile({
    taskId: comment.task_id,
    commentId,
    file: req.file,
    uploadedBy: req.user.id,
  });

  res.status(201).json(file);
}));

router.get('/:id/download', authRequired, asyncHandler(async (req, res) => {
  const file = await files.getFileById(Number(req.params.id));
  if (!file) return res.status(404).json({ error: 'File not found' });

  const task = await tasks.getTaskById(file.task_id);
  if (!canAccessTask(req.user, task)) return res.status(403).json({ error: 'Access denied' });

  const blob = await files.downloadFile(file.storage_path);
  const buffer = Buffer.from(await blob.arrayBuffer());

  res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
  res.send(buffer);
}));

router.delete('/:id', authRequired, asyncHandler(async (req, res) => {
  const file = await files.getFileById(Number(req.params.id));
  if (!file) return res.status(404).json({ error: 'File not found' });

  const task = await tasks.getTaskById(file.task_id);
  if (!canAccessTask(req.user, task)) return res.status(403).json({ error: 'Access denied' });

  await files.deleteFileRecord(file);
  res.json({ ok: true });
}));

export default router;
