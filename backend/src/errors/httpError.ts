/**
 * Safe HTTP errors — clients never receive raw provider/DB/stack details.
 */

export class HttpError extends Error {
  readonly status: number;
  readonly publicMessage: string;
  readonly code?: string;

  constructor(status: number, publicMessage: string, code?: string) {
    super(publicMessage);
    this.status = status;
    this.publicMessage = publicMessage;
    this.code = code;
    this.name = 'HttpError';
  }
}

export function toSafeClientError(err: unknown): { status: number; body: { error: string; code?: string } } {
  if (err instanceof HttpError) {
    return {
      status: err.status,
      body: { error: err.publicMessage, ...(err.code ? { code: err.code } : {}) },
    };
  }
  return {
    status: 500,
    body: { error: 'Unable to process request' },
  };
}

export const SAFE_INTERNAL_MESSAGE = 'Unable to process request';
