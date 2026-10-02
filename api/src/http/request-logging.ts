import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

const MAX_REQUEST_ID_LENGTH = 128;

export function requestLogging(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId(request, response) {
      const candidate = request.headers['x-request-id'];
      const requestId =
        typeof candidate === 'string' &&
        candidate.length > 0 &&
        candidate.length <= MAX_REQUEST_ID_LENGTH
          ? candidate
          : randomUUID();

      response.setHeader('x-request-id', requestId);
      return requestId;
    },
    customLogLevel(_request, response, error) {
      if (error || response.statusCode >= 500) return 'error';
      if (response.statusCode >= 400) return 'warn';
      return 'info';
    },
    wrapSerializers: false,
    serializers: {
      req(request: IncomingMessage) {
        return {
          id: request.id,
          method: request.method,
          url: request.url,
        };
      },
      res(response: ServerResponse) {
        return { statusCode: response.statusCode };
      },
    },
  });
}
