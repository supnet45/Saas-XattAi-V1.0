// backend/routes/user/auth.js
const express = require('express');
const { login, register } = require('../../controllers/user/auth');
const router = express.Router();

// Ruta para el login de usuarios
router.post('/login', login);

// Ruta para registrar un nuevo usuario
router.post('/register', register);

const authenticateToken = require('../../middleware/authMiddleware');
const db = require('../../config/database'); // Asegúrate que esta ruta sea correcta para tu proyecto

// Endpoint para obtener perfil de usuario
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // El middleware authenticateToken ya añadió req.user
    const userId = req.user.id;
    
    // Usar la función query del módulo correcto
    const userQuery = await db.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [userId]);
    
    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Si necesitas tener un campo "role" en la respuesta, puedes agregarlo manualmente:
    const userData = userQuery.rows[0];
    userData.role = 'user'; // O determina el rol de otra forma
    
    // Intentar obtener configuración del usuario
    try {
      const settingsQuery = await db.query('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
      const settings = settingsQuery.rows.length > 0 ? settingsQuery.rows[0] : {
        theme: 'light',
        notifications: true
      };
      
      // Devolver datos del usuario
      return res.status(200).json({
        user: userData,
        settings
      });
    } catch (settingsError) {
      // Manejar error de configuraciones
      console.error('Error obteniendo configuraciones:', settingsError);
      return res.status(200).json({
        user: userData,
        settings: {
          theme: 'light',
          notifications: true
        }
      });
    }
  } catch (error) {
    console.error('Error al obtener perfil de usuario:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;