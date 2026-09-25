<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$logFile = __DIR__ . '/dhru-errors.log';

try {
    require_once __DIR__ . '/config-dhru.php';

    $rawInput = file_get_contents('php://input');
    file_put_contents($logFile, date('Y-m-d H:i:s') . " - Request: " . $rawInput . "\n", FILE_APPEND);

    $data = json_decode($rawInput, true);

    if (!$data) {
        echo json_encode(['success' => false, 'error' => 'No data received']);
        exit;
    }

    $serviceId = $data['serviceId'] ?? '';
    $username = $data['username'] ?? '';
    $quantity = $data['quantity'] ?? 1;
    $email = $data['email'] ?? '';
    $imei = $data['imei'] ?? '';
    $category = $data['category'] ?? '';

    // Leer el campo personalizado (ECID, SERIAL NUMBER, etc.)
    $customField = trim($data['customField'] ?? '');
    $customFieldName = trim($data['customFieldName'] ?? '');

    // Para servicios IMEI, siempre cantidad = 1
    if (strtolower($category) === 'imei' || strtolower($category) === 'unlock') {
        $quantity = 1;
    }

    if (!$serviceId) {
        echo json_encode(['success' => false, 'error' => 'Missing serviceId']);
        exit;
    }

    // PASO 1: Obtener detalles del servicio
    $xmlParams = "<PARAMETERS><ID>$serviceId</ID></PARAMETERS>";

    $postData = [
        'username' => DHru_USERNAME,
        'apiaccesskey' => DHru_API_KEY,
        'action' => 'getimeiservicedetails',
        'requestformat' => 'JSON',
        'parameters' => $xmlParams
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, DHRUFUSION_URL . '/api/index.php');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    curl_close($ch);

    $serviceDetails = json_decode($response, true);
    file_put_contents($logFile, date('Y-m-d H:i:s') . " - Service Details: " . json_encode($serviceDetails) . "\n", FILE_APPEND);

    $minQty = 1;
    $maxQty = 999;

    if ($serviceDetails && isset($serviceDetails['SUCCESS'])) {
        $list = $serviceDetails['SUCCESS'][0]['LIST'] ?? [];
        $minQty = isset($list['minqnt']) ? (int)$list['minqnt'] : 1;
        $maxQty = isset($list['maxqnt']) ? (int)$list['maxqnt'] : 999;

        if ($minQty <= 0) $minQty = 1;
        if ($maxQty <= 0 || $maxQty < $minQty) $maxQty = 999;
        file_put_contents($logFile, date('Y-m-d H:i:s') . " - minQty: $minQty, maxQty: $maxQty\n", FILE_APPEND);
    }

    // PASO 2: Validar cantidad (excepto para IMEI que siempre es 1)
    $isImeiService = strtolower($category) === 'imei' || strtolower($category) === 'unlock';

    if (!$isImeiService && ($quantity < $minQty || $quantity > $maxQty)) {
        echo json_encode([
            'success' => false,
            'error' => "ValidationError123Mal Ingrese Cantidad range - Min: $minQty, Max: $maxQty"
        ]);
        exit;
    }

    if ($isImeiService) {
        file_put_contents($logFile, date('Y-m-d H:i:s') . " - IMEI service: skipping quantity validation (quantity=$quantity)\n", FILE_APPEND);
    }

    // PASO 3: Identificador principal. PRIORIDAD: IMEI > CUSTOM FIELD > USERNAME > EMAIL
    $identifier = !empty($imei) ? $imei : (!empty($customField) ? $customField : (!empty($username) ? $username : $email));

    // PASO 4: Construir XML inteligente según detalles del servicio
    $isImeiService = strtolower($category) === 'imei' || strtolower($category) === 'unlock';

    $serviceInfo = $serviceDetails['SUCCESS'][0]['LIST'] ?? [];
    $imeiSingle = $serviceInfo['imei_single'] ?? '0';
    $imeiBulk = $serviceInfo['imei_bulk'] ?? '0';
    $imeiCustom = $serviceInfo['imei_custom'] ?? '0';

    $xmlParams = "<PARAMETERS>";
    $xmlParams .= "<ID>$serviceId</ID>";

    if ($isImeiService || ($imeiSingle == '1' || $imeiBulk == '1' || $imeiCustom == '1')) {
        // Servicio requiere IMEI/username: enviar todos los campos
        file_put_contents($logFile, date('Y-m-d H:i:s') . " - Service requires IMEI/USERNAME: Sending all fields\n", FILE_APPEND);
        $xmlParams .= "<IMEI>$identifier</IMEI>";
        $xmlParams .= "<USERNAME>$identifier</USERNAME>";
        $xmlParams .= "<EMAIL>$email</EMAIL>";
        $xmlParams .= "<REFILL_LOGIN>$identifier</REFILL_LOGIN>";
        $xmlParams .= "<LOGIN>$identifier</LOGIN>";
        $xmlParams .= "<SN>$identifier</SN>";
        $xmlParams .= "<SERIAL>$identifier</SERIAL>";

        // Inyectar el campo personalizado con su propia etiqueta (ECCID, SERIAL_NUMBER...)
        if (!empty($customField) && !empty($customFieldName)) {
            $cleanKey = strtoupper(preg_replace('/[^a-zA-Z0-9_]/', '_', $customFieldName));
            if (strpos($xmlParams, "<$cleanKey>") === false) {
                $xmlParams .= "<$cleanKey>" . htmlspecialchars($customField) . "</$cleanKey>";
            }
        }
    } else {
        // Servicio de licencia/créditos/remoto: enviar EMAIL, USERNAME y campos personalizados
        file_put_contents($logFile, date('Y-m-d H:i:s') . " - License/Credit/Remote Service: Sending email, username and custom fields\n", FILE_APPEND);
        $xmlParams .= "<EMAIL>$email</EMAIL>";

        if (!empty($username)) {
            $xmlParams .= "<USERNAME>$username</USERNAME>";
            $xmlParams .= "<LOGIN>$username</LOGIN>";
        }

        $customFields = $data['fieldValues'] ?? $data['inputData'] ?? [];
        if (is_array($customFields) && !empty($customFields)) {
            file_put_contents($logFile, date('Y-m-d H:i:s') . " - Adding custom fields to XML: " . json_encode($customFields) . "\n", FILE_APPEND);
            foreach ($customFields as $key => $value) {
                if (!empty($value)) {
                    $cleanKey = preg_replace('/[^a-zA-Z0-9_]/', '_', $key);
                    $xmlParams .= "<" . strtoupper($cleanKey) . ">" . htmlspecialchars($value) . "</" . strtoupper($cleanKey) . ">";
                }
            }
        }

        // Si el frontend mandó customField suelto, inyectarlo también aquí
        if (!empty($customField) && !empty($customFieldName)) {
            $cleanKey = strtoupper(preg_replace('/[^a-zA-Z0-9_]/', '_', $customFieldName));
            if (strpos($xmlParams, "<$cleanKey>") === false) {
                $xmlParams .= "<$cleanKey>" . htmlspecialchars($customField) . "</$cleanKey>";
            }
        }

        if (!empty($imei) && strpos($xmlParams, '<IMEI>') === false) {
            $xmlParams .= "<IMEI>$imei</IMEI>";
        }
    }

    if ($quantity > 1) {
        $xmlParams .= "<QUANTITY>$quantity</QUANTITY>";
    }

    $xmlParams .= "</PARAMETERS>";

    file_put_contents($logFile, date('Y-m-d H:i:s') . " - Action: placeimeiorder, XML: " . $xmlParams . "\n", FILE_APPEND);

    $postData = [
        'username' => DHru_USERNAME,
        'apiaccesskey' => DHru_API_KEY,
        'action' => 'placeimeiorder',
        'requestformat' => 'JSON',
        'parameters' => $xmlParams
    ];

    // PASO 5: Enviar a DHru
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, DHRUFUSION_URL . '/api/index.php');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    curl_close($ch);

    $result = json_decode($response, true);
    file_put_contents($logFile, date('Y-m-d H:i:s') . " - Response: " . json_encode($result) . "\n", FILE_APPEND);

    // PASO 6: Procesar respuesta
    if ($result === false || $result === null) {
        echo json_encode(['success' => false, 'error' => 'API returned empty response']);
        exit;
    }

    if (isset($result['SUCCESS']) && is_array($result['SUCCESS'])) {
        $successData = $result['SUCCESS'][0] ?? $result['SUCCESS'];
        echo json_encode([
            'success' => true,
            'refId' => $successData['REFERENCEID'] ?? null,
            'message' => $successData['MESSAGE'] ?? 'Success',
            'raw' => $result
        ]);
        exit;
    }

    if (isset($result['STATUS']) && $result['STATUS'] === 'SUCCESS') {
        echo json_encode([
            'success' => true,
            'refId' => $result['REFERENCEID'] ?? null,
            'message' => $result['MESSAGE'] ?? 'Success',
            'raw' => $result
        ]);
        exit;
    }

    if (isset($result['ERROR'])) {
        $errorMsg = is_array($result['ERROR']) ? implode(', ', array_column($result['ERROR'], 'MESSAGE')) : $result['ERROR'];
        echo json_encode(['success' => false, 'error' => strip_tags($errorMsg), 'raw' => $result]);
        exit;
    }

    echo json_encode(['success' => false, 'error' => 'Unknown response', 'raw' => $result]);

} catch (Exception $e) {
    file_put_contents($logFile, date('Y-m-d H:i:s') . " - Exception: " . $e->getMessage() . "\n", FILE_APPEND);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}
?>
