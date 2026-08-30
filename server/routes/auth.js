import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { signToken, authRequired } from '../middleware/auth.js';
import { formatUser } from '../utils/permissions.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as users from '../services/usersService.js';

const router = Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = await users.getUserByUsername(username.trim());
  if (!user || user.disabled) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken(user);
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  });

  res.json({ user: formatUser(user) });
}));

router.post('/logout', (_req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.json({ ok: true });
});

router.get('/me', authRequired, asyncHandler(async (req, res) => {
  const fresh = await users.getUserById(req.user.id);
  res.json({ user: formatUser(fresh || req.user) });
}));

export default router;
