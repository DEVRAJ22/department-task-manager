import jwt from 'jsonwebtoken';
import { formatUser } from '../utils/permissions.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'task-manager-dev-secret-change-in-production';

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      employee_id: user.employee_id,
      department: user.department,
      disabled: !!user.disabled,
      can_assign: !!user.can_assign,
      can_verify: !!user.can_verify,
      avatar_id: user.avatar_id ?? 1,
    },
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
    if (payload.disabled) {
      res.clearCookie('token', cookieOptions());
      return res.status(401).json({ error: 'Invalid or disabled account' });
    }

    req.user = formatUser(payload);
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
