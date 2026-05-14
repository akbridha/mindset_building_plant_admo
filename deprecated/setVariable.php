<?php
// File untuk menyimpan variable ke JSON via GET parameter
$jsonFile = 'data.json';

// Ambil parameter dari URL
$key = isset($_GET['key']) ? $_GET['key'] : '';
$value = isset($_GET['value']) ? $_GET['value'] : '';

// Alternatif: format langsung ?x=123 (tanpa key=value)
// Jika menggunakan format ?x=123
if (empty($key) && empty($value)) {
    // Ambil semua parameter GET selain ini
    foreach ($_GET as $k => $v) {
        if ($k !== 'action') { // skip action jika ada
            $key = $k;
            $value = $v;
            break;
        }
    }
}

// Validasi: key tidak boleh kosong
if (empty($key)) {
    die(json_encode(['error' => 'Parameter key tidak boleh kosong. Gunakan: ?key=nama&value=isi atau ?nama=isi']));
}

// Baca file JSON yang sudah ada
if (file_exists($jsonFile)) {
    $currentData = json_decode(file_get_contents($jsonFile), true);
    if (!is_array($currentData)) {
        $currentData = [];
    }
} else {
    $currentData = [];
}

// Update value
$currentData[$key] = $value;

// Simpan kembali ke file JSON
$result = file_put_contents($jsonFile, json_encode($currentData, JSON_PRETTY_PRINT));

// Response
if ($result !== false) {
    echo json_encode([
        'success' => true,
        'message' => "Variable '$key' berhasil diset dengan value: $value",
        'data' => $currentData
    ], JSON_PRETTY_PRINT);
} else {
    echo json_encode([
        'success' => false,
        'error' => 'Gagal menyimpan ke file JSON'
    ]);
}
?>