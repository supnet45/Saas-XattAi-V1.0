// backend/routes/user/config.js - v2.0
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { conn: pool } = require('../../config/database');

console.log(">>> Archivo routes/user/config.js v2.0 cargado por Node.");

// --- GET /webhook ---
router.get('/webhook', async (req, res) => {
    console.log(">>> Handler GET /webhook INICIADO.");
    
    // Verificar que req.user exista (middleware de autenticación)
    if (!req.user || !req.user.userId) {
        console.error(">>> Handler GET /webhook ERROR: No hay usuario autenticado");
        return res.status(401).json({ 
            success: false, 
            message: 'No autorizado. Falta autenticación.' 
        });
    }
    
    const userId = req.user.userId;
    console.log(`[GET /webhook] Solicitud para usuario ID: ${userId}`);
    
    try {
        const result = await pool.query(
            'SELECT n8n_webhook_url_test, n8n_webhook_url_prod FROM users WHERE id = $1',
            [userId]
        );
        
        if (result.rows.length === 0) {
            console.warn(`[GET /webhook] Usuario ID ${userId} no encontrado en BD`);
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado.' 
            });
        }
        
        // Extraer URLs del resultado
        const { n8n_webhook_url_test, n8n_webhook_url_prod } = result.rows[0];
        
        console.log(`[GET /webhook] Retornando URLs para usuario ${userId}: Test=${!!n8n_webhook_url_test}, Prod=${!!n8n_webhook_url_prod}`);
        
        return res.json({
            success: true,
            webhook_urls: {
                test: n8n_webhook_url_test || '',
                prod: n8n_webhook_url_prod || ''
            }
        });
    } catch (error) {
        console.error(`[GET /webhook] ERROR:`, error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error al obtener la URL del webhook.' 
        });
    }
});

// --- POST /webhook ---
router.post('/webhook', async (req, res) => {
    // Verificar autenticación
    if (!req.user || !req.user.userId) {
        return res.status(401).json({ 
            success: false, 
            message: 'No autorizado. Falta autenticación.' 
        });
    }
    
    const userId = req.user.userId;
    console.log(`[POST /webhook] Solicitud para usuario ID: ${userId}`);
    
    const { url, environment } = req.body;
    
    // Validar parámetros
    if (!url || !environment || (environment !== 'test' && environment !== 'prod')) {
        return res.status(400).json({
            success: false,
            message: 'Faltan parámetros o son inválidos. Se requiere url y environment (test/prod).'
        });
    }
    
    try {
        // Determinar qué columna actualizar según el environment
        const column = environment === 'test' ? 'n8n_webhook_url_test' : 'n8n_webhook_url_prod';
        
        // Actualizar la URL en la base de datos
        await pool.query(
            `UPDATE users SET ${column} = $1 WHERE id = $2`,
            [url, userId]
        );
        
        console.log(`[POST /webhook] URL ${environment} actualizada para usuario ${userId}: ${url.substring(0, 20)}...`);
        
        return res.json({
            success: true,
            message: `URL del webhook de ${environment} actualizada correctamente.`
        });
    } catch (error) {
        console.error(`[POST /webhook] ERROR:`, error);
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar la URL del webhook.'
        });
    }
});

// --- POST /test-webhook ---
router.post('/test-webhook', async (req, res) => {
    // Verificar autenticación
    if (!req.user || !req.user.userId) {
        return res.status(401).json({ 
            success: false, 
            message: 'No autorizado. Falta autenticación.' 
        });
    }
    
    const userId = req.user.userId;
    console.log(`[POST /test-webhook] Solicitud para usuario ID: ${userId}`);
    
    const { webhook_url, test_data } = req.body;
    
    // Validar parámetros
    if (!webhook_url) {
        return res.status(400).json({
            success: false,
            message: 'Falta la URL del webhook.'
        });
    }
    
    try {
        // Intentar llamar al webhook con datos de prueba o un payload por defecto
        const payload = test_data || { 
            test: true, 
            timestamp: new Date().toISOString(),
            message: "Este es un mensaje de prueba desde XattAI" 
        };
        
        console.log(`[POST /test-webhook] Llamando a webhook: ${webhook_url.substring(0, 30)}...`);
        
        const response = await axios.post(webhook_url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000 // 10 segundos timeout
        });
        
        console.log(`[POST /test-webhook] Respuesta: ${response.status}`);
        
        return res.json({
            success: true,
            message: 'Test del webhook completado correctamente.',
            status: response.status,
            data: response.data
        });
    } catch (error) {
        console.error(`[POST /test-webhook] ERROR:`, error.message);
        return res.status(500).json({
            success: false,
            message: `Error al probar el webhook: ${error.message}`
        });
    }
});

module.exports = router;