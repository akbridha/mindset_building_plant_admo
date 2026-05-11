<?php
// Ganti dengan token bot Anda dari @BotFather
define('BOT_TOKEN', '8539939076:AAE90SdHLPT3wdIVisPTUtMMFE7ohB4hDoM');

// Include koneksi database
require_once 'koneksi.php';

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

// BACA INPUT DARI TELEGRAM WEBHOOK
$input = file_get_contents('php://input');
$update = json_decode($input, true);

// Log input untuk debugging
file_put_contents('bot.log', date('Y-m-d H:i:s') . ' - Input: ' . $input . PHP_EOL, FILE_APPEND);

// CEK APAKAH ADA PESAN MASUK
if (isset($update['message'])) {
    $chatId = $update['message']['chat']['id'];
    $messageText = trim($update['message']['text']);
    $username = $update['message']['from']['username'] ?? 'No username';
    
    // Handle command /list_user
    if ($messageText == '/list_user') {
        // Ambil data dari tabel users (hanya kolom yang ada)
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
        } else {
            $reply = "❌ Tidak ada data user.";
        }
        
        sendMessage($chatId, $reply);
    } else {
        // BALAS PESAN BIASA
        $reply = "Halo $username!\n";
        $reply .= "Anda mengirim: $messageText\n";
        $reply .= "Terima kasih sudah menghubungi bot ini.\n\n";
        $reply .= "Ketik /list_user untuk melihat daftar user.";
        
        sendMessage($chatId, $reply);
    }
} 
// Optional: handle callback query jika ada
elseif (isset($update['callback_query'])) {
    // Handle button callback
    file_put_contents('bot.log', date('Y-m-d H:i:s') . ' - Callback: ' . $input . PHP_EOL, FILE_APPEND);
}

// Tutup koneksi database
$conn->close();

// Selalu response 200 OK ke Telegram
http_response_code(200);
?>