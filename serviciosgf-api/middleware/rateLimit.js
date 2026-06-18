const rateLimit = require('express-rate-limit');
const config = require('../config');

const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  message: {
    ERROR: [{ MESSAGE: 'Too many requests, please try again later' }]
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = limiter;