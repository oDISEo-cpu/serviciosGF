const config = require('../config');

/**
 * Middleware de autenticación
 * Verifica que las peticiones vengan de tu frontend
 */
function authMiddleware(req, res, next) {
  // En modo desarrollo, permitir todo
  if (config.nodeEnv === 'development') {
    return next();
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      ERROR: [{ MESSAGE: 'Authorization header required' }]
    });
  }

  const token = authHeader.replace('Bearer ', '');

  if (token !== config.security.apiSecretToken) {
    return res.status(403).json({
      ERROR: [{ MESSAGE: 'Invalid authorization token' }]
    });
  }

  next();
}

module.exports = authMiddleware;