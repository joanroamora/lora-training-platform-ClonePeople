import type { AppConfig } from '../config/environment.js';
import type { TrainingJob } from '../training/types.js';

export function buildTrainerArguments(config: AppConfig, job: TrainingJob): string[] {
  return [
    '--project-id',
    config.gcpProjectId,
    '--bucket',
    config.dataBucket,
    '--job-id',
    job.id,
    '--mode',
    job.configuration.trainerMode,
    '--base-model',
    job.configuration.baseModel,
    '--trigger-word',
    job.configuration.triggerWord,
    '--max-training-steps',
    String(job.configuration.maxTrainingSteps),
    '--learning-rate',
    String(job.configuration.learningRate),
    '--seed',
    String(job.configuration.seed),
    '--version',
    job.version,
  ];
}
