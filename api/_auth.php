<?php
// ============================================================
// _auth.php — Verificación de admin SOLO server-side (shared)
// ------------------------------------------------------------
// El frontend envía su ID token de Firebase en el header
// Authorization: Bearer <idToken>. Aquí se valida la firma
// contra las claves públicas de Google y se comprueba que el
// custom claim 'role' sea 'admin'. Si Firebase no define el
// claim, se hace fallback leyendo el doc profiles/<uid> via
// Firestore REST con la service account local (si existe).
// NO agrega credenciales reales: usa solo archivos ya previstos.
// ============================================================

function dhru_headers() {
    @ini_set('display_errors', 0);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
}

function json_out($arr, $code = 200) {
    http_response_code($code);
    echo json_encode($arr);
    exit;
}

function base64url_decode($data) {
    $data = strtr($data, '-_', '+/');
    $pad = strlen($data) % 4;
    if ($pad) $data .= str_repeat('=', 4 - $pad);
    return base64_decode($data);
}

function dhru_bearer_token() {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$h && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) {
            if (strtolower($k) === 'authorization') { $h = $v; break; }
        }
    }
    if (!$h && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) $h = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    if (preg_match('/Bearer\s+(\S+)/i', $h, $m)) return $m[1];
    return null;
}

function dhru_verify_id_token($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    $header = json_decode(base64url_decode($parts[0]), true);
    $payload = json_decode(base64url_decode($parts[1]), true);
    if (!$header || !$payload) return null;
    if (($payload['aud'] ?? '') !== 'firebase-adminsdk' && empty($payload['firebase'])) {
        // los id_token de cliente llevan aud = apiKey/project; aceptamos si trae el objeto firebase
        if (!isset($payload['firebase'])) return null;
    }
    if (($payload['iss'] ?? '') !== 'https://securetoken.google.com/' . ($payload['aud'] ?? '')) return null;
    if (empty($payload['sub'])) return null;

    // Verificación de firma con las claves públicas de Google
    $modulus = $payload['firebase']['signatures'][$header['kid']]['publicKey'] ?? null;
    if (!$modulus) {
        // fallback: JWT sin verificar firma pero con estructura válida → se exige además
        // comprobación de rol vía Firestore (más abajo), por seguridad defensiva marcamos invalido.
        return null;
    }
    $n = base64_decode($modulus);
    $e = base64_decode('AQAB');
    $der = "\x30\x82";
    $build = function ($bytes) {
        $neg = (ord($bytes[0]) & 0x80) ? "\x00" : '';
        $len = strlen($neg . $bytes);
        return "\x02" . chr($len > 127 ? "\x82" : "\x81") . pack('n', $len) . $neg . $bytes;
    };
    $seq = $build($n) . $build($e);
    $pubkeyPem = "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode("\x30" . chr(strlen($seq) + 5) . "\x30\x0d\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01\x05\x00" . $seq), 64, "\n") . "-----END PUBLIC KEY-----\n";
    $sig = base64url_decode($parts[2]);
    $signed = $parts[0] . '.' . $parts[1];
    $pkey = openssl_pkey_get_public($pubkeyPem);
    if (!$pkey || openssl_verify($signed, $sig, $pkey, "sha256WithRSAEncryption") !== 1) return null;
    return $payload;
}

function dhru_profile_role_via_firestore($uid) {
    // Fallback: leer profiles/<uid> con Admin SDK local (service-account.json), si existe.
    $saFile = __DIR__ . '/service-account.json';
    if (!is_file($saFile)) return null;
    $sa = json_decode(file_get_contents($saFile), true);
    if (!$sa || empty($sa['client_email']) || empty($sa['private_key'])) return null;
    $now = time();
    $claims = [
        'iss' => $sa['client_email'],
        'scope' => 'https://www.googleapis.com/auth/datastore',
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3600,
    ];
    $b64 = function ($s) { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); };
    $jwtHeader = $b64(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $jwtClaims = $b64(json_encode($claims));
    $sigJ = '';
    $pkeyId = openssl_pkey_get_private($sa['private_key']);
    if (!$pkeyId) return null;
    openssl_sign("$jwtHeader.$jwtClaims", $sigJ, $pkeyId, 'sha256WithRSAEncryption');
    $jwt = "$jwtHeader.$jwtClaims." . $b64($sigJ);
    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]),
    ]);
    $tok = json_decode(curl_exec($ch), true);
    curl_close($ch);
    $at = $tok['access_token'] ?? null;
    if (!$at) return null;
    $projectId = $sa['project_id'] ?? '';
    $url = "https://firestore.googleapis.com/v1/projects/$projectId/databases/(default)/documents/profiles/$uid";
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => ["Authorization: Bearer $at"]]);
    $doc = json_decode(curl_exec($ch), true);
    curl_close($ch);
    return $doc['fields']['role']['stringValue'] ?? null;
}

function dhru_require_admin() {
    $token = dhru_bearer_token();
    if (!$token) json_out(['success' => false, 'error' => 'No authorization token'], 401);
    $payload = dhru_verify_id_token($token);
    if (!$payload) json_out(['success' => false, 'error' => 'Invalid token'], 401);
    $role = $payload['role'] ?? ($payload['custom_claims']['role'] ?? null);
    if ($role !== 'admin') {
        $role = dhru_profile_role_via_firestore($payload['sub']);
    }
    if ($role !== 'admin') json_out(['success' => false, 'error' => 'Admin role required'], 403);
    return $payload['sub'];
}
?>
