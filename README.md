# ServiciosGF — Plataforma de Servicios GSM

Plataforma web de venta de servicios GSM (registros IMEI/SN, licencias, créditos,
remotos, rent tools y streaming) que revende del proveedor **JonartGSM** (API
Dhru Fusion). Frontend HTML/JS + Firebase (Auth/Firestore), backend PHP en `api/`
y bot de notificaciones Node en `telegram-bot/`.

## Requisitos
- PHP 7.4+ con extensión cURL
- Node.js 16+
- Apache o Nginx (con soporte PHP) para el backend `api/`
- Composer (solo si se usa el backend alternativo Node en `serviciosgf-api/`)
- Cuenta Firebase (Auth + Firestore) y cuenta de revendedor en JonartGSM

## Instalación paso a paso
1. Subir el proyecto a tu hosting (o `git clone`).
2. Dar permisos de escritura a `api/` (para `dhru-errors.log`).
3. Configurar `api/config-dhru.php` con usuario y API key REALES del panel JonartGSM
   (nunca subir credenciales reales al repositorio).
4. Copiar `.env.example` a `.env` y completar las variables del bot y cron jobs.
5. En Firebase Console: crear proyecto, activar Email/Password, crear Firestore y
   pegar la configuración web en los bloques `firebaseConfig` de las páginas.
6. (Opcional) `cd telegram-bot && npm install && node bot.js`.

## Configuración
### Firebase
Reemplaza `apiKey/authDomain/projectId` en cada página HTML y en `app.js` con los
valores de tu proyecto. Las claves de servicio (SDK JSON) solo van en el servidor:
cron jobs leen `FIREBASE_CREDENTIALS` desde variables de entorno.

### Dhru Fusion (JonartGSM)
- Endpoint: `https://jonartgsm.com/api/index.php`
- Acciones usadas: `getservices`, `getimeiservicedetails`, `placeimeiorder`, `getdetail`.
- Credenciales: constantes `DHru_USERNAME` / `DHru_API_KEY` en `api/config-dhru.php`.
- Ver [MAPEO-SERVICIOS.md](MAPEO-SERVICIOS.md) y [REGLAS-NUEVOS-SERVICIOS.md](REGLAS-NUEVOS-SERVICIOS.md).

### Bot de Telegram
- `TELEGRAM_BOT_TOKEN` y `TELEGRAM_ADMIN_ID` se leen de `process.env` (fallback a
  placeholder). Crear el bot con @BotFather y agregarlo al chat de avisos.

## Estructura del proyecto
```
├── api/                  # Backend PHP (pedidos DHru, lista de servicios, config)
│   ├── place-order-dhru.php   # Coloca pedidos (XML <PARAMETERS> → placeimeiorder)
│   ├── dhru-services.php      # Catalogo de servicios JonartGSM + mapeo campos dinamicos
│   ├── config-dhru.php        # Credenciales (placeholders en el repo)
│   └── dhru-errors.log        # Log generado en produccion
├── app.js                # Logica compartida (auth, notificaciones Telegram)
├── registros-imei.html   # Tienda IMEI/SN + modal de pedido + submitOrder/dhruData
├── licencias-creditos.html / remotos-rent-tools.html / servicios-streaming.html
├── admin-*.html          # Paneles de administracion
├── telegram-bot/bot.js   # Bot Node (credenciales via .env)
├── cron-jobs/            # Verificacion periodica de pedidos
├── netlify/functions/    # Pruebas gratuitas (descatalogado, no usar)
└── serviciosgf-api/      # Backend Express alternativo (Render)
```

## Solución de problemas comunes
| Problema | Causa / Solución |
|---|---|
| Error **"IP Unauthorized" / IPv6 no autorizada** | JonartGSM lista IP por IP. Entra al panel del proveedor → *My Account → IP List* y resetea/agrega la IP publica actual del servidor (incluida la IPv6 si PHP resuelve por IPv6). |
| Pedido falla con campo personalizado obligatorio (Motorola, Rent Tools: "IMEI A PONER", IP, SN, MODELO) | El servicio exige etiquetas extra: revisa en `api/dhru-errors.log` el XML generado; deben ir en MAYUSCULAS con `_` (`[^a-zA-Z0-9_]`→`_`) y valor no vacio. Ver MAPEO-SERVICIOS.md. |
| Respuesta extrana de DHru | Revisa SIEMPRE `api/dhru-errors.log`: registra request, detalles del servicio, XML final y respuesta cruda. |
| Modal muestra "*#06#*" en un servicio ECID/SERIAL | Falta el mapeo `imei_custom_info` en `api/dhru-services.php` (rama custom del modal en registros-imei.html). |
| Saldo no descuenta / pedido duplicado | El cobro es en Firestore (collection `transactions`); verifica reglas de seguridad y que `orders` tenga `dhruRefId`. |

## Seguridad
- Credenciales reales SOLO en `api/config-dhru.php` (producción) y variables de entorno.
- Este repositorio NO debe contener nunca: `service-account.json`, `serviceAccountKey.json`, `.env` ni tokens hardcodeados.
