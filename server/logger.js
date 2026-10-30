// Structured logger with strict PII sanitization (no phone numbers or message bodies logged)

function redactPii(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactPii);

  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('phone') ||
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('message') ||
      lowerKey.includes('text') ||
      lowerKey.includes('body') ||
      lowerKey.includes('notes')
    ) {
      clean[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      clean[key] = redactPii(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export const logger = {
  info(event, metadata = {}) {
    console.log(
      JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        event,
        ...redactPii(metadata),
      })
    );
  },
  warn(event, metadata = {}) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        event,
        ...redactPii(metadata),
      })
    );
  },
  error(event, error = {}, metadata = {}) {
    console.error(
      JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        event,
        message: error.message || String(error),
        code: error.code || undefined,
        ...redactPii(metadata),
      })
    );
  },
};
