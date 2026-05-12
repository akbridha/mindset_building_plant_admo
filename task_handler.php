<?php
// file: task_handler.php
require_once 'koneksi.php';
require_once 'logger.php';

BotLogger::info('Task handler loaded');

/**
 * Fungsi untuk mengirim pesan ke Telegram
 */
function sendMessage($chatId, $text) {
    $token = '8539939076:AAE90SdHLPT3wdIVisPTUtMMFE7ohB4hDoM';
    $url = "https://api.telegram.org/bot{$token}/sendMessage";
    
    $data = [
        'chat_id' => $chatId,
        'text' => $text,
        'parse_mode' => 'HTML'
    ];
    
    $options = [
        'http' => [
            'header' => "Content-type: application/x-www-form-urlencoded\r\n",
            'method' => 'POST',
            'content' => http_build_query($data)
        ]
    ];
    
    $context = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    
    BotLogger::info('Send message', [
        'chat_id' => $chatId,
        'text_length' => strlen($text),
        'result' => $result ? 'success' : 'failed'
    ]);
    
    if ($result === false) {
        BotLogger::error('Failed to send message', [
            'chat_id' => $chatId,
            'error' => error_get_last()
        ]);
    }
    
    return $result;
}

/**
 * Fungsi untuk membuat task baru
 */
function createTask($telegramId, $description) {
    global $conn;
    
    BotLogger::info('Creating new task', [
        'telegram_id' => $telegramId,
        'description' => $description
    ]);
    
    try {
        // Data dummy untuk kolom lain agar tidak error
        $timestamp = date('Y-m-d H:i:s', strtotime('+1 day'));
        $interval = 'once';
        $target = date('Y-m-d', strtotime('+1 day'));
        $last_date = null;
        $progress = 0;
        $status = 'pending';
        
        BotLogger::debug('Task data prepared', [
            'timestamp' => $timestamp,
            'interval' => $interval,
            'target' => $target,
            'progress' => $progress,
            'status' => $status
        ]);
        
        $sql = "INSERT INTO reminders (telegram_id, description, timestamp, `interval`, target, last_date, progress, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            BotLogger::error('Failed to prepare statement', [
                'error' => $conn->error,
                'sql' => $sql
            ]);
            return false;
        }
        
        $stmt->bind_param("isssssis", $telegramId, $description, $timestamp, $interval, $target, $last_date, $progress, $status);
        
        if ($stmt->execute()) {
            $taskId = $stmt->insert_id;
            BotLogger::info('Task created successfully', [
                'task_id' => $taskId,
                'telegram_id' => $telegramId
            ]);
            $stmt->close();
            return $taskId;
        } else {
            BotLogger::error('Failed to execute insert', [
                'error' => $stmt->error,
                'telegram_id' => $telegramId,
                'description' => $description
            ]);
            $stmt->close();
            return false;
        }
    } catch (Exception $e) {
        BotLogger::error('Exception in createTask', [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return false;
    }
}

/**
 * Handle proses tambah task
 */
function handleTambahTask($chatId, $telegramId, $messageText) {
    BotLogger::info('handleTambahTask called', [
        'chat_id' => $chatId,
        'telegram_id' => $telegramId,
        'message_text' => $messageText,
        'message_length' => strlen($messageText)
    ]);
    
    $sessionKey = "add_task_{$chatId}";
    
    // Cek state saat ini
    if (!isset($_SESSION[$sessionKey])) {
        BotLogger::debug('Starting new task creation flow', ['session_key' => $sessionKey]);
        // Mulai proses tambah task
        $_SESSION[$sessionKey] = 'waiting_description';
        $result = sendMessage($chatId, "📝 Silakan ketikkan nama/deskripsi task yang ingin ditambahkan:\n\nContoh: Belajar PHP jam 8 malam");
        
        if ($result === false) {
            BotLogger::error('Failed to send initial message', ['chat_id' => $chatId]);
        } else {
            BotLogger::info('Initial message sent successfully', ['chat_id' => $chatId]);
        }
        return true;
    } 
    elseif ($_SESSION[$sessionKey] == 'waiting_description') {
        BotLogger::debug('Processing task description', [
            'chat_id' => $chatId,
            'description' => $messageText
        ]);
        
        // Dapat deskripsi, buat task ke database
        $description = trim($messageText);
        
        if (strlen($description) < 3) {
            BotLogger::warning('Description too short', [
                'chat_id' => $chatId,
                'length' => strlen($description)
            ]);
            sendMessage($chatId, "❌ Deskripsi terlalu pendek. Minimal 3 karakter.\n\nSilakan ketik ulang deskripsi task:");
            return true;
        }
        
        // Buat task
        $taskId = createTask($telegramId, $description);
        
        if ($taskId) {
            $successMsg = "✅ Task berhasil ditambahkan!\n\n📋 ID Task: {$taskId}\n📝 Deskripsi: {$description}\n⏰ Status: Pending\n\nKetik /list_task untuk melihat semua task Anda.";
            sendMessage($chatId, $successMsg);
            BotLogger::info('Task creation completed', ['task_id' => $taskId, 'chat_id' => $chatId]);
        } else {
            $errorMsg = "❌ Gagal menambahkan task. Silakan coba lagi nanti.\n\nError telah dicatat di log.";
            sendMessage($chatId, $errorMsg);
            BotLogger::error('Task creation failed', ['chat_id' => $chatId, 'telegram_id' => $telegramId]);
        }
        
        // Hapus session
        unset($_SESSION[$sessionKey]);
        BotLogger::debug('Session cleared', ['session_key' => $sessionKey]);
        return true;
    }
    
    BotLogger::warning('Unexpected state in handleTambahTask', [
        'session_state' => $_SESSION[$sessionKey] ?? 'not set'
    ]);
    return false;
}

/**
 * Handle cancel proses tambah task
 */
function cancelTambahTask($chatId) {
    BotLogger::info('Cancel task creation', ['chat_id' => $chatId]);
    
    $sessionKey = "add_task_{$chatId}";
    if (isset($_SESSION[$sessionKey])) {
        unset($_SESSION[$sessionKey]);
        BotLogger::debug('Session cleared on cancel', ['session_key' => $sessionKey]);
        sendMessage($chatId, "❌ Proses penambahan task dibatalkan.");
        return true;
    }
    
    BotLogger::warning('Cancel called but no active session', ['chat_id' => $chatId]);
    return false;
}
?>