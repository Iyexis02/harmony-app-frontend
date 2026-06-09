import type { ApiResult } from '@/types/auth';
import type { BackendErrorResponse } from '@/types/error';
import { ErrorCode } from '@/types/error';

/**
 * Synthetic error code set by the frontend when the backend's EmailVerificationFilter
 * returns a 403 on a protected endpoint for an unverified user.
 */
export const EMAIL_VERIFICATION_REQUIRED = 'EMAIL_VERIFICATION_REQUIRED' as const;

/**
 * Returns true when an API error is a 403 that signals the user must verify their
 * email before accessing the requested resource. Use this in hooks to show the
 * verification prompt instead of a generic error or sign-out.
 */
export function isEmailVerificationError(error: {
  status: number;
  code?: string;
  message: string;
}): boolean {
  return error.status === 403 && error.code === EMAIL_VERIFICATION_REQUIRED;
}

/**
 * Returns true when a 401 error is a Spotify token expiry, NOT an expired app JWT.
 * The user's session is still valid — they only need to reconnect Spotify.
 * Use this to guard signOut() calls so the user isn't logged out by accident.
 */
export function isSpotifyTokenExpiredError(error: {
  status: number;
  code?: string;
  message: string;
}): boolean {
  return error.status === 401 && error.code === ErrorCode.SPOTIFY_TOKEN_EXPIRED;
}

// Resolves base URL for both server (BACKEND_API_URL) and client (NEXT_PUBLIC_API_URL) contexts.
const getBaseUrl = () =>
  typeof window === 'undefined'
    ? (process.env.BACKEND_API_URL ?? 'http://localhost:8080')
    : (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080');

async function parseResponse<T>(response: Response, requestCorrelationId: string): Promise<ApiResult<T>> {
  const correlationId = response.headers.get('X-Correlation-Id') ?? requestCorrelationId;

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const seconds = retryAfter ? parseInt(retryAfter, 10) : NaN;
    const message = !isNaN(seconds)
      ? `Too many attempts. Please try again in ${seconds} seconds.`
      : 'Too many attempts. Please try again later.';
    console.error(`API error [429] correlationId=${correlationId}`, { status: 429, message });
    return { ok: false, error: { status: 429, message, retryAfter: !isNaN(seconds) ? seconds : undefined, correlationId } };
  }

  // Handles empty body (e.g. 204 No Content from account deletion)
  const body = await response.json().catch(() => null);

  if (response.ok) {
    return { ok: true, data: (body ?? null) as T };
  }

  const err = body as BackendErrorResponse | null;

  // The standardized backend error shape is { code, message }. But pre-MVC servlet
  // filters bypass ControllerAdvice and return an ad-hoc { error: "..." } body —
  // confirmed for the EmailVerificationFilter, which returns
  // `{ "error": "Email verification required" }`. Fall back to `error` so the message
  // and the detection below survive instead of degrading to "Unknown error".
  const backendMessage = err?.message ?? err?.error;

  // Detect the backend's EmailVerificationFilter: fires on all protected paths when the
  // user's email is unverified. Since 2026-06-07 the filter emits the standard envelope
  // with `code: "EMAIL_VERIFICATION_REQUIRED"` — that code is now the primary signal. The
  // message-substring check is retained only as a legacy fallback for the old ad-hoc
  // `{ error: "Email verification required" }` shape (no `code` field).
  const isEmailVerifBlock =
    response.status === 403 &&
    (err?.code === EMAIL_VERIFICATION_REQUIRED ||
      (backendMessage?.includes('Email verification') ?? false));

  const baseMessage = backendMessage || response.statusText || 'Unknown error';
  const message =
    response.status === 500
      ? `${baseMessage} (Error ID: ${correlationId.slice(0, 8)})`
      : baseMessage;

  console.error(`API error [${response.status}] correlationId=${correlationId}`, {
    status: response.status,
    code: isEmailVerifBlock ? EMAIL_VERIFICATION_REQUIRED : err?.code,
    message: baseMessage,
  });

  return {
    ok: false,
    error: {
      status: response.status,
      message,
      code: isEmailVerifBlock ? EMAIL_VERIFICATION_REQUIRED : err?.code,
      fields: err?.fields,
      correlationId,
    },
  };
}

/** For public (unauthenticated) backend endpoints. */
export async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResult<T>> {
  const correlationId = crypto.randomUUID();
  try {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': correlationId,
        ...(options?.headers as Record<string, string>),
      },
    });
    return parseResponse<T>(response, correlationId);
  } catch {
    return { ok: false, error: { status: 0, message: 'Network error', correlationId } };
  }
}

/** For authenticated backend endpoints. Accepts the bearer token directly so it works in both server actions and client hooks. */
export async function authenticatedApiRequest<T>(
  path: string,
  token: string,
  options?: RequestInit
): Promise<ApiResult<T>> {
  const correlationId = crypto.randomUUID();
  try {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Correlation-Id': correlationId,
        ...(options?.headers as Record<string, string>),
      },
    });
    return parseResponse<T>(response, correlationId);
  } catch {
    return { ok: false, error: { status: 0, message: 'Network error', correlationId } };
  }
}
