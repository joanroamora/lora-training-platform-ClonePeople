import { createServer } from 'node:http';

import { createApp } from './app.js';
import { loadConfig } from './config/environment.js';
import { createGcpTrainingService } from './gcp/create-training-service.js';
import { createLogger } from './observability/logger.js';

const config = loadConfig();
const logger = createLogger(config);
const trainingService = config.trainingApiEnabled
  ? createGcpTrainingService(config)
  : undefined;
const app = createApp({ config, logger, ...(trainingService ? { trainingService } : {}) });
const server = createServer(app);

server.listen(config.port, '0.0.0.0', () => {
  logger.info({ port: config.port }, 'API listening');
});

let shuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, 'Shutdown signal received');

  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out');
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  server.close((error) => {
    clearTimeout(forceExitTimer);
    if (error) {
      logger.error({ err: error }, 'HTTP server failed to close');
      process.exitCode = 1;
    }
  });
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  process.exit(1);
});
