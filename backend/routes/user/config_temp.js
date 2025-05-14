const express = require('express');
const router = express.Router();

console.log(">>> Archivo TEMPORAL config_temp.js cargado");

// Solo una ruta de prueba mínima
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Test OK' });
});

module.exports = router;