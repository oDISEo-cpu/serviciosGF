const { Telegraf } = require('telegraf');
const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Configuración
const BOT_TOKEN = '8875403813:AAED25HA6fq4e65_S-AbFjM7ZNEQ2H7-pDo';

// Inicializar bot
const bot = new Telegraf(BOT_TOKEN);

// Comando /start
bot.start(async (ctx) => {
  const chatId = ctx.chat.id.toString();
  const userId = ctx.from.id.toString();
  const username = ctx.from.username || 'N/A';
  const firstName = ctx.from.first_name || '';
  const lastName = ctx.from.last_name || '';

  try {
    // Generar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    console.log(`📝 Generando código ${code} para user ${userId} (chat: ${chatId})`);

    // Guardar en Firebase Firestore
    const codesRef = db.collection('telegram_verification_codes');
    const docRef = await codesRef.add({
      code: code,
      chatId: chatId,
      userId: userId,
      username: username,
      firstName: firstName,
      lastName: lastName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
      used: false
    });

    console.log(`✅ Código guardado en Firestore: ${docRef.id}`);

    // Enviar código al usuario
    await ctx.reply(
      `🔑 *Código de vinculación:*\n\n` +
      `\`${code}\`\n\n` +
      `Ingresa este código en:\n` +
      `https://serviciosgf.com/vincular-telegram.html\n\n` +
      `⏰ Expira en 15 minutos`,
      { parse_mode: 'Markdown' }
    );

    console.log(`✅ Código enviado a ${chatId}`);

  } catch (error) {
    console.error('❌ Error generando código:', error);
    console.error('Stack:', error.stack);
    
    ctx.reply(
      '❌ *Error al generar el código*\n\n' +
      'Por favor intenta de nuevo en unos momentos.\n\n' +
      `Detalles: ${error.message}`,
      { parse_mode: 'Markdown' }
    );
  }
});

// Comando /help
bot.help((ctx) => {
  ctx.reply(
    `📱 *Bot de ServiciosGF*\n\n` +
    `Este bot te notificará cuando tus pedidos estén listos.\n\n` +
    `*Comandos disponibles:*\n` +
    `/start - Vincular tu cuenta\n` +
    `/help - Mostrar esta ayuda\n` +
    `/status - Ver estado de vinculación`,
    { parse_mode: 'Markdown' }
  );
});

// Comando /status
bot.command('status', async (ctx) => {
  const chatId = ctx.chat.id.toString();

  try {
    // Buscar usuario vinculado
    const profilesRef = db.collection('profiles');
    const snapshot = await profilesRef.where('telegramChatId', '==', chatId).limit(1).get();

    if (snapshot.empty) {
      ctx.reply('❌ Tu cuenta de Telegram no está vinculada a ninguna cuenta de ServiciosGF.\n\nUsa /start para vincular.');
      return;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    const email = data.email || 'N/A';
    const name = data.name || 'N/A';
    const balance = data.balance || 0;

    ctx.reply(
      `✅ *Cuenta vinculada*\n\n` +
      `Email: ${email}\n` +
      `Nombre: ${name}\n` +
      `Saldo: $${balance}`,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error('❌ Error verificando estado:', error);
    ctx.reply('❌ Error al verificar el estado.');
  }
});

// Iniciar bot
bot.launch().then(() => {
  console.log('✅ Bot de Telegram iniciado (@UsuariosServiciosGF_Bot)');
  console.log('📡 Esperando mensajes...');
}).catch(err => {
  console.error('❌ Error iniciando bot:', err);
  console.error('Stack:', err.stack);
  process.exit(1);
});

// Manejar cierre graceful
process.once('SIGINT', () => {
  console.log('🛑 Deteniendo bot...');
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  console.log('🛑 Deteniendo bot...');
  bot.stop('SIGTERM');
});

// Manejar errores
bot.catch((err, ctx) => {
  console.error(`❌ Error en ${ctx.updateType}:`, err);
  console.error('Stack:', err.stack);
});
