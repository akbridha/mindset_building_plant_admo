# Logger Service Documentation

## Overview

A production-ready logger has been implemented to replace scattered `console.log()` statements.

**Features:**
- ✅ Writes to **both console AND file** (persistent record)
- ✅ Color-coded output by log level
- ✅ ISO timestamps on all entries
- ✅ Automatic daily log rotation
- ✅ Different log levels (ERROR, WARN, INFO, DEBUG, TRACE)
- ✅ Specialized methods for user actions, DB queries, API calls
- ✅ Old log cleanup utility

---

## Location

**Log Service File:** `services/logger.js`

**Log Output Directory:** `logs/`
- Creates automatically on first run
- Stores daily files: `2026-06-02.log`, `2026-06-03.log`, etc.
- Logs also display in console with colors

---

## Configuration

### Set Log Level

Add to `.env` to control verbosity:

```env
LOG_LEVEL=INFO    # Default: INFO
                  # Options: ERROR, WARN, INFO, DEBUG, TRACE
```

- `ERROR` — Only critical errors
- `WARN` — Warnings and errors
- `INFO` — General info, warnings, errors (default)
- `DEBUG` — Detailed debugging info
- `TRACE` — Very verbose tracing

---

## Usage Examples

### Basic Logging

```javascript
const logger = require("./services/logger");

// Error logging
logger.error("Something went wrong", { userId: 123, action: "create_report" });

// Warning
logger.warn("Unusual activity detected", { ipAddress: "192.168.1.1" });

// Info
logger.info("User logged in", { userId: 456 });

// Debug
logger.debug("Database query executed", { table: "laporan", rows: 5 });

// Trace (very verbose)
logger.trace("Entering function", { params: { x: 1, y: 2 } });

// Success (special color)
logger.success("Report approved successfully", { reportId: "LAP-00001" });
```

### Specialized Methods

```javascript
// Log user actions (for audit trail)
logger.logUserAction(123, "created_report", { 
  reportId: "LAP-00001",
  description: "Lampu mati di depan pabrik"
});

// Log database operations
logger.logQuery("laporan", "INSERT", {
  lapor_pak_id: "LAP-00001",
  status: "pending_approval"
});

// Log API calls
logger.logAPI("GET", "/api/reports", 200, { count: 10 });

// Log commands
logger.logCommand(789, "/lapor", {
  description: "Created new report",
  lapor_pak_id: "LAP-00002"
});
```

---

## Log File Examples

### Console Output (with colors)
```
[2026-06-02T10:30:45.123Z] [SUCCESS] ✅ Bot is running successfully!
[2026-06-02T10:30:45.456Z] [INFO] Ready to accept messages...
[2026-06-02T10:31:02.789Z] [DEBUG] Callback data received
{
  "userId": 123456789,
  "data": "detail_laporan_5"
}
[2026-06-02T10:31:15.234Z] [INFO] USER_ACTION | ID: 123456789 | Action: created_report
{
  "reportId": "LAP-00001",
  "status": "pending_approval"
}
```

### File Output (logs/2026-06-02.log)
```
[2026-06-02T10:30:45.123Z] [SUCCESS] ✅ Bot is running successfully!
{
  "botToken": "✓ configured",
  "superUserId": "987654321",
  "teamGroupId": "-1001234567890",
  "logFile": "d:\\bot\\logs\\2026-06-02.log",
  "logsDir": "d:\\bot\\logs"
}
[2026-06-02T10:30:45.456Z] [INFO] Ready to accept messages...
[2026-06-02T10:31:02.789Z] [DEBUG] Callback data received
{
  "userId": 123456789,
  "data": "detail_laporan_5"
}
[2026-06-02T10:31:15.234Z] [INFO] USER_ACTION | ID: 123456789 | Action: created_report
{
  "reportId": "LAP-00001",
  "status": "pending_approval"
}
```

---

## Available Methods

### Core Methods

| Method | Level | Purpose |
|--------|-------|---------|
| `logger.error(msg, data)` | ERROR | Critical errors |
| `logger.warn(msg, data)` | WARN | Warnings |
| `logger.info(msg, data)` | INFO | General information |
| `logger.debug(msg, data)` | DEBUG | Debugging details |
| `logger.trace(msg, data)` | TRACE | Very verbose trace |
| `logger.success(msg, data)` | SUCCESS | Successful operations |

### Specialized Methods

| Method | Purpose |
|--------|---------|
| `logger.logUserAction(userId, action, details)` | Audit trail for user actions |
| `logger.logQuery(table, operation, details)` | Database operation tracking |
| `logger.logAPI(method, endpoint, statusCode, details)` | API request logging |
| `logger.logCommand(userId, command, details)` | Bot command tracking |

### Utility Methods

| Method | Purpose |
|--------|---------|
| `logger.getLogFilePath()` | Get current log file path |
| `logger.listLogFiles()` | List all log files (newest first) |
| `logger.cleanOldLogs(days)` | Delete logs older than X days |
| `logger.getDateString()` | Get today's date (YYYY-MM-DD) |

---

## Integration Examples

### In Command Handlers

```javascript
const { laporCommand } = require("./commands/lapor");
const logger = require("./services/logger");

async function laporCommand(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;
    
    logger.logCommand(telegram_id, "/lapor", {
      action: "create_report_initiated"
    });

    // ... command logic ...
  } catch (error) {
    logger.error("Error in laporCommand", {
      userId: telegram_id,
      error: error.message,
      stack: error.stack
    });
    return ctx.reply("❌ Error");
  }
}
```

### In Service Layer

```javascript
const logger = require("../services/logger");

async function createReport(reporter_telegram_id, message_text) {
  try {
    logger.logQuery("laporan", "INSERT", {
      telegram_id: reporter_telegram_id,
      messageLength: message_text.length
    });

    const lapor_pak_id = generateLaporPakId(nextSeq);
    
    // ... insert logic ...
    
    logger.info("Report created successfully", {
      lapor_pak_id: lapor_pak_id,
      status: "pending_approval",
      reporter_id: reporter_telegram_id
    });

    return lapor_pak_id;
  } catch (error) {
    logger.error("Failed to create report", {
      error: error.message,
      reporter: reporter_telegram_id
    });
    throw error;
  }
}
```

### In Middleware

```javascript
const logger = require("../services/logger");

async function stateMiddleware(ctx, next) {
  try {
    const telegram_id = ctx.from.id;
    
    logger.trace("Processing user message", {
      userId: telegram_id,
      messageType: ctx.message?.type,
      hasState: !!ctx.state.userState
    });

    // ... middleware logic ...
    
    return next();
  } catch (error) {
    logger.error("Middleware error", {
      userId: ctx.from?.id,
      error: error.message
    });
    return next();
  }
}
```

---

## Log Analysis

### View Current Logs

```bash
# Windows
type logs\2026-06-02.log

# Linux/Mac
cat logs/2026-06-02.log

# Follow live logs (Linux/Mac)
tail -f logs/2026-06-02.log

# Search in logs
grep "ERROR" logs/2026-06-02.log
grep "LAP-00001" logs/2026-06-02.log
```

### Common Log Patterns

**Track user report creation:**
```bash
grep "USER_ACTION.*created_report" logs/*.log
```

**Find all errors:**
```bash
grep "\[ERROR\]" logs/*.log
```

**Database operations:**
```bash
grep "DB_QUERY" logs/*.log
```

**Approval workflow:**
```bash
grep "approve_report\|approve_feedback\|approve_update" logs/*.log
```

---

## Cleanup & Maintenance

### Automatic Cleanup (Optional)

Add to cron job or startup:

```javascript
const logger = require("./services/logger");

// Keep logs from last 30 days
logger.cleanOldLogs(30);
logger.info("Old logs cleaned", { daysKept: 30 });
```

### Manual Cleanup

```bash
# Remove logs older than 7 days
# (depends on your OS file utilities)

# Linux/Mac
find logs -name "*.log" -mtime +7 -delete

# Windows PowerShell
Get-ChildItem logs\*.log -mtime +7 | Remove-Item
```

---

## Differences: ms_user vs users Tables

### ms_user (Task Management System)

```sql
CREATE TABLE ms_user (
  id INT PRIMARY KEY AUTO_INCREMENT,
  telegram_id INT NOT NULL,              -- Raw Telegram ID
  username VARCHAR(100),
  current_state VARCHAR(100),            -- Current state in conversation
  context_data JSON,                     -- Context data (demo_role, etc)
  reminder_time TIME,                    -- For task reminders
  reference_code VARCHAR(20),            -- Reference code for registration
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Used by:** Task management, reminders, state tracking

---

### users (LAPOR PAK System)

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  encrypted_telegram_id VARCHAR(255),    -- HASHED (for anonymity)
  username VARCHAR(100),                 -- Optional
  first_name VARCHAR(100),               -- Optional
  is_super_admin BOOLEAN,                -- Super User flag
  created_at TIMESTAMP
);
```

**Used by:** LAPOR PAK system ONLY
- Stores encrypted reporter identities
- Linked to laporan, team_members, updates, feedbacks tables
- Never exposes raw telegram_id

---

## Troubleshooting

### Logs directory not created

If logs directory isn't created, the logger will attempt to create it. Check permissions:

```bash
# Make sure bot has write access
chmod 755 /path/to/bot/logs
```

### Logs not appearing

1. Check `LOG_LEVEL` environment variable
2. Verify file permissions
3. Check disk space
4. See console for logger initialization messages

### Old logs not deleting

Use manual cleanup commands listed above.

---

## Performance Notes

- Logging has minimal performance impact
- File writes are asynchronous (non-blocking)
- Failed file writes don't break bot operation
- Color codes only applied in console (not in file)

---

## Security

- Logs may contain sensitive data (user IDs, messages)
- Restrict access: `chmod 600 logs/*.log`
- Don't commit logs to version control
- Consider log retention policies per organization requirements

---

**Next Steps:**
1. Start bot: `npm start` or `node index.js`
2. Check `logs/` directory
3. Monitor logs in real-time: `tail -f logs/2026-06-02.log`
4. Use logger methods throughout codebase
