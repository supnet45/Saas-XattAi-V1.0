const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');

// Rutas para gestión de sesiones
router.post('/session/:sessionId/init', whatsappController.initSession);
router.delete('/session/:sessionId', whatsappController.closeSession);

// Rutas para envío de mensajes
router.post('/session/:sessionId/send', whatsappController.sendMessage);

module.exports = router;