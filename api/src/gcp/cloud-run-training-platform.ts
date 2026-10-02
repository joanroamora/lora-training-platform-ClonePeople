import { GoogleAuth } from 'google-auth-library';

import type { AppConfig } from '../config/environment.js';
import type { TrainingPlatform } from '../training/contracts.js';
import type { PlatformJob, TrainingJob } from '../training/types.js';
import { buildTrainerArguments } from './trainer-arguments.js';

type CloudRunOperation = Readonly<{
  name?: string;
  done?: boolean;
  error?: Readonly<{ message?: string }>;
  response?: Readonly<{
    failedCount?: number | string;
    cancelledCount?: number | string;
  }>;
}>;

export class CloudRunTrainingPlatform implements TrainingPlatform {
  readonly #auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  readonly #config: AppConfig;

  public constructor(config: AppConfig) {
    this.#config = config;
  }

  public async submit(job: TrainingJob): Promise<PlatformJob> {
    const url = `${this.#endpoint()}/v2/${this.#config.cloudRunTrainerJob}:run`;
    const response = await this.#auth.request<CloudRunOperation>({
      url,
      method: 'POST',
      data: {
        overrides: {
          containerOverrides: [
            {
              name: 'trainer',
              args: buildTrainerArguments(this.#config, job),
            },
          ],
          taskCount: 1,
          timeout: '1200s',
        },
      },
    });
    if (!response.data.name) throw new Error('Cloud Run did not return an operation name');
    return { name: response.data.name, status: 'SUBMITTED' };
  }

  public async get(operationName: string): Promise<PlatformJob> {
    const response = await this.#auth.request<CloudRunOperation>({
      url: `${this.#endpoint()}/v2/${operationName}`,
      method: 'GET',
    });
    const operation = response.data;
    if (operation.error) {
      return {
        name: operationName,
        status: 'FAILED',
        errorMessage: operation.error.message ?? 'Cloud Run Job execution failed',
      };
    }
    if (!operation.done) return { name: operationName, status: 'RUNNING' };

    const failedCount = Number(operation.response?.failedCount ?? 0);
    const cancelledCount = Number(operation.response?.cancelledCount ?? 0);
    if (cancelledCount > 0) return { name: operationName, status: 'CANCELLED' };
    if (failedCount > 0) {
      return {
        name: operationName,
        status: 'FAILED',
        errorMessage: `${failedCount} Cloud Run task(s) failed`,
      };
    }
    return { name: operationName, status: 'SUCCEEDED' };
  }

  #endpoint(): string {
    return `https://${this.#config.gcpRegion}-run.googleapis.com`;
  }
}
