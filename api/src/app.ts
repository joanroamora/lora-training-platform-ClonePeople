import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';

import type { AppConfig } from './config/environment.js';
import { errorHandler, notFoundHandler } from './http/errors.js';
import { requestLogging } from './http/request-logging.js';
import { createHealthRouter } from './routes/health.js';
import type { TrainingJobServiceContract } from './training/contracts.js';
import { createTrainingRouter } from './training/routes.js';

export type AppDependencies = Readonly<{
  config: AppConfig;
  logger: Logger;
  trainingService?: TrainingJobServiceContract;
}>;

export function createApp({ config, logger, trainingService }: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestLogging(logger));
  app.use(helmet());
  app.use(express.json({ limit: config.requestBodyLimit }));

  app.use('/health', createHealthRouter(config));
  if (trainingService) {
    app.use('/v1/training-jobs', createTrainingRouter(trainingService));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
