export const trainingJobStatuses = [
  'UPLOADING',
  'SUBMITTING',
  'SUBMITTED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
] as const;

export type TrainingJobStatus = (typeof trainingJobStatuses)[number];
export type TrainerMode = 'smoke' | 'train';

export type TrainingImage = Readonly<{
  index: number;
  originalName: string;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  objectName: string;
  declaredSizeBytes: number;
}>;

export type TrainingConfiguration = Readonly<{
  subjectName: string;
  triggerWord: string;
  baseModel: string;
  trainerMode: TrainerMode;
  maxTrainingSteps: number;
  learningRate: number;
  seed: number;
}>;

export type TrainingResult = Readonly<{
  outputPrefix: string;
  metadataUri: string;
  weightsUri?: string;
}>;

export type TrainingJob = Readonly<{
  id: string;
  version: string;
  status: TrainingJobStatus;
  createdAt: string;
  updatedAt: string;
  images: readonly TrainingImage[];
  configuration: TrainingConfiguration;
  vertexJobName?: string;
  error?: Readonly<{ code: string; message: string }>;
  result?: TrainingResult;
}>;

export type UploadTarget = Readonly<{
  index: number;
  objectName: string;
  uploadUrl: string;
  contentType: TrainingImage['contentType'];
  expiresAt: string;
}>;

export type StoredObjectMetadata = Readonly<{
  sizeBytes: number;
  contentType: string;
}>;

export type PlatformJob = Readonly<{
  name: string;
  status: TrainingJobStatus;
  errorMessage?: string;
}>;
