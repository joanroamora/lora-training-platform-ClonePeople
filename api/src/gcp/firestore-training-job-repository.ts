import type {
  Firestore,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  WithFieldValue,
} from '@google-cloud/firestore';

import type { TrainingJobRepository } from '../training/contracts.js';
import { persistedTrainingJobSchema } from '../training/schemas.js';
import type { TrainingJob } from '../training/types.js';

const converter: FirestoreDataConverter<TrainingJob> = {
  toFirestore(job: WithFieldValue<TrainingJob>) {
    return job;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot) {
    return persistedTrainingJobSchema.parse(snapshot.data()) as TrainingJob;
  },
};

export class FirestoreTrainingJobRepository implements TrainingJobRepository {
  readonly #collection;

  public constructor(firestore: Firestore) {
    this.#collection = firestore.collection('trainingJobs').withConverter(converter);
  }

  public async create(job: TrainingJob): Promise<void> {
    await this.#collection.doc(job.id).create(job);
  }

  public async get(jobId: string): Promise<TrainingJob | null> {
    const snapshot = await this.#collection.doc(jobId).get();
    return snapshot.exists ? (snapshot.data() ?? null) : null;
  }

  public async claimForSubmission(
    jobId: string,
    updatedAt: string,
  ): Promise<TrainingJob | null> {
    return this.#collection.firestore.runTransaction(async (transaction) => {
      const reference = this.#collection.doc(jobId);
      const snapshot = await transaction.get(reference);
      const job = snapshot.data();
      if (!job || job.status !== 'UPLOADING') return null;

      const claimed: TrainingJob = { ...job, status: 'SUBMITTING', updatedAt };
      transaction.set(reference, claimed);
      return claimed;
    });
  }

  public async update(
    jobId: string,
    changes: Partial<Omit<TrainingJob, 'id' | 'createdAt'>>,
  ): Promise<void> {
    await this.#collection.doc(jobId).update(changes);
  }
}
