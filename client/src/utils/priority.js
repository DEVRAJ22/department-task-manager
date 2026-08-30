export const PRIORITY_ORDER = {
  High: 0,
  Medium: 1,
  Low: 2,
  'Daily Task': 3,
};

export function prioritySort(a, b) {
  const pa = PRIORITY_ORDER[a.priority] ?? 99;
  const pb = PRIORITY_ORDER[b.priority] ?? 99;
  if (pa !== pb) return pa - pb;
  return a.position - b.position || a.id - b.id;
}

export function priorityBorderClass(priority) {
  const slug = (priority || 'medium').toLowerCase().replace(/\s+/g, '-');
  return `priority-border-${slug}`;
}
