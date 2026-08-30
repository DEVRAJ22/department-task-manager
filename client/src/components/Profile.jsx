import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { AVATARS, avatarUrl } from '../utils/avatars';
import UserAvatar from './UserAvatar';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar_id || 1);

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

  const handleSaveAvatar = async () => {
    setAvatarSaving(true);
    setError('');
    try {
      await api.updateAvatar(selectedAvatar);
      await refreshUser();
      setMessage('Avatar updated');
    } catch (err) {
      setError(err.message);
    } finally {
      setAvatarSaving(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Profile</h1>
        <p>Your account information</p>
      </div>

      <div className="card profile-card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <div className="profile-header">
            <UserAvatar user={{ ...user, avatar_id: selectedAvatar }} size={72} />
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>{user.name}</h2>
              <p className="text-muted">@{user.username}</p>
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 20 }}>
            <div className="form-group">
              <label>Employee ID</label>
              <div className="profile-value">{user.employee_id || '—'}</div>
            </div>
            <div className="form-group">
              <label>Department</label>
              <div className="profile-value">{user.department || '—'}</div>
            </div>
          </div>
          <div className="form-group">
            <label>Role</label>
            <div><span className="badge badge-admin">{user.role}</span></div>
          </div>
        </div>
      </div>

      <div className="card profile-card" style={{ marginBottom: 24 }}>
        <div className="card-body">
          <h2 className="section-title">Choose Avatar</h2>
          <div className="avatar-grid">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`avatar-option${selectedAvatar === a.id ? ' selected' : ''}`}
                onClick={() => setSelectedAvatar(a.id)}
                title={a.label}
              >
                <img src={avatarUrl(a.id)} alt={a.label} />
              </button>
            ))}
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={handleSaveAvatar}
            disabled={avatarSaving || selectedAvatar === user.avatar_id}
          >
            {avatarSaving ? 'Saving...' : 'Save Avatar'}
          </button>
        </div>
      </div>

      <div className="card profile-card">
        <div className="card-body">
          <h2 className="section-title">Change Password</h2>

          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label>Current Password</label>
              <input className="form-control" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input className="form-control" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input className="form-control" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
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
