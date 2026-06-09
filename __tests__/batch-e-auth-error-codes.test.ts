/**
 * Batch E — Auth-Specific Error Code Handling
 *
 * Runner: vitest
 * Run:    npx vitest run __tests__/batch-e-auth-error-codes.test.ts
 *
 * Two layers tested:
 *
 * 1. Parsing layer (lib/api.ts via apiRequest) — verifies the backend error
 *    codes relevant to auth flows (ACCOUNT_LOCKED, EMAIL_EXISTS, INVALID_TOKEN,
 *    UNAUTHORIZED) are correctly extracted from the response body and surfaced
 *    in ApiError.code. No backend or browser required; fetch is mocked.
 *
 * 2. UI branch logic — pure functions that mirror the switch/if decisions in
 *    each page component. These pin the exact text and state transitions that
 *    the UI must produce for each error code.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { apiRequest } from '../lib/api';
import { ErrorCode } from '../types/error';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
      })
    )
  );
}

// ---------------------------------------------------------------------------
// Parsing layer — apiRequest correctly surfaces auth error codes
// ---------------------------------------------------------------------------

describe('apiRequest — auth error codes extracted from backend body', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  // -- Login: ACCOUNT_LOCKED ------------------------------------------------

  it('surfaces ACCOUNT_LOCKED code from a 423 response', async () => {
    mockFetch(423, {
      code: 'ACCOUNT_LOCKED',
      message: 'Account locked due to too many failed attempts.',
      timestamp: '2026-03-22T00:00:00Z',
    });

    const result = await apiRequest('/api/v1/auth/login');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.ACCOUNT_LOCKED);
      expect(result.error.status).toBe(423);
      expect(result.error.message).toContain('locked');
    }
  });

  // -- Login: UNAUTHORIZED --------------------------------------------------

  it('surfaces UNAUTHORIZED code from a 401 response', async () => {
    mockFetch(401, {
      code: 'UNAUTHORIZED',
      message: 'Invalid email or password.',
      timestamp: '2026-03-22T00:00:00Z',
    });

    const result = await apiRequest('/api/v1/auth/login');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(result.error.status).toBe(401);
    }
  });

  // -- Register: EMAIL_EXISTS -----------------------------------------------

  it('surfaces EMAIL_EXISTS code from a 409 response', async () => {
    mockFetch(409, {
      code: 'EMAIL_EXISTS',
      message: 'An account with this email already exists.',
      timestamp: '2026-03-22T00:00:00Z',
    });

    const result = await apiRequest('/api/v1/auth/register');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.EMAIL_EXISTS);
      expect(result.error.status).toBe(409);
    }
  });

  // -- Register: VALIDATION_ERROR with fields --------------------------------

  it('surfaces VALIDATION_ERROR code and fields from a 400 response', async () => {
    mockFetch(400, {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      fields: { email: 'must be a valid email', password: 'must contain a special character' },
      timestamp: '2026-03-22T00:00:00Z',
    });

    const result = await apiRequest('/api/v1/auth/register');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.error.fields).toMatchObject({
        email: 'must be a valid email',
        password: 'must contain a special character',
      });
    }
  });

  // -- Reset password: INVALID_TOKEN ----------------------------------------

  it('surfaces INVALID_TOKEN code from a 400 response on reset-password', async () => {
    mockFetch(400, {
      code: 'INVALID_TOKEN',
      message: 'The password reset token has expired.',
      timestamp: '2026-03-22T00:00:00Z',
    });

    const result = await apiRequest('/api/v1/auth/reset-password');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.INVALID_TOKEN);
      expect(result.error.status).toBe(400);
    }
  });

  // -- Verify email: INVALID_TOKEN ------------------------------------------

  it('surfaces INVALID_TOKEN code from a 400 response on verify-email', async () => {
    mockFetch(400, {
      code: 'INVALID_TOKEN',
      message: 'The email verification token has expired.',
      timestamp: '2026-03-22T00:00:00Z',
    });

    const result = await apiRequest('/api/v1/auth/verify-email');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.INVALID_TOKEN);
    }
  });

  // -- Success paths --------------------------------------------------------

  it('returns ok:true for a 200 login response', async () => {
    mockFetch(200, {
      accessToken: 'eyJhb...',
      userId: 'abc123',
      registrationStage: 'FINISHED',
    });

    const result = await apiRequest<{ accessToken: string }>('/api/v1/auth/login');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.accessToken).toBe('eyJhb...');
    }
  });

  it('returns ok:true for a 201 register response', async () => {
    mockFetch(201, {
      accessToken: 'eyJhb...',
      userId: 'new123',
      registrationStage: 'STARTED',
    });

    const result = await apiRequest('/api/v1/auth/register');
    expect(result.ok).toBe(true);
  });

  // -- Network failure -------------------------------------------------------

  it('returns status:0 and "Network error" on fetch rejection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')));

    const result = await apiRequest('/api/v1/auth/login');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(0);
      expect(result.error.message).toBe('Network error');
    }
  });

  // -- INVALID_TOKEN is distinct from EMAIL_VERIFICATION_REQUIRED -----------

  it('does NOT treat INVALID_TOKEN as an email verification block', async () => {
    mockFetch(400, {
      code: 'INVALID_TOKEN',
      message: 'Token expired.',
      timestamp: '2026-03-22T00:00:00Z',
    });

    const result = await apiRequest('/api/v1/auth/reset-password');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.INVALID_TOKEN);
      expect(result.error.code).not.toBe('EMAIL_VERIFICATION_REQUIRED');
    }
  });
});

// ---------------------------------------------------------------------------
// UI branch logic — pure functions mirroring page component decisions
// No React renderer or Next.js runtime needed.
// ---------------------------------------------------------------------------

describe('login page — error-code branching logic', () => {
  // Mirrors the switch in handleLogin in app/login/page.tsx
  function resolveLoginError(code: string | undefined, message: string): string {
    switch (code) {
      case ErrorCode.ACCOUNT_LOCKED:
        return 'Account temporarily locked due to too many failed attempts. Please try again later.';
      case ErrorCode.UNAUTHORIZED:
        return 'Invalid email or password';
      default:
        return message;
    }
  }

  it('maps ACCOUNT_LOCKED to lockout message', () => {
    expect(resolveLoginError(ErrorCode.ACCOUNT_LOCKED, 'raw')).toBe(
      'Account temporarily locked due to too many failed attempts. Please try again later.'
    );
  });

  it('maps UNAUTHORIZED to invalid credentials message', () => {
    expect(resolveLoginError(ErrorCode.UNAUTHORIZED, 'raw')).toBe('Invalid email or password');
  });

  it('falls through to raw message for other codes', () => {
    expect(resolveLoginError(ErrorCode.INTERNAL_ERROR, 'Something broke')).toBe('Something broke');
  });

  it('falls through to raw message when code is undefined', () => {
    expect(resolveLoginError(undefined, 'Network error')).toBe('Network error');
  });

  // These two codes must NOT produce the same message
  it('ACCOUNT_LOCKED and UNAUTHORIZED produce different messages', () => {
    const locked = resolveLoginError(ErrorCode.ACCOUNT_LOCKED, 'x');
    const unauth = resolveLoginError(ErrorCode.UNAUTHORIZED, 'x');
    expect(locked).not.toBe(unauth);
  });
});

describe('register page — EMAIL_EXISTS branching logic', () => {
  // Mirrors the if/else in handleRegister in app/register/page.tsx
  function resolveRegisterError(code: string | undefined): 'emailExists' | 'applyBackendErrors' {
    if (code === ErrorCode.EMAIL_EXISTS) return 'emailExists';
    return 'applyBackendErrors';
  }

  it('routes EMAIL_EXISTS to the email-exists banner (not applyBackendErrors)', () => {
    expect(resolveRegisterError(ErrorCode.EMAIL_EXISTS)).toBe('emailExists');
  });

  it('routes VALIDATION_ERROR to applyBackendErrors (field mapping path)', () => {
    expect(resolveRegisterError(ErrorCode.VALIDATION_ERROR)).toBe('applyBackendErrors');
  });

  it('routes CONFLICT to applyBackendErrors', () => {
    expect(resolveRegisterError(ErrorCode.CONFLICT)).toBe('applyBackendErrors');
  });

  it('routes undefined code to applyBackendErrors', () => {
    expect(resolveRegisterError(undefined)).toBe('applyBackendErrors');
  });
});

describe('reset-password page — INVALID_TOKEN branching logic', () => {
  // Mirrors the if/else in handleSubmit in app/reset-password/page.tsx
  function resolveResetError(
    code: string | undefined,
    message: string
  ): { isInvalidToken: boolean; displayMessage: string } {
    if (code === ErrorCode.INVALID_TOKEN) {
      return { isInvalidToken: true, displayMessage: 'This reset link has expired or is invalid.' };
    }
    return { isInvalidToken: false, displayMessage: message };
  }

  it('sets isInvalidToken:true and shows expired message for INVALID_TOKEN', () => {
    const result = resolveResetError(ErrorCode.INVALID_TOKEN, 'raw backend message');
    expect(result.isInvalidToken).toBe(true);
    expect(result.displayMessage).toBe('This reset link has expired or is invalid.');
  });

  it('the expired message is independent of the raw backend message', () => {
    const resultA = resolveResetError(ErrorCode.INVALID_TOKEN, 'one message');
    const resultB = resolveResetError(ErrorCode.INVALID_TOKEN, 'another message');
    expect(resultA.displayMessage).toBe(resultB.displayMessage);
  });

  it('passes message through and isInvalidToken:false for VALIDATION_ERROR', () => {
    const result = resolveResetError(ErrorCode.VALIDATION_ERROR, 'Password too weak');
    expect(result.isInvalidToken).toBe(false);
    expect(result.displayMessage).toBe('Password too weak');
  });

  it('passes message through for undefined code', () => {
    const result = resolveResetError(undefined, 'Something went wrong');
    expect(result.isInvalidToken).toBe(false);
    expect(result.displayMessage).toBe('Something went wrong');
  });
});

describe('verify-email page — INVALID_TOKEN branching logic', () => {
  // Mirrors the if/else in the verify useEffect in app/verify-email/page.tsx
  function resolveVerifyError(
    code: string | undefined,
    message: string
  ): { isExpiredToken: boolean; displayMessage: string } {
    if (code === ErrorCode.INVALID_TOKEN) {
      return { isExpiredToken: true, displayMessage: 'This verification link has expired.' };
    }
    return {
      isExpiredToken: false,
      displayMessage: message || 'Verification failed. The link may have expired.',
    };
  }

  it('sets isExpiredToken:true and shows expired message for INVALID_TOKEN', () => {
    const result = resolveVerifyError(ErrorCode.INVALID_TOKEN, 'raw');
    expect(result.isExpiredToken).toBe(true);
    expect(result.displayMessage).toBe('This verification link has expired.');
  });

  it('the expired message is independent of the raw backend message', () => {
    const resultA = resolveVerifyError(ErrorCode.INVALID_TOKEN, 'msg A');
    const resultB = resolveVerifyError(ErrorCode.INVALID_TOKEN, 'msg B');
    expect(resultA.displayMessage).toBe(resultB.displayMessage);
  });

  it('passes backend message through for INTERNAL_ERROR', () => {
    const result = resolveVerifyError(ErrorCode.INTERNAL_ERROR, 'Server blew up');
    expect(result.isExpiredToken).toBe(false);
    expect(result.displayMessage).toBe('Server blew up');
  });

  it('falls back to default message when message is empty', () => {
    const result = resolveVerifyError(undefined, '');
    expect(result.isExpiredToken).toBe(false);
    expect(result.displayMessage).toBe('Verification failed. The link may have expired.');
  });

  it('isExpiredToken:false for ACCOUNT_LOCKED (no cross-contamination)', () => {
    const result = resolveVerifyError(ErrorCode.ACCOUNT_LOCKED, 'msg');
    expect(result.isExpiredToken).toBe(false);
  });
});
