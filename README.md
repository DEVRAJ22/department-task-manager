# Task Manager

A minimal, professional department task manager with Kanban boards, user management, and role-based access. **Powered by Supabase (PostgreSQL + Storage).**

## Features

- Username/password auth with bcrypt + JWT
- Admin user management with manager permissions
- Kanban board with drag-and-drop
- File attachments (Supabase Storage)
- Task reminders, stage tracker, unread comments

## Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** and run the full script from [`supabase/schema.sql`](supabase/schema.sql)
3. Go to **Project Settings → API** and copy:
   - Project URL
   - `service_role` key (keep secret — server only)

4. Configure the server:
```bash
cp server/.env.example server/.env
```

Edit `server/.env`:
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
JWT_SECRET=your-random-secret
```

## Quick Start

```bash
npm run install:all
npm run dev
```

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3001

On first run, demo data is seeded automatically (admin, users, tasks).

## Default Login

| Username | Password |
|----------|----------|
| admin    | 1234     |
| john     | password |
| jane     | password |
| bob      | password |

## Production (Vercel)

1. Push to GitHub and import the repo in [Vercel](https://vercel.com)
2. Set environment variables in the Vercel project:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `NODE_ENV` = `production`
3. Deploy — Vercel serves the React app and `/api` routes from one domain

Or deploy from CLI:

```bash
npx vercel --prod
```

## Tech Stack

- **Database:** Supabase (PostgreSQL)
- **File storage:** Supabase Storage (`task-files` bucket)
- **Backend:** Node.js, Express, @supabase/supabase-js
- **Frontend:** React, Vite
