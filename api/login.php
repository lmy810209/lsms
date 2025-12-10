<?php
// LSMS - 로그인 처리 (demo용)
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// (선택) 로그 기록 유틸이 있다면 불러온다.
@require_once __DIR__ . '/log-helper.php';

try {
    $raw = file_get_contents('php://input');
    if ($raw === false) {
        throw new Exception('입력 데이터 읽기 실패');
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new Exception('JSON 형식이 올바르지 않습니다.');
    }

    $id    = isset($data['id']) ? trim($data['id']) : '';
    $pw    = isset($data['password']) ? (string)$data['password'] : '';
    $scope = isset($data['scope']) ? trim($data['scope']) : null;   // 'indoor' | 'outdoor'
    $site  = isset($data['site']) ? trim($data['site']) : null;     // 'yangjae' 등

    if ($id === '' || $pw === '') {
        throw new Exception('아이디와 비밀번호를 모두 입력해 주세요.');
    }

    $dataRoot = realpath(__DIR__ . '/../data');
    if ($dataRoot === false) {
        throw new Exception('data 폴더를 찾을 수 없습니다.');
    }

    $filePath = $dataRoot . '/users.json';
    if (!file_exists($filePath)) {
        throw new Exception('사용자 정보 파일(users.json)이 없습니다.');
    }

    $json = file_get_contents($filePath);
    if ($json === false) {
        throw new Exception('사용자 정보 파일 읽기 실패');
    }

    $users = json_decode($json, true);
    if (!is_array($users)) {
        throw new Exception('사용자 정보 JSON 형식이 올바르지 않습니다.');
    }

    $found = null;
    foreach ($users as $u) {
        if (!isset($u['id'], $u['password'])) {
            continue;
        }
        if (!$u['active']) {
            continue;
        }
        if ($u['id'] !== $id) {
            continue;
        }

        // 비밀번호 비교 (해시 또는 평문 둘 다 지원)
        $storedPw = (string)$u['password'];
        $passwordOk = false;

        // bcrypt 해시로 보이는 경우
        if ($storedPw !== '' && strpos($storedPw, '$2y$') === 0) {
            if (password_verify($pw, $storedPw)) {
                $passwordOk = true;
            }
        } else {
            // 구(舊) demo 방식: 평문 비교 (향후 완전히 제거 예정)
            if ($storedPw === $pw) {
                $passwordOk = true;
            }
        }

        if (!$passwordOk) {
            continue;
        }

        // scope 체크 (scopes 항목이 없으면 모든 scope 허용)
        if ($scope !== null && isset($u['scopes']) && is_array($u['scopes'])) {
            if (!in_array($scope, $u['scopes'], true)) {
                continue;
            }
        }

        // site 체크 (site 가 '*' 이면 모든 현장 허용)
        if ($site !== null && isset($u['site']) && $u['site'] !== '*' && $u['site'] !== $site) {
            continue;
        }

        $found = $u;
        break;
    }

    if ($found === null) {
        http_response_code(401);
        echo json_encode(
            ['ok' => false, 'error' => '아이디 / 비밀번호 / 권한 조합이 올바르지 않습니다.'],
            JSON_UNESCAPED_UNICODE
        );
        exit;
    }

    // 클라이언트에 돌려줄 최소 정보 (비밀번호 제거)
    $userInfo = [
        'id'    => $found['id'],
        'name'  => isset($found['name']) ? $found['name'] : '',
        'role'  => isset($found['role']) ? $found['role'] : 'worker',
        'site'  => $site ?: (isset($found['site']) ? $found['site'] : null),
        'scope' => $scope,
    ];

    // 로그인 로그 남기기 (가능한 경우)
    if (function_exists('lsms_append_log')) {
        $clientIp = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : null;
        lsms_append_log('login', $userInfo['id'], [
            'site'  => $userInfo['site'],
            'scope' => $userInfo['scope'],
            'ip'    => $clientIp,
        ]);
    }

    echo json_encode(
        ['ok' => true, 'user' => $userInfo],
        JSON_UNESCAPED_UNICODE
    );
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(
        ['ok' => false, 'error' => $e->getMessage()],
        JSON_UNESCAPED_UNICODE
    );
}


