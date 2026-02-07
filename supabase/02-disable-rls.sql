-- Supabase SQL Setup - Step 2: Disable Row Level Security
-- Run this script second in Supabase SQL Editor
-- WARNING: This disables all security for hackathon/demo purposes only

-- Disable RLS on plans table
ALTER TABLE plans DISABLE ROW LEVEL SECURITY;

-- Disable RLS on uploads table
ALTER TABLE uploads DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies (if any)
DROP POLICY IF EXISTS "Enable all access for plans" ON plans;
DROP POLICY IF EXISTS "Enable all access for uploads" ON uploads;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('plans', 'uploads');

-- Expected output: rowsecurity should be 'f' (false) for both tables
