import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(8080),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  SERVICE_NAME: z.string().trim().min(1).max(63).default('lora-training-api'),
  APP_VERSION: z.string().trim().min(1).max(64).default('0.1.0'),
  REQUEST_BODY_LIMIT: z.string().trim().min(1).max(16).default('1mb'),
});

export type AppConfig = Readonly<{
  nodeEnv: z.infer<typeof environmentSchema>['NODE_ENV'];
  port: number;
  logLevel: z.infer<typeof environmentSchema>['LOG_LEVEL'];
  serviceName: string;
  appVersion: string;
  requestBodyLimit: string;
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
  });
}
