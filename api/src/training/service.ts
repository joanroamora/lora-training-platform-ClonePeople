import { randomUUID } from 'node:crypto';

import { HttpError } from '../http/errors.js';
import type { AppConfig } from '../config/environment.js';
import type {
  Clock,
  IdGenerator,
  TrainingJobRepository,
  TrainingJobServiceContract,
  TrainingObjectStore,
  TrainingPlatform,
} from './contracts.js';
import { isTerminalStatus } from './contracts.js';
import { createTrainingJobSchema } from './schemas.js';
import type { TrainingImage, TrainingJob } from './types.js';

const extensionByContentType = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

const systemClock: Clock = { now: () => new Date() };
const uuidGenerator: IdGenerator = { generate: () => randomUUID() };

function versionName(subjectName: string, jobId: string): string {
  const slug = subjectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  return `${slug}-${jobId.slice(0, 8)}`;
}

function isVertexQuotaError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (('code' in error && error.code === 8) ||
      error.message.includes('RESOURCE_EXHAUSTED') ||
      error.message.includes('exceed quota limits'))
  );
}

type TrainingServiceDependencies = Readonly<{
  config: AppConfig;
  repository: TrainingJobRepository;
  objectStore: TrainingObjectStore;
  platform: TrainingPlatform;
  clock?: Clock;
  idGenerator?: IdGenerator;
}>;

export class TrainingJobService implements TrainingJobServiceContract {
  readonly #config: AppConfig;
  readonly #repository: TrainingJobRepository;
  readonly #objectStore: TrainingObjectStore;
  readonly #platform: TrainingPlatform;
  readonly #clock: Clock;
  readonly #idGenerator: IdGenerator;

  public constructor(dependencies: TrainingServiceDependencies) {
    this.#config = dependencies.config;
    this.#repository = dependencies.repository;
    this.#objectStore = dependencies.objectStore;
    this.#platform = dependencies.platform;
    this.#clock = dependencies.clock ?? systemClock;
    this.#idGenerator = dependencies.idGenerator ?? uuidGenerator;
  }

  public async create(input: unknown) {
    const parsed = createTrainingJobSchema.safeParse(input);
    if (!parsed.success) {
      throw new HttpError(400, 'INVALID_REQUEST', parsed.error.issues[0]?.message ?? 'Invalid request');
    }

    for (const image of parsed.data.images) {
      if (image.sizeBytes > this.#config.maxImageBytes) {
        throw new HttpError(
          400,
          'IMAGE_TOO_LARGE',
          `${image.fileName} exceeds the ${this.#config.maxImageBytes} byte limit`,
        );
      }
    }

    const id = this.#idGenerator.generate();
    const now = this.#clock.now();
    const createdAt = now.toISOString();
    const images: TrainingImage[] = parsed.data.images.map((image, offset) => ({
      index: offset + 1,
      originalName: image.fileName,
      contentType: image.contentType,
      declaredSizeBytes: image.sizeBytes,
      objectName: `jobs/${id}/input/${String(offset + 1).padStart(3, '0')}.${extensionByContentType[image.contentType]}`,
    }));
    const job: TrainingJob = {
      id,
      version: versionName(parsed.data.subjectName, id),
      status: 'UPLOADING',
      createdAt,
      updatedAt: createdAt,
      images,
      configuration: {
        subjectName: parsed.data.subjectName,
        triggerWord: parsed.data.triggerWord,
        baseModel: this.#config.baseModel,
        trainerMode: this.#config.trainerMode,
        maxTrainingSteps: this.#config.maxTrainingSteps,
        learningRate: this.#config.learningRate,
        seed: this.#config.trainingSeed,
      },
    };

    await this.#repository.create(job);

    const expiresAt = new Date(now.getTime() + this.#config.signedUrlTtlSeconds * 1000);
    const uploads = await Promise.all(
      images.map(async (image) => ({
        index: image.index,
        objectName: image.objectName,
        uploadUrl: await this.#objectStore.createUploadUrl(image, expiresAt),
        contentType: image.contentType,
        expiresAt: expiresAt.toISOString(),
      })),
    );

    return { job, uploads };
  }

  public async start(jobId: string): Promise<TrainingJob> {
    const existing = await this.#getRequired(jobId);
    if (['SUBMITTING', 'SUBMITTED', 'RUNNING'].includes(existing.status)) return existing;
    if (isTerminalStatus(existing.status)) {
      throw new HttpError(409, 'JOB_ALREADY_FINISHED', `Job is ${existing.status}`);
    }

    await Promise.all(
      existing.images.map(async (image) => {
        const metadata = await this.#objectStore.getMetadata(image.objectName);
        if (!metadata) {
          throw new HttpError(422, 'IMAGE_MISSING', `${image.originalName} has not been uploaded`);
        }
        if (metadata.contentType !== image.contentType) {
          throw new HttpError(422, 'IMAGE_TYPE_MISMATCH', `${image.originalName} has an unexpected content type`);
        }
        if (metadata.sizeBytes <= 0 || metadata.sizeBytes > this.#config.maxImageBytes) {
          throw new HttpError(422, 'IMAGE_SIZE_INVALID', `${image.originalName} has an invalid size`);
        }
        if (metadata.sizeBytes !== image.declaredSizeBytes) {
          throw new HttpError(422, 'IMAGE_SIZE_MISMATCH', `${image.originalName} does not match its declared size`);
        }
      }),
    );

    const updatedAt = this.#clock.now().toISOString();
    const claimed = await this.#repository.claimForSubmission(jobId, updatedAt);
    if (!claimed) return this.#getRequired(jobId);

    try {
      const platformJob = await this.#platform.submit(claimed);
      await this.#repository.update(jobId, {
        status: platformJob.status,
        vertexJobName: platformJob.name,
        updatedAt: this.#clock.now().toISOString(),
      });
      return this.#getRequired(jobId);
    } catch (error) {
      const quotaExhausted = isVertexQuotaError(error);
      await this.#repository.update(jobId, {
        status: 'FAILED',
        updatedAt: this.#clock.now().toISOString(),
        error: {
          code: quotaExhausted ? 'VERTEX_QUOTA_EXHAUSTED' : 'VERTEX_SUBMISSION_FAILED',
          message: error instanceof Error ? error.message : 'Vertex AI rejected the job',
        },
      });
      if (quotaExhausted) {
        throw new HttpError(
          503,
          'VERTEX_QUOTA_EXHAUSTED',
          'Vertex AI training quota is unavailable for this project or region',
        );
      }
      throw error;
    }
  }

  public async get(jobId: string): Promise<TrainingJob> {
    const job = await this.#getRequired(jobId);
    if (!job.vertexJobName || isTerminalStatus(job.status)) return job;

    const platformJob = await this.#platform.get(job.vertexJobName);
    if (platformJob.status === job.status) return job;

    const outputPrefix = `gs://${this.#config.dataBucket}/jobs/${job.id}/output`;
    const result =
      platformJob.status === 'SUCCEEDED'
        ? {
            outputPrefix,
            metadataUri: `${outputPrefix}/metadata.json`,
            ...(job.configuration.trainerMode === 'train'
              ? { weightsUri: `${outputPrefix}/pytorch_lora_weights.safetensors` }
              : {}),
          }
        : undefined;
    const failure =
      platformJob.status === 'FAILED'
        ? {
            code: 'VERTEX_JOB_FAILED',
            message: platformJob.errorMessage ?? 'Vertex AI training failed',
          }
        : undefined;
    const changes = {
      status: platformJob.status,
      updatedAt: this.#clock.now().toISOString(),
      ...(result ? { result } : {}),
      ...(failure ? { error: failure } : {}),
    } satisfies Partial<Omit<TrainingJob, 'id' | 'createdAt'>>;

    await this.#repository.update(job.id, changes);
    return this.#getRequired(job.id);
  }

  async #getRequired(jobId: string): Promise<TrainingJob> {
    const job = await this.#repository.get(jobId);
    if (!job) throw new HttpError(404, 'JOB_NOT_FOUND', `Training job ${jobId} was not found`);
    return job;
  }
}
