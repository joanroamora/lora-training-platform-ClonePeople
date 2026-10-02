import pino from 'pino';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config/environment.js';

const config = loadConfig({
  NODE_ENV: 'test',
  SERVICE_NAME: 'test-api',
  APP_VERSION: 'test-version',
});
const logger = pino({ enabled: false });
const app = createApp({ config, logger });
const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  version: z.string(),
  timestamp: z.string(),
  uptimeSeconds: z.number(),
});

describe('GET /health', () => {
  it('reports service health and correlation metadata', async () => {
    const response = await request(app)
      .get('/health')
      .set('x-request-id', 'test-request-id');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBe('test-request-id');
    const body = healthResponseSchema.parse(response.body as unknown);
    expect(body).toMatchObject({
      status: 'ok',
      service: 'test-api',
      version: 'test-version',
    });
    expect(body.timestamp).toEqual(expect.any(String));
    expect(body.uptimeSeconds).toEqual(expect.any(Number));
  });
});

describe('unknown routes', () => {
  it('returns a consistent error contract', async () => {
    const response = await request(app).get('/missing');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Route GET /missing was not found',
        requestId: response.headers['x-request-id'],
      },
    });
  });
});

describe('malformed request bodies', () => {
  it('returns the public error contract instead of exposing parser details', async () => {
    const response = await request(app)
      .post('/health')
      .set('content-type', 'application/json')
      .send('{"incomplete":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body contains invalid JSON',
        requestId: response.headers['x-request-id'],
      },
    });
  });
});
