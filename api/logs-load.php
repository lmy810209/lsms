<?php
// LSMS - 로그 조회 (demo용)
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$dataRoot = realpath(__DIR__ . '/../data');
if ($dataRoot === false) {
    $dataRoot = __DIR__ . '/../data';
}

$filePath = $dataRoot . '/logs.json';

if (!file_exists($filePath)) {
    echo '[]';
    exit;
}

$json = file_get_contents($filePath);
if ($json === false) {
    http_response_code(500);
    echo json_encode(
        ['ok' => false, 'error' => '로그 파일 읽기 실패'],
        JSON_UNESCAPED_UNICODE
    );
    exit;
}

echo $json;


