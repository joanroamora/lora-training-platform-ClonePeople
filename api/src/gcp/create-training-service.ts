import { Firestore } from '@google-cloud/firestore';
import { Storage } from '@google-cloud/storage';

import type { AppConfig } from '../config/environment.js';
import { TrainingJobService } from '../training/service.js';
import { CloudRunTrainingPlatform } from './cloud-run-training-platform.js';
import { FirestoreTrainingJobRepository } from './firestore-training-job-repository.js';
import { StorageTrainingObjectStore } from './storage-training-object-store.js';
import { VertexTrainingPlatform } from './vertex-training-platform.js';

export function createGcpTrainingService(config: AppConfig): TrainingJobService {
  const firestore = new Firestore({ projectId: config.gcpProjectId });
  const storage = new Storage({ projectId: config.gcpProjectId });

  return new TrainingJobService({
    config,
    repository: new FirestoreTrainingJobRepository(firestore),
    objectStore: new StorageTrainingObjectStore(storage, config.dataBucket),
    platform:
      config.trainingPlatform === 'cloud_run'
        ? new CloudRunTrainingPlatform(config)
        : new VertexTrainingPlatform(config),
  });
}
