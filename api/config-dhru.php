<?php
// ============================================================
// Configuración de Dhru Fusion (JonartGSM) - ServiciosGF
// ------------------------------------------------------------
// ESTE ARCHIVO CONTIENE PLACEHOLDERS. Coloca aquí tus
// credenciales reales SOLO en el servidor de producción y
// nunca las subas a un repositorio público.
// ============================================================

// Valores por defecto (fallback). NO eliminar: se usan si el JSON dinámico no existe.
define('DHRUFUSION_URL_DEFAULT', 'https://jonartgsm.com');
define('DHru_USERNAME_DEFAULT', 'TU_USUARIO_DHRU');
define('DHru_API_KEY_DEFAULT', 'TU_API_KEY_DHRU_AQUI');

// ============================================================
// CENTRO DE CONTROL DINÁMICO: si api/.dhru-config.json existe
// (gestionado desde admin-config.html via admin-config.php),
// sus valores tienen prioridad sobre las constantes de arriba.
// Si el archivo no existe o está incompleto, se usa el
// fallback de constantes → comportamiento idéntico al anterior.
// ============================================================
$dhruDynamicConfigFile = __DIR__ . '/.dhru-config.json';
$dhruDyn = [];
if (is_file($dhruDynamicConfigFile)) {
    $dhruRaw = @file_get_contents($dhruDynamicConfigFile);
    $decoded = $dhruRaw ? json_decode($dhruRaw, true) : null;
    if (is_array($decoded)) $dhruDyn = $decoded;
}

define('DHRUFUSION_URL', !empty($dhruDyn['url']) ? rtrim($dhruDyn['url'], '/') : DHRUFUSION_URL_DEFAULT);
define('DHru_USERNAME', !empty($dhruDyn['username']) ? $dhruDyn['username'] : DHru_USERNAME_DEFAULT);
define('DHru_API_KEY', !empty($dhruDyn['apiKey']) ? $dhruDyn['apiKey'] : DHru_API_KEY_DEFAULT);
?>
