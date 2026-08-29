import jwt from 'jsonwebtoken';
import { formatUser } from '../utils/permissions.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as users from '../services/usersService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'task-manager-dev-secret-change-in-production';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

export const authRequired = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await users.getUserById(payload.id);

    if (!user || user.disabled) {
      res.clearCookie('token', cookieOptions());
      return res.status(401).json({ error: 'Invalid or disabled account' });
    }

    req.user = formatUser(user);
    next();
  } catch {
    res.clearCookie('token', cookieOptions());
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };
}

export function adminRequired(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
