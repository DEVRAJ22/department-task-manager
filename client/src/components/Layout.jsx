import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useTheme } from '../context/ThemeContext';
import { IconMoon, IconSun } from './Icons';

export default function Layout() {
  const { dark, toggle } = useTheme();

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-spacer" />
          <button type="button" className="theme-toggle" onClick={toggle} title="Toggle dark mode">
            {dark ? <IconSun /> : <IconMoon />}
            <span>{dark ? 'Light' : 'Dark'}</span>
          </button>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
