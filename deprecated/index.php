<?php
// Ganti dengan token bot Anda dari @BotFather
define('BOT_TOKEN', '7985978623:AAEM9Z-RlEbfX1lEYdAGzmNSPv5sNHbUA3k');

// Include files
require_once 'koneksi.php';
require_once 'task_handler.php';
require_once 'logger.php';

// Log request start
BotLogger::logRequest();
BotLogger::info('=== NEW REQUEST START ===');

// Selalu response 200 OK ke Telegram
http_response_code(200);

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

// BACA INPUT DARI TELEGRAM WEBHOOK
$input = file_get_contents('php://input');
$update = json_decode($input, true);

// Log input untuk debugging
file_put_contents('bot.log', date('Y-m-d H:i:s') . ' - Input: ' . $input . PHP_EOL, FILE_APPEND);
BotLogger::debug('Telegram update received', ['update' => $update]);

// CEK APAKAH ADA PESAN MASUK
if (isset($update['message'])) {
    $chatId = $update['message']['chat']['id'];
    $messageText = trim($update['message']['text']);
    $telegramId = $update['message']['from']['id'];
    $username = $update['message']['from']['username'] ?? 'No username';
    
    BotLogger::info('Message received', [
        'chat_id' => $chatId,
        'telegram_id' => $telegramId,
        'username' => $username,
        'message_text' => $messageText
    ]);
    
    // Check user state dari database (bukan dari $_SESSION)
    $userState = getUserState($telegramId);
    $currentState = $userState ? $userState['state'] : null;
    
    BotLogger::debug('User state check', [
        'telegram_id' => $telegramId,
        'current_state' => $currentState,
        'message' => $messageText
    ]);
    
    // Prioritaskan command khusus terlebih dahulu
    if ($messageText == '/cancel') {
        BotLogger::info('Command /cancel received', ['chat_id' => $chatId]);
        cancelTambahTask($chatId, $telegramId);
    }
    elseif ($messageText == '/list_tasks') {
        BotLogger::info('Command /list_tasks received', ['chat_id' => $chatId]);
        sendTaskList($chatId, $telegramId);
    }
    elseif ($messageText == '/list_user') {
        $reply = getUsers();
        sendMessage($chatId, $reply);
    }
    elseif ($messageText == '/tambah_task') {
        if ($currentState === 'awaiting_list_action') {
            BotLogger::info('Command /tambah_task received from list menu', ['chat_id' => $chatId]);
            handleTambahTask($chatId, $telegramId, '');
        } else {
            BotLogger::warning('Add task requested before list_tasks', ['chat_id' => $chatId]);
            sendMessage($chatId, "Sebelum menambah task baru, silakan gunakan /list_tasks terlebih dahulu.\n\nSetelah daftar task muncul, Anda dapat memilih /tambah_task untuk menambah task atau ketik hapus <code>id</code> untuk menghapus task.");
        }
    }
    elseif ($currentState !== null) {
        if ($currentState === 'awaiting_list_action') {
            handleListAction($chatId, $telegramId, $messageText);
        } else {
            BotLogger::info('Processing task addition flow', [
                'chat_id' => $chatId,
                'current_state' => $currentState
            ]);
            handleTambahTask($chatId, $telegramId, $messageText);
        }
    }
    else {
        BotLogger::debug('Regular message or unknown command', [
            'chat_id' => $chatId,
            'message' => $messageText
        ]);
        
        $reply = "Halo $username!\n";
        $reply .= "Anda mengirim: $messageText\n\n";
        $reply .= "<b>Command yang tersedia:</b>\n";
        $reply .= "• /list_tasks - Melihat daftar task\n";
        $reply .= "• /list_user - Melihat daftar user\n";
        $reply .= "• /cancel - Membatalkan proses\n";
        $reply .= "\nGunakan /list_tasks dulu sebelum /tambah_task.";
        
        sendMessage($chatId, $reply);
    }
} 
// Handle callback query jika ada
elseif (isset($update['callback_query'])) {
    BotLogger::info('Callback query received', ['callback_data' => $update['callback_query']]);
    file_put_contents('bot.log', date('Y-m-d H:i:s') . ' - Callback: ' . $input . PHP_EOL, FILE_APPEND);
}
else {
    BotLogger::debug('No message or callback in update', ['update' => $update]);
}

// Tutup koneksi database
$conn->close();
BotLogger::debug('Database connection closed');

// Response 200 OK
http_response_code(200);
BotLogger::info('=== REQUEST END ===');
?>