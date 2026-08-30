import { useState, useEffect } from 'react';
import { api } from '../api';

function UserModal({ user, onClose, onSave }) {
  const isNew = !user;
  const [form, setForm] = useState({
    username: user?.username || '',
    password: '',
    name: user?.name || '',
    employee_id: user?.employee_id || '',
    department: user?.department || '',
    role: user?.role || 'user',
    disabled: user?.disabled || false,
    can_assign: user?.can_assign || false,
    can_verify: user?.can_verify || false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [passwordInfo, setPasswordInfo] = useState('');

  useEffect(() => {
    if (user && !isNew) {
      api.getUserPasswordInfo(user.id).then((d) => setPasswordInfo(d.note)).catch(() => {});
    }
  }, [user, isNew]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isNew) {
        if (!form.password) {
          setError('Password is required for new users');
          setSaving(false);
          return;
        }
        await onSave('create', form);
      } else {
        const { password, ...data } = form;
        await onSave('update', { ...data, id: user.id });
        if (password) {
          const result = await api.resetPassword(user.id, password);
          alert(`Password updated to: ${result.password}`);
        }
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isNew ? 'Create User' : 'Edit User'}</h2>
          <button className="panel-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-row">
              <div className="form-group">
                <label>Username</label>
                <input className="form-control" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>{isNew ? 'Password' : 'Set New Password'}</label>
                <input className="form-control" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={isNew} placeholder={isNew ? '' : 'Enter new password to change'} />
                {!isNew && passwordInfo && <div className="form-hint">{passwordInfo}</div>}
              </div>
            </div>

            <div className="form-group">
              <label>Full Name</label>
              <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Employee ID</label>
                <input className="form-control" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input className="form-control" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Role</label>
                <select className="form-control" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {!isNew && (
                <div className="form-group">
                  <label>Status</label>
                  <select className="form-control" value={form.disabled ? 'disabled' : 'active'} onChange={(e) => setForm({ ...form, disabled: e.target.value === 'disabled' })}>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              )}
            </div>

            {form.role !== 'admin' && (
              <div className="permissions-section">
                <h3>Manager Permissions</h3>
                <label className="checkbox-label">
                  <input type="checkbox" checked={form.can_assign} onChange={(e) => setForm({ ...form, can_assign: e.target.checked })} />
                  Can assign tasks to anyone
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={form.can_verify} onChange={(e) => setForm({ ...form, can_verify: e.target.checked })} />
                  Can verify &amp; complete tasks (move to any status including Completed)
                </label>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUsers = () => {
    setLoading(true);
    api.getUsers().then(setUsers).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleSave = async (action, data) => {
    if (action === 'create') {
      await api.createUser(data);
    } else {
      await api.updateUser(data.id, data);
    }
    loadUsers();
  };

  const handleDisable = async (user) => {
    if (!confirm(`Disable user "${user.name}"?`)) return;
    try {
      await api.deleteUser(user.id);
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handlePermanentDelete = async (user) => {
    if (!confirm(`PERMANENTLY delete "${user.name}"? This cannot be undone. Their tasks will remain but lose this assignee.`)) return;
    try {
      await api.deleteUserPermanent(user.id);
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="loading-screen">Loading...</div>;

  return (
    <>
      <div className="page-header">
        <h1>Users</h1>
        <p>Manage accounts, passwords, and manager permissions</p>
      </div>

      <div className="toolbar">
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{users.length} user{users.length !== 1 ? 's' : ''}</span>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New User</button>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Permissions</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.username}</td>
                    <td>{user.department || '—'}</td>
                    <td><span className={`badge ${user.role === 'admin' ? 'badge-admin' : ''}`}>{user.role}</span></td>
                    <td>
                      {user.role === 'admin' ? (
                        <span className="badge badge-admin">Full access</span>
                      ) : (
                        <span style={{ fontSize: 12 }}>
                          {user.can_assign && <span className="badge" style={{ marginRight: 4 }}>Assign</span>}
                          {user.can_verify && <span className="badge">Verify</span>}
                          {!user.can_assign && !user.can_verify && '—'}
                        </span>
                      )}
                    </td>
                    <td>{user.disabled ? <span className="badge badge-disabled">Disabled</span> : <span className="badge">Active</span>}</td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingUser(user)} style={{ marginRight: 6 }}>Edit</button>
                      {!user.disabled && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDisable(user)} style={{ marginRight: 6 }}>Disable</button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => handlePermanentDelete(user)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {(showCreate || editingUser) && (
        <UserModal
          user={editingUser}
          onClose={() => { setShowCreate(false); setEditingUser(null); }}
          onSave={handleSave}
        />
      )}
    </>
  );
}
