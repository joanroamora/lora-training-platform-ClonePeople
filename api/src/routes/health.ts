import { Router } from 'express';

import type { AppConfig } from '../config/environment.js';

export function createHealthRouter(
  config: Pick<AppConfig, 'appVersion' | 'serviceName'>,
): Router {
  const router = Router();

  router.get('/', (_request, response) => {
    response.status(200).json({
      status: 'ok',
      service: config.serviceName,
      version: config.appVersion,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  return router;
}
