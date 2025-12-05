<?php
// LSMS OUTDOOR - 수목 데이터 저장 API
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

try {
    // 1) JS에서 보낸 JSON 그대로 읽기
    $raw = file_get_contents('php://input');
    if ($raw === false) {
        throw new Exception('입력 데이터 읽기 실패');
    }

    // 2) 저장 폴더 설정: /var/www/mywebsite/data/lsms-outdoor/trees.json
    $dataRoot = realpath(__DIR__ . '/../data');
    if ($dataRoot === false) {
        // data 폴더가 아직 없으면 생성 시도
        $dataRoot = __DIR__ . '/../data';
        if (!is_dir($dataRoot)) {
            if (!mkdir($dataRoot, 0775, true)) {
                throw new Exception('data 폴더 생성 실패');
            }
        }
    }

    $dirPath  = $dataRoot . '/lsms-outdoor';
    if (!is_dir($dirPath)) {
        if (!mkdir($dirPath, 0775, true)) {
            throw new Exception('lsms-outdoor 폴더 생성 실패');
        }
    }

    $filePath = $dirPath . '/trees.json';

    // 3) 파일로 쓰기
    if (file_put_contents($filePath, $raw) === false) {
        throw new Exception('파일 쓰기 실패');
    }

    // 4) 몇 개 저장됐는지 개수 세기
    $decoded = json_decode($raw, true);
    $count = (is_array($decoded)) ? count($decoded) : 0;

    echo json_encode(
        ['ok' => true, 'count' => $count],
        JSON_UNESCAPED_UNICODE
    );
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(
        ['ok' => false, 'error' => $e->getMessage()],
        JSON_UNESCAPED_UNICODE
    );
}
