#!/bin/bash

echo "🚀 Iniciando instalación de ServiciosGF API..."

# Actualizar sistema
echo "📦 Actualizando sistema..."
apt update && apt upgrade -y

# Instalar dependencias
echo "📦 Instalando dependencias del sistema..."
apt install -y curl git build-essential ufw

# Instalar Node.js 18
echo "📦 Instalando Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verificar
echo "✅ Node.js $(node -v)"
echo "✅ npm $(npm -v)"

# Instalar PM2
echo "📦 Instalando PM2..."
npm install -g pm2

# Crear directorio de logs
mkdir -p logs

# Instalar dependencias del proyecto
echo "📦 Instalando dependencias de npm..."
npm install --production

# Configurar firewall
echo "🔒 Configurando firewall..."
ufw allow 22/tcp
ufw allow 3000/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable

# Iniciar con PM2
echo "🚀 Iniciando servicio con PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo "✅ ============================================"
echo "✅ ¡Instalación completada!"
echo "✅ API corriendo en: http://localhost:3000"
echo "✅ Ver estado: pm2 status"
echo "✅ Ver logs: pm2 logs serviciosgf-api"
echo "✅ ============================================"