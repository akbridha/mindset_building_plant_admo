# Error Handling Guide

## Masalah yang Diperbaiki

### Sebelumnya
- Function `getTaskByUser()` hanya return `"halaman error"` tanpa informasi detail
- Tidak ada logging untuk error yang terjadi
- Tidak bisa mengetahui apa yang salah saat query database
- Error hanya bisa didiagnosis dari log yang tidak ada informasinya

### Sekarang
- Comprehensive error handling dengan try-catch-finally
- Detailed logging untuk setiap tahap proses
- User-friendly error messages untuk Telegram
- Informasi lengkap di log untuk debugging

---

## Perubahan pada `getTaskByUser()` dan `getUsers()`

### 1. **Try-Catch Exception Handling**
```php
try {
    // Process database query
} catch (Exception $e) {
    // Log full error details
    BotLogger::error($errorMsg, [
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    return "❌ Error fatal: ...";
}
```

### 2. **Database Error Checking**
Setiap tahap database checked:
- ✅ `$conn->prepare()` - Check SQL preparation
- ✅ `$stmt->execute()` - Check query execution  
- ✅ `$stmt->get_result()` - Check result retrieval
- ✅ `$result->fetch_assoc()` - Check row fetching

Contoh:
```php
if (!$stmt) {
    BotLogger::error('Failed to prepare statement', [
        'telegram_id' => $chatId,
        'error' => $conn->error,
        'sql' => $sql
    ]);
    return "❌ Error database: " . $conn->error;
}
```

### 3. **Data Validation**
Setiap field di-validate sebelum digunakan:
```php
if (empty($row['description'])) {
    $row['description'] = "[No description]";
}

$tanggal = !empty($row['created_at']) 
    ? date('d-m-Y H:i', strtotime($row['created_at'])) 
    : 'N/A';
```

### 4. **Logging di Setiap Level**
- **INFO**: Informasi umum flow
- **ERROR**: Error detail dengan context
- **WARNING**: Situasi normal tapi tidak ideal
- **DEBUG**: Detail execution

---

## Cara Membaca Log

### File Log Utama: `bot_detailed.log`

**Contoh Output:**
```
[2026-05-12 02:35:18] [INFO] Getting tasks for user {"chat_id":6103145555,"telegram_id":6103145555}
[2026-05-12 02:35:18] [DEBUG] Task data prepared successfully
[2026-05-12 02:35:19] [INFO] Task list retrieved successfully {"telegram_id":6103145555,"count":3}
```

**Contoh Error:**
```
[2026-05-12 02:35:20] [ERROR] Failed to prepare statement {"telegram_id":6103145555,"error":"Column 'task_name' doesn't exist","sql":"SELECT task_name..."}
```

---

## Yang Ditampilkan ke User Telegram

### Sukses
```
📋 Daftar Task Anda:

1. Task #123
   📝 Deskripsi: Beli groceries
   📅 Dibuat: 12-05-2026 14:30
   ⏱️ Status: pending
   🎯 Target: 2026-05-15
   📊 Progress: 50%

✅ Total: 1 task
```

### Error (dengan konteks untuk debugging)
```
❌ Error database: Column 'task_name' doesn't exist
```
atau
```
❌ Error query: Syntax error in query
```
atau  
```
❌ Error fatal: Exception message (cek bot_detailed.log)
```

---

## Debugging Tips

### 1. Cek Log Saat Error
```bash
# Linux/Mac
tail -f bot_detailed.log

# Windows PowerShell
Get-Content bot_detailed.log -Tail 20 -Wait
```

### 2. Cari Error Spesifik
```bash
# Linux/Mac
grep "ERROR" bot_detailed.log | tail -10

# Windows PowerShell
Select-String "ERROR" bot_detailed.log | Select-Object -Last 10
```

### 3. Monitor Real-time
```bash
# Linux/Mac
tail -f bot_detailed.log

# Windows PowerShell
Get-Content bot_detailed.log -Wait | Select-String "ERROR|WARNING"
```

---

## Database Schema Reference

### Table: `reminders`
```sql
CREATE TABLE reminders (
  task_id INT,           -- ID unik task
  telegram_id BIGINT,    -- ID Telegram user
  description TEXT,      -- 📝 Deskripsi task (BUKAN task_name!)
  timestamp TIMESTAMP,   -- Waktu eksekusi
  interval VARCHAR(50),  -- Tipe interval (once, daily, weekly, etc)
  target VARCHAR(100),   -- Target date
  last_date TIMESTAMP,   -- Terakhir dijalankan
  progress INT,          -- Progress percentage (0-100)
  status ENUM(...),      -- Status: pending, completed, cancelled, failed
  created_at TIMESTAMP,  -- Saat task dibuat
  updated_at TIMESTAMP   -- Saat last update
)
```

**⚠️ PENTING:** Field yang benar adalah `description`, BUKAN `task_name`

---

## Flow Chart Error Handling

```
User Command /list_tasks
    ↓
Try Block
    ├─ Prepare Statement
    │  ├─ ❌ Error? → Log + Return Error Message
    │  └─ ✅ OK → Bind Parameters
    │
    ├─ Execute Query
    │  ├─ ❌ Error? → Log + Return Error Message
    │  └─ ✅ OK → Get Result
    │
    ├─ Fetch Rows
    │  ├─ No rows? → Return "No tasks" message
    │  ├─ Has rows? → Process each row
    │  │   ├─ Try process row
    │  │   ├─ ❌ Row error? → Log + Add error line + Continue
    │  │   └─ ✅ OK → Add to reply
    │  └─ Return formatted reply
    │
    └─ Catch Exception
       ├─ Log full trace
       └─ Return Error Message to User

Send Message to User Telegram
    ↓
Message Delivered
```

---

## Improvement Checklist

- ✅ Field database yang benar digunakan (`description` bukan `task_name`)
- ✅ Semua database error di-catch dan di-log
- ✅ Row-level error handling (error di 1 row tidak menghentikan seluruh proses)
- ✅ Exception handling untuk uncaught errors
- ✅ Validasi data sebelum digunakan
- ✅ Informasi error dikirim ke user
- ✅ Detailed logging untuk debugging di bot_detailed.log
- ✅ User-friendly messages di Telegram
- ✅ Null/empty value handling

---

## Testing

### Test 1: Sukses Query
```
/list_tasks → Should show all tasks with details
```

### Test 2: Tidak Ada Task
```
/list_tasks → Should show "Anda belum memiliki task"
```

### Test 3: Database Connection Error
```
Disconnect database → /list_tasks → Should show error message + log detailed error
```

### Test 4: Invalid Data
```
Null/empty values → Should handle gracefully and show in log
```

---

## Kesimpulan

Sekarang ketika ada error:
1. ✅ User akan tahu terjadi error
2. ✅ Error message akan ditampilkan di Telegram
3. ✅ Detail error akan tercatat di `bot_detailed.log`
4. ✅ Bisa mudah di-debug melalui log file
5. ✅ Tidak ada silent failures lagi
