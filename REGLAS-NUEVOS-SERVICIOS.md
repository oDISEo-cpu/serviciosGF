# REGLAS — Cómo agregar un servicio nuevo de JonartGSM sin tocar código

El pipeline `dhru-services.php → registros-imei.html (modal dinámico) → place-order-dhru.php`
ya maneja automáticamente estos casos. Checklist según el tipo de servicio:

## 1. Servicio con CAMPO PERSONALIZADO ÚNICO (imei_custom=1)
Ej: ECID, SERIAL NUMBER, MODELO, "IMEI A PONER".
- [ ] En el panel de JonartGSM el servicio debe traer `imei_custom=1`, `imei_custom_name` (nombre del campo) e `imei_custom_info` (hint visible, ej: "Copialo desde la tool").
- [ ] `dhru-services.php` lo mapea solo → `customInput.customName` + `customInput.customInfo`.
- [ ] El modal genera input `orderCustomField_0` con el hint del proveedor (NO el texto *#06#).
- [ ] `submitOrder` captura valor+nombre → `dhruData {customField, customFieldName}`.
- [ ] El backend inyecta la etiqueta `<{NOMBRE_MAYUSCULAS}>` además del identifier en `<IMEI>`.
- [ ] Verificar en `api/dhru-errors.log` que el XML salió con la etiqueta correcta.

## 2. Servicio con MÚLTIPLES CAMPOS (customFields[])
- [ ] El proveedor debe exponer `customFields` con `fieldname`/`description`.
- [ ] El frontend los renderiza y los envía agrupados en `fieldValues`/`inputData`.
- [ ] El backend convierte cada clave: limpieza `[^a-zA-Z0-9_] → _`, paso a MAYÚSCULAS, solo si el valor NO está vacío.
- [ ] Probar 1 pedido con valores mínimos para confirmar nombres de etiqueta exactos que espera DHru.

## 3. Servicio de IMEI PURO (imei_single=1, sin campos extra)
- [ ] Nada que configurar: el modal muestra IMEI/SN con el fallback "*#06#".
- [ ] Cantidad se fuerza a 1 automáticamente.

## 4. Licencias / Créditos / Remotos (sin flags IMEI)
- [ ] Deben llegar SIN `imei_single/bulk/custom` en los detalles; entran por la rama de licencia.
- [ ] Email siempre viaja en `<EMAIL>`; username en `<USERNAME>`+`<LOGIN>`.
- [ ] Validar `minqnt/maxqnt` desde el panel del proveedor (si vienen 0, el backend usa 1..999).

## Reglas generales
1. NUNCA hardcodear credenciales: `api/config-dhru.php` usa placeholders; reales solo en producción.
2. Tras publicar un servicio nuevo, hacer 1 pedido de prueba y revisar `api/dhru-errors.log`.
3. Si DHru responde "Invalid Custom Field", comparar la etiqueta generada vs. la que exige el panel (espacios → `_`, mayúsculas).
4. No duplicar lógica en netlify/functions (carpeta de pruebas, ya no se usa).
5. Streamings tiene su propio flujo: NO pasa por este pipeline.
