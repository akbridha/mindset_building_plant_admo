-- Tabel untuk menyimpan state multi-step conversation
-- Ini lebih reliable daripada $_SESSION untuk webhook Telegram
CREATE TABLE IF NOT EXISTS user_states (
    telegram_id BIGINT PRIMARY KEY,
    current_state VARCHAR(100) DEFAULT NULL,
    context_data JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Penjelasan kolom:
-- telegram_id: ID unik user dari Telegram (primary key)
-- current_state: State saat ini (e.g., 'waiting_description', null untuk idle)
-- context_data: Data JSON untuk menyimpan context (e.g., temporary task data)
-- created_at: Timestamp saat state dibuat
-- updated_at: Timestamp saat state terakhir di-update

-- Contoh data:
-- INSERT INTO user_states (telegram_id, current_state, context_data) 
-- VALUES (6103145555, 'waiting_description', JSON_OBJECT('task_name', '', 'created_date', '2026-05-12'));
