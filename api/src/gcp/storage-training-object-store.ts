import type { Storage } from '@google-cloud/storage';

import type { TrainingObjectStore } from '../training/contracts.js';
import type {
  StoredObjectMetadata,
  TrainingImage,
} from '../training/types.js';

export class StorageTrainingObjectStore implements TrainingObjectStore {
  readonly #bucket;

  public constructor(storage: Storage, bucketName: string) {
    this.#bucket = storage.bucket(bucketName);
  }

  public async createUploadUrl(
    image: TrainingImage,
    expiresAt: Date,
  ): Promise<string> {
    const [url] = await this.#bucket.file(image.objectName).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: expiresAt,
      contentType: image.contentType,
    });
    return url;
  }

  public async getMetadata(
    objectName: string,
  ): Promise<StoredObjectMetadata | null> {
    const file = this.#bucket.file(objectName);
    const [exists] = await file.exists();
    if (!exists) return null;

    const [metadata] = await file.getMetadata();
    const sizeBytes = Number(metadata.size);
    return {
      sizeBytes,
      contentType: metadata.contentType ?? 'application/octet-stream',
    };
  }
}
