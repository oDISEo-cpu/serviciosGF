// ============================================================
// telegram-bot/bot.js — Bot de notificaciones ServiciosGF
// LEE LAS CREDENCIALES SOLO DESDE VARIABLES DE ENTORNO (.env).
// No hardcodear tokens reales en este archivo.
// ============================================================
require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'TU_TOKEN_DE_TELEGRAM';
const TELEGRAM_ADMIN_ID = process.env.TELEGRAM_ADMIN_ID || 'TU_ID_DE_ADMIN';

const API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId, text) {
  try {
    const res = await fetch(`${API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
    return await res.json();
  } catch (err) {
    console.error('Error enviando mensaje:', err.message);
    return null;
  }
}

async function notifyNewOrder(orderData) {
  const message = [
    '🆕 NUEVO PEDIDO RECIBIDO',
    `👤 Cliente: ${orderData.userName || 'Usuario'}`,
    `📦 Servicio: ${orderData.serviceName || 'N/A'}`,
    `💰 Precio: $${Number(orderData.servicePrice || 0).toFixed(2)}`,
    orderData.imei ? `🔢 IMEI: ${orderData.imei}` : null,
    orderData.customField ? `📝 ${orderData.customFieldName || 'Campo'}: ${orderData.customField}` : null,
    `⏳ Estado: Pendiente de revisión`
  ].filter(Boolean).join('\n');

  return await sendMessage(TELEGRAM_ADMIN_ID, message);
}

module.exports = { sendMessage, notifyNewOrder };

// Ejecución directa (modo escucha simple): node bot.js
if (require.main === module) {
  console.log('Bot de notificaciones listo. Token cargado desde env:', !!process.env.TELEGRAM_BOT_TOKEN);
}
