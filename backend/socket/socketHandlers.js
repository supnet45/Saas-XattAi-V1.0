// socket/socketHandlers.js
const whatsappService = require('../services/whatsappService');

function setupWhatsAppSocket(io) {
  io.on('connection', socket => {
    const uid = socket.id; // o extrae aquí tu userId de token

    console.log(`[Socket ${socket.id}] conectado`);

    socket.on('request_whatsapp_qr', () => {
      // Siempre inicializamos con socket + uid
      whatsappService.initialize(socket, uid);
    });

    socket.on('check_whatsapp_status', async () => {
      try {
        const status = await whatsappService.getStatus(uid);
        socket.emit('whatsapp_status', status);
      } catch (err) {
        socket.emit('whatsapp_error', { message: err.message });
      }
    });

    socket.on('request_whatsapp_logout', () => {
      whatsappService.disconnect(uid);
      socket.emit('whatsapp_disconnected_event', {
        message: 'Desconectado correctamente'
      });
    });

    socket.on('disconnect', reason => {
      console.log(`[Socket ${socket.id}] desconectado: ${reason}`);
      whatsappService.disconnect(uid);
    });
  });
}

module.exports = setupWhatsAppSocket;
