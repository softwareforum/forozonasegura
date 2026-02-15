function format(level, message, context = {}) {
  return {
    ts: new Date().toISOString(),
    level,
    message,
    ...context
  };
}

function write(level, message, context = {}) {
  const payload = format(level, message, context);
  if (process.env.NODE_ENV === 'production') {
    const line = JSON.stringify(payload);
    if (level === 'error') {
      console.error(line);
      return;
    }
    console.log(line);
    return;
  }

  const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
  console[method](`[${payload.level}] ${payload.message}`, context);
}

module.exports = {
  info: (message, context) => write('info', message, context),
  warn: (message, context) => write('warn', message, context),
  error: (message, context) => write('error', message, context),
  debug: (message, context) => {
    if (process.env.NODE_ENV !== 'production') write('debug', message, context);
  }
};
