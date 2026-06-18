require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  dhru: {
    url: process.env.DHRU_URL,
    username: process.env.DHRU_USERNAME,
    apiAccessKey: process.env.DHRU_API_KEY,
    requestFormat: 'JSON'
  },
  
  security: {
    apiSecretToken: process.env.API_SECRET_TOKEN,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  
  logLevel: process.env.LOG_LEVEL || 'info'
};
