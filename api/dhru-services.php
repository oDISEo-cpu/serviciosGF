<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// ============================================================
// dhru-services.php — Lista de servicios de JonartGSM (Dhru Fusion)
// Flujo: getservices → se mapean imei_single / imei_bulk /
// imei_custom / imei_custom_name / imei_custom_info / custom_name /
// customFields hacia el objeto JSON que consume el frontend
// (registros-imei.html pinta categorías, modal y campos dinámicos).
// ============================================================

$logFile = __DIR__ . '/dhru-errors.log';

try {
    require_once __DIR__ . '/config-dhru.php';

    $action = $_GET['action'] ?? 'getservices';

    $postData = [
        'username' => DHru_USERNAME,
        'apiaccesskey' => DHru_API_KEY,
        'action' => $action,
        'requestformat' => 'JSON',
        'parameters' => '<PARAMETERS></PARAMETERS>'
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, DHRUFUSION_URL . '/api/index.php');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    curl_close($ch);

    $result = json_decode($response, true);

    if (!$result || !isset($result['SUCCESS'])) {
        file_put_contents($logFile, date('Y-m-d H:i:s') . " - dhru-services ERROR: " . $response . "\n", FILE_APPEND);
        echo json_encode(['success' => false, 'error' => 'No services returned', 'raw' => $result]);
        exit;
    }

    $categories = [];
    foreach ($result['SUCCESS'] as $cat) {
        $catName = $cat['CATEGORYNAME'] ?? ($cat['name'] ?? '');
        $services = [];

        foreach (($cat['LIST'] ?? []) as $svc) {
            // ---- MAPEO C7: campos personalizados del proveedor ----
            // imei_custom == '1' => el servicio exige UN campo personalizado
            // (ECID, SERIAL NUMBER, MODELO...). El hint visible al cliente
            // debe ser imei_custom_info (ej: "Copialo desde la tool"),
            // NO el texto genérico del IMEI.
            $customInput = null;
            if (($svc['imei_custom'] ?? '0') == '1') {
                $customInput = [
                    'customName' => $svc['imei_custom_name'] ?? ($svc['custom_name'] ?? ''),
                    'customInfo' => $svc['imei_custom_info'] ?? '',   // hint del proveedor (C7)
                    'required' => true
                ];
            }

            // Campos personalizados múltiples (si el proveedor los envía)
            $customFields = [];
            if (!empty($svc['customFields']) && is_array($svc['customFields'])) {
                foreach ($svc['customFields'] as $cf) {
                    $customFields[] = [
                        'fieldname' => $cf['fieldname'] ?? ($cf['name'] ?? ''),
                        'description' => $cf['description'] ?? ($cf['hint'] ?? ''), // fallback de hint (C7)
                        'required' => ($cf['required'] ?? '1') == '1'
                    ];
                }
            }

            $services[] = [
                'serviceId' => $svc['ID'] ?? ($svc['id'] ?? ''),
                'name' => $svc['SERVICE_NAME'] ?? ($svc['name'] ?? ''),
                'category' => strtolower(preg_replace('/[^a-z0-9]+/i', '_', $catName)) ?: 'imei',
                'categoryName' => $catName,
                'price' => $svc['PRICE'] ?? ($svc['price'] ?? 0),
                'minQty' => $svc['minqnt'] ?? 1,
                'maxQty' => $svc['maxqnt'] ?? 999,
                'imeiSingle' => $svc['imei_single'] ?? '0',
                'imeiBulk' => $svc['imei_bulk'] ?? '0',
                'imeiCustom' => $svc['imei_custom'] ?? '0',
                'customInput' => $customInput,      // frontend: currentOrderService.customInput
                'customFields' => $customFields,    // frontend: currentOrderService.customFields
                'description' => $svc['DESCRIPTION'] ?? ''
            ];
        }

        $categories[] = ['category' => $catName, 'services' => $services];
    }

    echo json_encode(['success' => true, 'categories' => $categories]);

} catch (Exception $e) {
    file_put_contents($logFile, date('Y-m-d H:i:s') . " - dhru-services Exception: " . $e->getMessage() . "\n", FILE_APPEND);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}
?>
