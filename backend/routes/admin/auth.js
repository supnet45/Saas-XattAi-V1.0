// backend/routes/admin/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../../controllers/admin/auth'); // Importa el controlador de admin

// Ruta para el login de administradores
router.post('/login', authController.login);

// Ruta para obtener todos los usuarios (solo para administradores)
router.get('/users', authController.getAllUsers);

module.exports = router;