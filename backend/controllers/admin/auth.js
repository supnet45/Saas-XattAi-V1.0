// backend/controllers/admin/auth.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { conn } = require('../../config/database'); // Importa la conexión a la base de datos
const { SECRET_KEY } = process.env;

// Controlador para el login de administradores
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Verificar las credenciales (email y contraseña)
        const query = 'SELECT * FROM users WHERE email = $1 AND is_admin = true';
        const result = await conn.query(query, [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // 2. Si son válidas, generar un token de sesión
        const token = jwt.sign({ userId: user.id, isAdmin: user.is_admin }, SECRET_KEY, { expiresIn: '1h' });

        // 3. Devolver el token al cliente
        res.json({ message: 'Login de administrador exitoso', token });
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Controlador para obtener todos los usuarios (solo para administradores)
const getAllUsers = async (req, res) => {
    try {
        const query = 'SELECT * FROM users';
        const result = await conn.query(query);
        const users = result.rows;
        res.json(users);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    login,
    getAllUsers,
};