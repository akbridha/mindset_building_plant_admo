<?php
// file: view_log.php
$logFile = 'bot_detailed.log';
$errorFile = 'bot_errors.log';

if (isset($_GET['clear'])) {
    file_put_contents($logFile, '');
    file_put_contents($errorFile, '');
    echo "Logs cleared!";
    exit;
}

echo "<!DOCTYPE html>
<html>
<head>
    <title>Bot Log Viewer</title>
    <style>
        body { font-family: monospace; background: #f0f0f0; padding: 20px; }
        .log-container { background: white; border: 1px solid #ccc; padding: 10px; margin-bottom: 20px; }
        .error { color: red; }
        .warning { color: orange; }
        .info { color: blue; }
        .debug { color: gray; }
        h2 { margin-top: 0; }
        pre { white-space: pre-wrap; word-wrap: break-word; }
        .controls { margin-bottom: 20px; }
        button { padding: 10px 20px; margin-right: 10px; cursor: pointer; }
    </style>
</head>
<body>
    <div class='controls'>
        <a href='?clear=1'><button>Clear Logs</button></a>
        <button onclick='location.reload()'>Refresh</button>
    </div>
    
    <div class='log-container'>
        <h2>Detailed Log (bot_detailed.log)</h2>
        <pre>" . htmlspecialchars(file_exists($logFile) ? file_get_contents($logFile) : 'No log file yet') . "</pre>
    </div>
    
    <div class='log-container'>
        <h2>Error Log (bot_errors.log)</h2>
        <pre class='error'>" . htmlspecialchars(file_exists($errorFile) ? file_get_contents($errorFile) : 'No errors yet') . "</pre>
    </div>
</body>
</html>";
?>