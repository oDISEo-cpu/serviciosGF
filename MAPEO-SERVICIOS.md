# MAPEO DE SERVICIOS — JonartGSM (Dhru Fusion) ↔ ServiciosGF

## Tabla 1: Campo Dhru → Frontend → Backend → XML

| Campo Dhru (API) | Variable frontend | Variable backend (PHP) | Etiqueta XML enviada |
|---|---|---|---|
| `ID` | `currentOrderService.serviceId` / `.id` → `dhruData.serviceId` | `$serviceId` | `<ID>` |
| `SERVICE_NAME` | `currentOrderService.name` | — (solo log/respuesta) | — |
| `PRICE` | `currentOrderService.price` | — (cobro por saldo Firebase) | — |
| `minqnt` / `maxqnt` | `minQty` / `maxQty` (validación de cantidad) | `$minQty` / `$maxQty` | — (validación previa) |
| `imei_single` (=1) | rama IMEI del modal (`orderIMEI`) | `$imeiSingle` → condición rama IMEI | `<IMEI>`, `<USERNAME>`, `<SN>`, `<SERIAL>`, `<LOGIN>`, `<REFILL_LOGIN>` con el identificador |
| `imei_bulk` (=1) | igual que imei_single (lista masiva) | `$imeiBulk` → condición rama IMEI | mismas etiquetas + `<QUANTITY>` si qty>1 |
| `imei_custom` (=1) | input dinámico `orderCustomField_0` → `customFieldValue` | `$customField` | `<IMEI>` (identifier) + etiqueta propia `<{CUSTOMNAME}>` |
| `imei_custom_name` | `customInput.customName` → `customFieldName` → `dhruData.customFieldName` | `$customFieldName` → `$cleanKey` (mayúsculas, `[^a-zA-Z0-9_]`→`_`) | nombre de la etiqueta inyectada, p. ej. `<ECCID>` |
| `imei_custom_info` | `customInput.customInfo` (hint en "Información requerida") | — (no viaja al XML) | — |
| `custom_name` | fallback de `customInput.customName` | idem `$customFieldName` | idem etiqueta inyectada |
| `customFields[]` (múltiples) | `customFields[i].fieldname/.description` → inputs `orderCustomField_i`; se agrupan en `fieldValues`/`inputData` | `$data['fieldValues'] ?? $data['inputData']` → `$customFields` | una etiqueta por clave: `<{KEY_MAYUSCULA}>valor</...>` |
| email del usuario | `currentUser.email` → `dhruData.email` | `$email` | `<EMAIL>` |
| username (licencias/créditos) | `orderUsername` | `$username` | `<USERNAME>` + `<LOGIN>` |

## Tabla 2: Decisión de ramas en `api/place-order-dhru.php`

| Condición | Rama | Etiquetas XML resultantes |
|---|---|---|
| `category == 'imei'` o `'unlock'` **o** `imei_single=1` **o** `imei_bulk=1` **o** `imei_custom=1` | **RAMA IMEI** | identifier (prioridad `IMEI > customField > username > email`) duplicado en `<IMEI>/<USERNAME>/<REFILL_LOGIN>/<LOGIN>/<SN>/<SERIAL>`, más `<EMAIL>` y la etiqueta personalizada `<{CUSTOMNAME}>` si existe |
| Cualquier otro servicio (licencia, crédito, remoto, rent tool sin flags IMEI) | **RAMA LICENCIA/CRÉDITO/REMOTO** | `<EMAIL>`, `<USERNAME>`+`<LOGIN>` (si hay username), cada clave no vacía de `fieldValues`/`inputData` como `<{CLAVE}>`, `customField` suelto como `<{CUSTOMNAME}>`, y `<IMEI>` solo si venía uno explícito |
| `quantity > 1` (nunca en rama IMEI, forzada a 1) | ambas | añade `<QUANTITY>` |

## Log
Todos los pasos (request, detalles del servicio, XML final, respuesta) se registran en `api/dhru-errors.log`.
