<?php
// Ganti dengan token bot Anda
define('BOT_TOKEN', '8539939076:AAE90SdHLPT3wdIVisPTUtMMFE7ohB4hDoM');

// Ganti dengan URL ngrok Anda
$NGROK_URL = 'https://oversized-hankie-babble.ngrok-free.dev';

$webhookUrl = $NGROK_URL . '/bot/index.php';
$url = "https://api.telegram.org/bot" . BOT_TOKEN . "/setWebhook?url=" . urlencode($webhookUrl);

$result = file_get_contents($url);
$result = json_decode($result, true);

echo "<pre>";
print_r($result);
echo "</pre>";

if ($result['ok']) {
    echo "✅ Webhook berhasil diset ke: $webhookUrl";
} else {
    echo "❌ Gagal: " . $result['description'];
}

// Tampilkan info webhook saat ini
echo "<hr>";
$infoUrl = "https://api.telegram.org/bot" . BOT_TOKEN . "/getWebhookInfo";
$info = file_get_contents($infoUrl);
echo "<h3>Current Webhook Info:</h3>";
echo "<pre>" . print_r(json_decode($info, true), true) . "</pre>";
?>