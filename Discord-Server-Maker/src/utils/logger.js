// src/utils/logger.js - Simple structured logger
import config from '../../config/config.js';

const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = levels[config.logLevel] ?? 2;

const colors = {
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[36m',
  debug: '\x1b[90m',
  reset: '\x1b[0m',
};

function log(level, message, meta = '') {
  if (levels[level] > currentLevel) return;
  const ts = new Date().toISOString();
  const metaStr = meta && typeof meta === 'object' ? JSON.stringify(meta) : meta;
  console.log(`${colors[level]}[${ts}] [${level.toUpperCase()}] ${message}${metaStr ? ' ' + metaStr : ''}${colors.reset}`);
}

export const logger = {
  error: (msg, meta) => log('error', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};
