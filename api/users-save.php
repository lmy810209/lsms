<?php
// LSMS - 사용자 목록 저장 (demo용, 인증/권한 체크 단순화)
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

@require_once __DIR__ . '/log-helper.php';

try {
    $raw = file_get_contents('php://input');
    if ($raw === false) {
        throw new Exception('입력 데이터 읽기 실패');
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        throw new Exception('JSON 형식이 올바르지 않습니다.');
    }

    // { users: [...], actorId: "admin" } 형태와
    // 단순 배열([...]) 두 가지를 모두 지원
    $actorId = 'unknown';
    $users = [];

    $isAssoc = array_keys($decoded) !== range(0, count($decoded) - 1);
    if ($isAssoc) {
        if (!isset($decoded['users']) || !is_array($decoded['users'])) {
            throw new Exception('users 필드가 필요합니다.');
        }
        $users = $decoded['users'];
        if (isset($decoded['actorId'])) {
            $actorId = (string)$decoded['actorId'];
        }
    } else {
        // 이전 버전 호환: 배열 자체를 users로 취급
        $users = $decoded;
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

    // 이전 사용자 목록 불러오기 (diff 계산 및 로그용)
    $prevUsers = [];
    if (file_exists($filePath)) {
        $prevRaw = file_get_contents($filePath);
        if ($prevRaw !== false) {
            $tmp = json_decode($prevRaw, true);
            if (is_array($tmp)) {
                $prevUsers = $tmp;
            }
        }
    }

    // 비밀번호는 가능한 한 해시(bcrypt)로 저장
    foreach ($users as &$u) {
        if (!is_array($u)) {
            continue;
        }
        if (!isset($u['id'])) {
            continue;
        }
        if (isset($u['password']) && $u['password'] !== '') {
            $pw = (string)$u['password'];
            // 이미 bcrypt 해시인 경우는 그대로 둔다.
            if (strpos($pw, '$2y$') !== 0) {
                $u['password'] = password_hash($pw, PASSWORD_DEFAULT);
            }
        }
    }
    unset($u);

    // diff 계산: 생성/삭제/업데이트된 계정 파악 (비밀번호는 비교에서 제외)
    $prevById = [];
    foreach ($prevUsers as $u) {
        if (isset($u['id'])) {
            $prevById[$u['id']] = $u;
        }
    }

    $nextById = [];
    foreach ($users as $u) {
        if (isset($u['id'])) {
            $nextById[$u['id']] = $u;
        }
    }

    $created = [];
    $deleted = [];
    $updated = [];

    foreach ($nextById as $id => $u) {
        if (!isset($prevById[$id])) {
            $created[$id] = $u;
            continue;
        }

        $prev = $prevById[$id];
        $changed = false;

        $fields = ['name', 'role', 'site', 'active'];
        foreach ($fields as $f) {
            $before = $prev[$f] ?? null;
            $after = $u[$f] ?? null;
            if ($before !== $after) {
                $changed = true;
                break;
            }
        }

        // scopes 배열 비교
        $prevScopes = isset($prev['scopes']) && is_array($prev['scopes']) ? $prev['scopes'] : [];
        $nextScopes = isset($u['scopes']) && is_array($u['scopes']) ? $u['scopes'] : [];
        if ($prevScopes !== $nextScopes) {
            $changed = true;
        }

        if ($changed) {
            $updated[$id] = $u;
        }
    }

    foreach ($prevById as $id => $u) {
        if (!isset($nextById[$id])) {
            $deleted[$id] = $u;
        }
    }

    // 실제 파일 저장
    if (file_put_contents($filePath, json_encode($users, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)) === false) {
        throw new Exception('파일 쓰기 실패');
    }

    // 로그 남기기
    if (function_exists('lsms_append_log')) {
        foreach ($created as $id => $u) {
            lsms_append_log('user_created', $actorId, [
                'id'   => $id,
                'role' => $u['role'] ?? null,
                'site' => $u['site'] ?? null,
            ]);
        }
        foreach ($deleted as $id => $u) {
            lsms_append_log('user_deleted', $actorId, [
                'id'   => $id,
                'role' => $u['role'] ?? null,
                'site' => $u['site'] ?? null,
            ]);
        }
        foreach ($updated as $id => $u) {
            lsms_append_log('user_updated', $actorId, [
                'id'   => $id,
                'role' => $u['role'] ?? null,
                'site' => $u['site'] ?? null,
            ]);
        }
    }

    echo json_encode(
        ['ok' => true, 'count' => count($users)],
        JSON_UNESCAPED_UNICODE
    );
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(
        ['ok' => false, 'error' => $e->getMessage()],
        JSON_UNESCAPED_UNICODE
    );
}


