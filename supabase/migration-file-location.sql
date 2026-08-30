-- Run in Supabase SQL Editor
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS file_location TEXT DEFAULT '';
