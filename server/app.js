import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import './supabase.js';
import { seedDatabase } from './seed.js';
import { asyncHandler } from './utils/asyncHandler.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import commentRoutes from './routes/comments.js';
import fileRoutes from './routes/files.js';

const isProduction = process.env.NODE_ENV === 'production';
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

seedDatabase().catch((err) => console.error('Seed error:', err));

const app = express();
app.set('trust proxy', 1);

app.use(cors({
  origin: isProduction ? clientUrl : true,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/cron/cleanup-completed', asyncHandler(async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { purgeExpiredCompletedTasks } = await import('./utils/taskCleanup.js');
  const deleted = await purgeExpiredCompletedTasks();
  res.json({ deleted });
}));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/files', fileRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

export default app;
