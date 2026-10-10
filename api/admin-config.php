<?php
// ============================================================
// admin-config.php — Centro de Control Dinámico (SOLO ADMIN)
// ------------------------------------------------------------
// Leer/escribir credenciales JonartGSM en api/.dhru-config.json
//   GET  ?action=get    -> config con API key ENMASCARADA
//   POST {url,username,apiKey} -> guarda (apiKey vacía = no tocar)
//   POST {action:'test'}-> prueba conexión real (getbalance) sin guardar
// Verificación de admin SOLO server-side (api/_auth.php).
// El archivo JSON se guarda con chmod 600 y .htaccess deny.
// NO contiene ni escribe credenciales reales por defecto.
// ============================================================

require_once __DIR__ . '/_auth.php';
dhru_headers();

$uid = dhru_require_admin();

$configFile = __DIR__ . '/.dhru-config.json';
$logFile = __DIR__ . '/dhru-errors.log';

function mask_key($key) {
    if ($key === null || $key === '') return '';
    $len = strlen($key);
    if ($len <= 8) return str_repeat('*', $len);
    return substr($key, 0, 4) . str_repeat('*', max(0, $len - 8)) . substr($key, -4);
}

function load_config() {
    global $configFile;
    if (!is_file($configFile)) return [];
    $d = json_decode(@file_get_contents($configFile), true);
    return is_array($d) ? $d : [];
}

function save_config($cfg) {
    global $configFile;
    $json = json_encode($cfg, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    // respaldo rotativo simple del config dinámico anterior
    if (is_file($configFile)) @copy($configFile, $configFile . '.prev');
    file_put_contents($configFile, $json);
    @chmod($configFile, 0600);
    // protección web adicional
    $ht = __DIR__ . '/.htaccess';
    $rule = "<Files \".dhru-config.json*\">\n  Require all denied\n</Files>";
    $cur = is_file($ht) ? file_get_contents($ht) : '';
    if (strpos($cur, '.dhru-config.json') === false) {
        @file_put_contents($ht, $cur . "\n" . $rule . "\n");
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET' && ($_GET['action'] ?? 'get') === 'get') {
    require_once __DIR__ . '/config-dhru.php'; // constantes efectivas (JSON > fallback)
    $cfg = load_config();
    echo json_encode([
        'success' => true,
        'usingDynamicFile' => !empty($cfg['apiKey']) || !empty($cfg['username']),
        'config' => [
            'url' => $cfg['url'] ?? DHRUFUSION_URL,
            'username' => $cfg['username'] ?? DHru_USERNAME,
            'apiKeyMasked' => mask_key($cfg['apiKey'] ?? ''),
            'hasApiKey' => !empty($cfg['apiKey']),
            'updatedAt' => $cfg['updatedAt'] ?? null,
            'updatedBy' => $cfg['updatedBy'] ?? null,
        ],
        'effectiveUrl' => DHRUFUSION_URL,
    ]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $data['action'] ?? 'save';

if ($action === 'test') {
    // Prueba de conexión con las credenciales RECIBIDAS (no guardadas) o las vigentes
    require_once __DIR__ . '/config-dhru.php';
    $url = trim($data['url'] ?? '') ?: DHRUFUSION_URL;
    $user = trim($data['username'] ?? '') ?: DHru_USERNAME;
    $key = trim($data['apiKey'] ?? '') ?: DHru_API_KEY;

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, rtrim($url, '/') . '/api/index.php');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, [
        'username' => $user,
        'apiaccesskey' => $key,
        'action' => 'getbalance',
        'requestformat' => 'JSON',
        'parameters' => '<PARAMETERS></PARAMETERS>'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    $response = curl_exec($ch);
    $errNo = curl_errno($ch);
    $errMsg = curl_error($ch);
    curl_close($ch);

    file_put_contents($logFile, date('Y-m-d H:i:s') . " - admin-config TEST by $uid: errno=$errNo resp=" . substr((string)$response, 0, 500) . "\n", FILE_APPEND);

    if ($errNo) {
        echo json_encode(['success' => false, 'error' => 'Conexión fallida: ' . $errMsg]);
        exit;
    }
    $res = json_decode((string)$response, true);
    if (isset($res['SUCCESS'])) {
        $bal = $res['SUCCESS'][0]['LIST']['BALANCE'] ?? ($res['SUCCESS'][0]['BALANCE'] ?? json_encode($res['SUCCESS']));
        echo json_encode(['success' => true, 'balance' => $bal, 'raw' => $res]);
    } else {
        $errorMsg = 'Respuesta inesperada del proveedor';
        if (isset($res['ERROR'])) $errorMsg = is_array($res['ERROR']) ? implode(', ', array_column($res['ERROR'], 'MESSAGE')) : $res['ERROR'];
        echo json_encode(['success' => false, 'error' => strip_tags($errorMsg), 'hint' => 'Si el error menciona IP no autorizada: jonartgsm.com → Settings → API → Reset IP / Renew', 'raw' => $res]);
    }
    exit;
}

// ---- SAVE ----
$cfg = load_config();
$newUrl = trim($data['url'] ?? '');
$newUser = trim($data['username'] ?? '');
$newKey = trim($data['apiKey'] ?? '');

if ($newUrl !== '') $cfg['url'] = preg_match('#^https?://#i', $newUrl) ? $newUrl : 'https://' . $newUrl;
if ($newUser !== '') $cfg['username'] = $newUser;
if ($newKey !== '' && strpos($newKey, '*') === false) $cfg['apiKey'] = $newKey; // key enmascarada no pisa la real

$cfg['updatedAt'] = date('c');
$cfg['updatedBy'] = $uid;
save_config($cfg);

file_put_contents($logFile, date('Y-m-d H:i:s') . " - admin-config SAVE by $uid (key " . ($newKey !== '' ? 'updated' : 'kept') . ")\n", FILE_APPEND);

echo json_encode(['success' => true, 'config' => [
    'url' => $cfg['url'] ?? '',
    'username' => $cfg['username'] ?? '',
    'apiKeyMasked' => mask_key($cfg['apiKey'] ?? ''),
    'hasApiKey' => !empty($cfg['apiKey']),
    'updatedAt' => $cfg['updatedAt'],
]]);
?>
