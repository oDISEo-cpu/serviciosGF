// ✅ CONFIGURACIÓN DE TELEGRAM BOT
const TelegramNotifier = {
    // 🔑 REEMPLAZA CON TU TOKEN Y CHAT ID
    botToken: 'TU_TOKEN_DE_TELEGRAM_AQUI',
    chatIds: ['TU_ID_DE_ADMIN', 'OTRO_CHAT_ID'],    
    
    // ✅ FUNCIÓN PARA ENVIAR MENSAJE (CORREGIDA)
    async sendMessage(message) {
        try {
            const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
            
            // ✅ Enviar a TODOS los chatIds
            let allSuccess = true;
            
            for (const chatId of this.chatIds) {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chat_id: chatId,  // ✅ Ahora usa el chatId del loop
                        text: message,
                        parse_mode: 'HTML'
                    })
                });
                
                const data = await response.json();
                
                if (data.ok) {
                    console.log(`✅ Notificación enviada a Telegram (chat: ${chatId})`);
                } else {
                    console.error(`❌ Error enviando a chat ${chatId}:`, data.description);
                    allSuccess = false;
                }
            }
            
            return allSuccess;
        } catch (error) {
            console.error('❌ Error de conexión con Telegram:', error);
            return false;
        }
    },
    
    // 📦 NOTIFICACIÓN DE NUEVO PEDIDO
    async notifyNewOrder(orderData) {
        const message = `
🆕 <b>NUEVO PEDIDO RECIBIDO</b>

👤 <b>Cliente:</b> ${orderData.userName || 'Usuario'}
📧 <b>Email:</b> ${orderData.userEmail || 'N/A'}
📦 <b>Servicio:</b> ${orderData.serviceName || 'N/A'}
💰 <b>Precio:</b> $${(orderData.servicePrice || 0).toFixed(2)}
📊 <b>Cantidad:</b> ${orderData.quantity || 1}
📅 <b>Fecha:</b> ${new Date().toLocaleString('es-ES')}

${orderData.imei ? `🔢 <b>IMEI:</b> ${orderData.imei}` : ''}
${orderData.ip ? `🌐 <b>IP:</b> ${orderData.ip}` : ''}
${orderData.sn ? `📱 <b>SN:</b> ${orderData.sn}` : ''}

⏳ <b>Estado:</b> Pendiente de revisión
        `.trim();
        
        return await this.sendMessage(message);
    },
    
    // 💰 NOTIFICACIÓN DE RECARGA
    async notifyNewDeposit(depositData) {
        const message = `
💰 <b>NUEVA RECARGA SOLICITADA</b>

👤 <b>Cliente:</b> ${depositData.userName || 'Usuario'}
📧 <b>Email:</b> ${depositData.userEmail || 'N/A'}
💵 <b>Monto:</b> $${(depositData.amount || 0).toFixed(2)}
💳 <b>Método:</b> ${depositData.paymentMethod || 'N/A'}
📅 <b>Fecha:</b> ${new Date().toLocaleString('es-ES')}

${depositData.txid ? `🔗 <b>TXID:</b> ${depositData.txid}` : ''}
${depositData.walletAddress ? `📍 <b>Wallet:</b> ${depositData.walletAddress}` : ''}

⏳ <b>Estado:</b> Pendiente de verificación
        `.trim();
        
        return await this.sendMessage(message);
    },
    
    // 📺 NOTIFICACIÓN DE PEDIDO STREAMING
    async notifyStreamingOrder(orderData) {
        const message = `
📺 <b>NUEVO PEDIDO DE STREAMING</b>

👤 <b>Cliente:</b> ${orderData.userName || 'Usuario'}
📧 <b>Email:</b> ${orderData.userEmail || 'N/A'}
📦 <b>Servicio:</b> ${orderData.serviceName || 'N/A'}
💰 <b>Precio:</b> $${(orderData.servicePrice || 0).toFixed(2)}
👤 <b>Perfil solicitado:</b> ${orderData.profileName || 'N/A'}
📱 <b>WhatsApp:</b> ${orderData.whatsapp || 'N/A'}
📅 <b>Fecha:</b> ${new Date().toLocaleString('es-ES')}

⏳ <b>Estado:</b> Pendiente de entrega manual
        `.trim();
        
        return await this.sendMessage(message);
    },
    
    // ✅ NOTIFICACIÓN DE ENTREGA COMPLETADA
    async notifyDeliveryCompleted(orderData) {
        const message = `
✅ <b>CUENTA ENTREGADA</b>

👤 <b>Cliente:</b> ${orderData.userName || 'Usuario'}
📧 <b>Email:</b> ${orderData.userEmail || 'N/A'}
📦 <b>Servicio:</b> ${orderData.serviceName || 'N/A'}
📧 <b>Cuenta entregada:</b> ${orderData.deliveryAccount || 'N/A'}
📅 <b>Fecha de entrega:</b> ${new Date().toLocaleString('es-ES')}

✅ <b>Estado:</b> Completado
        `.trim();
        
        return await this.sendMessage(message);
    },
    
    // 👤 NOTIFICACIÓN DE NUEVO REGISTRO
    async notifyNewUser(userData) {
        const message = `
👤 <b>NUEVO USUARIO REGISTRADO</b>

📧 <b>Email:</b> ${userData.email || 'N/A'}
👤 <b>Nombre:</b> ${userData.name || 'N/A'}
📱 <b>Teléfono:</b> ${userData.phone || 'N/A'}
🌍 <b>País:</b> ${userData.country || 'N/A'}
📅 <b>Fecha:</b> ${new Date().toLocaleString('es-ES')}

✅ <b>Estado:</b> Registrado exitosamente
        `.trim();
        
        return await this.sendMessage(message);
    }
};

// ✅ HACER DISPONIBLE GLOBALMENTE
window.TelegramNotifier = TelegramNotifier;