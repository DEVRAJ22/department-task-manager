import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import TaskPanel from './TaskPanel';

function PriorityBadge({ priority }) {
  const slug = priority.toLowerCase().replace(/\s+/g, '-');
  return <span className={`badge badge-priority-${slug}`}>{priority}</span>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTasks({ unread: '0' }).then(setTasks).catch(console.error).finally(() => setLoading(false));
  }, []);

  const myTasks = tasks.filter((t) => t.assigned_user_id === user.id);
  const backlogCount = myTasks.filter((t) => t.status === 'Backlog').length;
  const todoCount = myTasks.filter((t) => t.status === 'To Do').length;

  const pendingTasks = myTasks
    .filter((t) => t.status === 'Backlog' || t.status === 'To Do')
    .sort((a, b) => new Date(a.due_date || '9999') - new Date(b.due_date || '9999'));

  const handleTaskUpdate = (updated) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTask(updated);
  };

  const handleTaskDelete = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedTask(null);
  };

  if (loading) return <div className="loading-screen">Loading...</div>;

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user.name}</p>
      </div>

      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-value">{backlogCount}</div>
          <div className="stat-label">Backlog</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{todoCount}</div>
          <div className="stat-label">To Do</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{backlogCount + todoCount}</div>
          <div className="stat-label">Total Pending</div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Pending Tasks</h2>
          {pendingTasks.length === 0 ? (
            <div className="empty-state">No pending tasks</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTasks.map((task) => (
                    <tr key={task.id} onClick={() => setSelectedTask(task)} style={{ cursor: 'pointer' }}>
                      <td>{task.title}</td>
                      <td><PriorityBadge priority={task.priority} /></td>
                      <td><span className="badge badge-status">{task.status}</span></td>
                      <td>{task.due_date || '—'}</td>
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
    </>
  );
}
