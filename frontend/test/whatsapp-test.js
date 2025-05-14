// frontend/test/whatsapp-test.js

// Variables globales
let socket = null;
let whatsAppConnectionState = 'idle';
let whatsAppQrTimer = null;

// Elementos DOM (IDs actualizados)
const connectBtn         = document.getElementById('connect-whatsapp-btn');
const disconnectBtn      = document.getElementById('disconnect-whatsapp-btn');
const qrPlaceholder      = document.getElementById('qr-placeholder');
const qrCode             = document.getElementById('qr-code');
const whatsappLoading    = document.getElementById('whatsapp-loading');
const whatsappError      = document.getElementById('whatsapp-error');
const whatsappConnected  = document.getElementById('whatsapp-connected');
const whatsappStatus     = document.getElementById('whatsapp-status');
const statusMessage      = document.getElementById('status-message');
const errorMessage       = document.getElementById('error-message');
const whatsappPhone      = document.getElementById('whatsapp-phone');
const connectionState    = document.getElementById('connection-state');
const connectionIndicator= document.getElementById('connection-indicator');
const socketIdElement    = document.getElementById('socket-id');
const debugState         = document.getElementById('debug-state');
const lastAction         = document.getElementById('last-action');
const lastActionTime     = document.getElementById('last-action-time');
const userNameElement    = document.getElementById('user-name');
const logoutBtn          = document.getElementById('logout-btn');

// Actualiza la sección de depuración
function updateDebugInfo(action) {
  debugState.textContent       = whatsAppConnectionState;
  lastAction.textContent       = action || 'N/A';
  lastActionTime.textContent   = new Date().toLocaleTimeString();
}

// Muestra un error
function showError(message) {
  whatsappError.classList.remove('hidden');
  errorMessage.textContent       = message;
  connectionState.textContent    = 'Error';
  connectionIndicator.className  = 'w-3 h-3 rounded-full bg-red-500 mr-2';
  updateDebugInfo('Error: ' + message);
}

// Verifica JWT
function checkAuthentication() {
  const token    = localStorage.getItem('token');
  const userData = localStorage.getItem('userData');
  if (!token) {
    window.location.href = '/panel.html';
    return false;
  }
  if (userData) {
    const u = JSON.parse(userData);
    userNameElement.textContent = u.name || u.email || 'Usuario';
  }
  if (token.split('.').length !== 3) {
    localStorage.removeItem('token');
    window.location.href = '/panel.html';
    return false;
  }
  return true;
}

// Inicializa Socket.IO
function initializeSocket() {
  const token = localStorage.getItem('token');
  if (!token) {
    showError('No hay token de autenticación');
    return false;
  }
  socket = io('http://localhost:3001', { auth: { token } });
  connectionState.textContent     = 'Conectando…';
  connectionIndicator.className   = 'w-3 h-3 rounded-full bg-yellow-500 mr-2';
  updateDebugInfo('Iniciando conexión socket');

  socket.on('connect', () => {
    connectionState.textContent   = 'Conectado al servidor';
    connectionIndicator.className = 'w-3 h-3 rounded-full bg-green-500 mr-2';
    socketIdElement.textContent   = socket.id;
    updateDebugInfo('Socket conectado');
  });
  socket.on('disconnect', reason => {
    connectionState.textContent   = 'Desconectado del servidor';
    connectionIndicator.className = 'w-3 h-3 rounded-full bg-red-500 mr-2';
    updateDebugInfo('Socket desconectado: ' + reason);
  });
  socket.on('connect_error', err => showError('Error de conexión: ' + err.message));

  return true;
}

// Configura listeners de WhatsApp
function setupWhatsAppSocketEvents() {
  if (!socket) return false;
  socket.on('whatsapp_qr', data => handleWhatsAppQR(data));
  socket.on('whatsapp_connected', data => handleWhatsAppConnected(data));
  socket.on('whatsapp_disconnected', data => handleWhatsAppDisconnected(data));
  socket.on('whatsapp_error', data => handleWhatsAppError(data));
  socket.on('whatsapp_status', data => {
    if (data.connected) handleWhatsAppConnected(data.info || data);
  });
  return true;
}

// Manejo de eventos
function handleWhatsAppQR(data) {
  updateWhatsAppUIState('qr');
  qrCode.src               = data.qr;
  qrCode.classList.remove('hidden');
  console.log('QR mostrado – length:', data.qr.length);
  if (data.expiration) startQRExpiration(data.expiration);
}

function handleWhatsAppConnected(data) {
  clearTimeout(whatsAppQrTimer);
  updateWhatsAppUIState('connected');
  whatsappPhone.innerHTML = [
    `Número: ${data.phone || 'Desconocido'}`,
    `Nombre: ${data.name || '–'}`,
    `Desde: ${new Date(data.timestamp).toLocaleString()}`
  ].join('<br>');
  updateDebugInfo('WhatsApp conectado: ' + data.phone);
}

function handleWhatsAppDisconnected(data) {
  updateWhatsAppUIState('idle');
  updateDebugInfo('WhatsApp desconectado');
}

function handleWhatsAppError(data) {
  updateWhatsAppUIState('error');
  errorMessage.textContent = data.message || 'Error desconocido';
  updateDebugInfo('Error WhatsApp: ' + data.message);
}

// Actualiza la UI según estado
function updateWhatsAppUIState(state) {
  whatsAppConnectionState = state;
  [ qrPlaceholder, qrCode, whatsappLoading, whatsappError, whatsappConnected ]
    .forEach(el => el.classList.add('hidden'));
  connectBtn.disabled    = false;
  disconnectBtn.classList.add('hidden');
  connectBtn.classList.remove('opacity-50', 'cursor-not-allowed');

  switch (state) {
    case 'idle':
      qrPlaceholder.classList.remove('hidden');
      statusMessage.textContent = 'Listo para conectar';
      whatsappStatus.className  = 'mt-4 p-3 rounded-md bg-gray-50 border border-gray-200 text-sm text-gray-700 text-center';
      break;
    case 'loading':
      whatsappLoading.classList.remove('hidden');
      statusMessage.textContent = 'Conectando WhatsApp…';
      connectBtn.disabled       = true;
      connectBtn.classList.add('opacity-50', 'cursor-not-allowed');
      whatsappStatus.className  = 'mt-4 p-3 rounded-md bg-blue-50 border border-blue-200 text-sm text-blue-700 text-center';
      break;
    case 'qr':
      qrCode.classList.remove('hidden');
      statusMessage.textContent = 'Escanea el QR';
      whatsappStatus.className  = 'mt-4 p-3 rounded-md bg-blue-50 border border-blue-200 text-sm text-blue-700 text-center';
      connectBtn.disabled       = true;
      connectBtn.classList.add('opacity-50', 'cursor-not-allowed');
      break;
    case 'error':
      whatsappError.classList.remove('hidden');
      statusMessage.textContent = 'Error de conexión';
      whatsappStatus.className  = 'mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700 text-center';
      break;
    case 'connected':
      whatsappConnected.classList.remove('hidden');
      disconnectBtn.classList.remove('hidden');
      statusMessage.textContent = 'WhatsApp conectado';
      whatsappStatus.className  = 'mt-4 p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-700 text-center';
      break;
  }
  updateDebugInfo('Estado UI: ' + state);
}

// Lanza la petición de QR
function startWhatsAppConnection() {
  if (!socket?.connected) return showError('Sin conexión servidor');
  updateWhatsAppUIState('loading');
  socket.emit('request_whatsapp_qr');
  updateDebugInfo('request_whatsapp_qr emitido');
}

// Desconecta WhatsApp
function stopWhatsAppConnection() {
  if (!socket?.connected) return showError('Sin conexión servidor');
  socket.emit('disconnect_whatsapp');
  updateWhatsAppUIState('idle');
  updateDebugInfo('disconnect_whatsapp emitido');
}

// Temporizador de expiración
function startQRExpiration(seconds) {
  clearTimeout(whatsAppQrTimer);
  whatsAppQrTimer = setTimeout(() => {
    updateDebugInfo('QR expirado');
    updateWhatsAppUIState('idle');
  }, seconds * 1000);
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  if (!checkAuthentication()) return;
  if (initializeSocket()) {
    setupWhatsAppSocketEvents();
    socket.emit('check_whatsapp_status');
  }
  connectBtn.addEventListener('click', startWhatsAppConnection);
  disconnectBtn.addEventListener('click', stopWhatsAppConnection);
  logoutBtn.addEventListener('click', e => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    window.location.href = '/panel.html';
  });
  updateWhatsAppUIState('idle');
});
