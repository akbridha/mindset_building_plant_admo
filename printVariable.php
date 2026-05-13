<?php
// File untuk menampilkan variable tertentu dari JSON
$jsonFile = 'data.json';

// Ambil parameter variable dari URL
// Contoh: printVariable.php?var=x
$varName = isset($_GET['var']) ? $_GET['var'] : '';

// Baca file JSON
if (!file_exists($jsonFile)) {
    die("Error: File data.json tidak ditemukan");
}

$content = file_get_contents($jsonFile);
$data = json_decode($content, true);

if (!is_array($data)) {
    die("Error: Format JSON tidak valid");
}

// Jika parameter 'var' diberikan
if (!empty($varName)) {
    // Cek apakah variable tersebut ada
    if (isset($data[$varName])) {
        // Tampilkan hanya variable yang diminta
        echo $data[$varName];
    } else {
        // Variable tidak ditemukan
        echo "Error: Variable '$varName' tidak ditemukan";
    }
} else {
    // Jika tidak ada parameter, tampilkan semua variable
    echo "<h2>Semua Variable:</h2><pre>";
    foreach ($data as $key => $value) {
        echo "\${$key} = {$value}\n";
    }
    echo "</pre>";
}
?>