const AVATAR_COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#0ea5e9', '#14b8a6',
  '#22c55e', '#f59e0b', '#ef4444', '#64748b', '#1e40af',
];

export const AVATARS = AVATAR_COLORS.map((color, i) => ({
  id: i + 1,
  color,
  label: `Avatar ${i + 1}`,
}));

export function avatarUrl(avatarId) {
  const id = Math.min(10, Math.max(1, Number(avatarId) || 1));
  const color = AVATAR_COLORS[id - 1].replace('#', '');
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=male${id}&backgroundColor=${color}&flip=true`;
}

export function avatarInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}
