import pino, { type Logger } from 'pino';

import type { AppConfig } from '../config/environment.js';

export function createLogger(
  config: Pick<AppConfig, 'appVersion' | 'logLevel' | 'nodeEnv' | 'serviceName'>,
): Logger {
  return pino({
    level: config.logLevel,
    base: {
      environment: config.nodeEnv,
      service: config.serviceName,
      version: config.appVersion,
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'request.headers.authorization',
        'request.headers.cookie',
      ],
      censor: '[REDACTED]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
