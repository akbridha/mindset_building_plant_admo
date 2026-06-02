# Quick Reference: Logger & Database Tables

## 📝 Logger Service

**Status:** ✅ **CREATED & INTEGRATED**

### Location
- **Service:** `services/logger.js`
- **Logs Directory:** `logs/` (auto-created)
- **Log Files:** `logs/YYYY-MM-DD.log` (rotates daily)

### Quick Start

```javascript
const logger = require("./services/logger");

// Most common methods
logger.error("Something failed", { userId: 123 });
logger.warn("Warning message", { count: 5 });
logger.info("Normal log", { action: "created_report" });
logger.debug("Debug details", { query: "SELECT ..." });
logger.success("Success!", { id: "LAP-00001" });

// Specialized audit logging
logger.logUserAction(123, "created_report", { reportId: "LAP-00001" });
logger.logQuery("laporan", "INSERT", { rows: 1 });
logger.logCommand(123, "/lapor", { status: "success" });
```

### Configuration

```env
# In .env
LOG_LEVEL=INFO    # ERROR, WARN, INFO, DEBUG, TRACE
```

### Log File Example

```
[2026-06-02T10:30:45.123Z] [INFO] User created report
{
  "userId": 123456789,
  "reportId": "LAP-00001",
  "status": "pending_approval"
}
[2026-06-02T10:31:02.456Z] [ERROR] Database connection failed
{
  "error": "Connection timeout",
  "database": "telegram_db_01"
}
```

### Utilities

```javascript
logger.getLogFilePath()       // Get current log file path
logger.listLogFiles()         // List all log files
logger.cleanOldLogs(7)        // Delete logs older than 7 days
```

---

## 🗄️ Database Tables

### Two Separate Systems

**Your project has TWO independent table sets:**

```
┌─────────────────────────────────────────────────────────┐
│                    TASK MANAGEMENT SYSTEM               │
│                      (Existing)                         │
├─────────────────────────────────────────────────────────┤
│  Table: ms_user                                         │
│  ├─ telegram_id (raw ID)                               │
│  ├─ current_state (conversation state)                 │
│  ├─ context_data (JSON context)                        │
│  ├─ reminder_time (for reminders)                      │
│  ├─ reference_code (registration code)                 │
│  └─ created_at, updated_at                             │
│                                                         │
│  Related Tables:                                        │
│  ├─ reminders (tasks to track)                         │
│  ├─ progress_history (completion tracking)             │
│  └─ ms_ref (reference codes)                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 LAPOR PAK SYSTEM (NEW)                  │
│                ANONYMOUS REPORTING SYSTEM               │
├─────────────────────────────────────────────────────────┤
│  Table: users                                           │
│  ├─ encrypted_telegram_id (HASHED - anonymous)         │
│  ├─ username (optional)                                │
│  ├─ first_name (optional)                              │
│  ├─ is_super_admin (Super User flag)                   │
│  └─ created_at                                         │
│                                                         │
│  Related Tables:                                        │
│  ├─ team_members (SH/PSD roster)                       │
│  ├─ laporan (reports)                                  │
│  ├─ updates (follow-up updates)                        │
│  └─ feedbacks (reporter feedback)                      │
└─────────────────────────────────────────────────────────┘
```

### Comparison Table

| Feature | ms_user | users |
|---------|---------|-------|
| **Purpose** | Task management & state | LAPOR PAK anonymity |
| **telegram_id** | Raw (visible) | Encrypted/hashed |
| **Stores** | State, reminders, context | Reports, feedback |
| **Used by** | Task system | LAPOR PAK only |
| **Anonymity** | ❌ No | ✅ Yes (encrypted) |
| **Related Tables** | reminders, progress_history | laporan, team_members, updates, feedbacks |

### Usage in Codebase

**ms_user is used for:**
```javascript
// In stateMiddleware.js
const [rows] = await db.execute(
  "SELECT reference_code, reminder_time FROM ms_user WHERE telegram_id = ?",
  [telegram_id]
);

// In stateService.js
const [rows] = await db.execute(
  "SELECT current_state, context_data FROM ms_user WHERE telegram_id = ?",
  [telegram_id]
);
```

**users is used for:**
```javascript
// In laporanService.js
await db.execute(
  `INSERT INTO users (encrypted_telegram_id, created_at)
   VALUES (?, CURRENT_TIMESTAMP)
   ON DUPLICATE KEY UPDATE created_at = created_at`,
  [encryptTelegramId(reporter_telegram_id)]
);

// In teamService.js
const [rows] = await db.execute(
  "SELECT role FROM team_members WHERE user_id = ? AND is_active = TRUE",
  [user_id]
);
```

---

## 📊 Which Table to Use?

### Use `ms_user` for:
- ✅ Task management workflows
- ✅ User reminder times
- ✅ Conversation state
- ✅ Reference code validation
- ✅ Demo role management

### Use `users` for:
- ✅ LAPOR PAK reporting
- ✅ Team member management
- ✅ Anonymous report storage
- ✅ Feedback workflows
- ✅ Any audit trail needing anonymity

---

## 🔐 Anonymity in LAPOR PAK

Reporter's telegram_id flow:

```
1. Reporter /lapor
   ↓
2. Raw telegram_id: 123456789
   ↓
3. Encrypted: SHA256(ENCRYPTION_KEY + "123456789") = abc123def456...
   ↓
4. Stored in users.encrypted_telegram_id
   ↓
5. Never displayed to team/group
   ↓
6. Only used internally for lookups
```

**Key:** Raw ID never stored, never shown, completely anonymous to team members.

---

## 🚀 Recommended Next Steps

1. **Test Logger:**
   ```bash
   npm start
   # Check logs/ directory for new log file
   tail -f logs/2026-06-02.log
   ```

2. **Replace console.log() gradually:**
   ```javascript
   // OLD
   console.log("Something happened");
   
   // NEW
   logger.info("Something happened", { details });
   ```

3. **Monitor logs during testing:**
   ```bash
   # Terminal 1
   npm start
   
   # Terminal 2
   tail -f logs/2026-06-02.log
   ```

4. **Verify both systems work:**
   - Create task (uses `ms_user`)
   - Create report (uses `users`)
   - Check logs for both operations

---

## 📚 Documentation Files

- **LOGGER_DOCUMENTATION.md** — Complete logger guide with examples
- **LAPOR_PAK_SETUP_GUIDE.md** — LAPOR PAK workflow guide
- **STATE_MANAGEMENT_GUIDE.md** — State management details (existing)

---

**Summary:**
- ✅ Logger created with file + console output
- ✅ ms_user = existing task system
- ✅ users = new LAPOR PAK anonymous system
- ✅ Both systems work independently
- ✅ Logger integrated into key components
