<?php
// file: logger.php
class BotLogger {
    private static $logFile = 'bot_detailed.log';
    private static $errorFile = 'bot_errors.log';
    
    /**
     * Log info message
     */
    public static function info($message, $context = []) {
        self::writeLog('INFO', $message, $context);
    }
    
    /**
     * Log error message
     */
    public static function error($message, $context = []) {
        self::writeLog('ERROR', $message, $context);
        // Also write to error log
        error_log($message . ' ' . json_encode($context));
    }
    
    /**
     * Log debug message
     */
    public static function debug($message, $context = []) {
        if (self::isDebugMode()) {
            self::writeLog('DEBUG', $message, $context);
        }
    }
    
    /**
     * Log warning message
     */
    public static function warning($message, $context = []) {
        self::writeLog('WARNING', $message, $context);
    }
    
    /**
     * Write to log file
     */
    private static function writeLog($level, $message, $context = []) {
        $timestamp = date('Y-m-d H:i:s');
        $contextJson = !empty($context) ? json_encode($context, JSON_UNESCAPED_UNICODE) : '';
        $logLine = "[{$timestamp}] [{$level}] {$message} {$contextJson}" . PHP_EOL;
        
        // Write to main log
        file_put_contents(self::$logFile, $logLine, FILE_APPEND);
        
        // If error, also write to error log
        if ($level == 'ERROR') {
            file_put_contents(self::$errorFile, $logLine, FILE_APPEND);
        }
    }
    
    /**
     * Check if debug mode is enabled
     */
    private static function isDebugMode() {
        // You can set this to true for development
        return true;
    }
    
    /**
     * Log variable dump for debugging
     */
    public static function dump($var, $label = 'Variable dump') {
        ob_start();
        var_dump($var);
        $dump = ob_get_clean();
        self::debug($label, ['dump' => $dump]);
    }
    
    /**
     * Log server request data
     */
    public static function logRequest() {
        self::info('Request received', [
            'method' => $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN',
            'uri' => $_SERVER['REQUEST_URI'] ?? 'UNKNOWN',
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN'
        ]);
    }
}
?>