import bcrypt from 'bcryptjs';
import * as users from './services/usersService.js';
import * as tasks from './services/tasksService.js';
import * as comments from './services/commentsService.js';

export async function seedDatabase() {
  const count = await users.getUserCount();
  if (count > 0) return;

  const hash = (pw) => bcrypt.hashSync(pw, 10);

  const admin = await users.createUser({
    username: 'admin',
    password_hash: hash('1234'),
    name: 'System Admin',
    employee_id: 'EMP001',
    department: 'IT',
    role: 'admin',
  });

  const john = await users.createUser({
    username: 'john',
    password_hash: hash('password'),
    name: 'John Smith',
    employee_id: 'EMP002',
    department: 'Engineering',
    role: 'user',
  });

  const jane = await users.createUser({
    username: 'jane',
    password_hash: hash('password'),
    name: 'Jane Doe',
    employee_id: 'EMP003',
    department: 'Marketing',
    role: 'user',
  });

  const bob = await users.createUser({
    username: 'bob',
    password_hash: hash('password'),
    name: 'Bob Wilson',
    employee_id: 'EMP004',
    department: 'Operations',
    role: 'user',
  });

  const taskData = [
    ['Set up project repository', 'Initialize repo and configure CI pipeline', john.id, 'High', '2026-09-05', 'Backlog', 0],
    ['Design dashboard mockups', 'Create wireframes for the main dashboard', jane.id, 'Medium', '2026-09-10', 'To Do', 0],
    ['Implement user authentication', 'Build login/logout with secure password storage', john.id, 'High', '2026-09-08', 'In Progress', 0],
    ['Write API documentation', 'Document all REST endpoints', bob.id, 'Low', '2026-09-15', 'Submit for Approval', 0],
    ['Deploy to staging', 'Configure staging environment and deploy', bob.id, 'Medium', '2026-09-01', 'Completed', 0],
    ['Review security audit', 'Address findings from the security review', john.id, 'High', '2026-09-12', 'To Do', 1],
    ['Update team handbook', 'Refresh onboarding documentation', jane.id, 'Low', '2026-09-20', 'Backlog', 1],
  ];

  for (const [title, description, assignee, priority, due_date, status, position] of taskData) {
    const t = await tasks.createTask({
      title,
      description,
      assigned_user_id: assignee,
      priority,
      due_date,
      status,
      position,
      created_by_id: admin.id,
    });
    await tasks.logStatusChange(t.id, status, admin.id, 'Task created');
  }

  const authTask = await tasks.getTasks({ assignedUserId: john.id });
  const inProgress = authTask.find((t) => t.title.includes('authentication'));
  if (inProgress) {
    await comments.createComment(inProgress.id, admin.id, 'Please prioritize JWT-based auth.');
    await comments.createComment(inProgress.id, john.id, 'Working on it — should be done by Friday.');
  }

  const completed = (await tasks.getTasks()).find((t) => t.title.includes('staging'));
  if (completed) {
    await comments.createComment(completed.id, bob.id, 'Staging deployment completed successfully.');
  }

  console.log('Supabase seeded with demo data.');
}
