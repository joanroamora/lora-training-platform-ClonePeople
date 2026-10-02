import { Router } from 'express';

import type { TrainingJobServiceContract } from './contracts.js';

export function createTrainingRouter(service: TrainingJobServiceContract): Router {
  const router = Router();

  router.post('/', async (request, response) => {
    const result = await service.create(request.body);
    response.status(201).json(result);
  });

  router.post('/:jobId/start', async (request, response) => {
    const job = await service.start(request.params.jobId);
    response.status(202).json({ job });
  });

  router.get('/:jobId', async (request, response) => {
    const job = await service.get(request.params.jobId);
    response.status(200).json({ job });
  });

  return router;
}
