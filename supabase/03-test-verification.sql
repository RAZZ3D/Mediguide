-- Supabase SQL Setup - Step 3: Test Data & Verification
-- Run this script third in Supabase SQL Editor

-- Insert a test record into plans
INSERT INTO plans (input_type, raw_text, adherence_score, language)
VALUES (
  'text',
  'Test prescription: Tab Aspirin 75mg OD x 30 days',
  95,
  'en'
);

-- Insert a test record into uploads
INSERT INTO uploads (storage_path, ocr_text, ocr_confidence)
VALUES (
  'test/sample.jpg',
  'Sample OCR text',
  0.95
);

-- Verify inserts worked
SELECT 
  'plans' as table_name,
  COUNT(*) as record_count,
  MAX(created_at) as latest_record
FROM plans
UNION ALL
SELECT 
  'uploads' as table_name,
  COUNT(*) as record_count,
  MAX(created_at) as latest_record
FROM uploads;

-- Query the test data
SELECT id, input_type, adherence_score, created_at 
FROM plans 
ORDER BY created_at DESC 
LIMIT 5;

SELECT id, storage_path, ocr_confidence, created_at 
FROM uploads 
ORDER BY created_at DESC 
LIMIT 5;

-- Clean up test data (optional - uncomment to run)
-- DELETE FROM plans WHERE raw_text LIKE 'Test prescription:%';
-- DELETE FROM uploads WHERE storage_path LIKE 'test/%';
