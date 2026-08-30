import { useState, useEffect, useRef, useMemo } from 'react';
import { api, STATUSES, PRIORITIES } from '../api';
import TaskPanel from './TaskPanel';
import { exportTasksToCsv, downloadTaskTemplate, parseTaskCsv } from '../utils/excel';
import { IconDownload, IconUpload, IconLink } from './Icons';

const EMPTY_FILTERS = {
  title: '',
  created_by: '',
  assigned_to: '',
  priority: '',
  status: '',
  due_date: '',
  file_location: '',
};

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

function matchFilter(value, filter) {
  if (!filter) return true;
  return String(value || '').toLowerCase().includes(filter.toLowerCase());
}

export default function AllTasks() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [colFilters, setColFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const fileInputRef = useRef(null);

  const loadTasks = () => {
    setLoading(true);
    api.getTasks({ unread: '0' }).then(setTasks).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadTasks(); }, []);

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const assigneeNames = (task.assignees || []).map((a) => a.name).join(' ') || task.assigned_user_name || '';
    return matchFilter(task.title, colFilters.title)
      && matchFilter(task.created_by_name, colFilters.created_by)
      && matchFilter(assigneeNames, colFilters.assigned_to)
      && matchFilter(task.priority, colFilters.priority)
      && matchFilter(task.status, colFilters.status)
      && matchFilter(task.due_date, colFilters.due_date)
      && matchFilter(task.file_location, colFilters.file_location);
  }), [tasks, colFilters]);

  const setFilter = (key, value) => setColFilters((prev) => ({ ...prev, [key]: value }));

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

  const hasFilters = Object.values(colFilters).some(Boolean);

  if (loading) return <div className="loading-screen">Loading...</div>;

  return (
    <>
      <div className="page-header">
        <h1>All Tasks</h1>
        <p>View and manage all department tasks</p>
      </div>

      <div className="toolbar">
        <div className="toolbar-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => exportTasksToCsv(filteredTasks)}>
            <IconDownload /> Export Excel
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={downloadTaskTemplate}>
            <IconDownload /> Sample Template
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <IconUpload /> {importing ? 'Importing...' : 'Import Excel'}
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={handleImport} />
          {hasFilters && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setColFilters(EMPTY_FILTERS)}>
              Clear filters
            </button>
          )}
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
              <table className="filterable-table">
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
                  <tr className="filter-row">
                    <th><input className="table-filter" placeholder="Filter..." value={colFilters.title} onChange={(e) => setFilter('title', e.target.value)} /></th>
                    <th><input className="table-filter" placeholder="Filter..." value={colFilters.created_by} onChange={(e) => setFilter('created_by', e.target.value)} /></th>
                    <th><input className="table-filter" placeholder="Filter..." value={colFilters.assigned_to} onChange={(e) => setFilter('assigned_to', e.target.value)} /></th>
                    <th>
                      <select className="table-filter" value={colFilters.priority} onChange={(e) => setFilter('priority', e.target.value)}>
                        <option value="">All</option>
                        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </th>
                    <th>
                      <select className="table-filter" value={colFilters.status} onChange={(e) => setFilter('status', e.target.value)}>
                        <option value="">All</option>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </th>
                    <th><input className="table-filter" type="date" value={colFilters.due_date} onChange={(e) => setFilter('due_date', e.target.value)} /></th>
                    <th><input className="table-filter" placeholder="Filter..." value={colFilters.file_location} onChange={(e) => setFilter('file_location', e.target.value)} /></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0 ? (
                    <tr><td colSpan={7} className="empty-state">No tasks match filters</td></tr>
                  ) : filteredTasks.map((task) => (
                    <tr key={task.id} onClick={() => setSelectedTask(task)} className="clickable-row">
                      <td>{task.title}</td>
                      <td>{task.created_by_name || '—'}</td>
                      <td>{(task.assignees || []).map((a) => a.name).join(', ') || task.assigned_user_name || '—'}</td>
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
