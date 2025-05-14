// --- Importaciones necesarias ---
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');
const { safeUpdateTimestamp, ensureUserTrackingColumns } = require('../utils/dbHelpers');

// Al inicio del archivo, verificar y crear las columnas necesarias
(async () => {
  try {
    await ensureUserTrackingColumns();
  } catch (err) {
    console.warn("No se pudieron verificar/crear columnas de tracking:", err.message);
  }
})();

/**
 * @route POST /api/login
 * @desc Autenticar un usuario y obtener un token
 * @access Público
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log(`Intento de login para: ${email}`);
    
    // Validar datos de entrada
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, proporciona email y contraseña'
      });
    }
    
    // Buscar usuario en la base de datos
    const query = 'SELECT id, email, name, password_hash, is_admin FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    
    // Verificar si el usuario existe
    if (result.rows.length === 0) {
      console.log(`Login fallido: Usuario no encontrado para ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }
    
    const user = result.rows[0];
    
    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      console.log(`Login fallido: Contraseña incorrecta para ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }
    
    // Crear payload para el token
    const payload = {
      id: user.id,
      userId: user.id, // Para compatibilidad
      email: user.email,
      name: user.name,
      is_admin: user.is_admin,
      role: user.is_admin ? 'admin' : 'user' // Para compatibilidad
    };
    
    // Generar token
    const token = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '24h' });
    
    // Actualizar último login
    await safeUpdateTimestamp('users', 'last_login', 'id', user.id);
    
    console.log(`Login exitoso para ${email} (ID: ${user.id})`);
    
    // Enviar respuesta
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      is_admin: user.is_admin
    };
    return res.status(200).json({
      token: token,
      user: userData,
      redirect: '/test/whatsapp-test.html' // Añadido para redirección
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({
      success: false,
      message: 'Error del servidor al procesar login'
    });
  }
});

/**
 * @route POST /api/register
 * @desc Registrar un nuevo usuario
 * @access Público
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validar datos de entrada
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, proporciona nombre, email y contraseña'
      });
    }
    
    // Verificar si el usuario ya existe
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }
    
    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Insertar nuevo usuario
    const query = `
      INSERT INTO users (name, email, password_hash, is_admin, created_at)
      VALUES ($1, $2, $3, false, NOW())
      RETURNING id, name, email, is_admin
    `;
    
    const result = await pool.query(query, [name, email, hashedPassword]);
    const newUser = result.rows[0];
    
    // Crear payload para el token
    const payload = {
      id: newUser.id,
      userId: newUser.id, // Para compatibilidad
      email: newUser.email,
      name: newUser.name,
      is_admin: newUser.is_admin,
      role: 'user' // Por defecto, los nuevos usuarios son usuarios normales
    };
    
    // Generar token
    const token = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '24h' });
    
    console.log(`Nuevo usuario registrado: ${email} (ID: ${newUser.id})`);
    
    // Enviar respuesta
    return res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      token,
      userData: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        is_admin: newUser.is_admin
      }
    });
  } catch (error) {
    console.error('Error en registro de usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error del servidor al registrar usuario'
    });
  }
});

// --- Endpoint para verificar token ---
/**
 * @route GET /api/verify-token
 * @desc Verifica si un token JWT es válido
 * @access Privado (requiere token)
 */
router.get('/verify-token', authMiddleware, async (req, res) => {
  try {
    // Si llegamos aquí, el token es válido (verificado por authMiddleware)
    // Obtener información adicional del usuario si es necesario
    const userId = req.user.id || req.user.userId;
    
    const userQuery = `
      SELECT id, email, name, is_admin, last_login 
      FROM users 
      WHERE id = $1
    `;
    
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }
    
    const user = userResult.rows[0];
    
    // Evitar enviar información sensible
    delete user.password_hash;
    
    return res.status(200).json({
      success: true,
      message: 'Token válido',
      user
    });
  } catch (error) {
    console.error('Error en verificación de token:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error del servidor al verificar token' 
    });
  }
});

/**
 * @route POST /api/refresh-token
 * @desc Renueva un token JWT si aún es válido o está próximo a expirar
 * @access Privado (requiere token)
 */
router.post('/refresh-token', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    // Verificar si el usuario existe en la base de datos
    const userQuery = `
      SELECT id, email, name, is_admin 
      FROM users 
      WHERE id = $1
    `;
    
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
    }
    
    const user = userResult.rows[0];
    
    // Generar un nuevo token
    const payload = {
      id: user.id,
      userId: user.id, // Para compatibilidad
      email: user.email,
      name: user.name,
      is_admin: user.is_admin,
      role: user.is_admin ? 'admin' : 'user' // Para compatibilidad
    };
    
    // Firmar el token con una expiración (por ejemplo, 24 horas)
    const token = jwt.sign(
      payload, 
      process.env.SECRET_KEY, 
      { expiresIn: '24h' }
    );
    
    // Actualizar la fecha de último acceso
    const updateQuery = `
      UPDATE users 
      SET last_login = NOW() 
      WHERE id = $1
    `;
    
    await pool.query(updateQuery, [userId]);
    
    return res.status(200).json({
      success: true,
      message: 'Token renovado exitosamente',
      token,
      userData: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_admin: user.is_admin
      }
    });
  } catch (error) {
    console.error('Error en renovación de token:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error del servidor al renovar token' 
    });
  }
});

/**
 * @route POST /api/logout
 * @desc Registra el cierre de sesión del usuario
 * @access Privado (requiere token)
 */
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    // Registrar salida en la base de datos
    await safeUpdateTimestamp('users', 'last_logout', 'id', userId);
    
    // Si usas Socket.IO, puedes desconectar la sesión del usuario
    if (req.app.get('io')) {
      const io = req.app.get('io');
      const userSockets = Object.values(io.sockets.sockets).filter(
        socket => socket.user && (socket.user.id === userId || socket.user.userId === userId)
      );
      
      // Desconectar todas las sesiones del usuario
      userSockets.forEach(socket => {
        socket.disconnect(true);
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Sesión cerrada correctamente'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error del servidor al cerrar sesión' 
    });
  }
});

/**
 * @route GET /api/user-info
 * @desc Obtiene información detallada del usuario actual
 * @access Privado (requiere token)
 */
router.get('/user-info', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    const query = `
      SELECT 
        id, 
        name, 
        email, 
        is_admin, 
        created_at, 
        last_login, 
        last_logout
      FROM users 
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }
    
    // Obtener estadísticas adicionales si es necesario
    // Por ejemplo, número de sesiones, actividad reciente, etc.
    
    return res.status(200).json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener información del usuario:', error);
    return res.status(500).json({
      success: false,
      message: 'Error del servidor al obtener información del usuario'
    });
  }
});

module.exports = router;