const config = require('../config');

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = LOG_LEVELS[config.logLevel] || LOG_LEVELS.info;

const logger = {
  error: (message, data) => {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(`[${new Date().toISOString()}] ❌ ERROR: ${message}`, data ? data : '');
    }
  },
  warn: (message, data) => {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(`[${new Date().toISOString()}] ⚠️ WARN: ${message}`, data ? data : '');
    }
  },
  info: (message, data) => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.log(`[${new Date().toISOString()}] ℹ️ INFO: ${message}`, data ? data : '');
    }
  },
  debug: (message, data) => {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.log(`[${new Date().toISOString()}] 🔍 DEBUG: ${message}`, data ? data : '');
    }
  }
};

module.exports = logger;