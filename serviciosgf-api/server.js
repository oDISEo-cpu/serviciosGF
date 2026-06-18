const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const apiRoutes = require('./routes/api');
const rateLimiter = require('./middleware/rateLimit');
const logger = require('./utils/logger');

const app = express();

// ============================================
// 🔒 SEGURIDAD
// ============================================
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// ============================================
// 🌐 CORS
// ============================================
app.use(cors({
  origin: config.cors.origin,
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders,
  credentials: true
}));

// ============================================
// 📝 LOGS
// ============================================
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// ============================================
// 📥 BODY PARSING
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// ⚡ RATE LIMITING
// ============================================
app.use('/api/', rateLimiter);

// ============================================
// 🛣️ RUTAS
// ============================================
app.use('/api', apiRoutes);

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    service: 'ServiciosGF API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /api/health',
      balance: 'POST /api/balance',
      services: 'POST /api/services',
      order: 'POST /api/order',
      orderStatus: 'POST /api/order-status'
    }
  });
});

// ============================================
// ❌ 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({
    ERROR: [{ MESSAGE: `Route ${req.method} ${req.path} not found` }]
  });
});

// ============================================
// 🚨 ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  logger.error('Error no manejado:', err.stack);
  res.status(500).json({
    ERROR: [{ MESSAGE: 'Internal server error' }]
  });
});

// ============================================
// ▶️ INICIAR SERVIDOR
// ============================================
app.listen(config.port, '0.0.0.0', () => {
  logger.info('🚀 ============================================');
  logger.info(`🚀 ServiciosGF API corriendo en puerto ${config.port}`);
  logger.info(`🌍 Environment: ${config.nodeEnv}`);
  logger.info(`🔗 DHru URL: ${config.dhru.url}`);
  logger.info(`👤 Username: ${config.dhru.username}`);
  logger.info('🚀 ============================================');
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  logger.error('❌ Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  logger.error('❌ Uncaught Exception:', err);
  process.exit(1);
});