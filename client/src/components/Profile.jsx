import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setMessage('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Profile</h1>
        <p>Your account information</p>
      </div>

      <div className="card" style={{ maxWidth: 480, marginBottom: 24 }}>
        <div className="card-body">
          <div className="form-group">
            <label>Name</label>
            <div style={{ fontSize: 15 }}>{user.name}</div>
          </div>
          <div className="form-group">
            <label>Username</label>
            <div style={{ fontSize: 15 }}>{user.username}</div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Employee ID</label>
              <div style={{ fontSize: 15 }}>{user.employee_id || '—'}</div>
            </div>
            <div className="form-group">
              <label>Department</label>
              <div style={{ fontSize: 15 }}>{user.department || '—'}</div>
            </div>
          </div>
          <div className="form-group">
            <label>Role</label>
            <div><span className="badge badge-admin">{user.role}</span></div>
          </div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <div className="card-body">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Change Password</h2>

          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label>Current Password</label>
              <input
                className="form-control"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                className="form-control"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                className="form-control"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
