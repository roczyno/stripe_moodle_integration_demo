function now() {
  return new Date().toISOString();
}

function base(level, message, data) {
  const entry = {
    ts: now(),
    level,
    msg: message
  };
  if (data && typeof data === 'object') {
    try {
      // Avoid logging large or sensitive fields
      const clean = JSON.parse(JSON.stringify(data, (key, value) => {
        if (key && /token|secret|password|key|authorization/i.test(key)) return '[redacted]';
        if (typeof value === 'string' && value.length > 500) return value.slice(0, 500) + '…';
        return value;
      }));
      entry.data = clean;
    } catch {
      entry.data = '[unserializable]';
    }
  }
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
}

export const logger = {
  info: (msg, data) => base('info', msg, data),
  warn: (msg, data) => base('warn', msg, data),
  error: (msg, data) => base('error', msg, data)
};


