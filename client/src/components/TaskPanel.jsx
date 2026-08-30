import { useState, useEffect } from 'react';
import { api, STATUSES, PRIORITIES, CREATE_STATUSES, DAY_NAMES } from '../api';
import { useAuth } from '../context/AuthContext';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function FileList({ files, onDelete, pending, onRemovePending }) {
  if (!files?.length && !pending?.length) return null;
  return (
    <div className="file-list">
      {pending?.map((f, i) => (
        <div key={`pending-${i}`} className="file-item pending">
          <span>{f.name}</span>
          <span className="file-meta">{(f.size / 1024).toFixed(1)} KB (pending)</span>
          {onRemovePending && (
            <button type="button" className="btn btn-danger btn-sm" onClick={() => onRemovePending(i)}>×</button>
          )}
        </div>
      ))}
      {files?.map((f) => (
        <div key={f.id} className="file-item">
          <a
            href={f.share_token ? api.fileShareUrl(f.share_token) : api.downloadFile(f.id)}
            target="_blank"
            rel="noreferrer"
          >
            {f.original_name}
          </a>
          <span className="file-meta">{(f.size / 1024).toFixed(1)} KB</span>
          {onDelete && (
            <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(f.id)}>×</button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function TaskPanel({ task, defaultStatus, onClose, onUpdate, onCreate, onDelete }) {
  const { user, isAdmin, canVerify, canAssign } = useAuth();
  const isNew = !task;
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    assigned_user_id: task?.assigned_user_id || user?.id || '',
    priority: task?.priority || 'Medium',
    due_date: task?.due_date || todayStr(),
    status: task?.status || defaultStatus || 'Backlog',
    file_location: task?.file_location || '',
  });
  const [users, setUsers] = useState([]);
  const [comments, setComments] = useState([]);
  const [files, setFiles] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [pendingCommentFiles, setPendingCommentFiles] = useState([]);
  const [reminder, setReminder] = useState({ active: false, reminder_type: 'daily', days: [] });
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('Uploading file...');
  const [error, setError] = useState('');

  const blocked = saving || uploading;

  const allowedStatuses = isAdmin || canVerify
    ? STATUSES
    : CREATE_STATUSES.includes(form.status) ? CREATE_STATUSES : ['Backlog', 'To Do', 'In Progress', 'Submit for Approval'];

  const createStatuses = CREATE_STATUSES;

  useEffect(() => {
    if (isAdmin || canAssign) {
      api.getUserList().then(setUsers).catch(console.error);
    } else {
      setUsers([{ id: user.id, name: user.name }]);
    }

    if (task) {
      Promise.all([
        api.getComments(task.id),
        api.getTaskFiles(task.id),
        api.getTaskReminder(task.id),
      ]).then(([commentsData, filesData, reminderData]) => {
        setComments(commentsData);
        setFiles(filesData);
        if (reminderData) {
          setReminder({ ...reminderData, days: JSON.parse(reminderData.days || '[]'), active: !!reminderData.active });
        }
      }).catch(console.error);
    }
  }, [task, user, isAdmin, canAssign]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const uploadPendingFiles = async (taskId, fileList) => {
    const uploaded = [];
    for (let i = 0; i < fileList.length; i++) {
      setUploadMessage(`Uploading file ${i + 1} of ${fileList.length}...`);
      const file = await api.uploadTaskFile(taskId, fileList[i]);
      uploaded.push(file);
    }
    return uploaded;
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = {
        ...form,
        assigned_user_id: form.assigned_user_id ? Number(form.assigned_user_id) : user.id,
      };

      if (isNew) {
        const created = await api.createTask(data);
        if (pendingFiles.length) {
          setUploading(true);
          setUploadMessage('Uploading attachments...');
          const uploaded = await uploadPendingFiles(created.id, pendingFiles);
          setPendingFiles([]);
          setFiles(uploaded);
        }
        if (reminder.active) {
          await api.setTaskReminder(created.id, reminder);
        }
        const withFiles = await api.getTask(created.id);
        onCreate?.(withFiles);
      } else {
        const updated = await api.updateTask(task.id, data);
        if (pendingFiles.length) {
          setUploading(true);
          setUploadMessage('Uploading attachments...');
          const uploaded = await uploadPendingFiles(task.id, pendingFiles);
          setPendingFiles([]);
          setFiles((prev) => [...uploaded, ...prev]);
        }
        await api.setTaskReminder(task.id, reminder);
        onUpdate?.(updated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.deleteTask(task.id);
      onDelete?.(task.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() && !pendingCommentFiles.length) return;
    setUploading(true);
    setUploadMessage('Posting comment...');
    setError('');
    try {
      const comment = await api.addComment(task.id, newComment.trim() || '(attachment)');
      const uploadedFiles = [];
      for (let i = 0; i < pendingCommentFiles.length; i++) {
        setUploadMessage(`Uploading attachment ${i + 1} of ${pendingCommentFiles.length}...`);
        const uploaded = await api.uploadCommentFile(comment.id, pendingCommentFiles[i]);
        uploadedFiles.push(uploaded);
      }
      setComments((prev) => [...prev, { ...comment, files: uploadedFiles }]);
      setNewComment('');
      setPendingCommentFiles([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleTaskFileSelect = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    e.target.value = '';

    if (isNew) {
      setPendingFiles((prev) => [...prev, ...selected]);
      return;
    }

    setUploading(true);
    setError('');
    try {
      for (let i = 0; i < selected.length; i++) {
        setUploadMessage(`Uploading file ${i + 1} of ${selected.length}...`);
        const uploaded = await api.uploadTaskFile(task.id, selected[i]);
        setFiles((prev) => [uploaded, ...prev]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCommentFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setPendingCommentFiles((prev) => [...prev, ...selected]);
    e.target.value = '';
  };

  const handleDeleteFile = async (fileId) => {
    if (blocked) return;
    try {
      await api.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleReminderDay = (day) => {
    setReminder((prev) => {
      const days = prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day];
      return { ...prev, days, active: true, reminder_type: 'specific' };
    });
  };

  return (
    <>
      <div className="panel-overlay" onClick={blocked ? undefined : onClose} />
      <div className="task-panel">
        <div className="task-panel-header">
          <h2>{isNew ? 'New Task' : 'Task Details'}</h2>
          <button className="panel-close" onClick={onClose} disabled={blocked}>&times;</button>
        </div>

        <div className="task-panel-body">
          {uploading && (
            <div className="upload-overlay">
              <div className="upload-overlay-content">
                <div className="upload-spinner" />
                <p>{uploadMessage}</p>
              </div>
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          <fieldset className="task-panel-fields" disabled={blocked}>
          <div className="form-group">
            <label>Title</label>
            <input className="form-control" value={form.title} onChange={(e) => handleChange('title', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea className="form-control" value={form.description} onChange={(e) => handleChange('description', e.target.value)} rows={4} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Assigned To</label>
              <select
                className="form-control"
                value={form.assigned_user_id}
                onChange={(e) => handleChange('assigned_user_id', e.target.value)}
                disabled={!isAdmin && !canAssign}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select className="form-control" value={form.priority} onChange={(e) => handleChange('priority', e.target.value)}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select
                className="form-control"
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                disabled={isNew}
              >
                {(isNew ? createStatuses : allowedStatuses).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input className="form-control" type="date" value={form.due_date} onChange={(e) => handleChange('due_date', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>File Location</label>
            <input
              className="form-control"
              type="text"
              placeholder="URL or local path (e.g. C:\Projects\file.docx)"
              value={form.file_location}
              onChange={(e) => handleChange('file_location', e.target.value)}
            />
            <p className="form-hint">Optional link or path to a related file</p>
          </div>

          <div className="files-section">
            <h3>Attachments</h3>
            <FileList
              files={files}
              pending={isNew ? pendingFiles : []}
              onDelete={!isNew && !blocked ? handleDeleteFile : undefined}
              onRemovePending={isNew && !blocked ? (i) => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i)) : undefined}
            />
            {!blocked && (
              <label className="btn btn-secondary btn-sm file-upload-btn">
                + Upload file
                <input type="file" hidden multiple onChange={handleTaskFileSelect} />
              </label>
            )}
          </div>

          <div className="form-group reminder-section">
            <label>
              <input
                type="checkbox"
                checked={reminder.active}
                onChange={(e) => setReminder((prev) => ({ ...prev, active: e.target.checked }))}
              />
              {' '}Reminder — auto-add to To Do
            </label>
            {reminder.active && (
              <div className="reminder-options">
                <label>
                  <input type="radio" checked={reminder.reminder_type === 'daily'} onChange={() => setReminder((prev) => ({ ...prev, reminder_type: 'daily' }))} />
                  {' '}Every day
                </label>
                <label>
                  <input type="radio" checked={reminder.reminder_type === 'specific'} onChange={() => setReminder((prev) => ({ ...prev, reminder_type: 'specific' }))} />
                  {' '}Specific days
                </label>
                {reminder.reminder_type === 'specific' && (
                  <div className="day-picker">
                    {DAY_NAMES.map((name, i) => (
                      <button key={name} type="button" className={`day-btn${reminder.days.includes(i) ? ' active' : ''}`} onClick={() => toggleReminderDay(i)}>
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {!isNew && (
            <>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                Created by {task.created_by_name} on {new Date(task.created_at).toLocaleDateString()}
              </div>

              <div className="comments-section">
                <h3>Comments ({comments.length})</h3>
                {comments.map((c) => (
                  <div key={c.id} className="comment">
                    <div className="comment-header">
                      <span className="comment-author">{c.user_name}</span>
                      <span className="comment-date">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <div className="comment-text">{c.content}</div>
                    <FileList files={c.files} />
                  </div>
                ))}
                <form className="comment-form" onSubmit={handleAddComment}>
                  <div className="comment-compose">
                    <input className="form-control" placeholder="Add a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} />
                    {!blocked && (
                      <div className="comment-actions">
                        {pendingCommentFiles.length > 0 && (
                          <span className="file-meta">{pendingCommentFiles.length} file(s) selected</span>
                        )}
                        <label className="btn btn-secondary btn-sm file-upload-btn">
                          Attach file
                          <input type="file" hidden multiple onChange={handleCommentFileSelect} />
                        </label>
                        <button className="btn btn-secondary btn-sm" type="submit" disabled={!newComment.trim() && !pendingCommentFiles.length}>
                          Post
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </>
          )}
          </fieldset>
        </div>

        <div className="task-panel-footer">
          {!isNew && (
            <button className="btn btn-danger" onClick={handleDelete} style={{ marginRight: 'auto' }} disabled={blocked}>Delete</button>
          )}
          <button className="btn btn-secondary" onClick={onClose} disabled={blocked}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={blocked}>
            {saving ? 'Saving...' : isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
}
