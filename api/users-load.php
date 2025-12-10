<?php
// LSMS - 사용자 목록 조회 (demo용)
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$dataRoot = realpath(__DIR__ . '/../data');
if ($dataRoot === false) {
    echo '[]';
    exit;
}

$filePath = $dataRoot . '/users.json';

if (!file_exists($filePath)) {
    // 파일이 없으면 빈 배열 반환
    echo '[]';
    exit;
}

$json = file_get_contents($filePath);
if ($json === false) {
    http_response_code(500);
    echo json_encode(
        ['ok' => false, 'error' => '파일 읽기 실패'],
        JSON_UNESCAPED_UNICODE
    );
    exit;
}

// 그대로 반환 (이미 JSON 형식)
echo $json;


