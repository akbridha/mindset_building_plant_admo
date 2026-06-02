const fs = require("fs");
const path = require("path");

/**
 * Logger Service - Writes logs to both console and file
 * 
 * Features:
 * - Logs to console (real-time debugging)
 * - Logs to file (persistent record)
 * - Color-coded by level
 * - ISO timestamps
 * - Automatic log rotation (daily)
 */

class Logger {
  constructor() {
    this.logsDir = path.join(__dirname, "..", "logs");
    this.logFile = path.join(this.logsDir, `${this.getDateString()}.log`);
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
      console.log(`✅ Created logs directory: ${this.logsDir}`);
    }

    // Color codes for console output
    this.colors = {
      reset: "\x1b[0m",
      red: "\x1b[31m",      // ERROR
      yellow: "\x1b[33m",   // WARN
      green: "\x1b[32m",    // SUCCESS
      blue: "\x1b[34m",     // INFO
      cyan: "\x1b[36m",     // DEBUG
      gray: "\x1b[90m",     // TRACE
    };

    this.logLevels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3,
      TRACE: 4,
    };

    // Set current log level (can be controlled via env)
    this.currentLevel = this.logLevels[process.env.LOG_LEVEL || "INFO"];
  }

  /**
   * Get date string for log file (YYYY-MM-DD)
   */
  getDateString() {
    const now = new Date();
    return now.toISOString().split("T")[0];
  }

  /**
   * Get ISO timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format log message with timestamp and level
   */
  formatMessage(level, message, data = null) {
    const timestamp = this.getTimestamp();
    let output = `[${timestamp}] [${level}] ${message}`;

    if (data) {
      output += `\n${JSON.stringify(data, null, 2)}`;
    }

    return output;
  }

  /**
   * Write to log file (append mode)
   */
  writeToFile(message) {
    try {
      // Check if date changed (for log rotation)
      const currentLogFile = path.join(
        this.logsDir,
        `${this.getDateString()}.log`
      );

      if (currentLogFile !== this.logFile) {
        this.logFile = currentLogFile;
      }

      fs.appendFileSync(this.logFile, message + "\n");
    } catch (error) {
      // Fail silently if file write fails to not break the app
      console.error("Failed to write to log file:", error.message);
    }
  }

  /**
   * Write to console with color coding
   */
  writeToConsole(level, message, color) {
    console.log(`${color}${message}${this.colors.reset}`);
  }

  /**
   * Main log function
   */
  log(level, message, data = null) {
    if (this.logLevels[level] > this.currentLevel) {
      return; // Skip if level is too verbose
    }

    const formattedMessage = this.formatMessage(level, message, data);
    const colorCode = this.colors[
      {
        ERROR: "red",
        WARN: "yellow",
        INFO: "blue",
        DEBUG: "cyan",
        TRACE: "gray",
        SUCCESS: "green",
      }[level]
    ];

    // Write to both file and console
    this.writeToFile(formattedMessage);
    this.writeToConsole(level, formattedMessage, colorCode);
  }

  /**
   * Convenience methods
   */
  error(message, data = null) {
    this.log("ERROR", message, data);
  }

  warn(message, data = null) {
    this.log("WARN", message, data);
  }

  info(message, data = null) {
    this.log("INFO", message, data);
  }

  debug(message, data = null) {
    this.log("DEBUG", message, data);
  }

  trace(message, data = null) {
    this.log("TRACE", message, data);
  }

  success(message, data = null) {
    this.log("SUCCESS", message, data);
  }

  /**
   * Log user action (for audit trail)
   */
  logUserAction(telegram_id, action, details = null) {
    this.info(`USER_ACTION | ID: ${telegram_id} | Action: ${action}`, details);
  }

  /**
   * Log database query
   */
  logQuery(tableName, operation, details = null) {
    this.debug(`DB_QUERY | Table: ${tableName} | Op: ${operation}`, details);
  }

  /**
   * Log API call
   */
  logAPI(method, endpoint, statusCode, details = null) {
    this.info(`API | ${method} ${endpoint} | Status: ${statusCode}`, details);
  }

  /**
   * Log command execution
   */
  logCommand(telegram_id, command, details = null) {
    this.info(`COMMAND | User: ${telegram_id} | Cmd: ${command}`, details);
  }

  /**
   * Get log file path (useful for debugging)
   */
  getLogFilePath() {
    return this.logFile;
  }

  /**
   * List all log files
   */
  listLogFiles() {
    try {
      const files = fs.readdirSync(this.logsDir);
      return files.filter((f) => f.endsWith(".log")).sort().reverse();
    } catch (error) {
      this.error("Failed to list log files:", error.message);
      return [];
    }
  }

  /**
   * Clean old log files (older than days)
   */
  cleanOldLogs(daysToKeep = 7) {
    try {
      const files = fs.readdirSync(this.logsDir);
      const now = Date.now();
      const cutoffTime = now - daysToKeep * 24 * 60 * 60 * 1000;

      files.forEach((file) => {
        if (!file.endsWith(".log")) return;

        const filePath = path.join(this.logsDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtimeMs < cutoffTime) {
          fs.unlinkSync(filePath);
          this.info(`Deleted old log file: ${file}`);
        }
      });
    } catch (error) {
      this.error("Failed to clean old logs:", error.message);
    }
  }
}

// Export singleton instance
module.exports = new Logger();
