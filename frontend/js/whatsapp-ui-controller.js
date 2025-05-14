// Controlador de UI para WhatsApp
class WhatsAppUIController {
    constructor(options = {}) {
        // Configuración por defecto
        this.config = {
            qrContainerId: 'qr-code',
            connectBtnId: 'connect-whatsapp-btn',
            disconnectBtnId: 'disconnect-whatsapp-btn',
            loadingId: 'whatsapp-loading',
            errorId: 'whatsapp-error',
            errorMessageId: 'error-message',
            retryBtnId: 'retry-whatsapp-btn',
            connectedId: 'whatsapp-connected',
            statusId: 'whatsapp-status',
            ...options
        };
        
        // Obtener referencias a elementos DOM
        this.elements = {};
        
        // Estado
        this.isInitialized = false;
    }
    
    // Inicializar controlador
    init() {
        if (this.isInitialized) return;
        
        // Verificar si estamos en la sección de conexiones
        const conexionesSection = document.getElementById('conexiones-card');
        if (!conexionesSection) {
            console.warn('WhatsAppUIController: Sección de conexiones no encontrada');
            return;
        }
        
        // Si la sección está vacía, crear la estructura HTML necesaria
        if (conexionesSection.children.length === 0) {
            this.createWhatsAppInterface(conexionesSection);
        }
        
        // Obtener referencias a elementos
        this.findElements();
        
        // Configurar event listeners para la UI
        this.setupEventListeners();
        
        // Configurar escucha de eventos del WhatsAppManager
        this.setupManagerEvents();
        
        this.isInitialized = true;
        console.log('WhatsAppUIController: Inicializado');
    }
    
    // Crear la interfaz de WhatsApp si no existe
    createWhatsAppInterface(container) {
        container.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-xl font-bold mb-4 text-gray-800">Conectar WhatsApp</h3>
                <div class="border border-gray-200 p-4 rounded-lg bg-gray-50">
                    <div id="qr-placeholder" class="text-center text-gray-500 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-400 mb-2 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        <p>Haz clic en "Iniciar Conexión"</p>
                    </div>
                    <div id="qr-code" class="hidden mb-4"></div>
                    <div id="whatsapp-loading" class="hidden mb-4 text-center">
                        <div class="animate-spin h-10 w-10 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p>Conectando con WhatsApp...</p>
                    </div>
                    <div id="whatsapp-error" class="hidden mb-4 text-red-500 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-red-500 mb-2 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p id="error-message">Error al conectar con WhatsApp</p>
                        <button id="retry-whatsapp-btn" class="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition">Reintentar</button>
                    </div>
                    <div id="whatsapp-connected" class="hidden mb-4 text-center text-green-600">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-green-500 mb-2 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>Conectado correctamente</p>
                        <p id="whatsapp-phone" class="text-sm text-gray-500 mt-1"></p>
                    </div>
                    <div class="text-center">
                        <button id="connect-whatsapp-btn" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition mr-2">Iniciar Conexión</button>
                        <button id="disconnect-whatsapp-btn" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition hidden">Desconectar</button>
                    </div>
                    <div id="whatsapp-status" class="hidden mt-4 p-3 rounded text-center"></div>
                </div>
            </div>
        `;
    }
    
    // Encontrar elementos DOM
    findElements() {
        Object.keys(this.config).forEach(key => {
            if (key.endsWith('Id')) {
                const elementId = this.config[key];
                const element = document.getElementById(elementId);
                
                if (element) {
                    // Convertir qrContainerId -> qrContainer
                    const propName = key.replace('Id', '');
                    this.elements[propName] = element;
                } else {
                    console.warn(`WhatsAppUIController: Elemento no encontrado: #${elementId}`);
                }
            }
        });
        
        console.log('WhatsAppUIController: Elementos encontrados', Object.keys(this.elements));
    }
    
    // Configurar event listeners para botones
    setupEventListeners() {
        const { connectBtn, disconnectBtn, retryBtn } = this.elements;
        
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                console.log('WhatsAppUIController: Botón conectar clickeado');
                // Usar el sessionId del usuario si está disponible o 'default'
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                const sessionId = (userData.user && userData.user.id) ? userData.user.id : 'default';
                
                if (window.whatsappManager) {
                    window.whatsappManager.requestConnection(sessionId);
                }
            });
        }
        
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => {
                console.log('WhatsAppUIController: Botón desconectar clickeado');
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                const sessionId = (userData.user && userData.user.id) ? userData.user.id : 'default';
                
                if (window.whatsappManager) {
                    window.whatsappManager.disconnect(sessionId);
                }
            });
        }
        
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                console.log('WhatsAppUIController: Botón reintentar clickeado');
                this.hideError();
                this.showLoading();
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                const sessionId = (userData.user && userData.user.id) ? userData.user.id : 'default';
                
                if (window.whatsappManager) {
                    window.whatsappManager.requestConnection(sessionId);
                }
            });
        }
    }
    
    // Configurar respuesta a eventos del WhatsAppManager
    setupManagerEvents() {
        document.addEventListener('whatsapp:ui-update', (event) => {
            const { state, data } = event.detail;
            console.log('WhatsAppUIController: UI Update', state, data);
            
            switch (state) {
                case 'qr':
                    this.handleQR(data.dataUrl);
                    break;
                case 'connected':
                    this.showConnected(data);
                    break;
                case 'error':
                    this.showError(data.message || 'Error desconocido');
                    break;
                case 'status':
                    this.updateStatus(data.message || 'Actualizando...', data.type || 'info');
                    break;
                case 'loading':
                    this.showLoading();
                    break;
                case 'reset':
                    this.resetUI();
                    break;
            }
        });
    }
    
    // Actualizar UI con código QR
    handleQR(dataUrl) {
        console.log('WhatsAppUIController: Mostrando QR');
        this.hideAllStates();
        
        if (this.elements.qrContainer) {
            this.elements.qrContainer.innerHTML = `<img src="${dataUrl}" alt="QR WhatsApp" class="w-full max-w-xs mx-auto">`;
            this.elements.qrContainer.classList.remove('hidden');
        }
        
        this.updateStatus('Escanea el código QR con WhatsApp en tu teléfono', 'info');
    }
    
    // Mostrar estado de carga
    showLoading() {
        console.log('WhatsAppUIController: Mostrando carga');
        this.hideAllStates();
        
        if (this.elements.loading) {
            this.elements.loading.classList.remove('hidden');
        }
        
        this.updateStatus('Conectando con WhatsApp...', 'info');
    }
    
    // Mostrar error
    showError(message) {
        console.log('WhatsAppUIController: Mostrando error', message);
        this.hideAllStates();
        
        if (this.elements.error) {
            this.elements.error.classList.remove('hidden');
        }
        
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
        }
        
        this.updateStatus('Error al conectar con WhatsApp', 'error');
    }
    
    // Ocultar error
    hideError() {
        if (this.elements.error) {
            this.elements.error.classList.add('hidden');
        }
    }
    
    // Mostrar estado conectado
    showConnected(data) {
        console.log('WhatsAppUIController: Mostrando conectado', data);
        this.hideAllStates();
        
        if (this.elements.connected) {
            this.elements.connected.classList.remove('hidden');
        }
        
        // Mostrar número de teléfono si está disponible
        if (this.elements.connected && data.phone) {
            const phoneElement = this.elements.connected.querySelector('#whatsapp-phone');
            if (phoneElement) {
                phoneElement.textContent = data.phone;
            }
        }
        
        if (this.elements.disconnectBtn) {
            this.elements.disconnectBtn.classList.remove('hidden');
        }
        
        if (this.elements.connectBtn) {
            this.elements.connectBtn.classList.add('hidden');
        }
        
        this.updateStatus('WhatsApp conectado correctamente', 'success');
    }
    
    // Actualizar mensaje de estado
    updateStatus(message, type = 'info') {
        if (!this.elements.status) return;
        
        this.elements.status.textContent = message;
        this.elements.status.classList.remove('hidden');
        
        // Actualizar clase según tipo
        this.elements.status.className = 'mt-4 p-3 rounded text-center';
        
        switch (type) {
            case 'success':
                this.elements.status.classList.add('bg-green-50', 'text-green-700', 'border', 'border-green-200');
                break;
            case 'error':
                this.elements.status.classList.add('bg-red-50', 'text-red-700', 'border', 'border-red-200');
                break;
            case 'warning':
                this.elements.status.classList.add('bg-yellow-50', 'text-yellow-700', 'border', 'border-yellow-200');
                break;
            default:
                this.elements.status.classList.add('bg-blue-50', 'text-blue-700', 'border', 'border-blue-200');
        }
    }
    
    // Ocultar todos los estados
    hideAllStates() {
        const placeholderEl = document.getElementById('qr-placeholder');
        if (placeholderEl) placeholderEl.classList.add('hidden');
        
        const statesToHide = ['qrContainer', 'loading', 'error', 'connected'];
        statesToHide.forEach(state => {
            if (this.elements[state]) {
                this.elements[state].classList.add('hidden');
            }
        });
    }
    
    // Resetear la interfaz
    resetUI() {
        this.hideAllStates();
        
        const placeholderEl = document.getElementById('qr-placeholder');
        if (placeholderEl) placeholderEl.classList.remove('hidden');
        
        if (this.elements.connectBtn) {
            this.elements.connectBtn.classList.remove('hidden');
        }
        
        if (this.elements.disconnectBtn) {
            this.elements.disconnectBtn.classList.add('hidden');
        }
        
        if (this.elements.qrContainer) {
            this.elements.qrContainer.innerHTML = '';
        }
        
        this.updateStatus('Listo para conectar con WhatsApp', 'info');
    }
}

// Crear instancia global
window.whatsappUIController = new WhatsAppUIController();