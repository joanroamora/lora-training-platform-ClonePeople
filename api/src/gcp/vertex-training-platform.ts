import { v1 } from '@google-cloud/aiplatform';

import type { AppConfig } from '../config/environment.js';
import type { TrainingPlatform } from '../training/contracts.js';
import type {
  PlatformJob,
  TrainingJob,
  TrainingJobStatus,
} from '../training/types.js';

function mapVertexState(state: number | string | null | undefined): TrainingJobStatus {
  switch (state) {
    case 1:
    case 2:
    case 'JOB_STATE_QUEUED':
    case 'JOB_STATE_PENDING':
      return 'SUBMITTED';
    case 3:
    case 10:
    case 'JOB_STATE_RUNNING':
    case 'JOB_STATE_UPDATING':
      return 'RUNNING';
    case 4:
    case 11:
    case 'JOB_STATE_SUCCEEDED':
    case 'JOB_STATE_PARTIALLY_SUCCEEDED':
      return 'SUCCEEDED';
    case 6:
    case 'JOB_STATE_CANCELLING':
      return 'RUNNING';
    case 7:
    case 'JOB_STATE_CANCELLED':
      return 'CANCELLED';
    case 5:
    case 9:
    case 'JOB_STATE_FAILED':
    case 'JOB_STATE_EXPIRED':
      return 'FAILED';
    default:
      return 'SUBMITTED';
  }
}

export class VertexTrainingPlatform implements TrainingPlatform {
  readonly #client: v1.JobServiceClient;
  readonly #config: AppConfig;

  public constructor(config: AppConfig) {
    this.#config = config;
    this.#client = new v1.JobServiceClient({
      apiEndpoint: `${config.gcpRegion}-aiplatform.googleapis.com`,
    });
  }

  public async submit(job: TrainingJob): Promise<PlatformJob> {
    const parent = `projects/${this.#config.gcpProjectId}/locations/${this.#config.gcpRegion}`;
    const args = [
      '--project-id',
      this.#config.gcpProjectId,
      '--bucket',
      this.#config.dataBucket,
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
    const machineSpec =
      job.configuration.trainerMode === 'train'
        ? {
            machineType: 'n1-standard-8',
            acceleratorType: 'NVIDIA_TESLA_T4' as const,
            acceleratorCount: 1,
          }
        : { machineType: 'e2-standard-4' };

    const [created] = await this.#client.createCustomJob({
      parent,
      customJob: {
        displayName: `lora-${job.id}`,
        labels: {
          application: 'lora-training',
          mode: job.configuration.trainerMode,
        },
        jobSpec: {
          serviceAccount: this.#config.trainerServiceAccount,
          workerPoolSpecs: [
            {
              replicaCount: 1,
              machineSpec,
              containerSpec: {
                imageUri: this.#config.trainerImageUri,
                args,
              },
            },
          ],
        },
      },
    });

    if (!created.name) throw new Error('Vertex AI did not return a custom job name');
    return {
      name: created.name,
      status: mapVertexState(created.state),
    };
  }

  public async get(vertexJobName: string): Promise<PlatformJob> {
    const [job] = await this.#client.getCustomJob({ name: vertexJobName });
    return {
      name: vertexJobName,
      status: mapVertexState(job.state),
      ...(job.error?.message ? { errorMessage: job.error.message } : {}),
    };
  }
}
