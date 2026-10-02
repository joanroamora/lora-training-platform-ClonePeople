import { describe, expect, it } from 'vitest';

import { loadConfig } from '../../src/config/environment.js';

describe('loadConfig', () => {
  it('loads safe defaults', () => {
    const config = loadConfig({});

    expect(config).toMatchObject({
      nodeEnv: 'development',
      port: 8080,
      logLevel: 'info',
      serviceName: 'lora-training-api',
      appVersion: '0.2.0',
      requestBodyLimit: '1mb',
    });
  });

  it('rejects an invalid port', () => {
    expect(() => loadConfig({ PORT: '70000' })).toThrow(
      'Invalid application configuration',
    );
  });
});
