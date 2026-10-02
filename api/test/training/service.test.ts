import { describe, expect, it } from 'vitest';

import { loadConfig } from '../../src/config/environment.js';
import type {
  TrainingJobRepository,
  TrainingObjectStore,
  TrainingPlatform,
} from '../../src/training/contracts.js';
import { TrainingJobService } from '../../src/training/service.js';
import type {
  PlatformJob,
  StoredObjectMetadata,
  TrainingImage,
  TrainingJob,
} from '../../src/training/types.js';

class MemoryRepository implements TrainingJobRepository {
  job: TrainingJob | null = null;

  create(job: TrainingJob): Promise<void> {
    this.job = job;
    return Promise.resolve();
  }

  get(jobId: string): Promise<TrainingJob | null> {
    return Promise.resolve(this.job?.id === jobId ? this.job : null);
  }

  claimForSubmission(jobId: string, updatedAt: string): Promise<TrainingJob | null> {
    if (this.job?.id !== jobId || this.job.status !== 'UPLOADING') {
      return Promise.resolve(null);
    }
    this.job = { ...this.job, status: 'SUBMITTING', updatedAt };
    return Promise.resolve(this.job);
  }

  update(
    jobId: string,
    changes: Partial<Omit<TrainingJob, 'id' | 'createdAt'>>,
  ): Promise<void> {
    if (this.job?.id !== jobId) throw new Error('Job not found');
    this.job = { ...this.job, ...changes };
    return Promise.resolve();
  }
}

class MemoryObjectStore implements TrainingObjectStore {
  readonly metadata = new Map<string, StoredObjectMetadata>();

  createUploadUrl(image: TrainingImage): Promise<string> {
    return Promise.resolve(`https://upload.test/${image.objectName}`);
  }

  getMetadata(objectName: string): Promise<StoredObjectMetadata | null> {
    return Promise.resolve(this.metadata.get(objectName) ?? null);
  }
}

class FakePlatform implements TrainingPlatform {
  current: PlatformJob = {
    name: 'projects/test/locations/us-central1/customJobs/123',
    status: 'SUBMITTED',
  };

  submit(): Promise<PlatformJob> {
    return Promise.resolve(this.current);
  }

  get(): Promise<PlatformJob> {
    return Promise.resolve(this.current);
  }
}

const config = loadConfig({
  TRAINER_MODE: 'smoke',
  GCS_DATA_BUCKET: 'test-bucket',
});
const input = {
  subjectName: 'Test Person',
  triggerWord: 'sksPerson',
  images: Array.from({ length: 4 }, (_, index) => ({
    fileName: `photo-${index + 1}.jpg`,
    contentType: 'image/jpeg' as const,
    sizeBytes: 1024,
  })),
};

function createFixture() {
  const repository = new MemoryRepository();
  const objectStore = new MemoryObjectStore();
  const platform = new FakePlatform();
  const service = new TrainingJobService({
    config,
    repository,
    objectStore,
    platform,
    clock: { now: () => new Date('2026-10-01T12:00:00.000Z') },
    idGenerator: { generate: () => '123e4567-e89b-42d3-a456-426614174000' },
  });
  return { service, repository, objectStore, platform };
}

describe('TrainingJobService', () => {
  it('creates deterministic private upload targets', async () => {
    const { service } = createFixture();
    const result = await service.create(input);

    expect(result.job.status).toBe('UPLOADING');
    expect(result.job.version).toBe('test-person-123e4567');
    expect(result.uploads).toHaveLength(4);
    expect(result.uploads[0]).toMatchObject({
      objectName: 'jobs/123e4567-e89b-42d3-a456-426614174000/input/001.jpg',
      contentType: 'image/jpeg',
    });
  });

  it('refuses to submit until every declared image exists', async () => {
    const { service } = createFixture();
    const { job } = await service.create(input);

    await expect(service.start(job.id)).rejects.toMatchObject({
      statusCode: 422,
      code: 'IMAGE_MISSING',
    });
  });

  it('submits once and maps a successful remote result', async () => {
    const { service, objectStore, platform } = createFixture();
    const { job } = await service.create(input);
    for (const image of job.images) {
      objectStore.metadata.set(image.objectName, {
        sizeBytes: image.declaredSizeBytes,
        contentType: image.contentType,
      });
    }

    const submitted = await service.start(job.id);
    expect(submitted.status).toBe('SUBMITTED');

    platform.current = { ...platform.current, status: 'SUCCEEDED' };
    const completed = await service.get(job.id);
    expect(completed.status).toBe('SUCCEEDED');
    expect(completed.result).toEqual({
      outputPrefix: `gs://test-bucket/jobs/${job.id}/output`,
      metadataUri: `gs://test-bucket/jobs/${job.id}/output/metadata.json`,
    });
  });

  it('reports exhausted Vertex quota without leaving the job in SUBMITTING', async () => {
    const { service, repository, objectStore, platform } = createFixture();
    const { job } = await service.create(input);
    for (const image of job.images) {
      objectStore.metadata.set(image.objectName, {
        sizeBytes: image.declaredSizeBytes,
        contentType: image.contentType,
      });
    }
    platform.submit = () =>
      Promise.reject(
        Object.assign(new Error('8 RESOURCE_EXHAUSTED: quota limits exceeded'), { code: 8 }),
      );

    await expect(service.start(job.id)).rejects.toMatchObject({
      statusCode: 503,
      code: 'VERTEX_QUOTA_EXHAUSTED',
    });
    expect(repository.job).toMatchObject({
      status: 'FAILED',
      error: { code: 'VERTEX_QUOTA_EXHAUSTED' },
    });
  });
});
