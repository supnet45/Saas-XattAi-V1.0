// backend/controllers/user/auth.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { conn } = require('../../config/database'); // Conexión a la base de datos
const { SECRET_KEY } = process.env;

// Controlador para el login de usuarios
const login = async (req, res) => {
  const { email, password, mode } = req.body;

  try {
    console.log(`POST /api/login: Procesando login para Email: ${email}, Modo: ${mode}`);

    // 1. Verificar las credenciales (email y contraseña)
    let query = `
      SELECT id,
             email,
             password_hash,
             name,
             is_admin
      FROM users
      WHERE email = $1
    `;
    const params = [email];

    // Si quieres deshabilitar el login de admins en modo user:
    if (mode === 'user') {
      query += ` AND (is_admin = false OR is_admin IS NULL)`;
    }

    console.log(`POST /api/login: Ejecutando query: ${query} con params: ${params}`);
    const result = await conn.query(query, params);
    const user = result.rows[0];

    console.log(`POST /api/login: Resultado de la query:`, user);

    if (!user) {
      console.warn(`POST /api/login: Usuario no encontrado para Email: ${email}`);
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // 2. Comparar la contraseña ingresada con el hash almacenado
    console.log(`POST /api/login: Comparando contraseña para el usuario con ID: ${user.id}`);
    const match = await bcrypt.compare(password, user.password_hash);
    console.log(`POST /api/login: Resultado de comparación de contraseña: ${match}`);

    if (!match) {
      console.warn(`POST /api/login: Contraseña incorrecta para el usuario con ID: ${user.id}`);
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // 3. Generar un token JWT con rol y tenant si aplica
    const payload = { userId: user.id, role: user.is_admin ? 'admin' : 'user' };
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

    console.log(`POST /api/login: Token generado para el usuario con ID: ${user.id}`);

    // 4. Responder con token y datos públicos del usuario
    res.json({
      message: 'Login exitoso',
      token,
      user: { id: user.id, email: user.email, name: user.name, role: payload.role }
    });

  } catch (err) {
    console.error(`Error procesando login para ${email}:`, err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Controlador para registrar un nuevo usuario
const register = async (req, res) => {
  const { email, password, name } = req.body;

  try {
    console.log(`POST /api/register: Procesando registro para Email: ${email}, Nombre: ${name}`);

    if (!email || !password || !name) {
      console.warn(`POST /api/register: Faltan datos obligatorios`);
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    // 1. Verificar si ya existe
    console.log(`POST /api/register: Verificando si el email ya existe`);
    const check = await conn.query('SELECT 1 FROM users WHERE email = $1', [email]);
    console.log(`POST /api/register: Resultado de verificación de email:`, check.rows);

    if (check.rows.length) {
      console.warn(`POST /api/register: El email ya está en uso: ${email}`);
      return res.status(409).json({ message: 'El email ya está en uso' });
    }

    // 2. Hashear contraseña
    console.log(`POST /api/register: Hasheando contraseña`);
    const hashed = await bcrypt.hash(password, 10);

    // 3. Insertar
    console.log(`POST /api/register: Insertando usuario en la base de datos`);
    const insert = await conn.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name`,
      [email, hashed, name]
    );

    const newUser = insert.rows[0];
    console.log(`POST /api/register: Usuario insertado con ID: ${newUser.id}`);

    // 4. Generar token
    const payload = { userId: newUser.id, role: 'user' };
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

    console.log(`POST /api/register: Token generado para el usuario con ID: ${newUser.id}`);

    res.status(201).json({
      message: 'Usuario registrado',
      token,
      user: newUser
    });

  } catch (err) {
    console.error('Error al registrar usuario:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = { login, register };
