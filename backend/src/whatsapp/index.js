const whatsappService = require('./services/whatsapp.service');
const whatsappRoutes = require('./routes/whatsapp.routes');

/**
 * Configura la integración de WhatsApp en una app Express y Socket.IO
 * @param {object} app - Instancia de Express
 * @param {object} io - Instancia de Socket.IO
 */
function setupWhatsAppIntegration(app, io) {
  // Configurar rutas API
  app.use('/api/whatsapp', whatsappRoutes);
  
  // Configurar eventos de Socket.IO
  io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);
    
    socket.on('request_qr', async (data) => {
      const sessionId = data?.sessionId || 'default';
      try {
        await whatsappService.createConnection(sessionId, socket);
      } catch (error) {
        console.error('Error al inicializar WhatsApp:', error);
      }
    });
    
    socket.on('disconnect_whatsapp', async (data) => {
      const sessionId = data?.sessionId || 'default';
      try {
        await whatsappService.closeConnection(sessionId);
        socket.emit('status', { message: 'Sesión cerrada' });
      } catch (error) {
        console.error('Error al desconectar WhatsApp:', error);
      }
    });
  });
  
  return {
    service: whatsappService
  };
}

module.exports = {
  setupWhatsAppIntegration,
  service: whatsappService,
  routes: whatsappRoutes
};