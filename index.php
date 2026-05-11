<?php
// Ganti dengan token bot Anda dari @BotFather
define('BOT_TOKEN', '8539939076:AAE90SdHLPT3wdIVisPTUtMMFE7ohB4hDoM');

// Selalu response 200 OK ke Telegram
http_response_code(200);

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
    
    return $result;
}

// ========== INI BAGIAN YANG KURANG ==========
// BACA INPUT DARI TELEGRAM WEBHOOK
$input = file_get_contents('php://input');
$update = json_decode($input, true);

// Log input untuk debugging
file_put_contents('bot.log', date('Y-m-d H:i:s') . ' - Input: ' . $input . PHP_EOL, FILE_APPEND);

// CEK APAKAH ADA PESAN MASUK
if (isset($update['message'])) {
    $chatId = $update['message']['chat']['id'];
    $messageText = $update['message']['text'];
    $username = $update['message']['from']['username'] ?? 'No username';
    
    // BALAS PESAN
    $reply = "Halo $username!\n";
    $reply .= "Anda mengirim: $messageText\n";
    $reply .= "Terima kasih sudah menghubungi bot ini.";
    
    sendMessage($chatId, $reply);
} 
// Optional: handle callback query jika ada
elseif (isset($update['callback_query'])) {
    // Handle button callback
    file_put_contents('bot.log', date('Y-m-d H:i:s') . ' - Callback: ' . $input . PHP_EOL, FILE_APPEND);
}

// Selalu response 200 OK ke Telegram
http_response_code(200);
?>