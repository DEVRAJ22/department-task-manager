const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function shouldRunToday(reminder) {
  if (!reminder.active) return false;
  const today = new Date().getDay();
  if (reminder.reminder_type === 'daily') return true;
  if (reminder.reminder_type === 'specific') {
    const days = Array.isArray(reminder.days) ? reminder.days : JSON.parse(reminder.days || '[]');
    return days.includes(today);
  }
  return false;
}

function alreadyRanToday(lastRun) {
  if (!lastRun) return false;
  return new Date(lastRun).toDateString() === new Date().toDateString();
}

export async function processReminders() {
  const {
    getActiveReminders,
    getMaxPosition,
    updateTask,
    logStatusChange,
    updateReminderLastRun,
  } = await import('../services/tasksService.js');

  const reminders = await getActiveReminders();

  for (const reminder of reminders) {
    if (!shouldRunToday(reminder) || alreadyRanToday(reminder.last_run)) continue;

    if (reminder.status !== 'To Do') {
      const maxPos = await getMaxPosition('To Do');
      await updateTask(reminder.task_id, { status: 'To Do', position: maxPos + 1 });
      await logStatusChange(reminder.task_id, 'To Do', null, 'Auto-moved by reminder');
    }

    await updateReminderLastRun(reminder.id);
  }
}

export { DAY_NAMES };
