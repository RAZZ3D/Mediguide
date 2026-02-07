-- Supabase SQL Setup - Step 1: Create Tables
-- Run this script first in Supabase SQL Editor

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  input_type TEXT NOT NULL,
  raw_text TEXT,
  parsed_json JSONB,
  adherence_score INTEGER,
  language TEXT DEFAULT 'en'
);

-- Create uploads table
CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  storage_path TEXT NOT NULL,
  ocr_text TEXT,
  ocr_confidence NUMERIC
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_plans_created_at ON plans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plans_adherence_score ON plans(adherence_score);
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at DESC);

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('plans', 'uploads');
