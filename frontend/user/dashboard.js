// frontend/user/dashboard.js v1.0.3

console.log('Dashboard XattAI v1.0.3 - Cargando...');

// Añadir estilos dinámicamente para la animación de pulso
(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }
        .animate-pulse {
            animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .loader {
            border: 3px solid #f3f3f3;
            border-radius: 50%;
            border-top: 3px solid #25D366;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
})();

document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard XattAI v1.0.3 - DOM Cargado - Iniciando configuración del dashboard');

    let socket = null; // Socket global

    const userGreeting = document.getElementById('user-greeting');
    const currentDate  = document.getElementById('current-date');

    if (window.lucide) {
        lucide.createIcons();
    } else {
        console.error('Lucide.js no está disponible.');
    }

    function validateUIElements() {
        const required = {
            'user-greeting':     userGreeting,
            'current-date':      currentDate,
            'sidebar-links':     document.querySelectorAll('.sidebar-link').length > 0,
            'content-sections':  document.querySelectorAll('.content-section').length > 0
        };
        const missing = Object.entries(required)
            .filter(([_, ok]) => !ok)
            .map(([name]) => name);
        if (missing.length) {
            console.warn('UI faltante:', missing.join(', '));
            return false;
        }
        return true;
    }

    function verifyAuthentication() {
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('Sesión no iniciada. Redirigiendo...', 'warning');
            setTimeout(() => window.location.href = '/panel.html', 3000);
            return false;
        }
        if (token.split('.').length !== 3) {
            showNotification('Sesión inválida. Redirigiendo...', 'error');
            setTimeout(() => {
                localStorage.removeItem('token');
                localStorage.removeItem('userData');
                window.location.href = '/panel.html';
            }, 3000);
            return false;
        }
        console.log('Token JWT verificado correctamente en el frontend.');
        return true;
    }

    function showNotification(message, type = 'info') {
        let n = document.getElementById('status-notification');
        if (!n) {
            n = document.createElement('div');
            n.id = 'status-notification';
            n.className = 'fixed top-4 right-4 max-w-xs z-50 p-4 rounded-md shadow-lg border transition-all';
            document.body.appendChild(n);
        }
        let bg, tc, bc, icon;
        switch(type) {
            case 'success':
                bg = 'bg-green-50'; tc = 'text-green-800'; bc = 'border-green-300'; icon = 'check-circle'; break;
            case 'error':
                bg = 'bg-red-50';   tc = 'text-red-800';   bc = 'border-red-300';   icon = 'x-circle';     break;
            case 'warning':
                bg = 'bg-yellow-50';tc = 'text-yellow-800';bc = 'border-yellow-300';icon = 'alert-triangle';break;
            default:
                bg = 'bg-blue-50';  tc = 'text-blue-800';  bc = 'border-blue-300';  icon = 'info';         break;
        }
        n.className = `fixed top-4 right-4 max-w-xs z-50 p-4 rounded-md shadow-lg border ${bg} ${tc} ${bc} opacity-0 translate-x-full`;
        n.innerHTML = `<div class="flex items-center"><i data-lucide="${icon}" class="h-5 w-5 mr-2"></i><span>${message}</span></div>`;
        lucide.createIcons({ nodes: [n] });
        setTimeout(() => n.classList.remove('opacity-0','translate-x-full'), 10);
        setTimeout(() => {
            n.classList.add('opacity-0','translate-x-full');
            setTimeout(() => n.remove(), 300);
        }, 4000);
    }

    function setupNavigation() {
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', e => {
                const target = link.dataset.target;
                if (!target) return;
                e.preventDefault();
                document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
                const sec = document.getElementById(target);
                if (sec) sec.classList.remove('hidden');
                if (target === 'conexiones-card') {
                    setupWhatsAppConnection();
                    checkExistingWhatsAppSession();
                }
            });
        });
    }

    function setupLogout() {
        const btn = document.getElementById('logout-button-sidebar');
        if (!btn) return;
        btn.addEventListener('click', async e => {
            e.preventDefault();
            const token = localStorage.getItem('token');
            if (token) {
                await fetch('/api/logout', {
                    method: 'POST',
                    headers: { 'Content-Type':'application/json','Authorization':`Bearer ${token}` }
                });
            }
            localStorage.clear();
            socket?.disconnect();
            showNotification('Sesión cerrada correctamente','success');
            setTimeout(()=>window.location.href='/panel.html',1000);
        });
    }

    async function loadUserData() {
        const token = localStorage.getItem('token');
        const stored = localStorage.getItem('userData');
        if (stored) {
            updateHeaderUI(JSON.parse(stored).user || JSON.parse(stored));
            return;
        }
        if (!token) return updateHeaderUI({ name:'Usuario' });
        const res = await fetch('/api/user-info', {
            headers: {'Authorization':`Bearer ${token}`}
        });
        if (res.ok) {
            const { user } = await res.json();
            localStorage.setItem('userData', JSON.stringify({user}));
            updateHeaderUI(user);
        } else {
            updateHeaderUI({ name:'Usuario' });
        }
    }

    function updateHeaderUI({ name }) {
        if (userGreeting) userGreeting.textContent = `Hey, ${name.split(' ')[0]}`;
        if (currentDate)  currentDate.textContent = new Date().toLocaleDateString('es-ES',{
            weekday:'long',year:'numeric',month:'long',day:'numeric'
        });
    }

    function setupSocketIO() {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const url = (['localhost','127.0.0.1'].includes(location.hostname))
            ? `http://${location.hostname}:3001`
            : location.origin;
        const s = io(url, {
            auth:{token}, reconnectionAttempts:5,reconnectionDelay:2000,timeout:10000
        });
        s.on('connect', () => {
            console.log('Socket.IO: Connected!', s.id);
            showNotification('Conexión en tiempo real establecida','success');
            setupWhatsAppSocketListeners(s);
        });
        s.on('connect_error', err => {
            console.error('Socket.IO Error:', err.message);
            showNotification(`Error socket: ${err.message}`,'error');
            if (/Auth/.test(err.message)) {
                setTimeout(()=>{
                    localStorage.clear();
                    location.href='/panel.html';
                },3000);
            }
        });
        s.on('disconnect', reason => {
            console.log('Socket.IO: Disconnected:', reason);
            showNotification(`Conexión perdida: ${reason}`,'warning');
        });
        return s;
    }

    function setupWhatsAppSocketListeners(s) {
        s.off('whatsapp_qr').on('whatsapp_qr', data => {
            if (data.qr) handleWhatsAppQR(data);
            else showWhatsAppError('QR inválido');
        });
        s.off('whatsapp_status').on('whatsapp_status', data => {
            if (data.connected) showWhatsAppConnected(data);
            else updateWhatsAppStatusMessage(data.message,'warning');
        });
        s.off('whatsapp_connected').on('whatsapp_connected', data => {
            showWhatsAppConnected(data);
            setupWhatsAppChat();
        });
        s.off('whatsapp_authenticated').on('whatsapp_authenticated', () => {
            updateWhatsAppStatusMessage('WhatsApp autenticado','success');
        });
        s.off('whatsapp_error').on('whatsapp_error', d => showWhatsAppError(d.message || 'Error WA'));
        s.off('whatsapp_disconnected_event').on('whatsapp_disconnected_event', d => {
            showNotification(d.message || 'WA desconectado','warning');
            resetWhatsAppUI();
        });
    }

    function handleWhatsAppQR({ qr }) {
        const ph = document.getElementById('qr-placeholder');
        const ld = document.getElementById('whatsapp-loading');
        const er = document.getElementById('whatsapp-error');
        const qrC= document.getElementById('qr-code');
        [ph,ld,er].forEach(el=>el?.classList.add('hidden'));
        qrC.innerHTML = `<img src="${qr}" alt="QR WhatsApp" class="w-full max-w-[200px] mx-auto">`;
        qrC.classList.remove('hidden');
        updateWhatsAppStatusMessage('Escanea el código QR','info');
    }

    function showWhatsAppConnected({ phone, timestamp }) {
        resetWhatsAppUI();
        const con = document.getElementById('whatsapp-connected');
        const ph  = document.getElementById('whatsapp-phone');
        const cs  = document.getElementById('connection-status-card');
        const ci  = cs.querySelector('#connection-indicator');
        const st  = cs.querySelector('#connection-state');
        const cp  = cs.querySelector('#connected-phone');
        const cd  = cs.querySelector('#connected-since');
        ph.textContent = phone || 'N/A';
        cs.classList.remove('hidden');
        con.classList.remove('hidden');
        ci.className = 'h-3 w-3 rounded-full bg-green-500 animate-pulse';
        st.textContent = 'Conectado';
        cp.textContent = phone || 'N/A';
        cd.textContent = timestamp ? new Date(timestamp).toLocaleString('es-ES') : 'N/A';
        showNotification(`WhatsApp conectado con ${phone}`,'success');
        showWhatsAppInterface();
    }

    function showWhatsAppError(msg) {
        const ld = document.getElementById('whatsapp-loading');
        const ph = document.getElementById('qr-placeholder');
        const er = document.getElementById('whatsapp-error');
        [ld,ph].forEach(el=>el?.classList.add('hidden'));
        const em = document.getElementById('error-message');
        em.textContent = msg;
        er.classList.remove('hidden');
        showNotification(msg,'error');
    }

    function resetWhatsAppUI() {
        const ph = document.getElementById('qr-placeholder');
        const qr= document.getElementById('qr-code');
        const ld = document.getElementById('whatsapp-loading');
        const er = document.getElementById('whatsapp-error');
        const con= document.getElementById('whatsapp-connected');
        [qr,ld,er,con].forEach(el=>el?.classList.add('hidden'));
        ph.classList.remove('hidden');
    }

    function updateWhatsAppStatusMessage(message, type='info') {
        const statusDiv = document.getElementById('whatsapp-status');
        if (!statusDiv) return;
        statusDiv.innerHTML = '';
        let iconName;
        switch(type) {
            case 'success': iconName='check-circle';   break;
            case 'warning': iconName='alert-triangle';break;
            case 'error':   iconName='x-circle';      break;
            default:        iconName='info';           break;
        }
        const icon = document.createElement('i');
        icon.dataset.lucide = iconName;
        icon.className = 'h-4 w-4 mr-2';
        const span = document.createElement('span');
        span.textContent = message;
        statusDiv.appendChild(icon);
        statusDiv.appendChild(span);
        lucide.createIcons({ nodes: [statusDiv] });
        statusDiv.classList.remove('hidden');
    }

    function setupWhatsAppConnection() {
        const card = document.getElementById('conexiones-card');
        if (!card) return;
        if (card.querySelector('#connect-whatsapp-btn')) {
            resetWhatsAppUI();
            return;
        }
        card.innerHTML = `
            <div class="bg-white rounded-lg shadow-md p-6">
                <h3 class="text-xl font-bold mb-4 text-gray-800">Conectar WhatsApp</h3>
                <div class="border border-gray-200 p-4 rounded-lg bg-gray-50">
                    <div id="qr-placeholder" class="text-center text-gray-500 mb-4">
                        <i data-lucide="qr-code" class="h-10 w-10 text-gray-400 mb-2"></i>
                        <p>Haz clic en "Iniciar Conexión"</p>
                    </div>
                    <div id="qr-code" class="hidden mb-4"></div>
                    <div id="whatsapp-loading" class="hidden mb-4 text-center">
                        <div class="loader"></div>
                        <p class="mt-2 text-gray-600">Conectando...</p>
                    </div>
                    <div id="whatsapp-error" class="hidden mb-4 text-red-500 text-center">
                        <p id="error-message"></p>
                        <button id="retry-whatsapp-btn" class="mt-2 px-3 py-1 bg-red-500 text-white rounded">Reintentar</button>
                    </div>
                    <div id="whatsapp-connected" class="hidden mb-4 text-center text-green-600">
                        <i data-lucide="check-circle" class="h-8 w-8 mb-2"></i>
                        <p>Conectado correctamente</p>
                        <p id="whatsapp-phone"></p>
                    </div>
                    <div class="text-center">
                        <button id="connect-whatsapp-btn" class="px-4 py-2 bg-green-500 text-white rounded mr-2">Iniciar Conexión</button>
                        <button id="disconnect-whatsapp-btn" class="px-4 py-2 bg-red-500 text-white rounded hidden">Desconectar</button>
                    </div>
                    <div id="whatsapp-status" class="hidden mt-4 p-3 rounded bg-blue-50 border border-blue-200 text-blue-700 text-center"></div>
                </div>
            </div>
        `;
        lucide.createIcons({ nodes: [card] });
        document.getElementById('connect-whatsapp-btn').addEventListener('click', () => {
            document.getElementById('whatsapp-loading').classList.remove('hidden');
            document.getElementById('qr-placeholder').classList.add('hidden');
            if (socket && socket.connected) {
                socket.emit('request_whatsapp_qr');
            } else {
                showWhatsAppError('No hay conexión al servidor');
            }
        });
        document.getElementById('retry-whatsapp-btn').addEventListener('click', () => {
            document.getElementById('whatsapp-error').classList.add('hidden');
            document.getElementById('whatsapp-loading').classList.remove('hidden');
            if (socket && socket.connected) {
                socket.emit('request_whatsapp_qr');
            }
        });
        document.getElementById('disconnect-whatsapp-btn').addEventListener('click', () => {
            if (socket && socket.connected) {
                socket.emit('request_whatsapp_logout');
                resetWhatsAppUI();
            }
        });
    }

    function checkExistingWhatsAppSession() {
        const stored = localStorage.getItem('whatsapp_connection');
        if (stored) {
            const info = JSON.parse(stored);
            showWhatsAppConnected(info);
        } else {
            socket?.emit('check_whatsapp_status');
        }
    }

    function setupWhatsAppChat() {
        // Asegurarse de que tenemos los elementos necesarios
        const chatContainer = document.getElementById('whatsapp-interface');
        if (!chatContainer) {
            console.error('Contenedor de chat no encontrado');
            return;
        }
        
        // Configurar UI básica si no existe
        if (chatContainer.innerHTML.trim() === '') {
            chatContainer.innerHTML = `
                <div class="flex h-[500px] border rounded-lg overflow-hidden">
                    <!-- Lista de chats -->
                    <div class="w-1/3 border-r flex flex-col">
                        <div class="p-3 border-b">
                            <input type="text" id="chat-search" placeholder="Buscar o iniciar chat" 
                                   class="w-full p-2 text-sm border rounded-lg">
                        </div>
                        <div id="chat-list" class="flex-1 overflow-y-auto"></div>
                    </div>
                    
                    <!-- Área de chat -->
                    <div class="flex-1 flex flex-col">
                        <div id="chat-header" class="p-3 border-b font-medium"></div>
                        <div id="messages-container" class="flex-1 p-3 overflow-y-auto bg-gray-50"></div>
                        <div class="p-3 border-t flex items-center space-x-2">
                            <input type="text" id="message-input" placeholder="Escribe un mensaje" 
                                   class="flex-1 p-2 border rounded-lg" disabled>
                            <button id="send-message" disabled
                                    class="bg-green-500 text-white p-2 rounded-lg opacity-50">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" 
                                     fill="none" stroke="currentColor" stroke-width="2" 
                                     stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Obtener elementos del DOM
        const chatList = document.getElementById('chat-list');
        const messagesContainer = document.getElementById('messages-container');
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-message');
        let currentChat = null;
        
        // Solicitar chats
        socket.emit('request_whatsapp_chats');
        
        // Evento: recibir chats
        socket.on('whatsapp_chats', (chats) => {
            chatList.innerHTML = '';
            
            if (!chats || chats.length === 0) {
                chatList.innerHTML = '<div class="p-3 text-center text-gray-500">No hay chats disponibles</div>';
                return;
            }
            
            chats.forEach(chat => {
                const chatEl = document.createElement('div');
                chatEl.className = 'p-3 border-b hover:bg-gray-50 cursor-pointer';
                chatEl.innerHTML = `
                    <div class="flex items-center">
                        <div class="flex-1">
                            <p class="font-medium">${chat.name || 'Chat'}</p>
                            <p class="text-sm text-gray-500 truncate">${chat.lastMessage || 'No hay mensajes'}</p>
                        </div>
                        ${chat.unreadCount ? `
                            <div class="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                ${chat.unreadCount}
                            </div>
                        ` : ''}
                    </div>
                `;
                
                chatEl.addEventListener('click', () => {
                    // Seleccionar chat
                    document.querySelectorAll('#chat-list > div').forEach(el => 
                        el.classList.remove('bg-gray-100'));
                    chatEl.classList.add('bg-gray-100');
                    
                    // Cargar mensajes
                    currentChat = chat;
                    socket.emit('request_chat_messages', { chatId: chat.id });
                    
                    // Actualizar UI
                    document.getElementById('chat-header').textContent = chat.name || 'Chat';
                    messageInput.disabled = false;
                    sendButton.disabled = false;
                    sendButton.classList.remove('opacity-50');
                });
                
                chatList.appendChild(chatEl);
            });
        });
        
        // Evento: recibir mensajes de un chat
        socket.on('whatsapp_chat_messages', (data) => {
            if (!currentChat || currentChat.id !== data.chatId) return;
            
            messagesContainer.innerHTML = '';
            
            if (!data.messages || data.messages.length === 0) {
                messagesContainer.innerHTML = '<div class="text-center p-4 text-gray-500">No hay mensajes</div>';
                return;
            }
            
            data.messages.forEach(msg => {
                const messageEl = document.createElement('div');
                messageEl.className = `flex ${msg.fromMe ? 'justify-end' : 'justify-start'} mb-2`;
                messageEl.innerHTML = `
                    <div class="${msg.fromMe ? 'bg-green-500 text-white' : 'bg-white'} rounded-lg p-3 max-w-[70%] shadow">
                        ${msg.body}
                        <div class="text-xs ${msg.fromMe ? 'text-green-100' : 'text-gray-500'} mt-1 text-right">
                            ${new Date(msg.timestamp * 1000).toLocaleTimeString()}
                        </div>
                    </div>
                `;
                messagesContainer.appendChild(messageEl);
            });
            
            // Scroll al final
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
        
        // Evento: recibir mensaje nuevo
        socket.on('whatsapp_message', (msg) => {
            if (currentChat && msg.chatId === currentChat.id) {
                // Añadir mensaje a la conversación
                const messageEl = document.createElement('div');
                messageEl.className = `flex ${msg.fromMe ? 'justify-end' : 'justify-start'} mb-2`;
                messageEl.innerHTML = `
                    <div class="${msg.fromMe ? 'bg-green-500 text-white' : 'bg-white'} rounded-lg p-3 max-w-[70%] shadow">
                        ${msg.body}
                        <div class="text-xs ${msg.fromMe ? 'text-green-100' : 'text-gray-500'} mt-1 text-right">
                            ${new Date(msg.timestamp * 1000).toLocaleTimeString()}
                        </div>
                    </div>
                `;
                messagesContainer.appendChild(messageEl);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            
            // Actualizar lista de chats
            socket.emit('request_whatsapp_chats');
        });
        
        // Enviar mensaje
        sendButton.addEventListener('click', () => {
            if (!currentChat || !messageInput.value.trim()) return;
            
            socket.emit('send_whatsapp_message', {
                chatId: currentChat.id,
                message: messageInput.value.trim()
            });
            
            messageInput.value = '';
        });
        
        // Enviar con Enter
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && messageInput.value.trim()) {
                sendButton.click();
            }
        });
    }

    function showWhatsAppInterface() {
        // Ocultar la interfaz de conexión
        document.getElementById('whatsapp-container')?.classList.add('hidden');
        
        // Mostrar la interfaz de chat
        const interfaceContainer = document.getElementById('whatsapp-interface');
        if (interfaceContainer) {
            interfaceContainer.classList.remove('hidden');
        }
    }

    if (validateUIElements() && verifyAuthentication()) {
        loadUserData();
        socket = setupSocketIO();
        setupNavigation();
        setupLogout();
        
        document.getElementById('dashboard-content')?.classList.remove('hidden');
    }
});