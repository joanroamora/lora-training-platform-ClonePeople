import type { ErrorRequestHandler, RequestHandler } from 'express';

export class HttpError extends Error {
  public constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(
    new HttpError(
      404,
      'ROUTE_NOT_FOUND',
      `Route ${request.method} ${request.path} was not found`,
    ),
  );
};

function isInvalidJsonError(
  error: unknown,
): error is SyntaxError & { status: 400; type: 'entity.parse.failed' } {
  return (
    error instanceof SyntaxError &&
    'status' in error &&
    error.status === 400 &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  );
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  request,
  response,
  _next,
) => {
  const knownError = error instanceof HttpError;
  const invalidJson = isInvalidJsonError(error);
  const statusCode = knownError ? error.statusCode : invalidJson ? 400 : 500;
  const code = knownError
    ? error.code
    : invalidJson
      ? 'INVALID_JSON'
      : 'INTERNAL_SERVER_ERROR';
  const message = knownError
    ? error.message
    : invalidJson
      ? 'Request body contains invalid JSON'
      : 'An unexpected error occurred';

  const logContext = {
    err: error,
    requestId: response.getHeader('x-request-id'),
    statusCode,
  };
  if (statusCode >= 500) {
    request.log.error(logContext, message);
  } else {
    request.log.warn(logContext, message);
  }

  response.status(statusCode).json({
    error: {
      code,
      message,
      requestId: response.getHeader('x-request-id'),
    },
  });
};
