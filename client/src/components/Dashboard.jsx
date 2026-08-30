import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import TaskPanel from './TaskPanel';
import UserAvatar from './UserAvatar';

const ANALYTICS_STATUSES = ['Backlog', 'To Do', 'In Progress', 'Submit for Approval'];

const STATUS_COLORS = {
  Backlog: '#64748b',
  'To Do': '#3b82f6',
  'In Progress': '#f59e0b',
  'Submit for Approval': '#8b5cf6',
};

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function isMyTask(task, userId) {
  return task.assignee_ids?.includes(userId) || task.assigned_user_id === userId;
}

function PriorityBadge({ priority }) {
  const slug = priority.toLowerCase().replace(/\s+/g, '-');
  return <span className={`badge badge-priority-${slug}`}>{priority}</span>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [activeStatus, setActiveStatus] = useState('Backlog');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTasks({ unread: '0' }).then(setTasks).catch(console.error).finally(() => setLoading(false));
  }, []);

  const myTasks = tasks.filter((t) => isMyTask(t, user.id));
  const activeTasks = myTasks.filter((t) => ANALYTICS_STATUSES.includes(t.status));
  const totalActive = activeTasks.length;

  const statusStats = ANALYTICS_STATUSES.map((status) => {
    const items = myTasks.filter((t) => t.status === status);
    const overdue = items.filter((t) => t.due_date && t.due_date < todayStr()).length;
    return { status, count: items.length, overdue, items };
  });

  const statusTasks = myTasks
    .filter((t) => t.status === activeStatus)
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
        <div className="dashboard-welcome">
          <UserAvatar user={user} size={48} />
          <div>
            <h1>Dashboard</h1>
            <p>Your task analytics — {user.name}</p>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        {statusStats.map(({ status, count, overdue }) => (
          <button
            key={status}
            type="button"
            className={`card analytics-card${activeStatus === status ? ' active' : ''}`}
            onClick={() => setActiveStatus(status)}
          >
            <div className="analytics-card-header">
              <span className="analytics-dot" style={{ background: STATUS_COLORS[status] }} />
              <span className="analytics-label">{status}</span>
            </div>
            <div className="analytics-value">{count}</div>
            {overdue > 0 && <div className="analytics-overdue">{overdue} overdue</div>}
            {totalActive > 0 && (
              <div className="analytics-bar-wrap">
                <div
                  className="analytics-bar"
                  style={{ width: `${(count / totalActive) * 100}%`, background: STATUS_COLORS[status] }}
                />
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="section-header">
            <h2>{activeStatus} Tasks</h2>
            <span className="text-muted">{statusTasks.length} task{statusTasks.length !== 1 ? 's' : ''}</span>
          </div>
          {statusTasks.length === 0 ? (
            <div className="empty-state">No tasks in {activeStatus}</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Co-Assignees</th>
                    <th>Priority</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {statusTasks.map((task) => (
                    <tr key={task.id} onClick={() => setSelectedTask(task)} className="clickable-row">
                      <td>{task.title}</td>
                      <td>
                        <div className="assignee-avatars">
                          {(task.assignees || []).slice(0, 4).map((a) => (
                            <UserAvatar key={a.id} user={a} size={24} />
                          ))}
                          {(task.assignees?.length || 0) > 4 && (
                            <span className="assignee-more">+{task.assignees.length - 4}</span>
                          )}
                        </div>
                      </td>
                      <td><PriorityBadge priority={task.priority} /></td>
                      <td className={task.due_date && task.due_date < todayStr() ? 'text-danger' : ''}>
                        {task.due_date || '—'}
                      </td>
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
