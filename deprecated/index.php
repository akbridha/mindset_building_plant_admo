<?php
// Ganti dengan token bot Anda dari @BotFather


// Include files
require_once 'config.php';
require_once 'koneksi.php';
require_once 'task_handler.php';
require_once 'logger.php';

// Log request start
BotLogger::logRequest();
BotLogger::info('=== NEW REQUEST START ===');

// Selalu response 200 OK ke Telegram
http_response_code(200);



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
    
    // Classify message and determine response
    $balasan = "";
    
    if ($messageText == '/cancel') {
        BotLogger::info('Command /cancel received', ['chat_id' => $chatId]);
        $balasan = handleCancelCommand($chatId, $telegramId);
    }
    elseif ($messageText == '/list_tasks') {
        // $balasan = handleListTasksCommand($chatId, $telegramId);
        $balasan = "tasklist DUmmy";
    }
    elseif ($messageText == '/list_user') {
        $balasan = handleListUserCommand($chatId, $telegramId);
    }
    elseif ($messageText == '/tambah_task') {
        $balasan = handleTambahTaskCommand($chatId, $telegramId, $currentState);
    }
    elseif ($currentState === 'awaiting_list_action') {
        BotLogger::info('Handling list action', ['chat_id' => $chatId, 'message' => $messageText]);
        $balasan = handleListAction($chatId, $telegramId, $messageText);
    }
    elseif ($currentState !== null) {
        BotLogger::info('Processing task addition flow', [
            'chat_id' => $chatId,
            'current_state' => $currentState
        ]);
        $balasan = handleTambahTask($chatId, $telegramId, $messageText);
    }
    else {
        BotLogger::debug('Regular message or unknown command', [
            'chat_id' => $chatId,
            'message' => $messageText
        ]);
        $balasan = getPesanBalasanDefault($username);
    }
    
    // Send response if not empty
    if (!empty($balasan)) {
        sendMessage($chatId, $balasan);
        BotLogger::info('Response sent', ['chat_id' => $chatId, 'response' => $balasan]);
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