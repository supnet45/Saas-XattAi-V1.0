// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = process.env;

/**
 * Middleware para verificar el token JWT en rutas Express protegidas
 * @param {Object} req - Objeto de solicitud HTTP 
 * @param {Object} res - Objeto de respuesta HTTP
 * @param {Function} next - Función para continuar con el siguiente middleware
 */
const authenticateToken = (req, res, next) => {
    // Obtener el token del header 'Authorization' (formato común: "Bearer TOKEN")
    const authHeader = req.headers['authorization'] || req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn("[AuthMiddleware] Acceso denegado: No se proporcionó token válido.");
        return res.status(401).json({ 
            success: false, 
            message: 'Acceso no autorizado: Token no proporcionado o formato incorrecto' 
        });
    }
    
    // Extraer el token (quitar "Bearer ")
    const token = authHeader.split(' ')[1];
    
    console.log("[AuthMiddleware] Token extraído:", token ? `${token.substring(0,10)}...` : 'No Token');
    
    if (!token) {
        console.warn("[AuthMiddleware] Acceso denegado: No se proporcionó token.");
        return res.status(401).json({ 
            success: false, 
            message: 'Acceso denegado: Falta token.' 
        });
    }
    
    if (!SECRET_KEY) {
        console.error("[AuthMiddleware] Error crítico: SECRET_KEY no configurada en el servidor.");
        return res.status(500).json({ 
            success: false, 
            message: 'Error de configuración del servidor.' 
        });
    }
    
    try {
        // Verificar token
        const decoded = jwt.verify(token, SECRET_KEY);
        
        // Añadir información del usuario al objeto de solicitud
        req.user = decoded;
        
        // Compatibilidad con ambos formatos
        const userId = decoded.id || decoded.userId;
        const role = decoded.role || (decoded.is_admin ? 'admin' : 'user');
        
        console.log(`[AuthMiddleware] Token válido. Usuario ID: ${userId}, Rol: ${role}`);
        
        // Continuar con el siguiente middleware o controlador
        next();
    } catch (error) {
        console.error('[AuthMiddleware] Error verificando token:', error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Acceso denegado: Token expirado.',
                expired: true
            });
        }
        
        return res.status(401).json({
            success: false,
            message: 'Acceso denegado: Token inválido.'
        });
    }
};

module.exports = authenticateToken;