<?php
// 간단한 로그 기록 유틸 (demo용)
// - data/logs.json 파일에 배열 형태로 로그를 쌓는다.
// - 운영 환경에서는 DB 또는 별도 로그 시스템을 사용하는 것이 바람직하다.

if (!function_exists('lsms_append_log')) {
    function lsms_append_log(string $type, ?string $actorId, array $meta = []): void
    {
        try {
            $dataRoot = realpath(__DIR__ . '/../data');
            if ($dataRoot === false) {
                $dataRoot = __DIR__ . '/../data';
            }

            if (!is_dir($dataRoot)) {
                @mkdir($dataRoot, 0775, true);
            }

            $filePath = $dataRoot . '/logs.json';

            $logs = [];
            if (file_exists($filePath)) {
                $raw = @file_get_contents($filePath);
                if ($raw !== false) {
                    $decoded = json_decode($raw, true);
                    if (is_array($decoded)) {
                        $logs = $decoded;
                    }
                }
            }

            $logs[] = [
                'ts'    => date('c'),
                'type'  => $type,
                'actor' => $actorId,
                'meta'  => $meta,
            ];

            // 로그가 너무 길어지는 것을 방지하기 위해 최근 500개만 유지
            if (count($logs) > 500) {
                $logs = array_slice($logs, -500);
            }

            @file_put_contents(
                $filePath,
                json_encode($logs, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
            );
        } catch (\Throwable $e) {
            // demo 환경이므로 로그 기록 실패는 무시
        }
    }
}


