<?php
// ============================================================
// simulate-order.php — Simulador DRY-RUN (SOLO ADMIN)
// ------------------------------------------------------------
// Recibe {serviceId, values:{...}, service?} y devuelve:
//  1) modalHtml: el modal que vería el cliente aplicando fieldRules
//     (colección Firestore `fieldRules` leída vía service account;
//      si está vacía o falla → comportamiento automático actual)
//  2) xml: el XML EXACTO que generaría place-order-dhru.php
//     (misma lógica de ramas/prioridad/etiquetas MAYÚSCULAS),
//     SIN ejecutar ningún curl a JonartGSM.
// ============================================================

require_once __DIR__ . '/_auth.php';
dhru_headers();

$uid = dhru_require_admin();

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$serviceId = $data['serviceId'] ?? '';
$values = $data['values'] ?? [];       // { imei?, customField?, username?, email?, quantity?, fieldValues?:{...} }
$service = $data['service'] ?? null;   // objeto servicio ya mapeado (customInput/customFields) opcional

if (!$serviceId) json_out(['success' => false, 'error' => 'Missing serviceId']);

$logFile = __DIR__ . '/dhru-errors.log';

// ---------- Cargar fieldRules desde Firestore (best effort) ----------
function load_field_rules() {
    $saFile = __DIR__ . '/service-account.json';
    if (!is_file($saFile)) return ['rules' => [], 'source' => 'no-service-account'];
    $sa = json_decode(file_get_contents($saFile), true);
    if (!$sa || empty($sa['client_email']) || empty($sa['private_key'])) return ['rules' => [], 'source' => 'bad-service-account'];

    $now = time();
    $b64 = function ($s) { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); };
    $claims = ['iss' => $sa['client_email'], 'scope' => 'https://www.googleapis.com/auth/datastore', 'aud' => 'https://oauth2.googleapis.com/token', 'iat' => $now, 'exp' => $now + 3600];
    $h = $b64(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $c = $b64(json_encode($claims));
    $sig = '';
    $pk = openssl_pkey_get_private($sa['private_key']);
    if (!$pk) return ['rules' => [], 'source' => 'bad-private-key'];
    openssl_sign("$h.$c", $sig, $pk, 'sha256WithRSAEncryption');
    $jwt = "$h.$c." . $b64($sig);

    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POSTFIELDS => http_build_query(['grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion' => $jwt])]);
    $tok = json_decode(curl_exec($ch), true); curl_close($ch);
    $at = $tok['access_token'] ?? null;
    if (!$at) return ['rules' => [], 'source' => 'token-failed'];

    $projectId = $sa['project_id'] ?? '';
    $url = "https://firestore.googleapis.com/v1/projects/$projectId/databases/(default)/documents/fieldRules";
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => ["Authorization: Bearer $at"]]);
    $resp = json_decode(curl_exec($ch), true); curl_close($ch);

    $rules = [];
    foreach (($resp['documents'] ?? []) as $doc) {
        $r = [];
        foreach (($doc['fields'] ?? []) as $k => $v) {
            $val = null;
            if (isset($v['stringValue'])) $val = $v['stringValue'];
            elseif (isset($v['booleanValue'])) $val = $v['booleanValue'];
            elseif (isset($v['integerValue'])) $val = (int)$v['integerValue'];
            elseif (isset($v['doubleValue'])) $val = $v['doubleValue'];
            $r[$k] = $val;
        }
        $id = basename($doc['name'] ?? '');
        if ($id !== '') $r['_id'] = $id;
        $rules[] = $r;
    }
    return ['rules' => $rules, 'source' => 'firestore'];
}

$fr = load_field_rules();
$fieldRules = $fr['rules'];
file_put_contents($logFile, date('Y-m-d H:i:s') . " - simulate-order by $uid service=$serviceId rules=" . count($fieldRules) . " src={$fr['source']}\n", FILE_APPEND);

// ---------- Matching de reglas por prioridad ----------
function rule_matches($rule, $fieldName, $serviceName) {
    if (!empty($rule['active']) === true) {} // active puede venir bool
    if (isset($rule['active']) && $rule['active'] === false) return false;
    $pattern = $rule['pattern'] ?? '';
    if ($pattern === '' ) return false;
    $scope = $rule['scope'] ?? 'fieldName';
    $target = $scope === 'serviceName' ? $serviceName : $fieldName;
    $matchType = $rule['matchType'] ?? 'exact';
    if ($matchType === 'exact') return strcasecmp($target, $pattern) === 0;
    if ($matchType === 'contains') return stripos($target, $pattern) !== false;
    if ($matchType === 'regex') { @ini_set('error_reporting', E_ERROR); return (bool)@preg_match($pattern, $target); }
    return false;
}

function find_rule($fieldRules, $fieldName, $serviceName) {
    $candidates = [];
    foreach ($fieldRules as $r) {
        if (rule_matches($r, $fieldName, $serviceName)) $candidates[] = $r;
    }
    usort($candidates, function ($a, $b) {
        $pa = isset($a['priority']) ? (int)$a['priority'] : 0;
        $pb = isset($b['priority']) ? (int)$b['priority'] : 0;
        if ($pa !== $pb) return $pb - $pa; // mayor prioridad primero
        // el comodín "*" siempre pierde frente a una regla concreta
        if (($a['pattern'] ?? '') === '*') return 1;
        if (($b['pattern'] ?? '') === '*') return -1;
        return strcmp($a['pattern'] ?? '', $b['pattern'] ?? '');
    });
    return $candidates[0] ?? null;
}

// ---------- Normalizar el servicio (con datos del proveedor si no viene en la petición) ----------
$svcName = $service['name'] ?? ('Servicio ' . $serviceId);
$customInput = $service['customInput'] ?? null;
$customFields = $service['customFields'] ?? [];
$category = strtolower($service['category'] ?? $values['category'] ?? 'imei');
$isImeiService = ($category === 'imei' || $category === 'unlock');

// ---------- Construir MODAL aplicando fieldRules con fallback ----------
$modalHtml = '';
$appliedRules = [];
$inputs = [];

if ($customInput || count($customFields) > 0) {
    $fieldName = $customInput['customName'] ?? ($customFields[0]['fieldname'] ?? '');
    $baseHint = $customInput['customInfo'] ?? ($customFields[0]['description'] ?? '');
    $rule = find_rule($fieldRules, $fieldName, $svcName);
    if ($rule && ($rule['pattern'] ?? '') !== '*') {
        $appliedRules[] = $rule['_id'] ?? $rule['pattern'];
        $label = $rule['label'] ?: $fieldName;
        $placeholder = $rule['placeholder'] ?: ($baseHint ?: $fieldName);
        $hint = $rule['hint'] ?: $baseHint;
        $inputType = $rule['inputType'] ?: 'text';
        $valid = [];
        if (!empty($rule['minLength'])) $valid[] = 'minlength=' . (int)$rule['minLength'];
        if (!empty($rule['maxLength'])) $valid[] = 'maxlength=' . (int)$rule['maxLength'];
        if (!empty($rule['regex'])) $valid[] = 'pattern="' . htmlspecialchars($rule['regex']) . '"';
        $inputs[] = ['name' => $fieldName, 'label' => $label, 'type' => $inputType, 'placeholder' => $placeholder, 'hint' => $hint, 'validation' => implode(' ', $valid), 'ruleId' => $rule['_id'] ?? null];
    } else {
        if ($rule) $appliedRules[] = ($rule['_id'] ?? 'wildcard') . ' (comodín → datos del proveedor tal cual)';
        // Fallback automático actual (NO quitar): datos del proveedor
        $inputs[] = ['name' => $fieldName, 'label' => $fieldName . ' *', 'type' => 'text', 'placeholder' => $baseHint ?: $fieldName, 'hint' => $baseHint, 'validation' => 'required', 'ruleId' => null];
    }
} else {
    $inputs[] = ['name' => 'IMEI', 'label' => 'IMEI / Número de Serie *', 'type' => 'text', 'placeholder' => '123456789012345', 'hint' => 'Marca *#06# en tu teléfono para ver el IMEI', 'validation' => 'required', 'ruleId' => null];
}

foreach ($inputs as $i) {
    $modalHtml .= '<div class="form-group"><label>' . htmlspecialchars($i['label']) . '</label>'
        . '<input type="' . htmlspecialchars($i['type']) . '" id="orderCustomField_0" name="' . htmlspecialchars($i['name']) . '"'
        . ' placeholder="' . htmlspecialchars($i['placeholder']) . '" ' . $i['validation'] . '>'
        . ($i['hint'] ? '<small>' . htmlspecialchars($i['hint']) . '</small>' : '') . '</div>';
}

// ---------- Construir XML con la MISMA lógica de place-order-dhru.php ----------
$imei = trim($values['imei'] ?? '');
$customField = trim($values['customField'] ?? '');
$username = trim($values['username'] ?? '');
$email = trim($values['email'] ?? '');
$quantity = (int)($values['quantity'] ?? 1);
$customFieldName = trim($values['customFieldName'] ?? ($inputs[0]['name'] ?? ''));
if ($isImeiService) $quantity = 1;

// xmlTagOverride de la regla aplicada (si existe) sustituye la etiqueta derivada del nombre
$appliedRuleForXml = null;
if (!empty($customField)) {
    $appliedRuleForXml = find_rule($fieldRules, $customFieldName, $svcName);
}

$identifier = $imei !== '' ? $imei : ($customField !== '' ? $customField : ($username !== '' ? $username : $email));

$xml = "<PARAMETERS><ID>$serviceId</ID>";

if ($isImeiService) {
    $xml .= "<IMEI>$identifier</IMEI><USERNAME>$identifier</USERNAME><EMAIL>$email</EMAIL>"
          . "<REFILL_LOGIN>$identifier</REFILL_LOGIN><LOGIN>$identifier</LOGIN><SN>$identifier</SN><SERIAL>$identifier</SERIAL>";
    if ($customField !== '' && $customFieldName !== '') {
        $cleanKey = strtoupper(preg_replace('/[^a-zA-Z0-9_]/', '_', $customFieldName));
        if ($appliedRuleForXml && !empty($appliedRuleForXml['xmlTagOverride'])) {
            $cleanKey = strtoupper(preg_replace('/[^a-zA-Z0-9_]/', '_', $appliedRuleForXml['xmlTagOverride']));
        }
        if (strpos($xml, "<$cleanKey>") === false) $xml .= "<$cleanKey>" . htmlspecialchars($customField) . "</$cleanKey>";
    }
} else {
    $xml .= "<EMAIL>$email</EMAIL>";
    if ($username !== '') $xml .= "<USERNAME>$username</USERNAME><LOGIN>$username</LOGIN>";
    $fieldValues = $values['fieldValues'] ?? $values['inputData'] ?? [];
    if (is_array($fieldValues)) {
        foreach ($fieldValues as $k => $v) {
            if (!empty($v)) {
                $ck = strtoupper(preg_replace('/[^a-zA-Z0-9_]/', '_', $k));
                $xml .= "<$ck>" . htmlspecialchars($v) . "</$ck>";
            }
        }
    }
    if ($customField !== '' && $customFieldName !== '') {
        $cleanKey = strtoupper(preg_replace('/[^a-zA-Z0-9_]/', '_', $customFieldName));
        if ($appliedRuleForXml && !empty($appliedRuleForXml['xmlTagOverride'])) {
            $cleanKey = strtoupper(preg_replace('/[^a-zA-Z0-9_]/', '_', $appliedRuleForXml['xmlTagOverride']));
        }
        if (strpos($xml, "<$cleanKey>") === false) $xml .= "<$cleanKey>" . htmlspecialchars($customField) . "</$cleanKey>";
    }
    if ($imei !== '' && strpos($xml, '<IMEI>') === false) $xml .= "<IMEI>$imei</IMEI>";
}

if ($quantity > 1) $xml .= "<QUANTITY>$quantity</QUANTITY>";
$xml .= "</PARAMETERS>";

echo json_encode([
    'success' => true,
    'dryRun' => true,
    'rulesSource' => $fr['source'],
    'rulesApplied' => $appliedRules,
    'modal' => ['html' => $modalHtml, 'inputs' => $inputs],
    'xml' => $xml,
    'notes' => [
        'identificador' => 'PRIORIDAD: IMEI > customField > username > email',
        'rama' => $isImeiService ? 'IMEI/unlock (todos los campos)' : 'licencia/crédito/remoto (EMAIL + fieldValues)',
    ]
]);
?>
