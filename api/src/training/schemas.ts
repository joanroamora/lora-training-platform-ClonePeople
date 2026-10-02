import { z } from 'zod';

const allowedContentTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const createTrainingJobSchema = z.object({
  subjectName: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9 _-]*$/),
  triggerWord: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/),
  images: z
    .array(
      z.object({
        fileName: z.string().trim().min(1).max(255),
        contentType: z.enum(allowedContentTypes),
        sizeBytes: z.number().int().positive(),
      }),
    )
    .min(4)
    .max(30),
});

export type CreateTrainingJobInput = z.infer<typeof createTrainingJobSchema>;

const trainingImageSchema = z.object({
  index: z.number().int().positive(),
  originalName: z.string(),
  contentType: z.enum(allowedContentTypes),
  objectName: z.string(),
  declaredSizeBytes: z.number().int().positive(),
});

export const persistedTrainingJobSchema = z.object({
  id: z.string().uuid(),
  version: z.string().min(1),
  status: z.enum([
    'UPLOADING',
    'SUBMITTING',
    'SUBMITTED',
    'RUNNING',
    'SUCCEEDED',
    'FAILED',
    'CANCELLED',
  ]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  images: z.array(trainingImageSchema),
  configuration: z.object({
    subjectName: z.string(),
    triggerWord: z.string(),
    baseModel: z.string(),
    trainerMode: z.enum(['smoke', 'train']),
    maxTrainingSteps: z.number().int().positive(),
    learningRate: z.number().positive(),
    seed: z.number().int().nonnegative(),
  }),
  vertexJobName: z.string().optional(),
  platformJobName: z.string().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
  result: z
    .object({
      outputPrefix: z.string(),
      metadataUri: z.string(),
      weightsUri: z.string().optional(),
    })
    .optional(),
});
