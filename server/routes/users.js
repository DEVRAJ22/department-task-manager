import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authRequired, adminRequired } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as users from '../services/usersService.js';

const router = Router();

router.get('/', authRequired, adminRequired, asyncHandler(async (_req, res) => {
  res.json(await users.getAllUsers());
}));

router.get('/list', authRequired, asyncHandler(async (_req, res) => {
  res.json(await users.getActiveUserList());
}));

router.post('/', authRequired, adminRequired, asyncHandler(async (req, res) => {
  const { username, password, name, employee_id, department, role, can_assign, can_verify } = req.body;

  if (!username?.trim() || !password || !name?.trim()) {
    return res.status(400).json({ error: 'Username, password, and name are required' });
  }

  if (await users.usernameExists(username.trim())) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const user = await users.createUser({
    username: username.trim(),
    password_hash: hash,
    name: name.trim(),
    employee_id,
    department,
    role,
    can_assign,
    can_verify,
  });

  res.status(201).json(user);
}));

router.put('/profile/password', authRequired, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters' });
  }

  const user = await users.getUserById(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  await users.updateUser(req.user.id, { password_hash: hash });
  res.json({ ok: true });
}));

router.put('/profile/avatar', authRequired, asyncHandler(async (req, res) => {
  const { avatar_id } = req.body;
  const aid = Number(avatar_id);
  if (!aid || aid < 1 || aid > 10) {
    return res.status(400).json({ error: 'Avatar must be between 1 and 10' });
  }
  const updated = await users.updateUser(req.user.id, { avatar_id: aid });
  res.json(updated);
}));

router.put('/:id', authRequired, adminRequired, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { username, name, employee_id, department, role, disabled, can_assign, can_verify } = req.body;

  const user = await users.getUserById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (username && username.trim() !== user.username) {
    if (await users.usernameExists(username.trim(), id)) {
      return res.status(409).json({ error: 'Username already exists' });
    }
  }

  const updated = await users.updateUser(id, {
    username: username?.trim(),
    name: name?.trim(),
    employee_id,
    department,
    role,
    disabled,
    can_assign,
    can_verify,
  });

  res.json(updated);
}));

router.get('/:id/password', authRequired, adminRequired, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const user = await users.getUserById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    username: user.username,
    note: 'Passwords are stored securely and cannot be viewed. Use reset to set a new password.',
  });
}));

router.post('/:id/reset-password', authRequired, adminRequired, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { password } = req.body;

  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  const user = await users.getUserById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const hash = bcrypt.hashSync(password, 10);
  await users.updateUser(id, { password_hash: hash });
  res.json({ ok: true, password });
}));

router.delete('/:id', authRequired, adminRequired, asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const permanent = req.query.permanent === 'true';

  if (id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  const user = await users.getUserById(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (permanent) {
    await users.hardDeleteUser(id);
    res.json({ ok: true, permanent: true });
  } else {
    await users.disableUser(id);
    res.json({ ok: true, permanent: false });
  }
}));

export default router;
