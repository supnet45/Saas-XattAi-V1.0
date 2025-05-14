// Servicio mejorado de WhatsApp
class WhatsAppManager {
    constructor() {
        this.socket = null;
        this.connectionInfo = null;
        this.eventListeners = {};
        this.isInitialized = false;
    }

    // Inicializar con el socket existente
    init(socket) {
        if (this.isInitialized) return;
        this.socket = socket;
        this.setupSocketEvents();
        this.isInitialized = true;
        console.log('WhatsAppManager: Inicializado');
    }

    // Configurar eventos de Socket.IO
    setupSocketEvents() {
        if (!this.socket) {
            console.error('WhatsAppManager: Socket no disponible');
            return;
        }

        // Manejar código QR
        this.socket.on('qr', (dataUrl) => {
            console.log('WhatsAppManager: QR recibido');
            this.triggerEvent('qr', dataUrl);
            this.updateUI('qr', { dataUrl });
        });

        // Manejar conexión exitosa
        this.socket.on('ready', (data) => {
            console.log('WhatsAppManager: Conexión establecida');
            this.connectionInfo = data || { timestamp: new Date().toISOString() };
            this.triggerEvent('connected', this.connectionInfo);
            this.updateUI('connected', this.connectionInfo);
            this.showNotification('WhatsApp conectado correctamente', 'success');
            
            // Actualizar indicador de estado si existe
            const connectionStatus = document.getElementById('connection-status-card');
            if (connectionStatus) {
                connectionStatus.classList.remove('hidden');
                const indicator = document.getElementById('connection-indicator');
                const state = document.getElementById('connection-state');
                const phone = document.getElementById('connected-phone');
                const since = document.getElementById('connected-since');
                
                if (indicator) indicator.className = 'h-3 w-3 rounded-full bg-green-500 animate-pulse mr-2 transition-colors duration-300';
                if (state) state.textContent = 'Conectado';
                if (phone) phone.textContent = this.connectionInfo.phone || 'N/A';
                if (since) since.textContent = new Date().toLocaleString();
            }
        });

        // Manejar errores
        this.socket.on('error', (data) => {
            console.error('WhatsAppManager: Error', data);
            this.triggerEvent('error', data);
            this.updateUI('error', data);
            this.showNotification(data.message || 'Error de WhatsApp', 'error');
        });

        // Manejar actualizaciones de estado
        this.socket.on('status', (data) => {
            console.log('WhatsAppManager: Actualización de estado', data);
            this.triggerEvent('status', data);
            this.updateUI('status', data);
        });

        console.log('WhatsAppManager: Eventos Socket.IO configurados');
    }

    // Solicitar conexión (generar QR)
    requestConnection(sessionId) {
        if (!this.socket) {
            this.showNotification('No hay conexión con el servidor', 'error');
            return false;
        }

        this.updateUI('loading');
        this.socket.emit('request_qr', { sessionId });
        console.log('WhatsAppManager: Solicitando código QR para sesión', sessionId);
        return true;
    }

    // Desconectar WhatsApp
    disconnect(sessionId) {
        if (!this.socket) return false;
        
        this.socket.emit('disconnect_whatsapp', { sessionId });
        this.connectionInfo = null;
        this.updateUI('reset');
        
        // Actualizar indicador de estado si existe
        const connectionStatus = document.getElementById('connection-status-card');
        if (connectionStatus) {
            connectionStatus.classList.add('hidden');
        }
        
        console.log('WhatsAppManager: Desconectando WhatsApp');
        return true;
    }

    // Sistema de suscripción a eventos
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
        return this;
    }

    // Disparar eventos
    triggerEvent(event, data) {
        if (!this.eventListeners[event]) return;
        
        this.eventListeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error en listener del evento ${event}:`, error);
            }
        });
    }

    // Actualizar la UI basado en el estado
    updateUI(state, data = {}) {
        // Usar event delegation para que funcione con cualquier estructura HTML
        const event = new CustomEvent('whatsapp:ui-update', {
            detail: { state, data }
        });
        document.dispatchEvent(event);
    }

    // Sistema de notificaciones
    showNotification(message, type = 'info') {
        // Función para mostrar notificaciones (usa la existente o crea una nueva)
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            this.createNotification(message, type);
        }
    }

    // Crear notificación si no existe una función global
    createNotification(message, type) {
        // Eliminar notificación existente si hay alguna
        const existingNotification = document.getElementById('status-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        const notificationElement = document.createElement('div');
        notificationElement.id = 'status-notification';
        notificationElement.className = 'fixed top-4 right-4 max-w-xs z-50 p-4 rounded-md shadow-lg border opacity-0 transform translate-x-full transition-all duration-300';
        
        // Estilos según tipo usando TailwindCSS
        let bgColor, textColor, borderColor, icon;
        switch (type) {
            case 'success':
                bgColor = 'bg-green-50'; textColor = 'text-green-800'; borderColor = 'border-green-300';
                icon = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>';
                break;
            case 'error':
                bgColor = 'bg-red-50'; textColor = 'text-red-800'; borderColor = 'border-red-300';
                icon = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>';
                break;
            case 'warning':
                bgColor = 'bg-yellow-50'; textColor = 'text-yellow-800'; borderColor = 'border-yellow-300';
                icon = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>';
                break;
            default:
                bgColor = 'bg-blue-50'; textColor = 'text-blue-800'; borderColor = 'border-blue-300';
                icon = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" /></svg>';
        }

        notificationElement.classList.add(bgColor, textColor, borderColor);
        notificationElement.innerHTML = `<div class="flex items-center">${icon}<span>${message}</span></div>`;

        document.body.appendChild(notificationElement);

        // Animar entrada
        setTimeout(() => {
            notificationElement.classList.remove('opacity-0', 'translate-x-full');
        }, 10);

        // Animar salida
        setTimeout(() => {
            notificationElement.classList.add('opacity-0', 'translate-x-full');
            
            setTimeout(() => {
                notificationElement.remove();
            }, 300);
        }, 4000);
    }
}

// Crear instancia global
window.whatsappManager = new WhatsAppManager();