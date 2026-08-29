import { useState, useEffect } from 'react';
import { api } from '../api';
import TaskPanel from './TaskPanel';

function PriorityBadge({ priority }) {
  const slug = priority.toLowerCase().replace(/\s+/g, '-');
  return <span className={`badge badge-priority-${slug}`}>{priority}</span>;
}

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadTasks = () => {
    setLoading(true);
    api.getTasks().then(setTasks).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadTasks(); }, []);

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

  if (loading) return <div className="loading-screen">Loading...</div>;

  return (
    <>
      <div className="page-header">
        <h1>My Tasks</h1>
        <p>Tasks assigned to you</p>
      </div>

      <div className="toolbar">
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Task</button>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {tasks.length === 0 ? (
            <div className="empty-state">No tasks assigned to you</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} onClick={() => setSelectedTask(task)} style={{ cursor: 'pointer' }}>
                      <td>{task.title}</td>
                      <td><PriorityBadge priority={task.priority} /></td>
                      <td><span className="badge badge-status">{task.status}</span></td>
                      <td>{task.due_date || '—'}</td>
                      <td>{new Date(task.created_at).toLocaleDateString()}</td>
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
