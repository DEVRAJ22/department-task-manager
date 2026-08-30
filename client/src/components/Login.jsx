import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { IconEye, IconEyeOff, IconMoon, IconSun } from './Icons';

const LOGO_URL = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdLe4j0xgG32pwcCiyprYXnrUwp0XS90i3xrVQbUFZsA&s=10';

export default function Login() {
  const { login } = useAuth();
  const { dark, toggle } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <button type="button" className="theme-toggle login-theme-toggle" onClick={toggle} title="Toggle dark mode">
        {dark ? <IconSun /> : <IconMoon />}
      </button>
      <div className="card login-card">
        <img src={LOGO_URL} alt="Task Manager" className="login-logo" />
        <h1>Task Manager</h1>
        <p className="subtitle">Sign in to your account</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              className="form-control"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                className="form-control"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-hint">
          Default admin: admin / 1234
        </div>
      </div>
    </div>
  );
}
