// backend/utils/dbHelpers.js
const { pool } = require('../config/database');

/**
 * Actualiza un campo de timestamp en la tabla especificada, manejando errores si la columna no existe
 * @param {string} table - Nombre de la tabla (ej: 'users')
 * @param {string} fieldName - Nombre del campo a actualizar (ej: 'last_login')
 * @param {string} idField - Nombre del campo ID (ej: 'id')
 * @param {number|string} idValue - Valor del ID del registro a actualizar
 * @returns {Promise<boolean>} - true si la actualización fue exitosa, false si no
 */
async function safeUpdateTimestamp(table, fieldName, idField, idValue) {
  try {
    // Primero verificar si la columna existe
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = $1 
      AND column_name = $2
    `;
    
    const columnCheck = await pool.query(checkColumnQuery, [table, fieldName]);
    
    // Si la columna no existe, simplemente retornar false
    if (columnCheck.rows.length === 0) {
      console.warn(`La columna ${fieldName} no existe en la tabla ${table}. Omitiendo actualización.`);
      return false;
    }
    
    // Si la columna existe, realizar la actualización
    const updateQuery = `UPDATE ${table} SET ${fieldName} = NOW() WHERE ${idField} = $1`;
    await pool.query(updateQuery, [idValue]);
    return true;
  } catch (err) {
    console.warn(`Error al actualizar ${fieldName} en ${table}:`, err.message);
    return false;
  }
}

/**
 * Crea las columnas de tracking de sesión en la tabla users si no existen
 * @returns {Promise<boolean>} - true si la operación fue exitosa
 */
async function ensureUserTrackingColumns() {
  try {
    // SQL para añadir las columnas necesarias si no existen
    const query = `
      DO $$
      BEGIN
        -- Añadir columna last_login si no existe
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'users' AND column_name = 'last_login') THEN
          ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
        END IF;
        
        -- Añadir columna last_logout si no existe
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'users' AND column_name = 'last_logout') THEN
          ALTER TABLE users ADD COLUMN last_logout TIMESTAMP;
        END IF;
        
        -- Añadir columna last_websocket_connection si no existe
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'users' AND column_name = 'last_websocket_connection') THEN
          ALTER TABLE users ADD COLUMN last_websocket_connection TIMESTAMP;
        END IF;
        
        -- Añadir columna last_websocket_disconnection si no existe
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'users' AND column_name = 'last_websocket_disconnection') THEN
          ALTER TABLE users ADD COLUMN last_websocket_disconnection TIMESTAMP;
        END IF;
        
        -- Añadir columna token_version si no existe
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'users' AND column_name = 'token_version') THEN
          ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 1;
        END IF;
      END
      $$;
    `;
    
    await pool.query(query);
    console.log("Verificación y creación de columnas de tracking completada.");
    return true;
  } catch (err) {
    console.error("Error al crear columnas de tracking:", err);
    return false;
  }
}

module.exports = {
  safeUpdateTimestamp,
  ensureUserTrackingColumns
};