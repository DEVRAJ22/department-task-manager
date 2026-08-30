import { avatarUrl, avatarInitials } from '../utils/avatars';

export default function UserAvatar({ user, size = 32, className = '' }) {
  const id = user?.avatar_id || user?.id || 1;
  const name = user?.name || '';
  const px = typeof size === 'number' ? `${size}px` : size;

  return (
    <img
      src={avatarUrl(id)}
      alt={name || 'User'}
      title={name}
      className={`user-avatar${className ? ` ${className}` : ''}`}
      style={{ width: px, height: px }}
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = '';
        e.target.style.display = 'none';
        e.target.parentElement?.classList.add('avatar-fallback');
      }}
    />
  );
}

export function UserAvatarFallback({ name, size = 32, className = '' }) {
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <span
      className={`user-avatar user-avatar-fallback${className ? ` ${className}` : ''}`}
      style={{ width: px, height: px, fontSize: `calc(${px} * 0.38)` }}
    >
      {avatarInitials(name)}
    </span>
  );
}
