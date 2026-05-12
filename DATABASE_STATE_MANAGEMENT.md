# 📝 FIX: Database State Management untuk Multi-Step Conversation

## ✅ Apa yang Sudah Diperbaiki?

### Masalah yang Ditemukan:
1. **Session tidak persist** - `$_SESSION` kosong di setiap webhook request (tanpa `session_start()`)
2. **Task tidak ter-create** - User tidak bisa melanjutkan flow multi-step karena state hilang

### Solusi:
Gunakan **database untuk menyimpan state** alih-alih `$_SESSION`. Ini lebih reliable untuk webhook.

---

## 🚀 Setup (Langkah 1x)

### 1. Buat Tabel `user_states` di Database

Jalankan SQL berikut di MySQL client:

```sql
CREATE TABLE IF NOT EXISTS user_states (
    telegram_id BIGINT PRIMARY KEY,
    current_state VARCHAR(100) DEFAULT NULL,
    context_data JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Atau dari command line:
```bash
mysql -u rootplt -p'PLT,./7788()__db' telegram_db < db/createUserStateTable.sql
```

### 2. Copy File Baru

File sudah diperbaiki:
- ✅ `index_development.php` - updated untuk database state
- ✅ `task_handler.php` - added state management functions
- ✅ `db/createUserStateTable.sql` - SQL script baru

### 3. Deploy ke Production

```bash
cp index_development.php index.php
```

---

## 📖 Cara Menggunakan (Flow yang Benar)

### **Test Case: User menambah task baru**

**Step 1:** User kirim command `/tambah_task`
```
User: /tambah_task
Bot: 📝 Silakan ketikkan nama/deskripsi task yang ingin ditambahkan:

Contoh: Belajar PHP jam 8 malam
Ketik /cancel untuk membatalkan.
```

**Step 2:** System simpan state ke database
```
user_states table:
telegram_id: 6103145555
current_state: 'waiting_description'
context_data: {"started_at": "2026-05-12 00:40:00", "chat_id": 6103145555}
```

**Step 3:** User kirim deskripsi task
```
User: Belajar PHP jam 8 malam
```

**Step 4:** System check database, ambil state, create task
```
Database state: current_state = 'waiting_description' ✓ Match
Task dicreate di tabel reminders ✓
State di-clear dari database
```

**Step 5:** Bot response success
```
Bot: ✅ Task berhasil ditambahkan!

📋 ID Task: 1
📝 Deskripsi: Belajar PHP jam 8 malam
⏰ Status: Pending

Ketik /list_task untuk melihat semua task Anda.
```

**Step 6:** Database state cleared
```
user_states table:
telegram_id: 6103145555
current_state: NULL
context_data: NULL
```

---

## 🔧 Code Changes Summary

### New Functions di `task_handler.php`:

1. **`setUserState($telegramId, $state, $contextData)`**
   - Simpan/update state user ke database
   - `$state`: String (e.g., 'waiting_description')
   - `$contextData`: Array dengan meta data

2. **`getUserState($telegramId)`**
   - Ambil state user dari database
   - Return: Array `['state' => '...', 'context' => [...]]` atau `null`

3. **`clearUserState($telegramId)`**
   - Clear state user (set NULL)
   - Dipanggil saat task selesai atau dibatalkan

### Updated Functions:

- **`handleTambahTask($chatId, $telegramId, $messageText)`**
  - Sekarang gunakan `getUserState()` bukan `$_SESSION`
  - Lebih reliable untuk concurrent requests

- **`cancelTambahTask($chatId, $telegramId)`**
  - Added parameter `$telegramId` (required untuk query database)
  - Gunakan `clearUserState()` bukan `unset($_SESSION)`

### Updated di `index_development.php`:

- Hapus session comment yang salah
- Replace session check dengan database state check
- Fix panggilan `cancelTambahTask($chatId, $telegramId)`

---

## 📊 Database Schema: `user_states`

| Kolom | Type | Deskripsi |
|-------|------|-----------|
| `telegram_id` | BIGINT (PK) | ID unik user dari Telegram |
| `current_state` | VARCHAR(100) | State saat ini (e.g., 'waiting_description', NULL) |
| `context_data` | JSON | Data context untuk menyimpan temporary data |
| `created_at` | TIMESTAMP | Kapan record dibuat |
| `updated_at` | TIMESTAMP | Kapan record terakhir di-update |

### Example Data:

```json
{
  "telegram_id": 6103145555,
  "current_state": "waiting_description",
  "context_data": {
    "started_at": "2026-05-12 00:40:00",
    "chat_id": 6103145555
  },
  "created_at": "2026-05-12 00:40:00",
  "updated_at": "2026-05-12 00:40:00"
}
```

---

## ✅ Checklist Deployment

- [x] Hapus SESSION logic yang salah
- [x] Add 3 state management functions (`setUserState`, `getUserState`, `clearUserState`)
- [x] Update `handleTambahTask` untuk gunakan database state
- [x] Update `cancelTambahTask` parameter
- [x] Update index.php state check logic
- [ ] **Run SQL: CREATE TABLE user_states**
- [ ] Copy `index_development.php` → `index.php`
- [ ] Test `/tambah_task` flow lengkap
- [ ] Check `user_states` table di database
- [ ] Check `reminders` table untuk task baru
- [ ] Monitor logs (`bot_detailed.log`)

---

## 🧪 Testing Manual

### Test 1: Simple Message (No Command)
```
Input: "Jalan kaki di sekitar komplek"
Expected: Regular message response (tidak create task)
Log: "Regular message (not a command)"
Database: user_states tetap NULL
```

### Test 2: Tambah Task Flow (Correct)
```
1. Input: "/tambah_task"
   Expected: Ask for description
   Database: user_states.current_state = 'waiting_description'

2. Input: "Belajar PHP jam 8 malam"
   Expected: Success message + task created
   Database: reminders table punya row baru
   Database: user_states.current_state = NULL
```

### Test 3: Cancel Flow
```
1. Input: "/tambah_task"
   Database: user_states.current_state = 'waiting_description'

2. Input: "/cancel"
   Expected: Cancelled message
   Database: user_states.current_state = NULL
```

---

## 🐛 Debugging

### Check user_states table:
```sql
SELECT * FROM user_states WHERE telegram_id = 6103145555;
```

### Check reminders table:
```sql
SELECT * FROM reminders WHERE telegram_id = 6103145555 ORDER BY id DESC;
```

### Check logs:
```
tail -f bot_detailed.log  -- All activities
tail -f bot_errors.log    -- Only errors
```

### Enable detailed debugging:
Di `logger.php`, pastikan `isDebugMode()` return `true`:
```php
private static function isDebugMode() {
    return true;  // Set false untuk production
}
```

---

## 📌 Important Notes

1. **Webhook harus instant** - Database state lebih cocok daripada session
2. **Tidak perlu session_start()** - Bisa cause locking issues
3. **Concurrent safe** - Database row-level locking lebih baik
4. **Persistent** - State disimpan di database, tidak hilang
5. **Multi-user** - Setiap user punya state sendiri di database

---

## 🚨 Troubleshooting

### Q: Task masih tidak create
**A:** Pastikan:
1. ✓ Tabel `user_states` sudah dibuat
2. ✓ User kirim `/tambah_task` dulu (bukan pesan biasa)
3. ✓ Check `bot_detailed.log` untuk error
4. ✓ Check `reminders` table di database

### Q: State tidak clear setelah task created
**A:** Check logs - mungkin ada error di `clearUserState()`

### Q: "Task creation failed"
**A:** Check `reminders` table schema - mungkin kolom tidak sesuai

---

**Last Updated:** 2026-05-12  
**Status:** ✅ READY TO DEPLOY
