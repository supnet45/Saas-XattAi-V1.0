// INICIO DE CÓDIGO: backend/socket.js v1.0
// Ruta: backend/socket.js
// Version: 1.0
// Notas importantes:
// - Centraliza la configuración y registro de todos los eventos de Socket.IO
// - Usa autenticación JWT en middleware global
// - Agrupa lógica de conexión, WhatsApp y eventos adicionales aquí

const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { safeUpdateTimestamp } = require('./utils/dbHelpers');
const whatsappService = require('./services/whatsappService');

/**
 * Configura y devuelve la instancia de Socket.IO
 * @param {http.Server} server - Servidor HTTP de Express
 * @param {Object} options - Opciones de CORS y reconexión
 * @returns {Server} io - Instancia configurada de Socket.IO
 */
function setupSocketIO(server, options = {}) {
  // Inicializar Socket.IO con opciones CORS
  const io = new Server(server, {
    cors: {
      origin: options.origin || '*',
      methods: options.methods || ['GET', 'POST'],
      credentials: options.credentials || true,
    },
    // Nota: puedes añadir aquí reconnectionAttempts, reconnectionDelay, etc.
  });

  // --- Middleware de autenticación JWT para todas las conexiones ---
  io.use(async (socket, next) => {
    try {
      // El token puede venir en auth o query params
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        console.log(`[Socket ${socket.id}] Auth error: No token provided`);
        return next(new Error('Auth error: Token requerido'));
      }
      // Verificar y decodificar token
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      if (!decoded?.userId) {
        console.log(`[Socket ${socket.id}] Auth error: Token inválido`);
        return next(new Error('Auth error: Token inválido')); // Detiene la conexión
      }
      // Guardar datos de usuario en el socket
      socket.user = {
        id: decoded.userId,
        role: decoded.role || 'user',
      };
      console.log(`[Socket ${socket.id}] Authenticated user ${socket.user.id} (${socket.user.role})`);
      next();
    } catch (err) {
      console.error(`[Socket ${socket.id}] Auth middleware error:`, err.message);
      next(new Error('Auth error: ' + err.message));
    }
  });

  // --- Registro de eventos tras conexión exitosa ---
  io.on('connection', (socket) => {
    // Usuario autenticado desde el middleware
    if (!socket.user) return;
    const userId = socket.user.id;

    // Conexión inicial
    console.log(`--> [${socket.id}] Connected: User ${socket.user.id}`);

    // Actualizar timestamp de última conexión en base de datos
    safeUpdateTimestamp('users', 'last_socket_connection', 'id', socket.user.id)
      .catch(err => console.error(`Error updating connection timestamp:`, err));

    // Unir socket a una sala personal
    socket.join(`user:${socket.user.id}`);

    // --- Eventos de WhatsApp ---
    socket.on('request_whatsapp_qr', () => {
      // Iniciar cliente de WhatsApp
      whatsappService.initialize(socket, userId);
    });

    socket.on('request_whatsapp_chats', async () => {
      try {
        const chats = await whatsappService.getChats(userId);
        socket.emit('whatsapp_chats', chats);
      } catch (error) {
        socket.emit('whatsapp_error', { message: error.message });
      }
    });

    socket.on('request_chat_messages', async (data) => {
      try {
        if (!data || !data.chatId) throw new Error('ID de chat no proporcionado');
        const messages = await whatsappService.getChatMessages(userId, data.chatId);
        socket.emit('whatsapp_chat_messages', { chatId: data.chatId, messages });
      } catch (error) {
        socket.emit('whatsapp_error', { message: error.message });
      }
    });

    socket.on('send_whatsapp_message', async (data) => {
      try {
        if (!data || !data.chatId || !data.message) 
          throw new Error('Datos de mensaje incompletos');
          
        const result = await whatsappService.sendMessage(userId, data.chatId, data.message);
        socket.emit('whatsapp_message_sent', result);
      } catch (error) {
        socket.emit('whatsapp_error', { message: error.message });
      }
    });

    // --- Otros eventos de la aplicación (ejemplos) ---
    socket.on('send_message', async (data) => {
      // Nota: implementar lógica de envío de mensajes
      console.log(`[${socket.id}] send_message`, data);
    });

    socket.on('update_status', async (data) => {
      // Nota: implementar lógica de actualización de estado de usuario
      console.log(`[${socket.id}] update_status`, data);
    });

    // --- Desconexión ---
    socket.on('disconnect', (reason) => {
      console.log(`<-- [${socket.id}] Disconnected: ${reason}`);
      // Actualizar timestamp de desconexión en base de datos
      safeUpdateTimestamp('users', 'last_socket_disconnect', 'id', socket.user.id)
        .catch(err => console.error(`Error updating disconnect timestamp:`, err));
    });
  });

  io.on('connect', (s) => {
    console.log('Socket.IO: Connected!', s.id);
    showNotification('Conexión en tiempo real establecida', 'success');
    setupWhatsAppSocketListeners(s); // Ya estás configurando los listeners aquí
  });

  return io;
}

module.exports = setupSocketIO;
// FINAL DE CÓDIGO: backend/socket.js v1.0
