/**
 * Matches the backend's standardized error response shape.
 * Every non-2xx response from the Spring Boot API returns this structure.
 */
export interface BackendErrorResponse {
  code: string;
  message: string;
  fields?: Record<string, string> | null;
  timestamp: string;
  /**
   * Some pre-MVC servlet filters (notably the EmailVerificationFilter) bypass the
   * standard ControllerAdvice and return an ad-hoc `{ "error": "..." }` body instead
   * of `{ code, message }`. Read as a fallback in lib/api.ts so the message and the
   * email-verification detection aren't lost (otherwise it degrades to "Unknown error").
   */
  error?: string;
}

/**
 * All error codes the backend can return.
 * Use these for switch/case control flow — NEVER switch on message strings.
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  INVALID_TOKEN: 'INVALID_TOKEN',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  NOT_FOUND: 'NOT_FOUND',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  CONFLICT: 'CONFLICT',
  DUPLICATE_SWIPE: 'DUPLICATE_SWIPE',
  CONCURRENT_MODIFICATION: 'CONCURRENT_MODIFICATION',
  SPOTIFY_TOKEN_EXPIRED: 'SPOTIFY_TOKEN_EXPIRED',
  SPOTIFY_UNAVAILABLE: 'SPOTIFY_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
