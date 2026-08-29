import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/my-tasks', label: 'My Tasks' },
  { to: '/kanban', label: 'Kanban Board' },
  { to: '/all-tasks', label: 'All Tasks', adminOnly: true },
  { to: '/users', label: 'Users', adminOnly: true },
  { to: '/profile', label: 'Profile' },
];

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">Task Manager</div>
      <nav className="sidebar-nav">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-link" style={{ cursor: 'default', fontSize: 13 }}>
          {user?.name}
          {user?.can_verify && !isAdmin && <span className="badge" style={{ marginLeft: 6, fontSize: 10 }}>Manager</span>}
        </div>
        <button className="sidebar-link" onClick={handleLogout} style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}>
          Logout
        </button>
      </div>
    </aside>
  );
}
