// Versión mínima de server.js para pruebas
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Solo una ruta de prueba
app.get('/test', (req, res) => {
  res.json({ message: 'Servidor de prueba funcionando' });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Servidor minimalista funcionando en puerto ${port}`);
});

