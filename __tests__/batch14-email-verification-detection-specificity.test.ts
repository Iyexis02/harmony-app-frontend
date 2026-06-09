/**
 * Batch 14 — Email Verification Detection Specificity
 *
 * Runner: vitest
 * Run:    npx vitest run __tests__/batch14-email-verification-detection-specificity.test.ts
 *
 * Verifies that `parseResponse` in lib/api.ts only maps a 403 to the synthetic
 * EMAIL_VERIFICATION_REQUIRED code when the response body message contains the
 * string "Email verification". The previously over-broad `err?.code === 'FORBIDDEN'`
 * arm has been removed, so generic FORBIDDEN 403s preserve their original code.
 *
 * No backend required. All tests mock globalThis.fetch.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { apiRequest, isEmailVerificationError, EMAIL_VERIFICATION_REQUIRED } from '../lib/api';
import { ErrorCode } from '../types/error';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Core fix: FORBIDDEN code alone no longer triggers email-verif detection
// ---------------------------------------------------------------------------

describe('Batch 14 — FORBIDDEN code does not trigger email verification prompt', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('preserves FORBIDDEN code when message is unrelated to email verification', async () => {
    // Previously this would have been remapped to EMAIL_VERIFICATION_REQUIRED.
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(403, {
        code: 'FORBIDDEN',
        message: 'Access denied',
        timestamp: '2026-03-22T00:00:00Z',
      })
    );

    const result = await apiRequest('/api/v1/matching/score/user-456');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(403);
      expect(result.error.code).toBe(ErrorCode.FORBIDDEN);
      expect(result.error.code).not.toBe(EMAIL_VERIFICATION_REQUIRED);
      expect(isEmailVerificationError(result.error)).toBe(false);
    }
  });

  it('preserves FORBIDDEN code when accessing another user\'s resource', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(403, {
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this resource',
        timestamp: '2026-03-22T00:00:00Z',
      })
    );

    const result = await apiRequest('/api/v1/users/other-user/profile');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.FORBIDDEN);
      expect(isEmailVerificationError(result.error)).toBe(false);
    }
  });

  it('preserves FORBIDDEN code on an admin-only endpoint', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(403, {
        code: 'FORBIDDEN',
        message: 'Admin access required',
        timestamp: '2026-03-22T00:00:00Z',
      })
    );

    const result = await apiRequest('/api/v1/admin/users');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.FORBIDDEN);
      expect(isEmailVerificationError(result.error)).toBe(false);
    }
  });

  it('preserves FORBIDDEN code on the unmatch endpoint (blocked relationship)', async () => {
    // useMatching.ts unmatch() checks ErrorCode.FORBIDDEN to show "Unable to unmatch".
    // Before the fix this branch was dead code — it was never reached because
    // parseResponse had already overwritten the code to EMAIL_VERIFICATION_REQUIRED.
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(403, {
        code: 'FORBIDDEN',
        message: 'Cannot unmatch: relationship blocked',
        timestamp: '2026-03-22T00:00:00Z',
      })
    );

    const result = await apiRequest('/api/v1/matching/matches/match-789');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.FORBIDDEN);
      expect(isEmailVerificationError(result.error)).toBe(false);
    }
  });

  it('preserves FORBIDDEN code on the match score endpoint (blocked relationship)', async () => {
    // useMatching.ts getMatchScore() checks ErrorCode.FORBIDDEN to call
    // setScoreUnavailable(true). Before the fix this branch was dead code.
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(403, {
        code: 'FORBIDDEN',
        message: 'Score unavailable: users are in a blocked relationship',
        timestamp: '2026-03-22T00:00:00Z',
      })
    );

    const result = await apiRequest('/api/v1/matching/score/user-456');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCode.FORBIDDEN);
      expect(isEmailVerificationError(result.error)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Message-based detection still works
// ---------------------------------------------------------------------------

describe('Batch 14 — message-based email verification detection is preserved', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('maps to EMAIL_VERIFICATION_REQUIRED when message contains "Email verification"', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(403, {
        message: 'Email verification required before accessing this resource',
        timestamp: '2026-03-22T00:00:00Z',
      })
    );

    const result = await apiRequest('/api/v1/matching/potential');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(403);
      expect(result.error.code).toBe(EMAIL_VERIFICATION_REQUIRED);
      expect(isEmailVerificationError(result.error)).toBe(true);
    }
  });

  it('maps to EMAIL_VERIFICATION_REQUIRED when FORBIDDEN code is present AND message contains "Email verification"', async () => {
    // Both conditions true: message wins; synthetic code is still injected.
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(403, {
        code: 'FORBIDDEN',
        message: 'Email verification required',
        timestamp: '2026-03-22T00:00:00Z',
      })
    );

    const result = await apiRequest('/api/v1/matching/potential');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(EMAIL_VERIFICATION_REQUIRED);
      expect(isEmailVerificationError(result.error)).toBe(true);
    }
  });

  it('maps to EMAIL_VERIFICATION_REQUIRED for a Spring filter response with no code field', async () => {
    // Spring's EmailVerificationFilter typically returns no structured `code` field.
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(403, {
        message: 'Email verification required',
        timestamp: '2026-03-22T00:00:00Z',
      })
    );

    const result = await apiRequest('/api/v1/preferences/genres');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(EMAIL_VERIFICATION_REQUIRED);
      expect(isEmailVerificationError(result.error)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Non-403 statuses are unaffected
// ---------------------------------------------------------------------------

describe('Batch 14 — non-403 responses are unaffected', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('does not affect 401 responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(401, {
        code: 'UNAUTHORIZED',
        message: 'Token expired',
        timestamp: '2026-03-22T00:00:00Z',
      })
    );

    const result = await apiRequest('/api/v1/matching/potential');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(401);
      expect(result.error.code).toBe('UNAUTHORIZED');
      expect(isEmailVerificationError(result.error)).toBe(false);
    }
  });

  it('does not affect 200 responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(200, { matches: [], hasMore: false })
    );

    const result = await apiRequest<{ matches: unknown[]; hasMore: boolean }>(
      '/api/v1/matching/matches'
    );

    expect(result.ok).toBe(true);
  });

  it('does not affect 500 responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makeFetchResponse(500, {
        code: 'INTERNAL_ERROR',
        message: 'Unexpected server error',
        timestamp: '2026-03-22T00:00:00Z',
      })
    );

    const result = await apiRequest('/api/v1/matching/potential');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.status).toBe(500);
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(isEmailVerificationError(result.error)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// isEmailVerificationError utility — unchanged contract
// ---------------------------------------------------------------------------

describe('Batch 14 — isEmailVerificationError utility contract', () => {
  it('returns true only for status 403 + code EMAIL_VERIFICATION_REQUIRED', () => {
    expect(
      isEmailVerificationError({ status: 403, code: EMAIL_VERIFICATION_REQUIRED, message: '' })
    ).toBe(true);
  });

  it('returns false for status 403 + code FORBIDDEN', () => {
    expect(
      isEmailVerificationError({ status: 403, code: ErrorCode.FORBIDDEN, message: 'Access denied' })
    ).toBe(false);
  });

  it('returns false for status 403 with no code', () => {
    expect(
      isEmailVerificationError({ status: 403, code: undefined, message: 'Forbidden' })
    ).toBe(false);
  });

  it('returns false for a different status even with the right code', () => {
    expect(
      isEmailVerificationError({ status: 401, code: EMAIL_VERIFICATION_REQUIRED, message: '' })
    ).toBe(false);
  });
});
