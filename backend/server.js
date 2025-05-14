require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const compression = require('compression');

const setupWhatsAppSocket = require('./socket/socketHandlers');
const authenticateToken = require('./middleware/authMiddleware');
const adminRoutes      = require('./routes/admin/auth');
const userRoutes       = require('./routes/user/auth');
const authRoutes       = require('./routes/auth');
const userConfigRoutes = require('./routes/user/config');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
app.set('io', io);

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' }
);

// Logger
app.use(morgan('dev', { skip: () => process.env.NODE_ENV === 'production' }));
app.use(morgan('combined', { stream: accessLogStream, skip: () => process.env.NODE_ENV !== 'production' }));

// Body parsing & compression
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(compression());

// --- Static file configuration ---
// Assets (CSS, images, etc.)
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));

// User dashboard
app.use('/user', express.static(path.join(__dirname, '../frontend/user')));
// Admin dashboard
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin')));
// Test QR page
app.use('/test', express.static(path.join(__dirname, '../frontend/test')));

// Panel (login & main)
// This will catch /panel.html, /panel.js, and so on under /panel or root
app.use('/panel', express.static(path.join(__dirname, '../frontend')));

// Fallback for root to panel.html
app.get(['/', '/panel', '/panel.html'], (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/panel.html'));
});

// API routes
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api', authRoutes);
app.use('/api/user/config', authenticateToken, userConfigRoutes);

// SPA fallback for any non-API, non-static route
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (req.path.startsWith('/assets') || req.path.startsWith('/user') || req.path.startsWith('/admin') || req.path.startsWith('/test') || req.path.startsWith('/panel')) {
    return next();
  }
  // Otherwise send panel.html
  res.sendFile(path.join(__dirname, '../frontend/panel.html'));
});

// Initialize socket handlers
setupWhatsAppSocket(io);

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
