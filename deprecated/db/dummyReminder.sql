INSERT INTO `reminders` (`telegram_id`, `description`, `timestamp`, `interval`, `target`, `last_date`, `progress`, `status`) VALUES
(123456789, 'Minum obat', '2024-01-15 08:00:00', 'daily', '08:00', '2024-01-14 08:00:00', 0, 'pending'),
(123456789, 'Meeting dengan tim', '2024-01-15 10:00:00', 'weekly', 'Monday', NULL, 0, 'pending'),
(987654321, 'Olahraga pagi', '2024-01-15 06:30:00', 'daily', '06:30', '2024-01-14 06:30:00', 50, 'pending'),
(123456789, 'Bayar tagihan', '2024-01-20 23:59:00', 'monthly', '20', NULL, 0, 'pending'),
(555555555, 'Belajar PHP', '2024-01-15 20:00:00', 'daily', '20:00', '2024-01-14 20:00:00', 75, 'pending'),
(123456789, 'Selesai proyek', '2024-01-30 23:59:00', 'once', '2024-01-30 23:59:00', NULL, 30, 'pending'),
(987654321, 'Tugas completed', '2024-01-10 12:00:00', 'once', '2024-01-10', '2024-01-10 12:00:00', 100, 'completed'),
(555555555, 'Task dibatalkan', '2024-01-05 09:00:00', 'daily', '09:00', NULL, 0, 'cancelled');