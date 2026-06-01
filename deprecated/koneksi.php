<?php
// file: koneksi.php
// Konfigurasi database
define('DB_HOST', 'localhost');
define('DB_USER', 'rootplt');        // Ganti dengan user MySQL Anda
define('DB_PASS', 'PLT,./7788()__db');    // Ganti dengan password MySQL Anda
define('DB_NAME', 'telegram_db');

// Buat koneksi
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

// Cek koneksi
if ($conn->connect_error) {
    // Log error (jangan tampilkan ke user langsung)
    error_log("MySQL Connection Failed: " . $conn->connect_error);
    die(json_encode(["error" => "Database connection failed"]));
}

// Set charset ke UTF-8
$conn->set_charset("utf8mb4");

// Fungsi untuk mendapatkan koneksi (optional, jika butuh reusable)
function getConnection() {
    global $conn;
    return $conn;
}

// Catatan: Jangan tutup koneksi di sini, biarkan index.php yang menutup
?>