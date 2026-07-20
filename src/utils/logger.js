const LOG_PREFIX = '[Fortress]';

const logger = {
  info: (...args) => console.log(LOG_PREFIX, '[INFO]', ...args),
  warn: (...args) => console.warn(LOG_PREFIX, '[WARN]', ...args),
  error: (...args) => console.error(LOG_PREFIX, '[ERROR]', ...args),
};

module.exports = logger;
