import { useState, useEffect, useRef } from 'react';
import { api, STATUSES } from '../api';
import TaskPanel from './TaskPanel';
import { exportTasksToCsv, downloadTaskTemplate, parseTaskCsv } from '../utils/excel';
import { IconDownload, IconUpload, IconLink } from './Icons';

function PriorityBadge({ priority }) {
  const slug = priority.toLowerCase().replace(/\s+/g, '-');
  return <span className={`badge badge-priority-${slug}`}>{priority}</span>;
}

function FileLinkCell({ location }) {
  if (!location) return '—';
  const isUrl = /^https?:\/\//i.test(location);
  if (isUrl) {
    return (
      <a href={location} target="_blank" rel="noreferrer" className="table-link" onClick={(e) => e.stopPropagation()}>
        <IconLink /> Open
      </a>
    );
  }
  return <span className="file-location-text">{location}</span>;
}

export default function AllTasks() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileInputRef = useRef(null);

  const loadTasks = () => {
    setLoading(true);
    const params = { unread: '0' };
    if (filter) params.status = filter;
    api.getTasks(params).then(setTasks).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadTasks(); }, [filter]);

  const handleTaskUpdate = (updated) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTask(updated);
  };

  const handleTaskDelete = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedTask(null);
  };

  const handleTaskCreate = (created) => {
    setTasks((prev) => [...prev, created]);
    setShowCreate(false);
    setSelectedTask(created);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    setImportMsg('');
    try {
      const text = await file.text();
      const rows = parseTaskCsv(text);
      const result = await api.importTasks(rows);
      setImportMsg(`Imported ${result.created} task(s).${result.errors?.length ? ` ${result.errors.length} error(s).` : ''}`);
      if (result.errors?.length) console.warn(result.errors);
      loadTasks();
    } catch (err) {
      setImportMsg(err.message);
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <div className="loading-screen">Loading...</div>;

  return (
    <>
      <div className="page-header">
        <h1>All Tasks</h1>
        <p>View and manage all department tasks</p>
      </div>

      <div className="toolbar">
        <div className="toolbar-actions">
          <select className="form-control" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => exportTasksToCsv(tasks)}>
            <IconDownload /> Export Excel
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={downloadTaskTemplate}>
            <IconDownload /> Sample Template
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <IconUpload /> {importing ? 'Importing...' : 'Import Excel'}
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={handleImport} />
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Task</button>
      </div>

      {importMsg && <div className="alert alert-info">{importMsg}</div>}

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {tasks.length === 0 ? (
            <div className="empty-state">No tasks found</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Assigned From</th>
                    <th>Assigned To</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>File Link</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} onClick={() => setSelectedTask(task)} style={{ cursor: 'pointer' }}>
                      <td>{task.title}</td>
                      <td>{task.created_by_name || '—'}</td>
                      <td>{task.assigned_user_name || '—'}</td>
                      <td><PriorityBadge priority={task.priority} /></td>
                      <td><span className="badge badge-status">{task.status}</span></td>
                      <td>{task.due_date || '—'}</td>
                      <td onClick={(e) => e.stopPropagation()}><FileLinkCell location={task.file_location} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedTask && (
        <TaskPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
          onDelete={handleTaskDelete}
        />
      )}

      {showCreate && (
        <TaskPanel
          onClose={() => setShowCreate(false)}
          onCreate={handleTaskCreate}
        />
      )}
    </>
  );
}
