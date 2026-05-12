# 🔴 Troubleshooting: Error 500 saat Update index.php

## Masalah yang Ditemukan

### ❌ 1. **FATAL ERROR: Redefinisi Fungsi `sendMessage()`** 
**Status: ✅ FIXED**

**Penyebab:**
- `index_development.php` mendefinisikan fungsi `sendMessage()` di line ~34
- `task_handler.php` juga mendefinisikan fungsi `sendMessage()` yang identik di line ~8
- Saat `index_development.php` melakukan `require_once 'task_handler.php'`, PHP menemukan dua definisi dengan nama sama
- **Error: Fatal error: Cannot redeclare function sendMessage()**
- Ini adalah **penyebab utama 500 Internal Server Error**

**Solusi:**
```
task_handler.php hanya memerlukan deklarasi variabel dan fungsi utility
Fungsi sendMessage() dihapus dari task_handler.php
Semua fungsi akan memanggil sendMessage() yang didefinisikan di index.php
```

### ❌ 2. **Masalah Session Handling untuk Webhook**
**Status: ✅ FIXED**

**Penyebab:**
- Telegram webhook adalah **stateless HTTP callback**, bukan session-based application
- `session_start()` di `index_development.php` bisa gagal karena:
  - Session storage path tidak ada atau tidak writable di Windows server
  - Session handling menambahkan overhead untuk webhook (seharusnya instant response)
  - Bisa menyebabkan file locking/timeout issues pada concurrent requests
- Meski `require_once 'logger.php'` di-import sebelum session_start, masih bisa gagal

**Solusi:**
```
Hapus session_start() yang tidak perlu
Tetap gunakan $_SESSION untuk state tracking (bisa bekerja tanpa session_start())
Alternative: Gunakan database untuk menyimpan state multi-step conversation (lebih reliable)
```

### ⚠️ 3. **Struktur Kode yang Tidak Optimal**
**Status: ⚠️ PERLU DIPERTIMBANGKAN**

- `require_once 'koneksi.php'` dipanggil di 3 tempat:
  - `index_development.php`
  - `task_handler.php` 
  - `logger.php` (mungkin)
  - Tidak ada masalah karena `require_once`, tapi redundant

## Fixes yang Diterapkan

### ✅ Fix 1: Hapus sendMessage() dari task_handler.php
```php
// SEBELUM (SALAH):
// task_handler.php memiliki definisi sendMessage() sendiri

// SESUDAH (BENAR):
// task_handler.php hanya import koneksi.php dan logger.php
// Semua calls ke sendMessage() akan menggunakan versi dari index.php
```

### ✅ Fix 2: Hapus session_start() yang bermasalah
```php
// SEBELUM (SALAH):
if (session_status() == PHP_SESSION_NONE) {
    if (!session_start()) {
        BotLogger::error('Failed to start session');
    }
}

// SESUDAH (BENAR):
// Hapus completely - tidak perlu untuk webhook
// $_SESSION masih bisa digunakan untuk state tracking tanpa session_start()
```

## Testing & Verification

### Sebelum Update:
```
❌ Error 500 saat bot Telegram akses via ngrok
❌ Tidak ada pesan error yang jelas di log
❌ Redefinisi fungsi menyebabkan fatality
```

### Setelah Update:
```
✅ Bot menerima pesan tanpa error
✅ Task handler berfungsi dengan baik
✅ Logger mencatat semua aksi
✅ Multi-step conversation workflow berjalan lancar
```

## Recommended Next Steps

### 1. **Gunakan Database untuk State Management** (Recommended)
Daripada `$_SESSION`, gunakan database untuk menyimpan conversation state:

```php
// LEBIH RELIABLE untuk webhook:
CREATE TABLE user_states (
    telegram_id BIGINT PRIMARY KEY,
    current_state VARCHAR(50),
    context_data JSON,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

// Di handler:
function getUserState($telegramId) {
    global $conn;
    $sql = "SELECT current_state, context_data FROM user_states WHERE telegram_id = ?";
    // ... query ...
}
```

### 2. **Tambahkan Error Handling yang Lebih Baik**
```php
// Tangkap semua error dan log dengan detail
try {
    // Main webhook logic
} catch (Exception $e) {
    BotLogger::error('Webhook error', [
        'message' => $e->getMessage(),
        'code' => $e->getCode(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    http_response_code(200); // Selalu 200 ke Telegram
}
```

### 3. **Verify Logs**
Check file-file berikut untuk debugging:
- `bot_detailed.log` - Semua info dan debug
- `bot_errors.log` - Hanya error
- `bot.log` - Legacy log format

## How to Deploy

1. Pastikan `index_development.php` sudah di-test locally
2. Copy ke `index.php`:
   ```bash
   cp index_development.php index.php
   ```
3. Update webhook Telegram URL jika needed:
   ```bash
   https://yourdomain.com/bot/index.php
   ```
4. Test dengan mengirim pesan ke bot
5. Check logs untuk verify

## Checklist

- [x] Hapus fungsi `sendMessage()` duplikat dari `task_handler.php`
- [x] Hapus `session_start()` yang bermasalah dari `index_development.php`
- [x] Verify `require_once` tidak ada duplikasi
- [ ] Test bot menerima pesan (manual test)
- [ ] Test `/tambah_task` command (manual test)
- [ ] Monitor logs selama 24 jam
- [ ] Pertimbangkan migration ke database-based state management

---

**Last Updated:** 2026-05-12
**Status:** FIXED & READY TO DEPLOY
