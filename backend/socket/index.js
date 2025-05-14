// Configuración de Socket.IO con autenticación por token

const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

/**
 * Configura Socket.IO en el servidor HTTP
 * @param {Object} server - Servidor HTTP de Express
 * @param {Object} options - Opciones adicionales
 * @returns {Object} Instancia de Socket.IO
 */
function setupSocketIO(server, options = {}) {
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: {
      origin: options.origin || "*",
      methods: options.methods || ["GET", "POST"],
      credentials: options.credentials || true
    }
  });
  
  // Autenticación por token
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        console.log(`[${socket.id}] io.use: RECHAZADO - No token.`);
        return next(new Error('Auth error: No token'));
      }
      
      jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) { 
          console.error(`[${socket.id}] io.use: RECHAZADO - Token inválido: ${err.message}`); 
          return next(new Error(`Auth error: ${err.message}`)); 
        }
        
        socket.user = decoded;
        console.log(`[${socket.id}] io.use: Token VERIFICADO`);
        next();
      });
    } catch (error) {
      console.error('Socket.IO auth error:', error.message);
      return next(new Error('Auth error: ' + error.message));
    }
  });

  // Configurar eventos WhatsApp
  io.on('connection', (socket) => {
    console.log(`Socket conectado: ${socket.id}`);

    socket.on('request_whatsapp_qr', () => {
      // Generar QR de WhatsApp
      const qrCode = 'data:image/png;base64,...'; // Este sería el QR real generado por tu biblioteca
      socket.emit('whatsapp_qr', { qr: qrCode });
    });

    socket.on('check_whatsapp_status', () => {
      // Verificar estado de la conexión WhatsApp
      socket.emit('whatsapp_status', { connected: false, message: 'No conectado' });
    });

    socket.on('request_whatsapp_logout', () => {
      // Desconectar WhatsApp
      socket.emit('whatsapp_disconnected_event', { message: 'Desconectado correctamente' });
    });

    socket.on('disconnect', () => {
      console.log(`Socket desconectado: ${socket.id}`);
    });
  });
  
  return io;
}

module.exports = setupSocketIO;