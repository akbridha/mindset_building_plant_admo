<?php
// file: task_handler.php
require_once 'koneksi.php';
require_once 'logger.php';

BotLogger::info('Task handler loaded');

// NOTE: sendMessage() function is defined in index.php to avoid redeclaration

/**
 * Simpan atau update state user di database
 * Lebih reliable daripada $_SESSION untuk webhook Telegram
 */
function setUserState($telegramId, $state, $contextData = null) {
    global $conn;
    
    BotLogger::debug('Setting user state', [
        'telegram_id' => $telegramId,
        'state' => $state,
        'context_data' => $contextData
    ]);
    
    try {
        $contextJson = $contextData ? json_encode($contextData, JSON_UNESCAPED_UNICODE) : NULL;
        
        // Check if user state exists
        $checkSql = "SELECT telegram_id FROM user_states WHERE telegram_id = ?";
        $checkStmt = $conn->prepare($checkSql);
        if (!$checkStmt) {
            BotLogger::error('Failed to prepare check statement', ['error' => $conn->error]);
            return false;
        }
        
        $checkStmt->bind_param("i", $telegramId);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        $exists = $result->num_rows > 0;
        $checkStmt->close();
        
        if ($exists) {
            // Update existing state
            $sql = "UPDATE user_states SET current_state = ?, context_data = ? WHERE telegram_id = ?";
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                BotLogger::error('Failed to prepare update statement', ['error' => $conn->error]);
                return false;
            }
            $stmt->bind_param("ssi", $state, $contextJson, $telegramId);
        } else {
            // Insert new state
            $sql = "INSERT INTO user_states (telegram_id, current_state, context_data) VALUES (?, ?, ?)";
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                BotLogger::error('Failed to prepare insert statement', ['error' => $conn->error]);
                return false;
            }
            $stmt->bind_param("iss", $telegramId, $state, $contextJson);
        }
        
        if ($stmt->execute()) {
            BotLogger::info('User state set successfully', [
                'telegram_id' => $telegramId,
                'state' => $state
            ]);
            $stmt->close();
            return true;
        } else {
            BotLogger::error('Failed to execute state update', [
                'error' => $stmt->error,
                'telegram_id' => $telegramId
            ]);
            $stmt->close();
            return false;
        }
    } catch (Exception $e) {
        BotLogger::error('Exception in setUserState', [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        return false;
    }
}

/**
 * Ambil state user dari database
 */
function getUserState($telegramId) {
    global $conn;
    
    try {
        $sql = "SELECT current_state, context_data FROM user_states WHERE telegram_id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            BotLogger::error('Failed to prepare get state statement', ['error' => $conn->error]);
            return null;
        }
        
        $stmt->bind_param("i", $telegramId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $stmt->close();
            
            BotLogger::debug('User state retrieved', [
                'telegram_id' => $telegramId,
                'state' => $row['current_state']
            ]);
            
            return [
                'state' => $row['current_state'],
                'context' => $row['context_data'] ? json_decode($row['context_data'], true) : []
            ];
        } else {
            $stmt->close();
            BotLogger::debug('No state found for user', ['telegram_id' => $telegramId]);
            return null;
        }
    } catch (Exception $e) {
        BotLogger::error('Exception in getUserState', [
            'message' => $e->getMessage()
        ]);
        return null;
    }
}

/**
 * Clear state user dari database
 */
function clearUserState($telegramId) {
    global $conn;
    
    try {
        $sql = "UPDATE user_states SET current_state = NULL, context_data = NULL WHERE telegram_id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            BotLogger::error('Failed to prepare clear state statement', ['error' => $conn->error]);
            return false;
        }
        
        $stmt->bind_param("i", $telegramId);
        if ($stmt->execute()) {
            BotLogger::info('User state cleared', ['telegram_id' => $telegramId]);
            $stmt->close();
            return true;
        } else {
            BotLogger::error('Failed to clear user state', ['error' => $stmt->error]);
            $stmt->close();
            return false;
        }
    } catch (Exception $e) {
        BotLogger::error('Exception in clearUserState', [
            'message' => $e->getMessage()
        ]);
        return false;
    }
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
 * Menggunakan database state management (lebih reliable untuk webhook)
 */
function handleTambahTask($chatId, $telegramId, $messageText) {
    BotLogger::info('handleTambahTask called', [
        'chat_id' => $chatId,
        'telegram_id' => $telegramId,
        'message_text' => $messageText,
        'message_length' => strlen($messageText)
    ]);
    
    // Ambil state dari database
    $userState = getUserState($telegramId);
    $currentState = $userState ? $userState['state'] : null;
    
    BotLogger::debug('Current user state from database', [
        'telegram_id' => $telegramId,
        'state' => $currentState
    ]);
    
    // State: idle/null - mulai proses tambah task
    if ($currentState === null) {
        BotLogger::debug('Starting new task creation flow', ['telegram_id' => $telegramId]);
        
        // Set state ke waiting_description
        setUserState($telegramId, 'waiting_description', [
            'started_at' => date('Y-m-d H:i:s'),
            'chat_id' => $chatId
        ]);
        
        $result = sendMessage($chatId, "📝 Silakan ketikkan nama/deskripsi task yang ingin ditambahkan:\n\nContoh: Belajar PHP jam 8 malam\n\nKetik /cancel untuk membatalkan.");
        
        if ($result === false) {
            BotLogger::error('Failed to send initial message', ['chat_id' => $chatId]);
        } else {
            BotLogger::info('Initial message sent successfully', ['chat_id' => $chatId]);
        }
        return true;
    } 
    // State: waiting_description - proses deskripsi
    elseif ($currentState == 'waiting_description') {
        BotLogger::debug('Processing task description', [
            'chat_id' => $chatId,
            'description' => $messageText
        ]);
        
        // Validasi deskripsi
        $description = trim($messageText);
        
        if (strlen($description) < 3) {
            BotLogger::warning('Description too short', [
                'chat_id' => $chatId,
                'length' => strlen($description)
            ]);
            sendMessage($chatId, "❌ Deskripsi terlalu pendek. Minimal 3 karakter.\n\nSilakan ketik ulang deskripsi task:");
            return true;
        }
        
        // Buat task di database
        $taskId = createTask($telegramId, $description);
        
        if ($taskId) {
            $successMsg = "✅ Task berhasil ditambahkan!\n\n📋 ID Task: {$taskId}\n📝 Deskripsi: {$description}\n⏰ Status: Pending\n\nKetik /list_task untuk melihat semua task Anda.";
            sendMessage($chatId, $successMsg);
            BotLogger::info('Task creation completed', ['task_id' => $taskId, 'chat_id' => $chatId, 'telegram_id' => $telegramId]);
        } else {
            $errorMsg = "❌ Gagal menambahkan task. Silakan coba lagi nanti.\n\nError telah dicatat di log.";
            sendMessage($chatId, $errorMsg);
            BotLogger::error('Task creation failed', ['chat_id' => $chatId, 'telegram_id' => $telegramId]);
        }
        
        // Clear state
        clearUserState($telegramId);
        BotLogger::debug('User state cleared', ['telegram_id' => $telegramId]);
        return true;
    }
    
    BotLogger::warning('Unexpected state in handleTambahTask', [
        'current_state' => $currentState
    ]);
    return false;
}

/**
 * Handle cancel proses tambah task
 */
function cancelTambahTask($chatId, $telegramId) {
    BotLogger::info('Cancel task creation', ['chat_id' => $chatId, 'telegram_id' => $telegramId]);
    
    $userState = getUserState($telegramId);
    
    if ($userState && $userState['state'] !== null) {
        clearUserState($telegramId);
        BotLogger::debug('User state cleared on cancel', ['telegram_id' => $telegramId]);
        sendMessage($chatId, "❌ Proses penambahan task dibatalkan.");
        return true;
    }
    
    BotLogger::warning('Cancel called but no active state', ['telegram_id' => $telegramId]);
    return false;
}
?>