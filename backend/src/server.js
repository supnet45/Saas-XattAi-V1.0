// backend/src/server.js o backend/app.js (donde esté tu punto de entrada)

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// Importar el módulo WhatsApp
const whatsappModule = require('./whatsapp');

// Inicializar Express
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurar servidor HTTP y Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Integrar WhatsApp
whatsappModule.setupWhatsAppIntegration(app, io);

// Rutas para entorno de desarrollo
app.get('/whatsapp-test', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/whatsapp-test.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
  console.log(`Test WhatsApp en http://localhost:${PORT}/whatsapp-test`);
});