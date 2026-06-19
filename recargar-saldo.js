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
    chatIds: [, '1461150518'],
    enabled: true
};

// ✅ CONSTANTES DE CONVERSIÓN
const SOLES_PER_CREDIT = 4; // 1 crédito = 4 soles
const BINANCE_PAY_ID = '1246101499';

// ✅ VARIABLES GLOBALES
let currentUser = null;
let userProfile = null;
let paymentAmount = 0;
let selectedPaymentMethod = 'binance';
let exchangeRate = 0;
let rateLastUpdate = null;
let currentStep = 1; // ✅ NUEVO: Paso actual del stepper
let uploadedReceipt = null; // ✅ NUEVO: Comprobante de pago

// ============================================
// ✅ STEPPER - NAVEGACIÓN ENTRE PASOS
// ============================================

function goToStep(step) {
    // Validaciones antes de avanzar
    if (step > currentStep) {
        if (currentStep === 1 && paymentAmount <= 0) {
            showToast('⚠️ Selecciona o ingresa un monto', 'error');
            return;
        }
        if (currentStep === 2 && !selectedPaymentMethod) {
            showToast('⚠️ Selecciona un método de pago', 'error');
            return;
        }
    }
    
    currentStep = step;
    
    // Actualizar stepper visual
    document.querySelectorAll('.step').forEach((stepEl, index) => {
        const stepNum = index + 1;
        stepEl.classList.remove('active', 'completed');
        if (stepNum < currentStep) stepEl.classList.add('completed');
        else if (stepNum === currentStep) stepEl.classList.add('active');
    });
    
    // Actualizar barra de progreso
    const progress = ((currentStep - 1) / 3) * 100;
    document.getElementById('stepperProgress').style.width = progress + '%';
    
    // Mostrar contenido del paso actual
    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`step${step}Content`).classList.add('active');
    
    // Actualizar contenido específico del paso
    if (step === 2) updateStep2Content();
    if (step === 3) updateStep3Content();
    if (step === 4) updateStep4Content();
    
    // Scroll arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// ✅ PASO 1: SELECCIONAR MONTO
// ============================================

function selectPresetAmount(amount, btn) {
    paymentAmount = amount;
    
    // Quitar selección de otros botones
    document.querySelectorAll('.amount-preset-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    
    // Limpiar input personalizado
    document.getElementById('customAmount').value = '';
    
    updateAmountPreview();
    document.getElementById('btnStep1Next').disabled = false;
}

function updateCustomPreview() {
    const amount = parseFloat(document.getElementById('customAmount').value);
    
    // Quitar selección de presets
    document.querySelectorAll('.amount-preset-btn').forEach(b => b.classList.remove('selected'));
    
    if (amount > 0) {
        paymentAmount = amount;
        updateAmountPreview();
        document.getElementById('btnStep1Next').disabled = false;
    } else {
        paymentAmount = 0;
        document.getElementById('amountPreview').style.display = 'none';
        document.getElementById('btnStep1Next').disabled = true;
    }
}

function updateAmountPreview() {
    if (paymentAmount <= 0 || exchangeRate <= 0) return;
    
    const bsAmount = paymentAmount * exchangeRate;
    const solesAmount = paymentAmount * SOLES_PER_CREDIT;
    
    document.getElementById('previewBs').textContent = `Bs ${formatBs(bsAmount)}`;
    document.getElementById('previewSoles').textContent = `S/ ${solesAmount.toFixed(2)}`;
    document.getElementById('amountPreview').style.display = 'grid';
}

// ============================================
// ✅ PASO 2: SELECCIONAR MÉTODO
// ============================================

function updateStep2Content() {
    document.getElementById('step2Amount').textContent = `$${paymentAmount.toFixed(2)}`;
    document.getElementById('step2AmountBs').textContent = `Bs ${formatBs(paymentAmount * exchangeRate)}`;
    document.getElementById('step2AmountSoles').textContent = `S/ ${(paymentAmount * SOLES_PER_CREDIT).toFixed(2)}`;
}

function selectPaymentMethod(method, element) {
    selectedPaymentMethod = method;
    
    document.querySelectorAll('.payment-method-option').forEach(opt => {
        opt.classList.remove('active');
        const radio = opt.querySelector('input[type="radio"]');
        if (radio) radio.checked = false;
    });
    
    element.classList.add('active');
    element.querySelector('input[type="radio"]').checked = true;
}

// ============================================
// ✅ PASO 3: REALIZAR PAGO
// ============================================

function updateStep3Content() {
    const content = document.getElementById('paymentMethodContent');
    const summaryBox = document.getElementById('paymentSummaryBox');
    const amountDisplay = document.getElementById('paymentAmountDisplay');
    const title = document.getElementById('step3Title');
    const subtitle = document.getElementById('step3Subtitle');
    
    summaryBox.className = 'payment-summary-box';
    
    if (selectedPaymentMethod === 'binance') {
        summaryBox.classList.add('binance');
        amountDisplay.textContent = `${paymentAmount.toFixed(2)} USDT`;
        title.innerHTML = '💰 Pago con Binance';
        subtitle.textContent = 'Escanea el QR en la app de Binance';
        
        content.innerHTML = `
            <div class="qr-section">
                <div class="qr-wrapper">
                    <img src="qr-binance.png" alt="QR Binance Pay">
                </div>
                <p style="font-size:12px;color:var(--text-dim);">📱 Escanea con la app de Binance</p>
            </div>
            
            <div class="pay-id-box">
                <div class="pay-id-label">Binance Pay ID</div>
                <div class="pay-id-value">${BINANCE_PAY_ID}</div>
            </div>
            
            <div class="instructions-box">
                <div>
                    <strong>📝 Instrucciones:</strong><br>
                    1. Abre la app de Binance y ve a Pay<br>
                    2. Ingresa el Pay ID: <strong>${BINANCE_PAY_ID}</strong> o escanea el QR<br>
                    3. Envía exactamente <strong>${paymentAmount.toFixed(2)} USDT</strong><br>
                    4. Copia el ID de transacción (TXID) del pago<br>
                    5. Haz clic en "Ya realicé el pago"
                </div>
            </div>
            
            <div style="background:rgba(240,185,11,0.1);border:1px solid var(--binance);border-radius:6px;padding:12px;text-align:center;">
                <div style="font-size:11px;color:var(--text-dim);">⚠️ IMPORTANTE</div>
                <div style="font-size:13px;color:var(--binance);font-weight:600;margin-top:4px;">
                    Envía exactamente ${paymentAmount.toFixed(2)} USDT en la red TRC20
                </div>
            </div>
        `;
    } else if (selectedPaymentMethod === 'plin') {
        const solesAmount = paymentAmount * SOLES_PER_CREDIT;
        summaryBox.classList.add('plin');
        amountDisplay.textContent = `S/ ${solesAmount.toFixed(2)}`;
        title.innerHTML = '<img src="https://flagcdn.com/w40/pe.png" alt="Perú" style="width:24px;height:16px;vertical-align:middle;margin-right:8px;">Pago con Plin';
        subtitle.textContent = 'Escanea el QR desde la app de Plin';
        
        content.innerHTML = `
            <div class="qr-section">
                <div class="qr-wrapper">
                    <img src="qr-plin.png" alt="QR Plin">
                </div>
                <p style="font-size:12px;color:var(--text-dim);">📱 Escanea con la app de Plin</p>
            </div>
            
            <div class="instructions-box">
                <div>
                    <strong>📝 Instrucciones:</strong><br>
                    1. Abre la app de tu banco con Plin<br>
                    2. Escanea el código QR<br>
                    3. Confirma el pago de <strong>S/ ${solesAmount.toFixed(2)}</strong><br>
                    4. Guarda el número de operación<br>
                    5. Haz clic en "Ya realicé el pago"
                </div>
            </div>
            
            <div style="background:rgba(217,20,63,0.1);border:1px solid var(--peru);border-radius:6px;padding:12px;text-align:center;">
                <div style="font-size:11px;color:var(--text-dim);">⚠️ IMPORTANTE</div>
                <div style="font-size:13px;color:var(--peru);font-weight:600;margin-top:4px;">
                    Envía exactamente S/ ${solesAmount.toFixed(2)} vía Plin
                </div>
            </div>
        `;
    } else if (selectedPaymentMethod === 'pagomovil') {
        const bsAmount = paymentAmount * exchangeRate;
        summaryBox.classList.add('pagomovil');
        amountDisplay.textContent = `Bs ${formatBs(bsAmount)}`;
        title.innerHTML = '<img src="https://flagcdn.com/w40/ve.png" alt="Venezuela" style="width:24px;height:16px;vertical-align:middle;margin-right:8px;">Pago Móvil';
        subtitle.textContent = 'Escanea el QR desde la app de tu banco';
        
        content.innerHTML = `
            <div class="qr-section">
                <div class="qr-wrapper">
                    <img src="qr-pagomovil.png" alt="QR Pago Móvil">
                </div>
                <p style="font-size:12px;color:var(--text-dim);">📱 Escanea con la app de tu banco</p>
            </div>
            
            <div class="instructions-box">
                <div>
                    <strong>📝 Instrucciones:</strong><br>
                    1. Abre la app de tu banco<br>
                    2. Selecciona "Pago Móvil"<br>
                    3. Escanea el código QR<br>
                    4. Confirma la transferencia de <strong>Bs ${formatBs(bsAmount)}</strong><br>
                    5. Guarda los datos de la transacción<br>
                    6. Haz clic en "Ya realicé el pago"
                </div>
            </div>
            
            <div style="background:rgba(252,209,22,0.1);border:1px solid var(--venezuela);border-radius:6px;padding:12px;text-align:center;">
                <div style="font-size:11px;color:var(--text-dim);">⚠️ IMPORTANTE</div>
                <div style="font-size:13px;color:var(--venezuela);font-weight:600;margin-top:4px;">
                    Envía exactamente Bs ${formatBs(bsAmount)} vía Pago Móvil
                </div>
            </div>
        `;
    }
}

// ============================================
// ✅ PASO 4: CONFIRMAR PAGO
// ============================================

function updateStep4Content() {
    // Actualizar resumen
    document.getElementById('confirmAmount').textContent = `$${paymentAmount.toFixed(2)}`;
    document.getElementById('confirmCredits').textContent = paymentAmount.toFixed(2);
    
    const methodNames = {
        'binance': '💰 Binance Pay',
        'plin': '🇵🇪 Plin',
        'pagomovil': '🇻🇪 Pago Móvil'
    };
    document.getElementById('confirmMethod').textContent = methodNames[selectedPaymentMethod];
    
    // Generar campos dinámicos según método
    const fields = document.getElementById('confirmationFields');
    
    if (selectedPaymentMethod === 'binance') {
        fields.innerHTML = `
            <div class="form-group">
                <label>🔗 ID de Transacción (TXID) *</label>
                <input type="text" id="txidInput" placeholder="Ej: a1b2c3d4e5f6g7h8i9j0..." style="font-family:'Share Tech Mono',monospace;font-size:13px;">
                <small style="color:var(--text-dim);font-size:11px;margin-top:4px;display:block;">Lo encuentras en el historial de transacciones de Binance</small>
            </div>
        `;
    } else if (selectedPaymentMethod === 'plin') {
        fields.innerHTML = `
            <div class="form-group">
                <label>🔢 Número de Operación *</label>
                <input type="text" id="plinOperationNumber" placeholder="Ej: 123456789" style="font-family:'Share Tech Mono',monospace;font-size:13px;">
                <small style="color:var(--text-dim);font-size:11px;margin-top:4px;display:block;">Número de operación que aparece en tu app de Plin</small>
            </div>
        `;
    } else if (selectedPaymentMethod === 'pagomovil') {
        fields.innerHTML = `
            <div class="form-group">
                <label>🔢 Últimos 4 dígitos de la cuenta de origen *</label>
                <input type="text" id="pagomovilLastDigits" placeholder="Ej: 1234" maxlength="4" style="font-family:'Share Tech Mono',monospace;font-size:13px;">
                <small style="color:var(--text-dim);font-size:11px;margin-top:4px;display:block;">Últimos 4 dígitos de la cuenta desde donde pagaste</small>
            </div>
            
            <div class="form-group">
                <label>🏦 Banco de origen *</label>
                <select id="pagomovilBank" style="font-size:14px;">
                    <option value="">Selecciona tu banco</option>
                    <option value="Banesco">Banesco (0134)</option>
                    <option value="Mercantil">Mercantil (0105)</option>
                    <option value="BOD">BOD (0171)</option>
                    <option value="Provincial">BBVA Provincial (0108)</option>
                    <option value="Venezuela">Banco de Venezuela (0102)</option>
                    <option value="BBVA">BBVA (0177)</option>
                    <option value="Banco de la Gente">Banco de la Gente (0146)</option>
                    <option value="Bancaribe">Bancaribe (0114)</option>
                    <option value="Exterior">Banco Exterior (0115)</option>
                    <option value="Otro">Otro</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>📄 Número de referencia (opcional)</label>
                <input type="text" id="pagomovilReference" placeholder="Ej: 123456789" style="font-family:'Share Tech Mono',monospace;font-size:13px;">
                <small style="color:var(--text-dim);font-size:11px;margin-top:4px;display:block;">Si aparece en tu comprobante</small>
            </div>
        `;
    }
}

// ============================================
// ✅ SUBIDA DE COMPROBANTE
// ============================================

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('⚠️ El archivo es muy grande (máx. 5MB)', 'error');
        return;
    }
    
    // Validar tipo
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        showToast('⚠️ Solo se permiten imágenes o PDF', 'error');
        return;
    }
    
    // Convertir a base64
    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedReceipt = e.target.result;
        
        const uploadSection = document.getElementById('uploadSection');
        const preview = document.getElementById('uploadPreview');
        const previewImg = document.getElementById('previewImage');
        
        uploadSection.classList.add('has-file');
        uploadSection.querySelector('.upload-text').textContent = '✅ Archivo cargado: ' + file.name;
        
        if (file.type.startsWith('image/')) {
            previewImg.src = uploadedReceipt;
            preview.style.display = 'block';
        } else {
            previewImg.src = '';
            preview.style.display = 'none';
            uploadSection.querySelector('.upload-text').textContent = '✅ PDF cargado: ' + file.name;
        }
        
        showToast('✅ Comprobante cargado', 'success');
    };
    reader.readAsDataURL(file);
}

function removeFile(event) {
    event.stopPropagation();
    uploadedReceipt = null;
    document.getElementById('receiptFile').value = '';
    document.getElementById('uploadSection').classList.remove('has-file');
    document.getElementById('uploadSection').querySelector('.upload-text').textContent = 'Haz clic para subir captura del comprobante';
    document.getElementById('uploadPreview').style.display = 'none';
}

// ============================================
// ✅ CONFIRMAR PAGO (MODIFICADO)
// ============================================

async function confirmPayment() {
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
        paymentMethod: selectedPaymentMethod,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Validar y agregar datos según método
    if (selectedPaymentMethod === 'binance') {
        const txid = document.getElementById('txidInput')?.value.trim();
        
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
        
    } else if (selectedPaymentMethod === 'plin') {
        const operationNumber = document.getElementById('plinOperationNumber')?.value.trim();
        
        if (!operationNumber) {
            showToast('⚠️ Por favor ingresa el número de operación', 'error');
            return;
        }
        
        paymentData.operationNumber = operationNumber;
        paymentData.notes = `Plin: ${operationNumber}`;
        
    } else if (selectedPaymentMethod === 'pagomovil') {
        const lastDigits = document.getElementById('pagomovilLastDigits')?.value.trim();
        const bank = document.getElementById('pagomovilBank')?.value;
        const reference = document.getElementById('pagomovilReference')?.value.trim();
        
        if (!lastDigits || !bank) {
            showToast('⚠️ Por favor completa los campos obligatorios', 'error');
            return;
        }
        
        paymentData.operationNumber = lastDigits;
        paymentData.bank = bank;
        if (reference) paymentData.reference = reference;
        paymentData.notes = `Pago Móvil - ${bank} - ***${lastDigits}${reference ? ' - Ref: ' + reference : ''}`;
    }
    
    // ✅ Agregar comprobante si se subió
    if (uploadedReceipt) {
        paymentData.receipt = uploadedReceipt;
    }
    
    // ✅ Agregar notas adicionales
    const notes = document.getElementById('paymentNotes')?.value.trim();
    if (notes) {
        paymentData.userNotes = notes;
    }
    
    // Deshabilitar botón
    const btn = document.getElementById('btnConfirmPayment');
    btn.disabled = true;
    btn.textContent = '⏳ Enviando...';
    
    try {
        const transactionRef = await db.collection('transactions').add(paymentData);
        
        await notifyNewDeposit(paymentData);
        
        showToast('✅ ¡Pago registrado! Esperando verificación...', 'success');
        
        setTimeout(() => {
            window.location.href = `pago-confirmado.html?tx=${transactionRef.id}`;
        }, 2000);
        
    } catch (error) {
        console.error('Error:', error);
        showToast('❌ Error al registrar pago: ' + error.message, 'error');
        btn.disabled = false;
        btn.textContent = '✅ Confirmar y Enviar';
    }
}

// ============================================
// ✅ TELEGRAM (MODIFICADO PARA INCLUIR COMPROBANTE)
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
    let methodText = '';
    let amountText = '';
    
    if (depositData.paymentMethod === 'binance') {
        methodText = '💰 Binance Pay';
        amountText = `${(depositData.amount || 0).toFixed(2)} USDT`;
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

${depositData.txid ? `🔗 <b>TXID:</b> <code>${depositData.txid}</code>\n` : ''}${depositData.operationNumber ? `🔢 <b>N° Operación:</b> <code>${depositData.operationNumber}</code>\n` : ''}${depositData.receipt ? `📸 <b>Comprobante:</b> Adjunto\n` : ''}${depositData.userNotes ? `📝 <b>Notas:</b> ${depositData.userNotes}\n` : ''}
⏳ <b>Estado:</b> Pendiente de verificación
    `.trim();
    
    return await sendTelegramMessage(message);
}

// ============================================
// ✅ TASA DE CAMBIO
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
        
        if (paymentAmount > 0) updateAmountPreview();
        
        showToast('✅ Tasa actualizada', 'success');
        
    } catch (error) {
        console.error('Error cargando tasa:', error);
        exchangeRate = 850.00;
        rateLastUpdate = new Date();
        updateRateDisplay();
        showToast('⚠️ Usando tasa por defecto (850.00)', 'error');
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

function formatBs(amount) {
    return amount.toLocaleString('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ============================================
// ✅ AUTENTICACIÓN (MODIFICADO)
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
    
    // Verificar si viene con monto de URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlAmount = parseFloat(urlParams.get('amount'));
    
    if (urlAmount > 0) {
        paymentAmount = urlAmount;
        document.getElementById('customAmount').value = urlAmount;
        updateAmountPreview();
        document.getElementById('btnStep1Next').disabled = false;
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