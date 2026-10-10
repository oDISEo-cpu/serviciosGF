# 🎯 Recomendaciones de Producción - ServiciosGF

Guía práctica basada en **incidentes reales ocurridos en producción**. Léela antes de
desplegar, y revísala cada vez que cambies de servidor, añadas servicios o reportes un
pedido fallido. Documentos complementarios:
[MAPEO-SERVICIOS.md](MAPEO-SERVICIOS.md) (cadena campo Dhru → frontend → backend → XML) y
[REGLAS-NUEVOS-SERVICIOS.md](REGLAS-NUEVOS-SERVICIOS.md) (checklist para servicios nuevos).

---

## 🔴 CRÍTICO: Configuración de IP en JonartGSM (IPv6)

**Incidente real:** al mover el proyecto a un servidor nuevo, todos los pedidos fallaron con:

```
Your server's IP [2a02:c207:xxxx::1] is not authorized
```

JonartGSM autoriza llamadas a la API **IP por IP**. Los servidores modernos (contenedores,
VPS europeos) suelen resolver primero por **IPv6**, y esa IPv6 no estaba en la whitelist del
panel — aunque la IPv4 sí lo estuviera.

### Síntomas
- Cualquier acción (`getservices`, `placeimeiorder`) devuelve error de IP no autorizada.
- En `api/dhru-errors.log` la "Response" cruda muestra el mensaje con la IP entre corchetes.

### Solución paso a paso
1. Copia la IP exacta que aparece en el error del log (normalmente la IPv6).
2. Entra a **jonartgsm.com → Settings → API** (área de revendedor).
3. Usa **Reset IP / Renew** para registrar la IP actual del servidor.
4. Repite el proceso si el panel solo acepta una IP y tu servidor rota entre IPv4/IPv6
   (fija la salida a IPv4 en PHP/Apache o agrega ambas).
5. Prueba de nuevo: `getservices` debe responder sin error de autorización.

### ⚠️ Regla de oro
> **Repetir Reset IP / Renew CADA vez que se cambie de servidor o hosting.**
> Es la causa nº 1 de "todo funcionaba y dejó de funcionar" tras una migración.

Comandos útiles para conocer tus IPs de salida antes de configurar la whitelist:

```bash
curl -4 ifconfig.me; echo
curl -6 ifconfig.me; echo
```

---

## 🟡 Campos personalizados en servicios

**Incidente real:** servicios Motorola / Rent Tools exigían campos obligatorios
(*IMEI A PONER*, *IP*, *SN*, *MODELO*). El XML solo llevaba `ID` + `EMAIL` y el proveedor
respondía **"X es obligatorio"**.

### Cómo funciona el mapeo dinámico (ya implementado)
- El frontend envía los inputs dinámicos del modal como `fieldValues` / `inputData`.
- El backend (`api/place-order-dhru.php`) los inyecta en el XML como **etiquetas
  MAYÚSCULAS**, limpiando el nombre con `[^a-zA-Z0-9_]` → `_`:

```
"I MEI A PONER"  →  <I_MEI_A_PONER>valor</I_MEI_A_PONER>
"SN Number"      →  <SN_Number...  →  <SN_NUMBER>
```

- Para servicios con `imei_custom=1` (iBerry/iHello piden **ECID**; FRPFILE pide
  **SERIAL NUMBER**), el valor viaja **doble**: como `<IMEI>` (identificador principal)
  y además con su etiqueta propia (`<ECCID>`, `<SERIAL_NUMBER>`).
- Prioridad del identificador principal: **IMEI > customField > username > email**.
  Por eso un email NUNCA debe terminar dentro de `<IMEI>`.

La cadena completa campo→variable→etiqueta XML está en
[MAPEO-SERVICIOS.md](MAPEO-SERVICIOS.md).

### Qué hacer si un servicio nuevo falla con "X es obligatorio"
1. Busca el pedido en el log y copia el XML final generado:

```bash
grep -n "Action: placeimeiorder" api/dhru-errors.log | tail -5
tail -c 8000 api/dhru-errors.log   # ver request + XML + respuesta del ultimo pedido
```

2. Verifica que la etiqueta exigida (en mayúsculas con `_`) esté presente y con valor.
3. Si el frontend no la envió, revisa que el modal haya pintado el campo desde
   `customFields[]` / `customInput` que devuelve `api/dhru-services.php`.
4. **No hace falta tocar código** para servicios con un solo campo personalizado:
   el pipeline ya lo soporta automáticamente (ver REGLAS-NUEVOS-SERVICIOS.md).

### Campos soportados automáticamente
| Caso | Qué ocurre sin tocar código |
|---|---|
| Servicio con 1 campo personalizado (`imei_custom=1`) | Valor va como `<IMEI>` + etiqueta propia derivada de `imei_custom_name` |
| Servicio con N campos (Motorola, Rent Tools) | Cada input del modal se inyecta como etiqueta MAYÚSCULA si el valor no está vacío |
| IMEI puro | Flujo clásico `IMEI/USERNAME/EMAIL/...` intacto |
| Licencias/créditos/remotos | Rama `else`: EMAIL + USERNAME + fieldValues |

---

## 🟢 Notificaciones de Telegram

Las notificaciones de pedidos nuevos las envía `notifyNewOrder` (en `app.js` y en la
versión local de `registros-imei.html`). **Regla documentada del incidente #4:** el mensaje
muestra el **nombre real del campo** (`📝 ECCID: TEST123`), no un genérico `Campo:` —
si ves "Campo:" con un valor ECID, falta el pase de `customFieldName` (C3–C6).

### Configuración
1. Crea el bot con **@BotFather** → `/newbot` → copia el token (formato `123456:AA...`).
2. Obtén tu **Chat ID** (el del grupo/de canal de avisos):

```bash
curl "https://api.telegram.org/botTU_TOKEN_DE_TELEGRAM/getUpdates"
```

3. Configura los placeholders/variables según corresponda:

```bash
# telegram-bot/.env
TELEGRAM_BOT_TOKEN=TU_TOKEN_DE_TELEGRAM
TELEGRAM_ADMIN_ID=TU_ID_DE_ADMIN
```

### Qué se notifica
Pedidos nuevos (servicio, precio, usuario comprador, identificador IMEI/IP/SN y el campo
personalizado con su nombre real).

### Depuración si no llegan
- Verifica token y chat id: `curl "https://api.telegram.org/botTU_TOKEN_DE_TELEGRAM/getMe"`.
- Revisa la consola del navegador (las notificaciones se disparan desde el frontend tras
  respuesta `success:true` del backend).
- Confirma que el bot esté **miembro del grupo** y con permiso de escribir.
- Si el pedido falló antes de `success`, no hay notificación: primero resuelve el pedido
  mirando `api/dhru-errors.log`.

---

## 🔵 Respaldo y recuperación

**Incidente real (#5):** se perdió un VPS completo por **impago** — el proveedor borró la
máquina. La operación sobrevivió por dos decisiones:
- La **base de datos vive en Firebase** (Firestore/Auth, en la nube): no se perdió nada.
- El **código estaba en el repositorio** (+ ZIP de limpieza): se redeployó en minutos.

### Lecciones convertidas en reglas
1. **Pago automático activado** en el proveedor de hosting + alertas de facturación.
2. **Respaldos mensuales FUERA del servidor** (un backup en la misma máquina que puede
   borrarse no es un backup).
3. **El repo es la fuente de verdad**: todo cambio relevante se commitea; los secretos
   NO van al repo (ver sección 🟤).

### Cron semanal de zip en el servidor

```bash
# /etc/cron.weekly/serviciosgf-backup
#!/bin/bash
tar -czf /backups/serviciosgf-$(date +%F).tar.gz -C /var/www serviciosgf
find /backups -name 'serviciosgf-*.tar.gz' -mtime +30 -delete
```

```bash
chmod +x /etc/cron.weekly/serviciosgf-backup
```

### Descarga mensual fuera del servidor (scp)

```bash
scp -r usuario@TU_SERVIDOR:/backups/serviciosgf-*.tar.gz ~/respaldos-locales/
```

### Firebase como base de datos en la nube
Los usuarios, saldos, transacciones y pedidos están en Firestore: **no se pierden con el
VPS**. Aun así, exporta periódicamente desde Firebase Console (o con `firebase-tools`)
para tener copia puntual de colecciones críticas (`users`, `transactions`, `orders`).

---

## 🟣 Logs y monitoreo

`api/dhru-errors.log` es la **herramienta principal de diagnóstico** (incidente #6). Por
cada pedido registra, en orden:
1. **Request** crudo recibido del frontend (JSON con serviceId, imei, customField…).
2. **Service Details**: respuesta de `getimeiservicedetails` (minqnt/maxqnt/imei_*).
3. **XML final** enviado en la acción `placeimeiorder`.
4. **Response** cruda del proveedor (SUCCESS/ERROR).

### Comandos útiles

```bash
# Ver en vivo mientras haces una prueba de pedido
tail -f api/dhru-errors.log

# Pedidos del día actual
grep "$(date +%Y-%m-%d)" api/dhru-errors.log

# Solo errores recientes
grep -n "ERROR\|error" api/dhru-errors.log | tail -20

# El XML de un servicio concreto
grep -n "ID>99599<" api/dhru-errors.log | tail -5
```

### Rotación del log

```bash
# /etc/logrotate.d/serviciosgf
/var/www/serviciosgf/api/dhru-errors.log {
    weekly
    rotate 8
    compress
    missingok
    notifempty
    create 664 www-data www-data
}
```

### Monitoreo recomendado
- **Alertas por frecuencia de ERROR**: si aparecen >N errores en 10 min, algo está roto
  (IP, saldo o validación). Un cron simple puede notificarlo al mismo bot de Telegram.

```bash
*/10 * * * * grep -c "$(date '+%Y-%m-%d %H')" /var/www/serviciosgf/api/dhru-errors.log
```

- **Revisión de saldo** en el panel de JonartGSM diariamente: pedidos con "No tienes
  suficiente saldo" implican pérdidas de ventas inmediatas.
- No dejes que el log crezca indefinido en el repo ni publique datos de clientes: es
  archivo de servidor, con permisos restringidos.

---

## 🟤 Seguridad

### Archivos que NUNCA van al repositorio
| Archivo | Motivo |
|---|---|
| `api/service-account.json` | Credenciales Firebase SDK (privilege escalado) |
| `telegram-bot/serviceAccountKey.json` | Ídem, junto al bot |
| `.env` | Tokens del bot, IDs de admin, credenciales de nube |
| `api/config-dhru.php` **con claves reales** | Da acceso directo a gastar tu saldo DHru |

En el repo solo deben existir sus **placeholders** (`TU_USUARIO_DHRU`,
`TU_API_KEY_DHRU_AQUI`, `TU_TOKEN_DE_TELEGRAM`, `TU_ID_DE_ADMIN`).

### Comando de verificación antes de cada push

```bash
cd /ruta/del/proyecto
grep -rn "apiaccesskey\s*=\s*['\"][A-Z0-9-]\{11,\}" . --include='*.php' --include='*.js' --include='*.html'
grep -rn "serviceaccount\|private_key\|AIzaSy" . --include='*.json' --exclude-dir=node_modules
git ls-files | grep -E '\.env$|service-account\.json|serviceAccountKey\.json'
```

Los tres comandos deben devolver **vacío** (salvo placeholders evidentes).

### Dónde vive cada credencial en producción
| Credencial | Ubicación correcta |
|---|---|
| Usuario + API key DHru | `api/config-dhru.php` en el servidor (fuera del repo) |
| Token bot + Chat ID admin | Variables de entorno del bot (`telegram-bot/.env` o systemd) |
| Firebase Web config | Frontend público (apiKey web es pública por diseño); las Service Accounts solo en servidor |
| Log de pedidos | `api/dhru-errors.log` con permisos 664 y sin exposición pública innecesaria |

Además: **rota la API key de DHru** si alguna vez se expuso (estuvo hardcodeada en
pruebas antiguas de Netlify; esas funciones están descatalogadas).

---

## ⚫ Actualizaciones y mantenimiento

- **Servicios nuevos de JonartGSM no requieren código**: el catálogo se jala dinámicamente
  vía `api/dhru-services.php` y el modal arma los campos desde `customInput/customFields`.
  Aplica el checklist de [REGLAS-NUEVOS-SERVICIOS.md](REGLAS-NUEVOS-SERVICIOS.md).
- **Actualización del sitio vía git:**

```bash
cd /var/www/serviciosgf
git pull origin main
```

- **Reinicio de servicios tras actualizar** (PHP opcache / bot Node):

```bash
sudo systemctl restart apache2   # o: sudo systemctl restart php8.2-fpm
cd telegram-bot && pm2 restart bot || node bot.js &
```

- Mantén `node_modules` del bot al día solo cuando `package.json` cambie:
  `npm install --production`.

---

## ⚪ Checklist pre-despliegue

Marca todas las casillas antes de dar tráfico real a un servidor nuevo:

- [ ] **Reset IP / Renew en JonartGSM** con la IP (v4 y v6) del servidor nuevo.
- [ ] `api/config-dhru.php` con credenciales REALES (y nunca commiteadas).
- [ ] `.env` completo (copiado desde `.env.example`): bot, admin id, Firebase.
- [ ] `service-account.json` colocado en `api/` y `telegram-bot/` (solo en servidor).
- [ ] Permisos correctos:

```bash
chmod 755 api/
touch api/dhru-errors.log && chmod 664 api/dhru-errors.log
```

- [ ] **Prueba pedido IMEI** real de bajo costo → respuesta `SUCCESS` con `refId`.
- [ ] **Prueba pedido ECID falso** (p. ej. `TEST123`) → respuesta esperada
      **"No tienes suficiente saldo"** u otro error de negocio: confirma que el XML se
      construyó bien (llegó hasta validación de saldo = etiquetas correctas).
- [ ] Notificación de Telegram recibida mostrando el **nombre real del campo**
      (`📝 ECCID: ...`, no `📝 Campo:`).
- [ ] Dominio apuntando al servidor y DNS propagado.
- [ ] HTTPS activo (certificado Let's Encrypt o del hosting) y redirección HTTP→HTTPS.
- [ ] Respaldos activos: cron semanal de zip + primera descarga mensual fuera del
      servidor realizada.

---

## 📞 Soporte

Orden de depuración ante cualquier fallo de pedidos (sigue este orden, no saltes pasos):

1. **`api/dhru-errors.log`** — ¿Qué pidió el frontend? ¿Qué XML se generó? ¿Qué respondió
   el proveedor? El 90% de los incidentes se diagnostican aquí.
2. **¿IP autorizada?** — Si la respuesta menciona IP not authorized → Reset IP / Renew en
   jonartgsm.com → Settings → API (sección 🔴).
3. **Credenciales de `api/config-dhru.php`** — Usuario/API key válidos y sin espacios;
   prueba `getservices` manualmente.
4. **Variables de `.env`** — Token del bot y Chat ID correctos si el problema son solo
   las notificaciones (sección 🟢).

Si nada de lo anterior aplica, reproduce el caso con un pedido de prueba y adjunta el
fragmento del log al pedir soporte.
