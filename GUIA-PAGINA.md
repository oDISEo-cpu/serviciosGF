# 📖 GUÍA COMPLETA DE NEXAGSM - SERVIDOR GSM

## 🎯 ¿QUÉ ES NEXAGSM?
Es una plataforma web completa para técnicos GSM donde pueden:
- Comprar servicios de desbloqueo (Samsung, Xiaomi, Huawei, etc.)
- Adquirir licencias y herramientas
- Recargar saldo y gestionar sus compras
- Descargar herramientas y firmware

---

## 🏠 ESTRUCTURA DE LA PÁGINA

### 1. **INDEX.HTML (Página Principal)**
- **Hero Section**: Presentación del servidor
- **Carrusel de Marcas**: Samsung, Xiaomi, Huawei, Honor, Oppo, Tecno/Infinix
- **Servicios Destacados**: 6 categorías principales
- **Precios**: Sección bloqueada (requiere login)
- **Comunidad**: Links a WhatsApp y Telegram
- **Login/Registro**: Modal para iniciar sesión

### 2. **SERVICIOS.HTML (Catálogo de Servicios)**
- **Filtros Dinámicos**: Categorías personalizables (unlock, flash, bypass, etc.)
- **Botones Admin**:
  - 📁 Nueva Categoría (crear categorías personalizadas)
  - ➕ Agregar Servicio (crear nuevos servicios)
- **Tarjetas de Servicios**: Muestran nombre, descripción, precio, stock, tags
- **Verificación de Saldo**: Antes de comprar, verifica si tiene saldo suficiente

### 3. **PRECIOS.HTML (Paquetes Especiales)**
- **Paquetes Predefinidos**: Ofertas especiales con descuento
- **Compra Automática**: Si tiene saldo, se aprueba inmediatamente
- **Gestión Admin**: Crear/editar/eliminar paquetes

### 4. **PEDIDOS.HTML (Crear Pedido)**
- **Carrito de Compras**: Agregar múltiples servicios
- **Verificación de Saldo**: Muestra saldo actual
- **Pago con Saldo**: Descuento automático del saldo
- **Modal de Confirmación**: Muestra detalles antes de pagar

### 5. **MIS-PEDIDOS.HTML (Historial de Compras)**
- **Solo Compras del Usuario**: Cada usuario ve solo sus compras
- **Estados**: Pendiente, Aprobado, Rechazado
- **Detalles**: Fecha, servicios, monto, método de pago

### 6. **PANEL-PEDIDOS.HTML (Panel Admin)**
- **3 Pestañas**:
  - 📦 Pedidos: Todos los pedidos de servicios
  - 🎁 Paquetes Vendidos: Historial de compras de paquetes
  - 💰 Transacciones: Recargas de saldo (Binance/Manual)
- **Estadísticas**: Total, pendientes, aprobados, ingresos del mes
- **Filtros**: Por estado, búsqueda, fecha
- **Acciones**: Aprobar/Rechazar pedidos

### 7. **RECARGAR-SALDO.HTML (Recargar Saldo)**
- **Métodos de Pago**:
  - 💰 Binance Pay (USDT TRC20)
  - 👤 Transferencia Manual (Admin)
- **QR Code**: Para escanear con Binance
- **TXID**: Campo para pegar ID de transacción
- **Selector de Montos**: $10, $25, $50, $100 o personalizado

### 8. **DESCARGAS.HTML (Centro de Descargas)**
- **Categorías con Iconos**: Samsung, Xiaomi, Huawei, etc.
- **Subcarpetas**: ENG ROM, Drivers, Tools, etc.
- **Filtros**: Por marca y subcarpeta
- **Descarga desde Drive**: Links directos a Google Drive

### 9. **IMPORTAR-DESCARGAS.HTML (Admin Only)**
- **Importación Masiva**: Pegar múltiples links de Drive
- **Nombres Personalizados**: Asignar nombres a cada archivo
- **Subcarpetas**: Organizar archivos en carpetas
- **Solo Admin/Client**: Protección de acceso

### 10. **SOPORTE.HTML (Soporte Técnico)**
- **Formulario de Contacto**: Enviar tickets de soporte
- **FAQ**: Preguntas frecuentes
- **Links de Contacto**: WhatsApp, Telegram

---

## 💰 SISTEMA DE SALDO Y CRÉDITOS

### ¿Cómo Funciona?
1. **Recarga de Saldo**: Usuario recarga dinero real (Binance/Manual)
2. **Conversión a Créditos**: $1 USD = 1 crédito
3. **Compra de Servicios**: Se descuenta del saldo automáticamente
4. **Reembolsos**: Si un servicio falla, se devuelve en créditos (NO en dinero)

### Ejemplo Práctico:# 📖 GUÍA COMPLETA DE NEXAGSM - SERVIDOR GSM

## 🎯 ¿QUÉ ES NEXAGSM?
Es una plataforma web completa para técnicos GSM donde pueden:
- Comprar servicios de desbloqueo (Samsung, Xiaomi, Huawei, etc.)
- Adquirir licencias y herramientas
- Recargar saldo y gestionar sus compras
- Descargar herramientas y firmware

---

## 🏠 ESTRUCTURA DE LA PÁGINA

### 1. **INDEX.HTML (Página Principal)**
- **Hero Section**: Presentación del servidor
- **Carrusel de Marcas**: Samsung, Xiaomi, Huawei, Honor, Oppo, Tecno/Infinix
- **Servicios Destacados**: 6 categorías principales
- **Precios**: Sección bloqueada (requiere login)
- **Comunidad**: Links a WhatsApp y Telegram
- **Login/Registro**: Modal para iniciar sesión

### 2. **SERVICIOS.HTML (Catálogo de Servicios)**
- **Filtros Dinámicos**: Categorías personalizables (unlock, flash, bypass, etc.)
- **Botones Admin**:
  - 📁 Nueva Categoría (crear categorías personalizadas)
  - ➕ Agregar Servicio (crear nuevos servicios)
- **Tarjetas de Servicios**: Muestran nombre, descripción, precio, stock, tags
- **Verificación de Saldo**: Antes de comprar, verifica si tiene saldo suficiente

### 3. **PRECIOS.HTML (Paquetes Especiales)**
- **Paquetes Predefinidos**: Ofertas especiales con descuento
- **Compra Automática**: Si tiene saldo, se aprueba inmediatamente
- **Gestión Admin**: Crear/editar/eliminar paquetes

### 4. **PEDIDOS.HTML (Crear Pedido)**
- **Carrito de Compras**: Agregar múltiples servicios
- **Verificación de Saldo**: Muestra saldo actual
- **Pago con Saldo**: Descuento automático del saldo
- **Modal de Confirmación**: Muestra detalles antes de pagar

### 5. **MIS-PEDIDOS.HTML (Historial de Compras)**
- **Solo Compras del Usuario**: Cada usuario ve solo sus compras
- **Estados**: Pendiente, Aprobado, Rechazado
- **Detalles**: Fecha, servicios, monto, método de pago

### 6. **PANEL-PEDIDOS.HTML (Panel Admin)**
- **3 Pestañas**:
  - 📦 Pedidos: Todos los pedidos de servicios
  - 🎁 Paquetes Vendidos: Historial de compras de paquetes
  - 💰 Transacciones: Recargas de saldo (Binance/Manual)
- **Estadísticas**: Total, pendientes, aprobados, ingresos del mes
- **Filtros**: Por estado, búsqueda, fecha
- **Acciones**: Aprobar/Rechazar pedidos

### 7. **RECARGAR-SALDO.HTML (Recargar Saldo)**
- **Métodos de Pago**:
  - 💰 Binance Pay (USDT TRC20)
  - 👤 Transferencia Manual (Admin)
- **QR Code**: Para escanear con Binance
- **TXID**: Campo para pegar ID de transacción
- **Selector de Montos**: $10, $25, $50, $100 o personalizado

### 8. **DESCARGAS.HTML (Centro de Descargas)**
- **Categorías con Iconos**: Samsung, Xiaomi, Huawei, etc.
- **Subcarpetas**: ENG ROM, Drivers, Tools, etc.
- **Filtros**: Por marca y subcarpeta
- **Descarga desde Drive**: Links directos a Google Drive

### 9. **IMPORTAR-DESCARGAS.HTML (Admin Only)**
- **Importación Masiva**: Pegar múltiples links de Drive
- **Nombres Personalizados**: Asignar nombres a cada archivo
- **Subcarpetas**: Organizar archivos en carpetas
- **Solo Admin/Client**: Protección de acceso

### 10. **SOPORTE.HTML (Soporte Técnico)**
- **Formulario de Contacto**: Enviar tickets de soporte
- **FAQ**: Preguntas frecuentes
- **Links de Contacto**: WhatsApp, Telegram

---

## 💰 SISTEMA DE SALDO Y CRÉDITOS

### ¿Cómo Funciona?
1. **Recarga de Saldo**: Usuario recarga dinero real (Binance/Manual)
2. **Conversión a Créditos**: $1 USD = 1 crédito
3. **Compra de Servicios**: Se descuenta del saldo automáticamente
4. **Reembolsos**: Si un servicio falla, se devuelve en créditos (NO en dinero)

### Ejemplo Práctico:
Usuario recarga $100 USD
→ Saldo: $100.00
Compra servicio Samsung FRP ($2.50)
→ Saldo: $97.50
→ Pedido creado
Servicio rechazado (equipo no soportado)
→ Reembolso: $2.50 en créditos
→ Saldo: $100.00
Usuario usa los $2.50 para otro servicio
→ Saldo: $97.50

---


### Ventajas:
- ✅ No hay devoluciones de dinero real
- ✅ Los créditos no vencen
- ✅ Se pueden reutilizar en cualquier servicio
- ✅ Sistema automático (no requiere intervención manual)

---

## 🔐 SISTEMA DE ROLES

### Usuario Normal (role: "user")
- ✅ Ver servicios y precios
- ✅ Recargar saldo
- ✅ Comprar servicios
- ✅ Ver sus compras
- ✅ Descargar archivos

### Cliente/Reseller (role: "client")
- ✅ Todo lo del usuario normal
- ✅ Crear/editar servicios
- ✅ Crear/editar paquetes
- ✅ Ver panel de pedidos
- ✅ Importar descargas
- ✅ Ver transacciones

### Administrador (role: "admin")
- ✅ Todo lo del cliente
- ✅ Aprobar/rechazar pedidos
- ✅ Aprobar/rechazar transacciones
- ✅ Gestionar usuarios
- ✅ Acceso total al sistema

---

## 📊 FLUJO COMPLETO DE COMPRA

### Paso 1: Usuario inicia sesión
- Ingresa email y contraseña
- Sistema carga perfil y saldo

### Paso 2: Usuario selecciona servicio
- Va a "Servicios"
- Filtra por categoría
- Click en "Seleccionar"

### Paso 3: Verificación de saldo
- Sistema verifica si tiene saldo suficiente
- Si NO tiene: Ofrece recargar
- Si SÍ tiene: Continúa

### Paso 4: Crear pedido
- Usuario agrega datos (IMEI, modelo, etc.)
- Click en "Añadir al Carrito"
- Puede agregar más servicios

### Paso 5: Pagar con saldo
- Click en "Pagar con Saldo"
- Sistema descuenta automáticamente
- Crea pedido con estado "approved"
- Registra transacción

### Paso 6: Ver compra
- Usuario va a "Tus Compras"
- Ve el pedido con estado "Aprobado"
- Admin procesa el servicio

### Paso 7: Servicio completado
- Admin marca como completado
- Usuario recibe resultado
- Si falla: Reembolso automático en créditos

---

## 🎁 SISTEMA DE PAQUETES

### ¿Qué son?
Ofertas especiales con descuento (ej: Pack Básico $10, Pack Premium $25)

### Compra Automática:
1. Usuario ve paquete
2. Click en "Comprar Paquete"
3. Sistema verifica saldo
4. Si tiene saldo: Compra inmediata (estado "approved")
5. Si no tiene: Ofrece recargar

### Ventajas:
- ✅ No requiere aprobación manual del admin
- ✅ Entrega inmediata
- ✅ Descuento automático

---

## 📥 SISTEMA DE DESCARGAS

### Estructura:

📂 Xiaomi
├── 📂 ENG ROM
│ ├── 📄 Mi 11 Lite 5G
│ └── 📄 Note 10 Pro
├── 📂 Drivers
│ └── 📄 USB Driver
└── 📄 BACKUP NV REDMI A3
📂 Samsung
├── 📂 Tools
│ └── 📄 Samsung Tool
└── 📂 Firmware
└── 📄 Galaxy S21

---


### Cómo Importar:
1. Admin va a "Importar Descargas"
2. Selecciona categoría (ej: Xiaomi)
3. Escribe subcarpeta (ej: ENG ROM)
4. Pega links de Google Drive (uno por línea)
5. Escribe nombres (uno por línea)
6. Click en "Importar"

### Cómo Descargar:
1. Usuario va a "Descargas"
2. Selecciona marca (ej: Xiaomi)
3. Selecciona subcarpeta (ej: ENG ROM)
4. Click en "Descargar"
5. Se abre Google Drive

---

## 🔧 PANEL DE ADMINISTRACIÓN

### Pestaña 1: Pedidos
- Lista todos los pedidos de servicios
- Filtros: Estado, búsqueda
- Acciones: Aprobar/Rechazar
- Estadísticas: Total, pendientes, aprobados

### Pestaña 2: Paquetes Vendidos
- Historial de compras de paquetes
- Usuario que compró
- Fecha y monto
- Ingresos del mes

### Pestaña 3: Transacciones
- Recargas de saldo (Binance/Manual)
- TXID de transacción
- Estado: Pendiente/Aprobado
- Acciones: Aprobar (acredita saldo)

---

## 💡 CARACTERÍSTICAS ESPECIALES

### 1. Compra Automática con Saldo
- Si el usuario tiene saldo, la compra se aprueba automáticamente
- No requiere intervención del admin
- Descuento inmediato del saldo

### 2. Reembolsos en Créditos
- Si un servicio falla, se devuelve en créditos
- Los créditos no vencen
- Se pueden reutilizar en cualquier servicio

### 3. Categorías Dinámicas
- Admin puede crear nuevas categorías
- Se actualizan automáticamente en los filtros
- No requiere modificar código

### 4. Importación Masiva de Descargas
- Admin puede importar cientos de archivos de una vez
- Solo pega los links y nombres
- Sistema crea todo automáticamente

### 5. Panel de Estadísticas
- Total de pedidos
- Ingresos del mes
- Pedidos pendientes
- Transacciones aprobadas

---

## 🚀 PRÓXIMAS MEJORAS (Sugerencias)

1. **Notificaciones en Tiempo Real**: Alertas cuando se aprueba un pedido
2. **Chat en Vivo**: Soporte técnico integrado
3. **API de Dhru Fusion**: Automatización de servicios
4. **Sistema de Afiliados**: Comisiones por referidos
5. **App Móvil**: Versión para Android/iOS

---

## 📞 SOPORTE TÉCNICO

Si tienes dudas sobre cómo usar la página:
- WhatsApp: +XX XXX XXX XXXX
- Telegram: @NexaGSM
- Email: soporte@nexagsm.com

---

## ✅ RESUMEN RÁPIDO

**NexaGSM es una plataforma completa que permite:**
- ✅ Vender servicios GSM automáticamente
- ✅ Gestionar saldo y créditos
- ✅ Procesar pagos con Binance
- ✅ Administrar descargas
- ✅ Controlar pedidos y transacciones
- ✅ Ofrecer paquetes especiales
- ✅ Soporte técnico integrado

**Todo automatizado y fácil de usar para técnicos GSM en toda Latinoamérica.**