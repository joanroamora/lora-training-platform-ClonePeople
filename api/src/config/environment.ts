import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(8080),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  SERVICE_NAME: z.string().trim().min(1).max(63).default('lora-training-api'),
  APP_VERSION: z.string().trim().min(1).max(64).default('0.2.0'),
  REQUEST_BODY_LIMIT: z.string().trim().min(1).max(16).default('1mb'),
  TRAINING_API_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  TRAINING_PLATFORM: z.enum(['vertex', 'cloud_run']).default('vertex'),
  GCP_PROJECT_ID: z.string().trim().default(''),
  GCP_REGION: z.string().trim().default('us-central1'),
  GCS_DATA_BUCKET: z.string().trim().default(''),
  VERTEX_TRAINER_IMAGE_URI: z.string().trim().default(''),
  VERTEX_TRAINER_SERVICE_ACCOUNT: z.string().trim().default(''),
  CLOUD_RUN_TRAINER_JOB: z.string().trim().default(''),
  TRAINER_MODE: z.enum(['smoke', 'train']).default('smoke'),
  LORA_BASE_MODEL: z
    .string()
    .trim()
    .default('stabilityai/stable-diffusion-xl-base-1.0'),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  MAX_IMAGE_BYTES: z.coerce
    .number()
    .int()
    .min(1_048_576)
    .max(52_428_800)
    .default(15_728_640),
  MAX_TRAINING_STEPS: z.coerce.number().int().min(1).max(10_000).default(800),
  LEARNING_RATE: z.coerce.number().positive().max(0.01).default(0.0001),
  TRAINING_SEED: z.coerce.number().int().min(0).max(2_147_483_647).default(42),
}).superRefine((value, context) => {
  if (!value.TRAINING_API_ENABLED) return;

  const requiredFields = ['GCP_PROJECT_ID', 'GCS_DATA_BUCKET'] as const;
  for (const field of requiredFields) {
    if (value[field].length === 0) {
      context.addIssue({
        code: 'custom',
        path: [field],
        message: 'is required when TRAINING_API_ENABLED=true',
      });
    }
  }
  if (value.TRAINING_PLATFORM === 'vertex') {
    for (const field of ['VERTEX_TRAINER_IMAGE_URI', 'VERTEX_TRAINER_SERVICE_ACCOUNT'] as const) {
      if (value[field].length === 0) {
        context.addIssue({ code: 'custom', path: [field], message: 'is required for Vertex AI' });
      }
    }
  } else if (value.CLOUD_RUN_TRAINER_JOB.length === 0) {
    context.addIssue({
      code: 'custom',
      path: ['CLOUD_RUN_TRAINER_JOB'],
      message: 'is required for Cloud Run Jobs',
    });
  }
});

export type AppConfig = Readonly<{
  nodeEnv: z.infer<typeof environmentSchema>['NODE_ENV'];
  port: number;
  logLevel: z.infer<typeof environmentSchema>['LOG_LEVEL'];
  serviceName: string;
  appVersion: string;
  requestBodyLimit: string;
  trainingApiEnabled: boolean;
  trainingPlatform: 'vertex' | 'cloud_run';
  gcpProjectId: string;
  gcpRegion: string;
  dataBucket: string;
  trainerImageUri: string;
  trainerServiceAccount: string;
  cloudRunTrainerJob: string;
  trainerMode: 'smoke' | 'train';
  baseModel: string;
  signedUrlTtlSeconds: number;
  maxImageBytes: number;
  maxTrainingSteps: number;
  learningRate: number;
  trainingSeed: number;
}>;

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig {
  const parsed = environmentSchema.safeParse(environment);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid application configuration: ${details}`);
  }

  return Object.freeze({
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    logLevel: parsed.data.LOG_LEVEL,
    serviceName: parsed.data.SERVICE_NAME,
    appVersion: parsed.data.APP_VERSION,
    requestBodyLimit: parsed.data.REQUEST_BODY_LIMIT,
    trainingApiEnabled: parsed.data.TRAINING_API_ENABLED,
    trainingPlatform: parsed.data.TRAINING_PLATFORM,
    gcpProjectId: parsed.data.GCP_PROJECT_ID,
    gcpRegion: parsed.data.GCP_REGION,
    dataBucket: parsed.data.GCS_DATA_BUCKET,
    trainerImageUri: parsed.data.VERTEX_TRAINER_IMAGE_URI,
    trainerServiceAccount: parsed.data.VERTEX_TRAINER_SERVICE_ACCOUNT,
    cloudRunTrainerJob: parsed.data.CLOUD_RUN_TRAINER_JOB,
    trainerMode: parsed.data.TRAINER_MODE,
    baseModel: parsed.data.LORA_BASE_MODEL,
    signedUrlTtlSeconds: parsed.data.SIGNED_URL_TTL_SECONDS,
    maxImageBytes: parsed.data.MAX_IMAGE_BYTES,
    maxTrainingSteps: parsed.data.MAX_TRAINING_STEPS,
    learningRate: parsed.data.LEARNING_RATE,
    trainingSeed: parsed.data.TRAINING_SEED,
  });
}
