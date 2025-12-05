<?php
// LSMS OUTDOOR - 수목 데이터 로드 API
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$dataRoot = realpath(__DIR__ . '/../data');
if ($dataRoot === false) {
    echo '[]';
    exit;
}

$filePath = $dataRoot . '/lsms-outdoor/trees.json';

// 저장된 파일이 없으면 빈 배열
if (!file_exists($filePath)) {
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
