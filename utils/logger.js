const LOG_ENABLED = String(process.env.EXPO_PUBLIC_LOG_ENABLED || '').toLowerCase() === 'true';

function emit(method, args) {
  if (!LOG_ENABLED) {
    return;
  }

  const [prefix, ...content] = args

  const target = console[method] || console.log;
  target(prefix, ...content.map(x => JSON.stringify(x)));
}

function createLogger(namespace) {
  const prefix = `[${namespace}]`;

  return {
    debug: (...args) => emit('log', [prefix, ...args]),
    error: (...args) => emit('error', [prefix, ...args]),
    info: (...args) => emit('info', [prefix, ...args]),
    log: (...args) => emit('log', [prefix, ...args]),
    warn: (...args) => emit('warn', [prefix, ...args]),
  };
}

function setupConsoleLogging() {
  if (LOG_ENABLED) {
    return;
  }

  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.error = noop;
  console.debug = noop;
}

module.exports = {
  LOG_ENABLED,
  createLogger,
  setupConsoleLogging,
};
