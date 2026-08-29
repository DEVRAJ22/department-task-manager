import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api, STATUSES, CREATE_STATUSES, USER_MOVABLE_STATUSES } from '../api';
import { useAuth } from '../context/AuthContext';
import TaskPanel from './TaskPanel';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString();
}

function PriorityBadge({ priority }) {
  const slug = priority.toLowerCase().replace(/\s+/g, '-');
  return <span className={`badge badge-priority-${slug}`}>{priority}</span>;
}

function KanbanCard({ task, index, onClick }) {
  const isOverdue = task.due_date && task.due_date < todayStr() && task.status !== 'Completed';

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`kanban-card${snapshot.isDragging ? ' dragging' : ''}`}
          onClick={() => onClick(task)}
        >
          <div className="kanban-card-top">
            <div className="kanban-card-title">{task.title}</div>
          </div>
          <div className="kanban-card-meta">
            <PriorityBadge priority={task.priority} />
          </div>
          <div className="kanban-card-details">
            <span className="kanban-card-assignee" title="Assigned to">
              👤 {task.assigned_user_name || 'Unassigned'}
            </span>
            <span className={`kanban-card-due${isOverdue ? ' overdue' : ''}`} title="Due date">
              📅 {formatDate(task.due_date)}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
}

function ColumnFilter({ assignees, value, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="column-filter">
      <button
        type="button"
        className={`filter-btn${value ? ' active' : ''}`}
        onClick={() => setOpen(!open)}
        title="Filter by assignee"
      >
        ⏷
      </button>
      {open && (
        <div className="filter-dropdown">
          <button type="button" className={!value ? 'active' : ''} onClick={() => { onChange(''); setOpen(false); }}>
            All assignees
          </button>
          {assignees.map((a) => (
            <button
              key={a.id}
              type="button"
              className={String(value) === String(a.id) ? 'active' : ''}
              onClick={() => { onChange(String(a.id)); setOpen(false); }}
            >
              {a.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function applyMove(tasks, taskId, fromStatus, toStatus, toIndex) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return tasks;

  const others = tasks.filter((t) => t.id !== taskId);
  const columns = {};

  for (const status of STATUSES) {
    columns[status] = others
      .filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position || a.id - b.id);
  }

  columns[toStatus].splice(toIndex, 0, { ...task, status: toStatus });

  const result = [];
  for (const status of STATUSES) {
    columns[status].forEach((t, i) => {
      result.push({ ...t, status, position: i });
    });
  }
  return result;
}

export default function KanbanBoard() {
  const { isAdmin, canVerify } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createStatus, setCreateStatus] = useState('Backlog');
  const [columnFilters, setColumnFilters] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canComplete = isAdmin || canVerify;
  const allowedDropStatuses = canComplete ? STATUSES : USER_MOVABLE_STATUSES;

  const loadTasks = useCallback(() => {
    return api.getTasks({ unread: '0' }).then(setTasks).catch(console.error);
  }, []);

  useEffect(() => {
    loadTasks().finally(() => setLoading(false));
  }, [loadTasks]);

  const getColumnTasks = (status) => {
    let columnTasks = tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position || a.id - b.id);

    const filterId = columnFilters[status];
    if (filterId) {
      columnTasks = columnTasks.filter((t) => String(t.assigned_user_id) === filterId);
    }
    return columnTasks;
  };

  const getColumnAssignees = (status) => {
    const map = new Map();
    tasks
      .filter((t) => t.status === status && t.assigned_user_id)
      .forEach((t) => map.set(t.assigned_user_id, { id: t.assigned_user_id, name: t.assigned_user_name }));
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  };

  const getUnfilteredColumnTasks = (status) =>
    tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position || a.id - b.id);

  const resolveDropPosition = (status, filteredIndex) => {
    const filterId = columnFilters[status];
    if (!filterId) return filteredIndex;

    const unfiltered = getUnfilteredColumnTasks(status);
    const filtered = unfiltered.filter((t) => String(t.assigned_user_id) === filterId);
    const target = filtered[filteredIndex];

    if (target) return unfiltered.findIndex((t) => t.id === target.id);
    return unfiltered.length;
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;

    if (!allowedDropStatuses.includes(newStatus)) {
      setError('Only admin or verified managers can move tasks to Completed');
      return;
    }

    const taskId = Number(draggableId);
    const newPosition = resolveDropPosition(newStatus, destination.index);
    const oldStatus = source.droppableId;

    const previousTasks = tasks;
    setError('');
    setTasks(applyMove(tasks, taskId, oldStatus, newStatus, newPosition));
    setSaving(true);

    try {
      await api.moveTask(taskId, newStatus, newPosition);
    } catch (err) {
      setError(err.message);
      setTasks(previousTasks);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenTask = (task) => {
    setSelectedTask(task);
  };

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
        <h1>Kanban Board</h1>
        <p>
          Your assigned tasks — drag between columns{saving ? ' (saving…)' : ''}
          {!canComplete && ' (Completed: admin/manager only)'}
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {STATUSES.map((status) => {
            const columnTasks = getColumnTasks(status);
            const allInColumn = tasks.filter((t) => t.status === status).length;
            const isDropDisabled = !allowedDropStatuses.includes(status);

            return (
              <div key={status} className={`kanban-column${isDropDisabled ? ' column-readonly' : ''}`}>
                <div className="kanban-column-header">
                  <span className="kanban-column-title">{status}</span>
                  <div className="kanban-column-actions">
                    <ColumnFilter
                      assignees={getColumnAssignees(status)}
                      value={columnFilters[status] || ''}
                      onChange={(v) => setColumnFilters((prev) => ({ ...prev, [status]: v }))}
                    />
                    <span className="kanban-column-count">{columnFilters[status] ? `${columnTasks.length}/${allInColumn}` : columnTasks.length}</span>
                  </div>
                </div>
                <Droppable droppableId={status} isDropDisabled={isDropDisabled}>
                  {(provided, snapshot) => (
                    <div
                      className={`kanban-column-body${snapshot.isDraggingOver && isDropDisabled ? ' drop-disabled' : ''}`}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {columnTasks.map((task, index) => (
                        <KanbanCard
                          key={task.id}
                          task={task}
                          index={index}
                          onClick={handleOpenTask}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                {CREATE_STATUSES.includes(status) && (
                  <button
                    className="kanban-add-btn"
                    onClick={() => { setCreateStatus(status); setShowCreate(true); }}
                  >
                    + Add task
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </DragDropContext>

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
          defaultStatus={createStatus}
          onClose={() => setShowCreate(false)}
          onCreate={handleTaskCreate}
        />
      )}
    </>
  );
}
