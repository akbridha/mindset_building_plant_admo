CREATE TABLE IF NOT EXISTS `reminders` (
  `task_id` INT(11) NOT NULL AUTO_INCREMENT,
  `telegram_id` BIGINT(20) NOT NULL,
  `description` TEXT NOT NULL,
  `timestamp` TIMESTAMP NULL DEFAULT NULL,
  `interval` VARCHAR(50) NOT NULL,
  `target` VARCHAR(100) NOT NULL,
  `last_date` TIMESTAMP NULL DEFAULT NULL,
  `progress` INT(11) DEFAULT 0,
  `status` ENUM('pending', 'completed', 'cancelled', 'failed') DEFAULT 'pending',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`task_id`),
  KEY `idx_telegram_id` (`telegram_id`),
  KEY `idx_status` (`status`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_last_date` (`last_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;