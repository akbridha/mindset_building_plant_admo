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
 * Fungsi untuk membuat task baru dengan pengingat
 */
function createTask($telegramId, $description, $reminderType, $intervalCount) {
    global $conn;
    
    BotLogger::info('Creating new task with reminder', [
        'telegram_id' => $telegramId,
        'task_description' => $description,
        'reminder_type' => $reminderType,
        'interval_count' => $intervalCount
    ]);
    
    try {
        // Hitung interval dan target berdasarkan reminder type
        if ($reminderType === 'perjam') {
            $interval = '01:00:00'; // 1 jam
            $target = $intervalCount; // jumlah pengingat per jam
        } elseif ($reminderType === 'perhari') {
            $interval = '24:00:00'; // 24 jam
            $target = $intervalCount; // jumlah pengingat per hari
        } else {
            BotLogger::error('Invalid reminder type', ['reminder_type' => $reminderType]);
            return false;
        }
        
        $timestamp = date('Y-m-d H:i:s', strtotime('+1 hour')); // mulai dalam 1 jam
        $last_date = null;
        $progress = 0;
        $status = 'pending'; // auto set to "pending" (schema enum)
        
        BotLogger::debug('Task data prepared', [
            'timestamp' => $timestamp,
            'interval' => $interval,
            'target' => $target,
            'progress' => $progress,
            'status' => $status
        ]);
        
        $sql = "INSERT INTO reminders (telegram_id, task_description, timestamp, `interval`, target, last_date, progress, status) 
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
                'telegram_id' => $telegramId,
                'reminder_type' => $reminderType,
                'interval_count' => $intervalCount
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
 * Escape text for HTML parse mode
 */
function escapeHtml($text) {
    return htmlspecialchars((string)$text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * Ambil daftar task user dari database
 */
function getTasksByUser($telegramId) {
    global $conn;
    try {
        $sql = "SELECT task_id, task_description, status, created_at, progress, target 
                FROM reminders 
                WHERE telegram_id = ? 
                ORDER BY created_at DESC";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            BotLogger::error('Failed to prepare getTasksByUser statement', [
                'error' => $conn->error,
                'telegram_id' => $telegramId
            ]);
            return false;
        }
        $stmt->bind_param("i", $telegramId);
        if (!$stmt->execute()) {
            BotLogger::error('Failed to execute getTasksByUser', [
                'error' => $stmt->error,
                'telegram_id' => $telegramId
            ]);
            $stmt->close();
            return false;
        }
        $result = $stmt->get_result();
        if (!$result) {
            BotLogger::error('Failed to get result for getTasksByUser', [
                'error' => $conn->error,
                'telegram_id' => $telegramId
            ]);
            $stmt->close();
            return false;
        }
        $tasks = [];
        while ($row = $result->fetch_assoc()) {
            $tasks[] = $row;
        }
        $stmt->close();
        return $tasks;
    } catch (Exception $e) {
        BotLogger::error('Exception in getTasksByUser', [
            'message' => $e->getMessage(),
            'telegram_id' => $telegramId
        ]);
        return false;
    }
}

/**
 * Send list task dan set state agar user bisa memilih delete atau add.
 */
function sendTaskList($chatId, $telegramId) {
    $tasks = getTasksByUser($telegramId);
    if ($tasks === false) {
        sendMessage($chatId, "Terjadi kesalahan saat mengambil daftar task. Silakan coba lagi nanti.");
        return false;
    }

    if (count($tasks) === 0) {
        setUserState($telegramId, 'awaiting_list_action', ['source' => 'list_tasks']);
        sendMessage($chatId, "Anda belum memiliki task.\n\nKetik /tambah_task untuk menambah task baru, atau ketik /cancel untuk keluar dari mode daftar task.");
        return true;
    }

    $reply = "== <b>Daftar Task Anda:</b> ==\n\n";
    foreach ($tasks as $index => $row) {
        $no = $index + 1;
        $description = escapeHtml(!empty($row['task_description']) ? $row['task_description'] : '[No description]');
        $tanggal = !empty($row['created_at']) ? date('d-m-Y H:i', strtotime($row['created_at'])) : 'N/A';
        $status = escapeHtml(!empty($row['status']) ? $row['status'] : 'unknown');
        $reply .= "{$no}. <b>ID:</b> <code>{$row['task_id']}</code>\n";
        $reply .= "   Deskripsi: {$description}\n";
        $reply .= "   Dibuat: {$tanggal}\n";
        $reply .= "   Status: <code>{$status}</code>\n";
        if (!empty($row['target'])) {
            $reply .= "   Target: " . escapeHtml($row['target']) . "\n";
        }
        if ($row['progress'] !== null) {
            $reply .= "   Progress: {$row['progress']}%\n";
        }
        $reply .= "   ─────────────────\n";
    }
    $reply .= "\nKetik /tambah_task untuk menambah task baru.\n";
    $reply .= "Ketik hapus <code>id</code> untuk menghapus task.\n";
    $reply .= "Ketik /cancel untuk membatalkan saat ini.";

    setUserState($telegramId, 'awaiting_list_action', ['source' => 'list_tasks']);
    sendMessage($chatId, $reply);
    return true;
}

/**
 * Hapus task jika ID valid dan milik user.
 */
function deleteTask($telegramId, $taskId) {
    global $conn;
    try {
        $sql = "DELETE FROM reminders WHERE task_id = ? AND telegram_id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            BotLogger::error('Failed to prepare deleteTask statement', [
                'error' => $conn->error,
                'telegram_id' => $telegramId,
                'task_id' => $taskId
            ]);
            return false;
        }
        $stmt->bind_param("ii", $taskId, $telegramId);
        if (!$stmt->execute()) {
            BotLogger::error('Failed to execute deleteTask', [
                'error' => $stmt->error,
                'telegram_id' => $telegramId,
                'task_id' => $taskId
            ]);
            $stmt->close();
            return false;
        }
        $deleted = $stmt->affected_rows > 0;
        $stmt->close();
        return $deleted;
    } catch (Exception $e) {
        BotLogger::error('Exception in deleteTask', [
            'message' => $e->getMessage(),
            'telegram_id' => $telegramId,
            'task_id' => $taskId
        ]);
        return false;
    }
}

/**
 * Handle command setelah daftar task tampil.
 */
function handleListAction($chatId, $telegramId, $messageText) {
    $normalized = trim(strtolower($messageText));

    if (preg_match('/^(hapus|delete)\s+(\d+)$/', $normalized, $matches)) {
        $taskId = (int) $matches[2];
        if ($taskId <= 0) {
            sendMessage($chatId, "ID task tidak valid. Gunakan format: hapus <code>id</code>.");
            return true;
        }
        $deleted = deleteTask($telegramId, $taskId);
        if ($deleted) {
            BotLogger::info('Task deleted by user', ['telegram_id' => $telegramId, 'task_id' => $taskId]);
            sendMessage($chatId, "Task dengan ID <code>{$taskId}</code> berhasil dihapus.");
        } else {
            sendMessage($chatId, "Gagal menghapus task. Pastikan ID benar dan task milik Anda.");
        }
        sendTaskList($chatId, $telegramId);
        return true;
    }

    if (preg_match('/^(\d+)$/', $normalized, $matches)) {
        $taskId = (int) $matches[1];
        if ($taskId <= 0) {
            sendMessage($chatId, "ID task tidak valid. Gunakan format: hapus <code>id</code> atau ketik /tambah_task.");
            return true;
        }
        $deleted = deleteTask($telegramId, $taskId);
        if ($deleted) {
            BotLogger::info('Task deleted by ID only', ['telegram_id' => $telegramId, 'task_id' => $taskId]);
            sendMessage($chatId, "Task dengan ID <code>{$taskId}</code> berhasil dihapus.");
        } else {
            sendMessage($chatId, "Gagal menghapus task. Pastikan ID benar dan task milik Anda.");
        }
        sendTaskList($chatId, $telegramId);
        return true;
    }

    sendMessage($chatId, "Perintah tidak dikenali.\n\nKetik /tambah_task untuk menambah task baru atau hapus <code>id</code> untuk menghapus task.\nKetik /cancel untuk membatalkan.");
    return true;
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
    
    // State: idle/null atau sudah melalui list_tasks - mulai proses tambah task
    if ($currentState === null || $currentState === 'awaiting_list_action') {
        BotLogger::debug('Starting new task creation flow', ['telegram_id' => $telegramId, 'current_state' => $currentState]);
        
        // Set state ke waiting_description
        setUserState($telegramId, 'waiting_description', [
            'started_at' => date('Y-m-d H:i:s'),
            'chat_id' => $chatId
        ]);
        
        $result = sendMessage($chatId, " Silakan ketikkan nama/deskripsi task yang ingin ditambahkan:\n\nContoh: Membaca buku jam 8 malam\n\n<b>Catatan:</b> Setelah ini Anda akan diminta memilih jenis pengingat dan interval.\n\nKetik /cancel untuk membatalkan.");
        
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
            sendMessage($chatId, " Deskripsi terlalu pendek. Minimal 3 karakter.\n\nSilakan ketik ulang deskripsi task:");
            return true;
        }
        
        // Simpan deskripsi di context dan set state ke waiting_reminder_type
        setUserState($telegramId, 'waiting_reminder_type', [
            'description' => $description,
            'started_at' => date('Y-m-d H:i:s'),
            'chat_id' => $chatId
        ]);
        
        sendMessage($chatId, " Deskripsi task: <b>" . escapeHtml($description) . "</b>\n\nSekarang pilih jenis pengingat:\n• Ketik <code>perjam</code> untuk pengingat per jam\n• Ketik <code>perhari</code> untuk pengingat per hari\n\nKetik /cancel untuk membatalkan.");
        return true;
    }
    // State: waiting_reminder_type - pilih jenis pengingat
    elseif ($currentState == 'waiting_reminder_type') {
        BotLogger::debug('Processing reminder type', [
            'chat_id' => $chatId,
            'reminder_type' => $messageText
        ]);
        
        $reminderType = trim(strtolower($messageText));
        
        if ($reminderType !== 'perjam' && $reminderType !== 'perhari') {
            sendMessage($chatId, " Jenis pengingat tidak valid.\n\nSilakan ketik <code>perjam</code> atau <code>perhari</code>.\n\nKetik /cancel untuk membatalkan.");
            return true;
        }
        
        // Ambil context untuk mendapatkan description
        $context = $userState['context'];
        $description = $context['description'] ?? '';
        
        if (empty($description)) {
            BotLogger::error('Missing description in context', ['telegram_id' => $telegramId]);
            sendMessage($chatId, " Terjadi kesalahan. Silakan mulai ulang dengan /tambah_task.");
            clearUserState($telegramId);
            return false;
        }
        
        // Simpan reminder_type di context dan set state ke waiting_interval
        setUserState($telegramId, 'waiting_interval', [
            'description' => $description,
            'reminder_type' => $reminderType,
            'started_at' => date('Y-m-d H:i:s'),
            'chat_id' => $chatId
        ]);
        
        sendMessage($chatId, " Jenis pengingat: <b>" . escapeHtml($reminderType) . "</b>\n\nBerapa kali Anda ingin diingatkan?\n\nKetik angka (contoh: 5 untuk 5 kali pengingat).\n\nKetik /cancel untuk membatalkan.");
        return true;
    }
    // State: waiting_interval - input interval
    elseif ($currentState == 'waiting_interval') {
        BotLogger::debug('Processing interval count', [
            'chat_id' => $chatId,
            'interval' => $messageText
        ]);
        
        $intervalCount = (int) trim($messageText);
        
        if ($intervalCount <= 0 || $intervalCount > 100) {
            sendMessage($chatId, " Interval tidak valid. Harus angka antara 1-100.\n\nSilakan ketik ulang angka.\n\nKetik /cancel untuk membatalkan.");
            return true;
        }
        
        // Ambil context
        $context = $userState['context'];
        $description = $context['description'] ?? '';
        $reminderType = $context['reminder_type'] ?? '';
        
        if (empty($description) || empty($reminderType)) {
            BotLogger::error('Missing data in context', ['telegram_id' => $telegramId, 'context' => $context]);
            sendMessage($chatId, " Terjadi kesalahan. Silakan mulai ulang dengan /tambah_task.");
            clearUserState($telegramId);
            return false;
        }
        
        // Buat task dengan data lengkap
        $taskId = createTask($telegramId, $description, $reminderType, $intervalCount);
        
        if ($taskId) {
            $successMsg = " Task berhasil ditambahkan dengan pengingat!\n\n ID Task: {$taskId}\n Deskripsi: " . escapeHtml($description) . "\n Jenis Pengingat: " . escapeHtml($reminderType) . "\n Interval: {$intervalCount} kali\n Status: Pending\n\nKetik /list_tasks untuk melihat semua task Anda.";
            sendMessage($chatId, $successMsg);
            BotLogger::info('Task creation with reminder completed', ['task_id' => $taskId, 'chat_id' => $chatId, 'telegram_id' => $telegramId]);
        } else {
            $errorMsg = " Gagal menambahkan task. Silakan coba lagi nanti.\n\nError telah dicatat di log.";
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
    return "error Handle tambah task: state tidak dikenali. Silakan mulai ulang dengan /tambah_task.";
}




/**
 * Handle cancel proses tambah task
 */
function cancelUserState($chatId, $telegramId) {
    BotLogger::info('Cancel task creation', ['chat_id' => $chatId, 'telegram_id' => $telegramId]);
    
    $userState = getUserState($telegramId);
    
    if ($userState && $userState['state'] !== null) {
        clearUserState($telegramId);
        BotLogger::debug('User state cleared on cancel', ['telegram_id' => $telegramId]);
        sendMessage($chatId, " Proses task dibatalkan.");
        return true;
    }
    
    BotLogger::warning('Cancel called but no active state', ['telegram_id' => $telegramId]);
    return false;
}



function getUsers(){
    global $conn;
    
    $sql = "SELECT telegram_id, created_at FROM users ORDER BY id DESC";
    $result = $conn->query($sql);
    
    if ($result && $result->num_rows > 0) {
        $reply = " <b>Daftar User Telegram:</b>\n <b>INI DUMMY</b> \n <b>Belajar ambil data dari DB</b>\n";
        $no = 1;
        while ($row = $result->fetch_assoc()) {
            $tanggal = date('d-m-Y H:i', strtotime($row['created_at']));
            $reply .= "{$no}. Telegram ID: <code>{$row['telegram_id']}</code>\n";
            $reply .= "   Bergabung: {$tanggal}\n";
            $reply .= "   ─────────────────\n";
            $no++;
        }
        $reply .= "\nTotal: " . ($no-1) . " user";
        BotLogger::info('User list retrieved', ['count' => $no-1]);
    } else {
        $reply = " Tidak ada data user.";
        BotLogger::warning('No users found in database');
    }
    return $reply;


    // versi lebih lengkap log  nya ==========
    // try {
    //     BotLogger::info('Getting all users');
        
    //     $sql = "SELECT telegram_id, created_at FROM users ORDER BY id DESC";
    //     $result = $conn->query($sql);
        
    //     if (!$result) {
    //         $error = "Query error: " . $conn->error;
    //         BotLogger::error('Failed to query users', ['error' => $conn->error, 'sql' => $sql]);
    //         return " Error query: " . $conn->error;
    //     }
        
    //     if ($result->num_rows > 0) {
    //         $reply = "📋 <b>Daftar User Telegram:</b>\n\n";
    //         $no = 1;
    //         while ($row = $result->fetch_assoc()) {
    //             try {
    //                 $tanggal = !empty($row['created_at']) ? date('d-m-Y H:i', strtotime($row['created_at'])) : 'N/A';
    //                 $reply .= "{$no}. Telegram ID: <code>{$row['telegram_id']}</code>\n";
    //                 $reply .= "   Bergabung: {$tanggal}\n";
    //                 $reply .= "   ─────────────────\n";
    //                 $no++;
    //             } catch (Exception $rowError) {
    //                 BotLogger::error('Error processing user row', [
    //                     'row' => $row,
    //                     'error' => $rowError->getMessage()
    //                 ]);
    //                 $reply .= "{$no}.  Error reading user data\n";
    //                 $no++;
    //             }
    //         }
    //         $reply .= "\n Total: " . ($no - 1) . " user";
    //         BotLogger::info('User list retrieved', ['count' => $no-1]);
    //     } else {
    //         $reply = " Tidak ada data user.";
    //         BotLogger::warning('No users found in database');
    //     }
    //     return $reply;
        
    // } catch (Exception $e) {
    //     $errorMsg = "Exception in getUsers: " . $e->getMessage();
    //     BotLogger::error($errorMsg, [
    //         'file' => $e->getFile(),
    //         'line' => $e->getLine(),
    //         'trace' => $e->getTraceAsString()
    //     ]);
    //     return " Error fatal: " . $e->getMessage() . " (cek bot_detailed.log)";
    // }
}

function getTaskByUser($chatId) {
    $tasks = getTasksByUser($chatId);
    if ($tasks === false) {
        return "Error mengambil daftar task. Silakan coba lagi nanti.";
    }

    if (count($tasks) === 0) {
        return " Anda belum memiliki task.\n\nGunakan /list_tasks untuk melihat daftar task, lalu /tambah_task untuk membuat task baru.";
    }

    $reply = "== <b>Daftar Task Anda:</b>==\n\n";
    $no = 1;
    foreach ($tasks as $row) {
        try {
            $description = escapeHtml(!empty($row['task_description']) ? $row['task_description'] : "[No description]");
            $tanggal = !empty($row['created_at']) ? date('d-m-Y H:i', strtotime($row['created_at'])) : 'N/A';
            $status = !empty($row['status']) ? $row['status'] : 'unknown';

            $reply .= "  {$no}. Deskripsi: {$description}\n";
            $reply .= "   Dibuat: {$tanggal}\n";
            $reply .= "    Status: <code>{$status}</code>\n";
            if (!empty($row['target'])) {
                $reply .= "    Target: {$row['target']}\n";
            }
            if ($row['progress'] !== null) {
                $reply .= "    Progress: {$row['progress']}%\n";
            }
            $reply .= "   ─────────────────\n";
            $no++;
        } catch (Exception $rowError) {
            BotLogger::error('Error processing task row', [
                'telegram_id' => $chatId,
                'row' => $row,
                'error' => $rowError->getMessage()
            ]);
            $reply .= "{$no}.  Error reading task\n";
            $no++;
        }
    }
    $reply .= "\n Total: " . ($no - 1) . " task";
    return $reply;
}
/**
 * Fungsi untuk mengirim pesan ke Telegram
 */
function sendMessage($chatId, $text) {
    $url = "https://api.telegram.org/bot" . BOT_TOKEN . "/sendMessage";
    
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
    
    // Log response
    file_put_contents('bot.log', date('Y-m-d H:i:s') . ' - Response: ' . $result . PHP_EOL, FILE_APPEND);
    
    if ($result === false) {
        BotLogger::error('sendMessage failed', [
            'chat_id' => $chatId,
            'error' => error_get_last()
        ]);
    } else {
        BotLogger::debug('sendMessage success', ['chat_id' => $chatId]);
    }
    
    return $result;
}
?>