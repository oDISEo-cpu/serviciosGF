// ✅ CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyD4Ad7b3Jz6qV75RAnfRxYIYn1r1FR46mc",
    authDomain: "nexagsm.firebaseapp.com",
    projectId: "nexagsm",
    storageBucket: "nexagsm.firebasestorage.app",
    messagingSenderId: "1028229295947",
    appId: "1:1028229295947:web:1578d271cacb6b163982ce",
    measurementId: "G-7K4LP3MYL8"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ✅ CONFIGURACIÓN DE TELEGRAM
const telegramConfig = {
    botToken: '7801739137:AAFWjOf0ebKhIMD-BqWBF_eqCydIXKK4fKw',
    chatIds: ['8225719154', '1461150518'],
    enabled: true
};

// ✅ CONSTANTES DE CONVERSIÓN
const SOLES_PER_CREDIT = 4; // 1 crédito = 4 soles
const BINANCE_PAY_ID = '1246101499';

// ✅ VARIABLES GLOBALES
let currentUser = null;
let userProfile = null;
let paymentAmount = 0;
let selectedPaymentMethod = 'binance'; // Método seleccionado por defecto
let exchangeRate = 0; // Tasa Bs por crédito (se actualiza desde Firebase)
let rateLastUpdate = null;

// ============================================
// ✅ FUNCIONES DHRU (USANDO NETLIFY FUNCTIONS)
// ============================================

async function checkDhruBalance() {
    try {
        const response = await fetch('/.netlify/functions/dhru-balance');
        const data = await response.json();
        console.log('💰 Saldo DHru:', data);
        return data;
    } catch (error) {
        console.error('❌ Error consultando saldo DHru:', error);
        return null;
    }
}

async function getDhruServices() {
    try {
        const response = await fetch('/.netlify/functions/dhru-services');
        const data = await response.json();
        console.log('📦 Servicios DHru:', data);
        return data;
    } catch (error) {
        console.error('❌ Error obteniendo servicios DHru:', error);
        return null;
    }
}

async function createDhruOrder(imei, serviceId) {
    try {
        const response = await fetch('/.netlify/functions/dhru-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imei, serviceId })
        });
        const data = await response.json();
        console.log('📦 Pedido DHru creado:', data);
        return data;
    } catch (error) {
        console.error('❌ Error creando pedido DHru:', error);
        return null;
    }
}

// ============================================
// ✅ TELEGRAM
// ============================================

async function sendTelegramMessage(message) {
    if (!telegramConfig.enabled) {
        console.log('🔕 Notificaciones de Telegram desactivadas');
        return false;
    }
    
    let allSuccess = true;
    
    for (const chatId of telegramConfig.chatIds) {
        try {
            const url = `https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
            
            const data = await response.json();
            
            if (data.ok) {
                console.log(`✅ Notificación enviada a chat ${chatId}`);
            } else {
                console.error(`❌ Error enviando a chat ${chatId}:`, data.description);
                allSuccess = false;
            }
        } catch (error) {
            console.error(`❌ Error de conexión con chat ${chatId}:`, error);
            allSuccess = false;
        }
    }
    
    return allSuccess;
}

async function notifyNewDeposit(depositData) {
    // Determinar el método y la moneda
    let methodText = '';
    let amountText = '';
    
    if (depositData.paymentMethod === 'binance') {
        methodText = '💰 Binance Pay';
        amountText = `$${(depositData.amount || 0).toFixed(2)} USDT`;
    } else if (depositData.paymentMethod === 'plin') {
        methodText = '🇵🇪 Plin';
        amountText = `S/ ${(depositData.amountSoles || 0).toFixed(2)}`;
    } else if (depositData.paymentMethod === 'pagomovil') {
        methodText = '🇻🇪 Pago Móvil';
        amountText = `Bs ${(depositData.amountBs || 0).toFixed(2)}`;
    }
    
    const message = `
💰 <b>NUEVA RECARGA SOLICITADA</b>

👤 <b>Cliente:</b> ${depositData.userName || 'Usuario'}
📧 <b>Email:</b> ${depositData.userEmail || 'N/A'}
💵 <b>Monto USD:</b> $${(depositData.amount || 0).toFixed(2)}
💵 <b>Monto a pagar:</b> ${amountText}
💱 <b>Tasa Bs:</b> ${(depositData.exchangeRate || 0).toFixed(2)} Bs/USD
💳 <b>Método:</b> ${methodText}
📅 <b>Fecha:</b> ${new Date().toLocaleString('es-ES')}

${depositData.txid ? `🔗 <b>TXID:</b> <code>${depositData.txid}</code>\n` : ''}${depositData.operationNumber ? `🔢 <b>N° Operación:</b> <code>${depositData.operationNumber}</code>\n` : ''}${depositData.notes ? `📝 <b>Notas:</b> ${depositData.notes}\n` : ''}
⏳ <b>Estado:</b> Pendiente de verificación
    `.trim();
    
    return await sendTelegramMessage(message);
}

// ============================================
// ✅ TASA DE CAMBIO (DESDE FIREBASE)
// ============================================

async function loadExchangeRate() {
    try {
        const doc = await db.collection('config').doc('exchangeRate').get();
        
        if (doc.exists) {
            const data = doc.data();
            exchangeRate = data.usdtVES || 850.00;
        } else {
            exchangeRate = 850.00;
            await db.collection('config').doc('exchangeRate').set({
                usdtVES: exchangeRate,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        rateLastUpdate = new Date();
        updateRateDisplay();
        updateAllAmounts(); // ✅ Actualizar TODOS los montos
        
        showToast('✅ Tasa actualizada', 'success');
        
    } catch (error) {
        console.error('Error cargando tasa:', error);
        
        exchangeRate = 850.00;
        rateLastUpdate = new Date();
        updateRateDisplay();
        updateAllAmounts();
        
        showToast('⚠️ Usando tasa por defecto (850.00)', 'warning');
    }
}

function updateRateDisplay() {
    if (exchangeRate > 0) {
        document.getElementById('rateValue').textContent = `1 Crédito = Bs ${exchangeRate.toFixed(2)}`;
        
        if (rateLastUpdate) {
            const timeStr = rateLastUpdate.toLocaleTimeString('es-VE', {
                hour: '2-digit',
                minute: '2-digit'
            });
            const dateStr = rateLastUpdate.toLocaleDateString('es-VE');
            document.getElementById('rateUpdated').textContent = `Actualizado: ${dateStr} ${timeStr}`;
        }
    }
}

// ✅ ACTUALIZAR TODOS LOS MONTOS (Bs, Soles, USD)
function updateAllAmounts() {
    if (exchangeRate <= 0) return;
    
    // Calcular equivalentes
    const amountBs = paymentAmount * exchangeRate;
    const amountSoles = paymentAmount * SOLES_PER_CREDIT;
    
    // Actualizar saldo actual
    const currentBalance = parseFloat(userProfile?.balance || 0);
    const currentBalanceBs = currentBalance * exchangeRate;
    document.getElementById('currentBalanceBs').textContent = `≈ Bs ${formatBs(currentBalanceBs)}`;
    
    // ✅ ACTUALIZAR SOLO EL MONTO DEL MÉTODO SELECCIONADO
    updatePaymentByMethod();
}

// ✅ FUNCIÓN CLAVE: MUESTRA SOLO EL MONTO DEL MÉTODO SELECCIONADO
function updatePaymentByMethod() {
    const amountBs = paymentAmount * exchangeRate;
    const amountSoles = paymentAmount * SOLES_PER_CREDIT;
    
    // Ocultar todos los cuadros de monto primero
    const usdtBox = document.getElementById('usdtToPayBox');
    const solesBox = document.getElementById('solesToPayBox');
    const bsBox = document.getElementById('bsToPayBox');
    
    if (usdtBox) usdtBox.style.display = 'none';
    if (solesBox) solesBox.style.display = 'none';
    if (bsBox) bsBox.style.display = 'none';
    
    // Mostrar solo el del método seleccionado
    if (selectedPaymentMethod === 'binance') {
        if (usdtBox) {
            document.getElementById('usdtToPay').textContent = paymentAmount.toFixed(2);
            usdtBox.style.display = 'block';
        }
    } else if (selectedPaymentMethod === 'plin') {
        if (solesBox) {
            document.getElementById('solesToPay').textContent = amountSoles.toFixed(2);
            solesBox.style.display = 'block';
        }
    } else if (selectedPaymentMethod === 'pagomovil') {
        if (bsBox) {
            document.getElementById('bsToPay').textContent = formatBs(amountBs);
            bsBox.style.display = 'block';
        }
    }
    
    // Actualizar también el equivalente en Bs del resumen
    document.getElementById('paymentAmountBs').textContent = `Bs ${formatBs(amountBs)}`;
    
    // Actualizar cálculo detallado
    updateCalculationBreakdown();
}

// ✅ ACTUALIZAR CÁLCULO DETALLADO
function updateCalculationBreakdown() {
    const breakdown = document.getElementById('calculationBreakdown');
    if (!breakdown) return;
    
    if (paymentAmount > 0 && exchangeRate > 0) {
        breakdown.style.display = 'block';
        
        const credits = paymentAmount;
        const totalBs = paymentAmount * exchangeRate;
        const totalSoles = paymentAmount * SOLES_PER_CREDIT;
        
        document.getElementById('calcCredits').textContent = credits.toFixed(2);
        document.getElementById('calcRate').textContent = `Bs ${formatBs(exchangeRate)}`;
        document.getElementById('calcTotal').textContent = `Bs ${formatBs(totalBs)}`;
        document.getElementById('calcSoles').textContent = `S/ ${totalSoles.toFixed(2)}`;
    } else {
        breakdown.style.display = 'none';
    }
}

function formatBs(amount) {
    return amount.toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ============================================
// ✅ AUTENTICACIÓN
// ============================================

auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = user;
    
    const profileDoc = await db.collection('profiles').doc(user.uid).get();
    if (profileDoc.exists) {
        userProfile = profileDoc.data();
        const currentBalance = userProfile.balance || 0;
        document.getElementById('currentBalance').textContent = `$${currentBalance.toFixed(2)}`;
    }
    
    await loadExchangeRate();
    
    setInterval(loadExchangeRate, 5 * 60 * 1000);
    
    const urlParams = new URLSearchParams(window.location.search);
    paymentAmount = parseFloat(urlParams.get('amount')) || 0;
    
    if (paymentAmount > 0) {
        updatePaymentDisplay(paymentAmount);
    } else {
        showAmountSelector();
    }
    
    updateNav();
});

function updateNav() {
    const navAuth = document.getElementById('navAuth');
    if (currentUser && userProfile) {
        const name = userProfile.name || 'Usuario';
        const initial = name.charAt(0).toUpperCase();
        navAuth.innerHTML = `
            <div class="user-pill">
                <div class="user-avatar">${initial}</div>
                <span class="user-name">${name}</span>
                <button class="btn-logout-text" onclick="logout()">Cerrar Sesión</button>
            </div>
        `;
    }
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

// ============================================
// ✅ SELECTOR DE MONTOS
// ============================================

function showAmountSelector() {
    const summaryDiv = document.querySelector('.checkout-card');
    
    summaryDiv.innerHTML += `
        <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--cyan-border);">
            <h3 style="font-family:'Orbitron',monospace;font-size:16px;color:var(--cyan);margin-bottom:16px;">💵 Selecciona un Monto</h3>
            
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px;">
                <button onclick="selectAmount(10)" class="btn-ghost" style="padding:16px;font-size:15px;">$10</button>
                <button onclick="selectAmount(25)" class="btn-ghost" style="padding:16px;font-size:15px;">$25</button>
                <button onclick="selectAmount(50)" class="btn-ghost" style="padding:16px;font-size:15px;">$50</button>
                <button onclick="selectAmount(100)" class="btn-ghost" style="padding:16px;font-size:15px;">$100</button>
            </div>
            
            <div class="form-group" style="margin-top:16px;">
                <label>O ingresa un monto personalizado</label>
                <input type="number" id="customAmount" min="1" step="0.01" placeholder="Ej: 40.00" style="font-size:16px;padding:12px;" oninput="updateCustomAmountPreview()">
                <div id="customAmountPreview" style="margin-top:8px;font-size:13px;color:var(--orange);font-family:'Orbitron',monospace;display:none;"></div>
            </div>
            
            <button onclick="confirmCustomAmount()" class="btn-primary btn-full" style="margin-top:16px;padding:14px;font-size:15px;">
                Continuar con el Pago
            </button>
        </div>
    `;
}

function updateCustomAmountPreview() {
    const amount = parseFloat(document.getElementById('customAmount').value);
    const preview = document.getElementById('customAmountPreview');
    
    if (amount > 0 && exchangeRate > 0) {
        const bsAmount = amount * exchangeRate;
        const solesAmount = amount * SOLES_PER_CREDIT;
        preview.innerHTML = `≈ Bs ${formatBs(bsAmount)} | S/ ${solesAmount.toFixed(2)}`;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
}

function selectAmount(amount) {
    document.getElementById('customAmount').value = amount;
    updatePaymentDisplay(amount);
}

function confirmCustomAmount() {
    const amount = parseFloat(document.getElementById('customAmount').value);
    
    if (!amount || amount <= 0) {
        showToast('⚠️ Ingresa un monto válido', 'error');
        return;
    }
    
    updatePaymentDisplay(amount);
    document.querySelector('.checkout-container').children[1].scrollIntoView({ behavior: 'smooth' });
}

function updatePaymentDisplay(amount) {
    paymentAmount = amount;
    document.getElementById('paymentAmount').textContent = `$${amount.toFixed(2)}`;
    document.getElementById('creditsAmount').textContent = amount.toFixed(2);
    
    // Actualizar todos los montos (incluyendo el del método seleccionado)
    updateAllAmounts();
}

// ============================================
// ✅ SELECCIONAR MÉTODO DE PAGO (LA FUNCIÓN CLAVE)
// ============================================

function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    
    // Actualizar radio buttons visuales
    document.querySelectorAll('.payment-method-option').forEach(option => {
        option.classList.remove('active');
        const radio = option.querySelector('input[type="radio"]');
        if (radio && radio.value === method) {
            option.classList.add('active');
            radio.checked = true;
        }
    });
    
    // Mostrar/ocultar contenido de pago
    document.querySelectorAll('.payment-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const selectedContent = document.getElementById(method + 'Payment');
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
    
    // ✅ ACTUALIZAR EL MONTO SEGÚN EL MÉTODO SELECCIONADO
    updatePaymentByMethod();
}

// ============================================
// ✅ CONFIRMAR PAGO
// ============================================

async function confirmPayment(method) {
    const amountBs = paymentAmount * exchangeRate;
    const amountSoles = paymentAmount * SOLES_PER_CREDIT;
    
    let paymentData = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: userProfile.name || 'Usuario',
        type: 'deposit',
        amount: paymentAmount,
        amountBs: amountBs,
        amountSoles: amountSoles,
        exchangeRate: exchangeRate,
        paymentMethod: method,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (method === 'binance') {
        const txid = document.getElementById('txidInput').value.trim();
        
        if (!txid) {
            showToast('⚠️ Por favor ingresa el ID de transacción', 'error');
            return;
        }
        
        if (txid.length < 5) {
            showToast('⚠️ El ID parece inválido', 'error');
            return;
        }
        
        paymentData.txid = txid;
        paymentData.payId = BINANCE_PAY_ID;
        
    } else if (method === 'plin') {
        const operationNumber = document.getElementById('plinOperationNumber').value.trim();
        
        if (!operationNumber) {
            showToast('⚠️ Por favor ingresa el número de operación', 'error');
            return;
        }
        
        paymentData.operationNumber = operationNumber;
        paymentData.notes = `Plin: ${operationNumber}`;
        
    } else if (method === 'pagomovil') {
        const lastDigits = document.getElementById('pagomovilLastDigits').value.trim();
        const bank = document.getElementById('pagomovilBank').value;
        
        if (!lastDigits || !bank) {
            showToast('⚠️ Por favor completa todos los campos', 'error');
            return;
        }
        
        paymentData.operationNumber = lastDigits;
        paymentData.bank = bank;
        paymentData.notes = `Pago Móvil - ${bank} - ***${lastDigits}`;
    }
    
    try {
        const transactionRef = await db.collection('transactions').add(paymentData);
        
        await notifyNewDeposit(paymentData);
        
        showToast('✅ Pago registrado. Esperando verificación...', 'success');
        
        setTimeout(() => {
            window.location.href = `pago-confirmado.html?tx=${transactionRef.id}`;
        }, 2000);
        
    } catch (error) {
        console.error('Error:', error);
        showToast('❌ Error al registrar pago: ' + error.message, 'error');
    }
}

// ============================================
// ✅ TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'success') {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️';
    toast.innerHTML = `<span>${icon}</span> ${message}`;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}