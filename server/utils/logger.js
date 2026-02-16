const SENSITIVE_KEY_PATTERN = /(authorization|token|secret|password|cookie|set-cookie|api[-_]?key)/i;
const EMAIL_PATTERN = /([a-z0-9._%+-]{1,64})@([a-z0-9.-]+\.[a-z]{2,})/i;

function maskEmail(value) {
  const raw = String(value || '');
  const match = raw.match(EMAIL_PATTERN);
  if (!match) return raw;
  const local = match[1];
  const domain = match[2];
  const maskedLocal = `${local.slice(0, 1)}***`;
  return `${maskedLocal}@${domain}`;
}

function sanitizeValue(key, value) {
  if (value === null || value === undefined) return value;

  if (SENSITIVE_KEY_PATTERN.test(String(key || ''))) {
    return '[REDACTED]';
  }

  if (typeof value === 'string') {
    if (EMAIL_PATTERN.test(value)) {
      return maskEmail(value);
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(key, item));
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce((acc, [nestedKey, nestedValue]) => {
      acc[nestedKey] = sanitizeValue(nestedKey, nestedValue);
      return acc;
    }, {});
  }

  return value;
}

function sanitizeContext(context = {}) {
  return sanitizeValue('context', context);
}

function format(level, message, context = {}) {
  return {
    ts: new Date().toISOString(),
    level,
    message,
    ...sanitizeContext(context)
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
