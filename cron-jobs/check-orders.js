const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Inicializar Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Configuración DHru
const DHRU_URL = process.env.DHRU_URL || 'https://jonartgsm.com/api/index.php';
const DHRU_USERNAME = process.env.DHRU_USERNAME;
const DHRU_API_KEY = process.env.DHRU_API_KEY;

async function checkPendingOrders() {
  console.log('[CRON] Iniciando verificación de pedidos...');
  
  try {
    // Obtener pedidos pendientes de Firebase
    const ordersRef = db.collection('orders');
    const snapshot = await ordersRef
      .where('status', '==', 'pending')
      .get();
    
    console.log(`📋 Encontrados ${snapshot.size} pedidos pendientes`);
    
    if (snapshot.empty) {
      console.log('✅ No hay pedidos pendientes');
      return;
    }
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // Verificar cada pedido
    for (const doc of snapshot.docs) {
      const order = doc.data();
      const orderId = doc.id;
      
      try {
        console.log(`🔍 Verificando pedido: ${order.referenceId || orderId}`);
        
        // Consultar estado en JonartGSM
        const status = await getImeiOrderStatus(order.referenceId || orderId);
        
        if (status.ERROR) {
          console.error(`❌ Error consultando pedido ${orderId}:`, status.ERROR);
          errorCount++;
          continue;
        }
        
        // Verificar si el estado cambió
        const newStatus = status.SUCCESS?.[0]?.STATUS;
        const code = status.SUCCESS?.[0]?.CODE || '';
        
        if (newStatus && newStatus !== order.status) {
          // Actualizar en Firebase
          await ordersRef.doc(orderId).update({
            status: newStatus,
            code: code,
            dhruResponse: status.SUCCESS?.[0] || {},
            updatedAt: new Date().toISOString()
          });
          
          updatedCount++;
          console.log(`✅ Pedido ${orderId} actualizado: ${order.status} → ${newStatus}`);
          
          // Si está completado, notificar al cliente
          if (newStatus.toLowerCase() === 'success' || newStatus.toLowerCase() === 'completed') {
            await notifyCustomer(order.userId, order, code);
          }
        }
        
        // Pequeña pausa para no saturar la API
        await sleep(1000);
        
      } catch (error) {
        console.error(`❌ Error procesando pedido ${orderId}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Resumen:`);
    console.log(`   ✅ Actualizados: ${updatedCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   ⏭️ Sin cambios: ${snapshot.size - updatedCount - errorCount}`);
    
  } catch (error) {
    console.error('❌ Error en cron job:', error);
    process.exit(1);
  }
}

// Función para consultar estado en JonartGSM
async function getImeiOrderStatus(referenceId) {
  const parametersXml = `<PARAMETERS><ID>${referenceId}</ID></PARAMETERS>`;
  
  const bodyParams = new URLSearchParams({
    username: DHRU_USERNAME,
    apiaccesskey: DHRU_API_KEY,
    action: 'getimeiorder',
    requestformat: 'JSON',
    parameters: parametersXml
  });
  
  const response = await fetch(DHRU_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (GitHub Actions Cron Job)'
    },
    body: bodyParams.toString()
  });
  
  const text = await response.text();
  
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Error parseando respuesta:', text);
    return { ERROR: [{ MESSAGE: 'Invalid response format' }] };
  }
}

// Función para notificar al cliente (opcional)
async function notifyCustomer(userId, order, code) {
  try {
    console.log(`📧 Notificando al cliente ${userId}...`);
    
    // Obtener datos del usuario
    const userRef = db.collection('profiles').doc(userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      
      // Crear notificación en Firebase
      await db.collection('notifications').add({
        userId: userId,
        type: 'order_completed',
        title: '✅ ¡Tu pedido está listo!',
        message: `Tu pedido de ${order.serviceName} ha sido completado. ${code ? `Código: ${code}` : ''}`,
        orderId: order.serviceId,
        read: false,
        createdAt: new Date().toISOString()
      });
      
      console.log(`✅ Notificación creada para ${userData.email || userId}`);
    }
  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
  }
}

// Función auxiliar para pausas
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Ejecutar
checkPendingOrders()
  .then(() => {
    console.log('\n✅ Cron job completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal en cron job:', error);
    process.exit(1);
  });