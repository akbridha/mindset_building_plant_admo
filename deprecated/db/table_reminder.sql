-- --------------------------------------------------------
-- Host:                         localhost
-- Server version:               10.11.9-MariaDB - mariadb.org binary distribution
-- Server OS:                    Win64
-- HeidiSQL Version:             12.15.0.7171
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Dumping structure for table telegram_db.reminders
CREATE TABLE IF NOT EXISTS `reminders` (
  `task_id` int(11) NOT NULL AUTO_INCREMENT,
  `telegram_id` bigint(20) NOT NULL,
  `task_description` text NOT NULL,
  `checkpoint_time` time DEFAULT NULL,
  `interval` varchar(50) NOT NULL,
  `target` varchar(100) NOT NULL,
  `last_date` timestamp NULL DEFAULT NULL,
  `progress` int(11) DEFAULT 0,
  `status` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`task_id`),
  KEY `idx_telegram_id` (`telegram_id`),
  KEY `idx_status` (`status`),
  KEY `idx_last_date` (`last_date`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for table telegram_db.reminders: ~26 rows (approximately)
INSERT INTO `reminders` (`task_id`, `telegram_id`, `task_description`, `checkpoint_time`, `interval`, `target`, `last_date`, `progress`, `status`, `created_at`, `updated_at`) VALUES
	(2, 6103145555, 'Meeting dengan tim', NULL, '00:20:00', '3', NULL, 0, 'OPEN', '2026-05-11 08:58:01', '2026-05-24 02:52:29'),
	(3, 6103145555, 'Olahraga pagi', NULL, '01:00:00', '6', '2024-01-13 22:30:00', 50, 'OPEN', '2026-05-11 08:58:01', '2026-05-24 02:51:46'),
	(4, 6103145555, 'Bayar tagihan', NULL, '00:20:00', '33', NULL, 0, 'OPEN', '2026-05-11 08:58:01', '2026-05-24 02:52:30'),
	(5, 6103145555, 'Belajar PHP', '15:51:36', '01:00:00', '4', '2024-01-14 12:00:00', 75, 'OPEN', '2026-05-11 08:58:01', '2026-05-24 02:51:57'),
	(6, 6103145555, 'Persiapan Tes', '15:40:34', '00:20:00', '3', NULL, 30, 'OPEN', '2026-05-11 08:58:01', '2026-05-24 02:52:34'),
	(7, 1011093409, 'Tugas completed', '14:51:33', '01:00:00', '8', '2024-01-10 04:00:00', 100, 'completed', '2026-05-11 08:58:01', '2026-05-25 05:47:59'),
	(10, 6103145555, 'Menyantuni anak Yatim', '10:37:32', '01:30:00', '7', NULL, 0, 'OPEN', '2026-05-12 00:48:59', '2026-05-26 02:35:37'),
	(13, 1011093409, 'Mengecek Gula darah', '15:44:34', '00:30:00', '4', NULL, 0, 'pending', '2026-05-12 03:39:00', '2026-05-25 05:47:57'),
	(17, 6103145555, 'Latihan Otot Ringan', '16:19:11', '01:00:00', '34', NULL, 0, 'OPEN', '2026-05-12 08:40:06', '2026-05-23 07:09:34'),
	(18, 6103145555, 'Basuh sepeda motor', '08:19:32', '24:00:00', '8', NULL, 0, 'OPEN', '2026-05-12 23:23:40', '2026-05-24 00:18:43'),
	(20, 6103145555, 'Mencatat pengeluaran harian', '09:24:32', '00:20:00', '52345', NULL, 0, 'OPEN', '2026-05-13 00:42:24', '2026-05-24 02:52:38'),
	(21, 1011093409, 'Belajar memahat Jati', '09:24:32', '24:00:00', '20', NULL, 0, 'OPEN', '2026-05-13 00:47:27', '2026-05-25 05:47:53'),
	(23, 6103145555, 'Mencuci sepatu dan kendaraan', '09:24:32', '01:00:00', '5', NULL, 0, 'OPEN', '2026-05-14 09:13:11', '2026-05-26 01:14:31'),
	(30, 6103145555, 'Belajar membuat anyaman bambu', '09:24:32', '24:00:00', '10', NULL, 0, 'OPEN', '2026-05-16 06:08:16', '2026-05-24 01:22:36'),
	(31, 1011093409, 'Belajar Memasang Lure', '09:24:32', '24:00:00', '5', NULL, 0, 'OPEN', '2026-05-16 06:10:21', '2026-05-25 05:47:54'),
	(32, 6103145555, 'Mencuci APD', '11:50:32', '24:00:00', '4', NULL, 0, 'OPEN', '2026-05-16 06:11:23', '2026-05-24 03:49:21'),
	(33, 1011093409, 'Belajar membuat umpan pancing imitasi', '11:50:32', '24:00:00', '3', NULL, 0, 'OPEN', '2026-05-16 07:05:41', '2026-05-25 05:47:54'),
	(34, 6103145555, 'Membantu Mengerjakan PR anak', '11:50:32', '24:00:00', '4', NULL, 0, 'OPEN', '2026-05-16 08:33:51', '2026-05-24 03:48:56'),
	(36, 1011093409, 'Mengumpulkan Sisa Scrapping', '15:34:32', '00:20:00', '13', NULL, 0, 'OPEN', '2026-05-18 01:20:38', '2026-05-25 05:47:55'),
	(37, 6103145555, 'Membaca kitab kuning', '16:38:32', '24:00:00', '6', NULL, 0, 'OPEN', '2026-05-19 08:50:07', '2026-05-24 07:35:50'),
	(38, 6103145555, 'Membuat handle bar dari komposit', '16:37:32', '24:00:00', '40', NULL, 0, 'OPEN', '2026-05-23 07:06:31', '2026-05-26 01:25:01'),
	(39, 6103145555, 'Test tanpa interval tipe', '14:03:00', 'once', '4', NULL, 0, 'OPEN', '2026-05-24 06:35:38', '2026-05-24 06:35:38'),
	(41, 6103145555, 'Membersihkan Alat Pengering', '15:40:00', 'once', '5', NULL, 0, 'OPEN', '2026-05-24 07:37:47', '2026-05-24 07:37:47'),
	(42, 1011093409, 'Adjust jari jari velg vario', '12:00:00', 'once', '5', NULL, 0, 'OPEN', '2026-05-25 00:13:28', '2026-05-25 00:13:28'),
	(43, 1011093409, 'Menyelesaikan Buku GRIT', NULL, '', '8', NULL, 0, NULL, '2026-05-25 01:00:29', '2026-05-25 01:00:29'),
	(44, 1011093409, 'Menyelesaikan Review Saham', NULL, '', '5', NULL, 0, NULL, '2026-05-25 02:05:00', '2026-05-25 02:05:00');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
