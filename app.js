// Variables globales de Firebase
const NexaGSM = {
    state: {
        currentUser: null,
        userProfile: null,
        services: [],
        prices: [],
        inactivityTimer: null,
        warningTimer: null,
        lastActivity: Date.now()
    },
    
    // ✅ CONFIGURACIÓN DE INACTIVIDAD
    inactivityConfig: {
        timeout: 5 * 60 * 1000,      // 5 minutos de inactividad para cerrar sesión
        warningTime: 2 * 60 * 1000,   // 2 minutos antes de cerrar sesión mostrar advertencia
        enabled: true                  // Activar/desactivar esta funcionalidad
    },
    
    // ✅ CONFIGURACIÓN DE TELEGRAM BOT
    telegramConfig: {
        botToken: '7801739137:AAFWjOf0ebKhIMD-BqWBF_eqCydIXKK4fKw',  // 🔑 REEMPLAZA CON TU TOKEN
        chatId: '1461150518',      // 🔑 REEMPLAZA CON TU CHAT ID
        enabled: true                    // Activar/desactivar notificaciones
    },
    
    currentRegisterStep: 1,

    async init() {
        if (typeof auth === 'undefined' || typeof db === 'undefined') {
            console.error('❌ Firebase no está inicializado.');
            this.showToast('Error: Firebase no está configurado.', 'error');
            return;
        }

        this.setupEventListeners();
        this.setupPricingTabs();
        this.setupMobileMenu();
        this.initCarousel();
        this.setupPreciosVisibility();

        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // ✅ SIN VERIFICACIÓN DE SESIONES - Login directo
                await this.handleSession(user);
                
                // ✅ Iniciar tracking de inactividad cuando hay sesión
                if (this.inactivityConfig.enabled) {
                    this.startInactivityTracking();
                }
            } else {
                this.handleLogout();
                // ✅ Detener tracking cuando no hay sesión
                this.stopInactivityTracking();
            }
        });
    },

    // ✅ FUNCIÓN PARA ENVIAR MENSAJE A TELEGRAM
    async sendTelegramMessage(message) {
        if (!this.telegramConfig.enabled) {
            console.log('🔕 Notificaciones de Telegram desactivadas');
            return false;
        }
        
        try {
            const url = `https://api.telegram.org/bot${this.telegramConfig.botToken}/sendMessage`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: this.telegramConfig.chatId,
                    text: message,
                    parse_mode: 'HTML'
                })
            });
            
            const data = await response.json();
            
            if (data.ok) {
                console.log('✅ Notificación enviada a Telegram');
                return true;
            } else {
                console.error('❌ Error enviando notificación:', data.description);
                return false;
            }
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

${orderData.imei ? `🔢 <b>IMEI:</b> ${orderData.imei}\n` : ''}${orderData.ip ? `🌐 <b>IP:</b> ${orderData.ip}\n` : ''}${orderData.sn ? `📱 <b>SN:</b> ${orderData.sn}\n` : ''}
⏳ <b>Estado:</b> Pendiente de revisión
        `.trim();
        
        return await this.sendTelegramMessage(message);
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

${depositData.txid ? `🔗 <b>TXID:</b> ${depositData.txid}\n` : ''}${depositData.walletAddress ? `📍 <b>Wallet:</b> ${depositData.walletAddress}\n` : ''}
⏳ <b>Estado:</b> Pendiente de verificación
        `.trim();
        
        return await this.sendTelegramMessage(message);
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
        
        return await this.sendTelegramMessage(message);
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
        
        return await this.sendTelegramMessage(message);
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
        
        return await this.sendTelegramMessage(message);
    },

    // ✅ SISTEMA DE TRACKING DE INACTIVIDAD
    startInactivityTracking() {
        console.log('🔒 Tracking de inactividad activado');
        
        // Eventos que resetean el timer
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.resetInactivityTimer();
            }, { passive: true });
        });
        
        // Iniciar timer inicial
        this.resetInactivityTimer();
    },

    stopInactivityTracking() {
        console.log('🔓 Tracking de inactividad desactivado');
        
        if (this.state.inactivityTimer) {
            clearTimeout(this.state.inactivityTimer);
            this.state.inactivityTimer = null;
        }
        
        if (this.state.warningTimer) {
            clearTimeout(this.state.warningTimer);
            this.state.warningTimer = null;
        }
        
        // Remover event listeners
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        activityEvents.forEach(event => {
            document.removeEventListener(event, () => this.resetInactivityTimer());
        });
    },

    resetInactivityTimer() {
        this.state.lastActivity = Date.now();
        
        // Limpiar timers anteriores
        if (this.state.inactivityTimer) {
            clearTimeout(this.state.inactivityTimer);
        }
        
        if (this.state.warningTimer) {
            clearTimeout(this.state.warningTimer);
        }
        
        // Timer para mostrar advertencia (2 minutos antes)
        const warningDelay = this.inactivityConfig.timeout - this.inactivityConfig.warningTime;
        
        this.state.warningTimer = setTimeout(() => {
            this.showInactivityWarning();
        }, warningDelay);
        
        // Timer para cerrar sesión
        this.state.inactivityTimer = setTimeout(() => {
            this.autoLogout();
        }, this.inactivityConfig.timeout);
    },

    showInactivityWarning() {
        const remainingSeconds = Math.floor(this.inactivityConfig.warningTime / 1000);
        
        // Crear modal de advertencia si no existe
        if (!document.getElementById('inactivityWarningModal')) {
            const modal = document.createElement('div');
            modal.id = 'inactivityWarningModal';
            modal.className = 'modal-overlay open';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(4,10,18,0.95);backdrop-filter:blur(6px);z-index:10000;display:flex;align-items:center;justify-content:center;';
            
            modal.innerHTML = `
                <div style="background:var(--surface);border:2px solid var(--yellow);border-radius:12px;padding:32px;max-width:500px;text-align:center;animation:modalSlideIn 0.3s ease;">
                    <div style="font-size:64px;margin-bottom:16px;">⚠️</div>
                    <h2 style="font-family:'Orbitron',monospace;font-size:20px;color:var(--yellow);margin-bottom:12px;">Sesión por Expirar</h2>
                    <p style="color:var(--text-muted);margin-bottom:24px;line-height:1.6;">
                        Tu sesión se cerrará automáticamente por inactividad en <strong id="countdown" style="color:var(--yellow);font-size:18px;">${remainingSeconds}</strong> segundos.
                    </p>
                    <button id="btnStayLoggedIn" class="btn-primary" style="padding:12px 32px;font-size:15px;margin-right:12px;">
                        ✅ Permanecer Conectado
                    </button>
                    <button id="btnLogoutNow" class="btn-ghost" style="padding:12px 32px;font-size:15px;border-color:var(--red);color:var(--red);">
                        🚪 Cerrar Sesión Ahora
                    </button>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Event listeners para los botones
            document.getElementById('btnStayLoggedIn').addEventListener('click', () => {
                this.dismissInactivityWarning();
            });
            
            document.getElementById('btnLogoutNow').addEventListener('click', () => {
                this.autoLogout();
            });
        }
        
        // Iniciar countdown
        this.startCountdown(remainingSeconds);
    },

    startCountdown(seconds) {
        const countdownEl = document.getElementById('countdown');
        if (!countdownEl) return;
        
        const interval = setInterval(() => {
            seconds--;
            if (countdownEl) {
                countdownEl.textContent = seconds;
            }
            
            if (seconds <= 0) {
                clearInterval(interval);
            }
        }, 1000);
        
        // Guardar interval para limpiarlo si el usuario permanece conectado
        this.state.countdownInterval = interval;
    },

    dismissInactivityWarning() {
        const modal = document.getElementById('inactivityWarningModal');
        if (modal) {
            modal.remove();
        }
        
        if (this.state.countdownInterval) {
            clearInterval(this.state.countdownInterval);
            this.state.countdownInterval = null;
        }
        
        // Resetear timer
        this.resetInactivityTimer();
        
        this.showToast('✅ Sesión renovada', 'success');
    },

    async autoLogout() {
        console.log('🔒 Cerrando sesión por inactividad');
        
        // Limpiar modal de advertencia si existe
        const modal = document.getElementById('inactivityWarningModal');
        if (modal) {
            modal.remove();
        }
        
        if (this.state.countdownInterval) {
            clearInterval(this.state.countdownInterval);
            this.state.countdownInterval = null;
        }
        
        // Mostrar mensaje
        this.showToast('🔒 Sesión cerrada por inactividad', 'error');
        
        // Cerrar sesión
        await this.logout();
        
        // Detener tracking
        this.stopInactivityTracking();
    },

    setupPreciosVisibility() {
        const preciosSection = document.getElementById('precios');
        const navBtnPrecios = document.getElementById('navBtnPrecios');
        
        if (!preciosSection || !navBtnPrecios) return;
        
        preciosSection.style.display = 'none';
        preciosSection.style.opacity = '0';
        preciosSection.style.transition = 'opacity 0.5s ease';
        
        navBtnPrecios.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (!this.state.currentUser) {
                this.openModal('login');
                return;
            }
            
            preciosSection.style.display = 'block';
            
            setTimeout(() => {
                preciosSection.style.opacity = '1';
            }, 50);
            
            setTimeout(() => {
                preciosSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        });
    },

    initCarousel() {
        const track = document.getElementById('carouselTrack');
        const dotsContainer = document.getElementById('carouselDots');
        
        if (!track || !dotsContainer) return;
        
        const slides = track.querySelectorAll('.carousel-slide');
        let currentSlide = 0;
        let autoPlayInterval;

        slides.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.className = 'carousel-dot' + (index === 0 ? ' active' : '');
            dot.onclick = () => {
                currentSlide = index;
                updateCarousel();
                resetAutoPlay();
            };
            dotsContainer.appendChild(dot);
        });

        const dots = dotsContainer.querySelectorAll('.carousel-dot');

        function updateCarousel() {
            track.style.transform = `translateX(-${currentSlide * 100}%)`;
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === currentSlide);
            });
        }

        function nextSlide() {
            currentSlide = (currentSlide + 1) % slides.length;
            updateCarousel();
        }

        function prevSlide() {
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            updateCarousel();
        }

        function startAutoPlay() {
           // autoPlayInterval = setInterval(nextSlide, 4000);
        }

        function resetAutoPlay() {
            clearInterval(autoPlayInterval);
            startAutoPlay();
        }

        window.moveCarousel = function(direction) {
            if (direction === 1) nextSlide();
            else prevSlide();
            resetAutoPlay();
        };

        updateCarousel();
        startAutoPlay();

        const carousel = track.closest('.brands-carousel');
        if (carousel) {
            carousel.addEventListener('mouseenter', () => clearInterval(autoPlayInterval));
            carousel.addEventListener('mouseleave', startAutoPlay);
        }
    },

    async handleSession(user) {
        this.state.currentUser = user;
        
        try {
            const profileDoc = await db.collection('profiles').doc(user.uid).get();
            
            if (profileDoc.exists) {
                this.state.userProfile = profileDoc.data();
            } else {
                const name = user.displayName || user.email.split('@')[0];
                const newProfile = { 
                    name, 
                    email: user.email, 
                    role: 'user', 
                    createdAt: new Date().toISOString() 
                };
                
                await db.collection('profiles').doc(user.uid).set(newProfile, { merge: true });
                this.state.userProfile = newProfile;
            }

            await this.logLoginSession();
            await this.loadData();
            this.updateAuthUI();
            
            const preciosSection = document.getElementById('precios');
            if (preciosSection) {
                preciosSection.style.opacity = '0';
                setTimeout(() => {
                    preciosSection.style.display = 'none';
                }, 500);
            }
            
            setTimeout(() => {
                this.showToast(`¡Bienvenido, ${this.state.userProfile.name}!`, 'success');
            }, 600);
            
        } catch (error) {
            console.error('Error en handleSession:', error);
            this.showToast('Error al cargar perfil: ' + error.message, 'error');
        }
    },

    async logLoginSession() {
        if (!this.state.currentUser) return;
        
        try {
            const ip = await this.getUserIPForLog();
            const countryData = await this.getCountryFromIP(ip);
            const device = this.getDeviceInfo();
            
            await db.collection('loginLogs').add({
                userId: this.state.currentUser.uid,
                email: this.state.currentUser.email,
                ip: ip,
                countryCode: countryData.countryCode || 'Unknown',
                countryName: countryData.countryName || 'Unknown',
                device: device,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ Sesión registrada:', ip, countryData.countryName);
        } catch (error) {
            console.error('❌ Error registrando sesión:', error);
        }
    },

    async getUserIPForLog() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.error('Error obteniendo IP:', error);
            return 'Unknown';
        }
    },

    async getCountryFromIP(ip) {
        try {
            if (ip === 'Unknown') {
                return { countryCode: 'Unknown', countryName: 'Unknown' };
            }
            
            const response = await fetch(`https://ipapi.co/${ip}/json/`);
            const data = await response.json();
            
            return {
                countryCode: data.country_code || 'Unknown',
                countryName: data.country_name || 'Unknown'
            };
        } catch (error) {
            console.error('Error obteniendo país:', error);
            return { countryCode: 'Unknown', countryName: 'Unknown' };
        }
    },

    getDeviceInfo() {
        const ua = navigator.userAgent;
        
        let browser = 'Other';
        if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
        else if (ua.includes('Edg')) browser = 'Edge';
        else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
        
        let os = 'Unknown';
        if (ua.includes('Windows')) os = 'Windows';
        else if (ua.includes('Mac')) os = 'macOS';
        else if (ua.includes('Linux')) os = 'Linux';
        else if (ua.includes('Android')) os = 'Android';
        else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
        
        return `${browser} - ${os}`;
    },

    async loadData() {
        try {
            const servicesSnap = await db.collection('services').orderBy('createdAt', 'desc').get();
            const pricesSnap = await db.collection('prices').orderBy('createdAt', 'desc').get();
            
            this.state.services = servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.state.prices = pricesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            console.log('✅ Servicios cargados:', this.state.services.length);
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
        }
    },

    async register() {
        try {
            const firstName = document.getElementById('regFirstName').value;
            const lastName = document.getElementById('regLastName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            const phone = document.getElementById('regPhone').value;
            const address1 = document.getElementById('regAddress1').value;
            const address2 = document.getElementById('regAddress2').value;
            const country = document.getElementById('regCountry').value;
            const state = document.getElementById('regState').value;
            const city = document.getElementById('regCity').value;
            const zipCode = document.getElementById('regZipCode').value;
            const newsletter = document.getElementById('regNewsletter').checked;
            
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({ displayName: `${firstName} ${lastName}` });
            
            const profileRef = db.collection('profiles').doc(userCredential.user.uid);
            const profileDoc = await profileRef.get();
            
            if (!profileDoc.exists) {
                await profileRef.set({
                    name: firstName,
                    lastName: lastName,
                    email: email,
                    phone: phone,
                    address1: address1,
                    address2: address2,
                    country: country,
                    state: state,
                    city: city,
                    zipCode: zipCode,
                    role: 'user',
                    newsletter: newsletter,
                    balance: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            } else {
                await profileRef.set({
                    name: firstName,
                    lastName: lastName,
                    phone: phone,
                    address1: address1,
                    address2: address2,
                    country: country,
                    state: state,
                    city: city,
                    zipCode: zipCode,
                    newsletter: newsletter,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            }
            
            // ✅ ENVIAR NOTIFICACIÓN A TELEGRAM
            await this.notifyNewUser({
                email: email,
                name: `${firstName} ${lastName}`,
                phone: phone,
                country: country
            });
            
            this.showToast('✅ ¡Cuenta creada con éxito!', 'success');
            return true;
        } catch (error) {
            console.error('Error en registro:', error);
            
            if (error.code === 'auth/email-already-in-use') {
                this.showToast('❌ Este correo ya está registrado. Intenta iniciar sesión.', 'error');
            } else if (error.code === 'auth/weak-password') {
                this.showToast('❌ La contraseña debe tener al menos 6 caracteres.', 'error');
            } else if (error.code === 'auth/invalid-email') {
                this.showToast('❌ El correo electrónico no es válido.', 'error');
            } else {
                this.showToast('❌ Error: ' + error.message, 'error');
            }
            return false;
        }
    },

    nextStep(currentStep) {
        if (!this.validateStep(currentStep)) {
            return;
        }
        
        document.getElementById(`step${currentStep}`).style.display = 'none';
        
        this.currentRegisterStep = currentStep + 1;
        document.getElementById(`step${this.currentRegisterStep}`).style.display = 'block';
        
        this.updateProgressBar();
    },

    prevStep(currentStep) {
        document.getElementById(`step${currentStep}`).style.display = 'none';
        
        this.currentRegisterStep = currentStep - 1;
        document.getElementById(`step${this.currentRegisterStep}`).style.display = 'block';
        
        this.updateProgressBar();
    },

    updateProgressBar() {
        const percentage = (this.currentRegisterStep / 3) * 100;
        document.getElementById('progressBar').style.width = `${percentage}%`;
        document.getElementById('currentStep').textContent = this.currentRegisterStep;
        document.getElementById('stepPercentage').textContent = `${Math.round(percentage)}%`;
    },

    validateStep(step) {
        if (step === 1) {
            const firstName = document.getElementById('regFirstName').value;
            const lastName = document.getElementById('regLastName').value;
            const address1 = document.getElementById('regAddress1').value;
            const country = document.getElementById('regCountry').value;
            const state = document.getElementById('regState').value;
            const city = document.getElementById('regCity').value;
            const zipCode = document.getElementById('regZipCode').value;
            
            if (!firstName || !lastName || !address1 || !country || !state || !city || !zipCode) {
                this.showToast('⚠️ Completa todos los campos obligatorios', 'error');
                return false;
            }
            return true;
        }
        
        if (step === 2) {
            const phone = document.getElementById('regPhone').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;
            
            if (!phone || !email || !password) {
                this.showToast('⚠️ Completa todos los campos', 'error');
                return false;
            }
            
            if (password.length < 6) {
                this.showToast('⚠️ La contraseña debe tener al menos 6 caracteres', 'error');
                return false;
            }
            
            if (!email.includes('@')) {
                this.showToast('⚠️ Ingresa un correo válido', 'error');
                return false;
            }
            
            return true;
        }
        
        return true;
    },

    async login(email, password) {
        try {
            // ✅ LOGIN DIRECTO - SIN VERIFICACIÓN DE SESIONES
            await auth.signInWithEmailAndPassword(email, password);
            
            // Cerrar modal de login
            setTimeout(() => {
                const modal = document.getElementById('authModal');
                if (modal) {
                    modal.classList.add('fade-out');
                    setTimeout(() => {
                        modal.classList.remove('open', 'fade-out');
                        this.closeModal();
                    }, 400);
                }
            }, 500);
            
            return true;
        } catch (error) {
            console.error('Error en login:', error);
            this.showToast(this.getErrorMessage(error.code), 'error');
            return false;
        }
    },

    async logout() {
        try {
            await auth.signOut();
        } catch (error) {
            console.error('Error en logout:', error);
        }
    },

    handleLogout() {
        this.state.currentUser = null;
        this.state.userProfile = null;
        this.state.services = [];
        this.state.prices = [];
        this.updateAuthUI();
        this.hideAdminPanel();
        this.hideClientPanel();
        
        const preciosSection = document.getElementById('precios');
        if (preciosSection) {
            preciosSection.style.display = 'block';
            setTimeout(() => {
                preciosSection.style.opacity = '1';
            }, 50);
        }
        
        this.showToast('Sesión cerrada.', 'success');
    },

    isAdmin() { return this.state.userProfile?.role === 'admin'; },
    isClient() { return this.state.userProfile?.role === 'client'; },

    getErrorMessage(code) {
        const errors = {
            'auth/email-already-in-use': 'Este correo ya está registrado.',
            'auth/invalid-email': 'Correo inválido.',
            'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
            'auth/user-not-found': 'Usuario no encontrado.',
            'auth/wrong-password': 'Contraseña incorrecta.',
            'auth/invalid-credential': 'Correo o contraseña incorrectos.',
            'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.'
        };
        return errors[code] || 'Error de autenticación.';
    },

    updateAuthUI() {
        const navAuth = document.getElementById('navAuth');
        const navLinks = document.getElementById('navLinks');
        const mobileDrawer = document.getElementById('mobileDrawer');
        
        const pricingLocked = document.getElementById('pricingLocked');
        const pricingUnlocked = document.getElementById('pricingUnlocked');
        
        const navAdminLink = document.getElementById('navAdminLink');
        const navImportLink = document.getElementById('navImportLink');
        
        if (this.state.currentUser) {
            navLinks.classList.remove('hidden-nav');
            
            const name = this.state.userProfile?.name || 'Usuario';
            const initial = name.charAt(0).toUpperCase();
            const isAdmin = this.isAdmin();
            const isClient = this.isClient();
            const roleLabel = isAdmin ? 'ADMIN' : isClient ? 'CLIENTE' : '';
            const roleColor = isAdmin ? '#ff6b35' : isClient ? '#00ff88' : '';
            
            if (navAdminLink) {
                if (isAdmin || isClient) {
                    navAdminLink.style.display = 'block';
                } else {
                    navAdminLink.style.display = 'none';
                }
            }
            
            if (navImportLink) {
                if (isAdmin || isClient) {
                    navImportLink.style.display = 'block';
                } else {
                    navImportLink.style.display = 'none';
                }
            }
            
            let panelButton = '<a href="dashboard.html" class="btn-ghost" style="margin-left:10px;color:var(--cyan);border-color:var(--cyan);text-decoration:none;">👤 Perfil</a>';
            if (isAdmin) {
                panelButton += '<button class="btn-ghost" id="btnAdminPanel" style="margin-left:10px;">Panel Admin</button>';
                panelButton += '<button class="btn-ghost" id="btnClientPanel" style="margin-left:10px;color:#00ff88;border-color:#00ff88;">📊 Mis Estadísticas</button>';
                panelButton += '<a href="admin-pedidos.html" class="btn-ghost" style="margin-left:10px;color:var(--yellow);border-color:var(--yellow);">🔧 Admin Pedidos</a>';
                panelButton += '<a href="importar-descargas.html" class="btn-ghost" style="margin-left:10px;color:#00ff88;border-color:#00ff88;">📥 Importar</a>';
            } else if (isClient) {
                panelButton += '<button class="btn-ghost" id="btnClientPanel" style="margin-left:10px;color:#00ff88;border-color:#00ff88;">📊 Mis Estadísticas</button>';
                panelButton += '<a href="admin-pedidos.html" class="btn-ghost" style="margin-left:10px;color:var(--yellow);border-color:var(--yellow);">🔧 Admin Pedidos</a>';
                panelButton += '<a href="importar-descargas.html" class="btn-ghost" style="margin-left:10px;color:#00ff88;border-color:#00ff88;">📥 Importar</a>';
            }

            navAuth.innerHTML = `
                <div class="user-pill">
                    <div class="user-avatar" style="background: ${roleColor || 'var(--cyan)'}">${initial}</div>
                    <span class="user-name">${name}</span>
                    ${roleLabel ? `<span style="font-size:10px;color:${roleColor};font-weight:700;">${roleLabel}</span>` : ''}
                    <button class="btn-logout-text" id="btnLogout" style="margin-left:10px;background:rgba(255,68,85,0.15);border:1px solid #ff4455;color:#ff4455;padding:4px 12px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;transition:all 0.2s;">Cerrar Sesión</button>
                </div>
                ${panelButton}
            `;
            
            mobileDrawer.innerHTML = `
                <ul class="mobile-nav-links">
                    <li><a href="#" class="mobile-dropdown-toggle">Servicios</a>
                        <div class="mobile-dropdown-content">
                          <a href="registros-imei.html?filter=unlock">Registros IMEI / SN</a>
                          <a href="licencias-creditos.html?filter=license">Licencias & Créditos</a>
                          <a href="remotos-rent-tools.html?filter=remote">Remotos & Rent Tools</a>
                          <a href="servicios-streaming.html?filter=remote">Servicios de streaming</a>
                        </div>
                    </li>
                    <li><a href="precios.html">Paquetes</a></li>
                    <li><a href="descargas.html">Descargas</a></li>
                    <li><a href="soporte.html">Soporte</a></li>
                </ul>
                <div class="mobile-nav-actions">
                  <div style="padding:10px 16px;color:var(--text-muted);font-size:13px;">Conectado como: <strong style="color:var(--cyan);">${name}</strong> ${roleLabel ? `<span style="color:${roleColor};">(${roleLabel})</span>` : ''}</div>
                  <a href="dashboard.html" class="btn-ghost" style="color:var(--cyan);border-color:var(--cyan);text-decoration:none;">👤 Perfil</a>                    
                  ${isAdmin ? '<button class="btn-ghost" id="mobileBtnAdminPanel">Panel Admin</button>' : ''}
                  ${(isAdmin || isClient) ? '<button class="btn-ghost" id="mobileBtnClientPanel" style="color:#00ff88;border-color:#00ff88;">📊 Estadísticas</button>' : ''}
                  ${(isAdmin || isClient) ? '<a href="admin-pedidos.html" class="btn-ghost" style="color:var(--yellow);border-color:var(--yellow);text-decoration:none;text-align:center;">🔧 Admin Pedidos</a>' : ''}
                  ${(isAdmin || isClient) ? '<a href="importar-descargas.html" class="btn-ghost" style="color:#00ff88;border-color:#00ff88;text-decoration:none;text-align:center;"> Importar</a>' : ''}
                  <button class="btn-ghost" id="mobileBtnLogout">Cerrar Sesión</button>
                </div>
            `;
            
            const btnLogout = document.getElementById('btnLogout');
            if (btnLogout) btnLogout.addEventListener('click', () => this.logout());
            const mobileBtnLogout = document.getElementById('mobileBtnLogout');
            if (mobileBtnLogout) mobileBtnLogout.addEventListener('click', () => this.logout());
            
            const btnDashboard = document.getElementById('btnDashboard');
            if (btnDashboard) btnDashboard.addEventListener('click', () => this.openDashboard());
            
            const mobileBtnDashboard = document.getElementById('mobileBtnDashboard');
            if (mobileBtnDashboard) {
                mobileBtnDashboard.addEventListener('click', () => {
                    this.openDashboard();
                    const menuToggle = document.getElementById('menuToggle');
                    const drawer = document.getElementById('mobileDrawer');
                    const overlay = document.getElementById('drawerOverlay');
                    if (menuToggle) menuToggle.classList.remove('active');
                    if (drawer) drawer.classList.remove('open');
                    if (overlay) overlay.classList.remove('open');
                    document.body.style.overflow = '';
                });
            }
            
            const mobileBtnPrecios = document.getElementById('mobileBtnPrecios');
            if (mobileBtnPrecios) {
                mobileBtnPrecios.addEventListener('click', (e) => {
                    e.preventDefault();
                    const preciosSection = document.getElementById('precios');
                    if (preciosSection) {
                        preciosSection.style.display = 'block';
                        setTimeout(() => {
                            preciosSection.style.opacity = '1';
                            preciosSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 50);
                        const menuToggle = document.getElementById('menuToggle');
                        const mobileDrawer = document.getElementById('mobileDrawer');
                        const drawerOverlay = document.getElementById('drawerOverlay');
                        if (menuToggle) menuToggle.classList.remove('active');
                        if (mobileDrawer) mobileDrawer.classList.remove('open');
                        if (drawerOverlay) drawerOverlay.classList.remove('open');
                        document.body.style.overflow = '';
                    }
                });
            }
            
            if (isAdmin) {
                const btnAdminPanel = document.getElementById('btnAdminPanel');
                if (btnAdminPanel) btnAdminPanel.addEventListener('click', () => this.showAdminPanel());
                const mobileBtnAdminPanel = document.getElementById('mobileBtnAdminPanel');
                if (mobileBtnAdminPanel) mobileBtnAdminPanel.addEventListener('click', () => this.showAdminPanel());
            }
            
            if (isAdmin || isClient) {
                const btnClientPanel = document.getElementById('btnClientPanel');
                if (btnClientPanel) btnClientPanel.addEventListener('click', () => this.showClientPanel());
                const mobileBtnClientPanel = document.getElementById('mobileBtnClientPanel');
                if (mobileBtnClientPanel) mobileBtnClientPanel.addEventListener('click', () => this.showClientPanel());
            }
            
            document.querySelectorAll('.mobile-dropdown-toggle').forEach(toggle => {
                toggle.addEventListener('click', (e) => { e.preventDefault(); toggle.classList.toggle('open'); toggle.nextElementSibling.classList.toggle('open'); });
            });

            if (pricingLocked) pricingLocked.style.display = 'none';
            if (pricingUnlocked) pricingUnlocked.style.display = 'block';
            
        } else {
            navLinks.classList.add('hidden-nav');
            
            if (navAdminLink) navAdminLink.style.display = 'none';
            if (navImportLink) navImportLink.style.display = 'none';
            
            navAuth.innerHTML = `<a href="#" class="btn-ghost" id="btnOpenLogin">Iniciar Sesión</a><a href="#" class="btn-primary" id="btnOpenRegister">Registrarse</a>`;
            mobileDrawer.innerHTML = `<div class="mobile-nav-actions"><a href="#" class="btn-ghost" id="mobileBtnLogin">Iniciar Sesión</a><a href="#" class="btn-primary" id="mobileBtnRegister">Registrarse</a></div>`;
            
            const btnOpenLogin = document.getElementById('btnOpenLogin');
            if (btnOpenLogin) btnOpenLogin.addEventListener('click', (e) => { e.preventDefault(); this.openModal('login'); });
            const btnOpenRegister = document.getElementById('btnOpenRegister');
            if (btnOpenRegister) btnOpenRegister.addEventListener('click', (e) => { e.preventDefault(); this.openModal('register'); });
            const mobileBtnLogin = document.getElementById('mobileBtnLogin');
            if (mobileBtnLogin) mobileBtnLogin.addEventListener('click', (e) => { e.preventDefault(); this.openModal('login'); });
            const mobileBtnRegister = document.getElementById('mobileBtnRegister');
            if (mobileBtnRegister) mobileBtnRegister.addEventListener('click', (e) => { e.preventDefault(); this.openModal('register'); });

            if (pricingLocked) pricingLocked.style.display = 'block';
            if (pricingUnlocked) pricingUnlocked.style.display = 'none';
        }
    },

    async showAdminPanel() {
        if (!this.isAdmin()) return;
        document.getElementById('adminModal').classList.add('open');
        
        try {
            const profilesSnap = await db.collection('profiles').orderBy('createdAt', 'desc').get();
            const users = profilesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const adminUsersList = document.getElementById('adminUsersList');
            if (users.length === 0) {
                adminUsersList.innerHTML = '<p style="text-align:center;color:var(--text-dim);padding:20px;">No hay usuarios registrados.</p>';
            } else {
                adminUsersList.innerHTML = users.map(user => `
                    <div style="background:var(--dark3);border:1px solid var(--cyan-border);border-radius:6px;padding:16px;margin-bottom:10px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <div style="font-weight:600;color:var(--text);margin-bottom:4px;">${user.name} <span style="font-size:10px;color:${user.role==='admin'?'#ff6b35':user.role==='client'?'#00ff88':'var(--text-dim)'};border:1px solid currentColor;padding:2px 6px;border-radius:4px;margin-left:8px;">${user.role.toUpperCase()}</span></div>
                                <div style="font-size:13px;color:var(--text-muted);">${user.email}</div>
                                <div style="font-size:11px;color:var(--text-dim);margin-top:4px;">Registrado: ${new Date(user.createdAt).toLocaleDateString('es-ES')}</div>
                            </div>
                            ${user.role !== 'admin' ? `<button class="btn-ghost" onclick="NexaGSM.deleteUser('${user.id}')" style="padding:6px 12px;font-size:11px;color:#ff4455;border-color:#ff4455;">Eliminar</button>` : ''}
                        </div>
                    </div>
                `).join('');
            }
            document.getElementById('adminTotalUsers').textContent = users.length;
        } catch (error) {
            console.error('Error mostrando admin panel:', error);
        }
    },

    async deleteUser(userId) {
        if (!this.isAdmin() || !confirm('¿Eliminar este usuario?')) return;
        try {
            await db.collection('profiles').doc(userId).delete();
            this.showToast('Perfil eliminado.', 'success');
            this.showAdminPanel();
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            this.showToast('Error al eliminar.', 'error');
        }
    },

    hideAdminPanel() { document.getElementById('adminModal').classList.remove('open'); },
    
    async showClientPanel() { 
        if (!this.isClient() && !this.isAdmin()) {
            this.showToast('Acceso denegado.', 'error');
            return;
        }
        
        document.getElementById('clientModal').classList.add('open');
        await this.loadUserStats();
    },
    
    hideClientPanel() { document.getElementById('clientModal').classList.remove('open'); },

    switchClientTab(tab) {
        const s = document.getElementById('clientSectionServicios');
        const p = document.getElementById('clientSectionPrecios');
        if (tab === 'servicios') { 
            s.style.display = 'block'; p.style.display = 'none'; 
            document.getElementById('tabServicios').classList.add('active'); 
            document.getElementById('tabPrecios').classList.remove('active'); 
            this.renderClientServices(); 
        } else { 
            s.style.display = 'none'; p.style.display = 'block'; 
            document.getElementById('tabServicios').classList.remove('active'); 
            document.getElementById('tabPrecios').classList.add('active'); 
            this.renderClientPrices(); 
        }
    },

    renderClientServices() {
        const list = document.getElementById('clientServicesList');
        
        if (!this.state.services || this.state.services.length === 0) { 
            list.innerHTML = '<p style="text-align:center;color:var(--text-dim);padding:20px;">No hay servicios. ¡Agrega el primero!</p>'; 
            return; 
        }
        
        list.innerHTML = this.state.services.map(service => {
            let tagsHTML = '';
            if (service.tags) {
                const tagsArray = Array.isArray(service.tags) 
                    ? service.tags 
                    : service.tags.split(',').map(t => t.trim());
                tagsHTML = tagsArray.map(t => `<span class="tag">${t}</span>`).join('');
            }

            return `
                <div style="background:var(--dark3);border:1px solid var(--cyan-border);border-radius:6px;padding:16px;margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                        <div style="flex:1;">
                            <div style="font-weight:600;color:var(--text);margin-bottom:4px;">${service.name}</div>
                            <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">${service.description || 'Sin descripción'}</div>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
                                <span class="tag">${service.category || 'general'}</span>
                                ${service.stock ? '<span class="tag" style="background:rgba(0,255,136,0.1);color:#00ff88;">✓ Stock</span>' : '<span class="tag" style="background:rgba(255,68,85,0.1);color:#ff4455;">Agotado</span>'}
                                ${service.autoServer ? '<span class="tag" style="background:rgba(0,229,255,0.1);color:var(--cyan);">⚡ Auto</span>' : ''}
                                ${tagsHTML}
                            </div>
                            <div style="font-family:'Orbitron',monospace;font-size:14px;color:var(--yellow);margin-top:8px;">
                                $${(service.credits || service.price || 0).toFixed(2)} créditos
                            </div>
                        </div>
                        <div style="display:flex;gap:8px;flex-direction:column;">
                            <button class="btn-ghost" onclick="NexaGSM.openServiceModal('${service.id}')" style="padding:6px 12px;font-size:11px;color:var(--cyan);border-color:var(--cyan);">✏️ Editar</button>
                            <button class="btn-ghost" onclick="NexaGSM.deleteService('${service.id}')" style="padding:6px 12px;font-size:11px;color:#ff4455;border-color:#ff4455;">🗑️ Eliminar</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderClientPrices() {
        const list = document.getElementById('clientPricesList');
        if (this.state.prices.length === 0) { 
            list.innerHTML = '<p style="text-align:center;color:var(--text-dim);padding:20px;">No hay precios configurados.</p>'; 
            return; 
        }
        list.innerHTML = this.state.prices.map(price => {
            const service = this.state.services.find(s => s.id === price.service_id);
            const statusColors = { active: 'var(--green)', limited: 'var(--yellow)', inactive: '#ff4455' };
            const statusLabels = { active: 'Activo', limited: 'Limitado', inactive: 'Inactivo' };
            return `
                <div style="background:var(--dark3);border:1px solid var(--cyan-border);border-radius:6px;padding:16px;margin-bottom:10px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div style="flex:1;">
                            <div style="font-weight:600;color:var(--text);margin-bottom:4px;">${service ? service.name : 'Servicio eliminado'}</div>
                            <div style="font-size:13px;color:var(--text-muted);">Tiempo: ${price.time}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-family:'Orbitron',monospace;font-size:20px;font-weight:700;color:var(--cyan);margin-bottom:4px;">$${parseFloat(price.amount).toFixed(2)}</div>
                            <div style="font-size:11px;color:${statusColors[price.status]}">● ${statusLabels[price.status]}</div>
                        </div>
                        <div style="display:flex;gap:8px;margin-left:16px;">
                            <button class="btn-ghost" onclick="NexaGSM.openPriceModal('${price.id}')" style="padding:6px 12px;font-size:11px;">Editar</button>
                            <button class="btn-ghost" onclick="NexaGSM.deletePrice('${price.id}')" style="padding:6px 12px;font-size:11px;color:#ff4455;border-color:#ff4455;">Eliminar</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    openServiceModal(serviceId = null) {
        const modal = document.getElementById('serviceModal');
        const title = document.getElementById('serviceModalTitle');
        const form = document.getElementById('formService');
        
        if (serviceId) {
            const service = this.state.services.find(s => s.id === serviceId);
            title.textContent = 'Editar Servicio';
            document.getElementById('serviceId').value = service.id;
            document.getElementById('serviceName').value = service.name || '';
            document.getElementById('serviceDesc').value = service.description || '';
            document.getElementById('serviceCategory').value = service.category || 'unlock';
            document.getElementById('serviceCredits').value = service.credits || service.price || 0;
            document.getElementById('serviceStock').value = service.stock !== false ? 'true' : 'false';
            document.getElementById('serviceAuto').value = service.autoServer !== false ? 'true' : 'false';
            document.getElementById('serviceTags').value = service.tags ? (Array.isArray(service.tags) ? service.tags.join(', ') : service.tags) : '';
        } else { 
            title.textContent = 'Agregar Servicio'; 
            form.reset(); 
            document.getElementById('serviceId').value = ''; 
        }
        modal.classList.add('open');
    },

    closeServiceModal() { document.getElementById('serviceModal').classList.remove('open'); },

    openPriceModal(priceId = null) {
        const modal = document.getElementById('priceModal');
        const title = document.getElementById('priceModalTitle');
        const form = document.getElementById('formPrice');
        this.loadServicesToPriceSelect();
        if (priceId) {
            const price = this.state.prices.find(p => p.id === priceId);
            title.textContent = 'Editar Precio';
            document.getElementById('priceId').value = price.id;
            document.getElementById('priceService').value = price.service_id;
            document.getElementById('priceAmount').value = price.amount;
            document.getElementById('priceTime').value = price.time;
            document.getElementById('priceStatus').value = price.status;
        } else { 
            title.textContent = 'Agregar Precio'; 
            form.reset(); 
            document.getElementById('priceId').value = ''; 
        }
        modal.classList.add('open');
    },
    closePriceModal() { document.getElementById('priceModal').classList.remove('open'); },

    loadServicesToPriceSelect() {
        const select = document.getElementById('priceService');
        if (!select) return;
        select.innerHTML = '<option value="">Selecciona un servicio</option>' + this.state.services.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    },

    async deleteService(id) {
        if (!this.isClient() || !confirm('¿Eliminar este servicio?')) return;
        try {
            await db.collection('services').doc(id).delete();
            this.showToast('Servicio eliminado.', 'success');
            await this.loadData();
            this.renderClientServices();
        } catch (error) {
            console.error('Error eliminando servicio:', error);
            this.showToast('Error al eliminar: ' + error.message, 'error');
        }
    },

    async deletePrice(id) {
        if (!this.isClient() || !confirm('¿Eliminar este precio?')) return;
        try {
            await db.collection('prices').doc(id).delete();
            this.showToast('Precio eliminado.', 'success');
            await this.loadData();
            this.renderClientPrices();
        } catch (error) {
            console.error('Error eliminando precio:', error);
        }
    },

    setupEventListeners() {
        const btnCloseModal = document.getElementById('btnCloseModal');
        const authModal = document.getElementById('authModal');
        const btnCloseAdmin = document.getElementById('btnCloseAdmin');
        const adminModal = document.getElementById('adminModal');
        const btnCloseClient = document.getElementById('btnCloseClient');
        const clientModal = document.getElementById('clientModal');
        const btnCloseDashboard = document.getElementById('btnCloseDashboard');
        const dashboardModal = document.getElementById('dashboardModal');
        
        if (btnCloseModal) btnCloseModal.addEventListener('click', () => this.closeModal());
        if (authModal) authModal.addEventListener('click', (e) => { if (e.target.id === 'authModal') this.closeModal(); });
        if (btnCloseAdmin) btnCloseAdmin.addEventListener('click', () => this.hideAdminPanel());
        if (adminModal) adminModal.addEventListener('click', (e) => { if (e.target.id === 'adminModal') this.hideAdminPanel(); });
        if (btnCloseClient) btnCloseClient.addEventListener('click', () => this.hideClientPanel());
        if (clientModal) clientModal.addEventListener('click', (e) => { if (e.target.id === 'clientModal') this.hideClientPanel(); });
        if (btnCloseDashboard) btnCloseDashboard.addEventListener('click', () => this.closeDashboard());
        if (dashboardModal) dashboardModal.addEventListener('click', (e) => { if (e.target.id === 'dashboardModal') this.closeDashboard(); });

        const linkToRegister = document.getElementById('linkToRegister');
        const linkToLogin = document.getElementById('linkToLogin');
        if (linkToRegister) linkToRegister.addEventListener('click', () => this.switchModalView('register'));
        if (linkToLogin) linkToLogin.addEventListener('click', () => this.switchModalView('login'));

        const formLogin = document.getElementById('formLogin');
        const formRegister = document.getElementById('formRegister');
        const heroBtnLogin = document.getElementById('heroBtnLogin');
        
        if (formLogin) {
            formLogin.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.login(document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
            });
        }

        if (formRegister) {
            formRegister.addEventListener('submit', async (e) => {
                e.preventDefault();
                const success = await this.register();
                if (success) {
                    this.closeModal();
                    this.showToast('✅ Cuenta creada. Ya puedes iniciar sesión', 'success');
                }
            });
        }

        if (heroBtnLogin) {
            heroBtnLogin.addEventListener('click', (e) => { e.preventDefault(); this.openModal('login'); });
        }

        const formService = document.getElementById('formService');
        const formPrice = document.getElementById('formPrice');
        
        if (formService) {
            formService.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('serviceId').value;
                
                const tagsRaw = document.getElementById('serviceTags').value;
                const tagsArray = tagsRaw ? tagsRaw.split(',').map(t => t.trim()) : [];

                const serviceData = {
                    name: document.getElementById('serviceName').value,
                    description: document.getElementById('serviceDesc').value,
                    category: document.getElementById('serviceCategory').value,
                    credits: parseFloat(document.getElementById('serviceCredits').value) || 0,
                    price: parseFloat(document.getElementById('serviceCredits').value) || 0,
                    stock: document.getElementById('serviceStock').value === 'true',
                    autoServer: document.getElementById('serviceAuto').value === 'true',
                    tags: tagsArray,
                    createdBy: this.state.currentUser ? this.state.currentUser.email : 'unknown',
                    isPublic: true,
                    status: 'active',
                    updatedAt: new Date().toISOString()
                };
                
                try {
                    if (id) {
                        await db.collection('services').doc(id).update(serviceData);
                        this.showToast('Servicio actualizado.', 'success');
                    } else {
                        serviceData.createdAt = new Date().toISOString();
                        await db.collection('services').add(serviceData);
                        this.showToast('Servicio agregado exitosamente.', 'success');
                    }
                    this.closeServiceModal();
                    await this.loadData();
                    this.renderClientServices();
                } catch (error) {
                    console.error('Error guardando servicio:', error);
                    this.showToast('Error al guardar: ' + error.message, 'error');
                }
            });
        }

        if (formPrice) {
            formPrice.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('priceId').value;
                const priceData = {
                    service_id: document.getElementById('priceService').value,
                    amount: parseFloat(document.getElementById('priceAmount').value),
                    time: document.getElementById('priceTime').value,
                    status: document.getElementById('priceStatus').value,
                    updatedAt: new Date().toISOString()
                };
                
                try {
                    if (id) {
                        await db.collection('prices').doc(id).update(priceData);
                        this.showToast('Precio actualizado.', 'success');
                    } else {
                        priceData.createdAt = new Date().toISOString();
                        await db.collection('prices').add(priceData);
                        this.showToast('Precio agregado.', 'success');
                    }
                    this.closePriceModal();
                    await this.loadData();
                    this.renderClientPrices();
                } catch (error) {
                    console.error('Error guardando precio:', error);
                    this.showToast('Error al guardar.', 'error');
                }
            });
        }
    },

    setupPricingTabs() {
        window.switchTab = (btn, id) => {
            document.querySelectorAll('.ptab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            ['imei', 'server', 'remote'].forEach(t => {
                const el = document.getElementById('table-' + t);
                if (el) el.style.display = t === id ? 'block' : 'none';
            });
        };
    },

    setupMobileMenu() {
        const menuToggle = document.getElementById('menuToggle');
        const mobileDrawer = document.getElementById('mobileDrawer');
        const drawerOverlay = document.getElementById('drawerOverlay');
        if(menuToggle) {
            menuToggle.addEventListener('click', () => { menuToggle.classList.toggle('active'); mobileDrawer.classList.toggle('open'); drawerOverlay.classList.toggle('open'); document.body.style.overflow = mobileDrawer.classList.contains('open') ? 'hidden' : ''; });
            drawerOverlay.addEventListener('click', () => { menuToggle.classList.remove('active'); mobileDrawer.classList.remove('open'); drawerOverlay.classList.remove('open'); document.body.style.overflow = ''; });
        }
    },

    openModal(view = 'login') { document.getElementById('authModal').classList.add('open'); this.switchModalView(view); },
    closeModal() { 
        const authModal = document.getElementById('authModal');
        if (authModal) authModal.classList.remove('open'); 
        const formLogin = document.getElementById('formLogin');
        if (formLogin) formLogin.reset();
        const formRegister = document.getElementById('formRegister');
        if (formRegister) formRegister.reset();
    },
    switchModalView(view) {
        if (view === 'login') { 
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
            if (loginForm) loginForm.classList.remove('hidden'); 
            if (registerForm) registerForm.classList.add('hidden'); 
        } else { 
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
            if (loginForm) loginForm.classList.add('hidden'); 
            if (registerForm) registerForm.classList.remove('hidden'); 
        }
    },

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = type === 'success' ? `<span>✅</span> ${message}` : `<span>⚠️</span> ${message}`;
        container.appendChild(toast);
        setTimeout(() => { toast.style.animation = 'fadeOut 0.3s ease forwards'; setTimeout(() => toast.remove(), 300); }, 3000);
    },

    openDashboard() {
        document.getElementById('dashboardModal').classList.add('open');
        this.loadDashboardData();
    },

    closeDashboard() {
        document.getElementById('dashboardModal').classList.remove('open');
    },

    async loadDashboardData() {
        if (!this.state.currentUser) return;
        
        const uid = this.state.currentUser.uid;
        
        const userDoc = await db.collection('profiles').doc(uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            document.getElementById('userBalance').textContent = '$' + (data.balance || 0).toFixed(2);
            document.getElementById('profileName').textContent = data.name || 'Usuario';
            document.getElementById('profileEmail').textContent = data.email || '';
            document.getElementById('profileLastLogin').textContent = new Date().toLocaleString('es-ES');
        }
        
        this.getUserIP();
        
        try {
            const ordersSnap = await db.collection('orders').where('userId', '==', uid).get();
            const orders = ordersSnap.docs.map(doc => doc.data());
            const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
            
            document.getElementById('userActiveOrders').textContent = activeOrders;
            document.getElementById('userTotalOrders').textContent = orders.length;
        } catch (error) {
            console.error('Error cargando pedidos:', error);
            document.getElementById('userActiveOrders').textContent = '0';
            document.getElementById('userTotalOrders').textContent = '0';
        }
        
        this.loadNews();
    },

    async getUserIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            document.getElementById('profileIP').textContent = data.ip;
        } catch (error) {
            document.getElementById('profileIP').textContent = 'No disponible';
        }
    },

    async loadNews() {
        try {
            const newsSnap = await db.collection('news').orderBy('createdAt', 'desc').limit(10).get();
            const newsContainer = document.getElementById('newsContainer');
            
            if (newsSnap.empty) {
                newsContainer.innerHTML = '<p style="text-align:center;color:var(--text-dim);padding:20px;">No hay noticias disponibles.</p>';
                return;
            }
            
            newsContainer.innerHTML = newsSnap.docs.map(doc => {
                const news = doc.data();
                const date = news.createdAt?.toDate ? news.createdAt.toDate() : new Date(news.createdAt);
                return `
                    <div style="background:var(--surface);border:1px solid var(--cyan-border);border-radius:6px;padding:16px;margin-bottom:12px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <h4 style="font-family:'Orbitron',monospace;font-size:13px;color:var(--cyan);">${news.title}</h4>
                            <span style="font-size:11px;color:var(--text-dim);">${date.toLocaleDateString('es-ES')}</span>
                        </div>
                        <p style="font-size:13px;color:var(--text-muted);line-height:1.6;">${news.content}</p>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error cargando noticias:', error);
            document.getElementById('newsContainer').innerHTML = '<p style="text-align:center;color:var(--text-dim);padding:20px;">Error al cargar noticias.</p>';
        }
    },

    openAddBalance() {
        window.location.href = 'recargar-saldo.html';
    },

    closeAddBalance() {
        document.getElementById('addBalanceModal').classList.remove('open');
    },

    openNewOrder() {
        window.location.href = 'pedidos.html';
    },

    openOrderHistory() {
        window.location.href = 'mis-pedidos.html';
    },

    selectAmount(amount) {
        document.getElementById('customAmount').value = amount;
    },

    processAddBalance() {
        const amount = parseFloat(document.getElementById('customAmount').value);
        if (!amount || amount <= 0) {
            this.showToast('Ingresa un monto válido', 'error');
            return;
        }
        window.location.href = `recargar-saldo.html?amount=${amount}`;
    },

    async loadUserStats() {
        if (!this.state.currentUser) return;
        
        const uid = this.state.currentUser.uid;
        
        try {
            const userDoc = await db.collection('profiles').doc(uid).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                document.getElementById('statsBalance').textContent = '$' + (data.balance || 0).toFixed(2);
            }
            
            const ordersSnap = await db.collection('orders').where('userId', '==', uid).get();
            const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const totalOrders = orders.length;
            const approvedOrders = orders.filter(o => o.status === 'approved').length;
            const totalSpent = orders
                .filter(o => o.status === 'approved')
                .reduce((sum, o) => sum + (o.totalCredits || 0), 0);
            
            document.getElementById('statsTotalOrders').textContent = totalOrders;
            document.getElementById('statsApproved').textContent = approvedOrders;
            document.getElementById('statsTotalSpent').textContent = '$' + totalSpent.toFixed(2);
            
            this.renderTopServices(orders);
            this.renderRecentOrders(orders);
            
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    },
    
    renderTopServices(orders) {
        const container = document.getElementById('statsTopServices');
        if (!container) return;
        
        const serviceCount = {};
        orders.forEach(order => {
            if (order.items) {
                order.items.forEach(item => {
                    const name = item.name;
                    serviceCount[name] = (serviceCount[name] || 0) + item.quantity;
                });
            }
        });
        
        const sorted = Object.entries(serviceCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        if (sorted.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-dim);padding:20px;">Aún no has usado servicios</p>';
            return;
        }
        
        const maxCount = sorted[0][1];
        
        container.innerHTML = sorted.map(([name, count], index) => {
            const percentage = (count / maxCount) * 100;
            const colors = ['var(--cyan)', 'var(--green)', 'var(--yellow)', 'var(--purple)', 'var(--red)'];
            const color = colors[index] || 'var(--cyan)';
            
            return `
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="font-size:18px;font-weight:700;color:${color};min-width:30px;">#${index + 1}</div>
                    <div style="flex:1;">
                        <div style="font-size:14px;color:var(--text);font-weight:600;margin-bottom:4px;">${name}</div>
                        <div style="background:var(--dark2);border-radius:4px;height:8px;overflow:hidden;">
                            <div style="background:${color};height:100%;width:${percentage}%;transition:width 0.3s;"></div>
                        </div>
                    </div>
                    <div style="font-family:'Orbitron',monospace;font-size:14px;color:${color};font-weight:700;min-width:60px;text-align:right;">${count}x</div>
                </div>
            `;
        }).join('');
    },
    
    renderRecentOrders(orders) {
        const container = document.getElementById('statsRecentOrders');
        if (!container) return;
        
        const sorted = orders.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
        }).slice(0, 5);
        
        if (sorted.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-dim);padding:20px;">No hay pedidos recientes</p>';
            return;
        }
        
        const statusLabels = {
            'pending': '⏳ Pendiente',
            'approved': '✅ Aprobado',
            'rejected': '❌ Rechazado'
        };
        
        const statusColors = {
            'pending': 'var(--yellow)',
            'approved': 'var(--green)',
            'rejected': 'var(--red)'
        };
        
        container.innerHTML = sorted.map(order => {
            const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
            const status = order.status || 'pending';
            const itemCount = order.items ? order.items.length : 0;
            
            return `
                <div style="background:var(--dark2);border:1px solid var(--cyan-border);border-radius:6px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
                    <div style="flex:1;">
                        <div style="font-size:13px;color:var(--text);font-weight:600;margin-bottom:4px;">
                            #${order.id.substring(0, 8).toUpperCase()}
                        </div>
                        <div style="font-size:11px;color:var(--text-dim);">
                            ${date.toLocaleDateString('es-ES')} • ${itemCount} servicio${itemCount !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-family:'Orbitron',monospace;font-size:14px;color:var(--yellow);font-weight:700;">
                            $${(order.totalCredits || 0).toFixed(2)}
                        </div>
                        <div style="font-size:11px;color:${statusColors[status]};font-weight:600;">
                            ${statusLabels[status]}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    NexaGSM.init();
});

function selectAmount(amount) {
    document.getElementById('customAmount').value = amount;
}

function processAddBalance() {
    NexaGSM.processAddBalance();
}