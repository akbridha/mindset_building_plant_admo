-- Schema update for Reference Code Authorization System
-- This script adds the reference_code column to ms_user if it doesn't exist

-- Step 1: Add reference_code column to ms_user (if it doesn't exist)
-- Note: If column already exists, you'll get a warning which is safe to ignore
ALTER TABLE ms_user 
ADD COLUMN IF NOT EXISTS reference_code VARCHAR(15) DEFAULT NULL;

-- Step 2: Add UNIQUE constraint to ms_ref.reference_code (if it doesn't exist)
-- This ensures each reference code is unique
ALTER TABLE ms_ref 
ADD CONSTRAINT uk_ms_ref_reference_code UNIQUE (reference_code);

-- Step 3: Add foreign key relationship (optional, for referential integrity)
-- Uncomment this if you want to enforce that reference_code in ms_user must exist in ms_ref
-- ALTER TABLE ms_user 
-- ADD CONSTRAINT fk_ms_user_reference_code 
-- FOREIGN KEY (reference_code) REFERENCES ms_ref(reference_code) ON DELETE SET NULL;

-- Verification - Show the updated schema
-- SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'ms_user' AND COLUMN_NAME = 'reference_code';

-- SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'ms_ref' AND COLUMN_NAME = 'reference_code';
