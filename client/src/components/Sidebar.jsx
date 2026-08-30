import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  IconDashboard, IconTasks, IconKanban, IconList, IconUsers, IconProfile, IconLogout,
} from './Icons';

const navItems = [
  { to: '/', label: 'Dashboard', end: true, Icon: IconDashboard },
  { to: '/my-tasks', label: 'My Tasks', Icon: IconTasks },
  { to: '/kanban', label: 'Kanban Board', Icon: IconKanban },
  { to: '/all-tasks', label: 'All Tasks', adminOnly: true, Icon: IconList },
  { to: '/users', label: 'Users', adminOnly: true, Icon: IconUsers },
  { to: '/profile', label: 'Profile', Icon: IconProfile },
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
          .map(({ to, label, end, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-link" style={{ cursor: 'default', fontSize: 13 }}>
          <IconProfile />
          {user?.name}
          {user?.can_verify && !isAdmin && <span className="badge" style={{ marginLeft: 6, fontSize: 10 }}>Manager</span>}
        </div>
        <button className="sidebar-link" onClick={handleLogout} style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}>
          <IconLogout />
          Logout
        </button>
      </div>
    </aside>
  );
}
