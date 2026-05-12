<?php
// Ganti dengan token bot Anda dari @BotFather
define('BOT_TOKEN', '8539939076:AAE90SdHLPT3wdIVisPTUtMMFE7ohB4hDoM');

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
        $reply = "📋 <b>Daftar User Telegram:</b>\n\n";
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
}

function getTaskByUser($chatId) {
    global $conn;
    
    // $sql = "SELECT id, task_name, created_at FROM tasks WHERE chat_id = ? ORDER BY id DESC";
    // $sql = "SELECT task_id, description, task_name, created_at FROM tasks WHERE chat_id = " . $chatId . " ORDER BY task_id DESC";
    // $stmt = $conn->prepare($sql);
    // $stmt->bind_param("i", $chatId);
    // $stmt->execute();
    // $result = $stmt->get_result();
    
    // if ($result && $result->num_rows > 0) {
    //     $reply = "📋 <b>Daftar Task Anda:</b>\n\n";
    //     $no = 1;
    //     while ($row = $result->fetch_assoc()) {
    //         $tanggal = date('d-m-Y H:i', strtotime($row['created_at']));
    //         $reply .= "{$no}. <b>{$row['task_name']}</b>\n";
    //         $reply .= "   Dibuat: {$tanggal}\n";
    //         $reply .= "   Deskripsi: {$row['description']}\n";
    //         $reply .= "   ─────────────────\n";
    //         $no++;
    //     }
    //     return $reply;
    // } else {
    //     return "❌ Anda belum memiliki task.";
    // }
    return $chatId;
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
    
    if ($currentState !== null) {
        BotLogger::info('Processing task addition flow', [
            'chat_id' => $chatId,
            'current_state' => $currentState
        ]);
        // Handle proses tambah task
        handleTambahTask($chatId, $telegramId, $messageText);
    }
    // Handle command /tambah_task
    elseif ($messageText == '/tambah_task') {
        BotLogger::info('Command /tambah_task received', ['chat_id' => $chatId]);
        handleTambahTask($chatId, $telegramId, '');
    }
    // Handle command /cancel (untuk membatalkan)
    elseif ($messageText == '/cancel') {
        BotLogger::info('Command /cancel received', ['chat_id' => $chatId]);
        cancelTambahTask($chatId, $telegramId);
    }
    // Handle command /list_user
    elseif ($messageText == '/list_user') {
    

        $reply = getUsers(); /*i tried this*/
        
        sendMessage($chatId, $reply);
    }
    elseif ($messageText == '/list_tasks') {
        BotLogger::info('Command /list_tasks received', ['chat_id' => $chatId]);
        
        $reply = getTaskByUser($chatId);
        sendMessage($chatId, $reply);
    }
    // BALAS PESAN BIASA
    else {
        BotLogger::debug('Regular message (not a command)', [
            'chat_id' => $chatId,
            'message' => $messageText
        ]);
        
        $reply = "Halo $username!\n";
        $reply .= "Anda mengirim: $messageText\n\n";
        $reply .= "<b>Command yang tersedia:</b>\n";
        $reply .= "• /tambah_task - Menambah task baru\n";
        $reply .= "• /list_user - Melihat daftar user\n";
        $reply .= "• /list_tasks - Melihat daftar task\n";
        $reply .= "• /cancel - Membatalkan proses";
        
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