<?php
// LSMS - 사용자 목록 저장 (demo용, 인증 없이 사용하므로 운영용으로는 부적합)
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

try {
    $raw = file_get_contents('php://input');
    if ($raw === false) {
        throw new Exception('입력 데이터 읽기 실패');
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        throw new Exception('JSON 형식이 올바르지 않습니다.');
    }

    $dataRoot = realpath(__DIR__ . '/../data');
    if ($dataRoot === false) {
        $dataRoot = __DIR__ . '/../data';
        if (!is_dir($dataRoot)) {
            if (!mkdir($dataRoot, 0775, true)) {
                throw new Exception('data 폴더 생성 실패');
            }
        }
    }

    $filePath = $dataRoot . '/users.json';

    if (file_put_contents($filePath, json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)) === false) {
        throw new Exception('파일 쓰기 실패');
    }

    echo json_encode(
        ['ok' => true, 'count' => count($decoded)],
        JSON_UNESCAPED_UNICODE
    );
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(
        ['ok' => false, 'error' => $e->getMessage()],
        JSON_UNESCAPED_UNICODE
    );
}


