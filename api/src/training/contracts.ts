import type {
  PlatformJob,
  StoredObjectMetadata,
  TrainingImage,
  TrainingJob,
  TrainingJobStatus,
} from './types.js';

export interface TrainingJobRepository {
  create(job: TrainingJob): Promise<void>;
  get(jobId: string): Promise<TrainingJob | null>;
  claimForSubmission(jobId: string, updatedAt: string): Promise<TrainingJob | null>;
  update(
    jobId: string,
    changes: Partial<Omit<TrainingJob, 'id' | 'createdAt'>>,
  ): Promise<void>;
}

export interface TrainingObjectStore {
  createUploadUrl(
    image: TrainingImage,
    expiresAt: Date,
  ): Promise<string>;
  getMetadata(objectName: string): Promise<StoredObjectMetadata | null>;
}

export interface TrainingPlatform {
  submit(job: TrainingJob): Promise<PlatformJob>;
  get(vertexJobName: string): Promise<PlatformJob>;
}

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  generate(): string;
}

export interface TrainingJobServiceContract {
  create(input: unknown): Promise<{
    job: TrainingJob;
    uploads: readonly {
      index: number;
      objectName: string;
      uploadUrl: string;
      contentType: TrainingImage['contentType'];
      expiresAt: string;
    }[];
  }>;
  start(jobId: string): Promise<TrainingJob>;
  get(jobId: string): Promise<TrainingJob>;
}

export function isTerminalStatus(status: TrainingJobStatus): boolean {
  return ['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(status);
}
