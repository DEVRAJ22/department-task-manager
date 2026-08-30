const TEMPLATE_HEADERS = [
  'Title',
  'Assigned To Username',
  'Priority',
  'Status',
  'Due Date (YYYY-MM-DD)',
  'File Location',
  'Description',
];

const SAMPLE_ROW = [
  'Sample task title',
  'john',
  'High',
  'To Do',
  '2026-09-01',
  'https://example.com/files/doc.pdf',
  'Optional description',
];

function escapeCsv(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function downloadCsv(filename, rows) {
  const content = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadTaskTemplate() {
  downloadCsv('task-import-template.csv', [TEMPLATE_HEADERS, SAMPLE_ROW]);
}

export function exportTasksToCsv(tasks) {
  const rows = [
    TEMPLATE_HEADERS,
    ...tasks.map((t) => [
      t.title,
      t.assigned_user_name || '',
      t.priority,
      t.status,
      t.due_date || '',
      t.file_location || '',
      t.description || '',
    ]),
  ];
  downloadCsv(`tasks-export-${new Date().toISOString().slice(0, 10)}.csv`, rows);
}

export function parseTaskCsv(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
  if (lines.length < 2) throw new Error('File must include a header row and at least one task');

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (names) => {
    for (const name of names) {
      const i = headers.findIndex((h) => h.includes(name));
      if (i >= 0) return i;
    }
    return -1;
  };

  const col = {
    title: idx(['title']),
    assignee: idx(['assigned to username', 'assigned to', 'assignee']),
    priority: idx(['priority']),
    status: idx(['status']),
    dueDate: idx(['due date']),
    fileLocation: idx(['file location']),
    description: idx(['description']),
  };

  if (col.title < 0) throw new Error('CSV must include a Title column');

  return lines.slice(1).map((line, rowNum) => {
    const cells = parseCsvLine(line);
    const title = cells[col.title]?.trim();
    if (!title) return null;
    return {
      title,
      assigned_username: col.assignee >= 0 ? cells[col.assignee]?.trim() : '',
      priority: col.priority >= 0 ? cells[col.priority]?.trim() : 'Medium',
      status: col.status >= 0 ? cells[col.status]?.trim() : 'Backlog',
      due_date: col.dueDate >= 0 ? cells[col.dueDate]?.trim() : '',
      file_location: col.fileLocation >= 0 ? cells[col.fileLocation]?.trim() : '',
      description: col.description >= 0 ? cells[col.description]?.trim() : '',
      _row: rowNum + 2,
    };
  }).filter(Boolean);
}
