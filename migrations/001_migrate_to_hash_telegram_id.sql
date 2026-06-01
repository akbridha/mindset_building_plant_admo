-- Migration: Option 2 - Hashing + Unique Identifier
-- This migration converts telegram_id from plaintext to SHA-256 hash
-- Existing data will be cleared (dummy data only)
-- Date: 2026-06-01

-- ============================================================
-- Step 1: Update ms_user table structure
-- ============================================================

-- Create backup table (optional, for safety)
CREATE TABLE IF NOT EXISTS ms_user_backup AS SELECT * FROM ms_user;

-- Drop existing foreign key constraints from reminders table
ALTER TABLE reminders 
DROP FOREIGN KEY IF EXISTS reminders_ibfk_1;

-- Drop existing foreign key constraints from progress_history table
ALTER TABLE progress_history 
DROP FOREIGN KEY IF EXISTS progress_history_ibfk_1;

-- Clear existing data (dummy data)
DELETE FROM ms_user;
DELETE FROM reminders;
DELETE FROM progress_history;

-- Modify ms_user table structure
ALTER TABLE ms_user 
DROP PRIMARY KEY,
ADD COLUMN user_id INT AUTO_INCREMENT UNIQUE FIRST,
MODIFY COLUMN telegram_id BIGINT(20) NULL UNIQUE,
ADD COLUMN telegram_id_hash VARCHAR(255) NOT NULL UNIQUE AFTER telegram_id,
ADD PRIMARY KEY (user_id);

-- ============================================================
-- Step 2: Update reminders table structure
-- ============================================================

ALTER TABLE reminders 
ADD COLUMN user_id INT AFTER telegram_id,
DROP KEY IF EXISTS idx_telegram_id,
ADD KEY idx_user_id (user_id),
ADD CONSTRAINT reminders_user_fk FOREIGN KEY (user_id) REFERENCES ms_user(user_id) ON DELETE CASCADE;

-- ============================================================
-- Step 3: Update progress_history table structure
-- ============================================================

ALTER TABLE progress_history 
ADD COLUMN user_id INT AFTER telegram_id,
ADD CONSTRAINT progress_history_user_fk FOREIGN KEY (user_id) REFERENCES ms_user(user_id) ON DELETE CASCADE;

-- ============================================================
-- Step 4: Migration status table (optional, for tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS migration_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO migration_status (version, description) 
VALUES ('001_migrate_to_hash_telegram_id', 'Convert telegram_id to hash-based lookup with internal user_id');

-- ============================================================
-- Verification Queries (run these to verify migration)
-- ============================================================

-- Check ms_user structure
-- DESCRIBE ms_user;

-- Check reminders structure
-- DESCRIBE reminders;

-- Check progress_history structure
-- DESCRIBE progress_history;

-- Verify foreign keys
-- SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME 
-- FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
-- WHERE TABLE_SCHEMA = 'telegram_db' AND REFERENCED_TABLE_NAME IS NOT NULL;
